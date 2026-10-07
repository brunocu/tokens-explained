// Reader-text safety and privacy lint (T-01-12, T-01-13). Phase 1 has no runtime
// network or storage at all. Phase 2: one reviewed exemption (T-02-21, T-02-23). The
// network-call rule is skipped for exactly the paths in FETCH_ALLOWED_FILES (the loader that
// downloads two same-origin tokenizer files on a button press); every other rule still applies
// to those paths and the network-call rule still applies everywhere else. A later phase that
// legitimately needs more must edit BANNED or FETCH_ALLOWED_FILES after review. Walks the src
// directory itself (not git's file list) so new uncommitted files are covered. *.test.ts files
// are excluded.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const EXTENSIONS = /\.(ts|js|mjs|svelte|astro|mdx|html)$/;

const BANNED = [
  { name: "Svelte raw-HTML tag", re: /\{@html\b/ },
  { name: "innerHTML", re: /\binnerHTML\b/ },
  { name: "outerHTML", re: /\bouterHTML\b/ },
  { name: "insertAdjacentHTML", re: /\binsertAdjacentHTML\b/ },
  { name: "document.write", re: /\bdocument\s*\.\s*write\b/ },
  { name: "localStorage", re: /\blocalStorage\b/ },
  { name: "sessionStorage", re: /\bsessionStorage\b/ },
  { name: "indexedDB", re: /\bindexedDB\b/ },
  { name: "document.cookie", re: /\bdocument\s*\.\s*cookie\b/ },
  { name: "sendBeacon", re: /\bsendBeacon\b/ },
  { name: "XMLHttpRequest", re: /\bXMLHttpRequest\b/ },
  { name: "WebSocket", re: /\bWebSocket\b/ },
  { name: "fetch(", re: /\bfetch\s*\(/ },
  { name: "eval(", re: /\beval\s*\(/ },
  { name: "new Function(", re: /\bnew\s+Function\s*\(/ },
];

/** Files (posix path from the repo root, compared exactly) where the network-call rule is skipped. */
export const FETCH_ALLOWED_FILES = ["src/components/loadTokenizer.ts"];

/**
 * @param {string} text file contents
 * @param {string} [path] posix path from the repo root; decides the network-call exemption
 * @returns {string[]} names of banned constructs found in `text`
 */
export function scanText(text, path) {
  const fetchAllowed = path !== undefined && FETCH_ALLOWED_FILES.includes(path);
  return BANNED.filter((b) => !(fetchAllowed && b.name === "fetch(") && b.re.test(text)).map((b) => b.name);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(path));
    else if (EXTENSIONS.test(entry.name) && !entry.name.endsWith(".test.ts")) out.push(path);
  }
  return out;
}

// One bad fixture per banned construct (built from parts so this file does not
// trip its own scan if it were ever moved under src).
const BAD_FIXTURES = {
  "Svelte raw-HTML tag": "{" + "@html x}",
  innerHTML: "el.inner" + "HTML = x",
  outerHTML: "el.outer" + "HTML = x",
  insertAdjacentHTML: "el.insertAdjacent" + "HTML('beforeend', x)",
  "document.write": "document." + "write(x)",
  localStorage: "local" + "Storage.setItem(a, b)",
  sessionStorage: "session" + "Storage.getItem(a)",
  indexedDB: "indexed" + "DB.open(a)",
  "document.cookie": "document." + "cookie = x",
  sendBeacon: "navigator.send" + "Beacon(url)",
  XMLHttpRequest: "new XML" + "HttpRequest()",
  WebSocket: "new Web" + "Socket(url)",
  "fetch(": "fet" + "ch(url)",
  "eval(": "ev" + "al(code)",
  "new Function(": "new Func" + "tion(code)",
};

function selfTest() {
  for (const b of BANNED) {
    const fixture = BAD_FIXTURES[b.name];
    if (fixture === undefined) throw new Error(`self-test: no bad fixture for ${b.name}`);
    if (!scanText(fixture).includes(b.name)) throw new Error(`self-test: ${b.name} was not detected`);
  }
  const clean = `const x = tokenize(text); // retrieval of values\nconst y = {@const}; evaluate(a); prefetched = 1;`;
  if (scanText(clean).length !== 0) throw new Error(`self-test: clean fixture flagged: ${scanText(clean).join(", ")}`);

  // The network-call exemption (T-02-23): exact path only, and only that one rule.
  const call = BAD_FIXTURES["fetch("];
  const allowed = FETCH_ALLOWED_FILES[0];
  if (FETCH_ALLOWED_FILES.length !== 1 || allowed === undefined) throw new Error("self-test: expected exactly one allowed file");
  if (scanText(call, allowed).length !== 0) throw new Error("self-test: the allowed path was flagged for the network call");
  for (const other of [
    undefined,
    "src/components/OwnText.svelte",
    "src/components/other/loadTokenizer.ts",
    "src/core/loadTokenizer.ts",
    "x/src/components/loadTokenizer.ts",
    `${allowed}.bak`,
    allowed.toUpperCase(),
  ]) {
    if (!scanText(call, other).includes("fetch(")) throw new Error(`self-test: the exemption leaked to ${String(other)}`);
  }
  // The allowed path keeps every other rule.
  for (const b of BANNED) {
    if (b.name === "fetch(") continue;
    if (!scanText(BAD_FIXTURES[b.name], allowed).includes(b.name)) {
      throw new Error(`self-test: ${b.name} is no longer flagged in the allowed path`);
    }
  }
  console.log("check-repo self-test OK");
}

if (process.argv.includes("--self-test")) {
  try {
    selfTest();
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
} else {
  if (!existsSync("src")) {
    console.error("check-repo: src directory not found (run from the project root)");
    process.exit(1);
  }
  const files = walk("src");
  let bad = 0;
  for (const file of files) {
    for (const name of scanText(readFileSync(file, "utf8"), file)) {
      console.error(`check-repo: ${file} uses banned construct: ${name}`);
      bad++;
    }
  }
  if (bad > 0) process.exit(1);
  console.log(`check-repo: OK (${files.length} files scanned)`);
}
