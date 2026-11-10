import type { Decision, DehydrationDropReason, DenyingTrace, Policy, Resource } from "@qadi/core";
import {
  Allow,
  Deny,
  gte,
  hasAttribute,
  hasPermission,
  hasRelationship,
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
import { vi } from "vitest";
import type { HydrationDrop } from "../src/DeveloperSignals.ts";
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
    const reported: Array<HydrationDrop<DecisionEntry, DehydrationDropReason>> = [];
    const foreignBefore = foreignCount();
    const dehydratedBefore = dehydratedCount();

    const payload = dehydrateWith([own, ownDeny, foreign], {
      onDropped: (drop) => reported.push(drop),
    });

    assert.strictEqual(foreignCount() - foreignBefore, 1);
    assert.strictEqual(dehydratedCount() - dehydratedBefore, 2);
    assert.strictEqual(reported.length, 1);
    assert.strictEqual(reported[0]?.reason, "ForeignSubject");
    assert.strictEqual(reported[0]?.wholePayload, false);
    assert.strictEqual(reported[0]?.entries.length, 1);
    assert.strictEqual(reported[0]?.entries[0], foreign);
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

describe("a throwing reporter changes nothing (INT-04, ARCH-60)", () => {
  const read = hasPermission(permission("doc", "read"));
  const own: DecisionEntry = { policy: read, decision: serverAllow("u1", "e1") };
  const foreign: DecisionEntry = { policy: read, decision: serverAllow("u2", "e3") };
  const alice = makeSubject({ id: "u1" });
  const boom = (): never => {
    throw new Error("host boom");
  };
  const counts = () => ({
    dehydrated: hydrationDehydratedTotal.valueUnsafe(registry).count,
    seeded: hydrationSeededTotal.valueUnsafe(registry).count,
    foreign: hydrationDroppedTotal.valueUnsafe(registry).occurrences.get("ForeignSubject") ?? 0,
    undecodable: hydrationDroppedTotal.valueUnsafe(registry).occurrences.get("UndecodablePolicy") ?? 0,
  });
  const said = <A,>(act: () => A): { readonly value: A; readonly lines: ReadonlyArray<string> } => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const value = act();
      return { value, lines: warn.mock.calls.map((call) => String(call[0])) };
    } finally {
      warn.mockRestore();
    }
  };
  const threw =
    "[qadi] the onDropped reporter you supplied threw (Error: host boom). The outcome it was " +
    "told about stands — nothing was skipped, seeded differently or left uncounted. Fix the reporter.";

  it("a throwing onDropped on hydrate still seeds the good entry and counts both", () => {
    const shipped = dehydrateWith([own]);
    const wire: unknown = JSON.parse(
      JSON.stringify({
        ...shipped,
        entries: [...shipped.entries, { ...shipped.entries[0], policy: { _tag: "NotAPolicy" } }],
      }),
    );
    const before = counts();
    const { value: pairs, lines } = said(() => [
      ...hydrateWith(() => Atom.make<SeededDecision | undefined>(undefined), wire, alice, { onDropped: boom }),
    ]);
    const after = counts();

    assert.strictEqual(pairs.length, 1);
    assert.strictEqual(after.seeded - before.seeded, 1);
    assert.strictEqual(after.undecodable - before.undecodable, 1);
    assert.deepStrictEqual(lines, [threw]);
  });

  it("a throwing onDropped on dehydrate still returns the payload and counts", () => {
    const before = counts();
    const { value: payload, lines } = said(() => dehydrateWith([own, foreign], { onDropped: boom }));
    const after = counts();

    assert.strictEqual(payload.entries.length, 1);
    assert.strictEqual(payload.subjectId, "u1");
    assert.strictEqual(after.foreign - before.foreign, 1);
    assert.strictEqual(after.dehydrated - before.dehydrated, 1);
    assert.deepStrictEqual(lines, [threw]);
  });
});

describe("dehydrate never throws (INT-03)", () => {
  // Three policies the public constructors accept and the policy schema does not:
  // a non-finite matcher bound and a fractional relationship depth. Each used to
  // throw `SchemaError` out of `dehydrateDecisions` on a server's render path.
  const unencodable: ReadonlyArray<readonly [string, Policy]> = [
    ["gte(-Infinity)", hasAttribute("age", gte(Number.NEGATIVE_INFINITY))],
    ["gte(NaN)", hasAttribute("age", gte(Number.NaN))],
    ["hasRelationship(…, { depth: 1.5 })", hasRelationship("owner", { depth: 1.5 })],
  ];
  const read = hasPermission(permission("doc", "read"));
  const own: DecisionEntry = { policy: read, decision: serverAllow("u1", "e1") };
  const foreign: DecisionEntry = { policy: read, decision: serverAllow("u2", "e3") };
  const counts = () => ({
    dehydrated: hydrationDehydratedTotal.valueUnsafe(registry).count,
    foreign: hydrationDroppedTotal.valueUnsafe(registry).occurrences.get("ForeignSubject") ?? 0,
    unencodable: hydrationDroppedTotal.valueUnsafe(registry).occurrences.get("UnencodablePolicy") ?? 0,
  });
  const said = <A,>(act: () => A): { readonly value: A; readonly lines: ReadonlyArray<string> } => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const value = act();
      return { value, lines: warn.mock.calls.map((call) => String(call[0])) };
    } finally {
      warn.mockRestore();
    }
  };

  for (const [name, policy] of unencodable) {
    it(`${name} is left out as UnencodablePolicy, counted and reported once; the rest is written`, () => {
      const expected = dehydrateWith([own]).entries;
      const bad: DecisionEntry = { policy, decision: serverAllow("u1", "e9") };
      const drops: Array<HydrationDrop<DecisionEntry, DehydrationDropReason>> = [];
      const before = counts();
      const payload = dehydrateWith([own, bad], { onDropped: (drop) => drops.push(drop) });
      const after = counts();

      assert.deepStrictEqual(payload.entries, expected);
      assert.strictEqual(payload.subjectId, "u1");
      assert.strictEqual(after.unencodable - before.unencodable, 1);
      assert.strictEqual(after.dehydrated - before.dehydrated, 1);
      assert.strictEqual(after.foreign - before.foreign, 0);
      assert.deepStrictEqual(drops, [{ reason: "UnencodablePolicy", entries: [bad], wholePayload: false }]);
    });
  }

  it("the default names the reason's remedy, never the policy", () => {
    const bad: DecisionEntry = { policy: hasRelationship("owner", { depth: 1.5 }), decision: serverAllow("u1", "e9") };
    const { lines } = said(() => dehydrateWith([own, bad]));
    assert.deepStrictEqual(lines, [
      "[qadi] dehydrateDecisions dropped 1 decision(s): a policy built in code does not satisfy " +
        "the policy schema — a matcher bound that is not finite, or a relationship depth that is " +
        "not an integer — so it cannot cross the network. The entry was left out and the client " +
        "will ask the question itself; fix the policy.",
    ]);
  });

  it("a foreign and an unencodable entry: onDropped is called once per reason", () => {
    const bad: DecisionEntry = { policy: hasAttribute("age", gte(Number.NaN)), decision: serverAllow("u1", "e9") };
    const drops: Array<HydrationDrop<DecisionEntry, DehydrationDropReason>> = [];
    const before = counts();
    const payload = dehydrateWith([own, foreign, bad], { onDropped: (drop) => drops.push(drop) });
    const after = counts();

    assert.strictEqual(payload.entries.length, 1);
    assert.strictEqual(after.foreign - before.foreign, 1);
    assert.strictEqual(after.unencodable - before.unencodable, 1);
    assert.strictEqual(after.dehydrated - before.dehydrated, 1);
    assert.deepStrictEqual(drops, [
      { reason: "ForeignSubject", entries: [foreign], wholePayload: false },
      { reason: "UnencodablePolicy", entries: [bad], wholePayload: false },
    ]);
  });
});
