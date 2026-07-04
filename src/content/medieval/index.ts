import type { ContentPack } from '../../engine/types';

/**
 * Medieval-fantasy pack, built as independent thematic angles added to the
 * same flat economy — ids prefixed per angle (`craft-`, `garrison-`...) so
 * they never collide and each angle can be read/balanced on its own.
 *
 * Craft: 2 raw -> 2 intermediate -> 1 sellable.
 * Garrison: a shorter 1-lane chain (raw -> intermediate -> sellable),
 * deliberately simpler than craft to show angles don't need matching depth,
 * plus a 3x3 "Forteresse royale" that shares Garrison's intermediate but
 * demands more of it for a pricier sellable — the same yield-vs-throughput
 * arbitrage the old `comm-luxury-shopfront` proved out.
 */
export const medievalPack: ContentPack = {
  id: 'medieval',
  label: 'Médiéval-fantastique',
  resources: [
    { id: 'craft-wood', label: 'Bois' },
    { id: 'craft-gold-ore', label: "Minerai d'or" },
    { id: 'craft-planks', label: 'Planches' },
    { id: 'craft-ingots', label: "Lingots d'or" },
    { id: 'craft-gear', label: 'Équipement', sellPrice: 15, sector: 'craft' },

    { id: 'garrison-meat', label: 'Viande' },
    { id: 'garrison-provisions', label: 'Provisions' },
    { id: 'garrison-supply', label: 'Ravitaillement', sellPrice: 12, sector: 'garrison' },
    { id: 'garrison-supply-royal', label: 'Ravitaillement royal', sellPrice: 25, sector: 'garrison' },
  ],
  recipes: [
    { id: 'craft-extract-wood', inputs: [], output: { resource: 'craft-wood', quantity: 1 } },
    { id: 'craft-extract-gold-ore', inputs: [], output: { resource: 'craft-gold-ore', quantity: 1 } },
    {
      id: 'craft-make-planks',
      inputs: [{ resource: 'craft-wood', quantity: 2 }],
      output: { resource: 'craft-planks', quantity: 1 },
    },
    {
      id: 'craft-make-ingots',
      inputs: [{ resource: 'craft-gold-ore', quantity: 2 }],
      output: { resource: 'craft-ingots', quantity: 1 },
    },
    {
      id: 'craft-make-gear',
      inputs: [
        { resource: 'craft-planks', quantity: 1 },
        { resource: 'craft-ingots', quantity: 1 },
      ],
      output: { resource: 'craft-gear', quantity: 1 },
    },

    { id: 'garrison-extract-meat', inputs: [], output: { resource: 'garrison-meat', quantity: 1 } },
    {
      id: 'garrison-make-provisions',
      inputs: [{ resource: 'garrison-meat', quantity: 2 }],
      output: { resource: 'garrison-provisions', quantity: 1 },
    },
    {
      id: 'garrison-make-supply',
      inputs: [{ resource: 'garrison-provisions', quantity: 1 }],
      output: { resource: 'garrison-supply', quantity: 1 },
    },
    // Royal lane: consumes more of the shared Provisions (x3) than the standard
    // Avant-poste (x2) and is slower (see capacity below), but the output sells
    // for 25 vs 12 — a yield-vs-throughput arbitrage against the normal
    // garrison chain, which competes with it for the same Provisions.
    {
      id: 'garrison-make-supply-royal',
      inputs: [{ resource: 'garrison-provisions', quantity: 3 }],
      output: { resource: 'garrison-supply-royal', quantity: 1 },
    },
  ],
  buildingTypes: [
    { id: 'craft-woodcutter', label: 'Bûcheron', recipe: 'craft-extract-wood', capacity: 10, buildCost: 30, sector: 'craft' },
    { id: 'craft-quarry', label: "Mine d'or", recipe: 'craft-extract-gold-ore', capacity: 8, buildCost: 25, sector: 'craft' },
    { id: 'craft-sawmill', label: 'Scierie', recipe: 'craft-make-planks', capacity: 4, buildCost: 40, sector: 'craft' },
    {
      id: 'craft-foundry',
      label: 'Fonderie',
      recipe: 'craft-make-ingots',
      capacity: 3,
      buildCost: 45,
      sector: 'craft',
    },
    {
      id: 'craft-forge',
      label: 'Forge',
      recipe: 'craft-make-gear',
      capacity: 6,
      buildCost: 60,
      sector: 'craft',
    },

    { id: 'garrison-pasture', label: 'Pâturage', recipe: 'garrison-extract-meat', capacity: 12, buildCost: 30, sector: 'garrison' },
    { id: 'garrison-tavern', label: 'Auberge', recipe: 'garrison-make-provisions', capacity: 5, buildCost: 40, sector: 'garrison' },
    { id: 'garrison-outpost', label: 'Avant-poste', recipe: 'garrison-make-supply', capacity: 5, buildCost: 50, sector: 'garrison' },
    {
      id: 'garrison-fortress',
      label: 'Forteresse royale',
      recipe: 'garrison-make-supply-royal',
      // Capacity/cost bumped vs the 1x1 version to roughly match its 9-cell
      // footprint (5x the cells, ~5x the throughput and price) — first pass,
      // adjust freely once it's been played with.
      capacity: 15,
      buildCost: 150,
      footprint: { width: 3, height: 3 },
      sector: 'garrison',
    },
  ],
  // v1: small fixed grid, no camera/pan — see CLAUDE.md for the phasing rationale.
  grid: { width: 8, height: 8 },
  sectors: [
    { id: 'craft', label: 'Artisanat', taxSensitivity: 1.15 },
    { id: 'garrison', label: 'Garnison', taxSensitivity: 0.85 },
  ],
  // Seed list — more can be added at runtime via addBudgetCategory(), see the dev harness.
  budgetCategories: [
    { id: 'schools', label: 'Écoles', weightBySector: { craft: 0.35, garrison: 0.65 } },
    { id: 'health', label: 'Santé', weightBySector: { craft: 0.65, garrison: 0.35 } },
  ],
};
