import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { TOKENIZER_FILES, sizeLabelMb } from "./tokenizerFiles.ts";

type Entry = {
  id: string;
  file: string;
  repo: string;
  commit: string;
  license: string;
  bytes: number;
  gzipBytes: number;
  sha256: string;
};
type Manifest = { files: Entry[]; combinedGzipBytes: number };

const DIR = "public/tokenizers";
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, "utf8")) as Manifest;

describe("hosted tokenizer files match the manifest (T-02-02)", () => {
  it("lists exactly gpt2 and bert, with the file names the app uses", () => {
    expect(manifest.files.map((f) => f.id)).toEqual(["gpt2", "bert"]);
    for (const entry of manifest.files) {
      expect(entry.file).toBe(TOKENIZER_FILES[entry.id as keyof typeof TOKENIZER_FILES]);
    }
  });

  for (const entry of manifest.files) {
    describe(entry.file, () => {
      const bytes = readFileSync(`${DIR}/${entry.file}`);

      it("has the recorded size and sha256", () => {
        expect(bytes.length).toBe(entry.bytes);
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256);
      });

      it("has a gzip size within 1 percent of a recomputed level-9 gzip", () => {
        const actual = gzipSync(bytes, { level: 9 }).length;
        expect(Math.abs(actual - entry.gzipBytes) / actual).toBeLessThan(0.01);
      });

      it("records a 40-character commit and a licence", () => {
        expect(entry.commit).toMatch(/^[0-9a-f]{40}$/);
        expect(entry.license.length).toBeGreaterThan(0);
      });
    });
  }

  it("sums the two gzip sizes", () => {
    expect(manifest.combinedGzipBytes).toBe(manifest.files.reduce((sum, f) => sum + f.gzipBytes, 0));
  });

  it("carries both licence notices that travel with the files", () => {
    const notice = readFileSync(`${DIR}/NOTICE.md`, "utf8");
    expect(notice).toContain("Apache License");
    expect(notice).toContain("Copyright (c) 2019 OpenAI");
    for (const entry of manifest.files) expect(notice).toContain(entry.commit);
  });
});

describe("sizeLabelMb (D-10)", () => {
  it("labels the combined download as 0.7 MB", () => {
    expect(sizeLabelMb(manifest.combinedGzipBytes)).toBe("0.7");
  });

  it("uses decimal megabytes with one decimal", () => {
    expect(sizeLabelMb(1_000_000)).toBe("1.0");
    expect(sizeLabelMb(2_140_000)).toBe("2.1");
    expect(sizeLabelMb(0)).toBe("0.0");
  });
});
