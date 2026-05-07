import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { excelService } from '@/services/excel-service';
import type { MoodEntry, Medication, Substance, InstabilityPeriod } from '@shared/schema';

interface ExcelControlsProps {
  moodEntries: MoodEntry[];
  medications: Medication[];
  substances: Substance[];
  instabilityPeriods: InstabilityPeriod[];
}

export default function ExcelControls({ moodEntries, medications, substances, instabilityPeriods }: ExcelControlsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      await excelService.exportToExcel({
        moodEntries,
        medications,
        substances,
        instabilityPeriods
      });

      toast({
        title: "Export réussi !",
        description: "Le fichier Excel a été téléchargé avec succès.",
      });
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      toast({
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de l'export Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Format de fichier invalide",
        description: "Veuillez sélectionner un fichier Excel (.xlsx ou .xls).",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsImporting(true);

      // Importer les données depuis le fichier Excel
      const importedData = await excelService.importFromExcel(file);

      // Confirmer l'import avec l'utilisateur
      const confirmImport = window.confirm(
        `Le fichier contient :\n` +
        `- ${importedData.moodEntries.length} épisodes d'humeur\n` +
        `- ${importedData.instabilityPeriods.length} périodes d'instabilité\n` +
        `- ${importedData.medications.length} médicaments\n` +
        `- ${importedData.substances.length} substances\n\n` +
        `Attention : Cette action va remplacer toutes les données actuelles. Êtes-vous sûr de vouloir continuer ?`
      );

      if (!confirmImport) {
        setIsImporting(false);
        return;
      }

      // Sauvegarder les données importées
      await importData(importedData);

      toast({
        title: "Import réussi !",
        description: "Toutes les données ont été importées avec succès.",
      });

    } catch (error) {
      console.error('Erreur lors de l\'import Excel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast({
        title: "Erreur d'import",
        description: `Une erreur est survenue lors de l'import Excel: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset l'input file pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const importData = async (data: { moodEntries: MoodEntry[], medications: Medication[], substances: Substance[], instabilityPeriods: InstabilityPeriod[] }) => {
    // Effacer toutes les données actuelles
    await apiRequest('DELETE', '/api/mood-entries');
    await apiRequest('DELETE', '/api/instability-periods');
    await apiRequest('DELETE', '/api/medications');
    await apiRequest('DELETE', '/api/substances');

    // Importer les nouvelles données
    for (const entry of data.moodEntries) {
      const { id, createdAt, episodeType, ...entryData } = entry;
      await apiRequest('POST', '/api/mood-entries', entryData);
    }

    for (const period of data.instabilityPeriods) {
      const { id, createdAt, ...periodData } = period;
      await apiRequest('POST', '/api/instability-periods', periodData);
    }

    for (const medication of data.medications) {
      const { id, createdAt, ...medicationData } = medication;
      await apiRequest('POST', '/api/medications', medicationData);
    }

    for (const substance of data.substances) {
      const { id, createdAt, ...substanceData } = substance;
      await apiRequest('POST', '/api/substances', substanceData);
    }

    // Invalider tous les caches pour rafraîchir l'interface
    queryClient.invalidateQueries({ queryKey: ['/api/mood-entries'] });
    queryClient.invalidateQueries({ queryKey: ['/api/instability-periods'] });
    queryClient.invalidateQueries({ queryKey: ['/api/medications'] });
    queryClient.invalidateQueries({ queryKey: ['/api/substances'] });
  };

  return (
    <div className="flex items-center gap-3">
      {/* Bouton d'export Excel */}
      <Button 
        onClick={handleExport}
        disabled={isExporting}
        size="sm"
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:border-emerald-700"
        data-testid="button-export-excel"
      >
        <FileSpreadsheet className="h-4 w-4" />
        {isExporting ? "Export..." : "Exporter Excel"}
      </Button>

      {/* Bouton d'import Excel */}
      <Button 
        onClick={handleImportClick}
        disabled={isImporting}
        size="sm"
        variant="outline"
        className="flex items-center gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
        data-testid="button-import-excel"
      >
        <Upload className="h-4 w-4" />
        {isImporting ? "Import..." : "Importer Excel"}
      </Button>

      {/* Input file caché */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        data-testid="input-excel-file"
      />
    </div>
  );
}