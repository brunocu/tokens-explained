// Reader-text safety and privacy lint (T-01-12, T-01-13). Phase 1 has no runtime
// network or storage at all. A later phase that legitimately adds one must edit
// BANNED after review. Walks the src directory itself (not git's file list) so
// new uncommitted files are covered. *.test.ts files are excluded.
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

/** @returns {string[]} names of banned constructs found in `text` */
export function scanText(text) {
  return BANNED.filter((b) => b.re.test(text)).map((b) => b.name);
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
    for (const name of scanText(readFileSync(file, "utf8"))) {
      console.error(`check-repo: ${file} uses banned construct: ${name}`);
      bad++;
    }
  }
  if (bad > 0) process.exit(1);
  console.log(`check-repo: OK (${files.length} files scanned)`);
}
