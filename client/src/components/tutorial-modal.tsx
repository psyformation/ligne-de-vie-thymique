import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, HelpCircle } from "lucide-react";

const TUTORIAL_KEY = "lvt_tutorial_seen_v1";

// ─── SVG Illustrations ─────────────────────────────────────────────────────

function IllustrationWelcome() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="220" fill="#f8fafc" rx="12" />
      {/* Header bar */}
      <rect width="400" height="38" fill="#e2e8f0" rx="0" />
      <rect x="12" y="10" width="18" height="18" rx="9" fill="#3b82f6" opacity="0.4" />
      <text x="38" y="23" fontSize="11" fontWeight="bold" fill="#1e3a5f" fontFamily="sans-serif">Ligne de Vie Thymique</text>
      {/* Chart zone */}
      <rect x="12" y="50" width="240" height="100" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
      {/* Y axis ticks */}
      {[0,1,2,3,4].map(i => (
        <line key={i} x1="30" y1={60 + i * 20} x2="248" y2={60 + i * 20} stroke="#e2e8f0" strokeWidth="0.8" />
      ))}
      {/* Mood line */}
      <path d="M35,100 Q70,80 85,85 Q100,90 115,77.5 Q130,65 145,70 Q160,75 175,92.5 Q190,110 205,102.5 Q220,95 232.5,90 L245,85"
        fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      {/* Zero line */}
      <line x1="30" y1="100" x2="248" y2="100" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />
      {/* +/- labels */}
      <text x="15" y="63" fontSize="7" fill="#64748b" fontFamily="sans-serif">+5</text>
      <text x="15" y="103" fontSize="7" fill="#64748b" fontFamily="sans-serif">0</text>
      <text x="15" y="143" fontSize="7" fill="#64748b" fontFamily="sans-serif">-5</text>
      {/* Med bar below chart */}
      <rect x="30" y="152" width="80" height="6" rx="3" fill="#22c55e" opacity="0.7" />
      <rect x="130" y="152" width="60" height="6" rx="3" fill="#a855f7" opacity="0.6" />
      {/* Right panels */}
      <rect x="262" y="50" width="126" height="45" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="270" y="57" width="50" height="5" rx="2" fill="#3b82f6" opacity="0.3" />
      <rect x="270" y="66" width="90" height="4" rx="2" fill="#e2e8f0" />
      <rect x="270" y="74" width="70" height="4" rx="2" fill="#e2e8f0" />
      <rect x="270" y="82" width="80" height="4" rx="2" fill="#e2e8f0" />
      <rect x="262" y="103" width="126" height="47" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="270" y="110" width="50" height="5" rx="2" fill="#22c55e" opacity="0.5" />
      <rect x="270" y="119" width="90" height="4" rx="2" fill="#e2e8f0" />
      <rect x="270" y="127" width="65" height="4" rx="2" fill="#e2e8f0" />
      <rect x="270" y="135" width="75" height="4" rx="2" fill="#e2e8f0" />
      {/* Stats band */}
      <rect x="12" y="165" width="376" height="44" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="22" y="175" width="40" height="24" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="32" y="191" fontSize="13" fontWeight="bold" fill="#3b82f6" fontFamily="sans-serif">12</text>
      <rect x="72" y="175" width="40" height="24" rx="4" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
      <text x="82" y="191" fontSize="13" fontWeight="bold" fill="#22c55e" fontFamily="sans-serif">4</text>
      <rect x="122" y="175" width="40" height="24" rx="4" fill="#faf5ff" stroke="#e9d5ff" strokeWidth="1" />
      <text x="131" y="191" fontSize="13" fontWeight="bold" fill="#a855f7" fontFamily="sans-serif">2</text>
      <text x="172" y="188" fontSize="8" fill="#64748b" fontFamily="sans-serif">Épisodes · Médicaments · Substances</text>
    </svg>
  );
}

function IllustrationEpisodes() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="220" fill="#f8fafc" rx="12" />
      {/* Form card */}
      <rect x="10" y="10" width="185" height="200" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1.2" />
      <rect x="18" y="18" width="90" height="7" rx="3" fill="#3b82f6" opacity="0.35" />
      {/* Date fields */}
      <text x="18" y="46" fontSize="7.5" fill="#64748b" fontFamily="sans-serif">Date de début</text>
      <rect x="18" y="50" width="78" height="14" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="22" y="60" fontSize="7" fill="#94a3b8" fontFamily="sans-serif">01/01/2024</text>
      <text x="105" y="46" fontSize="7.5" fill="#64748b" fontFamily="sans-serif">Date de fin</text>
      <rect x="105" y="50" width="78" height="14" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="109" y="60" fontSize="7" fill="#94a3b8" fontFamily="sans-serif">31/01/2024</text>
      {/* Slider */}
      <text x="18" y="82" fontSize="7.5" fill="#64748b" fontFamily="sans-serif">Niveau thymique</text>
      <rect x="18" y="86" width="165" height="6" rx="3" fill="#e2e8f0" />
      <rect x="18" y="86" width="90" height="6" rx="3" fill="#3b82f6" opacity="0.5" />
      <circle cx="108" cy="89" r="6" fill="#3b82f6" />
      <text x="100" y="108" fontSize="9" fontWeight="bold" fill="#3b82f6" fontFamily="sans-serif">+2</text>
      {/* Episode type badge */}
      <rect x="18" y="116" width="90" height="14" rx="7" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
      <text x="33" y="126" fontSize="7" fill="#1d4ed8" fontFamily="sans-serif">Fluct. d'excitation</text>
      {/* Trigger field */}
      <text x="18" y="146" fontSize="7.5" fill="#64748b" fontFamily="sans-serif">Facteurs déclenchants</text>
      <rect x="18" y="150" width="165" height="14" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="22" y="160" fontSize="7" fill="#94a3b8" fontFamily="sans-serif">Stress professionnel, manque de sommeil…</text>
      {/* Notes */}
      <text x="18" y="178" fontSize="7.5" fill="#64748b" fontFamily="sans-serif">Notes</text>
      <rect x="18" y="182" width="165" height="18" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      {/* Submit button */}
      <rect x="18" y="202" width="100" height="0" rx="3" fill="#3b82f6" />
      {/* Right: scale */}
      <rect x="205" y="10" width="88" height="200" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1.2" />
      <text x="215" y="26" fontSize="7.5" fontWeight="bold" fill="#1e3a5f" fontFamily="sans-serif">Échelle thymique</text>
      {[
        { y: 38, label: "+5 Manie sévère", color: "#ef4444" },
        { y: 58, label: "+4 Manie modérée", color: "#f97316" },
        { y: 78, label: "+3 Hypomanie", color: "#f59e0b" },
        { y: 98, label: "+2 Excitation légère", color: "#84cc16" },
        { y: 118, label: "0  Euthymie", color: "#22c55e" },
        { y: 138, label: "-2 Dépression légère", color: "#06b6d4" },
        { y: 158, label: "-3 Dépression mod.", color: "#3b82f6" },
        { y: 178, label: "-5 Dépression sév.", color: "#6366f1" },
      ].map(({ y, label, color }) => (
        <g key={y}>
          <rect x="212" y={y} width="6" height="14" rx="2" fill={color} opacity="0.8" />
          <text x="222" y={y + 10} fontSize="6.5" fill="#374151" fontFamily="sans-serif">{label}</text>
        </g>
      ))}
      {/* Right: history list */}
      <rect x="303" y="10" width="88" height="200" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1.2" />
      <text x="312" y="26" fontSize="7.5" fontWeight="bold" fill="#1e3a5f" fontFamily="sans-serif">Historique</text>
      {[
        { y: 35, type: "Ép. dépressif", color: "#3b82f6", level: "-4" },
        { y: 70, type: "Hypomanie", color: "#f97316", level: "+3" },
        { y: 105, type: "Fluct. dép.", color: "#64748b", level: "-2" },
        { y: 140, type: "Fluct. exc.", color: "#64748b", level: "+1" },
      ].map(({ y, type, color, level }) => (
        <g key={y}>
          <rect x="308" y={y} width="77" height="28" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="311" y={y + 3} width="4" height="22" rx="2" fill={color} opacity="0.7" />
          <text x="319" y={y + 11} fontSize="6.5" fontWeight="bold" fill="#374151" fontFamily="sans-serif">{type}</text>
          <text x="319" y={y + 21} fontSize="6" fill="#94a3b8" fontFamily="sans-serif">Jan 2024 · {level}</text>
        </g>
      ))}
    </svg>
  );
}

function IllustrationMedications() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="220" fill="#f8fafc" rx="12" />
      {/* Form card */}
      <rect x="10" y="10" width="175" height="200" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1.2" />
      <rect x="18" y="20" width="80" height="6" rx="3" fill="#22c55e" opacity="0.4" />
      <text x="18" y="18" fontSize="7.5" fontWeight="bold" fill="#166534" fontFamily="sans-serif">Ajouter un médicament</text>
      {/* Name */}
      <text x="18" y="46" fontSize="7" fill="#64748b" fontFamily="sans-serif">Nom du médicament</text>
      <rect x="18" y="50" width="155" height="13" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="22" y="60" fontSize="7" fill="#374151" fontFamily="sans-serif">Lithium 400mg</text>
      {/* Type */}
      <text x="18" y="77" fontSize="7" fill="#64748b" fontFamily="sans-serif">Type</text>
      <rect x="18" y="81" width="155" height="13" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="22" y="91" fontSize="7" fill="#374151" fontFamily="sans-serif">Thymorégulateur</text>
      {/* Dosage / freq */}
      <text x="18" y="108" fontSize="7" fill="#64748b" fontFamily="sans-serif">Posologie</text>
      <rect x="18" y="112" width="70" height="13" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="22" y="122" fontSize="7" fill="#374151" fontFamily="sans-serif">400mg</text>
      <text x="98" y="108" fontSize="7" fill="#64748b" fontFamily="sans-serif">Fréquence</text>
      <rect x="98" y="112" width="75" height="13" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="102" y="122" fontSize="7" fill="#374151" fontFamily="sans-serif">Quotidienne</text>
      {/* Dates */}
      <text x="18" y="140" fontSize="7" fill="#64748b" fontFamily="sans-serif">Début</text>
      <rect x="18" y="144" width="70" height="13" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="22" y="154" fontSize="7" fill="#374151" fontFamily="sans-serif">01/03/2023</text>
      <text x="98" y="140" fontSize="7" fill="#64748b" fontFamily="sans-serif">Fin (optionnel)</text>
      <rect x="98" y="144" width="75" height="13" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      {/* Notes */}
      <text x="18" y="172" fontSize="7" fill="#64748b" fontFamily="sans-serif">Notes</text>
      <rect x="18" y="176" width="155" height="20" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      {/* Button */}
      <rect x="60" y="200" width="70" height="0" rx="3" fill="#22c55e" />
      {/* Table */}
      <rect x="195" y="10" width="195" height="200" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1.2" />
      <text x="205" y="26" fontSize="7.5" fontWeight="bold" fill="#166534" fontFamily="sans-serif">Mes médicaments</text>
      {/* Header row */}
      <rect x="200" y="32" width="185" height="12" rx="2" fill="#f0fdf4" />
      <text x="204" y="41" fontSize="6" fill="#166534" fontFamily="sans-serif">Médicament</text>
      <text x="272" y="41" fontSize="6" fill="#166534" fontFamily="sans-serif">Dosage</text>
      <text x="315" y="41" fontSize="6" fill="#166534" fontFamily="sans-serif">Statut</text>
      {[
        { name: "Lithium 400mg", type: "Thymorégulateur", dose: "400mg/j", active: true, color: "#22c55e" },
        { name: "Quetiapine 50mg", type: "Antipsychotique", dose: "50mg/j", active: true, color: "#22c55e" },
        { name: "Venlafaxine 75mg", type: "Antidépresseur", dose: "75mg/j", active: false, color: "#94a3b8" },
      ].map(({ name, type, dose, active, color }, i) => (
        <g key={i}>
          <rect x="200" y={48 + i * 38} width="185" height="34" rx="3" fill={i % 2 === 0 ? "#f8fafc" : "#fff"} stroke="#e2e8f0" strokeWidth="0.5" />
          <rect x="203" y={51 + i * 38} width="3" height="28" rx="1.5" fill={color} opacity="0.8" />
          <text x="210" y={62 + i * 38} fontSize="7" fontWeight="bold" fill="#374151" fontFamily="sans-serif">{name}</text>
          <text x="210" y={72 + i * 38} fontSize="6" fill="#94a3b8" fontFamily="sans-serif">{type}</text>
          <text x="272" y={66 + i * 38} fontSize="7" fill="#374151" fontFamily="sans-serif">{dose}</text>
          <rect x="310" y={57 + i * 38} width="34" height="12" rx="6" fill={active ? "#dcfce7" : "#f1f5f9"} />
          <text x="318" y={66 + i * 38} fontSize="6" fill={active ? "#166534" : "#94a3b8"} fontFamily="sans-serif">{active ? "Actif" : "Arrêté"}</text>
        </g>
      ))}
    </svg>
  );
}

function IllustrationSubstances() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="220" fill="#f8fafc" rx="12" />
      {/* Form */}
      <rect x="10" y="10" width="175" height="200" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1.2" />
      <text x="18" y="25" fontSize="7.5" fontWeight="bold" fill="#6b21a8" fontFamily="sans-serif">Suivi des substances</text>
      <text x="18" y="46" fontSize="7" fill="#64748b" fontFamily="sans-serif">Substance</text>
      <rect x="18" y="50" width="155" height="13" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="22" y="60" fontSize="7" fill="#374151" fontFamily="sans-serif">Alcool</text>
      <text x="18" y="77" fontSize="7" fill="#64748b" fontFamily="sans-serif">Fréquence de consommation</text>
      {["Quotidienne", "Hebdomadaire", "Occasionnelle", "Festive"].map((f, i) => (
        <g key={i}>
          <circle cx="24" cy={92 + i * 16} r="4" fill={i === 1 ? "#a855f7" : "#e2e8f0"} />
          <text x="32" y={96 + i * 16} fontSize="7" fill="#374151" fontFamily="sans-serif">{f}</text>
        </g>
      ))}
      <text x="18" y="165" fontSize="7" fill="#64748b" fontFamily="sans-serif">Période</text>
      <rect x="18" y="169" width="70" height="13" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="22" y="179" fontSize="7" fill="#374151" fontFamily="sans-serif">01/2022</text>
      <rect x="98" y="169" width="75" height="13" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <text x="102" y="179" fontSize="7" fill="#94a3b8" fontFamily="sans-serif">En cours</text>
      {/* Table */}
      <rect x="195" y="10" width="195" height="200" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1.2" />
      <text x="205" y="26" fontSize="7.5" fontWeight="bold" fill="#6b21a8" fontFamily="sans-serif">Substances suivies</text>
      <rect x="200" y="32" width="185" height="12" rx="2" fill="#faf5ff" />
      <text x="204" y="41" fontSize="6" fill="#6b21a8" fontFamily="sans-serif">Substance</text>
      <text x="280" y="41" fontSize="6" fill="#6b21a8" fontFamily="sans-serif">Fréquence</text>
      <text x="345" y="41" fontSize="6" fill="#6b21a8" fontFamily="sans-serif">Statut</text>
      {[
        { name: "Alcool", freq: "Hebdomadaire", active: true },
        { name: "Tabac", freq: "Quotidienne", active: true },
        { name: "Cannabis", freq: "Occasionnelle", active: false },
      ].map(({ name, freq, active }, i) => (
        <g key={i}>
          <rect x="200" y={48 + i * 38} width="185" height="34" rx="3" fill={i % 2 === 0 ? "#f8fafc" : "#fff"} stroke="#e2e8f0" strokeWidth="0.5" />
          <rect x="203" y={51 + i * 38} width="3" height="28" rx="1.5" fill="#a855f7" opacity="0.7" />
          <text x="210" y={69 + i * 38} fontSize="7" fontWeight="bold" fill="#374151" fontFamily="sans-serif">{name}</text>
          <text x="280" y={69 + i * 38} fontSize="6.5" fill="#374151" fontFamily="sans-serif">{freq}</text>
          <rect x="340" y={60 + i * 38} width="34" height="12" rx="6" fill={active ? "#f3e8ff" : "#f1f5f9"} />
          <text x="348" y={69 + i * 38} fontSize="6" fill={active ? "#6b21a8" : "#94a3b8"} fontFamily="sans-serif">{active ? "Actif" : "Arrêté"}</text>
        </g>
      ))}
      {/* Note */}
      <rect x="200" y="168" width="185" height="34" rx="6" fill="#faf5ff" stroke="#e9d5ff" strokeWidth="1" />
      <text x="210" y="181" fontSize="7" fill="#6b21a8" fontFamily="sans-serif">Les substances apparaissent sur</text>
      <text x="210" y="192" fontSize="7" fill="#6b21a8" fontFamily="sans-serif">le graphique en barres violettes.</text>
    </svg>
  );
}

function IllustrationChart() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="220" fill="#f8fafc" rx="12" />
      <rect x="10" y="10" width="380" height="200" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1.2" />
      {/* Title */}
      <text x="20" y="28" fontSize="8" fontWeight="bold" fill="#1e3a5f" fontFamily="sans-serif">Ligne de Vie Thymique — graphique interactif</text>
      {/* Y axis */}
      {[0,1,2,3,4,5,6].map(i => {
        const y = 40 + i * 18;
        const label = (3 - i) > 0 ? `+${3-i}` : `${3-i}`;
        return (
          <g key={i}>
            <line x1="38" y1={y} x2="375" y2={y} stroke="#e2e8f0" strokeWidth="0.7" strokeDasharray={i===3?"4,3":"0"} />
            <text x="22" y={y + 4} fontSize="7" fill="#94a3b8" fontFamily="sans-serif">{label}</text>
          </g>
        );
      })}
      {/* Mood area */}
      <path d="M38,76 Q80,58 100,76 Q120,94 140,76 Q160,58 180,85 Q200,112 220,98.5 Q240,85 260,76 Q280,67 300,80.5 Q320,94 340,85 L360,76 L375,76 L375,148 L38,148 Z"
        fill="#3b82f6" opacity="0.08" />
      <path d="M38,76 Q80,58 100,76 Q120,94 140,76 Q160,58 180,85 Q200,112 220,98.5 Q240,85 260,76 Q280,67 300,80.5 Q320,94 340,85 L360,76"
        fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      {/* Data points */}
      {[38,80,120,160,200,240,280,320,360].map((x, i) => {
        const ys = [76,58,94,58,112,85,67,94,76];
        return <circle key={i} cx={x} cy={ys[i]} r="3.5" fill="#3b82f6" stroke="#fff" strokeWidth="1" />;
      })}
      {/* Med bars */}
      <rect x="38" y="155" width="120" height="9" rx="4.5" fill="#22c55e" opacity="0.7" />
      <text x="42" y="162.5" fontSize="6" fill="#fff" fontFamily="sans-serif">Lithium 400mg</text>
      <rect x="170" y="155" width="190" height="9" rx="4.5" fill="#22c55e" opacity="0.7" />
      <text x="174" y="162.5" fontSize="6" fill="#fff" fontFamily="sans-serif">Quetiapine 50mg</text>
      {/* Substance bars */}
      <rect x="38" y="169" width="330" height="7" rx="3.5" fill="#a855f7" opacity="0.5" />
      <text x="42" y="174.5" fontSize="5.5" fill="#fff" fontFamily="sans-serif">Alcool · Tabac</text>
      {/* Zoom hint */}
      <rect x="310" y="185" width="60" height="16" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="318" y="196" fontSize="6.5" fill="#3b82f6" fontFamily="sans-serif">🔍 Zoomer</text>
      {/* Legend */}
      <circle cx="20" cy="198" r="4" fill="#3b82f6" />
      <text x="27" y="201" fontSize="6" fill="#374151" fontFamily="sans-serif">Humeur</text>
      <rect x="70" y="194" width="10" height="6" rx="2" fill="#22c55e" opacity="0.7" />
      <text x="83" y="201" fontSize="6" fill="#374151" fontFamily="sans-serif">Médicament</text>
      <rect x="138" y="194" width="10" height="6" rx="2" fill="#a855f7" opacity="0.6" />
      <text x="151" y="201" fontSize="6" fill="#374151" fontFamily="sans-serif">Substance</text>
    </svg>
  );
}

function IllustrationStats() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="220" fill="#f8fafc" rx="12" />
      <text x="16" y="26" fontSize="8.5" fontWeight="bold" fill="#1e3a5f" fontFamily="sans-serif">Synthèse statistique automatique</text>
      {/* Stat cards row */}
      {[
        { x: 10, label: "Durée de suivi", value: "3 ans", sub: "2022 – 2025", bg: "#eff6ff", border: "#bfdbfe", val: "#3b82f6" },
        { x: 108, label: "Épisodes dépressifs", value: "7", sub: "dont 2 sévères", bg: "#eff6ff", border: "#bfdbfe", val: "#1d4ed8" },
        { x: 206, label: "Épisodes maniaques", value: "4", sub: "dont 1 sévère", bg: "#fff7ed", border: "#fed7aa", val: "#ea580c" },
        { x: 304, label: "Cycling rapide", value: "Oui", sub: "≥4 ép./an en 2023", bg: "#fef2f2", border: "#fecaca", val: "#dc2626" },
      ].map(({ x, label, value, sub, bg, border, val }) => (
        <g key={x}>
          <rect x={x} y="34" width="90" height="50" rx="6" fill={bg} stroke={border} strokeWidth="1" />
          <text x={x + 8} y="50" fontSize="6.5" fill="#64748b" fontFamily="sans-serif">{label}</text>
          <text x={x + 8} y="67" fontSize="16" fontWeight="bold" fill={val} fontFamily="sans-serif">{value}</text>
          <text x={x + 8} y="78" fontSize="6" fill="#94a3b8" fontFamily="sans-serif">{sub}</text>
        </g>
      ))}
      {/* Seasonal bars */}
      <text x="16" y="106" fontSize="7.5" fontWeight="bold" fill="#374151" fontFamily="sans-serif">Répartition saisonnière</text>
      {[
        { label: "Printemps", pct: 0.45, color: "#84cc16" },
        { label: "Été", pct: 0.15, color: "#f59e0b" },
        { label: "Automne", pct: 0.25, color: "#f97316" },
        { label: "Hiver", pct: 0.60, color: "#6366f1" },
      ].map(({ label, pct, color }, i) => (
        <g key={i}>
          <text x="16" y={124 + i * 20} fontSize="7" fill="#374151" fontFamily="sans-serif">{label}</text>
          <rect x="72" y={114 + i * 20} width="160" height="10" rx="5" fill="#e2e8f0" />
          <rect x="72" y={114 + i * 20} width={160 * pct} height="10" rx="5" fill={color} opacity="0.8" />
          <text x="238" y={123 + i * 20} fontSize="7" fill="#374151" fontFamily="sans-serif">{Math.round(pct * 100)}%</text>
        </g>
      ))}
      {/* Instability mention */}
      <rect x="260" y="100" width="130" height="100" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
      <text x="270" y="116" fontSize="7" fontWeight="bold" fill="#374151" fontFamily="sans-serif">Périodes d'instabilité</text>
      <text x="270" y="128" fontSize="6.5" fill="#64748b" fontFamily="sans-serif">Des périodes floues ou</text>
      <text x="270" y="139" fontSize="6.5" fill="#64748b" fontFamily="sans-serif">mixtes peuvent être</text>
      <text x="270" y="150" fontSize="6.5" fill="#64748b" fontFamily="sans-serif">tracées en zigzag gris</text>
      <polyline points="268,165 278,158 288,165 298,158 308,165 318,158 328,165 338,158 348,165 358,158 368,165 378,158 388,165"
        fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinejoin="round" />
      <text x="270" y="185" fontSize="6" fill="#94a3b8" fontFamily="sans-serif">Représentation zigzag</text>
    </svg>
  );
}

function IllustrationExport() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="220" fill="#f8fafc" rx="12" />
      <text x="16" y="26" fontSize="8.5" fontWeight="bold" fill="#1e3a5f" fontFamily="sans-serif">Export et partage des données</text>
      {/* PDF card */}
      <rect x="10" y="35" width="180" height="170" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1.2" />
      <rect x="18" y="44" width="30" height="8" rx="2" fill="#ef4444" opacity="0.2" />
      <text x="22" y="51" fontSize="7" fontWeight="bold" fill="#dc2626" fontFamily="sans-serif">PDF</text>
      <text x="56" y="51" fontSize="7" fontWeight="bold" fill="#374151" fontFamily="sans-serif">Rapport clinique complet</text>
      {/* Mini PDF preview */}
      <rect x="18" y="58" width="164" height="130" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      {/* Page 1 */}
      <rect x="24" y="64" width="70" height="90" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="0.8" />
      <rect x="27" y="68" width="64" height="8" rx="1" fill="#3b82f6" opacity="0.2" />
      <text x="30" y="74" fontSize="5" fill="#1d4ed8" fontFamily="sans-serif">Infos patient</text>
      <rect x="27" y="80" width="50" height="3" rx="1" fill="#e2e8f0" />
      <rect x="27" y="86" width="60" height="3" rx="1" fill="#e2e8f0" />
      <rect x="27" y="92" width="45" height="3" rx="1" fill="#e2e8f0" />
      <rect x="27" y="103" width="64" height="8" rx="1" fill="#22c55e" opacity="0.15" />
      <text x="30" y="109" fontSize="5" fill="#166534" fontFamily="sans-serif">Médicaments</text>
      <rect x="27" y="115" width="55" height="3" rx="1" fill="#e2e8f0" />
      <rect x="27" y="121" width="48" height="3" rx="1" fill="#e2e8f0" />
      <rect x="27" y="131" width="64" height="8" rx="1" fill="#3b82f6" opacity="0.15" />
      <text x="30" y="137" fontSize="5" fill="#1e3a5f" fontFamily="sans-serif">Épisodes</text>
      <rect x="27" y="143" width="60" height="3" rx="1" fill="#e2e8f0" />
      {/* Page 2 */}
      <rect x="102" y="64" width="74" height="90" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="0.8" />
      <rect x="105" y="68" width="68" height="6" rx="1" fill="#3b82f6" opacity="0.2" />
      <text x="108" y="74" fontSize="5" fill="#1d4ed8" fontFamily="sans-serif">Graphique ligne de vie</text>
      <path d="M107,90 Q117,82 122,85 Q127,88 132,83 Q137,78 142,85 Q147,92 152,88 Q157,84 162,85.5 Q167,87 170,85 L173,83"
        fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      <line x1="107" y1="90" x2="173" y2="90" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="2,2" />
      {/* Excel card */}
      <rect x="200" y="35" width="190" height="170" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1.2" />
      <rect x="208" y="44" width="35" height="8" rx="2" fill="#22c55e" opacity="0.2" />
      <text x="212" y="51" fontSize="7" fontWeight="bold" fill="#166534" fontFamily="sans-serif">Excel</text>
      <text x="251" y="51" fontSize="7" fontWeight="bold" fill="#374151" fontFamily="sans-serif">Interopérabilité</text>
      {/* Sheets list */}
      {[
        { label: "📋 Épisodes d'humeur", color: "#3b82f6" },
        { label: "💊 Médicaments", color: "#22c55e" },
        { label: "🧪 Substances", color: "#a855f7" },
        { label: "🏥 Hospitalisations", color: "#f97316" },
      ].map(({ label, color }, i) => (
        <g key={i}>
          <rect x="208" y={62 + i * 22} width="174" height="16" rx="4" fill={`${color}18`} stroke={`${color}40`} strokeWidth="1" />
          <text x="216" y={73 + i * 22} fontSize="7" fill="#374151" fontFamily="sans-serif">{label}</text>
        </g>
      ))}
      {/* Arrow import */}
      <rect x="208" y="158" width="174" height="38" rx="6" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
      <text x="216" y="171" fontSize="7" fontWeight="bold" fill="#166534" fontFamily="sans-serif">Import depuis l'outil clinique</text>
      <text x="216" y="182" fontSize="6.5" fill="#374151" fontFamily="sans-serif">Importez un fichier Excel généré par</text>
      <text x="216" y="191" fontSize="6.5" fill="#374151" fontFamily="sans-serif">l'outil de bilan clinique bipolaire.</text>
    </svg>
  );
}

// ─── Tutorial Steps ─────────────────────────────────────────────────────────

const steps = [
  {
    title: "Bienvenue sur la Ligne de Vie Thymique",
    subtitle: "Un outil pour suivre vos fluctuations d'humeur au fil du temps",
    description: "Cette application vous permet de tracer vos épisodes thymiques, vos traitements et vos habitudes de consommation sur une ligne du temps interactive. Tout s'intègre dans un graphique unique pour visualiser les corrélations.",
    illustration: IllustrationWelcome,
    color: "from-blue-600 to-blue-800",
    badge: "Vue d'ensemble",
  },
  {
    title: "Enregistrer un épisode thymique",
    subtitle: "Saisie des hauts et des bas",
    description: "Pour chaque épisode, indiquez les dates de début et de fin, puis positionnez le curseur entre -5 (dépression sévère) et +5 (manie sévère). Le type d'épisode est déterminé automatiquement. Vous pouvez aussi noter les facteurs déclenchants et des observations.",
    illustration: IllustrationEpisodes,
    color: "from-blue-500 to-indigo-700",
    badge: "Épisodes",
  },
  {
    title: "Suivre vos médicaments",
    subtitle: "Traitements et posologies",
    description: "Ajoutez chaque traitement avec son nom, sa posologie, sa fréquence et ses dates de prise. Les médicaments apparaissent ensuite sous forme de barres colorées sous le graphique d'humeur.",
    illustration: IllustrationMedications,
    color: "from-green-600 to-emerald-800",
    badge: "Médicaments",
  },
  {
    title: "Enregistrer les substances",
    subtitle: "Alcool, tabac, cannabis et autres",
    description: "Notez vos habitudes de consommation de substances avec leur fréquence (quotidienne, hebdomadaire, occasionnelle…) et la période concernée. Elles apparaissent en violet sous le graphique pour identifier leur impact éventuel sur l'humeur.",
    illustration: IllustrationSubstances,
    color: "from-purple-600 to-violet-800",
    badge: "Substances",
  },
  {
    title: "Explorer la ligne de vie",
    subtitle: "Graphique interactif avec zoom",
    description: "Le graphique central affiche simultanément votre courbe thymique, vos périodes de traitement et vos substances. Utilisez la molette de la souris pour zoomer sur une période, cliquez-glissez pour vous déplacer. Un bouton permet de réinitialiser le zoom.",
    illustration: IllustrationChart,
    color: "from-sky-600 to-blue-800",
    badge: "Graphique",
  },
  {
    title: "Synthèse statistique",
    subtitle: "Analyse automatique de vos données",
    description: "L'application calcule automatiquement la durée de suivi, le nombre d'épisodes dépressifs et maniaques, la répartition saisonnière et détecte le cycling rapide (≥4 épisodes par an). Les périodes d'instabilité floues s'affichent en zone grise.",
    illustration: IllustrationStats,
    color: "from-amber-600 to-orange-700",
    badge: "Statistiques",
  },
  {
    title: "Exporter vos données",
    subtitle: "PDF clinique et fichier Excel",
    description: "Générez un rapport PDF complet (informations patient, médicaments, tableau des épisodes, graphique) pour vos consultations. L'export Excel contient toutes vos données structurées par onglet, et peut être réimporté.",
    illustration: IllustrationExport,
    color: "from-rose-600 to-red-800",
    badge: "Export",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function TutorialModal() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(TUTORIAL_KEY);
    if (!seen) {
      setOpen(true);
    }
  }, []);

  function handleClose() {
    localStorage.setItem(TUTORIAL_KEY, "1");
    setOpen(false);
    setCurrent(0);
  }

  function handleOpen() {
    setCurrent(0);
    setOpen(true);
  }

  const step = steps[current];
  const Illustration = step.illustration;
  const isLast = current === steps.length - 1;

  return (
    <>
      {/* Help button always visible in header area */}
      <button
        onClick={handleOpen}
        title="Aide — Tutoriel"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/80 border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all text-sm font-medium shadow-sm"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Aide</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-0 shadow-2xl" style={{ maxHeight: "90vh" }}>
          <VisuallyHidden>
            <DialogTitle>Tutoriel — Ligne de Vie Thymique</DialogTitle>
            <DialogDescription>Guide de démarrage en {steps.length} étapes</DialogDescription>
          </VisuallyHidden>
          {/* Top gradient bar */}
          <div className={`bg-gradient-to-r ${step.color} px-6 pt-5 pb-4`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold mb-2 tracking-wide">
                  {step.badge} — étape {current + 1}/{steps.length}
                </span>
                <h2 className="text-white font-bold text-xl leading-tight">{step.title}</h2>
                <p className="text-white/75 text-sm mt-0.5">{step.subtitle}</p>
              </div>
              <button
                onClick={handleClose}
                className="ml-4 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 pt-4 pb-5">
            {/* Illustration */}
            <div className="w-full h-44 mb-4 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
              <Illustration />
            </div>

            {/* Description */}
            <p className="text-slate-600 text-sm leading-relaxed mb-5">{step.description}</p>

            {/* Progress dots + navigation */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all ${
                      i === current
                        ? "w-5 h-2 bg-blue-600"
                        : "w-2 h-2 bg-slate-200 hover:bg-slate-300"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {current > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrent(c => c - 1)}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Précédent
                  </Button>
                )}
                {isLast ? (
                  <Button size="sm" onClick={handleClose} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Commencer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setCurrent(c => c + 1)}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                  >
                    Suivant <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
