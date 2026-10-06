<script lang="ts">
  // The text alternative to the chips (FOUND-04): a real table inside a native <details>.
  // The details element is never re-created, so its open state survives typing.
  import type { Token } from "../core/types.ts";
  import { hexBytes, idLabel, tableCell } from "../core/display.ts";
  import { groupBytes } from "../core/chars.ts";

  let { tokens }: { tokens: Token[] } = $props();

  // One grouping pass for the whole list; each Token cell says which byte of which character it holds.
  const grouping = $derived(groupBytes(tokens));
</script>

<details class="alt" data-table>
  <summary>View tokens as a table</summary>
  <!-- A scrollable region must be reachable by keyboard (WCAG 2.1.1), so the tabindex is deliberate.
       It is only in the tab order while the details element is open. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="scroll" role="region" aria-label="Token table, scrollable" tabindex="0">
    <table>
      <caption>Tokens in your text</caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Token</th>
          <th scope="col">ID</th>
          <th scope="col">Bytes</th>
        </tr>
      </thead>
      <tbody>
        {#each tokens as token, i (i)}
          <tr>
            <td>{i + 1}</td>
            <td class="mono">{tableCell(token, grouping.tokens[i])}</td>
            <td>{idLabel(token)}</td>
            <td class="mono">{hexBytes(token.bytes)}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="4">No tokens yet.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</details>

<style>
  .alt {
    margin-top: var(--space-md);
  }
  summary {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    min-height: 44px;
    min-width: 44px;
    font: 600 14px/1.4 var(--font-sans);
    cursor: pointer;
  }
  .scroll {
    overflow-x: auto;
    margin-top: var(--space-sm);
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
    padding: var(--space-sm) var(--space-md);
    text-align: left;
    color: var(--muted);
  }
  th,
  td {
    padding: var(--space-sm) var(--space-md);
    text-align: left;
    border-top: 1px solid var(--border);
  }
  th {
    background: var(--bg-2);
    font-weight: 600;
  }
  .mono {
    font-family: var(--font-mono);
    white-space: pre;
  }
</style>
