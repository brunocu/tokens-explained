<script lang="ts">
  // The curated comparison island. Every number on it comes from the committed, dated fixture
  // (src/core/compare/comparison.json); nothing is computed or downloaded in the browser. The
  // fixture is imported here, not passed as a prop, so it ships once in a cached chunk and is not
  // serialised into the page HTML. Text reaches the DOM through interpolation only.
  import { onMount } from "svelte";
  import fixtureJson from "../core/compare/comparison.json";
  import { fixtureTokens } from "../core/compare/fixture.ts";
  import type { ComparisonFixture } from "../core/compare/fixture.ts";
  import { NOTES } from "../core/compare/notes.ts";
  import { TOKENIZER_ROWS } from "../core/compare/rows.ts";
  import { EXAMPLES } from "../core/examples.ts";
  import type { Token } from "../core/types.ts";
  import IslandStatus from "./IslandStatus.svelte";
  import OwnText from "./OwnText.svelte";
  import Picker from "./Picker.svelte";
  import TokenLegend from "./TokenLegend.svelte";
  import TokenRows from "./TokenRows.svelte";
  import TokenTable from "./TokenTable.svelte";

  type RowSet = { toy: Token[]; gpt2: Token[]; bert: Token[] };

  /** Same-origin address of the licence notices; the wrapper builds it from the site base. */
  let { noticeHref }: { noticeHref: string } = $props();

  const fixture = fixtureJson as unknown as ComparisonFixture;
  const { gpt2, bert } = fixture.meta.tokenizers;

  // Converted once at module level: id -> three Token arrays.
  const BY_ID = new Map<string, { text: string; rows: RowSet }>(
    fixture.examples.map((example) => [
      example.id,
      {
        text: example.text,
        rows: {
          toy: fixtureTokens(example.rows.toy),
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
  let selected = $state(EXAMPLES[0]?.id ?? "");
  // Empty until the reader changes the picker, so nothing is announced on load.
  let announcement = $state("");

  const current = $derived(BY_ID.get(selected));
  const note = $derived(NOTES[selected] ?? "");
  // The [UNK] sentence is shown only when a displayed row holds a special chip.
  const hasSpecial = $derived(
    current === undefined ? false : TOKENIZER_ROWS.some((row) => current.rows[row.id].some((token) => token.special === true)),
  );

  const short = (commit: string): string => commit.slice(0, 7);

  // The site base always ends with a slash here; the guard keeps the loader's address right if not.
  // Kept in this file so the base expression stays out of src/core.
  const rawBase: string = import.meta.env.BASE_URL;
  const baseUrl = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

  function choose(id: string): void {
    selected = id;
    const entry = BY_ID.get(id);
    const label = EXAMPLES.find((example) => example.id === id)?.label ?? "";
    if (entry === undefined) return;
    announcement = `Showing ${label}. Toy tokenizer: ${entry.rows.toy.length} tokens. GPT-2: ${entry.rows.gpt2.length} tokens. BERT: ${entry.rows.bert.length} tokens.`;
  }

  onMount(() => {
    // Also recovers a late hydration from "failed" (the layout script may have set it).
    phase = "ready";
  });
</script>

<div class="island-card" data-island data-compare data-state={phase}>
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

  {#if current}
    <div class="text-block">
      <span class="island-label">Text</span>
      <p class="textbox" dir="auto" data-compare-text>{current.text}</p>
    </div>

    <div class="results">
      <TokenRows rows={current.rows} idPrefix="compare" />
      <TokenLegend special={hasSpecial} />
    </div>

    <div class="notice">
      <span class="island-label">What to notice</span>
      <p class="note" data-note>{note}</p>
    </div>

    <details class="island-details" data-alt-tables>
      <summary>View these results as tables</summary>
      <div class="tables">
        <TokenTable tokens={current.rows.toy} bare caption="Tokens for the toy tokenizer" />
        <TokenTable tokens={current.rows.gpt2} bare caption="Tokens for GPT-2" />
        <TokenTable tokens={current.rows.bert} bare caption="Tokens for BERT" />
      </div>
    </details>
  {/if}

  <div class="provenance">
    <p class="island-muted dated" data-precomputed>
      Precomputed on {fixture.meta.generatedAt} from the real GPT-2 and BERT (uncased) tokenizer files and this page's toy tokenizer.
    </p>
    <details class="island-details" data-source>
      <summary>Where the tokenizer files come from</summary>
      <p class="island-muted source-text">
        GPT-2: {gpt2.repo}, commit {short(gpt2.commit)}, {gpt2.license} licence. BERT uncased: {bert.repo} (formerly bert-base-uncased), commit {short(bert.commit)}, {bert.license} licence. Both files are copied onto this site, so reading this page does not contact any other server. Counts cover the text only, without the special start and end markers some models add.
      </p>
      <p class="island-muted source-text"><a href={noticeHref}>Licence notices</a></p>
    </details>
  </div>

  <OwnText exampleText={current?.text ?? ""} sizeLabel={fixture.meta.download.sizeLabelMb} {baseUrl} />

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
