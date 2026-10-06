// Single source of the deployment-facing constants (D-15 amended).
// Shared by astro.config.mjs, playwright.config.ts and the guard scripts.
//
// Phase 5 flips deployment by setting SITE_URL and SITE_BASE for its build
// (or by editing these defaults). Nothing else changes: every URL in the
// project is base-aware.

/**
 * Normalise a base path: "/" for empty input, otherwise exactly one leading
 * slash, single slashes between segments and no trailing slash.
 * "x", "/x/" and "//x//" all give "/x".
 * @param {string | undefined} raw
 * @returns {string}
 */
export function normalizeBase(raw) {
  const segments = (raw ?? "").split("/").filter((s) => s.length > 0);
  return segments.length === 0 ? "/" : "/" + segments.join("/");
}

export const site = process.env.SITE_URL || "http://localhost:4321";
export const base = normalizeBase(process.env.SITE_BASE);
export const outDir = process.env.SITE_OUT_DIR || "dist";
