<script lang="ts">
  // The labelled tokenizer rows of one comparison: GPT-2 then BERT, always in that order. A row
  // whose tokens are not supplied is skipped. Reused by the languages drilldown and the comparison
  // card. Chips come from TokenDisplay with
  // its notes and legend switched off (the comparison shows one shared legend instead).
  // Names, sublines and token strings reach the DOM through interpolation only.
  import type { Token } from "../core/types.ts";
  import { TOKENIZER_ROWS } from "../core/compare/rows.ts";
  import TokenDisplay from "./TokenDisplay.svelte";

  type Props = {
    rows: { gpt2: Token[]; bert?: Token[] };
    idPrefix: string;
    live?: boolean;
  };

  // Live rows (the comparison card once GPT-2 is ready) show the empty state when the text box is
  // empty; its second line names the box above the rows, not an example picker (UI-SPEC copy contract).
  const LIVE_EMPTY_BODY = "Type or paste some text above and it will be split into tokens here.";

  let { rows, idPrefix, live = false }: Props = $props();
</script>

<div class="rows">
  {#each TOKENIZER_ROWS as row (row.id)}
    {@const tokens = rows[row.id]}
    {#if tokens !== undefined}
      <div role="group" aria-labelledby="{idPrefix}-{row.id}-name" data-row={row.id}>
        <div class="head">
          <span class="name island-label" id="{idPrefix}-{row.id}-name">{row.name}</span>
          <span class="count island-muted"
            ><span data-row-count>{tokens.length}</span> {tokens.length === 1 ? "token" : "tokens"}</span
          >
        </div>
        <p class="subline island-muted">{row.subline}</p>
        <TokenDisplay {tokens} mode="text" showBytes={false} legend={false} emptyState={live} emptyBody={LIVE_EMPTY_BODY} splitCount={0} compositeCount={0} />
      </div>
    {/if}
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
