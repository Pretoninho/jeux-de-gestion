import type { ContentPack, Recipe, Tier } from './types';

export interface TierFlowResult {
  tierId: string;
  /** Resource id imported from the previous tier, or null for the first tier. */
  importResource: string | null;
  /** Total demand for the imported resource across every recipe in this tier that consumes it. */
  need: number;
  /** Actual amount of the imported resource received from the previous tier. */
  received: number;
  /** min(1, received / need); 1 when there is no upstream constraint. */
  efficiency: number;
  /** exportRecipe.capacity * efficiency — becomes `received` for the next tier. */
  exportRate: number;
  /** Resource id this tier exports to the next one. */
  exportResource: string;
}

function findExportRecipe(recipes: Recipe[], tier: Tier): Recipe {
  const recipe = recipes.find((r) => r.id === tier.exportRecipe);
  if (!recipe) {
    throw new Error(`Tier "${tier.id}" references unknown export recipe "${tier.exportRecipe}"`);
  }
  return recipe;
}

/**
 * Resolves the per-tick flow across all tiers of a content pack.
 *
 * Only the cross-tier boundary is throttled: a tier's own recipes are assumed
 * to always meet their local (raw-material) demand. This mirrors the source
 * design's explicit bottleneck formula and is what makes over/under-building a
 * tier's capacity relative to the flow it actually receives a live, ongoing
 * trade-off rather than a one-time gate.
 */
export function resolveFlow(pack: ContentPack): TierFlowResult[] {
  const tiersSorted = [...pack.tiers].sort((a, b) => a.order - b.order);
  const results: TierFlowResult[] = [];

  let previousExportResource: string | null = null;
  let previousExportRate = 0;

  for (const tier of tiersSorted) {
    const exportRecipe = findExportRecipe(pack.recipes, tier);
    const tierRecipes = pack.recipes.filter((r) => r.tier === tier.id);

    let need = 0;
    let received = 0;
    let efficiency = 1;

    if (previousExportResource) {
      const importResource = previousExportResource;
      need = tierRecipes.reduce((sum, r) => {
        const input = r.inputs.find((i) => i.resource === importResource);
        return input ? sum + input.quantity * r.capacity : sum;
      }, 0);
      received = previousExportRate;
      efficiency = need > 0 ? Math.min(1, received / need) : 1;
    }

    const exportRate = exportRecipe.capacity * efficiency;

    results.push({
      tierId: tier.id,
      importResource: previousExportResource,
      need,
      received,
      efficiency,
      exportRate,
      exportResource: exportRecipe.output.resource,
    });

    previousExportResource = exportRecipe.output.resource;
    previousExportRate = exportRate;
  }

  return results;
}
