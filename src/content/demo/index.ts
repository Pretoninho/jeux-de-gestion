import type { ContentPack } from '../../engine/types';

/**
 * Single-scale economy: two raw materials feed two intermediates that
 * converge into one sellable final good. No tiers, no escalating scale —
 * depth comes from adding more buildings/recipes at this same level, not
 * from growing to a "next" magnitude.
 */
export const demoPack: ContentPack = {
  id: 'demo',
  label: 'Demo (theme-neutral)',
  resources: [
    { id: 'wood', label: 'Wood' },
    { id: 'stone', label: 'Stone' },
    { id: 'planks', label: 'Planks' },
    { id: 'bricks', label: 'Bricks' },
    { id: 'furniture', label: 'Furniture', sellPrice: 15 },
  ],
  recipes: [
    { id: 'extract-wood', inputs: [], output: { resource: 'wood', quantity: 1 } },
    { id: 'extract-stone', inputs: [], output: { resource: 'stone', quantity: 1 } },
    { id: 'make-planks', inputs: [{ resource: 'wood', quantity: 2 }], output: { resource: 'planks', quantity: 1 } },
    { id: 'make-bricks', inputs: [{ resource: 'stone', quantity: 2 }], output: { resource: 'bricks', quantity: 1 } },
    {
      id: 'make-furniture',
      inputs: [
        { resource: 'planks', quantity: 1 },
        { resource: 'bricks', quantity: 1 },
      ],
      output: { resource: 'furniture', quantity: 1 },
    },
  ],
  buildings: [
    { id: 'lumberjack', label: 'Lumberjack', recipe: 'extract-wood', capacity: 10, capacityCost: 3 },
    { id: 'quarry', label: 'Quarry', recipe: 'extract-stone', capacity: 8, capacityCost: 4 },
    { id: 'sawmill', label: 'Sawmill', recipe: 'make-planks', capacity: 4, capacityCost: 8 },
    { id: 'brickworks', label: 'Brickworks', recipe: 'make-bricks', capacity: 3, capacityCost: 10 },
    { id: 'workshop', label: 'Workshop', recipe: 'make-furniture', capacity: 6, capacityCost: 15 },
  ],
};
