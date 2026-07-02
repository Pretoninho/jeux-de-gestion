import type { FlatSpriteRef, ThemeAssets } from './assets';

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
  return { image: `url(${layer.src})`, position: '0 0', repeat: 'no-repeat', size: 'cover' };
}

/**
 * Renders one tile/icon for an engine id. Falls back to a colored square
 * with an initial when the active theme has no sprite mapped yet, so art
 * can be dropped in later without any code change.
 *
 * Composite sprites (multiple stacked layers, e.g. a wall + a door forming
 * one building icon) are painted via CSS's multi-background support —
 * layers are listed bottom-to-top in data, but CSS paints the first-listed
 * background on top, so the layer order is reversed when building the
 * background-image list.
 */
export function renderTile(assets: ThemeAssets, id: string, label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tile';
  el.style.width = `${assets.tileSize}px`;
  el.style.height = `${assets.tileSize}px`;
  el.title = label;

  const sprite = assets.sprites[id];
  if (!sprite) {
    el.classList.add('tile--placeholder');
    el.style.backgroundColor = placeholderColor(id);
    el.textContent = label.slice(0, 1).toUpperCase();
    return el;
  }

  const layers = (sprite.kind === 'composite' ? sprite.layers : [sprite]).map(layerCss).reverse();
  el.style.backgroundImage = layers.map((l) => l.image).join(', ');
  el.style.backgroundPosition = layers.map((l) => l.position).join(', ');
  el.style.backgroundRepeat = layers.map((l) => l.repeat).join(', ');
  el.style.backgroundSize = layers.map((l) => l.size).join(', ');
  return el;
}
