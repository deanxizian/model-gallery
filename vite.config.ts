import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
let outputDirectory: string | undefined;
// Historical downloads retain their exact original bytes after the directory move.
const legacyAssets: Record<string, string> = {
  'models/x3-dock/model.stl': 'models/xteink-x3/accessories/x3-dock/model.stl',
  'models/x3-dock/model.step':
    'models/xteink-x3/accessories/x3-dock/model.step',
  'models/x3-dock/poster.png':
    'models/xteink-x3/accessories/x3-dock/poster.png',
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'legacy-model-downloads',
      configResolved(config) {
        outputDirectory =
          config.command === 'build'
            ? resolve(config.root, config.build.outDir)
            : undefined;
      },
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const [path, query] = (req.url ?? '').split('?');
          const destination = legacyAssets[path.replace(/^\//, '')];
          if (destination)
            req.url = `/${destination}${query ? `?${query}` : ''}`;
          next();
        });
      },
      async closeBundle() {
        if (!outputDirectory) return;
        for (const [alias, source] of Object.entries(legacyAssets)) {
          const destination = resolve(outputDirectory, alias);
          await mkdir(dirname(destination), { recursive: true });
          await copyFile(resolve(root, 'public', source), destination);
        }
      },
    },
  ],
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
});
