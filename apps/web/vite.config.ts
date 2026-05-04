import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [wasm(), react(), vanillaExtractPlugin()],
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
