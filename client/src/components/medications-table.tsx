import type { Medication } from "@shared/schema";
import { Trash2, Calendar, Pill, Play, Square } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface MedicationsTableProps {
  medications: Medication[];
}

export default function MedicationsTable({ medications }: MedicationsTableProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMedication = useMutation({
    mutationFn: async (medicationId: number) => {
      return apiRequest("DELETE", `/api/medications/${medicationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      toast({
        title: "Médicament supprimé",
        description: "Le médicament a été retiré de votre suivi.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le médicament.",
        variant: "destructive",
      });
    },
  });

  const toggleMedicationStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const updateData = { 
        isActive: !isActive,
        endDate: !isActive ? null : new Date().toISOString().split('T')[0]
      };
      return apiRequest("PUT", `/api/medications/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut du médicament a été modifié.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du médicament.",
        variant: "destructive",
      });
    },
  });

  const sortedMedications = [...medications].sort((a, b) => {
    // Active medications first, then by start date
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  const getMedicationTypeLabel = (type: string | null) => {
    const types: { [key: string]: string } = {
      mood_stabilizer: "Stabilisateur d'humeur",
      antidepressant: "Antidépresseur", 
      antipsychotic: "Antipsychotique",
      anxiolytic: "Anxiolytique",
      other: "Autre"
    };
    return type ? types[type] || type : "";
  };

  const getFrequencyLabel = (frequency: string | null) => {
    const frequencies: { [key: string]: string } = {
      daily: "1x/jour",
      twice_daily: "2x/jour",
      three_times_daily: "3x/jour",
      weekly: "Hebdomadaire",
      as_needed: "Au besoin"
    };
    return frequency ? frequencies[frequency] || frequency : "";
  };

  const formatDateRange = (startDate: string, endDate?: string | null, isActive?: boolean) => {
    const start = new Date(startDate).toLocaleDateString('fr-FR');
    if (isActive && !endDate) return `${start} (actif)`;
    if (!endDate) return `${start} (arrêté)`;
    const end = new Date(endDate).toLocaleDateString('fr-FR');
    return `${start} - ${end}`;
  };

  const calculateDuration = (startDate: string, endDate?: string | null) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    
    if (days < 30) return `${days} jour${days > 1 ? 's' : ''}`;
    if (days < 365) return `${Math.round(days / 30)} mois`;
    return `${Math.round(days / 365 * 10) / 10} an${days >= 730 ? 's' : ''}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 medications-table-container">
      <div className="flex items-center mb-6">
        <div className="w-2 h-8 bg-green-500 rounded-full mr-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Mes Médicaments</h2>
      </div>

      {sortedMedications.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Pill className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun médicament enregistré</h3>
          <p className="text-gray-500">Commencez par ajouter vos médicaments pour suivre vos traitements.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedMedications.map((medication) => (
            <div
              key={medication.id}
              className={`p-4 rounded-lg border transition-colors ${
                medication.isActive 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Pill className={`w-4 h-4 mr-2 ${medication.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="font-semibold text-gray-900">{medication.name}</span>
                    {medication.dosage && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {medication.dosage}
                      </Badge>
                    )}
                    <Badge 
                      variant={medication.isActive ? "default" : "secondary"}
                      className={`ml-2 text-xs ${
                        medication.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {medication.isActive ? 'Actif' : 'Arrêté'}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2 space-y-1">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDateRange(medication.startDate, medication.endDate, medication.isActive)}
                      <span className="ml-2 text-gray-500">
                        ({calculateDuration(medication.startDate, medication.endDate)})
                      </span>
                    </div>
                    
                    {medication.frequency && (
                      <div className="text-gray-600">
                        <strong>Fréquence:</strong> {getFrequencyLabel(medication.frequency)}
                      </div>
                    )}
                    
                    {medication.medicationType && (
                      <div className="text-gray-600">
                        <strong>Type:</strong> {getMedicationTypeLabel(medication.medicationType)}
                      </div>
                    )}
                  </div>

                  {medication.notes && (
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Notes:</strong> {medication.notes}
                    </div>
                  )}
                </div>

                <div className="ml-4 flex items-center space-x-2">
                  <button
                    onClick={() => toggleMedicationStatus.mutate({ 
                      id: medication.id, 
                      isActive: medication.isActive || false 
                    })}
                    disabled={toggleMedicationStatus.isPending}
                    className={`p-2 rounded-lg transition-colors ${
                      medication.isActive
                        ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                        : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                    }`}
                    title={medication.isActive ? "Arrêter ce médicament" : "Reprendre ce médicament"}
                  >
                    {medication.isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => deleteMedication.mutate(medication.id)}
                    disabled={deleteMedication.isPending}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer ce médicament"
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