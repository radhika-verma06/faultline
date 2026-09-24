/**
 * The browser smoke test.
 *
 * jsdom proves the components are wired to each other. It cannot prove the page
 * *hydrates*, because it never runs Next's client runtime — and a page that serves
 * fine and hydrates never is a page where nothing works and nothing errors. That
 * is not hypothetical: it is how the start screen shipped dead, with React's
 * handlers unattached so the form submitted natively and reloaded.
 *
 * So this runs a real browser against a real dev server and checks the two things
 * only a real browser can: that React attached, and that a student can get from a
 * name to a diagnosis.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/*
 * Browsers live inside the project, not in a shared cache, so this check is
 * hermetic: `npm run smoke:install` puts the one browser it needs in
 * `.pw-browsers/` and nothing else on the machine is touched. Set before the
 * import, because Playwright reads it when the module loads.
 */
const BROWSERS = fileURLToPath(new URL("../.pw-browsers", import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH = BROWSERS;

if (!existsSync(BROWSERS)) {
  console.error(
    `no browser found at ${BROWSERS}\nrun: npm run smoke:install`,
  );
  process.exit(1);
}

const { chromium } = await import("playwright");

const PORT = process.env.SMOKE_PORT ?? "3311";
const HOSTS = ["127.0.0.1", "localhost"];
const SHOTS = process.env.SMOKE_SHOTS ?? "";

async function reachable(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(port, attempts = 60) {
  for (let left = attempts; left > 0; left -= 1) {
    if (await reachable(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/*
 * Next refuses to run two dev servers for the same directory, so this uses the
 * one on :3311 if it is already up — the common case, because a dev server is
 * what you have open when you are working — and only starts its own when there
 * is nothing there (as in CI). It never kills a server it did not start.
 */
let server = null;
if (!(await reachable(PORT))) {
  console.log(`no dev server on :${PORT}, starting one`);
  server = spawn("npx", ["next", "dev", "--port", PORT], {
    cwd: process.cwd(),
    stdio: ["ignore", "inherit", "inherit"],
    detached: true,
  });
}

let failures = 0;
const check = (label, ok) => {
  console.log(`${ok ? "  ok  " : "FAIL  "} ${label}`);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();

try {
  if (!(await waitForServer(PORT))) {
    throw new Error(`no dev server came up on :${PORT}`);
  }

  for (const host of HOSTS) {
    const url = `http://${host}:${PORT}/`;
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));

    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    console.log(`\n${url}`);

    // 1. Hydration. Without this nothing else can work, whatever the HTML says.
    const hydrated = await page.evaluate(
      () =>
        Object.keys(document.querySelector("form") ?? {}).some((key) =>
          key.startsWith("__reactFiber"),
        ),
    );
    check("React attached to the server-rendered HTML", hydrated);

    // 2. The journey a student actually takes: type a name, press Return.
    const start = await page.textContent("body");
    check("the start screen explains what this is", /fault/i.test(start ?? ""));

    await page.fill("#learner", "Sam");
    await page.press("#learner", "Enter");
    await page.waitForTimeout(900);

    const afterReturn = await page.textContent("body");
    check("Return starts the diagnosis rather than reloading", /Question/.test(afterReturn ?? ""));
    check("no page errors", pageErrors.length === 0);
    if (pageErrors.length > 0) console.log(pageErrors.join("\n"));

    if (SHOTS) await page.screenshot({ path: `${SHOTS}/1-question.png`, fullPage: true });

    // 3. Answer every question. The first option is always a distractor, so this
    //    walks a student who is wrong in a consistent way.
    let asked = 0;
    for (let step = 0; step < 12; step += 1) {
      const options = page.locator("fieldset button");
      if ((await options.count()) === 0) break;
      await options.first().click();
      await page.click("button:has-text('Send this answer')");
      await page.waitForTimeout(500);
      asked += 1;
    }
    check("the session asked more than one question", asked > 1);

    const report = (await page.textContent("body")) ?? "";
    check("the report names a diagnosis", report.includes("The diagnosis"));
    check("the report shows the map", report.includes("The map"));
    check("the report gives something to try", /Two minutes|settles it/.test(report));
    check("still no page errors at the end", pageErrors.length === 0);

    if (SHOTS) await page.screenshot({ path: `${SHOTS}/2-report.png`, fullPage: true });

    await page.close();
  }
} finally {
  if (server !== null) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
  await browser.close();
}

console.log(`\n${failures === 0 ? "smoke: pass" : `smoke: ${failures} failure(s)`}`);
process.exit(failures === 0 ? 0 : 1);
