/**
 * The core reference and the sites the two remedy agreement tests share.
 *
 * Read by `model/RemedySignatureConformance.test.ts` and
 * `model/RemedyActedConformance.test.ts`. `outcomeOf` evaluates a policy with
 * `@qadi/core`'s `evaluate` for a subject over `fixturePortsLayer` with the
 * fixture data given and sequential evaluation ids, so each agreement compares the
 * remedy table with core actually run and shares no code with the simulator it
 * checks. `SITES` holds the four sites both tests walk, one site row each.
 */
import {
  currentSubjectLayer,
  evaluate,
  evaluationIdSequential,
  fixturePortsLayer,
  makeSubject,
} from "@qadi/core";
import type {
  Decision,
  EvaluationError,
  Policy,
  PortFixtures,
  Resource,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Result from "effect/Result";
import type { SimulationInput } from "../src/model/SimulationInput.ts";

/** The subject every product case asks as. */
export const asker: SimulationInput["subject"] = { id: "alice" };

/**
 * The four sites a check can be asked at, a record rather than a list so that
 * each site row's title is its own string literal.
 */
export const SITES: {
  readonly withId: Resource;
  readonly withoutId: Resource;
  readonly withNonStringId: Resource;
  readonly withoutResource: undefined;
} = {
  withId: { id: "doc-1" },
  withoutId: {},
  withNonStringId: { id: 7 },
  withoutResource: undefined,
};

/** What `@qadi/core` decides for `policy`, asked by `subject` at `resource`. */
export const outcomeOf = (
  policy: Policy,
  subject: SimulationInput["subject"],
  resource: Resource | undefined,
  ports: PortFixtures,
): Effect.Effect<Result.Result<Decision, EvaluationError>> =>
  Effect.result(evaluate(policy, resource === undefined ? {} : { resource })).pipe(
    Effect.provide(
      Layer.mergeAll(
        currentSubjectLayer(
          makeSubject({ id: subject.id, roles: [], permissions: [], attributes: {} }),
        ),
        fixturePortsLayer(ports),
        evaluationIdSequential(),
      ),
    ),
  );
