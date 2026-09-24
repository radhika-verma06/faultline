/**
 * Installs the one browser the smoke test drives.
 *
 * It goes into `.pw-browsers/` inside the project rather than a shared user cache,
 * so `npm run smoke` runs the same way on a laptop and on a CI runner and neither
 * needs the user's home directory touched. `scripts/smoke.mjs` sets the same path
 * before it loads Playwright.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const path = fileURLToPath(new URL("../.pw-browsers", import.meta.url));

const result = spawnSync("npx", ["playwright", "install", "chromium"], {
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path },
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
