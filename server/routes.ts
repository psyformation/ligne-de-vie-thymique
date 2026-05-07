import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMoodEntrySchema, insertMedicationSchema, insertMedicationLogSchema, insertSubstanceSchema, insertInstabilityPeriodSchema, insertHospitalizationSchema, insertClinicalPatientSchema, insertFamilyHistorySchema, insertMedicalHistorySchema, insertPsychiatricHistorySchema, insertAddictionHistorySchema, insertBiographySchema, insertClinicalEpisodeSchema, insertClinicalConclusionSchema, insertLifeEventSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all mood entries
  app.get("/api/mood-entries", async (req, res) => {
    try {
      const entries = await storage.getAllMoodEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des données d'humeur" });
    }
  });

  // Create new mood entry
  app.post("/api/mood-entries", async (req, res) => {
    try {
      const validatedData = insertMoodEntrySchema.parse(req.body);
      const entry = await storage.createMoodEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de l'entrée d'humeur" });
      }
    }
  });

  // Update mood entry
  app.patch("/api/mood-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const validatedData = insertMoodEntrySchema.parse(req.body);
      const updated = await storage.updateMoodEntry(id, validatedData);
      if (!updated) return res.status(404).json({ message: "Entrée non trouvée" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la mise à jour" });
      }
    }
  });

  // Delete mood entry
  app.delete("/api/mood-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[DELETE] Tentative de suppression de l'ID: ${id}`);
      
      if (isNaN(id)) {
        console.log(`[DELETE ERROR] ID invalide: ${req.params.id}`);
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const deleted = await storage.deleteMoodEntry(id);
      console.log(`[DELETE] Résultat de suppression pour ID ${id}: ${deleted}`);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Entrée d'humeur non trouvée" });
      }
    } catch (error) {
      console.error(`[DELETE ERROR] Erreur lors de la suppression:`, error);
      res.status(500).json({ message: "Erreur lors de la suppression de l'entrée d'humeur", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ── Patient mode routes (separate data store) ──
  app.get("/api/patient/mood-entries", async (req, res) => {
    try {
      const entries = await storage.getAllPatientMoodEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des données patient" });
    }
  });

  app.post("/api/patient/mood-entries", async (req, res) => {
    try {
      const validatedData = insertMoodEntrySchema.parse(req.body);
      const entry = await storage.createPatientMoodEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de l'entrée patient" });
      }
    }
  });

  app.delete("/api/patient/mood-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deletePatientMoodEntry(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Entrée patient non trouvée" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de l'entrée patient" });
    }
  });

  // ── Patient mode hospitalizations (separate store) ──
  app.get("/api/patient/hospitalizations", async (req, res) => {
    try {
      const items = await storage.getAllPatientHospitalizations();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des hospitalisations patient" });
    }
  });

  app.post("/api/patient/hospitalizations", async (req, res) => {
    try {
      const validatedData = insertHospitalizationSchema.parse(req.body);
      const item = await storage.createPatientHospitalization(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de l'hospitalisation patient" });
      }
    }
  });

  app.delete("/api/patient/hospitalizations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deletePatientHospitalization(id);
      if (deleted) res.status(204).send();
      else res.status(404).json({ message: "Hospitalisation patient non trouvée" });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // ── Patient mode instability periods (separate store) ──
  app.get("/api/patient/instability-periods", async (req, res) => {
    try {
      const items = await storage.getAllPatientInstabilityPeriods();
      res.json(items);
    } catch {
      res.status(500).json({ message: "Erreur lors de la récupération des périodes patient" });
    }
  });

  app.post("/api/patient/instability-periods", async (req, res) => {
    try {
      const validatedData = insertInstabilityPeriodSchema.parse(req.body);
      const item = await storage.createPatientInstabilityPeriod(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de la période patient" });
      }
    }
  });

  app.delete("/api/patient/instability-periods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deletePatientInstabilityPeriod(id);
      if (deleted) res.status(204).send();
      else res.status(404).json({ message: "Période patient non trouvée" });
    } catch {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // Clear all mood entries and related data (medications, substances, hospitalizations)
  app.delete("/api/mood-entries", async (req, res) => {
    try {
      await storage.clearAllMoodEntries();
      await storage.clearAllMedications();
      await storage.clearAllSubstances();
      await storage.clearAllHospitalizations();
      await storage.clearAllInstabilityPeriods();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'effacement des données" });
    }
  });

  // Medication routes
  app.get("/api/medications", async (req, res) => {
    try {
      const medications = await storage.getAllMedications();
      res.json(medications);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des médicaments" });
    }
  });

  app.post("/api/medications", async (req, res) => {
    try {
      const validatedData = insertMedicationSchema.parse(req.body);
      const medication = await storage.createMedication(validatedData);
      res.status(201).json(medication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création du médicament" });
      }
    }
  });

  app.put("/api/medications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const updates = req.body;
      const medication = await storage.updateMedication(id, updates);
      
      if (medication) {
        res.json(medication);
      } else {
        res.status(404).json({ message: "Médicament non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour du médicament" });
    }
  });

  app.delete("/api/medications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const deleted = await storage.deleteMedication(id);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Médicament non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression du médicament" });
    }
  });

  // Clear all medications
  app.delete("/api/medications", async (req, res) => {
    try {
      await storage.clearAllMedications();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'effacement des médicaments" });
    }
  });

  // Medication logs routes
  app.get("/api/medication-logs", async (req, res) => {
    try {
      const logs = await storage.getAllMedicationLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des journaux de médicaments" });
    }
  });

  app.get("/api/medication-logs/medication/:medicationId", async (req, res) => {
    try {
      const medicationId = parseInt(req.params.medicationId);
      if (isNaN(medicationId)) {
        return res.status(400).json({ message: "ID de médicament invalide" });
      }
      
      const logs = await storage.getMedicationLogsByMedicationId(medicationId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des journaux de médicaments" });
    }
  });

  app.post("/api/medication-logs", async (req, res) => {
    try {
      const validatedData = insertMedicationLogSchema.parse(req.body);
      const log = await storage.createMedicationLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création du journal de médicament" });
      }
    }
  });

  app.delete("/api/medication-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const deleted = await storage.deleteMedicationLog(id);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Journal de médicament non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression du journal de médicament" });
    }
  });

  // Substance routes
  app.get("/api/substances", async (req, res) => {
    try {
      const substances = await storage.getAllSubstances();
      res.json(substances);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des substances" });
    }
  });

  app.post("/api/substances", async (req, res) => {
    try {
      const validatedData = insertSubstanceSchema.parse(req.body);
      const substance = await storage.createSubstance(validatedData);
      res.status(201).json(substance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de la substance" });
      }
    }
  });

  app.put("/api/substances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const updates = req.body;
      const substance = await storage.updateSubstance(id, updates);
      
      if (substance) {
        res.json(substance);
      } else {
        res.status(404).json({ message: "Substance non trouvée" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour de la substance" });
    }
  });

  app.delete("/api/substances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const deleted = await storage.deleteSubstance(id);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Substance non trouvée" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de la substance" });
    }
  });

  // Clear all substances
  app.delete("/api/substances", async (req, res) => {
    try {
      await storage.clearAllSubstances();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'effacement des substances" });
    }
  });

  // Instability periods routes
  app.get("/api/instability-periods", async (req, res) => {
    try {
      const periods = await storage.getAllInstabilityPeriods();
      res.json(periods);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des périodes d'instabilité" });
    }
  });

  // Create new instability period
  app.post("/api/instability-periods", async (req, res) => {
    try {
      const validatedData = insertInstabilityPeriodSchema.parse(req.body);
      const period = await storage.createInstabilityPeriod(validatedData);
      res.status(201).json(period);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de la période d'instabilité" });
      }
    }
  });

  // Delete instability period
  app.delete("/api/instability-periods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const deleted = await storage.deleteInstabilityPeriod(id);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Période d'instabilité non trouvée" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de la période d'instabilité" });
    }
  });

  // Clear all instability periods
  app.delete("/api/instability-periods", async (req, res) => {
    try {
      await storage.clearAllInstabilityPeriods();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'effacement des périodes d'instabilité" });
    }
  });

  // Hospitalization routes
  app.get("/api/hospitalizations", async (req, res) => {
    try {
      const hospitalizations = await storage.getAllHospitalizations();
      res.json(hospitalizations);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des hospitalisations" });
    }
  });

  app.post("/api/hospitalizations", async (req, res) => {
    try {
      const validatedData = insertHospitalizationSchema.parse(req.body);
      const hospitalization = await storage.createHospitalization(validatedData);
      res.status(201).json(hospitalization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de l'hospitalisation" });
      }
    }
  });

  app.delete("/api/hospitalizations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const deleted = await storage.deleteHospitalization(id);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Hospitalisation non trouvée" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de l'hospitalisation" });
    }
  });

  app.delete("/api/hospitalizations", async (req, res) => {
    try {
      await storage.clearAllHospitalizations();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'effacement des hospitalisations" });
    }
  });

  // ========== Clinical Evaluation Routes ==========

  // Clinical Patients
  app.get("/api/clinical/patients", async (req, res) => {
    try {
      const patients = await storage.getAllClinicalPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des patients" });
    }
  });

  app.get("/api/clinical/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const patient = await storage.getClinicalPatient(id);
      if (patient) {
        res.json(patient);
      } else {
        res.status(404).json({ message: "Patient non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération du patient" });
    }
  });

  app.post("/api/clinical/patients", async (req, res) => {
    try {
      const validatedData = insertClinicalPatientSchema.parse(req.body);
      const patient = await storage.createClinicalPatient(validatedData);
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création du patient" });
      }
    }
  });

  app.put("/api/clinical/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const patient = await storage.updateClinicalPatient(id, req.body);
      if (patient) {
        res.json(patient);
      } else {
        res.status(404).json({ message: "Patient non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour du patient" });
    }
  });

  app.delete("/api/clinical/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteClinicalPatient(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Patient non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression du patient" });
    }
  });

  // Family History
  app.get("/api/clinical/patients/:patientId/family-history", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) return res.status(400).json({ message: "ID patient invalide" });
      const history = await storage.getFamilyHistoryByPatient(patientId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des antécédents familiaux" });
    }
  });

  app.post("/api/clinical/family-history", async (req, res) => {
    try {
      const validatedData = insertFamilyHistorySchema.parse(req.body);
      const history = await storage.createFamilyHistory(validatedData);
      res.status(201).json(history);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de l'antécédent familial" });
      }
    }
  });

  app.delete("/api/clinical/family-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteFamilyHistory(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Antécédent familial non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de l'antécédent familial" });
    }
  });

  // Medical History
  app.get("/api/clinical/patients/:patientId/medical-history", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) return res.status(400).json({ message: "ID patient invalide" });
      const history = await storage.getMedicalHistoryByPatient(patientId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des antécédents médicaux" });
    }
  });

  app.post("/api/clinical/medical-history", async (req, res) => {
    try {
      const validatedData = insertMedicalHistorySchema.parse(req.body);
      const history = await storage.createMedicalHistory(validatedData);
      res.status(201).json(history);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de l'antécédent médical" });
      }
    }
  });

  app.delete("/api/clinical/medical-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteMedicalHistory(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Antécédent médical non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de l'antécédent médical" });
    }
  });

  // Psychiatric History
  app.get("/api/clinical/patients/:patientId/psychiatric-history", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) return res.status(400).json({ message: "ID patient invalide" });
      const history = await storage.getPsychiatricHistoryByPatient(patientId);
      res.json(history || null);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des antécédents psychiatriques" });
    }
  });

  app.post("/api/clinical/psychiatric-history", async (req, res) => {
    try {
      const validatedData = insertPsychiatricHistorySchema.parse(req.body);
      const history = await storage.createOrUpdatePsychiatricHistory(validatedData);
      res.status(201).json(history);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création des antécédents psychiatriques" });
      }
    }
  });

  // Addiction History
  app.get("/api/clinical/patients/:patientId/addiction-history", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) return res.status(400).json({ message: "ID patient invalide" });
      const history = await storage.getAddictionHistoryByPatient(patientId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des antécédents addictologiques" });
    }
  });

  app.post("/api/clinical/addiction-history", async (req, res) => {
    try {
      const validatedData = insertAddictionHistorySchema.parse(req.body);
      const history = await storage.createAddictionHistory(validatedData);
      res.status(201).json(history);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de l'antécédent addictologique" });
      }
    }
  });

  app.delete("/api/clinical/addiction-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteAddictionHistory(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Antécédent addictologique non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de l'antécédent addictologique" });
    }
  });

  // Biography
  app.get("/api/clinical/patients/:patientId/biography", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) return res.status(400).json({ message: "ID patient invalide" });
      const bio = await storage.getBiographyByPatient(patientId);
      res.json(bio || null);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération de la biographie" });
    }
  });

  app.post("/api/clinical/biography", async (req, res) => {
    try {
      const validatedData = insertBiographySchema.parse(req.body);
      const bio = await storage.createOrUpdateBiography(validatedData);
      res.status(201).json(bio);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de la biographie" });
      }
    }
  });

  // Clinical Episodes
  app.get("/api/clinical/patients/:patientId/episodes", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) return res.status(400).json({ message: "ID patient invalide" });
      const episodes = await storage.getClinicalEpisodesByPatient(patientId);
      res.json(episodes);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des épisodes" });
    }
  });

  app.post("/api/clinical/episodes", async (req, res) => {
    try {
      const validatedData = insertClinicalEpisodeSchema.parse(req.body);
      const episode = await storage.createClinicalEpisode(validatedData);
      res.status(201).json(episode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de l'épisode" });
      }
    }
  });

  app.put("/api/clinical/episodes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const episode = await storage.updateClinicalEpisode(id, req.body);
      if (episode) {
        res.json(episode);
      } else {
        res.status(404).json({ message: "Épisode non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour de l'épisode" });
    }
  });

  app.delete("/api/clinical/episodes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteClinicalEpisode(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Épisode non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de l'épisode" });
    }
  });

  // Clinical Conclusion
  app.get("/api/clinical/patients/:patientId/conclusion", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) return res.status(400).json({ message: "ID patient invalide" });
      const conclusion = await storage.getConclusionByPatient(patientId);
      res.json(conclusion || null);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération de la conclusion" });
    }
  });

  app.post("/api/clinical/conclusion", async (req, res) => {
    try {
      const validatedData = insertClinicalConclusionSchema.parse(req.body);
      const conclusion = await storage.createOrUpdateConclusion(validatedData);
      res.status(201).json(conclusion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de la conclusion" });
      }
    }
  });

  // ── Life Events ──────────────────────────────────────────────────────────────
  app.get("/api/life-events", async (req, res) => {
    try {
      const events = await storage.getAllLifeEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des événements de vie" });
    }
  });

  app.post("/api/life-events", async (req, res) => {
    try {
      const validatedData = insertLifeEventSchema.parse(req.body);
      const event = await storage.createLifeEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Données invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur lors de la création de l'événement de vie" });
      }
    }
  });

  app.delete("/api/life-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteLifeEvent(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Événement non trouvé" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de l'événement de vie" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
