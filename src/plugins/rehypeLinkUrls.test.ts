import { describe, it, expect } from "vitest";
import rehypeLinkUrls from "./rehypeLinkUrls.mjs";

type Node = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const text = (value: string): Node => ({ type: "text", value });
const el = (tagName: string, className: string[] | undefined, children: Node[]): Node => ({
  type: "element",
  tagName,
  properties: className ? { className } : {},
  children,
});
const run = (tree: Node) => {
  (rehypeLinkUrls() as (t: Node) => void)(tree);
  return tree;
};
const anchors = (n: Node): Node[] =>
  n.type === "element" && n.tagName === "a" ? [n] : (n.children ?? []).flatMap(anchors);
const nth = <T>(list: T[] | undefined, i: number): T => {
  const item = list?.[i];
  if (item === undefined) throw new Error(`no item at index ${i}`);
  return item;
};

describe("rehypeLinkUrls", () => {
  it("turns a URL in a csl-right-inline element into an anchor, leaving trailing punctuation outside", () => {
    const box = el("div", ["csl-right-inline"], [text("Available from: https://example.org/a_b.")]);
    run({ type: "root", children: [box] });
    expect(box.children).toHaveLength(3);
    expect(box.children![0]).toEqual(text("Available from: "));
    const a = nth(box.children, 1);
    expect(a.tagName).toBe("a");
    expect(a.properties!.href).toBe("https://example.org/a_b");
    expect(a.children).toEqual([text("https://example.org/a_b")]);
    expect(box.children![2]).toEqual(text("."));
  });

  it("excludes trailing comma, semicolon, colon and closing parenthesis from the URL", () => {
    for (const tail of [",", ";", ":", ")"]) {
      const box = el("div", ["csl-right-inline"], [text(`see https://example.org/x${tail}`)]);
      run({ type: "root", children: [box] });
      expect(nth(anchors(box), 0).properties!.href).toBe("https://example.org/x");
      expect(box.children![box.children!.length - 1]).toEqual(text(tail));
    }
  });

  it("links two URLs in one text node and leaves text without a URL unchanged", () => {
    const two = el("div", ["csl-right-inline"], [text("a https://one.example/x and https://two.example/y")]);
    const none = el("div", ["csl-right-inline"], [text("no link here.")]);
    run({ type: "root", children: [two, none] });
    expect(anchors(two).map((a) => a.properties!.href)).toEqual(["https://one.example/x", "https://two.example/y"]);
    expect(none.children).toEqual([text("no link here.")]);
  });

  it("gives every anchor rel noopener noreferrer and no target", () => {
    const box = el("div", ["csl-right-inline"], [text("https://one.example/x https://two.example/y")]);
    run({ type: "root", children: [box] });
    const found = anchors(box);
    expect(found).toHaveLength(2);
    for (const a of found) {
      expect(a.properties!.rel).toEqual(["noopener", "noreferrer"]);
      expect(a.properties).not.toHaveProperty("target");
    }
  });

  it("leaves a URL outside csl-right-inline alone", () => {
    const p = el("p", undefined, [text("plain https://example.org/a text")]);
    const other = el("div", ["csl-left-margin"], [text("https://example.org/b")]);
    run({ type: "root", children: [p, other] });
    expect(p.children).toEqual([text("plain https://example.org/a text")]);
    expect(other.children).toEqual([text("https://example.org/b")]);
  });
});
