import type { ThemeAssets } from '../../presentation/assets';
import { DEFAULT_TILE_SIZE } from '../../presentation/assets';

import wrench from '../../assets/themes/urban/tile_0244.png';
import crate from '../../assets/themes/urban/tile_0208.png';
import greenCrate from '../../assets/themes/urban/tile_0300.png';
import truck from '../../assets/themes/urban/tile_0476.png';
import shelf from '../../assets/themes/urban/tile_0328.png';
import marketStall from '../../assets/themes/urban/tile_0276.png';
import safe from '../../assets/themes/urban/tile_0444.png';

/**
 * Sprites from Kenney's "RPG Urban Kit" (CC0, see CREDITS.md). `logi-parts`
 * has no good match in the pack and stays on the placeholder fallback on
 * purpose — proof the two paths still coexist.
 */
export const urbanThemeAssets: ThemeAssets = {
  tileSize: DEFAULT_TILE_SIZE,
  sprites: {
    'logi-scrap': { kind: 'image', src: wrench },
    'logi-materials': { kind: 'image', src: crate },
    'logi-packaging': { kind: 'image', src: greenCrate },
    'logi-package': { kind: 'image', src: truck },

    'comm-goods': { kind: 'image', src: shelf },
    'comm-display': { kind: 'image', src: marketStall },
    'comm-sale': { kind: 'image', src: safe },
  },
};
