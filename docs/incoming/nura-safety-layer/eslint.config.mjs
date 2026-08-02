import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    // NURA GUARD: nura_log is append-only. Only nura-service.ts (the one
    // door) is allowed to touch it, and even there only via INSERT. Every
    // other file is blocked from calling db.update(nuraLog)/db.delete(nuraLog)
    // at lint time. Runtime enforcement is a DB trigger (belt + suspenders).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/nura/nura-service.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^(update|delete)$/] Identifier[name='nuraLog']",
          message:
            "nura_log is append-only. Only nura-service.ts may write to it, and only via INSERT.",
        },
      ],
    },
  },
]);
