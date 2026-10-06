// Non-root-base proof (D-15 amended): build with a test base into a separate
// directory, scan it, and run the smoke spec against it. The default dist
// directory is never touched. Phase 5 deployment then only sets SITE_URL and SITE_BASE.
import { spawnSync } from "node:child_process";
import { normalizeBase } from "../site.config.mjs";

const TEST_BASE = "/base-check";
const TEST_OUT = "dist-base-check";
const TEST_PORT = "4322";
const TEST_SITE = "http://localhost:4322";

/** Copy of the given environment plus the four variables that select the test build. */
export function childEnv(env = process.env) {
  return { ...env, SITE_BASE: TEST_BASE, SITE_OUT_DIR: TEST_OUT, SITE_URL: TEST_SITE, E2E_PORT: TEST_PORT };
}

function selfTest() {
  const cases = [
    ["", "/"],
    ["/", "/"],
    ["x", "/x"],
    ["/x/", "/x"],
    ["//x//", "/x"],
  ];
  for (const [input, want] of cases) {
    const got = normalizeBase(input);
    if (got !== want) throw new Error(`self-test: normalizeBase(${JSON.stringify(input)}) = ${got}, expected ${want}`);
  }
  const env = childEnv({ KEEP: "1" });
  if (env.SITE_BASE !== TEST_BASE || env.SITE_OUT_DIR !== TEST_OUT || env.SITE_URL !== TEST_SITE || env.E2E_PORT !== TEST_PORT) {
    throw new Error("self-test: child environment is missing a variable");
  }
  if (env.KEEP !== "1") throw new Error("self-test: child environment dropped the inherited environment");
  console.log("check-base self-test OK");
}

if (process.argv.includes("--self-test")) {
  try {
    selfTest();
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
} else {
  const env = childEnv();
  const steps = [
    ["node", ["scripts/check-env.mjs", "--playwright"]],
    ["npx", ["astro", "build"]],
    ["node", ["scripts/check-dist.mjs"]],
    ["npx", ["playwright", "test", "--project=chromium", "e2e/smoke.spec.ts"]],
  ];
  for (const [cmd, args] of steps) {
    console.log(`check-base: $ ${cmd} ${args.join(" ")}`);
    const r = spawnSync(cmd, args, { env, stdio: "inherit" });
    if (r.status !== 0) {
      console.error(`check-base: step failed: ${cmd} ${args.join(" ")}`);
      process.exit(r.status ?? 1);
    }
  }
  console.log("check-base: OK");
  console.log(`The site works under the non-root base ${TEST_BASE}, so Phase 5 only sets SITE_URL and SITE_BASE.`);
}
