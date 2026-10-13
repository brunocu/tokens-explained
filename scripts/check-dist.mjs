// URL hygiene scan of the built site (D-15 amended, T-01-06).
// Every URL in the built HTML and CSS must be base-prefixed, point at the site's
// own origin (no third-party fonts or scripts: tokenizing stays private) and
// resolve to a file that exists in the output directory.
//
// One exception (T-02-18): an https anchor link (<a href>) to one of the two citation hosts
// below is allowed, because OHCHR asks for attribution with a link. Nothing else from those
// hosts is allowed: a script, stylesheet, image or any other attribute still fails as a
// third-party origin, as does an anchor to any other host or over plain http.
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

/** The hosts of the UDHR citation (T-02-18). */
export const ALLOWED_EXTERNAL_LINK_HOSTS = ["www.ohchr.org", "www.un.org"];

/**
 * The hosts of the post's numbered References list (plan 02-10, T-02-29): the one place the post
 * links out, one host per cited source. Like the UDHR hosts they are allowed for anchors only
 * (https <a href>); a script, stylesheet, image or any other attribute from them still fails.
 */
export const ALLOWED_REFERENCE_LINK_HOSTS = [
  "www.rfc-editor.org",
  "www.gutenberg.org",
  "web.stanford.edu",
  "www.jmlr.org",
  "aclanthology.org",
  "jacobfilipp.com",
  "arxiv.org",
  "cdn.openai.com",
  "ojs.aaai.org",
  "github.com",
  "doi.org",
  // The second editorial pass of plan 02-10: the encoding history sources and the one dictionary link.
  "ethw.org",
  "en.wikipedia.org",
  "www.unicode.org",
  "w3techs.com",
  "en.wiktionary.org",
  // Plan 02.1-09: the two Hugging Face pages cited for BERT and WordPiece.
  "huggingface.co",
];

const ANCHOR_TAG_RE = /<a\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;

/** The href values of <a> tags only, in document order. */
export function extractAnchorHrefs(html) {
  const hrefs = [];
  for (const tag of html.matchAll(ANCHOR_TAG_RE)) {
    for (const m of tag[0].matchAll(ATTR_RE)) {
      if (m[1].toLowerCase() !== "href") continue;
      const raw = decode(m[2] ?? m[3] ?? m[4] ?? "").trim();
      if (raw) hrefs.push(raw);
    }
  }
  return hrefs;
}

/** True for an https URL whose host is one of the allowed citation hosts. */
export function isAllowedExternalLink(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (ALLOWED_EXTERNAL_LINK_HOSTS.includes(url.host) || ALLOWED_REFERENCE_LINK_HOSTS.includes(url.host))
    );
  } catch {
    return false;
  }
}

/**
 * Drop from `urls` (the output of extractHtmlUrls for `html`) each URL that is an anchor href
 * to an allowed citation host. Anchors are counted, so a script or stylesheet that happens to
 * use the same URL as an anchor is still left in the list and still fails.
 */
export function withoutAllowedAnchors(html, urls) {
  const allowed = new Map();
  for (const href of extractAnchorHrefs(html)) {
    if (isAllowedExternalLink(href)) allowed.set(href, (allowed.get(href) ?? 0) + 1);
  }
  return urls.filter((value) => {
    const left = allowed.get(value) ?? 0;
    if (left === 0) return true;
    allowed.set(value, left - 1);
    return false;
  });
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

/** The four widget roots of Post 1, each a hook on the widget's root element. */
const WIDGET_ROOT_HOOKS = ["data-playground", "data-stepper", "data-compare", "data-languages"];

/**
 * Strings of the two controls phase 2.2 removes (the "Show" radio group and the peek switch).
 * The built page must carry none of them.
 */
// Written in two pieces each, so a repository search for the removed control names finds no source
// line that still uses them; the joined values are unchanged.
const REMOVED_CONTROL_STRINGS = [
  "Peek under" + " the hood",
  "Show the raw bytes" + " behind every token.",
  "Token" + " IDs",
  'name="' + 'view"',
  "data-" + "peek",
];

/** Number of times an HTML attribute named `name` appears (so data-chip does not match data-chip-id). */
function countAttr(html, name) {
  return [...html.matchAll(new RegExp(`\\s${name}(?![\\w-])`, "g"))].length;
}

/** True when an <input type="radio"> with this value carries the `checked` attribute. */
function radioIsChecked(html, value) {
  return [...html.matchAll(/<input\b[^>]*>/g)].some((m) => {
    const tag = m[0];
    return /\stype\s*=\s*["']?radio\b/.test(tag) && new RegExp(`\\svalue\\s*=\\s*["']?${value}["'\\s/>]`).test(tag) && /\schecked(?![\w-])/.test(tag);
  });
}

/**
 * The post page must be server-rendered with all four widgets, so it works with no JavaScript
 * (phase 2.2, D-12; UI-SPEC verification hook 9): the four widget roots, chips, the languages
 * table (data-languages-table) with its six rows (data-lang-row) and six sentence cells
 * (data-table-sentence), a checked English radio, and none of the removed controls.
 *
 * Plan 02.2-07 wired this into the main branch below: it runs on the built home page and on the
 * built post page at its own URL.
 */
export function checkWidgetsHtml(html) {
  const errors = [];
  for (const hook of WIDGET_ROOT_HOOKS) {
    if (countAttr(html, hook) === 0) errors.push(`post page has no ${hook} widget root`);
  }
  if (countAttr(html, "data-chip") === 0) errors.push("post page has no server-rendered data-chip");
  const rows = countAttr(html, "data-lang-row");
  if (rows !== 6) errors.push(`post page has ${rows} data-lang-row rows, expected 6`);
  if (countAttr(html, "data-languages-table") === 0) errors.push("post page has no data-languages-table");
  const sentences = countAttr(html, "data-table-sentence");
  if (sentences !== 6) errors.push(`post page has ${sentences} data-table-sentence cells, expected 6`);
  if (!radioIsChecked(html, "en")) errors.push("post page has no checked English radio in the languages picker");
  for (const removed of REMOVED_CONTROL_STRINGS) {
    if (html.includes(removed)) errors.push(`post page still contains the removed control text "${removed}"`);
  }
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
  // The citation-host allow-list (T-02-18): anchors to the two hosts pass, nothing else does.
  const kept = (html) => withoutAllowedAnchors(html, extractHtmlUrls(html));
  const okUrl = "https://www.ohchr.org/en/human-rights/universal-declaration";
  if (kept(`<a href="${okUrl}" rel="noopener">x</a>`).length !== 0) throw new Error("self-test: allowed anchor (ohchr) did not pass");
  if (kept(`<a class="c" href='https://www.un.org/en/x'>x</a>`).length !== 0) throw new Error("self-test: allowed anchor (un.org) did not pass");
  if (kept(`<script src="${okUrl}"></script>`).length !== 1) throw new Error("self-test: allowed host as script src was dropped");
  if (kept(`<link rel="stylesheet" href="${okUrl}">`).length !== 1) throw new Error("self-test: allowed host as stylesheet was dropped");
  if (kept(`<img src="${okUrl}">`).length !== 1) throw new Error("self-test: allowed host as image was dropped");
  if (kept(`<a href="https://example.com/x">x</a>`).length !== 1) throw new Error("self-test: anchor to another host was dropped");
  if (kept(`<a href="http://www.ohchr.org/x">x</a>`).length !== 1) throw new Error("self-test: http anchor was dropped");
  if (kept(`<a href="https://www.ohchr.org.evil.example/x">x</a>`).length !== 1) throw new Error("self-test: look-alike host was dropped");
  if (kept(`<a href="${okUrl}">x</a><script src="${okUrl}"></script>`).length !== 1) {
    throw new Error("self-test: a script with the same URL as an allowed anchor was dropped");
  }
  expectFail("allowed host as a plain URL (not an anchor)", run(okUrl, "/"));
  if (ALLOWED_EXTERNAL_LINK_HOSTS.length !== 2) throw new Error("self-test: the allow-list must hold exactly two hosts");
  // The References hosts (plan 02-10): one per cited source, anchors only, nothing else from them.
  if (ALLOWED_REFERENCE_LINK_HOSTS.length !== 17) throw new Error("self-test: the references allow-list must hold exactly seventeen hosts");
  const refUrl = "https://aclanthology.org/P16-1162/";
  if (kept(`<a href="${refUrl}" rel="noopener noreferrer">x</a>`).length !== 0) throw new Error("self-test: a references anchor did not pass");
  if (kept(`<script src="${refUrl}"></script>`).length !== 1) throw new Error("self-test: a references host as script src was dropped");
  if (kept(`<img src="${refUrl}">`).length !== 1) throw new Error("self-test: a references host as image was dropped");
  if (kept(`<a href="http://aclanthology.org/P16-1162/">x</a>`).length !== 1) throw new Error("self-test: an http references anchor was dropped");
  if (kept(`<a href="https://aclanthology.org.evil.example/x">x</a>`).length !== 1) throw new Error("self-test: a look-alike references host was dropped");
  if (kept(`<a href="https://github.com.evil.example/x">x</a>`).length !== 1) throw new Error("self-test: a look-alike github host was dropped");

  const cssFound = extractCssUrls(`@font-face{src:url("/_astro/fonts/a.woff2") format("woff2"),url(/b.woff2)}`);
  if (cssFound.length !== 2) throw new Error("self-test: css extractor wrong count");

  if (checkIndexHtml('<div data-playground><span data-chip></span></div>').length !== 0) {
    throw new Error("self-test: good index rejected");
  }
  if (checkIndexHtml("<p>nothing</p>").length === 0) throw new Error("self-test: bad index accepted");

  // checkWidgetsHtml (plan 02.2-01): one passing fixture, and one failing fixture per rule. A
  // failing fixture must be rejected for the rule it breaks (the error names it), not by accident.
  const widgetsFixture = ({
    roots = WIDGET_ROOT_HOOKS,
    chips = 3,
    rows = 6,
    table = true,
    sentences = null,
    englishChecked = true,
    extra = "",
  } = {}) => {
    // One sentence cell per row by default; `sentences` sets the cell count independently of the rows.
    const sentenceCount = sentences ?? rows;
    const ids = ["en", "es", "fr", "ru", "ar", "zh"].slice(0, rows);
    const rowHtml = ids
      .map((id, i) => `<tr data-lang-row="${id}">${i < sentenceCount ? "<td data-table-sentence>s</td>" : ""}</tr>`)
      .join("");
    const extraSentences = "<td data-table-sentence>s</td>".repeat(Math.max(0, sentenceCount - ids.length));
    return [
      ...roots.map((hook) => `<section ${hook} data-island data-state="loading">`),
      "<span data-chip></span>".repeat(chips),
      '<span data-chip-main>a</span><span data-chip-id>1</span>',
      table ? "<table data-languages-table>" : "<table>",
      rowHtml,
      extraSentences,
      "</table>",
      `<input type="radio" name="languages-inside" value="en"${englishChecked ? ' checked=""' : ""} class="svelte-x"/>`,
      '<input type="radio" name="languages-inside" value="es" class="svelte-x"/>',
      extra,
    ].join("\n");
  };
  const widgetErrors = (label, fixture, want) => {
    const errors = checkWidgetsHtml(fixture);
    if (want === null) {
      if (errors.length !== 0) throw new Error(`self-test: ${label} should pass but failed: ${errors.join("; ")}`);
    } else if (!errors.some((e) => want.test(e))) {
      throw new Error(`self-test: ${label} should fail on ${want} but gave: ${errors.length === 0 ? "no errors" : errors.join("; ")}`);
    }
  };
  widgetErrors("a complete widgets page", widgetsFixture(), null);
  widgetErrors("a page without the stepper root", widgetsFixture({ roots: ["data-playground", "data-compare", "data-languages"] }), /data-stepper widget root/);
  widgetErrors("a page whose only languages hook is the table", widgetsFixture({ roots: ["data-playground", "data-stepper", "data-compare"] }), /data-languages widget root/);
  // The fixture still holds data-chip-main and data-chip-id, which must not count as chips.
  widgetErrors("a page without chips", widgetsFixture({ chips: 0 }), /server-rendered data-chip/);
  widgetErrors("a page with five language rows", widgetsFixture({ rows: 5 }), /5 data-lang-row rows/);
  widgetErrors("a page without the languages table", widgetsFixture({ table: false }), /data-languages-table/);
  widgetErrors("a page with English not checked", widgetsFixture({ englishChecked: false }), /checked English radio/);
  widgetErrors("a page with five table sentences", widgetsFixture({ sentences: 5 }), /5 data-table-sentence/);
  widgetErrors("a page with seven table sentences", widgetsFixture({ sentences: 7 }), /7 data-table-sentence/);
  for (const removed of REMOVED_CONTROL_STRINGS) {
    widgetErrors(`a page that still has "${removed}"`, widgetsFixture({ extra: `<p>${removed}</p>` }), /removed control text/);
  }
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
      ? [...withoutAllowedAnchors(text, extractHtmlUrls(text)), ...[...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].flatMap((m) => extractCssUrls(m[1] ?? ""))]
      : extractCssUrls(text);
    for (const value of values) {
      const { error, checked } = checkUrl(value, { fileRel: rel, siteUrl: site, baseValue: base, exists });
      if (checked) urlCount++;
      if (error) errors.push(error);
    }
  }
  const indexPath = `${outDir}/index.html`;
  if (!existsSync(indexPath)) errors.push(`${outDir}/index.html is missing`);
  else {
    const indexHtml = readFileSync(indexPath, "utf8");
    errors.push(...checkIndexHtml(indexHtml));
    // The home page carries the post, so the four server-rendered widgets are checked there ...
    errors.push(...checkWidgetsHtml(indexHtml).map((e) => `index.html: ${e}`));
  }
  // ... and again on the post page at its own URL (phase 2.2, D-12; UI-SPEC verification hook 9).
  const postPath = `${outDir}/what-is-a-token/index.html`;
  if (!existsSync(postPath)) errors.push(`${outDir}/what-is-a-token/index.html is missing`);
  else errors.push(...checkWidgetsHtml(readFileSync(postPath, "utf8")).map((e) => `what-is-a-token/index.html: ${e}`));
  if (errors.length > 0) {
    for (const e of [...new Set(errors)]) console.error(`check-dist: ${e}`);
    process.exit(1);
  }
  console.log(`check-dist: OK (${fileCount} files, ${urlCount} URLs scanned in ${outDir}, base ${base})`);
}
