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

export interface Building {
  id: string;
  label: string;
  recipe: string;
  /** Max output units/tick at current capacity. */
  capacity: number;
  /** Money cost to add +1 capacity via invest(). */
  capacityCost: number;
}

export interface ContentPack {
  id: string;
  label: string;
  resources: Resource[];
  recipes: Recipe[];
  /** Starting buildings; capacities grow at runtime via invest(), the pack itself stays immutable. */
  buildings: Building[];
}
