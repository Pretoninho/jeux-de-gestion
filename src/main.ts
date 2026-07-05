import { medievalThemeAssets } from './content/medieval/assets';
import { medievalTerrain } from './content/medieval/terrain';
import { cliffSpriteIdBelow } from './presentation/cliffs';
import { spriteToCss, type SpriteCss } from './presentation/tile';
import { loadStoredTerrain } from './presentation/terrainStorage';

/**
 * This file is a throwaway dev harness proving the engine, the medieval content
 * pack, and the game loop wire together end to end. It is not the real UI —
 * that comes later.
 *
 * Deliberately minimal right now: behind "Nouvelle partie" there is only the
 * map, nothing else — being rebuilt back up piece by piece on request.
 */

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('#app not found');
const app = appElement;

function renderLanding(): void {
  app.innerHTML = `
    <div class="landing">
      <h1>Le Royaume</h1>
      <p class="tagline">Bâtis ton domaine médiéval — artisanat, garnison, et la pression du budget municipal.</p>
      <div class="landing-actions">
        <button id="new-game">Nouvelle partie</button>
        <button id="open-map-editor" class="secondary-btn">Éditeur de carte</button>
      </div>
    </div>
  `;
  app.querySelector<HTMLButtonElement>('#new-game')!.addEventListener('click', startNewGame);
  app.querySelector<HTMLButtonElement>('#open-map-editor')!.addEventListener('click', () => {
    window.location.href = './tools/map-editor/index.html';
  });
}

function startNewGame(): void {
  // Prefer a map painted in tools/map-editor (saved to this browser's localStorage,
  // since the deployed site has no server to write terrain.ts to) over the bundled default.
  const terrain = loadStoredTerrain() ?? medievalTerrain;

  app.innerHTML = `
    <section class="grid-section">
      <div id="grid" class="grid" style="--grid-cols: ${terrain.width}"></div>
    </section>
  `;

  const gridEl = app.querySelector<HTMLDivElement>('#grid')!;

  // Sizes the grid to fill the whole screen: cell size is the largest square
  // that fits both viewport dimensions independently, so a rectangular grid
  // fills the screen edge to edge instead of being capped by the smaller axis.
  function updateGridSize(): void {
    const cellFromWidth = (window.innerWidth - 2 * (terrain.width - 1)) / terrain.width;
    const cellFromHeight = (window.innerHeight - 2 * (terrain.height - 1)) / terrain.height;
    const cellSize = Math.floor(Math.min(cellFromWidth, cellFromHeight));
    gridEl.style.setProperty('--cell-size', `${cellSize}px`);
  }
  updateGridSize();
  window.addEventListener('resize', updateGridSize);

  const terrainCssCache = new Map<string, SpriteCss | null>();
  function terrainCss(tileId: string): SpriteCss | null {
    if (!terrainCssCache.has(tileId)) {
      const sprite = medievalThemeAssets.sprites[tileId];
      terrainCssCache.set(tileId, sprite ? spriteToCss(sprite) : null);
    }
    return terrainCssCache.get(tileId) ?? null;
  }

  function renderGrid(): void {
    gridEl.innerHTML = '';
    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        // A cliff wall hanging from the raised cell above fully replaces this
        // cell's own ground tile — see cliffSpriteIdBelow().
        const groundId = cliffSpriteIdBelow(terrain.elevation, x, y) ?? terrain.tiles[y]?.[x] ?? 'terrain-grass';
        const css = terrainCss(groundId);
        if (css) Object.assign(cell.style, css);

        const propId = terrain.props[y]?.[x];
        if (propId) {
          const propCss = terrainCss(propId);
          if (propCss) {
            const propEl = document.createElement('div');
            propEl.className = 'grid-cell__prop';
            Object.assign(propEl.style, propCss);
            propEl.style.backgroundSize = 'contain';
            cell.appendChild(propEl);
          }
        }

        gridEl.appendChild(cell);
      }
    }
  }

  renderGrid();
}

renderLanding();
