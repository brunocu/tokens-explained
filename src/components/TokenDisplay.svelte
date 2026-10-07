<script lang="ts">
  // The shared coloured-token display (FOUND-02, FOUND-03, FOUND-06). Reused unchanged by
  // later posts. Reader text only ever reaches the DOM through text interpolation.
  import type { Token } from "../core/types.ts";
  import { chipSegments, containsNewline, idLabel, specialKinds } from "../core/display.ts";
  import TokenLegend from "./TokenLegend.svelte";
  import { compositeNote, splitNote } from "../core/counts.ts";
  import { byteLineSegments, groupBytes, layoutChips, visibleLabels } from "../core/chars.ts";

  type Props = {
    tokens: Token[];
    mode?: "text" | "ids";
    showBytes?: boolean;
    splitCount?: number;
    /** Characters on screen built from several joined parts; the caller counts them (default none). */
    compositeCount?: number;
    legend?: boolean;
    emptyState?: boolean;
    /** Second line of the empty state; the default is the playground's wording. */
    emptyBody?: string;
  };

  let {
    tokens,
    mode = "text",
    showBytes = false,
    splitCount = 0,
    compositeCount = 0,
    legend = true,
    emptyState = true,
    emptyBody = "Type or paste some text above, or pick an example, and it will be split into tokens here.",
  }: Props = $props();

  // Character frames (UI-SPEC R-01): derived here from the token bytes, callers pass nothing new.
  const grouping = $derived(groupBytes(tokens));
  const items = $derived(layoutChips(grouping));
  // Which special-chip sentences the legend needs: [UNK] and any other special token.
  const kinds = $derived(specialKinds(tokens));
</script>

{#snippet hex(token: Token, i: number)}{#each byteLineSegments(token, grouping.tokens[i]) as segment, k (k)}{#if k > 0}<span class="gap">{" "}</span>{/if}{#if segment.group}<span class="ch" data-ch={segment.text}>{segment.text}</span>{:else}{segment.text}{/if}{/each}{/snippet}

{#snippet chip(i: number, cut: boolean)}
  {@const token = tokens[i] as Token}
  <span class="chip" class:cut data-chip data-partial={token.isPartial ? "true" : "false"} data-special={token.special ? "true" : undefined} data-pal={i % 4}
    >{#if mode === "ids"}<span class="line id" data-chip-id>{idLabel(token)}</span>{#if token.isPartial}<span class="line bytes" data-chip-bytes>{@render hex(token, i)}</span>{:else if showBytes}<span class="line bytes" data-chip-bytes>{@render hex(token, i)}</span>{/if}{:else if token.isPartial}<span class="line bytes" data-chip-main>{@render hex(token, i)}</span>{:else}<span class="line" data-chip-main>{#each chipSegments(token) as segment}{#if segment.ws}<span class="ws" data-ws>{segment.text}</span>{:else}{segment.text}{/if}{/each}</span>{#if showBytes}<span class="line bytes" data-chip-bytes>{@render hex(token, i)}</span>{/if}{/if}</span
  >
{/snippet}

{#if tokens.length === 0 && emptyState}
  <div class="empty" data-empty>
    <p class="empty-title">Nothing to split yet</p>
    <p class="empty-body">{emptyBody}</p>
  </div>
{:else}
  <div class="chips" aria-hidden="true">
    {#each items as item, n (n)}
      {#if item.kind === "frame"}
        {@const vis = visibleLabels(item.frame)}
        <span class="frame" data-char-frame data-invalid={item.frame.invalid ? "true" : undefined}>
          <span class="label" data-char-label>{#each vis.shown as label, k (k)}{#if k > 0}{"\u2009"}{/if}<span class="lab" data-style={label.style}>{label.text}</span>{/each}{#if vis.more > 0}{"\u2009"}<span class="lab" data-style="name">+{vis.more} more</span>{/if}</span>
          {#each item.indices as index, k (index)}
            {@render chip(index, k > 0)}
          {/each}
        </span>
        {#if item.indices.some((index) => containsNewline(tokens[index] as Token))}<span class="brk" data-brk aria-hidden="true"></span>{/if}
      {:else}
        {@render chip(item.index, false)}
        {#if containsNewline(tokens[item.index] as Token)}<span class="brk" data-brk aria-hidden="true"></span>{/if}
      {/if}
    {/each}
  </div>
{/if}

{#if legend}
  <TokenLegend special={kinds.unknown} marker={kinds.marker} />
{/if}

{#if splitCount > 0}
  <p class="note" data-split-note>{splitNote(splitCount)}</p>
{/if}

{#if compositeCount > 0}
  <p class="note" data-composite-note>{compositeNote(compositeCount)}</p>
{/if}

<style>
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .chip {
    box-sizing: border-box;
    display: inline-flex;
    flex-direction: column;
    padding: 4px 8px;
    min-height: 32px;
    border: 2px solid var(--chip-0-line);
    border-radius: 4px;
    background: var(--chip-0-fill);
    color: var(--text);
    font: 400 18px/1.4 var(--font-mono);
    font-variant-ligatures: none;
    white-space: pre;
    unicode-bidi: isolate;
    max-width: 100%;
    overflow-wrap: anywhere;
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
  /* Partial chips ignore the alternating palette: dashed outline plus a diagonal hatch. */
  .chip[data-partial="true"] {
    border-style: dashed;
    border-color: var(--partial-line);
    background:
      repeating-linear-gradient(45deg, transparent 0 4px, var(--partial-hatch) 4px 5px),
      var(--partial-fill);
  }
  /* Special chips ([UNK]): neutral and solid, never hatched, never dashed. */
  .chip[data-special="true"] {
    border: 2px solid var(--partial-line);
    background: var(--partial-fill);
  }
  /* Character frame (R-01): one flex item that never breaks internally. The solid outline
     means "one character"; the dashed left borders of later chips mark where the tokenizer cut. */
  .frame {
    box-sizing: border-box;
    display: inline-flex;
    flex-wrap: nowrap;
    min-width: 0;
    max-width: 100%;
    border: 2px solid var(--char-frame);
    border-radius: 4px;
    overflow: hidden;
    direction: ltr;
  }
  .label {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    padding: 4px 8px;
    background: var(--char-label-bg);
    border-right: 2px solid var(--char-frame);
    unicode-bidi: isolate;
    white-space: pre;
    color: var(--text);
    font: 400 18px/1.4 var(--font-sans);
  }
  /* Invalid bytes: a dotted outline plus the word "invalid". The label divider stays solid. */
  .frame[data-invalid="true"] {
    border-style: dotted;
  }
  /* Name labels (joiner, hidden mark, invalid, ...) are Label size and Muted. */
  .lab[data-style="name"] {
    color: var(--muted);
    font: 400 14px/1.4 var(--font-sans);
  }
  .frame .chip {
    border-width: 0;
    border-radius: 0;
    min-width: 0;
  }
  .frame .chip.cut {
    border-left: 2px dashed var(--partial-line);
  }
  .line {
    display: block;
  }
  .bytes {
    font-size: 14px;
    line-height: 1.4;
  }
  .chip:not([data-partial="true"]) .bytes {
    color: var(--ws-color);
  }
  /* Byte-line grouping (R-01): the bytes of one multi-byte character are one underlined group,
     with an 8px break between groups so the underline visibly stops. */
  .ch {
    border-bottom: 2px solid currentColor;
  }
  .gap {
    display: inline-block;
    width: var(--space-sm);
    overflow: hidden;
    white-space: pre;
  }
  .ws {
    font-family: var(--font-sans), "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif;
    color: var(--ws-color);
  }
  .brk {
    flex-basis: 100%;
    height: 0;
  }
  .empty {
    padding: var(--space-md);
    border: 1px dashed var(--border);
    border-radius: 4px;
  }
  .empty-title {
    margin: 0;
    font: 600 18px/1.4 var(--font-sans);
  }
  .empty-body {
    margin: var(--space-xs) 0 0;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
  .note {
    margin: var(--space-sm) 0 0;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
  @media print {
    .chip {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }
</style>
