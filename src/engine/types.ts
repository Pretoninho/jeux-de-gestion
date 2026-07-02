export interface Resource {
  id: string;
  label: string;
  /**
   * Price per unit when auto-sold. Only meaningful for resources that no
   * recipe consumes (final goods) — their stock is sold off automatically
   * at the end of every tick and converted to money.
   */
  sellPrice?: number;
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
}

export interface GridSize {
  width: number;
  height: number;
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
}
