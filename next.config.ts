import type { NextConfig } from "next";

/**
 * Two ways to serve this, from one config.
 *
 *   npm run demo                   the laptop, a real Node server on :3311
 *   GITHUB_PAGES=1 npm run build   a static export for GitHub Pages
 *
 * GitHub Pages serves a project site from a subpath, so the export build takes a
 * base path. Neither branch changes what the app does: the diagnosis engine runs
 * entirely on the client, so the export is the same app, prerendered.
 *
 * `allowedDevOrigins` is not housekeeping. In development Next serves its client
 * runtime — the thing that hydrates the page — from dev-only resources, and it
 * refuses those to any host it does not recognise as its own origin. The failure
 * that produces is the worst kind: the server sends finished, correct HTML, the
 * page renders perfectly, and *nothing on it works*. No handler fires, no error is
 * shown, and the one interactive element a student meets — the form on the start
 * screen — submits natively and reloads the page back to where it started. That is
 * indistinguishable from a broken app, and it took a real browser to see it,
 * because `127.0.0.1` and `localhost` are different origins even though they are
 * the same machine and the same server.
 *
 * Both loopback names are declared here. Add an address for anything else you
 * serve it to — a phone on the LAN, a tunnel — or it will be served inert too.
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "[::1]"],
  ...(process.env.GITHUB_PAGES
    ? { output: "export" as const, basePath: "/faultline" }
    : {}),
};

export default nextConfig;
