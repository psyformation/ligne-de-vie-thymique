import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import annotationPlugin from "chartjs-plugin-annotation";
import "chartjs-adapter-date-fns";
import type { MoodEntry, Medication } from "@shared/schema";

Chart.register(...registerables, zoomPlugin, annotationPlugin);

interface MedicationChartProps {
  moodEntries: MoodEntry[];
  medications: Medication[];
}

export default function MedicationChart({ moodEntries, medications }: MedicationChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy existing chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    if (moodEntries.length === 0 && medications.length === 0) {
      return;
    }

    // Calculate date range
    const allDates = [
      ...moodEntries.map(entry => entry.startDate),
      ...moodEntries.map(entry => entry.endDate).filter(Boolean) as string[],
      ...medications.map(med => med.startDate),
      ...medications.map(med => med.endDate).filter(Boolean) as string[],
    ];

    if (allDates.length === 0) return;

    const minDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));
    
    // Generate data points for mood line
    const moodDataPoints: { x: string; y: number; episode?: MoodEntry }[] = [];
    
    moodEntries.forEach(entry => {
      moodDataPoints.push({
        x: entry.startDate,
        y: entry.moodLevel,
        episode: entry
      });
      
      if (entry.endDate) {
        moodDataPoints.push({
          x: entry.endDate,
          y: entry.moodLevel,
          episode: entry
        });
      }
    });

    moodDataPoints.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    // Create medication annotations (horizontal bars)
    const medicationAnnotations: any = {};
    
    // Trier les médicaments par date de début pour un affichage ordonné
    const sortedMedications = [...medications].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    
    sortedMedications.forEach((medication, index) => {
      const startX = medication.startDate;
      const endX = medication.endDate || new Date().toISOString().split('T')[0];
      const yPosition = 6 + (index * 0.8); // Stack medications above chart, mais dans l'ordre
      
      // Générer une couleur basée sur le dosage pour une meilleure différenciation
      const getDosageColor = (dosage: string | null, isActive: boolean | null) => {
        const active = isActive !== null ? isActive : true;
        if (!active) return { bg: 'rgba(156, 163, 175, 0.3)', border: 'rgb(156, 163, 175)', label: 'rgba(156, 163, 175, 0.8)' };
        
        if (!dosage) return { bg: 'rgba(34, 197, 94, 0.3)', border: 'rgb(34, 197, 94)', label: 'rgba(34, 197, 94, 0.8)' };
        
        // Extraire le nombre du dosage pour déterminer l'intensité de couleur
        const dosageNum = parseInt(dosage.replace(/\D/g, ''));
        if (dosageNum <= 10) return { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgb(34, 197, 94)', label: 'rgba(34, 197, 94, 0.7)' }; // Vert clair
        if (dosageNum <= 25) return { bg: 'rgba(34, 197, 94, 0.4)', border: 'rgb(22, 163, 74)', label: 'rgba(22, 163, 74, 0.8)' }; // Vert moyen
        if (dosageNum <= 50) return { bg: 'rgba(34, 197, 94, 0.6)', border: 'rgb(21, 128, 61)', label: 'rgba(21, 128, 61, 0.8)' }; // Vert foncé
        return { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(20, 83, 45)', label: 'rgba(20, 83, 45, 0.9)' }; // Vert très foncé
      };
      
      const colors = getDosageColor(medication.dosage, medication.isActive);
      
      // Format des dates pour l'affichage
      const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      
      // Créer un label avec le nom et le dosage clairement visible
      let labelContent = medication.name;
      
      // Retirer le dosage du nom s'il y est déjà pour éviter la duplication
      const baseName = medication.name.replace(/\s*\d+\s*(mg|g|ml|mcg|UI)?$/i, '');
      
      // Ajouter le dosage de manière visible
      if (medication.dosage) {
        let dosageDisplay = medication.dosage;
        // Ajouter mg si ce n'est pas déjà spécifié
        if (!dosageDisplay.match(/(mg|g|ml|mcg|UI)/i)) {
          dosageDisplay += 'mg';
        }
        // Créer le label avec le nom de base + dosage bien visible
        labelContent = `${baseName} - ${dosageDisplay}`;
      } else {
        labelContent = baseName;
      }
      
      
      // Créer la barre du médicament
      medicationAnnotations[`medication-${medication.id}`] = {
        type: 'box',
        xMin: startX,
        xMax: endX,
        yMin: yPosition - 0.3,
        yMax: yPosition + 0.3,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: 3,
        borderRadius: 6,
      };
      
      // Créer le label séparément pour le nom du médicament
      medicationAnnotations[`medication-label-${medication.id}`] = {
        type: 'label',
        xValue: new Date(startX).getTime() + 24 * 60 * 60 * 1000, // Légèrement décalé du début
        yValue: yPosition,
        content: baseName,
        backgroundColor: colors.label,
        color: 'white',
        font: {
          size: 11,
          weight: 'bold'
        },
        padding: 6,
        borderRadius: 3,
        position: 'left'
      };
      
      // Créer le label pour le dosage si disponible
      if (medication.dosage) {
        let dosageDisplay = medication.dosage;
        if (!dosageDisplay.match(/(mg|g|ml|mcg|UI)/i)) {
          dosageDisplay += 'mg';
        }
        
        medicationAnnotations[`medication-dosage-${medication.id}`] = {
          type: 'label',
          xValue: new Date(startX).getTime() + (new Date(endX).getTime() - new Date(startX).getTime()) / 2,
          yValue: yPosition,
          content: dosageDisplay,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          font: {
            size: 12,
            weight: 'bold'
          },
          padding: 6,
          borderRadius: 3,
          position: 'center'
        };
      }
    });

    console.log('=== MEDICATION CHART DEBUG ===');
    console.log('Number of medications:', medications.length);
    console.log('Sorted medications:', sortedMedications.map(m => ({name: m.name, dosage: m.dosage})));
    console.log('Medication annotations created:', Object.keys(medicationAnnotations));

    const data = {
      datasets: [
        {
          label: "Humeur",
          data: moodDataPoints,
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: moodDataPoints.map(point => {
            const level = Math.abs(point.y);
            if (level <= 2) return "rgb(156, 163, 175)"; // Gray for mild
            if (level === 3) return point.y > 0 ? "rgb(249, 115, 22)" : "rgb(59, 130, 246)"; // Orange/Blue for moderate
            return point.y > 0 ? "rgb(239, 68, 68)" : "rgb(37, 99, 235)"; // Red/Dark blue for severe
          }),
          pointBorderColor: "white",
          pointBorderWidth: 2,
          tension: 0.4,
          fill: false,
        }
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time" as const,
          time: {
            parser: "yyyy-MM-dd",
            displayFormats: {
              day: "dd MMM",
              week: "dd MMM", 
              month: "MMM yyyy",
              year: "yyyy",
            },
            tooltipFormat: "dd MMMM yyyy",
          },
          title: {
            display: true,
            text: "Période",
            font: { size: 14, weight: "bold" as const },
          },
          grid: {
            color: "rgba(156, 163, 175, 0.3)",
          },
        },
        y: {
          min: -6,
          max: medications.length > 0 ? 6 + (medications.length * 0.8) + 1 : 6,
          title: {
            display: true,
            text: "Niveau d'Humeur / Médicaments",
            font: { size: 14, weight: "bold" as const },
          },
          ticks: {
            stepSize: 1,
            callback: function(value: any) {
              const numValue = Number(value);
              if (numValue >= 6) return ""; // Hide ticks in medication area
              if (numValue === 5) return "+5 (Manie sévère)";
              if (numValue === 4) return "+4 (Manie)";
              if (numValue === 3) return "+3 (Hypomanie)";
              if (numValue === 2) return "+2 (Élévation légère)";
              if (numValue === 1) return "+1 (Humeur positive)";
              if (numValue === 0) return "0 (Euthymie)";
              if (numValue === -1) return "-1 (Humeur basse)";
              if (numValue === -2) return "-2 (Dépression légère)";
              if (numValue === -3) return "-3 (Dépression modérée)";
              if (numValue === -4) return "-4 (Dépression sévère)";
              if (numValue === -5) return "-5 (Dépression majeure)";
              return "";
            },
          },
          grid: {
            color: (context: any) => {
              const value = context.tick.value;
              if (value === 0) return "rgba(239, 68, 68, 0.5)"; // Red line at 0
              return "rgba(156, 163, 175, 0.2)";
            },
            lineWidth: (context: any) => {
              return context.tick.value === 0 ? 2 : 1;
            },
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: "Ligne de Vie Thymique avec Traitements",
          font: { size: 18, weight: "bold" as const },
          padding: 20,
        },
        legend: {
          display: true,
          position: "top" as const,
        },
        tooltip: {
          callbacks: {
            title: (context: any) => {
              const date = context[0]?.parsed?.x;
              if (date) {
                return new Date(date).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                });
              }
              return "";
            },
            label: (context: any) => {
              const value = context.parsed.y;
              const dataPoint = moodDataPoints[context.dataIndex];
              let label = `Humeur: ${value > 0 ? '+' : ''}${value}`;
              
              if (dataPoint?.episode) {
                label += ` (${dataPoint.episode.episodeType})`;
                if (dataPoint.episode.triggerEvents) {
                  label += `\nDéclencheur: ${dataPoint.episode.triggerEvents}`;
                }
                if (dataPoint.episode.notes) {
                  label += `\nNotes: ${dataPoint.episode.notes}`;
                }
              }
              
              return label;
            },
            afterBody: (tooltipItems: any) => {
              // Ajouter les informations détaillées des médicaments au survol
              const tooltipInfos = [];
              
              for (const tooltipItem of tooltipItems) {
                const yValue = tooltipItem.parsed.y;
                const xValue = tooltipItem.parsed.x;
                
                // Chercher le médicament correspondant à la position du survol
                for (const med of sortedMedications) {
                  const startTime = new Date(med.startDate).getTime();
                  const endTime = med.endDate ? new Date(med.endDate).getTime() : new Date().getTime();
                  const medYPosition = 6 + (sortedMedications.indexOf(med) * 0.8);
                  
                  // Vérifier si le survol est dans la zone de ce médicament
                  if (xValue >= startTime && xValue <= endTime && 
                      Math.abs(yValue - medYPosition) <= 0.4) {
                    
                    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('fr-FR', { 
                      day: '2-digit', month: 'short', year: 'numeric' 
                    });
                    
                    let info = `\n--- ${med.name} ---`;
                    if (med.dosage) {
                      let dosageDisplay = med.dosage;
                      if (!dosageDisplay.match(/(mg|g|ml|mcg|UI)/i)) {
                        dosageDisplay += 'mg';
                      }
                      info += `\n💊 Dosage: ${dosageDisplay}`;
                    }
                    if (med.frequency) info += `\n📅 Fréquence: ${med.frequency}`;
                    info += `\n📍 Du ${formatDate(med.startDate)} au ${med.endDate ? formatDate(med.endDate) : 'en cours'}`;
                    info += `\n⚕️ ${med.isActive ? 'Traitement actif' : 'Traitement arrêté'}`;
                    if (med.notes) info += `\n📝 Notes: ${med.notes}`;
                    
                    tooltipInfos.push(info);
                    break; // Sortir après avoir trouvé le bon médicament
                  }
                }
              }
              
              return tooltipInfos;
            }
          },
          mode: "nearest" as const,
          intersect: false
        },
        annotation: {
          annotations: medicationAnnotations,
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "x" as const,
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "x" as const,
          },
        },
      },
      interaction: {
        mode: "nearest" as const,
        axis: "x" as const,
        intersect: false,
      },
    };

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: data as any,
      options: options as any,
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [moodEntries, medications]);

  const resetZoom = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.resetZoom();
    }
  };

  if (moodEntries.length === 0 && medications.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Aucune donnée à afficher</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-2 h-8 bg-blue-500 rounded-full mr-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Corrélation Humeur-Médicaments</h2>
        </div>
        <button
          onClick={resetZoom}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Réinitialiser le zoom
        </button>
      </div>
      
      <div className="h-[500px] relative">
        <canvas ref={chartRef} />
      </div>
      
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>• Les barres colorées en haut représentent les périodes de traitement médicamenteux</p>
        <p>• Vert: médicament actif | Gris: médicament arrêté</p>
        <p>• Utilisez la molette de la souris pour zoomer, cliquez-glissez pour naviguer</p>
      </div>
    </div>
  );
}