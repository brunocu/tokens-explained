<script lang="ts">
  // The labelled tokenizer rows of one comparison: GPT-2 then BERT, always in that order. A row
  // whose tokens are not supplied is skipped. Reused by the languages drilldown and the comparison
  // card. Chips come from TokenDisplay with
  // its notes and legend switched off (the comparison shows one shared legend instead).
  // Names and token strings reach the DOM through interpolation only.
  //
  // With `scroll` each row puts only its chips in a labelled scroll region of its own and keeps its
  // header (name, count) outside it, so the header stays in view while the chips scroll. The
  // row then fills the column (`only` picks one row; two of them share a column equally).
  import type { Snippet } from "svelte";
  import type { Token } from "../core/types.ts";
  import { TOKENIZER_ROWS } from "../core/compare/rows.ts";
  import ScrollRegion from "./ScrollRegion.svelte";
  import TokenDisplay from "./TokenDisplay.svelte";

  type Props = {
    rows: { gpt2: Token[]; bert?: Token[] };
    idPrefix: string;
    live?: boolean;
    /** Show this row only. */
    only?: "gpt2" | "bert";
    /** Put each row's chips in a scroll region of its own, with the header outside it. */
    scroll?: boolean;
    /** Any value; a change scrolls the row's region back to its top (see ScrollRegion). */
    resetKey?: unknown;
    /** With `scroll`: what the region holds when the row has no tokens (the header is still shown). */
    missing?: Snippet;
  };

  // Live rows (the comparison card once GPT-2 is ready) show the empty state when the text box is
  // empty; its second line names no place for the box, because it sits beside the rows in the
  // two-column layout and above them when stacked (UI-SPEC copy contract).
  const LIVE_EMPTY_BODY = "Type or paste some text and it will be split into tokens here.";

  let { rows, idPrefix, live = false, only = undefined, scroll = false, resetKey = undefined, missing = undefined }: Props = $props();
</script>

<div class="rows" class:fill={scroll}>
  {#each TOKENIZER_ROWS as row (row.id)}
    {@const tokens = rows[row.id]}
    {#if (only === undefined || only === row.id) && (tokens !== undefined || (scroll && missing !== undefined))}
      <div role="group" aria-labelledby="{idPrefix}-{row.id}-name" data-row={row.id} class:fill={scroll}>
        <div class="top">
          <div class="head">
            <span class="name island-label" id="{idPrefix}-{row.id}-name">{row.name}</span>
            {#if tokens !== undefined}
              <span class="count island-muted"
                ><span data-row-count>{tokens.length}</span> {tokens.length === 1 ? "token" : "tokens"}</span
              >
            {/if}
          </div>
        </div>
        {#if scroll}
          <ScrollRegion fill label="{row.id === 'gpt2' ? 'GPT-2' : 'BERT'} tokens, scrollable" {resetKey}>
            {#if tokens !== undefined}
              <TokenDisplay {tokens} legend={false} emptyState={live} emptyBody={LIVE_EMPTY_BODY} splitCount={0} compositeCount={0} />
            {:else}
              {@render missing?.()}
            {/if}
          </ScrollRegion>
        {:else if tokens !== undefined}
          <TokenDisplay {tokens} legend={false} emptyState={live} emptyBody={LIVE_EMPTY_BODY} splitCount={0} compositeCount={0} />
        {/if}
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
  /* The fill layout is the two-column, fixed-height form of the widget, so it applies from 1024px
     (the same breakpoint as widget.css). Below it the rows are ordinary blocks that follow each
     other at natural height, with the 24px gap of .rows between them, because the card has no
     definite height there and the 1fr tracks would collapse (gap G-02.2-1a).
     From 1024px, scrolling rows are the elastic element of their column. The column is a grid of
     four tracks (header, region, header, region), and each row spans two of them as a sub-grid, so
     the two regions get equal heights even when one header is taller than the other. */
  @media (min-width: 1024px) {
    .rows.fill {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto minmax(0, 1fr);
      gap: 0;
      flex: 1 1 0;
      min-height: 0;
    }
    [data-row].fill {
      display: grid;
      grid-row: span 2;
      grid-template-rows: subgrid;
      min-height: 0;
    }
    [data-row].fill + [data-row].fill > .top {
      padding-top: 24px;
    }
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
  .top {
    margin-bottom: 8px;
  }
</style>
