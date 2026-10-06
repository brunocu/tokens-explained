<script lang="ts">
  // The playground island. Server-rendered as "loading", flipped to "ready" in onMount.
  // Reader text only ever reaches the DOM through text interpolation.
  import { onMount } from "svelte";
  import { tokenize } from "../core/toy.ts";
  import type { Token } from "../core/types.ts";
  import {
    countCompositeCharacters,
    countGraphemes,
    countSplitCharacters,
    countWords,
    describeCounts,
    splitNote,
  } from "../core/counts.ts";
  import { groupBytes } from "../core/chars.ts";
  import { DEFAULT_TEXT, EXAMPLES, LIMIT } from "../core/examples.ts";
  import TokenDisplay from "./TokenDisplay.svelte";
  import TokenTable from "./TokenTable.svelte";

  const ERROR_COPY = "The tokenizer could not run. Reload the page to try again. Your text stays in your browser.";

  // Not named `state`: a variable called `state` makes `$state` read as a store subscription.
  let phase = $state<"loading" | "ready" | "failed">("loading");
  let text = $state(DEFAULT_TEXT);
  // View toggles (D-04, D-08). Examples and Reset never touch them (TOK-04).
  let mode = $state<"text" | "ids">("text");
  let peek = $state(false);

  type Result = {
    ok: boolean;
    tokens: Token[];
    characters: number;
    words: number;
    split: number;
  };

  // One derivation for everything the reader sees; any exception becomes the error state.
  const result: Result = $derived.by(() => {
    try {
      const tokens = tokenize(text);
      return {
        ok: true,
        tokens,
        characters: countGraphemes(text),
        words: countWords(text),
        split: countSplitCharacters(text, tokens),
      };
    } catch {
      return { ok: false, tokens: [], characters: 0, words: 0, split: 0 };
    }
  });

  // Joined characters that are on screen as frames or underlined byte groups (UI-SPEC R-01).
  // Shown as a note under the chips; deliberately not part of the live-region announcement.
  const compositeCount = $derived.by(() => {
    if (!result.ok) return 0;
    try {
      return countCompositeCharacters(text, groupBytes(result.tokens), peek);
    } catch {
      return 0;
    }
  });

  let ta: HTMLTextAreaElement | undefined = $state();
  let composing = false;

  // One debounced (500 ms) announcement of the counts; chips are never announced individually.
  let liveMessage = $state("");
  let liveTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleLive() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      if (!result.ok) {
        liveMessage = ERROR_COPY;
        return;
      }
      const counts = describeCounts(result.tokens.length, result.characters, result.words);
      liveMessage = result.split > 0 ? `${counts} ${splitNote(result.split)}` : counts;
    }, 500);
  }

  // Idempotent: independent of the input / compositionend ordering between browsers.
  function commit() {
    if (!composing && ta) {
      text = ta.value;
      scheduleLive();
    }
  }

  // Examples and Reset: set the textarea and `text` together, then focus with the caret at the end.
  function setText(value: string) {
    if (ta) ta.value = value;
    text = value;
    ta?.focus();
    ta?.setSelectionRange(value.length, value.length);
    scheduleLive();
  }

  onMount(() => {
    // Also recovers a late hydration from "failed" (the layout script may have set it).
    phase = "ready";
    return () => clearTimeout(liveTimer);
  });
</script>

<div class="card" data-playground data-state={phase}>
  <!-- Lifecycle line. Shown and hidden purely by CSS on the card's data-state, so the failed state
       works even though this island never hydrated. The Reload button has no Svelte handler: the
       layout script delegates its click (research Pitfall 7). -->
  <p class="status" role="status" data-status>
    <span class="msg-loading" data-msg="loading"
      >Getting the playground ready. The example below already shows the default text.</span
    >
    <span class="msg-failed" data-msg="failed"
      >The playground could not load. Check your connection, then reload the page. The example below still shows the default text.
      <button type="button" class="btn" data-reload>Reload page</button></span
    >
  </p>
  <noscript>
    <style>
      .status {
        display: none;
      }
    </style>
    <p class="nojs">Typing needs JavaScript. The example below shows the default text.</p>
  </noscript>

  <!-- BLOCK 1: input -->
  <div class="block input">
    <label for="t" class="block-label">Your text</label>
    <textarea
      id="t"
      bind:this={ta}
      value={text}
      readonly={phase !== "ready"}
      maxlength={LIMIT}
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      dir="auto"
      aria-describedby="privacy-note"
      oninput={commit}
      oncompositionstart={() => (composing = true)}
      oncompositionend={() => {
        composing = false;
        commit();
      }}
    ></textarea>
    <p class="privacy" id="privacy-note">Your text stays in your browser. Nothing is sent anywhere.</p>
    {#if text.length >= LIMIT}
      <!-- text.length counts UTF-16 units, like maxlength; emoji-heavy input reaches it sooner. -->
      <p class="limit" role="status" data-limit>
        That is the limit for this playground: 1,000 characters. Delete some text to keep typing.
      </p>
    {/if}
  </div>

  <!-- BLOCK 2: examples and reset -->
  <div class="block examples">
    <span class="block-label" id="examples-label">Try an example</span>
    <div class="row" role="group" aria-labelledby="examples-label">
      {#each EXAMPLES as example (example.id)}
        <button
          type="button"
          class="btn"
          data-example={example.id}
          disabled={phase !== "ready"}
          onclick={() => setText(example.text)}>{example.label}</button
        >
      {/each}
      <button type="button" class="btn text-btn" data-reset disabled={phase !== "ready"} onclick={() => setText(DEFAULT_TEXT)}
        >Reset text</button
      >
    </div>
  </div>

  <!-- BLOCK 3: view controls -->
  <div class="controls">
    <fieldset class="show">
      <legend class="block-label">Show</legend>
      <div class="seg-group">
        <label class="seg">
          <input type="radio" name="view" value="text" bind:group={mode} disabled={phase !== "ready"} />
          <span class="seg-text" class:selected={mode === "text"}>Token text</span>
        </label>
        <label class="seg">
          <input type="radio" name="view" value="ids" bind:group={mode} disabled={phase !== "ready"} />
          <span class="seg-text" class:selected={mode === "ids"}>Token IDs</span>
        </label>
      </div>
    </fieldset>
    <div class="peek">
      <label class="peek-label">
        <input type="checkbox" data-peek bind:checked={peek} disabled={phase !== "ready"} aria-describedby="peek-help" />
        <span class="track" class:on={peek} aria-hidden="true"><span class="thumb"></span></span>
        <span class="peek-text">Peek under the hood</span>
        <span class="peek-state" aria-hidden="true">{peek ? "On" : "Off"}</span>
      </label>
      <span class="helper" id="peek-help">Show the raw bytes behind every token.</span>
    </div>
  </div>

  <!-- BLOCK 4: counts -->
  <div class="stats">
    <div class="stat" data-stat="tokens">
      <span class="value" data-stat-value>{result.tokens.length}</span>
      <span class="stat-label">Tokens</span>
    </div>
    <div class="stat" data-stat="characters">
      <span class="value" data-stat-value>{result.characters}</span>
      <span class="stat-label">Characters</span>
    </div>
    <div class="stat" data-stat="words">
      <span class="value" data-stat-value>{result.words}</span>
      <span class="stat-label">Words</span>
    </div>
  </div>

  <!-- BLOCK 5: token display, BLOCK 6: table alternative -->
  <div class="block display">
    {#if result.ok}
      <TokenDisplay tokens={result.tokens} {mode} showBytes={peek} splitCount={result.split} {compositeCount} />
    {:else}
      <p class="tokenizer-error" data-tokenizer-error>{ERROR_COPY}</p>
    {/if}
    <TokenTable tokens={result.tokens} />
  </div>

  <!-- Announces the counts, debounced. Empty on load, so nothing is announced then. -->
  <div class="sr-only" role="status" data-live>{liveMessage}</div>
</div>

<style>
  .card {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 32px;
    padding: 16px;
    background: var(--bg-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
  }
  @media (min-width: 640px) {
    .card {
      padding: 24px;
    }
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .block.display {
    gap: 0;
  }
  .block-label {
    font: 600 14px/1.4 var(--font-sans);
  }
  textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 128px;
    max-height: 320px;
    resize: vertical;
    padding: 16px;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 4px;
    font: 400 18px/1.4 var(--font-mono);
    white-space: pre-wrap;
  }
  .privacy {
    margin: 0;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
  .status {
    margin: 0;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
  .msg-failed {
    display: none;
    color: var(--error);
  }
  .card[data-state="failed"] .msg-failed {
    display: block;
  }
  .card[data-state="failed"] .msg-loading {
    display: none;
  }
  .card[data-state="ready"] .status {
    display: none;
  }
  .msg-failed .btn {
    display: block;
    margin-top: var(--space-sm);
  }
  .nojs {
    margin: 0;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
  .limit {
    margin: 0;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--error);
  }
  .tokenizer-error {
    margin: 0;
    padding: var(--space-md);
    border: 1px solid var(--error);
    border-radius: 4px;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--error);
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 32px;
  }
  .stat {
    display: flex;
    flex-direction: column;
  }
  .value {
    font: 600 24px/1.25 var(--font-sans);
    font-variant-numeric: tabular-nums;
  }
  .stat-label {
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }

  /* Examples and reset. The only transition on buttons is 100ms colour and background. */
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .btn {
    box-sizing: border-box;
    min-height: 44px;
    min-width: 44px;
    padding: 0 16px;
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 4px;
    font: 400 14px/1.4 var(--font-sans);
    cursor: pointer;
    transition:
      color 100ms,
      background-color 100ms;
  }
  .btn:not(:disabled):hover {
    background: var(--bg);
  }
  .btn:disabled {
    color: var(--muted);
    cursor: not-allowed;
  }
  .text-btn {
    padding: 0 8px;
    border-color: transparent;
  }
  .text-btn:not(:disabled):hover,
  .text-btn:focus-visible {
    background: transparent;
    text-decoration: underline;
  }

  /* View controls: a joined pair of native radios and a native checkbox styled as a switch. */
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 16px;
  }
  .show {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .show legend {
    padding: 0;
    margin-bottom: 8px;
  }
  .seg-group {
    display: flex;
  }
  .seg {
    position: relative;
    display: flex;
  }
  .seg input,
  .peek-label input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    opacity: 0;
  }
  .seg-text {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    min-width: 44px;
    padding: 0 16px;
    border: 1px solid var(--border);
    color: var(--text);
    font: 400 14px/1.4 var(--font-sans);
    cursor: pointer;
    transition:
      color 100ms,
      background-color 100ms;
  }
  .seg:first-child .seg-text {
    border-radius: 4px 0 0 4px;
  }
  .seg:last-child .seg-text {
    margin-left: -1px;
    border-radius: 0 4px 4px 0;
  }
  .seg-text.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-text);
    font-weight: 600;
  }
  .seg input:focus-visible + .seg-text {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .seg input:disabled + .seg-text {
    color: var(--muted);
    cursor: not-allowed;
  }
  .seg input:disabled + .seg-text.selected {
    color: var(--accent-text);
    opacity: 0.6;
  }
  .peek {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 8px;
    min-height: 44px;
  }
  .peek-label {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    min-width: 44px;
    font: 600 14px/1.4 var(--font-sans);
    cursor: pointer;
  }
  .track {
    position: relative;
    box-sizing: border-box;
    flex: none;
    width: 40px;
    height: 24px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: transparent;
    transition: background-color 150ms;
  }
  .track.on {
    background: var(--accent);
    border-color: var(--accent);
  }
  .thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--muted);
    transition:
      transform 150ms,
      background-color 150ms;
  }
  .track.on .thumb {
    background: var(--accent-text);
    transform: translateX(16px);
  }
  .peek-label input:focus-visible + .track {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .peek-label input:disabled ~ .peek-text {
    color: var(--muted);
  }
  .peek-state {
    min-width: 24px;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
  .helper {
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
</style>
