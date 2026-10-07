<script lang="ts">
  // The comparison island: ONE widget, not a curated card with a second "try your own text" card under
  // it. A picker chooses an example text. That text sits in one text area, and one set of rows (GPT-2,
  // then BERT) shows how it is cut. The reader can edit the text in place.
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
  import { NOTES } from "../core/compare/notes.ts";
  import { specialKinds } from "../core/display.ts";
  import { EXAMPLES, LIMIT } from "../core/examples.ts";
  import type { RealTokenizer } from "../core/realTokenizer.ts";
  import type { Token } from "../core/types.ts";
  import IslandStatus from "./IslandStatus.svelte";
  import { loadTokenizer } from "./loadTokenizer.ts";
  import Picker from "./Picker.svelte";
  import { createTokenizerDownload } from "./tokenizerDownload.ts";
  import type { TokenizerDownload } from "./tokenizerDownload.ts";
  import TokenLegend from "./TokenLegend.svelte";
  import TokenRows from "./TokenRows.svelte";
  import TokenTable from "./TokenTable.svelte";

  type Rows = { gpt2: Token[]; bert?: Token[] };

  /** Same-origin address of the licence notices; the wrapper builds it from the site base. */
  let { noticeHref }: { noticeHref: string } = $props();

  const fixture = fixtureJson as unknown as ComparisonFixture;
  const { gpt2: gpt2Source, bert: bertSource } = fixture.meta.tokenizers;
  const gpt2SizeLabel = fixture.meta.download.gpt2.sizeLabelMb;
  const bertSizeLabel = fixture.meta.download.bert.sizeLabelMb;

  const FAILURE_COPY = "The tokenizers could not run on this text. Edit the text, or reload the page. Your text stays in your browser.";

  // Converted once at module level: id -> text and the two precomputed Token arrays.
  const BY_ID = new Map<string, { text: string; rows: { gpt2: Token[]; bert: Token[] } }>(
    fixture.examples.map((example) => [
      example.id,
      {
        text: example.text,
        rows: {
          gpt2: fixtureTokens(example.rows.gpt2),
          bert: fixtureTokens(example.rows.bert),
        },
      },
    ]),
  );

  // The picker options are the playground's examples, so the labels cannot drift.
  const OPTIONS = EXAMPLES.map((example) => ({ id: example.id, label: example.label }));

  // Not named `state`: a variable called `state` makes `$state` read as a store subscription.
  let phase = $state<"loading" | "ready" | "failed">("loading");
  let gpt2Phase = $state<"loading" | "ready" | "error">("loading");
  let bertPhase = $state<"idle" | "loading" | "ready" | "error">("idle");
  let selected = $state(EXAMPLES[0]?.id ?? "");
  // The text being cut. It is an example's text until the reader edits it.
  let text = $state(EXAMPLES[0]?.text ?? "");
  // Raw: a tokenizer is a plain object with internal tables that must not be wrapped in a proxy.
  let gpt2 = $state.raw<RealTokenizer | null>(null);
  let bert = $state.raw<RealTokenizer | null>(null);
  // Empty until the reader acts, so nothing is announced on load.
  let announcement = $state("");

  let ta: HTMLTextAreaElement | undefined = $state();
  let gpt2Retry: HTMLButtonElement | undefined = $state();
  let bertButton: HTMLButtonElement | undefined = $state();
  let composing = false;
  let mounted = false;

  const current = $derived(BY_ID.get(selected));
  // True once the reader has changed the text: the notes and the precomputed BERT row then no longer apply.
  const edited = $derived(current === undefined || text !== current.text);
  const note = $derived(NOTES[selected] ?? "");

  // One derivation for what the reader sees; any exception from a tokenizer becomes the failure message.
  // The GPT-2 row is live once GPT-2 is ready and precomputed before that. The BERT row is live once
  // BERT is ready, precomputed while the text is still an example, and absent otherwise.
  const result = $derived.by((): { ok: true; rows: Rows } | { ok: false } => {
    try {
      const rows: Rows = { gpt2: gpt2 !== null ? gpt2.tokenize(text) : (current?.rows.gpt2 ?? []) };
      if (bert !== null) rows.bert = bert.tokenize(text);
      else if (!edited && current !== undefined) rows.bert = current.rows.bert;
      return { ok: true, rows };
    } catch {
      return { ok: false };
    }
  });

  // Which legend sentences show: only those whose chip is on screen in one of the rows.
  const kinds = $derived.by(() => {
    if (!result.ok) return { unknown: false, marker: false };
    const all = specialKinds(result.rows.gpt2);
    if (result.rows.bert !== undefined) {
      const other = specialKinds(result.rows.bert);
      return { unknown: all.unknown || other.unknown, marker: all.marker || other.marker };
    }
    return all;
  });

  const short = (commit: string): string => commit.slice(0, 7);

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

  // A picker change sets the text to the example's text and announces the example and its counts once.
  function choose(id: string): void {
    selected = id;
    const entry = BY_ID.get(id);
    const label = EXAMPLES.find((example) => example.id === id)?.label ?? "";
    if (entry === undefined) return;
    clearTimeout(liveTimer);
    text = entry.text;
    announcement = `Showing ${label}. GPT-2: ${entry.rows.gpt2.length} tokens. BERT: ${entry.rows.bert.length} tokens.`;
  }

  // Idempotent: independent of the input / compositionend ordering between browsers.
  function commit(): void {
    if (!composing && ta) {
      text = ta.value;
      scheduleLive();
    }
  }

  async function focusEnd(): Promise<void> {
    await tick();
    ta?.focus();
    ta?.setSelectionRange(text.length, text.length);
  }

  function useExampleAgain(): void {
    if (current === undefined) return;
    clearTimeout(liveTimer);
    text = current.text;
    announcement = `Showing ${EXAMPLES.find((example) => example.id === selected)?.label ?? ""} again.`;
    void focusEnd();
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
        if (retried) {
          await tick();
          gpt2Retry?.focus();
        }
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

<div
  class="island-card"
  data-island
  data-compare
  data-state={phase}
  data-compare-gpt2={gpt2Phase}
  data-compare-bert={bertPhase}
  aria-busy={bertPhase === "loading" || (phase === "ready" && gpt2Phase === "loading") ? "true" : undefined}
>
  <IslandStatus
    loading="Getting the comparison ready. The first example is already shown below."
    failed="The comparison could not load. Check your connection, then reload the page. The first example is still shown below."
    nojs="Switching examples needs JavaScript. The first example is shown below."
  />

  <Picker
    legend="Pick a text"
    name="compare-example"
    options={OPTIONS}
    {selected}
    onchange={choose}
    disabled={phase !== "ready"}
  />

  <div class="text-block">
    {#if gpt2Phase === "ready"}
      <label for="compare-input" class="island-label">Your text (an example, or type your own)</label>
      <textarea
        id="compare-input"
        bind:this={ta}
        value={text}
        maxlength={LIMIT}
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        dir="auto"
        aria-describedby="compare-privacy"
        oninput={commit}
        oncompositionstart={() => (composing = true)}
        oncompositionend={() => {
          composing = false;
          commit();
        }}
      ></textarea>
      <p class="island-muted privacy" id="compare-privacy">Your text stays in your browser. Nothing is sent anywhere.</p>
      {#if text.length >= LIMIT}
        <!-- text.length counts UTF-16 units, like maxlength; emoji-heavy input reaches it sooner. -->
        <p class="limit" role="status" data-limit>That is the limit for this box: 1,000 characters. Delete some text to keep typing.</p>
      {/if}
      {#if edited}
        <div>
          <button type="button" class="island-btn" data-compare-reset onclick={useExampleAgain}>Use the example text again</button>
        </div>
      {/if}
    {:else}
      <span class="island-label">Text</span>
      <p class="textbox" dir="auto" data-compare-text>{text}</p>
      {#if gpt2Phase === "loading" && phase === "ready"}
        <p class="island-muted loading" role="status" data-compare-loading="gpt2">
          Getting GPT-2 ready (about {gpt2SizeLabel} MB) so that you can type your own text...
        </p>
      {:else if gpt2Phase === "error"}
        <p class="error" data-compare-error="gpt2">The GPT-2 tokenizer could not be downloaded. Check your connection and try again.</p>
        <div>
          <button type="button" class="island-btn" data-retry="gpt2" bind:this={gpt2Retry} onclick={() => startGpt2(true)}>Try again</button>
        </div>
      {/if}
    {/if}
  </div>

  {#if result.ok}
    <div class="results">
      <TokenRows rows={result.rows} idPrefix="compare" live={gpt2 !== null} />
      {#if gpt2Phase === "ready" && result.rows.bert === undefined}
        <p class="island-muted pending" data-bert-pending>
          {bertPhase === "loading" ? "BERT is on its way." : "There is no BERT row for your own text until BERT is loaded."}
        </p>
      {/if}
      <TokenLegend special={kinds.unknown} marker={kinds.marker} />
    </div>
  {:else}
    <p class="failure" data-compare-failure>{FAILURE_COPY}</p>
  {/if}

  {#if !edited}
    <div class="notice">
      <span class="island-label">What to notice</span>
      <p class="note" data-note>{note}</p>
    </div>
  {/if}

  <!-- BERT is a separate, explicit choice. Nothing for it is requested before the button is pressed. -->
  {#if gpt2Phase === "ready" && bertPhase !== "ready"}
    <div class="bert">
      {#if bertPhase === "idle"}
        <p class="intro">
          The BERT rows for the example texts were worked out in advance. To cut text you type yourself, BERT needs its own file.
          Nothing is downloaded until you press the button.
        </p>
        <div>
          <button type="button" class="island-btn" data-load bind:this={bertButton} onclick={startBert}>
            Load BERT (about {bertSizeLabel} MB)
          </button>
        </div>
      {:else if bertPhase === "loading"}
        <p class="island-muted loading" role="status" data-compare-loading="bert">Getting BERT ready (about {bertSizeLabel} MB)...</p>
      {:else}
        <p class="error" data-compare-error="bert">The BERT tokenizer could not be downloaded. Check your connection and try again.</p>
        <div>
          <button type="button" class="island-btn" data-retry="bert" bind:this={bertButton} onclick={startBert}>Try again</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if result.ok}
    <details class="island-details" data-alt-tables>
      <summary>View these results as tables</summary>
      <div class="tables">
        <TokenTable tokens={result.rows.gpt2} bare caption="Tokens for GPT-2" />
        {#if result.rows.bert !== undefined}
          <TokenTable tokens={result.rows.bert} bare caption="Tokens for BERT" />
        {/if}
      </div>
    </details>
  {/if}

  <div class="provenance">
    <p class="island-muted dated" data-precomputed>
      The rows for the example texts were precomputed on {fixture.meta.generatedAt} from the real GPT-2 and BERT (uncased) tokenizer
      files. Rows for text you type are computed in your browser with the downloaded files.
    </p>
    <details class="island-details" data-source>
      <summary>Where the tokenizer files come from</summary>
      <p class="island-muted source-text">
        GPT-2: {gpt2Source.repo}, commit {short(gpt2Source.commit)}, {gpt2Source.license} licence. BERT uncased: {bertSource.repo} (formerly bert-base-uncased), commit {short(bertSource.commit)}, {bertSource.license} licence. Both files are copied onto this site, so reading this page does not contact any other server. Counts cover the text only, without the special start and end markers some models add.
      </p>
      <p class="island-muted source-text"><a href={noticeHref}>Licence notices</a></p>
    </details>
  </div>

  <!-- Always present, so a change of its text is announced. Empty until the first message. -->
  <div class="sr-only" role="status" data-announce>{announcement}</div>
</div>

<style>
  .text-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .textbox {
    box-sizing: border-box;
    margin: 0;
    padding: 16px;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 4px;
    font: 400 18px/1.4 var(--font-mono);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
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
  .privacy,
  .pending,
  .loading,
  .intro,
  .error,
  .limit,
  .failure {
    margin: 0;
  }
  .pending {
    margin-top: 16px;
  }
  .intro {
    font: 400 18px/1.6 var(--font-serif), Georgia, serif;
  }
  .bert {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .error,
  .limit {
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
  .results {
    display: flex;
    flex-direction: column;
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
  .tables {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .provenance {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .dated,
  .source-text {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .source-text {
    margin-bottom: 8px;
  }
</style>
