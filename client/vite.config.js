import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React app runs on :5173 and forwards API calls + images to Express.
// (npm run dev passes API_PORT so this follows PORT in server/.env.)
// Which API the website talks to is set at run time in public/config.js (API_URL) — not here.
const api = `http://localhost:${process.env.API_PORT || 5000}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': api,
      '/uploads': api,
    },
  },
  build: { chunkSizeWarningLimit: 1000 },
});
