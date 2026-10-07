import { expect, test } from "@playwright/test";
import { openPlaygroundReady } from "./helpers.ts";

// Privacy promise (TOK-01, T-01-13): "Your text stays in your browser. Nothing is sent anywhere."
// The playground downloads the GPT-2 file once at page load (D-04, D-08); after that, nothing
// the reader does causes a request, and nothing ever goes to another origin.

const isNetwork = (url: string) => /^https?:/i.test(url);
const pathOf = (url: string) => new URL(url).pathname;

test("typing, examples, view toggles and the table make zero network requests; all loads are same-origin", async ({
  page,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));

  await openPlaygroundReady(page);
  // Let any request still in flight after the tokenizer became ready settle.
  await page.waitForLoadState("networkidle");

  const loaded = urls.filter(isNetwork);
  const origin = new URL(page.url()).origin;
  expect(loaded.length).toBeGreaterThan(0);
  for (const url of loaded) expect(new URL(url).origin).toBe(origin);

  const before = urls.length;
  await page.locator("#t").fill("my secret text \u{1F642}");
  for (const id of ["rare-word", "numbers-dates", "emoji", "literature", "non-english"]) {
    await page.locator(`[data-example="${id}"]`).click();
  }
  await page.locator("[data-playground] [data-reset]").click();
  await page.getByText("Token IDs", { exact: true }).click();
  await page.locator("label", { hasText: "Peek under the hood" }).click();
  await page.getByText("Token text", { exact: true }).click();
  await page.locator("details[data-table] summary").click();
  await page.waitForTimeout(700);

  expect(urls.slice(before)).toEqual([]);

  const all = urls.filter(isNetwork);
  for (const url of all) expect(new URL(url).origin).toBe(origin);
});

test("the post page requests the GPT-2 file once and the BERT file only after its button is pressed; the comparison adds no request; all loads are same-origin", async ({
  page,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));

  await openPlaygroundReady(page, "what-is-a-token/");
  const card = page.locator("[data-compare]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  await page.waitForLoadState("networkidle");

  // The request budget of the page: one GPT-2 file for the playground, no BERT file.
  const gpt2Requests = urls.filter((url) => pathOf(url).endsWith("/tokenizers/gpt2.json"));
  expect(gpt2Requests).toHaveLength(1);
  expect(urls.filter((url) => pathOf(url).includes("bert"))).toEqual([]);
  expect(urls.filter((url) => pathOf(url).includes("/tokenizers/"))).toEqual(gpt2Requests);

  const before = urls.length;
  for (const label of ["Numbers and dates", "An emoji", "A non-English line"]) {
    await card.locator("label.opt", { hasText: label }).click();
  }
  await card.locator("details[data-alt-tables] summary").click();
  await card.locator("details[data-source] summary").click();
  await page.waitForTimeout(700);
  // The picker, the alternative tables and the source details cause no request of any kind.
  expect(urls.slice(before)).toEqual([]);

  expect(urls.filter((url) => pathOf(url).includes("bert"))).toEqual([]);
  expect(urls.filter((url) => pathOf(url).endsWith("/tokenizers/gpt2.json"))).toHaveLength(1);

  // The comparison card shows GPT-2 live from the same single request. Typing causes nothing, and
  // nothing was requested for BERT before its button is pressed.
  await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
  await expect(card).toHaveAttribute("data-compare-bert", "idle");
  const beforeOwnTyping = urls.length;
  await card.locator("#compare-input").fill("my own secret text \u{1F642}");
  await page.waitForTimeout(700);
  expect(urls.slice(beforeOwnTyping)).toEqual([]);
  expect(urls.filter((url) => pathOf(url).includes("bert"))).toEqual([]);

  // Pressing the BERT button causes exactly one new request, for the BERT file only.
  const beforeBert = urls.length;
  await card.locator("[data-load]").click();
  await expect(card).toHaveAttribute("data-compare-bert", "ready");
  await page.waitForLoadState("networkidle");
  const newRequests = urls.slice(beforeBert).filter(isNetwork);
  expect(newRequests).toHaveLength(1);
  expect(pathOf(newRequests[0] as string).endsWith("/tokenizers/bert-uncased.json")).toBe(true);
  expect(urls.filter((url) => pathOf(url).endsWith("/tokenizers/gpt2.json"))).toHaveLength(1);

  // After that, typing sends nothing and the page has made exactly the two tokenizer requests.
  const afterBert = urls.length;
  await card.locator("#compare-input").fill("more of my own text");
  await page.waitForTimeout(700);
  expect(urls.slice(afterBert)).toEqual([]);
  expect(urls.filter((url) => pathOf(url).includes("/tokenizers/"))).toHaveLength(2);

  const origin = new URL(page.url()).origin;
  for (const url of urls.filter(isNetwork)) expect(new URL(url).origin).toBe(origin);
});
