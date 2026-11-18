/**
 * The Services tab's port cards as one model function, tested with no DOM (ARCH-102, CARD-02, CARD-03).
 *
 * The first group is the headless twin of `ServicesPanel.test.tsx`'s card cases, with the
 * titles kept so a reader can lay the two side by side; the second is the twin of
 * `ServicesPanel.reading.test.tsx`'s real-report cases. Fields are asserted one at a time,
 * never a whole row, so a row gaining a field edits no line written here.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import {
  AttributeResolverNone,
  attributeResolverFromRecord,
  attributeResolverRetrying,
  forEveryPort,
} from "@qadi/core";
import { WiringRead } from "../../src/model/DiagnosticsStore.ts";
import { ServicesView, activityByPort, isPortName, portCards } from "../../src/model/PortCards.ts";
import type { PortCardRow, ServicesInput } from "../../src/model/PortCards.ts";
import { wiringReport } from "../../src/model/Wiring.ts";
import type { PortActivity, WiringReport } from "../../src/model/Wiring.ts";

const wiring: WiringReport = {
  ports: [
    {
      port: "AttributeResolver",
      name: "attributeResolverFromRecord",
      required: true,
      present: true,
      defaulted: undefined,
      consequence: "a missing attribute resolves to undefined, so an attribute policy denies",
    },
    {
      port: "RelationshipResolver",
      name: undefined,
      required: true,
      present: true,
      defaulted: undefined,
      consequence: "an unanswered relationship denies",
    },
    {
      port: "DecisionCache",
      name: undefined,
      required: false,
      present: false,
      defaulted: undefined,
      consequence: "every evaluation is computed",
    },
  ],
  cache: { present: false, size: undefined },
};

/** One port's report, as the wiring read states it. */
const reportFor = (
  over: Partial<WiringReport["ports"][number]>,
): WiringReport => ({
  ports: [
    {
      port: "AttributeResolver",
      name: "attributeResolverFromRecord",
      required: true,
      present: true,
      defaulted: undefined,
      consequence: "a missing attribute resolves to undefined, so an attribute policy denies",
      ...over,
    },
  ],
  cache: { present: false, size: undefined },
});

const inputOf = (report: WiringReport, over: Partial<ServicesInput> = {}): ServicesInput => ({
  wiring: WiringRead.Read({ report }),
  activity: [],
  portCalls: undefined,
  unsampled: false,
  ...over,
});

const viewOf = (report: WiringReport, over: Partial<ServicesInput> = {}): ServicesView =>
  portCards(inputOf(report, over));

/** The rows of a `Read` view; any other view fails the test where it is asked for them. */
const rowsOf = (view: ServicesView): ReadonlyArray<PortCardRow> => {
  if (view._tag === "Read") return view.rows;
  throw new Error(`expected a Read view, got ${view._tag}`);
};

const cacheOf = (view: ServicesView): string => {
  if (view._tag === "Read") return view.cache;
  throw new Error(`expected a Read view, got ${view._tag}`);
};

const rowFor = (view: ServicesView, port: string): PortCardRow => {
  const found = rowsOf(view).find((row) => row.port === port);
  if (found === undefined) throw new Error(`no row for ${port}`);
  return found;
};

const activity = (
  port: PortActivity["port"],
  calls: number,
  over: Partial<PortActivity> = {},
): PortActivity => ({ port, calls, retries: 0, timeouts: 0, translationCalls: 0, ...over });

const WARNING_COST = "a missing attribute resolves to undefined, so an attribute policy denies";

describe("portCards: the wiring states", () => {
  it("a layer that was never handed is Withheld while unsampled and NotHanded once sampled", () => {
    assert.strictEqual(portCards({ wiring: WiringRead.NotHanded(), activity: [], portCalls: undefined, unsampled: true })._tag, "Withheld");
    assert.strictEqual(portCards({ wiring: WiringRead.NotHanded(), activity: [], portCalls: undefined, unsampled: false })._tag, "NotHanded");
  });

  it("a layer that failed to build is Failed with its reason, sampled or not", () => {
    for (const unsampled of [true, false]) {
      const view = portCards({
        wiring: WiringRead.Failed({ reason: "boom" }),
        activity: [],
        portCalls: undefined,
        unsampled,
      });
      assert.strictEqual(view._tag, "Failed");
      assert.strictEqual(view._tag === "Failed" ? view.reason : undefined, "boom");
    }
  });

  // E4.6
  it("with no layer handed to it, still renders the metrics and says why the rest is missing", () => {
    const view = portCards({ wiring: WiringRead.NotHanded(), activity: [], portCalls: undefined, unsampled: false });

    assert.isFalse(ServicesView.$is("Read")(view));
    assert.strictEqual(view._tag, "NotHanded");
  });
});

describe("portCards: the rows", () => {
  // E4.1
  it("names a wired implementation", () => {
    assert.strictEqual(rowFor(viewOf(wiring), "AttributeResolver").state, "attributeResolverFromRecord");
  });

  // E4.2
  it("an unnamed but present port says 'wired, unnamed', never 'unwired'", () => {
    const row = rowFor(viewOf(wiring), "RelationshipResolver");

    assert.strictEqual(row.state, "wired, unnamed");
    assert.notInclude(row.state, "unwired");
  });

  // E4.3
  it("never uses the word 'unwired' anywhere", () => {
    for (const row of rowsOf(viewOf(wiring))) {
      for (const word of [row.state, row.activity, row.consequence]) assert.notInclude(word, "unwired");
    }
  });

  it("states what being defaulted costs", () => {
    assert.include(rowFor(viewOf(wiring), "AttributeResolver").consequence, "an attribute policy denies");
  });

  // C7
  it("a defaulted port says so, in the warning tone, with its cost", () => {
    const row = rowFor(viewOf(reportFor({ name: "AttributeResolverNone", defaulted: true })), "AttributeResolver");

    assert.strictEqual(row.defaulted, "true");
    assert.strictEqual(row.state, "defaulted — AttributeResolverNone");
    assert.strictEqual(row.tone, "Warning");
    assert.strictEqual(row.consequence, WARNING_COST);
    assert.notInclude(row.consequence, "if defaulted");
  });

  it("a defaulted port with no name still says it is defaulted", () => {
    const row = rowFor(viewOf(reportFor({ name: undefined, defaulted: true })), "AttributeResolver");

    assert.strictEqual(row.defaulted, "true");
    assert.strictEqual(row.state, "defaulted — unnamed");
  });

  it("a wired port says what being defaulted would cost, as a condition", () => {
    const row = rowFor(viewOf(reportFor({ defaulted: false })), "AttributeResolver");

    assert.strictEqual(row.defaulted, "false");
    assert.strictEqual(row.state, "attributeResolverFromRecord");
    assert.strictEqual(row.tone, "Plain");
    assert.strictEqual(row.consequence, `if defaulted: ${WARNING_COST}`);
  });

  it("says nothing about defaulting for a row that is not a port", () => {
    const row = rowFor(viewOf(wiring), "DecisionCache");

    assert.isUndefined(row.defaulted);
    assert.strictEqual(row.tone, "Plain");
    assert.strictEqual(row.consequence, "every evaluation is computed");
  });

  it("a port that is absent says so, by what it is required to be", () => {
    assert.strictEqual(rowFor(viewOf(wiring), "DecisionCache").state, "absent");
    assert.strictEqual(
      rowFor(viewOf(reportFor({ present: false, name: undefined })), "AttributeResolver").state,
      "not provided to this reader",
    );
  });

  it("rows follow the report's order", () => {
    assert.deepStrictEqual(
      rowsOf(viewOf(wiring)).map((row) => row.port),
      wiring.ports.map((one) => one.port),
    );
  });

  // E4.7
  it("distinguishes a port never called from one that is absent", () => {
    const view = viewOf(wiring, { activity: [activity("AttributeResolver", 12, { retries: 2 })] });

    assert.strictEqual(rowFor(view, "AttributeResolver").activity, "12 calls · 2 retried");
    assert.strictEqual(rowFor(view, "RelationshipResolver").activity, "never called");
    assert.strictEqual(rowFor(view, "DecisionCache").state, "absent");
  });

  it("does not mention retries when there were none", () => {
    const view = viewOf(wiring, { activity: [activity("AttributeResolver", 1)] });

    assert.strictEqual(rowFor(view, "AttributeResolver").activity, "1 call");
  });

  it("shows the timeouts beside the retries", () => {
    const view = viewOf(wiring, { activity: [activity("AttributeResolver", 3, { retries: 2, timeouts: 1 })] });

    assert.strictEqual(rowFor(view, "AttributeResolver").activity, "3 calls · 2 retried · 1 timed out");
  });

  it("counts the translation's calls beside the evaluator's", () => {
    const view = viewOf(wiring, { activity: [activity("AttributeResolver", 2, { translationCalls: 3 })] });

    assert.strictEqual(rowFor(view, "AttributeResolver").activity, "2 calls · 3 from translation");
  });

  it("reads the suffixes in the order translation, retried, timed out", () => {
    const view = viewOf(wiring, {
      activity: [activity("AttributeResolver", 4, { retries: 2, timeouts: 1, translationCalls: 3 })],
    });

    assert.strictEqual(
      rowFor(view, "AttributeResolver").activity,
      "4 calls · 3 from translation · 2 retried · 1 timed out",
    );
  });

  it("an unsampled, empty list says no reading was taken, never 'never called'", () => {
    const view = viewOf(wiring, { unsampled: true });

    for (const row of rowsOf(view)) assert.strictEqual(row.activity, "no activity reading");
  });

  it("an unsampled list that holds an entry reads 'never called' for a port without one", () => {
    const view = viewOf(wiring, { unsampled: true, activity: [activity("AttributeResolver", 2)] });

    assert.strictEqual(rowFor(view, "AttributeResolver").activity, "2 calls");
    assert.strictEqual(rowFor(view, "RelationshipResolver").activity, "never called");
    assert.strictEqual(rowFor(view, "DecisionCache").activity, "never called");
  });

  it("the first of two entries for a port is the one shown", () => {
    const view = viewOf(wiring, {
      activity: [activity("AttributeResolver", 1), activity("AttributeResolver", 5)],
    });

    assert.strictEqual(rowFor(view, "AttributeResolver").activity, "1 call");
  });

  it("calls for two different ports land on their own cards", () => {
    const view = viewOf(wiring, {
      activity: [activity("RelationshipResolver", 7), activity("AttributeResolver", 2)],
    });

    assert.strictEqual(rowFor(view, "AttributeResolver").activity, "2 calls");
    assert.strictEqual(rowFor(view, "RelationshipResolver").activity, "7 calls");
  });
});

describe("portCards: the cache", () => {
  // E4.4
  it("an absent cache says absent", () => {
    assert.strictEqual(cacheOf(viewOf(wiring)), "absent");
  });

  // E4.9
  it("a wired cache reports its completed entries", () => {
    assert.strictEqual(cacheOf(viewOf({ ...wiring, cache: { present: true, size: 7 } })), "7 completed entries");
  });

  it("a present cache with no size reads 0 completed entries", () => {
    assert.strictEqual(cacheOf(viewOf({ ...wiring, cache: { present: true, size: undefined } })), "0 completed entries");
  });
});

describe("isPortName and activityByPort", () => {
  it("holds for the five registry ports and none of the four other wired services", () => {
    for (const port of forEveryPort((d) => d.port)) assert.isTrue(isPortName(port));
    for (const other of ["EvaluationId", "CurrentSubject", "DecisionCache", "DecisionSink"] as const) {
      assert.isFalse(isPortName(other));
    }
  });

  it("keys exactly the registry's five ports, in its order, each undefined for an empty list", () => {
    const grouped = activityByPort([]);

    assert.deepStrictEqual(Object.keys(grouped), [...forEveryPort((d) => d.port)]);
    for (const port of forEveryPort((d) => d.port)) assert.isUndefined(grouped[port]);
  });

  it("keeps the first entry of a port, and each port's own", () => {
    const first = activity("AttributeResolver", 1);
    const second = activity("AttributeResolver", 5);
    const other = activity("SignatureHistory", 2);
    const grouped = activityByPort([first, second, other]);

    assert.strictEqual(grouped.AttributeResolver, first);
    assert.strictEqual(grouped.SignatureHistory, other);
    assert.isUndefined(grouped.DecisionHistory);
  });

  it("is in the registry's order whatever order the ports were reached in", () => {
    const grouped = activityByPort([activity("SignatureHistory", 1), activity("AttributeResolver", 1)]);

    assert.deepStrictEqual(Object.keys(grouped), [...forEveryPort((d) => d.port)]);
  });
});

const ATTRIBUTE_CONSEQUENCE =
  "a missing attribute resolves to undefined, so an attribute policy denies";

describe("the four rows that are not ports, from the real wiring report", () => {
  it.effect("read 'never called' and carry no defaulted", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const view = viewOf(report, { activity: [activity("AttributeResolver", 1)] });

      for (const name of ["EvaluationId", "CurrentSubject", "DecisionCache", "DecisionSink"]) {
        const row = rowFor(view, name);
        assert.strictEqual(row.activity, "never called");
        assert.isUndefined(row.defaulted);
      }
    }));
});

describe("the consequence line and the card, from the real wiring report", () => {
  it.effect("a retried default renders as defaulted", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const row = rowFor(viewOf(report), "AttributeResolver");

      assert.strictEqual(row.defaulted, "true");
      assert.strictEqual(row.state, "defaulted — AttributeResolverNone (retrying)");
      assert.strictEqual(row.consequence, ATTRIBUTE_CONSEQUENCE);
    }).pipe(Effect.provide(attributeResolverRetrying(Schedule.recurs(1))(AttributeResolverNone))));

  it.effect("a real adapter renders its name and the conditional consequence", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const row = rowFor(viewOf(report), "AttributeResolver");

      assert.strictEqual(row.defaulted, "false");
      assert.strictEqual(row.state, "attributeResolverFromRecord");
      assert.strictEqual(row.consequence, `if defaulted: ${ATTRIBUTE_CONSEQUENCE}`);
    }).pipe(Effect.provide(attributeResolverFromRecord({}))));

  it.effect("an absent port says so and carries no defaulted attribute", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const row = rowFor(viewOf(report), "AttributeResolver");

      assert.isUndefined(row.defaulted);
      assert.strictEqual(row.state, "not provided to this reader");
      assert.strictEqual(row.consequence, ATTRIBUTE_CONSEQUENCE);
    }));
});
