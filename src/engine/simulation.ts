import type { BudgetCategory, BuildingType, ContentPack, SectorConfig } from './types';

export interface PlacedBuilding {
  id: string;
  /** BuildingType id. */
  type: string;
  x: number;
  y: number;
}

export interface BudgetCategoryState extends BudgetCategory {
  /** Current funding level, 0-100, player-adjustable. */
  level: number;
}

export interface EconomyState {
  /** Resource id -> quantity currently in stock. */
  stocks: Record<string, number>;
  money: number;
  placedBuildings: PlacedBuilding[];
  /** Global tax rate, 0-100. */
  taxRate: number;
  /** Extensible list — see addBudgetCategory() to append at runtime. */
  budgetCategories: BudgetCategoryState[];
  /** Sector id -> satisfaction, 0-100. Drifts toward its target each tick (see tick()). */
  satisfactionBySector: Record<string, number>;
}

export function createInitialState(pack: ContentPack, startingMoney = 0): EconomyState {
  const stocks: Record<string, number> = {};
  for (const resource of pack.resources) stocks[resource.id] = 0;
  const satisfactionBySector: Record<string, number> = {};
  for (const sector of pack.sectors ?? []) satisfactionBySector[sector.id] = 50;
  return {
    stocks,
    money: startingMoney,
    placedBuildings: [],
    taxRate: 0,
    budgetCategories: (pack.budgetCategories ?? []).map((category) => ({ ...category, level: 50 })),
    satisfactionBySector,
  };
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Sets the global tax rate (0-100), clamping out-of-range input. */
export function setTaxRate(state: EconomyState, rate: number): void {
  state.taxRate = clampPercent(rate);
}

/** Sets a budget category's funding level (0-100), clamping out-of-range input. */
export function setBudgetCategoryLevel(state: EconomyState, categoryId: string, level: number): void {
  const category = state.budgetCategories.find((c) => c.id === categoryId);
  if (!category) throw new Error(`Unknown budget category "${categoryId}"`);
  category.level = clampPercent(level);
}

/** Appends a new budget category at runtime (e.g. from a dev tool), starting at 50% funding. */
export function addBudgetCategory(state: EconomyState, category: BudgetCategory): void {
  if (state.budgetCategories.some((c) => c.id === category.id)) {
    throw new Error(`Budget category "${category.id}" already exists`);
  }
  state.budgetCategories.push({ ...category, level: 50 });
}

const DEFAULT_CATEGORY_COST_PER_BUILDING = 0.5;
/** Fraction of the gap to target closed per tick — the "inertia" that makes satisfaction drift instead of snap. */
const SATISFACTION_INERTIA = 0.12;

function targetSatisfaction(state: EconomyState, sector: SectorConfig): number {
  const taxPenalty = (state.taxRate / 100) * 40 * (sector.taxSensitivity ?? 1);
  let spendingEffect = 0;
  for (const category of state.budgetCategories) {
    const weight = category.weightBySector[sector.id] ?? 0;
    spendingEffect += ((category.level - 50) / 50) * 25 * weight;
  }
  return clampPercent(50 - taxPenalty + spendingEffect);
}

export interface SectorMultipliers {
  /** Scales a building's production capacity. */
  capacity: number;
  /** Scales a resource's sale price. */
  price: number;
}

/** Derives a sector's throughput/price multipliers from its current satisfaction. Exported for UI previews. */
export function multipliersForSatisfaction(satisfaction: number): SectorMultipliers {
  return {
    capacity: 0.6 + (satisfaction / 100) * 0.7,
    price: 0.6 + (satisfaction / 100) * 0.6,
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
  /** Money earned this tick from auto-selling final goods, including the tax skim on top. */
  revenue: number;
  /** Money spent this tick funding budget categories. */
  spending: number;
}

/**
 * Advances the economy by one tick:
 * 1. Each sector's satisfaction drifts a bit closer to its target (tax rate
 *    + budget category funding, see targetSatisfaction()) — this inertia is
 *    what makes a bad budget call take a while to hurt, and a while to fix.
 * 2. Each placed building consumes its recipe's inputs from stock (throttled
 *    to whatever is available, and scaled by its sector's capacity
 *    multiplier) and adds its output to stock.
 * 3. Any resource with a sellPrice is auto-sold off, scaled by its sector's
 *    price multiplier; the tax rate skims an extra cut of that revenue.
 * 4. Budget categories cost money in proportion to the number of placed
 *    buildings — a bigger economy costs more to run at the same funding %.
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

  const multipliersBySector: Record<string, SectorMultipliers> = {};
  for (const sector of pack.sectors ?? []) {
    const target = targetSatisfaction(state, sector);
    const current = state.satisfactionBySector[sector.id] ?? 50;
    const next = current + (target - current) * SATISFACTION_INERTIA;
    state.satisfactionBySector[sector.id] = next;
    multipliersBySector[sector.id] = multipliersForSatisfaction(next);
  }

  for (const placed of state.placedBuildings) {
    const type = typesById.get(placed.type);
    if (!type) {
      throw new Error(`Placed building "${placed.id}" references unknown type "${placed.type}"`);
    }
    const recipe = recipesById.get(type.recipe);
    if (!recipe) {
      throw new Error(`Building type "${type.id}" references unknown recipe "${type.recipe}"`);
    }

    const capacityMult = type.sector ? (multipliersBySector[type.sector]?.capacity ?? 1) : 1;
    let units = type.capacity * capacityMult;
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

  let salesRevenue = 0;
  for (const resource of pack.resources) {
    if (resource.sellPrice) {
      const priceMult = resource.sector ? (multipliersBySector[resource.sector]?.price ?? 1) : 1;
      const quantity = state.stocks[resource.id] ?? 0;
      salesRevenue += quantity * resource.sellPrice * priceMult;
      state.stocks[resource.id] = 0;
    }
  }
  const revenue = salesRevenue * (1 + state.taxRate / 100);

  let spending = 0;
  for (const category of state.budgetCategories) {
    const cost = category.costPerBuilding ?? DEFAULT_CATEGORY_COST_PER_BUILDING;
    spending += (category.level / 100) * cost * state.placedBuildings.length;
  }

  state.money += revenue - spending;

  return { produced, revenue, spending };
}
