import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { defineConfig } from "vite";
import path from "path";

const alias = { "@": path.resolve(__dirname, "src") };

export default defineConfig({
  plugins: [wasm(), react(), vanillaExtractPlugin()],
  resolve: { alias },
  server: {
    port: 5173
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ["@automerge/automerge"]
  },
  test: {
    resolve: { alias },
  },
});
