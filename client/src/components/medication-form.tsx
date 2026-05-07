import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertMedicationSchema, type InsertMedication } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Pill } from "lucide-react";

export default function MedicationForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const form = useForm<InsertMedication>({
    resolver: zodResolver(insertMedicationSchema),
    defaultValues: {
      name: "",
      dosage: "",
      frequency: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      notes: "",
    },
  });

  const createMedication = useMutation({
    mutationFn: async (data: InsertMedication) => {
      return apiRequest("POST", "/api/medications", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      form.reset();
      setIsExpanded(false);
      toast({
        title: "Médicament ajouté",
        description: "Le médicament a été ajouté à votre suivi.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le médicament.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMedication) => {
    // Clean up empty fields
    const cleanData = {
      ...data,
      endDate: data.endDate?.trim() || null,
      dosage: data.dosage?.trim() || null,
      frequency: data.frequency?.trim() || null,
      notes: data.notes?.trim() || null,
    };
    createMedication.mutate(cleanData);
  };

  if (!isExpanded) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center">
            <div className="w-2 h-8 bg-green-500 rounded-full mr-4"></div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Suivi des Médicaments</CardTitle>
              <CardDescription>Gérez vos traitements et leurs effets</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setIsExpanded(true)}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            <Pill className="mr-2 h-4 w-4" />
            Ajouter un médicament
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
            <div className="w-2 h-8 bg-green-500 rounded-full mr-4"></div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Nouveau Médicament</CardTitle>
              <CardDescription>Ajoutez un médicament à votre traitement</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsExpanded(false);
              form.reset();
            }}
          >
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nom du médicament - pleine largeur */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom du médicament *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="ex: Lithium"
              className="border-gray-300"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Dosage et Fréquence - même ligne */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage">Dosage</Label>
              <Input
                id="dosage"
                {...form.register("dosage")}
                placeholder="ex: 300mg"
                className="border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Fréquence</Label>
              <Select onValueChange={(value) => form.setValue("frequency", value)}>
                <SelectTrigger className="border-gray-300">
                  <SelectValue placeholder="Sélectionner la fréquence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Une fois par jour</SelectItem>
                  <SelectItem value="twice_daily">Deux fois par jour</SelectItem>
                  <SelectItem value="three_times_daily">Trois fois par jour</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="as_needed">Au besoin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates de début et fin - même ligne */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate", {
                  onChange: (e) => {
                    const startDate = e.target.value;
                    if (startDate) {
                      // Auto-fill end date with start date value
                      if (!form.getValues("endDate")) {
                        form.setValue("endDate", startDate);
                      }
                    }
                  }
                })}
                className="border-gray-300"
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-600">{form.formState.errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin (optionnel)</Label>
              <Input
                id="endDate"
                type="date"
                min={form.watch("startDate")}
                {...form.register("endDate")}
                className="border-gray-300"
              />
              {form.formState.errors.endDate && (
                <p className="text-sm text-red-600">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Effets observés, instructions particulières..."
              className="border-gray-300 min-h-[80px]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMedication.isPending}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {createMedication.isPending ? "Ajout en cours..." : "Ajouter le médicament"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsExpanded(false);
                form.reset();
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}