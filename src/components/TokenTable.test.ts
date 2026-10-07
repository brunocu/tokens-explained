import { describe, expect, it } from "vitest";
import { render } from "svelte/server";
import TokenTable from "./TokenTable.svelte";
import type { Token } from "../core/types.ts";

// Server-rendered tests for the table's two forms: the Phase 1 details wrapper and the bare table.

const tokens: Token[] = [
  { id: 1, bytes: Uint8Array.from([0x68, 0x69]), isPartial: false },
  { id: 2, bytes: Uint8Array.from([0x20, 0x61]), isPartial: false },
];

function html(props: Record<string, unknown>): string {
  const { body } = render(TokenTable, { props: { tokens, ...props } });
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/ class="svelte-[a-z0-9]+"/g, "")
    .replace(/ svelte-[a-z0-9]+/g, "");
}

describe("TokenTable", () => {
  it("renders the details form by default, with the Phase 1 caption and no bare marker", () => {
    const out = html({});
    expect(out).toMatch(/<details class="alt" data-table(="")?>/);
    expect(out).toContain("<summary>View tokens as a table</summary>");
    expect(out).toContain("<caption>Tokens in your text</caption>");
    expect(out).not.toContain("data-alt-table");
    expect(Array.from(out.matchAll(/<tr>/g))).toHaveLength(3);
  });

  it("renders no details element when bare, and marks the scroll region", () => {
    const out = html({ bare: true });
    expect(out).not.toContain("<details");
    expect(out).not.toContain("<summary");
    expect(out).not.toContain("data-table");
    expect(out).toMatch(/<div class="scroll"[^>]*data-alt-table/);
    expect(out).toContain("<table>");
    expect(Array.from(out.matchAll(/<tr>/g))).toHaveLength(3);
  });

  it("uses a given caption in both forms", () => {
    expect(html({ caption: "Tokens for GPT-2" })).toContain("<caption>Tokens for GPT-2</caption>");
    expect(html({ bare: true, caption: "Tokens for BERT" })).toContain("<caption>Tokens for BERT</caption>");
  });

  it("keeps the empty row for an empty token list", () => {
    expect(html({ tokens: [], bare: true })).toContain("No tokens yet.");
  });
});
