/**
 * The combined fail-closed default for every optional evaluation port.
 *
 * `CurrentSubject` is deliberately excluded: it carries a per-call value, not
 * a port with a sensible "none" implementation, so it stays out of this
 * bundle the same way `subjectSetLayer`/`qadiReviewLayer` exclude it from
 * theirs (ADR-QD-022). Everything else `EvaluationServices` lists is here,
 * each at its own fail-closed default — `AttributeResolverNone`,
 * `RelationshipResolverNever`, `DecisionHistoryUnknown`, `EvaluationIdLive`,
 * `CustomPredicateNone`, `SignatureHistoryNone` — so a caller who needs no
 * optional port wired up does not have to re-assemble this `Layer.mergeAll`
 * by hand.
 *
 * **`EvaluationIdLive` is a member here on purpose (GS-05).** A bundle is
 * named for the ports it *lacks*; a member's own `…Live`/`…None`/`…Never`
 * suffix describes that member in isolation, not the bundle that carries it —
 * `EvaluationId` has no meaningful "none" (every evaluation needs an id), so
 * its only default is the same `…Live` implementation any caller would reach
 * for on its own. The two suffix conventions describe different things and
 * are not expected to agree.
 *
 * **Corrected (issue #103).** This previously claimed "30+ call sites across
 * the test suite and other packages" hand-retyped the identical stack, and
 * said adopting `EvaluationServicesNone` at those sites was "a separate, much
 * larger change" left for later. Re-running the grep the claim was based on
 * found 37 genuine hand-typed copies — across README.md, the website docs,
 * `spec/`'s worked examples, BDD step files, example-app tests, and every
 * public package's own test suite — and all 37 now import this export
 * instead (a site composing a subject keeps doing so via
 * `Layer.mergeAll(EvaluationServicesNone, currentSubjectLayer(...))`). A
 * further set of call sites that *look* similar were deliberately left
 * hand-typed because they substitute a different implementation for one of
 * the six ports (a broken or recording resolver, a parameterized
 * overrides-per-port test helper, a model doc illustrating a real resolver)
 * — those are a different bundle, not a copy of this one, and each is
 * commented in place as a deliberate exception.
 */
import * as Layer from "effect/Layer";
import { EvaluationIdLive } from "./EvaluationId.ts";
import type { StandingEvaluationServices } from "./Evaluate.ts";
import { portsLayer } from "./Ports.ts";

/**
 * `Layer.merge(portsLayer(), EvaluationIdLive)` — every port at its
 * fail-closed default, plus `EvaluationIdLive`; nothing more.
 *
 * One line over the registry (`Ports.ts`) rather than a hand list of the five
 * named defaults, so a port added to the registry is here without an edit
 * (ADR-QD-094). To override one port, pass it to `portsLayer` instead of
 * merging a layer after this one: `portsLayer({ AttributeResolver: … })`
 * places it in its own slot, where order cannot silently keep the default.
 */
export const EvaluationServicesNone: Layer.Layer<StandingEvaluationServices> = Layer.merge(
  portsLayer(),
  EvaluationIdLive,
);
