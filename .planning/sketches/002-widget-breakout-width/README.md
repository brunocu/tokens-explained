---
sketch: 002
name: widget-breakout-width
question: "How wide should interactive widgets break out of the 680px article column on wide screens?"
winner: "A"
tags: [layout, widgets, responsive, phase-2.2]
---

# Sketch 002: Widget breakout width

## Design Question
Phase 2.2 Q-03: how far may a widget extend beyond the 680px reading column when the screen is wide, with a two-column layout at a constant height, stacking below 1024px?

## How to View
open .planning/sketches/002-widget-breakout-width/index.html

## Variants
- **A: 960px** — modest breakout (about 141% of the column).
- **B: 1120px** — room for two real columns, still generous margins on 1440px.
- **C: 1280px** — widest; nearly the full window on a 1440px screen.

Toolbar: switch the simulated screen (1440, 1280, 1024, 768), switch between Playground and Comparison (the densest widget, with languages table), toggle an overlay of the 680px column.

## What to Look For
- Does the right column have enough room for wrapped chips without scrolling at each width?
- Does the widget still feel attached to the text, or does it look like a separate page?
- At 1280 and 1024 screens, does the width shrink gracefully (it is capped at screen minus 48px)?
- At 768 the layout stacks and the height grows (constant height only applies in the two-column mode).
