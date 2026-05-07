import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertSubstanceSchema, type InsertSubstance } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Cigarette } from "lucide-react";

export default function SubstanceForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const form = useForm<InsertSubstance>({
    resolver: zodResolver(insertSubstanceSchema),
    defaultValues: {
      name: "",
      frequency: "",
      quantity: "",
      startPeriod: new Date().toISOString().slice(0, 7), // YYYY-MM format
      endPeriod: "",
      notes: "",
    },
  });

  const createSubstance = useMutation({
    mutationFn: async (data: InsertSubstance) => {
      return apiRequest("POST", "/api/substances", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substances"] });
      form.reset();
      setIsExpanded(false);
      toast({
        title: "Substance ajoutée",
        description: "La substance a été ajoutée à votre suivi.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la substance.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSubstance) => {
    // Clean up empty fields
    const cleanData = {
      ...data,
      endPeriod: data.endPeriod?.trim() || null,
      quantity: data.quantity?.trim() || null,
      frequency: data.frequency?.trim() || null,
      notes: data.notes?.trim() || null,
    };
    createSubstance.mutate(cleanData);
  };

  if (!isExpanded) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center">
            <div className="w-2 h-8 bg-purple-500 rounded-full mr-4"></div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Substances</CardTitle>
              <CardDescription>Suivez vos consommations de substances</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setIsExpanded(true)}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white"
          >
            <Cigarette className="mr-2 h-4 w-4" />
            Ajouter une substance
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
            <div className="w-2 h-8 bg-purple-500 rounded-full mr-4"></div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Nouvelle Substance</CardTitle>
              <CardDescription>Ajoutez une substance à votre suivi</CardDescription>
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
          {/* Nom de la substance - pleine largeur */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la substance *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="ex: Alcool, Cannabis, Tabac..."
              className="border-gray-300"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Fréquence et Quantité - même ligne */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Fréquence de consommation</Label>
              <Select onValueChange={(value) => form.setValue("frequency", value)}>
                <SelectTrigger className="border-gray-300">
                  <SelectValue placeholder="Sélectionner la fréquence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="several_weekly">Plusieurs fois par semaine</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="several_monthly">Plusieurs fois par mois</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="occasional">Ponctuel</SelectItem>
                  <SelectItem value="festive">Festif</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité (optionnel)</Label>
              <Input
                id="quantity"
                {...form.register("quantity")}
                placeholder="ex: 2-3 verres, 1 joint..."
                className="border-gray-300"
              />
            </div>
          </div>

          {/* Périodes de début et fin - même ligne */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startPeriod">Période de début *</Label>
              <Input
                id="startPeriod"
                type="month"
                {...form.register("startPeriod", {
                  onChange: (e) => {
                    const startPeriod = e.target.value;
                    if (startPeriod) {
                      // Auto-fill end period with start period value
                      if (!form.getValues("endPeriod")) {
                        form.setValue("endPeriod", startPeriod);
                      }
                    }
                  }
                })}
                className="border-gray-300"
              />
              {form.formState.errors.startPeriod && (
                <p className="text-sm text-red-600">{form.formState.errors.startPeriod.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endPeriod">Période de fin (optionnel)</Label>
              <Input
                id="endPeriod"
                type="month"
                min={form.watch("startPeriod")}
                {...form.register("endPeriod")}
                className="border-gray-300"
              />
              {form.formState.errors.endPeriod && (
                <p className="text-sm text-red-600">{form.formState.errors.endPeriod.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Contexte, effets observés, raisons d'usage..."
              className="border-gray-300 min-h-[80px]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createSubstance.isPending}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {createSubstance.isPending ? "Ajout en cours..." : "Ajouter la substance"}
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