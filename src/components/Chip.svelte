<script lang="ts">
  // One stepper chip (sketch 001, variant D): the piece's text on top and its number below. The
  // number is the identity; the fill colour is decoration. A plain outline means a single byte,
  // a coloured fill a piece that was learned, a double border the piece made by the latest merge.
  // The space is drawn as a .ws glyph. Chip rows are hidden from screen readers; the stepper
  // supplies a hidden sentence instead. Text reaches the DOM through interpolation only.
  import { GLYPH_SPACE } from "../core/display.ts";

  let { text, id, fresh = false }: { text: string; id: number; fresh?: boolean } = $props();

  const parts = $derived(text.split(GLYPH_SPACE));
  const learned = $derived(id >= 256);
</script>

<span
  class="chip"
  data-step-chip
  data-id={id}
  data-learned={learned ? "true" : undefined}
  data-pal={learned ? id % 4 : undefined}
  data-new={fresh ? "true" : undefined}
  ><span class="text">{#each parts as part, i (i)}{#if i > 0}<span class="ws">{GLYPH_SPACE}</span>{/if}{part}{/each}</span
  ><span class="num">{id}</span></span
>

<style>
  .chip {
    box-sizing: border-box;
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    min-width: 30px;
    padding: 3px 5px 2px;
    border: 1.5px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    line-height: 1.15;
    max-width: 100%;
  }
  .text {
    font: 600 15px/1.15 var(--font-mono);
    font-variant-ligatures: none;
    white-space: pre;
  }
  .num {
    font: 400 11px/1.15 var(--font-sans);
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .chip[data-pal="0"] {
    background: var(--chip-0-fill);
    border-color: var(--chip-0-line);
  }
  .chip[data-pal="1"] {
    background: var(--chip-1-fill);
    border-color: var(--chip-1-line);
  }
  .chip[data-pal="2"] {
    background: var(--chip-2-fill);
    border-color: var(--chip-2-line);
  }
  .chip[data-pal="3"] {
    background: var(--chip-3-fill);
    border-color: var(--chip-3-line);
  }
  /* The piece made by the latest merge: a heavy double border (never colour alone) and a short pop. */
  .chip[data-new="true"] {
    border-style: double;
    border-width: 4px;
    animation: pop 350ms ease;
  }
  @keyframes pop {
    from {
      transform: scale(0.8);
    }
    to {
      transform: scale(1);
    }
  }
  .ws {
    font-family: var(--font-sans), "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif;
    color: var(--ws-color);
  }
  @media print {
    .chip {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }
</style>
