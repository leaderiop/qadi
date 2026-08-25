/**
 * JOB 5 ledger — E5.1 … E5.7.
 *
 * Two rules carry the weight. Counts are of the **whole** timeline and never of
 * the filtered view, because a header reading "0 errors" while the reader
 * happens to be filtering by subject hides the thing they most need to see. And
 * a selection survives a filter that would have hidden its row, because
 * clearing the inspector when someone types in a search box is the tool
 * second-guessing the reader.
 */
import { assert, describe, it } from "@effect/vitest";
import { Decided } from "@qadi/core";
import {
  applyFilters,
  environmentsOf,
  isUnfiltered,
  noFilters,
  searchTextOf,
} from "../../src/model/Filters.ts";
import { selectionOf } from "../../src/model/Selection.ts";
import { entryKey, emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import { countsOf } from "../../src/model/Verdict.ts";
import { allow, decisionRecord, deny, failedRecord, obligationRecord } from "../helpers.ts";

const fold = (records: ReadonlyArray<Parameters<typeof ingestAll>[1][number]>) =>
  ingestAll(emptyTimeline(), records);

const allowRecord = (options: {
  readonly evaluationId: string;
  readonly at: number;
  readonly environment?: string;
  readonly action?: string;
  readonly resource?: Record<string, unknown>;
  readonly subjectId?: string;
}) =>
  decisionRecord({
    ...options,
    outcome: new Decided({
      decision: allow({
        evaluationId: options.evaluationId,
        ...(options.subjectId === undefined ? {} : { subjectId: options.subjectId }),
      }),
    }),
  });

const denyRecord = (options: {
  readonly evaluationId: string;
  readonly at: number;
  readonly subjectId?: string;
}) =>
  decisionRecord({
    ...options,
    outcome: new Decided({
      decision: deny({
        evaluationId: options.evaluationId,
        // Distinct from the allow row's subject, so a search for one subject
        // proves it narrows rather than merely returning something.
        subjectId: options.subjectId ?? "bob",
      }),
    }),
  });

const ids = (entries: ReadonlyArray<{ readonly evaluationId: string }>) =>
  entries.map((e) => e.evaluationId);

const populated = fold([
  allowRecord({
    evaluationId: "a",
    at: 100,
    environment: "Server",
    action: "read",
    subjectId: "alice",
    resource: { id: "invoice-42", tenantId: "acme" },
  }),
  denyRecord({ evaluationId: "b", at: 200 }),
  failedRecord({ evaluationId: "c", at: 300, environment: "Client" }),
  obligationRecord({ evaluationId: "ghost", at: 400, environment: "Client" }),
]);

/**
 * The haystack, asserted exactly.
 *
 * Checking only which rows survived a filter cannot see what a row is matched
 * *by*: eight separate mutants replacing an "absent value" placeholder with a
 * non-empty string survived a suite that asserted only row counts, because no
 * test could name the token they invented. Asserting the text pins every one of
 * them, and it is the same thing a screen needs in order to highlight why a row
 * matched.
 */
describe("searchTextOf", () => {
  it("is the row's own fields, space-separated and lowercased", () => {
    assert.strictEqual(
      searchTextOf(populated.entries[0] ?? fail()),
      'a server read alice id invoice-42 tenantid acme',
    );
  });

  it("omits an absent action rather than naming it", () => {
    const timeline = fold([denyRecord({ evaluationId: "bare", at: 100 })]);
    assert.strictEqual(searchTextOf(timeline.entries[0] ?? fail()), "bare server bob");
  });

  it("omits the subject of a failed evaluation", () => {
    const timeline = fold([failedRecord({ evaluationId: "e", at: 100 })]);
    assert.strictEqual(searchTextOf(timeline.entries[0] ?? fail()), "e server");
  });

  it("omits a resource value JSON cannot represent, keeping its key", () => {
    const timeline = fold([
      allowRecord({ evaluationId: "x", at: 100, resource: { handler: () => "hi", name: "keep" } }),
    ]);
    assert.strictEqual(
      searchTextOf(timeline.entries[0] ?? fail()),
      'x server alice handler name keep',
    );
  });

  it("omits a value that cannot be stringified at all, keeping its key", () => {
    const circular: Record<string, unknown> = { name: "loop" };
    circular["self"] = circular;
    const timeline = fold([allowRecord({ evaluationId: "x", at: 100, resource: circular })]);

    assert.strictEqual(searchTextOf(timeline.entries[0] ?? fail()), 'x server alice name loop self');
  });

  it("keeps a string value unquoted so a reader's own text matches it", () => {
    const timeline = fold([allowRecord({ evaluationId: "x", at: 100, action: "publish" })]);
    assert.strictEqual(searchTextOf(timeline.entries[0] ?? fail()), "x server publish alice");
  });

  it("an orphan is searched by its ids and its duties", () => {
    const timeline = fold([
      obligationRecord({ evaluationId: "ghost", at: 100, obligationIds: ["audit", "notify"] }),
    ]);
    assert.strictEqual(searchTextOf(timeline.entries[0] ?? fail()), "ghost server audit notify");
  });
});

describe("noFilters", () => {
  it("narrows nothing", () => {
    assert.isTrue(isUnfiltered(noFilters));
    assert.deepStrictEqual(ids(applyFilters(populated.entries, noFilters)), [
      "a",
      "b",
      "c",
      "ghost",
    ]);
  });

  it("whitespace is not a filter", () => {
    assert.isTrue(isUnfiltered({ ...noFilters, text: "   " }));
    assert.strictEqual(applyFilters(populated.entries, { ...noFilters, text: "   " }).length, 4);
  });

  it("any of the three narrows", () => {
    assert.isFalse(isUnfiltered({ ...noFilters, text: "alice" }));
    assert.isFalse(isUnfiltered({ ...noFilters, environment: "Server" }));
    assert.isFalse(isUnfiltered({ ...noFilters, verdict: "Deny" }));
  });
});

describe("free text", () => {
  it("matches the subject", () => {
    assert.deepStrictEqual(ids(applyFilters(populated.entries, { ...noFilters, text: "alice" })), [
      "a",
    ]);
  });

  it("matches the action", () => {
    assert.deepStrictEqual(ids(applyFilters(populated.entries, { ...noFilters, text: "read" })), [
      "a",
    ]);
  });

  it("matches a resource value and a resource key", () => {
    assert.deepStrictEqual(
      ids(applyFilters(populated.entries, { ...noFilters, text: "invoice-42" })),
      ["a"],
    );
    assert.deepStrictEqual(
      ids(applyFilters(populated.entries, { ...noFilters, text: "tenantId" })),
      ["a"],
    );
  });

  it("matches the evaluation id and the environment", () => {
    assert.deepStrictEqual(ids(applyFilters(populated.entries, { ...noFilters, text: "ghost" })), [
      "ghost",
    ]);
    assert.deepStrictEqual(ids(applyFilters(populated.entries, { ...noFilters, text: "Client" })), [
      "c",
      "ghost",
    ]);
  });

  it("matches an orphan's obligation ids", () => {
    assert.deepStrictEqual(ids(applyFilters(populated.entries, { ...noFilters, text: "audit" })), [
      "ghost",
    ]);
  });

  it("is case-insensitive", () => {
    assert.deepStrictEqual(ids(applyFilters(populated.entries, { ...noFilters, text: "ALICE" })), [
      "a",
    ]);
  });

  // E5.1
  it("matching nothing yields nothing, and is not an error", () => {
    assert.deepStrictEqual(applyFilters(populated.entries, { ...noFilters, text: "zzz" }), []);
  });

  // E5.3 — most rows have no action and no resource.
  it("a row with no action and no resource neither crashes nor false-matches", () => {
    const timeline = fold([denyRecord({ evaluationId: "bare", at: 100 })]);

    assert.strictEqual(applyFilters(timeline.entries, { ...noFilters, text: "bare" }).length, 1);
    assert.strictEqual(applyFilters(timeline.entries, { ...noFilters, text: "read" }).length, 0);
    // An absent action rendered as the string "undefined" would match a search
    // for "undefined", which is the shape of false match that erodes trust in a
    // filter.
    assert.strictEqual(
      applyFilters(timeline.entries, { ...noFilters, text: "undefined" }).length,
      0,
    );
  });

  // E5.4
  it("treats regex metacharacters literally", () => {
    const timeline = fold([
      allowRecord({ evaluationId: "x", at: 100, resource: { path: "a.b(c)[d]*" } }),
      allowRecord({ evaluationId: "y", at: 200, resource: { path: "aXbXcXdX" } }),
    ]);

    // `.` matching any character would match both; `(c)` compiled as a group
    // would match neither, or throw.
    assert.deepStrictEqual(
      ids(applyFilters(timeline.entries, { ...noFilters, text: "a.b(c)" })),
      ["x"],
    );
    assert.deepStrictEqual(applyFilters(timeline.entries, { ...noFilters, text: "[" }).length, 1);
  });

  /**
   * Fields are searched, not their concatenation.
   *
   * Row "a" has environment `Server` and action `read`; joined without a
   * separator that is `Serverread`, and a reader typing `verre` would be shown
   * a row containing neither word. A filter that invents matches across field
   * boundaries erodes trust faster than one that misses.
   */
  it("does not match across a field boundary", () => {
    assert.deepStrictEqual(applyFilters(populated.entries, { ...noFilters, text: "verre" }), []);
    // Each half on its own still matches, so this is about the seam and not
    // about the fields being searched at all.
    assert.deepStrictEqual(ids(applyFilters(populated.entries, { ...noFilters, text: "server" })), [
      "a",
      "b",
    ]);
    assert.deepStrictEqual(ids(applyFilters(populated.entries, { ...noFilters, text: "read" })), [
      "a",
    ]);
  });

  it("a resource value JSON cannot represent contributes nothing rather than 'undefined'", () => {
    // `JSON.stringify` returns `undefined` — not the string — for a function or
    // a symbol. Rendering that as `"undefined"` would make every such row match
    // a search for "undefined".
    const timeline = fold([
      allowRecord({
        evaluationId: "x",
        at: 100,
        resource: { handler: () => "hi", tag: Symbol("s"), name: "keep" },
      }),
    ]);

    assert.strictEqual(applyFilters(timeline.entries, { ...noFilters, text: "keep" }).length, 1);
    assert.strictEqual(
      applyFilters(timeline.entries, { ...noFilters, text: "undefined" }).length,
      0,
    );
  });

  it("searches non-string resource values", () => {
    const timeline = fold([
      allowRecord({ evaluationId: "x", at: 100, resource: { amount: 4200, draft: false } }),
    ]);

    assert.strictEqual(applyFilters(timeline.entries, { ...noFilters, text: "4200" }).length, 1);
    assert.strictEqual(applyFilters(timeline.entries, { ...noFilters, text: "false" }).length, 1);
  });

  it("a resource value that cannot be rendered does not take the panel down", () => {
    const circular: Record<string, unknown> = { name: "loop" };
    circular["self"] = circular;
    const timeline = fold([allowRecord({ evaluationId: "x", at: 100, resource: circular })]);

    assert.strictEqual(applyFilters(timeline.entries, { ...noFilters, text: "loop" }).length, 1);
    assert.strictEqual(applyFilters(timeline.entries, { ...noFilters, text: "zzz" }).length, 0);
  });

  /**
   * A named limit rather than a gap. `subjectId` lives on the `Decision` and a
   * `Failed` outcome has none, so filtering by subject cannot reach the rows
   * where that subject's lookup broke — often the interesting ones.
   */
  it("a failed row has no subject to match, and says so by not matching", () => {
    assert.strictEqual(
      applyFilters(populated.entries, { ...noFilters, text: "alice" }).filter(
        (e) => e.evaluationId === "c",
      ).length,
      0,
    );
  });
});

describe("the environment and verdict segments", () => {
  it("narrows to one environment", () => {
    assert.deepStrictEqual(
      ids(applyFilters(populated.entries, { ...noFilters, environment: "Client" })),
      ["c", "ghost"],
    );
  });

  it("narrows to one verdict class", () => {
    assert.deepStrictEqual(ids(applyFilters(populated.entries, { ...noFilters, verdict: "Deny" })), [
      "b",
    ]);
  });

  // E5.2 — the vocabulary rule, seen through the filter.
  it("filtering by Error finds the failure and not the denial", () => {
    assert.deepStrictEqual(
      ids(applyFilters(populated.entries, { ...noFilters, verdict: "Error" })),
      ["c"],
    );
  });

  it("filtering by Unknown finds the orphan", () => {
    assert.deepStrictEqual(
      ids(applyFilters(populated.entries, { ...noFilters, verdict: "Unknown" })),
      ["ghost"],
    );
  });

  it("the three narrow together", () => {
    assert.deepStrictEqual(
      ids(
        applyFilters(populated.entries, {
          text: "c",
          environment: "Client",
          verdict: "Error",
        }),
      ),
      ["c"],
    );
    assert.deepStrictEqual(
      applyFilters(populated.entries, {
        text: "c",
        environment: "Server",
        verdict: "Error",
      }),
      [],
    );
  });
});

describe("environmentsOf", () => {
  it("lists what is present, in the order first seen", () => {
    assert.deepStrictEqual(environmentsOf(populated.entries), ["Server", "Client"]);
  });

  it("does not invent a fixed Server/Client pair", () => {
    const timeline = fold([
      allowRecord({ evaluationId: "a", at: 100, environment: "eu-west" }),
      allowRecord({ evaluationId: "b", at: 200, environment: "us-east" }),
      allowRecord({ evaluationId: "c", at: 300, environment: "eu-west" }),
    ]);

    assert.deepStrictEqual(environmentsOf(timeline.entries), ["eu-west", "us-east"]);
  });

  it("is empty for an empty timeline", () => {
    assert.deepStrictEqual(environmentsOf([]), []);
  });
});

describe("counts do not follow the filter", () => {
  // E5.1 — the load-bearing half.
  it("the header still reports every error while the view shows one row", () => {
    const filters = { ...noFilters, verdict: "Allow" } as const;
    const shown = applyFilters(populated.entries, filters);

    assert.strictEqual(shown.length, 1);
    // Counted from the timeline, not from `shown`.
    assert.deepStrictEqual(countsOf(populated.entries), {
      decisions: 3,
      allows: 1,
      denies: 1,
      errors: 1,
      orphans: 1,
    });
  });
});

describe("selection", () => {
  it("nothing selected is NoSelection", () => {
    assert.strictEqual(selectionOf(populated, undefined)._tag, "NoSelection");
  });

  it("a held key resolves to its row", () => {
    const key = entryKey(populated.entries[0] ?? fail());
    const selection = selectionOf(populated, key);

    assert.strictEqual(selection._tag, "Selected");
    if (selection._tag !== "Selected") return;
    assert.strictEqual(selection.entry.evaluationId, "a");
  });

  // E5.5
  it("survives a filter that would have hidden its row", () => {
    const key = entryKey(populated.entries[0] ?? fail());
    // The filter shows only the denial; the selection is still the allow.
    assert.strictEqual(applyFilters(populated.entries, { ...noFilters, verdict: "Deny" }).length, 1);
    assert.strictEqual(selectionOf(populated, key)._tag, "Selected");
  });

  // E5.6 — a distinct state, not a silent return to nothing.
  it("a row dropped by capacity becomes Evicted, naming what was lost", () => {
    const key = entryKey(populated.entries[0] ?? fail());
    const smaller = ingestAll(emptyTimeline({ capacity: 1 }), [
      decisionRecord({ evaluationId: "later", at: 900 }),
    ]);

    const selection = selectionOf(smaller, key);
    assert.strictEqual(selection._tag, "Evicted");
    if (selection._tag !== "Evicted") return;
    assert.strictEqual(selection.key, key);
  });

  it("follows a row through the arrival of its obligation outcome", () => {
    // Joining a duty builds a new entry, so a selection held by reference would
    // point at a row the log no longer contains.
    const before = fold([decisionRecord({ evaluationId: "ev-7", at: 100 })]);
    const key = entryKey(before.entries[0] ?? fail());

    const after = ingestAll(before, [obligationRecord({ evaluationId: "ev-7", at: 101 })]);
    const selection = selectionOf(after, key);

    assert.strictEqual(selection._tag, "Selected");
    if (selection._tag !== "Selected") return;
    assert.strictEqual(selection.entry._tag, "TimelineDecision");
    if (selection.entry._tag !== "TimelineDecision") return;
    assert.isDefined(selection.entry.obligations);
  });
});

describe("entryKey", () => {
  it("separates a server decision from its client re-check", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
      decisionRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
    ]);

    const [first, second] = timeline.entries;
    assert.notStrictEqual(entryKey(first ?? fail()), entryKey(second ?? fail()));
  });

  it("separates a decision from an orphan of the same evaluation and instant", () => {
    const decision = fold([decisionRecord({ evaluationId: "x", at: 100 })]).entries[0] ?? fail();
    const orphan = fold([obligationRecord({ evaluationId: "x", at: 100 })]).entries[0] ?? fail();

    assert.notStrictEqual(entryKey(decision), entryKey(orphan));
  });
});

const fail = (): never => {
  throw new Error("expected a timeline entry");
};
