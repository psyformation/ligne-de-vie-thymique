import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, ToggleLeft, ToggleRight, Cigarette } from "lucide-react";
import type { Substance } from "@shared/schema";

const frequencyLabels: Record<string, string> = {
  daily: "Quotidien",
  several_weekly: "Plusieurs fois/semaine",
  weekly: "Hebdomadaire", 
  several_monthly: "Plusieurs fois/mois",
  monthly: "Mensuel",
  occasional: "Ponctuel",
  festive: "Festif",
  rare: "Rare"
};

export default function SubstancesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: substances = [], isLoading } = useQuery({
    queryKey: ["/api/substances"],
  });

  const deleteSubstance = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/substances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substances"] });
      toast({
        title: "Substance supprimée",
        description: "La substance a été supprimée de votre suivi.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la substance.",
        variant: "destructive",
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => {
      const updates = isActive 
        ? { isActive: false, endPeriod: new Date().toISOString().slice(0, 7) }
        : { isActive: true, endPeriod: null };
      return apiRequest("PUT", `/api/substances/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substances"] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut de la substance a été modifié.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut.",
        variant: "destructive",
      });
    },
  });

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const monthNames = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
      'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const calculateDuration = (startPeriod: string, endPeriod: string | null) => {
    const start = new Date(startPeriod + "-01");
    const end = endPeriod ? new Date(endPeriod + "-01") : new Date();
    
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                       (end.getMonth() - start.getMonth());
    
    if (monthsDiff < 1) return "< 1 mois";
    if (monthsDiff < 12) return `${monthsDiff} mois`;
    
    const years = Math.floor(monthsDiff / 12);
    const remainingMonths = monthsDiff % 12;
    
    if (remainingMonths === 0) return `${years} an${years > 1 ? 's' : ''}`;
    return `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois`;
  };

  if (isLoading) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center">
            <div className="w-2 h-8 bg-purple-500 rounded-full mr-4"></div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Substances</CardTitle>
              <CardDescription>Historique de vos consommations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Chargement des données...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (substances.length === 0) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center">
            <div className="w-2 h-8 bg-purple-500 rounded-full mr-4"></div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Substances</CardTitle>
              <CardDescription>Aucune substance enregistrée</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Cigarette className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune substance</h3>
            <p className="text-gray-500">Commencez par ajouter vos consommations de substances.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center">
          <div className="w-2 h-8 bg-purple-500 rounded-full mr-4"></div>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Substances</CardTitle>
            <CardDescription>{substances.length} substance{substances.length > 1 ? 's' : ''} enregistrée{substances.length > 1 ? 's' : ''}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Substance</TableHead>
              <TableHead>Fréquence</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {substances.map((substance: Substance) => (
              <TableRow key={substance.id}>
                <TableCell className="font-medium">{substance.name}</TableCell>
                <TableCell>
                  {substance.frequency ? frequencyLabels[substance.frequency] || substance.frequency : "-"}
                </TableCell>
                <TableCell>{substance.quantity || "-"}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{formatPeriod(substance.startPeriod)}</div>
                    {substance.endPeriod && (
                      <div className="text-gray-500">→ {formatPeriod(substance.endPeriod)}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">
                    {calculateDuration(substance.startPeriod, substance.endPeriod)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={substance.isActive ? "default" : "secondary"}
                    className={substance.isActive ? "bg-purple-500" : ""}
                  >
                    {substance.isActive ? "En cours" : "Arrêté"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive.mutate({ id: substance.id, isActive: substance.isActive })}
                      disabled={toggleActive.isPending}
                      title={substance.isActive ? "Marquer comme arrêté" : "Marquer comme en cours"}
                    >
                      {substance.isActive ? (
                        <ToggleRight className="h-4 w-4 text-purple-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSubstance.mutate(substance.id)}
                      disabled={deleteSubstance.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}