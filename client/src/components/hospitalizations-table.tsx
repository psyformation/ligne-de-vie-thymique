import type { Hospitalization } from "@shared/schema";
import { Trash2, Calendar, Building2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HospitalizationsTableProps {
  hospitalizations: Hospitalization[];
}

export default function HospitalizationsTable({ hospitalizations }: HospitalizationsTableProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteHospitalization = useMutation({
    mutationFn: async (hospitalizationId: number) => {
      return apiRequest("DELETE", `/api/hospitalizations/${hospitalizationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations"] });
      toast({
        title: "Hospitalisation supprimée",
        description: "L'hospitalisation a été retirée de votre suivi.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'hospitalisation.",
        variant: "destructive",
      });
    },
  });

  const sortedHospitalizations = [...hospitalizations].sort((a, b) => {
    const dateA = a.startDate.length === 7 ? a.startDate + "-01" : a.startDate;
    const dateB = b.startDate.length === 7 ? b.startDate + "-01" : b.startDate;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const formatDate = (dateStr: string) => {
    if (dateStr.length === 7) {
      const [year, month] = dateStr.split('-');
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const formatDateRange = (startDate: string, endDate?: string | null) => {
    const start = formatDate(startDate);
    if (!endDate) return `${start} (en cours)`;
    const end = formatDate(endDate);
    if (start === end) return start;
    return `${start} - ${end}`;
  };

  const calculateDuration = (startDate: string, endDate?: string | null) => {
    const startStr = startDate.length === 7 ? startDate + "-01" : startDate;
    const endStr = endDate ? (endDate.length === 7 ? endDate + "-01" : endDate) : new Date().toISOString().split('T')[0];
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    
    if (days < 7) return `${days} jour${days > 1 ? 's' : ''}`;
    if (days < 30) return `${Math.round(days / 7)} semaine${days >= 14 ? 's' : ''}`;
    if (days < 365) return `${Math.round(days / 30)} mois`;
    return `${Math.round(days / 365 * 10) / 10} an${days >= 730 ? 's' : ''}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hospitalizations-table-container">
      <div className="flex items-center mb-6">
        <div className="w-2 h-8 bg-red-500 rounded-full mr-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Mes Hospitalisations</h2>
      </div>

      {sortedHospitalizations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune hospitalisation enregistrée</h3>
          <p className="text-gray-500">Ajoutez vos séjours hospitaliers pour un suivi complet.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedHospitalizations.map((hospitalization) => (
            <div
              key={hospitalization.id}
              className="p-4 rounded-lg border border-red-200 bg-red-50 hover:border-red-300 transition-colors"
              data-testid={`card-hospitalization-${hospitalization.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Building2 className="w-4 h-4 mr-2 text-red-600" />
                    <span className="font-semibold text-gray-900">
                      {hospitalization.location || "Hospitalisation"}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2 space-y-1">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDateRange(hospitalization.startDate, hospitalization.endDate)}
                      <span className="ml-2 text-gray-500">
                        ({calculateDuration(hospitalization.startDate, hospitalization.endDate)})
                      </span>
                    </div>
                  </div>

                  {hospitalization.notes && (
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Notes:</strong> {hospitalization.notes}
                    </div>
                  )}
                </div>

                <div className="ml-4 flex items-center space-x-2">
                  <button
                    onClick={() => deleteHospitalization.mutate(hospitalization.id)}
                    disabled={deleteHospitalization.isPending}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    title="Supprimer cette hospitalisation"
                    data-testid={`button-delete-hospitalization-${hospitalization.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
