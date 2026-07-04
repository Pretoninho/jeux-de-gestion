import { defineConfig } from 'vite';
import { assetComposerSavePlugin } from './tools/asset-composer/save-plugin';
import { mapEditorSavePlugin } from './tools/map-editor/save-plugin';

export default defineConfig({
  base: './',
  // Both plugins only register their endpoint via configureServer, a dev-only
  // hook — it never runs during `vite build`, so neither dev tool's file-write
  // capability reaches the deployed static site.
  plugins: [assetComposerSavePlugin(), mapEditorSavePlugin()],
});
