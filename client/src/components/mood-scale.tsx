export default function MoodScale() {
  const scaleItems = [
    { level: 5, label: "Manie sévère", color: "bg-red-600", textColor: "text-red-800" },
    { level: 4, label: "Manie", color: "bg-red-500", textColor: "text-red-700" },
    { level: 3, label: "Hypomanie", color: "bg-orange-500", textColor: "text-orange-700" },
    { level: 2, label: "Humeur élevée", color: "bg-orange-400", textColor: "text-orange-600" },
    { level: 1, label: "Joie normale", color: "bg-orange-300", textColor: "text-orange-600" },
    { level: 0, label: "Euthymique", color: "bg-gray-400", textColor: "text-gray-700" },
    { level: -1, label: "Tristesse normale", color: "bg-blue-300", textColor: "text-blue-600" },
    { level: -2, label: "Humeur basse", color: "bg-blue-400", textColor: "text-blue-700" },
    { level: -3, label: "Dépression légère", color: "bg-blue-500", textColor: "text-blue-800" },
    { level: -4, label: "Dépression modérée", color: "bg-blue-600", textColor: "text-blue-900" },
    { level: -5, label: "Dépression sévère", color: "bg-blue-700", textColor: "text-blue-900" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <div className="flex items-center mb-6">
        <div className="w-2 h-8 bg-medical-blue rounded-full mr-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Échelle Thymique</h2>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="space-y-3">
          {scaleItems.map((item) => (
            <div key={item.level} className="flex items-center">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 bg-gray-200">
                <span className={item.level > 0 ? 'text-orange-700' : item.level < 0 ? 'text-blue-700' : 'text-gray-700'}>
                  {item.level > 0 ? `+${item.level}` : item.level}
                </span>
              </div>
              <div className={`w-3 h-3 rounded-full ${item.color} mr-3 flex-shrink-0`}></div>
              <span className={`text-sm ${item.textColor} font-medium leading-relaxed`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 text-center">
            <span className="font-semibold text-base">-5 à +5</span><br/>
            <span className="text-xs">0 = Euthymie (équilibre normal)</span>
          </p>
        </div>
      </div>
    </div>
  );
}