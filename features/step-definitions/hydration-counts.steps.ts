/**
 * Steps for `hydration-counts.feature`.
 *
 * Module state with a tagged `Before` hook, for the reason the other devtools
 * step files record: these scenarios are about a *payload* rather than about one
 * decision, and bending `QadiWorld` to hold that would make every other feature
 * file pay for this one.
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
import { Before, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  Allow,
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  hasPermission,
  makeSubject,
  makeSubjectId,
  permission,
  RelationshipResolverNever,
} from "@qadi/core";
import type { Decision, Policy } from "@qadi/core";
import { dehydrateDecisions, hydrateDecisions, makeQadiAtoms } from "@qadi/react";
import type {
  DehydratedDecisions,
  DehydratedEntry,
  HydrationDrop,
} from "@qadi/react";
import { hydrationActivity, unaccountedEntries } from "@qadi/devtools";
import type { HydrationActivity } from "@qadi/devtools";

const subjects: Record<string, ReturnType<typeof makeSubject>> = {
  alice: makeSubject({ id: "alice", permissions: ["doc:read"] }),
  bob: makeSubject({ id: "bob" }),
};

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

const freshAtoms = () =>
  makeQadiAtoms(
    Layer.mergeAll(
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
  );

let decided: Array<{ readonly policy: Policy; readonly decision: Decision }> = [];
let extraEntries: Array<DehydratedEntry> = [];
let payload: DehydratedDecisions | undefined;
// `InitialValues` is an `Iterable`, not an array, so what a scenario asserts on
// is the materialised pairs rather than the return value itself.
let seeded: Array<unknown> = [];
let drops: Array<HydrationDrop<DehydratedEntry>> = [];
let before: HydrationActivity | undefined;
let after: HydrationActivity | undefined;
let fabricated: HydrationActivity | undefined;

const read = () => Effect.runPromise(hydrationActivity);

Before({ tags: "@hydration-counts" }, async () => {
  decided = [];
  extraEntries = [];
  payload = undefined;
  seeded = [];
  drops = [];
  after = undefined;
  fabricated = undefined;
  before = await read();
});

/** The delta on one counter, so a scenario never reads a suite-wide total. */
const moved = (of: (self: HydrationActivity) => number): number => {
  if (before === undefined || after === undefined) throw new Error("counts were not read");
  return of(after) - of(before);
};

const droppedFor = (reason: string): number =>
  moved((self) => self.drops.find((drop) => drop.reason === reason)?.count ?? 0);

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given("a server that decided {int} questions for {string}", (count: number, id: string) => {
  decided = Array.from({ length: count }, (_unused, index) => ({
    policy: policyFor(index),
    decision: decisionFor(id, index),
  }));
});

Given("a server that decided {int} question for {string}", (count: number, id: string) => {
  decided = Array.from({ length: count }, (_unused, index) => ({
    policy: policyFor(index),
    decision: decisionFor(id, index),
  }));
});

Given("one more decided for {string}", (id: string) => {
  decided = [
    ...decided,
    { policy: policyFor(decided.length), decision: decisionFor(id, decided.length) },
  ];
});

Given(
  "a payload for {string} carrying {int} entries the client cannot decode",
  (id: string, count: number) => {
    payload = {
      subjectId: id,
      entries: Array.from({ length: count }, (_unused, index) => gibberish(index)),
    };
  },
);

Given("the payload also carries {int} entry the client cannot decode", (count: number) => {
  extraEntries = Array.from({ length: count }, (_unused, index) => gibberish(index));
});

Given("a process that seeded {int} entries and built none", (count: number) => {
  // Fabricated rather than driven: producing this state for real needs a
  // browser that received a payload another process built, which is the very
  // situation this asserts the panel handles.
  fabricated = { dehydrated: 0, seeded: count, rechecked: 0, mismatched: 0, drops: [] };
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

const hydrateWith = async (
  atoms: Parameters<typeof hydrateDecisions>[0],
  id: string,
): Promise<void> => {
  const built = payload ?? dehydrateDecisions(decided, { onDropped: () => {} });
  const whole: DehydratedDecisions =
    extraEntries.length === 0
      ? built
      : { ...built, entries: [...built.entries, ...extraEntries] };

  seeded = [
    ...hydrateDecisions(atoms, whole, subjects[id] ?? subjects["alice"]!, {
      onDropped: (drop) => drops.push(drop),
    }),
  ];
  after = await read();
};

When("the payload is built and hydrated by {string}", async (id: string) => {
  await hydrateWith(freshAtoms(), id);
});

When("the payload is hydrated by {string}", async (id: string) => {
  await hydrateWith(freshAtoms(), id);
});

When("the payload is hydrated into an atom set built elsewhere", async () => {
  // A spread is structurally a `QadiAtoms` and is not registered, which is
  // exactly what the refusal is for.
  await hydrateWith({ ...freshAtoms() }, "alice");
});

When("the hydration counts are read", async () => {
  after = await read();
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then("{int} entries are counted as dehydrated", (count: number) => {
  assert.equal(moved((self) => self.dehydrated), count);
});

Then("{int} entries are counted as seeded", (count: number) => {
  assert.equal(moved((self) => self.seeded), count);
});

Then("{int} entry is counted as seeded", (count: number) => {
  assert.equal(moved((self) => self.seeded), count);
});

Then("nothing is seeded", () => {
  assert.deepEqual(seeded, []);
  assert.equal(moved((self) => self.seeded), 0);
});

Then("nothing is counted as dropped", () => {
  const total = (after?.drops ?? []).reduce((sum, drop) => sum + droppedFor(drop.reason), 0);
  assert.equal(total, 0);
});

Then("{int} entry is counted as dropped for {string}", (count: number, reason: string) => {
  assert.equal(droppedFor(reason), count);
});

Then("{int} entries are counted as dropped for {string}", (count: number, reason: string) => {
  assert.equal(droppedFor(reason), count);
});

Then("the reported reason is {string}", (reason: string) => {
  assert.equal(drops[0]?.reason, reason, `reported ${JSON.stringify(drops.map((d) => d.reason))}`);
});

Then("exactly {int} refusal is reported", (count: number) => {
  assert.equal(drops.length, count);
});

Then("all {int} drop reasons appear", (count: number) => {
  assert.equal(after?.drops.length, count);
});

Then("each reason carries a distinct explanation", () => {
  const meanings = (after?.drops ?? []).map((drop) => drop.meaning);
  assert.equal(new Set(meanings).size, meanings.length);
  assert.ok(meanings.every((meaning) => meaning.length > 0));
});

/** A browser seeds payloads it did not build, so a negative is not a fault. */
Then("no shortfall is reported", () => {
  assert.ok(fabricated !== undefined);
  assert.equal(unaccountedEntries(fabricated), undefined);
});
