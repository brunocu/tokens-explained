<script lang="ts">
  // The one legend for the coloured-token display. The playground and the comparison both render
  // this component, so the wording has a single source (UI-SPEC section 4).
  import { GLYPH_NEWLINE, GLYPH_SPACE, GLYPH_TAB } from "../core/display.ts";

  // `special` is the [UNK] sentence; `marker` is the sentence for any other special chip, such as
  // GPT-2's end-of-text token. Callers pass the flags from `specialKinds` so a sentence only shows
  // when its chip is on screen.
  let { special = false, marker = false }: { special?: boolean; marker?: boolean } = $props();
</script>

<p class="legend" data-legend>
  <span class="item"><span class="ws">{GLYPH_SPACE}</span> space</span>
  <span class="item"><span class="ws">{GLYPH_NEWLINE}</span> new line</span>
  <span class="item"><span class="ws">{GLYPH_TAB}</span> tab</span>
  <br>
  <span class="item long">Hatched chips are raw bytes. Hatched chips in the same frame make up one character, which is shown in front of them.</span>
  {#if special}
    <span class="item long">[UNK] means the tokenizer had no piece for that word or character and gave up.</span>
  {/if}
  {#if marker}
    <span class="item long">A chip marked special, such as &lt;|endoftext|&gt;, is one token the tokenizer keeps whole as a signal to the model instead of cutting it into pieces.</span>
  {/if}
</p>

<style>
  .legend {
    margin: var(--space-sm) 0 0;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
  .legend .item {
    margin-right: var(--space-md);
    white-space: nowrap;
  }
  /* The sentences may wrap; the short glyph items never do. */
  .legend .item.long {
    margin-right: 0;
    white-space: normal;
  }
  .legend .ws {
    font-family: var(--font-sans), "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif;
    color: var(--ws-color);
    font-size: 16px;
  }
</style>
