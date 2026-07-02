export interface Resource {
  id: string;
  label: string;
}

export interface RecipeInput {
  /** Resource id consumed by this recipe. */
  resource: string;
  /** Quantity consumed per unit of recipe output. */
  quantity: number;
}

export interface Recipe {
  id: string;
  /** Tier id this recipe's building belongs to. */
  tier: string;
  /** Free list of inputs — 0..n, no fixed shape imposed by the engine. */
  inputs: RecipeInput[];
  output: {
    resource: string;
    quantity: number;
  };
  /** Built capacity: max output units/tick at 100% efficiency. */
  capacity: number;
}

export interface Tier {
  id: string;
  /** 0-based order; defines the chain sequence (tier i feeds tier i+1). */
  order: number;
  label: string;
  /**
   * Id of the recipe whose output is the resource that crosses into the
   * next tier. Its capacity is what "Sortie_réelle" scales against.
   */
  exportRecipe: string;
}

export interface ContentPack {
  id: string;
  label: string;
  resources: Resource[];
  tiers: Tier[];
  recipes: Recipe[];
}
