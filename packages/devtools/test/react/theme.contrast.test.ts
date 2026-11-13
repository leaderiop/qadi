/**
 * The dock's colour pairs, measured against WCAG 2.2 AA.
 *
 * Every ratio is computed from `colors` and `withAlpha` through `contrast.ts`, so
 * a token change fails here on the recorded two-decimal value as well as on the
 * threshold: a palette change has to restate the measurement in the same change.
 * Body text needs 4.5:1; a focus indicator needs 3:1 (non-text contrast).
 */
import { assert, describe, it } from "@effect/vitest";
import { colors, withAlpha } from "../../src/react/theme.ts";
import { contrast, over } from "./contrast.ts";

const tint = over(withAlpha(colors.error, 0.12), colors.surface);

/** One pair: its recorded ratio at two decimals, and the least it may read. */
const pin = (name: string, ratio: number, recorded: string, least: number): void => {
  assert.strictEqual(ratio.toFixed(2), recorded, `${name} reads ${ratio.toFixed(2)}:1, recorded ${recorded}:1`);
  assert.isAtLeast(ratio, least, `${name} reads ${ratio.toFixed(2)}:1, needs ${String(least)}:1`);
};

describe("the dock's colour pairs", () => {
  it("CT1 body and Restart text on the notice tint", () => {
    pin("text on the tint", contrast(colors.text, tint), "12.10", 4.5);
  });

  it("CT2 the amber lead and the Restart border on the notice tint", () => {
    pin("error on the tint", contrast(colors.error, tint), "6.57", 4.5);
  });

  it("CT3 the focus ring on the surface", () => {
    pin("accent on the surface", contrast(colors.accent, colors.surface), "6.78", 3);
  });

  it("CT4 the focus ring on a raised surface", () => {
    pin("accent on a raised surface", contrast(colors.accent, colors.surfaceRaised), "6.18", 3);
  });

  it("CT5 the focus ring on the notice tint", () => {
    pin("accent on the tint", contrast(colors.accent, tint), "5.56", 3);
  });

  it("CT6 the helper's own fixed points", () => {
    assert.strictEqual(contrast("#ffffff", "#000000").toFixed(2), "21.00");
    assert.strictEqual(contrast(colors.accent, colors.accent).toFixed(2), "1.00");
    assert.strictEqual(tint, "#2d2718");
    assert.throws(() => contrast("red", "#000000"), "not a dock colour: red");
  });
});
