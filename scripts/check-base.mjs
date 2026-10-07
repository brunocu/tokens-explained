// Non-root-base proof (D-15 amended): build with a test base into a separate
// directory, scan it, and run the smoke spec against it. The default dist
// directory is never touched. Phase 5 deployment then only sets SITE_URL and SITE_BASE.
// Phase 2 and 2.1: the proof also runs the specs that download tokenizer files: the playground's
// automatic GPT-2 download (e2e/playground-load.spec.ts) and the comparison card, which
// shows GPT-2 live and loads BERT on a click (e2e/comparison-load.spec.ts). The tokenizer files are
// fetched by JavaScript from an address the browser builds at run time, which check:dist cannot see
// in the built files; a wrong base in either address fails one of these specs.
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

/** The ordered steps of the proof: [command, arguments]. The specs run after the build they test. */
export function buildSteps() {
  return [
    ["node", ["scripts/check-env.mjs", "--playwright"]],
    ["npx", ["astro", "build"]],
    ["node", ["scripts/check-dist.mjs"]],
    ["npx", ["playwright", "test", "--project=chromium", "e2e/smoke.spec.ts"]],
    ["npx", ["playwright", "test", "--project=chromium", "e2e/playground-load.spec.ts"]],
    ["npx", ["playwright", "test", "--project=chromium", "e2e/comparison-load.spec.ts"]],
  ];
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

  const steps = buildSteps();
  const build = steps.findIndex(([, args]) => args.includes("build"));
  if (build < 0) throw new Error("self-test: the build step is missing from buildSteps()");
  for (const spec of ["e2e/smoke.spec.ts", "e2e/playground-load.spec.ts", "e2e/comparison-load.spec.ts"]) {
    const at = steps.findIndex(([, args]) => args.includes(spec));
    if (at < 0) throw new Error(`self-test: ${spec} is missing from buildSteps()`);
    if (at < build) throw new Error(`self-test: ${spec} runs before the build in buildSteps()`);
  }
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
  for (const [cmd, args] of buildSteps()) {
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
