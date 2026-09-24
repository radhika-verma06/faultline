import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Two kinds of test, and they need different environments.
 *
 * The engine, the item bank and the knowledge base are pure, so `*.test.ts` runs
 * in plain Node: no DOM, no network, nothing to flake. The interface is a state
 * machine over those pure functions, so `*.test.tsx` runs in jsdom and drives the
 * real components — that is `src/app/flow.test.tsx`, and it exists because the
 * unit tests can prove the engine and still leave the wiring to the page entirely
 * unchecked.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    reporters: ["default"],
  },
});
