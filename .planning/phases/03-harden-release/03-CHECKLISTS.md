---
status: pending
phase: 03-harden-release
source: [03-CONTEXT.md D-13 to D-17, 03-RESEARCH.md, 03-HARDENING.md, 03-PERFORMANCE.md, DEFERRED-FROM-PHASE-1.md, DEFERRED-FROM-PHASE-2.md, DEFERRED-FROM-PHASE-2.1.md, 03-FACT-CHECK.md]
started: 2026-10-14
updated: 2026-10-14
---

# Phase 3: Manual checks for the author

Nine checks that only a person can do. Each has an "expected" line (what a good result looks like) and a "result" line you fill in. Allowed results (D-15):

- **pass**: it looks and works as expected.
- **issue**: something is wrong. Write what you saw under the item. A problem that makes the post unusable or wrong gets fixed in this phase; a small one is fixed or listed as backlog (D-16).
- **not verified**: you could not do it (no device, tool not available). This is allowed, does not block the release, and is copied into `03-KNOWN-LIMITATIONS.md` (D-15).

Open the post at its address: the local preview (`npm run build` and `npm run preview` inside `nix develop`, then `http://localhost:4321/what-is-a-token/`) or, after deployment, the live address. Checks 1 to 7 and 9 work on either; check 8 (Lighthouse) is best on the live address. Where it says "the post", that is the page "What is a token?". The automated results these checks lean on are in `03-HARDENING.md` and `03-PERFORMANCE.md`.

## Tests

### 1. Screen reader pass
Assumption (A4): your computer is Windows, so use **NVDA** (free, nvaccess.org) or **Narrator** (built in, press Windows key + Ctrl + Enter) with **Chrome or Edge**. If your setup is different, use whatever screen reader you have and write which one under the item. Listen with your eyes closed or the screen off for at least the first two parts.
What to try, in order:
1. The playground: move to the text box. It should be announced as a text box with a clear name. Type a sentence; a short announcement of the result (how many tokens) should follow without you doing anything. Then find the list or table of tokens and read a few rows.
2. The stepper (the step-by-step merge demo): press the Next button a few times. The status text should say which step you are on. Find the pair-count table and read a row; find the sentences that are visually hidden or shown as pieces, and check they read as understandable text, not as a string of symbols.
3. The comparison (GPT-2 against BERT): read the rows and the notes beside them.
4. The languages table: read one row in English and the Arabic row.
5. The References list at the end: it should read as a numbered list of sources, and the numbers in the text should lead to it.
expected: you can reach and operate every control, you always know where you are, nothing important is silent, nothing is read out as noise (for example a long run of symbols with no meaning), and the numbers and words match what is on screen.
result: pending

### 2. Colour-blind simulation
In Chrome, press F12, open the three-dots menu, then **More tools, Rendering**. Scroll to **Emulate vision deficiencies** and pick each in turn: protanopia, deuteranopia, tritanopia, achromatopsia (no colour at all). Look at the post with each one on.
Look at: the playground chips (can you still see where one token ends and the next begins? The boundaries should come from outlines and separators, not colour alone); the stepper's tie bars (they should be hatched) and the boxed pair; the comparison rows; the languages bars.
expected: with every setting, you can still tell the chips apart, tell a tie from a non-tie, and tell which pair was merged. Colour is never the only clue.
result: pending

### 3. Real phone
Open the post on a real phone, ideally one iPhone (Safari) and one Android phone (Chrome), and the desktop Firefox. If a device is missing, mark that part **not verified**.
Look at:
1. The glyphs for a space, a new line and a tab. Press Enter in the text box to make a new line, and type a space and a tab if you can. They show as the symbols from `src/core/display.ts`: space `␣` (U+2423), new line `↵` (U+21B5), tab `⇥` (U+21E5). They must be visible symbols, not empty boxes or question marks.
2. The layout at about 360 pixels wide with nothing typed, with one character, and with about 1,000 characters (paste a long text), with the token table open. The table should scroll sideways inside its own box, the counts should be short and steady, the buttons should wrap onto more lines, the page itself should not scroll sideways, and the header should show only the site name.
expected: symbols are visible on every device you have; the layout is usable (mobile is secondary for this release, so small imperfections go on the backlog, not on the blocker list).
result: pending
devices: (write which devices you used; mark the others "not verified")

### 4. Inherited checks from Phase 2
Each part gets its own result. Write pass, issue or not verified next to each letter.
- **4a. Arabic sentence.** Compare the Arabic sentence in the languages table word for word, including the small marks above and below the letters (diacritics), with Article 1 on the OHCHR Arabic page (`ohchr.org`, the Universal Declaration of Human Rights in Arabic). OHCHR blocks scripts, so this must be done by eye in a browser. The sentence already matches the un.org Arabic page exactly. Also open the OHCHR translation-project page that the table links to, read the reuse terms, and confirm a link to it is the attribution it asks for (03-FACT-CHECK.md, E7).
- **4b. Notes are true.** Read the five comparison notes and the languages note next to their rows. They must say only what the rows show, nothing more.
- **4c. Glyph, outline and print of the stepper.** In the stepper, check the space glyph, the boxed pair, the double border and the hatched tie bars on screen in Chrome, Firefox and (if you have it) Safari, and in print preview (Ctrl+P). They must survive printing.
- **4d. Offline load of the comparison.** In DevTools open the Network tab, set the throttle to **Offline**, then press the button that loads the BERT tokenizer in the comparison. An error sentence and a **Try again** button must appear. Turn the network back on and press Try again; it must work. Also try the two-island case (Phase 2.1 item 5): make the playground and the comparison both fail (reload with the network off, scroll to both) and see whether needing to press Try again once in each reads acceptably to someone who is not a programmer. If it does not, say so; a single shared retry is the alternative.
- **4e. Own-text block by hand.** In the comparison, type or paste your own text: an Arabic sentence, an emoji, and a long English paragraph. Do it in light and then dark (DevTools Rendering tab, Emulate CSS media feature prefers-color-scheme), and once with the keyboard only (no mouse). Nothing should break, overflow the page, or hide the result.
- **4f. Languages table look.** Look at the table in light, in dark, and in print preview. The Arabic text must read right to left while the frames (the token boxes) read left to right.
- **4g. Open-by-hand links (from the fact check).** Open these in a normal browser and confirm they open: the ACM page behind `doi.org/10.1145/1187415.1187418`, the OHCHR landing page `ohchr.org/en/human-rights/universal-declaration`, and the OpenAI page `openai.com/index/better-language-models/`. They block scripts, so only a person can check them.
expected: every part is pass, or a recorded issue, or not verified with a reason.
result: pending
4a: pending | 4b: pending | 4c: pending | 4d: pending | 4e: pending | 4f: pending | 4g: pending

### 5. Lighter dark, print and zoom checks
These were checked by script (`03-HARDENING.md`: no sideways scroll at 200 and 400 percent, no console errors in dark, a 17-page print rendering made); you give them a quick look with your own eyes.
1. **Dark mode:** in the Rendering tab choose Emulate CSS media feature prefers-color-scheme: dark. Scroll the whole post. Text must be readable and nothing should look cut off or washed out.
2. **Print preview:** press Ctrl+P on the post. Skim the pages. The text, the numbered sources and the widgets should be readable, and no page should be mostly empty or cut off. (The script's PDF is in `test-results/` under the folder named for the print test, if you want to open it directly.)
3. **Zoom:** press Ctrl and plus until the browser says 200 percent, then 400 percent. The text must stay readable, and the page must not need sideways scrolling (a table may scroll inside its own box).
expected: all three look right; any problem gets written below.
result: pending

### 6. Keyboard-only read-through
Put the mouse away. Starting at the top of the post, read it from beginning to end using only Tab, Shift+Tab, Enter, Space and the arrow keys.
expected: you can reach every button, switch and link in a sensible order; you can always see where the focus is; you are never stuck (no trap you cannot leave); the table boxes that scroll can be scrolled with the keyboard.
result: pending

### 7. Typing sends no network request
Open DevTools, Network tab, and clear the list. In the playground type something, press each example button, and press Reset. Then open the token table.
expected: no new rows appear in the Network list while you do any of this. (The first load downloads the GPT-2 file once, and pressing the BERT button in the comparison downloads one more file; nothing else, ever.) This is a confirmation only: `e2e/privacy.spec.ts` already checks it automatically on three browsers, and passed on 2026-10-14 (`03-HARDENING.md`, Privacy).
result: pending

### 8. Lighthouse (report only)
What it is: Lighthouse is Chrome's built-in auditor. It loads the page the way a mid-range phone on a slow connection would and gives four scores out of 100: Performance (how fast it feels), Accessibility (can different people use it), Best Practices (no sloppy or unsafe habits) and SEO (can search engines understand it). A high number is good news, but the number is not a goal. Here the scores are only written down, nothing passes or fails on them (D-11), and you do not need to install anything.
How: open the live address in Chrome (after deployment; a local preview works for a first look). Press F12, open the **Lighthouse** tab, choose **Mobile** and keep the default settings, tick all four categories, press **Analyze page load**. Use a window with no extensions, or a Guest window, so extensions do not change the numbers.
Write down: the four scores, and anything the report flags as clearly bad (red items). The research run on a local build had Performance 99, Accessibility 100, Best Practices 96, SEO 100 (the Best Practices point was a missing favicon, since fixed).
expected: no red item that a reader would notice; scores roughly like the baseline. Anything clearly bad becomes an issue; a small point becomes backlog.
result: pending
scores: Performance __ / Accessibility __ / Best Practices __ / SEO __

### 9. The hatched chip (Phase 2.1 item 10)
The explanation of hatched chips now lives only in the playground legend. Read the post as a newcomer, reach the playground, and type an emoji so a hatched chip appears.
expected: someone who has not seen the removed figure understands from the legend what a hatched chip means (a piece of a character, not a whole one). If you are unsure, ask one of the two readers in `03-READER-QUESTIONNAIRE.md` this exact question and record their answer.
result: pending

## Summary

| Result | Count |
|---|---:|
| total | 9 |
| passed | 0 |
| issues | 0 |
| not verified | 0 |
| pending | 9 |

## Gaps

Write anything found here, one line each: what, where (item number), and the disposition (fixed in commit, or backlog with the reason). "Not verified" items are copied into `03-KNOWN-LIMITATIONS.md`.
