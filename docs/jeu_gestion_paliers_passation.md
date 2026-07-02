# Jeu de gestion à paliers — Document de passation

**Résumé** : jeu de gestion solo, 3 paliers d'échelle croissante reliés par un flux de production continu (pas de reset entre paliers). Le plafond de production d'un palier dépend mathématiquement du débit reçu du palier précédent. Habillage actuel : industrie spatiale (Terre → système solaire → trou noir galactique), à considérer comme thème de travail plutôt que choix définitif.

Ce document sert de brief de démarrage pour poursuivre la conception/implémentation avec Claude Code. Aucune ligne de code n'a encore été écrite ; aucun choix moteur/langage n'a été fait.

---

## 1. Concept de base

**Ce que ce N'EST PAS** : un système de "pont"/prestige où le sommet du palier N finance le démarrage du palier N+1 puis devient obsolète ou cosmétique. C'est le piège identifié dans Spore (transitions creuses entre étapes), dans Civilization/Humankind (même boucle 4X reskinnée par ère, aucun changement de mode de contrôle), et dans les jeux idle type Universal Paperclips (le palier précédent est abandonné une fois converti).

**Ce que c'est** : un empilement à flux continu. Le palier 1 tourne en permanence et n'est jamais "terminé" ; sa production alimente en continu le palier 2, qui alimente en continu le palier 3. En fin de partie, le joueur pilote 3 systèmes productifs simultanés — jamais un seul qui aurait remplacé les précédents.

Référence mécanique la plus proche : la dépendance continue de Factorio (la plaque de fer n'est jamais "finie", la fusée finale en consomme toujours, en quantités croissantes). Ici, ce principe est structuré autour de 3 paliers thématiques explicites avec objectifs nommés, plutôt qu'un seul arbre technologique continu.

Différence avec un jeu comme Dyson Sphere Program (référence thématique la plus proche : usine planétaire → sphère de Dyson → trous noirs déjà présents comme corps célestes) : DSP n'a pas de palier 3 structuré autour du trou noir — sa communauté le réclame, les développeurs ne l'ont listé que comme piste. Le thème est pris ailleurs, la structure à 3 paliers avec goulot d'étranglement explicite ne l'est pas.

---

## 2. Les 3 paliers et leurs objectifs

### Palier 1 — Industrie terrestre
- Objectif : capacité de lancement soutenue vers l'orbite.
- Sous-chaîne conceptuelle : matières premières → composants → intégration lanceurs → lancement → segment sol.
- Sortie mesurable : charge utile envoyée en orbite par tick (ex. tonnes/jour).

### Palier 2 — Système solaire / soleil
- Objectif : mégastructure d'exploitation solaire (type sphère de Dyson) + extraction planètes/astéroïdes.
- Consomme en continu la sortie du Palier 1.
- Sortie mesurable : énergie/matière exotique récoltée par tick.

### Palier 3 — Trou noir galactique
- Objectif : dispositif d'extraction d'énergie de rotation (processus de Penrose).
- Consomme en continu la sortie du Palier 2.
- Question ouverte : pas de Palier 4 pour l'instant. Deux options envisagées — chaîne terminale, ou boucle où l'énergie du trou noir relève le plafond de production des Paliers 1 et 2. Non tranché.

---

## 3. Découpage des sous-chaînes de production

Règle commune aux 3 paliers : **matières brutes (0 input) → 2 intermédiaires (2 inputs chacun) → 1 produit fini (3 inputs, dont les 2 intermédiaires)**. Un seul produit fini traverse chaque frontière de palier.

### Palier 1 — Industrie terrestre
- Bruts : Minerai, Terres rares, Silicium, Énergie, Carburant
- Alliage = Minerai + Énergie
- Puce = Terres rares + Silicium
- **Module orbital** = Alliage + Puce + Carburant → exporté vers Palier 2

### Palier 2 — Système solaire/soleil
- Bruts locaux : Régolithe, Plasma solaire
- Alliage spatial = Régolithe + Module orbital *(import P1)*
- Collecteur = Plasma solaire + Régolithe *(100% local)*
- **Segment de sphère** = Alliage spatial + Collecteur + Module orbital *(import direct aussi)* → exporté vers Palier 3

### Palier 3 — Trou noir galactique
- Bruts locaux : Matière exotique, Rayonnement Hawking
- Champ de confinement = Matière exotique + Segment de sphère *(import P2)*
- Extracteur relativiste = Rayonnement Hawking + Matière exotique *(100% local)*
- **Générateur Penrose** = Champ de confinement + Extracteur relativiste + Segment de sphère *(import direct aussi)*

**Point structurel important** : le Module orbital et le Segment de sphère sont chacun consommés à *deux* endroits du palier suivant (une fois via un intermédiaire, une fois en import direct dans la recette finale). D'où la formule de besoin ci-dessous.

---

## 4. Mécanique du goulot d'étranglement

Cœur du système : pas un stock dépensé une fois, un flux à maintenir à chaque tick.

**Formules**
```
Besoin_Palier(N+1)     = Σ (besoins de toutes les recettes de N+1 qui consomment le produit de N)
Efficacité(Palier N+1) = min(1, Débit_reçu_de_N / Besoin_Palier(N+1))
Sortie_réelle(N+1)     = Capacité_construite × Efficacité
```

**Exemple chiffré (validé en conception)**
- P1 exporte 50 Module orbital/tick.
- P2 en demande 35 (via Alliage spatial) + 25 (import direct Segment de sphère) = 60 → Efficacité P2 = 50/60 ≈ 0,83.
- Capacité construite de Segment de sphère = 20/tick → sortie réelle ≈ 16,7/tick.
- P3 en demande 15/tick (10 + 5) → Efficacité P3 = min(1, 16,7/15) = 1,0 → P3 tourne à plein régime malgré le déficit de P2.

**Insight de design** : le déficit ne se propage pas automatiquement vers le haut. Il dépend du dimensionnement de la capacité construite au palier N+1 par rapport au flux réellement reçu. Sur-construire un palier sans avoir musclé l'amont crée de la capacité morte (bâtiments existants tournant en sous-régime) ; bien dimensionner un palier peut au contraire absorber le déficit du précédent sans le subir. C'est un arbitrage de construction actif pour le joueur, pas un plafond passif.

**Pourquoi ce mécanisme règle le problème identifié en amont** : dans les jeux à "pont" (Spore notamment), le contenu d'un palier antérieur devient cosmétique une fois le suivant atteint. Ici c'est structurellement impossible — le plafond du haut dépend mathématiquement du débit du bas, donc revenir optimiser un palier inférieur reste pertinent jusqu'à la fin de partie.

---

## 5. Décisions actées vs questions ouvertes

**Actées**
- Modèle d'empilement à flux continu (pas de pont/prestige, pas de reset)
- 3 paliers avec objectifs thématiques distincts (Terre / Système solaire-soleil / Trou noir galactique)
- Découpage brut → 2 intermédiaires → 1 produit fini par palier
- Un seul produit fini exporté par palier, consommé à plusieurs endroits du palier suivant
- Formule de goulot d'étranglement : min(1, débit/besoin) × capacité construite

**Ouvertes**
- Ratios de conversion exacts (combien de Minerai pour 1 Alliage, etc.)
- Palier 3 terminal ou bouclé vers Paliers 1-2 ?
- Genre/mode de contrôle par palier (city-builder / automatisation / délégation avait été envisagé, puis mis de côté — non recroisé avec la mécanique de goulot actuelle)
- Tick rate et échelle de temps (temps réel vs tour par tour)
- Habillage thématique définitif (le spatial est un thème de travail, pas un choix final)
- Nombre de ressources brutes par palier au-delà de l'exemple (actuellement 4-5, à valider à l'échelle)
- Choix technique (langage/moteur) — non abordé, à définir séparément
