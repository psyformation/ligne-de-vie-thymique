# Ligne de Vie Thymique — Application de Bureau

## Prérequis

- **Node.js** v18 ou supérieur : https://nodejs.org
- **npm** (inclus avec Node.js)

## Installation des dépendances

```bash
cd electron-app
npm install
```

## Lancer l'application en mode développement

```bash
cd electron-app
npm start
```

## Compiler en exécutable

### Windows (.exe installeur)
```bash
npm run build:win
```
→ Génère `dist/Ligne de Vie Thymique Setup 1.0.0.exe`

### macOS (.dmg)
```bash
npm run build:mac
```
→ Génère `dist/Ligne de Vie Thymique-1.0.0.dmg`

### Linux (.AppImage)
```bash
npm run build:linux
```
→ Génère `dist/Ligne de Vie Thymique-1.0.0.AppImage`

## Notes importantes

- **Icône** : Placez vos fichiers d'icône dans `build/` :
  - `icon.ico` pour Windows (256×256 minimum)
  - `icon.icns` pour macOS
  - `icon.png` pour Linux (512×512 recommandé)
- **Compilation croisée** : Pour compiler un .exe depuis macOS/Linux, installez `wine` et `mono`. La compilation native sur l'OS cible est plus fiable.
- **Données** : Les données sont stockées dans `localStorage` de Chromium embarqué, dans le dossier de profil de l'application (AppData sur Windows, ~/Library sur macOS).

## Structure du projet

```
electron-app/
├── main.js          # Processus principal Electron (fenêtre, menu, IPC)
├── preload.js       # Pont sécurisé renderer ↔ main (contextBridge)
├── package.json     # Configuration de l'app et electron-builder
├── build/           # Icônes de l'application
│   └── icon.png
├── renderer/
│   ├── index.html   # Interface complète (Chart.js, formulaires, export)
│   └── lib/         # Bibliothèques JS embarquées (100% hors-ligne)
│       ├── chart.umd.min.js
│       ├── chartjs-adapter-date-fns.bundle.min.js
│       ├── chartjs-plugin-annotation.min.js
│       ├── hammer.min.js
│       ├── chartjs-plugin-zoom.min.js
│       ├── xlsx.full.min.js
│       ├── jspdf.umd.min.js
│       └── html2canvas.min.js
└── dist/            # Exécutables générés (après build)
```

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| Ctrl+E (⌘E) | Exporter Excel |
| Ctrl+I (⌘I) | Importer Excel |
| Ctrl+P (⌘P) | Exporter PDF |
| F11 | Plein écran |
| Ctrl+R | Recharger |
