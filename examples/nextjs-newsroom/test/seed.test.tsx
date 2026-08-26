/**
 * Does a seeded decision survive into a mounted guard?
 *
 * Written to settle a disagreement between two observations on
 * `/edge/divergent`: the served HTML showed the seeded **Allowed**, and the same
 * guard read **Pending** the moment the browser hydrated — with
 * `hydrateDecisions` reporting that it had seeded one value.
 *
 * The question this isolates is whether that is a property of the library, of
 * the browser, or of Next. Everything about Next is gone here: no server, no RSC
 * boundary, no bundler. If the seed is read, the difference is environmental.
 */
import { describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolver,
  currentSubjectLayer,
  CustomPredicateNone,
  SignatureHistoryNone,
  decide,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
} from "@qadi/core";
import type { AttributeResolverShape, SubjectId } from "@qadi/core";
import {
  dehydrateDecisions,
  hydrateDecisions,
  makeQadiAtoms,
  QadiProvider,
  useDecision,
} from "@qadi/react";
import { currentDecision } from "@qadi/react";
import { inGoodStanding } from "../src/domain/policies.ts";
import { users } from "../src/domain/subjects.ts";

const omar = users.find((user) => user.id === "omar")?.subject;
if (omar === undefined) throw new Error("the fixtures must contain omar");

/** The server's answer: in good standing. */
const good: Layer.Layer<AttributeResolver> = Layer.succeed(AttributeResolver, {
  resolve: (_subjectId: SubjectId, attribute: string) =>
    Effect.succeed(attribute === "standing" ? "good" : undefined),
} satisfies AttributeResolverShape);

/**
 * The browser's: a resolver that never answers.
 *
 * Exactly what this app's client-side ports do during a server render, and the
 * shape that isolates the question — with nothing to replace the seed, the guard
 * reads the seed or it reads nothing.
 */
const silent: Layer.Layer<AttributeResolver> = Layer.succeed(AttributeResolver, {
  resolve: () => Effect.never,
} satisfies AttributeResolverShape);

const Probe = () => {
  const result = useDecision(inGoodStanding);
  const decision = currentDecision(result);
  return <span data-testid="probe">{decision === undefined ? "none" : decision._tag}</span>;
};

describe("a seeded decision, with no Next in the way", () => {
  it("is what a mounted guard reads before this client can answer", async () => {
    // The server half.
    const entries = await Effect.runPromise(
      decide(inGoodStanding).pipe(
        Effect.map((decision) => [{ policy: inGoodStanding, decision }]),
        Effect.provide(
          Layer.mergeAll(
            good,
            RelationshipResolverNever,
            DecisionHistoryUnknown,
            EvaluationIdLive,
            CustomPredicateNone,
            SignatureHistoryNone,
            currentSubjectLayer(omar),
          ),
        ),
        Effect.orDie,
      ),
    );
    const payload = dehydrateDecisions(entries);
    expect(payload.entries).toHaveLength(1);
    expect(payload.entries[0]?.allowed).toBe(true);

    // The browser half.
    const atoms = makeQadiAtoms(
      Layer.mergeAll(
        silent,
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      ),
    );
    const initialValues = Array.from(hydrateDecisions(atoms, payload, omar));
    expect(initialValues).toHaveLength(1);

    render(
      <QadiProvider atoms={atoms} subject={omar} initialValues={initialValues}>
        <Probe />
      </QadiProvider>,
    );

    // The whole question. `Allow` means the seed covered the gap; `none` means
    // it did not, and the guard rendered pending with a seed sitting unread.
    expect(screen.getByTestId("probe").textContent).toBe("Allow");
    cleanup();
  });
});
