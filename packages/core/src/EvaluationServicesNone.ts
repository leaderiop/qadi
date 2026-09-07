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
 * by hand. 30+ call sites across the test suite and other packages already
 * build exactly this combination inline; this gives new code a name for it
 * instead of one more copy. Existing call sites are unchanged — swapping them
 * over is a separate, much larger change.
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
