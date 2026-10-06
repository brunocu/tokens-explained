// Environment guard (plain Node, no dependencies).
//
//   node scripts/check-env.mjs                 Node 24 and the flake variables
//   node scripts/check-env.mjs --playwright    also: npm Playwright == flake browsers
//   node scripts/check-env.mjs --self-test     run built-in good and bad fixtures
//
// Run every command as `nix develop --command COMMAND` (or load the shell with
// direnv). The base checks work before any npm install exists.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const HINT = "Run the command inside the dev shell: nix develop --command COMMAND";

/** Checks that need nothing but the environment. */
export function checkBase(env, nodeVersion) {
  const errors = [];
  const major = Number(String(nodeVersion).split(".")[0]);
  if (major !== 24) {
    errors.push(`Node major version must be 24, got ${nodeVersion}. ${HINT}`);
  }
  for (const name of ["PLAYWRIGHT_BROWSERS_PATH", "PLAYWRIGHT_NIX_VERSION"]) {
    if (!env[name]) errors.push(`${name} is not set. ${HINT}`);
  }
  return errors;
}

/** Directory name Playwright's nixpkgs browsers use for one browsers.json entry. */
export function browserDirName(entry) {
  return `${entry.name.replaceAll("-", "_")}-${entry.revision}`;
}

/**
 * Checks that the npm Playwright version equals the flake's and that every
 * default browser revision exists. `readJson(path)` returns parsed JSON or
 * throws; `dirExists(path)` returns a boolean.
 */
export function checkPlaywright(env, readJson, dirExists) {
  const errors = [];
  const want = env.PLAYWRIGHT_NIX_VERSION;
  const browsersPath = env.PLAYWRIGHT_BROWSERS_PATH;
  if (!want || !browsersPath) {
    return [`PLAYWRIGHT_NIX_VERSION and PLAYWRIGHT_BROWSERS_PATH are required. ${HINT}`];
  }

  let spec;
  try {
    spec = readJson("package.json").devDependencies?.["@playwright/test"];
  } catch (e) {
    return [`cannot read package.json: ${e.message}`];
  }
  if (spec !== want) {
    errors.push(
      `package.json @playwright/test is "${spec}" but must be exactly "${want}" (no caret or tilde)`,
    );
  }

  let installed;
  try {
    installed = readJson("node_modules/@playwright/test/package.json").version;
  } catch {
    errors.push("node_modules/@playwright/test is not installed (run npm install)");
  }
  if (installed !== undefined && installed !== want) {
    errors.push(`installed @playwright/test is ${installed} but the flake provides ${want}`);
  }

  let browsers = [];
  try {
    browsers = readJson("node_modules/playwright-core/browsers.json").browsers ?? [];
  } catch {
    errors.push("node_modules/playwright-core/browsers.json is missing (run npm install)");
  }
  const missing = browsers
    .filter((b) => b.installByDefault)
    .map(browserDirName)
    .filter((dir) => !dirExists(join(browsersPath, dir)));
  if (missing.length > 0) {
    errors.push(
      `browser revisions missing in PLAYWRIGHT_BROWSERS_PATH (${browsersPath}): ${missing.join(", ")}`,
    );
  }
  return errors;
}

function selfTest() {
  const good = {
    PLAYWRIGHT_BROWSERS_PATH: "/b",
    PLAYWRIGHT_NIX_VERSION: "1.63.0",
  };
  const files = (spec, installed) => (path) => {
    if (path === "package.json") return { devDependencies: { "@playwright/test": spec } };
    if (path === "node_modules/@playwright/test/package.json") return { version: installed };
    if (path === "node_modules/playwright-core/browsers.json") {
      return {
        browsers: [
          { name: "chromium", revision: "1243", installByDefault: true },
          { name: "chromium-headless-shell", revision: "1243", installByDefault: true },
          { name: "firefox", revision: "1543", installByDefault: true },
          { name: "android", revision: "1", installByDefault: false },
        ],
      };
    }
    throw new Error(`unexpected read ${path}`);
  };
  const present = new Set(["/b/chromium-1243", "/b/chromium_headless_shell-1243", "/b/firefox-1543"]);
  const has = (p) => present.has(p);

  const cases = [
    ["base ok", checkBase(good, "24.21.0"), true],
    ["wrong node", checkBase(good, "22.12.0"), false],
    ["missing env vars", checkBase({}, "24.21.0"), false],
    ["playwright ok", checkPlaywright(good, files("1.63.0", "1.63.0"), has), true],
    ["version mismatch", checkPlaywright(good, files("1.63.0", "1.62.0"), has), false],
    ["caret pin", checkPlaywright(good, files("^1.63.0", "1.63.0"), has), false],
    [
      "missing browser dir",
      checkPlaywright(good, files("1.63.0", "1.63.0"), (p) => p !== "/b/firefox-1543" && has(p)),
      false,
    ],
    ["playwright without env", checkPlaywright({}, files("1.63.0", "1.63.0"), has), false],
  ];
  const failures = cases.filter(([, errors, shouldPass]) => (errors.length === 0) !== shouldPass);
  if (failures.length > 0) {
    for (const [name, errors] of failures) console.error(`self-test case failed: ${name}`, errors);
    process.exit(1);
  }
  console.log("check-env self-test OK");
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) return selfTest();

  const errors = checkBase(process.env, process.versions.node);
  if (args.includes("--playwright") && errors.length === 0) {
    const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
    errors.push(...checkPlaywright(process.env, readJson, existsSync));
  }
  if (errors.length > 0) {
    for (const e of errors) console.error(`check-env: ${e}`);
    process.exit(1);
  }
  console.log("check-env: OK");
}

main();
