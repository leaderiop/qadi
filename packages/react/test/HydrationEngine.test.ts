import type { Decision, DenyingTrace, Policy, Resource } from "@qadi/core";
import {
  Allow,
  Deny,
  hasPermission,
  hasRole,
  hydrationDehydratedTotal,
  hydrationDroppedTotal,
  hydrationSeededTotal,
  makeSubject,
  makeSubjectId,
  permission,
} from "@qadi/core";
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { dehydrateWith, hydrateWith, makeSeededQuestion } from "../src/HydrationEngine.ts";
import type { DecisionEntry, HydrationMismatch, HydrationSeedLookup } from "../src/HydrationEngine.ts";
import type { SeededDecision } from "../src/SeededDecision.ts";
import { SeededAllow, SeededDeny } from "../src/SeededDecision.ts";

const subjectId = makeSubjectId("u1");
const denyTrace: DenyingTrace = {
  policyTag: "HasRole",
  allowed: false,
  reason: "no",
  children: [],
  obligations: [],
};
const policy = hasRole("admin");

const allow = new SeededAllow({
  evaluationId: "e1",
  subjectId,
  durationMillis: 0,
  visibleFields: undefined,
  obligations: [],
  disclosure: { _tag: "Withheld" },
});
const deny = new Deny({
  evaluationId: "e2",
  subjectId,
  durationMillis: 0,
  trace: denyTrace,
});

describe("makeSeededQuestion", () => {
  it("runs `track` before any read of its own atoms, once per computation", () => {
    const order: Array<string> = [];
    const q = makeSeededQuestion<never>({
      policy,
      resource: undefined,
      report: undefined,
      computedFor: () =>
        Atom.readable(() => {
          order.push("computed");
          return AsyncResult.success<Decision>(deny);
        }),
      track: () => {
        order.push("track");
      },
    });
    const registry = AtomRegistry.make();
    registry.get(q.read);
    assert.deepStrictEqual(order, ["track", "computed"]);
  });

  it("announces a disagreement once per registry, not once per question", () => {
    const reports: Array<HydrationMismatch> = [];
    const q = makeSeededQuestion<never>({
      policy,
      resource: undefined,
      report: (m) => reports.push(m),
      computedFor: () => Atom.readable(() => AsyncResult.success<Decision>(deny)),
      track: () => {},
    });

    const first = AtomRegistry.make();
    const second = AtomRegistry.make();
    first.set(q.seed, allow);
    second.set(q.seed, allow);
    first.mount(q.read);
    second.mount(q.read);
    // Re-reading in the same registry must not announce again.
    first.get(q.read);
    first.get(q.read);

    assert.strictEqual(reports.length, 2);
    assert.strictEqual(reports[0]?.seeded, allow);
    assert.strictEqual(reports[0]?.decided, deny);
  });

  it("reads the seed while the computed answer is still Initial, and drops it after", () => {
    let settled = false;
    const gate = Atom.make(0);
    const q = makeSeededQuestion<never>({
      policy,
      resource: undefined,
      report: undefined,
      computedFor: () =>
        Atom.readable((get) => {
          get(gate);
          return settled ? AsyncResult.success<Decision>(deny) : AsyncResult.initial<Decision, never>();
        }),
      track: () => {},
    });
    const registry = AtomRegistry.make();
    registry.mount(q.read);
    registry.set(q.seed, allow);

    const during = registry.get(q.read);
    assert.isTrue(AsyncResult.isSuccess(during));
    assert.strictEqual(AsyncResult.isSuccess(during) ? during.value : undefined, allow);

    settled = true;
    registry.set(gate, 1);
    const after = registry.get(q.read);
    assert.strictEqual(AsyncResult.isSuccess(after) ? after.value : undefined, deny);
  });
});

// The default registry, which a test cannot scope: every count read is a delta.
const registry = Context.empty();

const serverAllow = (subject: string, evaluationId: string): Allow =>
  new Allow({
    evaluationId,
    subjectId: makeSubjectId(subject),
    durationMillis: 3,
    trace: {
      policyTag: "HasPermission",
      allowed: true,
      children: [],
      visibleFields: undefined,
      obligations: [],
    },
  });

const serverDeny = (subject: string, evaluationId: string): Deny =>
  new Deny({
    evaluationId,
    subjectId: makeSubjectId(subject),
    durationMillis: 4,
    trace: denyTrace,
  });

describe("dehydrateWith and hydrateWith: both directions through the engine (ARCH-51)", () => {
  const read = hasPermission(permission("doc", "read"));
  const own: DecisionEntry = { policy: read, decision: serverAllow("u1", "e1") };
  const ownDeny: DecisionEntry = {
    policy: hasRole("admin"),
    resource: { id: "doc-1" },
    decision: serverDeny("u1", "e2"),
  };
  const foreign: DecisionEntry = { policy: read, decision: serverAllow("u2", "e3") };
  const alice = makeSubject({ id: "u1" });

  const dehydratedCount = () => hydrationDehydratedTotal.valueUnsafe(registry).count;
  const seededCount = () => hydrationSeededTotal.valueUnsafe(registry).count;
  const foreignCount = () =>
    hydrationDroppedTotal.valueUnsafe(registry).occurrences.get("ForeignSubject") ?? 0;

  /** A lookup recording each call and the fresh seed atom it handed back. */
  const recordingLookup = () => {
    const calls: Array<{
      readonly policy: Policy;
      readonly resource: Resource | undefined;
      readonly atom: Atom.Writable<SeededDecision | undefined>;
    }> = [];
    const lookup: HydrationSeedLookup = (policy, resource) => {
      const atom = Atom.make<SeededDecision | undefined>(undefined);
      calls.push({ policy, resource, atom });
      return atom;
    };
    return { calls, lookup };
  };

  it("keeps the first subject's entries, counts and reports the rest, and round-trips", () => {
    const reported: Array<ReadonlyArray<DecisionEntry>> = [];
    const foreignBefore = foreignCount();
    const dehydratedBefore = dehydratedCount();

    const payload = dehydrateWith([own, ownDeny, foreign], {
      onDropped: (entries) => reported.push(entries),
    });

    assert.strictEqual(foreignCount() - foreignBefore, 1);
    assert.strictEqual(dehydratedCount() - dehydratedBefore, 2);
    assert.strictEqual(reported.length, 1);
    assert.strictEqual(reported[0]?.length, 1);
    assert.strictEqual(reported[0]?.[0], foreign);
    assert.strictEqual(payload.version, 2);
    assert.strictEqual(payload.subjectId, "u1");
    assert.strictEqual(payload.entries.length, 2);

    const { calls, lookup } = recordingLookup();
    const drops: Array<unknown> = [];
    const seededBefore = seededCount();
    const pairs = [
      ...hydrateWith(lookup, JSON.parse(JSON.stringify(payload)), alice, {
        onDropped: (drop) => drops.push(drop),
      }),
    ];

    assert.strictEqual(seededCount() - seededBefore, 2);
    assert.strictEqual(drops.length, 0);
    assert.strictEqual(pairs.length, 2);
    assert.strictEqual(pairs[0]?.[0], calls[0]?.atom);
    assert.strictEqual(pairs[1]?.[0], calls[1]?.atom);

    const first = pairs[0]?.[1];
    const second = pairs[1]?.[1];
    assert.isTrue(first instanceof SeededAllow);
    assert.isTrue(second instanceof SeededDeny);
    if (!(first instanceof SeededAllow) || !(second instanceof SeededDeny)) return;
    assert.strictEqual(first.evaluationId, "e1");
    assert.strictEqual(second.evaluationId, "e2");
    assert.strictEqual(first.disclosure._tag, "Withheld");
    assert.strictEqual(second.disclosure._tag, "Withheld");
    assert.deepStrictEqual(
      calls.map((c) => c.policy._tag),
      ["HasPermission", "HasRole"],
    );
    assert.strictEqual(calls[0]?.resource, undefined);
    assert.deepStrictEqual(calls[1]?.resource, { id: "doc-1" });
    assert.isFalse(
      pairs.some(
        ([, value]) =>
          (value instanceof SeededAllow || value instanceof SeededDeny) && value.evaluationId === "e3",
      ),
    );
  });

  it("discloses only when the engine is told to include the trace", () => {
    const payload = dehydrateWith([own], { includeTrace: true });
    const { lookup } = recordingLookup();
    const pairs = [...hydrateWith(lookup, JSON.parse(JSON.stringify(payload)), alice)];

    assert.strictEqual(pairs.length, 1);
    const seed = pairs[0]?.[1];
    assert.isTrue(seed instanceof SeededAllow);
    if (!(seed instanceof SeededAllow)) return;
    assert.strictEqual(seed.disclosure._tag, "Disclosed");
  });
});

describe("a refused payload is always counted (INV-QD-045, ARCH-60)", () => {
  const mismatchCount = () =>
    hydrationDroppedTotal.valueUnsafe(registry).occurrences.get("PayloadSubjectMismatch") ?? 0;

  it("a payload naming another subject with no entries adds exactly one PayloadSubjectMismatch", () => {
    const drops: Array<unknown> = [];
    const before = mismatchCount();
    const pairs = [
      ...hydrateWith(
        () => Atom.make<SeededDecision | undefined>(undefined),
        { version: 2, subjectId: "u2", entries: [] },
        makeSubject({ id: "u1" }),
        { onDropped: (drop) => drops.push(drop) },
      ),
    ];
    assert.strictEqual(mismatchCount() - before, 1);
    assert.strictEqual(pairs.length, 0);
    assert.deepStrictEqual(drops, [{ reason: "PayloadSubjectMismatch", entries: [], wholePayload: true }]);
  });
});
