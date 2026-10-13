<script lang="ts">
  // The shared coloured-token display (FOUND-02, FOUND-03, FOUND-06). Reused unchanged by
  // later posts. Reader text only ever reaches the DOM through text interpolation.
  import type { Token } from "../core/types.ts";
  import { chipSegments, containsNewline, idLabel, speakToken } from "../core/display.ts";
  import TokenLegend from "./TokenLegend.svelte";
  import { compositeNote, splitNote } from "../core/counts.ts";
  import { byteLineSegments, groupBytes, layoutChips, visibleLabels } from "../core/chars.ts";

  type Props = {
    tokens: Token[];
    /**
     * The two-line chip of the playground: the piece on top, its ID underneath (D-08). Off by default,
     * which is the one-line chip of the comparison and language rows and the prose figure.
     */
    stacked?: boolean;
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
    stacked = false,
    splitCount = 0,
    compositeCount = 0,
    legend = true,
    emptyState = true,
    emptyBody = "Type or paste some text, or pick an example, and it will be split into tokens here.",
  }: Props = $props();

  // Character frames (UI-SPEC R-01): derived here from the token bytes, callers pass nothing new.
  const grouping = $derived(groupBytes(tokens));
  const items = $derived(layoutChips(grouping));
</script>

{#snippet hex(token: Token, i: number)}{#each byteLineSegments(token, grouping.tokens[i]) as segment, k (k)}{#if k > 0}<span class="gap">{" "}</span>{/if}{#if segment.group}<span data-ch={segment.text}>{segment.text}</span>{:else}{segment.text}{/if}{/each}{/snippet}

{#snippet chip(i: number, cut: boolean)}
  {@const token = tokens[i] as Token}
  <!-- The top line is the token text, or the grouped hex bytes of a partial chip (never a replacement
       symbol). In the stacked form its ID is the second line; the stack-chip classes come from widget.css. -->
  <!-- Each chip is one list item. The visual spans are aria-hidden and the one .sr-only span is what
       a screen reader speaks, from the single speakToken function (the stacked ID is spoken too). -->
  <span class="chip" role="listitem" class:stack-chip={stacked} class:stack-chip--regular={stacked} class:cut data-chip data-partial={token.isPartial ? "true" : "false"} data-special={token.special ? "true" : undefined} data-pal={i % 4}
    >{#if token.isPartial}<span class="line bytes" class:stack-chip-text={stacked} aria-hidden="true" data-chip-main>{@render hex(token, i)}</span>{:else}<span class="line" class:stack-chip-text={stacked} aria-hidden="true" data-chip-main>{#each chipSegments(token) as segment}{#if segment.ws}<span class="ws" data-ws>{segment.text}</span>{:else}{segment.text}{/if}{/each}</span>{/if}{#if stacked}<span class="line stack-chip-id" aria-hidden="true" data-chip-id>{idLabel(token)}</span>{/if}<span class="sr-only">{speakToken(token, grouping.tokens[i])}{#if stacked}, ID {idLabel(token)}{/if}</span></span
  >
{/snippet}

{#if tokens.length === 0 && emptyState}
  <div class="empty" data-empty>
    <p class="empty-title">Nothing to split yet</p>
    <p class="empty-body">{emptyBody}</p>
  </div>
{:else}
  <div class="chips" role={items.length > 0 ? "list" : undefined}>
    {#each items as item, n (n)}
      {#if item.kind === "frame"}
        {@const vis = visibleLabels(item.frame)}
        <span class="frame" data-char-frame data-invalid={item.frame.invalid ? "true" : undefined}>
          <span class="label" aria-hidden="true" data-char-label>{#each vis.shown as label, k (k)}{#if k > 0}{"\u2009"}{/if}<span class="lab" data-style={label.style}>{label.text}</span>{/each}{#if vis.more > 0}{"\u2009"}<span class="lab" data-style="name">+{vis.more} more</span>{/if}</span>
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
  <TokenLegend />
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
  /* Colour and behaviour shared by both forms. The anatomy of the two-line (stacked) chip is in
     widget.css (.stack-chip), where the stepper's compact chip takes it from too. */
  .chip {
    box-sizing: border-box;
    border-color: var(--chip-0-line);
    background: var(--chip-0-fill);
    color: var(--text);
    unicode-bidi: isolate;
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  /* The one-line chip: the text only. */
  .chip:not(.stack-chip) {
    display: inline-flex;
    flex-direction: column;
    padding: 4px 8px;
    min-height: 32px;
    border-width: 2px;
    border-style: solid;
    border-radius: 4px;
    font: 400 18px/1.4 var(--font-mono);
    font-variant-ligatures: none;
    white-space: pre;
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
  /* The hex of a partial chip, in Label size, on the chip's top line. */
  .chip .bytes {
    font-size: 14px;
    line-height: 1.4;
  }
  /* Byte-line grouping (R-01): the bytes of one multi-byte character stay together, with an 8px
     break between groups. They are not underlined: on a character cut between tokens the underline
     read as "complete here", which it is not. The frame label names the characters. */
  .gap {
    display: inline-block;
    width: var(--space-sm);
    /* clip, not hidden: a hidden-overflow inline-block takes its baseline from its bottom edge,
       which lifted the byte text off the line's baseline. */
    overflow: clip;
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
