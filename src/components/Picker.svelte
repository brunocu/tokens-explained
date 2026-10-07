<script lang="ts">
  // A native radio group styled as wrapping buttons (UI-SPEC section 2, picker). Arrow keys move
  // and select, as for any native radio group. The selected option carries the accent fill, the
  // accent label colour and weight 600, so selection is also a text and weight cue. With
  // `selected` null every radio is unchecked. Labels reach the DOM through interpolation only.
  type Option = { id: string; label: string };
  type Props = {
    legend: string;
    name: string;
    options: ReadonlyArray<Option>;
    selected: string | null;
    onchange: (id: string) => void;
    disabled?: boolean;
  };

  let { legend, name, options, selected, onchange, disabled = false }: Props = $props();
</script>

<fieldset class="picker">
  <legend class="island-label">{legend}</legend>
  <div class="options">
    {#each options as option (option.id)}
      <label class="opt">
        <input
          type="radio"
          {name}
          value={option.id}
          checked={selected === option.id}
          {disabled}
          onchange={() => onchange(option.id)}
        />
        <span class="opt-text" class:selected={selected === option.id}>{option.label}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .picker {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 8px;
  }
  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .opt {
    position: relative;
    display: flex;
    max-width: 100%;
  }
  .opt input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    opacity: 0;
  }
  .opt-text {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    min-width: 44px;
    padding: 0 16px;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font: 400 14px/1.4 var(--font-sans);
    text-align: center;
    cursor: pointer;
    transition:
      color 100ms,
      background-color 100ms;
  }
  .opt-text.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-text);
    font-weight: 600;
  }
  .opt input:focus-visible + .opt-text {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .opt input:disabled + .opt-text {
    color: var(--muted);
    cursor: not-allowed;
  }
  .opt input:disabled + .opt-text.selected {
    color: var(--accent-text);
    opacity: 0.6;
  }
</style>
