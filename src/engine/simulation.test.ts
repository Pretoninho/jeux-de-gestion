import { describe, expect, it } from 'vitest';
import { createInitialState, invest, tick } from './simulation';
import type { ContentPack } from './types';

function packWithBuildings(overrides: Partial<ContentPack> = {}): ContentPack {
  return {
    id: 'test',
    label: 'test',
    resources: [
      { id: 'wood', label: 'Wood' },
      { id: 'planks', label: 'Planks' },
      { id: 'furniture', label: 'Furniture', sellPrice: 10 },
    ],
    recipes: [
      { id: 'extract-wood', inputs: [], output: { resource: 'wood', quantity: 1 } },
      { id: 'make-planks', inputs: [{ resource: 'wood', quantity: 2 }], output: { resource: 'planks', quantity: 1 } },
      { id: 'make-furniture', inputs: [{ resource: 'planks', quantity: 1 }], output: { resource: 'furniture', quantity: 1 } },
    ],
    buildings: [],
    ...overrides,
  };
}

describe('tick', () => {
  it('produces at full capacity when a recipe has no inputs', () => {
    const pack = packWithBuildings({
      buildings: [{ id: 'lumberjack', label: 'Lumberjack', recipe: 'extract-wood', capacity: 10, capacityCost: 5 }],
    });
    const state = createInitialState(pack);
    const result = tick(pack, state);
    expect(result.produced['lumberjack']).toBe(10);
    expect(state.stocks['wood']).toBe(10);
  });

  it('throttles production to what available stock allows', () => {
    const pack = packWithBuildings({
      buildings: [{ id: 'sawmill', label: 'Sawmill', recipe: 'make-planks', capacity: 3, capacityCost: 8 }],
    });
    const state = createInitialState(pack);
    state.stocks['wood'] = 4;
    const result = tick(pack, state);
    // wants 2 wood/unit, capacity 3 -> would need 6, only 4 available -> 2 units
    expect(result.produced['sawmill']).toBe(2);
    expect(state.stocks['wood']).toBe(0);
    expect(state.stocks['planks']).toBe(2);
  });

  it('produces a fractional amount when stock only covers part of a unit', () => {
    const pack = packWithBuildings({
      buildings: [{ id: 'sawmill', label: 'Sawmill', recipe: 'make-planks', capacity: 3, capacityCost: 8 }],
    });
    const state = createInitialState(pack);
    state.stocks['wood'] = 1;
    const result = tick(pack, state);
    expect(result.produced['sawmill']).toBe(0.5);
    expect(state.stocks['wood']).toBe(0);
  });

  it('produces exactly zero with no stock at all', () => {
    const pack = packWithBuildings({
      buildings: [{ id: 'sawmill', label: 'Sawmill', recipe: 'make-planks', capacity: 3, capacityCost: 8 }],
    });
    const state = createInitialState(pack);
    const result = tick(pack, state);
    expect(result.produced['sawmill']).toBe(0);
  });

  it('auto-sells resources with a sellPrice and resets their stock to zero', () => {
    const pack = packWithBuildings({
      buildings: [{ id: 'workshop', label: 'Workshop', recipe: 'make-furniture', capacity: 10, capacityCost: 12 }],
    });
    const state = createInitialState(pack);
    state.stocks['planks'] = 5;
    const result = tick(pack, state);
    expect(result.produced['workshop']).toBe(5);
    expect(result.revenue).toBe(50);
    expect(state.money).toBe(50);
    expect(state.stocks['furniture']).toBe(0);
  });

  it('lets an earlier building starve a later one competing for the same input', () => {
    const pack = packWithBuildings({
      recipes: [
        { id: 'make-planks', inputs: [{ resource: 'wood', quantity: 1 }], output: { resource: 'planks', quantity: 1 } },
        { id: 'make-planks-2', inputs: [{ resource: 'wood', quantity: 1 }], output: { resource: 'planks', quantity: 1 } },
      ],
      buildings: [
        { id: 'sawmill-a', label: 'A', recipe: 'make-planks', capacity: 10, capacityCost: 8 },
        { id: 'sawmill-b', label: 'B', recipe: 'make-planks-2', capacity: 10, capacityCost: 8 },
      ],
    });
    const state = createInitialState(pack);
    state.stocks['wood'] = 5;
    const result = tick(pack, state);
    expect(result.produced['sawmill-a']).toBe(5);
    expect(result.produced['sawmill-b']).toBe(0);
  });
});

describe('invest', () => {
  const pack = packWithBuildings({
    buildings: [{ id: 'lumberjack', label: 'Lumberjack', recipe: 'extract-wood', capacity: 10, capacityCost: 5 }],
  });

  it('adds capacity when affordable', () => {
    const state = createInitialState(pack, 50);
    const added = invest(state, 'lumberjack', 4);
    expect(added).toBe(4);
    expect(state.money).toBe(30);
    expect(state.buildings.find((b) => b.id === 'lumberjack')?.capacity).toBe(14);
  });

  it('caps the increase at what money can afford', () => {
    const state = createInitialState(pack, 12);
    const added = invest(state, 'lumberjack', 10);
    expect(added).toBeCloseTo(2.4);
    expect(state.money).toBeCloseTo(0);
  });

  it('does not touch the immutable pack definition', () => {
    const state = createInitialState(pack, 100);
    invest(state, 'lumberjack', 5);
    expect(pack.buildings.find((b) => b.id === 'lumberjack')?.capacity).toBe(10);
  });
});
