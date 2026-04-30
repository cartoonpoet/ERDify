import globals from "globals";
import base from "./base.js";

export default [
  ...base,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "off"
    }
  }
];
