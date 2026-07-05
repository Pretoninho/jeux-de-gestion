import type { TerrainMap } from '../../presentation/terrain';

/**
 * Default terrain: the buildable rectangle (pack.grid, offset by
 * buildableOffsetX/Y below) ringed by a single tile of coastline foam.
 * Edit visually with `npm run dev` -> /tools/map-editor/index.html rather
 * than by hand — the tool writes this file directly.
 */
export const medievalTerrain: TerrainMap = {
  width: 8,
  height: 14,
  buildableOffsetX: 1,
  buildableOffsetY: 1,
  tiles: [
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass"],
    ["terrain-water-foam", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-grass", "terrain-water-foam"],
    ["terrain-water", "terrain-water", "terrain-water", "terrain-water", "terrain-water", "terrain-water", "terrain-water", "terrain-water"],
  ],
  elevation: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  props: [
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["prop-water-rock-4", "prop-water-rock-4", "prop-water-rock-4", "prop-water-rock-4", "prop-water-rock-4", "prop-water-rock-4", "prop-water-rock-4", "prop-water-rock-4"],
  ],
};
