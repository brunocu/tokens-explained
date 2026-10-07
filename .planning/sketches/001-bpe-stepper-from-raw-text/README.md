---
sketch: 001
name: bpe-stepper-from-raw-text
question: "How should the BPE stepper show a sentence going from raw text to bytes to merged pieces, and what happens when merging stops?"
winner: "D"
tags: [stepper, bpe, visualization, post-1]
---

# Sketch 001: BPE stepper from raw text

## Design Question
Post 1's stepper must start at raw text (characters, then bytes), run BPE merges on a real sentence
("the cat sat on the mat and the cat sat on the hat"), show when merging stops (budget of 8 merges,
vocabulary 256 + 8 = 264) and show how unseen words are encoded (" that" from known pieces, a cat emoji
from raw bytes). Replaces the Sennrich low/lower/newest/widest corpus.

## How to View
open .planning/sketches/001-bpe-stepper-from-raw-text/index.html

BPE really runs in the page (byte-level, words pre-split with the space at the start of the next word,
ties broken by highest count then first seen, the project rule), so every number is genuine.
13 stages: text, bytes, starting pieces, merges 1 to 8, stop, new words.

## Variants
- **A: Layered ledger** - three layers stay on screen (text, bytes, pieces), the pair table sits below, two counters (vocabulary size, pieces in text). Closest to the current stepper, so the cheapest to build.
- **B: Highlight, then fuse** - one strip of pieces. Each step first marks every spot where the winning pair occurs, with a leaderboard of bars, and Next fuses them all at once.
- **C: Index book** - the text is shown as plain numbers next to a growing numbered vocabulary book, plus a running trade-off table (vocabulary grows, text length shrinks). Aimed at "what do index numbers mean" and "what does stopping cost".

## What to Look For
- Does the jump from characters to bytes to pieces feel natural for a reader with low computer literacy?
- Is the chosen pair and the tie rule clear without reading the paragraph?
- Which one best supports the later prose on vocabulary size versus text length and on index numbers?
- Does anything rely on colour alone? (Outlines, words and bar patterns carry the meaning; colour is decoration.)
- Phone width: use the viewport buttons at the bottom right.

## Result
Winner: **D** - B's highlight-then-fuse layout with one box around both tokens of the pair and A's pop-in on the merged piece (reduced-motion safe).
