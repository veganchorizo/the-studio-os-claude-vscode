import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    host: true,
    port: 5173,
    // In dev, proxy API calls to the api container/service.
    proxy: {
      "/api": { target: process.env.VITE_API_PROXY ?? "http://localhost:3000", changeOrigin: true },
      "/health": { target: process.env.VITE_API_PROXY ?? "http://localhost:3000", changeOrigin: true },
    },
  },
  build: { outDir: "dist", sourcemap: true },
});
