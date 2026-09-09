/**
 * Steps for `hydration-counts.feature`.
 *
 * A dedicated `Context.Service` World, scoped to this Feature only — these
 * scenarios are about a *payload* rather than about one decision, the same
 * reasoning as `port-calls.steps.test.ts`.
 *
 * Counts are read as **deltas** around each scenario. A `Metric` memoises its
 * hooks on itself at first touch and ignores the registry thereafter, so there
 * is no way to scope one to a scenario, and an absolute assertion would depend
 * on the order the whole suite ran in.
 *
 * The counts are read through `@qadi/devtools`, not through the package that
 * wrote them. That is the contract worth exercising end to end: the two do not
 * depend on each other, and everything they share is the registry key
 * `@qadi/core` declares.
 */
import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import {
  Allow,
  EvaluationServicesNone,
  hasPermission,
  makeSubject,
  makeSubjectId,
  permission,
} from "@qadi/core";
import type { Decision, Policy } from "@qadi/core";
import { dehydrateDecisions, hydrateDecisions, makeQadiAtoms } from "@qadi/react";
import type { DehydratedDecisions, DehydratedEntry, HydrationDrop } from "@qadi/react";
import { hydrationActivity, unaccountedEntries } from "@qadi/devtools";
import type { HydrationActivity } from "@qadi/devtools";

const feature = await loadFeature(
  fileURLToPath(new URL("./hydration-counts.feature", import.meta.url)),
);

const aliceSubject = makeSubject({ id: "alice", permissions: ["doc:read"] });
const bobSubject = makeSubject({ id: "bob" });
const subjectFor = (id: string) => (id === "bob" ? bobSubject : aliceSubject);

const policyFor = (index: number): Policy =>
  hasPermission(permission("doc", `read${index === 0 ? "" : String(index)}`));

const decisionFor = (subjectId: string, index: number): Decision =>
  new Allow({
    evaluationId: `e${String(index)}`,
    subjectId: makeSubjectId(subjectId),
    durationMillis: 1,
    trace: {
      policyTag: "HasPermission",
      allowed: true,
      children: [],
      visibleFields: undefined,
      obligations: [],
    },
    visibleFields: undefined,
    obligations: [],
  });

/** An entry no schema can decode — a policy shape from another version. */
const gibberish = (index: number): DehydratedEntry => ({
  policy: { _tag: "NotAPolicy", index },
  allowed: true,
  evaluationId: `x${String(index)}`,
  durationMillis: 1,
});

/**
 * An entry whose shape is wrong apart from its policy — a hand-built or
 * version-skewed payload with a field of the wrong type.
 *
 * Round-tripped through JSON, the same idiom `Hydration.test.ts` uses:
 * `DehydratedEntry`'s fields are legitimately typed for a well-behaved
 * caller, and a malformed `durationMillis` is exactly what that type cannot
 * rule out for a payload arriving as real, untrusted JSON.
 */
const malformed = (index: number): DehydratedEntry =>
  JSON.parse(
    JSON.stringify({
      policy: { _tag: "NotAPolicy", index },
      allowed: true,
      evaluationId: `m${String(index)}`,
      durationMillis: "not-a-number",
    }),
  );

const freshAtoms = () => makeQadiAtoms(EvaluationServicesNone);

interface HydrationCountsWorldState {
  readonly decided: ReadonlyArray<{ readonly policy: Policy; readonly decision: Decision }>;
  readonly extraEntries: ReadonlyArray<DehydratedEntry>;
  readonly payload: DehydratedDecisions | undefined;
  // `InitialValues` is an `Iterable`, not an array, so what a scenario asserts on
  // is the materialised pairs rather than the return value itself.
  readonly seeded: ReadonlyArray<unknown>;
  readonly drops: ReadonlyArray<HydrationDrop<DehydratedEntry>>;
  readonly before: HydrationActivity | undefined;
  readonly after: HydrationActivity | undefined;
  readonly fabricated: HydrationActivity | undefined;
}

const initialState: HydrationCountsWorldState = {
  decided: [],
  extraEntries: [],
  payload: undefined,
  seeded: [],
  drops: [],
  before: undefined,
  after: undefined,
  fabricated: undefined,
};

export interface WorldShape {
  readonly state: Ref.Ref<HydrationCountsWorldState>;
}

export class World extends Context.Service<World, WorldShape>()("features/hydration-counts/World") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      return World.of({ state: yield* Ref.make(initialState) });
    }),
  );
}

const readState = Effect.fn("hydration-counts.readState")(function* () {
  const { state } = yield* World;
  return yield* Ref.get(state);
});

const patch = Effect.fn("hydration-counts.patch")(function* (
  fn: (s: HydrationCountsWorldState) => Partial<HydrationCountsWorldState>,
) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, ...fn(s) }));
});

/** The delta on one counter, so a scenario never reads a suite-wide total. */
const moved = Effect.fn("hydration-counts.moved")(function* (
  of: (self: HydrationActivity) => number,
) {
  const s = yield* readState();
  if (s.before === undefined || s.after === undefined) throw new Error("counts were not read");
  return of(s.after) - of(s.before);
});

const droppedFor = Effect.fn("hydration-counts.droppedFor")(function* (reason: string) {
  return yield* moved((self) => self.drops.find((drop) => drop.reason === reason)?.count ?? 0);
});

const hydrateWith = Effect.fn("hydration-counts.hydrateWith")(function* (
  atoms: Parameters<typeof hydrateDecisions>[0],
  id: string,
) {
  const s = yield* readState();
  const built = s.payload ?? dehydrateDecisions(s.decided, { onDropped: () => {} });
  const whole: DehydratedDecisions =
    s.extraEntries.length === 0
      ? built
      : { ...built, entries: [...built.entries, ...s.extraEntries] };

  const drops: Array<HydrationDrop<DehydratedEntry>> = [];
  const seeded = [
    ...hydrateDecisions(atoms, whole, subjectFor(id), {
      onDropped: (drop) => drops.push(drop),
    }),
  ];
  const after = yield* hydrationActivity;
  yield* patch(() => ({ seeded, drops, after }));
});

describeFeature(feature, World.layer, ({ Before, Given, When, Then }) => {
  Before(function* () {
    const { state } = yield* World;
    const before = yield* hydrationActivity;
    yield* Ref.set(state, { ...initialState, before });
  });

  // -------------------------------------------------------------------------
  // Given
  // -------------------------------------------------------------------------

  Given(
    "a server that decided {int} questions for {string}",
    function* (count: number, id: string) {
      yield* patch(() => ({
        decided: Array.from({ length: count }, (_unused, index) => ({
          policy: policyFor(index),
          decision: decisionFor(id, index),
        })),
      }));
    },
  );

  Given("a server that decided {int} question for {string}", function* (count: number, id: string) {
    yield* patch(() => ({
      decided: Array.from({ length: count }, (_unused, index) => ({
        policy: policyFor(index),
        decision: decisionFor(id, index),
      })),
    }));
  });

  Given("one more decided for {string}", function* (id: string) {
    const s = yield* readState();
    yield* patch(() => ({
      decided: [
        ...s.decided,
        { policy: policyFor(s.decided.length), decision: decisionFor(id, s.decided.length) },
      ],
    }));
  });

  Given(
    "a payload for {string} carrying {int} entries the client cannot decode",
    function* (id: string, count: number) {
      yield* patch(() => ({
        payload: {
          subjectId: id,
          entries: Array.from({ length: count }, (_unused, index) => gibberish(index)),
        },
      }));
    },
  );

  Given("the payload also carries {int} entry the client cannot decode", function* (count: number) {
    yield* patch(() => ({
      extraEntries: Array.from({ length: count }, (_unused, index) => gibberish(index)),
    }));
  });

  Given(
    "a payload for {string} carrying {int} entries the client cannot verify apart from their policy",
    function* (id: string, count: number) {
      yield* patch(() => ({
        payload: {
          subjectId: id,
          entries: Array.from({ length: count }, (_unused, index) => malformed(index)),
        },
      }));
    },
  );

  Given("a process that seeded {int} entries and built none", function* (count: number) {
    // Fabricated rather than driven: producing this state for real needs a
    // browser that received a payload another process built, which is the very
    // situation this asserts the panel handles.
    yield* patch(() => ({
      fabricated: { dehydrated: 0, seeded: count, rechecked: 0, mismatched: 0, drops: [] },
    }));
  });

  // -------------------------------------------------------------------------
  // When
  // -------------------------------------------------------------------------

  When("the payload is built and hydrated by {string}", function* (id: string) {
    yield* hydrateWith(freshAtoms(), id);
  });

  When("the payload is hydrated by {string}", function* (id: string) {
    yield* hydrateWith(freshAtoms(), id);
  });

  When("the payload is hydrated into an atom set built elsewhere", function* () {
    // A spread is structurally a `QadiAtoms` and is not registered, which is
    // exactly what the refusal is for.
    yield* hydrateWith({ ...freshAtoms() }, "alice");
  });

  When("the hydration counts are read", function* () {
    const after = yield* hydrationActivity;
    yield* patch(() => ({ after }));
  });

  // -------------------------------------------------------------------------
  // Then
  // -------------------------------------------------------------------------

  Then("{int} entries are counted as dehydrated", function* (count: number) {
    assert.equal(yield* moved((self) => self.dehydrated), count);
  });

  Then("{int} entries are counted as seeded", function* (count: number) {
    assert.equal(yield* moved((self) => self.seeded), count);
  });

  Then("{int} entry is counted as seeded", function* (count: number) {
    assert.equal(yield* moved((self) => self.seeded), count);
  });

  Then("nothing is seeded", function* () {
    const s = yield* readState();
    assert.deepEqual(s.seeded, []);
    assert.equal(yield* moved((self) => self.seeded), 0);
  });

  Then("nothing is counted as dropped", function* () {
    const s = yield* readState();
    let total = 0;
    for (const drop of s.after?.drops ?? []) total += yield* droppedFor(drop.reason);
    assert.equal(total, 0);
  });

  Then("{int} entry is counted as dropped for {string}", function* (count: number, reason: string) {
    assert.equal(yield* droppedFor(reason), count);
  });

  Then(
    "{int} entries are counted as dropped for {string}",
    function* (count: number, reason: string) {
      assert.equal(yield* droppedFor(reason), count);
    },
  );

  Then("the reported reason is {string}", function* (reason: string) {
    const s = yield* readState();
    assert.equal(
      s.drops[0]?.reason,
      reason,
      `reported ${JSON.stringify(s.drops.map((d) => d.reason))}`,
    );
  });

  Then("exactly {int} refusal is reported", function* (count: number) {
    const s = yield* readState();
    assert.equal(s.drops.length, count);
  });

  Then("all {int} drop reasons appear", function* (count: number) {
    const s = yield* readState();
    assert.equal(s.after?.drops.length, count);
  });

  Then("each reason carries a distinct explanation", function* () {
    const s = yield* readState();
    const meanings = (s.after?.drops ?? []).map((drop) => drop.meaning);
    assert.equal(new Set(meanings).size, meanings.length);
    assert.ok(meanings.every((meaning) => meaning.length > 0));
  });

  /** A browser seeds payloads it did not build, so a negative is not a fault. */
  Then("no shortfall is reported", function* () {
    const s = yield* readState();
    assert.ok(s.fabricated !== undefined);
    assert.equal(unaccountedEntries(s.fabricated), undefined);
  });
});
