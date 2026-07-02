import { defineConfig } from 'vite';
import { assetComposerSavePlugin } from './tools/asset-composer/save-plugin';

export default defineConfig({
  base: './',
  // assetComposerSavePlugin only registers its endpoint via configureServer,
  // a dev-only hook — it never runs during `vite build`, so the dev tool's
  // file-write capability never reaches the deployed static site.
  plugins: [assetComposerSavePlugin()],
});
