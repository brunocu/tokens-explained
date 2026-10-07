// Typed access to the committed, dated comparison fixture (D-10). The JSON is written only by
// `npm run precompute:comparison`; components import COMPARISON from here instead of casting
// the JSON themselves.
import comparisonJson from "./comparison.json" with { type: "json" };
import type { ComparisonFixture } from "./fixture.ts";

export const COMPARISON: ComparisonFixture = comparisonJson as unknown as ComparisonFixture;
