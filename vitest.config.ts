import { getViteConfig } from "astro/config";

// Keeps Vitest away from e2e/*.spec.ts (Playwright owns those). The configuration goes
// through Astro's getViteConfig so the Svelte integration compiles .svelte files, which lets
// a component test server-render TokenDisplay with `render` from svelte/server (PD-05).
export default getViteConfig({
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
