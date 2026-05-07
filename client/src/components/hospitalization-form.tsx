import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertHospitalizationSchema, type InsertHospitalization } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function HospitalizationForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const form = useForm<InsertHospitalization>({
    resolver: zodResolver(insertHospitalizationSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      location: "",
      notes: "",
    },
  });

  const createHospitalization = useMutation({
    mutationFn: async (data: InsertHospitalization) => {
      return apiRequest("POST", "/api/hospitalizations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations"] });
      form.reset();
      setIsExpanded(false);
      toast({
        title: "Hospitalisation ajoutée",
        description: "L'hospitalisation a été ajoutée à votre suivi.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'hospitalisation.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertHospitalization) => {
    const cleanData = {
      ...data,
      endDate: data.endDate?.trim() || null,
      location: data.location?.trim() || null,
      notes: data.notes?.trim() || null,
    };
    createHospitalization.mutate(cleanData);
  };

  if (!isExpanded) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center">
            <div className="w-2 h-8 bg-red-500 rounded-full mr-4"></div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Suivi des Hospitalisations</CardTitle>
              <CardDescription>Enregistrez vos séjours hospitaliers</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setIsExpanded(true)}
            className="w-full bg-red-500 hover:bg-red-600 text-white"
            data-testid="button-add-hospitalization"
          >
            <Building2 className="mr-2 h-4 w-4" />
            Ajouter une hospitalisation
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-8 bg-red-500 rounded-full mr-4"></div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Nouvelle Hospitalisation</CardTitle>
              <CardDescription>Ajoutez un séjour hospitalier</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsExpanded(false);
              form.reset();
            }}
            data-testid="button-close-hospitalization-form"
          >
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début * (AAAA-MM ou AAAA-MM-JJ)</Label>
              <Input
                id="startDate"
                {...form.register("startDate", {
                  onChange: (e) => {
                    const startDate = e.target.value;
                    if (startDate && !form.getValues("endDate")) {
                      form.setValue("endDate", startDate);
                    }
                  }
                })}
                placeholder="ex: 2024-03 ou 2024-03-15"
                className="border-gray-300"
                data-testid="input-hospitalization-start-date"
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-600">{form.formState.errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin (optionnel)</Label>
              <Input
                id="endDate"
                {...form.register("endDate")}
                placeholder="ex: 2024-04 ou 2024-04-10"
                className="border-gray-300"
                data-testid="input-hospitalization-end-date"
              />
              {form.formState.errors.endDate && (
                <p className="text-sm text-red-600">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Lieu / Établissement</Label>
            <Input
              id="location"
              {...form.register("location")}
              placeholder="ex: CHU Saint-Anne, Service Psychiatrie"
              className="border-gray-300"
              data-testid="input-hospitalization-location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Raison de l'hospitalisation, observations..."
              className="border-gray-300 min-h-[80px]"
              data-testid="input-hospitalization-notes"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createHospitalization.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="button-submit-hospitalization"
            >
              {createHospitalization.isPending ? "Ajout en cours..." : "Ajouter l'hospitalisation"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsExpanded(false);
                form.reset();
              }}
              data-testid="button-cancel-hospitalization"
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
