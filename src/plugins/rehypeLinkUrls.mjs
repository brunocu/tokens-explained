// Rehype plugin: rehype-citation renders the bibliography with its URLs as plain text. This turns
// every https URL inside a `csl-right-inline` element (the body of a bibliography entry) into an
// anchor that opens safely (rel noopener noreferrer, no target). Text elsewhere is not touched.
// No imports: a small recursive walk over the hast tree keeps the dependency set unchanged.

/** @typedef {{ type: string, value?: string, tagName?: string, properties?: Record<string, unknown>, children?: HastNode[] }} HastNode */

const URL_PATTERN = /https:\/\/[^\s<>"]+/g;
const TRAILING_PUNCTUATION = /[.,;:)]+$/;

/**
 * @param {HastNode} node
 * @returns {boolean}
 */
function isEntryBody(node) {
  if (node.type !== "element") return false;
  const cls = node.properties?.className;
  return Array.isArray(cls) ? cls.includes("csl-right-inline") : cls === "csl-right-inline";
}

/**
 * Split one text node into text and anchor nodes.
 * @param {string} value
 * @returns {HastNode[]}
 */
function linkify(value) {
  /** @type {HastNode[]} */
  const out = [];
  let last = 0;
  for (const match of value.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    const url = match[0].replace(TRAILING_PUNCTUATION, "");
    if (url === "https://") continue;
    if (start > last) out.push({ type: "text", value: value.slice(last, start) });
    out.push({
      type: "element",
      tagName: "a",
      properties: { href: url, rel: ["noopener", "noreferrer"] },
      children: [{ type: "text", value: url }],
    });
    last = start + url.length;
  }
  if (last === 0) return [{ type: "text", value }];
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

/**
 * @param {HastNode} node
 * @param {boolean} inside whether an ancestor is a bibliography entry body
 */
function walk(node, inside) {
  if (!node.children) return;
  const nowInside = inside || isEntryBody(node);
  /** @type {HastNode[]} */
  const next = [];
  for (const child of node.children) {
    if (nowInside && child.type === "text" && typeof child.value === "string") {
      next.push(...linkify(child.value));
    } else {
      // Anchors that already exist are left as they are.
      if (!(child.type === "element" && child.tagName === "a")) walk(child, nowInside);
      next.push(child);
    }
  }
  node.children = next;
}

/** @returns {(tree: HastNode) => void} */
export default function rehypeLinkUrls() {
  return (tree) => walk(tree, false);
}
