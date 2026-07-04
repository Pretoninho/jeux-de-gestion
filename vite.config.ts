import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { assetComposerSavePlugin } from './tools/asset-composer/save-plugin';
import { mapEditorSavePlugin } from './tools/map-editor/save-plugin';

export default defineConfig({
  base: './',
  // Both plugins only register their endpoint via configureServer, a dev-only
  // hook — it never runs during `vite build`. mapEditorSavePlugin's direct
  // file write is dev-only for that reason, but the map editor's *page* is
  // still built below — it degrades to browser localStorage on the deployed
  // site (see tools/map-editor/main.ts), unlike asset-composer which stays
  // dev-only entirely (it has no equivalent client-only fallback).
  plugins: [assetComposerSavePlugin(), mapEditorSavePlugin()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        mapEditor: fileURLToPath(new URL('./tools/map-editor/index.html', import.meta.url)),
      },
    },
  },
});
