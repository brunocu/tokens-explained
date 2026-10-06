// URL hygiene scan of the built site (D-15 amended, T-01-06).
// Every URL in the built HTML and CSS must be base-prefixed, point at the site's
// own origin (no third-party fonts or scripts: tokenizing stays private) and
// resolve to a file that exists in the output directory.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { posix } from "node:path";
import { site, base, outDir } from "../site.config.mjs";

const HTML_ATTRS = ["href", "src", "action", "poster", "srcset", "component-url", "renderer-url", "before-hydration-url"];
const ATTR_RE = new RegExp(
  `(?<![\\w-])(${HTML_ATTRS.join("|")})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"']+))`,
  "gi",
);
const CSS_URL_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi;
const SKIP_RE = /^(#|data:|mailto:|tel:)/i;

const decode = (s) => s.replaceAll("&amp;", "&");

/** URL values found in an HTML document. */
export function extractHtmlUrls(html) {
  const urls = [];
  for (const m of html.matchAll(ATTR_RE)) {
    const name = m[1].toLowerCase();
    const raw = decode(m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (name === "srcset") {
      for (const cand of raw.split(",")) {
        const first = cand.trim().split(/\s+/)[0];
        if (first) urls.push(first);
      }
    } else if (raw) {
      urls.push(raw);
    }
  }
  return urls;
}

/** URL values found in a CSS document. */
export function extractCssUrls(css) {
  const urls = [];
  for (const m of css.matchAll(CSS_URL_RE)) {
    const raw = decode(m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (raw) urls.push(raw);
  }
  return urls;
}

/**
 * Check one URL found in `fileRel` (path of the containing file relative to the
 * output directory, posix separators).
 * @returns {{ error: string | null, checked: boolean }}
 */
export function checkUrl(value, { fileRel, siteUrl, baseValue, exists }) {
  if (SKIP_RE.test(value)) return { error: null, checked: false };
  const prefix = baseValue === "/" ? "" : baseValue;
  const siteHost = new URL(siteUrl).host;

  if (/^(https?:)?\/\//i.test(value)) {
    const host = new URL(value.startsWith("//") ? `http:${value}` : value).host;
    if (host !== siteHost) return { error: `third-party origin "${value}" in ${fileRel}`, checked: true };
    return { error: null, checked: true }; // canonical or social URL: not existence-checked
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return { error: `unsupported URL scheme "${value}" in ${fileRel}`, checked: true };
  }

  const bare = value.split(/[?#]/)[0] ?? "";
  let rel;
  if (bare.startsWith("/")) {
    if (!(bare === `${prefix}/` || bare.startsWith(`${prefix}/`))) {
      return { error: `root-absolute URL "${value}" outside the base "${baseValue}" in ${fileRel}`, checked: true };
    }
    rel = bare.slice(prefix.length);
  } else {
    rel = posix.join(posix.dirname(fileRel), bare === "" ? "." : bare);
    if (bare.endsWith("/") && !rel.endsWith("/")) rel += "/";
  }
  rel = rel.replace(/^\/+/, "");
  const target = rel === "" || rel === "." ? "index.html" : rel.endsWith("/") ? `${rel}index.html` : rel;
  if (target.startsWith("..")) return { error: `URL "${value}" escapes the output directory in ${fileRel}`, checked: true };
  if (!exists(target)) return { error: `missing target "${target}" for URL "${value}" in ${fileRel}`, checked: true };
  return { error: null, checked: true };
}

/** The home page must be server-rendered with the playground and chips. */
export function checkIndexHtml(html) {
  const errors = [];
  if (!html.includes("data-playground")) errors.push("index.html has no data-playground");
  if (!html.includes("data-chip")) errors.push("index.html has no server-rendered data-chip");
  return errors;
}

function walk(dir, rel = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(`${dir}/${entry.name}`, childRel));
    else out.push(childRel);
  }
  return out;
}

function selfTest() {
  const files = new Set(["index.html", "_astro/app.js", "_astro/fonts/a.woff2", "about/index.html"]);
  const exists = (t) => files.has(t);
  const run = (value, baseValue, fileRel = "index.html") =>
    checkUrl(value, { fileRel, siteUrl: "http://localhost:4321", baseValue, exists }).error;
  const expectOk = (label, err) => {
    if (err !== null) throw new Error(`self-test: ${label} should pass but failed: ${err}`);
  };
  const expectFail = (label, err) => {
    if (err === null) throw new Error(`self-test: ${label} should fail but passed`);
  };

  expectOk("root-absolute asset at base /", run("/_astro/app.js", "/"));
  expectOk("directory link", run("/about/", "/"));
  expectOk("relative link", run("about/", "/"));
  expectOk("relative from a nested file", run("../app.js", "/", "_astro/fonts/x.css"));
  expectOk("base-prefixed asset", run("/base-check/_astro/app.js", "/base-check"));
  expectOk("skip fragment", run("#top", "/"));
  expectOk("skip mailto", run("mailto:a@b.c", "/"));
  expectOk("same-origin absolute", run("http://localhost:4321/base-check/", "/base-check"));
  expectFail("third-party origin", run("https://fonts.googleapis.com/css", "/"));
  expectFail("scheme-relative third-party origin", run("//cdn.example.com/x.js", "/"));
  expectFail("root-absolute outside a non-root base", run("/_astro/app.js", "/base-check"));
  expectFail("missing target", run("/_astro/missing.js", "/"));
  expectFail("missing directory index", run("/nope/", "/"));
  expectFail("javascript scheme", run("javascript:alert(1)", "/"));

  const html = `<a href="/x/">x</a><img src='/a.png' srcset="/a.png 1x, /b.png 2x"><div data-src="/ignored" component-url=/_astro/app.js>`;
  const found = extractHtmlUrls(html);
  for (const want of ["/x/", "/a.png", "/b.png", "/_astro/app.js"]) {
    if (!found.includes(want)) throw new Error(`self-test: extractor missed ${want}`);
  }
  if (found.includes("/ignored")) throw new Error("self-test: extractor matched data-src");
  const cssFound = extractCssUrls(`@font-face{src:url("/_astro/fonts/a.woff2") format("woff2"),url(/b.woff2)}`);
  if (cssFound.length !== 2) throw new Error("self-test: css extractor wrong count");

  if (checkIndexHtml('<div data-playground><span data-chip></span></div>').length !== 0) {
    throw new Error("self-test: good index rejected");
  }
  if (checkIndexHtml("<p>nothing</p>").length === 0) throw new Error("self-test: bad index accepted");
  console.log("check-dist self-test OK");
}

if (process.argv.includes("--self-test")) {
  try {
    selfTest();
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
} else {
  if (!existsSync(outDir) || !statSync(outDir).isDirectory()) {
    console.error(`check-dist: output directory "${outDir}" does not exist (run the build first)`);
    process.exit(1);
  }
  const exists = (t) => existsSync(`${outDir}/${t}`) && statSync(`${outDir}/${t}`).isFile();
  const errors = [];
  let fileCount = 0;
  let urlCount = 0;
  for (const rel of walk(outDir)) {
    const isHtml = rel.endsWith(".html");
    const isCss = rel.endsWith(".css");
    if (!isHtml && !isCss) continue;
    fileCount++;
    const text = readFileSync(`${outDir}/${rel}`, "utf8");
    // Inline <style> blocks hold the Fonts API @font-face rules, so scan their url() values too.
    const values = isHtml
      ? [...extractHtmlUrls(text), ...[...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].flatMap((m) => extractCssUrls(m[1] ?? ""))]
      : extractCssUrls(text);
    for (const value of values) {
      const { error, checked } = checkUrl(value, { fileRel: rel, siteUrl: site, baseValue: base, exists });
      if (checked) urlCount++;
      if (error) errors.push(error);
    }
  }
  const indexPath = `${outDir}/index.html`;
  if (!existsSync(indexPath)) errors.push(`${outDir}/index.html is missing`);
  else errors.push(...checkIndexHtml(readFileSync(indexPath, "utf8")));
  if (errors.length > 0) {
    for (const e of [...new Set(errors)]) console.error(`check-dist: ${e}`);
    process.exit(1);
  }
  console.log(`check-dist: OK (${fileCount} files, ${urlCount} URLs scanned in ${outDir}, base ${base})`);
}
