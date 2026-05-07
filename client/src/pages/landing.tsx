import { useState } from "react";
import { useLocation } from "wouter";
import { Stethoscope, UserRound } from "lucide-react";

function WelcomeModal({ onClose, onNavigate }: { onClose: () => void; onNavigate: (path: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden patient-fade-up">

        {/* Header band */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-7 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-1.5 h-10 bg-white/40 rounded-full" />
            <h1 className="text-xl font-bold text-white tracking-tight">Ligne de Vie Thymique</h1>
            <div className="w-1.5 h-10 bg-white/40 rounded-full" />
          </div>
          <p className="text-blue-100 text-sm leading-relaxed">
            Bienvenue ! Cet outil vous permet de retracer et visualiser l'évolution de votre humeur dans le temps.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-7 space-y-4">
          <p className="text-slate-600 text-sm text-center mb-5">
            Choisissez votre mode pour commencer :
          </p>

          {/* Patient button */}
          <button
            onClick={() => onNavigate("/patient")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-100 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-700 transition-colors">
              <UserRound className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">Mode patient</p>
              <p className="text-slate-500 text-xs leading-snug mt-0.5">
                Je construis ma ligne de vie guidé(e) par des questions simples, étape par étape.
              </p>
            </div>
            <span className="ml-auto text-blue-400 text-xl group-hover:translate-x-1 transition-transform">→</span>
          </button>

          {/* Practitioner button */}
          <button
            onClick={() => onNavigate("/praticien")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-green-100 bg-green-50 hover:border-green-300 hover:bg-green-100 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0 group-hover:bg-green-700 transition-colors">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">Mode praticien</p>
              <p className="text-slate-500 text-xs leading-snug mt-0.5">
                Outil clinique complet : épisodes, médicaments, hospitalisations, statistiques et exports.
              </p>
            </div>
            <span className="ml-auto text-green-500 text-xl group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <button
            onClick={onClose}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors pt-1"
          >
            Voir la page d'accueil
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [showWelcome, setShowWelcome] = useState(true);

  function handleNavigate(path: string) {
    setShowWelcome(false);
    navigate(path);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center px-4">

      {showWelcome && (
        <WelcomeModal
          onClose={() => setShowWelcome(false)}
          onNavigate={handleNavigate}
        />
      )}

      {/* Header */}
      <div className="text-center mb-14">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-2 h-14 bg-gradient-to-b from-blue-500 to-green-500 rounded-full" />
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 tracking-tight">
            Ligne de Vie Thymique
          </h1>
          <div className="w-2 h-14 bg-gradient-to-b from-green-500 to-purple-500 rounded-full" />
        </div>
        <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
          Un outil pour tracer vos fluctuations d'humeur au fil du temps
        </p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">

        {/* Patient mode */}
        <button
          onClick={() => navigate("/patient")}
          className="group relative bg-white rounded-2xl shadow-md border border-slate-200 p-8 text-left hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 mb-6 group-hover:bg-blue-100 transition-colors">
            <UserRound className="w-7 h-7 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Mode patient</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Je construis ma ligne de vie pas à pas, guidé(e) par des questions simples.
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-3 transition-all">
            Commencer
            <span className="text-base">→</span>
          </div>

          <div className="absolute bottom-5 right-6 flex gap-1.5 opacity-30 group-hover:opacity-60 transition-opacity">
            {[1,2,3].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-blue-400" />
            ))}
          </div>
        </button>

        {/* Clinician mode */}
        <button
          onClick={() => navigate("/praticien")}
          className="group relative bg-white rounded-2xl shadow-md border border-slate-200 p-8 text-left hover:shadow-xl hover:border-green-300 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50 border border-green-100 mb-6 group-hover:bg-green-100 transition-colors">
            <Stethoscope className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Mode praticien</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Outil clinique complet : épisodes, médicaments, substances, hospitalisations, statistiques et exports.
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 group-hover:gap-3 transition-all">
            Accéder
            <span className="text-base">→</span>
          </div>

          <div className="absolute bottom-5 right-6 flex gap-1 opacity-20 group-hover:opacity-50 transition-opacity">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-1.5 rounded-full bg-green-500`} style={{ height: `${8 + i * 4}px`, marginTop: 'auto' }} />
            ))}
          </div>
        </button>
      </div>

      <p className="mt-12 text-xs text-slate-400 text-center max-w-md">
        ⚠️ Outil d'aide au suivi — Consultez toujours un professionnel de santé pour un diagnostic médical
      </p>
    </div>
  );
}
