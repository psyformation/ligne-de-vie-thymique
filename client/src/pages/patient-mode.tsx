import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, Plus, BarChart2, HelpCircle, ArrowLeft, FileDown, FileUp, FileText } from "lucide-react";
import MoodChart from "@/components/mood-chart";
import PDFExport from "@/components/pdf-export";
import { excelService } from "@/services/excel-service";
import type { MoodEntry, Hospitalization, InstabilityPeriod } from "@shared/schema";

// ─── Mood descriptions (patient language) ────────────────────────────────────

const moodDescriptions: Record<number, { label: string; emoji: string; color: string }> = {
  "-5": { label: "Très déprimé(e), incapable de fonctionner", emoji: "😞", color: "#1d4ed8" },
  "-4": { label: "Très déprimé(e)", emoji: "😔", color: "#2563eb" },
  "-3": { label: "Plutôt déprimé(e)", emoji: "🙁", color: "#3b82f6" },
  "-2": { label: "Un peu triste", emoji: "😕", color: "#60a5fa" },
  "-1": { label: "Légèrement en dessous de la normale", emoji: "😐", color: "#93c5fd" },
  "0":  { label: "Stable, humeur normale", emoji: "🙂", color: "#94a3b8" },
  "1":  { label: "Légèrement au-dessus de la normale", emoji: "😊", color: "#fbbf24" },
  "2":  { label: "De bonne humeur, un peu survolté(e)", emoji: "😄", color: "#f59e0b" },
  "3":  { label: "Très énergique, peu de sommeil", emoji: "⚡", color: "#f97316" },
  "4":  { label: "Très agité(e), pensées qui s'accélèrent", emoji: "🌀", color: "#ef4444" },
  "5":  { label: "Extrêmement agité(e), impossible à s'arrêter", emoji: "🔥", color: "#dc2626" },
} as any;

function getMoodInfo(level: number) {
  return moodDescriptions[String(level)] ?? moodDescriptions["0"];
}

// ─── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
  {
    stepLabel: "Épisode récent",
    title: "Votre épisode le plus récent",
    subtitle: "Pensez à la dernière période où vous avez ressenti un changement d'humeur notable — une dépression, une période d'excitation, ou autre.",
    hint: "Pas besoin d'être précis(e) sur les dates. Une approximation suffit.",
    skippable: false,
  },
  {
    stepLabel: "Premier souvenir",
    title: "La première fluctuation d'humeur dont vous vous souvenez",
    subtitle: "Remontez aussi loin que vous pouvez dans vos souvenirs — la toute première fois que vous avez ressenti un changement d'humeur important.",
    hint: "Si vous ne vous souvenez plus de l'année exacte, donnez une estimation.",
    skippable: false,
  },
  {
    stepLabel: "Épisode le plus difficile",
    title: "L'épisode dont le vécu a été le plus difficile",
    subtitle: "La période qui a eu le plus grand impact sur votre vie — personnelle, professionnelle ou familiale.",
    hint: "Si c'est l'un des épisodes que vous avez déjà saisis, vous pouvez passer cette étape.",
    skippable: true,
  },
];

// ─── Per-step intro messages ─────────────────────────────────────────────────

const STEP_INTROS = [
  {
    emoji: "🕐",
    badge: "Étape 1 sur 3",
    title: "Commençons par le plus récent",
    message: "Nous allons débuter par l'épisode le plus récent dont vous vous souvenez — une période de dépression, d'excitation intense, ou tout autre changement d'humeur notable.",
    button: "C'est parti →",
  },
  {
    emoji: "⏮",
    badge: "Étape 2 sur 3",
    title: "Remontons dans vos souvenirs",
    message: "Très bien. Continuons maintenant avec la toute première fluctuation thymique dont vous pouvez vous souvenir — aussi loin que possible dans votre passé.",
    button: "Continuer →",
  },
  {
    emoji: "💙",
    badge: "Étape 3 sur 3",
    title: "L'épisode le plus marquant",
    message: "Presque terminé. Pensez à l'épisode qui vous a le plus affecté(e) — celui qui a eu le plus grand impact sur votre vie personnelle, professionnelle ou familiale.",
    button: "Continuer →",
  },
];

// ─── Guided episode form ─────────────────────────────────────────────────────

// Sub-step questions
const SUB_STEPS = [
  { id: "dates",        question: "Quand cet épisode s'est-il passé ?" },
  { id: "mood",         question: "Comment décririez-vous votre humeur durant cette période ?" },
  { id: "hospitalized", question: "Avez-vous été hospitalisé(e) pendant cette période ?" },
  { id: "trigger",      question: "Y a-t-il eu un événement particulier avant cet épisode ?" },
];

interface GuidedFormProps {
  onSuccess: (id: number) => void;
  onHospitalization?: (id: number) => void;
  onSkip?: () => void;
  stepIndex: number;
}

function GuidedEpisodeForm({ onSuccess, onHospitalization, onSkip, stepIndex }: GuidedFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const step = STEPS[stepIndex];

  const [subStep, setSubStep] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [moodLevel, setMoodLevel] = useState([0]);
  const [trigger, setTrigger] = useState("");
  const [notes, setNotes] = useState("");
  const [startDateError, setStartDateError] = useState("");
  const [endDateError, setEndDateError] = useState("");
  const [hospitalized, setHospitalized] = useState<null | boolean>(null);
  const [triggerYesNo, setTriggerYesNo] = useState<null | "yes" | "no">(null);
  const [animKey, setAnimKey] = useState(0);
  const [animClass, setAnimClass] = useState("patient-slide-forward");

  function advanceAnim() { setAnimClass("patient-slide-forward"); setAnimKey(k => k + 1); }
  function backAnim()    { setAnimClass("patient-slide-back");    setAnimKey(k => k + 1); }

  const createMoodEntry = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/patient/mood-entries", data);
      return res.json();
    },
    onSuccess: async (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/mood-entries"] });
      toast({ title: "Épisode enregistré", description: "Votre épisode a bien été sauvegardé." });
      if (hospitalized === true) {
        try {
          const hospRes = await apiRequest("POST", "/api/patient/hospitalizations", {
            startDate: created.startDate,
            endDate: created.endDate || undefined,
          });
          const hosp = await hospRes.json();
          queryClient.invalidateQueries({ queryKey: ["/api/patient/hospitalizations"] });
          onHospitalization?.(hosp.id);
        } catch (_) {}
      }
      onSuccess(created.id);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer l'épisode.", variant: "destructive" });
    },
  });

  function handleNext() {
    if (subStep === 0) {
      if (!startDate) { setStartDateError("Veuillez indiquer une période approximative."); return; }
      if (endDate && endDate < startDate) { setEndDateError("La fin ne peut pas être avant le début."); return; }
    }
    advanceAnim();
    setSubStep(s => s + 1);
  }

  function handleSubmit() {
    const startFull = startDate.length === 7 ? startDate + "-01" : startDate;
    const endFull = endDate ? (endDate.length === 7 ? endDate + "-01" : endDate) : undefined;
    createMoodEntry.mutate({
      startDate: startFull,
      endDate: endFull ?? null,
      moodLevel: moodLevel[0],
      triggerEvents: trigger || undefined,
      notes: notes || undefined,
    });
  }

  const info = getMoodInfo(moodLevel[0]);
  const totalSubSteps = SUB_STEPS.length;
  const TRIGGER_STEP = 3;

  return (
    <div className="space-y-6">

      {/* Sub-step progress dots */}
      <div className="flex items-center gap-1.5">
        {SUB_STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
            i < subStep ? "w-6 bg-blue-600" : i === subStep ? "w-6 bg-blue-400" : "w-3 bg-slate-200"
          }`} />
        ))}
        <span className="text-xs text-slate-400 ml-2">{subStep + 1} / {totalSubSteps}</span>
      </div>

      {/* Animated content area */}
      <div key={animKey} className={animClass}>

      {/* Question label */}
      <div className="text-base font-semibold text-slate-800 leading-snug mb-5">
        {SUB_STEPS[subStep].question}
        {subStep === TRIGGER_STEP && <span className="text-slate-400 text-sm font-normal ml-2">(optionnel)</span>}
      </div>

      {/* ── Sub-step 0 : Dates ── */}
      {subStep === 0 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
            💡 {step.hint}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-600 text-sm mb-1.5 block">
                Début <span className="text-red-500">*</span>
              </Label>
              <Input
                type="month"
                value={startDate}
                autoFocus
                onChange={e => { setStartDate(e.target.value); setStartDateError(""); }}
                className="bg-white text-base"
              />
              {startDateError && <p className="text-red-500 text-xs mt-1">{startDateError}</p>}
            </div>
            <div>
              <Label className="text-slate-600 text-sm mb-1.5 block">
                Fin <span className="text-slate-400 text-xs font-normal">(optionnel — si terminé)</span>
              </Label>
              <Input
                type="month"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setEndDateError(""); }}
                className="bg-white text-base"
              />
              {endDateError && <p className="text-red-500 text-xs mt-1">{endDateError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-step 1 : Mood slider ── */}
      {subStep === 1 && (
        <div className="space-y-5">
          <div className="flex justify-between text-xs text-slate-400 px-1">
            <span>😞 Très déprimé(e)</span>
            <span>🙂 Normal</span>
            <span>🔥 Très exalté(e)</span>
          </div>
          <Slider value={moodLevel} onValueChange={setMoodLevel} min={-5} max={5} step={1} />
          <div
            className="flex items-center gap-3 px-5 py-4 rounded-2xl border-2 transition-all duration-200"
            style={{ borderColor: info.color + "50", backgroundColor: info.color + "10" }}
          >
            <span className="text-3xl">{info.emoji}</span>
            <div>
              <p className="font-bold text-lg leading-none" style={{ color: info.color }}>
                {moodLevel[0] > 0 ? "+" : ""}{moodLevel[0]}
              </p>
              <p className="text-slate-600 text-sm mt-0.5">{info.label}</p>
            </div>
          </div>
          <div className="flex justify-between px-1 text-xs text-slate-300">
            {[-5,-4,-3,-2,-1,0,1,2,3,4,5].map(n => (
              <span key={n} className={n === moodLevel[0] ? "text-blue-500 font-bold" : ""}>
                {n > 0 ? `+${n}` : n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-step 2 : Hospitalisation (yes/no) ── */}
      {subStep === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => { setHospitalized(false); advanceAnim(); setSubStep(3); }}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-6 transition-all font-medium text-lg ${
                hospitalized === false
                  ? "border-slate-500 bg-slate-100 text-slate-800"
                  : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span className="text-3xl">🏠</span>
              Non
            </button>
            <button
              type="button"
              onClick={() => { setHospitalized(true); advanceAnim(); setSubStep(3); }}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-6 transition-all font-medium text-lg ${
                hospitalized === true
                  ? "border-purple-500 bg-purple-50 text-purple-800"
                  : "border-purple-200 bg-purple-50 hover:border-purple-400 hover:bg-purple-100 text-purple-700"
              }`}
            >
              <span className="text-3xl">🏥</span>
              Oui
            </button>
          </div>
          {hospitalized === true && (
            <p className="text-xs text-purple-600 text-center">L'hospitalisation sera figurée sur votre graphique.</p>
          )}
        </div>
      )}

      {/* ── Sub-step 3 : Trigger (yes/no then optional text) ── */}
      {subStep === TRIGGER_STEP && (
        <div className="space-y-4">
          {triggerYesNo === null && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => { setTrigger(""); handleSubmit(); }}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 py-6 transition-all font-medium text-slate-700 text-lg"
              >
                <span className="text-3xl">🙅</span>
                Non
              </button>
              <button
                type="button"
                onClick={() => { advanceAnim(); setTriggerYesNo("yes"); }}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 py-6 transition-all font-medium text-blue-700 text-lg"
              >
                <span className="text-3xl">✋</span>
                Oui
              </button>
            </div>
          )}

          {triggerYesNo === "yes" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => { backAnim(); setTriggerYesNo(null); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Modifier ma réponse
              </button>
              <Input
                type="text"
                autoFocus
                placeholder="Ex : séparation, perte d'emploi, manque de sommeil, changement de traitement…"
                value={trigger}
                onChange={e => setTrigger(e.target.value)}
                className="bg-white text-base"
              />
              <div>
                <Label className="text-slate-600 text-sm mb-1.5 block">
                  Notes libres <span className="text-slate-400 text-xs font-normal">(optionnel)</span>
                </Label>
                <Textarea
                  placeholder="Tout ce qui vous semble important à noter sur cet épisode…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="bg-white resize-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 pt-2">
        {subStep > 0 && !(subStep === TRIGGER_STEP && triggerYesNo === null) && (
          <button
            type="button"
            onClick={() => {
              if (subStep === TRIGGER_STEP && triggerYesNo === "yes") {
                backAnim(); setTriggerYesNo(null);
              } else {
                backAnim(); setSubStep(s => s - 1);
              }
            }}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Retour
          </button>
        )}

        {subStep === TRIGGER_STEP && triggerYesNo === null && (
          <button
            type="button"
            onClick={() => { backAnim(); setSubStep(s => s - 1); }}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Retour
          </button>
        )}

        <div className="flex-1" />

        {subStep < TRIGGER_STEP ? (
          <>
            {step.skippable && onSkip && (
              <Button type="button" variant="outline" onClick={onSkip} className="text-slate-400 border-slate-200 hover:bg-slate-50 text-sm">
                Passer cette étape
              </Button>
            )}
            {subStep !== 2 && (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                Suivant →
              </Button>
            )}
          </>
        ) : triggerYesNo === "yes" ? (
          <>
            {step.skippable && onSkip && (
              <Button type="button" variant="outline" onClick={onSkip} className="text-slate-500">
                Passer cette étape
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createMoodEntry.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              {createMoodEntry.isPending ? "Enregistrement…" : "Enregistrer →"}
            </Button>
          </>
        ) : triggerYesNo === null ? (
          step.skippable && onSkip ? (
            <Button type="button" variant="outline" onClick={onSkip} className="text-slate-500">
              Passer cette étape
            </Button>
          ) : null
        ) : null}
      </div>

      </div>{/* end animated wrapper */}
    </div>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
            i < current
              ? "bg-blue-600 text-white"
              : i === current
              ? "bg-blue-600 text-white ring-4 ring-blue-100"
              : "bg-slate-200 text-slate-400"
          }`}>
            {i < current ? "✓" : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 rounded-full transition-all ${i < current ? "bg-blue-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Help panel ──────────────────────────────────────────────────────────────

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-slate-800 mb-4">Comment utiliser cet outil ?</h3>
        <ul className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-2"><span className="text-blue-500 font-bold">1.</span> Décrivez d'abord votre épisode le plus récent — c'est souvent le plus facile à se rappeler.</li>
          <li className="flex gap-2"><span className="text-blue-500 font-bold">2.</span> Puis remontez à la toute première fois que vous avez vécu un changement d'humeur important.</li>
          <li className="flex gap-2"><span className="text-blue-500 font-bold">3.</span> Notez ensuite l'épisode qui vous a le plus marqué(e), si ce n'est pas déjà fait.</li>
          <li className="flex gap-2"><span className="text-blue-500 font-bold">4.</span> Enfin, votre graphique s'affiche — vous pouvez y ajouter autant d'épisodes que vous souhaitez.</li>
        </ul>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          💡 Les dates approximatives sont suffisantes. L'important est de capturer l'essentiel de votre histoire thymique.
        </div>
        <Button onClick={onClose} className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white">
          Compris
        </Button>
      </div>
    </div>
  );
}

// ─── Intro modal ─────────────────────────────────────────────────────────────

function IntroModal({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 p-6">
      <div className="max-w-sm w-full text-center space-y-6 patient-fade-up">
        <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mx-auto">
          <span className="text-5xl">🧠</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-3 leading-snug">
            Construisons ensemble<br />votre ligne de vie
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Nous allons vous guider à travers <strong className="text-white">3 questions clés</strong> pour retracer vos épisodes d'humeur importants. Faites confiance à vos souvenirs — les approximations suffisent.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {STEPS.map((step, i) => (
            <div key={i} className="bg-white/15 rounded-2xl p-3 text-center border border-white/20">
              <div className="w-7 h-7 rounded-full bg-white text-blue-600 flex items-center justify-center text-xs font-bold mx-auto mb-2">{i + 1}</div>
              <div className="text-xs text-white/90 font-medium leading-snug">{step.stepLabel}</div>
            </div>
          ))}
        </div>
        <p className="text-blue-200 text-xs">⏱ Environ 5 minutes · Vos données restent privées</p>
        <Button
          onClick={onStart}
          className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold py-3 text-base rounded-2xl shadow-lg"
        >
          Commencer →
        </Button>
      </div>
    </div>
  );
}

// ─── Per-step intro modal ────────────────────────────────────────────────────

function StepIntroModal({ stepIndex, onContinue }: { stepIndex: number; onContinue: () => void }) {
  const intro = STEP_INTROS[stepIndex];
  if (!intro) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center space-y-5 patient-fade-up">
        <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full tracking-wide uppercase">
          {intro.badge}
        </span>
        <div className="text-5xl">{intro.emoji}</div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-3">{intro.title}</h2>
          <p className="text-slate-500 text-sm leading-relaxed">{intro.message}</p>
        </div>
        <Button
          onClick={onContinue}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-semibold"
        >
          {intro.button}
        </Button>
      </div>
    </div>
  );
}

// Stable empty arrays — defined at module level so they never change reference
// across renders, preventing unnecessary chart recreation in MoodChart's useEffect.
const EMPTY_MEDICATIONS: never[] = [];
const EMPTY_SUBSTANCES: never[] = [];
const EMPTY_LIFE_EVENTS: never[] = [];

// ─── Chart step (step 3) ─────────────────────────────────────────────────────

function ChartStep({ initialSessionIds, initialSessionHospIds = [] }: { initialSessionIds: number[]; initialSessionHospIds?: number[] }) {
  const { data: allEntries = [], isLoading } = useQuery<MoodEntry[]>({
    queryKey: ["/api/patient/mood-entries"],
  });
  const { data: allHosp = [] } = useQuery<Hospitalization[]>({
    queryKey: ["/api/patient/hospitalizations"],
  });
  const { data: allInstability = [] } = useQuery<InstabilityPeriod[]>({
    queryKey: ["/api/patient/instability-periods"],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track IDs created in this session (start with entries from guided steps)
  const [sessionIds, setSessionIds] = useState<number[]>(initialSessionIds);
  const [sessionHospIds, setSessionHospIds] = useState<number[]>(initialSessionHospIds);
  const [sessionInstabilityIds, setSessionInstabilityIds] = useState<number[]>([]);
  // Only show entries created during this session — memoized to keep stable references
  // and avoid destroying/recreating the chart on every render
  const moodEntries = useMemo(
    () => allEntries.filter(e => sessionIds.includes(e.id)),
    [allEntries, sessionIds]
  );
  const hospitalizations = useMemo(
    () => allHosp.filter(h => sessionHospIds.includes(h.id)),
    [allHosp, sessionHospIds]
  );
  const instabilityPeriods = useMemo(
    () => allInstability.filter(p => sessionInstabilityIds.includes(p.id)),
    [allInstability, sessionInstabilityIds]
  );
  const importRef = useRef<HTMLInputElement>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showInstabilityForm, setShowInstabilityForm] = useState(false);
  const [instStartDate, setInstStartDate] = useState("");
  const [instEndDate, setInstEndDate] = useState("");
  const [instErrors, setInstErrors] = useState<Record<string, string>>({});

  const createInstabilityPeriod = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/patient/instability-periods", data);
      return res.json();
    },
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/instability-periods"] });
      setSessionInstabilityIds(ids => [...ids, created.id]);
      toast({ title: "Période d'instabilité ajoutée !" });
      setInstStartDate(""); setInstEndDate(""); setInstErrors({});
      setShowInstabilityForm(false);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la période.", variant: "destructive" });
    },
  });

  function handleInstabilitySubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!instStartDate) errs.instStartDate = "Veuillez indiquer une date de début.";
    if (instEndDate && instEndDate < instStartDate) errs.instEndDate = "La fin ne peut pas être avant le début.";
    setInstErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const startFull = instStartDate.length === 7 ? instStartDate + "-01" : instStartDate;
    const endFull = instEndDate ? (instEndDate.length === 7 ? instEndDate + "-01" : instEndDate) : undefined;
    createInstabilityPeriod.mutate({ startDate: startFull, endDate: endFull ?? null });
  }
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [moodLevel, setMoodLevel] = useState([0]);
  const [trigger, setTrigger] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isImporting, setIsImporting] = useState(false);

  const createMoodEntry = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/patient/mood-entries", data);
      return res.json();
    },
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/mood-entries"] });
      setSessionIds(ids => [...ids, created.id]);
      toast({ title: "Épisode ajouté !" });
      setStartDate(""); setEndDate(""); setMoodLevel([0]); setTrigger(""); setNotes("");
      setShowAddForm(false);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer.", variant: "destructive" });
    },
  });

  async function handleExportExcel() {
    try {
      await excelService.exportPatientData(moodEntries, hospitalizations);
      toast({ title: "Export Excel réussi", description: "Fichier compatible avec le mode praticien." });
    } catch {
      toast({ title: "Erreur d'export", variant: "destructive" });
    }
  }

  async function handleImportExcel(file: File) {
    try {
      setIsImporting(true);
      const data = await excelService.importFromExcel(file);
      let addedCount = 0;
      for (const entry of data.moodEntries) {
        try {
          const res = await apiRequest("POST", "/api/patient/mood-entries", {
            startDate: entry.startDate,
            endDate: entry.endDate || null,
            moodLevel: entry.moodLevel,
            triggerEvents: entry.triggerEvents || undefined,
            notes: entry.notes || undefined,
          });
          const created = await res.json();
          setSessionIds(ids => [...ids, created.id]);
          addedCount++;
        } catch (_) {}
      }
      queryClient.invalidateQueries({ queryKey: ["/api/patient/mood-entries"] });
      toast({ title: `Import réussi — ${addedCount} épisode(s) importé(s)` });
    } catch {
      toast({ title: "Erreur d'import", description: "Fichier non reconnu.", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!startDate) errs.startDate = "Veuillez indiquer une période approximative.";
    if (endDate && endDate < startDate) errs.endDate = "La fin ne peut pas être avant le début.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const startFull = startDate.length === 7 ? startDate + "-01" : startDate;
    const endFull = endDate ? (endDate.length === 7 ? endDate + "-01" : endDate) : undefined;
    createMoodEntry.mutate({
      startDate: startFull,
      endDate: endFull ?? null,
      moodLevel: moodLevel[0],
      triggerEvents: trigger || undefined,
      notes: notes || undefined,
    });
  }

  const info = getMoodInfo(moodLevel[0]);

  return (
    <>
      {/* Success message — constrained */}
      <div className="max-w-4xl mx-auto px-4 mb-4">
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <p className="font-semibold text-green-800 mb-1">🎉 Votre ligne de vie est créée !</p>
          <p className="text-green-700 text-sm">
            Vous pouvez explorer votre graphique ci-dessous et ajouter autant d'autres épisodes que vous souhaitez, dans l'ordre qui vous convient.
          </p>
        </div>
      </div>

      {/* Chart — full window width */}
      <div data-pdf-capture="mood-chart">
        <MoodChart
          moodEntries={moodEntries}
          medications={EMPTY_MEDICATIONS}
          substances={EMPTY_SUBSTANCES}
          lifeEvents={EMPTY_LIFE_EVENTS}
          hospitalizations={hospitalizations}
          instabilityPeriods={instabilityPeriods}
          isLoading={isLoading}
          defaultEpisodeDurationMonths={2}
          fullWidth
        />
      </div>

      {/* Forms and export — constrained */}
      <div className="max-w-4xl mx-auto px-4 space-y-8 mt-8">

      {/* Add more episodes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Plus className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-semibold text-slate-800">Ajouter un autre épisode</span>
          </div>
          <span className="text-slate-400 text-sm">{showAddForm ? "Fermer ▲" : "Ouvrir ▼"}</span>
        </button>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-5 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Début <span className="text-red-500">*</span></Label>
                <Input type="month" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white" />
                {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Fin <span className="text-slate-400 text-xs font-normal">(optionnel)</span></Label>
                <Input type="month" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white" />
                {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-medium mb-2 block">Humeur durant cette période</Label>
              <div className="flex justify-between text-xs text-slate-400 mb-2 px-1">
                <span>Très déprimé(e)</span><span>Normal</span><span>Très exalté(e)</span>
              </div>
              <Slider value={moodLevel} onValueChange={setMoodLevel} min={-5} max={5} step={1} className="mb-2" />
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border mt-1"
                style={{ borderColor: info.color + "40", backgroundColor: info.color + "12" }}>
                <span className="text-lg">{info.emoji}</span>
                <span className="font-bold text-sm" style={{ color: info.color }}>{moodLevel[0] > 0 ? "+" : ""}{moodLevel[0]}</span>
                <span className="text-slate-500 text-xs ml-1">{info.label}</span>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-medium mb-1.5 block">Événement déclencheur <span className="text-slate-400 text-xs font-normal">(optionnel)</span></Label>
              <Input placeholder="Ex : stress, voyage, changement de traitement…" value={trigger} onChange={e => setTrigger(e.target.value)} className="bg-white" />
            </div>

            <div>
              <Label className="text-slate-700 font-medium mb-1.5 block">Notes <span className="text-slate-400 text-xs font-normal">(optionnel)</span></Label>
              <Textarea placeholder="Observations libres…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="bg-white resize-none" />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={createMoodEntry.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {createMoodEntry.isPending ? "Enregistrement…" : "Ajouter cet épisode"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Annuler</Button>
            </div>
          </form>
        )}
      </div>

      {/* Add instability period */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowInstabilityForm(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <span className="text-slate-500 text-sm font-bold">~</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Ajouter une période d'instabilité</span>
              <p className="text-xs text-slate-400 mt-0.5">Période de fluctuations thymiques — s'affiche en gris sur le graphique</p>
            </div>
          </div>
          <span className="text-slate-400 text-sm">{showInstabilityForm ? "Fermer ▲" : "Ouvrir ▼"}</span>
        </button>

        {showInstabilityForm && (
          <form onSubmit={handleInstabilitySubmit} className="px-6 pb-6 pt-2 space-y-5 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600">
              💡 Une période d'instabilité représente une phase où votre humeur fluctuait, sans être clairement dépressive ou maniaque.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">
                  Début <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="month"
                  value={instStartDate}
                  onChange={e => { setInstStartDate(e.target.value); setInstErrors({}); }}
                  className="bg-white"
                />
                {instErrors.instStartDate && <p className="text-red-500 text-xs mt-1">{instErrors.instStartDate}</p>}
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">
                  Fin <span className="text-slate-400 text-xs font-normal">(optionnel)</span>
                </Label>
                <Input
                  type="month"
                  value={instEndDate}
                  onChange={e => { setInstEndDate(e.target.value); setInstErrors({}); }}
                  className="bg-white"
                />
                {instErrors.instEndDate && <p className="text-red-500 text-xs mt-1">{instErrors.instEndDate}</p>}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={createInstabilityPeriod.isPending}
                className="bg-slate-600 hover:bg-slate-700 text-white"
              >
                {createInstabilityPeriod.isPending ? "Enregistrement…" : "Ajouter cette période"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowInstabilityForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Export / Import toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wide">Exporter / Importer</p>
        <div className="flex flex-wrap gap-2">
          <PDFExport moodEntries={moodEntries} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="flex items-center gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            <FileDown className="w-4 h-4" />
            Exporter Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isImporting}
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            <FileUp className="w-4 h-4" />
            {isImporting ? "Import…" : "Importer Excel"}
          </Button>
          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleImportExcel(e.target.files[0]); }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">L'export Excel est compatible avec le mode praticien pour transfert de données.</p>
      </div>
      </div>{/* end max-w-4xl forms container */}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PatientMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showStepIntro, setShowStepIntro] = useState(false);
  const [sessionEntryIds, setSessionEntryIds] = useState<number[]>([]);
  const [sessionHospIds, setSessionHospIds] = useState<number[]>([]);
  const [mainAnimKey, setMainAnimKey] = useState(0);
  const [mainAnimClass, setMainAnimClass] = useState("patient-fade-up");
  const totalGuided = STEPS.length;
  const isChartStep = currentStep === totalGuided;

  function goForward() { setMainAnimClass("patient-slide-forward"); setMainAnimKey(k => k + 1); }
  function goBack()    { setMainAnimClass("patient-slide-back");    setMainAnimKey(k => k + 1); }

  function handleStepSuccess(id: number) {
    setSessionEntryIds(ids => [...ids, id]);
    const nextStep = currentStep + 1;
    goForward();
    setCurrentStep(nextStep);
    if (nextStep < totalGuided) setShowStepIntro(true);
  }

  function handleSkip() {
    const nextStep = currentStep + 1;
    goForward();
    setCurrentStep(nextStep);
    if (nextStep < totalGuided) setShowStepIntro(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30">

      {showIntro && <IntroModal onStart={() => { setShowIntro(false); setShowStepIntro(true); }} />}
      {!showIntro && showStepIntro && !isChartStep && (
        <StepIntroModal stepIndex={currentStep} onContinue={() => setShowStepIntro(false)} />
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Accueil
          </button>

          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-green-500 rounded-full" />
            <span className="text-sm font-semibold text-slate-700">Ligne de Vie Thymique</span>
          </div>

          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors"
          >
            <HelpCircle className="w-4 h-4" /> Aide
          </button>
        </div>
      </div>

      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

      {isChartStep ? (
        /* ── Chart step: full viewport width ── */
        <div key={mainAnimKey} className={`${mainAnimClass} pb-12`}>
          {/* Header — centred but not too wide */}
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Votre ligne de vie</h2>
            </div>
            <p className="text-slate-500 text-sm ml-12">Continuez à enrichir votre graphique à votre rythme.</p>
          </div>
          {/* ChartStep owns its layout: full-width chart + constrained forms */}
          <ChartStep initialSessionIds={sessionEntryIds} initialSessionHospIds={sessionHospIds} />
        </div>
      ) : (
        /* ── Guided steps: constrained ── */
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div key={mainAnimKey} className={mainAnimClass}>
            {/* Progress + title */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <StepIndicator current={currentStep} total={totalGuided} />
                <span className="text-xs text-slate-400 font-medium">
                  Étape {currentStep + 1} sur {totalGuided}
                </span>
              </div>
              <div className="mb-2">
                <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mb-3 tracking-wide uppercase">
                  {STEPS[currentStep].stepLabel}
                </span>
                <h2 className="text-2xl font-bold text-slate-800 leading-snug">
                  {STEPS[currentStep].title}
                </h2>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                {STEPS[currentStep].subtitle}
              </p>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <GuidedEpisodeForm
                key={currentStep}
                stepIndex={currentStep}
                onSuccess={handleStepSuccess}
                onHospitalization={id => setSessionHospIds(ids => [...ids, id])}
                onSkip={STEPS[currentStep].skippable ? handleSkip : undefined}
              />
            </div>

            {/* Back button */}
            {currentStep > 0 && (
              <button
                onClick={() => { goBack(); setCurrentStep(s => s - 1); }}
                className="mt-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Étape précédente
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
