import type { ThemeAssets } from './assets';

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

/**
 * Renders one tile/icon for an engine id. Falls back to a colored square
 * with an initial when the active theme has no sprite mapped yet, so art
 * can be dropped in later without any code change.
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

  el.style.backgroundImage = `url(${sprite.src})`;
  if (sprite.kind === 'spritesheet') {
    el.style.backgroundPosition = `-${sprite.x * sprite.tileWidth}px -${sprite.y * sprite.tileHeight}px`;
    el.style.backgroundRepeat = 'no-repeat';
  } else {
    el.style.backgroundSize = 'cover';
  }
  return el;
}
