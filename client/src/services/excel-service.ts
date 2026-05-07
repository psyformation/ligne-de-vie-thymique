import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { MoodEntry, Medication, Substance, InstabilityPeriod } from '@shared/schema';

interface ExcelData {
  moodEntries: MoodEntry[];
  medications: Medication[];
  substances: Substance[];
  instabilityPeriods: InstabilityPeriod[];
}

class ExcelService {
  /**
   * Exporte toutes les données vers un fichier Excel
   */
  async exportToExcel(data: ExcelData): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    
    // Métadonnées du fichier
    workbook.creator = 'Application Suivi Thymic';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Créer les onglets
    await this.createMoodEntriesSheet(workbook, data.moodEntries);
    await this.createInstabilityPeriodsSheet(workbook, data.instabilityPeriods);
    await this.createMedicationsSheet(workbook, data.medications);
    await this.createSubstancesSheet(workbook, data.substances);
    await this.createSummarySheet(workbook, data);

    // Générer et télécharger le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `suivi-thymic-${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
  }

  /**
   * Crée l'onglet des épisodes d'humeur
   */
  private async createMoodEntriesSheet(workbook: ExcelJS.Workbook, moodEntries: MoodEntry[]): Promise<void> {
    const worksheet = workbook.addWorksheet('Épisodes d\'humeur');
    
    // En-têtes avec formatage
    const headers = [
      'ID', 'Date de début', 'Date de fin', 'Niveau d\'humeur', 
      'Type d\'épisode', 'Événement déclencheur', 'Notes'
    ];
    
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Données
    moodEntries.forEach(entry => {
      const row = worksheet.addRow([
        entry.id,
        entry.startDate,
        entry.endDate || '',
        entry.moodLevel,
        this.getEpisodeType(entry.moodLevel),
        entry.triggerEvents || '',
        entry.notes || ''
      ]);
      
      // Formatage conditionnel selon le niveau d'humeur
      const moodCell = row.getCell(4);
      if (entry.moodLevel >= 3) {
        moodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } }; // Rouge pour manie
      } else if (entry.moodLevel <= -3) {
        moodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4ECDC4' } }; // Bleu pour dépression
      } else {
        moodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB3B' } }; // Jaune pour normal
      }
    });

    // Ajuster la largeur des colonnes
    worksheet.columns = [
      { width: 8 }, { width: 15 }, { width: 15 }, { width: 18 },
      { width: 20 }, { width: 25 }, { width: 30 }
    ];

    // Ajouter des filtres
    worksheet.autoFilter = 'A1:G1';
  }

  /**
   * Crée l'onglet des périodes d'instabilité thymique
   */
  private async createInstabilityPeriodsSheet(workbook: ExcelJS.Workbook, instabilityPeriods: InstabilityPeriod[]): Promise<void> {
    const worksheet = workbook.addWorksheet('Périodes d\'instabilité');
    
    const headers = [
      'ID', 'Date de début', 'Date de fin', 'Notes'
    ];
    
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF808080' } }; // Gris pour instabilité
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    instabilityPeriods.forEach(period => {
      worksheet.addRow([
        period.id,
        period.startDate,
        period.endDate || '',
        period.notes || ''
      ]);
    });

    worksheet.columns = [
      { width: 8 }, { width: 15 }, { width: 15 }, { width: 40 }
    ];

    worksheet.autoFilter = 'A1:D1';
  }

  /**
   * Crée l'onglet des médicaments
   */
  private async createMedicationsSheet(workbook: ExcelJS.Workbook, medications: Medication[]): Promise<void> {
    const worksheet = workbook.addWorksheet('Médicaments');
    
    const headers = [
      'ID', 'Nom', 'Dosage', 'Fréquence', 'Date de début', 
      'Date de fin', 'Actif', 'Notes'
    ];
    
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    medications.forEach(medication => {
      const row = worksheet.addRow([
        medication.id,
        medication.name,
        medication.dosage || '',
        medication.frequency || '',
        medication.startDate,
        medication.endDate || '',
        medication.isActive ? 'Oui' : 'Non',
        medication.notes || ''
      ]);
      
      // Colorier différemment selon le statut actif
      const activeCell = row.getCell(7);
      if (medication.isActive) {
        activeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
      } else {
        activeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
      }
    });

    worksheet.columns = [
      { width: 8 }, { width: 20 }, { width: 12 }, { width: 15 },
      { width: 15 }, { width: 15 }, { width: 10 }, { width: 30 }
    ];

    worksheet.autoFilter = 'A1:H1';
  }

  /**
   * Crée l'onglet des substances
   */
  private async createSubstancesSheet(workbook: ExcelJS.Workbook, substances: Substance[]): Promise<void> {
    const worksheet = workbook.addWorksheet('Substances');
    
    const headers = [
      'ID', 'Nom', 'Fréquence', 'Quantité', 'Période de début', 
      'Période de fin', 'Actif', 'Notes'
    ];
    
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9966CC' } };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    substances.forEach(substance => {
      const row = worksheet.addRow([
        substance.id,
        substance.name,
        substance.frequency || '',
        substance.quantity || '',
        substance.startPeriod,
        substance.endPeriod || '',
        substance.isActive ? 'Oui' : 'Non',
        substance.notes || ''
      ]);
      
      // Colorier selon le statut actif
      const activeCell = row.getCell(7);
      if (substance.isActive) {
        activeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
      } else {
        activeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
      }
    });

    worksheet.columns = [
      { width: 8 }, { width: 20 }, { width: 15 }, { width: 12 }, 
      { width: 18 }, { width: 18 }, { width: 10 }, { width: 30 }
    ];

    worksheet.autoFilter = 'A1:H1';
  }

  /**
   * Crée l'onglet résumé avec statistiques
   */
  private async createSummarySheet(workbook: ExcelJS.Workbook, data: ExcelData): Promise<void> {
    const worksheet = workbook.addWorksheet('Résumé');
    
    // Titre principal
    const titleRow = worksheet.addRow(['RÉSUMÉ DU SUIVI THYMIC']);
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF1F4E79' } };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:C1');
    
    worksheet.addRow([]); // Ligne vide
    
    // Date d'export
    const dateRow = worksheet.addRow(['Date d\'export:', new Date().toLocaleDateString('fr-FR')]);
    dateRow.getCell(1).font = { bold: true };
    
    worksheet.addRow([]); // Ligne vide
    
    // Statistiques générales
    const statsTitle = worksheet.addRow(['STATISTIQUES GÉNÉRALES']);
    statsTitle.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
    
    const stats = [
      ['Nombre total d\'épisodes:', data.moodEntries.length],
      ['Périodes d\'instabilité:', data.instabilityPeriods.length],
      ['Nombre de médicaments:', data.medications.length],
      ['Médicaments actifs:', data.medications.filter(m => m.isActive).length],
      ['Nombre de substances:', data.substances.length],
      ['Substances actives:', data.substances.filter(s => s.isActive).length]
    ];
    
    stats.forEach(stat => {
      const row = worksheet.addRow(stat);
      row.getCell(1).font = { bold: true };
    });
    
    worksheet.addRow([]); // Ligne vide
    
    // Analyse des épisodes
    const episodesTitle = worksheet.addRow(['ANALYSE DES ÉPISODES']);
    episodesTitle.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
    
    const moodStats = this.calculateMoodStats(data.moodEntries);
    Object.entries(moodStats).forEach(([key, value]) => {
      const row = worksheet.addRow([key, value]);
      row.getCell(1).font = { bold: true };
    });

    // Ajuster les largeurs
    worksheet.columns = [
      { width: 30 }, { width: 15 }, { width: 15 }
    ];
  }

  /**
   * Importe les données depuis un fichier Excel
   */
  async importFromExcel(file: File): Promise<ExcelData> {
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    
    try {
      await workbook.xlsx.load(buffer);
    } catch (xlsxError) {
      console.log('[EXCEL] Trying alternative load method...');
      throw new Error('Format de fichier Excel non reconnu');
    }

    const data: ExcelData = {
      moodEntries: [],
      medications: [],
      substances: [],
      instabilityPeriods: []
    };

    console.log('[EXCEL] Available worksheets:', workbook.worksheets.map(ws => ws.name));

    // Lire l'onglet des épisodes d'humeur
    const moodSheet = workbook.getWorksheet('Épisodes d\'humeur');
    if (moodSheet) {
      console.log('[EXCEL] Found mood entries sheet');
      data.moodEntries = this.parseMoodEntriesSheet(moodSheet);
      console.log('[EXCEL] Parsed mood entries:', data.moodEntries.length);
    } else {
      console.log('[EXCEL] No mood entries sheet found');
    }

    // Lire l'onglet des périodes d'instabilité
    const instabilitySheet = workbook.getWorksheet('Périodes d\'instabilité');
    if (instabilitySheet) {
      data.instabilityPeriods = this.parseInstabilityPeriodsSheet(instabilitySheet);
    }

    // Lire l'onglet des médicaments
    const medicationsSheet = workbook.getWorksheet('Médicaments');
    if (medicationsSheet) {
      data.medications = this.parseMedicationsSheet(medicationsSheet);
    }

    // Lire l'onglet des substances
    const substancesSheet = workbook.getWorksheet('Substances');
    if (substancesSheet) {
      data.substances = this.parseSubstancesSheet(substancesSheet);
    }

    return data;
  }

  /**
   * Parse l'onglet des épisodes d'humeur
   */
  private parseMoodEntriesSheet(worksheet: ExcelJS.Worksheet): MoodEntry[] {
    const entries: MoodEntry[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Ignorer l'en-tête
      
      const values = row.values as any[];
      console.log(`[EXCEL] Row ${rowNumber} values:`, values);
      
      if (values && values.length > 1) {
        const startDate = this.formatDate(values[2]);
        const endDate = values[3] ? this.formatDate(values[3]) : null;
        const moodLevel = Number(values[4]) || 0;
        
        // Skip rows with invalid dates
        if (!startDate || startDate === 'Invalid Date') {
          console.log(`[EXCEL] Skipping row ${rowNumber}: invalid startDate`);
          return;
        }
        
        entries.push({
          id: values[1] || Date.now() + Math.random(),
          startDate,
          endDate: endDate === 'Invalid Date' ? null : endDate,
          moodLevel,
          episodeType: this.getEpisodeType(moodLevel),
          triggerEvents: values[6] ? String(values[6]) : '',
          notes: values[7] ? String(values[7]) : '',
          createdAt: null
        });
      }
    });
    
    return entries;
  }

  /**
   * Parse l'onglet des périodes d'instabilité
   */
  private parseInstabilityPeriodsSheet(worksheet: ExcelJS.Worksheet): InstabilityPeriod[] {
    const periods: InstabilityPeriod[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Ignorer l'en-tête
      
      const values = row.values as any[];
      if (values && values.length > 1) {
        periods.push({
          id: values[1] || Date.now() + Math.random(),
          startDate: this.formatDate(values[2]),
          endDate: values[3] ? this.formatDate(values[3]) : null,
          notes: values[4] || null,
          createdAt: null
        });
      }
    });
    
    return periods;
  }

  /**
   * Parse l'onglet des médicaments
   */
  private parseMedicationsSheet(worksheet: ExcelJS.Worksheet): Medication[] {
    const medications: Medication[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Ignorer l'en-tête
      
      const values = row.values as any[];
      if (values && values.length > 1) {
        medications.push({
          id: values[1] || Date.now() + Math.random(),
          name: values[2] || '',
          dosage: values[3] || null,
          frequency: values[4] || null,
          startDate: this.formatDate(values[5]),
          endDate: values[6] ? this.formatDate(values[6]) : null,
          isActive: values[7] === 'Oui',
          notes: values[8] || null,
          createdAt: null
        });
      }
    });
    
    return medications;
  }

  /**
   * Parse l'onglet des substances
   */
  private parseSubstancesSheet(worksheet: ExcelJS.Worksheet): Substance[] {
    const substances: Substance[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Ignorer l'en-tête
      
      const values = row.values as any[];
      if (values && values.length > 1) {
        substances.push({
          id: values[1] || Date.now() + Math.random(),
          name: values[2] || '',
          frequency: values[3] || null,
          quantity: values[4] || null,
          startPeriod: values[5] || '',
          endPeriod: values[6] || null,
          isActive: values[7] === 'Oui',
          notes: values[8] || null,
          createdAt: null
        });
      }
    });
    
    return substances;
  }

  /**
   * Utilitaires
   */
  private getEpisodeType(moodLevel: number): string {
    if (moodLevel >= 3) return 'Maniaque';
    if (moodLevel >= 1) return 'Hypomaniaque';
    if (moodLevel <= -3) return 'Dépressif majeur';
    if (moodLevel <= -1) return 'Dépressif mineur';
    return 'Stable';
  }

  private formatDate(value: any): string {
    if (!value) return '';
    
    // Handle Date objects
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return '';
      return value.toISOString().split('T')[0];
    }
    
    // Handle string dates
    const strValue = String(value).trim();
    if (!strValue) return '';
    
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
      return strValue;
    }
    
    // Handle DD/MM/YYYY format (French date format)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(strValue)) {
      const [day, month, year] = strValue.split('/');
      return `${year}-${month}-${day}`;
    }
    
    // Handle MM/DD/YYYY format (US date format)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(strValue)) {
      const parts = strValue.split('/');
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      return `${parts[2]}-${month}-${day}`;
    }
    
    // Try parsing as date
    const parsed = new Date(strValue);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    console.log('[EXCEL] Could not parse date:', value);
    return strValue;
  }

  /**
   * Export patient data (mood entries only) — compatible with praticien import
   */
  async exportPatientData(moodEntries: MoodEntry[], hospitalizations: Hospitalization[] = []): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mode Patient — Suivi Thymic';
    workbook.created = new Date();

    await this.createMoodEntriesSheet(workbook, moodEntries);

    if (hospitalizations.length > 0) {
      const ws = workbook.addWorksheet('Hospitalisations');
      const headers = ['Début', 'Fin', 'Lieu', 'Notes'];
      const headerRow = ws.addRow(headers);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
      });
      hospitalizations.forEach(h => {
        ws.addRow([h.startDate, h.endDate || '', h.location || '', h.notes || '']);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `patient-thymic-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  private calculateMoodStats(entries: MoodEntry[]) {
    const total = entries.length;
    const manic = entries.filter(e => e.moodLevel >= 3).length;
    const hypomanic = entries.filter(e => e.moodLevel >= 1 && e.moodLevel < 3).length;
    const stable = entries.filter(e => e.moodLevel > -1 && e.moodLevel < 1).length;
    const depressiveMinor = entries.filter(e => e.moodLevel <= -1 && e.moodLevel > -3).length;
    const depressiveMajor = entries.filter(e => e.moodLevel <= -3).length;
    
    return {
      'Épisodes maniaques:': manic,
      'Épisodes hypomaniaques:': hypomanic,
      'Périodes stables:': stable,
      'Épisodes dépressifs mineurs:': depressiveMinor,
      'Épisodes dépressifs majeurs:': depressiveMajor,
      'Pourcentage de stabilité:': total > 0 ? `${Math.round((stable / total) * 100)}%` : '0%'
    };
  }
}

export const excelService = new ExcelService();