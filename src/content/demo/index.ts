import type { ContentPack } from '../../engine/types';

/**
 * Theme-neutral content pack used to exercise the engine. Reproduces the
 * worked numeric example (tier-1 exports 50/tick, tier-2 need 60 -> ~83%
 * efficiency, tier-3 fully saturated) with generic labels so the engine's
 * correctness never depends on a particular theme's flavor text.
 */
export const demoPack: ContentPack = {
  id: 'demo',
  label: 'Demo (theme-neutral)',
  resources: [
    { id: 't1-raw-a', label: 'Tier 1 raw A' },
    { id: 't1-raw-b', label: 'Tier 1 raw B' },
    { id: 't1-raw-c', label: 'Tier 1 raw C' },
    { id: 't1-raw-d', label: 'Tier 1 raw D' },
    { id: 't1-raw-e', label: 'Tier 1 raw E' },
    { id: 't1-intermediate-a', label: 'Tier 1 intermediate A' },
    { id: 't1-intermediate-b', label: 'Tier 1 intermediate B' },
    { id: 't1-export-good', label: 'Tier 1 export good' },

    { id: 't2-raw-a', label: 'Tier 2 raw A' },
    { id: 't2-raw-b', label: 'Tier 2 raw B' },
    { id: 't2-intermediate-a', label: 'Tier 2 intermediate A' },
    { id: 't2-intermediate-b', label: 'Tier 2 intermediate B' },
    { id: 't2-export-good', label: 'Tier 2 export good' },

    { id: 't3-raw-a', label: 'Tier 3 raw A' },
    { id: 't3-raw-b', label: 'Tier 3 raw B' },
    { id: 't3-intermediate-a', label: 'Tier 3 intermediate A' },
    { id: 't3-intermediate-b', label: 'Tier 3 intermediate B' },
    { id: 't3-export-good', label: 'Tier 3 export good' },
  ],
  tiers: [
    { id: 'tier-1', order: 0, label: 'Tier I', exportRecipe: 't1-export' },
    { id: 'tier-2', order: 1, label: 'Tier II', exportRecipe: 't2-export' },
    { id: 'tier-3', order: 2, label: 'Tier III', exportRecipe: 't3-export' },
  ],
  recipes: [
    // Tier 1 — no upstream constraint, raw materials assumed always available.
    {
      id: 't1-intermediate-a',
      tier: 'tier-1',
      inputs: [
        { resource: 't1-raw-a', quantity: 1 },
        { resource: 't1-raw-d', quantity: 1 },
      ],
      output: { resource: 't1-intermediate-a', quantity: 1 },
      capacity: 100,
    },
    {
      id: 't1-intermediate-b',
      tier: 'tier-1',
      inputs: [
        { resource: 't1-raw-b', quantity: 1 },
        { resource: 't1-raw-c', quantity: 1 },
      ],
      output: { resource: 't1-intermediate-b', quantity: 1 },
      capacity: 100,
    },
    {
      id: 't1-export',
      tier: 'tier-1',
      inputs: [
        { resource: 't1-intermediate-a', quantity: 1 },
        { resource: 't1-intermediate-b', quantity: 1 },
        { resource: 't1-raw-e', quantity: 1 },
      ],
      output: { resource: 't1-export-good', quantity: 1 },
      capacity: 50,
    },

    // Tier 2 — imports t1-export-good at two points (intermediate + direct).
    {
      id: 't2-intermediate-a',
      tier: 'tier-2',
      inputs: [
        { resource: 't2-raw-a', quantity: 1 },
        { resource: 't1-export-good', quantity: 1 },
      ],
      output: { resource: 't2-intermediate-a', quantity: 1 },
      capacity: 35,
    },
    {
      id: 't2-intermediate-b',
      tier: 'tier-2',
      inputs: [
        { resource: 't2-raw-b', quantity: 1 },
        { resource: 't2-raw-a', quantity: 1 },
      ],
      output: { resource: 't2-intermediate-b', quantity: 1 },
      capacity: 100,
    },
    {
      id: 't2-export',
      tier: 'tier-2',
      inputs: [
        { resource: 't2-intermediate-a', quantity: 1 },
        { resource: 't2-intermediate-b', quantity: 1 },
        { resource: 't1-export-good', quantity: 1.25 },
      ],
      output: { resource: 't2-export-good', quantity: 1 },
      capacity: 20,
    },

    // Tier 3 — imports t2-export-good at two points (intermediate + direct).
    {
      id: 't3-intermediate-a',
      tier: 'tier-3',
      inputs: [
        { resource: 't3-raw-a', quantity: 1 },
        { resource: 't2-export-good', quantity: 1 },
      ],
      output: { resource: 't3-intermediate-a', quantity: 1 },
      capacity: 10,
    },
    {
      id: 't3-intermediate-b',
      tier: 'tier-3',
      inputs: [
        { resource: 't3-raw-b', quantity: 1 },
        { resource: 't3-raw-a', quantity: 1 },
      ],
      output: { resource: 't3-intermediate-b', quantity: 1 },
      capacity: 100,
    },
    {
      id: 't3-export',
      tier: 'tier-3',
      inputs: [
        { resource: 't3-intermediate-a', quantity: 1 },
        { resource: 't3-intermediate-b', quantity: 1 },
        { resource: 't2-export-good', quantity: 5 / 12 },
      ],
      output: { resource: 't3-export-good', quantity: 1 },
      capacity: 12,
    },
  ],
};
