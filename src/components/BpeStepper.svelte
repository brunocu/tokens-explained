<script lang="ts">
  // The BPE stepper island (sketch 001, variant D). The whole trace is computed once from pure
  // code (src/core/stepper.ts); the buttons only move a stage index into it and the markup only
  // shows what the trace holds. Text reaches the DOM through interpolation only. There is no input
  // and no storage. The one timer is the 320 ms fuse animation, skipped under reduced motion.
  import { onMount, tick } from "svelte";
  import { GLYPH_SPACE } from "../core/display.ts";
  import {
    SAMPLE_SENTENCE,
    SAMPLE_TRACE,
    UNSEEN_WORDS,
    byteLabel,
    encodeText,
    explainStage,
    markPairs,
    mergePairs,
    spokenPieces,
    stageCount,
    stageInfo,
    stageName,
    textOf,
  } from "../core/stepper.ts";
  import type { PairRow, SentenceMerge } from "../core/stepper.ts";
  import Chip from "./Chip.svelte";
  import IslandStatus from "./IslandStatus.svelte";

  const trace = SAMPLE_TRACE;
  const merges = trace.merges.length;
  const stages = stageCount(trace);
  const LAST = stages - 1;
  const FUSE_MS = 320;
  const MIN_ROWS = 5;
  const finished = trace.merges[merges - 1]?.after ?? trace.start;
  const learnedPairs = mergePairs(trace);
  const unseen = UNSEEN_WORDS.map((word) => ({ word, ids: encodeText(word, learnedPairs)[0] ?? [] }));
  /** The byte ids of the cat emoji, without the leading space byte. */
  const emojiBytes = (unseen[1]?.ids ?? []).slice(1);

  // Not named `state`: a variable called `state` makes `$state` read as a store subscription.
  let phase = $state<"loading" | "ready" | "failed">("loading");
  let stage = $state(0);
  let fusing = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  let nextButton: HTMLButtonElement | undefined = $state();
  let resetButton: HTMLButtonElement | undefined = $state();

  const ready = $derived(phase === "ready");
  const info = $derived(stageInfo(trace, stage));
  const why = $derived(explainStage(trace, stage));
  const current = $derived<SentenceMerge | null>(info.kind === "merge" ? (trace.merges[info.merge - 1] ?? null) : null);
  /** Merges already applied to the words on screen. */
  const done = $derived(info.kind === "merge" ? info.merge - 1 : info.kind === "stop" || info.kind === "unseen" ? merges : 0);
  /** The piece the previous merge made, drawn with the double border. */
  const freshId = $derived<number | null>(info.kind === "unseen" || done < 1 ? null : (trace.merges[done - 1]?.newId ?? null));
  const shownPairs = $derived(current === null ? [] : current.pairs.slice(0, Math.max(MIN_ROWS, current.tiedCount)));
  const topCount = $derived(current === null ? 1 : current.chosen.count);
  const caption = $derived.by(() => {
    if (current === null) return "";
    const n = current.totalPairs;
    return shownPairs.length >= n
      ? `Pairs counted before merge ${current.index}. All ${n} pairs, most common first.`
      : `Pairs counted before merge ${current.index}, most common first. Showing the top ${shownPairs.length} of ${n} pairs.`;
  });

  function outcome(row: PairRow, index: number): "merged" | "tied" | "none" {
    if (index === 0) return "merged";
    return current !== null && row.count === current.chosen.count ? "tied" : "none";
  }

  function prefersReducedMotion(): boolean {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  async function goNext() {
    if (fusing || stage >= LAST) return;
    if (info.kind === "merge" && !prefersReducedMotion()) {
      fusing = true;
      await new Promise<void>((resolve) => {
        timer = setTimeout(resolve, FUSE_MS);
      });
      fusing = false;
    }
    stage += 1;
    await tick();
    if (stage === LAST) resetButton?.focus();
  }
  async function goBack() {
    if (fusing) return;
    stage -= 1;
    await tick();
    if (stage === 0) nextButton?.focus();
  }
  async function runToEnd() {
    if (fusing) return;
    stage = LAST;
    await tick();
    resetButton?.focus();
  }
  async function reset() {
    if (fusing) return;
    stage = 0;
    await tick();
    nextButton?.focus();
  }

  onMount(() => {
    // Also recovers a late hydration from "failed" (the layout script may have set it).
    phase = "ready";
    return () => clearTimeout(timer);
  });
</script>

<!-- The space glyph: drawn as a .ws symbol, spoken as the word "space". -->
{#snippet marked(text: string)}{#each text.split(GLYPH_SPACE) as part, i (i)}{#if i > 0}<span class="ws" aria-hidden="true">{GLYPH_SPACE}</span><span class="sr-only"> space </span>{/if}{part}{/each}{/snippet}

<!-- A row of words as chips. With `boxed`, every spot of the winning pair gets one heavy box. -->
{#snippet strip(rows: number[][], boxed: { left: number; right: number } | null)}
  <div class="words" aria-hidden="true" data-words>
    {#each rows as row, w (w)}
      <div class="word" data-word={trace.words[w]}>
        {#if boxed !== null}
          {#each markPairs(row, boxed.left, boxed.right) as run, r (r)}
            {#if "pair" in run}
              <span class="pairbox" class:fusing data-pair-box
                ><Chip text={textOf(trace, run.pair[0])} id={run.pair[0]} /><Chip text={textOf(trace, run.pair[1])} id={run.pair[1]} /></span
              >
            {:else}
              <Chip text={textOf(trace, run.id)} id={run.id} fresh={run.id === freshId} />
            {/if}
          {/each}
        {:else}
          {#each row as id, i (i)}
            <Chip text={textOf(trace, id)} {id} fresh={id === freshId} />
          {/each}
        {/if}
      </div>
    {/each}
  </div>
  <p class="sr-only" data-spoken>{rows.map((r, w) => `Word ${w + 1}: ${spokenPieces(trace, r)}.`).join(" ")}</p>
{/snippet}

<div class="island-card" data-island data-stepper data-state={phase}>
  <IslandStatus
    loading="Getting the example ready. The first step is already shown below."
    failed="The example could not load. Check your connection, then reload the page. The first step is still shown below."
    nojs="Stepping needs JavaScript. The first step is shown below."
  />

  <p class="stage island-label" data-step-status>Step {stage + 1} of {stages}: {stageName(trace, stage)}</p>
  <div class="progress" aria-hidden="true">
    {#each Array.from({ length: stages }, (_, i) => i) as i (i)}
      <i class:done={i < stage} class:now={i === stage}></i>
    {/each}
  </div>

  <div class="row">
    <button type="button" class="island-btn" data-back disabled={!ready || stage === 0} onclick={goBack}>Back</button>
    <button
      type="button"
      class="island-btn island-btn-primary"
      data-next
      bind:this={nextButton}
      disabled={!ready || stage >= LAST}
      onclick={goNext}>Next</button
    >
    <button type="button" class="island-btn" data-run disabled={!ready || stage >= LAST} onclick={runToEnd}>Run to end</button>
    <button type="button" class="island-btn" data-reset bind:this={resetButton} disabled={!ready || stage === 0} onclick={reset}>Reset</button>
  </div>

  <p class="why" data-why role="status" aria-live="polite" aria-atomic="true">{@render marked(why)}</p>

  {#if info.kind === "text"}
    <div class="block">
      <p class="island-label">The text as one row of characters: the character on top, its byte value below</p>
      <div class="stream" aria-hidden="true" data-chars>
        {#each trace.start.flat() as id, i (i)}
          <Chip text={textOf(trace, id)} {id} />
        {/each}
      </div>
      <p class="sr-only" data-spoken>{SAMPLE_SENTENCE}</p>
    </div>
  {:else if info.kind === "start"}
    <div class="block">
      <p class="island-label">Starting tokens</p>
      {@render strip(trace.start, null)}
    </div>
  {:else if info.kind === "merge" && current !== null}
    <div class="block">
      <p class="island-label">Every place the winning pair appears ({current.chosen.count})</p>
      {@render strip(current.before, { left: current.chosen.left, right: current.chosen.right })}
    </div>

    <div class="callout" data-next-merge>
      <h3>Next: {@render marked(current.chosen.leftText)} + {@render marked(current.chosen.rightText)} becomes one new token, id {current.newId}</h3>
      <p>Press Next to fuse all {current.chosen.count} boxed spots at once.</p>
    </div>

    <!-- A scrollable region must be reachable by keyboard (WCAG 2.1.1), so the tabindex is deliberate. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="scroll" role="region" aria-label="Pair counts, scrollable" tabindex="0">
      <table data-pair-table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Pair</th>
            <th scope="col">Times seen</th>
            <th scope="col"><span class="sr-only">Bar</span></th>
            <th scope="col">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {#each shownPairs as row, i (`${row.left}+${row.right}`)}
            {@const result = outcome(row, i)}
            <tr data-pair={`${row.leftText}+${row.rightText}`} data-outcome={result} aria-current={result === "merged" ? "true" : undefined}>
              <td class="pair"
                >{@render marked(row.leftText)} + {@render marked(row.rightText)} <span class="island-muted">({row.left}, {row.right})</span></td
              >
              <td class="num">{row.count}</td>
              <td class="barcell" aria-hidden="true"
                ><span class="bar" class:tie={result === "tied"} style:width={`${(row.count / topCount) * 100}%`}></span></td
              >
              <td class="outcome">
                {#if result === "merged"}Merged{:else if result === "tied"}Tied{:else}<span class="sr-only">Not merged</span>{/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if info.kind === "stop"}
    <div class="block" data-stop>
      <p class="island-label">The finished text, {trace.lengths[merges]} tokens</p>
      {@render strip(finished, null)}
    </div>
  {:else}
    <div class="block" data-stop>
      <p class="island-label">The finished text, {trace.lengths[merges]} tokens</p>
      {@render strip(finished, null)}
    </div>
    <div class="callout" data-final>
      <h3>Encoding words that were never in the text</h3>
      {#each unseen as item (item.word)}
        <p class="unseen-line">
          {@render marked(item.word.split(" ").join(GLYPH_SPACE))} becomes {item.ids.length} tokens:
        </p>
        <div class="words" aria-hidden="true" data-unseen-word={item.word}>
          <div class="word">
            {#each item.ids as id, i (i)}
              <Chip text={textOf(trace, id)} {id} />
            {/each}
          </div>
        </div>
        <p class="sr-only">{spokenPieces(trace, item.ids)}.</p>
      {/each}
      <p class="island-muted">
        Tokens with a plain outline are single bytes: nothing was learned for them, so the tokenizer falls back to raw bytes. The cat
        emoji needs {emojiBytes.length} bytes, with the values {emojiBytes.join(", ")}. The boxes show them in hexadecimal: {emojiBytes
          .map((id) => byteLabel(id))
          .join(" ")}.
      </p>
    </div>
  {/if}

  {#if stage >= 1}
    <div class="stats" data-stats>
      <span class="stat"><b>{256 + done}</b><span>vocabulary size</span></span>
      <span class="stat"><b>{trace.lengths[done]}</b><span>tokens in the text</span></span>
    </div>
  {/if}

  <p class="island-muted legend" data-stepper-legend>
    Each box shows a token on top and its id below. A plain outline is a single byte; a coloured box is a token the tokenizer
    learned; a double border marks the token made by the latest merge. {@render marked(GLYPH_SPACE)} stands for a space.
  </p>
</div>

<style>
  .stage {
    margin: 0;
  }
  .progress {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .progress i {
    width: 18px;
    height: 8px;
    border: 1px solid var(--border);
    border-radius: 2px;
    background: var(--bg);
  }
  .progress i.done {
    background: var(--text);
  }
  .progress i.now {
    border: 2px solid var(--text);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .why {
    margin: 0;
    min-height: 6.4em;
    font: 400 18px/1.6 var(--font-serif), Georgia, serif;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .block p {
    margin: 0;
  }
  /* One continuous row: it wraps between any two characters, not between words. */
  .stream {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .words {
    display: flex;
    flex-wrap: wrap;
    gap: 14px 18px;
    padding-top: 2px;
  }
  .word {
    display: flex;
    gap: 3px;
  }
  /* One heavy box around both pieces of the winning pair. On fuse the gap closes and the two
     chips touch, so the pair reads as one piece. The heavy outline is the meaning, not colour. */
  .pairbox {
    display: inline-flex;
    gap: 3px;
    padding: 3px;
    border: 3px solid var(--text);
    border-radius: 8px;
    background: var(--bg);
    transition:
      gap 300ms ease,
      padding 300ms ease;
  }
  .pairbox.fusing {
    gap: 0;
    padding: 0 3px;
  }
  .pairbox :global(.chip) {
    transition: all 300ms ease;
  }
  .pairbox.fusing :global(.chip:first-child) {
    border-right-width: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .pairbox.fusing :global(.chip:last-child) {
    border-left-width: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
  .callout {
    padding: 10px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-left: 4px solid var(--text);
    border-radius: 4px;
  }
  .callout h3 {
    margin: 0 0 4px;
    font: 700 15px/1.3 var(--font-sans);
  }
  .callout p {
    margin: 0;
    font-size: 16px;
  }
  .callout .unseen-line {
    margin: 8px 0 4px;
  }
  .callout .island-muted {
    margin-top: 8px;
  }
  .scroll {
    overflow-x: auto;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font: 400 14px/1.4 var(--font-sans);
  }
  caption {
    padding: 8px 16px;
    text-align: left;
    color: var(--muted);
  }
  th,
  td {
    padding: 6px 12px;
    text-align: left;
    border-top: 1px solid var(--border);
  }
  th {
    background: var(--bg-2);
    font-weight: 600;
  }
  .pair {
    font-family: var(--font-mono);
    white-space: pre;
  }
  .pair .island-muted {
    font-family: var(--font-sans);
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .barcell {
    width: 30%;
    min-width: 80px;
  }
  /* A tie is shown by a hatched bar and the word "Tied", the winner by weight, an outline and the
     word "Merged": never colour alone. The outline sits inside the row so the scroller does not clip it. */
  .bar {
    display: inline-block;
    height: 10px;
    background: var(--text);
    border-radius: 2px;
    vertical-align: middle;
  }
  .bar.tie {
    border: 1px solid var(--text);
    background: repeating-linear-gradient(45deg, var(--text) 0 3px, var(--bg) 3px 6px);
  }
  tr[data-outcome="merged"] {
    background: var(--bg);
    font-weight: 700;
    outline: 2px solid var(--char-frame);
    outline-offset: -2px;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .stat {
    display: inline-flex;
    flex-direction: column;
    min-width: 120px;
    padding: 6px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
  }
  .stat b {
    font: 700 22px/1.2 var(--font-sans);
    font-variant-numeric: tabular-nums;
  }
  .stat span {
    font: 400 12px/1.4 var(--font-sans);
    color: var(--muted);
  }
  .legend {
    margin: 0;
  }
  .ws {
    font-family: var(--font-sans), "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif;
    color: var(--ws-color);
  }
</style>
