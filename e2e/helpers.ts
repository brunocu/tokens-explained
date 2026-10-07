import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Open a page that holds the playground and wait until the reader could type into it.
 *
 * The card has two levels of readiness (D-05, D-07):
 *  - `data-state` is the island: "ready" as soon as it hydrates.
 *  - `data-tokenizer` is the GPT-2 download: until it is "ready" the textbox is read-only,
 *    so a test that types right after the first level would be flaky.
 *
 * `path` is "./" (home page) or "what-is-a-token/"; both hold the same playground.
 * Returns the card locator.
 */
export async function openPlaygroundReady(page: Page, path = "./"): Promise<Locator> {
  await page.goto(path);
  const card = page.locator("[data-playground]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(card).toHaveAttribute("data-tokenizer", "ready");
  return card;
}

/**
 * Assert the text the comparison card is cutting. Before GPT-2 arrives the card shows the text in a
 * plain paragraph (`[data-compare-text]`); afterwards it is the value of the editable box
 * (`#compare-input`). Either way it is the same single widget, so a test that only cares which text is
 * shown uses this and does not depend on how fast the download was.
 */
export async function expectCompareText(card: Locator, text: string): Promise<void> {
  const input = card.locator("#compare-input");
  const plain = card.locator("[data-compare-text]");
  await expect(async () => {
    if ((await input.count()) > 0) expect(await input.inputValue()).toBe(text);
    else expect(await plain.textContent()).toBe(text);
  }).toPass();
}
