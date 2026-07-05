import type { ElevationLevel } from './terrain';

export type CliffPiece = 'solo' | 'left' | 'mid' | 'right';

/**
 * A raised cell (elevation 1) whose south neighbor is at a lower level needs a
 * cliff-wall sprite hanging below it — only south-facing edges get a wall,
 * since the source art (Tiny Swords) only supplies a south-hanging wall
 * texture (the same convention already used by the water-foam border tile).
 * North/east/west elevation edges render as plain raised grass with no seam,
 * because the flat and elevated ground textures are visually identical.
 *
 * Returns which piece to use for a run of adjacent south-facing wall cells
 * (rounded caps at each end, a repeatable middle piece, or a fully-capped
 * solo piece for a 1-cell-wide run), or null if this cell needs no wall.
 */
export function cliffPieceAt(elevation: ElevationLevel[][], x: number, y: number): CliffPiece | null {
  const height = elevation.length;
  const width = elevation[0]?.length ?? 0;
  const at = (px: number, py: number): ElevationLevel => elevation[py]?.[px] ?? 0;

  if (at(x, y) !== 1) return null;
  const south = y + 1 < height ? at(x, y + 1) : 0;
  if (south === 1) return null;

  const needsWall = (px: number): boolean => {
    if (px < 0 || px >= width) return false;
    if (at(px, y) !== 1) return false;
    const s = y + 1 < height ? at(px, y + 1) : 0;
    return s !== 1;
  };

  const west = needsWall(x - 1);
  const east = needsWall(x + 1);
  if (west && east) return 'mid';
  if (west) return 'right';
  if (east) return 'left';
  return 'solo';
}

/**
 * The wall sprite id to paint in cell (x, y) itself, if the cell directly
 * above it is a raised edge that needs to hang a cliff face down into this
 * one. Fully replaces this cell's own ground tile — the source art draws the
 * wall as a full opaque cell face, so nothing of the lower tile shows through
 * (matches how a real cliff would occlude whatever is at its base).
 */
export function cliffSpriteIdBelow(elevation: ElevationLevel[][], x: number, y: number): string | null {
  if (y === 0) return null;
  const piece = cliffPieceAt(elevation, x, y - 1);
  return piece ? `terrain-cliff-${piece}` : null;
}
