import { medievalPack } from '../../src/content/medieval';

interface LayerRef {
  kit: string;
  file: string;
}

interface PendingMapping {
  id: string;
  /** Bottom-to-top. */
  layers: LayerRef[];
}

interface KitData {
  files: string[];
  categories: Record<string, string>;
}

const KNOWN_CATEGORIES = [
  'sol',
  'eau',
  'mur-porte',
  'nature',
  'personnage',
  'vehicule',
  'mobilier',
  'outil-objet',
  'feu-lumiere',
  'non-categorise',
];

let kits: Record<string, KitData> = {};
let currentLayers: LayerRef[] = [];
const pendingMappings: PendingMapping[] = [];
let filterText = '';
let activeCategory: string | null = null;
let categorizeMode = false;
let categorizingTarget: LayerRef | null = null;

const knownIds = [...medievalPack.resources.map((r) => r.id), ...medievalPack.buildingTypes.map((t) => t.id)];

function tileUrl(ref: LayerRef): string {
  return `/tools/asset-composer/tiles/${ref.kit}/${ref.file}`;
}

/** Same stacking convention as src/presentation/tile.ts: last-added layer renders on top. */
function applyLayeredBackground(el: HTMLElement, layers: LayerRef[]): void {
  const urls = layers.map(tileUrl).reverse();
  el.style.backgroundImage = urls.map((u) => `url(${u})`).join(', ');
  el.style.backgroundPosition = urls.map(() => '0 0').join(', ');
  el.style.backgroundRepeat = urls.map(() => 'no-repeat').join(', ');
  el.style.backgroundSize = urls.map(() => 'cover').join(', ');
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

app.innerHTML = `
  <h1>Asset Composer</h1>
  <p class="hint">Outil de dev — pas expédié avec le jeu. Compose des icônes en empilant des tuiles, assigne-les à un id du pack, puis enregistre directement dans <code>src/content/medieval/assets.ts</code>.</p>

  <section>
    <h2>Importer un kit</h2>
    <div class="row">
      <input id="kit-name" type="text" placeholder="nom du kit (ex: sci-fi-pack)" />
      <input id="kit-files" type="file" accept="image/png" multiple />
      <button id="kit-upload">Importer</button>
      <span id="kit-upload-status"></span>
    </div>
  </section>

  <section>
    <h2>Tuiles disponibles</h2>
    <div class="row">
      <input id="filter" type="text" placeholder="filtrer par nom de fichier..." />
      <button id="toggle-categorize">Mode catégorisation : OFF</button>
    </div>
    <div id="category-chips" class="chips"></div>
    <div id="recategorize-panel" class="recategorize-panel" hidden>
      <span id="recategorize-target"></span>
      <select id="recategorize-select"></select>
      <button id="recategorize-save">Enregistrer la catégorie</button>
      <button id="recategorize-cancel">Annuler</button>
    </div>
    <div id="tile-browser"></div>
  </section>

  <section>
    <h2>Composition en cours</h2>
    <div class="row">
      <div id="preview" class="preview"></div>
      <div id="layer-stack" class="layer-stack"></div>
    </div>
    <div class="row">
      <input id="mapping-id" type="text" list="known-ids" placeholder="id (ex: logi-scrapyard)" />
      <datalist id="known-ids">
        ${knownIds.map((id) => `<option value="${id}"></option>`).join('')}
      </datalist>
      <button id="add-mapping">Ajouter au mapping</button>
      <button id="clear-layers">Vider la composition</button>
    </div>
  </section>

  <section>
    <h2>Mappings en attente</h2>
    <table id="pending-table">
      <thead><tr><th>Aperçu</th><th>Id</th><th>Calques</th><th></th></tr></thead>
      <tbody></tbody>
    </table>
    <button id="save-mappings">Enregistrer dans le projet</button>
    <span id="save-status"></span>
  </section>
`;

const tileBrowserEl = app.querySelector<HTMLDivElement>('#tile-browser')!;
const filterEl = app.querySelector<HTMLInputElement>('#filter')!;
const categoryChipsEl = app.querySelector<HTMLDivElement>('#category-chips')!;
const toggleCategorizeBtn = app.querySelector<HTMLButtonElement>('#toggle-categorize')!;
const recategorizePanelEl = app.querySelector<HTMLDivElement>('#recategorize-panel')!;
const recategorizeTargetEl = app.querySelector<HTMLSpanElement>('#recategorize-target')!;
const recategorizeSelectEl = app.querySelector<HTMLSelectElement>('#recategorize-select')!;
const previewEl = app.querySelector<HTMLDivElement>('#preview')!;
const layerStackEl = app.querySelector<HTMLDivElement>('#layer-stack')!;
const mappingIdEl = app.querySelector<HTMLInputElement>('#mapping-id')!;
const pendingTbody = app.querySelector<HTMLTableSectionElement>('#pending-table tbody')!;
const saveStatusEl = app.querySelector<HTMLSpanElement>('#save-status')!;
const kitNameEl = app.querySelector<HTMLInputElement>('#kit-name')!;
const kitFilesEl = app.querySelector<HTMLInputElement>('#kit-files')!;
const kitUploadStatusEl = app.querySelector<HTMLSpanElement>('#kit-upload-status')!;

recategorizeSelectEl.innerHTML = KNOWN_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');

async function loadKits(): Promise<void> {
  const res = await fetch('/__asset-composer/kits');
  const data = (await res.json()) as { kits: Record<string, KitData> };
  kits = data.kits;
  renderCategoryChips();
  renderTileBrowser();
}

function allCategoriesPresent(): string[] {
  const set = new Set<string>();
  for (const kit of Object.values(kits)) for (const cat of Object.values(kit.categories)) set.add(cat);
  return KNOWN_CATEGORIES.filter((c) => set.has(c));
}

function renderCategoryChips(): void {
  categoryChipsEl.innerHTML = '';
  for (const cat of allCategoriesPresent()) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    if (cat === activeCategory) chip.classList.add('chip--active');
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      activeCategory = activeCategory === cat ? null : cat;
      renderCategoryChips();
      renderTileBrowser();
    });
    categoryChipsEl.appendChild(chip);
  }
}

function openRecategorizePanel(ref: LayerRef): void {
  categorizingTarget = ref;
  recategorizeTargetEl.textContent = `${ref.kit}/${ref.file} — catégorie actuelle : ${kits[ref.kit]?.categories[ref.file] ?? '?'}`;
  recategorizeSelectEl.value = kits[ref.kit]?.categories[ref.file] ?? 'non-categorise';
  recategorizePanelEl.hidden = false;
}

function renderTileBrowser(): void {
  tileBrowserEl.innerHTML = '';
  const needle = filterText.trim().toLowerCase();
  for (const [kit, data] of Object.entries(kits)) {
    const visible = data.files.filter((f) => {
      if (needle && !f.toLowerCase().includes(needle)) return false;
      if (activeCategory && data.categories[f] !== activeCategory) return false;
      return true;
    });
    if (visible.length === 0) continue;

    const heading = document.createElement('h3');
    heading.textContent = `${kit} (${visible.length}/${data.files.length})`;
    tileBrowserEl.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'tile-grid';
    for (const file of visible) {
      const btn = document.createElement('button');
      btn.className = 'tile-btn';
      btn.title = `${file} [${data.categories[file]}]`;
      btn.style.backgroundImage = `url(${tileUrl({ kit, file })})`;
      btn.addEventListener('click', () => {
        if (categorizeMode) {
          openRecategorizePanel({ kit, file });
        } else {
          currentLayers.push({ kit, file });
          renderComposition();
        }
      });
      grid.appendChild(btn);
    }
    tileBrowserEl.appendChild(grid);
  }
}

function renderComposition(): void {
  previewEl.innerHTML = '';
  if (currentLayers.length === 0) {
    previewEl.textContent = '—';
  } else {
    applyLayeredBackground(previewEl, currentLayers);
  }

  layerStackEl.innerHTML = '';
  currentLayers.forEach((layer, i) => {
    const row = document.createElement('div');
    row.className = 'layer-row';
    row.innerHTML = `<span>${i}. ${layer.kit}/${layer.file}</span>`;

    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.disabled = i === 0;
    upBtn.addEventListener('click', () => {
      [currentLayers[i - 1], currentLayers[i]] = [currentLayers[i], currentLayers[i - 1]];
      renderComposition();
    });

    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.disabled = i === currentLayers.length - 1;
    downBtn.addEventListener('click', () => {
      [currentLayers[i], currentLayers[i + 1]] = [currentLayers[i + 1], currentLayers[i]];
      renderComposition();
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      currentLayers.splice(i, 1);
      renderComposition();
    });

    row.appendChild(upBtn);
    row.appendChild(downBtn);
    row.appendChild(removeBtn);
    layerStackEl.appendChild(row);
  });
}

function renderPendingTable(): void {
  pendingTbody.innerHTML = '';
  for (const mapping of pendingMappings) {
    const row = document.createElement('tr');

    const previewCell = document.createElement('td');
    const previewTile = document.createElement('div');
    previewTile.className = 'preview preview--small';
    applyLayeredBackground(previewTile, mapping.layers);
    previewCell.appendChild(previewTile);

    const idCell = document.createElement('td');
    idCell.textContent = mapping.id;

    const layersCell = document.createElement('td');
    layersCell.textContent = mapping.layers.map((l) => l.file).join(' + ');

    const actionCell = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Retirer';
    removeBtn.addEventListener('click', () => {
      const idx = pendingMappings.indexOf(mapping);
      if (idx >= 0) pendingMappings.splice(idx, 1);
      renderPendingTable();
    });
    actionCell.appendChild(removeBtn);

    row.appendChild(previewCell);
    row.appendChild(idCell);
    row.appendChild(layersCell);
    row.appendChild(actionCell);
    pendingTbody.appendChild(row);
  }
}

filterEl.addEventListener('input', () => {
  filterText = filterEl.value;
  renderTileBrowser();
});

toggleCategorizeBtn.addEventListener('click', () => {
  categorizeMode = !categorizeMode;
  toggleCategorizeBtn.textContent = `Mode catégorisation : ${categorizeMode ? 'ON' : 'OFF'}`;
  toggleCategorizeBtn.classList.toggle('chip--active', categorizeMode);
  if (!categorizeMode) recategorizePanelEl.hidden = true;
});

app.querySelector('#recategorize-cancel')!.addEventListener('click', () => {
  recategorizePanelEl.hidden = true;
  categorizingTarget = null;
});

app.querySelector('#recategorize-save')!.addEventListener('click', () => {
  (async () => {
    if (!categorizingTarget) return;
    const category = recategorizeSelectEl.value;
    const res = await fetch('/__asset-composer/recategorize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kit: categorizingTarget.kit, file: categorizingTarget.file, category }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (data.ok) {
      kits[categorizingTarget.kit].categories[categorizingTarget.file] = category;
      recategorizePanelEl.hidden = true;
      categorizingTarget = null;
      renderCategoryChips();
      renderTileBrowser();
    } else {
      window.alert(`Erreur : ${data.error}`);
    }
  })().catch((err) => {
    window.alert(`Erreur : ${err instanceof Error ? err.message : String(err)}`);
  });
});

app.querySelector('#clear-layers')!.addEventListener('click', () => {
  currentLayers = [];
  renderComposition();
});

app.querySelector('#add-mapping')!.addEventListener('click', () => {
  const id = mappingIdEl.value.trim();
  if (!id) {
    window.alert('Renseigne un id.');
    return;
  }
  if (currentLayers.length === 0) {
    window.alert('Ajoute au moins un calque.');
    return;
  }
  const existingIdx = pendingMappings.findIndex((m) => m.id === id);
  const mapping: PendingMapping = { id, layers: [...currentLayers] };
  if (existingIdx >= 0) {
    pendingMappings[existingIdx] = mapping;
  } else {
    pendingMappings.push(mapping);
  }
  currentLayers = [];
  mappingIdEl.value = '';
  renderComposition();
  renderPendingTable();
});

app.querySelector('#save-mappings')!.addEventListener('click', () => {
  (async () => {
    if (pendingMappings.length === 0) {
      saveStatusEl.textContent = 'Rien à enregistrer.';
      return;
    }
    saveStatusEl.textContent = 'Enregistrement...';
    const res = await fetch('/__asset-composer/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mappings: pendingMappings }),
    });
    const data = (await res.json()) as { ok: boolean; filesWritten?: string[]; error?: string };
    saveStatusEl.textContent = data.ok
      ? `OK — assets.ts mis à jour (${data.filesWritten?.length ?? 0} fichier(s) copiés si besoin).`
      : `Erreur : ${data.error}`;
  })().catch((err) => {
    saveStatusEl.textContent = `Erreur : ${err instanceof Error ? err.message : String(err)}`;
  });
});

app.querySelector('#kit-upload')!.addEventListener('click', () => {
  (async () => {
    const kitId = kitNameEl.value.trim();
    const files = kitFilesEl.files;
    if (!kitId) {
      kitUploadStatusEl.textContent = 'Renseigne un nom de kit.';
      return;
    }
    if (!files || files.length === 0) {
      kitUploadStatusEl.textContent = 'Choisis au moins un fichier PNG.';
      return;
    }
    kitUploadStatusEl.textContent = 'Import en cours...';
    const formData = new FormData();
    formData.set('kitId', kitId);
    for (const file of files) formData.append('files', file);

    const res = await fetch('/__asset-composer/upload-kit', { method: 'POST', body: formData });
    const data = (await res.json()) as { ok: boolean; kitId?: string; files?: string[]; error?: string };
    if (data.ok) {
      kitUploadStatusEl.textContent = `OK — ${data.files?.length ?? 0} tuile(s) importée(s) dans "${data.kitId}".`;
      kitFilesEl.value = '';
      await loadKits();
    } else {
      kitUploadStatusEl.textContent = `Erreur : ${data.error}`;
    }
  })().catch((err) => {
    kitUploadStatusEl.textContent = `Erreur : ${err instanceof Error ? err.message : String(err)}`;
  });
});

renderComposition();
renderPendingTable();
loadKits().catch((err) => {
  tileBrowserEl.textContent = `Erreur de chargement des kits : ${err instanceof Error ? err.message : String(err)}`;
});
