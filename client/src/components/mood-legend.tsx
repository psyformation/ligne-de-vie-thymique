const moodScaleItems = [
  { level: -5, label: "Dépression Sévère", color: "bg-mood-depression-severe" },
  { level: -4, label: "Dépression Sévère", color: "bg-mood-depression-severe" },
  { level: -3, label: "Dépression Modérée", color: "bg-mood-depression-moderate" },
  { level: -2, label: "Fluctuation subsyndromique", color: "bg-mood-euthymie" },
  { level: -1, label: "Euthymie", color: "bg-mood-euthymie" },
  { level: 0, label: "Euthymie (Humeur Stable)", color: "bg-mood-euthymie" },
  { level: 1, label: "Euthymie", color: "bg-mood-euthymie" },
  { level: 2, label: "Fluctuation subsyndromique", color: "bg-mood-euthymie" },
  { level: 3, label: "Hypomanie", color: "bg-mood-hypomanie" },
  { level: 4, label: "Manie", color: "bg-mood-manie" },
  { level: 5, label: "Manie", color: "bg-mood-manie" },
];

export default function MoodLegend() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <div className="w-2 h-8 bg-medical-blue rounded-full mr-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Échelle d'Humeur</h2>
      </div>
      
      <div className="space-y-3">
        {moodScaleItems.map((item) => (
          <div key={item.level} className="flex items-center space-x-3 py-2">
            <span className={`w-8 h-8 flex items-center justify-center rounded-full ${item.color} text-white text-sm font-semibold`}>
              {item.level > 0 ? `+${item.level}` : item.level}
            </span>
            <span className="text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Visual elements legend */}
      <div className="mt-6 border-t border-gray-100 pt-5 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Éléments visuels du graphique</p>

        {/* Subsyndromic zone */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-md border border-yellow-300 bg-yellow-100 flex items-center justify-center">
            <span className="text-yellow-600 text-xs font-bold">±2</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Fluctuations subsyndromiques</p>
            <p className="text-xs text-gray-500 leading-snug mt-0.5">
              Zone jaune de −2 à +2 : humeur fluctuante sous le seuil des épisodes caractérisés, sans critère diagnostique plein.
            </p>
          </div>
        </div>

        {/* Instability periods */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-md border border-gray-300 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 text-xs">▬</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Période d'instabilité thymique</p>
            <p className="text-xs text-gray-500 leading-snug mt-0.5">
              Bloc gris sur le graphique : phase de fluctuations marquées de l'humeur sans polarité clairement dépressive ou maniaque.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Conseil d'utilisation :</span>{" "}
          Saisissez la date de début de l'épisode et optionnellement la date de fin. Laissez la date de fin vide pour les épisodes en cours.
        </p>
      </div>
    </div>
  );
}
