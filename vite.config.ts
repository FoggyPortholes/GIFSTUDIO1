import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { version as appVersion } from './package.json';

function resolveGitHash() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    return undefined;
  }
}

const buildManifest = {
  version: appVersion,
  gitHash: resolveGitHash(),
  buildTime: new Date().toISOString()
};

const versionManifestPlugin: Plugin = {
  name: 'studio-version-manifest',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.startsWith('/version.json')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(buildManifest));
        return;
      }
      next();
    });
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify(buildManifest, null, 2)
    });
  }
};

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  plugins: [react(), versionManifestPlugin],
  server: { port: 5173, strictPort: false },
  define: {
    __APP_VERSION__: JSON.stringify(buildManifest.version),
    __APP_GIT_HASH__: JSON.stringify(buildManifest.gitHash ?? ''),
    __APP_BUILD_TIME__: JSON.stringify(buildManifest.buildTime)
  }
});
