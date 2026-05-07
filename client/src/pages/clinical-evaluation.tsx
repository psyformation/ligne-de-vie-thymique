import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FileText, Activity, Users, ClipboardList, Brain, Heart, User, ArrowLeft, Copy, ChevronDown, ChevronUp } from "lucide-react";
import type { ClinicalPatient, ClinicalEpisode, FamilyHistory, MedicalHistory, AddictionHistory, Biography, PsychiatricHistory, ClinicalConclusion } from "@shared/schema";

function PatientSelector({ 
  patients, 
  selectedPatientId, 
  onSelectPatient, 
  onCreateNew 
}: { 
  patients: ClinicalPatient[]; 
  selectedPatientId: number | null; 
  onSelectPatient: (id: number) => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Label className="text-sm text-gray-600">Patient sélectionné</Label>
          <Select 
            value={selectedPatientId?.toString() || ""} 
            onValueChange={(val) => onSelectPatient(parseInt(val))}
          >
            <SelectTrigger data-testid="select-patient">
              <SelectValue placeholder="Sélectionner un patient..." />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id.toString()}>
                  {patient.lastName} {patient.firstName} - {patient.consultationDate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onCreateNew} className="bg-medical-blue hover:bg-blue-700" data-testid="btn-new-patient">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau patient
        </Button>
      </div>
    </div>
  );
}

function PatientForm({ 
  onSave, 
  onCancel,
  initialData 
}: { 
  onSave: (data: any) => void; 
  onCancel: () => void;
  initialData?: ClinicalPatient;
}) {
  const [formData, setFormData] = useState({
    lastName: initialData?.lastName || "",
    firstName: initialData?.firstName || "",
    birthDate: initialData?.birthDate || "",
    gender: initialData?.gender || "",
    referringDoctor: initialData?.referringDoctor || "",
    consultationDate: initialData?.consultationDate || new Date().toISOString().split('T')[0],
    consultationReason: initialData?.consultationReason || "",
    notes: initialData?.notes || "",
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {initialData ? "Modifier le patient" : "Nouveau patient"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Nom *</Label>
            <Input 
              value={formData.lastName} 
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              data-testid="input-lastname"
            />
          </div>
          <div>
            <Label>Prénom *</Label>
            <Input 
              value={formData.firstName} 
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              data-testid="input-firstname"
            />
          </div>
          <div>
            <Label>Date de naissance *</Label>
            <Input 
              type="date" 
              value={formData.birthDate} 
              onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
              data-testid="input-birthdate"
            />
          </div>
          <div>
            <Label>Genre</Label>
            <Select value={formData.gender} onValueChange={(val) => setFormData({...formData, gender: val})}>
              <SelectTrigger data-testid="select-gender">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculin</SelectItem>
                <SelectItem value="F">Féminin</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date de consultation *</Label>
            <Input 
              type="date" 
              value={formData.consultationDate} 
              onChange={(e) => setFormData({...formData, consultationDate: e.target.value})}
              data-testid="input-consultation-date"
            />
          </div>
          <div>
            <Label>Médecin adressant</Label>
            <Input 
              value={formData.referringDoctor} 
              onChange={(e) => setFormData({...formData, referringDoctor: e.target.value})}
              placeholder="Dr..."
              data-testid="input-referring-doctor"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <Label>Motif de consultation</Label>
            <Textarea 
              value={formData.consultationReason} 
              onChange={(e) => setFormData({...formData, consultationReason: e.target.value})}
              placeholder="Avis diagnostique et thérapeutique..."
              data-testid="input-consultation-reason"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onSave(formData)} className="bg-medical-blue hover:bg-blue-700" data-testid="btn-save-patient">
            Enregistrer
          </Button>
          <Button variant="outline" onClick={onCancel} data-testid="btn-cancel-patient">
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FamilyHistorySection({ patientId }: { patientId: number }) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({
    relationship: "",
    condition: "",
    details: "",
    hospitalization: false,
    suicide: false,
  });

  const { data: history = [] } = useQuery<FamilyHistory[]>({
    queryKey: ["/api/clinical/patients", patientId, "family-history"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/family-history`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clinical/family-history", { ...data, patientId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients", patientId, "family-history"] });
      setIsAdding(false);
      setNewEntry({ relationship: "", condition: "", details: "", hospitalization: false, suicide: false });
      toast({ title: "Antécédent familial ajouté" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clinical/family-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients", patientId, "family-history"] });
      toast({ title: "Antécédent supprimé" });
    },
  });

  const relationships = ["Père", "Mère", "Frère", "Sœur", "Grand-père", "Grand-mère", "Oncle", "Tante", "Cousin(e)", "Enfant"];
  const conditions = ["Trouble bipolaire", "Dépression", "Schizophrénie", "Trouble anxieux", "TOC", "Addiction alcool", "Addiction substances", "Tentative de suicide", "Suicide", "Autre trouble psychiatrique"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Antécédents Familiaux Psychiatriques
          </span>
          <Button size="sm" onClick={() => setIsAdding(true)} data-testid="btn-add-family-history">
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lien de parenté</Label>
                <Select value={newEntry.relationship} onValueChange={(val) => setNewEntry({...newEntry, relationship: val})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {relationships.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pathologie</Label>
                <Select value={newEntry.condition} onValueChange={(val) => setNewEntry({...newEntry, condition: val})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {conditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Détails</Label>
              <Textarea 
                value={newEntry.details} 
                onChange={(e) => setNewEntry({...newEntry, details: e.target.value})}
                placeholder="Précisions..."
              />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={newEntry.hospitalization} 
                  onCheckedChange={(checked) => setNewEntry({...newEntry, hospitalization: !!checked})}
                />
                <Label>Hospitalisation psychiatrique</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={newEntry.suicide} 
                  onCheckedChange={(checked) => setNewEntry({...newEntry, suicide: !!checked})}
                />
                <Label>TS ou suicide</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createMutation.mutate(newEntry)}>Enregistrer</Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>Annuler</Button>
            </div>
          </div>
        )}
        
        {history.length === 0 && !isAdding ? (
          <p className="text-gray-500 italic">Aucun antécédent familial enregistré</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{item.relationship}</span>
                  <span className="mx-2">-</span>
                  <span>{item.condition}</span>
                  {item.hospitalization && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">HP</span>}
                  {item.suicide && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">TS/Suicide</span>}
                  {item.details && <p className="text-sm text-gray-600 mt-1">{item.details}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MedicalHistorySection({ patientId }: { patientId: number }) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ condition: "", year: "", details: "", currentTreatment: "" });

  const { data: history = [] } = useQuery<MedicalHistory[]>({
    queryKey: ["/api/clinical/patients", patientId, "medical-history"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/medical-history`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clinical/medical-history", { ...data, patientId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients", patientId, "medical-history"] });
      setIsAdding(false);
      setNewEntry({ condition: "", year: "", details: "", currentTreatment: "" });
      toast({ title: "Antécédent médical ajouté" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clinical/medical-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients", patientId, "medical-history"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Antécédents Médico-Chirurgicaux
          </span>
          <Button size="sm" onClick={() => setIsAdding(true)} data-testid="btn-add-medical-history">
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pathologie / Antécédent</Label>
                <Input 
                  value={newEntry.condition} 
                  onChange={(e) => setNewEntry({...newEntry, condition: e.target.value})}
                  placeholder="Ex: HTA, Diabète, Chirurgie..."
                />
              </div>
              <div>
                <Label>Année</Label>
                <Input 
                  value={newEntry.year} 
                  onChange={(e) => setNewEntry({...newEntry, year: e.target.value})}
                  placeholder="Ex: 2020"
                />
              </div>
            </div>
            <div>
              <Label>Détails</Label>
              <Textarea 
                value={newEntry.details} 
                onChange={(e) => setNewEntry({...newEntry, details: e.target.value})}
              />
            </div>
            <div>
              <Label>Traitement actuel</Label>
              <Input 
                value={newEntry.currentTreatment} 
                onChange={(e) => setNewEntry({...newEntry, currentTreatment: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createMutation.mutate(newEntry)}>Enregistrer</Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>Annuler</Button>
            </div>
          </div>
        )}
        
        {history.length === 0 && !isAdding ? (
          <p className="text-gray-500 italic">Aucun antécédent médical enregistré</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{item.condition}</span>
                  {item.year && <span className="text-gray-500 ml-2">({item.year})</span>}
                  {item.currentTreatment && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">TTT: {item.currentTreatment}</span>}
                  {item.details && <p className="text-sm text-gray-600 mt-1">{item.details}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddictionHistorySection({ patientId }: { patientId: number }) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({
    substanceType: "",
    startAge: "",
    currentStatus: "",
    consumption: "",
    maxConsumption: "",
    abstinenceDate: "",
    treatment: "",
    notes: "",
  });

  const { data: history = [] } = useQuery<AddictionHistory[]>({
    queryKey: ["/api/clinical/patients", patientId, "addiction-history"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/addiction-history`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clinical/addiction-history", { 
        ...data, 
        patientId,
        startAge: data.startAge ? parseInt(data.startAge) : null
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients", patientId, "addiction-history"] });
      setIsAdding(false);
      setNewEntry({ substanceType: "", startAge: "", currentStatus: "", consumption: "", maxConsumption: "", abstinenceDate: "", treatment: "", notes: "" });
      toast({ title: "Antécédent addictologique ajouté" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clinical/addiction-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients", patientId, "addiction-history"] });
    },
  });

  const substances = ["Alcool", "Tabac", "Cannabis", "Cocaïne", "Héroïne/Opiacés", "Amphétamines", "Benzodiazépines", "Jeux", "Autre"];
  const statuses = ["Actif", "Sevré", "Réduit", "Rechute"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Antécédents Addictologiques
          </span>
          <Button size="sm" onClick={() => setIsAdding(true)} data-testid="btn-add-addiction-history">
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Substance</Label>
                <Select value={newEntry.substanceType} onValueChange={(val) => setNewEntry({...newEntry, substanceType: val})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {substances.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Âge de début</Label>
                <Input 
                  type="number"
                  value={newEntry.startAge} 
                  onChange={(e) => setNewEntry({...newEntry, startAge: e.target.value})}
                />
              </div>
              <div>
                <Label>Statut actuel</Label>
                <Select value={newEntry.currentStatus} onValueChange={(val) => setNewEntry({...newEntry, currentStatus: val})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Consommation actuelle</Label>
                <Input 
                  value={newEntry.consumption} 
                  onChange={(e) => setNewEntry({...newEntry, consumption: e.target.value})}
                  placeholder="Ex: 10 cigarettes/jour"
                />
              </div>
              <div>
                <Label>Consommation max</Label>
                <Input 
                  value={newEntry.maxConsumption} 
                  onChange={(e) => setNewEntry({...newEntry, maxConsumption: e.target.value})}
                  placeholder="Ex: 1 paquet/jour"
                />
              </div>
              <div>
                <Label>Date d'abstinence</Label>
                <Input 
                  type="date"
                  value={newEntry.abstinenceDate} 
                  onChange={(e) => setNewEntry({...newEntry, abstinenceDate: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Traitement / Suivi</Label>
              <Input 
                value={newEntry.treatment} 
                onChange={(e) => setNewEntry({...newEntry, treatment: e.target.value})}
                placeholder="Ex: CSAPA, substitution..."
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea 
                value={newEntry.notes} 
                onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createMutation.mutate(newEntry)}>Enregistrer</Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>Annuler</Button>
            </div>
          </div>
        )}
        
        {history.length === 0 && !isAdding ? (
          <p className="text-gray-500 italic">Aucun antécédent addictologique enregistré</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{item.substanceType}</span>
                  {item.startAge && <span className="text-gray-500 ml-2">(début: {item.startAge} ans)</span>}
                  {item.currentStatus && (
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${
                      item.currentStatus === "Sevré" ? "bg-green-100 text-green-700" :
                      item.currentStatus === "Actif" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{item.currentStatus}</span>
                  )}
                  {item.consumption && <p className="text-sm text-gray-600 mt-1">Conso: {item.consumption}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PsychiatricHistorySection({ patientId }: { patientId: number }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: history } = useQuery<PsychiatricHistory | null>({
    queryKey: ["/api/clinical/patients", patientId, "psychiatric-history"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/psychiatric-history`);
      return res.json();
    },
  });

  const [formData, setFormData] = useState({
    hospitalizations: history?.hospitalizations || "",
    suicideAttempts: history?.suicideAttempts || "",
    previousDiagnoses: history?.previousDiagnoses || "",
    previousTreatments: history?.previousTreatments || "",
    currentPsychiatrist: history?.currentPsychiatrist || "",
    currentTherapist: history?.currentTherapist || "",
    therapyType: history?.therapyType || "",
    notes: history?.notes || "",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clinical/psychiatric-history", { ...data, patientId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients", patientId, "psychiatric-history"] });
      setIsEditing(false);
      toast({ title: "Antécédents psychiatriques enregistrés" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Antécédents Psychiatriques
          </span>
          {!isEditing && (
            <Button size="sm" onClick={() => {
              setFormData({
                hospitalizations: history?.hospitalizations || "",
                suicideAttempts: history?.suicideAttempts || "",
                previousDiagnoses: history?.previousDiagnoses || "",
                previousTreatments: history?.previousTreatments || "",
                currentPsychiatrist: history?.currentPsychiatrist || "",
                currentTherapist: history?.currentTherapist || "",
                therapyType: history?.therapyType || "",
                notes: history?.notes || "",
              });
              setIsEditing(true);
            }} data-testid="btn-edit-psychiatric-history">
              {history ? "Modifier" : <><Plus className="w-4 h-4 mr-1" /> Ajouter</>}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label>Hospitalisations psychiatriques</Label>
              <Textarea 
                value={formData.hospitalizations} 
                onChange={(e) => setFormData({...formData, hospitalizations: e.target.value})}
                placeholder="Lieu, dates, durée, motif..."
              />
            </div>
            <div>
              <Label>Tentatives de suicide</Label>
              <Textarea 
                value={formData.suicideAttempts} 
                onChange={(e) => setFormData({...formData, suicideAttempts: e.target.value})}
                placeholder="Date, moyen, contexte..."
              />
            </div>
            <div>
              <Label>Diagnostics antérieurs</Label>
              <Textarea 
                value={formData.previousDiagnoses} 
                onChange={(e) => setFormData({...formData, previousDiagnoses: e.target.value})}
                placeholder="Diagnostics posés..."
              />
            </div>
            <div>
              <Label>Chimiogramme (traitements antérieurs)</Label>
              <Textarea 
                value={formData.previousTreatments} 
                onChange={(e) => setFormData({...formData, previousTreatments: e.target.value})}
                placeholder="Liste des traitements avec posologies et dates..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Psychiatre actuel</Label>
                <Input 
                  value={formData.currentPsychiatrist} 
                  onChange={(e) => setFormData({...formData, currentPsychiatrist: e.target.value})}
                />
              </div>
              <div>
                <Label>Psychothérapeute</Label>
                <Input 
                  value={formData.currentTherapist} 
                  onChange={(e) => setFormData({...formData, currentTherapist: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Type de thérapie</Label>
              <Input 
                value={formData.therapyType} 
                onChange={(e) => setFormData({...formData, therapyType: e.target.value})}
                placeholder="TCC, psychanalyse, EMDR..."
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea 
                value={formData.notes} 
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate(formData)}>Enregistrer</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button>
            </div>
          </div>
        ) : history ? (
          <div className="space-y-3">
            {history.hospitalizations && (
              <div><span className="font-medium">Hospitalisations:</span> <span className="text-gray-600">{history.hospitalizations}</span></div>
            )}
            {history.suicideAttempts && (
              <div><span className="font-medium">TS:</span> <span className="text-gray-600">{history.suicideAttempts}</span></div>
            )}
            {history.previousDiagnoses && (
              <div><span className="font-medium">Diagnostics:</span> <span className="text-gray-600">{history.previousDiagnoses}</span></div>
            )}
            {history.previousTreatments && (
              <div><span className="font-medium">Chimiogramme:</span> <pre className="text-gray-600 text-sm whitespace-pre-wrap mt-1">{history.previousTreatments}</pre></div>
            )}
            {history.currentPsychiatrist && (
              <div><span className="font-medium">Psychiatre:</span> <span className="text-gray-600">{history.currentPsychiatrist}</span></div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 italic">Aucun antécédent psychiatrique enregistré</p>
        )}
      </CardContent>
    </Card>
  );
}

function BiographySection({ patientId }: { patientId: number }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: bio } = useQuery<Biography | null>({
    queryKey: ["/api/clinical/patients", patientId, "biography"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/biography`);
      return res.json();
    },
  });

  const [formData, setFormData] = useState({
    birthPlace: bio?.birthPlace || "",
    siblingPosition: bio?.siblingPosition || "",
    siblingsCount: bio?.siblingsCount?.toString() || "",
    familyContext: bio?.familyContext || "",
    educationLevel: bio?.educationLevel || "",
    educationDetails: bio?.educationDetails || "",
    currentProfession: bio?.currentProfession || "",
    professionalHistory: bio?.professionalHistory || "",
    currentWorkStatus: bio?.currentWorkStatus || "",
    maritalStatus: bio?.maritalStatus || "",
    childrenCount: bio?.childrenCount?.toString() || "",
    livingArrangement: bio?.livingArrangement || "",
    relationshipHistory: bio?.relationshipHistory || "",
    notes: bio?.notes || "",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clinical/biography", { 
        ...data, 
        patientId,
        siblingsCount: data.siblingsCount ? parseInt(data.siblingsCount) : null,
        childrenCount: data.childrenCount ? parseInt(data.childrenCount) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients", patientId, "biography"] });
      setIsEditing(false);
      toast({ title: "Biographie enregistrée" });
    },
  });

  const workStatuses = ["Actif", "Arrêt maladie", "CLD", "Invalidité", "Chômage", "Retraite", "Étudiant", "Au foyer"];
  const maritalStatuses = ["Célibataire", "En couple", "Marié(e)", "Pacsé(e)", "Divorcé(e)", "Séparé(e)", "Veuf(ve)"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Éléments Biographiques
          </span>
          {!isEditing && (
            <Button size="sm" onClick={() => {
              setFormData({
                birthPlace: bio?.birthPlace || "",
                siblingPosition: bio?.siblingPosition || "",
                siblingsCount: bio?.siblingsCount?.toString() || "",
                familyContext: bio?.familyContext || "",
                educationLevel: bio?.educationLevel || "",
                educationDetails: bio?.educationDetails || "",
                currentProfession: bio?.currentProfession || "",
                professionalHistory: bio?.professionalHistory || "",
                currentWorkStatus: bio?.currentWorkStatus || "",
                maritalStatus: bio?.maritalStatus || "",
                childrenCount: bio?.childrenCount?.toString() || "",
                livingArrangement: bio?.livingArrangement || "",
                relationshipHistory: bio?.relationshipHistory || "",
                notes: bio?.notes || "",
              });
              setIsEditing(true);
            }} data-testid="btn-edit-biography">
              {bio ? "Modifier" : <><Plus className="w-4 h-4 mr-1" /> Ajouter</>}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h4 className="font-medium mb-3">Origine familiale</h4>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Lieu de naissance</Label>
                  <Input value={formData.birthPlace} onChange={(e) => setFormData({...formData, birthPlace: e.target.value})} />
                </div>
                <div>
                  <Label>Position dans la fratrie</Label>
                  <Input value={formData.siblingPosition} onChange={(e) => setFormData({...formData, siblingPosition: e.target.value})} placeholder="Ex: Aîné de 3 enfants" />
                </div>
                <div>
                  <Label>Nombre de frères/sœurs</Label>
                  <Input type="number" value={formData.siblingsCount} onChange={(e) => setFormData({...formData, siblingsCount: e.target.value})} />
                </div>
              </div>
              <div className="mt-3">
                <Label>Contexte familial</Label>
                <Textarea value={formData.familyContext} onChange={(e) => setFormData({...formData, familyContext: e.target.value})} placeholder="Relations parentales, événements marquants..." />
              </div>
            </div>

            <div className="border-b pb-4">
              <h4 className="font-medium mb-3">Scolarité</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Niveau d'études</Label>
                  <Input value={formData.educationLevel} onChange={(e) => setFormData({...formData, educationLevel: e.target.value})} placeholder="Ex: Bac+5, CAP..." />
                </div>
                <div>
                  <Label>Détails du parcours scolaire</Label>
                  <Textarea value={formData.educationDetails} onChange={(e) => setFormData({...formData, educationDetails: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="border-b pb-4">
              <h4 className="font-medium mb-3">Parcours professionnel</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Profession actuelle</Label>
                  <Input value={formData.currentProfession} onChange={(e) => setFormData({...formData, currentProfession: e.target.value})} />
                </div>
                <div>
                  <Label>Statut actuel</Label>
                  <Select value={formData.currentWorkStatus} onValueChange={(val) => setFormData({...formData, currentWorkStatus: val})}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {workStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3">
                <Label>Historique professionnel</Label>
                <Textarea value={formData.professionalHistory} onChange={(e) => setFormData({...formData, professionalHistory: e.target.value})} />
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Vie personnelle</h4>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Situation maritale</Label>
                  <Select value={formData.maritalStatus} onValueChange={(val) => setFormData({...formData, maritalStatus: val})}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {maritalStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre d'enfants</Label>
                  <Input type="number" value={formData.childrenCount} onChange={(e) => setFormData({...formData, childrenCount: e.target.value})} />
                </div>
                <div>
                  <Label>Mode de vie</Label>
                  <Input value={formData.livingArrangement} onChange={(e) => setFormData({...formData, livingArrangement: e.target.value})} placeholder="Seul, en couple, colocation..." />
                </div>
              </div>
              <div className="mt-3">
                <Label>Historique relationnel</Label>
                <Textarea value={formData.relationshipHistory} onChange={(e) => setFormData({...formData, relationshipHistory: e.target.value})} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate(formData)}>Enregistrer</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button>
            </div>
          </div>
        ) : bio ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bio.birthPlace && <div><span className="font-medium">Lieu de naissance:</span> {bio.birthPlace}</div>}
            {bio.siblingPosition && <div><span className="font-medium">Fratrie:</span> {bio.siblingPosition}</div>}
            {bio.educationLevel && <div><span className="font-medium">Niveau d'études:</span> {bio.educationLevel}</div>}
            {bio.currentProfession && <div><span className="font-medium">Profession:</span> {bio.currentProfession}</div>}
            {bio.currentWorkStatus && <div><span className="font-medium">Statut:</span> {bio.currentWorkStatus}</div>}
            {bio.maritalStatus && <div><span className="font-medium">Situation:</span> {bio.maritalStatus}</div>}
            {bio.childrenCount !== null && <div><span className="font-medium">Enfants:</span> {bio.childrenCount}</div>}
          </div>
        ) : (
          <p className="text-gray-500 italic">Aucune biographie enregistrée</p>
        )}
      </CardContent>
    </Card>
  );
}

function ClinicalEpisodesSection({ patientId }: { patientId: number }) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);

  const initialEpisodeState = {
    startDate: "",
    endDate: "",
    episodeType: "",
    severity: "",
    moodLevel: 0,
    context: "",
    triggers: "",
    impactProfessional: false,
    impactFamilial: false,
    impactSocial: false,
    impactFinancial: false,
    impactDetails: "",
    resolutionSpontaneous: false,
    resolutionFamilyHelp: false,
    resolutionConsultation: false,
    resolutionHospitalization: false,
    resolutionTreatment: false,
    resolutionDetails: "",
    notes: "",
  };

  const [newEpisode, setNewEpisode] = useState(initialEpisodeState);

  const { data: episodes = [] } = useQuery<ClinicalEpisode[]>({
    queryKey: ["/api/clinical/patients", patientId, "episodes"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/episodes`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clinical/episodes", { ...data, patientId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients", patientId, "episodes"] });
      setIsAdding(false);
      setNewEpisode(initialEpisodeState);
      toast({ title: "Épisode ajouté" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clinical/episodes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients", patientId, "episodes"] });
      toast({ title: "Épisode supprimé" });
    },
  });

  const episodeTypes = ["Manie", "Hypomanie", "Dépression", "Mixte"];
  const severities = ["Fluctuation", "Léger", "Modéré", "Sévère", "Caractérisé"];

  const getEpisodeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "manie": return "bg-red-100 text-red-800 border-red-300";
      case "hypomanie": return "bg-orange-100 text-orange-800 border-orange-300";
      case "dépression": return "bg-blue-100 text-blue-800 border-blue-300";
      case "mixte": return "bg-purple-100 text-purple-800 border-purple-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Histoire des Troubles - Épisodes Thymiques
          </span>
          <Button onClick={() => setIsAdding(true)} className="bg-medical-blue hover:bg-blue-700" data-testid="btn-add-episode">
            <Plus className="w-4 h-4 mr-2" /> Nouvel épisode
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
            <h4 className="font-medium mb-4">Nouvel épisode thymique</h4>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <Label>Date de début *</Label>
                <Input 
                  type="date" 
                  value={newEpisode.startDate} 
                  onChange={(e) => setNewEpisode({...newEpisode, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input 
                  type="date" 
                  value={newEpisode.endDate} 
                  onChange={(e) => setNewEpisode({...newEpisode, endDate: e.target.value})}
                />
              </div>
              <div>
                <Label>Type d'épisode *</Label>
                <Select value={newEpisode.episodeType} onValueChange={(val) => setNewEpisode({...newEpisode, episodeType: val})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {episodeTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sévérité</Label>
                <Select value={newEpisode.severity} onValueChange={(val) => setNewEpisode({...newEpisode, severity: val})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {severities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-4">
              <Label>Intensité pour le graphique (-5 à +5)</Label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="-5" 
                  max="5" 
                  value={newEpisode.moodLevel}
                  onChange={(e) => setNewEpisode({...newEpisode, moodLevel: parseInt(e.target.value)})}
                  className="flex-1"
                />
                <span className={`font-bold text-lg ${newEpisode.moodLevel > 0 ? 'text-red-600' : newEpisode.moodLevel < 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {newEpisode.moodLevel > 0 ? '+' : ''}{newEpisode.moodLevel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Contexte / Facteurs déclencheurs</Label>
                <Textarea 
                  value={newEpisode.context} 
                  onChange={(e) => setNewEpisode({...newEpisode, context: e.target.value})}
                  placeholder="Événements de vie, stress..."
                />
              </div>
              <div>
                <Label>Notes cliniques</Label>
                <Textarea 
                  value={newEpisode.notes} 
                  onChange={(e) => setNewEpisode({...newEpisode, notes: e.target.value})}
                  placeholder="Observations..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-3 rounded border">
                <Label className="font-medium mb-2 block">Retentissement</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={newEpisode.impactProfessional} onCheckedChange={(c) => setNewEpisode({...newEpisode, impactProfessional: !!c})} />
                    <span>Professionnel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={newEpisode.impactFamilial} onCheckedChange={(c) => setNewEpisode({...newEpisode, impactFamilial: !!c})} />
                    <span>Familial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={newEpisode.impactSocial} onCheckedChange={(c) => setNewEpisode({...newEpisode, impactSocial: !!c})} />
                    <span>Social</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={newEpisode.impactFinancial} onCheckedChange={(c) => setNewEpisode({...newEpisode, impactFinancial: !!c})} />
                    <span>Financier</span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-3 rounded border">
                <Label className="font-medium mb-2 block">Résolution</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={newEpisode.resolutionSpontaneous} onCheckedChange={(c) => setNewEpisode({...newEpisode, resolutionSpontaneous: !!c})} />
                    <span>Spontanée</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={newEpisode.resolutionFamilyHelp} onCheckedChange={(c) => setNewEpisode({...newEpisode, resolutionFamilyHelp: !!c})} />
                    <span>Aide proches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={newEpisode.resolutionConsultation} onCheckedChange={(c) => setNewEpisode({...newEpisode, resolutionConsultation: !!c})} />
                    <span>Consultation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={newEpisode.resolutionHospitalization} onCheckedChange={(c) => setNewEpisode({...newEpisode, resolutionHospitalization: !!c})} />
                    <span>Hospitalisation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={newEpisode.resolutionTreatment} onCheckedChange={(c) => setNewEpisode({...newEpisode, resolutionTreatment: !!c})} />
                    <span>Traitement</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate(newEpisode)} disabled={!newEpisode.startDate || !newEpisode.episodeType}>
                Enregistrer l'épisode
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>Annuler</Button>
            </div>
          </div>
        )}

        {episodes.length === 0 && !isAdding ? (
          <p className="text-gray-500 italic">Aucun épisode enregistré</p>
        ) : (
          <div className="space-y-3">
            {episodes.map((episode) => (
              <div 
                key={episode.id} 
                className={`border rounded-lg ${getEpisodeColor(episode.episodeType)}`}
              >
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer"
                  onClick={() => setExpandedEpisode(expandedEpisode === episode.id ? null : episode.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{episode.startDate}</span>
                    {episode.endDate && <span>→ {episode.endDate}</span>}
                    <span className="px-2 py-1 bg-white/50 rounded text-sm font-medium">{episode.episodeType}</span>
                    {episode.severity && <span className="text-sm">({episode.severity})</span>}
                    {episode.moodLevel !== null && (
                      <span className={`text-sm font-bold ${episode.moodLevel > 0 ? 'text-red-700' : 'text-blue-700'}`}>
                        {episode.moodLevel > 0 ? '+' : ''}{episode.moodLevel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedEpisode === episode.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(episode.id); }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                {expandedEpisode === episode.id && (
                  <div className="px-3 pb-3 border-t border-white/30 pt-3 text-sm space-y-2">
                    {episode.context && <div><span className="font-medium">Contexte:</span> {episode.context}</div>}
                    {episode.notes && <div><span className="font-medium">Notes:</span> {episode.notes}</div>}
                    <div className="flex gap-4">
                      {(episode.impactProfessional || episode.impactFamilial || episode.impactSocial || episode.impactFinancial) && (
                        <div>
                          <span className="font-medium">Retentissement:</span>
                          {episode.impactProfessional && " Pro"}
                          {episode.impactFamilial && " Fam"}
                          {episode.impactSocial && " Soc"}
                          {episode.impactFinancial && " Fin"}
                        </div>
                      )}
                      {(episode.resolutionSpontaneous || episode.resolutionFamilyHelp || episode.resolutionConsultation || episode.resolutionHospitalization || episode.resolutionTreatment) && (
                        <div>
                          <span className="font-medium">Résolution:</span>
                          {episode.resolutionSpontaneous && " Spont."}
                          {episode.resolutionFamilyHelp && " Proches"}
                          {episode.resolutionConsultation && " Consult."}
                          {episode.resolutionHospitalization && " HP"}
                          {episode.resolutionTreatment && " TTT"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportGenerator({ patientId, patient }: { patientId: number; patient: ClinicalPatient }) {
  const { toast } = useToast();
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  const { data: familyHistory = [] } = useQuery<FamilyHistory[]>({
    queryKey: ["/api/clinical/patients", patientId, "family-history"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/family-history`);
      return res.json();
    },
  });

  const { data: medicalHistory = [] } = useQuery<MedicalHistory[]>({
    queryKey: ["/api/clinical/patients", patientId, "medical-history"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/medical-history`);
      return res.json();
    },
  });

  const { data: addictionHistory = [] } = useQuery<AddictionHistory[]>({
    queryKey: ["/api/clinical/patients", patientId, "addiction-history"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/addiction-history`);
      return res.json();
    },
  });

  const { data: psychiatricHistory } = useQuery<PsychiatricHistory | null>({
    queryKey: ["/api/clinical/patients", patientId, "psychiatric-history"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/psychiatric-history`);
      return res.json();
    },
  });

  const { data: biography } = useQuery<Biography | null>({
    queryKey: ["/api/clinical/patients", patientId, "biography"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/biography`);
      return res.json();
    },
  });

  const { data: episodes = [] } = useQuery<ClinicalEpisode[]>({
    queryKey: ["/api/clinical/patients", patientId, "episodes"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/episodes`);
      return res.json();
    },
  });

  const { data: conclusion } = useQuery<ClinicalConclusion | null>({
    queryKey: ["/api/clinical/patients", patientId, "conclusion"],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients/${patientId}/conclusion`);
      return res.json();
    },
  });

  const generatePrompt = () => {
    const age = patient.birthDate ? Math.floor((new Date().getTime() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "?";
    
    let prompt = `Rédige un compte-rendu de consultation psychiatrique professionnel pour évaluation du trouble bipolaire, dans un style médical français formel.

INFORMATIONS PATIENT:
- Nom: ${patient.lastName} ${patient.firstName}
- Âge: ${age} ans (né(e) le ${patient.birthDate})
- Genre: ${patient.gender || "Non précisé"}
- Date de consultation: ${patient.consultationDate}
- Médecin adressant: ${patient.referringDoctor || "Non précisé"}
- Motif: ${patient.consultationReason || "Avis diagnostique et thérapeutique"}

`;

    if (familyHistory.length > 0) {
      prompt += `ANTÉCÉDENTS FAMILIAUX PSYCHIATRIQUES:\n`;
      familyHistory.forEach(h => {
        prompt += `- ${h.relationship}: ${h.condition}`;
        if (h.hospitalization) prompt += " (HP)";
        if (h.suicide) prompt += " (TS/suicide)";
        if (h.details) prompt += ` - ${h.details}`;
        prompt += "\n";
      });
      prompt += "\n";
    }

    if (medicalHistory.length > 0) {
      prompt += `ANTÉCÉDENTS MÉDICO-CHIRURGICAUX:\n`;
      medicalHistory.forEach(h => {
        prompt += `- ${h.condition}`;
        if (h.year) prompt += ` (${h.year})`;
        if (h.currentTreatment) prompt += ` - TTT: ${h.currentTreatment}`;
        prompt += "\n";
      });
      prompt += "\n";
    }

    if (addictionHistory.length > 0) {
      prompt += `ANTÉCÉDENTS ADDICTOLOGIQUES:\n`;
      addictionHistory.forEach(h => {
        prompt += `- ${h.substanceType}`;
        if (h.startAge) prompt += ` (début: ${h.startAge} ans)`;
        if (h.currentStatus) prompt += ` - ${h.currentStatus}`;
        if (h.consumption) prompt += ` - Conso: ${h.consumption}`;
        prompt += "\n";
      });
      prompt += "\n";
    }

    if (psychiatricHistory) {
      prompt += `ANTÉCÉDENTS PSYCHIATRIQUES:\n`;
      if (psychiatricHistory.hospitalizations) prompt += `- Hospitalisations: ${psychiatricHistory.hospitalizations}\n`;
      if (psychiatricHistory.suicideAttempts) prompt += `- TS: ${psychiatricHistory.suicideAttempts}\n`;
      if (psychiatricHistory.previousDiagnoses) prompt += `- Diagnostics: ${psychiatricHistory.previousDiagnoses}\n`;
      if (psychiatricHistory.previousTreatments) prompt += `- Chimiogramme:\n${psychiatricHistory.previousTreatments}\n`;
      if (psychiatricHistory.currentPsychiatrist) prompt += `- Psychiatre actuel: ${psychiatricHistory.currentPsychiatrist}\n`;
      prompt += "\n";
    }

    if (biography) {
      prompt += `ÉLÉMENTS BIOGRAPHIQUES:\n`;
      if (biography.birthPlace) prompt += `- Lieu de naissance: ${biography.birthPlace}\n`;
      if (biography.siblingPosition) prompt += `- Fratrie: ${biography.siblingPosition}\n`;
      if (biography.educationLevel) prompt += `- Niveau d'études: ${biography.educationLevel}\n`;
      if (biography.currentProfession) prompt += `- Profession: ${biography.currentProfession}\n`;
      if (biography.currentWorkStatus) prompt += `- Statut: ${biography.currentWorkStatus}\n`;
      if (biography.maritalStatus) prompt += `- Situation: ${biography.maritalStatus}\n`;
      if (biography.childrenCount) prompt += `- Enfants: ${biography.childrenCount}\n`;
      if (biography.familyContext) prompt += `- Contexte familial: ${biography.familyContext}\n`;
      prompt += "\n";
    }

    if (episodes.length > 0) {
      prompt += `HISTOIRE DES TROUBLES - ÉPISODES THYMIQUES (${episodes.length} épisodes):\n`;
      episodes.forEach((e, i) => {
        prompt += `\nÉpisode ${i + 1}: ${e.episodeType} ${e.severity ? `(${e.severity})` : ""}\n`;
        prompt += `- Période: ${e.startDate}${e.endDate ? ` → ${e.endDate}` : " (en cours)"}\n`;
        if (e.context) prompt += `- Contexte: ${e.context}\n`;
        
        const impacts = [];
        if (e.impactProfessional) impacts.push("professionnel");
        if (e.impactFamilial) impacts.push("familial");
        if (e.impactSocial) impacts.push("social");
        if (e.impactFinancial) impacts.push("financier");
        if (impacts.length > 0) prompt += `- Retentissement: ${impacts.join(", ")}\n`;
        
        const resolutions = [];
        if (e.resolutionSpontaneous) resolutions.push("spontanée");
        if (e.resolutionFamilyHelp) resolutions.push("aide proches");
        if (e.resolutionConsultation) resolutions.push("consultation");
        if (e.resolutionHospitalization) resolutions.push("hospitalisation");
        if (e.resolutionTreatment) resolutions.push("traitement");
        if (resolutions.length > 0) prompt += `- Résolution: ${resolutions.join(", ")}\n`;
        
        if (e.notes) prompt += `- Notes: ${e.notes}\n`;
      });
      prompt += "\n";
    }

    if (conclusion) {
      prompt += `CONCLUSION:\n`;
      if (conclusion.diagnosticHypothesis) prompt += `- Hypothèse diagnostique: ${conclusion.diagnosticHypothesis}\n`;
      if (conclusion.differentialDiagnosis) prompt += `- Diagnostic différentiel: ${conclusion.differentialDiagnosis}\n`;
      if (conclusion.recommendations) prompt += `- Recommandations: ${conclusion.recommendations}\n`;
      if (conclusion.proposedTreatment) prompt += `- Traitement proposé: ${conclusion.proposedTreatment}\n`;
      prompt += "\n";
    }

    prompt += `
INSTRUCTIONS DE RÉDACTION:
- Utiliser un style médical français formel (vouvoiement du correspondant, formules de politesse)
- Structurer en sections claires: Antécédents familiaux, Antécédents médico-chirurgicaux, Antécédents addictologiques, Antécédents psychiatriques, Éléments biographiques, Histoire des troubles, Conclusion
- Mentionner les difficultés éventuelles de recueil d'information
- Rester factuel et clinique
- Ne pas inventer d'informations non fournies
- Format: compte-rendu de consultation adressé au médecin référent`;

    setGeneratedPrompt(prompt);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast({ title: "Prompt copié dans le presse-papiers" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Générateur de Compte-Rendu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-600">
            Générez un prompt structuré à partir des données saisies pour créer un compte-rendu clinique avec votre outil IA préféré.
          </p>
          
          <Button onClick={generatePrompt} className="bg-medical-blue hover:bg-blue-700" data-testid="btn-generate-prompt">
            <FileText className="w-4 h-4 mr-2" />
            Générer le prompt
          </Button>

          {generatedPrompt && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Prompt généré</Label>
                <Button size="sm" variant="outline" onClick={copyToClipboard} data-testid="btn-copy-prompt">
                  <Copy className="w-4 h-4 mr-2" />
                  Copier
                </Button>
              </div>
              <Textarea 
                value={generatedPrompt}
                readOnly
                rows={20}
                className="font-mono text-sm"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClinicalEvaluation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  const { data: patients = [], isLoading } = useQuery<ClinicalPatient[]>({
    queryKey: ["/api/clinical/patients"],
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const createPatientMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clinical/patients", data);
      return res.json();
    },
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/patients"] });
      setSelectedPatientId(newPatient.id);
      setIsCreatingPatient(false);
      toast({ title: "Patient créé avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur lors de la création", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/")} data-testid="btn-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-medical-blue rounded-lg flex items-center justify-center">
                <ClipboardList className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Évaluation Clinique</h1>
                <p className="text-sm text-gray-500">Screening trouble bipolaire</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="text-center py-12">Chargement...</div>
        ) : (
          <>
            <PatientSelector 
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
              onCreateNew={() => setIsCreatingPatient(true)}
            />

            {isCreatingPatient && (
              <PatientForm 
                onSave={(data) => createPatientMutation.mutate(data)}
                onCancel={() => setIsCreatingPatient(false)}
              />
            )}

            {selectedPatient && !isCreatingPatient && (
              <Tabs defaultValue="antecedents" className="space-y-6">
                <TabsList className="bg-white border">
                  <TabsTrigger value="antecedents" data-testid="tab-antecedents">
                    <Users className="w-4 h-4 mr-2" />
                    Antécédents
                  </TabsTrigger>
                  <TabsTrigger value="biography" data-testid="tab-biography">
                    <User className="w-4 h-4 mr-2" />
                    Biographie
                  </TabsTrigger>
                  <TabsTrigger value="episodes" data-testid="tab-episodes">
                    <Activity className="w-4 h-4 mr-2" />
                    Épisodes
                  </TabsTrigger>
                  <TabsTrigger value="report" data-testid="tab-report">
                    <FileText className="w-4 h-4 mr-2" />
                    Compte-rendu
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="antecedents" className="space-y-6">
                  <FamilyHistorySection patientId={selectedPatient.id} />
                  <MedicalHistorySection patientId={selectedPatient.id} />
                  <AddictionHistorySection patientId={selectedPatient.id} />
                  <PsychiatricHistorySection patientId={selectedPatient.id} />
                </TabsContent>

                <TabsContent value="biography">
                  <BiographySection patientId={selectedPatient.id} />
                </TabsContent>

                <TabsContent value="episodes">
                  <ClinicalEpisodesSection patientId={selectedPatient.id} />
                </TabsContent>

                <TabsContent value="report">
                  <ReportGenerator patientId={selectedPatient.id} patient={selectedPatient} />
                </TabsContent>
              </Tabs>
            )}

            {!selectedPatient && !isCreatingPatient && patients.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border">
                <ClipboardList className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun patient</h3>
                <p className="text-gray-500 mb-4">Commencez par créer un nouveau patient pour démarrer l'évaluation</p>
                <Button onClick={() => setIsCreatingPatient(true)} className="bg-medical-blue hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau patient
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
