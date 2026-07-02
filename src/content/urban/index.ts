import type { ContentPack } from '../../engine/types';

/**
 * First thematic angle for the urban/near-future pack: a small logistics
 * business. Same shape as the earlier mechanical draft (2 raw -> 2
 * intermediate -> 1 sellable), just renamed and re-mapped to sprites the
 * kit actually supports well. Ids are prefixed `logi-` so future angles
 * (commerce, crafting...) can be added to this same pack without collisions.
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
  ],
  buildings: [
    { id: 'logi-scrapyard', label: 'Casse auto', recipe: 'logi-extract-scrap', capacity: 10, capacityCost: 3 },
    { id: 'logi-warehouse', label: 'Entrepôt', recipe: 'logi-extract-materials', capacity: 8, capacityCost: 4 },
    { id: 'logi-repair-shop', label: 'Atelier de réparation', recipe: 'logi-make-parts', capacity: 4, capacityCost: 8 },
    { id: 'logi-packing-center', label: "Centre d'emballage", recipe: 'logi-make-packaging', capacity: 3, capacityCost: 10 },
    { id: 'logi-delivery-hub', label: 'Centre de livraison', recipe: 'logi-make-package', capacity: 6, capacityCost: 15 },
  ],
};
