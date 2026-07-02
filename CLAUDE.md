# Mémoire du projet

Ce fichier résume tout ce qui a été discuté et décidé jusqu'ici, pour reprendre le travail sans tout re-dériver. À tenir à jour à chaque décision importante.

## Le projet

Jeu de gestion solo, gratuit, déployé sur GitHub Pages (frontend uniquement, pas de backend).

**Thème : urbain / proche-futur.** Historique des revirements, du plus récent au plus ancien : sci-fi (trop peu d'assets fiables trouvés, cf. section Assets) → pivot vers un thème urbain/proche-futur pour exploiter à fond le pack Kenney RPG Urban Kit déjà intégré (riche, vérifié, CC0) plutôt que d'assembler des packs sci-fi plus faibles. Le thème définitif n'est pas encore intégré dans le code (le pack de contenu s'appelle toujours `demo`).

**Structure du jeu : à une seule échelle, PAS de paliers empilés.** Revirement majeur, acté et implémenté : la structure à N paliers d'échelle croissante du document de passation (`docs/jeu_gestion_paliers_passation.md`) a été **abandonnée** — l'utilisateur veut "un jeu simple qui ne scale pas". Remplacée par une économie à une seule échelle : bâtiments avec recette + capacité, stocks de ressources, vente automatique des biens finis, réinvestissement dans la capacité (voir section "Décisions d'architecture actées").

## Préférences de travail de l'utilisateur

- Veut **voir l'avancée côté frontend** régulièrement (captures d'écran du harnais de dev), même sans version jouable — ne pas attendre d'avoir "quelque chose de fini" pour montrer.
- A donné les droits de création/édition de fichiers sans confirmation systématique : voir `.claude/settings.json` (Write/Edit/MultiEdit autorisés, commandes npm/git courantes autorisées, opérations destructives bloquées).
- Valide par blocs de décision avant implémentation — poser des questions ciblées avant de coder une feature structurante plutôt que de trancher seul.
- Attend une vérification factuelle réelle avant une affirmation (cf. l'épisode Aske4 ci-dessous) — préférer "je ne suis pas sûr, voici ce que j'ai vérifié" à une confirmation non vérifiée.

## Décisions d'architecture actées

- **Stack** : TypeScript + Vite + Vitest.
- **Séparation stricte** : `src/engine/` (simulation, zéro dépendance UI/thème) / `src/presentation/` (rendu générique) / `src/content/<theme>/` (données spécifiques à un thème, y compris ses assets).
- **Moteur agnostique au thème** : graphe de recettes libre (pas de patron d'inputs/outputs imposé), **économie à une seule échelle** (pas de paliers — abandonnés, voir plus bas).
- `tick()` (`src/engine/simulation.ts`) : chaque `Building` (recette + capacité) produit selon le stock disponible — `unités = min(capacité, min sur chaque input de stock/quantité)`. Les ressources avec `sellPrice` sont auto-vendues en fin de tick (stock → argent, remis à zéro). Ordre du tableau `buildings` = ordre de consommation : un bâtiment antérieur peut affamer un bâtiment plus tardif compétant pour la même ressource — limitation connue et acceptée, pas un bug, pour une économie à une seule échelle.
- `invest()` (`src/engine/simulation.ts`) : dépense de l'argent pour augmenter la capacité d'un bâtiment ; plafonne silencieusement au montant abordable.
- Testé dans `simulation.test.ts` : production sans input, throttling par stock, production fractionnaire, vente automatique, un bâtiment qui en affame un autre, `invest()` (normal/plafonné/n'altère pas le pack immuable).
- `GameLoop` (`src/engine/gameLoop.ts`) : temps réel avec pause, vitesses x1/x2/x5. Inchangé par le revirement paliers → économie simple.
- **Rendu** : grille top-down simple (isométrique explicitement écarté — trop coûteux en solo). Tuiles affichées à **32×32 px**, mais les fichiers sources peuvent être plus petits (16×16 typique chez Kenney) : upscale net via `image-rendering: pixelated`, pas besoin de retravailler les fichiers.
- **Pipeline d'assets** (`src/presentation/assets.ts` + `tile.ts`) : type `ThemeAssets`/`SpriteRef`, fonction `renderTile()` avec **fallback placeholder coloré déterministe** (même id = même couleur) quand aucun sprite n'est mappé. `CREDITS.md` obligatoire pour toute source externe (auteur, lien, licence).
- **Déploiement** : GitHub Actions (`.github/workflows/deploy.yml`) → build + test → GitHub Pages, sur push vers `main`.

## Concept de jeu actuel : économie à une seule échelle

Remplace la structure à paliers du document de passation (voir section suivante). Bâtiments = recette (graphe libre d'inputs/outputs) + capacité ; stocks de ressources ; ressources marquées `sellPrice` vendues automatiquement chaque tick ; argent réinvesti dans la capacité des bâtiments via `invest()`. La profondeur vient d'ajouter des recettes/bâtiments à ce même niveau, pas de changer d'échelle.

Pack `demo` actuel (encore générique, sert à valider le moteur) : Bois/Pierre (bruts) → Planches/Briques (intermédiaires) → Meuble (bien vendu). 5 bâtiments : Lumberjack, Quarry, Sawmill, Brickworks, Workshop. Capacités volontairement déséquilibrées (Workshop capacité 6 mais Brickworks ne fournit que 3 briques/tick) pour garder vivant l'arbitrage capacité/flux qui faisait l'intérêt des paliers, même à une seule échelle.

**Non tranché** : mode de contrôle (grille spatiale / dashboard / automatisation — question ouverte depuis le document abandonné, jamais retranchée) ; palette de ressources/recettes définitive pour le thème urbain/proche-futur (le pack `demo` reste un brouillon mécanique, pas le contenu final) ; renommer le pack `demo` en pack thématique définitif.

## Concept de jeu — document de passation (ABANDONNÉ, gardé pour mémoire)

Source : `docs/jeu_gestion_paliers_passation.md` (fourni par l'utilisateur, co-écrit avec un autre agent avant cette session). **Abandonné** sur demande explicite de l'utilisateur ("un jeu simple qui ne scale pas") — pas de raison technique, un choix de scope/ambition. Le code correspondant (`resolveFlow()`, `ContentPack.tiers`) a été retiré et remplacé par l'économie à une seule échelle ci-dessus.

- **Empilement à flux continu** de N paliers — pas de pont/prestige, pas de reset. Chaque palier tourne en permanence et reste pertinent à optimiser jusqu'en fin de partie (contrairement à Spore/Civilization/Universal Paperclips où un palier antérieur devient cosmétique).
- **Sous-chaîne type par palier** (patron d'origine, pas une contrainte du moteur) : bruts (0 input) → 2 intermédiaires (2 inputs chacun) → 1 produit fini (3 inputs). Un seul produit exporté par palier, consommé à **deux endroits** du palier suivant (une fois via un intermédiaire, une fois en import direct dans la recette finale) — c'est ce qui rendait la formule de goulot non triviale.
- **Thème de travail initial du document** : industrie spatiale (Terre → système solaire/soleil → trou noir galactique, procédé de Penrose).

## Exploration de game design

- **Pharaoh** (Impressions Games, 1999) étudié en détail : walkers (agents mobiles, rayon de service, boucles de routes), évolution du logement par besoins cumulés, crue du Nil, monuments via guildes, commerce. **Décision : ne pas répliquer les walkers/pathfinding** (coût de dev solo trop élevé). Idée conservée : évolution par besoins cumulés + rayon de service **statique** façon SimCity/Two Point Hospital plutôt que des agents mobiles.
- **Taxonomie des genres de gestion** établie : city builders classiques, zonage auto-rempli, survie/colonie, tycoon/business, économie de production (Anno/Factorio), idle/incrémental, gestion sportive, agricole.
- **Boîte à outils de mécaniques** (avec coût de dev estimé) : placement libre, zonage auto-rempli, agents mobiles, évolution du logement, chaînes de production, cycle saisonnier, commerce import/export, désirabilité, objectifs de mission, événements aléatoires, budget/taxes.

## Assets — état actuel

**Intégré** : Kenney **RPG Urban Kit** (CC0, itch.io) — 9 tuiles copiées dans `src/assets/themes/demo/` au total ; après le passage à l'économie à une seule échelle, seules 4 sont actuellement référencées dans `src/content/demo/assets.ts` (bois→arbre, briques→brique, planches→caisse, meuble→caisse verte) ; `stone` (pierre) reste volontairement en placeholder, faute de sprite qui convienne, pour garder le chemin de repli visible. Les 5 fichiers non utilisés restent dans le dossier au cas où, sans être importés.

**Évalués pour le thème sci-fi (piste abandonnée, gardé pour mémoire si jamais reconsidérée)** :
| Pack | Vérifié | Verdict |
|---|---|---|
| Aske4 — Free Sci-Fi TileSet Space Station (32×32) | Image inspectée directement (pas juste le texte de la page) : sols/structures bien top-down, meubles dessinés de face (convention normale, comme RPG Urban Kit) | Pas de scène assemblée pour confirmer à 100% → confiance moyenne, acceptable pour un usage en icônes isolées |
| 0x72 — 16x16 Industrial Tileset | Licence CC0 confirmée sur la page | Probablement pensé pour un jeu de plateforme (vue de côté) mais sans impact pour un usage en icônes isolées |
| iAmTheHeartist — Sci-Fi Pixel Art Item Icons Pack (11 icônes) | Licence permissive confirmée (perso + commercial libres, attribution appréciée non obligatoire) | OK, variété limitée (11 icônes) |
| Sr.Natzu — [32x32] Icons Sci-Fi (62 icônes) | Licence **non trouvée** sur la page | Écarté — trop risqué sans licence claire |
| Atomic Realm — Industrial Tileset | Vérifié : side-scroller confirmé | Écarté pour un usage de carte, mais pourrait resservir en icônes isolées si besoin |
| Kenney — Space Kit | Vérifié : modèles 3D (OBJ/FBX/glTF), pas des sprites 2D | Écarté, ne correspond pas à notre stack de rendu |

**Raison de l'abandon de la piste sci-fi** : aucun pack trouvé n'égalait la richesse/fiabilité de RPG Urban Kit (480+ sprites, licence CC0 confirmée, scène assemblée vérifiée) — le meilleur candidat sci-fi (Aske4) restait à confiance moyenne, et les autres étaient soit limités en variété (11 icônes), soit de licence incertaine, soit pas du tout 2D. Plutôt que d'assembler plusieurs packs sci-fi imparfaits, décision d'exploiter à fond le pack déjà intégré et vérifié.

**Erreur à ne pas répéter** : la première recommandation d'Aske4 s'appuyait sur un résumé texte de la page (WebFetch) sans avoir regardé l'image — l'utilisateur a eu raison de douter. Toujours télécharger et inspecter visuellement l'aperçu avant de garantir qu'un pack convient (perspective, style), plutôt que de faire confiance à un résumé.

## Limitations d'environnement connues

- Le navigateur headless (Chromium/Playwright) de cet environnement **ne peut atteindre aucun site HTTPS externe** à travers le proxy réseau imposé (`ERR_CONNECTION_CLOSED` systématique, y compris sur `example.com` — testé avec plusieurs configurations). `curl`, lui, fonctionne très bien à travers ce même proxy. Conséquence pratique : impossible d'automatiser un téléchargement itch.io par navigateur (le flux de paiement/téléchargement est piloté en JS) → **demander à l'utilisateur de télécharger et déposer le fichier lui-même** plutôt que d'essayer de contourner.
- Les captures d'écran du serveur de dev **local** (`localhost`) fonctionnent normalement (pas de proxy nécessaire en loopback). Process utilisé : `npm run dev -- --port 5173 --strictPort` en arrière-plan, puis script Playwright avec `executablePath` explicite vers `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` et `NODE_PATH=/opt/node22/lib/node_modules` (Playwright est installé globalement, pas comme dépendance du projet).

## Fichiers clés

```
src/engine/{types,simulation,gameLoop}.ts   moteur, zéro dépendance thème/UI
src/engine/simulation.test.ts               valide tick()/invest() (9 tests)
src/presentation/{assets,tile}.ts           rendu générique + fallback placeholder
src/content/demo/{index,assets}.ts          pack de contenu (économie bois/pierre) + mapping sprites
src/assets/themes/demo/                     fichiers image du pack demo
src/main.ts                                 harnais de dev : tableau bâtiments + stocks (PAS l'UI finale)
CREDITS.md                                  licences des assets externes
.claude/settings.json                       permissions autonomes
.github/workflows/deploy.yml                déploiement GitHub Pages
```

## Prochaines étapes envisagées (non décidées)

- Renommer le pack `demo` en pack thématique définitif (urbain/proche-futur) et redéfinir ses ressources/recettes pour coller au thème plutôt qu'au brouillon mécanique actuel (bois/pierre/meuble).
- Trancher le mode de contrôle (grille spatiale / dashboard / automatisation) — question ouverte jamais retranchée depuis le document abandonné.
- Enrichir le moteur (plusieurs biens vendables, événements aléatoires, coûts de capacité progressifs...) une fois le contenu thématique posé.
- Éventuellement revoir l'ordre de traitement des bâtiments dans `tick()` (actuellement premier arrivé = premier servi) si ça devient un vrai problème d'équilibrage plutôt qu'un détail.
