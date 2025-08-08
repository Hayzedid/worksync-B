import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Node.js environment for all JS/TS files
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.node,
        process: "readonly"
      }
    }
  },
  // Jest globals for test files
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  },
  tseslint.configs.recommended,
]);
