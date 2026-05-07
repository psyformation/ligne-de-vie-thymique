import { type MoodEntry, type Hospitalization } from "@shared/schema";

interface EpisodeSummaryProps {
  moodEntries: MoodEntry[];
  hospitalizations?: Hospitalization[];
}

interface SeasonalCount {
  total: number;
  depressive: number;
  hypomanic: number;
  mixed: number;
}

interface SeasonalStats {
  spring: SeasonalCount;
  summer: SeasonalCount;
  autumn: SeasonalCount;
  winter: SeasonalCount;
}

interface RapidCyclingInfo {
  hasRapidCycling: boolean;
  yearsWithRapidCycling: { year: number; count: number }[];
}

interface EpisodeStats {
  totalEpisodes: number;
  depressiveEpisodes: number;
  hypomanicEpisodes: number;
  mixedEpisodes: number;
  subsyndromalFluctuations: number;
  seasonalStats: SeasonalStats;
  rapidCycling: RapidCyclingInfo;
}

export default function EpisodeSummary({ moodEntries, hospitalizations = [] }: EpisodeSummaryProps) {
  const getSeason = (date: Date): keyof SeasonalStats => {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  };

  const isMixedEpisode = (entry: MoodEntry) =>
    entry.episodeType === "Mixte" ||
    ((entry as any).mixedExcitationLevel != null && (entry as any).mixedDepressiveLevel != null);

  const calculateStats = (): EpisodeStats => {
    const emptyCount: SeasonalCount = { total: 0, depressive: 0, hypomanic: 0, mixed: 0 };
    const emptySeasonalStats: SeasonalStats = {
      spring: { ...emptyCount },
      summer: { ...emptyCount },
      autumn: { ...emptyCount },
      winter: { ...emptyCount },
    };
    const emptyRapidCycling: RapidCyclingInfo = { hasRapidCycling: false, yearsWithRapidCycling: [] };

    if (moodEntries.length === 0) {
      return { totalEpisodes: 0, depressiveEpisodes: 0, hypomanicEpisodes: 0, mixedEpisodes: 0, subsyndromalFluctuations: 0, seasonalStats: emptySeasonalStats, rapidCycling: emptyRapidCycling };
    }

    let depressiveEpisodes = 0;
    let hypomanicEpisodes = 0;
    let mixedEpisodes = 0;
    let subsyndromalFluctuations = 0;
    const seasonalStats: SeasonalStats = {
      spring: { total: 0, depressive: 0, hypomanic: 0, mixed: 0 },
      summer: { total: 0, depressive: 0, hypomanic: 0, mixed: 0 },
      autumn: { total: 0, depressive: 0, hypomanic: 0, mixed: 0 },
      winter: { total: 0, depressive: 0, hypomanic: 0, mixed: 0 },
    };
    const episodesByYear: Map<number, number> = new Map();

    moodEntries.forEach(entry => {
      const startDate = new Date(entry.startDate);
      const intensity = Math.abs(entry.moodLevel);
      const isTrueEpisode = intensity >= 3;
      const mixed = isMixedEpisode(entry);

      if (mixed) {
        // Mixed episodes are always counted as true episodes regardless of moodLevel
        mixedEpisodes++;
        const season = getSeason(startDate);
        seasonalStats[season].total++;
        seasonalStats[season].mixed++;
        const year = startDate.getFullYear();
        episodesByYear.set(year, (episodesByYear.get(year) || 0) + 1);
      } else if (entry.moodLevel < 0) {
        if (isTrueEpisode) {
          depressiveEpisodes++;
          const season = getSeason(startDate);
          seasonalStats[season].total++;
          seasonalStats[season].depressive++;
          const year = startDate.getFullYear();
          episodesByYear.set(year, (episodesByYear.get(year) || 0) + 1);
        } else {
          subsyndromalFluctuations++;
        }
      } else if (entry.moodLevel > 0) {
        if (isTrueEpisode) {
          hypomanicEpisodes++;
          const season = getSeason(startDate);
          seasonalStats[season].total++;
          seasonalStats[season].hypomanic++;
          const year = startDate.getFullYear();
          episodesByYear.set(year, (episodesByYear.get(year) || 0) + 1);
        } else {
          subsyndromalFluctuations++;
        }
      } else {
        subsyndromalFluctuations++;
      }
    });

    const yearsWithRapidCycling: { year: number; count: number }[] = [];
    episodesByYear.forEach((count, year) => {
      if (count >= 4) yearsWithRapidCycling.push({ year, count });
    });
    yearsWithRapidCycling.sort((a, b) => b.year - a.year);

    const totalEpisodes = depressiveEpisodes + hypomanicEpisodes + mixedEpisodes;

    return {
      totalEpisodes,
      depressiveEpisodes,
      hypomanicEpisodes,
      mixedEpisodes,
      subsyndromalFluctuations,
      seasonalStats,
      rapidCycling: { hasRapidCycling: yearsWithRapidCycling.length > 0, yearsWithRapidCycling },
    };
  };

  const stats = calculateStats();

  const getEpisodeDates = () => {
    if (moodEntries.length === 0) return { firstEpisode: null, lastEpisode: null };
    const sortedEntries = [...moodEntries].sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    return {
      firstEpisode: new Date(sortedEntries[0].startDate),
      lastEpisode: new Date(sortedEntries[sortedEntries.length - 1].startDate),
    };
  };

  const episodeDates = getEpisodeDates();

  const getPercentage = (value: number) =>
    stats.totalEpisodes > 0 ? Math.round((value / stats.totalEpisodes) * 100) : 0;

  const getTotalEntriesPercentage = (value: number) => {
    const total = moodEntries.length;
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <div className="w-2 h-8 bg-blue-500 rounded-full mr-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Récapitulatif des Épisodes</h2>
      </div>

      {stats.totalEpisodes === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun épisode enregistré pour générer des statistiques.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Période de suivi */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Période de Suivi</p>
                <div className="mt-2">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">Premier épisode :</span>{" "}
                    {episodeDates.firstEpisode?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <span className="font-semibold">Dernier épisode :</span>{" "}
                    {episodeDates.lastEpisode?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Compteurs principaux */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Épisodes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEpisodes}</p>
                  <p className="text-xs text-gray-500">Intensité ≥3 + mixtes</p>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Dépressifs */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Épisodes Dépressifs</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.depressiveEpisodes}</p>
                  <p className="text-xs text-blue-500">{getPercentage(stats.depressiveEpisodes)}% du total</p>
                </div>
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Hypomanie/Manie */}
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Hypomanie / Manie</p>
                  <p className="text-2xl font-bold text-orange-700">{stats.hypomanicEpisodes}</p>
                  <p className="text-xs text-orange-500">{getPercentage(stats.hypomanicEpisodes)}% du total</p>
                </div>
                <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Épisodes mixtes */}
            <div className="bg-violet-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-600">Épisodes Mixtes</p>
                  <p className="text-2xl font-bold text-violet-700">{stats.mixedEpisodes}</p>
                  <p className="text-xs text-violet-500">{getPercentage(stats.mixedEpisodes)}% du total</p>
                </div>
                <div className="w-10 h-10 bg-violet-200 rounded-full flex items-center justify-center">
                  <span className="text-violet-600 text-lg font-bold">☯</span>
                </div>
              </div>
            </div>

            {/* Fluctuations subsyndromiques */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Fluctuations</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.subsyndromalFluctuations}</p>
                  <p className="text-xs text-yellow-500">{getTotalEntriesPercentage(stats.subsyndromalFluctuations)}% des entrées</p>
                </div>
                <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Hospitalisations */}
          {hospitalizations.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Hospitalisations</p>
                  <p className="text-2xl font-bold text-red-700">{hospitalizations.length}</p>
                  <p className="text-xs text-red-500">
                    {hospitalizations.length === 1 ? 'période enregistrée' : 'périodes enregistrées'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center">
                  <span className="text-lg">🏥</span>
                </div>
              </div>
            </div>
          )}

          {/* Analyse Saisonnière */}
          {stats.totalEpisodes > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Analyse Saisonnière</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(["spring", "summer", "autumn", "winter"] as const).map(season => {
                  const labels = { spring: "🌸 Printemps", summer: "☀️ Été", autumn: "🍂 Automne", winter: "❄️ Hiver" };
                  const subs = { spring: "Mars - Mai", summer: "Juin - Août", autumn: "Sept - Nov", winter: "Déc - Fév" };
                  const colors = { spring: "green", summer: "yellow", autumn: "orange", winter: "blue" };
                  const c = colors[season];
                  const d = stats.seasonalStats[season];
                  return (
                    <div key={season} className={`bg-${c}-50 rounded-lg p-4 text-center`}>
                      <p className={`text-sm font-medium text-${c}-600`}>{labels[season]}</p>
                      <p className={`text-xl font-bold text-${c}-700`}>{d.total}</p>
                      {d.total > 0 && (
                        <p className={`text-xs text-${c}-600 mt-1 space-x-1`}>
                          {d.depressive > 0 && <span className="text-blue-600">{d.depressive} dép.</span>}
                          {d.hypomanic > 0 && <span className="text-orange-600">{d.depressive > 0 ? ' / ' : ''}{d.hypomanic} exc.</span>}
                          {d.mixed > 0 && <span className="text-violet-600">{(d.depressive > 0 || d.hypomanic > 0) ? ' / ' : ''}{d.mixed} mix.</span>}
                        </p>
                      )}
                      <p className={`text-xs text-${c}-500 mt-1`}>{subs[season]}</p>
                    </div>
                  );
                })}
              </div>

              {stats.totalEpisodes >= 4 && (
                <div className="mt-4">
                  {(() => {
                    const maxSeason = Math.max(
                      stats.seasonalStats.spring.total,
                      stats.seasonalStats.summer.total,
                      stats.seasonalStats.autumn.total,
                      stats.seasonalStats.winter.total
                    );
                    const getDominantInfo = (season: keyof SeasonalStats, name: string) => {
                      const data = stats.seasonalStats[season];
                      if (data.total !== maxSeason || maxSeason === 0) return null;
                      const types = [];
                      if (data.depressive > 0) types.push(`${data.depressive} dépression${data.depressive > 1 ? 's' : ''}`);
                      if (data.hypomanic > 0) types.push(`${data.hypomanic} excitation${data.hypomanic > 1 ? 's' : ''}`);
                      if (data.mixed > 0) types.push(`${data.mixed} mixte${data.mixed > 1 ? 's' : ''}`);
                      return { name, total: data.total, types: types.join(' et ') };
                    };
                    const dominantSeasons = [
                      getDominantInfo('spring', 'printemps'),
                      getDominantInfo('summer', 'été'),
                      getDominantInfo('autumn', 'automne'),
                      getDominantInfo('winter', 'hiver'),
                    ].filter(Boolean) as { name: string; total: number; types: string }[];
                    const threshold = stats.totalEpisodes * 0.4;
                    const hasSeasonalPattern = maxSeason >= threshold && dominantSeasons.length <= 2;
                    return hasSeasonalPattern ? (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-sm text-purple-700">
                          Prédominance en {dominantSeasons.map(s => s.name).join(' et ')} ({maxSeason} épisodes : {dominantSeasons[0].types}, soit {Math.round((maxSeason / stats.totalEpisodes) * 100)}% du total)
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm text-gray-600">Pas de pattern saisonnier significatif détecté (répartition équilibrée)</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Cycles Rapides */}
          {stats.totalEpisodes > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Cycles Rapides</h3>
              {stats.rapidCycling.hasRapidCycling ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Caractéristique de cycles rapides détectée</p>
                      <p className="text-sm text-red-600 mb-2">Définition : ≥4 épisodes thymiques distincts au cours d'une même année</p>
                      <div className="space-y-1">
                        {stats.rapidCycling.yearsWithRapidCycling.map(({ year, count }) => (
                          <p key={year} className="text-sm text-red-700">
                            <span className="font-medium">{year}</span> : {count} épisodes
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-700">✓ Pas de caractéristique de cycles rapides</p>
                      <p className="text-sm text-green-600">Aucune année avec ≥4 épisodes thymiques détectée</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
