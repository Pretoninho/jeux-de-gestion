# Assets

Un dossier par thème : `themes/<theme-id>/`. Chaque fichier importé ici est
géré par Vite (hashé, optimisé) — les imports cassés deviennent des erreurs
de build plutôt que des images manquantes silencieuses en production.

## Convention

- Taille de tuile canonique : **32×32 px**. Un pack fourni dans une autre
  taille doit être re-slicé ou re-scale à 32×32 avant import (garde le rendu
  net avec `image-rendering: pixelated`, déjà appliqué en CSS).
- Une spritesheet + son fichier de découpage (Aseprite/Tiled JSON) si le
  pack itch.io en fournit un, plutôt que redécouper les coordonnées à la
  main.
- Référencer un asset dans `src/content/<theme>/assets.ts` (type
  `ThemeAssets`), jamais directement dans `src/engine/`.

## Licence

Toute source ajoutée ici doit être listée dans `CREDITS.md` à la racine du
projet (auteur, lien, licence).
