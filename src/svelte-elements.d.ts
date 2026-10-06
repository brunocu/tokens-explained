// svelte/elements declares `autocorrect` for <input> only. Safari also honours
// it on <textarea>, and the playground turns it off, so extend the type here.
import "svelte/elements";

declare module "svelte/elements" {
  interface HTMLTextareaAttributes {
    autocorrect?: "on" | "off" | "" | undefined | null;
  }
}
