<script lang="ts">
  // The optional "Look inside" part of the languages section. The counts table above is static
  // and works without this island. Choosing a language reveals the same three tokenizer rows the
  // comparison shows, for that language's sentence. Every token comes from the committed fixture
  // (src/core/compare/comparison.json); nothing is computed or downloaded in the browser. Text
  // reaches the DOM through interpolation only.
  import { onMount } from "svelte";
  import fixtureJson from "../core/compare/comparison.json";
  import { fixtureTokens } from "../core/compare/fixture.ts";
  import type { ComparisonFixture } from "../core/compare/fixture.ts";
  import { LANGUAGES } from "../core/compare/languages.ts";
  import { TOKENIZER_ROWS } from "../core/compare/rows.ts";
  import type { Token } from "../core/types.ts";
  import IslandStatus from "./IslandStatus.svelte";
  import Picker from "./Picker.svelte";
  import TokenLegend from "./TokenLegend.svelte";
  import TokenRows from "./TokenRows.svelte";
  import TokenTable from "./TokenTable.svelte";

  type RowSet = { toy: Token[]; gpt2: Token[]; bert: Token[] };

  const fixture = fixtureJson as unknown as ComparisonFixture;

  // Converted once at module level: language id -> three Token arrays.
  const ROWS_BY_ID = new Map<string, RowSet>(
    fixture.languages.map((entry) => [
      entry.id,
      {
        toy: fixtureTokens(entry.rows.toy),
        gpt2: fixtureTokens(entry.rows.gpt2),
        bert: fixtureTokens(entry.rows.bert),
      },
    ]),
  );

  const OPTIONS = LANGUAGES.map((language) => ({ id: language.id, label: language.name }));

  // Not named `state`: a variable called `state` makes `$state` read as a store subscription.
  let phase = $state<"loading" | "ready" | "failed">("loading");
  // Starts as null, so no radio is checked and no rows are shown (the Picker's selected={null} case).
  let selected = $state<string | null>(null);
  // Empty until the reader changes the picker, so nothing is announced on load.
  let announcement = $state("");

  const language = $derived(LANGUAGES.find((item) => item.id === selected));
  const rows = $derived(selected === null ? undefined : ROWS_BY_ID.get(selected));
  // The [UNK] sentence is shown only when a displayed row holds a special chip.
  const hasSpecial = $derived(
    rows === undefined ? false : TOKENIZER_ROWS.some((row) => rows[row.id].some((token) => token.special === true)),
  );

  function choose(id: string): void {
    selected = id;
    const entry = ROWS_BY_ID.get(id);
    const name = LANGUAGES.find((item) => item.id === id)?.name ?? "";
    if (entry === undefined) return;
    announcement = `Showing ${name}. Toy tokenizer: ${entry.toy.length} tokens. GPT-2: ${entry.gpt2.length} tokens. BERT: ${entry.bert.length} tokens.`;
  }

  onMount(() => {
    // Also recovers a late hydration from "failed" (the layout script may have set it).
    phase = "ready";
  });
</script>

<div class="island-card" data-island data-languages data-state={phase}>
  <IslandStatus
    loading="Getting the pieces view ready. The counts above already work."
    failed="The pieces view could not load. Check your connection, then reload the page. The counts above still work."
    nojs="Seeing the pieces needs JavaScript."
  />

  <Picker
    legend="Look inside"
    name="languages-inside"
    options={OPTIONS}
    {selected}
    onchange={choose}
    disabled={phase !== "ready"}
  />

  {#if language !== undefined && rows !== undefined}
    <div class="text-block">
      <span class="island-label">Text</span>
      <p class="textbox" lang={language.lang} dir="auto" data-languages-text>{language.sentence}</p>
    </div>

    <div class="results">
      <TokenRows {rows} idPrefix="languages" />
      <TokenLegend special={hasSpecial} />
    </div>

    <details class="island-details" data-alt-tables>
      <summary>View these results as tables</summary>
      <div class="tables">
        <TokenTable tokens={rows.toy} bare caption="Tokens for the toy tokenizer" />
        <TokenTable tokens={rows.gpt2} bare caption="Tokens for GPT-2" />
        <TokenTable tokens={rows.bert} bare caption="Tokens for BERT" />
      </div>
    </details>
  {/if}

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
    unicode-bidi: isolate;
  }
  .tables {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
