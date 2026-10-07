// Minimal declarations for the three Node built-ins that the file-checking tests use
// (src/core/realTokenizer.test.ts, src/core/tokenizerFiles.test.ts). The project does
// not depend on @types/node, so only the functions actually called are declared here.
// Test files only: nothing the reader's browser loads imports these modules.
declare module "node:fs" {
  export function readFileSync(path: string): Uint8Array;
  export function readFileSync(path: string, encoding: "utf8"): string;
}

declare module "node:crypto" {
  interface Hash {
    update(data: Uint8Array | string): Hash;
    digest(encoding: "hex"): string;
  }
  export function createHash(algorithm: "sha256"): Hash;
}

// The one global src/core/buildTokenizer.ts reads: the working directory (the project root).
declare const process: { cwd(): string };

declare module "node:zlib" {
  export function gzipSync(data: Uint8Array, options?: { level?: number }): Uint8Array;
}
