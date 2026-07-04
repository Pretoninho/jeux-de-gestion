import type { TerrainMap } from './terrain';

/**
 * Lets the map editor and the game agree on a terrain without a server —
 * both run purely in the browser on the deployed (static) site. The editor
 * writes here; the game reads here first and falls back to the bundled
 * default (src/content/medieval/terrain.ts) if nothing's been saved yet.
 */
const STORAGE_KEY = 'jeux-de-gestion:medieval-terrain';

export function loadStoredTerrain(): TerrainMap | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TerrainMap) : null;
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
