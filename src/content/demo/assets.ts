import type { ThemeAssets } from '../../presentation/assets';
import { DEFAULT_TILE_SIZE } from '../../presentation/assets';

import tree from '../../assets/themes/demo/tile_0232.png';
import brick from '../../assets/themes/demo/tile_0072.png';
import crate from '../../assets/themes/demo/tile_0208.png';
import greenCrate from '../../assets/themes/demo/tile_0300.png';

/**
 * Sprites from Kenney's "RPG Urban Kit" (CC0, see CREDITS.md). `stone` has
 * no good match in the pack and stays on the placeholder fallback on
 * purpose — proof the two paths still coexist after the tier rewrite.
 */
export const demoThemeAssets: ThemeAssets = {
  tileSize: DEFAULT_TILE_SIZE,
  sprites: {
    wood: { kind: 'image', src: tree },
    bricks: { kind: 'image', src: brick },
    planks: { kind: 'image', src: crate },
    furniture: { kind: 'image', src: greenCrate },
  },
};
