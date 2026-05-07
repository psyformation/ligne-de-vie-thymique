import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Check, AlertCircle, Loader2, ChevronLeft } from "lucide-react";
import type { InsertMedication } from "@shared/schema";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedMed {
  name: string;
  dosage: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  frequency: string;
  notes: string;
}

// ── French date helpers ────────────────────────────────────────────────────────

const MONTHS: Record<string, string> = {
  "janvier": "01", "jan": "01",
  "février": "02", "fevrier": "02", "fev": "02",
  "mars": "03",
  "avril": "04", "avr": "04",
  "mai": "05",
  "juin": "06",
  "juillet": "07", "juil": "07",
  "été": "07", "ete": "07",
  "août": "08", "aout": "08",
  "septembre": "09", "sep": "09", "sept": "09",
  "octobre": "10", "oct": "10",
  "novembre": "11", "nov": "11",
  "décembre": "12", "decembre": "12", "dec": "12",
  "printemps": "03",
  "automne": "09",
  "hiver": "12",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function parseFrenchDate(raw: string): string | null {
  const s = raw.trim().toLowerCase();

  if (!s || s === "?" || s.match(/^[?]+$/) || s.includes("jusqu'\u00e0 ?") || s.includes("jusqu'a ?")) {
    return null;
  }
  if (
    s.includes("aujourd'hui") ||
    s.includes("aujourd") ||
    s.includes("ce jour") ||
    s.includes("\u00e0 ce jour") ||
    s === "today"
  ) {
    return todayStr();
  }

  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  if (s.match(/^\d{4}$/)) return `${s}-01-01`;

  for (const [word, num] of Object.entries(MONTHS)) {
    if (s.includes(word)) {
      const y = s.match(/(\d{4})/);
      if (y) return `${y[1]}-${num}-01`;
    }
  }

  const yearFallback = s.match(/(\d{4})/);
  if (yearFallback) return `${yearFallback[1]}-01-01`;

  return null;
}

function parseDateRange(range: string): { start: string | null; end: string | null } {
  const raw = range.trim();

  const separators = [
    /\s+jusqu['']?\u00e0\s+/i,
    /\s+jusqu['']?a\s+/i,
    /\s+au\s+/i,
    /\s*\u2013\s*/,
    /\s*\u2014\s*/,
  ];

  for (const sep of separators) {
    const parts = raw.split(sep);
    if (parts.length === 2) {
      return { start: parseFrenchDate(parts[0]), end: parseFrenchDate(parts[1]) };
    }
  }

  // hyphen separator: careful not to split ISO dates
  const hyphenParts = raw.split(/\s+-\s+/);
  if (hyphenParts.length === 2) {
    return { start: parseFrenchDate(hyphenParts[0]), end: parseFrenchDate(hyphenParts[1]) };
  }

  return { start: parseFrenchDate(raw), end: null };
}

// ── Name + dosage extractor ────────────────────────────────────────────────────

function extractNameAndDosage(raw: string): { name: string; dosage: string } {
  const beforeComma = raw.split(",")[0].trim();
  const match = beforeComma.match(/(\d+[,.]?\d*\s*mg(?:[/ ]j(?:our)?)?)/i);
  if (match) {
    const dosage = match[0].trim();
    const idx = beforeComma.indexOf(match[0]);
    const name = beforeComma.slice(0, idx).trim() || beforeComma;
    return { name, dosage };
  }
  return { name: beforeComma, dosage: "" };
}

// ── Structured format parser ───────────────────────────────────────────────────
// e.g. medical software export:
//   XEROQUEL LP 300 mg, comprimé à libération prolongée
//   Du 2024-08-15 à aujourd'hui
//   (empty)
//   1 unité/jour
//   Corriger
//   Supprimer

const SKIP_LINE = /^(Corriger|Supprimer|Psychotrope|D\u00e9but|Posologie|Fin)$/i;
const DATE_LINE_RE = /^Du\s+(\d{4}-\d{2}-\d{2})\s+([\u00e0a]\s+aujourd[''\u2019]hui|au\s+(\d{4}-\d{2}-\d{2}))/i;

function parseStructured(text: string): ParsedMed[] {
  const lines = text.split("\n").map((l) => l.trim());
  const results: ParsedMed[] = [];

  for (let i = 0; i < lines.length; i++) {
    const dateMatch = lines[i].match(DATE_LINE_RE);
    if (!dateMatch) continue;

    let nameIdx = i - 1;
    while (nameIdx >= 0 && (SKIP_LINE.test(lines[nameIdx]) || lines[nameIdx] === "")) nameIdx--;
    const nameLine = nameIdx >= 0 ? lines[nameIdx] : "";
    if (!nameLine || SKIP_LINE.test(nameLine) || DATE_LINE_RE.test(nameLine)) continue;

    const startDate = dateMatch[1];
    const isOngoing = dateMatch[2].toLowerCase().includes("aujourd");
    const endDate = isOngoing ? null : dateMatch[3] ?? null;

    let dosageText = "";
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const l = lines[j];
      if (!SKIP_LINE.test(l) && l && !DATE_LINE_RE.test(l)) {
        if (/unit\u00e9|mg|ind\u00e9fini|comprim\u00e9/i.test(l)) {
          dosageText = l
            .replace(/unit\u00e9s?\/jour/gi, "/j")
            .replace(/comprim\u00e9s?\/jour/gi, "/j")
            .trim();
          break;
        }
      }
    }

    const { name, dosage } = extractNameAndDosage(nameLine);

    results.push({
      name: name.trim(),
      dosage: dosage || dosageText,
      startDate,
      endDate,
      isActive: !endDate,
      frequency: "daily",
      notes: "",
    });
  }

  return results;
}

// ── Free-text format parser ────────────────────────────────────────────────────
// e.g. "2023 - 2024 : Téralithe 600 mg/j + Quétiapine 300 mg"
//      "Février 2024 – mai 2024 : Téralithe 600 mg/j + Lamictal 200 mg/j"

function splitMeds(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (depth === 0 && s.slice(i, i + 3) === " + ") {
      parts.push(current.trim());
      current = "";
      i += 2;
      continue;
    }
    current += s[i];
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseFreetext(text: string): ParsedMed[] {
  const results: ParsedMed[] = [];
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[\s\u25cb\u2022\-\*○•]+/, "").trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const rangePart = line.slice(0, colonIdx).trim();
    const medsPart = line.slice(colonIdx + 1).trim();
    if (!medsPart) continue;

    const { start, end } = parseDateRange(rangePart);
    if (!start) continue;

    const medStrings = splitMeds(medsPart);
    for (const medStr of medStrings) {
      const clean = medStr
        .replace(/\(dont[^)]*\)/gi, "")
        .replace(/\([^)]*\)/g, "")
        .trim();
      if (!clean) continue;

      const { name, dosage } = extractNameAndDosage(clean);
      if (!name) continue;

      const cleanDosage = dosage
        .replace(/\/j$/, " mg/j")
        .replace(/mg mg\/j/, "mg/j")
        .trim();

      results.push({
        name: name.trim(),
        dosage: cleanDosage,
        startDate: start,
        endDate: end,
        isActive: !end || end === todayStr(),
        frequency: "daily",
        notes: "",
      });
    }
  }

  return results;
}

// ── TSV / tab-separated table parser ──────────────────────────────────────────
// Format: Name \t Date range \t Form \t Dosage \t Corriger \t Supprimer
// Each row is one medication on a single line with tab-separated columns.

const TSV_HEADER = /^(Psychotrope|D\u00e9but|Posologie|Corriger|Supprimer)/i;

function parseTSV(text: string): ParsedMed[] {
  const results: ParsedMed[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);

  for (const line of lines) {
    const cols = line.split("\t").map((c) => c.trim());
    if (cols.length < 2) continue;

    const nameLine = cols[0];
    const dateLine = cols[1];
    const dosageCol = cols[3] ?? "";

    // Skip header rows and empty name rows
    if (!nameLine || TSV_HEADER.test(nameLine)) continue;
    // Skip rows where the date column doesn't match our pattern
    const dateMatch = dateLine.match(DATE_LINE_RE);
    if (!dateMatch) continue;

    const startDate = dateMatch[1];
    const isOngoing = dateMatch[2].toLowerCase().includes("aujourd");
    const endDate = isOngoing ? null : (dateMatch[3] ?? null);

    const dosageText = dosageCol
      .replace(/unit\u00e9s?\/jour/gi, "/j")
      .replace(/comprim\u00e9s?\/jour/gi, "/j")
      .trim();

    const { name, dosage } = extractNameAndDosage(nameLine);

    results.push({
      name: name.trim(),
      dosage: dosage || dosageText,
      startDate,
      endDate,
      isActive: !endDate,
      frequency: "daily",
      notes: "",
    });
  }

  return results;
}

// ── Auto-detect and dispatch ───────────────────────────────────────────────────

function parse(text: string): ParsedMed[] {
  // TSV: each row has tabs and a "Du YYYY-MM-DD" column
  if (text.includes("\t") && /Du \d{4}-\d{2}-\d{2}/i.test(text)) {
    return parseTSV(text);
  }
  // Structured multi-line (each field on its own line)
  if (/Du \d{4}-\d{2}-\d{2}/i.test(text) || /Corriger|Supprimer/i.test(text)) {
    return parseStructured(text);
  }
  return parseFreetext(text);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function MedicationTextImporter() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedMed[] | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (meds: InsertMedication[]) => {
      for (const med of meds) {
        await apiRequest("POST", "/api/medications", med);
      }
    },
    onSuccess: (_data, meds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      toast({ title: `${meds.length} médicament(s) importé(s) avec succès` });
      setOpen(false);
      setText("");
      setParsed(null);
    },
    onError: () => {
      toast({ title: "Erreur lors de l'import", variant: "destructive" });
    },
  });

  function handleAnalyze() {
    setParsed(parse(text));
  }

  function handleImport() {
    if (!parsed || parsed.length === 0) return;
    const payload: InsertMedication[] = parsed.map((p) => ({
      name: p.name,
      dosage: p.dosage || null,
      frequency: p.frequency,
      startDate: p.startDate,
      endDate: p.endDate ?? null,
      isActive: p.isActive,
      notes: p.notes,
    }));
    importMutation.mutate(payload);
  }

  function handleClose() {
    setOpen(false);
    setText("");
    setParsed(null);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-violet-700 border-violet-300 hover:bg-violet-50"
      >
        <FileText className="w-4 h-4" />
        Importer depuis un texte
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importer des médicaments depuis un texte</DialogTitle>
            <DialogDescription>
              Collez un extrait de votre dossier médical ou une liste. Le format est détecté automatiquement.
            </DialogDescription>
          </DialogHeader>

          {/* Format hints */}
          {!parsed && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 border border-slate-200 space-y-1.5">
              <p className="font-semibold text-slate-600">Formats acceptés :</p>
              <p>
                <span className="font-medium text-slate-700">Tableau médical</span> — chaque médicament suivi
                d'une ligne <em>«&nbsp;Du AAAA-MM-JJ à aujourd'hui&nbsp;»</em> ou{" "}
                <em>«&nbsp;Du … au …&nbsp;»</em>
              </p>
              <p>
                <span className="font-medium text-slate-700">Texte libre</span> — une ligne par période :{" "}
                <em>2023 – 2024 : Téralithe 600 mg/j + Quétiapine 300 mg</em>
              </p>
              <p>
                Les dates en français sont comprises (
                <em>été 2025, Février 2024, jusqu'à ?, à ce jour…</em>).
              </p>
            </div>
          )}

          {/* Textarea step */}
          {!parsed && (
            <div className="space-y-3">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Collez votre texte ici…"
                className="min-h-[180px] font-mono text-sm leading-relaxed"
              />
              <Button onClick={handleAnalyze} disabled={!text.trim()} className="w-full">
                Analyser le texte
              </Button>
            </div>
          )}

          {/* Preview step */}
          {parsed && (
            <div className="space-y-4">
              {parsed.length === 0 ? (
                <div className="flex items-start gap-3 text-amber-800 bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Aucun médicament détecté</p>
                    <p className="text-sm mt-1">
                      Vérifiez que chaque ligne comporte une plage de dates suivie de deux-points et du nom
                      du médicament, ou que le tableau médical contient des lignes <em>«&nbsp;Du …&nbsp;»</em>.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    {parsed.length} médicament(s) détecté(s) — vérifiez avant d'importer :
                  </p>
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {parsed.map((med, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 bg-white rounded-lg p-3 border border-slate-200"
                      >
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{med.name}</p>
                          <div className="flex flex-wrap gap-x-5 gap-y-0.5 mt-0.5">
                            {med.dosage && (
                              <span className="text-xs text-slate-500">Dosage : {med.dosage}</span>
                            )}
                            <span className="text-xs text-slate-500">Début : {med.startDate}</span>
                            <span className="text-xs text-slate-500">
                              Fin :{" "}
                              {med.endDate ? (
                                med.endDate
                              ) : (
                                <span className="text-emerald-600 font-medium">En cours</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setParsed(null)}
                  className="flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Modifier le texte
                </Button>
                {parsed.length > 0 && (
                  <Button
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Import en cours…
                      </>
                    ) : (
                      `Importer ${parsed.length} médicament(s)`
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
