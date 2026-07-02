import type { ThemeAssets } from '../../presentation/assets';
import { DEFAULT_TILE_SIZE } from '../../presentation/assets';

/**
 * No sprites mapped yet — every id falls back to a placeholder tile.
 * Drop a pack into src/assets/themes/demo/ and add entries to `sprites`
 * to replace placeholders one id at a time; nothing else needs to change.
 */
export const demoThemeAssets: ThemeAssets = {
  tileSize: DEFAULT_TILE_SIZE,
  sprites: {},
};
