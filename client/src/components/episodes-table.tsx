import type { MoodEntry } from "@shared/schema";
import { Trash2, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EpisodesTableProps {
  moodEntries: MoodEntry[];
}

export default function EpisodesTable({ moodEntries }: EpisodesTableProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteEpisode = useMutation({
    mutationFn: async (episodeId: number) => {
      console.log(`[FRONTEND] Tentative de suppression de l'épisode ID: ${episodeId}`);
      const response = await apiRequest("DELETE", `/api/mood-entries/${episodeId}`);
      console.log(`[FRONTEND] Réponse de suppression:`, response.status);
      return response;
    },
    onSuccess: () => {
      console.log(`[FRONTEND] Suppression réussie`);
      queryClient.invalidateQueries({ queryKey: ["/api/mood-entries"] });
      toast({
        title: "Épisode supprimé",
        description: "L'épisode a été retiré de votre ligne de vie.",
      });
    },
    onError: (error) => {
      console.error(`[FRONTEND] Erreur lors de la suppression:`, error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'épisode.",
        variant: "destructive",
      });
    },
  });

  const sortedEntries = [...moodEntries].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const getMoodIcon = (entry: MoodEntry) => {
    if (entry.episodeType === 'Mixte') return <span className="text-purple-600 text-sm font-bold">☯</span>;
    if (entry.moodLevel > 0) return <TrendingUp className="w-4 h-4 text-orange-500" />;
    if (entry.moodLevel < 0) return <TrendingDown className="w-4 h-4 text-blue-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getMoodLabel = (entry: MoodEntry) => {
    if (entry.episodeType === 'Mixte') {
      const excLvl = (entry as any).mixedExcitationLevel ?? 2;
      const depLvl = (entry as any).mixedDepressiveLevel ?? 2;
      return `Épisode mixte (+${excLvl} / -${depLvl})`;
    }
    const level = entry.moodLevel;
    if (level === 5) return "Manie sévère";
    if (level === 4) return "Manie";
    if (level === 3) return "Hypomanie";
    if (level === 2) return "Humeur élevée";
    if (level === 1) return "Joie normale";
    if (level === 0) return "Euthymique";
    if (level === -1) return "Tristesse normale";
    if (level === -2) return "Humeur basse";
    if (level === -3) return "Dépression légère";
    if (level === -4) return "Dépression modérée";
    if (level === -5) return "Dépression sévère";
    return "Non défini";
  };

  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = new Date(startDate).toLocaleDateString('fr-FR');
    if (!endDate) return `${start} (en cours)`;
    if (startDate === endDate) return start;
    const end = new Date(endDate).toLocaleDateString('fr-FR');
    return `${start} - ${end}`;
  };

  const calculateDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return days === 1 ? "1 jour" : `${days} jours`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 episodes-table-container">
      <div className="flex items-center mb-6">
        <div className="w-2 h-8 bg-medical-blue rounded-full mr-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Historique des Épisodes</h2>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun épisode enregistré</h3>
          <p className="text-gray-500">Commencez par ajouter votre premier épisode thymique.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {getMoodIcon(entry)}
                    <span className={`ml-2 ${entry.episodeType === 'Mixte' ? 'text-purple-800' : 'text-gray-900'}`}>
                      <span className="font-bold">{getMoodLabel(entry)}</span>
                      {entry.episodeType !== 'Mixte' && ` (${entry.moodLevel > 0 ? '+' : ''}${entry.moodLevel})`}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDateRange(entry.startDate, entry.endDate || "")}
                      <span className="ml-2 text-gray-500">
                        ({calculateDuration(entry.startDate, entry.endDate || "")})
                      </span>
                    </div>
                  </div>

                  {entry.triggerEvents && (
                    <div className="text-sm text-gray-700 mb-1">
                      <strong>Déclencheurs:</strong> {entry.triggerEvents}
                    </div>
                  )}

                  {entry.notes && (
                    <div className="text-sm text-gray-600">
                      <strong>Notes:</strong> {entry.notes}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteEpisode.mutate(entry.id)}
                  disabled={deleteEpisode.isPending}
                  className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer cet épisode"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sortedEntries.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500 text-center">
            {sortedEntries.length} épisode{sortedEntries.length > 1 ? 's' : ''} enregistré{sortedEntries.length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}