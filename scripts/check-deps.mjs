// Supply-chain guard (T-01-SC). The dependency set must equal the human-approved
// allow-list with exact specifiers. Adding a package later is deliberate friction:
// edit ALLOW after a legitimacy review.
import { readFileSync } from "node:fs";

const ALLOW = {
  dependencies: {
    astro: "7.3.5",
    "@astrojs/mdx": "8.0.2",
    "@astrojs/svelte": "9.0.1",
    svelte: "5.57.1",
  },
  devDependencies: {
    typescript: "~6.0.3",
    vitest: "5.0.3",
    "@playwright/test": "1.63.0",
    "@axe-core/playwright": "4.13.0",
    "@astrojs/check": "0.9.10",
    "svelte-check": "4.7.6",
  },
};

/** @returns {string[]} violations */
export function checkPackageJson(pkg) {
  const errors = [];
  for (const section of ["dependencies", "devDependencies"]) {
    const have = pkg[section] ?? {};
    const allowed = ALLOW[section];
    for (const [name, spec] of Object.entries(have)) {
      if (!(name in allowed)) errors.push(`${section}: "${name}" is not on the approved list`);
      else if (allowed[name] !== spec) errors.push(`${section}: "${name}" is "${spec}", approved is "${allowed[name]}"`);
    }
    for (const name of Object.keys(allowed)) {
      if (!(name in have)) errors.push(`${section}: approved package "${name}" is missing`);
    }
  }
  for (const section of ["optionalDependencies", "peerDependencies", "overrides"]) {
    if (pkg[section] && Object.keys(pkg[section]).length > 0) {
      errors.push(`${section} must be empty (found: ${Object.keys(pkg[section]).join(", ")})`);
    }
  }
  return errors;
}

/** @returns {string[]} violations */
export function checkLock(lock) {
  const errors = [];
  if (!lock) return ["package-lock.json is missing"];
  if (!(lock.lockfileVersion >= 3)) errors.push(`lockfileVersion ${lock.lockfileVersion} is below 3`);
  const ts = lock.packages?.["node_modules/typescript"]?.version ?? "";
  const m = /^6\.0\.(\d+)/.exec(ts);
  if (!m || Number(m[1]) < 3) errors.push(`locked typescript is "${ts}", expected 6.0.x with patch 3 or higher`);
  return errors;
}

function selfTest() {
  const good = { dependencies: { ...ALLOW.dependencies }, devDependencies: { ...ALLOW.devDependencies } };
  const fails = (label, errs) => {
    if (errs.length === 0) throw new Error(`self-test: expected a failure for ${label}`);
  };
  if (checkPackageJson(good).length !== 0) throw new Error("self-test: good package.json rejected");
  fails("extra dependency", checkPackageJson({ ...good, dependencies: { ...good.dependencies, evil: "1.0.0" } }));
  const [firstName, firstSpec] = Object.entries(good.dependencies)[0];
  fails("changed specifier", checkPackageJson({ ...good, dependencies: { ...good.dependencies, [firstName]: `^${firstSpec}` } }));
  fails("missing package", checkPackageJson({ ...good, devDependencies: {} }));
  fails("overrides", checkPackageJson({ ...good, overrides: { foo: "1.0.0" } }));
  fails("optionalDependencies", checkPackageJson({ ...good, optionalDependencies: { foo: "1.0.0" } }));
  const goodLock = { lockfileVersion: 3, packages: { "node_modules/typescript": { version: "6.0.3" } } };
  if (checkLock(goodLock).length !== 0) throw new Error("self-test: good lockfile rejected");
  fails("missing lockfile", checkLock(null));
  fails("old lockfile", checkLock({ ...goodLock, lockfileVersion: 2 }));
  fails("typescript 7", checkLock({ lockfileVersion: 3, packages: { "node_modules/typescript": { version: "7.0.2" } } }));
  fails("typescript 6.0.2", checkLock({ lockfileVersion: 3, packages: { "node_modules/typescript": { version: "6.0.2" } } }));
  console.log("check-deps self-test OK");
}

if (process.argv.includes("--self-test")) {
  try {
    selfTest();
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
} else {
  const read = (p) => {
    try {
      return JSON.parse(readFileSync(p, "utf8"));
    } catch {
      return null;
    }
  };
  const pkg = read("package.json");
  const errors = [...(pkg ? checkPackageJson(pkg) : ["package.json is missing"]), ...checkLock(read("package-lock.json"))];
  if (errors.length > 0) {
    for (const e of errors) console.error(`check-deps: ${e}`);
    process.exit(1);
  }
  console.log("check-deps: OK");
}
