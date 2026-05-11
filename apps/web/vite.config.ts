import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [wasm(), react(), vanillaExtractPlugin()],
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
