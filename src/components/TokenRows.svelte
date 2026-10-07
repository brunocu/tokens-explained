<script lang="ts">
  // The three labelled tokenizer rows of one comparison: toy, GPT-2, BERT, always in that order.
  // Reused by the languages drilldown and the own-text block. Chips come from TokenDisplay with
  // its notes and legend switched off (the comparison shows one shared legend instead).
  // Names, sublines and token strings reach the DOM through interpolation only.
  import type { Token } from "../core/types.ts";
  import { TOKENIZER_ROWS } from "../core/compare/rows.ts";
  import TokenDisplay from "./TokenDisplay.svelte";

  type Props = {
    rows: { toy: Token[]; gpt2: Token[]; bert: Token[] };
    idPrefix: string;
    live?: boolean;
  };

  // Live rows (the own-text block) show the empty state when the text box is empty; its second line
  // names the box above the rows, not an example picker (UI-SPEC copy contract).
  const LIVE_EMPTY_BODY = "Type or paste some text above and it will be split into tokens here.";

  let { rows, idPrefix, live = false }: Props = $props();
</script>

<div class="rows">
  {#each TOKENIZER_ROWS as row (row.id)}
    {@const tokens = rows[row.id]}
    <div role="group" aria-labelledby="{idPrefix}-{row.id}-name" data-row={row.id}>
      <div class="head">
        <span class="name island-label" id="{idPrefix}-{row.id}-name">{row.name}</span>
        <span class="count island-muted"
          ><span data-row-count>{tokens.length}</span> {tokens.length === 1 ? "token" : "tokens"}{live ? " (live)" : ""}</span
        >
      </div>
      <p class="subline island-muted">{row.subline}</p>
      <TokenDisplay {tokens} mode="text" showBytes={false} legend={false} emptyState={live} emptyBody={LIVE_EMPTY_BODY} splitCount={0} compositeCount={0} />
    </div>
  {/each}
</div>

<style>
  .rows {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 16px;
  }
  .count {
    font-variant-numeric: tabular-nums;
  }
  .subline {
    margin: 0 0 8px;
  }
</style>
