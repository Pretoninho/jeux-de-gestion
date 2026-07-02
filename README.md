# jeux-de-gestion

Jeu de gestion solo, gratuit, déployé sur GitHub Pages.

## Architecture

Le projet sépare strictement le **moteur** (simulation) de la **présentation** (UI/rendu), pour qu'un large éventail de thèmes et de modes de contrôle puisse se greffer dessus sans toucher au cœur.

```
src/
  engine/         moteur : aucune dépendance UI, aucun a priori de thème
    types.ts        types génériques : Resource, Recipe, Tier, ContentPack
    simulation.ts    resolveFlow() : calcule le goulot d'étranglement entre paliers
    gameLoop.ts      boucle temps réel : pause, vitesse x1/x2/x5
  content/
    demo/            pack de contenu neutre, sert à valider le moteur
  main.ts           harnais de développement (pas l'UI finale)
```

### Le moteur de flux (`resolveFlow`)

Le jeu est structuré en **N paliers** (configurable, pas figé à 3) reliés par un flux continu — pas de reset ni de "pont" entre paliers, chaque palier tourne en permanence. Chaque palier :

- consomme des ressources brutes et des recettes internes librement définies (graphe de recettes libre, pas de patron imposé par le moteur) ;
- exporte une ressource vers le palier suivant, potentiellement consommée à plusieurs endroits du palier suivant.

Le débit reçu du palier précédent plafonne (jamais au-delà) la production réelle du palier suivant :

```
Besoin(N+1)     = Σ des besoins de toutes les recettes de N+1 qui consomment l'export de N
Efficacité(N+1) = min(1, Débit_reçu_de_N / Besoin(N+1))
Sortie_réelle   = Capacité_construite × Efficacité
```

Le déficit d'un palier ne se propage pas automatiquement : bien dimensionner la capacité d'un palier par rapport au flux qu'il reçoit reste un arbitrage actif du joueur jusqu'en fin de partie. Voir `src/engine/simulation.test.ts` pour l'exemple chiffré de référence.

### Contenu vs moteur

Un thème (univers spatial, civilisation antique, biologie cellulaire, entreprise...) s'exprime entièrement comme un `ContentPack` : liste de ressources, paliers et recettes, sans toucher au moteur. Le pack `demo` utilise des noms neutres pour garantir que le moteur ne dépend d'aucun thème particulier.

## Développement

```
npm install
npm run dev      # serveur de dev
npm run test     # tests du moteur (Vitest)
npm run build    # build de production (dist/)
```

Le déploiement vers GitHub Pages se fait automatiquement via `.github/workflows/deploy.yml` à chaque push sur `main`.
