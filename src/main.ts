import { build, createInitialState, tick } from './engine/simulation';
import { GameLoop } from './engine/gameLoop';
import { urbanPack } from './content/urban';
import { urbanThemeAssets } from './content/urban/assets';
import { renderTile } from './presentation/tile';

/**
 * This file is a throwaway dev harness proving the engine, the urban content
 * pack, and the game loop wire together end to end. It is not the real UI —
 * that comes later.
 */

const pack = urbanPack;
const state = createInitialState(pack, 150);
const resourceById = new Map(pack.resources.map((r) => [r.id, r]));
const recipeById = new Map(pack.recipes.map((r) => [r.id, r]));
const typeById = new Map(pack.buildingTypes.map((t) => [t.id, t]));

let selectedType: string | null = null;
let lastProduced: Record<string, number> = {};

function formatRecipe(recipeId: string): string {
  const recipe = recipeById.get(recipeId);
  if (!recipe) return recipeId;
  const inputs = recipe.inputs.map((i) => `${i.quantity} ${resourceById.get(i.resource)?.label}`).join(' + ') || '—';
  return `${inputs} → ${recipe.output.quantity} ${resourceById.get(recipe.output.resource)?.label}`;
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

app.innerHTML = `
  <h1>Moteur — harnais de développement</h1>
  <p>Pack: <strong>${pack.label}</strong> — argent: <strong id="money">0</strong> — tick <span id="tick-count">0</span></p>
  <div class="controls">
    <button id="toggle">Démarrer</button>
    <button id="speed-1">x1</button>
    <button id="speed-2">x2</button>
    <button id="speed-5">x5</button>
  </div>

  <h2>Construire</h2>
  <p>Sélectionne un type de bâtiment puis clique une case vide de la grille. Pas de démolition/déplacement pour l'instant (v1 volontairement modeste, voir <code>CLAUDE.md</code>).</p>
  <div id="palette" class="palette"></div>

  <h2>Grille (${pack.grid.width}×${pack.grid.height})</h2>
  <div id="grid" class="grid" style="--grid-cols: ${pack.grid.width}"></div>

  <h2>Stocks</h2>
  <div id="stock-row" class="tile-row"></div>
`;

const moneyEl = app.querySelector('#money')!;
const tickCountEl = app.querySelector('#tick-count')!;
const paletteEl = app.querySelector<HTMLDivElement>('#palette')!;
const gridEl = app.querySelector<HTMLDivElement>('#grid')!;
const stockRow = app.querySelector<HTMLDivElement>('#stock-row')!;
const toggleBtn = app.querySelector<HTMLButtonElement>('#toggle')!;

function renderPalette(): void {
  paletteEl.innerHTML = '';
  for (const type of pack.buildingTypes) {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    if (type.id === selectedType) btn.classList.add('palette-btn--active');
    btn.title = formatRecipe(type.recipe);
    btn.appendChild(renderTile(urbanThemeAssets, type.id, type.label));
    const label = document.createElement('span');
    label.textContent = `${type.label} (${type.buildCost}💰)`;
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      selectedType = selectedType === type.id ? null : type.id;
      render();
    });
    paletteEl.appendChild(btn);
  }
}

function renderGrid(): void {
  gridEl.innerHTML = '';
  for (let y = 0; y < pack.grid.height; y++) {
    for (let x = 0; x < pack.grid.width; x++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      const placed = state.placedBuildings.find((b) => b.x === x && b.y === y);
      if (placed) {
        const type = typeById.get(placed.type)!;
        cell.appendChild(renderTile(urbanThemeAssets, type.id, type.label));
        cell.title = `${type.label} — ${(lastProduced[placed.id] ?? 0).toFixed(1)}/tick`;
      } else {
        cell.classList.add('grid-cell--empty');
        if (selectedType) cell.classList.add('grid-cell--buildable');
        cell.addEventListener('click', () => {
          if (!selectedType) return;
          const result = build(pack, state, selectedType, x, y);
          if (result.success) render();
        });
      }
      gridEl.appendChild(cell);
    }
  }
}

function render(tickCount = 0): void {
  moneyEl.textContent = state.money.toFixed(2);
  tickCountEl.textContent = String(tickCount);
  renderPalette();
  renderGrid();

  stockRow.innerHTML = '';
  for (const resource of pack.resources) {
    const wrapper = document.createElement('div');
    wrapper.className = 'stock-item';
    wrapper.appendChild(renderTile(urbanThemeAssets, resource.id, resource.label));
    const qty = document.createElement('span');
    qty.textContent = (state.stocks[resource.id] ?? 0).toFixed(1);
    wrapper.appendChild(qty);
    stockRow.appendChild(wrapper);
  }
}

const loop = new GameLoop((_delta, tickCount) => {
  lastProduced = tick(pack, state).produced;
  render(tickCount);
}, 1000);

toggleBtn.addEventListener('click', () => {
  if (loop.isRunning) {
    loop.pause();
    toggleBtn.textContent = 'Démarrer';
  } else {
    loop.start();
    toggleBtn.textContent = 'Pause';
  }
});

app.querySelector('#speed-1')!.addEventListener('click', () => loop.setSpeed(1));
app.querySelector('#speed-2')!.addEventListener('click', () => loop.setSpeed(2));
app.querySelector('#speed-5')!.addEventListener('click', () => loop.setSpeed(5));

render();
