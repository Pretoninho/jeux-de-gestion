import { createInitialState, invest, tick } from './engine/simulation';
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
const state = createInitialState(pack, 20);
const resourceById = new Map(pack.resources.map((r) => [r.id, r]));
const recipeById = new Map(pack.recipes.map((r) => [r.id, r]));

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
  <table id="buildings-table">
    <thead>
      <tr>
        <th>Bâtiment</th>
        <th>Recette</th>
        <th>Capacité</th>
        <th>Produit (dernier tick)</th>
        <th>Investir</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>

  <h2>Stocks</h2>
  <p>Chaque ressource sans sprite mappé retombe sur un placeholder coloré — dépose un pack dans <code>src/assets/themes/urban/</code> et complète <code>src/content/urban/assets.ts</code> pour les remplacer un par un.</p>
  <div id="stock-row" class="tile-row"></div>
`;

const moneyEl = app.querySelector('#money')!;
const tickCountEl = app.querySelector('#tick-count')!;
const buildingsBody = app.querySelector('#buildings-table tbody')!;
const stockRow = app.querySelector<HTMLDivElement>('#stock-row')!;
const toggleBtn = app.querySelector<HTMLButtonElement>('#toggle')!;

let lastProduced: Record<string, number> = {};

function render(tickCount = 0): void {
  moneyEl.textContent = state.money.toFixed(2);
  tickCountEl.textContent = String(tickCount);

  buildingsBody.innerHTML = '';
  for (const building of state.buildings) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${building.label}</td>
      <td>${formatRecipe(building.recipe)}</td>
      <td>${building.capacity.toFixed(2)}</td>
      <td>${(lastProduced[building.id] ?? 0).toFixed(2)}</td>
      <td></td>
    `;
    const investBtn = document.createElement('button');
    investBtn.textContent = `+1 (coût ${building.capacityCost})`;
    investBtn.addEventListener('click', () => {
      invest(state, building.id, 1);
      render(tickCount);
    });
    row.lastElementChild!.appendChild(investBtn);
    buildingsBody.appendChild(row);
  }

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
