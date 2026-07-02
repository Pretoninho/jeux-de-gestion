import type { ThemeAssets } from '../../presentation/assets';
import { DEFAULT_TILE_SIZE } from '../../presentation/assets';

import wrench from '../../assets/themes/urban/tile_0244.png';
import crate from '../../assets/themes/urban/tile_0208.png';
import greenCrate from '../../assets/themes/urban/tile_0300.png';
import truck from '../../assets/themes/urban/tile_0476.png';
import shelf from '../../assets/themes/urban/tile_0328.png';
import marketStall from '../../assets/themes/urban/tile_0276.png';
import safe from '../../assets/themes/urban/tile_0444.png';

// asset-composer:imports:start
import rpg_urban_kit_tile_0096 from '../../assets/themes/urban/rpg-urban-kit/tile_0096.png';
import rpg_urban_kit_tile_0100 from '../../assets/themes/urban/rpg-urban-kit/tile_0100.png';
// asset-composer:imports:end

/**
 * Sprites from Kenney's "RPG Urban Kit" (CC0, see CREDITS.md). `logi-parts`
 * and `logi-repair-shop` have no good match in the pack and stay on the
 * placeholder fallback on purpose — proof the two paths still coexist.
 *
 * Building types reuse their primary resource's sprite as a stand-in icon
 * on the grid (e.g. the scrapyard shows the wrench it produces) — no
 * dedicated "building" tiles extracted from the kit yet.
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

    'logi-warehouse': { kind: 'image', src: crate },
    'logi-packing-center': { kind: 'image', src: greenCrate },
    'logi-delivery-hub': { kind: 'image', src: truck },

    'comm-wholesaler': { kind: 'image', src: shelf },
    'comm-shopfront': { kind: 'image', src: marketStall },
    'comm-register': { kind: 'image', src: safe },

    // asset-composer:sprites:start
    'logi-scrapyard': {
      kind: 'composite',
      layers: [
        { kind: 'image', src: rpg_urban_kit_tile_0100 },
        { kind: 'image', src: rpg_urban_kit_tile_0096 },
      ],
    },
// asset-composer:sprites:end
  },
};
