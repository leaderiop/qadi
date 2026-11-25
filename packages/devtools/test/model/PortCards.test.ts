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
import { WiringRead } from "../../src/model/Diagnostics.ts";
import { CallsView, ServicesView, activityByPort, callsByPort, isPortName, portCards } from "../../src/model/PortCards.ts";
import type { PortCardRow, ServicesInput } from "../../src/model/PortCards.ts";
import type { PortCall, PortCallLog } from "../../src/model/PortCalls.ts";
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

const logOf = (calls: ReadonlyArray<PortCall>): PortCallLog => ({ calls, dropped: 0, capacity: 200 });

const attributeCall = (over?: Partial<Extract<PortCall, { _tag: "AttributeResolver" }>>) => ({
  _tag: "AttributeResolver" as const,
  span: "qadi.attribute",
  interpreter: undefined,
  at: 1_000,
  durationMillis: 1.25,
  subjectId: "alice",
  attribute: "clearance",
  resolved: true,
  ...over,
});

/** A row's calls, which must be a `Listed`; any other state fails the test where it is asked for. */
const listedOf = (view: ServicesView, port: string) => {
  const calls = rowFor(view, port).calls;
  if (calls._tag === "Listed") return calls;
  throw new Error(`expected ${port} to list calls, got ${calls._tag}`);
};

const textsOf = (view: ServicesView, port: string): ReadonlyArray<string> =>
  listedOf(view, port).calls.map((row) => row.text);

const signatureWiring: WiringReport = {
  ports: [
    {
      port: "SignatureHistory",
      name: undefined,
      required: true,
      present: true,
      defaulted: undefined,
      consequence: "denies",
    },
  ],
  cache: { present: false, size: undefined },
};

describe("portCards: recent calls", () => {
  // C4/C5 — the facts that were written on the span and never shown.
  it("a signature call says which resource it was about, or that it was about any", () => {
    const view = viewOf(signatureWiring, {
      portCalls: logOf([
        {
          _tag: "SignatureHistory",
          span: "qadi.hasSignature",
          at: 1,
          durationMillis: 0.1,
          meaning: "approve",
          scope: "Resource",
          resourceId: "doc-1",
          matched: true,
        },
        {
          _tag: "SignatureHistory",
          span: "qadi.hasSignature",
          at: 2,
          durationMillis: 0.1,
          meaning: "approve",
          scope: "Any",
          matched: false,
        },
      ]),
    });
    const texts = textsOf(view, "SignatureHistory");

    assert.isTrue(texts.some((t) => t.includes("approve on doc-1 → matched")));
    assert.isTrue(texts.some((t) => t.includes("approve anywhere → no match")));
  });

  it("a call that ran more than once says how many times", () => {
    const view = viewOf(wiring, {
      portCalls: logOf([
        attributeCall({ at: 1, attribute: "tier", attempts: 3 }),
        attributeCall({ at: 2, attribute: "level", attempts: 1 }),
      ]),
    });
    const texts = textsOf(view, "AttributeResolver");

    assert.isTrue(texts.some((t) => t === "tier → a value · 3 attempts"));
    assert.isFalse(texts.some((t) => t.includes("level") && t.includes("attempts")));
  });

  it("labels a call the translation made, and leaves the evaluator's unlabelled", () => {
    const view = viewOf(wiring, {
      portCalls: logOf([
        attributeCall({ interpreter: "toPredicate", attribute: "riskScore" }),
        attributeCall({ interpreter: "evaluate", attribute: "clearance", at: 2_000 }),
        attributeCall({ interpreter: undefined, attribute: "tier", at: 3_000 }),
      ]),
    });
    const labels = listedOf(view, "AttributeResolver").calls.map((row) => row.interpreter);

    // Newest first.
    assert.deepStrictEqual(labels, [undefined, undefined, "translation"]);
  });

  it("labels a read the host made to answer a remote asker", () => {
    const view = viewOf(wiring, {
      portCalls: logOf([
        attributeCall({ interpreter: "remote", attribute: "clearance" }),
        attributeCall({ interpreter: "evaluate", attribute: "tier", at: 2_000 }),
      ]),
    });
    const labels = listedOf(view, "AttributeResolver").calls.map((row) => row.interpreter);

    assert.deepStrictEqual(labels, [undefined, "served"]);
  });

  // E3.1 — a card with no list looks exactly like a port nothing asked.
  it("says what the detail would take when no collector is wired", () => {
    const view = viewOf(wiring);

    for (const row of rowsOf(view)) assert.strictEqual(row.calls._tag, "Uncollected");
  });

  it("puts each call under the port that made it", () => {
    const view = viewOf(wiring, {
      portCalls: logOf([
        attributeCall(),
        {
          _tag: "RelationshipResolver",
          span: "qadi.hasRelationship",
          interpreter: undefined,
          at: 1_001,
          durationMillis: 0.5,
          subjectId: "alice",
          relation: "owner",
          resourceId: "doc-1",
          depth: undefined,
          answer: "Related",
        },
      ]),
    });

    assert.deepStrictEqual(textsOf(view, "AttributeResolver"), ["clearance → a value"]);
    assert.deepStrictEqual(textsOf(view, "RelationshipResolver"), ["owner on doc-1 → Related"]);
  });

  it("says whether a value came back, and never what it was", () => {
    const view = viewOf(wiring, {
      portCalls: logOf([
        attributeCall({ attribute: "a", resolved: true }),
        attributeCall({ attribute: "b", resolved: false }),
        attributeCall({ attribute: "c", resolved: undefined }),
      ]),
    });

    // Newest first.
    assert.deepStrictEqual(textsOf(view, "AttributeResolver"), [
      "c → no answer",
      "b → nothing",
      "a → a value",
    ]);
  });

  it("reads an unrecorded field as not recorded, rather than blank", () => {
    const view = viewOf(wiring, { portCalls: logOf([attributeCall({ attribute: undefined })]) });

    assert.include(textsOf(view, "AttributeResolver")[0] ?? "", "not recorded");
  });

  // E2.4's rendered half: never a zero, which is a call that finished instantly.
  it("marks a call still in flight rather than timing it at zero", () => {
    const view = viewOf(wiring, { portCalls: logOf([attributeCall({ durationMillis: undefined })]) });

    assert.strictEqual(listedOf(view, "AttributeResolver").calls[0]?.duration, "in flight");
  });

  it("shows a handful and says how many it did not", () => {
    const view = viewOf(wiring, {
      portCalls: logOf(Array.from({ length: 8 }, (_, index) => attributeCall({ attribute: `a${index}` }))),
    });
    const listed = listedOf(view, "AttributeResolver");

    assert.strictEqual(listed.calls.length, 5);
    assert.strictEqual(listed.earlier, "and 3 earlier");
    assert.deepStrictEqual(
      listed.calls.map((row) => row.text),
      ["a7", "a6", "a5", "a4", "a3"].map((name) => `${name} → a value`),
    );
  });

  it("adds nothing to a port that was never called", () => {
    const view = viewOf(wiring, { portCalls: logOf([attributeCall()]) });

    assert.strictEqual(rowFor(view, "RelationshipResolver").calls._tag, "Hidden");
  });

  // E3.2 / E3.4 — the counts and the calls are differently scoped.
  it("keeps the counts and the calls apart in words", () => {
    const view = viewOf(wiring, {
      activity: [activity("AttributeResolver", 91)],
      portCalls: logOf([attributeCall()]),
    });
    const row = rowFor(view, "AttributeResolver");

    assert.include(row.activity, "91 calls");
    assert.strictEqual(listedOf(view, "AttributeResolver").calls.length, 1);
  });

  it("names the depth when one was asked, and says 'no answer' when none came back", () => {
    const view = viewOf(wiring, {
      portCalls: logOf([
        {
          _tag: "RelationshipResolver",
          span: "qadi.hasRelationship",
          interpreter: undefined,
          at: 1_002,
          durationMillis: 0.4,
          subjectId: "alice",
          relation: "member",
          resourceId: "team-1",
          depth: 2,
          answer: undefined,
        },
      ]),
    });
    const text = textsOf(view, "RelationshipResolver")[0] ?? "";

    assert.include(text, "(depth 2)");
    assert.include(text, "no answer");
  });

  it("describes CustomPredicate and SignatureHistory calls, recorded and not", () => {
    const customAndSignatureWiring: WiringReport = {
      ports: [
        {
          port: "CustomPredicate",
          name: "customPredicateFromRecord",
          required: false,
          present: true,
          defaulted: undefined,
          consequence: "an unregistered predicate name is an error, never a denial",
        },
        {
          port: "SignatureHistory",
          name: undefined,
          required: false,
          present: true,
          defaulted: undefined,
          consequence: "a hasSignature node is never compiled to a Predicate",
        },
      ],
      cache: { present: false, size: undefined },
    };
    const view = viewOf(customAndSignatureWiring, {
      portCalls: logOf([
        {
          _tag: "CustomPredicate",
          span: "qadi.hasCustom",
          interpreter: undefined,
          at: 1_003,
          durationMillis: 0.2,
          subjectId: "alice",
          name: "isBusinessHours",
          answer: true,
        },
        {
          _tag: "CustomPredicate",
          span: "qadi.hasCustom",
          interpreter: undefined,
          at: 1_004,
          durationMillis: 0.2,
          subjectId: "alice",
          name: undefined,
          answer: undefined,
        },
        {
          _tag: "SignatureHistory",
          span: "qadi.hasSignature",
          interpreter: undefined,
          at: 1_005,
          durationMillis: 0.3,
          subjectId: "alice",
          meaning: "approval",
          signerRole: "manager",
          matched: false,
        },
        {
          _tag: "SignatureHistory",
          span: "qadi.hasSignature",
          interpreter: undefined,
          at: 1_006,
          durationMillis: 0.3,
          subjectId: "alice",
          meaning: undefined,
          signerRole: undefined,
          matched: undefined,
        },
      ]),
    });

    assert.deepStrictEqual(textsOf(view, "CustomPredicate"), [
      "not recorded → no answer",
      "isBusinessHours → true",
    ]);
    assert.deepStrictEqual(textsOf(view, "SignatureHistory"), [
      "not recorded → no answer",
      "approval from a 'manager' → no match",
    ]);
  });
});

describe("portCards: the calls a row holds, by collection state", () => {
  it("no collector and sampled is Uncollected on every row, the non-port rows included", () => {
    const view = viewOf(wiring, { portCalls: undefined, unsampled: false });

    assert.deepStrictEqual(
      rowsOf(view).map((row) => row.calls._tag),
      ["Uncollected", "Uncollected", "Uncollected"],
    );
  });

  it("no collector and unsampled is Hidden on every row: the dock cannot tell whether one is configured", () => {
    const view = viewOf(wiring, { portCalls: undefined, unsampled: true });

    assert.deepStrictEqual(
      rowsOf(view).map((row) => row.calls._tag),
      ["Hidden", "Hidden", "Hidden"],
    );
  });

  it("a collector that saw nothing for a port is Hidden, and so is a non-port row", () => {
    const view = viewOf(wiring, { portCalls: logOf([attributeCall()]) });

    assert.strictEqual(rowFor(view, "AttributeResolver").calls._tag, "Listed");
    assert.strictEqual(rowFor(view, "RelationshipResolver").calls._tag, "Hidden");
    assert.strictEqual(rowFor(view, "DecisionCache").calls._tag, "Hidden");
  });

  it("an empty collector log is Hidden on every row", () => {
    const view = viewOf(wiring, { portCalls: logOf([]) });

    for (const row of rowsOf(view)) assert.strictEqual(row.calls._tag, "Hidden");
  });

  it("a collector while unsampled still lists what it holds", () => {
    const view = viewOf(wiring, { portCalls: logOf([attributeCall()]), unsampled: true });

    assert.strictEqual(listedOf(view, "AttributeResolver").calls.length, 1);
  });

  it("a call for a port with no card is shown nowhere", () => {
    const view = viewOf(wiring, {
      portCalls: logOf([{ ...attributeCall(), _tag: "SignatureHistory", span: "qadi.hasSignature" }]),
    });

    for (const row of rowsOf(view)) assert.strictEqual(row.calls._tag, "Hidden");
  });
});

describe("portCards: the overflow threshold and the form of a call row", () => {
  const calls = (n: number) =>
    logOf(Array.from({ length: n }, (_, index) => attributeCall({ attribute: `a${index}`, at: index })));

  it("exactly five calls list all five and say nothing of earlier ones", () => {
    const listed = listedOf(viewOf(wiring, { portCalls: calls(5) }), "AttributeResolver");

    assert.strictEqual(listed.calls.length, 5);
    assert.isUndefined(listed.earlier);
  });

  it("six calls say 'and 1 earlier'", () => {
    const listed = listedOf(viewOf(wiring, { portCalls: calls(6) }), "AttributeResolver");

    assert.strictEqual(listed.calls.length, 5);
    assert.strictEqual(listed.earlier, "and 1 earlier");
  });

  it("eight calls show the newest five in reverse log order and say 'and 3 earlier'", () => {
    const listed = listedOf(viewOf(wiring, { portCalls: calls(8) }), "AttributeResolver");

    assert.deepStrictEqual(
      listed.calls.map((row) => row.text),
      ["a7", "a6", "a5", "a4", "a3"].map((name) => `${name} → a value`),
    );
    assert.strictEqual(listed.earlier, "and 3 earlier");
  });

  it("one attempt adds no suffix and two add ' · 2 attempts'", () => {
    const view = viewOf(wiring, {
      portCalls: logOf([attributeCall({ attempts: 1 }), attributeCall({ attempts: 2, at: 2 })]),
    });

    assert.deepStrictEqual(textsOf(view, "AttributeResolver"), [
      "clearance → a value · 2 attempts",
      "clearance → a value",
    ]);
  });

  it("an unrecorded attempts count adds no suffix", () => {
    const view = viewOf(wiring, { portCalls: logOf([attributeCall({ attempts: undefined })]) });

    assert.deepStrictEqual(textsOf(view, "AttributeResolver"), ["clearance → a value"]);
  });

  it("durations are Number.prototype.toFixed(1), and an unfinished call is never a zero", () => {
    const durations = [0, 12.34, 1.25, undefined].map(
      (durationMillis, index) => attributeCall({ durationMillis, at: index }),
    );
    const view = viewOf(wiring, { portCalls: logOf(durations) });

    // Newest first.
    assert.deepStrictEqual(
      listedOf(view, "AttributeResolver").calls.map((row) => row.duration),
      ["in flight", `${(1.25).toFixed(1)} ms`, "12.3 ms", "0.0 ms"],
    );
    assert.strictEqual((1.25).toFixed(1), "1.3");
  });

  it("only the translation and a remote answer are labelled; evaluate and unrecorded are not", () => {
    const view = viewOf(wiring, {
      portCalls: logOf(
        (["toPredicate", "remote", "evaluate", undefined] as const).map((interpreter, index) =>
          attributeCall({ interpreter, at: index }),
        ),
      ),
    });

    assert.deepStrictEqual(
      listedOf(view, "AttributeResolver").calls.map((row) => row.interpreter),
      [undefined, undefined, "served", "translation"],
    );
  });

  it("the React key is the span, the start time and the text", () => {
    const view = viewOf(wiring, { portCalls: logOf([attributeCall({ at: 7, attempts: 2 })]) });

    assert.strictEqual(
      listedOf(view, "AttributeResolver").calls[0]?.key,
      "qadi.attribute-7-clearance → a value · 2 attempts",
    );
  });

  it("CallsView.Hidden and Uncollected carry nothing", () => {
    assert.isTrue(CallsView.$is("Hidden")(CallsView.Hidden()));
    assert.isTrue(CallsView.$is("Uncollected")(CallsView.Uncollected()));
  });
});

describe("callsByPort", () => {
  it("keys exactly the registry's five ports, in its order, each empty for an empty log", () => {
    const grouped = callsByPort(logOf([]));

    assert.deepStrictEqual(Object.keys(grouped), [...forEveryPort((d) => d.port)]);
    for (const port of forEveryPort((d) => d.port)) assert.deepStrictEqual(grouped[port], []);
  });

  it("keeps log order within a port and gives a port no call reached an empty list", () => {
    const first = attributeCall({ attribute: "a", at: 1 });
    const second = attributeCall({ attribute: "b", at: 2 });
    const other: PortCall = { ...attributeCall(), _tag: "SignatureHistory", span: "qadi.hasSignature" };
    const grouped = callsByPort(logOf([first, other, second]));

    assert.deepStrictEqual(grouped.AttributeResolver, [first, second]);
    assert.deepStrictEqual(grouped.SignatureHistory, [other]);
    assert.deepStrictEqual(grouped.DecisionHistory, []);
  });

  it("never reads a call whose tag is a word every object inherits", () => {
    // A span is decoded from `unknown`; assign the word at runtime so the type needs no cast.
    const hostile: PortCall = Object.assign(attributeCall(), { _tag: "__proto__" });
    const grouped = callsByPort(logOf([hostile]));

    assert.deepStrictEqual(Object.keys(grouped), [...forEveryPort((d) => d.port)]);
    for (const port of forEveryPort((d) => d.port)) assert.deepStrictEqual(grouped[port], []);
  });
});

/** One port's report, as the base's reading test wrote it: the card's own words are not what these rows read. */
const readingReportFor = (port: PortCall["_tag"]): WiringReport => ({
  ports: [{ port, name: "x", required: true, present: true, defaulted: false, consequence: "c" }],
  cache: { present: false, size: undefined },
});

const base = { span: "s", at: 1, durationMillis: 1, subjectId: "alice" };

/** Every call-row reading, exactly: [call, the sentence the row reads]. Copied as data from `ServicesPanel.reading.test.tsx`. */
const READINGS: ReadonlyArray<readonly [PortCall, string]> = [
  [{ ...base, _tag: "AttributeResolver", attribute: "clearance", resolved: true }, "clearance → a value"],
  [{ ...base, _tag: "AttributeResolver", attribute: "clearance", resolved: false }, "clearance → nothing"],
  [{ ...base, _tag: "AttributeResolver" }, "not recorded → no answer"],
  [
    { ...base, _tag: "DecisionHistory", event: "approved", resourceId: "doc-1", answer: "Acted" },
    "approved on doc-1 → Acted",
  ],
  [
    { ...base, _tag: "DecisionHistory", event: "approved", answer: "NotActed" },
    "approved anywhere → NotActed",
  ],
  [{ ...base, _tag: "DecisionHistory" }, "not recorded anywhere → no answer"],
  [
    {
      ...base,
      _tag: "RelationshipResolver",
      relation: "member",
      resourceId: "team-1",
      depth: 2,
      answer: "Related",
    },
    "member on team-1 (depth 2) → Related",
  ],
  [
    { ...base, _tag: "RelationshipResolver", relation: "member", resourceId: "team-1", answer: "Unrelated" },
    "member on team-1 → Unrelated",
  ],
  [{ ...base, _tag: "RelationshipResolver" }, "not recorded on no resource → no answer"],
  [{ ...base, _tag: "CustomPredicate", name: "isBusinessHours", answer: true }, "isBusinessHours → true"],
  [{ ...base, _tag: "CustomPredicate", name: "p", answer: false }, "p → false"],
  [{ ...base, _tag: "CustomPredicate" }, "not recorded → no answer"],
  [
    {
      ...base,
      _tag: "SignatureHistory",
      meaning: "approval",
      signerRole: "manager",
      resourceId: "doc-1",
      matched: true,
    },
    "approval from a 'manager' on doc-1 → matched",
  ],
  [
    { ...base, _tag: "SignatureHistory", meaning: "approval", scope: "Any", matched: false },
    "approval anywhere → no match",
  ],
  [
    {
      ...base,
      _tag: "SignatureHistory",
      meaning: "approval",
      signerRole: "manager",
      scope: "Any",
      matched: true,
    },
    "approval from a 'manager' anywhere → matched",
  ],
  [{ ...base, _tag: "SignatureHistory", meaning: "approval", scope: "Resource" }, "approval → no answer"],
  [{ ...base, _tag: "SignatureHistory" }, "not recorded → no answer"],
  [
    { ...base, _tag: "AttributeResolver", attribute: "a", resolved: true, attempts: 2 },
    "a → a value · 2 attempts",
  ],
  [{ ...base, _tag: "AttributeResolver", attribute: "a", resolved: true, attempts: 1 }, "a → a value"],
  [
    {
      ...base,
      _tag: "DecisionHistory",
      event: "approved",
      resourceId: "doc-1",
      answer: "Acted",
      attempts: 3,
    },
    "approved on doc-1 → Acted · 3 attempts",
  ],
];

describe("call rows read exactly as on the base", () => {
  for (const [call, expected] of READINGS) {
    it(`${call._tag}: ${expected}`, () => {
      const view = viewOf(readingReportFor(call._tag), { portCalls: logOf([call]) });

      assert.strictEqual(listedOf(view, call._tag).calls[0]?.text, expected);
    });
  }
});
