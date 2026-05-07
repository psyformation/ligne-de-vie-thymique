import { users, moodEntries, medications, medicationLogs, substances, instabilityPeriods, hospitalizations, clinicalPatients, familyHistory, medicalHistory, psychiatricHistory, addictionHistory, biography, clinicalEpisodes, clinicalConclusion, lifeEvents, type User, type InsertUser, type MoodEntry, type InsertMoodEntry, type Medication, type InsertMedication, type MedicationLog, type InsertMedicationLog, type Substance, type InsertSubstance, type InstabilityPeriod, type InsertInstabilityPeriod, type Hospitalization, type InsertHospitalization, type ClinicalPatient, type InsertClinicalPatient, type FamilyHistory, type InsertFamilyHistory, type MedicalHistory, type InsertMedicalHistory, type PsychiatricHistory, type InsertPsychiatricHistory, type AddictionHistory, type InsertAddictionHistory, type Biography, type InsertBiography, type ClinicalEpisode, type InsertClinicalEpisode, type ClinicalConclusion, type InsertClinicalConclusion, type LifeEvent, type InsertLifeEvent } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllMoodEntries(): Promise<MoodEntry[]>;
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;
  updateMoodEntry(id: number, updates: Partial<MoodEntry>): Promise<MoodEntry | undefined>;
  deleteMoodEntry(id: number): Promise<boolean>;
  clearAllMoodEntries(): Promise<void>;
  getAllPatientMoodEntries(): Promise<MoodEntry[]>;
  createPatientMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;
  deletePatientMoodEntry(id: number): Promise<boolean>;
  getAllMedications(): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  updateMedication(id: number, updates: Partial<Medication>): Promise<Medication | undefined>;
  deleteMedication(id: number): Promise<boolean>;
  clearAllMedications(): Promise<void>;
  getAllMedicationLogs(): Promise<MedicationLog[]>;
  getMedicationLogsByMedicationId(medicationId: number): Promise<MedicationLog[]>;
  createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog>;
  deleteMedicationLog(id: number): Promise<boolean>;
  getAllSubstances(): Promise<Substance[]>;
  createSubstance(substance: InsertSubstance): Promise<Substance>;
  updateSubstance(id: number, updates: Partial<Substance>): Promise<Substance | undefined>;
  deleteSubstance(id: number): Promise<boolean>;
  clearAllSubstances(): Promise<void>;
  getAllInstabilityPeriods(): Promise<InstabilityPeriod[]>;
  createInstabilityPeriod(period: InsertInstabilityPeriod): Promise<InstabilityPeriod>;
  deleteInstabilityPeriod(id: number): Promise<boolean>;
  clearAllInstabilityPeriods(): Promise<void>;
  getAllHospitalizations(): Promise<Hospitalization[]>;
  createHospitalization(hospitalization: InsertHospitalization): Promise<Hospitalization>;
  deleteHospitalization(id: number): Promise<boolean>;
  clearAllHospitalizations(): Promise<void>;
  // Patient mode hospitalizations (separate store)
  getAllPatientHospitalizations(): Promise<Hospitalization[]>;
  createPatientHospitalization(hospitalization: InsertHospitalization): Promise<Hospitalization>;
  deletePatientHospitalization(id: number): Promise<boolean>;
  // Patient mode instability periods (separate store)
  getAllPatientInstabilityPeriods(): Promise<InstabilityPeriod[]>;
  createPatientInstabilityPeriod(period: InsertInstabilityPeriod): Promise<InstabilityPeriod>;
  deletePatientInstabilityPeriod(id: number): Promise<boolean>;
  // Clinical evaluation methods
  getAllClinicalPatients(): Promise<ClinicalPatient[]>;
  getClinicalPatient(id: number): Promise<ClinicalPatient | undefined>;
  createClinicalPatient(patient: InsertClinicalPatient): Promise<ClinicalPatient>;
  updateClinicalPatient(id: number, updates: Partial<ClinicalPatient>): Promise<ClinicalPatient | undefined>;
  deleteClinicalPatient(id: number): Promise<boolean>;
  getFamilyHistoryByPatient(patientId: number): Promise<FamilyHistory[]>;
  createFamilyHistory(history: InsertFamilyHistory): Promise<FamilyHistory>;
  deleteFamilyHistory(id: number): Promise<boolean>;
  getMedicalHistoryByPatient(patientId: number): Promise<MedicalHistory[]>;
  createMedicalHistory(history: InsertMedicalHistory): Promise<MedicalHistory>;
  deleteMedicalHistory(id: number): Promise<boolean>;
  getPsychiatricHistoryByPatient(patientId: number): Promise<PsychiatricHistory | undefined>;
  createOrUpdatePsychiatricHistory(history: InsertPsychiatricHistory): Promise<PsychiatricHistory>;
  getAddictionHistoryByPatient(patientId: number): Promise<AddictionHistory[]>;
  createAddictionHistory(history: InsertAddictionHistory): Promise<AddictionHistory>;
  deleteAddictionHistory(id: number): Promise<boolean>;
  getBiographyByPatient(patientId: number): Promise<Biography | undefined>;
  createOrUpdateBiography(bio: InsertBiography): Promise<Biography>;
  getClinicalEpisodesByPatient(patientId: number): Promise<ClinicalEpisode[]>;
  createClinicalEpisode(episode: InsertClinicalEpisode): Promise<ClinicalEpisode>;
  updateClinicalEpisode(id: number, updates: Partial<ClinicalEpisode>): Promise<ClinicalEpisode | undefined>;
  deleteClinicalEpisode(id: number): Promise<boolean>;
  getConclusionByPatient(patientId: number): Promise<ClinicalConclusion | undefined>;
  createOrUpdateConclusion(conclusion: InsertClinicalConclusion): Promise<ClinicalConclusion>;
  // Life events
  getAllLifeEvents(): Promise<LifeEvent[]>;
  createLifeEvent(event: InsertLifeEvent): Promise<LifeEvent>;
  deleteLifeEvent(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private moodEntries: Map<number, MoodEntry>;
  private medications: Map<number, Medication>;
  private medicationLogs: Map<number, MedicationLog>;
  private substances: Map<number, Substance>;
  private instabilityPeriods: Map<number, InstabilityPeriod>;
  private hospitalizations: Map<number, Hospitalization>;
  private patientMoodEntries: Map<number, MoodEntry>;
  private patientHospitalizations: Map<number, Hospitalization>;
  private patientInstabilityPeriods: Map<number, InstabilityPeriod>;
  // Clinical evaluation maps
  private clinicalPatientsMap: Map<number, ClinicalPatient>;
  private familyHistoryMap: Map<number, FamilyHistory>;
  private medicalHistoryMap: Map<number, MedicalHistory>;
  private psychiatricHistoryMap: Map<number, PsychiatricHistory>;
  private addictionHistoryMap: Map<number, AddictionHistory>;
  private biographyMap: Map<number, Biography>;
  private clinicalEpisodesMap: Map<number, ClinicalEpisode>;
  private clinicalConclusionMap: Map<number, ClinicalConclusion>;
  
  private currentUserId: number;
  private currentMoodEntryId: number;
  private currentMedicationId: number;
  private currentMedicationLogId: number;
  private currentSubstanceId: number;
  private currentInstabilityPeriodId: number;
  private currentHospitalizationId: number;
  private currentPatientMoodEntryId: number;
  private currentPatientHospitalizationId: number;
  private currentPatientInstabilityPeriodId: number;
  private currentClinicalPatientId: number;
  private currentFamilyHistoryId: number;
  private currentMedicalHistoryId: number;
  private currentPsychiatricHistoryId: number;
  private currentAddictionHistoryId: number;
  private currentBiographyId: number;
  private currentClinicalEpisodeId: number;
  private currentClinicalConclusionId: number;
  private lifeEventsMap: Map<number, LifeEvent>;
  private currentLifeEventId: number;

  constructor() {
    this.users = new Map();
    this.moodEntries = new Map();
    this.medications = new Map();
    this.medicationLogs = new Map();
    this.substances = new Map();
    this.instabilityPeriods = new Map();
    this.hospitalizations = new Map();
    this.patientMoodEntries = new Map();
    this.patientHospitalizations = new Map();
    this.patientInstabilityPeriods = new Map();
    this.clinicalPatientsMap = new Map();
    this.familyHistoryMap = new Map();
    this.medicalHistoryMap = new Map();
    this.psychiatricHistoryMap = new Map();
    this.addictionHistoryMap = new Map();
    this.biographyMap = new Map();
    this.clinicalEpisodesMap = new Map();
    this.clinicalConclusionMap = new Map();
    
    this.currentUserId = 1;
    this.currentMoodEntryId = 1;
    this.currentMedicationId = 1;
    this.currentMedicationLogId = 1;
    this.currentSubstanceId = 1;
    this.currentInstabilityPeriodId = 1;
    this.currentHospitalizationId = 1;
    this.currentPatientMoodEntryId = 1;
    this.currentPatientHospitalizationId = 1;
    this.currentPatientInstabilityPeriodId = 1;
    this.currentClinicalPatientId = 1;
    this.currentFamilyHistoryId = 1;
    this.currentMedicalHistoryId = 1;
    this.currentPsychiatricHistoryId = 1;
    this.currentAddictionHistoryId = 1;
    this.currentBiographyId = 1;
    this.currentClinicalEpisodeId = 1;
    this.currentClinicalConclusionId = 1;
    this.lifeEventsMap = new Map();
    this.currentLifeEventId = 1;
    
    // Ajouter des données de test
    this.initializeTestData();
  }

  private initializeTestData() {
    // Données de démonstration complètes pour showcaser toutes les fonctionnalités
    // Incluant: épisodes vrais (±3+), fluctuations (±1,±2), patterns saisonniers, rapid cycling
    
    const testMoodEntries = [
      // ── 2020 ──────────────────────────────────────────────────────────────
      // Dépression sévère hivernale (COVID)
      {
        startDate: "2020-01-15",
        endDate: "2020-04-20",
        moodLevel: -4,
        episodeType: "dépression",
        triggerEvents: "Hiver difficile, confinement COVID",
        notes: "Épisode dépressif sévère - isolement, anhédonie, fatigue profonde",
        createdAt: new Date()
      },
      // Hypomanie estivale (déconfinement)
      {
        startDate: "2020-06-15",
        endDate: "2020-08-20",
        moodLevel: 3,
        episodeType: "hypomanie",
        triggerEvents: "Déconfinement, été, reprise activités",
        notes: "Hypomanie estivale — énergie retrouvée, projets multiples, peu de sommeil",
        createdAt: new Date()
      },
      // ── 2021 ─────────────────────────────────────────────────────────────
      // Manie franche (printemps)
      {
        startDate: "2021-03-10",
        endDate: "2021-05-05",
        moodLevel: 4,
        episodeType: "manie",
        triggerEvents: "Printemps, arrêt traitement spontané",
        notes: "Épisode maniaque franc — hospitalisation, dépenses impulsives, insomnie sévère",
        createdAt: new Date()
      },
      // Dépression post-maniaque sévère
      {
        startDate: "2021-05-20",
        endDate: "2021-07-25",
        moodLevel: -4,
        episodeType: "dépression",
        triggerEvents: "Post-manie, culpabilité, conséquences",
        notes: "Dépression sévère post-maniaque — effondrement, idées noires",
        createdAt: new Date()
      },
      // Stabilisation partielle (fluctuation positive)
      {
        startDate: "2021-09-01",
        endDate: "2021-10-20",
        moodLevel: 2,
        episodeType: "fluctuation",
        triggerEvents: "Nouveau traitement, suivi intensifié",
        notes: "Remontée partielle sous traitement",
        createdAt: new Date()
      },
      // ── 2022 — Épisode mixte ─────────────────────────────────────────────
      // Épisode MIXTE (premier)
      {
        startDate: "2022-02-15",
        endDate: "2022-04-20",
        moodLevel: 0,
        episodeType: "Mixte",
        mixedExcitationLevel: 3,
        mixedDepressiveLevel: 3,
        triggerEvents: "Arrêt partiel traitement, stress relationnel",
        notes: "État mixte caractérisé — agitation, irritabilité, idées dépressives simultanées",
        createdAt: new Date()
      },
      // Euthymie estivale (gap — aucune entrée entre 2022-04 et 2022-09)
      // Fluctuation automnale légère
      {
        startDate: "2022-09-15",
        endDate: "2022-11-10",
        moodLevel: -2,
        episodeType: "fluctuation",
        triggerEvents: "Rentrée, fatigue professionnelle",
        notes: "Fluctuation dépressive modérée — gérée ambulatoirement",
        createdAt: new Date()
      },

      // ── 2023 ─────────────────────────────────────────────────────────────
      // Dépression sévère (hiver)
      {
        startDate: "2023-01-05",
        endDate: "2023-03-10",
        moodLevel: -4,
        episodeType: "dépression",
        triggerEvents: "Hiver, deuil familial",
        notes: "Dépression sévère hivernale",
        createdAt: new Date()
      },
      // Hypomanie estivale (après longue éuthymie printanière)
      {
        startDate: "2023-09-01",
        endDate: "2023-10-10",
        moodLevel: 3,
        episodeType: "hypomanie",
        triggerEvents: "Fin été, projets professionnels",
        notes: "Hypomanie légère — productivité élevée, peu de sommeil",
        createdAt: new Date()
      },
      // ── 2024 — Amélioration progressive ──────────────────────────────────
      // Fluctuation légèrement dépressive (en amélioration)
      {
        startDate: "2024-02-01",
        endDate: "2024-04-15",
        moodLevel: -1,
        episodeType: "fluctuation",
        triggerEvents: "Hiver, nouveau suivi intensifié",
        notes: "Fluctuation légère — mieux contenue grâce au suivi",
        createdAt: new Date()
      },
      // Fluctuation légèrement positive (été)
      {
        startDate: "2024-05-01",
        endDate: "2024-08-31",
        moodLevel: 2,
        episodeType: "fluctuation",
        triggerEvents: "Printemps-été, projets créatifs",
        notes: "Fluctuation positive modérée — dans les limites thérapeutiques",
        createdAt: new Date()
      },
      // Légère baisse automnale
      {
        startDate: "2024-10-01",
        endDate: "2024-12-15",
        moodLevel: -1,
        episodeType: "fluctuation",
        triggerEvents: "Automne, fatigue accumulée",
        notes: "Légère baisse — sous contrôle, pas d'hospitalisation",
        createdAt: new Date()
      },

      // ── 2025-2026 — Épisode mixte + stabilisation finale ──────────────────
      // Fluctuation hivernale légère
      {
        startDate: "2025-01-10",
        endDate: "2025-02-28",
        moodLevel: -2,
        episodeType: "fluctuation",
        triggerEvents: "Hiver, anniversaire rupture",
        notes: "Fluctuation hivernale — gérée en ambulatoire",
        createdAt: new Date()
      },
      // Épisode MIXTE (deuxième — plus léger)
      {
        startDate: "2025-04-01",
        endDate: "2025-06-15",
        moodLevel: 0,
        episodeType: "Mixte",
        mixedExcitationLevel: 2,
        mixedDepressiveLevel: 2,
        triggerEvents: "Déménagement stressant, changement de vie",
        notes: "État mixte atténué — irritabilité, humeur labile, traitement ajusté",
        createdAt: new Date()
      },
      // Hypomanie légère (été 2025)
      {
        startDate: "2025-07-15",
        endDate: "2025-09-30",
        moodLevel: 2,
        episodeType: "fluctuation",
        triggerEvents: "Été, vacances, nouveau projet",
        notes: "Fluctuation positive — sous contrôle, bonne observance traitement",
        createdAt: new Date()
      },
      // Légère baisse hivernale → vers éuthymie
      {
        startDate: "2025-11-01",
        endDate: "2026-01-31",
        moodLevel: -1,
        episodeType: "fluctuation",
        triggerEvents: "Automne-hiver, fatigue légère",
        notes: "Fluctuation légère — meilleure tolérance, bon soutien social",
        createdAt: new Date()
      },
      // Stabilisation en cours (mars 2026)
      {
        startDate: "2026-02-10",
        endDate: "2026-03-15",
        moodLevel: 1,
        episodeType: "fluctuation",
        triggerEvents: "Printemps précoce, reprise activités",
        notes: "Amélioration en cours — objectif éuthymie stable",
        createdAt: new Date()
      }
    ];

    // Traitements médicamenteux - évolution sur 5 ans
    const testMedications = [
      // 2020 - Premier traitement
      {
        name: "Sertraline",
        dosage: "50mg",
        frequency: "1x/jour",
        type: "antidépresseur",
        startDate: "2020-02-01",
        endDate: "2020-09-30",
        isActive: false,
        notes: "Premier antidépresseur prescrit",
        createdAt: new Date()
      },
      // 2021 - Introduction stabilisateur après manie
      {
        name: "Valproate",
        dosage: "500mg",
        frequency: "2x/jour",
        type: "stabilisateur",
        startDate: "2021-04-15",
        endDate: "2022-06-30",
        isActive: false,
        notes: "Stabilisateur après épisode maniaque",
        createdAt: new Date()
      },
      {
        name: "Olanzapine",
        dosage: "10mg",
        frequency: "1x/jour",
        type: "antipsychotique",
        startDate: "2021-04-15",
        endDate: "2021-08-01",
        isActive: false,
        notes: "Antipsychotique pendant phase aiguë",
        createdAt: new Date()
      },
      {
        name: "Paroxétine",
        dosage: "20mg",
        frequency: "1x/jour",
        type: "antidépresseur",
        startDate: "2021-06-01",
        endDate: "2021-12-31",
        isActive: false,
        notes: "Antidépresseur associé au stabilisateur",
        createdAt: new Date()
      },
      // 2022 - Ajustements
      {
        name: "Lamotrigine",
        dosage: "200mg",
        frequency: "1x/jour",
        type: "stabilisateur",
        startDate: "2022-07-01",
        endDate: null,
        isActive: true,
        notes: "Nouveau stabilisateur mieux toléré",
        createdAt: new Date()
      },
      // 2023 - Période de rapid cycling - plusieurs ajustements
      {
        name: "Rispéridone",
        dosage: "2mg",
        frequency: "1x/jour",
        type: "antipsychotique",
        startDate: "2023-03-20",
        endDate: "2023-06-30",
        isActive: false,
        notes: "Ajout temporaire pendant phase maniaque",
        createdAt: new Date()
      },
      {
        name: "Escitalopram",
        dosage: "10mg",
        frequency: "1x/jour",
        type: "antidépresseur",
        startDate: "2023-05-20",
        endDate: "2023-12-31",
        isActive: false,
        notes: "Antidépresseur pendant dépression post-manie",
        createdAt: new Date()
      },
      // 2024 - Stabilisation
      {
        name: "Lithium",
        dosage: "900mg",
        frequency: "1x/jour",
        type: "stabilisateur",
        startDate: "2024-01-15",
        endDate: null,
        isActive: true,
        notes: "Lithium ajouté pour renforcer stabilisation",
        createdAt: new Date()
      },
      {
        name: "Quétiapine LP",
        dosage: "150mg",
        frequency: "au coucher",
        type: "antipsychotique",
        startDate: "2024-03-01",
        endDate: null,
        isActive: true,
        notes: "Pour améliorer sommeil et prévention rechute",
        createdAt: new Date()
      },
      // 2025 - Traitement actuel
      {
        name: "Venlafaxine",
        dosage: "75mg",
        frequency: "1x/jour",
        type: "antidépresseur",
        startDate: "2025-01-10",
        endDate: null,
        isActive: true,
        notes: "Ajout prudent pendant fluctuation hivernale",
        createdAt: new Date()
      }
    ];

    // Substances - consommation sur 5 ans
    const testSubstances = [
      {
        name: "Tabac",
        frequency: "daily",
        quantity: "10-20 cigarettes/jour",
        startPeriod: "2020-01",
        endPeriod: null,
        isActive: true,
        notes: "Consommation chronique, augmente en période de stress",
        createdAt: new Date()
      },
      {
        name: "Alcool",
        frequency: "occasional",
        quantity: "variable",
        startPeriod: "2020-11",
        endPeriod: "2021-08",
        isActive: false,
        notes: "Consommation excessive pendant dépressions",
        createdAt: new Date()
      },
      {
        name: "Cannabis (THC)",
        frequency: "daily",
        quantity: "1-3 joints/jour",
        startPeriod: "2021-05",
        endPeriod: "2022-03",
        isActive: false,
        notes: "Auto-médication anxiété, abandonné",
        createdAt: new Date()
      },
      {
        name: "Cannabis (THC)",
        frequency: "occasional",
        quantity: "épisodique",
        startPeriod: "2023-03",
        endPeriod: "2023-09",
        isActive: false,
        notes: "Reprise temporaire pendant manie",
        createdAt: new Date()
      },
      {
        name: "Café",
        frequency: "daily",
        quantity: "4-6 tasses/jour",
        startPeriod: "2020-01",
        endPeriod: null,
        isActive: true,
        notes: "Consommation quotidienne, réduite sur conseil médical",
        createdAt: new Date()
      }
    ];
    
    // Périodes d'instabilité thymique
    const testInstabilityPeriods = [
      {
        startDate: "2021-05-05",
        endDate: "2021-05-20",
        notes: "Transition manie → dépression — oscillations rapides non caractérisables",
        createdAt: new Date()
      },
      {
        startDate: "2024-08-31",
        endDate: "2024-09-30",
        notes: "Instabilité de fin d'été — transition vers baisse automnale",
        createdAt: new Date()
      }
    ];

    // Événements de vie significatifs — placés pendant des périodes d'éuthymie
    const testLifeEvents = [
      {
        // Éuthymie été 2022 (après épisode mixte avr 2022, avant fluctuation sept 2022)
        date: "2022-07-10",
        title: "Séparation amoureuse",
        category: "relationnel",
        description: "Fin d'une relation de 3 ans pendant une période de relative stabilité",
        createdAt: new Date()
      },
      {
        // Éuthymie automne 2023 (après hypomanie oct 2023, avant fluctuation fév 2024)
        date: "2023-11-20",
        title: "Décès grand-père",
        category: "familial",
        description: "Décès du grand-père maternel — deuil vécu en période de stabilité thymique",
        createdAt: new Date()
      }
    ];

    // Insérer les données de test
    testMoodEntries.forEach(entry => {
      const moodEntry: MoodEntry = {
        id: this.currentMoodEntryId++,
        ...entry
      };
      this.moodEntries.set(moodEntry.id, moodEntry);
    });

    testMedications.forEach(med => {
      const medication: Medication = {
        id: this.currentMedicationId++,
        ...med
      };
      this.medications.set(medication.id, medication);
    });

    testSubstances.forEach(sub => {
      const substance: Substance = {
        id: this.currentSubstanceId++,
        ...sub
      };
      this.substances.set(substance.id, substance);
    });

    // Insérer les périodes d'instabilité
    testInstabilityPeriods.forEach(period => {
      const instabilityPeriod: InstabilityPeriod = {
        id: this.currentInstabilityPeriodId++,
        ...period
      };
      this.instabilityPeriods.set(instabilityPeriod.id, instabilityPeriod);
    });

    // Hospitalisations de démonstration
    const testHospitalizations = [
      {
        startDate: "2021-04",
        endDate: "2021-05",
        location: "CHU Psychiatrie - Service Aigu",
        notes: "Hospitalisation pendant épisode maniaque sévère",
        createdAt: new Date()
      },
      {
        startDate: "2021-06",
        endDate: "2021-07",
        location: "Clinique Psychiatrique Saint-Anne",
        notes: "Hospitalisation pendant dépression post-maniaque",
        createdAt: new Date()
      },
      {
        startDate: "2023-04",
        endDate: "2023-04",
        location: "Urgences Psychiatriques CHU",
        notes: "Courte hospitalisation pour stabilisation",
        createdAt: new Date()
      }
    ];

    testHospitalizations.forEach(hosp => {
      const hospitalization: Hospitalization = {
        id: this.currentHospitalizationId++,
        ...hosp
      };
      this.hospitalizations.set(hospitalization.id, hospitalization);
    });

    // Insérer les événements de vie
    testLifeEvents.forEach(event => {
      const lifeEvent: LifeEvent = {
        id: this.currentLifeEventId++,
        ...event
      };
      this.lifeEventsMap.set(lifeEvent.id, lifeEvent);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.currentUserId++,
      ...insertUser
    };
    this.users.set(user.id, user);
    return user;
  }

  async getAllMoodEntries(): Promise<MoodEntry[]> {
    return Array.from(this.moodEntries.values()).sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  async createMoodEntry(insertEntry: InsertMoodEntry): Promise<MoodEntry> {
    const entry: MoodEntry = {
      id: this.currentMoodEntryId++,
      ...insertEntry,
      createdAt: new Date(),
      endDate: insertEntry.endDate || null,
      notes: insertEntry.notes || null,
      triggerEvents: insertEntry.triggerEvents || null
    };
    this.moodEntries.set(entry.id, entry);
    return entry;
  }

  async updateMoodEntry(id: number, updates: Partial<MoodEntry>): Promise<MoodEntry | undefined> {
    const entry = this.moodEntries.get(id);
    if (!entry) return undefined;
    const updated: MoodEntry = { ...entry, ...updates };
    this.moodEntries.set(id, updated);
    return updated;
  }

  async deleteMoodEntry(id: number): Promise<boolean> {
    return this.moodEntries.delete(id);
  }

  async clearAllMoodEntries(): Promise<void> {
    this.moodEntries.clear();
    this.currentMoodEntryId = 1;
  }

  async getAllPatientMoodEntries(): Promise<MoodEntry[]> {
    return Array.from(this.patientMoodEntries.values()).sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  async createPatientMoodEntry(insertEntry: InsertMoodEntry): Promise<MoodEntry> {
    const entry: MoodEntry = {
      id: this.currentPatientMoodEntryId++,
      ...insertEntry,
      createdAt: new Date(),
      endDate: insertEntry.endDate || null,
      notes: insertEntry.notes || null,
      triggerEvents: insertEntry.triggerEvents || null
    };
    this.patientMoodEntries.set(entry.id, entry);
    return entry;
  }

  async deletePatientMoodEntry(id: number): Promise<boolean> {
    return this.patientMoodEntries.delete(id);
  }

  async getAllPatientHospitalizations(): Promise<Hospitalization[]> {
    return Array.from(this.patientHospitalizations.values()).sort((a, b) =>
      new Date(a.startDate.length === 7 ? a.startDate + "-01" : a.startDate).getTime() -
      new Date(b.startDate.length === 7 ? b.startDate + "-01" : b.startDate).getTime()
    );
  }

  async createPatientHospitalization(insertH: InsertHospitalization): Promise<Hospitalization> {
    const h: Hospitalization = {
      id: this.currentPatientHospitalizationId++,
      ...insertH,
      createdAt: new Date(),
      endDate: insertH.endDate || null,
      location: insertH.location || null,
      notes: insertH.notes || null
    };
    this.patientHospitalizations.set(h.id, h);
    return h;
  }

  async deletePatientHospitalization(id: number): Promise<boolean> {
    return this.patientHospitalizations.delete(id);
  }

  async getAllPatientInstabilityPeriods(): Promise<InstabilityPeriod[]> {
    return Array.from(this.patientInstabilityPeriods.values()).sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  async createPatientInstabilityPeriod(insertPeriod: InsertInstabilityPeriod): Promise<InstabilityPeriod> {
    const period: InstabilityPeriod = {
      id: this.currentPatientInstabilityPeriodId++,
      ...insertPeriod,
      createdAt: new Date(),
      endDate: insertPeriod.endDate || null,
      notes: insertPeriod.notes || null
    };
    this.patientInstabilityPeriods.set(period.id, period);
    return period;
  }

  async deletePatientInstabilityPeriod(id: number): Promise<boolean> {
    return this.patientInstabilityPeriods.delete(id);
  }

  async clearAllMedications(): Promise<void> {
    this.medications.clear();
    this.currentMedicationId = 1;
  }

  async clearAllSubstances(): Promise<void> {
    this.substances.clear();
    this.currentSubstanceId = 1;
  }

  async getAllMedications(): Promise<Medication[]> {
    return Array.from(this.medications.values()).sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  async createMedication(insertMedication: InsertMedication): Promise<Medication> {
    const medication: Medication = {
      id: this.currentMedicationId++,
      ...insertMedication,
      createdAt: new Date(),
      endDate: insertMedication.endDate || null,
      dosage: insertMedication.dosage || null,
      frequency: insertMedication.frequency || null,
      notes: insertMedication.notes || null,
      isActive: insertMedication.isActive ?? true
    };
    this.medications.set(medication.id, medication);
    return medication;
  }

  async updateMedication(id: number, updates: Partial<Medication>): Promise<Medication | undefined> {
    const medication = this.medications.get(id);
    if (!medication) return undefined;
    
    const updatedMedication = { ...medication, ...updates };
    this.medications.set(id, updatedMedication);
    return updatedMedication;
  }

  async deleteMedication(id: number): Promise<boolean> {
    return this.medications.delete(id);
  }

  async getAllMedicationLogs(): Promise<MedicationLog[]> {
    return Array.from(this.medicationLogs.values()).sort((a, b) => 
      new Date(a.takenDate).getTime() - new Date(b.takenDate).getTime()
    );
  }

  async getMedicationLogsByMedicationId(medicationId: number): Promise<MedicationLog[]> {
    return Array.from(this.medicationLogs.values())
      .filter(log => log.medicationId === medicationId)
      .sort((a, b) => new Date(a.takenDate).getTime() - new Date(b.takenDate).getTime());
  }

  async createMedicationLog(insertLog: InsertMedicationLog): Promise<MedicationLog> {
    const log: MedicationLog = {
      id: this.currentMedicationLogId++,
      ...insertLog,
      createdAt: new Date(),
      takenTime: insertLog.takenTime || null,
      actualDosage: insertLog.actualDosage || null,
      sideEffects: insertLog.sideEffects || null,
      notes: insertLog.notes || null,
      effectiveness: insertLog.effectiveness || null
    };
    this.medicationLogs.set(log.id, log);
    return log;
  }

  async deleteMedicationLog(id: number): Promise<boolean> {
    return this.medicationLogs.delete(id);
  }

  async getAllSubstances(): Promise<Substance[]> {
    return Array.from(this.substances.values()).sort((a, b) => 
      new Date(a.startPeriod).getTime() - new Date(b.startPeriod).getTime()
    );
  }

  async createSubstance(insertSubstance: InsertSubstance): Promise<Substance> {
    const substance: Substance = {
      id: this.currentSubstanceId++,
      ...insertSubstance,
      createdAt: new Date(),
      endPeriod: insertSubstance.endPeriod || null,
      frequency: insertSubstance.frequency || null,
      quantity: insertSubstance.quantity || null,
      notes: insertSubstance.notes || null,
      isActive: insertSubstance.isActive ?? true
    };
    this.substances.set(substance.id, substance);
    return substance;
  }

  async updateSubstance(id: number, updates: Partial<Substance>): Promise<Substance | undefined> {
    const substance = this.substances.get(id);
    if (!substance) return undefined;
    
    const updatedSubstance = { ...substance, ...updates };
    this.substances.set(id, updatedSubstance);
    return updatedSubstance;
  }

  async deleteSubstance(id: number): Promise<boolean> {
    return this.substances.delete(id);
  }

  async getAllInstabilityPeriods(): Promise<InstabilityPeriod[]> {
    return Array.from(this.instabilityPeriods.values()).sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  async createInstabilityPeriod(insertPeriod: InsertInstabilityPeriod): Promise<InstabilityPeriod> {
    const period: InstabilityPeriod = {
      id: this.currentInstabilityPeriodId++,
      ...insertPeriod,
      createdAt: new Date(),
      endDate: insertPeriod.endDate || null,
      notes: insertPeriod.notes || null
    };
    this.instabilityPeriods.set(period.id, period);
    return period;
  }

  async deleteInstabilityPeriod(id: number): Promise<boolean> {
    return this.instabilityPeriods.delete(id);
  }

  async clearAllInstabilityPeriods(): Promise<void> {
    this.instabilityPeriods.clear();
    this.currentInstabilityPeriodId = 1;
  }

  async getAllHospitalizations(): Promise<Hospitalization[]> {
    return Array.from(this.hospitalizations.values()).sort((a, b) => 
      new Date(a.startDate.length === 7 ? a.startDate + "-01" : a.startDate).getTime() - 
      new Date(b.startDate.length === 7 ? b.startDate + "-01" : b.startDate).getTime()
    );
  }

  async createHospitalization(insertHospitalization: InsertHospitalization): Promise<Hospitalization> {
    const hospitalization: Hospitalization = {
      id: this.currentHospitalizationId++,
      ...insertHospitalization,
      createdAt: new Date(),
      endDate: insertHospitalization.endDate || null,
      location: insertHospitalization.location || null,
      notes: insertHospitalization.notes || null
    };
    this.hospitalizations.set(hospitalization.id, hospitalization);
    return hospitalization;
  }

  async deleteHospitalization(id: number): Promise<boolean> {
    return this.hospitalizations.delete(id);
  }

  async clearAllHospitalizations(): Promise<void> {
    this.hospitalizations.clear();
    this.currentHospitalizationId = 1;
  }

  // ========== Clinical Evaluation Methods ==========

  async getAllClinicalPatients(): Promise<ClinicalPatient[]> {
    return Array.from(this.clinicalPatientsMap.values()).sort((a, b) => 
      new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime()
    );
  }

  async getClinicalPatient(id: number): Promise<ClinicalPatient | undefined> {
    return this.clinicalPatientsMap.get(id);
  }

  async createClinicalPatient(patient: InsertClinicalPatient): Promise<ClinicalPatient> {
    const newPatient: ClinicalPatient = {
      id: this.currentClinicalPatientId++,
      ...patient,
      gender: patient.gender || null,
      referringDoctor: patient.referringDoctor || null,
      consultationReason: patient.consultationReason || null,
      notes: patient.notes || null,
      createdAt: new Date(),
    };
    this.clinicalPatientsMap.set(newPatient.id, newPatient);
    return newPatient;
  }

  async updateClinicalPatient(id: number, updates: Partial<ClinicalPatient>): Promise<ClinicalPatient | undefined> {
    const existing = this.clinicalPatientsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.clinicalPatientsMap.set(id, updated);
    return updated;
  }

  async deleteClinicalPatient(id: number): Promise<boolean> {
    // Also delete related records
    Array.from(this.familyHistoryMap.entries()).forEach(([key, val]) => {
      if (val.patientId === id) this.familyHistoryMap.delete(key);
    });
    Array.from(this.medicalHistoryMap.entries()).forEach(([key, val]) => {
      if (val.patientId === id) this.medicalHistoryMap.delete(key);
    });
    Array.from(this.psychiatricHistoryMap.entries()).forEach(([key, val]) => {
      if (val.patientId === id) this.psychiatricHistoryMap.delete(key);
    });
    Array.from(this.addictionHistoryMap.entries()).forEach(([key, val]) => {
      if (val.patientId === id) this.addictionHistoryMap.delete(key);
    });
    Array.from(this.biographyMap.entries()).forEach(([key, val]) => {
      if (val.patientId === id) this.biographyMap.delete(key);
    });
    Array.from(this.clinicalEpisodesMap.entries()).forEach(([key, val]) => {
      if (val.patientId === id) this.clinicalEpisodesMap.delete(key);
    });
    Array.from(this.clinicalConclusionMap.entries()).forEach(([key, val]) => {
      if (val.patientId === id) this.clinicalConclusionMap.delete(key);
    });
    return this.clinicalPatientsMap.delete(id);
  }

  async getFamilyHistoryByPatient(patientId: number): Promise<FamilyHistory[]> {
    return Array.from(this.familyHistoryMap.values()).filter(h => h.patientId === patientId);
  }

  async createFamilyHistory(history: InsertFamilyHistory): Promise<FamilyHistory> {
    const newHistory: FamilyHistory = {
      id: this.currentFamilyHistoryId++,
      ...history,
      details: history.details || null,
      hospitalization: history.hospitalization || false,
      suicide: history.suicide || false,
      createdAt: new Date(),
    };
    this.familyHistoryMap.set(newHistory.id, newHistory);
    return newHistory;
  }

  async deleteFamilyHistory(id: number): Promise<boolean> {
    return this.familyHistoryMap.delete(id);
  }

  async getMedicalHistoryByPatient(patientId: number): Promise<MedicalHistory[]> {
    return Array.from(this.medicalHistoryMap.values()).filter(h => h.patientId === patientId);
  }

  async createMedicalHistory(history: InsertMedicalHistory): Promise<MedicalHistory> {
    const newHistory: MedicalHistory = {
      id: this.currentMedicalHistoryId++,
      ...history,
      year: history.year || null,
      details: history.details || null,
      currentTreatment: history.currentTreatment || null,
      createdAt: new Date(),
    };
    this.medicalHistoryMap.set(newHistory.id, newHistory);
    return newHistory;
  }

  async deleteMedicalHistory(id: number): Promise<boolean> {
    return this.medicalHistoryMap.delete(id);
  }

  async getPsychiatricHistoryByPatient(patientId: number): Promise<PsychiatricHistory | undefined> {
    return Array.from(this.psychiatricHistoryMap.values()).find(h => h.patientId === patientId);
  }

  async createOrUpdatePsychiatricHistory(history: InsertPsychiatricHistory): Promise<PsychiatricHistory> {
    const existing = Array.from(this.psychiatricHistoryMap.values()).find(h => h.patientId === history.patientId);
    if (existing) {
      const updated: PsychiatricHistory = { ...existing, ...history };
      this.psychiatricHistoryMap.set(existing.id, updated);
      return updated;
    }
    const newHistory: PsychiatricHistory = {
      id: this.currentPsychiatricHistoryId++,
      ...history,
      hospitalizations: history.hospitalizations || null,
      suicideAttempts: history.suicideAttempts || null,
      previousDiagnoses: history.previousDiagnoses || null,
      previousTreatments: history.previousTreatments || null,
      currentPsychiatrist: history.currentPsychiatrist || null,
      currentTherapist: history.currentTherapist || null,
      therapyType: history.therapyType || null,
      notes: history.notes || null,
      createdAt: new Date(),
    };
    this.psychiatricHistoryMap.set(newHistory.id, newHistory);
    return newHistory;
  }

  async getAddictionHistoryByPatient(patientId: number): Promise<AddictionHistory[]> {
    return Array.from(this.addictionHistoryMap.values()).filter(h => h.patientId === patientId);
  }

  async createAddictionHistory(history: InsertAddictionHistory): Promise<AddictionHistory> {
    const newHistory: AddictionHistory = {
      id: this.currentAddictionHistoryId++,
      ...history,
      startAge: history.startAge || null,
      currentStatus: history.currentStatus || null,
      consumption: history.consumption || null,
      maxConsumption: history.maxConsumption || null,
      abstinenceDate: history.abstinenceDate || null,
      treatment: history.treatment || null,
      notes: history.notes || null,
      createdAt: new Date(),
    };
    this.addictionHistoryMap.set(newHistory.id, newHistory);
    return newHistory;
  }

  async deleteAddictionHistory(id: number): Promise<boolean> {
    return this.addictionHistoryMap.delete(id);
  }

  async getBiographyByPatient(patientId: number): Promise<Biography | undefined> {
    return Array.from(this.biographyMap.values()).find(b => b.patientId === patientId);
  }

  async createOrUpdateBiography(bio: InsertBiography): Promise<Biography> {
    const existing = Array.from(this.biographyMap.values()).find(b => b.patientId === bio.patientId);
    if (existing) {
      const updated: Biography = { ...existing, ...bio };
      this.biographyMap.set(existing.id, updated);
      return updated;
    }
    const newBio: Biography = {
      id: this.currentBiographyId++,
      ...bio,
      birthPlace: bio.birthPlace || null,
      siblingPosition: bio.siblingPosition || null,
      siblingsCount: bio.siblingsCount || null,
      familyContext: bio.familyContext || null,
      educationLevel: bio.educationLevel || null,
      educationDetails: bio.educationDetails || null,
      currentProfession: bio.currentProfession || null,
      professionalHistory: bio.professionalHistory || null,
      currentWorkStatus: bio.currentWorkStatus || null,
      maritalStatus: bio.maritalStatus || null,
      childrenCount: bio.childrenCount || null,
      livingArrangement: bio.livingArrangement || null,
      relationshipHistory: bio.relationshipHistory || null,
      notes: bio.notes || null,
      createdAt: new Date(),
    };
    this.biographyMap.set(newBio.id, newBio);
    return newBio;
  }

  async getClinicalEpisodesByPatient(patientId: number): Promise<ClinicalEpisode[]> {
    return Array.from(this.clinicalEpisodesMap.values())
      .filter(e => e.patientId === patientId)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  async createClinicalEpisode(episode: InsertClinicalEpisode): Promise<ClinicalEpisode> {
    const newEpisode: ClinicalEpisode = {
      id: this.currentClinicalEpisodeId++,
      ...episode,
      endDate: episode.endDate || null,
      severity: episode.severity || null,
      moodLevel: episode.moodLevel || null,
      symptoms: episode.symptoms || "{}",
      context: episode.context || null,
      triggers: episode.triggers || null,
      impactProfessional: episode.impactProfessional || false,
      impactFamilial: episode.impactFamilial || false,
      impactSocial: episode.impactSocial || false,
      impactFinancial: episode.impactFinancial || false,
      impactDetails: episode.impactDetails || null,
      resolutionSpontaneous: episode.resolutionSpontaneous || false,
      resolutionFamilyHelp: episode.resolutionFamilyHelp || false,
      resolutionConsultation: episode.resolutionConsultation || false,
      resolutionHospitalization: episode.resolutionHospitalization || false,
      resolutionTreatment: episode.resolutionTreatment || false,
      resolutionDetails: episode.resolutionDetails || null,
      notes: episode.notes || null,
      createdAt: new Date(),
    };
    this.clinicalEpisodesMap.set(newEpisode.id, newEpisode);
    return newEpisode;
  }

  async updateClinicalEpisode(id: number, updates: Partial<ClinicalEpisode>): Promise<ClinicalEpisode | undefined> {
    const existing = this.clinicalEpisodesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.clinicalEpisodesMap.set(id, updated);
    return updated;
  }

  async deleteClinicalEpisode(id: number): Promise<boolean> {
    return this.clinicalEpisodesMap.delete(id);
  }

  async getConclusionByPatient(patientId: number): Promise<ClinicalConclusion | undefined> {
    return Array.from(this.clinicalConclusionMap.values()).find(c => c.patientId === patientId);
  }

  async createOrUpdateConclusion(conclusion: InsertClinicalConclusion): Promise<ClinicalConclusion> {
    const existing = Array.from(this.clinicalConclusionMap.values()).find(c => c.patientId === conclusion.patientId);
    if (existing) {
      const updated: ClinicalConclusion = { ...existing, ...conclusion, updatedAt: new Date() };
      this.clinicalConclusionMap.set(existing.id, updated);
      return updated;
    }
    const newConclusion: ClinicalConclusion = {
      id: this.currentClinicalConclusionId++,
      ...conclusion,
      diagnosticHypothesis: conclusion.diagnosticHypothesis || null,
      differentialDiagnosis: conclusion.differentialDiagnosis || null,
      recommendations: conclusion.recommendations || null,
      proposedTreatment: conclusion.proposedTreatment || null,
      followUpPlan: conclusion.followUpPlan || null,
      additionalExams: conclusion.additionalExams || null,
      notes: conclusion.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clinicalConclusionMap.set(newConclusion.id, newConclusion);
    return newConclusion;
  }

  // ── Life Events ──────────────────────────────────────────────────────────────
  async getAllLifeEvents(): Promise<LifeEvent[]> {
    return Array.from(this.lifeEventsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async createLifeEvent(event: InsertLifeEvent): Promise<LifeEvent> {
    const newEvent: LifeEvent = {
      id: this.currentLifeEventId++,
      date: event.date,
      title: event.title,
      description: event.description ?? null,
      category: event.category ?? "autre",
      createdAt: new Date(),
    };
    this.lifeEventsMap.set(newEvent.id, newEvent);
    return newEvent;
  }

  async deleteLifeEvent(id: number): Promise<boolean> {
    return this.lifeEventsMap.delete(id);
  }
}

// Export de l'instance de stockage
export const storage = new MemStorage();