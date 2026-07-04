import type { Plugin } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(HERE, '../..');
const TILES_LIBRARY_DIR = resolve(HERE, 'tiles');
const GAME_ASSETS_DIR = resolve(PROJECT_ROOT, 'src/assets/themes/medieval');
const ASSETS_TS_PATH = resolve(PROJECT_ROOT, 'src/content/medieval/assets.ts');

const IMPORTS_START = '// asset-composer:imports:start';
const IMPORTS_END = '// asset-composer:imports:end';
const SPRITES_START = '// asset-composer:sprites:start';
const SPRITES_END = '// asset-composer:sprites:end';

interface Mapping {
  id: string;
  /** { kit, file } refs, bottom-to-top. */
  layers: { kit: string; file: string }[];
}

const UNCATEGORIZED = 'non-categorise';

function categoriesPath(kit: string): string {
  return resolve(TILES_LIBRARY_DIR, kit, 'categories.json');
}

function readCategories(kit: string): Record<string, string> {
  const path = categoriesPath(kit);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Lowercase alphanumeric + hyphens only — this becomes a directory name on disk. */
function sanitizeKitId(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `kit-${Date.now()}`;
}

function toVarName(kit: string, file: string): string {
  return `${kit}_${file}`.replace(/\.png$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
}

function replaceBetweenMarkers(content: string, startMarker: string, endMarker: string, body: string): string {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Markers "${startMarker}"/"${endMarker}" not found in ${ASSETS_TS_PATH}`);
  }
  const before = content.slice(0, startIdx + startMarker.length);
  const after = content.slice(endIdx);
  return `${before}\n${body}\n${after}`;
}

function generateImports(refs: { kit: string; file: string }[]): string {
  return refs
    .map((r) => `import ${toVarName(r.kit, r.file)} from '../../assets/themes/medieval/${r.kit}/${r.file}';`)
    .join('\n');
}

function generateSprites(mappings: Mapping[]): string {
  return mappings
    .map((m) => {
      if (m.layers.length === 1) {
        const l = m.layers[0];
        return `    '${m.id}': { kind: 'image', src: ${toVarName(l.kit, l.file)} },`;
      }
      const layerEntries = m.layers
        .map((l) => `        { kind: 'image', src: ${toVarName(l.kit, l.file)} },`)
        .join('\n');
      return `    '${m.id}': {\n      kind: 'composite',\n      layers: [\n${layerEntries}\n      ],\n    },`;
    })
    .join('\n');
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

/**
 * Dev-only endpoints for tools/asset-composer, all registered via
 * configureServer — a hook Vite only calls for `vite dev`, never for
 * `vite build`. None of this file-write/upload capability ships to the
 * deployed static site.
 */
export function assetComposerSavePlugin(): Plugin {
  return {
    name: 'asset-composer-save',
    configureServer(server) {
      // List every kit (subfolder of tools/asset-composer/tiles/), its files, and their categories.
      server.middlewares.use('/__asset-composer/kits', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        const kits: Record<string, { files: string[]; categories: Record<string, string> }> = {};
        if (existsSync(TILES_LIBRARY_DIR)) {
          for (const entry of readdirSync(TILES_LIBRARY_DIR, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const kitDir = resolve(TILES_LIBRARY_DIR, entry.name);
            const files = readdirSync(kitDir)
              .filter((f) => f.toLowerCase().endsWith('.png'))
              .sort();
            const rawCategories = readCategories(entry.name);
            const categories: Record<string, string> = {};
            for (const file of files) categories[file] = rawCategories[file] ?? UNCATEGORIZED;
            kits[entry.name] = { files, categories };
          }
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ kits }));
      });

      // Reassign a tile's category (creates/updates tiles/<kit>/categories.json).
      server.middlewares.use('/__asset-composer/recategorize', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        readJsonBody<{ kit: string; file: string; category: string }>(req)
          .then(({ kit, file, category }) => {
            if (!kit || !file || !category) throw new Error('kit, file and category are required');
            const categories = readCategories(kit);
            categories[file] = category;
            writeFileSync(categoriesPath(kit), JSON.stringify(categories, null, 2), 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          })
          .catch((err) => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
          });
      });

      // Upload a new kit: multipart/form-data with a `kitId` field and one or more `files`.
      server.middlewares.use('/__asset-composer/upload-kit', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        (async () => {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks);
          const contentType = req.headers['content-type'] ?? '';

          const request = new Request('http://localhost/upload-kit', {
            method: 'POST',
            headers: { 'content-type': contentType },
            body,
          });
          const formData = await request.formData();

          const kitIdRaw = formData.get('kitId');
          const kitId = sanitizeKitId(typeof kitIdRaw === 'string' ? kitIdRaw : '');
          const files = formData.getAll('files').filter((f): f is File => f instanceof File);
          if (files.length === 0) throw new Error('No files uploaded');

          const kitDir = resolve(TILES_LIBRARY_DIR, kitId);
          mkdirSync(kitDir, { recursive: true });
          for (const file of files) {
            if (!file.name.toLowerCase().endsWith('.png')) continue;
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const bytes = Buffer.from(await file.arrayBuffer());
            writeFileSync(resolve(kitDir, safeName), bytes);
          }

          const savedFiles = readdirSync(kitDir)
            .filter((f) => f.toLowerCase().endsWith('.png'))
            .sort();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, kitId, files: savedFiles }));
        })().catch((err) => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
        });
      });

      // Write the composed mapping into src/content/medieval/assets.ts.
      server.middlewares.use('/__asset-composer/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        readJsonBody<{ mappings: Mapping[] }>(req)
          .then(({ mappings }) => {
            if (!Array.isArray(mappings) || mappings.length === 0) {
              throw new Error('No mappings provided');
            }

            const usedRefs = new Map<string, { kit: string; file: string }>();
            for (const m of mappings) for (const l of m.layers) usedRefs.set(`${l.kit}/${l.file}`, l);

            for (const { kit, file } of usedRefs.values()) {
              const destDir = resolve(GAME_ASSETS_DIR, kit);
              if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
              const dest = resolve(destDir, file);
              if (!existsSync(dest)) {
                copyFileSync(resolve(TILES_LIBRARY_DIR, kit, file), dest);
              }
            }

            const sortedRefs = [...usedRefs.values()].sort((a, b) => `${a.kit}/${a.file}`.localeCompare(`${b.kit}/${b.file}`));

            let content = readFileSync(ASSETS_TS_PATH, 'utf-8');
            content = replaceBetweenMarkers(content, IMPORTS_START, IMPORTS_END, generateImports(sortedRefs));
            content = replaceBetweenMarkers(content, SPRITES_START, SPRITES_END, generateSprites(mappings));
            writeFileSync(ASSETS_TS_PATH, content, 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, filesWritten: sortedRefs.map((r) => `${r.kit}/${r.file}`) }));
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
