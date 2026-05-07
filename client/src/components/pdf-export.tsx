import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MoodEntry, Medication, Substance } from "@shared/schema";

interface PDFExportProps {
  moodEntries: MoodEntry[];
  medications?: Medication[];
  substances?: Substance[];
}

export default function PDFExport({ moodEntries, medications = [], substances = [] }: PDFExportProps) {
  const { toast } = useToast();

  const translateFrequency = (frequency: string): string => {
    const frequencyLabels: Record<string, string> = {
      daily: "Quotidien",
      several_weekly: "Plsr/sem",
      weekly: "Hebdo", 
      several_monthly: "Plsr/mois",
      monthly: "Mensuel",
      occasional: "Ponctuel",
      festive: "Festif",
      rare: "Rare"
    };
    return frequencyLabels[frequency] || frequency;
  };

  const calculateEpisodeStats = () => {
    if (moodEntries.length === 0) return null;
    
    let depressiveEpisodes = 0;
    let hypomanicEpisodes = 0;
    let subsyndromalFluctuations = 0;

    const seasonalStats = { spring: { total: 0, dep: 0, hypo: 0 }, summer: { total: 0, dep: 0, hypo: 0 }, autumn: { total: 0, dep: 0, hypo: 0 }, winter: { total: 0, dep: 0, hypo: 0 } };
    const episodesByYear: Map<number, number> = new Map();

    moodEntries.forEach(entry => {
      const startDate = new Date(entry.startDate);
      const intensity = Math.abs(entry.moodLevel);
      const isTrueEpisode = intensity >= 3;
      const isDepressive = entry.moodLevel < 0;
      
      if (entry.moodLevel < 0) {
        if (isTrueEpisode) depressiveEpisodes++;
        else subsyndromalFluctuations++;
      } else if (entry.moodLevel > 0) {
        if (isTrueEpisode) hypomanicEpisodes++;
        else subsyndromalFluctuations++;
      } else {
        subsyndromalFluctuations++;
      }

      if (isTrueEpisode) {
        const month = startDate.getMonth();
        let season: 'spring' | 'summer' | 'autumn' | 'winter';
        if (month >= 2 && month <= 4) season = 'spring';
        else if (month >= 5 && month <= 7) season = 'summer';
        else if (month >= 8 && month <= 10) season = 'autumn';
        else season = 'winter';
        
        seasonalStats[season].total++;
        if (isDepressive) seasonalStats[season].dep++;
        else seasonalStats[season].hypo++;

        const year = startDate.getFullYear();
        episodesByYear.set(year, (episodesByYear.get(year) || 0) + 1);
      }
    });

    const yearsWithRapidCycling: { year: number; count: number }[] = [];
    episodesByYear.forEach((count, year) => {
      if (count >= 4) yearsWithRapidCycling.push({ year, count });
    });

    const sortedEntries = [...moodEntries].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return {
      totalEpisodes: depressiveEpisodes + hypomanicEpisodes,
      depressiveEpisodes,
      hypomanicEpisodes,
      subsyndromalFluctuations,
      firstEpisode: new Date(sortedEntries[0].startDate),
      lastEpisode: new Date(sortedEntries[sortedEntries.length - 1].startDate),
      seasonalStats,
      rapidCycling: yearsWithRapidCycling
    };
  };

  const drawProfessionalTable = (
    pdf: any, 
    headers: string[], 
    data: string[][], 
    colWidths: number[], 
    startX: number, 
    startY: number, 
    headerColor: [number, number, number],
    alternateColor: [number, number, number]
  ) => {
    const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);
    let currentY = startY;

    pdf.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    pdf.roundedRect(startX, currentY - 4, tableWidth, 12, 2, 2, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    
    let currentX = startX;
    headers.forEach((header, index) => {
      pdf.text(header, currentX + 3, currentY + 4);
      currentX += colWidths[index];
    });
    
    currentY += 12;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    data.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(alternateColor[0], alternateColor[1], alternateColor[2]);
        pdf.rect(startX, currentY - 3, tableWidth, 10, 'F');
      }
      
      currentX = startX;
      row.forEach((cell, colIndex) => {
        pdf.setTextColor(0, 0, 0);
        
        if (colIndex === 0) {
          if (cell === 'Épisode dépressif') {
            pdf.setTextColor(30, 64, 175);
          } else if (cell === 'Hypomanie/Manie') {
            pdf.setTextColor(234, 88, 12);
          }
        }
        
        const maxWidth = colWidths[colIndex] - 6;
        let displayText = cell;
        while (pdf.getTextWidth(displayText) > maxWidth && displayText.length > 3) {
          displayText = displayText.substring(0, displayText.length - 4) + '...';
        }
        
        pdf.text(displayText, currentX + 3, currentY + 3);
        currentX += colWidths[colIndex];
      });
      
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.3);
      pdf.line(startX, currentY + 7, startX + tableWidth, currentY + 7);
      
      currentY += 10;
    });
    
    pdf.setDrawColor(headerColor[0], headerColor[1], headerColor[2]);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(startX, startY - 4, tableWidth, currentY - startY + 4, 2, 2, 'S');
    
    return currentY;
  };

  const exportToPDF = async () => {
    try {
      toast({
        title: "Generation PDF en cours...",
        description: "Veuillez patienter pendant la creation du rapport."
      });

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;

      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      const mainTitle = 'Ma Ligne de Vie Thymique';
      const mainTitleWidth = pdf.getTextWidth(mainTitle);
      pdf.text(mainTitle, (pageWidth - mainTitleWidth) / 2, 18);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const dateText = `Rapport genere le ${new Date().toLocaleDateString('fr-FR')}`;
      const dateWidth = pdf.getTextWidth(dateText);
      pdf.text(dateText, (pageWidth - dateWidth) / 2, 28);
      
      let currentY = 50;
      
      const stats = calculateEpisodeStats();
      
      if (stats) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 130, 246);
        pdf.text('Recapitulatif des Episodes', margin, currentY);
        
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(0.5);
        pdf.line(margin, currentY + 2, margin + 60, currentY + 2);
        currentY += 12;
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Periode de suivi: ${stats.firstEpisode.toLocaleDateString('fr-FR')} - ${stats.lastEpisode.toLocaleDateString('fr-FR')}`, margin, currentY);
        currentY += 10;
        
        const boxWidth = 42;
        const boxHeight = 28;
        const boxGap = 4;
        
        pdf.setFillColor(239, 246, 255);
        pdf.roundedRect(margin, currentY, boxWidth, boxHeight, 3, 3, 'F');
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, currentY, boxWidth, boxHeight, 3, 3, 'S');
        pdf.setFontSize(8);
        pdf.setTextColor(59, 130, 246);
        pdf.text('Episodes Depressifs', margin + 3, currentY + 8);
        pdf.setFontSize(18);
        pdf.setTextColor(30, 64, 175);
        pdf.text(stats.depressiveEpisodes.toString(), margin + 3, currentY + 20);
        
        pdf.setFillColor(255, 247, 237);
        pdf.roundedRect(margin + boxWidth + boxGap, currentY, boxWidth, boxHeight, 3, 3, 'F');
        pdf.setDrawColor(234, 88, 12);
        pdf.roundedRect(margin + boxWidth + boxGap, currentY, boxWidth, boxHeight, 3, 3, 'S');
        pdf.setFontSize(8);
        pdf.setTextColor(234, 88, 12);
        pdf.text('Hypomanie/Manie', margin + boxWidth + boxGap + 3, currentY + 8);
        pdf.setFontSize(18);
        pdf.setTextColor(194, 65, 12);
        pdf.text(stats.hypomanicEpisodes.toString(), margin + boxWidth + boxGap + 3, currentY + 20);
        
        pdf.setFillColor(254, 252, 232);
        pdf.roundedRect(margin + (boxWidth + boxGap) * 2, currentY, boxWidth, boxHeight, 3, 3, 'F');
        pdf.setDrawColor(202, 138, 4);
        pdf.roundedRect(margin + (boxWidth + boxGap) * 2, currentY, boxWidth, boxHeight, 3, 3, 'S');
        pdf.setFontSize(8);
        pdf.setTextColor(202, 138, 4);
        pdf.text('Fluctuations', margin + (boxWidth + boxGap) * 2 + 3, currentY + 8);
        pdf.setFontSize(18);
        pdf.setTextColor(161, 98, 7);
        pdf.text(stats.subsyndromalFluctuations.toString(), margin + (boxWidth + boxGap) * 2 + 3, currentY + 20);
        
        pdf.setFillColor(243, 244, 246);
        pdf.roundedRect(margin + (boxWidth + boxGap) * 3, currentY, boxWidth, boxHeight, 3, 3, 'F');
        pdf.setDrawColor(107, 114, 128);
        pdf.roundedRect(margin + (boxWidth + boxGap) * 3, currentY, boxWidth, boxHeight, 3, 3, 'S');
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text('Total Episodes', margin + (boxWidth + boxGap) * 3 + 3, currentY + 8);
        pdf.setFontSize(18);
        pdf.setTextColor(55, 65, 81);
        pdf.text(stats.totalEpisodes.toString(), margin + (boxWidth + boxGap) * 3 + 3, currentY + 20);
        
        currentY += boxHeight + 12;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 33, 168);
        pdf.text('Analyse Saisonniere', margin, currentY);
        currentY += 8;
        
        const seasonBoxWidth = 42;
        const seasonBoxHeight = 22;
        const seasons = [
          { name: 'Printemps', data: stats.seasonalStats.spring, color: [34, 197, 94] },
          { name: 'Ete', data: stats.seasonalStats.summer, color: [234, 179, 8] },
          { name: 'Automne', data: stats.seasonalStats.autumn, color: [249, 115, 22] },
          { name: 'Hiver', data: stats.seasonalStats.winter, color: [59, 130, 246] }
        ];
        
        seasons.forEach((season, index) => {
          const x = margin + index * (seasonBoxWidth + boxGap);
          pdf.setFillColor(season.color[0], season.color[1], season.color[2], 0.1);
          pdf.setFillColor(250, 250, 250);
          pdf.roundedRect(x, currentY, seasonBoxWidth, seasonBoxHeight, 2, 2, 'F');
          pdf.setDrawColor(season.color[0], season.color[1], season.color[2]);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(x, currentY, seasonBoxWidth, seasonBoxHeight, 2, 2, 'S');
          
          pdf.setFontSize(8);
          pdf.setTextColor(season.color[0], season.color[1], season.color[2]);
          pdf.text(season.name, x + 3, currentY + 7);
          
          pdf.setFontSize(14);
          pdf.setTextColor(50, 50, 50);
          pdf.text(season.data.total.toString(), x + 3, currentY + 16);
          
          if (season.data.total > 0) {
            pdf.setFontSize(6);
            pdf.setTextColor(100, 100, 100);
            const details = `${season.data.dep}D/${season.data.hypo}E`;
            pdf.text(details, x + 15, currentY + 16);
          }
        });
        
        currentY += seasonBoxHeight + 10;
        
        if (stats.rapidCycling.length > 0) {
          pdf.setFillColor(254, 242, 242);
          pdf.roundedRect(margin, currentY, pageWidth - margin * 2, 18, 2, 2, 'F');
          pdf.setDrawColor(239, 68, 68);
          pdf.roundedRect(margin, currentY, pageWidth - margin * 2, 18, 2, 2, 'S');
          
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(185, 28, 28);
          pdf.text('Cycles rapides detectes (>= 4 episodes/an)', margin + 5, currentY + 8);
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          const cycleText = stats.rapidCycling.map(r => `${r.year}: ${r.count} ep.`).join(' | ');
          pdf.text(cycleText, margin + 5, currentY + 14);
          currentY += 22;
        } else {
          pdf.setFillColor(240, 253, 244);
          pdf.roundedRect(margin, currentY, pageWidth - margin * 2, 12, 2, 2, 'F');
          pdf.setDrawColor(34, 197, 94);
          pdf.roundedRect(margin, currentY, pageWidth - margin * 2, 12, 2, 2, 'S');
          
          pdf.setFontSize(8);
          pdf.setTextColor(22, 163, 74);
          pdf.text('Pas de caracteristique de cycles rapides detectee', margin + 5, currentY + 8);
          currentY += 16;
        }
        
        currentY += 8;
      }
      
      const significantEpisodes = moodEntries.filter(entry => Math.abs(entry.moodLevel) >= 2);
      const sortedEntries = [...significantEpisodes].sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      
      const rowHeight = 10;
      const headerHeight = 12;
      const episodesTableHeight = headerHeight + (sortedEntries.length * rowHeight) + 20;
      const remainingSpace = pageHeight - currentY - 20;
      
      if (sortedEntries.length > 6 || episodesTableHeight > remainingSpace) {
        pdf.addPage([210, 297], 'portrait');
        
        pdf.setFillColor(59, 130, 246);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        const episodesTitle = 'Historique des Episodes Thymiques';
        const episodesTitleWidth = pdf.getTextWidth(episodesTitle);
        pdf.text(episodesTitle, (pageWidth - episodesTitleWidth) / 2, 16);
        
        currentY = 40;
      } else {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 130, 246);
        pdf.text('Historique des Episodes Thymiques', margin, currentY);
        pdf.setDrawColor(59, 130, 246);
        pdf.line(margin, currentY + 2, margin + 70, currentY + 2);
        currentY += 10;
      }
      
      if (sortedEntries.length > 0) {
        const headers = ['Type', 'Dates', 'Niv.', 'Facteurs', 'Notes'];
        const colWidths = [38, 42, 12, 48, 40];
        
        const maxRowsPerPage = Math.floor((pageHeight - currentY - 20) / rowHeight);
        let remainingEntries = [...sortedEntries];
        
        while (remainingEntries.length > 0) {
          const entriesToShow = remainingEntries.slice(0, maxRowsPerPage);
          remainingEntries = remainingEntries.slice(maxRowsPerPage);
          
          const tableData = entriesToShow.map(entry => {
            const intensity = Math.abs(entry.moodLevel);
            let episodeType = '';
            if (entry.moodLevel < 0) {
              episodeType = intensity >= 3 ? 'Épisode dépressif' : 'Fluct. dépressive';
            } else if (entry.moodLevel > 0) {
              episodeType = intensity >= 3 ? 'Hypomanie/Manie' : "Fluct. d'excitation";
            }
            
            return [
              episodeType,
              `${new Date(entry.startDate).toLocaleDateString('fr-FR')} - ${entry.endDate ? new Date(entry.endDate).toLocaleDateString('fr-FR') : 'En cours'}`,
              `${entry.moodLevel > 0 ? '+' : ''}${entry.moodLevel}`,
              entry.triggerEvents || '-',
              entry.notes || '-'
            ];
          });
          
          currentY = drawProfessionalTable(pdf, headers, tableData, colWidths, margin, currentY, [59, 130, 246], [248, 250, 252]);
          
          if (remainingEntries.length > 0) {
            pdf.addPage([210, 297], 'portrait');
            
            pdf.setFillColor(59, 130, 246);
            pdf.rect(0, 0, pageWidth, 25, 'F');
            
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            const contTitle = 'Historique des Episodes (suite)';
            const contTitleWidth = pdf.getTextWidth(contTitle);
            pdf.text(contTitle, (pageWidth - contTitleWidth) / 2, 16);
            
            currentY = 40;
          }
        }
      }

      pdf.addPage([297, 210], 'landscape');
      const landscapeWidth = 297;
      const landscapeHeight = 210;
      
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, landscapeWidth, 25, 'F');
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      const chartTitle = 'Graphique de la Ligne de Vie Thymique';
      const chartTitleWidth = pdf.getTextWidth(chartTitle);
      pdf.text(chartTitle, (landscapeWidth - chartTitleWidth) / 2, 16);
      
      const chartContainer = document.querySelector('[data-pdf-capture="mood-chart"]') as HTMLElement;
      const chartCanvas = chartContainer?.querySelector('canvas');
      
      if (chartCanvas) {
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const imgData = chartCanvas.toDataURL('image/png', 1.0);
          
          if (imgData !== 'data:,') {
            const maxWidth = landscapeWidth - (margin * 2);
            const maxHeight = landscapeHeight - 50;
            
            const imgAspectRatio = chartCanvas.width / chartCanvas.height;
            let finalWidth = maxWidth;
            let finalHeight = finalWidth / imgAspectRatio;
            
            if (finalHeight > maxHeight) {
              finalHeight = maxHeight;
              finalWidth = finalHeight * imgAspectRatio;
            }
            
            const xOffset = (landscapeWidth - finalWidth) / 2;
            pdf.addImage(imgData, 'PNG', xOffset, 35, finalWidth, finalHeight);
          }
        } catch (error) {
          console.error('Erreur capture graphique:', error);
          pdf.setFontSize(12);
          pdf.setTextColor(100, 100, 100);
          pdf.text('Graphique non disponible - consultez l\'application', margin, 60);
        }
      }

      if (medications.length > 0 || substances.length > 0) {
        pdf.addPage([297, 210], 'landscape');
        
        pdf.setFillColor(34, 197, 94);
        pdf.rect(0, 0, landscapeWidth, 20, 'F');
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        const timelineTitle = 'Timeline des Traitements et Substances';
        const timelineTitleWidth = pdf.getTextWidth(timelineTitle);
        pdf.text(timelineTitle, (landscapeWidth - timelineTitleWidth) / 2, 14);
        
        let chartStartTime = Date.now();
        let chartEndTime = Date.now();
        
        if (moodEntries.length > 0) {
          const sortedEntries = [...moodEntries].sort((a, b) => 
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          );
          
          chartStartTime = new Date(sortedEntries[0].startDate).getTime() - (30 * 24 * 60 * 60 * 1000);
          const lastEntry = sortedEntries[sortedEntries.length - 1];
          const lastTime = lastEntry.endDate ? new Date(lastEntry.endDate).getTime() : new Date(lastEntry.startDate).getTime();
          chartEndTime = lastTime + (30 * 24 * 60 * 60 * 1000);
        }

        const chartRange = chartEndTime - chartStartTime;
        const timelineWidth = landscapeWidth - (margin * 2);
        const timelineStartX = margin;
        
        const totalItems = medications.length + substances.length;
        const availableHeight = landscapeHeight - 55;
        const barHeight = Math.min(8, Math.max(4, availableHeight / (totalItems + 4)));
        const barSpacing = Math.min(10, Math.max(5, availableHeight / (totalItems + 2)));
        
        let currentY = 28;
        
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.line(timelineStartX, currentY, timelineStartX + timelineWidth, currentY);
        
        pdf.setFontSize(6);
        pdf.setTextColor(100, 100, 100);
        const startLabel = new Date(chartStartTime).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        const endLabel = new Date(chartEndTime).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        pdf.text(startLabel, timelineStartX, currentY + 4);
        pdf.text(endLabel, timelineStartX + timelineWidth - 18, currentY + 4);
        
        currentY += 10;
        
        if (medications.length > 0) {
          const medSectionHeight = medications.length * barSpacing + 12;
          
          pdf.setFillColor(245, 255, 250);
          pdf.roundedRect(margin - 2, currentY - 2, timelineWidth + 4, medSectionHeight, 2, 2, 'F');
          pdf.setDrawColor(34, 197, 94);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(margin - 2, currentY - 2, timelineWidth + 4, medSectionHeight, 2, 2, 'S');
          
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(22, 163, 74);
          pdf.text('Traitements', margin + 3, currentY + 5);
          currentY += 10;

          medications.forEach((medication) => {
            const startTime = new Date(medication.startDate).getTime();
            const endTime = medication.endDate ? new Date(medication.endDate).getTime() : chartEndTime;
            
            const leftPercent = Math.max(0, ((startTime - chartStartTime) / chartRange) * 100);
            const widthPercent = Math.min(100 - leftPercent, ((endTime - startTime) / chartRange) * 100);
            
            const barLeft = timelineStartX + (leftPercent / 100) * timelineWidth;
            const barWidth = Math.max((widthPercent / 100) * timelineWidth, 5);
            
            pdf.setFillColor(34, 197, 94);
            pdf.roundedRect(barLeft, currentY, barWidth, barHeight, 1, 1, 'F');
            
            pdf.setFontSize(5);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            const medText = `${medication.name} ${medication.dosage || ''}`.trim();
            if (barWidth > 25) {
              pdf.text(medText.substring(0, 20), barLeft + 2, currentY + barHeight - 2);
            } else if (barWidth > 12) {
              pdf.text(medication.name.substring(0, 6), barLeft + 1, currentY + barHeight - 2);
            }
            
            currentY += barSpacing;
          });
          
          currentY += 5;
        }
        
        if (substances.length > 0) {
          const subSectionHeight = substances.length * barSpacing + 12;
          
          pdf.setFillColor(252, 250, 255);
          pdf.roundedRect(margin - 2, currentY - 2, timelineWidth + 4, subSectionHeight, 2, 2, 'F');
          pdf.setDrawColor(147, 51, 234);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(margin - 2, currentY - 2, timelineWidth + 4, subSectionHeight, 2, 2, 'S');
          
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(126, 34, 206);
          pdf.text('Substances', margin + 3, currentY + 5);
          currentY += 10;

          const substanceColors: [number, number, number][] = [
            [147, 51, 234], [236, 72, 153], [99, 102, 241], [59, 130, 246],
            [6, 182, 212], [20, 184, 166], [16, 185, 129], [132, 204, 22]
          ];

          substances.forEach((substance, index) => {
            const startTime = new Date(substance.startPeriod + '-01').getTime();
            const endTime = substance.endPeriod ? new Date(substance.endPeriod + '-01').getTime() : chartEndTime;
            
            const leftPercent = Math.max(0, ((startTime - chartStartTime) / chartRange) * 100);
            const widthPercent = Math.min(100 - leftPercent, ((endTime - startTime) / chartRange) * 100);
            
            const barLeft = timelineStartX + (leftPercent / 100) * timelineWidth;
            const barWidth = Math.max((widthPercent / 100) * timelineWidth, 5);
            
            const color = substanceColors[index % substanceColors.length];
            pdf.setFillColor(color[0], color[1], color[2]);
            pdf.roundedRect(barLeft, currentY, barWidth, barHeight, 1, 1, 'F');
            
            pdf.setFontSize(5);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            if (barWidth > 25) {
              pdf.text(substance.name.substring(0, 15), barLeft + 2, currentY + barHeight - 2);
            } else if (barWidth > 10) {
              pdf.text(substance.name.substring(0, 5), barLeft + 1, currentY + barHeight - 2);
            }
            
            currentY += barSpacing;
          });
        }
      }

      if (medications.length > 0 || substances.length > 0) {
        pdf.addPage([210, 297], 'portrait');
        
        pdf.setFillColor(59, 130, 246);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        const detailTitle = 'Details des Traitements et Substances';
        const detailTitleWidth = pdf.getTextWidth(detailTitle);
        pdf.text(detailTitle, (pageWidth - detailTitleWidth) / 2, 16);
        
        let currentY = 40;
        
        if (medications.length > 0) {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(34, 197, 94);
          pdf.text('Traitements Medicamenteux', margin, currentY);
          currentY += 8;
          
          const medHeaders = ['Nom', 'Dosage', 'Frequence', 'Periode', 'Statut'];
          const medColWidths = [40, 25, 30, 55, 30];
          
          const medData = medications.map(med => [
            med.name,
            med.dosage || '-',
            med.frequency || '-',
            `${new Date(med.startDate).toLocaleDateString('fr-FR')} - ${med.endDate ? new Date(med.endDate).toLocaleDateString('fr-FR') : 'En cours'}`,
            med.isActive ? 'Actif' : 'Termine'
          ]);
          
          currentY = drawProfessionalTable(pdf, medHeaders, medData, medColWidths, margin, currentY, [34, 197, 94], [240, 253, 244]);
          currentY += 15;
        }
        
        if (substances.length > 0) {
          if (currentY > pageHeight - 80) {
            pdf.addPage([210, 297], 'portrait');
            currentY = 30;
          }
          
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(147, 51, 234);
          pdf.text('Consommation de Substances', margin, currentY);
          currentY += 8;
          
          const subHeaders = ['Nom', 'Frequence', 'Quantite', 'Periode', 'Statut'];
          const subColWidths = [40, 30, 30, 50, 30];
          
          const subData = substances.map(sub => [
            sub.name,
            translateFrequency(sub.frequency || '') || '-',
            sub.quantity || '-',
            `${sub.startPeriod.replace('-', '/')} - ${sub.endPeriod ? sub.endPeriod.replace('-', '/') : 'En cours'}`,
            sub.isActive ? 'Actif' : 'Termine'
          ]);
          
          currentY = drawProfessionalTable(pdf, subHeaders, subData, subColWidths, margin, currentY, [147, 51, 234], [250, 245, 255]);
        }
      }
      
      const fileName = `ligne-de-vie-thymique-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "PDF genere avec succes !",
        description: "Le rapport a ete telecharge dans vos dossiers."
      });
    } catch (error) {
      console.error('Erreur lors de la generation du PDF:', error);
      toast({
        title: "Erreur de generation PDF",
        description: "Une erreur s'est produite lors de la creation du rapport. Veuillez reessayer.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      onClick={exportToPDF}
      size="sm"
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
      data-testid="button-export-pdf"
    >
      <Download className="h-4 w-4" />
      Exporter PDF
    </Button>
  );
}