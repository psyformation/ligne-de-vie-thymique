import { useEffect, useRef, useState, useMemo } from "react";
import { Chart, registerables } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import annotationPlugin from "chartjs-plugin-annotation";
import "chartjs-adapter-date-fns";
import type { MoodEntry, Medication, Substance, InstabilityPeriod, Hospitalization, LifeEvent } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

// Custom plugin to draw only episode start/end dates on X-axis
const episodeDateLabelsPlugin = {
  id: 'episodeDateLabels',
  afterDraw: (chart: any, args: any, options: any) => {
    const { ctx, scales, chartArea } = chart;
    const xScale = scales.x;
    
    if (!xScale || !options.importantDates || options.importantDates.length === 0) return;
    
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
    
    // Get visible range
    const visibleMin = xScale.min;
    const visibleMax = xScale.max;
    const visibleRangeMonths = (visibleMax - visibleMin) / (1000 * 60 * 60 * 24 * 30);
    
    // Filter dates within visible range and sort them
    const visibleDates = options.importantDates
      .map((dateStr: string) => ({
        dateStr,
        timestamp: new Date(dateStr).getTime()
      }))
      .filter((d: any) => d.timestamp >= visibleMin && d.timestamp <= visibleMax)
      .sort((a: any, b: any) => a.timestamp - b.timestamp);
    
    if (visibleDates.length === 0) return;
    
    // Calculate minimum pixel distance between labels to avoid overlap
    const minPixelDistance = 60;
    const labelsToShow: any[] = [];
    
    visibleDates.forEach((dateInfo: any, index: number) => {
      const pixelX = xScale.getPixelForValue(dateInfo.timestamp);
      
      // Check if this label would overlap with the last added label
      if (labelsToShow.length === 0) {
        labelsToShow.push({ ...dateInfo, pixelX });
      } else {
        const lastLabel = labelsToShow[labelsToShow.length - 1];
        if (pixelX - lastLabel.pixelX >= minPixelDistance) {
          labelsToShow.push({ ...dateInfo, pixelX });
        }
      }
    });
    
    // Draw labels
    ctx.save();
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    labelsToShow.forEach((labelInfo: any) => {
      const date = new Date(labelInfo.dateStr);
      const year = date.getFullYear();
      const month = months[date.getMonth()];
      const day = date.getDate();
      
      // Format based on zoom level
      let label: string;
      if (visibleRangeMonths < 6) {
        label = `${day} ${month} ${year}`;
      } else {
        label = `${month} ${year}`;
      }
      
      const y = chartArea.bottom + 8;
      ctx.fillText(label, labelInfo.pixelX, y);
    });
    
    ctx.restore();
  }
};

Chart.register(...registerables, zoomPlugin, annotationPlugin, episodeDateLabelsPlugin);

interface MoodChartProps {
  moodEntries: MoodEntry[];
  medications?: Medication[];
  substances?: Substance[];
  hospitalizations?: Hospitalization[];
  instabilityPeriods?: InstabilityPeriod[];
  lifeEvents?: LifeEvent[];
  isLoading: boolean;
  defaultEpisodeDurationMonths?: number;
  onEpisodeRightClick?: (entry: MoodEntry, x: number, y: number) => void;
  fullWidth?: boolean;
}

export default function MoodChart({ moodEntries, medications = [], substances = [], hospitalizations = [], instabilityPeriods: instabilityPeriodsProp, lifeEvents = [], isLoading, defaultEpisodeDurationMonths, onEpisodeRightClick, fullWidth = false }: MoodChartProps) {

  function getEntryEndDate(entry: MoodEntry): Date {
    if (entry.endDate) return new Date(entry.endDate);
    if (defaultEpisodeDurationMonths) {
      const d = new Date(entry.startDate);
      d.setMonth(d.getMonth() + defaultEpisodeDurationMonths);
      return d;
    }
    return new Date();
  }
  // Fetch instability periods only when no prop is passed
  const { data: instabilityPeriodsFromApi = [] } = useQuery<InstabilityPeriod[]>({
    queryKey: ["/api/instability-periods"],
    enabled: instabilityPeriodsProp === undefined,
  });
  const instabilityPeriods = instabilityPeriodsProp ?? instabilityPeriodsFromApi;
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const sortedEntriesRef = useRef<MoodEntry[]>([]);
  const timelineDataRef = useRef<{ episodeId?: number; isInstability?: boolean; isMixed?: boolean }[]>([]);
  const [zoomState, setZoomState] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [showMedicationsTimeline, setShowMedicationsTimeline] = useState(true);
  const [showSubstancesTimeline, setShowSubstancesTimeline] = useState(true);
  const [showMedicationsOverlay, setShowMedicationsOverlay] = useState(false);
  const [showSubstancesOverlay, setShowSubstancesOverlay] = useState(false);
  const [showHospitalizationsOverlay, setShowHospitalizationsOverlay] = useState(true);
  const [medTooltip, setMedTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    name: string;
    dosage: string;
    startDate: string;
    endDate: string | null;
    frequency: string;
    notes: string;
  } | null>(null);

  // Helper function to normalize base names for grouping (moved before useMemo)
  const normalizeBaseName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\s*(\d+(\s)?(mg|mcg|g|ml|%))|(\d+|x|xr|lp|er)\b.*$/g, '') // Remove dosage/unit patterns
      .trim();
  };

  // Memoize grouped medications to avoid recalculation on every render
  const groupedMedications = useMemo(() => {
    const groups = medications.reduce((groups: any, medication) => {
      const baseName = normalizeBaseName(medication.name);
      
      if (!groups[baseName]) {
        groups[baseName] = [];
      }
      groups[baseName].push(medication);
      return groups;
    }, {});

    // Sort each group by start date
    Object.keys(groups).forEach(baseName => {
      groups[baseName].sort((a: any, b: any) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    });

    return groups;
  }, [medications]);

  // Memoize grouped substances to avoid recalculation on every render
  const groupedSubstances = useMemo(() => {
    const groups = substances.reduce((groups: any, substance) => {
      const baseName = normalizeBaseName(substance.name);
      
      if (!groups[baseName]) {
        groups[baseName] = [];
      }
      groups[baseName].push(substance);
      return groups;
    }, {});

    // Sort each group by start period
    Object.keys(groups).forEach(baseName => {
      groups[baseName].sort((a: any, b: any) => 
        new Date(a.startPeriod + '-01').getTime() - new Date(b.startPeriod + '-01').getTime()
      );
    });

    return groups;
  }, [substances]);

  // Color palette for substances - each substance gets a unique color
  const substanceColors = [
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-blue-500', 
    'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-lime-500',
    'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-rose-500'
  ];

  // Color mapping for medication categories
  const medicationCategoryColors: Record<string, string> = {
    'stabilisateur': 'bg-blue-500',
    'antidépresseur': 'bg-green-500',
    'antipsychotique': 'bg-purple-500',
    'anxiolytique': 'bg-yellow-500',
    'thymorégulateur': 'bg-indigo-500',
    'autre': 'bg-gray-500'
  };
  
  // Fallback colors for uncategorized medications
  const medicationColors = [
    'bg-green-500', 'bg-emerald-600', 'bg-teal-600', 'bg-cyan-600',
    'bg-sky-500', 'bg-blue-600', 'bg-indigo-600', 'bg-violet-500',
    'bg-purple-600', 'bg-fuchsia-500', 'bg-pink-600', 'bg-rose-600'
  ];

  // Frequency labels for medications and substances
  const medicationFrequencyLabels: Record<string, string> = {
    daily: "Quotidien",
    twice_daily: "2x/jour",
    three_times_daily: "3x/jour",
    weekly: "Hebdomadaire",
    monthly: "Mensuel",
    as_needed: "Si besoin"
  };

  const substanceFrequencyLabels: Record<string, string> = {
    daily: "Quotidien",
    several_weekly: "Plsr/sem",
    several_weeks: "Plsr sem",
    weekly: "Hebdo", 
    several_monthly: "Plsr/mois",
    monthly: "Mensuel",
    occasional: "Ponctuel",
    festive: "Festif",
    rare: "Rare"
  };
  
  // Helper function to determine if a substance consumption is prolonged or occasional
  const isProlongedConsumption = (frequency: string, startPeriod: string, endPeriod: string | null) => {
    const duration = endPeriod 
      ? (new Date(endPeriod + '-01').getTime() - new Date(startPeriod + '-01').getTime()) / (1000 * 60 * 60 * 24 * 30)
      : ((new Date().getTime() - new Date(startPeriod + '-01').getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    return frequency === 'daily' || frequency === 'weekly' || frequency === 'several_weekly' || duration > 3;
  };
  
  // Helper function to get intensity based on frequency and quantity
  const getSubstanceIntensity = (frequency: string, quantity: string | null) => {
    let baseIntensity = 1;
    
    // Base intensity from frequency
    switch (frequency) {
      case 'daily': baseIntensity = 3; break;
      case 'several_weekly': case 'weekly': baseIntensity = 2; break;
      case 'several_monthly': case 'monthly': baseIntensity = 1.5; break;
      case 'occasional': case 'festive': case 'rare': baseIntensity = 1; break;
      default: baseIntensity = 1;
    }
    
    // Adjust based on quantity if available
    if (quantity) {
      const lowerQuantity = quantity.toLowerCase();
      if (lowerQuantity.includes('beaucoup') || lowerQuantity.includes('importante') || lowerQuantity.includes('25')) {
        baseIntensity *= 1.5;
      } else if (lowerQuantity.includes('peu') || lowerQuantity.includes('légère') || lowerQuantity.includes('3')) {
        baseIntensity *= 0.7;
      }
    }
    
    return Math.min(baseIntensity, 3);
  };

  // Helper function to calculate synchronized timeline positions
  const calculateTimelinePosition = (startTime: number, endTime: number, chartStartTime: number, chartEndTime: number) => {
    // Skip items completely outside the viewport to avoid negative widths
    if (endTime <= chartStartTime || startTime >= chartEndTime) {
      return { left: 0, width: 0 };
    }
    
    const chartRange = chartEndTime - chartStartTime;
    const leftPercent = ((startTime - chartStartTime) / chartRange) * 100;
    const widthPercent = ((endTime - startTime) / chartRange) * 100;
    
    return {
      left: Math.max(0, leftPercent),
      width: Math.max(0, Math.min(100 - Math.max(0, leftPercent), widthPercent))
    };
  };


  useEffect(() => {
    if (!chartRef.current || isLoading) return;

    // Destroy existing chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    if (moodEntries.length === 0) {
      return;
    }

    // Sort entries by start date
    const sortedEntries = [...moodEntries].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    sortedEntriesRef.current = sortedEntries;

    // Mixed episode: both poles (excitation + depressive) SIMULTANEOUSLY over the same period.
    // Each point stores both mixedUpperValue (+) and mixedLowerValue (-).
    // Bell curve: 0 at start, peak at midpoint, 0 at end — applied symmetrically to both poles.
    const generateMixedCurve = (startDate: Date, endDate: Date, excLvl: number, depLvl: number): any[] => {
      const points: any[] = [];
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.max(2, durationMs / (24 * 60 * 60 * 1000));
      const step = Math.max(1, Math.ceil(durationDays / 60));
      for (let day = 0; day <= durationDays; day += step) {
        const t = day / durationDays;
        const bell = Math.sin(t * Math.PI); // 0 → 1 at midpoint → 0
        const d = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
        points.push({
          date: d.toISOString().split('T')[0],
          value: bell * excLvl,          // used as chart value (upper)
          mixedUpperValue: bell * excLvl,
          mixedLowerValue: -bell * depLvl,
          color: '#7c3aed',
          isEuthymia: false,
          isInstability: false,
          isMixed: true,
        });
      }
      return points;
    };

    // Deterministic pseudo-random in [0,1] — consistent across renders for the same seed
    const pseudoRandom = (seed: number): number => {
      const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    // Generate gap-marker points for instability periods (isInstability flag used by main line to leave gaps)
    const generateZigzagData = (startDate: Date, endDate: Date): { date: string; value: number; color: string; isEuthymia: boolean; isInstability: boolean }[] => {
      const markers: { date: string; value: number; color: string; isEuthymia: boolean; isInstability: boolean }[] = [];
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.max(2, durationMs / (24 * 60 * 60 * 1000));
      // One marker every 5 days — enough to prevent main line from crossing the period
      const step = 5;
      for (let day = 0; day <= durationDays; day += step) {
        const d = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
        markers.push({
          date: d.toISOString().split('T')[0],
          value: 0,
          color: "#9ca3af",
          isEuthymia: false,
          isInstability: true
        });
      }
      return markers;
    };

    // Generate dense random-looking vertical bars — 1 bar per day, condensed like a seismograph
    const generateNoiseBars = (startDate: Date, endDate: Date, periodId: number): { x: string; y: number }[] => {
      const bars: { x: string; y: number }[] = [];
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.max(1, durationMs / (24 * 60 * 60 * 1000));
      for (let day = 0; day <= durationDays; day += 1) {
        const d = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
        const seed = periodId * 10000 + day;
        const r1 = pseudoRandom(seed);
        const r2 = pseudoRandom(seed + 500);
        // Height: 0.3–3.0, varied to mimic irregular spikes
        const height = 0.3 + r1 * 2.7;
        // Sign: ~55% positive, ~45% negative
        const sign = r2 > 0.45 ? 1 : -1;
        bars.push({ x: d.toISOString().split('T')[0], y: sign * height });
      }
      return bars;
    };

    // Generate realistic episode curves with progressive rise, peak, and descent
    const timelineData: { date: string; value: number; color: string; isEuthymia: boolean; episodeId?: number; isInstability?: boolean }[] = [];
    
    if (sortedEntries.length > 0) {
      // Determine overall date range
      const firstDate = new Date(sortedEntries[0].startDate);
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      const lastDate = getEntryEndDate(lastEntry);
      
      // Start with euthymia buffer
      const startBuffer = new Date(firstDate);
      startBuffer.setDate(startBuffer.getDate() - 7);
      timelineData.push({
        date: startBuffer.toISOString().split('T')[0],
        value: 0,
        color: "#6b7280",
        isEuthymia: true
      });
      
      // Process each episode with realistic curve generation
      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const entryStart = new Date(entry.startDate);
        const entryEnd = getEntryEndDate(entry);
        
        // Fill gap with euthymia if needed
        if (i > 0) {
          const prevEntry = sortedEntries[i - 1];
          const prevEnd = getEntryEndDate(prevEntry);
          
          if ((entryStart.getTime() - prevEnd.getTime()) > 24 * 60 * 60 * 1000) {
            const gapStart = new Date(prevEnd);
            gapStart.setDate(gapStart.getDate() + 1);
            const gapEnd = new Date(entryStart);
            gapEnd.setDate(gapEnd.getDate() - 1);
            
            timelineData.push({
              date: gapStart.toISOString().split('T')[0],
              value: 0,
              color: "#6b7280",
              isEuthymia: true
            });
            timelineData.push({
              date: gapEnd.toISOString().split('T')[0],
              value: 0,
              color: "#6b7280",
              isEuthymia: true
            });
          }
        }
        
        // ── Mixed episode: sinusoidal diamond curve (upper lobe + lower lobe) ──
        if (entry.episodeType === 'Mixte') {
          const excLvl = (entry as any).mixedExcitationLevel ?? 3;
          const depLvl = (entry as any).mixedDepressiveLevel ?? 3;
          const mixedPoints = generateMixedCurve(entryStart, entryEnd, excLvl, depLvl);
          timelineData.push(...mixedPoints);
          continue;
        }

        // Generate episode curve points
        const episodeDuration = (entryEnd.getTime() - entryStart.getTime()) / (24 * 60 * 60 * 1000);
        const peakIntensity = entry.moodLevel;
        
        // Determine episode color based on intensity
        let episodeColor = "#6b7280"; // Gray for euthymia
        
        if (peakIntensity > 0) {
          // Orange/red gradient for excitement/mania - intensity based
          if (Math.abs(peakIntensity) >= 3) {
            episodeColor = "#ea580c"; // Dark orange/red for intense episodes (3+)
          } else {
            episodeColor = "#fef3c7"; // Jaune pâle pour fluctuations positives (1-2)
          }
        } else if (peakIntensity < 0) {
          // Blue gradient for depression - intensity based
          if (Math.abs(peakIntensity) >= 3) {
            episodeColor = "#2563eb"; // Dark blue for intense episodes (3+)
          } else {
            episodeColor = "#fef3c7"; // Jaune pâle pour fluctuations négatives (1-2)
          }
        }
        
        if (episodeDuration <= 1) {
          // Short episode - single point
          timelineData.push({
            date: entry.startDate,
            value: peakIntensity,
            color: episodeColor,
            isEuthymia: false,
            episodeId: i
          });
        } else {
          // Multi-day episode with curve
          const totalDays = Math.max(1, Math.floor(episodeDuration));
          
          // Calculate key phases
          const risePhase = Math.ceil(totalDays * 0.3); // 30% for rise
          const peakPhase = Math.max(1, Math.ceil(totalDays * 0.2)); // 20% for peak
          const descentPhase = totalDays - risePhase - peakPhase; // Rest for descent
          
          let currentDay = 0;
          
          // Rise phase - progressive increase to peak
          for (let day = 0; day <= risePhase; day++) {
            const progress = day / risePhase;
            const currentDate = new Date(entryStart);
            currentDate.setDate(currentDate.getDate() + day);
            
            // Smooth curve rise (quadratic easing)
            const intensity = peakIntensity * (progress * progress);
            
            timelineData.push({
              date: currentDate.toISOString().split('T')[0],
              value: intensity,
              color: episodeColor,
              isEuthymia: false,
              episodeId: i
            });
            currentDay = day + 1;
          }
          
          // Peak phase - maintain intensity
          for (let day = 0; day < peakPhase; day++) {
            const currentDate = new Date(entryStart);
            currentDate.setDate(currentDate.getDate() + currentDay + day);
            
            // Slight variation around peak
            const variation = Math.sin(day * 0.5) * 0.1;
            const intensity = peakIntensity * (1 + variation);
            
            timelineData.push({
              date: currentDate.toISOString().split('T')[0],
              value: intensity,
              color: episodeColor,
              isEuthymia: false,
              episodeId: i
            });
          }
          currentDay += peakPhase;
          
          // Descent phase - return to euthymia
          for (let day = 0; day <= descentPhase; day++) {
            const progress = day / Math.max(1, descentPhase);
            const currentDate = new Date(entryStart);
            currentDate.setDate(currentDate.getDate() + currentDay + day);
            
            // Smooth descent (can be rapid or gradual based on episode length)
            const descentCurve = Math.pow(1 - progress, 1.5); // Slightly accelerated descent
            const intensity = peakIntensity * descentCurve;
            
            timelineData.push({
              date: currentDate.toISOString().split('T')[0],
              value: intensity,
              color: episodeColor,
              isEuthymia: false,
              episodeId: i
            });
          }
        }
      }
      
      // End buffer with euthymia - extend to today minimum
      const endBuffer = new Date(lastDate);
      const today = new Date();
      
      // Use the later of: last episode + 7 days, or today
      const finalEndDate = endBuffer.getTime() < today.getTime() ? today : endBuffer;
      finalEndDate.setDate(finalEndDate.getDate() + 7);
      
      timelineData.push({
        date: finalEndDate.toISOString().split('T')[0],
        value: 0,
        color: "#6b7280",
        isEuthymia: true
      });
      
      // Add instability periods as zigzag data
      if (instabilityPeriods && instabilityPeriods.length > 0) {
        instabilityPeriods.forEach(period => {
          const instabilityStart = new Date(period.startDate);
          const instabilityEnd = period.endDate ? new Date(period.endDate) : new Date();
          
          // Generate zigzag data for this instability period
          const zigzagData = generateZigzagData(instabilityStart, instabilityEnd);
          
          // Add zigzag points to timeline data
          timelineData.push(...zigzagData);
        });
        
        // Sort timeline data by date to ensure proper chronological order
        timelineData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
    }

    timelineDataRef.current = timelineData;

    const chartLabels = timelineData.map(point => point.date);
    const chartData = timelineData.map(point => point.value);

    // Collect all important dates (start and end of episodes, fluctuations, instability periods)
    const importantDates: Set<string> = new Set();
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
    
    // Add episode start and end dates
    moodEntries.forEach(entry => {
      importantDates.add(entry.startDate);
      if (entry.endDate) {
        importantDates.add(entry.endDate);
      }
    });
    
    // Add instability period start and end dates
    if (instabilityPeriods && instabilityPeriods.length > 0) {
      instabilityPeriods.forEach(period => {
        importantDates.add(period.startDate);
        if (period.endDate) {
          importantDates.add(period.endDate);
        }
      });
    }

    // Check if all episodes are in the same year to adjust time format
    const allDates = timelineData.map(point => new Date(point.date));
    const years = Array.from(new Set(allDates.map(date => date.getFullYear())));
    const sameYear = years.length === 1;
    const multipleYears = years.length > 1;
    
    const timeUnit = sameYear ? "day" : "month";
    
    // Create custom callback - ONLY show dates for episode/fluctuation/instability start and end
    const formatDateCallback = (value: any, index: number, values: any[]) => {
      const date = new Date(value);
      const year = date.getFullYear();
      const month = months[date.getMonth()];
      const day = date.getDate();
      const dateTime = date.getTime();
      
      // Check if this tick is near an important date (start or end of episode/instability)
      const importantDatesArray = Array.from(importantDates);
      let isImportant = false;
      
      for (let i = 0; i < importantDatesArray.length; i++) {
        const importantDate = new Date(importantDatesArray[i]);
        const diff = Math.abs(dateTime - importantDate.getTime());
        const daysDiff = diff / (1000 * 60 * 60 * 24);
        
        // Match if within 5 days of an important date
        if (daysDiff <= 5) {
          isImportant = true;
          break;
        }
      }
      
      // Only show label for important dates
      if (!isImportant) {
        return ''; // Hide non-important dates
      }
      
      // Calculate visible range to determine zoom level
      let visibleRangeMonths = 12;
      if (values && values.length >= 2) {
        const firstValue = values[0]?.value || values[0];
        const lastValue = values[values.length - 1]?.value || values[values.length - 1];
        const firstDate = new Date(firstValue);
        const lastDate = new Date(lastValue);
        const rangeMs = lastDate.getTime() - firstDate.getTime();
        visibleRangeMonths = rangeMs / (1000 * 60 * 60 * 24 * 30);
      }
      
      // Format based on zoom level
      if (visibleRangeMonths < 4) {
        // Zoomed in: show day + month + year
        return `${day} ${month} ${year}`;
      } else {
        // Normal view: show month + year only
        return `${month} ${year}`;
      }
    };
    const chartColors = timelineData.map(point => point.color);

    // Create separate datasets based on episode classification (entire episode gets one color)
    const orangeEpisodeData = chartData.map((value, index) => {
      const point = timelineData[index];
      if (point && point.episodeId !== undefined) {
        const entry = moodEntries[point.episodeId];
        if (entry && Math.abs(entry.moodLevel) >= 3 && entry.moodLevel > 0) {
          return value;
        }
      }
      return null;
    });
    
    const blueEpisodeData = chartData.map((value, index) => {
      const point = timelineData[index];
      if (point && point.episodeId !== undefined) {
        const entry = moodEntries[point.episodeId];
        if (entry && Math.abs(entry.moodLevel) >= 3 && entry.moodLevel < 0) {
          return value;
        }
      }
      return null;
    });
    
    const yellowEpisodeData = chartData.map((value, index) => {
      const point = timelineData[index];
      if (point && point.episodeId !== undefined) {
        const entry = moodEntries[point.episodeId];
        if (entry && Math.abs(entry.moodLevel) <= 2) {
          return value;
        }
      }
      return null;
    });
    
    // Noise bars for instability periods — separate {x,y} dataset, not derived from timelineData
    const instabilityBarData: { x: string; y: number }[] = [];
    if (instabilityPeriods && instabilityPeriods.length > 0) {
      instabilityPeriods.forEach(period => {
        const start = new Date(period.startDate);
        const end = period.endDate ? new Date(period.endDate) : new Date();
        instabilityBarData.push(...generateNoiseBars(start, end, period.id));
      });
    }

    // Two simultaneous violet curves for mixed episodes: upper (excitation) and lower (depressive)
    // Both cover the same period — at every moment the upper and lower lobes are both visible.
    const mixedUpperData = chartData.map((_value, index) => {
      const point = timelineData[index] as any;
      return (point && point.isMixed) ? point.mixedUpperValue : null;
    });
    const mixedLowerData = chartData.map((_value, index) => {
      const point = timelineData[index] as any;
      return (point && point.isMixed) ? point.mixedLowerValue : null;
    });
    
    const datasets = [
      // Épisodes d'excitation (orange) - intensité ≥3
      {
        label: "Épisodes d'excitation",
        data: orangeEpisodeData,
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.3)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.4,
        fill: 'origin', // Fill to zero line
        spanGaps: false,
      },
      // Épisodes dépressifs (bleu) - intensité ≤-3
      {
        label: "Épisodes dépressifs", 
        data: blueEpisodeData,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.3)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.4,
        fill: 'origin', // Fill to zero line
        spanGaps: false,
      },
      // Fluctuations thymiques (jaune) - intensité -2 à +2
      {
        label: "Fluctuations thymiques",
        data: yellowEpisodeData,
        borderColor: "#fbbf24",
        backgroundColor: "rgba(254, 243, 199, 0.6)", // Jaune pâle
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.4,
        fill: 'origin', // Fill to zero line
        spanGaps: false,
      },
      // Périodes d'instabilité thymique — barres grises pseudo-aléatoires (séismographe)
      {
        type: 'bar' as const,
        label: "Instabilité thymique",
        data: instabilityBarData,
        backgroundColor: 'rgba(148, 163, 184, 0.80)',
        borderColor: 'rgba(100, 116, 139, 0.85)',
        borderWidth: 0.5,
        barThickness: 1,
        borderRadius: 0,
        order: 10,
      } as any,
      // Épisode mixte — pôle excitation (cloche violette vers le haut, simultanée avec le bas)
      {
        label: "Épisode mixte ☯",
        data: mixedUpperData,
        borderColor: "#7c3aed",
        backgroundColor: "rgba(124, 58, 237, 0.45)",
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.4,
        fill: 'origin',
        spanGaps: false,
        segment: {
          borderColor: (ctx: any) => (ctx.p0.parsed.y === null || ctx.p1.parsed.y === null) ? 'transparent' : '#7c3aed',
        },
      },
      // Épisode mixte — pôle dépressif (cloche violette vers le bas, simultanée avec le haut)
      {
        label: "_mixedLower",  // underscore = hidden from legend
        data: mixedLowerData,
        borderColor: "#7c3aed",
        backgroundColor: "rgba(124, 58, 237, 0.45)",
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.4,
        fill: 'origin',
        spanGaps: false,
        segment: {
          borderColor: (ctx: any) => (ctx.p0.parsed.y === null || ctx.p1.parsed.y === null) ? 'transparent' : '#7c3aed',
        },
      },
      // Ligne de référence (euthymie)
      {
        label: "Ligne de référence",
        data: chartData.map(() => 0),
        borderColor: "#9ca3af",
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [5, 5],
        fill: false,
        tension: 0,
      },
      // Ligne principale de la courbe thymique (exclut les points d'instabilité et mixtes)
      {
        label: "Ligne de vie thymique",
        data: chartData.map((value, index) => {
          const point = timelineData[index] as any;
          // Exclure les points d'instabilité et mixtes du tracé principal
          if (point && (point.isInstability || point.isMixed)) {
            return null;
          }
          return value;
        }),
        borderColor: "#1f2937",
        backgroundColor: "transparent",
        borderWidth: 3,
        pointRadius: (context: any) => {
          const point = timelineData[context.dataIndex];
          return point && !point.isEuthymia && !point.isInstability ? 5 : 0;
        },
        pointBackgroundColor: (context: any) => {
          const point = timelineData[context.dataIndex];
          return point ? point.color : "#6b7280";
        },
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: false,
        spanGaps: false, // Ne pas connecter à travers les périodes d'instabilité
      },
    ];

    // Medication annotations will be handled separately below the main chart

    const finalChartData = {
      labels: chartLabels,
      datasets: datasets,
    };

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: finalChartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: -5,
            max: 5,
            grid: {
              color: function(context) {
                if (context.tick.value === 0) {
                  return "#9CA3AF";
                }
                return "#F3F4F6";
              },
            },
          },
          x: {
            type: "time",
            time: {
              unit: timeUnit
            },
            min: (() => {
              const moodMin = moodEntries.length > 0
                ? Math.min(...moodEntries.map(e => new Date(e.startDate).getTime()))
                : Infinity;
              const medMin = medications.length > 0
                ? Math.min(...medications.map(m => new Date(m.startDate).getTime()))
                : Infinity;
              const minTime = Math.min(moodMin, medMin);
              return minTime - (7 * 24 * 60 * 60 * 1000);
            })(),
            max: (() => {
              const maxTime = moodEntries.length > 0
                ? Math.max(...moodEntries.map(entry =>
                    entry.endDate ? new Date(entry.endDate).getTime() : new Date(entry.startDate).getTime()
                  ))
                : Date.now();
              return Math.max(maxTime, Date.now()) + (30 * 24 * 60 * 60 * 1000); // 30 days buffer
            })(),
            ticks: {
              display: false // Hide default ticks - custom plugin will draw episode dates
            },
            grid: {
              drawTicks: false // No tick marks on X axis
            },
            title: {
              display: true,
              text: 'Période',
              font: {
                size: 14,
                weight: 'bold'
              },
              padding: { top: 25 } // Extra padding for custom date labels
            }
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            filter: function(tooltipItem) {
              // Hide tooltip for instability dataset (index 3)
              // and show custom tooltip only for main data
              return tooltipItem.datasetIndex !== 3;
            },
            callbacks: {
              title: function(context) {
                if (!context.length || !context[0]) return '';
                // Check if this is an instability point
                const dataIndex = context[0].dataIndex;
                const point = timelineData[dataIndex];
                if (point && point.isInstability) {
                  return "Période d'instabilité thymique";
                }
                return `Date: ${context[0].label ?? ''}`;
              },
              label: function(context) {
                // Check if this is an instability point - show nothing for values
                const dataIndex = context.dataIndex;
                const point = timelineData[dataIndex];
                if (point && point.isInstability) {
                  return ''; // No value displayed for instability
                }
                
                if (context.datasetIndex === 4) { // Main timeline (shifted by 1 due to new instability dataset)
                  const value = context.parsed.y;
                  if (value === 0) return "État: Euthymie";
                  if (value > 0) return `Excitation: +${value}`;
                  return `Dépression: ${value}`;
                }
                return '';
              },
              afterBody: function(context) {
                // Find matching entry for additional details
                if (!context.length || !context[0]) return [];
                const dataIndex = context[0].dataIndex;
                const point = timelineData[dataIndex];
                
                // For instability periods, show only the label
                if (point && point.isInstability) {
                  return []; // Empty - title already shows the info
                }
                
                if (point && point.episodeId !== undefined) {
                  const matchingEntry = sortedEntries[point.episodeId];
                  return [
                    `Type: ${matchingEntry.episodeType}`,
                    matchingEntry.endDate ? `Période: ${matchingEntry.startDate} au ${matchingEntry.endDate}` : `Début: ${matchingEntry.startDate} (en cours)`,
                    matchingEntry.triggerEvents ? `Déclencheurs: ${matchingEntry.triggerEvents}` : "",
                    matchingEntry.notes ? `Notes: ${matchingEntry.notes}` : "",
                  ].filter(Boolean);
                }
                
                if (point && point.isEuthymia) {
                  return ["Période d'euthymie"];
                }
                
                return [];
              },
            },
          },
          annotation: {
            annotations: (() => {
              const annotations: any = {};

              // ── Label badge for mixed episodes (☯ Mixte) ────────────────────
              sortedEntries.forEach((entry, index) => {
                if (entry.episodeType === 'Mixte') {
                  const excLvl = (entry as any).mixedExcitationLevel ?? 3;
                  annotations[`mixed_label_${index}`] = {
                    type: 'label',
                    xValue: entry.startDate,
                    yValue: excLvl + 0.4,
                    content: ['☯ Mixte'],
                    backgroundColor: 'rgba(124, 58, 237, 0.85)',
                    color: 'white',
                    font: { size: 9, weight: 'bold' },
                    padding: { x: 5, y: 2 },
                    borderRadius: 4,
                    xAdjust: 22,
                    yAdjust: 0,
                  };
                }
              });

              // Add trigger annotations for episodes with trigger events
              sortedEntries.forEach((entry, index) => {
                if (entry.triggerEvents && entry.triggerEvents.trim()) {
                  // Extract key words from trigger events (first 3-4 words)
                  const triggerKeywords = entry.triggerEvents
                    .split(/[,;.\n]/)
                    .map(phrase => phrase.trim())
                    .filter(phrase => phrase)
                    .slice(0, 2) // Take first 2 phrases
                    .map(phrase => phrase.split(' ').slice(0, 3).join(' ')) // Max 3 words per phrase
                    .join(' • ');

                  const startDate = entry.startDate;
                  const isPositive = entry.moodLevel > 0;
                  
                  // Calculer la position de l'étiquette en gardant une marge du bord du graphique
                  let labelYPosition;
                  if (isPositive) {
                    // Pour les valeurs positives, placer l'étiquette vers le haut mais ne pas dépasser 4.5
                    labelYPosition = Math.min(entry.moodLevel + 1.2, 4.5);
                    // Si l'épisode est très haut (>=4), placer l'étiquette en dessous
                    if (entry.moodLevel >= 4) {
                      labelYPosition = entry.moodLevel - 1.5;
                    }
                  } else {
                    // Pour les valeurs négatives, placer l'étiquette vers le bas mais ne pas dépasser -4.5
                    labelYPosition = Math.max(entry.moodLevel - 1.2, -4.5);
                    // Si l'épisode est très bas (<=-4), placer l'étiquette au dessus
                    if (entry.moodLevel <= -4) {
                      labelYPosition = entry.moodLevel + 1.5;
                    }
                  }
                  
                  // Add connecting line from episode point to baseline (0)
                  annotations[`trigger_line_to_base_${index}`] = {
                    type: 'line',
                    xMin: startDate,
                    xMax: startDate,
                    yMin: entry.moodLevel,
                    yMax: 0,
                    borderColor: 'rgba(107, 114, 128, 0.7)',
                    borderWidth: 1,
                    borderDash: [3, 3],
                  };
                  
                  // Add connecting line from baseline to trigger label
                  annotations[`trigger_line_to_label_${index}`] = {
                    type: 'line',
                    xMin: startDate,
                    xMax: startDate,
                    yMin: 0,
                    yMax: labelYPosition,
                    borderColor: 'rgba(107, 114, 128, 0.7)',
                    borderWidth: 1,
                    borderDash: [3, 3],
                  };
                  
                  // Add small arrow at the end of the line
                  annotations[`trigger_arrow_${index}`] = {
                    type: 'point',
                    xValue: startDate,
                    yValue: labelYPosition,
                    backgroundColor: 'rgba(107, 114, 128, 0.8)',
                    borderColor: 'rgba(107, 114, 128, 0.8)',
                    borderWidth: 1,
                    radius: 3,
                  };
                  
                  // Add trigger label
                  annotations[`trigger_label_${index}`] = {
                    type: 'label',
                    xValue: startDate,
                    yValue: labelYPosition,
                    content: triggerKeywords,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    color: 'white',
                    font: {
                      size: 10,
                      weight: 'bold'
                    },
                    padding: 6,
                    borderRadius: 6,
                    position: 'center',
                    xAdjust: 0,
                    // Ajuster yAdjust en fonction de la position de l'étiquette par rapport à l'épisode
                    yAdjust: (labelYPosition > entry.moodLevel) ? -15 : 15,
                  };
                }
              });
              
              // ── Life events annotations (white bg, dark grey text, vertical line full height) ──
              lifeEvents.forEach((event, index) => {
                const eventDate = event.date.length === 7 ? event.date + '-01' : event.date;
                const shortTitle = event.title.split(' ').slice(0, 4).join(' ');

                // Full-height vertical dashed line
                annotations[`life_line_${index}`] = {
                  type: 'line',
                  xMin: eventDate,
                  xMax: eventDate,
                  yMin: -5,
                  yMax: 5,
                  borderColor: 'rgba(107, 114, 128, 0.4)',
                  borderWidth: 1,
                  borderDash: [4, 4],
                };

                // Label badge at bottom of chart
                annotations[`life_label_${index}`] = {
                  type: 'label',
                  xValue: eventDate,
                  yValue: -4.6,
                  content: [shortTitle],
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#374151',
                  font: { size: 9, weight: 'normal' },
                  padding: { x: 5, y: 3 },
                  borderRadius: 4,
                  borderColor: 'rgba(156, 163, 175, 0.7)',
                  borderWidth: 1,
                  callout: {
                    enabled: false,
                  },
                };
              });

              // Add substance overlays if enabled (now at top)
              if (showSubstancesOverlay) {
                // Substance color palette matching original
                const substanceColorMap = [
                  { bg: 'rgba(147, 51, 234, 0.3)', border: 'rgb(147, 51, 234)', label: 'rgba(147, 51, 234, 0.8)' }, // purple
                  { bg: 'rgba(236, 72, 153, 0.3)', border: 'rgb(236, 72, 153)', label: 'rgba(236, 72, 153, 0.8)' }, // pink
                  { bg: 'rgba(99, 102, 241, 0.3)', border: 'rgb(99, 102, 241)', label: 'rgba(99, 102, 241, 0.8)' }, // indigo
                  { bg: 'rgba(59, 130, 246, 0.3)', border: 'rgb(59, 130, 246)', label: 'rgba(59, 130, 246, 0.8)' }, // blue
                  { bg: 'rgba(6, 182, 212, 0.3)', border: 'rgb(6, 182, 212)', label: 'rgba(6, 182, 212, 0.8)' }, // cyan
                  { bg: 'rgba(20, 184, 166, 0.3)', border: 'rgb(20, 184, 166)', label: 'rgba(20, 184, 166, 0.8)' }, // teal
                  { bg: 'rgba(16, 185, 129, 0.3)', border: 'rgb(16, 185, 129)', label: 'rgba(16, 185, 129, 0.8)' }, // emerald
                  { bg: 'rgba(132, 204, 22, 0.3)', border: 'rgb(132, 204, 22)', label: 'rgba(132, 204, 22, 0.8)' }, // lime
                  { bg: 'rgba(234, 179, 8, 0.3)', border: 'rgb(234, 179, 8)', label: 'rgba(234, 179, 8, 0.8)' }, // yellow
                  { bg: 'rgba(249, 115, 22, 0.3)', border: 'rgb(249, 115, 22)', label: 'rgba(249, 115, 22, 0.8)' }, // orange
                  { bg: 'rgba(239, 68, 68, 0.3)', border: 'rgb(239, 68, 68)', label: 'rgba(239, 68, 68, 0.8)' }, // red
                  { bg: 'rgba(244, 63, 94, 0.3)', border: 'rgb(244, 63, 94)', label: 'rgba(244, 63, 94, 0.8)' } // rose
                ];
                
                substances.forEach((substance, index) => {
                  const startPeriod = substance.startPeriod + '-01';
                  const endPeriod = substance.endPeriod ? substance.endPeriod + '-01' : new Date().toISOString().split('T')[0];
                  const yPosition = 4.5 - (index * 0.6); // Stack substances at top of chart with more space
                  
                  const colors = substanceColorMap[index % substanceColorMap.length];
                  
                  // Create substance bar
                  annotations[`substance_overlay_${substance.id}`] = {
                    type: 'box',
                    xMin: startPeriod,
                    xMax: endPeriod,
                    yMin: yPosition - 0.25,
                    yMax: yPosition + 0.25,
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderWidth: 3,
                    borderRadius: 6,
                  };
                  
                  // Create separate label for substance
                  annotations[`substance_label_${substance.id}`] = {
                    type: 'label',
                    xValue: new Date(startPeriod).getTime() + (new Date(endPeriod).getTime() - new Date(startPeriod).getTime()) / 2,
                    yValue: yPosition,
                    content: `${substance.name} (${substance.frequency})`,
                    backgroundColor: colors.label,
                    color: 'white',
                    font: { size: 11, weight: 'bold' },
                    padding: { x: 8, y: 4 },
                    borderRadius: 4,
                    position: 'center'
                  };
                });
              }
              
              // Add medication overlays if enabled — grouped by molecule so rows stay bounded
              if (showMedicationsOverlay) {
                const medGroupKeys = Object.keys(groupedMedications);
                const numGroups = medGroupKeys.length;
                // Fit all groups between y=-4.8 and y=-0.6 regardless of count
                const medStep = numGroups > 1 ? Math.min(0.65, 4.2 / (numGroups - 1)) : 0;
                const medYStart = -4.8;

                const medOverlayColors = [
                  { bg: 'rgba(34,197,94,0.3)',   border: 'rgb(34,197,94)',   label: 'rgba(22,163,74,0.85)' },
                  { bg: 'rgba(59,130,246,0.3)',   border: 'rgb(59,130,246)', label: 'rgba(37,99,235,0.85)' },
                  { bg: 'rgba(249,115,22,0.3)',   border: 'rgb(249,115,22)', label: 'rgba(234,88,12,0.85)' },
                  { bg: 'rgba(147,51,234,0.3)',   border: 'rgb(147,51,234)', label: 'rgba(126,34,206,0.85)' },
                  { bg: 'rgba(236,72,153,0.3)',   border: 'rgb(236,72,153)', label: 'rgba(219,39,119,0.85)' },
                  { bg: 'rgba(6,182,212,0.3)',    border: 'rgb(6,182,212)',  label: 'rgba(8,145,178,0.85)' },
                  { bg: 'rgba(234,179,8,0.3)',    border: 'rgb(234,179,8)',  label: 'rgba(202,138,4,0.85)' },
                  { bg: 'rgba(239,68,68,0.3)',    border: 'rgb(239,68,68)',  label: 'rgba(220,38,38,0.85)' },
                  { bg: 'rgba(16,185,129,0.3)',   border: 'rgb(16,185,129)', label: 'rgba(5,150,105,0.85)' },
                  { bg: 'rgba(99,102,241,0.3)',   border: 'rgb(99,102,241)', label: 'rgba(79,70,229,0.85)' },
                  { bg: 'rgba(20,184,166,0.3)',   border: 'rgb(20,184,166)', label: 'rgba(15,118,110,0.85)' },
                  { bg: 'rgba(132,204,22,0.3)',   border: 'rgb(132,204,22)', label: 'rgba(101,163,13,0.85)' },
                ];

                medGroupKeys.forEach((baseName, groupIndex) => {
                  const groupMeds: Medication[] = groupedMedications[baseName];
                  const yPosition = medYStart + groupIndex * medStep;
                  const halfBar = Math.min(0.28, medStep * 0.4);
                  const colors = medOverlayColors[groupIndex % medOverlayColors.length];

                  // One bar per prescription period within the group
                  groupMeds.forEach((medication) => {
                    const startX = medication.startDate;
                    const endX = medication.endDate || new Date().toISOString().split('T')[0];

                    annotations[`medication_overlay_${medication.id}`] = {
                      type: 'box',
                      xMin: startX,
                      xMax: endX,
                      yMin: yPosition - halfBar,
                      yMax: yPosition + halfBar,
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      borderWidth: 2,
                      borderRadius: 4,
                    };

                    // Dosage label centred on each bar
                    if (medication.dosage) {
                      annotations[`medication_dosage_${medication.id}`] = {
                        type: 'label',
                        xValue: new Date(startX).getTime() + (new Date(endX).getTime() - new Date(startX).getTime()) / 2,
                        yValue: yPosition,
                        content: medication.dosage,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        color: 'white',
                        font: { size: 10, weight: 'bold' },
                        padding: { x: 5, y: 3 },
                        borderRadius: 3,
                        position: 'center',
                      };
                    }
                  });

                  // One row label (molecule name) anchored to the left
                  const earliestStart = groupMeds.reduce((min, m) =>
                    m.startDate < min ? m.startDate : min, groupMeds[0].startDate);
                  annotations[`medication_label_${groupIndex}`] = {
                    type: 'label',
                    xValue: new Date(earliestStart).getTime(),
                    yValue: yPosition,
                    content: baseName,
                    backgroundColor: colors.label,
                    color: 'white',
                    font: { size: 11, weight: 'bold' },
                    padding: { x: 7, y: 4 },
                    borderRadius: 3,
                    position: 'start',
                  };
                });
              }
              
              // Add hospitalizations as red vertical lines at top of chart
              if (showHospitalizationsOverlay && hospitalizations && hospitalizations.length > 0) {
                hospitalizations.forEach((hospitalization, index) => {
                  const startDateStr = hospitalization.startDate.length === 7 
                    ? hospitalization.startDate + '-01' 
                    : hospitalization.startDate;
                  const endDateStr = hospitalization.endDate 
                    ? (hospitalization.endDate.length === 7 ? hospitalization.endDate + '-01' : hospitalization.endDate)
                    : startDateStr;
                  
                  // Create red vertical line from top of chart extending down
                  annotations[`hospitalization_line_${hospitalization.id}`] = {
                    type: 'box',
                    xMin: startDateStr,
                    xMax: endDateStr,
                    yMin: 4.2,
                    yMax: 5,
                    backgroundColor: 'rgba(239, 68, 68, 0.4)',
                    borderColor: 'rgb(220, 38, 38)',
                    borderWidth: 2,
                    borderRadius: 3,
                  };
                  
                  // Add hospital icon marker
                  annotations[`hospitalization_marker_${hospitalization.id}`] = {
                    type: 'label',
                    xValue: new Date(startDateStr).getTime() + (new Date(endDateStr).getTime() - new Date(startDateStr).getTime()) / 2,
                    yValue: 4.6,
                    content: '🏥',
                    font: { size: 14 },
                    backgroundColor: 'transparent',
                    position: 'center'
                  };
                  
                  // Add tooltip label on hover area
                  const locationText = hospitalization.location || 'Hospitalisation';
                  annotations[`hospitalization_label_${hospitalization.id}`] = {
                    type: 'label',
                    xValue: new Date(startDateStr).getTime() + (new Date(endDateStr).getTime() - new Date(startDateStr).getTime()) / 2,
                    yValue: 5.3,
                    content: locationText.length > 20 ? locationText.substring(0, 20) + '...' : locationText,
                    backgroundColor: 'rgba(220, 38, 38, 0.9)',
                    color: 'white',
                    font: { size: 9, weight: 'bold' },
                    padding: { x: 4, y: 2 },
                    borderRadius: 3,
                    position: 'center',
                    display: false
                  };
                });
              }
              
              return annotations;
            })()
          },
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
                speed: 0.1
              },
              pinch: {
                enabled: true
              },
              mode: 'x',
              onZoomComplete: function(context: any) {
                const chart = context.chart;
                const xScale = chart.scales.x;
                setZoomState({
                  min: xScale.min,
                  max: xScale.max
                });
              }
            },
            pan: {
              enabled: true,
              mode: 'x',
              onPanComplete: function(context: any) {
                const chart = context.chart;
                const xScale = chart.scales.x;
                setZoomState({
                  min: xScale.min,
                  max: xScale.max
                });
              }
            }
          },
          episodeDateLabels: {
            importantDates: Array.from(importantDates)
          } as any
        },
        layout: {
          padding: {
            bottom: 5 // Extra space for custom date labels
          }
        }
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [moodEntries, medications, substances, hospitalizations, instabilityPeriods, lifeEvents, isLoading, showMedicationsOverlay, showSubstancesOverlay, showHospitalizationsOverlay]);


  const handleChartContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onEpisodeRightClick || !chartInstanceRef.current || !chartRef.current) return;
    e.preventDefault();
    const chart = chartInstanceRef.current;
    const rect = chartRef.current.getBoundingClientRect();
    const xPixel = e.clientX - rect.left;
    const xScale = (chart.scales as any).x;
    if (!xScale) return;
    const xValue = xScale.getValueForPixel(xPixel);
    if (xValue === null || xValue === undefined) return;
    const clickDate = new Date(xValue);

    // Find the episode whose date range contains the clicked date
    const entries = sortedEntriesRef.current;
    let found: MoodEntry | undefined;
    for (const entry of entries) {
      const start = new Date(entry.startDate);
      // For endDate, use the same logic as getEntryEndDate but simplified
      let end: Date;
      if (entry.endDate) {
        end = new Date(entry.endDate);
      } else if (defaultEpisodeDurationMonths) {
        end = new Date(start);
        end.setMonth(end.getMonth() + defaultEpisodeDurationMonths);
      } else {
        end = new Date();
      }
      if (clickDate >= start && clickDate <= end) {
        found = entry;
        break;
      }
    }
    if (!found) return;
    onEpisodeRightClick(found, e.clientX, e.clientY);
  };

  return (
    <div className={`bg-white mood-chart-container ${fullWidth ? "border-y border-gray-200 shadow-sm px-6 py-6" : "rounded-xl shadow-sm border border-gray-200 p-6"}`}>
      {/* Floating medication tooltip — rendered at fixed viewport position to escape overflow:hidden */}
      {medTooltip && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: medTooltip.x,
            top: medTooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap border border-gray-700">
            <div className="font-semibold text-sm mb-1">{medTooltip.name}</div>
            {medTooltip.dosage && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400">💊 Dosage :</span>
                <span className="font-medium text-blue-300">{medTooltip.dosage}</span>
              </div>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-gray-400">📅 Période :</span>
              <span>{medTooltip.startDate} → {medTooltip.endDate || 'En cours'}</span>
            </div>
            {medTooltip.frequency && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-gray-400">🔁 Fréquence :</span>
                <span>{medicationFrequencyLabels[medTooltip.frequency] || medTooltip.frequency}</span>
              </div>
            )}
            {medTooltip.notes && (
              <div className="mt-1 border-t border-gray-700 pt-1 text-gray-300 max-w-xs whitespace-normal">
                {medTooltip.notes}
              </div>
            )}
            {/* Caret */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-2 h-8 bg-medical-blue rounded-full mr-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Votre Ligne de Vie Thymique</h2>
        </div>
        
        {/* Zoom controls and overlay toggles */}
        {!isLoading && moodEntries.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="hidden sm:inline">🔍 Molette: zoom • Glisser: déplacer</span>
            
            {/* Toggle overlay buttons */}
            <button
              onClick={() => setShowMedicationsOverlay(!showMedicationsOverlay)}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                showMedicationsOverlay 
                  ? 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Afficher/masquer les médicaments dans le graphique"
              data-testid="button-toggle-medications-overlay"
            >
              💊 {showMedicationsOverlay ? 'ON' : 'OFF'}
            </button>
            
            <button
              onClick={() => setShowSubstancesOverlay(!showSubstancesOverlay)}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                showSubstancesOverlay 
                  ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Afficher/masquer les substances dans le graphique"
              data-testid="button-toggle-substances-overlay"
            >
              🍷 {showSubstancesOverlay ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={() => setShowHospitalizationsOverlay(!showHospitalizationsOverlay)}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                showHospitalizationsOverlay
                  ? 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Afficher/masquer les hospitalisations dans le graphique"
              data-testid="button-toggle-hospitalizations-overlay"
            >
              🏥 {showHospitalizationsOverlay ? 'ON' : 'OFF'}
            </button>
            
            <button
              onClick={() => {
                if (chartInstanceRef.current) {
                  chartInstanceRef.current.resetZoom();
                  setZoomState({ min: null, max: null });
                }
              }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border transition-colors"
              title="Réinitialiser le zoom"
              data-testid="button-reset-zoom"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Chart Legend - Moved to top */}
      {!isLoading && moodEntries.length > 0 && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-center space-x-6 text-sm flex-wrap gap-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-gray-700">Excitation (+1 à +5)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700">Dépression (-1 à -5)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full border-2 border-gray-600"></div>
              <span className="text-gray-700">Euthymie (0)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-1 bg-gray-400 rounded-full"></div>
              <span className="text-gray-700">Ligne de référence</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-sm border border-yellow-400" style={{ backgroundColor: "rgba(234,179,8,0.25)" }}></div>
              <span className="text-gray-700">Fluctuations subsyndromiques (−2 à +2)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-sm border border-gray-500" style={{ backgroundColor: "rgba(100,100,100,0.35)" }}></div>
              <span className="text-gray-700">Instabilité thymique</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-sm border border-purple-500" style={{ backgroundColor: "rgba(124,58,237,0.45)" }}></div>
              <span className="text-gray-700">Épisode mixte ☯</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Chart Container - Fixed height for main chart */}
      <div className={`relative w-full ${fullWidth ? "h-[520px]" : "h-96"}`}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-blue mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement des données...</p>
            </div>
          </div>
        ) : moodEntries.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée disponible</h3>
              <p className="text-gray-500">Commencez par ajouter votre premier épisode thymique pour voir votre ligne de vie.</p>
            </div>
          </div>
        ) : (
          <canvas
            ref={chartRef}
            className={`absolute inset-0 w-full h-full ${onEpisodeRightClick ? "cursor-context-menu" : ""}`}
            onContextMenu={handleChartContextMenu}
          ></canvas>
        )}
      </div>
      
      {/* Medications Timeline - Independent overlay allowing free zoom */}
      {medications.length > 0 && moodEntries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-2 h-5 bg-green-500 rounded-full mr-2"></div>
              <h3 className="text-base font-semibold text-gray-900">Traitements Médicamenteux</h3>
              {zoomState.min && zoomState.max && (
                <span className="ml-2 text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                  Vue zoomée: {new Date(zoomState.min).toLocaleDateString('fr-FR')} - {new Date(zoomState.max).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowMedicationsTimeline(!showMedicationsTimeline)}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              title={showMedicationsTimeline ? "Masquer la timeline" : "Afficher la timeline"}
            >
              {showMedicationsTimeline ? "Masquer" : "Afficher"}
            </button>
          </div>
          
          {showMedicationsTimeline && (
            <div className="mt-2">
              {(() => {
                // Calculate chart time bounds — include medication dates so old meds are visible
                const moodStartMin = moodEntries.length > 0
                  ? Math.min(...moodEntries.map(e => new Date(e.startDate).getTime()))
                  : Infinity;
                const medStartMin = medications.length > 0
                  ? Math.min(...medications.map(m => new Date(m.startDate).getTime()))
                  : Infinity;
                const chartStartTime = Math.min(moodStartMin, medStartMin);
                const moodEndMax = moodEntries.length > 0
                  ? Math.max(...moodEntries.map(e => e.endDate ? new Date(e.endDate).getTime() : new Date(e.startDate).getTime()))
                  : 0;
                const medEndMax = medications.length > 0
                  ? Math.max(...medications.map(m => m.endDate ? new Date(m.endDate).getTime() : Date.now()))
                  : 0;
                const chartEndTime = Math.max(moodEndMax, medEndMax);
                const finalEndTime = Math.max(chartEndTime, Date.now());

                // Apply zoom if active
                const startTime = zoomState.min ? new Date(zoomState.min).getTime() : chartStartTime;
                const endTime = zoomState.max ? new Date(zoomState.max).getTime() : finalEndTime;

                // Use memoized grouped medications

                return (
                  <div className="bg-gray-50 rounded-lg relative">
                    {Object.entries(groupedMedications).map(([baseName, medGroup]: [string, any], groupIndex) => {
                      // Create timeline segments using calculateTimelinePosition
                      const segments = medGroup.map((medication: any) => {
                        const medStartTime = new Date(medication.startDate).getTime();
                        const medEndTime = medication.endDate ? new Date(medication.endDate).getTime() : new Date().getTime();
                        const position = calculateTimelinePosition(medStartTime, medEndTime, startTime, endTime);
                        
                        return {
                          ...medication,
                          ...position,
                          visible: position.left < 100 && position.left + position.width > 0
                        };
                      }).filter((seg: any) => seg.visible);

                      if (segments.length === 0) return null;

                      // Use category color if available, otherwise deterministic color
                      const color = medicationCategoryColors[medGroup[0].category] || 
                                   medicationColors[groupIndex % medicationColors.length];
                      
                      // Create display name - just base name for clarity
                      const displayName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
                      
                      return (
                        <div key={baseName} className="relative h-8 border-b border-gray-100 last:border-b-0 overflow-hidden">
                          {/* Timeline bars - explicit z-index layering */}
                          <div className="absolute inset-0" style={{ zIndex: 0 }}>
                            {segments.map((segment: any, segIndex: number) => (
                              <div 
                                key={`${segment.id}-${segIndex}`}
                                className={`absolute ${color} opacity-70 rounded shadow-sm cursor-pointer flex items-center justify-center hover:opacity-90 transition-opacity`}
                                style={{ 
                                  top: '10px',
                                  left: `${segment.left}%`,
                                  width: `${segment.width}%`,
                                  minWidth: '20px',
                                  height: '12px',
                                  pointerEvents: 'auto'
                                }}
                                onMouseEnter={(e) => {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setMedTooltip({
                                    visible: true,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 8,
                                    name: segment.name,
                                    dosage: segment.dosage || '',
                                    startDate: segment.startDate,
                                    endDate: segment.endDate,
                                    frequency: segment.frequency || '',
                                    notes: segment.notes || '',
                                  });
                                }}
                                onMouseLeave={() => setMedTooltip(null)}
                              >
                                {/* Dosage text directly on the bar when wide enough */}
                                {segment.dosage && segment.width > 5 && (
                                  <span className="text-white text-xs font-semibold drop-shadow-sm pointer-events-none truncate px-1">
                                    {segment.dosage}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {/* Label - explicit z-index on top */}
                          <div className="absolute top-0 left-0" style={{ zIndex: 10 }}>
                            <div className="h-8 flex items-center">
                              <div className="px-2 bg-white/90 backdrop-blur-sm rounded border border-gray-200 shadow-sm pointer-events-none">
                                <div className="text-xs font-medium text-gray-700 truncate max-w-32">
                                  {displayName}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Substances Timeline - Independent overlay allowing free zoom */}
      {substances.length > 0 && moodEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-2 h-5 bg-purple-500 rounded-full mr-2"></div>
              <h3 className="text-base font-semibold text-gray-900">Consommation de Substances</h3>
              {zoomState.min && zoomState.max && (
                <span className="ml-2 text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                  Vue zoomée: {new Date(zoomState.min).toLocaleDateString('fr-FR')} - {new Date(zoomState.max).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowSubstancesTimeline(!showSubstancesTimeline)}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              title={showSubstancesTimeline ? "Masquer la timeline" : "Afficher la timeline"}
            >
              {showSubstancesTimeline ? "Masquer" : "Afficher"}
            </button>
          </div>
          
          
          {showSubstancesTimeline && (
            <div className="mt-2">
              {(() => {
                // Calculate chart time bounds — match medication timeline range
                const moodStartMin2 = moodEntries.length > 0
                  ? Math.min(...moodEntries.map(e => new Date(e.startDate).getTime()))
                  : Infinity;
                const medStartMin2 = medications.length > 0
                  ? Math.min(...medications.map(m => new Date(m.startDate).getTime()))
                  : Infinity;
                const chartStartTime = Math.min(moodStartMin2, medStartMin2);
                const moodEndMax2 = moodEntries.length > 0
                  ? Math.max(...moodEntries.map(e => e.endDate ? new Date(e.endDate).getTime() : new Date(e.startDate).getTime()))
                  : 0;
                const medEndMax2 = medications.length > 0
                  ? Math.max(...medications.map(m => m.endDate ? new Date(m.endDate).getTime() : Date.now()))
                  : 0;
                const chartEndTime = Math.max(moodEndMax2, medEndMax2);
                const finalEndTime = Math.max(chartEndTime, Date.now());

                // Apply zoom if active
                const startTime = zoomState.min ? new Date(zoomState.min).getTime() : chartStartTime;
                const endTime = zoomState.max ? new Date(zoomState.max).getTime() : finalEndTime;

                // Use memoized grouped substances

                return (
                  <div className="bg-gray-50 rounded-lg relative">
                    {Object.entries(groupedSubstances).map(([baseName, substanceGroup]: [string, any], groupIndex) => {
                      // Create timeline segments using calculateTimelinePosition
                      const segments = substanceGroup.map((substance: any) => {
                        const substanceStartTime = new Date(substance.startPeriod + '-01').getTime();
                        const substanceEndTime = substance.endPeriod 
                          ? new Date(substance.endPeriod + '-01').getTime()
                          : new Date().getTime();
                        const position = calculateTimelinePosition(substanceStartTime, substanceEndTime, startTime, endTime);
                        
                        return {
                          ...substance,
                          ...position,
                          visible: position.left < 100 && position.left + position.width > 0,
                          isProlonged: isProlongedConsumption(substance.frequency || '', substance.startPeriod, substance.endPeriod),
                          intensity: getSubstanceIntensity(substance.frequency || '', substance.quantity),
                          durationMonths: substance.endPeriod 
                            ? (new Date(substance.endPeriod + '-01').getTime() - new Date(substance.startPeriod + '-01').getTime()) / (1000 * 60 * 60 * 24 * 30)
                            : ((new Date().getTime() - new Date(substance.startPeriod + '-01').getTime()) / (1000 * 60 * 60 * 24 * 30))
                        };
                      }).filter((seg: any) => seg.visible);

                      if (segments.length === 0) return null;

                      const color = substanceColors[groupIndex % substanceColors.length];
                      
                      // Create display name - just base name for clarity
                      const displayName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
                      
                      return (
                        <div key={baseName} className="relative h-8 border-b border-gray-100 last:border-b-0 overflow-hidden">
                          {/* Timeline elements - explicit z-index layering */}
                          <div className="absolute inset-0" style={{ zIndex: 0 }}>
                            {segments.map((segment: any, segIndex: number) => (
                              segment.isProlonged ? (
                                /* Prolonged consumption: thin bar with variable opacity */
                                <div 
                                  key={`${segment.id}-${segIndex}`}
                                  className={`absolute ${color} shadow-sm group rounded`}
                                  style={{ 
                                    top: '10px',
                                    left: `${segment.left}%`,
                                    width: `${segment.width}%`,
                                    minWidth: '20px',
                                    height: `${Math.max(6, segment.intensity * 4)}px`,
                                    opacity: Math.max(0.4, segment.intensity / 3),
                                    pointerEvents: 'auto'
                                  }}
                                >
                                  {/* Enhanced tooltip */}
                                  <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                    <div className="font-medium">{segment.name}</div>
                                    <div>{segment.startPeriod.replace('-', '/')} - {
                                      segment.endPeriod 
                                        ? segment.endPeriod.replace('-', '/')
                                        : 'En cours'
                                    }</div>
                                    <div>Durée: {Math.round(segment.durationMonths)} mois</div>
                                    <div>Fréquence: {substanceFrequencyLabels[segment.frequency || ''] || segment.frequency}</div>
                                    {segment.quantity && (
                                      <div>Quantité: {segment.quantity}</div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                /* Occasional consumption: points with variable size */
                                <div 
                                  key={`${segment.id}-${segIndex}`}
                                  className={`absolute rounded-full ${color} shadow-sm group cursor-pointer`}
                                  style={{ 
                                    top: '10px',
                                    left: `${segment.left}%`,
                                    width: `${Math.max(12, segment.intensity * 6)}px`, 
                                    height: `${Math.max(12, segment.intensity * 6)}px`,
                                    opacity: Math.max(0.6, segment.intensity / 3),
                                    pointerEvents: 'auto'
                                  }}
                                >
                                  {/* Enhanced tooltip */}
                                  <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                    <div className="font-medium">{segment.name}</div>
                                    <div>Période: {segment.startPeriod.replace('-', '/')} {
                                      segment.endPeriod 
                                        ? `- ${segment.endPeriod.replace('-', '/')}`
                                        : '(en cours)'
                                    }</div>
                                    <div>Type: Consommation ponctuelle</div>
                                    <div>Fréquence: {substanceFrequencyLabels[segment.frequency || ''] || segment.frequency}</div>
                                    {segment.quantity && (
                                      <div>Quantité: {segment.quantity}</div>
                                    )}
                                  </div>
                                </div>
                              )
                            ))}
                          </div>
                          
                          {/* Label - explicit z-index on top */}
                          <div className="absolute top-0 left-0" style={{ zIndex: 10 }}>
                            <div className="h-8 flex items-center">
                              <div className="px-2 bg-white/90 backdrop-blur-sm rounded border border-gray-200 shadow-sm pointer-events-none">
                                <div className="text-xs font-medium text-gray-700 truncate max-w-32">
                                  {displayName}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
