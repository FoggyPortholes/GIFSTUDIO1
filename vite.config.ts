import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  plugins: [react()],
  server: { port: 5173, strictPort: false },
});
