import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, CalendarHeart, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { insertLifeEventSchema, type LifeEvent, type InsertLifeEvent } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { value: "familial",       label: "Familial",       color: "bg-pink-100 text-pink-800 border-pink-200" },
  { value: "professionnel",  label: "Professionnel",  color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "médical",        label: "Médical",        color: "bg-red-100 text-red-800 border-red-200" },
  { value: "relationnel",    label: "Relationnel",    color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "financier",      label: "Financier",      color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "autre",          label: "Autre",          color: "bg-gray-100 text-gray-700 border-gray-200" },
];

function categoryStyle(cat: string | null) {
  return CATEGORIES.find(c => c.value === cat)?.color ?? "bg-gray-100 text-gray-700 border-gray-200";
}
function categoryLabel(cat: string | null) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? "Autre";
}

export default function LifeEventsSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

  const { data: lifeEvents = [], isLoading } = useQuery<LifeEvent[]>({
    queryKey: ["/api/life-events"],
  });

  const form = useForm<InsertLifeEvent>({
    resolver: zodResolver(insertLifeEventSchema),
    defaultValues: {
      date: "",
      title: "",
      description: "",
      category: "autre",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertLifeEvent) =>
      apiRequest("POST", "/api/life-events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/life-events"] });
      form.reset({ date: "", title: "", description: "", category: "autre" });
      setShowForm(false);
      toast({ title: "Événement ajouté", description: "L'événement de vie a été enregistré." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'ajouter l'événement.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/life-events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/life-events"] });
      toast({ title: "Événement supprimé" });
    },
  });

  const onSubmit = (data: InsertLifeEvent) => createMutation.mutate(data);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
        <div className="flex items-center gap-2.5">
          <CalendarHeart className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Événements Significatifs de Vie</h3>
          {lifeEvents.length > 0 && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {lifeEvents.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs h-8"
        >
          {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "Fermer" : "Ajouter un événement"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-600">Date *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="YYYY-MM ou YYYY-MM-DD"
                          className="h-8 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-xs text-gray-600">Titre *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Divorce, Naissance enfant, Licenciement..."
                          className="h-8 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-600">Catégorie</FormLabel>
                      <Select value={field.value ?? "autre"} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-xs text-gray-600">Description (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Détails supplémentaires..."
                          className="h-8 text-sm resize-none"
                          rows={1}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending}
                  className="h-8 text-xs"
                >
                  {createMutation.isPending ? "Enregistrement..." : "Enregistrer l'événement"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-gray-50">
        {isLoading && (
          <div className="px-5 py-4 text-sm text-gray-400 text-center">Chargement...</div>
        )}
        {!isLoading && lifeEvents.length === 0 && (
          <div className="px-5 py-6 text-sm text-gray-400 text-center">
            Aucun événement de vie enregistré.<br />
            <span className="text-xs text-gray-300">Ces événements apparaîtront sur le graphique.</span>
          </div>
        )}
        {lifeEvents.map(event => (
          <div key={event.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors group">
            <div className="mt-0.5 shrink-0">
              <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {event.date}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-800 truncate">{event.title}</span>
                <Badge
                  variant="outline"
                  className={`text-xs px-1.5 py-0 h-5 font-normal ${categoryStyle(event.category)}`}
                >
                  {categoryLabel(event.category)}
                </Badge>
              </div>
              {event.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>
              )}
            </div>
            <button
              onClick={() => deleteMutation.mutate(event.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 mt-0.5"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
