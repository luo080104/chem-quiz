import { defineConfig } from "vite";

// base: "./" keeps the built assets relative so the app can be hosted at any
// path (GitHub Pages sub-path, static file host, local preview).
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    outDir: "dist",
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
});
