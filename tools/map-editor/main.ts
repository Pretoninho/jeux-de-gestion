import { medievalPack } from '../../src/content/medieval';
import { medievalThemeAssets } from '../../src/content/medieval/assets';
import { medievalTerrain } from '../../src/content/medieval/terrain';
import { spriteToCss, type SpriteCss } from '../../src/presentation/tile';
import type { TerrainMap } from '../../src/presentation/terrain';
import { clearStoredTerrain, loadStoredTerrain, saveStoredTerrain } from '../../src/presentation/terrainStorage';

/**
 * Hand-paint the decorative terrain around the buildable grid — grass/water/foam
 * per cell. Shipped with the game (unlike tools/asset-composer) so it works on
 * the deployed static site: "Enregistrer" saves to this browser's localStorage,
 * which the game reads on next "Nouvelle partie". In dev (`npm run dev`) it also
 * writes src/content/medieval/terrain.ts directly, for baking a map permanently
 * into the project — see the "Exporter" button for doing that from a deployed session.
 */

const GRASS_ID = 'terrain-grass';
const DEFAULT_BRUSH = 'terrain-water-foam';

// Discovered from the theme rather than hardcoded, so a future terrain tile
// (rocks, bushes...) added to assets.ts shows up in the palette automatically.
const terrainTileIds = Object.keys(medievalThemeAssets.sprites).filter((id) => id.startsWith('terrain-'));

function cloneTerrain(t: TerrainMap): TerrainMap {
  return { ...t, tiles: t.tiles.map((row) => [...row]) };
}

function cssFor(tileId: string): SpriteCss | null {
  const sprite = medievalThemeAssets.sprites[tileId];
  return sprite ? spriteToCss(sprite) : null;
}

let terrain = cloneTerrain(loadStoredTerrain() ?? medievalTerrain);
let brush = DEFAULT_BRUSH;

/** True for cells inside the locked buildable rectangle (always grass, not paintable here). */
function isBuildable(x: number, y: number): boolean {
  return (
    x >= terrain.buildableOffsetX &&
    x < terrain.buildableOffsetX + medievalPack.grid.width &&
    y >= terrain.buildableOffsetY &&
    y < terrain.buildableOffsetY + medievalPack.grid.height
  );
}

/** Resizes the canvas in place, keeping existing paint where coordinates still exist. */
function resizeTerrain(width: number, height: number): void {
  const next: string[][] = [];
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      row.push(terrain.tiles[y]?.[x] ?? DEFAULT_BRUSH);
    }
    next.push(row);
  }
  terrain = { ...terrain, width, height, tiles: next };
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

app.innerHTML = `
  <h1>Éditeur de carte</h1>
  <p class="hint">Peins le terrain décoratif (herbe/eau/mousse) autour de la zone constructible (grisée, verrouillée).
  "Enregistrer" sauvegarde dans ce navigateur — le jeu l'utilisera à la prochaine "Nouvelle partie", sur cet appareil.
  "Exporter" donne un texte à copier-coller si tu veux que ce soit rendu permanent dans le projet.</p>

  <div class="row">
    <label>Largeur <input type="number" id="width" min="${medievalPack.grid.width}" value="${terrain.width}"></label>
    <label>Hauteur <input type="number" id="height" min="${medievalPack.grid.height}" value="${terrain.height}"></label>
    <label>Décalage X <input type="number" id="offset-x" min="0" value="${terrain.buildableOffsetX}"></label>
    <label>Décalage Y <input type="number" id="offset-y" min="0" value="${terrain.buildableOffsetY}"></label>
    <button id="resize">Appliquer la taille</button>
  </div>

  <h2>Pinceau</h2>
  <div id="palette" class="chips"></div>

  <div class="row">
    <button id="save">Enregistrer</button>
    <button id="export">Exporter</button>
    <button id="reset" class="danger-btn">Réinitialiser</button>
    <span id="save-status" class="hint"></span>
  </div>
  <textarea id="export-area" class="export-area" readonly hidden></textarea>

  <div id="grid-wrap">
    <div id="grid" class="grid" style="--cols: ${terrain.width}"></div>
  </div>
`;

const widthInput = app.querySelector<HTMLInputElement>('#width')!;
const heightInput = app.querySelector<HTMLInputElement>('#height')!;
const offsetXInput = app.querySelector<HTMLInputElement>('#offset-x')!;
const offsetYInput = app.querySelector<HTMLInputElement>('#offset-y')!;
const resizeBtn = app.querySelector<HTMLButtonElement>('#resize')!;
const paletteEl = app.querySelector<HTMLDivElement>('#palette')!;
const gridEl = app.querySelector<HTMLDivElement>('#grid')!;
const saveBtn = app.querySelector<HTMLButtonElement>('#save')!;
const exportBtn = app.querySelector<HTMLButtonElement>('#export')!;
const resetBtn = app.querySelector<HTMLButtonElement>('#reset')!;
const saveStatus = app.querySelector<HTMLSpanElement>('#save-status')!;
const exportArea = app.querySelector<HTMLTextAreaElement>('#export-area')!;

function renderPalette(): void {
  paletteEl.innerHTML = '';
  for (const tileId of terrainTileIds) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    if (tileId === brush) chip.classList.add('chip--active');
    chip.textContent = tileId.replace('terrain-', '');
    chip.addEventListener('click', () => {
      brush = tileId;
      renderPalette();
    });
    paletteEl.appendChild(chip);
  }
}

function renderGrid(): void {
  gridEl.style.setProperty('--cols', String(terrain.width));
  gridEl.innerHTML = '';
  for (let y = 0; y < terrain.height; y++) {
    for (let x = 0; x < terrain.width; x++) {
      const cell = document.createElement('div');
      cell.className = 'tile-cell';
      const locked = isBuildable(x, y);
      const tileId = locked ? GRASS_ID : (terrain.tiles[y]?.[x] ?? DEFAULT_BRUSH);
      const css = cssFor(tileId);
      if (css) Object.assign(cell.style, css);
      if (locked) {
        cell.classList.add('tile-cell--locked');
        cell.title = 'Zone constructible (verrouillée)';
      } else {
        cell.title = tileId;
        cell.addEventListener('click', () => {
          terrain.tiles[y][x] = brush;
          renderGrid();
        });
      }
      gridEl.appendChild(cell);
    }
  }
}

resizeBtn.addEventListener('click', () => {
  const width = Math.max(medievalPack.grid.width, Number(widthInput.value) || terrain.width);
  const height = Math.max(medievalPack.grid.height, Number(heightInput.value) || terrain.height);
  const offsetX = Math.max(0, Math.min(width - medievalPack.grid.width, Number(offsetXInput.value) || 0));
  const offsetY = Math.max(0, Math.min(height - medievalPack.grid.height, Number(offsetYInput.value) || 0));
  resizeTerrain(width, height);
  terrain.buildableOffsetX = offsetX;
  terrain.buildableOffsetY = offsetY;
  widthInput.value = String(width);
  heightInput.value = String(height);
  offsetXInput.value = String(offsetX);
  offsetYInput.value = String(offsetY);
  renderGrid();
});

saveBtn.addEventListener('click', () => {
  saveStoredTerrain(terrain);
  exportArea.hidden = true;

  if (!import.meta.env.DEV) {
    saveStatus.textContent = 'Enregistré dans ce navigateur — "Nouvelle partie" l\'utilisera. Utilise "Exporter" pour me le transmettre si tu veux le rendre permanent.';
    return;
  }

  // In a local dev session, also write the file directly — convenient when
  // baking a map into the project rather than just this browser's storage.
  saveStatus.textContent = 'Enregistrement dans le projet...';
  fetch('/__map-editor/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(terrain),
  })
    .then((res) => res.json())
    .then((data: { ok: boolean; error?: string }) => {
      saveStatus.textContent = data.ok
        ? 'Enregistré (navigateur + src/content/medieval/terrain.ts).'
        : `Enregistré dans ce navigateur, mais erreur côté fichier : ${data.error}`;
    })
    .catch(() => {
      saveStatus.textContent = 'Enregistré dans ce navigateur (écriture fichier indisponible ici).';
    });
});

exportBtn.addEventListener('click', () => {
  const json = JSON.stringify(terrain, null, 2);
  navigator.clipboard
    ?.writeText(json)
    .then(() => {
      saveStatus.textContent = 'Copié dans le presse-papier — colle-le moi si tu veux que je l\'intègre au projet.';
      exportArea.hidden = true;
    })
    .catch(() => {
      exportArea.value = json;
      exportArea.hidden = false;
      exportArea.select();
      saveStatus.textContent = 'Copie automatique indisponible — le texte est sélectionné ci-dessous, copie-le à la main.';
    });
});

resetBtn.addEventListener('click', () => {
  if (!confirm('Repartir de la carte par défaut du projet ? Ta carte enregistrée dans ce navigateur sera perdue.')) return;
  clearStoredTerrain();
  terrain = cloneTerrain(medievalTerrain);
  widthInput.value = String(terrain.width);
  heightInput.value = String(terrain.height);
  offsetXInput.value = String(terrain.buildableOffsetX);
  offsetYInput.value = String(terrain.buildableOffsetY);
  exportArea.hidden = true;
  saveStatus.textContent = 'Carte par défaut restaurée (pas encore enregistrée).';
  renderGrid();
});

renderPalette();
renderGrid();
