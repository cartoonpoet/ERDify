import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { defineConfig, type Plugin } from "vite";
import path from "path";
import { writeFileSync } from "fs";

const buildTime = Date.now();

const versionPlugin: Plugin = {
  name: "version-file",
  closeBundle() {
    writeFileSync("dist/version.json", JSON.stringify({ buildTime }));
  },
};

export default defineConfig({
  plugins: [wasm(), react(), vanillaExtractPlugin(), versionPlugin],
  define: {
    __BUILD_TIME__: buildTime,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-flow': ['@xyflow/react'],
          'vendor-automerge': ['@automerge/automerge'],
          'vendor-axios': ['axios'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["@automerge/automerge"]
  },
});
