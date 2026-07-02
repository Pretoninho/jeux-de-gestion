/**
 * Presentation-only layer: maps engine ids (resource/tier/recipe ids) to
 * sprite references. The engine (src/engine) never imports from here —
 * this is what lets a theme supply art without touching simulation code.
 */

export interface SpriteSheetRef {
  kind: 'spritesheet';
  src: string;
  tileWidth: number;
  tileHeight: number;
  /** Column index (0-based) within the sheet. */
  x: number;
  /** Row index (0-based) within the sheet. */
  y: number;
}

export interface SingleImageRef {
  kind: 'image';
  src: string;
}

export type SpriteRef = SpriteSheetRef | SingleImageRef;

export interface ThemeAssets {
  /** Canonical render size in px for one tile/icon. 32 unless a theme overrides it. */
  tileSize: number;
  /** Keyed by engine id (Resource.id, Tier.id, Recipe.id, ...). Missing entries fall back to a placeholder tile. */
  sprites: Partial<Record<string, SpriteRef>>;
}

export const DEFAULT_TILE_SIZE = 32;
