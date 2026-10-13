<script lang="ts">
  // The comparison island: ONE widget, not a curated card with a second "try your own text" card under
  // it. The example buttons (shared with the playground) choose a text. That text sits in one text area,
  // and one set of rows (GPT-2, then BERT) shows how it is cut. The reader can edit the text in place.
  //
  // Two columns from 1024px (widget.css): the left column is the input (text, examples, the BERT
  // download), the right column is the result (the rows in a scroll region, the note below it). The
  // text box is the left column's only elastic element and the rows region the right column's, so the
  // lines that come and go under the text never change the height of the widget.
  //
  // What the rows are made of depends on what has arrived, so the card is complete at every stage:
  //   - without JavaScript, or until GPT-2 has downloaded: the committed, dated fixture
  //     (src/core/compare/comparison.json). The fixture is imported here, not passed as a prop, so it
  //     ships once in a cached chunk and is not serialised into the page HTML.
  //   - once GPT-2 is ready: the GPT-2 row is live and the text area is editable. GPT-2 is asked for
  //     through the shared, memoised loader when the card hydrates, so the page makes one request for
  //     the file (the playground asks for the same file).
  //   - BERT: its row comes from the fixture while the text is still an example text. A reader who
  //     types needs BERT itself: it downloads only when its sized button is pressed, never on typing.
  // Both loader calls sit in onMount or in handlers, never at component top level. Reader text
  // reaches the DOM through interpolation only.
  //
  // States, each its own attribute so hooks stay recognisable:
  //   data-state            the island: loading, ready (on hydration), or failed (layout watcher)
  //   data-compare-gpt2     GPT-2: loading, ready or error
  //   data-compare-bert     BERT: idle, loading, ready or error
  // Each tokenizer has its own variable, so one that arrived is kept when the other fails. Try again
  // asks the loader for that tokenizer only. The Try again buttons stay separate, but the outcome is
  // shared for GPT-2: a successful GPT-2 retry in either this card or the playground also clears the
  // error in the other widget, silently (no announcement, no focus move there).
  import { onMount, tick } from "svelte";
  import fixtureJson from "../core/compare/comparison.json";
  import { fixtureTokens } from "../core/compare/fixture.ts";
  import type { ComparisonFixture } from "../core/compare/fixture.ts";
  import { DEFAULT_TEXT, EXAMPLES } from "../core/examples.ts";
  import type { RealTokenizer } from "../core/realTokenizer.ts";
  import type { Token } from "../core/types.ts";
  import { loadTokenizer } from "./loadTokenizer.ts";
  import ScrollRegion from "./ScrollRegion.svelte";
  import { createTokenizerDownload } from "./tokenizerDownload.ts";
  import type { TokenizerDownload } from "./tokenizerDownload.ts";
  import TextPanel from "./TextPanel.svelte";
  import TokenLegend from "./TokenLegend.svelte";
  import TokenRows from "./TokenRows.svelte";

  type Rows = { gpt2: Token[]; bert?: Token[] };

  /** Same-origin address of the licence notices; the shared props module builds it from the site base. */
  let { noticeHref }: { noticeHref: string } = $props();

  const fixture = fixtureJson as unknown as ComparisonFixture;
  const gpt2SizeLabel = fixture.meta.download.gpt2.sizeLabelMb;
  const bertSizeLabel = fixture.meta.download.bert.sizeLabelMb;

  const FAILURE_COPY = "The tokenizers could not run on this text. Edit the text, or reload the page.";

  type Entry = { id: string; label: string; text: string; rows: { gpt2: Token[]; bert: Token[] } };

  // Converted once at module level: text -> id, label and the two precomputed Token arrays, for the
  // default text and the five examples (the texts the shared buttons can set).
  const DEFAULT_ENTRY: Entry = {
    id: "default",
    label: "the default text",
    text: fixture.defaultText.text,
    rows: { gpt2: fixtureTokens(fixture.defaultText.gpt2), bert: fixtureTokens(fixture.defaultText.bert) },
  };
  const BY_TEXT = new Map<string, Entry>([
    [DEFAULT_ENTRY.text, DEFAULT_ENTRY],
    ...fixture.examples.map((example): [string, Entry] => [
      example.text,
      {
        id: example.id,
        label: EXAMPLES.find((e) => e.id === example.id)?.label ?? "",
        text: example.text,
        rows: { gpt2: fixtureTokens(example.rows.gpt2), bert: fixtureTokens(example.rows.bert) },
      },
    ]),
  ]);

  // Not named `state`: a variable called `state` makes `$state` read as a store subscription.
  let phase = $state<"loading" | "ready" | "failed">("loading");
  let gpt2Phase = $state<"loading" | "ready" | "error">("loading");
  let bertPhase = $state<"idle" | "loading" | "ready" | "error">("idle");
  // The default text or example the text started from; it stays after the reader edits the text.
  let current = $state.raw<Entry>(DEFAULT_ENTRY);
  // The text being cut. It is that entry's text until the reader edits it.
  let text = $state(DEFAULT_TEXT);
  // Counts the deliberate replacements of the text (an example or Reset text). It is
  // the rows region's reset key: the region scrolls back to its top then, and never while the reader types.
  let replaced = $state(0);
  // Raw: a tokenizer is a plain object with internal tables that must not be wrapped in a proxy.
  let gpt2 = $state.raw<RealTokenizer | null>(null);
  let bert = $state.raw<RealTokenizer | null>(null);
  // Empty until the reader acts, so nothing is announced on load.
  let announcement = $state("");

  let panel: TextPanel | undefined = $state();
  let bertButton: HTMLButtonElement | undefined = $state();
  let mounted = false;

  // True once the reader has changed the text: the notes and the precomputed BERT row then no longer apply.
  const edited = $derived(text !== current.text);

  // One derivation for what the reader sees; any exception from a tokenizer becomes the failure message.
  // The GPT-2 row is live once GPT-2 is ready and precomputed before that. The BERT row is live once
  // BERT is ready, precomputed while the text is still an example, and absent otherwise.
  const result = $derived.by((): { ok: true; rows: Rows } | { ok: false } => {
    try {
      const rows: Rows = { gpt2: gpt2 !== null ? gpt2.tokenize(text) : current.rows.gpt2 };
      if (bert !== null) rows.bert = bert.tokenize(text);
      else if (!edited) rows.bert = current.rows.bert;
      return { ok: true, rows };
    } catch {
      return { ok: false };
    }
  });

  // The site base always ends with a slash here; the guard keeps the loader's address right if not.
  // Kept in this file so the base expression stays out of src/core.
  const rawBase: string = import.meta.env.BASE_URL;
  const baseUrl = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

  function countsSentence(rows: Rows): string {
    const gpt2Part = `GPT-2: ${rows.gpt2.length} tokens.`;
    return rows.bert === undefined ? gpt2Part : `${gpt2Part} BERT: ${rows.bert.length} tokens.`;
  }

  // One debounced (500 ms) announcement of the counts for typed text; chips are never announced individually.
  let liveTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleLive(): void {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      announcement = result.ok ? countsSentence(result.rows) : FAILURE_COPY;
    }, 500);
  }

  // The panel reports the text once typing (or a composition) has settled, and when an example or
  // Reset text replaced it. A replacement announces the example and its counts once.
  function commit(value: string, replacement: boolean): void {
    text = value;
    const entry = replacement ? BY_TEXT.get(value) : undefined;
    if (entry === undefined) {
      scheduleLive();
      return;
    }
    current = entry;
    replaced += 1;
    clearTimeout(liveTimer);
    announcement = `Showing ${entry.label}. GPT-2: ${entry.rows.gpt2.length} tokens. BERT: ${entry.rows.bert.length} tokens.`;
  }

  async function focusEnd(): Promise<void> {
    await panel?.focusEnd();
  }

  // GPT-2: starts on hydration, and again from Try again. `retried` is true only for an attempt the
  // reader started: then focus follows the outcome. A failure at page load never moves focus, since
  // the reader has not acted yet and focusing would scroll the page.
  // The attempt runs through the controller shared with the playground. When a retry in the playground
  // succeeds, the controller clears this card silently (origin "other"): state only, no announcement,
  // no focus move.
  let gpt2Download: TokenizerDownload | undefined;
  // True while the running attempt was started by the reader's Try again press; read in onReady,
  // because "own" is also reported for the page-load attempt, which must announce and focus nothing.
  let retriedAttempt = false;

  function startGpt2(retried: boolean): void {
    retriedAttempt = retried;
    void gpt2Download?.start(retried);
  }

  // BERT: starts only from its button or its Try again button. Asks for BERT alone.
  async function startBert(): Promise<void> {
    bertPhase = "loading";
    try {
      const loaded = await loadTokenizer("bert", baseUrl);
      if (!mounted) return;
      bert = loaded;
      bertPhase = "ready";
      clearTimeout(liveTimer);
      announcement = "BERT is loaded. Counts for both tokenizers are shown.";
      // The button that was pressed is gone, so put focus where the reader types.
      await focusEnd();
    } catch {
      if (!mounted) return;
      bertPhase = "error";
      await tick();
      bertButton?.focus();
    }
  }

  onMount(() => {
    mounted = true;
    // Also recovers a late hydration from "failed" (the layout script may have set it).
    phase = "ready";
    gpt2Download = createTokenizerDownload("gpt2", baseUrl, {
      onLoading: () => {
        gpt2Phase = "loading";
      },
      onReady: async (loaded, origin) => {
        gpt2 = loaded;
        gpt2Phase = "ready";
        if (origin === "own" && retriedAttempt) {
          clearTimeout(liveTimer);
          announcement = "GPT-2 is ready. You can edit the text.";
          // The button that was pressed is gone, so put focus where the reader types.
          await focusEnd();
        }
      },
      onFailed: async (retried) => {
        gpt2Phase = "error";
        if (retried) await panel?.focusRetry();
      },
    });
    startGpt2(false);
    return () => {
      mounted = false;
      gpt2Download?.dispose();
      gpt2Download = undefined;
      clearTimeout(liveTimer);
    };
  });
</script>

<!-- The root is a real box (not an island wrapper, which is display: contents), so the layout classes
     of widget.css sit here. Left column: the input. Right column: the result. -->
<section
  class="island-card widget widget--comparison"
  aria-label="Tokenizer comparison, GPT-2 and BERT"
  data-island
  data-compare
  data-state={phase}
  data-compare-gpt2={gpt2Phase}
  data-compare-bert={bertPhase}
  aria-busy={bertPhase === "loading" || (phase === "ready" && gpt2Phase === "loading") ? "true" : undefined}
>
  <div class="widget-col">
    <!-- Lifecycle line, text box and the notes under it: shared with the playground. Until GPT-2 is
         ready the box is a static one, afterwards a textarea. -->
    <TextPanel
      bind:this={panel}
      {text}
      oncommit={commit}
      {phase}
      download={gpt2Phase === "error" ? "failed" : gpt2Phase}
      inputId="compare-input"
      privacyId="compare-privacy"
      sizeLabel={gpt2SizeLabel}
      loadingAttrs={{ "data-compare-loading": "gpt2" }}
      errorAttrs={{ "data-compare-error": "gpt2" }}
      retryAttrs={{ "data-retry": "gpt2" }}
      staticAttrs={{ "data-compare-text": "" }}
      onretry={() => startGpt2(true)}
      editable={gpt2Phase === "ready"}
      lockedAs="static"
    />

    <!-- BERT is a separate, explicit choice. Nothing for it is requested before the button is pressed. -->
    {#if gpt2Phase === "ready" && bertPhase !== "ready"}
      <div class="bert">
        {#if bertPhase === "idle"}
          <p class="intro">
            The values for the example texts were precomputed from the real GPT-2 and BERT tokenizers. To try on your own text, BERT needs its own file.
            Nothing is downloaded until you press the button.
          </p>
          <button type="button" class="island-btn reset" data-load bind:this={bertButton} onclick={startBert}>
            Load BERT (about {bertSizeLabel} MB)
          </button>
        {:else if bertPhase === "loading"}
          <p class="island-muted loading" role="status" data-compare-loading="bert">Getting BERT ready (about {bertSizeLabel} MB)...</p>
        {:else}
          <p class="error" data-compare-error="bert">The BERT tokenizer could not be downloaded. Check your connection and try again.</p>
          <button type="button" class="island-btn reset" data-retry="bert" bind:this={bertButton} onclick={startBert}>Try again</button>
        {/if}
      </div>
    {/if}
  </div>

  <div class="widget-col">
    <!-- The elastic elements of this column: one scroll region per tokenizer, stacked, each under its
         own header (name, count), which stays outside the region. Both rows fill the column
         equally (flex 1 1 0), so their regions always have the same height. -->
    {#if result.ok}
      <TokenRows rows={result.rows} idPrefix="compare" live={gpt2 !== null} scroll resetKey={replaced}>
        {#snippet missing()}
          <p class="island-muted pending" data-bert-pending>
            {bertPhase === "loading" ? "BERT is on its way." : "There is no BERT row for your own text until BERT is loaded."}
          </p>
        {/snippet}
      </TokenRows>
      <TokenLegend />
    {:else}
      <ScrollRegion fill label="Tokenizer rows, scrollable" resetKey={replaced}>
        <p class="failure" data-compare-failure>{FAILURE_COPY}</p>
      </ScrollRegion>
    {/if}

    <!-- Below the regions, not scrolling, and always the same: one note for every text. -->
    <div class="notice">
      <p class="note" data-note>
        Each tokenizer cuts the same text in its own places. GPT-2 works on bytes and keeps the space alongside the text that follows it,
        while BERT lower-cases the text, ignores spaces and marks a piece that continues a word with ##.
      </p>
    </div>
  </div>

  <!-- Always present, so a change of its text is announced. Empty until the first message. -->
  <div class="sr-only" role="status" data-announce>{announcement}</div>
</section>

<style>
  /* Per-widget values of the shared grid in widget.css (UI-SPEC "3. Comparison"). The height is the
     cap of the phase (720px, a multiple of 8); plan 02.2-05 records the measured fit state by state. */
  .widget--comparison {
    --widget-cols: minmax(0, 5fr) minmax(0, 7fr);
    --widget-h: 720px;
  }
  .bert {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .pending,
  .loading,
  .intro,
  .error,
  .failure {
    margin: 0;
  }
  /* The BERT paragraph is set in the label size: it sits in the narrow left column, and the teaching
     prose is the note, not this. */
  .intro {
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
  .reset {
    align-self: flex-start;
  }
  .error {
    font: 400 14px/1.4 var(--font-sans);
    color: var(--error);
  }
  .failure {
    padding: var(--space-md);
    border: 1px solid var(--error);
    border-radius: 4px;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--error);
  }
  .notice {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .note {
    margin: 0;
    font: 400 18px/1.6 var(--font-serif), Georgia, serif;
    color: var(--text);
  }
</style>
