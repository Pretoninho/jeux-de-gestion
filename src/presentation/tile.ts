import type { FlatSpriteRef, SpriteRef, ThemeAssets } from './assets';

/** Deterministic color from an id, so unmapped resources still look distinct and stable across reloads. */
function placeholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

interface LayerCss {
  image: string;
  position: string;
  repeat: string;
  size: string;
}

function layerCss(layer: FlatSpriteRef): LayerCss {
  if (layer.kind === 'spritesheet') {
    return {
      image: `url(${layer.src})`,
      position: `-${layer.x * layer.tileWidth}px -${layer.y * layer.tileHeight}px`,
      repeat: 'no-repeat',
      size: 'auto',
    };
  }
  // 'contain' (not 'cover'): several sprites — buildings especially — aren't
  // square (e.g. a tall house or a wide castle), and icons/tiles are always
  // rendered into a square box; 'cover' would crop the top/bottom or sides
  // to fill it. 'contain' shows the whole sprite, letterboxed if needed.
  return { image: `url(${layer.src})`, position: 'center', repeat: 'no-repeat', size: 'contain' };
}

export interface SpriteCss {
  backgroundImage: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  backgroundSize: string;
}

/**
 * Flattens a sprite (single layer or composite) into CSS multi-background
 * strings. Layers are listed bottom-to-top in data, but CSS paints the
 * first-listed background on top, so the layer order is reversed here.
 * Exported so callers that don't want a whole `.tile` element (e.g. a grid
 * cell painting a ground sprite as its own background) can reuse it.
 */
export function spriteToCss(sprite: SpriteRef): SpriteCss {
  const layers = (sprite.kind === 'composite' ? sprite.layers : [sprite]).map(layerCss).reverse();
  return {
    backgroundImage: layers.map((l) => l.image).join(', '),
    backgroundPosition: layers.map((l) => l.position).join(', '),
    backgroundRepeat: layers.map((l) => l.repeat).join(', '),
    backgroundSize: layers.map((l) => l.size).join(', '),
  };
}

/**
 * Renders one tile/icon for an engine id. Falls back to a colored square
 * with an initial when the active theme has no sprite mapped yet, so art
 * can be dropped in later without any code change.
 *
 * `fill: true` sizes the element to 100% of its parent instead of the fixed
 * tile size — for a building whose footprint spans multiple grid cells, the
 * caller stretches the parent cell across those cells (see main.ts) and the
 * icon just needs to fill whatever size that ends up being.
 */
export function renderTile(assets: ThemeAssets, id: string, label: string, fill = false): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tile';
  if (fill) {
    el.style.width = '100%';
    el.style.height = '100%';
  } else {
    el.style.width = `${assets.tileSize}px`;
    el.style.height = `${assets.tileSize}px`;
  }
  el.title = label;

  const sprite = assets.sprites[id];
  if (!sprite) {
    el.classList.add('tile--placeholder');
    el.style.backgroundColor = placeholderColor(id);
    el.textContent = label.slice(0, 1).toUpperCase();
    return el;
  }

  Object.assign(el.style, spriteToCss(sprite));
  return el;
}
