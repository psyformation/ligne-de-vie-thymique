import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type InsertMoodEntry, type InsertInstabilityPeriod } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

// Function to get episode type based on mood level
const getEpisodeType = (moodLevel: number): string => {
  if (moodLevel >= -2 && moodLevel <= 2) {
    return "Euthymie";
  } else if (moodLevel === -3) {
    return "Dépression Légère";
  } else if (moodLevel === -4) {
    return "Dépression Modérée";
  } else if (moodLevel === -5) {
    return "Dépression Sévère";
  } else if (moodLevel === 3) {
    return "Hypomanie";
  } else if (moodLevel === 4) {
    return "Manie";
  } else if (moodLevel === 5) {
    return "Manie Sévère";
  }
  return "Euthymie";
};

// Fonction pour obtenir la couleur selon le niveau d'humeur
function getMoodColor(level: number): string {
  if (level <= -4) return 'hsl(210, 85%, 30%)'; // Dépression sévère - bleu foncé
  if (level <= -2) return 'hsl(210, 75%, 45%)'; // Dépression modérée - bleu moyen
  if (level === -1) return 'hsl(210, 60%, 60%)'; // Tristesse - bleu clair
  if (level === 0) return 'hsl(210, 15%, 55%)'; // Euthymie - gris
  if (level === 1) return 'hsl(35, 70%, 65%)'; // Joie - jaune clair
  if (level <= 2) return 'hsl(35, 80%, 55%)'; // Humeur élevée - orange clair
  if (level === 3) return 'hsl(35, 85%, 55%)'; // Hypomanie - orange
  if (level === 4) return 'hsl(20, 80%, 55%)'; // Manie - rouge-orange
  return 'hsl(10, 80%, 55%)'; // Manie sévère - rouge
}

export default function MoodEntryForm() {
  const [moodLevel, setMoodLevel] = useState([0]);
  const [isInstabilityPeriod, setIsInstabilityPeriod] = useState(false);
  const [isMixed, setIsMixed] = useState(false);
  const [mixedExcitationLevel, setMixedExcitationLevel] = useState([3]);
  const [mixedDepressiveLevel, setMixedDepressiveLevel] = useState([3]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Frontend validation schema for episodes
  const frontendSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    moodLevel: z.number().min(-5).max(5),
    notes: z.string().optional(),
    triggerEvents: z.string().optional(),
  }).refine((data) => {
    // Validate that end date is not before start date
    if (data.endDate && data.endDate.trim() !== "") {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return endDate >= startDate;
    }
    return true;
  }, {
    message: "La date de fin ne peut pas être antérieure à la date de début",
    path: ["endDate"], // This will show the error on the endDate field
  });

  // Frontend validation schema for instability periods
  const instabilitySchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().optional(),
  }).refine((data) => {
    // Validate that end date is not before start date
    if (data.endDate && data.endDate.trim() !== "") {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return endDate >= startDate;
    }
    return true;
  }, {
    message: "La date de fin ne peut pas être antérieure à la date de début",
    path: ["endDate"],
  });

  const form = useForm<z.infer<typeof frontendSchema>>({
    resolver: zodResolver(isInstabilityPeriod ? instabilitySchema : frontendSchema),
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      moodLevel: 0,
      notes: "",
      triggerEvents: "",
    },
  });

  const createMoodEntryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof frontendSchema>) => {
      const response = await apiRequest("POST", "/api/mood-entries", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood-entries"] });
      form.reset({
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        moodLevel: 0,
        notes: "",
        triggerEvents: "",
      });
      setMoodLevel([0]);
      toast({
        title: "Succès",
        description: "Point d'humeur ajouté avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ajout du point d'humeur",
        variant: "destructive",
      });
    },
  });

  const createInstabilityPeriodMutation = useMutation({
    mutationFn: async (data: z.infer<typeof instabilitySchema>) => {
      const response = await apiRequest("POST", "/api/instability-periods", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instability-periods"] });
      form.reset({
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        moodLevel: 0,
        notes: "",
        triggerEvents: "",
      });
      toast({
        title: "Succès",
        description: "Période d'instabilité ajoutée avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ajout de la période d'instabilité",
        variant: "destructive",
      });
    },
  });

  const clearAllDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/mood-entries");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/substances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instability-periods"] });
      toast({
        title: "Succès",
        description: "Toutes les données ont été effacées (épisodes, médicaments, substances, hospitalisations)",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'effacement des données",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (isInstabilityPeriod) {
      const instabilityData = {
        startDate: data.startDate,
        endDate: data.endDate || undefined,
        notes: data.notes || undefined,
      };
      createInstabilityPeriodMutation.mutate(instabilityData);
    } else if (isMixed) {
      const formData = {
        ...data,
        moodLevel: 0,
        mixedExcitationLevel: mixedExcitationLevel[0],
        mixedDepressiveLevel: mixedDepressiveLevel[0],
      };
      createMoodEntryMutation.mutate(formData);
    } else {
      const formData = { ...data, moodLevel: moodLevel[0] };
      createMoodEntryMutation.mutate(formData);
    }
  };

  const handleClearData = () => {
    if (window.confirm("Êtes-vous sûr de vouloir effacer toutes les données ? Cette action est irréversible.")) {
      clearAllDataMutation.mutate();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <div className="w-2 h-8 bg-medical-blue rounded-full mr-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">
          {isInstabilityPeriod ? "Saisir une Période d'Instabilité" : "Saisir un Épisode Thymique"}
        </h2>
      </div>
      
      {/* Toggle for instability period */}
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <Checkbox 
            id="instability-toggle"
            checked={isInstabilityPeriod}
            onCheckedChange={(checked) => {
              setIsInstabilityPeriod(!!checked);
              if (checked) setIsMixed(false);
              form.reset({
                startDate: new Date().toISOString().split('T')[0],
                endDate: "",
                moodLevel: 0,
                notes: "",
                triggerEvents: "",
              });
              setMoodLevel([0]);
            }}
            data-testid="checkbox-instability-period"
          />
          <Label htmlFor="instability-toggle" className="text-sm font-medium text-gray-900 cursor-pointer">
            Période d'instabilité thymique non traçable
          </Label>
        </div>
        <p className="text-xs text-gray-600 mt-2 ml-6">
          {isInstabilityPeriod 
            ? "Mode actif : Cette période sera représentée par des fluctuations aléatoires entre +1 et -1 sur le graphique."
            : "Cochez cette case pour saisir une période d'instabilité où les fluctuations thymiques sont difficiles à caractériser."}
        </p>
      </div>

      {/* Toggle for mixed episode */}
      {!isInstabilityPeriod && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="mixed-toggle"
              checked={isMixed}
              onCheckedChange={(checked) => {
                setIsMixed(!!checked);
                setMoodLevel([0]);
              }}
            />
            <Label htmlFor="mixed-toggle" className="text-sm font-medium text-purple-900 cursor-pointer">
              ☯ Épisode mixte (dépression + excitation simultanées)
            </Label>
          </div>
          <p className="text-xs text-purple-700 mt-2 ml-6">
            {isMixed
              ? "Mode actif : deux courbes violettes seront tracées — une vers le haut (excitation) et une vers le bas (dépression)."
              : "Cochez pour saisir un épisode avec deux pôles simultanés : indiquez l'intensité de chaque pôle séparément."}
          </p>
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Dates Input - Aligned */}
        <div className="form-group">
          <Label className="block text-sm text-gray-700 mb-2">
            <span className="font-bold">Période de l'épisode</span>
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="block text-xs text-gray-600 mb-1">
                Date de début
              </Label>
              <Input
                type="date"
                {...form.register("startDate", {
                  onChange: (e) => {
                    const startDate = e.target.value;
                    if (startDate) {
                      // Auto-fill end date with same value as start date
                      form.setValue("endDate", startDate);
                    }
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-blue focus:border-transparent transition-colors duration-200"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="block text-xs text-gray-600 mb-1">
                Date de fin <span className="text-gray-500">(optionnel)</span>
              </Label>
              <Input
                type="date"
                min={form.watch("startDate")}
                {...form.register("endDate")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-medical-blue focus:border-transparent transition-colors duration-200 ${
                  form.formState.errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
          </div>
          {form.formState.errors.endDate && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.endDate.message}</p>
          )}
        </div>

        {/* Mood Level Slider - Only show for normal mood entries */}
        {!isInstabilityPeriod && !isMixed && (
          <div className="form-group">
            <Label className="block text-sm text-gray-700 mb-2">
              <span className="font-bold">Le niveau d'humeur le plus intense</span> pendant cet épisode : <span className="font-semibold text-medical-blue">{moodLevel[0]}</span>
            </Label>
            <div className="relative">
              <Slider
                value={moodLevel}
                onValueChange={setMoodLevel}
                min={-5}
                max={5}
                step={1}
                className="w-full"
                style={{
                  '--thumb-border-color': getMoodColor(moodLevel[0]),
                  '--thumb-shadow-color': getMoodColor(moodLevel[0])
                } as React.CSSProperties}
                data-testid="slider-mood-level"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span className="text-mood-depression-severe font-medium">-5 Dépression sévère</span>
                <span className="text-mood-euthymie font-medium">0 Euthymie</span>
                <span className="text-mood-manie font-medium">+5 Manie sévère</span>
              </div>
            </div>
          </div>
        )}

        {/* Mixed episode sliders */}
        {!isInstabilityPeriod && isMixed && (
          <div className="form-group space-y-5 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm font-semibold text-purple-800">
              Intensité de chaque pôle à son pic :
            </p>

            {/* Excitation pole */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-orange-700">
                  🔥 Pôle excitation / agitation
                </Label>
                <span className="text-orange-600 font-bold text-sm">+{mixedExcitationLevel[0]}</span>
              </div>
              <Slider
                value={mixedExcitationLevel}
                onValueChange={setMixedExcitationLevel}
                min={1} max={5} step={1}
                className="w-full"
                style={{ '--thumb-border-color': '#ea580c', '--thumb-shadow-color': '#ea580c' } as React.CSSProperties}
              />
              <div className="flex justify-between text-xs text-orange-400 px-0.5">
                <span>+1 Légère</span>
                <span>+2 Fluct.</span>
                <span>+3 Hypomanie</span>
                <span>+4 Manie</span>
                <span>+5 Manie sév.</span>
              </div>
            </div>

            {/* Depressive pole */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-blue-700">
                  😔 Pôle dépressif / tristesse
                </Label>
                <span className="text-blue-600 font-bold text-sm">-{mixedDepressiveLevel[0]}</span>
              </div>
              <Slider
                value={mixedDepressiveLevel}
                onValueChange={setMixedDepressiveLevel}
                min={1} max={5} step={1}
                className="w-full"
                style={{ '--thumb-border-color': '#2563eb', '--thumb-shadow-color': '#2563eb' } as React.CSSProperties}
              />
              <div className="flex justify-between text-xs text-blue-400 px-0.5">
                <span>-1 Légère</span>
                <span>-2 Fluct.</span>
                <span>-3 Dép. mod.</span>
                <span>-4 Dép. sév.</span>
                <span>-5 Dép. prof.</span>
              </div>
            </div>

            <div className="text-xs text-purple-600 bg-purple-100 rounded-lg px-3 py-2">
              ☯ Deux courbes violettes seront tracées : une à <strong>+{mixedExcitationLevel[0]}</strong> (excitation) et une à <strong>-{mixedDepressiveLevel[0]}</strong> (dépression), avec fond violet.
            </div>
          </div>
        )}



        {/* Trigger Events Textarea - Only show for normal mood entries */}
        {!isInstabilityPeriod && (
          <div className="form-group">
            <Label className="block text-sm text-gray-700 mb-2">
              <span className="font-bold">Événements déclencheurs</span>
            </Label>
            <Textarea
              {...form.register("triggerEvents")}
              rows={2}
              placeholder="Événements de vie marquants, facteurs déclencheurs, stress, changements..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-blue focus:border-transparent transition-colors duration-200 resize-none"
              data-testid="textarea-trigger-events"
            />
          </div>
        )}

        {/* Notes Textarea */}
        <div className="form-group">
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Notes complémentaires
          </Label>
          <Textarea
            {...form.register("notes")}
            rows={3}
            placeholder={isInstabilityPeriod 
              ? "Contexte de la période d'instabilité, observations, difficultés de caractérisation..."
              : "Observations, traitements, évolution, autres remarques..."}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-blue focus:border-transparent transition-colors duration-200 resize-none"
            data-testid="textarea-notes"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="submit"
            disabled={createMoodEntryMutation.isPending || createInstabilityPeriodMutation.isPending}
            className="flex-1 bg-medical-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            {(createMoodEntryMutation.isPending || createInstabilityPeriodMutation.isPending)
              ? "Ajout..."
              : (isInstabilityPeriod ? "Ajouter la période d'instabilité" : "Ajouter cet Épisode")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearData}
            disabled={clearAllDataMutation.isPending}
            className="flex-1 sm:flex-none bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
          >
            {clearAllDataMutation.isPending ? "Effacement..." : "Effacer les données"}
          </Button>
        </div>
      </form>
    </div>
  );
}
