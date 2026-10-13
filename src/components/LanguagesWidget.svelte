<script module lang="ts">
  // The languages widget: ONE section holding the counts table and the "Look inside" picker.
  //
  // Everything below is pure work on the committed fixture (src/core/compare/comparison.json) and
  // the language data, done once when the module loads: counts, byte sizes, the [UNK] count, the
  // shared bar maximum, the latest retrieval date. Nothing browser-only runs here, because the
  // component also runs in Node during the build. The widget is a self-contained card, so it
  // imports the fixture itself, as the old demo did.
  import fixtureJson from "../core/compare/comparison.json";
  import { countUnk, fixtureTokens } from "../core/compare/fixture.ts";
  import type { ComparisonFixture } from "../core/compare/fixture.ts";
  import { LANGUAGES, SOURCE_PAGE } from "../core/compare/languages.ts";
  import type { Language } from "../core/compare/languages.ts";
  import { countBytes } from "../core/counts.ts";
  import type { Token } from "../core/types.ts";

  type RowSet = { gpt2: Token[]; bert: Token[] };
  type Entry = {
    language: Language;
    /** The raw size of the sentence in bytes, counted from the sentence itself, not from a tokenizer. */
    bytes: number;
    rows: RowSet;
    /** How many of BERT's pieces are the [UNK] marker; only the BERT cell ever shows it. */
    unk: number;
  };

  const fixture = fixtureJson as unknown as ComparisonFixture;

  const COLUMNS = [
    { id: "gpt2", label: "GPT-2" },
    { id: "bert", label: "BERT" },
  ] as const;

  /** One entry per language, in table order. */
  const ENTRIES: ReadonlyArray<Entry> = LANGUAGES.map((language) => {
    const found = fixture.languages.find((item) => item.id === language.id);
    if (found === undefined) throw new Error(`comparison.json has no entry for language "${language.id}"`);
    const rows: RowSet = { gpt2: fixtureTokens(found.rows.gpt2), bert: fixtureTokens(found.rows.bert) };
    return { language, bytes: countBytes(language.sentence), rows, unk: countUnk(rows.bert) };
  });

  const BY_ID = new Map<string, Entry>(ENTRIES.map((entry) => [entry.language.id, entry]));

  /** The entry shown at first, so the results are never empty. */
  const ENGLISH: Entry = (() => {
    const english = BY_ID.get("en");
    if (english === undefined) throw new Error("the languages widget needs the English entry");
    return english;
  })();

  const OPTIONS = LANGUAGES.map((language) => ({ id: language.id, label: language.name }));
</script>

<script lang="ts">
  // The table and the English drill-down are complete in the server-rendered HTML: English is chosen
  // from the first render, so the text box, both token rows and the six texts are in the page with no
  // JavaScript. The script adds the choosing: the picker is disabled until the island has hydrated.
  // Text reaches the DOM through interpolation only.
  import { onMount } from "svelte";
  import { LANGUAGES_NOTE } from "../core/compare/notes.ts";
  import IslandStatus from "./IslandStatus.svelte";
  import Picker from "./Picker.svelte";
  import ScrollRegion from "./ScrollRegion.svelte";
  import TokenLegend from "./TokenLegend.svelte";
  import TokenRows from "./TokenRows.svelte";

  // Not named `state`: a variable called `state` makes `$state` read as a store subscription.
  let phase = $state<"loading" | "ready" | "failed">("loading");
  // English from the first render, so the right panel is never empty.
  let selected = $state("en");
  // Empty until the reader changes the picker, so nothing is announced on load.
  let announcement = $state("");

  const current = $derived(BY_ID.get(selected) ?? ENGLISH);

  function choose(id: string): void {
    selected = id;
    const entry = BY_ID.get(id);
    if (entry === undefined) return;
    announcement = `Showing ${entry.language.name}. GPT-2: ${entry.rows.gpt2.length} tokens. BERT: ${entry.rows.bert.length} tokens.`;
  }

  onMount(() => {
    // Also recovers a late hydration from "failed" (the layout script may have set it).
    phase = "ready";
  });
</script>

<!-- The root is a real box (not an island wrapper, which is display: contents), so the layout classes of
     widget.css sit here. Band: the table across both columns. Below it, left: the picker and the note;
     right: the one region that grows with the chosen language. -->
<section
  class="island-card widget widget--languages"
  aria-label="Token counts by language"
  data-island
  data-languages
  data-state={phase}
>
  <div class="widget-col band">
    <IslandStatus
      loading="Getting the pieces view ready. The counts table already works."
      failed="The pieces view could not load. Check your connection, then reload the page. The counts table still works."
      nojs="Choosing another language needs JavaScript. English is shown."
    />

    <ScrollRegion xscroll padded={false} class="table-region" label="Token counts by language, scrollable">
      <table data-languages-table>
        <caption>
          <a href={SOURCE_PAGE} rel="noopener noreferrer">Universal Declaration of Human Rights</a>, Article 1 (the whole article),
            official translations from the United Nations human rights office (OHCHR).
        </caption>
        <!-- The explicit roles are deliberate: below 1024px the CSS changes the display of rows and
             cells, and browsers can drop native table semantics when that happens. -->
        <thead>
          <!-- svelte-ignore a11y_no_redundant_roles -->
          <tr role="row">
            <!-- svelte-ignore a11y_no_redundant_roles -->
            <th scope="col" role="columnheader">Language</th>
            <!-- svelte-ignore a11y_no_redundant_roles -->
            <th scope="col" role="columnheader">Bytes</th>
            {#each COLUMNS as column (column.id)}
              <!-- svelte-ignore a11y_no_redundant_roles -->
              <th scope="col" role="columnheader">{column.label}</th>
            {/each}
            <!-- svelte-ignore a11y_no_redundant_roles -->
            <th scope="col" role="columnheader" class="sentence-col">Text</th>
          </tr>
        </thead>
        <tbody>
          {#each ENTRIES as entry (entry.language.id)}
            <!-- svelte-ignore a11y_no_redundant_roles -->
            <tr role="row" data-lang-row={entry.language.id}>
              <!-- svelte-ignore a11y_no_redundant_roles -->
              <th scope="row" role="rowheader">{entry.language.name}</th>
              <!-- svelte-ignore a11y_no_redundant_roles -->
              <td role="cell" data-bytes>
                <span class="number">{entry.bytes}</span>
              </td>
              {#each COLUMNS as column (column.id)}
                {@const count = entry.rows[column.id].length}
                <!-- svelte-ignore a11y_no_redundant_roles -->
                <td role="cell" data-count={column.id}>
                  <span class="number">{count}</span>
                  {#if column.id === "bert" && entry.unk > 0}
                    <p class="unk" data-unk-line><span class="unk-part">{entry.unk} of these</span> <span class="unk-part">are [UNK]</span></p>
                  {/if}
                </td>
              {/each}
              <!-- svelte-ignore a11y_no_redundant_roles -->
              <td role="cell" class="sentence-cell" lang={entry.language.lang} dir={entry.language.dir} data-table-sentence>{entry.language.sentence}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </ScrollRegion>
  </div>

  <div class="widget-col">
    <Picker
      legend="Look inside"
      name="languages-inside"
      options={OPTIONS}
      {selected}
      onchange={choose}
      disabled={phase !== "ready"}
    />

    <div class="notice">
      <p class="note" data-note>{LANGUAGES_NOTE}</p>
    </div>
  </div>

  <div class="widget-col">
    <!-- The elastic element of this column, and the only region that grows with the chosen language. The
         details and the sources sit inside it, so opening one lengthens the region's content and never
         the widget. -->
    <ScrollRegion fill label="Pieces for the chosen language, scrollable" resetKey={selected}>
      <div class="stack">
        <TokenRows rows={current.rows} idPrefix="languages" />
        <TokenLegend />
      </div>
    </ScrollRegion>
  </div>

  <!-- Always present, so a change of its text is announced. Empty until the first choice. -->
  <div class="sr-only" role="status" data-announce>{announcement}</div>
</section>

<style>
  /* Per-widget values of the shared grid in widget.css (binding user decision 2 of phase 2.2): the
     counts table spans the whole inner width in a first band, and the picker and the results sit in a
     row below it.
     ASSUMPTION A-LANG-H (for the author to review): the fixed height is above the 720px of the other
     widgets, because the full-width table alone is 462px tall. Measured at 1440x900 in Chromium (plan
     02.2-06): band 464px, the lower-left column needs 421px, and the English GPT-2 row ends 485px below
     the top of the results region. 1024px is the smallest multiple of 8 at which all three show without
     scrolling; the value was 1040px, raised to 1136px on 2026-10-11 (the table gained a Text column, so the band is taller) because the failed state adds 88px to the band (the failed
     line and Reload page), and only at 1136px does the lower-left column still end inside the card then.
     It is this one custom property; the author can lower it, at the cost of more scrolling in the
     results region. The columns are 4fr and 8fr, not the 5fr and 7fr first planned: at 5fr and 7fr the
     English GPT-2 row ends 529px down and the widget would need 1088px, above the old 1040px cap. */
  .widget--languages {
    --widget-cols: minmax(0, 4fr) minmax(0, 8fr);
    --widget-h: 1136px;
  }
  @media (min-width: 1024px) {
    .widget--languages {
      grid-template-rows: auto minmax(0, 1fr);
      row-gap: 16px;
    }
    .band {
      grid-column: 1 / -1;
    }
  }

  /* The table region looks like a card of its own. The element belongs to ScrollRegion, hence :global. */
  .widget--languages :global(.table-region) {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
  }
  table {
    width: 100%;
    /* Enough for four columns on a phone, where the labelled region scrolls sideways. From 1024px up the
       table is wider than this and the region never scrolls. */
    min-width: 480px;
    border-collapse: collapse;
    font: 400 14px/1.4 var(--font-sans);
  }
  /* The data columns shrink to their content (a 1% width with no wrapping); the text column takes the rest. */
  thead th:not(.sentence-col),
  tbody th,
  td:not(.sentence-cell) {
    width: 1%;
    white-space: nowrap;
  }
  .sentence-cell {
    text-align: start;
    unicode-bidi: isolate;
    overflow-wrap: anywhere;
  }
  caption {
    padding: var(--space-sm) var(--space-md);
    text-align: left;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
  th,
  td {
    padding: var(--space-sm) var(--space-md);
    text-align: left;
    vertical-align: top;
    border-top: 1px solid var(--border);
  }
  thead th {
    background: var(--bg-2);
    font-weight: 600;
  }
  /* The row header is the language name only; the sentence lives in the results region. */
  tbody th {
    background: var(--bg);
    font-weight: 600;
  }
  .number {
    display: block;
    font: 600 24px/1.2 var(--font-sans);
    font-variant-numeric: tabular-nums;
  }
  /* Each half stays whole, so the line breaks once, in the middle, at any column width. */
  .unk-part {
    white-space: nowrap;
  }
  .unk {
    white-space: normal;
    margin: var(--space-xs) 0 0;
    font: 400 14px/1.4 var(--font-sans);
    color: var(--muted);
  }
  /* Below 1024px the six-column table cannot give the sentence a readable width (60px at 390px), so
     each language becomes a block: the name and three numbers on a first line, the sentence on a
     line of its own below (gap G-02.2-1b). Only tr, th and td change their display; the explicit
     roles in the markup keep the table semantics. From 1024px the rules above are unchanged. */
  @media (max-width: 1023.98px) {
    table {
      min-width: 0;
    }
    /* Fixed fractions, so the columns line up from row to row (auto tracks would size per row). */
    thead tr,
    tbody tr {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
    }
    thead tr {
      position: relative;
    }
    tbody tr {
      border-top: 1px solid var(--border);
    }
    thead th:not(.sentence-col),
    tbody th,
    td:not(.sentence-cell) {
      width: auto;
      white-space: normal;
    }
    th,
    td {
      padding-inline: var(--space-sm);
      border-top: none;
    }
    /* The number columns are narrow here, so the "N of these are [UNK]" line may wrap inside a half. */
    .unk-part {
      white-space: normal;
    }
    .sentence-cell {
      grid-column: 1 / -1;
      padding-top: var(--space-xs);
      padding-bottom: var(--space-md);
    }
    /* The Text header has no column of its own here, but stays in the accessibility tree. */
    thead th.sentence-col {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
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
