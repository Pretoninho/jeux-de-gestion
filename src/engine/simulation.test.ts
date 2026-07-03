import { describe, expect, it } from 'vitest';
import { addBudgetCategory, build, buildingAt, createInitialState, setBudgetCategoryLevel, setTaxRate, tick } from './simulation';
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

describe('build with a multi-cell footprint', () => {
  const pack = packWithTypes({
    buildingTypes: [
      { id: 'mansion', label: 'Mansion', recipe: 'extract-wood', capacity: 10, buildCost: 20, footprint: { width: 2, height: 2 } },
      { id: 'lumberjack', label: 'Lumberjack', recipe: 'extract-wood', capacity: 10, buildCost: 20 },
    ],
  });

  it('places a 2x2 building and occupies every cell of its footprint', () => {
    const state = createInitialState(pack, 100);
    const result = build(pack, state, 'mansion', 0, 0);
    expect(result).toEqual({ success: true });
    expect(buildingAt(pack, state, 0, 0)?.id).toBe('mansion@0,0');
    expect(buildingAt(pack, state, 1, 1)?.id).toBe('mansion@0,0');
    expect(buildingAt(pack, state, 2, 0)).toBeUndefined();
  });

  it('refuses when the footprint would extend past the grid edge', () => {
    const state = createInitialState(pack, 100);
    const result = build(pack, state, 'mansion', 3, 3);
    expect(result).toEqual({ success: false, reason: 'out-of-bounds' });
  });

  it('refuses when the footprint overlaps a 1x1 building that is not at the same origin', () => {
    const state = createInitialState(pack, 100);
    build(pack, state, 'lumberjack', 1, 1);
    const result = build(pack, state, 'mansion', 0, 0);
    expect(result).toEqual({ success: false, reason: 'occupied' });
  });

  it('lets a later building fit next to (not overlapping) an already-placed footprint', () => {
    const state = createInitialState(pack, 100);
    build(pack, state, 'mansion', 0, 0);
    const result = build(pack, state, 'lumberjack', 2, 0);
    expect(result).toEqual({ success: true });
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

describe('budget system', () => {
  function budgetPack(overrides: Partial<ContentPack> = {}): ContentPack {
    return packWithTypes({
      resources: [
        { id: 'wood', label: 'Wood' },
        { id: 'planks', label: 'Planks' },
        { id: 'furniture', label: 'Furniture', sellPrice: 10, sector: 'alpha' },
      ],
      buildingTypes: [
        { id: 'workshop', label: 'Workshop', recipe: 'make-furniture', capacity: 10, buildCost: 10, sector: 'alpha' },
      ],
      sectors: [
        { id: 'alpha', label: 'Alpha', taxSensitivity: 1 },
        { id: 'beta', label: 'Beta', taxSensitivity: 0.5 },
      ],
      ...overrides,
    });
  }

  it('seeds every declared sector at neutral (50) satisfaction', () => {
    const state = createInitialState(budgetPack(), 0);
    expect(state.satisfactionBySector).toEqual({ alpha: 50, beta: 50 });
  });

  it('drifts satisfaction toward its target gradually instead of snapping', () => {
    const pack = budgetPack();
    const state = createInitialState(pack, 0);
    setTaxRate(state, 100);
    tick(pack, state);
    // Target is 50 - 40*1 = 10; one tick only closes 12% of the 40-point gap.
    expect(state.satisfactionBySector['alpha']).toBeLessThan(50);
    expect(state.satisfactionBySector['alpha']).toBeGreaterThan(10);
    for (let i = 0; i < 50; i++) tick(pack, state);
    expect(state.satisfactionBySector['alpha']).toBeCloseTo(10, 0);
  });

  it('applies a bigger tax penalty to a more tax-sensitive sector', () => {
    const pack = budgetPack();
    const state = createInitialState(pack, 0);
    setTaxRate(state, 100);
    for (let i = 0; i < 50; i++) tick(pack, state);
    expect(state.satisfactionBySector['alpha']).toBeLessThan(state.satisfactionBySector['beta']);
  });

  it('setTaxRate clamps out-of-range input', () => {
    const state = createInitialState(budgetPack(), 0);
    setTaxRate(state, 150);
    expect(state.taxRate).toBe(100);
    setTaxRate(state, -10);
    expect(state.taxRate).toBe(0);
  });

  it('addBudgetCategory seeds a new category at 50% funding and rejects a duplicate id', () => {
    const state = createInitialState(budgetPack(), 0);
    addBudgetCategory(state, { id: 'schools', label: 'Écoles', weightBySector: { alpha: 1 } });
    expect(state.budgetCategories).toEqual([{ id: 'schools', label: 'Écoles', weightBySector: { alpha: 1 }, level: 50 }]);
    expect(() => addBudgetCategory(state, { id: 'schools', label: 'Écoles bis', weightBySector: {} })).toThrow();
  });

  it('setBudgetCategoryLevel clamps and rejects an unknown category', () => {
    const state = createInitialState(budgetPack(), 0);
    addBudgetCategory(state, { id: 'schools', label: 'Écoles', weightBySector: { alpha: 1 } });
    setBudgetCategoryLevel(state, 'schools', 150);
    expect(state.budgetCategories[0].level).toBe(100);
    expect(() => setBudgetCategoryLevel(state, 'nope', 50)).toThrow();
  });

  it('underfunding a category drags satisfaction below neutral, overfunding pulls it above', () => {
    const pack = budgetPack();

    const underfunded = createInitialState(pack, 0);
    addBudgetCategory(underfunded, { id: 'schools', label: 'Écoles', weightBySector: { alpha: 1 } });
    setBudgetCategoryLevel(underfunded, 'schools', 0);
    for (let i = 0; i < 50; i++) tick(pack, underfunded);
    expect(underfunded.satisfactionBySector['alpha']).toBeLessThan(50);

    const overfunded = createInitialState(pack, 0);
    addBudgetCategory(overfunded, { id: 'schools', label: 'Écoles', weightBySector: { alpha: 1 } });
    setBudgetCategoryLevel(overfunded, 'schools', 100);
    for (let i = 0; i < 50; i++) tick(pack, overfunded);
    expect(overfunded.satisfactionBySector['alpha']).toBeGreaterThan(50);
  });

  it("low sector satisfaction throttles that sector's production capacity", () => {
    const pack = budgetPack();
    const state = createInitialState(pack, 100);
    build(pack, state, 'workshop', 0, 0);
    setTaxRate(state, 100);
    for (let i = 0; i < 80; i++) tick(pack, state); // let satisfaction settle near its floor
    state.stocks['planks'] = 1000; // input is not the bottleneck here, only the capacity multiplier is
    const result = tick(pack, state);
    expect(result.produced['workshop@0,0']).toBeLessThan(10);
    expect(result.produced['workshop@0,0']).toBeGreaterThan(0);
  });

  it('low sector satisfaction reduces the sale price multiplier, cutting revenue', () => {
    const pack = budgetPack();

    const healthy = createInitialState(pack, 100);
    build(pack, healthy, 'workshop', 0, 0);
    healthy.stocks['planks'] = 10;
    const healthyRevenue = tick(pack, healthy).revenue;

    const unhappy = createInitialState(pack, 100);
    addBudgetCategory(unhappy, { id: 'schools', label: 'Écoles', weightBySector: { alpha: 1 } });
    setBudgetCategoryLevel(unhappy, 'schools', 0);
    build(pack, unhappy, 'workshop', 0, 0);
    for (let i = 0; i < 80; i++) tick(pack, unhappy);
    unhappy.stocks['planks'] = 10;
    const unhappyRevenue = tick(pack, unhappy).revenue;

    expect(unhappyRevenue).toBeLessThan(healthyRevenue);
  });

  it('spending cost scales with the number of placed buildings', () => {
    const pack = budgetPack();
    const state = createInitialState(pack, 1000);
    addBudgetCategory(state, { id: 'schools', label: 'Écoles', weightBySector: { alpha: 1 }, costPerBuilding: 2 });
    setBudgetCategoryLevel(state, 'schools', 100);

    build(pack, state, 'workshop', 0, 0);
    expect(tick(pack, state).spending).toBeCloseTo(2, 5);

    build(pack, state, 'workshop', 1, 0);
    expect(tick(pack, state).spending).toBeCloseTo(4, 5);
  });
});
