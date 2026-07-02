import { describe, expect, it } from 'vitest';
import { resolveFlow } from './simulation';
import { demoPack } from '../content/demo';
import type { ContentPack } from './types';

describe('resolveFlow', () => {
  it('reproduces the worked example: tier-1 unconstrained, tier-2 throttled, tier-3 saturated', () => {
    const [t1, t2, t3] = resolveFlow(demoPack);

    expect(t1.efficiency).toBe(1);
    expect(t1.exportRate).toBe(50);

    expect(t2.need).toBeCloseTo(60);
    expect(t2.received).toBe(50);
    expect(t2.efficiency).toBeCloseTo(50 / 60);
    expect(t2.exportRate).toBeCloseTo(50 / 3);

    expect(t3.need).toBeCloseTo(15);
    expect(t3.received).toBeCloseTo(50 / 3);
    expect(t3.efficiency).toBe(1);
    expect(t3.exportRate).toBe(12);
  });

  it('never lets efficiency exceed 1 even when supply outstrips demand', () => {
    const pack: ContentPack = {
      id: 'test-surplus',
      label: 'surplus',
      resources: [
        { id: 'raw', label: 'raw' },
        { id: 'a-good', label: 'a good' },
        { id: 'b-good', label: 'b good' },
      ],
      tiers: [
        { id: 'a', order: 0, label: 'A', exportRecipe: 'a-export' },
        { id: 'b', order: 1, label: 'B', exportRecipe: 'b-export' },
      ],
      recipes: [
        {
          id: 'a-export',
          tier: 'a',
          inputs: [{ resource: 'raw', quantity: 1 }],
          output: { resource: 'a-good', quantity: 1 },
          capacity: 1000,
        },
        {
          id: 'b-export',
          tier: 'b',
          inputs: [{ resource: 'a-good', quantity: 1 }],
          output: { resource: 'b-good', quantity: 1 },
          capacity: 5,
        },
      ],
    };

    const [, b] = resolveFlow(pack);
    expect(b.efficiency).toBe(1);
    expect(b.exportRate).toBe(5);
  });

  it('scales to an arbitrary number of tiers, not just 3', () => {
    const pack: ContentPack = {
      id: 'test-n-tiers',
      label: 'n-tiers',
      resources: Array.from({ length: 6 }, (_, i) => ({ id: `good-${i}`, label: `good ${i}` })),
      tiers: Array.from({ length: 5 }, (_, i) => ({
        id: `tier-${i}`,
        order: i,
        label: `Tier ${i}`,
        exportRecipe: `export-${i}`,
      })),
      recipes: Array.from({ length: 5 }, (_, i) => ({
        id: `export-${i}`,
        tier: `tier-${i}`,
        inputs: i === 0 ? [] : [{ resource: `good-${i - 1}`, quantity: 1 }],
        output: { resource: `good-${i}`, quantity: 1 },
        capacity: 10 - i,
      })),
    };

    const results = resolveFlow(pack);
    expect(results).toHaveLength(5);
    expect(results[0].exportRate).toBe(10);
    expect(results[4].exportRate).toBe(6);
  });
});
