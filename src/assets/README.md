# Assets

Un dossier par thème : `themes/<theme-id>/`. Chaque fichier importé ici est
géré par Vite (hashé, optimisé) — les imports cassés deviennent des erreurs
de build plutôt que des images manquantes silencieuses en production.

## Convention

- Taille de tuile canonique : **32×32 px** — c'est la taille d'affichage
  (`ThemeAssets.tileSize`), pas forcément la taille source du fichier. Un
  pack en 16×16 (ex. Kenney) n'a pas besoin d'être re-scale à la main :
  `image-rendering: pixelated` en CSS fait un upscale net à l'affichage.
  Éviter en revanche les tailles non multiples (ex. 24×24) qui donneraient
  un flou ou des bords irréguliers.
- Une spritesheet + son fichier de découpage (Aseprite/Tiled JSON) si le
  pack itch.io en fournit un, plutôt que redécouper les coordonnées à la
  main.
- Référencer un asset dans `src/content/<theme>/assets.ts` (type
  `ThemeAssets`), jamais directement dans `src/engine/`.

## Licence

Toute source ajoutée ici doit être listée dans `CREDITS.md` à la racine du
projet (auteur, lien, licence).
