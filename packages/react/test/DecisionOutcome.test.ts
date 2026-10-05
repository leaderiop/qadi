/**
 * The one read of a decision result, exercised without rendering.
 *
 * Every state below is one a real decision atom reaches, driven through an
 * `AtomRegistry` with a resolver that parks each lookup until the test answers
 * it. What a guard renders, what the gate registry reports and what
 * `currentDecision` returns are all projections of `outcomeOf`, so the rules
 * (ADR-QD-017's stale read, INV-QD-006's failure-is-not-denial, BEH-QD-149's
 * seeded-is-decided) are asserted here once rather than through components
 * (AGENTS.md §13, "test the graph, not the DOM").
 */
import {
  Allow,
  AttributeResolveError,
  AttributeResolver,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  Deny,
  EvaluationIdLive,
  RelationshipResolverNever,
  SignatureHistoryNone,
  eq,
  hasAttribute,
  hasPermission,
  literal,
  makeSubject,
  makeSubjectId,
  permission,
  attributeResolverPort,
} from "@qadi/core";
import type { EvaluationError, Trace } from "@qadi/core";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as FastCheck from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DecisionOutcome, DecisionResult } from "../src/DecisionOutcome.ts";
import { currentDecision, outcomeOf } from "../src/DecisionOutcome.ts";
import { dehydrateDecisions, hydrateDecisions } from "../src/Hydration.ts";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import type { ClientDecision } from "../src/SeededDecision.ts";
import { SeededAllow, SeededDeny, permits } from "../src/SeededDecision.ts";

const subjectId = makeSubjectId("u1");
const trace = (allowed: boolean): Trace => ({
  policyTag: "HasAttribute",
  allowed,
  children: [],
  obligations: [],
});

const evaluatedAllow = new Allow({
  evaluationId: "e-allow",
  subjectId,
  durationMillis: 1,
  trace: trace(true),
  visibleFields: undefined,
  obligations: [],
});
const evaluatedDeny = new Deny({
  evaluationId: "e-deny",
  subjectId,
  durationMillis: 1,
  trace: trace(false),
  reason: "no",
});
const seededAllow = new SeededAllow({
  evaluationId: "s-allow",
  subjectId,
  durationMillis: 0,
  visibleFields: undefined,
  obligations: [],
  disclosure: { _tag: "Withheld" },
});
const seededDeny = new SeededDeny({
  evaluationId: "s-deny",
  subjectId,
  durationMillis: 0,
  disclosure: { _tag: "Withheld" },
});

/**
 * A result's shape, in the notation ARCH-14's state table uses, so a row
 * records which state a real atom was in and not only what it read as.
 */
const shape = (result: DecisionResult): string => {
  const waiting = result.waiting ? "+waiting" : "";
  if (AsyncResult.isInitial(result)) return `Initial${waiting}`;
  if (AsyncResult.isSuccess(result)) return `Success${waiting}(${result.value._tag})`;
  const previous = Option.match(result.previousSuccess, {
    onNone: () => "",
    onSome: (success) => `[prev=${success.value._tag}]`,
  });
  return `Failure${waiting}${previous}`;
};

/** An outcome's tag, and for an answer the tag of the decision it carries. */
const read = (outcome: DecisionOutcome): string =>
  outcome._tag === "Allowed" || outcome._tag === "Denied" ?
    `${outcome._tag}(${outcome.decision._tag})`
  : outcome._tag;

const registries: Array<AtomRegistry.AtomRegistry> = [];
afterEach(() => {
  for (const registry of registries.splice(0)) registry.dispose();
});

/** Atoms whose attribute lookups park until `answer` releases them. */
const controlledAtoms = () => {
  const parked: Array<(answer: Effect.Effect<unknown, AttributeResolveError>) => void> = [];
  const atoms = makeQadiAtoms(
    Layer.mergeAll(
      Layer.succeed(AttributeResolver, {
        resolve: () =>
          Effect.callback<unknown, AttributeResolveError>((resume) => {
            parked.push(resume);
          }),
      }),
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
      CustomPredicateNone,
      SignatureHistoryNone,
    ),
  );
  /** Waits for a lookup to park, so the evaluation is provably in flight. */
  const inFlight = () => vi.waitFor(() => expect(parked.length).toBeGreaterThan(0));
  /** Answers every parked lookup. */
  const answer = async (value: Effect.Effect<unknown, AttributeResolveError>) => {
    await inFlight();
    for (const resume of parked.splice(0)) resume(value);
  };
  return { atoms, inFlight, answer };
};

const standing = hasAttribute("standing", eq(literal("good")));
const subject = makeSubject({ id: "u1" });

describe("outcomeOf", () => {
  it("reads every state a decision atom reaches", async () => {
    const { atoms, inFlight, answer } = controlledAtoms();
    const registry = AtomRegistry.make();
    registries.push(registry);
    const atom = atoms.decision(standing);
    registry.mount(atom);
    registry.mount(atoms.invalidate);

    const rows: Array<readonly [string, string, string]> = [];
    const row = (label: string) => {
      const result = registry.get(atom);
      rows.push([label, shape(result), read(outcomeOf(result))]);
    };
    const settledAt = (predicate: (result: DecisionResult) => boolean) =>
      vi.waitFor(() => expect(predicate(registry.get(atom))).toBe(true));

    row("no subject");
    registry.set(atoms.subject, subject);
    await inFlight();
    row("first evaluation in flight");
    await answer(Effect.succeed("good"));
    await settledAt((r) => AsyncResult.isSuccess(r) && !r.waiting);
    row("settled allow");
    registry.set(atoms.invalidate, undefined);
    await inFlight();
    row("re-check in flight after allow");
    await answer(Effect.fail(attributeResolverPort.failure([makeSubjectId("u"), "standing"], "down")));
    await settledAt((r) => AsyncResult.isFailure(r) && !r.waiting);
    row("re-check failed after allow");
    registry.set(atoms.invalidate, undefined);
    await inFlight();
    row("re-check in flight after failure");
    await answer(Effect.succeed("bad"));
    await settledAt((r) => AsyncResult.isSuccess(r) && !r.waiting);
    row("settled deny");
    registry.set(atoms.subject, undefined);
    await settledAt((r) => r.waiting);
    row("subject cleared after deny");

    expect(rows).toEqual([
      ["no subject", "Initial+waiting", "Pending"],
      ["first evaluation in flight", "Initial+waiting", "Pending"],
      ["settled allow", "Success(Allow)", "Allowed(Allow)"],
      ["re-check in flight after allow", "Success+waiting(Allow)", "Rechecking"],
      ["re-check failed after allow", "Failure[prev=Allow]", "Failed"],
      ["re-check in flight after failure", "Failure+waiting[prev=Allow]", "Rechecking"],
      ["settled deny", "Success(Deny)", "Denied(Deny)"],
      ["subject cleared after deny", "Success+waiting(Deny)", "Rechecking"],
    ]);
  });

  it("reads a seed as a decision, and the client's own answer once it has one", () => {
    const canRead = hasPermission(permission("doc", "read"));
    const reader = makeSubject({ id: "u1", permissions: ["doc:read"] });
    const { atoms } = controlledAtoms();
    const payload = dehydrateDecisions([{ policy: canRead, decision: evaluatedAllow }]);
    const registry = AtomRegistry.make({
      initialValues: hydrateDecisions(atoms, payload, reader),
    });
    registries.push(registry);
    const atom = atoms.decision(canRead);
    registry.mount(atom);

    const seeded = registry.get(atom);
    expect([shape(seeded), read(outcomeOf(seeded))]).toEqual([
      "Success(SeededAllow)",
      "Allowed(SeededAllow)",
    ]);

    registry.set(atoms.subject, reader);
    const answered = registry.get(atom);
    expect([shape(answered), read(outcomeOf(answered))]).toEqual([
      "Success(Allow)",
      "Allowed(Allow)",
    ]);
  });

  it("returns one shared value for the two non-answers", () => {
    const initial: DecisionResult = AsyncResult.initial();
    expect(outcomeOf(initial)).toBe(outcomeOf(AsyncResult.initial(true)));
    const recheck: DecisionResult = AsyncResult.success(evaluatedAllow, { waiting: true });
    const failedRecheck: DecisionResult = AsyncResult.failure(Cause.fail(cause), {
      waiting: true,
    });
    expect(outcomeOf(recheck)).toBe(outcomeOf(failedRecheck));
  });

  it("carries a failure's cause, and nothing else", () => {
    const failed = outcomeOf(
      AsyncResult.failure(Cause.fail(cause), {
        previousSuccess: Option.some(AsyncResult.success(evaluatedAllow)),
      }),
    );
    expect(failed._tag).toBe("Failed");
    expect(Object.keys(failed).sort()).toEqual(["_tag", "cause"]);
  });
});

const cause: EvaluationError = attributeResolverPort.failure([makeSubjectId("u"), "standing"], "down");

const decisionArbitrary: FastCheck.Arbitrary<ClientDecision> = FastCheck.constantFrom<
  ClientDecision
>(evaluatedAllow, evaluatedDeny, seededAllow, seededDeny);

/** Every shape an `AsyncResult<ClientDecision, EvaluationError>` can take. */
const resultArbitrary: FastCheck.Arbitrary<DecisionResult> = FastCheck.oneof(
  FastCheck.boolean().map((waiting): DecisionResult => AsyncResult.initial(waiting)),
  FastCheck.tuple(decisionArbitrary, FastCheck.boolean()).map(
    ([decision, waiting]): DecisionResult => AsyncResult.success(decision, { waiting }),
  ),
  FastCheck.tuple(FastCheck.option(decisionArbitrary, { nil: undefined }), FastCheck.boolean()).map(
    ([previous, waiting]): DecisionResult =>
      AsyncResult.failure(Cause.fail(cause), {
        previousSuccess:
          previous === undefined ? Option.none() : Option.some(AsyncResult.success(previous)),
        waiting,
      }),
  ),
);

describe("outcomeOf, over every result", () => {
  it("never reads a waiting result as an answer", () => {
    FastCheck.assert(
      FastCheck.property(resultArbitrary, (result) => {
        const tag = outcomeOf(result)._tag;
        if (result.waiting) expect(["Pending", "Rechecking"]).toContain(tag);
        if (AsyncResult.isInitial(result)) expect(tag).toBe("Pending");
      }),
    );
  });

  it("never reads a failure's previous success", () => {
    FastCheck.assert(
      FastCheck.property(resultArbitrary, (result) => {
        const outcome = outcomeOf(result);
        if (AsyncResult.isFailure(result) && !result.waiting) expect(outcome._tag).toBe("Failed");
        expect(Object.keys(outcome)).not.toContain("previousSuccess");
        expect(Object.keys(outcome)).not.toContain("value");
      }),
    );
  });

  it("agrees with currentDecision and permits", () => {
    FastCheck.assert(
      FastCheck.property(resultArbitrary, (result) => {
        const outcome = outcomeOf(result);
        const decision = currentDecision(result);
        const answered = outcome._tag === "Allowed" || outcome._tag === "Denied";
        expect(decision !== undefined).toBe(answered);
        if (outcome._tag === "Allowed" || outcome._tag === "Denied") {
          expect(decision).toBe(outcome.decision);
          expect(outcome._tag === "Allowed").toBe(permits(outcome.decision));
        }
        if (AsyncResult.isSuccess(result) && !result.waiting) expect(decision).toBe(result.value);
      }),
    );
  });
});
