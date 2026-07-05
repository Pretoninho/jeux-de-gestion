import type { ElevationLevel, TerrainMap } from './terrain';

/**
 * Lets the map editor and the game agree on a terrain without a server —
 * both run purely in the browser on the deployed (static) site. The editor
 * writes here; the game reads here first and falls back to the bundled
 * default (src/content/medieval/terrain.ts) if nothing's been saved yet.
 */
const STORAGE_KEY = 'jeux-de-gestion:medieval-terrain';

/** Fills in elevation/props for a terrain saved before those layers existed, so old browser data still loads. */
function normalizeTerrain(t: TerrainMap): TerrainMap {
  const elevation: ElevationLevel[][] =
    t.elevation ?? Array.from({ length: t.height }, () => Array.from({ length: t.width }, () => 0 as ElevationLevel));
  const props: (string | null)[][] = t.props ?? Array.from({ length: t.height }, () => Array.from({ length: t.width }, () => null));
  return { ...t, elevation, props };
}

export function loadStoredTerrain(): TerrainMap | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeTerrain(JSON.parse(raw) as TerrainMap) : null;
  } catch {
    return null;
  }
}

export function saveStoredTerrain(terrain: TerrainMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terrain));
}

export function clearStoredTerrain(): void {
  localStorage.removeItem(STORAGE_KEY);
}
