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
  ],
  buildings: [
    { id: 'logi-scrapyard', label: 'Casse auto', recipe: 'logi-extract-scrap', capacity: 10, capacityCost: 3 },
    { id: 'logi-warehouse', label: 'Entrepôt', recipe: 'logi-extract-materials', capacity: 8, capacityCost: 4 },
    { id: 'logi-repair-shop', label: 'Atelier de réparation', recipe: 'logi-make-parts', capacity: 4, capacityCost: 8 },
    { id: 'logi-packing-center', label: "Centre d'emballage", recipe: 'logi-make-packaging', capacity: 3, capacityCost: 10 },
    { id: 'logi-delivery-hub', label: 'Centre de livraison', recipe: 'logi-make-package', capacity: 6, capacityCost: 15 },

    { id: 'comm-wholesaler', label: 'Grossiste', recipe: 'comm-extract-goods', capacity: 12, capacityCost: 3 },
    { id: 'comm-shopfront', label: 'Vitrine', recipe: 'comm-make-display', capacity: 5, capacityCost: 9 },
    { id: 'comm-register', label: 'Caisse', recipe: 'comm-make-sale', capacity: 5, capacityCost: 12 },
  ],
};
