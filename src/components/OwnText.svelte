<script lang="ts">
  // The own-text block of the comparison card (D-10, D-11). Nothing is requested until the reader
  // presses the load button; typing never causes a request. The loader is called from the click
  // handler only, never at component top level. Reader text reaches the DOM through interpolation
  // only. The block is independent of the curated rows above it: typing here never touches them and
  // picker changes never touch the text box.
  import { onMount, tick } from "svelte";
  import { LIMIT } from "../core/examples.ts";
  import type { RealTokenizer } from "../core/realTokenizer.ts";
  import { tokenize } from "../core/toy.ts";
  import type { Token } from "../core/types.ts";
  import { loadTokenizer } from "./loadTokenizer.ts";
  import TokenLegend from "./TokenLegend.svelte";
  import TokenRows from "./TokenRows.svelte";
  import TokenTable from "./TokenTable.svelte";

  let { exampleText, sizeLabel, baseUrl }: { exampleText: string; sizeLabel: string; baseUrl: string } = $props();

  type Rows = { toy: Token[]; gpt2: Token[]; bert: Token[] };

  const FAILURE_COPY = "The tokenizers could not run on this text. Edit the text, or reload the page. Your text stays in your browser.";

  // Not named `state`: a variable called `state` makes `$state` read as a store subscription.
  let phase = $state<"idle" | "loading" | "ready" | "error">("idle");
  // Each tokenizer has its own variable, so one that downloaded is kept when the other fails.
  let gpt2 = $state.raw<RealTokenizer | null>(null);
  let bert = $state.raw<RealTokenizer | null>(null);
  let text = $state("");

  let ta: HTMLTextAreaElement | undefined = $state();
  let retryButton: HTMLButtonElement | undefined = $state();
  let composing = false;

  // One derivation for what the reader sees; any exception from a tokenizer becomes the failure message.
  const result = $derived.by((): { ok: true; rows: Rows } | { ok: false } => {
    if (gpt2 === null || bert === null) return { ok: true, rows: { toy: [], gpt2: [], bert: [] } };
    try {
      return { ok: true, rows: { toy: tokenize(text), gpt2: gpt2.tokenize(text), bert: bert.tokenize(text) } };
    } catch {
      return { ok: false };
    }
  });

  const hasSpecial = $derived(
    result.ok && [result.rows.toy, result.rows.gpt2, result.rows.bert].some((tokens) => tokens.some((token) => token.special === true)),
  );

  const failedName = $derived(gpt2 === null && bert === null ? "GPT-2 and BERT" : gpt2 === null ? "GPT-2" : "BERT");

  // One debounced (500 ms) announcement of the three counts; chips are never announced individually.
  let liveMessage = $state("");
  let liveTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleLive(): void {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      liveMessage = result.ok
        ? `Toy tokenizer: ${result.rows.toy.length} tokens. GPT-2: ${result.rows.gpt2.length} tokens. BERT: ${result.rows.bert.length} tokens.`
        : FAILURE_COPY;
    }, 500);
  }

  // Idempotent: independent of the input / compositionend ordering between browsers.
  function commit(): void {
    if (!composing && ta) {
      text = ta.value;
      scheduleLive();
    }
  }

  // Starts only from the load or retry button. Only a tokenizer that is still missing is requested.
  async function load(): Promise<void> {
    const startText = exampleText;
    phase = "loading";
    const [first, second] = await Promise.allSettled([
      gpt2 === null ? loadTokenizer("gpt2", baseUrl) : Promise.resolve(gpt2),
      bert === null ? loadTokenizer("bert", baseUrl) : Promise.resolve(bert),
    ]);
    if (first.status === "fulfilled") gpt2 = first.value;
    if (second.status === "fulfilled") bert = second.value;
    if (gpt2 !== null && bert !== null) {
      text = startText;
      phase = "ready";
      clearTimeout(liveTimer);
      liveMessage = "Loaded. Type below.";
      // The button that was pressed is gone, so put focus where the reader types.
      await tick();
      ta?.focus();
      ta?.setSelectionRange(text.length, text.length);
    } else {
      phase = "error";
      await tick();
      retryButton?.focus();
    }
  }

  onMount(() => () => clearTimeout(liveTimer));
</script>

<div class="own" data-owntext data-own-state={phase} aria-busy={phase === "loading" ? "true" : undefined}>
  <h3 class="island-label heading">Try your own text</h3>

  {#if phase === "idle"}
    <p class="intro">
      Want to use your own text? This downloads two small tokenizer files, GPT-2 and BERT, once (about {sizeLabel} MB in total).
      Nothing is downloaded until you press the button.
    </p>
    <div>
      <button type="button" class="island-btn" data-load onclick={load}>Load GPT-2 and BERT (about {sizeLabel} MB)</button>
    </div>
  {:else if phase === "loading"}
    <p class="island-muted loading" role="status" data-own-loading>
      Downloading the GPT-2 and BERT tokenizers (about {sizeLabel} MB)...
    </p>
  {:else if phase === "error"}
    <p class="error" data-own-error>The {failedName} tokenizer could not be downloaded. Check your connection and try again.</p>
    <div>
      <button type="button" class="island-btn" data-retry bind:this={retryButton} onclick={load}>Try again</button>
    </div>
  {:else}
    <div class="field">
      <label for="own-text" class="island-label">Your text</label>
      <textarea
        id="own-text"
        bind:this={ta}
        value={text}
        maxlength={LIMIT}
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        dir="auto"
        aria-describedby="own-privacy"
        oninput={commit}
        oncompositionstart={() => (composing = true)}
        oncompositionend={() => {
          composing = false;
          commit();
        }}
      ></textarea>
      <p class="island-muted privacy" id="own-privacy">Your text stays in your browser. Nothing is sent anywhere.</p>
      {#if text.length >= LIMIT}
        <!-- text.length counts UTF-16 units, like maxlength; emoji-heavy input reaches it sooner. -->
        <p class="limit" role="status" data-limit>That is the limit for this box: 1,000 characters. Delete some text to keep typing.</p>
      {/if}
    </div>

    {#if result.ok}
      <div class="results">
        <TokenRows rows={result.rows} idPrefix="own" live />
        <TokenLegend special={hasSpecial} />
      </div>
      <p class="island-muted">Counts here are computed in your browser with the downloaded files.</p>
      <details class="island-details" data-alt-tables>
        <summary>View your results as tables</summary>
        <div class="tables">
          <TokenTable tokens={result.rows.toy} bare caption="Tokens for the toy tokenizer" />
          <TokenTable tokens={result.rows.gpt2} bare caption="Tokens for GPT-2" />
          <TokenTable tokens={result.rows.bert} bare caption="Tokens for BERT" />
        </div>
      </details>
    {:else}
      <p class="failure" data-own-failure>{FAILURE_COPY}</p>
    {/if}
  {/if}

  <!-- Always present, so a change of its text is announced. Empty until the first load. -->
  <div class="sr-only" role="status" data-own-live>{liveMessage}</div>
</div>

<style>
  .own {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 32px;
    border-top: 1px solid var(--border);
  }
  .heading,
  .intro,
  .error,
  .loading,
  .privacy,
  .limit,
  .failure {
    margin: 0;
  }
  .intro {
    font: 400 18px/1.6 var(--font-serif), Georgia, serif;
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
  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
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
  .results {
    display: flex;
    flex-direction: column;
  }
  .tables {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
