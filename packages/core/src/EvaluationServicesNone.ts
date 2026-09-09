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
import { AttributeResolverNone } from "./AttributeResolver.ts";
import type { CurrentSubject } from "./CurrentSubject.ts";
import { CustomPredicateNone } from "./CustomPredicate.ts";
import { DecisionHistoryUnknown } from "./DecisionHistory.ts";
import { EvaluationIdLive } from "./EvaluationId.ts";
import type { EvaluationServices } from "./Evaluate.ts";
import { RelationshipResolverNever } from "./RelationshipResolver.ts";
import { SignatureHistoryNone } from "./SignatureHistory.ts";

/**
 * `Layer.mergeAll(AttributeResolverNone, RelationshipResolverNever,
 * DecisionHistoryUnknown, EvaluationIdLive, CustomPredicateNone,
 * SignatureHistoryNone)` — nothing more.
 */
export const EvaluationServicesNone: Layer.Layer<
  Exclude<EvaluationServices, CurrentSubject>
> = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
  SignatureHistoryNone,
);
