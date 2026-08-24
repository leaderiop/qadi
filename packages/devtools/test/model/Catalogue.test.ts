/**
 * JOB 1 ledger — E1.1 … E1.10.
 *
 * The catalogue rests on one property of Effect rather than of this repository:
 * `Equal.equals` is **structural** for plain objects, so two independently
 * constructed but equal policies are one thing. That is what `Atom.family`
 * relies on to share a decision, and `packages/react/test/v4-reactivity-smoke.test.ts`
 * pins it — but the devtools now depends on it too, so the first test here
 * asserts it directly rather than inheriting the assumption silently.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Equal from "effect/Equal";
import {
  allOf,
  anyOf,
  Decided,
  hasPermission,
  hasRole,
  labeled,
  not,
  obligation,
  obliged,
  permission,
  permitWhen,
  rules,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { catalogueOf, policiesSeen, policyLabel } from "../../src/model/Catalogue.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import { allow, decisionRecord, deny, failedRecord, obligationRecord } from "../helpers.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");

const fold = (records: ReadonlyArray<Parameters<typeof ingestAll>[1][number]>) =>
  ingestAll(emptyTimeline(), records);

const allowed = (options: { readonly evaluationId: string; readonly at: number; readonly policy: Policy }) =>
  decisionRecord({
    ...options,
    outcome: new Decided({ decision: allow({ evaluationId: options.evaluationId }) }),
  });

const denied = (options: { readonly evaluationId: string; readonly at: number; readonly policy: Policy }) =>
  decisionRecord({
    ...options,
    outcome: new Decided({ decision: deny({ evaluationId: options.evaluationId }) }),
  });

const labels = (sightings: ReadonlyArray<{ readonly label: string }>) =>
  sightings.map((s) => s.label);

describe("the assumption this module rests on", () => {
  it("Effect compares policies structurally, not by reference", () => {
    // If this ever became reference equality, every row of the rail would be a
    // separate policy and the screen would be useless — silently, with no other
    // test failing. Asserted here rather than assumed from `Atom.family`.
    assert.isTrue(Equal.equals(allOf([hasPermission(read)]), allOf([hasPermission(read)])));
    assert.isFalse(Equal.equals(hasPermission(read), hasPermission(write)));
  });
});

describe("policyLabel", () => {
  // E1.3 — a name someone chose beats anything derived.
  it("a labelled policy takes its author's name", () => {
    assert.strictEqual(policyLabel(labeled("can publish", hasPermission(write))), "can publish");
  });

  // E1.4
  it("a leaf reads as its requirement", () => {
    assert.strictEqual(policyLabel(hasPermission(read)), "doc:read");
    assert.strictEqual(policyLabel(hasRole("editor")), "editor");
  });

  it("a branching composite carries its arity, because that disambiguates", () => {
    assert.strictEqual(policyLabel(allOf([hasPermission(read), hasRole("a")])), "all of (2)");
    assert.strictEqual(policyLabel(anyOf([hasPermission(read)])), "any of (1)");
    assert.strictEqual(policyLabel(rules([permitWhen(hasPermission(read))])), "rules (1)");
  });

  it("a single-child wrapper does not, because the arity says nothing", () => {
    assert.strictEqual(policyLabel(not(hasPermission(read))), "not");
    // The duty id is deliberately not appended: the guard it needed for a
    // `detail` that is always present was dead code, the tree already names
    // the duty, and `labeled` is there for a caller who wants a distinct name.
    assert.strictEqual(policyLabel(obliged(obligation("audit"), hasPermission(read))), "obliged");
  });

  it("is stable: the same policy labels the same way every time", () => {
    const policy = allOf([hasPermission(read), hasRole("editor")]);
    assert.strictEqual(policyLabel(policy), policyLabel(policy));
    assert.strictEqual(policyLabel(policy), policyLabel(allOf([hasPermission(read), hasRole("editor")])));
  });
});

describe("policiesSeen", () => {
  // E1.1 — the property the whole screen depends on.
  it("groups two structurally-equal policies into one row", () => {
    const timeline = fold([
      allowed({ evaluationId: "a", at: 100, policy: allOf([hasPermission(read)]) }),
      allowed({ evaluationId: "b", at: 200, policy: allOf([hasPermission(read)]) }),
    ]);

    const seen = policiesSeen(timeline);
    assert.strictEqual(seen.length, 1);
    assert.strictEqual(seen[0]?.count, 2);
  });

  // E1.2
  it("keeps two policies that differ in one leaf apart", () => {
    const timeline = fold([
      allowed({ evaluationId: "a", at: 100, policy: hasPermission(read) }),
      allowed({ evaluationId: "b", at: 200, policy: hasPermission(write) }),
    ]);

    assert.strictEqual(policiesSeen(timeline).length, 2);
  });

  // E1.5 — the label is a display string, never the identity.
  it("two different policies deriving one label stay two rows", () => {
    const timeline = fold([
      allowed({ evaluationId: "a", at: 100, policy: labeled("shared", hasPermission(read)) }),
      allowed({ evaluationId: "b", at: 200, policy: labeled("shared", hasPermission(write)) }),
    ]);

    const seen = policiesSeen(timeline);
    assert.strictEqual(seen.length, 2);
    assert.deepStrictEqual(labels(seen), ["shared", "shared"]);
  });

  // E1.8
  it("counts each verdict class, and agrees with the row's own verdict", () => {
    const policy = hasPermission(read);
    const timeline = fold([
      allowed({ evaluationId: "a1", at: 100, policy }),
      allowed({ evaluationId: "a2", at: 200, policy }),
      denied({ evaluationId: "d", at: 300, policy }),
      failedRecord({ evaluationId: "e", at: 400 }),
    ]);

    // `failedRecord` uses the helper's default policy, which is the same one.
    const seen = policiesSeen(timeline);
    assert.strictEqual(seen.length, 1);
    assert.deepStrictEqual(
      { count: seen[0]?.count, allows: seen[0]?.allows, denies: seen[0]?.denies, errors: seen[0]?.errors },
      { count: 4, allows: 2, denies: 1, errors: 1 },
    );
  });

  // E1.10 — an orphan is an obligation outcome; there is no policy on it.
  it("attributes nothing to an orphaned obligation outcome", () => {
    assert.deepStrictEqual(policiesSeen(fold([obligationRecord({ evaluationId: "ghost", at: 100 })])), []);
  });

  // E1.9
  it("an empty timeline sees nothing, and does not throw", () => {
    assert.deepStrictEqual(policiesSeen(emptyTimeline()), []);
  });

  it("orders by most recently decided", () => {
    const timeline = fold([
      allowed({ evaluationId: "old", at: 100, policy: hasPermission(read) }),
      allowed({ evaluationId: "new", at: 900, policy: hasPermission(write) }),
    ]);

    assert.deepStrictEqual(labels(policiesSeen(timeline)), ["doc:write", "doc:read"]);
  });

  /**
   * The rail's order **is** the timeline's order, reversed — it borrows rather
   * than re-derives.
   *
   * So two policies that last decided in the same millisecond come back in the
   * timeline's own tie-break (arrival), and the rail cannot disagree with the
   * log about which decision came last. An earlier version sorted here with its
   * own comparator, which meant a second ordering rule and a second place to
   * re-solve `NaN`.
   */
  it("orders by the timeline's own ordering, reversed, ties included", () => {
    const timeline = fold([
      allowed({ evaluationId: "a", at: 100, policy: hasRole("zulu") }),
      allowed({ evaluationId: "b", at: 100, policy: hasRole("alpha") }),
    ]);

    // `alpha` arrived second, so in the log it is later, so here it is first.
    assert.deepStrictEqual(labels(policiesSeen(timeline)), ["alpha", "zulu"]);
  });

  // E1.11 — a merged timeline reads clocks it does not control, and the
  // timeline accepts an unorderable time rather than rejecting the record.
  it("a policy whose only decision has an unorderable time still appears", () => {
    const timeline = fold([
      allowed({ evaluationId: "a", at: Number.NaN, policy: hasRole("odd") }),
      allowed({ evaluationId: "b", at: 100, policy: hasRole("normal") }),
    ]);

    const seen = policiesSeen(timeline);
    assert.strictEqual(seen.length, 2);
    // The timeline sorts an unknown time last, so reversed it comes first.
    assert.deepStrictEqual(labels(seen), ["odd", "normal"]);
    assert.isTrue(Number.isNaN(seen[0]?.lastAt ?? 0));
  });

  it("reports when a policy last decided", () => {
    const policy = hasPermission(read);
    const timeline = fold([
      allowed({ evaluationId: "a", at: 100, policy }),
      allowed({ evaluationId: "b", at: 700, policy }),
    ]);

    assert.strictEqual(policiesSeen(timeline)[0]?.lastAt, 700);
  });
});

describe("catalogueOf", () => {
  // E1.6
  it("lists a declared policy that has never run, marked as never run", () => {
    const catalogue = catalogueOf(emptyTimeline(), {
      policies: { canArchive: hasPermission(write) },
    });

    assert.strictEqual(catalogue.length, 1);
    assert.strictEqual(catalogue[0]?.label, "canArchive");
    assert.strictEqual(catalogue[0]?.count, 0);
    // Absent, not zero: "never decided" is a different fact from "decided at
    // the epoch".
    assert.isUndefined(catalogue[0]?.lastAt);
  });

  // E1.7 — matched structurally, exactly as two observed occurrences are.
  it("does not duplicate a declared policy that has run", () => {
    const policy = allOf([hasPermission(read)]);
    const timeline = fold([allowed({ evaluationId: "a", at: 100, policy })]);

    const catalogue = catalogueOf(timeline, { policies: { canRead: allOf([hasPermission(read)]) } });
    assert.strictEqual(catalogue.length, 1);
    assert.strictEqual(catalogue[0]?.count, 1);
  });

  it("a declared name beats a derived one", () => {
    const timeline = fold([
      allowed({ evaluationId: "a", at: 100, policy: allOf([hasPermission(read)]) }),
    ]);

    assert.strictEqual(policiesSeen(timeline)[0]?.label, "all of (1)");
    assert.strictEqual(
      catalogueOf(timeline, { policies: { canRead: allOf([hasPermission(read)]) } })[0]?.label,
      "canRead",
    );
  });

  it("puts what is running before what is merely declared", () => {
    const timeline = fold([allowed({ evaluationId: "a", at: 100, policy: hasPermission(read) })]);
    const catalogue = catalogueOf(timeline, { policies: { unused: hasPermission(write) } });

    // A reader opening this screen is looking at what their application does,
    // not at what it could do.
    assert.deepStrictEqual(labels(catalogue), ["doc:read", "unused"]);
  });

  it("with no catalogue at all it is exactly what was seen", () => {
    const timeline = fold([allowed({ evaluationId: "a", at: 100, policy: hasPermission(read) })]);
    assert.deepStrictEqual(catalogueOf(timeline), policiesSeen(timeline));
  });

  it("an empty declaration adds nothing", () => {
    assert.deepStrictEqual(catalogueOf(emptyTimeline(), { policies: {} }), []);
    assert.deepStrictEqual(catalogueOf(emptyTimeline(), { roles: [] }), []);
  });
});
