# jeux-de-gestion

Jeu de gestion solo, gratuit, déployé sur GitHub Pages.

## Architecture

Le projet sépare strictement le **moteur** (simulation) de la **présentation** (UI/rendu), pour qu'un large éventail de thèmes et de modes de contrôle puisse se greffer dessus sans toucher au cœur.

```
src/
  engine/         moteur : aucune dépendance UI, aucun a priori de thème
    types.ts        types génériques : Resource, Recipe, BuildingType, ContentPack
    simulation.ts    tick() : production/stocks/vente, build() : place un bâtiment sur la grille
    gameLoop.ts      boucle temps réel : pause, vitesse x1/x2/x5
  presentation/   couche visuelle générique, ignorée par le moteur
    assets.ts        types ThemeAssets / SpriteRef (mapping id moteur -> sprite)
    tile.ts           renderTile() : sprite si mappé, sinon placeholder coloré
  content/
    medieval/        pack thématique médiéval-fantastique, construit par angles successifs
      assets.ts        mapping d'assets du thème medieval
  assets/
    themes/<id>/     fichiers image par thème, voir assets/README.md
  main.ts           harnais de développement (pas l'UI finale)
```

### Le moteur de production (`tick`) et de construction (`build`)

Économie à **une seule échelle** — pas de paliers empilés, la profondeur vient d'ajouter des bâtiments/recettes, pas de changer d'ordre de grandeur. Chaque pack définit des `BuildingType` (recette + capacité + coût de construction) et une grille fixe (`grid: { width, height }`). Le joueur place des instances de ces types sur la grille via `build()`, qui vérifie case libre + dans les limites + argent suffisant.

**v1 volontairement modeste** : grille fixe (pas de caméra/scroll), empreinte 1x1 pour tous les bâtiments, construction uniquement (pas de démolition/déplacement). Une carte plus grande avec caméra, des empreintes variables et la démolition sont prévues plus tard, une fois cette base validée — voir `CLAUDE.md`.

À chaque tick, chaque bâtiment placé produit en fonction du stock disponible de ses ressources d'entrée :

```
unités_produites = min(capacité, min sur chaque input de stock_disponible / quantité_requise)
```

Les ressources marquées `sellPrice` sont vendues automatiquement en fin de tick (stock converti en argent, remis à zéro). Les bâtiments sont traités dans l'ordre de placement : un bâtiment placé plus tôt peut affamer un bâtiment placé plus tard qui consomme la même ressource — limitation connue et acceptée pour une économie à une seule échelle, pas un bug. Voir `src/engine/simulation.test.ts` pour les cas couverts.

### Contenu vs moteur

Un thème s'exprime entièrement comme un `ContentPack` : liste de ressources, recettes et bâtiments de départ, sans toucher au moteur. Le pack `medieval` est construit par "angles" successifs (chaînes cohérentes ajoutées au même pack, ids préfixés par angle pour éviter les collisions) — artisanat (`craft-*`) et garnison (`garrison-*`) sont implémentés ; d'autres angles peuvent s'ajouter sans toucher au moteur ni à l'existant.

### Assets visuels

Un id moteur (`Resource.id`, `Recipe.id`, `BuildingType.id`) n'a pas de sprite par défaut : `renderTile()` retombe sur un carré coloré placeholder tant qu'aucune entrée n'existe dans le `ThemeAssets` du thème actif. Pour intégrer un pack d'assets (ex. itch.io) :

1. Déposer les fichiers dans `src/assets/themes/<theme-id>/`.
2. Ajouter les entrées correspondantes dans `src/content/<theme-id>/assets.ts`.
3. Référencer la source, l'auteur et la licence dans `CREDITS.md`.

Taille de tuile canonique : 32×32 px (voir `src/assets/README.md`). Aucun changement dans `src/engine/` n'est nécessaire.

Un sprite peut être composé de **plusieurs tuiles empilées** (`kind: 'composite'`, `layers: FlatSpriteRef[]`, nombre de calques libre) — utile pour assembler une icône de bâtiment à partir de plusieurs éléments (ex. mur + porte) quand le pack source ne fournit pas de sprite "bâtiment entier". Voir `src/presentation/tile.ts`.

### Outil de composition d'assets (`tools/asset-composer/`)

Outil de dev — jamais expédié avec le jeu (exclu du build de production, endpoints actifs uniquement sous `npm run dev`). Permet de :
- parcourir toutes les tuiles d'un pack importé (organisées par "kit" dans `tools/asset-composer/tiles/<kit>/`) ;
- **importer un nouveau kit** (nom + sélection de fichiers PNG) sans passer par le code ;
- composer une icône en empilant plusieurs tuiles avec aperçu en direct ;
- assigner la composition à un id du pack (`Resource.id`/`BuildingType.id`, autocomplété) ;
- **enregistrer directement** dans `src/content/medieval/assets.ts` (copie les fichiers utilisés dans `src/assets/themes/medieval/<kit>/`, régénère les imports et les entrées `sprites` dans une section délimitée par des marqueurs `// asset-composer:...:start/end` — le reste du fichier n'est jamais touché).

Accès : `npm run dev` puis ouvrir `/tools/asset-composer/index.html`. Si un id composé existe déjà comme entrée manuscrite ailleurs dans le fichier, la retirer à la main (TypeScript refusera sinon une clé dupliquée).

### Éditeur de carte (`tools/map-editor/`)

Outil de dev — mêmes garanties que l'asset composer (jamais expédié, endpoints dev only). Peint la carte de terrain décorative (`src/content/medieval/terrain.ts`, type `TerrainMap` dans `src/presentation/terrain.ts`) autour du rectangle constructible (`pack.grid`, affiché verrouillé en herbe) : choisir une tuile dans la palette (découverte automatiquement parmi les ids `terrain-*` du thème), cliquer les cases à peindre, ajuster largeur/hauteur/décalage du rectangle constructible si besoin, puis **Enregistrer** régénère tout `terrain.ts`. Purement présentationnel — le moteur ne connaît jamais cette carte, seul `pack.grid` compte pour la construction.

Accès : `npm run dev` puis ouvrir `/tools/map-editor/index.html`.

## Développement

```
npm install
npm run dev      # serveur de dev
npm run test     # tests du moteur (Vitest)
npm run build    # build de production (dist/)
```

Le déploiement vers GitHub Pages se fait automatiquement via `.github/workflows/deploy.yml` à chaque push sur `main`.
