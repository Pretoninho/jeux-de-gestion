# Mémoire du projet

Ce fichier résume tout ce qui a été discuté et décidé jusqu'ici, pour reprendre le travail sans tout re-dériver. À tenir à jour à chaque décision importante.

## Le projet

Jeu de gestion solo, gratuit, déployé sur GitHub Pages (frontend uniquement, pas de backend).

**Thème : science-fiction.** Tranché après avoir écarté un calque littéral de Pharaoh (trop coûteux en solo) et exploré plusieurs pistes ; le thème définitif n'est pas encore intégré dans le code (le pack de contenu s'appelle toujours `demo` et reste théoriquement neutre).

## Préférences de travail de l'utilisateur

- Veut **voir l'avancée côté frontend** régulièrement (captures d'écran du harnais de dev), même sans version jouable — ne pas attendre d'avoir "quelque chose de fini" pour montrer.
- A donné les droits de création/édition de fichiers sans confirmation systématique : voir `.claude/settings.json` (Write/Edit/MultiEdit autorisés, commandes npm/git courantes autorisées, opérations destructives bloquées).
- Valide par blocs de décision avant implémentation — poser des questions ciblées avant de coder une feature structurante plutôt que de trancher seul.
- Attend une vérification factuelle réelle avant une affirmation (cf. l'épisode Aske4 ci-dessous) — préférer "je ne suis pas sûr, voici ce que j'ai vérifié" à une confirmation non vérifiée.

## Décisions d'architecture actées

- **Stack** : TypeScript + Vite + Vitest.
- **Séparation stricte** : `src/engine/` (simulation, zéro dépendance UI/thème) / `src/presentation/` (rendu générique) / `src/content/<theme>/` (données spécifiques à un thème, y compris ses assets).
- **Moteur agnostique au thème** : graphe de recettes libre (pas de patron d'inputs/outputs imposé), **N paliers configurables** (pas figé à 3).
- `resolveFlow()` (`src/engine/simulation.ts`) : implémente la formule de goulot d'étranglement — `Besoin(N+1) = Σ des recettes de N+1 qui consomment l'export de N` ; `Efficacité = min(1, Débit_reçu / Besoin)` ; `Sortie_réelle = Capacité_construite × Efficacité`. Testé et validé contre l'exemple chiffré du document de passation (voir `simulation.test.ts`).
- `GameLoop` (`src/engine/gameLoop.ts`) : temps réel avec pause, vitesses x1/x2/x5.
- **Rendu** : grille top-down simple (isométrique explicitement écarté — trop coûteux en solo). Tuiles affichées à **32×32 px**, mais les fichiers sources peuvent être plus petits (16×16 typique chez Kenney) : upscale net via `image-rendering: pixelated`, pas besoin de retravailler les fichiers.
- **Pipeline d'assets** (`src/presentation/assets.ts` + `tile.ts`) : type `ThemeAssets`/`SpriteRef`, fonction `renderTile()` avec **fallback placeholder coloré déterministe** (même id = même couleur) quand aucun sprite n'est mappé. `CREDITS.md` obligatoire pour toute source externe (auteur, lien, licence).
- **Déploiement** : GitHub Actions (`.github/workflows/deploy.yml`) → build + test → GitHub Pages, sur push vers `main`.

## Concept de jeu — document de passation

Source : `docs/jeu_gestion_paliers_passation.md` (fourni par l'utilisateur, co-écrit avec un autre agent avant cette session).

- **Empilement à flux continu** de N paliers — pas de pont/prestige, pas de reset. Chaque palier tourne en permanence et reste pertinent à optimiser jusqu'en fin de partie (contrairement à Spore/Civilization/Universal Paperclips où un palier antérieur devient cosmétique).
- **Sous-chaîne type par palier** (patron d'origine, pas une contrainte du moteur) : bruts (0 input) → 2 intermédiaires (2 inputs chacun) → 1 produit fini (3 inputs). Un seul produit exporté par palier, consommé à **deux endroits** du palier suivant (une fois via un intermédiaire, une fois en import direct dans la recette finale) — c'est ce qui rend la formule de goulot non triviale.
- **Thème de travail initial du document** : industrie spatiale (Terre → système solaire/soleil → trou noir galactique, procédé de Penrose). Remplacé depuis par un choix de thème "sci-fi" plus large, pas forcément calé sur ces 3 paliers précis.
- **Questions ouvertes non tranchées** : palier terminal ou bouclé (l'énergie du dernier palier relève-t-elle le plafond des premiers ?) ; ratios de conversion exacts ; nombre de ressources brutes par palier à l'échelle ; **mode de contrôle par palier** (grille/dashboard/automatisation — envisagé puis mis de côté, non retranché depuis).

## Exploration de game design

- **Pharaoh** (Impressions Games, 1999) étudié en détail : walkers (agents mobiles, rayon de service, boucles de routes), évolution du logement par besoins cumulés, crue du Nil, monuments via guildes, commerce. **Décision : ne pas répliquer les walkers/pathfinding** (coût de dev solo trop élevé). Idée conservée : évolution par besoins cumulés + rayon de service **statique** façon SimCity/Two Point Hospital plutôt que des agents mobiles.
- **Taxonomie des genres de gestion** établie : city builders classiques, zonage auto-rempli, survie/colonie, tycoon/business, économie de production (Anno/Factorio), idle/incrémental, gestion sportive, agricole.
- **Boîte à outils de mécaniques** (avec coût de dev estimé) : placement libre, zonage auto-rempli, agents mobiles, évolution du logement, chaînes de production, cycle saisonnier, commerce import/export, désirabilité, objectifs de mission, événements aléatoires, budget/taxes.

## Assets — état actuel

**Intégré** : Kenney **RPG Urban Kit** (CC0, itch.io) — 9 tuiles copiées dans `src/assets/themes/demo/`, mappées sur des ids du pack `demo` dans `src/content/demo/assets.ts`. Les 9 autres ressources du pack demo restent en placeholder, volontairement, pour prouver que les deux chemins cohabitent.

**Évalués pour le thème sci-fi (pas encore intégrés)** :
| Pack | Vérifié | Verdict |
|---|---|---|
| Aske4 — Free Sci-Fi TileSet Space Station (32×32) | Image inspectée directement (pas juste le texte de la page) : sols/structures bien top-down, meubles dessinés de face (convention normale, comme RPG Urban Kit) | Pas de scène assemblée pour confirmer à 100% → confiance moyenne, acceptable pour un usage en icônes isolées (notre usage actuel) |
| 0x72 — 16x16 Industrial Tileset | Licence CC0 confirmée sur la page | Probablement pensé pour un jeu de plateforme (vue de côté) mais sans impact pour un usage en icônes isolées |
| iAmTheHeartist — Sci-Fi Pixel Art Item Icons Pack (11 icônes) | Licence permissive confirmée (perso + commercial libres, attribution appréciée non obligatoire) | OK, variété limitée (11 icônes) |
| Sr.Natzu — [32x32] Icons Sci-Fi (62 icônes) | Licence **non trouvée** sur la page | Écarté — trop risqué sans licence claire |
| Atomic Realm — Industrial Tileset | Vérifié : side-scroller confirmé | Écarté pour un usage de carte, mais pourrait resservir en icônes isolées si besoin |
| Kenney — Space Kit | Vérifié : modèles 3D (OBJ/FBX/glTF), pas des sprites 2D | Écarté, ne correspond pas à notre stack de rendu |

Aucun de ces packs sci-fi n'a encore été téléchargé/déposé par l'utilisateur — en attente avant intégration.

**Erreur à ne pas répéter** : la première recommandation d'Aske4 s'appuyait sur un résumé texte de la page (WebFetch) sans avoir regardé l'image — l'utilisateur a eu raison de douter. Toujours télécharger et inspecter visuellement l'aperçu avant de garantir qu'un pack convient (perspective, style), plutôt que de faire confiance à un résumé.

## Limitations d'environnement connues

- Le navigateur headless (Chromium/Playwright) de cet environnement **ne peut atteindre aucun site HTTPS externe** à travers le proxy réseau imposé (`ERR_CONNECTION_CLOSED` systématique, y compris sur `example.com` — testé avec plusieurs configurations). `curl`, lui, fonctionne très bien à travers ce même proxy. Conséquence pratique : impossible d'automatiser un téléchargement itch.io par navigateur (le flux de paiement/téléchargement est piloté en JS) → **demander à l'utilisateur de télécharger et déposer le fichier lui-même** plutôt que d'essayer de contourner.
- Les captures d'écran du serveur de dev **local** (`localhost`) fonctionnent normalement (pas de proxy nécessaire en loopback). Process utilisé : `npm run dev -- --port 5173 --strictPort` en arrière-plan, puis script Playwright avec `executablePath` explicite vers `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` et `NODE_PATH=/opt/node22/lib/node_modules` (Playwright est installé globalement, pas comme dépendance du projet).

## Fichiers clés

```
src/engine/{types,simulation,gameLoop}.ts   moteur, zéro dépendance thème/UI
src/engine/simulation.test.ts               valide la formule de goulot
src/presentation/{assets,tile}.ts           rendu générique + fallback placeholder
src/content/demo/{index,assets}.ts          pack de contenu + mapping sprites (encore neutre)
src/assets/themes/demo/                     fichiers image du pack demo
src/main.ts                                 harnais de dev (PAS l'UI finale)
CREDITS.md                                  licences des assets externes
.claude/settings.json                       permissions autonomes
.github/workflows/deploy.yml                déploiement GitHub Pages
```

## Prochaines étapes envisagées (non décidées)

- Choisir/télécharger les assets sci-fi définitifs et remplacer/renommer le pack `demo` par un pack thématique.
- Trancher le mode de contrôle par palier (grille spatiale / dashboard / automatisation) — question ouverte du document de passation, jamais retranchée depuis.
- Trancher palier terminal vs bouclé.
- Enrichir le moteur (stocks, événements aléatoires...) vs avancer sur le contenu thématique — arbitrage à faire avec l'utilisateur.
