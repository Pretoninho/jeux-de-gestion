import type { BuildingType, ContentPack } from './types';

export interface PlacedBuilding {
  id: string;
  /** BuildingType id. */
  type: string;
  x: number;
  y: number;
}

export interface EconomyState {
  /** Resource id -> quantity currently in stock. */
  stocks: Record<string, number>;
  money: number;
  placedBuildings: PlacedBuilding[];
}

export function createInitialState(pack: ContentPack, startingMoney = 0): EconomyState {
  const stocks: Record<string, number> = {};
  for (const resource of pack.resources) stocks[resource.id] = 0;
  return {
    stocks,
    money: startingMoney,
    placedBuildings: [],
  };
}

export interface Footprint {
  width: number;
  height: number;
}

/** A building type's footprint in grid cells. Defaults to 1x1 when unspecified. */
export function footprintOf(type: BuildingType): Footprint {
  return type.footprint ?? { width: 1, height: 1 };
}

interface Rect extends Footprint {
  x: number;
  y: number;
}

function rectOf(pack: ContentPack, placed: PlacedBuilding): Rect {
  const type = pack.buildingTypes.find((t) => t.id === placed.type);
  if (!type) {
    throw new Error(`Placed building "${placed.id}" references unknown type "${placed.type}"`);
  }
  return { x: placed.x, y: placed.y, ...footprintOf(type) };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Finds the placed building (if any) whose footprint covers cell (x, y) — not just its origin corner. */
export function buildingAt(pack: ContentPack, state: EconomyState, x: number, y: number): PlacedBuilding | undefined {
  const cell: Rect = { x, y, width: 1, height: 1 };
  return state.placedBuildings.find((b) => rectsOverlap(cell, rectOf(pack, b)));
}

export interface BuildResult {
  success: boolean;
  reason?: 'unknown-type' | 'out-of-bounds' | 'occupied' | 'unaffordable';
}

/**
 * Places one instance of a building type on the grid, spending money.
 * (x, y) is the top-left corner of the building's footprint (1x1 unless
 * BuildingType.footprint says otherwise). There is still no demolition —
 * see CLAUDE.md for why that part of the fuller city-builder scope stays
 * deferred.
 */
export function build(pack: ContentPack, state: EconomyState, typeId: string, x: number, y: number): BuildResult {
  const type = pack.buildingTypes.find((t) => t.id === typeId);
  if (!type) return { success: false, reason: 'unknown-type' };

  const { width, height } = footprintOf(type);
  if (x < 0 || y < 0 || x + width > pack.grid.width || y + height > pack.grid.height) {
    return { success: false, reason: 'out-of-bounds' };
  }
  const rect: Rect = { x, y, width, height };
  if (state.placedBuildings.some((b) => rectsOverlap(rect, rectOf(pack, b)))) {
    return { success: false, reason: 'occupied' };
  }
  if (state.money < type.buildCost) return { success: false, reason: 'unaffordable' };

  state.money -= type.buildCost;
  state.placedBuildings.push({ id: `${typeId}@${x},${y}`, type: typeId, x, y });
  return { success: true };
}

export interface TickResult {
  /** Placed building id -> units actually produced this tick (0..capacity, throttled by input availability). */
  produced: Record<string, number>;
  /** Money earned this tick from auto-selling final goods. */
  revenue: number;
}

/**
 * Advances the economy by one tick: each placed building consumes its
 * recipe's inputs from stock (throttled to whatever is actually available)
 * and adds its output to stock, then any resource with a sellPrice is
 * auto-sold off.
 *
 * Buildings run in placement order and each one claims stock before the
 * next — a building placed earlier can starve one placed later that
 * competes for the same input. Acceptable for a single flat economy;
 * revisit with fair-share allocation if that ordering ever becomes a real
 * balance issue.
 */
export function tick(pack: ContentPack, state: EconomyState): TickResult {
  const recipesById = new Map(pack.recipes.map((recipe) => [recipe.id, recipe]));
  const typesById = new Map(pack.buildingTypes.map((type) => [type.id, type]));
  const produced: Record<string, number> = {};

  for (const placed of state.placedBuildings) {
    const type = typesById.get(placed.type);
    if (!type) {
      throw new Error(`Placed building "${placed.id}" references unknown type "${placed.type}"`);
    }
    const recipe = recipesById.get(type.recipe);
    if (!recipe) {
      throw new Error(`Building type "${type.id}" references unknown recipe "${type.recipe}"`);
    }

    let units = type.capacity;
    for (const input of recipe.inputs) {
      const available = state.stocks[input.resource] ?? 0;
      units = Math.min(units, available / input.quantity);
    }
    units = Math.max(0, units);

    for (const input of recipe.inputs) {
      state.stocks[input.resource] -= input.quantity * units;
    }
    state.stocks[recipe.output.resource] = (state.stocks[recipe.output.resource] ?? 0) + recipe.output.quantity * units;

    produced[placed.id] = units;
  }

  let revenue = 0;
  for (const resource of pack.resources) {
    if (resource.sellPrice) {
      const quantity = state.stocks[resource.id] ?? 0;
      revenue += quantity * resource.sellPrice;
      state.stocks[resource.id] = 0;
    }
  }
  state.money += revenue;

  return { produced, revenue };
}
