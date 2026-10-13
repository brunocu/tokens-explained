import { describe, expect, it } from "vitest";
import { LANGUAGES_NOTE } from "./notes.ts";
import { TOKENIZER_ROWS } from "./rows.ts";

const REPLACEMENT = String.fromCodePoint(0xfffd);

// Names a note must never use: only GPT-2 and BERT are shown, so no other vendor or model
// (D-08, UI-SPEC "Comparison lead-in").
const BANNED_NAMES = [
  "claude",
  "anthropic",
  "openai",
  "google",
  "gemini",
  "llama",
  "meta",
  "mistral",
  "qwen",
  "chatgpt",
  "gpt-3",
  "gpt-4",
  "gpt-5",
  "microsoft",
];

const ALL_NOTES: Array<[string, string]> = [["languages", LANGUAGES_NOTE]];

/** Sentences, split on ., ! or ? followed by a space or the end of the text. */
const sentenceCount = (note: string): number => note.split(/[.!?](?:\s+|$)/).filter((s) => s.trim() !== "").length;

/** "GPT-2" is the one allowed name that contains a digit. */
const withoutGpt2 = (note: string): string => note.replaceAll("GPT-2", "GPT");

describe("what-to-notice notes (D-13, T-02-14)", () => {
  it("has a non-empty languages note", () => {
    expect(LANGUAGES_NOTE.trim()).not.toBe("");
  });

  it.each(ALL_NOTES)("%s: has at most two sentences", (_name, note) => {
    expect(sentenceCount(note)).toBeGreaterThanOrEqual(1);
    expect(sentenceCount(note)).toBeLessThanOrEqual(2);
  });

  it.each(ALL_NOTES)("%s: contains no digit (apart from the name GPT-2) and no replacement character", (_name, note) => {
    expect(withoutGpt2(note)).not.toMatch(/\d/);
    expect(note.includes(REPLACEMENT)).toBe(false);
  });

  it.each(ALL_NOTES)("%s: names no vendor or model other than GPT-2 and BERT", (_name, note) => {
    const lower = note.toLowerCase();
    for (const banned of BANNED_NAMES) {
      expect(new RegExp(`\\b${banned}\\b`).test(lower), banned).toBe(false);
    }
  });

  it.each(ALL_NOTES)("%s: is about the comparison", (_name, note) => {
    expect(/GPT-2|BERT|tokenizer/.test(note)).toBe(true);
  });

  it.each(ALL_NOTES)("%s: does not mention the retired toy tokenizer", (_name, note) => {
    expect(/\btoy\b/i.test(note)).toBe(false);
  });

  it.each(ALL_NOTES)("%s: does not call one tokenizer better", (_name, note) => {
    expect(/\b(better|worse|best|worst|superior|inferior)\b/i.test(note)).toBe(false);
  });
});

describe("tokenizer rows (D-13, TOK-09)", () => {
  it("lists GPT-2 and BERT in that order, each named with its year", () => {
    expect(TOKENIZER_ROWS.map((r) => r.id)).toEqual(["gpt2", "bert"]);
    expect(TOKENIZER_ROWS.map((r) => r.name)).toEqual(["GPT-2 (2019)", "BERT, uncased (2018)"]);
    for (const row of TOKENIZER_ROWS) expect(row.name).toMatch(/\(\d{4}\)/);
  });
});
