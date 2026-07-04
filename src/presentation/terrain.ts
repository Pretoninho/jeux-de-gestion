/**
 * Presentation-only ground layer, painted under the buildable grid and its
 * surrounding decorative border. Purely cosmetic — the engine only ever
 * checks ContentPack.grid for placement bounds, never this map. Edited
 * visually via tools/map-editor rather than by hand.
 */

/** Matches a key in ThemeAssets.sprites, prefixed 'terrain-' by convention (e.g. 'terrain-grass'). */
export type TerrainTileId = string;

export interface TerrainMap {
  /** Total canvas size in cells — always >= the buildable ContentPack.grid it wraps. */
  width: number;
  height: number;
  /** Top-left corner (in this canvas) where the buildable ContentPack.grid rectangle sits. */
  buildableOffsetX: number;
  buildableOffsetY: number;
  /** Row-major: tiles[y][x], a TerrainTileId for every cell in the canvas (including the buildable area). */
  tiles: TerrainTileId[][];
}
