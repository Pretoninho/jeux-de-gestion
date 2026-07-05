export interface Resource {
  id: string;
  label: string;
  /**
   * Price per unit when auto-sold. Only meaningful for resources that no
   * recipe consumes (final goods) — their stock is sold off automatically
   * at the end of every tick and converted to money.
   */
  sellPrice?: number;
  /**
   * Sector this final good belongs to (see BuildingType.sector), so its
   * sale price can be scaled by that sector's budget/satisfaction. Only
   * meaningful alongside sellPrice.
   */
  sector?: string;
}

export interface RecipeInput {
  /** Resource id consumed by this recipe. */
  resource: string;
  /** Quantity consumed per unit of recipe output. */
  quantity: number;
}

export interface Recipe {
  id: string;
  /** Free list of inputs — 0..n, no fixed shape imposed by the engine. */
  inputs: RecipeInput[];
  output: {
    resource: string;
    quantity: number;
  };
}

export interface BuildingType {
  id: string;
  label: string;
  recipe: string;
  /** Production capacity granted by a single placed instance (units/tick at 100%). */
  capacity: number;
  /** Money cost to place one instance on the grid. */
  buildCost: number;
  /** Footprint in grid cells. Defaults to 1x1 when omitted. */
  footprint?: { width: number; height: number };
  /**
   * Sector this building belongs to for budget/satisfaction purposes (e.g.
   * 'logi', 'comm' — matches a ContentPack.sectors entry). Buildings with no
   * sector are unaffected by the budget system (multiplier stays at 1).
   */
  sector?: string;
}

export interface GridSize {
  width: number;
  height: number;
}

export interface SectorConfig {
  id: string;
  label: string;
  /** How strongly this sector's satisfaction reacts to the tax rate. Default 1. */
  taxSensitivity?: number;
}

export interface BudgetCategory {
  id: string;
  label: string;
  /** Influence on each sector's satisfaction target, 0..1. Need not sum to 1 across categories. */
  weightBySector: Record<string, number>;
  /** Money spent per placed building (economy-wide) per tick, at 100% funding. Default 0.5. */
  costPerBuilding?: number;
}

export interface ContentPack {
  id: string;
  label: string;
  resources: Resource[];
  recipes: Recipe[];
  buildingTypes: BuildingType[];
  /**
   * v1 grid: fixed size, no camera/pan. Buildings may have a footprint
   * larger than 1x1 (see BuildingType.footprint) — a scrollable map is still
   * deliberately out of scope for now, see CLAUDE.md's "Concept de jeu
   * actuel" for the phasing rationale.
   */
  grid: GridSize;
  /**
   * Sectors the budget system tracks satisfaction for. Omit (or leave
   * building types/resources untagged) to opt a pack out of the budget
   * system entirely — it's inert unless a pack declares sectors.
   */
  sectors?: SectorConfig[];
  /** Initial budget categories; more can be added at runtime via addBudgetCategory(). */
  budgetCategories?: BudgetCategory[];
  /**
   * Optional per-cell elevation, row-major (elevation[y][x]), same dims as
   * grid — 0 = base level, 1 = raised. Omit for a flat pack: build() only
   * enforces uniform elevation under a footprint when this is present.
   * Populated from the active TerrainMap's buildable sub-rectangle (see
   * src/presentation/terrain.ts) rather than authored by hand on the pack.
   */
  elevation?: (0 | 1)[][];
}
