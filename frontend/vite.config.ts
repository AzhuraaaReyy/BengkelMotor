import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // SPA + Sanctum SPA: proxy ke Laravel backend selama development
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        // Kirim cookie cross-origin agar Sanctum session bekerja di dev
        cookieDomainRewrite: "",
      },
      // Sanctum's CSRF cookie route lives outside /api (not versioned).
      "/sanctum": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        cookieDomainRewrite: "",
      },
    },
  },
  build: {
    sourcemap: false,
  },
});
