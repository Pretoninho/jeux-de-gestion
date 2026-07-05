import { medievalPack } from '../../src/content/medieval';
import { medievalThemeAssets } from '../../src/content/medieval/assets';
import { medievalTerrain } from '../../src/content/medieval/terrain';
import { cliffSpriteIdBelow } from '../../src/presentation/cliffs';
import { spriteToCss, type SpriteCss } from '../../src/presentation/tile';
import type { ElevationLevel, TerrainMap } from '../../src/presentation/terrain';
import { clearStoredTerrain, loadStoredTerrain, saveStoredTerrain } from '../../src/presentation/terrainStorage';

/**
 * Hand-paint the decorative terrain around the buildable grid: ground tile,
 * elevation (raised cells get a cliff wall where they meet lower ground —
 * see src/presentation/cliffs.ts) and decorative props (bushes, rocks...),
 * one editable layer at a time. Shipped with the game (unlike
 * tools/asset-composer) so it works on the deployed static site:
 * "Enregistrer" saves to this browser's localStorage, which the game reads
 * on next "Nouvelle partie". In dev (`npm run dev`) it also writes
 * src/content/medieval/terrain.ts directly, for baking a map permanently
 * into the project — see the "Exporter" button for doing that from a
 * deployed session.
 */

const GRASS_ID = 'terrain-grass';
const DEFAULT_TERRAIN_BRUSH = 'terrain-water-foam';

// Discovered from the theme rather than hardcoded, so a future terrain tile
// (rocks, bushes...) added to assets.ts shows up in the palette automatically.
const terrainTileIds = Object.keys(medievalThemeAssets.sprites).filter((id) => id.startsWith('terrain-') && !id.startsWith('terrain-cliff-'));
const propIds = Object.keys(medievalThemeAssets.sprites).filter((id) => id.startsWith('prop-'));

type Mode = 'terrain' | 'elevation' | 'props';
const MODES: { id: Mode; label: string }[] = [
  { id: 'terrain', label: 'Sol' },
  { id: 'elevation', label: 'Élévation' },
  { id: 'props', label: 'Décor' },
];

function cssFor(tileId: string): SpriteCss | null {
  const sprite = medievalThemeAssets.sprites[tileId];
  return sprite ? spriteToCss(sprite) : null;
}

function cloneTerrain(t: TerrainMap): TerrainMap {
  return {
    ...t,
    tiles: t.tiles.map((row) => [...row]),
    elevation: t.elevation.map((row) => [...row]),
    props: t.props.map((row) => [...row]),
  };
}

let terrain = cloneTerrain(loadStoredTerrain() ?? medievalTerrain);
let mode: Mode = 'terrain';
let terrainBrush = DEFAULT_TERRAIN_BRUSH;
let elevationBrush: ElevationLevel = 1;
let propBrush: string | null = propIds[0] ?? null;

/** True for cells inside the buildable rectangle — always grass, and only editable in "Élévation" mode. */
function isBuildable(x: number, y: number): boolean {
  return (
    x >= terrain.buildableOffsetX &&
    x < terrain.buildableOffsetX + medievalPack.grid.width &&
    y >= terrain.buildableOffsetY &&
    y < terrain.buildableOffsetY + medievalPack.grid.height
  );
}

/** Resizes the canvas in place, keeping existing paint (all 3 layers) where coordinates still exist. */
function resizeTerrain(width: number, height: number): void {
  const tiles: string[][] = [];
  const elevation: ElevationLevel[][] = [];
  const props: (string | null)[][] = [];
  for (let y = 0; y < height; y++) {
    const tileRow: string[] = [];
    const elevRow: ElevationLevel[] = [];
    const propRow: (string | null)[] = [];
    for (let x = 0; x < width; x++) {
      tileRow.push(terrain.tiles[y]?.[x] ?? DEFAULT_TERRAIN_BRUSH);
      elevRow.push(terrain.elevation[y]?.[x] ?? 0);
      propRow.push(terrain.props[y]?.[x] ?? null);
    }
    tiles.push(tileRow);
    elevation.push(elevRow);
    props.push(propRow);
  }
  terrain = { ...terrain, width, height, tiles, elevation, props };
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

app.innerHTML = `
  <h1>Éditeur de carte</h1>
  <p class="hint">Peins le terrain autour de la zone constructible (verrouillée, toujours en herbe) : trois calques
  indépendants — sol décoratif, élévation (un bâtiment ne peut se poser que sur une zone plane) et décor. Bascule
  entre eux ci-dessous. "Enregistrer" sauvegarde dans ce navigateur — le jeu l'utilisera à la prochaine
  "Nouvelle partie". "Exporter" donne un texte à copier-coller si tu veux que ce soit rendu permanent dans le projet.</p>

  <div class="row">
    <label>Largeur <input type="number" id="width" min="${medievalPack.grid.width}" value="${terrain.width}"></label>
    <label>Hauteur <input type="number" id="height" min="${medievalPack.grid.height}" value="${terrain.height}"></label>
    <label>Décalage X <input type="number" id="offset-x" min="0" value="${terrain.buildableOffsetX}"></label>
    <label>Décalage Y <input type="number" id="offset-y" min="0" value="${terrain.buildableOffsetY}"></label>
    <button id="resize">Appliquer la taille</button>
  </div>

  <h2>Calque</h2>
  <div id="mode-selector" class="chips"></div>

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
const modeSelectorEl = app.querySelector<HTMLDivElement>('#mode-selector')!;
const paletteEl = app.querySelector<HTMLDivElement>('#palette')!;
const gridEl = app.querySelector<HTMLDivElement>('#grid')!;
const saveBtn = app.querySelector<HTMLButtonElement>('#save')!;
const exportBtn = app.querySelector<HTMLButtonElement>('#export')!;
const resetBtn = app.querySelector<HTMLButtonElement>('#reset')!;
const saveStatus = app.querySelector<HTMLSpanElement>('#save-status')!;
const exportArea = app.querySelector<HTMLTextAreaElement>('#export-area')!;

function renderModeSelector(): void {
  modeSelectorEl.innerHTML = '';
  for (const m of MODES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    if (m.id === mode) chip.classList.add('chip--active');
    chip.textContent = m.label;
    chip.addEventListener('click', () => {
      mode = m.id;
      renderModeSelector();
      renderPalette();
      renderGrid();
    });
    modeSelectorEl.appendChild(chip);
  }
}

function renderPalette(): void {
  paletteEl.innerHTML = '';

  if (mode === 'terrain') {
    for (const tileId of terrainTileIds) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      if (tileId === terrainBrush) chip.classList.add('chip--active');
      chip.textContent = tileId.replace('terrain-', '');
      chip.addEventListener('click', () => {
        terrainBrush = tileId;
        renderPalette();
      });
      paletteEl.appendChild(chip);
    }
    return;
  }

  if (mode === 'elevation') {
    const options: { value: ElevationLevel; label: string }[] = [
      { value: 0, label: 'Plat' },
      { value: 1, label: 'Élevé' },
    ];
    for (const option of options) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      if (option.value === elevationBrush) chip.classList.add('chip--active');
      chip.textContent = option.label;
      chip.addEventListener('click', () => {
        elevationBrush = option.value;
        renderPalette();
      });
      paletteEl.appendChild(chip);
    }
    return;
  }

  // mode === 'props'
  const eraser = document.createElement('button');
  eraser.type = 'button';
  eraser.className = 'chip';
  if (propBrush === null) eraser.classList.add('chip--active');
  eraser.textContent = 'Aucun';
  eraser.addEventListener('click', () => {
    propBrush = null;
    renderPalette();
  });
  paletteEl.appendChild(eraser);

  for (const propId of propIds) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    if (propId === propBrush) chip.classList.add('chip--active');
    chip.textContent = propId.replace('prop-', '');
    chip.addEventListener('click', () => {
      propBrush = propId;
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

      const inBuildable = isBuildable(x, y);
      // A cliff wall hanging from the raised cell above fully replaces this cell's own ground tile.
      const groundId = cliffSpriteIdBelow(terrain.elevation, x, y) ?? (inBuildable ? GRASS_ID : (terrain.tiles[y]?.[x] ?? DEFAULT_TERRAIN_BRUSH));
      const css = cssFor(groundId);
      if (css) Object.assign(cell.style, css);

      if (terrain.elevation[y]?.[x] === 1) cell.classList.add('tile-cell--elevated');

      const propId = terrain.props[y]?.[x];
      if (propId) {
        const propCss = cssFor(propId);
        if (propCss) {
          const propEl = document.createElement('div');
          propEl.className = 'tile-cell__prop';
          Object.assign(propEl.style, propCss);
          propEl.style.backgroundSize = 'contain';
          cell.appendChild(propEl);
        }
      }

      // The buildable rectangle stays locked to its grass texture and can never carry
      // props, but its elevation is real game data — editable in "Élévation" mode.
      const editable = !inBuildable || mode === 'elevation';
      if (inBuildable) cell.classList.add('tile-cell--buildable-zone');
      if (!editable) {
        cell.classList.add('tile-cell--locked');
        cell.title = 'Zone constructible (verrouillée)';
      } else {
        cell.title = inBuildable ? 'Zone constructible' : groundId;
        cell.addEventListener('click', () => {
          if (mode === 'terrain') terrain.tiles[y][x] = terrainBrush;
          else if (mode === 'elevation') terrain.elevation[y][x] = elevationBrush;
          else terrain.props[y][x] = propBrush;
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

renderModeSelector();
renderPalette();
renderGrid();
