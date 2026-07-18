import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  minify: true,
  clean: true,
  noExternal: [/^@erdify\//, "commander"],
  // noExternal로 번들된 CJS 패키지(commander)의 require() 호출이 ESM 출력에서
  // 동작하도록 createRequire 배너 주입 — 없으면 Node에서 "Dynamic require of
  // 'events' is not supported" 오류로 CLI가 실행되지 않음
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
