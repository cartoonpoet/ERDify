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
  },
  optimizeDeps: {
    exclude: ["@automerge/automerge"]
  }
});
