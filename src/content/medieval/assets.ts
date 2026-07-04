import type { ThemeAssets } from '../../presentation/assets';
import { DEFAULT_TILE_SIZE } from '../../presentation/assets';

import grassTile from '../../assets/themes/medieval/tiny-swords/ground-grass.png';
import waterFoamTile from '../../assets/themes/medieval/tiny-swords/water-foam.png';
import waterPlainTile from '../../assets/themes/medieval/tiny-swords/water-plain.png';
import wood from '../../assets/themes/medieval/tiny-swords/terrain-resources-wood-wood-resource-wood-resource.png';
import goldOre from '../../assets/themes/medieval/tiny-swords/terrain-resources-gold-gold-stones-gold-stone-1.png';
import goldIngot from '../../assets/themes/medieval/tiny-swords/terrain-resources-gold-gold-resource-gold-resource.png';
import gear from '../../assets/themes/medieval/tiny-swords/terrain-resources-tools-tool-01.png';
import meat from '../../assets/themes/medieval/tiny-swords/terrain-resources-meat-meat-resource-meat-resource.png';
import supply from '../../assets/themes/medieval/tiny-swords/terrain-resources-tools-tool-04.png';

import woodcutterHouse from '../../assets/themes/medieval/tiny-swords/buildings-blue-buildings-house1.png';
import quarryHouse from '../../assets/themes/medieval/tiny-swords/buildings-blue-buildings-house2.png';
import sawmillHouse from '../../assets/themes/medieval/tiny-swords/buildings-blue-buildings-house3.png';
import foundryTower from '../../assets/themes/medieval/tiny-swords/buildings-blue-buildings-tower.png';
import forgeBarracks from '../../assets/themes/medieval/tiny-swords/buildings-blue-buildings-barracks.png';
import pastureHouse from '../../assets/themes/medieval/tiny-swords/buildings-red-buildings-house1.png';
import tavernMonastery from '../../assets/themes/medieval/tiny-swords/buildings-red-buildings-monastery.png';
import outpostArchery from '../../assets/themes/medieval/tiny-swords/buildings-red-buildings-archery.png';
import fortressCastle from '../../assets/themes/medieval/tiny-swords/buildings-red-buildings-castle.png';

// asset-composer:imports:start
// asset-composer:imports:end

/**
 * Sprites from "Tiny Swords (Free Pack)" by Pixel Frog (free, see CREDITS.md).
 * `craft-planks`, `garrison-provisions` and `garrison-supply-royal` have no
 * good match in the pack and stay on the placeholder fallback on purpose —
 * proof the two paths still coexist.
 *
 * Unlike the retired `urban` pack, every building type here gets its own
 * dedicated building sprite (the pack ships whole-building art per faction
 * color) rather than reusing its output resource's icon as a stand-in.
 * Craft angle uses the Blue faction, Garrison uses Red — purely a visual
 * grouping, not a game mechanic.
 */
export const medievalThemeAssets: ThemeAssets = {
  tileSize: DEFAULT_TILE_SIZE,
  sprites: {
    // Terrain tiles, painted per-cell via tools/map-editor (src/content/medieval/terrain.ts) —
    // 'terrain-water-foam' is a single frozen frame of Water Foam.png's 16-frame loop (frame
    // 12/16), see the pack's tilemap guide (devlog) for the full layer recipe this simplifies.
    'terrain-grass': { kind: 'image', src: grassTile },
    'terrain-water': { kind: 'image', src: waterPlainTile },
    'terrain-water-foam': { kind: 'image', src: waterFoamTile },

    'craft-wood': { kind: 'image', src: wood },
    'craft-gold-ore': { kind: 'image', src: goldOre },
    'craft-ingots': { kind: 'image', src: goldIngot },
    'craft-gear': { kind: 'image', src: gear },

    'garrison-meat': { kind: 'image', src: meat },
    'garrison-supply': { kind: 'image', src: supply },

    'craft-woodcutter': { kind: 'image', src: woodcutterHouse },
    'craft-quarry': { kind: 'image', src: quarryHouse },
    'craft-sawmill': { kind: 'image', src: sawmillHouse },
    'craft-foundry': { kind: 'image', src: foundryTower },
    'craft-forge': { kind: 'image', src: forgeBarracks },

    'garrison-pasture': { kind: 'image', src: pastureHouse },
    'garrison-tavern': { kind: 'image', src: tavernMonastery },
    'garrison-outpost': { kind: 'image', src: outpostArchery },
    'garrison-fortress': { kind: 'image', src: fortressCastle },

    // asset-composer:sprites:start
    // asset-composer:sprites:end
  },
};
