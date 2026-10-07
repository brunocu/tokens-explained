<script lang="ts">
  // The lifecycle line every Phase 2 card starts with. It is shown and hidden by CSS on the
  // card's data-state (src/styles/island.css), so the failed state works with no hydration.
  // The Reload button has no Svelte handler: the layout script delegates its click, because this
  // component may never run in the browser when the island script fails to load.
  let { loading, failed, nojs }: { loading: string; failed: string; nojs: string } = $props();
</script>

<p class="island-status" role="status" data-status>
  <span class="msg-loading" data-msg="loading">{loading}</span>
  <span class="msg-failed" data-msg="failed"
    >{failed}
    <button type="button" class="island-btn" data-reload>Reload page</button></span
  >
</p>
<noscript>
  <style>
    .island-status {
      display: none;
    }
  </style>
  <p class="island-nojs">{nojs}</p>
</noscript>
