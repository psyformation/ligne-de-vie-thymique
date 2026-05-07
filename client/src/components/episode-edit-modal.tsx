import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type MoodEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { X, Trash2, Save } from "lucide-react";

interface EpisodeEditModalProps {
  entry: MoodEntry;
  onClose: () => void;
}

function getMoodLabel(level: number): string {
  if (level <= -4) return "Dépression sévère";
  if (level === -3) return "Dépression modérée";
  if (level === -2) return "Tristesse modérée";
  if (level === -1) return "Légère tristesse";
  if (level === 0) return "Euthymie";
  if (level === 1) return "Légère élation";
  if (level === 2) return "Humeur élevée";
  if (level === 3) return "Hypomanie";
  if (level === 4) return "Manie";
  return "Manie sévère";
}

function getMoodColor(level: number): string {
  if (level <= -3) return "text-blue-700";
  if (level < 0) return "text-blue-500";
  if (level === 0) return "text-gray-500";
  if (level >= 3) return "text-orange-600";
  return "text-amber-500";
}

export default function EpisodeEditModal({ entry, onClose }: EpisodeEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMixed = entry.episodeType === "Mixte";

  const [startDate, setStartDate] = useState(entry.startDate);
  const [endDate, setEndDate] = useState(entry.endDate ?? "");
  const [moodLevel, setMoodLevel] = useState([entry.moodLevel]);
  const [excitationLevel, setExcitationLevel] = useState([(entry as any).mixedExcitationLevel ?? 3]);
  const [depressiveLevel, setDepressiveLevel] = useState([(entry as any).mixedDepressiveLevel ?? 3]);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [triggerEvents, setTriggerEvents] = useState(entry.triggerEvents ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        startDate,
        endDate: endDate.trim() || undefined,
        moodLevel: isMixed ? 0 : moodLevel[0],
        notes: notes || undefined,
        triggerEvents: triggerEvents || undefined,
      };
      if (isMixed) {
        body.mixedExcitationLevel = excitationLevel[0];
        body.mixedDepressiveLevel = depressiveLevel[0];
      }
      const res = await apiRequest("PATCH", `/api/mood-entries/${entry.id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood-entries"] });
      toast({ title: "Succès", description: "Épisode mis à jour" });
      onClose();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour l'épisode", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/mood-entries/${entry.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood-entries"] });
      toast({ title: "Supprimé", description: "Épisode supprimé" });
      onClose();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer l'épisode", variant: "destructive" });
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${isMixed ? "bg-violet-50 border-b border-violet-200" : "bg-slate-50 border-b border-slate-200"}`}>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Modifier l'épisode</h2>
            <p className="text-sm text-slate-500">{entry.episodeType} · ID {entry.id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Date de début *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Date de fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Mood level or mixed sliders */}
          {isMixed ? (
            <div className="space-y-4 bg-violet-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Épisode mixte — niveaux</p>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs text-violet-700">Excitation</Label>
                  <span className="text-sm font-bold text-violet-700">+{excitationLevel[0]}</span>
                </div>
                <Slider
                  min={1} max={5} step={1}
                  value={excitationLevel}
                  onValueChange={setExcitationLevel}
                  className="[&_[role=slider]]:bg-violet-600"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs text-violet-700">Dépressif</Label>
                  <span className="text-sm font-bold text-violet-700">-{depressiveLevel[0]}</span>
                </div>
                <Slider
                  min={1} max={5} step={1}
                  value={depressiveLevel}
                  onValueChange={setDepressiveLevel}
                  className="[&_[role=slider]]:bg-violet-600"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-medium text-slate-600">Intensité</Label>
                <span className={`text-sm font-bold ${getMoodColor(moodLevel[0])}`}>
                  {moodLevel[0] > 0 ? "+" : ""}{moodLevel[0]} — {getMoodLabel(moodLevel[0])}
                </span>
              </div>
              <Slider
                min={-5} max={5} step={1}
                value={moodLevel}
                onValueChange={setMoodLevel}
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>-5</span><span>0</span><span>+5</span>
              </div>
            </div>
          )}

          {/* Trigger events */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Événements déclenchants</Label>
            <Input
              value={triggerEvents}
              onChange={e => setTriggerEvents(e.target.value)}
              placeholder="Ex : stress professionnel, manque de sommeil…"
              className="text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Notes cliniques</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observations, symptômes, évolution…"
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {/* Delete zone */}
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Confirmer ?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  Oui, supprimer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Non
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Supprimer
              </Button>
            )}
          </div>

          {/* Save / cancel */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              size="sm"
              className="bg-medical-blue hover:bg-blue-700"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !startDate}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
