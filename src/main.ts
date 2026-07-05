import { medievalPack } from './content/medieval';
import { medievalThemeAssets } from './content/medieval/assets';
import { medievalTerrain } from './content/medieval/terrain';
import type { ContentPack } from './engine/types';
import { GameLoop } from './engine/gameLoop';
import { build, buildingAt, createInitialState, footprintOf, tick, type BuildResult, type EconomyState } from './engine/simulation';
import { cliffSpriteIdBelow } from './presentation/cliffs';
import { renderTile, spriteToCss, type SpriteCss } from './presentation/tile';
import type { TerrainMap } from './presentation/terrain';
import { loadStoredTerrain } from './presentation/terrainStorage';

/**
 * This file is a throwaway dev harness proving the engine, the medieval content
 * pack, and the game loop wire together end to end. It is not the real UI —
 * that comes later. Being rebuilt back up piece by piece on request: the map
 * came back first (nothing else), building placement is the next slice.
 */

const STARTING_MONEY = 150;

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

/** The pack's buildable rectangle, read out of the active TerrainMap's elevation layer. */
function elevationForPack(terrain: TerrainMap, grid: { width: number; height: number }): (0 | 1)[][] {
  const rows: (0 | 1)[][] = [];
  for (let y = 0; y < grid.height; y++) {
    const row: (0 | 1)[] = [];
    for (let x = 0; x < grid.width; x++) {
      row.push(terrain.elevation[y + terrain.buildableOffsetY]?.[x + terrain.buildableOffsetX] ?? 0);
    }
    rows.push(row);
  }
  return rows;
}

const BUILD_REJECTION_LABELS: Record<NonNullable<BuildResult['reason']>, string> = {
  'unknown-type': 'Type de bâtiment inconnu',
  'out-of-bounds': 'Hors des limites de la grille',
  occupied: 'Case déjà occupée',
  unaffordable: 'Argent insuffisant',
  'uneven-terrain': 'Terrain inégal sous ce bâtiment',
};

let loop: GameLoop | null = null;

function startNewGame(): void {
  loop?.pause();

  // Prefer a map painted in tools/map-editor (saved to this browser's localStorage,
  // since the deployed site has no server to write terrain.ts to) over the bundled default.
  const terrain = loadStoredTerrain() ?? medievalTerrain;
  const pack: ContentPack = { ...medievalPack, elevation: elevationForPack(terrain, medievalPack.grid) };
  const state: EconomyState = createInitialState(pack, STARTING_MONEY);
  let selectedType = pack.buildingTypes[0]?.id ?? null;

  app.innerHTML = `
    <section class="grid-section">
      <div id="grid" class="grid" style="--grid-cols: ${terrain.width}"></div>
    </section>
    <div class="hero">
      <div class="status-bar">
        <span class="status-chip">Argent : <strong id="money">${STARTING_MONEY}</strong></span>
      </div>
      <p class="hint" id="build-status"></p>
      <div id="palette" class="palette"></div>
    </div>
  `;

  const gridEl = app.querySelector<HTMLDivElement>('#grid')!;
  const moneyEl = app.querySelector<HTMLElement>('#money')!;
  const buildStatusEl = app.querySelector<HTMLParagraphElement>('#build-status')!;
  const paletteEl = app.querySelector<HTMLDivElement>('#palette')!;

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

  function updateMoney(): void {
    moneyEl.textContent = state.money.toFixed(0);
  }

  function attemptBuild(x: number, y: number): void {
    if (!selectedType) return;
    const type = pack.buildingTypes.find((t) => t.id === selectedType)!;
    const result = build(pack, state, selectedType, x, y);
    buildStatusEl.textContent = result.success
      ? `Bâti : ${type.label}`
      : `Refusé — ${BUILD_REJECTION_LABELS[result.reason ?? 'unknown-type']}`;
    updateMoney();
    if (result.success) renderGrid();
  }

  function renderPalette(): void {
    paletteEl.innerHTML = '';
    for (const type of pack.buildingTypes) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-btn';
      if (type.id === selectedType) btn.classList.add('palette-btn--active');
      btn.appendChild(renderTile(medievalThemeAssets, type.id, type.label));
      const caption = document.createElement('span');
      caption.textContent = `${type.label} (${type.buildCost})`;
      btn.appendChild(caption);
      btn.addEventListener('click', () => {
        selectedType = type.id;
        renderPalette();
      });
      paletteEl.appendChild(btn);
    }
  }

  function renderGrid(): void {
    gridEl.innerHTML = '';
    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        const packX = x - terrain.buildableOffsetX;
        const packY = y - terrain.buildableOffsetY;
        const inGrid = packX >= 0 && packX < pack.grid.width && packY >= 0 && packY < pack.grid.height;
        const building = inGrid ? buildingAt(pack, state, packX, packY) : undefined;

        // A cell covered by a multi-cell building but not its origin gets no DOM
        // node at all — CSS Grid's auto-placement skips the area the origin's
        // own grid-column/row span already claims, so this still lines up.
        if (building && !(building.x === packX && building.y === packY)) continue;

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

        if (building) {
          const type = pack.buildingTypes.find((t) => t.id === building.type)!;
          const { width, height } = footprintOf(type);
          cell.style.gridColumn = `span ${width}`;
          cell.style.gridRow = `span ${height}`;
          cell.appendChild(renderTile(medievalThemeAssets, type.id, type.label, true));
        } else if (inGrid) {
          cell.classList.add('grid-cell--buildable');
          cell.addEventListener('click', () => attemptBuild(packX, packY));
        }

        gridEl.appendChild(cell);
      }
    }
  }

  renderPalette();
  renderGrid();

  loop = new GameLoop(() => {
    tick(pack, state);
    updateMoney();
  });
  loop.start();
}

renderLanding();
