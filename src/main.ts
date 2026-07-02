import { resolveFlow } from './engine/simulation';
import { GameLoop } from './engine/gameLoop';
import { demoPack } from './content/demo';
import { demoThemeAssets } from './content/demo/assets';
import { renderTile } from './presentation/tile';
import type { ContentPack } from './engine/types';

/**
 * This file is a throwaway dev harness proving the engine, the demo content
 * pack, and the game loop wire together end to end. It is not the real UI —
 * that comes later once a theme and a per-tier control mode are chosen.
 */

const pack: ContentPack = structuredClone(demoPack);
const tierLabelById = new Map(pack.tiers.map((t) => [t.id, t.label]));
const resourceLabelById = new Map(pack.resources.map((r) => [r.id, r.label]));

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

app.innerHTML = `
  <h1>Moteur — harnais de développement</h1>
  <p>Pack: <strong>${pack.label}</strong> — tick <span id="tick-count">0</span></p>
  <div class="controls">
    <button id="toggle">Démarrer</button>
    <button id="speed-1">x1</button>
    <button id="speed-2">x2</button>
    <button id="speed-5">x5</button>
    <button id="bump">+10 capacité export Tier I</button>
  </div>
  <table id="flow-table">
    <thead>
      <tr>
        <th>Palier</th>
        <th>Ressource importée</th>
        <th>Besoin</th>
        <th>Reçu</th>
        <th>Efficacité</th>
        <th>Sortie réelle</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>

  <h2>Aperçu des tuiles</h2>
  <p>Chaque ressource/palier sans sprite mappé retombe sur un placeholder coloré — dépose un pack dans <code>src/assets/themes/demo/</code> et complète <code>src/content/demo/assets.ts</code> pour les remplacer un par un.</p>
  <div id="tile-preview" class="tile-row"></div>
`;

const tbody = app.querySelector('tbody')!;
const tickCountEl = app.querySelector('#tick-count')!;
const toggleBtn = app.querySelector<HTMLButtonElement>('#toggle')!;

function render(tickCount = 0): void {
  const results = resolveFlow(pack);
  tbody.innerHTML = results
    .map(
      (r) => `
      <tr>
        <td>${tierLabelById.get(r.tierId)}</td>
        <td>${r.importResource ? resourceLabelById.get(r.importResource) : '—'}</td>
        <td>${r.need.toFixed(2)}</td>
        <td>${r.received.toFixed(2)}</td>
        <td>${(r.efficiency * 100).toFixed(1)}%</td>
        <td>${r.exportRate.toFixed(2)}</td>
      </tr>`,
    )
    .join('');
  tickCountEl.textContent = String(tickCount);
}

const loop = new GameLoop((_delta, tickCount) => render(tickCount), 1000);

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

app.querySelector('#bump')!.addEventListener('click', () => {
  const exportRecipe = pack.recipes.find((r) => r.id === 't1-export');
  if (exportRecipe) exportRecipe.capacity += 10;
  render();
});

const tilePreview = app.querySelector<HTMLDivElement>('#tile-preview')!;
for (const resource of pack.resources) {
  tilePreview.appendChild(renderTile(demoThemeAssets, resource.id, resource.label));
}

render();
