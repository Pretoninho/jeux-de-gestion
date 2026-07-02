import type { ContentPack } from '../../engine/types';

/**
 * Urban/near-future pack, built as independent thematic angles added to the
 * same flat economy — ids prefixed per angle (`logi-`, `comm-`...) so they
 * never collide and each angle can be read/balanced on its own.
 *
 * Logistics: 2 raw -> 2 intermediate -> 1 sellable.
 * Commerce: a shorter 1-lane chain (raw -> intermediate -> sellable),
 * deliberately simpler than logistics to show angles don't need matching depth.
 */
export const urbanPack: ContentPack = {
  id: 'urban',
  label: 'Urbain / proche-futur',
  resources: [
    { id: 'logi-scrap', label: 'Ferraille' },
    { id: 'logi-materials', label: 'Matériaux' },
    { id: 'logi-parts', label: 'Pièces détachées' },
    { id: 'logi-packaging', label: 'Emballages' },
    { id: 'logi-package', label: 'Colis livré', sellPrice: 15 },

    { id: 'comm-goods', label: 'Marchandises' },
    { id: 'comm-display', label: 'Vitrine garnie' },
    { id: 'comm-sale', label: 'Vente', sellPrice: 12 },
    { id: 'comm-sale-premium', label: 'Vente premium', sellPrice: 25 },
  ],
  recipes: [
    { id: 'logi-extract-scrap', inputs: [], output: { resource: 'logi-scrap', quantity: 1 } },
    { id: 'logi-extract-materials', inputs: [], output: { resource: 'logi-materials', quantity: 1 } },
    {
      id: 'logi-make-parts',
      inputs: [{ resource: 'logi-scrap', quantity: 2 }],
      output: { resource: 'logi-parts', quantity: 1 },
    },
    {
      id: 'logi-make-packaging',
      inputs: [{ resource: 'logi-materials', quantity: 2 }],
      output: { resource: 'logi-packaging', quantity: 1 },
    },
    {
      id: 'logi-make-package',
      inputs: [
        { resource: 'logi-parts', quantity: 1 },
        { resource: 'logi-packaging', quantity: 1 },
      ],
      output: { resource: 'logi-package', quantity: 1 },
    },

    { id: 'comm-extract-goods', inputs: [], output: { resource: 'comm-goods', quantity: 1 } },
    {
      id: 'comm-make-display',
      inputs: [{ resource: 'comm-goods', quantity: 2 }],
      output: { resource: 'comm-display', quantity: 1 },
    },
    {
      id: 'comm-make-sale',
      inputs: [{ resource: 'comm-display', quantity: 1 }],
      output: { resource: 'comm-sale', quantity: 1 },
    },
    // Premium lane: consumes more raw (x3) than the standard Vitrine (x2) and is
    // slower (see capacity below), but the output sells for 25 vs 12 — a
    // yield-vs-throughput arbitrage against the normal commerce chain, which
    // competes with it for the same Marchandises.
    {
      id: 'comm-make-sale-premium',
      inputs: [{ resource: 'comm-goods', quantity: 3 }],
      output: { resource: 'comm-sale-premium', quantity: 1 },
    },
  ],
  buildingTypes: [
    { id: 'logi-scrapyard', label: 'Casse auto', recipe: 'logi-extract-scrap', capacity: 10, buildCost: 30 },
    { id: 'logi-warehouse', label: 'Entrepôt', recipe: 'logi-extract-materials', capacity: 8, buildCost: 25 },
    { id: 'logi-repair-shop', label: 'Atelier de réparation', recipe: 'logi-make-parts', capacity: 4, buildCost: 40 },
    { id: 'logi-packing-center', label: "Centre d'emballage", recipe: 'logi-make-packaging', capacity: 3, buildCost: 45 },
    { id: 'logi-delivery-hub', label: 'Centre de livraison', recipe: 'logi-make-package', capacity: 6, buildCost: 60 },

    { id: 'comm-wholesaler', label: 'Grossiste', recipe: 'comm-extract-goods', capacity: 12, buildCost: 30 },
    { id: 'comm-shopfront', label: 'Vitrine', recipe: 'comm-make-display', capacity: 5, buildCost: 40 },
    { id: 'comm-register', label: 'Caisse', recipe: 'comm-make-sale', capacity: 5, buildCost: 50 },
    {
      id: 'comm-luxury-shopfront',
      label: 'Vitrine de luxe',
      recipe: 'comm-make-sale-premium',
      // Capacity/cost bumped vs the 1x1 version to roughly match its 9-cell
      // footprint (5x the cells, ~5x the throughput and price) — first pass,
      // adjust freely once it's been played with.
      capacity: 15,
      buildCost: 150,
      footprint: { width: 3, height: 3 },
    },
  ],
  // v1: small fixed grid, no camera/pan — see CLAUDE.md for the phasing rationale.
  grid: { width: 8, height: 8 },
};
