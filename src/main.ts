import {
  addBudgetCategory,
  buildingAt,
  build,
  createInitialState,
  footprintOf,
  multipliersForSatisfaction,
  setBudgetCategoryLevel,
  setTaxRate,
  tick,
} from './engine/simulation';
import { GameLoop } from './engine/gameLoop';
import { medievalPack } from './content/medieval';
import { medievalThemeAssets } from './content/medieval/assets';
import { renderTile, spriteToCss } from './presentation/tile';

/**
 * This file is a throwaway dev harness proving the engine, the medieval content
 * pack, and the game loop wire together end to end. It is not the real UI —
 * that comes later.
 */

const pack = medievalPack;
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
  <header class="hero">
    <h1>Le Royaume</h1>
    <p class="tagline">Bâtis ton domaine médiéval — artisanat, garnison, et la pression du budget municipal.</p>
    <div class="status-bar">
      <span class="status-chip">💰 <strong id="money">0</strong></span>
      <span class="status-chip">⏱ tick <strong id="tick-count">0</strong></span>
      <span class="status-chip">🏰 ${pack.label}</span>
    </div>
    <div class="controls">
      <button id="toggle">Démarrer</button>
      <button id="speed-1">x1</button>
      <button id="speed-2">x2</button>
      <button id="speed-5">x5</button>
    </div>
  </header>

  <section>
    <h2>Construire</h2>
    <p class="hint">Choisis un bâtiment, puis pose-le sur une case libre du domaine.</p>
    <div id="palette" class="palette"></div>
  </section>

  <section>
    <h2>Domaine (${pack.grid.width}×${pack.grid.height})</h2>
    <div id="grid" class="grid" style="--grid-cols: ${pack.grid.width}"></div>
  </section>

  <section>
    <h2>Réserves</h2>
    <div id="stock-row" class="tile-row"></div>
  </section>

  <section>
    <h2>Budget municipal</h2>
    <p class="hint">Impôts et dépenses publiques modulent la satisfaction de chaque secteur — les effets d'une décision mettent quelques instants à se faire sentir, et autant à se corriger.</p>
    <div class="budget-panel">
      <div class="budget-row">
        <span class="budget-row__label">Impôts</span>
        <output id="tax-reading" class="budget-row__reading">0 %</output>
      </div>
      <input type="range" id="tax-slider" min="0" max="100" value="0" class="budget-slider" aria-label="Taux d'imposition">
      <div id="categories-list" class="categories"></div>
      <button id="add-category" type="button" class="add-btn">+ Catégorie</button>
    </div>
    <div id="gauges" class="gauges"></div>
  </section>
`;

const moneyEl = app.querySelector('#money')!;
const tickCountEl = app.querySelector('#tick-count')!;
const paletteEl = app.querySelector<HTMLDivElement>('#palette')!;
const gridEl = app.querySelector<HTMLDivElement>('#grid')!;
const stockRow = app.querySelector<HTMLDivElement>('#stock-row')!;
const toggleBtn = app.querySelector<HTMLButtonElement>('#toggle')!;
const taxSlider = app.querySelector<HTMLInputElement>('#tax-slider')!;
const taxReading = app.querySelector<HTMLOutputElement>('#tax-reading')!;
const categoriesListEl = app.querySelector<HTMLDivElement>('#categories-list')!;
const addCategoryBtn = app.querySelector<HTMLButtonElement>('#add-category')!;
const gaugesEl = app.querySelector<HTMLDivElement>('#gauges')!;

function renderPalette(): void {
  paletteEl.innerHTML = '';
  for (const type of pack.buildingTypes) {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    if (type.id === selectedType) btn.classList.add('palette-btn--active');
    btn.title = formatRecipe(type.recipe);
    btn.appendChild(renderTile(medievalThemeAssets, type.id, type.label));
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

const groundCss = medievalThemeAssets.ground ? spriteToCss(medievalThemeAssets.ground) : null;

// Category rows and gauge shells are only rebuilt on structural change (init, +Catégorie) — never
// every tick, since these hold <input type="range"> elements a full rebuild would interrupt mid-drag.
function renderCategories(): void {
  categoriesListEl.innerHTML = '';
  for (const category of state.budgetCategories) {
    const row = document.createElement('div');
    row.className = 'category';

    const head = document.createElement('div');
    head.className = 'category__head';
    const label = document.createElement('span');
    label.className = 'category__label';
    label.textContent = category.label;
    const reading = document.createElement('output');
    reading.textContent = `${category.level} %`;
    head.append(label, reading);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(category.level);
    slider.className = 'budget-slider';
    slider.setAttribute('aria-label', `Niveau de financement — ${category.label}`);
    slider.addEventListener('input', () => {
      setBudgetCategoryLevel(state, category.id, Number(slider.value));
      reading.textContent = `${slider.value} %`;
    });

    row.append(head, slider);
    categoriesListEl.appendChild(row);
  }
}

function renderGaugeShells(): void {
  gaugesEl.innerHTML = (pack.sectors ?? [])
    .map(
      (sector) => `
        <div class="gauge">
          <div class="gauge__head">
            <span class="gauge__name">${sector.label}</span>
            <span class="gauge__value" id="satisfaction-${sector.id}">50</span>
          </div>
          <div class="gauge__track"><div class="gauge__fill" id="fill-${sector.id}"></div></div>
          <div class="gauge__mults">
            <span>Capacité <b id="cap-${sector.id}">×1.00</b></span>
            <span>Prix <b id="price-${sector.id}">×1.00</b></span>
          </div>
        </div>
      `,
    )
    .join('');
}

function toneFor(value: number): 'good' | 'warn' | 'danger' {
  if (value >= 60) return 'good';
  if (value >= 35) return 'warn';
  return 'danger';
}

function updateGauges(): void {
  for (const sector of pack.sectors ?? []) {
    const value = state.satisfactionBySector[sector.id] ?? 50;
    const mults = multipliersForSatisfaction(value);
    const valueEl = document.getElementById(`satisfaction-${sector.id}`);
    const fillEl = document.getElementById(`fill-${sector.id}`);
    const capEl = document.getElementById(`cap-${sector.id}`);
    const priceEl = document.getElementById(`price-${sector.id}`);
    if (valueEl) valueEl.textContent = Math.round(value).toString();
    if (fillEl) {
      fillEl.style.width = `${value}%`;
      fillEl.classList.remove('gauge__fill--good', 'gauge__fill--warn', 'gauge__fill--danger');
      fillEl.classList.add(`gauge__fill--${toneFor(value)}`);
    }
    if (capEl) capEl.textContent = `×${mults.capacity.toFixed(2)}`;
    if (priceEl) priceEl.textContent = `×${mults.price.toFixed(2)}`;
  }
}

function renderGrid(): void {
  gridEl.innerHTML = '';
  for (let y = 0; y < pack.grid.height; y++) {
    for (let x = 0; x < pack.grid.width; x++) {
      const placed = buildingAt(pack, state, x, y);
      // Cell covered by a multi-cell building placed elsewhere: its origin
      // cell (below) renders one stretched tile for the whole footprint —
      // skip so CSS grid auto-placement leaves this track for that item.
      if (placed && (placed.x !== x || placed.y !== y)) continue;

      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      if (groundCss) Object.assign(cell.style, groundCss);

      if (placed) {
        const type = typeById.get(placed.type)!;
        const { width, height } = footprintOf(type);
        const multiCell = width > 1 || height > 1;
        if (multiCell) {
          cell.style.gridColumn = `span ${width}`;
          cell.style.gridRow = `span ${height}`;
          cell.style.width = 'auto';
          cell.style.height = 'auto';
        }
        cell.appendChild(renderTile(medievalThemeAssets, type.id, type.label, multiCell));
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
  updateGauges();

  stockRow.innerHTML = '';
  for (const resource of pack.resources) {
    const wrapper = document.createElement('div');
    wrapper.className = 'stock-item';
    wrapper.appendChild(renderTile(medievalThemeAssets, resource.id, resource.label));
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

taxSlider.addEventListener('input', () => {
  setTaxRate(state, Number(taxSlider.value));
  taxReading.textContent = `${taxSlider.value} %`;
});

addCategoryBtn.addEventListener('click', () => {
  const label = prompt('Nom de la nouvelle catégorie de dépense ?');
  if (!label) return;
  const weightBySector: Record<string, number> = {};
  for (const sector of pack.sectors ?? []) {
    const raw = prompt(`Poids de "${label}" sur le secteur "${sector.label}" (0 à 1) ?`, '0.5');
    weightBySector[sector.id] = Number(raw) || 0;
  }
  addBudgetCategory(state, { id: `custom-${Date.now()}`, label, weightBySector });
  renderCategories();
});

renderCategories();
renderGaugeShells();
render();
