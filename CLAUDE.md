# Mémoire du projet

Ce fichier résume tout ce qui a été discuté et décidé jusqu'ici, pour reprendre le travail sans tout re-dériver. À tenir à jour à chaque décision importante.

## Le projet

Jeu de gestion solo, gratuit, déployé sur GitHub Pages (frontend uniquement, pas de backend).

**Thème : urbain / proche-futur.** Historique des revirements, du plus récent au plus ancien : sci-fi (trop peu d'assets fiables trouvés, cf. section Assets) → pivot vers un thème urbain/proche-futur pour exploiter à fond le pack Kenney RPG Urban Kit déjà intégré (riche, vérifié, CC0) plutôt que d'assembler des packs sci-fi plus faibles. Le pack de contenu s'appelle maintenant `urban` (`src/content/urban/`) ; premier angle thématique (logistique) implémenté, voir section "Concept de jeu actuel".

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
- **Placement spatial** : chaque pack définit des `BuildingType` (recette + capacité + coût de construction + `footprint?: {width,height}` optionnel, défaut 1x1) et une `grid: { width, height }`. `build()` (`src/engine/simulation.ts`) place une instance dont `(x,y)` est le coin haut-gauche de son empreinte (vérifie que **tout le rectangle** est dans les limites + libre + argent suffisant, via `rectsOverlap()` contre l'empreinte de chaque bâtiment déjà posé) ; `EconomyState.placedBuildings` liste les instances posées (id, type, x, y) — la taille n'est pas dupliquée dans l'instance, elle se déduit du type via `footprintOf()`. `buildingAt(pack, state, x, y)` trouve le bâtiment (s'il y en a un) dont l'empreinte couvre une case donnée, pas seulement son origine. **Empreintes variables IMPLÉMENTÉES** (ex. `comm-luxury-shopfront` en 3x3, `src/content/urban/index.ts`) — reste volontairement non fait : caméra/scroll, démolition/déplacement, aperçu de la zone constructible au survol avant de cliquer (le clic échoue silencieusement si l'empreinte ne rentre pas, même limitation UX que l'existant sur case occupée/argent insuffisant).
- `tick()` (`src/engine/simulation.ts`) : chaque bâtiment **placé** produit selon le stock disponible — `unités = min(capacité, min sur chaque input de stock/quantité)`. Les ressources avec `sellPrice` sont auto-vendues en fin de tick (stock → argent, remis à zéro). Ordre de `placedBuildings` (= ordre de placement) = ordre de consommation : un bâtiment placé plus tôt peut affamer un bâtiment placé plus tard compétant pour la même ressource — limitation connue et acceptée, pas un bug.
- Testé dans `simulation.test.ts` (10 tests) : `build()` (place/case occupée/hors limites/pas assez d'argent/type inconnu), `tick()` (production sans input, throttling par stock, un bâtiment qui en affame un autre, vente automatique, pack immuable).
- `GameLoop` (`src/engine/gameLoop.ts`) : temps réel avec pause, vitesses x1/x2/x5. Inchangé par les revirements successifs.
- **Rendu** : grille top-down simple (isométrique explicitement écarté — trop coûteux en solo). Tuiles affichées à **32×32 px**, mais les fichiers sources peuvent être plus petits (16×16 typique chez Kenney) : upscale net via `image-rendering: pixelated`, pas besoin de retravailler les fichiers. Les types de bâtiments réutilisent le sprite de leur ressource principale comme icône sur la grille (pas de tuiles "bâtiment" dédiées extraites du pack pour l'instant).
- **Pipeline d'assets** (`src/presentation/assets.ts` + `tile.ts`) : type `ThemeAssets`/`SpriteRef`, fonction `renderTile()` avec **fallback placeholder coloré déterministe** (même id = même couleur) quand aucun sprite n'est mappé. `CREDITS.md` obligatoire pour toute source externe (auteur, lien, licence).
- **Sol de la grille (IMPLÉMENTÉ)** : `ThemeAssets` a un champ `ground?: SpriteRef` (pas indexé par id d'entité, une seule valeur pour toute la grille) peint comme `background-image` CSS de chaque `.grid-cell` ; le bâtiment posé, s'il y en a un, se dessine par-dessus via l'élément `.tile` habituel. `spriteToCss()` (extrait de `renderTile()`) mutualise le calcul CSS multi-calques entre les deux usages. Pack `urban` : un seul tile plat (`rpg-urban-kit/tile_0037`, pavé gris neutre) réutilisé sur toute la grille — pas de variation de terrain (route/herbe/trottoir) pour l'instant, cohérent avec le scope v1 modeste ; variation possible plus tard sans changer le moteur.
- **La grille se met à jour par re-rendu complet, pas par diff incrémental** : `build()` retourne un résultat, et en cas de succès `main.ts` appelle `render()` qui vide `#grid` (`innerHTML = ''`) et reconstruit les 64 cases depuis `state.placedBuildings`. Aucune mécanique séparée à ajouter pour qu'un nouvel élément posé apparaisse — c'est déjà automatique à ce stade (petite grille fixe, coût négligeable). À revisiter uniquement si la grille grandit beaucoup (grille scrollable prévue plus tard, voir "Prochaines étapes").
- **Déploiement** : GitHub Actions (`.github/workflows/deploy.yml`) → build + test → GitHub Pages, sur push vers `main`.

## Concept de jeu actuel : économie à une seule échelle

Remplace la structure à paliers du document de passation (voir section suivante). `BuildingType` = recette (graphe libre d'inputs/outputs) + capacité + coût de construction ; le joueur **place** des instances sur une grille via `build()` (voir "Mode de contrôle" ci-dessous) ; stocks de ressources ; ressources marquées `sellPrice` vendues automatiquement chaque tick. La profondeur vient d'ajouter des recettes/types de bâtiments à ce même niveau, pas de changer d'échelle.

Pack `urban` (`src/content/urban/`, ex-`demo`, renommé), deux angles implémentés côte à côte, chacun préfixé et totalement indépendant de l'autre :
- **Logistique** (`logi-`) : Ferraille/Matériaux (bruts) → Pièces détachées/Emballages (intermédiaires) → Colis livré (bien vendu). 5 types de bâtiments : Casse auto, Entrepôt, Atelier de réparation, Centre d'emballage, Centre de livraison. Capacités volontairement déséquilibrées (Centre de livraison capacité 6 mais Centre d'emballage ne fournit que 3 emballages/tick) pour garder vivant l'arbitrage capacité/flux qui faisait l'intérêt des paliers, même à une seule échelle.
- **Commerce** (`comm-`) : Marchandises (brut) → Vitrine garnie (intermédiaire) → Vente (vendu). 3 types de bâtiments : Grossiste, Vitrine, Caisse. Chaîne volontairement plus courte que la logistique (1 seul brut, pas de convergence à 2 branches) — preuve que les angles n'ont pas besoin de la même profondeur.

Les deux angles tournent en parallèle dans le même `tick()`, chacun avec son propre argent cumulé (`state.money` est partagé, alimenté par les deux ventes). Grille du pack : 8×8, argent de départ 150 dans le harnais de dev (`src/main.ts`).

**Mode de contrôle : grille spatiale avec placement — IMPLÉMENTÉ (v1 modeste).** Historique : d'abord tranché "dashboard, pas de grille" (raisonnement : éviter le gros chantier caméra/collisions, cohérent avec "jeu simple qui ne scale pas"). En expliquant ce choix, la distinction n'a pas été assez claire : "dashboard" a été présenté comme "pas de carte à la Pharaoh" sans dire explicitement que ça supprimait *toute* mécanique de construction (même un simple bouton "construire" sans carte). L'utilisateur pensait donc que la construction/placement restait possible en mode dashboard — ce n'était pas le cas, d'où le revirement une fois le malentendu clarifié.

**Implémenté** : le joueur sélectionne un type de bâtiment dans une palette (`src/main.ts`), clique une case vide de la grille pour le construire (`build()`). Rendu en `<div>` CSS grid, chaque case affiche `renderTile()` (sprite ou placeholder). Testé de bout en bout en interactif via Playwright (sélection palette → clic case → production/vente réelles observées).

**Ambition demandée vs scope retenu pour la v1** : l'utilisateur voulait au départ carte scrollable avec caméra + empreintes de bâtiments variables (2x2, 1x3...) + construction ET démolition dès le départ — un vrai chantier de city-builder complet. Après avoir nommé la tension avec le cap "jeu simple qui ne scale pas", **décision : phaser (option 2 choisie explicitement)**. La v1 implémentée reste volontairement modeste :
- Grille **petite et fixe** (pas de scroll/caméra/pan) ;
- Empreinte **1x1 partout** *(dépassé, voir ci-dessous)* ;
- **Construction uniquement**, pas de démolition/déplacement.

**Empreintes variables implémentées** (revirement partiel sur le point ci-dessus, déclenché par une question de l'utilisateur sur l'outil). `BuildingType.footprint?: {width,height}` (défaut 1x1) ; `build()` valide tout le rectangle (bornes + chevauchement contre les empreintes des bâtiments déjà posés, `rectsOverlap()`) ; rendu (`src/main.ts`) : une case couverte par un bâtiment mais qui n'est pas son origine est **sautée** dans la boucle de rendu (aucun nœud DOM émis) — le placement automatique de CSS Grid (`grid-auto-flow: row` par défaut, sans lignes explicites) comble alors correctement l'espace autour de la case d'origine, qui porte `grid-column: span W; grid-row: span H` et un `.tile` en `fill: true` (100%×100%) pour étirer l'icône sur tout le rectangle. `renderTile()` accepte un 4e paramètre `fill` pour ce cas. Testé dans `simulation.test.ts` (4 tests : pose 2x2 occupe toutes ses cases, refus hors-limites, refus si chevauchement avec un 1x1 existant, un bâtiment suivant peut se poser à côté sans chevaucher). Preuve de concept en jeu : `comm-luxury-shopfront` (Vitrine de luxe, pack `urban`) en 3x3, capacité/coût réajustés à la louche (x5, proportionnel aux 9 cases) — chiffres à retravailler au jugé une fois testé en jeu.

Caméra, démolition/déplacement et **aperçu au survol de la zone constructible avant de cliquer** (le clic échoue silencieusement si l'empreinte ne rentre pas — même limitation UX que case occupée/argent insuffisant) restent **prévus plus tard**, pas abandonnés, juste reportés.

**Leçon retenue** : être explicite sur *toutes* les mécaniques qu'un choix élimine, pas seulement la plus évidente, avant de faire valider une décision structurante.

**Contenu thématique : construit par angles successifs, ajoutés au même pack.** Un "angle" = une chaîne de ressources/recettes/bâtiments cohérente (ex. logistique, commerce). Comme l'économie est à une seule échelle, ajouter un angle ne modifie jamais le moteur — juste de nouvelles entrées dans les tableaux `resources`/`recipes`/`buildings` du pack. Convention : préfixer les ids de ressources/recettes/bâtiments par angle (`logi-...`) pour éviter les collisions quand plusieurs angles cohabiteront dans le même pack.

Feuille de route des angles (catalogués à partir du contenu réel de RPG Urban Kit — routes, façades de commerces, eau/fontaines, arbres, véhicules, personnages, caisses/coffres/outils/lampadaires/clôtures/torches) :

| Angle | Statut | Ressources | Bâtiments | Sprites déjà en local |
|---|---|---|---|---|
| **Logistique** | **Implémenté** | Ferraille, Matériaux → Pièces détachées, Emballages → Colis livré (vendu) | Casse auto, Entrepôt, Atelier de réparation, Centre d'emballage, Centre de livraison | wrench, crate, greenCrate, truck (pièces détachées reste en placeholder, pas de bon sprite) |
| **Commerce de quartier** | **Implémenté** | Marchandises → Vitrine garnie → Vente | Grossiste, Vitrine, Caisse | shelf (tile_0328), market stall (tile_0276), safe (tile_0444) — tous mappés, pas de placeholder sur cet angle |
| Artisanat/mobilier | Non commencé | Bois, Tissu → Meuble brut → Meuble fini | Menuiserie, Atelier de finition | tree, greenCrate (à réattribuer si activé, actuellement utilisés par la logistique) |
| Construction/BTP | Non commencé | Pierre, Métal → Briques, Structures → Chantier livré | Carrière, Fonderie, Chantier | brick |
| Espaces verts/désirabilité | Non commencé | pas une chaîne de production — multiplicateur passif sur les ventes selon arbres/fontaines placés | — | tree, fontaine pas encore extraite |
| Mobilité/transport | Non commencé | Carburant → Trajets effectués (taxi/livraison courte distance) | Garage, Station | truck, voitures pas encore extraites |

Pack renommé `demo` → `urban` (dossiers `src/content/urban/` et `src/assets/themes/urban/`).

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

**Intégré** : Kenney **RPG Urban Kit** (CC0, itch.io) — 12 tuiles dans `src/assets/themes/urban/` au total ; 7 référencées dans `src/content/urban/assets.ts` : angle logistique (ferraille→wrench, matériaux→crate, emballages→greenCrate, colis livré→truck ; `logi-parts` reste volontairement en placeholder, faute de sprite qui convienne) et angle commerce (marchandises→shelf tile_0328, vitrine garnie→market-stall tile_0276, vente→safe tile_0444, tous mappés). Les tuiles `brick`/`tree` restent en local mais non importées (récupérables pour un futur angle, ex. construction/artisanat).

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

**Icônes de bâtiment (Casse auto etc.) : actuellement des placeholders de ressource, pas de vraies icônes de bâtiment.** Constat de l'utilisateur : le sprite "Casse auto" (réutilise l'icône wrench de sa ressource produite) ne ressemble pas à une casse auto. Recherché des packs dédiés "une icône = un bâtiment entier" — **aucun trouvé qui convienne** :
| Piste | Verdict |
|---|---|
| Kenney — City Kit (Industrial) | Modèles 3D, pas des sprites 2D |
| Kenney — Sketch Town | Kit de composition par tuiles (+ isométrique), pas des icônes autonomes |
| Cozy Village Shop Buildings (MutterPixel Studio) | De vrais bâtiments en sprite unique mais **payant** et thème "cozy médiéval", à l'opposé de l'urbain/proche-futur |
| RPG Urban Kit lui-même (re-vérifié en détail) | Confirmé : aucune tuile ne représente un bâtiment complet, uniquement des éléments de façade (murs/portes/fenêtres séparés) — c'est un kit de composition, pas d'icônes |

**Constat général** : les icônes "un sprite = un bâtiment reconnaissable" sont rares en gratuit ; la plupart des kits (dont RPG Urban Kit) composent les bâtiments à partir de plusieurs tuiles.

**Décision actée et IMPLÉMENTÉE** : option 2 retenue puis codée — composer une icône en empilant **N sprites** (nombre libre, pas figé à 2) via `ThemeAssets`/`renderTile()` étendus (`SpriteRef` accepte maintenant `kind: 'composite'` avec `layers: FlatSpriteRef[]`, peint en CSS multi-background). Exemple validé : `logi-scrapyard` (Casse auto) recompose mur (`tile_0100`) + porte (`tile_0096`) au lieu du sprite `wrench` de sa ressource.

**Outil de dev créé pour ça : `tools/asset-composer/`** (accès via `npm run dev` → `/tools/asset-composer/index.html`). Fonctionnalités :
- Parcourt les tuiles par "kit" (dossiers de `tools/asset-composer/tiles/<kit>/` — le catalogue complet des 486 tuiles RPG Urban Kit y est rapatrié sous `rpg-urban-kit/`, pas seulement les 12 déjà utilisées dans le jeu).
- **Import de nouveaux kits** directement depuis l'outil (nom + sélection de fichiers PNG) — demandé explicitement par l'utilisateur, pas juste une bibliothèque figée.
- Composition par calques en nombre libre, avec réordonnancement et aperçu en direct.
- Association à un id du pack (`Resource.id`/`BuildingType.id`, autocomplété depuis `urbanPack`).
- **Écrit directement dans `src/content/urban/assets.ts`** — demandé explicitement par l'utilisateur plutôt qu'un simple copier-coller. Un point d'API Vite (`configureServer`, donc actif uniquement en `npm run dev`, jamais dans le site déployé) copie les fichiers utilisés dans `src/assets/themes/urban/<kit>/` et régénère les imports + entrées `sprites` dans une section délimitée par des marqueurs (`// asset-composer:imports:start/end`, `// asset-composer:sprites:start/end`) — tout le reste du fichier reste intouché.
- Vérifié de bout en bout via Playwright : composition mur+porte → assignation à `logi-scrapyard` → enregistrement → fichier réécrit correctement → jeu affiche la nouvelle icône.

**Piège rencontré et à anticiper** : si l'id composé existe déjà comme entrée manuscrite ailleurs dans `assets.ts` (ex. `logi-scrapyard` avait `{ kind: 'image', src: wrench }` en dur), l'enregistrement crée une **clé dupliquée** dans l'objet `sprites` — TypeScript refuse de compiler (`TS1117`, erreur détectée à la compilation, pas silencieuse). Il faut retirer l'ancienne entrée à la main après usage de l'outil. Pas automatisé (risque trop élevé de casser du code écrit à la main en essayant de le parser/supprimer automatiquement) — accepté comme limitation connue.

## Limitations d'environnement connues

- Le navigateur headless (Chromium/Playwright) de cet environnement **ne peut atteindre aucun site HTTPS externe** à travers le proxy réseau imposé (`ERR_CONNECTION_CLOSED` systématique, y compris sur `example.com` — testé avec plusieurs configurations). `curl`, lui, fonctionne très bien à travers ce même proxy. Conséquence pratique : impossible d'automatiser un téléchargement itch.io par navigateur (le flux de paiement/téléchargement est piloté en JS) → **demander à l'utilisateur de télécharger et déposer le fichier lui-même** plutôt que d'essayer de contourner.
- Les captures d'écran du serveur de dev **local** (`localhost`) fonctionnent normalement (pas de proxy nécessaire en loopback). Process utilisé : `npm run dev -- --port 5173 --strictPort` en arrière-plan, puis script Playwright avec `executablePath` explicite vers `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` et `NODE_PATH=/opt/node22/lib/node_modules` (Playwright est installé globalement, pas comme dépendance du projet).

## Fichiers clés

```
src/engine/{types,simulation,gameLoop}.ts   moteur, zéro dépendance thème/UI
src/engine/simulation.test.ts               valide build()/tick() (10 tests)
src/presentation/{assets,tile}.ts           rendu générique + fallback placeholder + sprites composites (N calques)
src/content/urban/{index,assets}.ts         pack de contenu (angles logistique + commerce, grille 8x8) + mapping sprites
src/assets/themes/urban/                    fichiers image du pack urban (utilisés dans le jeu)
src/main.ts                                 harnais de dev : palette de construction + grille + stocks (PAS l'UI finale)
tools/asset-composer/                       outil de dev : composition de sprites par calques, écrit dans assets.ts
tools/asset-composer/tiles/<kit>/           bibliothèque de tuiles par kit (486 tuiles RPG Urban Kit sous rpg-urban-kit/)
tools/asset-composer/save-plugin.ts         plugin Vite : endpoints /__asset-composer/{kits,upload-kit,save}, dev only
CREDITS.md                                  licences des assets externes
.claude/settings.json                       permissions autonomes
.github/workflows/deploy.yml                déploiement GitHub Pages
```

## Prochaines étapes envisagées (non décidées)

- Utiliser l'asset composer pour recomposer les 7 autres icônes de bâtiment encore en sprite de ressource (seule `logi-scrapyard` a été refaite comme preuve de concept) — et retirer leurs anciennes entrées manuscrites à chaque fois (piège des clés dupliquées, voir section Assets).
- Caméra/carte scrollable, empreintes de bâtiments variables, démolition/déplacement — la partie ambitieuse du placement spatial, reportée volontairement après la v1 (voir "Ambition demandée vs scope retenu"). Probablement la suite la plus attendue.
- Ajouter d'autres angles thématiques au pack `urban` (artisanat/mobilier, construction/BTP, espaces verts, mobilité — voir feuille de route dans "Concept de jeu actuel"; logistique et commerce sont déjà implémentés) ; l'asset composer facilite maintenant l'extraction/l'import de nouvelles tuiles pour ces angles.
- Une maquette dashboard (cartes par bâtiment, sections par angle, fichier `mockup.html` produit hors-repo) a été faite avant le revirement vers la grille spatiale — probablement obsolète maintenant que le mode de contrôle a changé, mais l'idée de cartes visuelles plutôt que tableau reste réutilisable pour styliser les cases/la palette de la grille.
- Enrichir le moteur (plusieurs biens vendables, événements aléatoires, coûts de construction progressifs selon le nombre déjà placé...) une fois la boucle de placement validée.
- Éventuellement revoir l'ordre de traitement des bâtiments dans `tick()` (actuellement premier placé = premier servi) si ça devient un vrai problème d'équilibrage plutôt qu'un détail.
