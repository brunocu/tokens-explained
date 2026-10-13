<script lang="ts">
  // The one labelled, focusable scroll region of the widgets (UI-SPEC "Scroll region contract" and
  // "Scroll position"). The contract lives here once: role region, tabindex 0, and a name that the
  // caller writes ending in ", scrollable". Content only reaches the DOM through the children
  // snippet, which the caller renders with text interpolation.
  //
  // `resetKey` is any value the caller changes when the content is replaced by a deliberate choice
  // (an example picked, Reset text). Each change sets scrollTop back to 0. While the key is
  // unchanged (typing) the scroll position is never touched.
  import type { Snippet } from "svelte";

  type Props = {
    /** The full accessible name, ending in ", scrollable". */
    label: string;
    /** The elastic element of its column (fills the space the column has left). */
    fill?: boolean;
    /** Scrolls sideways (a wide table) instead of vertically. */
    xscroll?: boolean;
    /** Any value; a change scrolls the region back to its top. */
    resetKey?: unknown;
    /** Extra class names for the region element (a caller sizes a non-elastic region with one). */
    class?: string;
    /** False for a region that holds a table and needs no inner padding. Default true. */
    padded?: boolean;
    children: Snippet;
  };

  let { label, fill = false, xscroll = false, resetKey = undefined, class: extra = "", padded = true, children }: Props = $props();

  let region: HTMLDivElement | undefined = $state();

  // Plain variables on purpose: they must not be reactive, or the effect would re-run when they change.
  let armed = false;
  let seen: unknown;

  // Effects never run on the server. The first run only records the key, so mounting does not
  // touch the scroll position.
  $effect(() => {
    const key = resetKey;
    if (!armed) {
      armed = true;
      seen = key;
      return;
    }
    if (key === seen) return;
    seen = key;
    if (region) region.scrollTop = 0;
  });
</script>

<!-- A region that scrolls must be reachable by keyboard (WCAG 2.1.1: Keyboard), so the tabindex on
     this non-interactive element is deliberate. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={region}
  class={extra}
  class:widget-scroll={!xscroll}
  class:widget-xscroll={xscroll}
  class:widget-fill={fill}
  class:flush={!padded}
  role="region"
  tabindex="0"
  aria-label={label}
>
  {@render children()}
</div>

<style>
  /* `.widget-scroll` pads its content in widget.css; a table region sets its own cell padding. The
     second class lifts the specificity above the single-class rule there. */
  .flush.widget-scroll {
    padding: 0;
  }
</style>
