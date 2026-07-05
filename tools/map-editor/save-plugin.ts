import type { Plugin } from 'vite';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(HERE, '../..');
const TERRAIN_TS_PATH = resolve(PROJECT_ROOT, 'src/content/medieval/terrain.ts');

interface TerrainPayload {
  width: number;
  height: number;
  buildableOffsetX: number;
  buildableOffsetY: number;
  tiles: string[][];
  elevation: (0 | 1)[][];
  props: (string | null)[][];
}

function readJsonBody<T>(req: import('node:http').IncomingMessage): Promise<T> {
  return new Promise((resolvePromise, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolvePromise(JSON.parse(body) as T);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function formatRows<T>(rows: T[][]): string {
  return rows.map((row) => `    [${row.map((value) => JSON.stringify(value)).join(', ')}],`).join('\n');
}

function generateTerrainFile(terrain: TerrainPayload): string {
  return `import type { TerrainMap } from '../../presentation/terrain';

/**
 * Default terrain: the buildable rectangle (pack.grid, offset by
 * buildableOffsetX/Y below) ringed by a single tile of coastline foam.
 * Edit visually with \`npm run dev\` -> /tools/map-editor/index.html rather
 * than by hand — the tool writes this file directly.
 */
export const medievalTerrain: TerrainMap = {
  width: ${terrain.width},
  height: ${terrain.height},
  buildableOffsetX: ${terrain.buildableOffsetX},
  buildableOffsetY: ${terrain.buildableOffsetY},
  tiles: [
${formatRows(terrain.tiles)}
  ],
  elevation: [
${formatRows(terrain.elevation)}
  ],
  props: [
${formatRows(terrain.props)}
  ],
};
`;
}

/**
 * Dev-only endpoint for tools/map-editor, registered via configureServer — a
 * hook Vite only calls for `vite dev`, never for `vite build`. The file-write
 * capability never ships to the deployed static site.
 */
export function mapEditorSavePlugin(): Plugin {
  return {
    name: 'map-editor-save',
    configureServer(server) {
      server.middlewares.use('/__map-editor/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        readJsonBody<TerrainPayload>(req)
          .then((terrain) => {
            if (!Array.isArray(terrain.tiles) || terrain.tiles.length === 0) {
              throw new Error('No tiles provided');
            }
            writeFileSync(TERRAIN_TS_PATH, generateTerrainFile(terrain), 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          })
          .catch((err) => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
          });
      });
    },
  };
}
