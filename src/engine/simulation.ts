import type { Building, ContentPack } from './types';

export interface EconomyState {
  /** Resource id -> quantity currently in stock. */
  stocks: Record<string, number>;
  money: number;
  /** Mutable copy of the pack's buildings — capacities grow independently of the (immutable) pack. */
  buildings: Building[];
}

export function createInitialState(pack: ContentPack, startingMoney = 0): EconomyState {
  const stocks: Record<string, number> = {};
  for (const resource of pack.resources) stocks[resource.id] = 0;
  return {
    stocks,
    money: startingMoney,
    buildings: pack.buildings.map((building) => ({ ...building })),
  };
}

export interface TickResult {
  /** Building id -> units actually produced this tick (0..capacity, throttled by input availability). */
  produced: Record<string, number>;
  /** Money earned this tick from auto-selling final goods. */
  revenue: number;
}

/**
 * Advances the economy by one tick: each building consumes its recipe's
 * inputs from stock (throttled to whatever is actually available) and adds
 * its output to stock, then any resource with a sellPrice is auto-sold off.
 *
 * Buildings run in array order and each one claims stock before the next —
 * a building earlier in `pack.buildings` can starve a later one competing
 * for the same input. Acceptable for a single flat economy; revisit with
 * fair-share allocation if that ordering ever becomes a real balance issue.
 */
export function tick(pack: ContentPack, state: EconomyState): TickResult {
  const recipesById = new Map(pack.recipes.map((recipe) => [recipe.id, recipe]));
  const produced: Record<string, number> = {};

  for (const building of state.buildings) {
    const recipe = recipesById.get(building.recipe);
    if (!recipe) {
      throw new Error(`Building "${building.id}" references unknown recipe "${building.recipe}"`);
    }

    let units = building.capacity;
    for (const input of recipe.inputs) {
      const available = state.stocks[input.resource] ?? 0;
      units = Math.min(units, available / input.quantity);
    }
    units = Math.max(0, units);

    for (const input of recipe.inputs) {
      state.stocks[input.resource] -= input.quantity * units;
    }
    state.stocks[recipe.output.resource] = (state.stocks[recipe.output.resource] ?? 0) + recipe.output.quantity * units;

    produced[building.id] = units;
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

/**
 * Spends money to add capacity to a building. Silently caps the increase at
 * whatever `state.money` can afford, and returns the capacity actually
 * added (0 if the building is unaffordable at all).
 */
export function invest(state: EconomyState, buildingId: string, capacityDelta: number): number {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building) {
    throw new Error(`Unknown building "${buildingId}"`);
  }
  if (capacityDelta <= 0) return 0;

  const affordable = building.capacityCost > 0 ? state.money / building.capacityCost : capacityDelta;
  const actualDelta = Math.min(capacityDelta, Math.max(0, affordable));

  building.capacity += actualDelta;
  state.money -= actualDelta * building.capacityCost;
  return actualDelta;
}
