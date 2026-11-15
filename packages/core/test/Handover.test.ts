/**
 * Pins the one rule every enforcing entry point keeps: the resource decided on is the value handed over.
 *
 * ADR-QD-104 and INV-QD-108: an enforcing call either decides against the very
 * value it releases, or against none, and it never evaluates one record while
 * releasing another. Ten entry points enforce (`assert`, `enforce`,
 * `enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard`,
 * `filter`, `filterStream`, `filterProjected`, `filterStreamProjected`), and
 * this file reaches all of them through the public `Qadi.*` surface only: the
 * module that will sit behind them is package-private (ADR-QD-099), so a test
 * that imported it would pin its shape rather than the behaviour it keeps.
 *
 * The environment is core's own `testLayer` plus a recording `DecisionSink`, not
 * the testing package's `qadiTestLayer`: that package depends on core, so a core
 * test importing it is a dependency cycle (`helpers.ts`).
 *
 * Every case is green on the base and stays green after the move except the one
 * named defect case in the last describe, `enforceProjected ignores a smuggled
 * resource and decides with none`, which the move closes.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import type * as Tracer from "effect/Tracer";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { DecisionSink } from "../src/DecisionSink.ts";
import type { EnforcementError } from "../src/Errors.ts";
import type { EvaluationServices } from "../src/EvaluationServices.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import type { Policy } from "../src/Policy.ts";
import * as Qadi from "../src/Qadi.ts";
import { collectingTracer, subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const log = obligation("log-access", { channel: "audit" });

const owner = subjectWith({ id: "u1", permissions: ["doc:read"] });
const stranger = subjectWith({ id: "u2" });

const record = { id: "d1", ownerId: "u1", secret: "S" };
const narrowedRecord = { id: "d1", ownerId: "u1" };

const ownedByMe = P.hasResourceAttribute("ownerId", M.eq(M.subjectId()));
const seesIdAndOwner = P.hasPermission(read, { fields: ["id", "ownerId"] });
const ownedAndNarrowed = P.allOf([ownedByMe, seesIdAndOwner]);

/**
 * A recording sink, and an `events` log the handler writes `"O"` to and the
 * guarded work (a loader, an `enforce` body, `guard`'s handler) writes `"W"` to.
 */
const harness = () => {
  const events: Array<string> = [];
  const rows: Array<SinkRecord> = [];
  const sink = Layer.succeed(DecisionSink, {
    record: (row) => Effect.sync(() => void rows.push(row)),
  });
  const options = (handler: boolean): { readonly onObligations?: Qadi.ObligationHandler } =>
    handler ? { onObligations: () => Effect.sync(() => void events.push("O")) } : {};
  const work = <A>(value: A) =>
    Effect.sync(() => {
      events.push("W");
      return value;
    });
  return { events, rows, sink, options, work };
};
type Harness = ReturnType<typeof harness>;

const decisionRows = (rows: ReadonlyArray<SinkRecord>) => {
  const out = [];
  for (const row of rows) if (row._tag === "Decision") out.push(row);
  return out;
};
const obligationRows = (rows: ReadonlyArray<SinkRecord>) => {
  const out = [];
  for (const row of rows) if (row._tag === "Obligations") out.push(row);
  return out;
};

interface Row {
  readonly entry: string;
  /** What the policy is written against: the entry point decides with it. */
  readonly policy: Policy;
  /** The `Decision` record carries the handed-over value, or no `resource` key at all. */
  readonly handed: "the value" | "none";
  /** The events of an allow with a handler, in order. */
  readonly order: ReadonlyArray<string>;
  /** The loaded pair runs its loader before the decision (ADR-QD-104). */
  readonly loaderFirst: boolean;
  readonly run: (
    h: Harness,
    policy: Policy,
    handler: boolean,
  ) => Effect.Effect<unknown, EnforcementError, EvaluationServices>;
  readonly released: (out: unknown) => void;
}

const sameReference = (out: unknown) => assert.strictEqual(out, record);
const withoutSecret = (out: unknown) => {
  assert.deepStrictEqual(out, narrowedRecord);
  assert.notStrictEqual(out, record);
};

const rows: ReadonlyArray<Row> = [
  {
    entry: "assert",
    policy: ownedByMe,
    handed: "the value",
    order: ["O"],
    loaderFirst: false,
    run: (h, policy, handler) =>
      Qadi.assert(policy, { resource: record, ...h.options(handler) }),
    released: (out) => assert.isUndefined(out),
  },
  {
    entry: "enforce",
    policy: ownedByMe,
    handed: "the value",
    order: ["O", "W"],
    loaderFirst: false,
    run: (h, policy, handler) =>
      h.work("payload").pipe(Qadi.enforce(policy, { resource: record, ...h.options(handler) })),
    released: (out) => assert.strictEqual(out, "payload"),
  },
  {
    entry: "enforceProjected",
    policy: seesIdAndOwner,
    handed: "none",
    order: ["O", "W"],
    loaderFirst: false,
    run: (h, policy, handler) =>
      h.work(record).pipe(Qadi.enforceProjected(policy, h.options(handler))),
    released: withoutSecret,
  },
  {
    entry: "enforceLoaded",
    policy: ownedByMe,
    handed: "the value",
    order: ["W", "O"],
    loaderFirst: true,
    run: (h, policy, handler) =>
      h.work(record).pipe(Qadi.enforceLoaded(policy, h.options(handler))),
    released: sameReference,
  },
  {
    entry: "enforceProjectedLoaded",
    policy: ownedAndNarrowed,
    handed: "the value",
    order: ["W", "O"],
    loaderFirst: true,
    run: (h, policy, handler) =>
      h.work(record).pipe(Qadi.enforceProjectedLoaded(policy, h.options(handler))),
    released: withoutSecret,
  },
  {
    entry: "guard",
    policy: ownedByMe,
    handed: "the value",
    order: ["O", "W"],
    loaderFirst: false,
    run: (h, policy, handler) =>
      Qadi.guard(read, policy, h.options(handler))(record, (_authorized, resource) =>
        h.work(resource),
      ),
    released: sameReference,
  },
];

const exercise = (row: Row, h: Harness, policy: Policy, handler: boolean, who: typeof owner) =>
  Effect.result(row.run(h, policy, handler)).pipe(
    Effect.provide(Layer.mergeAll(testLayer(who), h.sink)),
  );

describe("the resource decided on is the value handed over: effect shapes", () => {
  for (const row of rows) {
    const policy = P.obliged(log, row.policy);

    it.effect(`${row.entry}: an allow decides on ${row.handed} and releases the decided value`, () =>
      Effect.gen(function* () {
        const h = harness();
        const result = yield* exercise(row, h, policy, true, owner);
        assert.isTrue(Result.isSuccess(result));
        if (!Result.isSuccess(result)) return;

        row.released(result.success);
        assert.deepStrictEqual(h.events, row.order);

        const [decision, ...extra] = decisionRows(h.rows);
        assert.strictEqual(extra.length, 0);
        assert.isTrue(
          decision?.outcome._tag === "Decided" && decision.outcome.decision._tag === "Allow",
        );
        if (decision === undefined) return;
        if (row.handed === "none") assert.isFalse(Object.hasOwn(decision, "resource"));
        else assert.deepStrictEqual(decision.resource, record);

        assert.deepStrictEqual(
          obligationRows(h.rows).map((o) => o.outcome),
          ["Discharged"],
        );
      }));

    it.effect(`${row.entry}: a denial hands nothing over`, () =>
      Effect.gen(function* () {
        const h = harness();
        const result = yield* exercise(row, h, policy, true, stranger);
        assert.isTrue(Result.isFailure(result));
        if (!Result.isFailure(result)) return;

        const failure = result.failure;
        if (failure._tag !== "AccessDenied") return assert.fail(`expected AccessDenied, got ${failure._tag}`);
        assert.strictEqual(failure.policyTag, policy._tag);
        // No handler, and no work: the loaded pair's loader is the one thing that
        // runs, because it is the decision's input (ADR-QD-104).
        assert.deepStrictEqual(h.events, row.loaderFirst ? ["W"] : []);
        assert.strictEqual(obligationRows(h.rows).length, 0);
      }));

    it.effect(`${row.entry}: a binding obligation with no handler is refused before the handover`, () =>
      Effect.gen(function* () {
        const h = harness();
        const result = yield* exercise(row, h, policy, false, owner);
        assert.isTrue(Result.isFailure(result));
        if (!Result.isFailure(result)) return;

        assert.strictEqual(result.failure._tag, "UndischargedObligation");
        assert.deepStrictEqual(h.events, row.loaderFirst ? ["W"] : []);
        assert.deepStrictEqual(
          obligationRows(h.rows).map((o) => o.outcome),
          ["Refused"],
        );
      }));
  }
});

describe("the spans one enforcing call opens", () => {
  const namesOf = (
    effect: Effect.Effect<unknown, EnforcementError, EvaluationServices>,
    who: typeof owner,
  ) =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* Effect.result(effect).pipe(
        Effect.provide(Layer.mergeAll(testLayer(who), collectingTracer(spans))),
      );
      return spans.map((span) => span.name);
    });

  const canRead = P.hasPermission(read);
  const handled = { onObligations: () => Effect.void };

  it.effect("an allow with no obligations opens evaluate and discharge", () =>
    Effect.gen(function* () {
      const names = yield* namesOf(Effect.void.pipe(Qadi.enforce(canRead)), owner);
      assert.deepStrictEqual(names, ["qadi.evaluate", "qadi.discharge"]);
    }));

  it.effect("an allow with an obligation and a handler opens evaluate and discharge", () =>
    Effect.gen(function* () {
      const names = yield* namesOf(
        Effect.void.pipe(Qadi.enforce(P.obliged(log, canRead), handled)),
        owner,
      );
      assert.deepStrictEqual(names, ["qadi.evaluate", "qadi.discharge"]);
    }));

  it.effect("a binding obligation with no handler opens evaluate and discharge, then fails", () =>
    Effect.gen(function* () {
      const names = yield* namesOf(
        Effect.void.pipe(Qadi.enforce(P.obliged(log, canRead))),
        owner,
      );
      assert.deepStrictEqual(names, ["qadi.evaluate", "qadi.discharge"]);
    }));

  it.effect("a denial opens evaluate and nothing else", () =>
    Effect.gen(function* () {
      const names = yield* namesOf(Effect.void.pipe(Qadi.enforce(canRead)), stranger);
      assert.deepStrictEqual(names, ["qadi.evaluate"]);
    }));

  it.effect("guard opens the same two spans as enforce", () =>
    Effect.gen(function* () {
      const names = yield* namesOf(
        Qadi.guard(read, canRead)(record, () => Effect.void),
        owner,
      );
      assert.deepStrictEqual(names, ["qadi.evaluate", "qadi.discharge"]);
    }));
});

// A type alias, not an interface: only an alias is assignable to `Resource`'s index signature.
type Item = {
  readonly id: string;
  readonly ownerId: string;
  readonly kind: string;
  readonly secret: string;
};

const a: Item = { id: "a", ownerId: "u1", kind: "x", secret: "S1" };
const b: Item = { id: "b", ownerId: "u2", kind: "x", secret: "S2" };
const c: Item = { id: "c", ownerId: "u1", kind: "y", secret: "S3" };
const batch: ReadonlyArray<Item> = [a, b, c];

/** Admits what the subject owns, and narrows kind `x` and kind `y` differently. */
const byKind = P.anyOf([
  P.allOf([
    ownedByMe,
    P.hasResourceAttribute("kind", M.eq(M.literal("x"))),
    P.hasPermission(read, { fields: ["id", "ownerId", "kind"] }),
  ]),
  P.allOf([
    ownedByMe,
    P.hasResourceAttribute("kind", M.eq(M.literal("y"))),
    P.hasPermission(read, { fields: ["id", "kind"] }),
  ]),
]);

interface Collection {
  readonly name: string;
  readonly projected: boolean;
  readonly run: (
    policy: Policy,
    input: ReadonlyArray<Item>,
    options: Qadi.HandoverOptions,
  ) => Effect.Effect<ReadonlyArray<unknown>, EnforcementError, EvaluationServices>;
}

const collections: ReadonlyArray<Collection> = [
  { name: "filter", projected: false, run: (p, input, o) => Qadi.filter(p, input, o) },
  {
    name: "filterStream",
    projected: false,
    run: (p, input, o) =>
      Stream.runCollect(Qadi.filterStream(p, Stream.fromIterable(input), o)).pipe(
        Effect.map((chunk) => Array.from(chunk)),
      ),
  },
  { name: "filterProjected", projected: true, run: (p, input, o) => Qadi.filterProjected(p, input, o) },
  {
    name: "filterStreamProjected",
    projected: true,
    run: (p, input, o) =>
      Stream.runCollect(Qadi.filterStreamProjected(p, Stream.fromIterable(input), o)).pipe(
        Effect.map((chunk) => Array.from(chunk)),
      ),
  },
];

const narrowed = [
  { id: "a", ownerId: "u1", kind: "x" },
  { id: "c", kind: "y" },
];

/** The admitted items: the same references for a whole release, fresh narrowed objects for a projected one. */
const expectAdmitted = (collection: Collection, out: ReadonlyArray<unknown>) => {
  const want: ReadonlyArray<unknown> = collection.projected ? narrowed : [a, c];
  assert.deepStrictEqual(out, want);
  if (collection.projected) return;
  for (const [i, item] of out.entries()) assert.strictEqual(item, want[i]);
};

type Id = Readonly<Record<string, unknown>> | undefined;
const idOf = (resource: Id) => String(resource?.["id"]);
const byId = (x: Id, y: Id) => idOf(x).localeCompare(idOf(y));

const allowedResources = (recorded: ReadonlyArray<SinkRecord>) => {
  const out = [];
  for (const row of decisionRows(recorded)) {
    if (row.outcome._tag === "Decided" && row.outcome.decision._tag === "Allow") out.push(row.resource);
  }
  return out.sort(byId);
};

describe("the resource decided on is the value handed over: collection shapes", () => {
  const reader = (h: ReturnType<typeof harness>) => Layer.mergeAll(testLayer(owner), h.sink);

  it.effect("each collection partitions rather than fails, and the array and stream forms admit the same items", () =>
    Effect.gen(function* () {
      for (const collection of collections) {
        const out = yield* collection.run(byKind, batch, {}).pipe(Effect.provide(testLayer(owner)));
        expectAdmitted(collection, out);
      }
    }));

  it.effect("the items released are the items whose decisions admitted them", () =>
    Effect.gen(function* () {
      for (const collection of collections) {
        const h = harness();
        const seen: Array<Id> = [];
        const out = yield* collection
          .run(P.obliged(log, byKind), batch, {
            onObligations: ({ question }) => Effect.sync(() => void seen.push(question.resource)),
          })
          .pipe(Effect.provide(reader(h)));
        expectAdmitted(collection, out);

        // Record order is not defined under concurrency, so compare as sets.
        assert.deepStrictEqual(allowedResources(h.rows), [a, c]);
        assert.deepStrictEqual(
          decisionRows(h.rows).map((row) => row.resource).sort(byId),
          [a, b, c],
        );
        assert.deepStrictEqual(seen.sort(byId), [a, c]);
      }
    }));

  it.live("released order is input order under concurrency: unbounded", () =>
    Effect.gen(function* () {
      for (const collection of collections) {
        const h = harness();
        // The first admitted item is the slowest to discharge, so a result built
        // in completion order would come back reversed.
        const out = yield* collection
          .run(P.obliged(log, byKind), batch, {
            concurrency: "unbounded",
            onObligations: ({ question }) =>
              Effect.sleep(question.resource?.["id"] === "a" ? "30 millis" : "0 millis"),
          })
          .pipe(Effect.provide(reader(h)));
        expectAdmitted(collection, out);
        assert.deepStrictEqual(allowedResources(h.rows), [a, c]);
      }
    }));

  it.effect("two items equal in every field but distinct by reference come back as themselves", () =>
    Effect.gen(function* () {
      const first: Item = { id: "t", ownerId: "u1", kind: "x", secret: "S" };
      const second: Item = { ...first };
      for (const collection of collections) {
        const out = yield* collection
          .run(byKind, [first, second], {})
          .pipe(Effect.provide(testLayer(owner)));
        assert.strictEqual(out.length, 2);
        assert.notStrictEqual(out[0], out[1]);
        if (collection.projected) {
          assert.deepStrictEqual(out, [
            { id: "t", ownerId: "u1", kind: "x" },
            { id: "t", ownerId: "u1", kind: "x" },
          ]);
        } else {
          assert.strictEqual(out[0], first);
          assert.strictEqual(out[1], second);
        }
      }
    }));

  it.effect("an empty input releases nothing and records no decision", () =>
    Effect.gen(function* () {
      for (const collection of collections) {
        const h = harness();
        const out = yield* collection.run(byKind, [], {}).pipe(Effect.provide(reader(h)));
        assert.deepStrictEqual(out, []);
        assert.strictEqual(h.rows.length, 0);
      }
    }));

  it.effect("an empty stream releases nothing and records no decision", () =>
    Effect.gen(function* () {
      const h = harness();
      const whole = yield* Stream.runCollect(Qadi.filterStream(byKind, Stream.empty)).pipe(
        Effect.provide(reader(h)),
      );
      const projected = yield* Stream.runCollect(
        Qadi.filterStreamProjected(byKind, Stream.empty),
      ).pipe(Effect.provide(reader(h)));
      assert.deepStrictEqual(Array.from(whole), []);
      assert.deepStrictEqual(Array.from(projected), []);
      assert.strictEqual(h.rows.length, 0);
    }));

  it.effect("a single admitted item comes back as a one-element result", () =>
    Effect.gen(function* () {
      for (const collection of collections) {
        const out = yield* collection.run(byKind, [a], {}).pipe(Effect.provide(testLayer(owner)));
        assert.deepStrictEqual(out, [collection.projected ? narrowed[0] : a]);
      }
    }));

  it.effect("a binding obligation with no handler fails the call rather than dropping the item", () =>
    Effect.gen(function* () {
      for (const collection of collections) {
        const result = yield* Effect.result(
          collection.run(P.obliged(log, byKind), batch, {}),
        ).pipe(Effect.provide(testLayer(owner)));
        assert.isTrue(Result.isFailure(result));
        if (!Result.isFailure(result)) return;
        assert.strictEqual(result.failure._tag, "UndischargedObligation");
      }
    }));
});

describe("a resource smuggled in at runtime is never the one decided on", () => {
  // An untyped value standing for a JavaScript caller, the only caller this
  // defence exists for: `JSON.parse` returns `any`, so it compiles with neither
  // an `as` nor an `any` written here, before and after the type refuses it.
  const smuggled = JSON.parse('{"resource":{"ownerId":"someone-else"}}');

  const decidedOn = (h: Harness) => {
    const [decision, ...extra] = decisionRows(h.rows);
    assert.strictEqual(extra.length, 0);
    assert.isTrue(decision?.outcome._tag === "Decided" && decision.outcome.decision._tag === "Allow");
    assert.deepStrictEqual(decision?.resource, record);
  };

  it.effect("guard decides on its positional resource", () =>
    Effect.gen(function* () {
      const h = harness();
      const out = yield* Qadi.guard(read, ownedByMe, smuggled)(record, (_authorized, resource) =>
        Effect.succeed(resource),
      ).pipe(Effect.provide(Layer.mergeAll(testLayer(owner), h.sink)));
      assert.strictEqual(out, record);
      decidedOn(h);
    }));

  it.effect("enforceLoaded decides on the value it loaded", () =>
    Effect.gen(function* () {
      const h = harness();
      const out = yield* Effect.succeed(record).pipe(
        Qadi.enforceLoaded(ownedByMe, smuggled),
        Effect.provide(Layer.mergeAll(testLayer(owner), h.sink)),
      );
      assert.strictEqual(out, record);
      decidedOn(h);
    }));

  it.effect("enforceProjectedLoaded decides on the value it loaded", () =>
    Effect.gen(function* () {
      const h = harness();
      const out = yield* Effect.succeed(record).pipe(
        Qadi.enforceProjectedLoaded(ownedAndNarrowed, smuggled),
        Effect.provide(Layer.mergeAll(testLayer(owner), h.sink)),
      );
      assert.deepStrictEqual(out, narrowedRecord);
      decidedOn(h);
    }));

  for (const collection of collections) {
    it.effect(`${collection.name} decides on each item it was given`, () =>
      Effect.gen(function* () {
        const h = harness();
        const out = yield* collection
          .run(byKind, batch, smuggled)
          .pipe(Effect.provide(Layer.mergeAll(testLayer(owner), h.sink)));
        expectAdmitted(collection, out);
        assert.deepStrictEqual(
          decisionRows(h.rows).map((row) => row.resource).sort(byId),
          [a, b, c],
        );
      }));
  }

  // The one defect case on the base: `enforceProjected` hands its options
  // straight to the decision, so a runtime `resource` is evaluated while `self`'s
  // value is projected. It decides with none instead, so a policy that reads one
  // fails closed (INV-QD-108).
  it.effect("enforceProjected ignores a smuggled resource and decides with none", () =>
    Effect.gen(function* () {
      const h = harness();
      const result = yield* Effect.result(
        Effect.succeed(record).pipe(Qadi.enforceProjected(ownedByMe, smuggled)),
      ).pipe(Effect.provide(Layer.mergeAll(testLayer(owner), h.sink)));
      assert.isTrue(Result.isFailure(result));
      if (!Result.isFailure(result)) return;
      assert.strictEqual(result.failure._tag, "MissingResource");
      for (const row of h.rows) assert.isFalse(Object.hasOwn(row, "resource"));
    }));
});
