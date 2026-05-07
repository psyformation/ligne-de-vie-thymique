import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Activity, Pill, Pencil, Trash2 } from "lucide-react";
import type { MoodEntry, Medication, Substance, Hospitalization, LifeEvent } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MoodEntryForm from "@/components/mood-entry-form";
import MoodChart from "@/components/mood-chart";
import MoodScale from "@/components/mood-scale";
import EpisodesTable from "@/components/episodes-table";
import MedicationForm from "@/components/medication-form";
import MedicationsTable from "@/components/medications-table";
import MedicationTextImporter from "@/components/medication-text-importer";
import SubstanceForm from "@/components/substance-form";
import SubstancesTable from "@/components/substances-table";
import HospitalizationForm from "@/components/hospitalization-form";
import HospitalizationsTable from "@/components/hospitalizations-table";
import EpisodeSummary from "@/components/episode-summary";
import PDFExport from "@/components/pdf-export";
import ExcelControls from "@/components/excel-controls";
import TutorialModal from "@/components/tutorial-modal";
import LifeEventsSection from "@/components/life-events-section";
import EpisodeEditModal from "@/components/episode-edit-modal";

type Tab = "ligne-de-vie" | "informations";

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  entry: MoodEntry | null;
}

export default function MoodTracker() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("ligne-de-vie");
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ visible: false, x: 0, y: 0, entry: null });
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu.visible) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === "Escape") setContextMenu(m => ({ ...m, visible: false })); return; }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(m => ({ ...m, visible: false }));
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [contextMenu.visible]);

  const deleteEpisodeMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/mood-entries/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood-entries"] });
      toast({ title: "Supprimé", description: "Épisode supprimé" });
      setContextMenu(m => ({ ...m, visible: false }));
    },
    onError: () => { toast({ title: "Erreur", description: "Impossible de supprimer l'épisode", variant: "destructive" }); },
  });

  const handleChartRightClick = (entry: MoodEntry, x: number, y: number) => {
    setContextMenu({ visible: true, x, y, entry });
  };

  // All data fetched at top level so the chart always has everything regardless of active tab
  const { data: moodEntries = [], isLoading } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood-entries"],
  });
  const { data: medications = [] } = useQuery<Medication[]>({
    queryKey: ["/api/medications"],
  });
  const { data: substances = [] } = useQuery<Substance[]>({
    queryKey: ["/api/substances"],
  });
  const { data: instabilityPeriods = [] } = useQuery<any[]>({
    queryKey: ["/api/instability-periods"],
  });
  const { data: hospitalizations = [] } = useQuery<Hospitalization[]>({
    queryKey: ["/api/hospitalizations"],
  });
  const { data: lifeEvents = [] } = useQuery<LifeEvent[]>({
    queryKey: ["/api/life-events"],
  });

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "ligne-de-vie",   label: "Ligne de Vie",              icon: Activity },
    { id: "informations",   label: "Informations complémentaires", icon: Pill },
  ];

  return (
    <div className="bg-medical-surface medical-gradient-bg medical-grid-bg font-inter text-medical-text-primary min-h-screen">

      {/* Header */}
      <header className="bg-gradient-to-br from-slate-50/50 to-blue-50/60 backdrop-blur-md shadow-lg border-b border-medical-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mr-4 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Accueil
            </button>
            <div className="text-center flex-1">
              <div className="flex items-center justify-center mb-3">
                <div className="w-3 h-12 bg-gradient-to-b from-medical-blue to-medical-green rounded-full mr-6"></div>
                <h1 className="text-4xl font-bold text-medical-text-primary tracking-tight">Ligne de Vie Thymique</h1>
                <div className="w-3 h-12 bg-gradient-to-b from-medical-green to-medical-purple rounded-full ml-6"></div>
              </div>
              <p className="text-medical-text-secondary text-lg font-medium">
                Outil pour mieux tracer les fluctuations thymiques ainsi que les prises de traitements et de substances
              </p>
            </div>
            <div className="ml-8 flex items-center gap-4">
              <TutorialModal />
              <ExcelControls
                moodEntries={moodEntries}
                medications={medications}
                substances={substances}
                instabilityPeriods={instabilityPeriods}
              />
              <PDFExport
                moodEntries={moodEntries}
                medications={medications}
                substances={substances}
              />
            </div>
          </div>
        </div>

        {/* Tab Bar — inside header so it feels part of the navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 border-t border-medical-border/40 pt-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg transition-all border-b-2
                    ${isActive
                      ? "bg-white text-medical-blue border-medical-blue shadow-sm"
                      : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-white/50"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── TAB 1: Ligne de Vie ─────────────────────────────────────────────── */}
      {activeTab === "ligne-de-vie" && (
        <>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

            {/* Section: Épisodes Thymiques */}
            <section className="mb-10">
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <div className="w-1 h-8 bg-medical-blue rounded-full mr-4"></div>
                  <h2 className="text-2xl font-semibold text-medical-text-primary">Suivi des Épisodes Thymiques</h2>
                </div>
                <div className="h-px bg-gradient-to-r from-medical-blue/30 to-transparent mb-8"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5">
                  <MoodEntryForm />
                </div>
                <div className="lg:col-span-3">
                  <MoodScale />
                </div>
                <div className="lg:col-span-4">
                  <EpisodesTable moodEntries={moodEntries} />
                </div>
              </div>

              <div className="mt-8">
                <LifeEventsSection />
              </div>
            </section>

          </main>

          {/* Chart — full width */}
          <section
            className="bg-white/95 backdrop-blur-sm border-t-2 border-medical-border shadow-inner medical-wave-pattern"
            data-pdf-capture="mood-chart"
          >
            <div className="max-w-full px-4 sm:px-6 lg:px-8 py-12">
              <div className="mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-1 h-8 bg-gradient-to-b from-medical-blue to-medical-green rounded-full mr-4"></div>
                  <h2 className="text-3xl font-semibold text-medical-text-primary text-center">
                    Visualisation de la Ligne de Vie
                  </h2>
                  <div className="w-1 h-8 bg-gradient-to-b from-medical-green to-medical-purple rounded-full ml-4"></div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-medical-border to-transparent mb-4"></div>
                <p className="text-center text-xs text-slate-400">
                  Clic droit sur un épisode pour le modifier ou le supprimer
                </p>
              </div>
              <MoodChart
                moodEntries={moodEntries}
                medications={medications}
                substances={substances}
                hospitalizations={hospitalizations}
                lifeEvents={lifeEvents}
                isLoading={isLoading}
                defaultEpisodeDurationMonths={2}
                onEpisodeRightClick={handleChartRightClick}
              />
            </div>
          </section>

          {/* Synthèse */}
          <section className="bg-medical-surface/80 backdrop-blur-sm border-t border-medical-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-1 h-6 bg-medical-blue rounded-full mr-3"></div>
                  <h2 className="text-xl font-semibold text-medical-text-primary">Synthèse Statistique</h2>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-medical-border to-transparent mb-6"></div>
              </div>
              <EpisodeSummary moodEntries={moodEntries} hospitalizations={hospitalizations} />
            </div>
          </section>
        </>
      )}

      {/* ── TAB 2: Informations complémentaires ─────────────────────────────── */}
      {activeTab === "informations" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Rappel graphique */}
          <div className="mb-10 bg-blue-50/60 border border-blue-100 rounded-xl px-5 py-4 flex items-start gap-3">
            <Activity className="w-5 h-5 text-medical-blue mt-0.5 shrink-0" />
            <p className="text-sm text-slate-600">
              Les médicaments, substances et hospitalisations que vous saisissez ici continuent d'apparaître
              sur le graphique de la <button onClick={() => setActiveTab("ligne-de-vie")} className="text-medical-blue font-medium underline underline-offset-2 hover:no-underline">Ligne de Vie</button>.
            </p>
          </div>

          {/* Médicaments */}
          <section className="mb-16">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-1 h-8 bg-green-600 rounded-full mr-4"></div>
                  <h2 className="text-2xl font-semibold text-medical-text-primary">Gestion des Médicaments</h2>
                </div>
                <MedicationTextImporter />
              </div>
              <div className="h-px bg-gradient-to-r from-green-600/30 to-transparent mb-8"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5">
                <MedicationForm />
              </div>
              <div className="lg:col-span-7">
                <MedicationsTable medications={medications} />
              </div>
            </div>
          </section>

          {/* Substances */}
          <section className="mb-16">
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="w-1 h-8 bg-purple-600 rounded-full mr-4"></div>
                <h2 className="text-2xl font-semibold text-medical-text-primary">Suivi des Substances</h2>
              </div>
              <div className="h-px bg-gradient-to-r from-purple-600/30 to-transparent mb-8"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5">
                <SubstanceForm />
              </div>
              <div className="lg:col-span-7">
                <SubstancesTable />
              </div>
            </div>
          </section>

          {/* Hospitalisations */}
          <section className="mb-16">
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="w-1 h-8 bg-red-600 rounded-full mr-4"></div>
                <h2 className="text-2xl font-semibold text-medical-text-primary">Suivi des Hospitalisations</h2>
              </div>
              <div className="h-px bg-gradient-to-r from-red-600/30 to-transparent mb-8"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5">
                <HospitalizationForm />
              </div>
              <div className="lg:col-span-7">
                <HospitalizationsTable hospitalizations={hospitalizations} />
              </div>
            </div>
          </section>

        </main>
      )}

      {/* Context menu for right-click on chart episodes */}
      {contextMenu.visible && contextMenu.entry && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 210 }}
        >
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Épisode</p>
            <p className="text-sm font-medium text-slate-800 truncate">{contextMenu.entry.episodeType}</p>
            <p className="text-xs text-slate-500">{contextMenu.entry.startDate}{contextMenu.entry.endDate ? ` → ${contextMenu.entry.endDate}` : ""}</p>
          </div>
          <div className="py-1">
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
              onClick={() => { if (contextMenu.entry) { setEditingEntry(contextMenu.entry); setContextMenu(m => ({ ...m, visible: false })); } }}
            >
              <Pencil className="w-4 h-4 shrink-0" />
              Modifier l'épisode
            </button>
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              onClick={() => { if (contextMenu.entry) deleteEpisodeMutation.mutate(contextMenu.entry.id); }}
              disabled={deleteEpisodeMutation.isPending}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              {deleteEpisodeMutation.isPending ? "Suppression…" : "Supprimer l'épisode"}
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingEntry && (
        <EpisodeEditModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white/95 backdrop-blur-sm border-t-2 border-medical-border mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="w-px h-6 bg-gradient-to-b from-medical-blue to-medical-green mr-4"></div>
              <p className="text-sm text-medical-text-secondary font-medium">
                Application pour mieux tracer les fluctuations thymiques
              </p>
              <div className="w-px h-6 bg-gradient-to-b from-medical-green to-medical-purple ml-4"></div>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-medical-border to-transparent mb-3"></div>
            <p className="text-xs text-medical-text-secondary">
              ⚠️ Outil d'aide au suivi - Consultez toujours un professionnel de santé pour un diagnostic médical
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
