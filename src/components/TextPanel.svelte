<script lang="ts">
  // The top of the left column that the playground and the comparison share: the lifecycle line, the
  // labelled text box, and the notes under it (tokenizer download state, privacy line, limit message).
  // It renders into the parent's `.widget-col` as siblings, with no wrapper of its own. The text box
  // is the column's elastic element, so the notes that come and go under it resize the box and never
  // the widget.
  //
  // The parent owns the text and the download state. This component owns the typing mechanics (the
  // IME composition guard and the idempotent commit) and reports the committed text through
  // `oncommit`. All the messages are generic and live here, so every instance says the same thing.
  // What differs per widget comes in through props: ids, test hooks (data attributes), the download
  // size and the `children` snippet, which is rendered last in the notes.
  import { tick } from "svelte";
  import type { Snippet } from "svelte";
  import { DEFAULT_TEXT, EXAMPLES, LIMIT } from "../core/examples.ts";
  import IslandStatus from "./IslandStatus.svelte";

  type Phase = "loading" | "ready" | "failed";

  type Props = {
    /** The current text; the parent sets it for deliberate replacements. */
    text: string;
    /** Called with the new text once typing (or a composition) has settled (`replaced` false), and
     *  when an example or Reset text replaced it (`replaced` true). */
    oncommit: (value: string, replaced: boolean) => void;
    /** The island's own phase. */
    phase: Phase;
    /** The tokenizer file's phase. */
    download: Phase;
    inputId: string;
    privacyId: string;
    /** Download size of the tokenizer file, in MB, as shown to the reader. */
    sizeLabel: string;
    /** Test hooks of the download-state elements, spread onto them. */
    loadingAttrs?: Record<string, string>;
    errorAttrs?: Record<string, string>;
    retryAttrs?: Record<string, string>;
    staticAttrs?: Record<string, string>;
    onretry: () => void;
    /** Whether the reader may type. */
    editable: boolean;
    /** What the box is while it is not editable: a read-only textarea, or a plain static box. */
    lockedAs: "textarea" | "static";
    children?: Snippet;
  };

  let {
    text,
    oncommit,
    phase,
    download,
    inputId,
    privacyId,
    sizeLabel,
    loadingAttrs = {},
    errorAttrs = {},
    retryAttrs = {},
    staticAttrs = {},
    onretry,
    editable,
    lockedAs,
    children,
  }: Props = $props();

  // The static box has no textarea to describe, so the privacy line only shows with a textarea.
  const hasTextarea = $derived(editable || lockedAs === "textarea");

  let ta: HTMLTextAreaElement | undefined = $state();
  let retryButton: HTMLButtonElement | undefined = $state();
  let composing = false;

  // Idempotent: independent of the input / compositionend ordering between browsers.
  function commit(): void {
    if (!composing && ta) oncommit(ta.value, false);
  }

  // Examples and Reset replace the text, then put the caret at the end of the new text.
  function replace(value: string): void {
    oncommit(value, true);
    void focusEnd();
  }

  /** Puts the caret at the end of the text, once the parent's new text has reached the box. */
  export async function focusEnd(): Promise<void> {
    await tick();
    ta?.focus();
    ta?.setSelectionRange(text.length, text.length);
  }

  /** Moves focus to Try again, once it has been rendered. */
  export async function focusRetry(): Promise<void> {
    await tick();
    retryButton?.focus();
  }
</script>

<IslandStatus
  loading="Getting this ready. The default text is already shown."
  failed="This could not load. Check your connection, then reload the page. The default text is still shown."
  nojs="This needs JavaScript. The default text is shown."
/>

<!-- The text box is the elastic element of its column. -->
{#if hasTextarea}
  <label for={inputId} class="island-label field-label">Your text</label>
  <textarea
    id={inputId}
    class="widget-fill"
    bind:this={ta}
    value={text}
    readonly={!editable}
    aria-busy={!editable && download === "loading" ? "true" : undefined}
    maxlength={LIMIT}
    autocapitalize="off"
    autocorrect="off"
    spellcheck="false"
    dir="auto"
    aria-describedby={privacyId}
    oninput={commit}
    oncompositionstart={() => (composing = true)}
    oncompositionend={() => {
      composing = false;
      commit();
    }}
  ></textarea>
{:else}
  <span class="island-label field-label">Your text</span>
  <p class="textbox widget-fill" dir="auto" {...staticAttrs}>{text}</p>
{/if}
<div class="notes">
  {#if phase === "ready" && download === "loading"}
    <p class="island-muted note" role="status" {...loadingAttrs}>Loading the tokenizer, about {sizeLabel} MB. You can already try the example buttons.</p>
  {/if}
  <!-- Distinct from a runtime error in the results: this one means the file never arrived. The
       region is always present, so the message is announced. -->
  <div role="status">
    {#if download === "failed"}
      <p class="error note" {...errorAttrs}>The tokenizer could not be downloaded. Check your connection and try again. Your text stays in your browser.</p>
    {/if}
  </div>
  {#if download === "failed"}
    <button type="button" class="island-btn retry" {...retryAttrs} bind:this={retryButton} onclick={onretry}>Try again</button>
  {/if}
  {#if hasTextarea}
    <p class="island-muted note" id={privacyId}>Your text stays in your browser. Nothing is sent anywhere.</p>
  {/if}
  {#if hasTextarea && text.length >= LIMIT}
    <!-- text.length counts UTF-16 units, like maxlength; emoji-heavy input reaches it sooner. -->
    <p class="error note" role="status" data-limit>That is the limit for this box: 1,000 characters. Delete some text to keep typing.</p>
  {/if}
  {@render children?.()}
</div>

<!-- Examples and reset -->
<div class="examples">
  <span class="island-label" id="{inputId}-examples-label">Try an example</span>
  <div class="row" role="group" aria-labelledby="{inputId}-examples-label">
    {#each EXAMPLES as example (example.id)}
      <button type="button" class="island-btn" data-example={example.id} disabled={phase !== "ready"} onclick={() => replace(example.text)}
        >{example.label}</button
      >
    {/each}
    <button type="button" class="island-btn text-btn" data-reset disabled={phase !== "ready"} onclick={() => replace(DEFAULT_TEXT)}
      >Reset text</button
    >
  </div>
</div>

<style>
  /* The label sits 8px above the text box: the column gap is 16px, so pull it up by 8px. */
  .field-label {
    margin: 0 0 -8px;
  }
  .notes {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .note {
    margin: 0;
  }
  .error {
    font: 400 14px/1.4 var(--font-sans);
    color: var(--error);
  }
  .retry {
    align-self: flex-start;
  }
  .examples {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
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
  /* Two columns: the column sets the height, so the text box is elastic (widget-fill, in widget.css
     inside the same media query) and scrolls its own text. */
  @media (min-width: 1024px) {
    textarea {
      min-height: 96px;
      max-height: none;
      resize: none;
    }
    .textbox {
      min-height: 96px;
      overflow: auto;
    }
  }
</style>
