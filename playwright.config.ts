import { defineConfig, devices } from "@playwright/test";
import { base } from "./site.config.mjs";

// Rule: the desktop projects are the verified target and the only gate. The
// phone project and every 360 px check live in files named *.secondary.spec.ts,
// run through `npm run test:e2e:secondary`, are recorded in the SUMMARY and
// never gate the phase (D-15 amended).
const port = process.env.E2E_PORT ?? "4321";
// Trailing slash so page.goto("./") resolves under the base.
const url = `http://localhost:${port}${base === "/" ? "/" : `${base}/`}`;
const secondary = process.env.E2E_SECONDARY === "1";
// Rule: E2E_BASE_URL (a full address such as the live site) exists only for
// the one-off smoke run against the deployed page (D-08). It points the specs
// at that address and starts no local server. CI never sets it. Run it inside
// the Nix shell like every other e2e command; test:e2e still checks the
// environment first.
const remote = process.env.E2E_BASE_URL
  ? process.env.E2E_BASE_URL.replace(/\/*$/, "/")
  : undefined;

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: remote ?? url },
  // --ignore-lock: astro preview otherwise auto-backgrounds in agent
  // environments and Playwright would see the process exit. The preview
  // process inherits SITE_BASE and SITE_OUT_DIR, so it serves whichever
  // build those variables name.
  webServer: remote
    ? undefined
    : {
        command: `npx astro preview --ignore-lock --port ${port}`,
        url,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
  projects: secondary
    ? [
        {
          name: "phone",
          use: { ...devices["Pixel 7"] },
          testMatch: ["**/*.secondary.spec.ts", "**/smoke.spec.ts"],
        },
      ]
    : [
        { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: "**/*.secondary.spec.ts" },
        { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: "**/*.secondary.spec.ts" },
        { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: "**/*.secondary.spec.ts" },
      ],
  reporter: [["list"]],
  retries: process.env.CI ? 1 : 0,
});
