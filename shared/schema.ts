import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  startDate: text("start_date").notNull(), // Store as YYYY-MM-DD string
  endDate: text("end_date"), // Optional end date, null for ongoing episodes
  moodLevel: integer("mood_level").notNull(), // -5 to +5
  episodeType: text("episode_type").notNull(),
  notes: text("notes").default(""),
  triggerEvents: text("trigger_events").default(""), // Life events or triggers
  // Mixed episode fields: simultaneous depressive + excitation symptoms
  mixedExcitationLevel: integer("mixed_excitation_level"), // 1-3, positive pole of mixed state
  mixedDepressiveLevel: integer("mixed_depressive_level"), // 1-3, depressive pole of mixed state
  createdAt: timestamp("created_at").defaultNow(),
});

export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dosage: text("dosage"),
  frequency: text("frequency"), // "daily", "twice_daily", "weekly", etc.
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  isActive: boolean("is_active").default(true),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicationLogs = pgTable("medication_logs", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id").notNull(),
  takenDate: text("taken_date").notNull(),
  takenTime: text("taken_time"), // "morning", "afternoon", "evening", "night"
  actualDosage: text("actual_dosage"), // in case different from prescribed
  sideEffects: text("side_effects").default(""),
  effectiveness: integer("effectiveness"), // 1-5 scale
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const substances = pgTable("substances", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  frequency: text("frequency"), // "daily", "several_weekly", "several_monthly", "occasional", "festive"
  quantity: text("quantity"), // optional quantity description
  startPeriod: text("start_period").notNull(), // "YYYY-MM" format
  endPeriod: text("end_period"), // "YYYY-MM" format, optional
  isActive: boolean("is_active").default(true),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const instabilityPeriods = pgTable("instability_periods", {
  id: serial("id").primaryKey(),
  startDate: text("start_date").notNull(), // Store as YYYY-MM-DD or YYYY-MM string
  endDate: text("end_date"), // Optional end date, null for ongoing periods
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hospitalizations = pgTable("hospitalizations", {
  id: serial("id").primaryKey(),
  startDate: text("start_date").notNull(), // Store as YYYY-MM-DD or YYYY-MM string
  endDate: text("end_date"), // Optional end date
  location: text("location").default(""), // Hospital/clinic name
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lifeEvents = pgTable("life_events", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),               // YYYY-MM-DD or YYYY-MM
  title: text("title").notNull(),             // Courte description
  description: text("description").default(""),
  category: text("category").default("autre"), // familial, professionnel, médical, relationnel, autre
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLifeEventSchema = createInsertSchema(lifeEvents).pick({
  date: true,
  title: true,
  description: true,
  category: true,
}).extend({
  date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "Format: YYYY-MM ou YYYY-MM-DD"),
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  category: z.string().optional(),
});

export type LifeEvent = typeof lifeEvents.$inferSelect;
export type InsertLifeEvent = z.infer<typeof insertLifeEventSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Helper regex for flexible date format: YYYY-MM or YYYY-MM-DD
const flexibleDateRegex = /^\d{4}-\d{2}(-\d{2})?$/;

export const insertMoodEntrySchema = createInsertSchema(moodEntries).pick({
  startDate: true,
  endDate: true,
  moodLevel: true,
  notes: true,
  triggerEvents: true,
  mixedExcitationLevel: true,
  mixedDepressiveLevel: true,
}).extend({
  moodLevel: z.number().min(-5).max(5),
  startDate: z.string().regex(flexibleDateRegex, "Format: YYYY-MM ou YYYY-MM-DD"),
  endDate: z.string().regex(flexibleDateRegex, "Format: YYYY-MM ou YYYY-MM-DD").optional().nullable(),
  triggerEvents: z.string().optional(),
  mixedExcitationLevel: z.number().min(1).max(5).optional().nullable(),
  mixedDepressiveLevel: z.number().min(1).max(5).optional().nullable(),
}).transform((data) => {
  // Auto-assign episode type based on mood level - New classification system
  let episodeType: string;

  // Mixed episode: when both poles are explicitly set
  if (data.mixedExcitationLevel != null && data.mixedDepressiveLevel != null) {
    episodeType = "Mixte";
  } else {
    const absLevel = Math.abs(data.moodLevel);
    if (data.moodLevel === 0) {
      episodeType = "Euthymie";
    } else if (absLevel === 1 || absLevel === 2) {
      episodeType = data.moodLevel > 0 ? "Fluctuation Positive" : "Fluctuation Negative";
    } else if (data.moodLevel === -3) {
      episodeType = "Depression Moderee";
    } else if (data.moodLevel <= -4) {
      episodeType = "Depression Severe";
    } else if (data.moodLevel === 3) {
      episodeType = "Hypomanie";
    } else if (data.moodLevel >= 4) {
      episodeType = "Manie";
    } else {
      episodeType = "Euthymie";
    }
  }

  return {
    ...data,
    episodeType,
  };
});

export const insertMedicationSchema = createInsertSchema(medications).pick({
  name: true,
  dosage: true,
  frequency: true,
  startDate: true,
  endDate: true,
  notes: true,
}).extend({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  name: z.string().min(1, "Le nom du médicament est requis"),
}).refine((data) => {
  // Validate chronological order of dates
  if (data.endDate && data.startDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return endDate >= startDate;
  }
  return true;
}, {
  message: "La date de fin ne peut pas être antérieure à la date de début",
  path: ["endDate"]
}).transform((data) => {
  // Auto-define as active if no end date
  const isActive = !data.endDate || data.endDate.trim() === "";
  return {
    ...data,
    isActive,
  };
});

export const insertMedicationLogSchema = createInsertSchema(medicationLogs).pick({
  medicationId: true,
  takenDate: true,
  takenTime: true,
  actualDosage: true,
  sideEffects: true,
  effectiveness: true,
  notes: true,
}).extend({
  takenDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  medicationId: z.number().min(1, "ID du médicament requis"),
  effectiveness: z.number().min(1).max(5).optional(),
});

export const insertSubstanceSchema = createInsertSchema(substances).pick({
  name: true,
  frequency: true,
  quantity: true,
  startPeriod: true,
  endPeriod: true,
  notes: true,
}).extend({
  startPeriod: z.string().regex(/^\d{4}-\d{2}$/, "Format requis: YYYY-MM"),
  endPeriod: z.string().regex(/^\d{4}-\d{2}$/, "Format requis: YYYY-MM").optional().nullable(),
  name: z.string().min(1, "Le nom de la substance est requis"),
}).refine((data) => {
  // Validate chronological order of periods
  if (data.endPeriod && data.startPeriod) {
    const startPeriod = new Date(data.startPeriod + "-01");
    const endPeriod = new Date(data.endPeriod + "-01");
    return endPeriod >= startPeriod;
  }
  return true;
}, {
  message: "La période de fin ne peut pas être antérieure à la période de début",
  path: ["endPeriod"]
}).transform((data) => {
  // Auto-define as active if no end period
  const isActive = !data.endPeriod || data.endPeriod.trim() === "";
  return {
    ...data,
    isActive,
  };
});

export const insertInstabilityPeriodSchema = createInsertSchema(instabilityPeriods).pick({
  startDate: true,
  endDate: true,
  notes: true,
}).extend({
  startDate: z.string().regex(flexibleDateRegex, "Format: YYYY-MM ou YYYY-MM-DD"),
  endDate: z.string().regex(flexibleDateRegex, "Format: YYYY-MM ou YYYY-MM-DD").optional().nullable(),
}).refine((data) => {
  // Validate chronological order of dates
  if (data.endDate && data.startDate) {
    const startDate = new Date(data.startDate.length === 7 ? data.startDate + "-01" : data.startDate);
    const endDate = new Date(data.endDate.length === 7 ? data.endDate + "-01" : data.endDate);
    return endDate >= startDate;
  }
  return true;
}, {
  message: "La date de fin ne peut pas être antérieure à la date de début",
  path: ["endDate"]
});

export const insertHospitalizationSchema = createInsertSchema(hospitalizations).pick({
  startDate: true,
  endDate: true,
  location: true,
  notes: true,
}).extend({
  startDate: z.string().regex(flexibleDateRegex, "Format: YYYY-MM ou YYYY-MM-DD"),
  endDate: z.string().regex(flexibleDateRegex, "Format: YYYY-MM ou YYYY-MM-DD").optional().nullable(),
  location: z.string().optional(),
}).refine((data) => {
  // Validate chronological order of dates
  if (data.endDate && data.startDate) {
    const startDate = new Date(data.startDate.length === 7 ? data.startDate + "-01" : data.startDate);
    const endDate = new Date(data.endDate.length === 7 ? data.endDate + "-01" : data.endDate);
    return endDate >= startDate;
  }
  return true;
}, {
  message: "La date de fin ne peut pas être antérieure à la date de début",
  path: ["endDate"]
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;
export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type MedicationLog = typeof medicationLogs.$inferSelect;
export type InsertMedicationLog = z.infer<typeof insertMedicationLogSchema>;
export type Substance = typeof substances.$inferSelect;
export type InsertSubstance = z.infer<typeof insertSubstanceSchema>;
export type InstabilityPeriod = typeof instabilityPeriods.$inferSelect;
export type InsertInstabilityPeriod = z.infer<typeof insertInstabilityPeriodSchema>;
export type Hospitalization = typeof hospitalizations.$inferSelect;
export type InsertHospitalization = z.infer<typeof insertHospitalizationSchema>;

// ========== Clinical Evaluation Schema ==========

// Patient information for clinical evaluation
export const clinicalPatients = pgTable("clinical_patients", {
  id: serial("id").primaryKey(),
  lastName: text("last_name").notNull(),
  firstName: text("first_name").notNull(),
  birthDate: text("birth_date").notNull(), // YYYY-MM-DD
  gender: text("gender"), // "M", "F", "Autre"
  referringDoctor: text("referring_doctor"),
  consultationDate: text("consultation_date").notNull(),
  consultationReason: text("consultation_reason"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Family psychiatric history
export const familyHistory = pgTable("family_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  relationship: text("relationship").notNull(), // père, mère, frère, sœur, grand-parent, oncle/tante
  condition: text("condition").notNull(), // trouble bipolaire, dépression, anxiété, addiction, etc.
  details: text("details").default(""),
  hospitalization: boolean("hospitalization").default(false),
  suicide: boolean("suicide").default(false), // tentative ou décès
  createdAt: timestamp("created_at").defaultNow(),
});

// Medical history
export const medicalHistory = pgTable("medical_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  condition: text("condition").notNull(),
  year: text("year"),
  details: text("details").default(""),
  currentTreatment: text("current_treatment").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Psychiatric history
export const psychiatricHistory = pgTable("psychiatric_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  hospitalizations: text("hospitalizations").default(""), // JSON array of hospitalizations
  suicideAttempts: text("suicide_attempts").default(""), // JSON array
  previousDiagnoses: text("previous_diagnoses").default(""),
  previousTreatments: text("previous_treatments").default(""), // Chimiogramme
  currentPsychiatrist: text("current_psychiatrist"),
  currentTherapist: text("current_therapist"),
  therapyType: text("therapy_type"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Addiction history
export const addictionHistory = pgTable("addiction_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  substanceType: text("substance_type").notNull(), // alcool, tabac, cannabis, etc.
  startAge: integer("start_age"),
  currentStatus: text("current_status"), // actif, sevré, réduit
  consumption: text("consumption"), // quantité/fréquence
  maxConsumption: text("max_consumption"),
  abstinenceDate: text("abstinence_date"),
  treatment: text("treatment"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Biography
export const biography = pgTable("biography", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  // Family origin
  birthPlace: text("birth_place"),
  siblingPosition: text("sibling_position"), // aîné, cadet, etc.
  siblingsCount: integer("siblings_count"),
  familyContext: text("family_context"),
  // Education
  educationLevel: text("education_level"),
  educationDetails: text("education_details"),
  // Professional
  currentProfession: text("current_profession"),
  professionalHistory: text("professional_history"),
  currentWorkStatus: text("current_work_status"), // actif, arrêt, invalidité, retraite
  // Personal life
  maritalStatus: text("marital_status"),
  childrenCount: integer("children_count"),
  livingArrangement: text("living_arrangement"),
  relationshipHistory: text("relationship_history"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clinical episodes (enriched mood entries for clinical evaluation)
export const clinicalEpisodes = pgTable("clinical_episodes", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  episodeType: text("episode_type").notNull(), // manie, hypomanie, dépression, mixte
  severity: text("severity"), // léger, modéré, sévère, caractérisé, fluctuation
  moodLevel: integer("mood_level"), // -5 to +5 for graph
  
  // DSM Symptoms (stored as JSON)
  symptoms: text("symptoms").default("{}"), // JSON object with symptom categories
  
  // Context and triggers
  context: text("context").default(""),
  triggers: text("triggers").default(""),
  
  // Impact
  impactProfessional: boolean("impact_professional").default(false),
  impactFamilial: boolean("impact_familial").default(false),
  impactSocial: boolean("impact_social").default(false),
  impactFinancial: boolean("impact_financial").default(false),
  impactDetails: text("impact_details").default(""),
  
  // Resolution
  resolutionSpontaneous: boolean("resolution_spontaneous").default(false),
  resolutionFamilyHelp: boolean("resolution_family_help").default(false),
  resolutionConsultation: boolean("resolution_consultation").default(false),
  resolutionHospitalization: boolean("resolution_hospitalization").default(false),
  resolutionTreatment: boolean("resolution_treatment").default(false),
  resolutionDetails: text("resolution_details").default(""),
  
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clinical conclusion
export const clinicalConclusion = pgTable("clinical_conclusion", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  diagnosticHypothesis: text("diagnostic_hypothesis"),
  differentialDiagnosis: text("differential_diagnosis"),
  recommendations: text("recommendations"),
  proposedTreatment: text("proposed_treatment"),
  followUpPlan: text("follow_up_plan"),
  additionalExams: text("additional_exams"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for clinical tables
export const insertClinicalPatientSchema = createInsertSchema(clinicalPatients).pick({
  lastName: true,
  firstName: true,
  birthDate: true,
  gender: true,
  referringDoctor: true,
  consultationDate: true,
  consultationReason: true,
  notes: true,
}).extend({
  lastName: z.string().min(1, "Le nom est requis"),
  firstName: z.string().min(1, "Le prénom est requis"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  consultationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
});

export const insertFamilyHistorySchema = createInsertSchema(familyHistory).pick({
  patientId: true,
  relationship: true,
  condition: true,
  details: true,
  hospitalization: true,
  suicide: true,
});

export const insertMedicalHistorySchema = createInsertSchema(medicalHistory).pick({
  patientId: true,
  condition: true,
  year: true,
  details: true,
  currentTreatment: true,
});

export const insertPsychiatricHistorySchema = createInsertSchema(psychiatricHistory).pick({
  patientId: true,
  hospitalizations: true,
  suicideAttempts: true,
  previousDiagnoses: true,
  previousTreatments: true,
  currentPsychiatrist: true,
  currentTherapist: true,
  therapyType: true,
  notes: true,
});

export const insertAddictionHistorySchema = createInsertSchema(addictionHistory).pick({
  patientId: true,
  substanceType: true,
  startAge: true,
  currentStatus: true,
  consumption: true,
  maxConsumption: true,
  abstinenceDate: true,
  treatment: true,
  notes: true,
});

export const insertBiographySchema = createInsertSchema(biography).pick({
  patientId: true,
  birthPlace: true,
  siblingPosition: true,
  siblingsCount: true,
  familyContext: true,
  educationLevel: true,
  educationDetails: true,
  currentProfession: true,
  professionalHistory: true,
  currentWorkStatus: true,
  maritalStatus: true,
  childrenCount: true,
  livingArrangement: true,
  relationshipHistory: true,
  notes: true,
});

export const insertClinicalEpisodeSchema = createInsertSchema(clinicalEpisodes).pick({
  patientId: true,
  startDate: true,
  endDate: true,
  episodeType: true,
  severity: true,
  moodLevel: true,
  symptoms: true,
  context: true,
  triggers: true,
  impactProfessional: true,
  impactFamilial: true,
  impactSocial: true,
  impactFinancial: true,
  impactDetails: true,
  resolutionSpontaneous: true,
  resolutionFamilyHelp: true,
  resolutionConsultation: true,
  resolutionHospitalization: true,
  resolutionTreatment: true,
  resolutionDetails: true,
  notes: true,
}).extend({
  startDate: z.string().regex(flexibleDateRegex, "Format: YYYY-MM ou YYYY-MM-DD"),
  endDate: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().regex(flexibleDateRegex, "Format: YYYY-MM ou YYYY-MM-DD").nullable()
  ).optional(),
  moodLevel: z.number().min(-5).max(5).optional(),
});

export const insertClinicalConclusionSchema = createInsertSchema(clinicalConclusion).pick({
  patientId: true,
  diagnosticHypothesis: true,
  differentialDiagnosis: true,
  recommendations: true,
  proposedTreatment: true,
  followUpPlan: true,
  additionalExams: true,
  notes: true,
});

// Types for clinical tables
export type ClinicalPatient = typeof clinicalPatients.$inferSelect;
export type InsertClinicalPatient = z.infer<typeof insertClinicalPatientSchema>;
export type FamilyHistory = typeof familyHistory.$inferSelect;
export type InsertFamilyHistory = z.infer<typeof insertFamilyHistorySchema>;
export type MedicalHistory = typeof medicalHistory.$inferSelect;
export type InsertMedicalHistory = z.infer<typeof insertMedicalHistorySchema>;
export type PsychiatricHistory = typeof psychiatricHistory.$inferSelect;
export type InsertPsychiatricHistory = z.infer<typeof insertPsychiatricHistorySchema>;
export type AddictionHistory = typeof addictionHistory.$inferSelect;
export type InsertAddictionHistory = z.infer<typeof insertAddictionHistorySchema>;
export type Biography = typeof biography.$inferSelect;
export type InsertBiography = z.infer<typeof insertBiographySchema>;
export type ClinicalEpisode = typeof clinicalEpisodes.$inferSelect;
export type InsertClinicalEpisode = z.infer<typeof insertClinicalEpisodeSchema>;
export type ClinicalConclusion = typeof clinicalConclusion.$inferSelect;
export type InsertClinicalConclusion = z.infer<typeof insertClinicalConclusionSchema>;
