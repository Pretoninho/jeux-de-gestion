import { describe, expect, it } from 'vitest';
import { build, createInitialState, tick } from './simulation';
import type { ContentPack } from './types';

function packWithTypes(overrides: Partial<ContentPack> = {}): ContentPack {
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
    buildingTypes: [],
    grid: { width: 4, height: 4 },
    ...overrides,
  };
}

describe('build', () => {
  const pack = packWithTypes({
    buildingTypes: [{ id: 'lumberjack', label: 'Lumberjack', recipe: 'extract-wood', capacity: 10, buildCost: 20 }],
  });

  it('places a building on an empty, affordable, in-bounds cell', () => {
    const state = createInitialState(pack, 50);
    const result = build(pack, state, 'lumberjack', 1, 1);
    expect(result).toEqual({ success: true });
    expect(state.money).toBe(30);
    expect(state.placedBuildings).toEqual([{ id: 'lumberjack@1,1', type: 'lumberjack', x: 1, y: 1 }]);
  });

  it('refuses an already-occupied cell', () => {
    const state = createInitialState(pack, 100);
    build(pack, state, 'lumberjack', 1, 1);
    const result = build(pack, state, 'lumberjack', 1, 1);
    expect(result).toEqual({ success: false, reason: 'occupied' });
    expect(state.placedBuildings).toHaveLength(1);
  });

  it('refuses a cell outside the grid', () => {
    const state = createInitialState(pack, 100);
    const result = build(pack, state, 'lumberjack', 4, 0);
    expect(result).toEqual({ success: false, reason: 'out-of-bounds' });
  });

  it('refuses when money is insufficient, without touching it', () => {
    const state = createInitialState(pack, 5);
    const result = build(pack, state, 'lumberjack', 0, 0);
    expect(result).toEqual({ success: false, reason: 'unaffordable' });
    expect(state.money).toBe(5);
    expect(state.placedBuildings).toHaveLength(0);
  });

  it('refuses an unknown building type', () => {
    const state = createInitialState(pack, 100);
    const result = build(pack, state, 'nope', 0, 0);
    expect(result).toEqual({ success: false, reason: 'unknown-type' });
  });
});

describe('tick', () => {
  it('produces at full capacity for a placed building with no inputs', () => {
    const pack = packWithTypes({
      buildingTypes: [{ id: 'lumberjack', label: 'Lumberjack', recipe: 'extract-wood', capacity: 10, buildCost: 20 }],
    });
    const state = createInitialState(pack, 20);
    build(pack, state, 'lumberjack', 0, 0);
    const result = tick(pack, state);
    expect(result.produced['lumberjack@0,0']).toBe(10);
    expect(state.stocks['wood']).toBe(10);
  });

  it('throttles a placed building to what available stock allows', () => {
    const pack = packWithTypes({
      buildingTypes: [{ id: 'sawmill', label: 'Sawmill', recipe: 'make-planks', capacity: 3, buildCost: 10 }],
    });
    const state = createInitialState(pack, 10);
    build(pack, state, 'sawmill', 0, 0);
    state.stocks['wood'] = 4;
    const result = tick(pack, state);
    expect(result.produced['sawmill@0,0']).toBe(2);
    expect(state.stocks['wood']).toBe(0);
    expect(state.stocks['planks']).toBe(2);
  });

  it('lets an earlier-placed building starve a later one competing for the same input', () => {
    const pack = packWithTypes({
      recipes: [
        { id: 'make-planks', inputs: [{ resource: 'wood', quantity: 1 }], output: { resource: 'planks', quantity: 1 } },
      ],
      buildingTypes: [{ id: 'sawmill', label: 'Sawmill', recipe: 'make-planks', capacity: 10, buildCost: 10 }],
    });
    const state = createInitialState(pack, 100);
    build(pack, state, 'sawmill', 0, 0);
    build(pack, state, 'sawmill', 1, 0);
    state.stocks['wood'] = 5;
    const result = tick(pack, state);
    expect(result.produced['sawmill@0,0']).toBe(5);
    expect(result.produced['sawmill@1,0']).toBe(0);
  });

  it('auto-sells resources with a sellPrice and resets their stock to zero', () => {
    const pack = packWithTypes({
      buildingTypes: [{ id: 'workshop', label: 'Workshop', recipe: 'make-furniture', capacity: 10, buildCost: 10 }],
    });
    const state = createInitialState(pack, 10);
    build(pack, state, 'workshop', 0, 0);
    state.stocks['planks'] = 5;
    const result = tick(pack, state);
    expect(result.produced['workshop@0,0']).toBe(5);
    expect(result.revenue).toBe(50);
    expect(state.money).toBe(50);
    expect(state.stocks['furniture']).toBe(0);
  });

  it('does not touch the immutable pack definition', () => {
    const pack = packWithTypes({
      buildingTypes: [{ id: 'lumberjack', label: 'Lumberjack', recipe: 'extract-wood', capacity: 10, buildCost: 20 }],
    });
    const state = createInitialState(pack, 100);
    build(pack, state, 'lumberjack', 0, 0);
    build(pack, state, 'lumberjack', 1, 0);
    tick(pack, state);
    expect(pack.buildingTypes).toHaveLength(1);
    expect(pack.buildingTypes[0].capacity).toBe(10);
  });
});
