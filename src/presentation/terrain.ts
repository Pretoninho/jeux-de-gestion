/**
 * Presentation-only ground layer, painted under the buildable grid and its
 * surrounding decorative border. Purely cosmetic — the engine only ever
 * checks ContentPack.grid for placement bounds, never this map. Edited
 * visually via tools/map-editor rather than by hand.
 */

/** Matches a key in ThemeAssets.sprites, prefixed 'terrain-' by convention (e.g. 'terrain-grass'). */
export type TerrainTileId = string;

/** Matches a key in ThemeAssets.sprites, prefixed 'prop-' by convention (e.g. 'prop-bush-1'). */
export type PropId = string;

/**
 * 0 = base level, 1 = raised one tier. Binary rather than an arbitrary tier
 * count — the source art only supplies one "elevated ground + cliff" variant,
 * and the project's own economy is deliberately single-scale (see CLAUDE.md);
 * stacking further tiers is a possible later extension, not done here.
 */
export type ElevationLevel = 0 | 1;

export interface TerrainMap {
  /** Total canvas size in cells — always >= the buildable ContentPack.grid it wraps. */
  width: number;
  height: number;
  /** Top-left corner (in this canvas) where the buildable ContentPack.grid rectangle sits. */
  buildableOffsetX: number;
  buildableOffsetY: number;
  /** Row-major: tiles[y][x], a TerrainTileId for every cell in the canvas (including the buildable area). */
  tiles: TerrainTileId[][];
  /** Row-major: elevation[y][x] for every cell, including the buildable area — this is what build() checks. */
  elevation: ElevationLevel[][];
  /** Row-major: props[y][x], a purely decorative PropId or null. Never set inside the buildable area. */
  props: (PropId | null)[][];
}
