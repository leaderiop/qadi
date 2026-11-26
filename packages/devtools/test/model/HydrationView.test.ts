/**
 * The hydration block as one model function, tested with no DOM.
 *
 * Every arm of the decision and every data-dependent sentence is a row here with its exact
 * string, so a changed plural, a lost precedence or a moved boundary is a failing row. The
 * panel's own cases (`QuestionsPanel.test.tsx`) read the same sentences through the markup.
 * Inputs are complete `HydrationActivity` values; a row spreads a base one only to change
 * the field it is about.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Equal from "effect/Equal";
import type { HydrationActivity, HydrationDrops } from "../../src/model/Hydration.ts";
import { HydrationDropsView, HydrationView, hydrationView } from "../../src/model/HydrationView.ts";

const SCOPE_LEAD = "Process-wide totals, not this page's. ";
const SEEDED_MORE =
  "This process seeded more than it built, so it is a client reading payloads rendered elsewhere.";

const drop = (reason: string, count: number): HydrationDrops => ({
  reason,
  count,
  meaning: `what ${reason} means`,
});

const base: HydrationActivity = {
  dehydrated: 10,
  seeded: 10,
  rechecked: 0,
  mismatched: 0,
  drops: [],
};

/** The view of a reading, which must be the counts arm. */
const countsOf = (activity: HydrationActivity) => {
  const view = hydrationView({ hydration: activity, unsampled: false });
  if (!HydrationView.$is("Counts")(view)) return assert.fail(`not the counts arm: ${view._tag}`);
  return view;
};

const nineAtZero = Array.from({ length: 9 }, (_, i) => drop(`reason-${i}`, 0));

describe("hydrationView", () => {
  it("V1 no counts and a sampled poll: the unwired advice", () => {
    assert.deepStrictEqual(hydrationView({ hydration: undefined, unsampled: false }), HydrationView.Unwired());
  });

  it("V2 no counts and an unsampled poll: pending", () => {
    assert.deepStrictEqual(hydrationView({ hydration: undefined, unsampled: true }), HydrationView.Pending());
  });

  it("V3 counts while unsampled: the counts win", () => {
    const view = hydrationView({ hydration: base, unsampled: true });
    assert.strictEqual(view._tag, "Counts");
  });

  it("V4 the four numbers pass through unchanged", () => {
    const view = countsOf({ ...base, dehydrated: 7, seeded: 5, rechecked: 3, mismatched: 2 });
    assert.strictEqual(view.dehydrated, 7);
    assert.strictEqual(view.seeded, 5);
    assert.strictEqual(view.rechecked, 3);
    assert.strictEqual(view.mismatched, 2);
  });

  it("V5 nothing re-checked: no rate", () => {
    assert.strictEqual(countsOf({ ...base, rechecked: 0, mismatched: 0, seeded: 3 }).rate, undefined);
  });

  it("V6 one re-checked, one mismatched: the singular rate", () => {
    assert.strictEqual(
      countsOf({ ...base, rechecked: 1, mismatched: 1 }).rate,
      "1 of 1 re-checked question disagreed with the server.",
    );
  });

  it("V7 four re-checked, one mismatched: the plural rate", () => {
    assert.strictEqual(
      countsOf({ ...base, rechecked: 4, mismatched: 1 }).rate,
      "1 of 4 re-checked questions disagreed with the server.",
    );
  });

  it("V8 nine drops all at zero: nothing was dropped", () => {
    assert.deepStrictEqual(
      countsOf({ ...base, drops: nineAtZero }).drops,
      HydrationDropsView.None({ text: "Nothing was dropped. All 9 reasons are watched." }),
    );
  });

  it("V9 no drops listed: all 0 reasons", () => {
    assert.deepStrictEqual(
      countsOf({ ...base, drops: [] }).drops,
      HydrationDropsView.None({ text: "Nothing was dropped. All 0 reasons are watched." }),
    );
  });

  it("V10 one raised drop beside a zero one: exactly the raised row", () => {
    const raised = drop("seed-expired", 2);
    assert.deepStrictEqual(
      countsOf({ ...base, drops: [raised, drop("seed-unreadable", 0)] }).drops,
      HydrationDropsView.Raised({ rows: [raised] }),
    );
  });

  it("V11 a drop at count 1 is raised and one at 0 is not", () => {
    const one = drop("seed-expired", 1);
    assert.deepStrictEqual(
      countsOf({ ...base, drops: [drop("seed-unreadable", 0), one] }).drops,
      HydrationDropsView.Raised({ rows: [one] }),
    );
  });

  it("V12 a foreign reason keeps its reason and meaning verbatim", () => {
    const foreign: HydrationDrops = {
      reason: "<b>not ours</b>",
      count: 3,
      meaning: "not a reason this build knows — something else writes to this metric",
    };
    const view = countsOf({ ...base, drops: [foreign] }).drops;
    assert.deepStrictEqual(view, HydrationDropsView.Raised({ rows: [foreign] }));
  });

  it("V13 dehydrated equals seeded: 0 dehydrated entries", () => {
    assert.strictEqual(
      countsOf({ ...base, dehydrated: 10, seeded: 10 }).scope,
      `${SCOPE_LEAD}0 dehydrated entries have no seeding counted in this process.`,
    );
  });

  it("V14 a shortfall of 1: 1 dehydrated entry", () => {
    assert.strictEqual(
      countsOf({ ...base, dehydrated: 11, seeded: 10 }).scope,
      `${SCOPE_LEAD}1 dehydrated entry have no seeding counted in this process.`,
    );
  });

  it("V15 a shortfall of 6: 6 dehydrated entries", () => {
    assert.strictEqual(
      countsOf({ ...base, dehydrated: 10, seeded: 4 }).scope,
      `${SCOPE_LEAD}6 dehydrated entries have no seeding counted in this process.`,
    );
  });

  it("V16 seeded more than dehydrated: a client reading payloads", () => {
    assert.strictEqual(countsOf({ ...base, dehydrated: 0, seeded: 4 }).scope, `${SCOPE_LEAD}${SEEDED_MORE}`);
  });

  it("V17 the same reading twice gives equal views and leaves the input alone", () => {
    const input = {
      hydration: {
        dehydrated: 7,
        seeded: 5,
        rechecked: 3,
        mismatched: 2,
        drops: [drop("seed-expired", 2), drop("seed-unreadable", 0)],
      },
      unsampled: false,
    };
    const before = structuredClone(input);
    const first = hydrationView(input);
    // After one call, not two: a view that reorders in place would restore the order on the second.
    assert.deepStrictEqual(input, before);
    const second = hydrationView(input);
    assert.isTrue(Equal.equals(first, second));
  });
});
