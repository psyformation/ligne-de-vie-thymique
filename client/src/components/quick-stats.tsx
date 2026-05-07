import type { MoodEntry } from "@shared/schema";

interface QuickStatsProps {
  moodEntries: MoodEntry[];
}

export default function QuickStats({ moodEntries }: QuickStatsProps) {
  const totalEntries = moodEntries.length;
  const averageMood = totalEntries > 0 
    ? (moodEntries.reduce((sum, entry) => sum + entry.moodLevel, 0) / totalEntries).toFixed(1)
    : "0.0";
  const bestMood = totalEntries > 0 
    ? Math.max(...moodEntries.map(entry => entry.moodLevel))
    : 0;
  const worstMood = totalEntries > 0 
    ? Math.min(...moodEntries.map(entry => entry.moodLevel))
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <div className="w-2 h-8 bg-medical-blue rounded-full mr-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Aperçu Rapide</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 mb-1">{totalEntries}</div>
          <div className="text-sm text-gray-600">Épisodes totaux</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-medical-blue mb-1">
            {parseFloat(averageMood) > 0 ? `+${averageMood}` : averageMood}
          </div>
          <div className="text-sm text-gray-600">Humeur moyenne</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-mood-manie mb-1">
            {bestMood > 0 ? `+${bestMood}` : bestMood}
          </div>
          <div className="text-sm text-orange-600">Meilleur niveau</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-mood-depression-severe mb-1">{worstMood}</div>
          <div className="text-sm text-blue-600">Niveau le plus bas</div>
        </div>
      </div>
    </div>
  );
}
