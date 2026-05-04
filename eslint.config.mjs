import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Disable rules that conflict with Prettier formatting. Must come last.
  prettier,
  // React 19 / next 16 added a batch of "react-hooks-extra" rules at error
  // level. They flag real concerns (setState-in-effect cascades, mutating
  // captured values, treating components as values, etc.), but they're
  // aggressive on patterns this codebase has shipped against for months.
  // Downgrade to warn so CI doesn't gate on them while we clean up
  // incrementally — they still show up in `pnpm lint` output.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
