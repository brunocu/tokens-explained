<script lang="ts">
  // The one legend for the coloured-token display. The playground and the comparison both render
  // this component, so the wording has a single source (UI-SPEC section 4).
  import { GLYPH_NEWLINE, GLYPH_SPACE, GLYPH_TAB } from "../core/display.ts";
</script>

<p class="legend" data-legend>
  <span class="item"><span class="ws">{GLYPH_SPACE}</span> space</span>
  <span class="item"><span class="ws">{GLYPH_NEWLINE}</span> new line</span>
  <span class="item"><span class="ws">{GLYPH_TAB}</span> tab</span>
  <br>
  <span class="item long">Hatched chips are raw bytes. Hatched chips in the same frame make up one character, which is shown in front of them. [UNK] means the tokenizer had no token for that word or character and cannot represent it.</span>
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
