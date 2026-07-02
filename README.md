# jeux-de-gestion

Jeu de gestion solo, gratuit, déployé sur GitHub Pages.

## Architecture

Le projet sépare strictement le **moteur** (simulation) de la **présentation** (UI/rendu), pour qu'un large éventail de thèmes et de modes de contrôle puisse se greffer dessus sans toucher au cœur.

```
src/
  engine/         moteur : aucune dépendance UI, aucun a priori de thème
    types.ts        types génériques : Resource, Recipe, Building, ContentPack
    simulation.ts    tick() : production/stocks/vente, invest() : achète de la capacité
    gameLoop.ts      boucle temps réel : pause, vitesse x1/x2/x5
  presentation/   couche visuelle générique, ignorée par le moteur
    assets.ts        types ThemeAssets / SpriteRef (mapping id moteur -> sprite)
    tile.ts           renderTile() : sprite si mappé, sinon placeholder coloré
  content/
    demo/            pack de contenu neutre, sert à valider le moteur
      assets.ts        mapping d'assets du thème demo (vide -> tout en placeholder)
  assets/
    themes/<id>/     fichiers image par thème, voir assets/README.md
  main.ts           harnais de développement (pas l'UI finale)
```

### Le moteur de production (`tick`)

Économie à **une seule échelle** — pas de paliers empilés, la profondeur vient d'ajouter des bâtiments/recettes, pas de changer d'ordre de grandeur. Chaque `Building` a une recette (graphe de recettes libre, pas de patron imposé) et une capacité (unités/tick à pleine cadence).

À chaque tick, chaque bâtiment produit en fonction du stock disponible de ses ressources d'entrée :

```
unités_produites = min(capacité, min sur chaque input de stock_disponible / quantité_requise)
```

Les ressources marquées `sellPrice` sont vendues automatiquement en fin de tick (stock converti en argent, remis à zéro). L'argent sert à agrandir la capacité d'un bâtiment via `invest()`. Les bâtiments sont traités dans l'ordre du tableau : un bâtiment antérieur peut affamer un bâtiment plus tardif qui consomme la même ressource — limitation connue et acceptée pour une économie à une seule échelle, pas un bug. Voir `src/engine/simulation.test.ts` pour les cas couverts.

### Contenu vs moteur

Un thème (urbain, entreprise, colonie...) s'exprime entièrement comme un `ContentPack` : liste de ressources, recettes et bâtiments de départ, sans toucher au moteur. Le pack `demo` utilise une petite économie bois/pierre → planches/briques → meuble, encore générique en attendant un thème définitif.

### Assets visuels

Un id moteur (`Resource.id`, `Recipe.id`, `Building.id`) n'a pas de sprite par défaut : `renderTile()` retombe sur un carré coloré placeholder tant qu'aucune entrée n'existe dans le `ThemeAssets` du thème actif. Pour intégrer un pack d'assets (ex. itch.io) :

1. Déposer les fichiers dans `src/assets/themes/<theme-id>/`.
2. Ajouter les entrées correspondantes dans `src/content/<theme-id>/assets.ts`.
3. Référencer la source, l'auteur et la licence dans `CREDITS.md`.

Taille de tuile canonique : 32×32 px (voir `src/assets/README.md`). Aucun changement dans `src/engine/` n'est nécessaire.

## Développement

```
npm install
npm run dev      # serveur de dev
npm run test     # tests du moteur (Vitest)
npm run build    # build de production (dist/)
```

Le déploiement vers GitHub Pages se fait automatiquement via `.github/workflows/deploy.yml` à chaque push sur `main`.
