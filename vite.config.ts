import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  build: { target: 'esnext' },
  plugins: [react()],
  server: {
    port: 3003,
  },
  resolve: { // <-- Move alias inside resolve
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
});
