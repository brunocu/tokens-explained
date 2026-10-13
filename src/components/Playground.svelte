<script lang="ts">
  // The playground island, running on GPT-2. Two levels of state (as in Comparison.svelte):
  //   phase    the island itself: server-rendered as "loading", flipped to "ready" in onMount, so the
  //            layout's 8-second failure watcher never fires on a slow connection (D-07).
  //   download the GPT-2 file: "loading" until it arrives, then "ready", or "failed". It is fetched
  //            in onMount at page load (D-04), never imported, so it stays out of the script bundle.
  // Until the file arrives the tokens come from `preTokens`, a build-time lookup (text to rows) that
  // the MDX passes in for the default text and the five examples (D-05), computed at build time by
  // the post's shared props module. Reader text only ever reaches the DOM through text interpolation.
  import { onMount } from "svelte";
  import type { RealTokenizer } from "../core/realTokenizer.ts";
  import { fixtureTokens } from "../core/compare/fixture.ts";
  import type { FixtureToken } from "../core/compare/fixture.ts";
  import type { Token } from "../core/types.ts";
  import {
    countBytes,
    countCompositeCharacters,
    countGraphemes,
    countSplitCharacters,
    countWords,
    describeCounts,
    splitNote,
  } from "../core/counts.ts";
  import { groupBytes } from "../core/chars.ts";
  import { DEFAULT_TEXT } from "../core/examples.ts";
  import ScrollRegion from "./ScrollRegion.svelte";
  import TextPanel from "./TextPanel.svelte";
  import TokenDisplay from "./TokenDisplay.svelte";
  import TokenLegend from "./TokenLegend.svelte";
  import TokenTable from "./TokenTable.svelte";
  import { createTokenizerDownload } from "./tokenizerDownload.ts";
  import type { TokenizerDownload } from "./tokenizerDownload.ts";

  let { preTokens, sizeLabel }: { preTokens: Record<string, FixtureToken[]>; sizeLabel: string } = $props();

  // The site base always ends with a slash here; the guard keeps the loader's address right if not.
  // Kept in this file so the base expression stays out of src/core.
  const rawBase: string = import.meta.env.BASE_URL;
  const baseUrl = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

  const ERROR_COPY = "The tokenizer could not run. Reload the page to try again. Your text stays in your browser.";

  // Not named `state`: a variable called `state` makes `$state` read as a store subscription.
  let phase = $state<"loading" | "ready" | "failed">("loading");
  let download = $state<"loading" | "ready" | "failed">("loading");
  // Raw: the tokenizer is a plain object with internal tables that must not be wrapped in a proxy.
  let tokenizer = $state.raw<RealTokenizer | null>(null);
  let text = $state(DEFAULT_TEXT);
  // Counts how often an example or Reset text replaced the text. It is the tokens region's reset key:
  // that region scrolls back to its top on a deliberate choice, and never while the reader types.
  let replaced = $state(0);
  // Token IDs under the chips: off until the reader asks for them.
  let showIds = $state(false);

  type Result = {
    ok: boolean;
    tokens: Token[];
    characters: number;
    /** The raw size of the text in bytes, counted from the text itself and not from the tokenizer. */
    bytes: number;
    words: number;
    split: number;
  };

  // One derivation for everything the reader sees; any exception becomes the error state.
  const result: Result = $derived.by(() => {
    try {
      // The loaded tokenizer when there is one; otherwise the build-time rows for the six known texts.
      const tokens: Token[] = tokenizer !== null ? tokenizer.tokenize(text) : fixtureTokens(preTokens[text] ?? []);
      return {
        ok: true,
        tokens,
        characters: countGraphemes(text),
        bytes: countBytes(text),
        words: countWords(text),
        split: countSplitCharacters(text, tokens),
      };
    } catch {
      return { ok: false, tokens: [], characters: 0, bytes: 0, words: 0, split: 0 };
    }
  });

  // Joined characters that are on screen as frames or underlined byte groups (UI-SPEC R-01).
  // Shown as a note under the chips; deliberately not part of the live-region announcement.
  const compositeCount = $derived.by(() => {
    if (!result.ok) return 0;
    try {
      return countCompositeCharacters(text, groupBytes(result.tokens), false);
    } catch {
      return 0;
    }
  });

  let panel: TextPanel | undefined = $state();

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
      const counts = describeCounts(result.tokens.length, result.characters, result.words, result.bytes);
      liveMessage = result.split > 0 ? `${counts} ${splitNote(result.split)}` : counts;
    }, 500);
  }

  // The panel reports the text once typing (or a composition) has settled, and when an example or
  // Reset text replaced it.
  function commit(value: string, replacement: boolean) {
    text = value;
    if (replacement) replaced += 1;
    scheduleLive();
  }

  // Said once, when the download turns ready after this widget's own attempt, in its own region so
  // the debounced count message (data-live) is untouched.
  let readyMessage = $state("");
  // Plain variable: created in onMount (never at component top level, the component also runs on a
  // server) and disposed in its cleanup.
  let gpt2Download: TokenizerDownload | undefined;

  // One download attempt, through the controller shared with the comparison card. `retried` is true
  // only for an attempt the reader started with Try again: then a second failure moves focus to the
  // button. A failure at page load never moves focus, since the reader has not acted yet and focusing
  // would scroll the page. The loader memoises a success and evicts a failure, so a retry fetches
  // again. When a retry in another widget succeeds, the controller clears this widget silently
  // (origin "other"): state only, no ready message, no focus.
  function startDownload(retried: boolean): void {
    void gpt2Download?.start(retried);
  }

  onMount(() => {
    // Also recovers a late hydration from "failed" (the layout script may have set it).
    phase = "ready";
    gpt2Download = createTokenizerDownload("gpt2", baseUrl, {
      onLoading: () => {
        download = "loading";
      },
      onReady: (loaded, origin) => {
        tokenizer = loaded;
        download = "ready";
        if (origin === "own") readyMessage = "The tokenizer is ready. You can type now.";
      },
      onFailed: async (retried) => {
        download = "failed";
        if (retried) await panel?.focusRetry();
      },
    });
    // The download starts now, at page load (D-04). Typing never causes a request. A failure leaves
    // the textbox locked, with a message and a Try again button, until a retry succeeds (D-06).
    startDownload(false);
    return () => {
      gpt2Download?.dispose();
      gpt2Download = undefined;
      clearTimeout(liveTimer);
    };
  });
</script>

<!-- The root is a real box (not an island wrapper, which is display: contents), so the layout classes
     of widget.css sit here. Left column: where you act. Right column: the tokens. -->
<section class="island-card widget widget--playground" aria-label="Token playground" data-playground data-island data-state={phase} data-tokenizer={download}>
  <div class="widget-col">
    <!-- Lifecycle line, text box and the notes under it: shared with the comparison. -->
    <TextPanel
      bind:this={panel}
      {text}
      oncommit={commit}
      {phase}
      {download}
      inputId="t"
      privacyId="privacy-note"
      {sizeLabel}
      loadingAttrs={{ "data-tokenizer-status": "" }}
      errorAttrs={{ "data-tokenizer-load-error": "" }}
      retryAttrs={{ "data-tokenizer-retry": "" }}
      onretry={() => startDownload(true)}
      editable={phase === "ready" && download === "ready"}
      lockedAs="textarea"
    />

    <!-- Counts -->
    <div class="stats">
      <div class="stat" data-stat="bytes">
        <span class="value" data-stat-value>{result.bytes}</span>
        <span class="stat-label">Bytes</span>
      </div>
      <div class="stat" data-stat="characters">
        <span class="value" data-stat-value>{result.characters}</span>
        <span class="stat-label">Characters</span>
      </div>
      <div class="stat" data-stat="tokens">
        <span class="value" data-stat-value>{result.tokens.length}</span>
        <span class="stat-label">Tokens</span>
      </div>
    </div>
  </div>

  <div class="widget-col">
    <div class="tokens-head">
      <span class="block-label">Tokens</span>
      <br />
      <label class="id-toggle"><input type="checkbox" role="switch" class="switch" bind:checked={showIds} data-show-ids /> Show token IDs</label>
    </div>
    <!-- The elastic element of this column. The table alternative sits inside it, so opening the
         details lengthens the region's content and never the widget. The legend stays outside. -->
    <ScrollRegion label="Tokens, scrollable" resetKey={replaced}>
      {#if result.ok}
        <TokenDisplay tokens={result.tokens} stacked={showIds} legend={false} splitCount={result.split} {compositeCount} />
      {:else}
        <p class="tokenizer-error" data-tokenizer-error>{ERROR_COPY}</p>
      {/if}
    </ScrollRegion>
    <TokenTable tokens={result.tokens} />
    <div class="legend-slot"><TokenLegend /></div>
  </div>

  <!-- Announces the counts, debounced. Empty on load, so nothing is announced then. -->
  <div class="sr-only" role="status" data-live>{liveMessage}</div>
  <!-- Announces once that typing is possible. Empty until then. -->
  <div class="sr-only" role="status" data-tokenizer-live>{readyMessage}</div>
</section>

<style>
  /* Per-widget values of the shared grid in widget.css (UI-SPEC "Layout and Widget Sizing"). The
     height is the smallest multiple of 8 that holds the tallest designed state, measured at 1440x900
     in Chromium (plan 02.2-03): the left column with the download-failed message, Try again, the
     privacy line and the limit message at once needs 601.9px with the textarea at its 96px floor
     (parts and gaps 609.9px, less the 8px the label is pulled up), and the widget adds 50px of
     padding and border, so 651.9px at least; 656px is the next multiple of 8. At 640px that state
     overflowed the column by 12px. */
  .widget--playground {
    --widget-cols: minmax(0, 5fr) minmax(0, 7fr);
    --widget-h: 656px;
  }
  .block-label {
    font: 600 14px/1.4 var(--font-sans);
  }
  .legend-slot {
    margin-top: auto;
  }
  .id-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font: 400 14px/1.4 var(--font-sans);
  }
  .id-toggle {
    cursor: pointer;
  }
  .switch {
    appearance: none;
    position: relative;
    flex: none;
    width: 40px;
    height: 24px;
    margin: 0;
    border: 1px solid var(--text);
    border-radius: 12px;
    background: var(--bg);
    cursor: pointer;
    transition: background-color 100ms;
  }
  .switch::before {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text);
    transition: transform 100ms;
  }
  .switch:checked {
    background: var(--text);
  }
  .switch:checked::before {
    background: var(--bg);
    transform: translateX(16px);
  }
  .switch:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
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
    gap: 16px;
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

</style>
