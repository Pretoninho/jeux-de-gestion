import type { ThemeAssets } from '../../presentation/assets';
import { DEFAULT_TILE_SIZE } from '../../presentation/assets';

import crate from '../../assets/themes/demo/tile_0208.png';
import wrench from '../../assets/themes/demo/tile_0244.png';
import brick from '../../assets/themes/demo/tile_0072.png';
import greenCrate from '../../assets/themes/demo/tile_0300.png';
import truck from '../../assets/themes/demo/tile_0476.png';
import tree from '../../assets/themes/demo/tile_0232.png';
import water from '../../assets/themes/demo/tile_0172.png';
import lava from '../../assets/themes/demo/tile_0316.png';
import torch from '../../assets/themes/demo/tile_0368.png';

/**
 * Sprites from Kenney's "RPG Urban Kit" (CC0, see CREDITS.md), picked for
 * visual variety rather than thematic fit — this pack is a stand-in until a
 * theme is chosen. About half the demo resources stay unmapped on purpose,
 * to keep the placeholder fallback path exercised alongside real sprites.
 */
export const demoThemeAssets: ThemeAssets = {
  tileSize: DEFAULT_TILE_SIZE,
  sprites: {
    't1-raw-a': { kind: 'image', src: crate },
    't1-raw-b': { kind: 'image', src: wrench },
    't1-raw-c': { kind: 'image', src: brick },
    't1-intermediate-a': { kind: 'image', src: greenCrate },
    't1-export-good': { kind: 'image', src: truck },

    't2-raw-a': { kind: 'image', src: tree },
    't2-export-good': { kind: 'image', src: water },

    't3-raw-a': { kind: 'image', src: lava },
    't3-export-good': { kind: 'image', src: torch },
  },
};
