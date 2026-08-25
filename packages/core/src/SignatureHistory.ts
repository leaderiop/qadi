/**
 * Answers "which signatures does this subject/resource have on file?" — the
 * port `hasSignature` (wayfinder ticket #14, not yet built) will read from.
 *
 * A **port**, not a store, exactly as `DecisionHistory.ts` and
 * `RelationshipResolver.ts` are — the signatures themselves live wherever the
 * caller's capture flow (typically `@qadi/audit`'s `SignatureCapturePort`)
 * persisted them.
 *
 * Data-fetching, not a yes/no query: `signaturesFor` returns the raw
 * {@link Signature} list, and matching a `meaning`/`signerRole` requirement
 * against it is `hasSignature`'s own evaluation logic, not this port's — the
 * same "centralize the match rule once" reasoning `CustomPredicate.ts`
 * documents for its own registry lookup.
 *
 * One method, not two: `resourceId` is optional on the query exactly as
 * `DecisionHistory.ActedQuery`'s is — its presence or absence *is* the
 * `scope: "resource" | "subject"` split, mirrored from `HasActed`/
 * `HasNotActed` rather than inventing a second concept.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SignatureHistoryUnavailable } from "./Errors.ts";
import type { ResourceId, SubjectId } from "./Identity.ts";
import type { Signature } from "./Signature.ts";

export interface SignatureQuery {
  readonly subjectId: SubjectId;
  /** The resource the question is scoped to. Absent for a subject-global question. */
  readonly resourceId: ResourceId | undefined;
}

export interface SignatureHistoryShape {
  /** Which implementation this is. A label only — see `AttributeResolverShape`. */
  readonly name?: string | undefined;
  readonly signaturesFor: (
    query: SignatureQuery,
  ) => Effect.Effect<ReadonlyArray<Signature>, SignatureHistoryUnavailable>;
}

export class SignatureHistory extends Context.Service<
  SignatureHistory,
  SignatureHistoryShape
>()("qadi/SignatureHistory") {
  static readonly signaturesFor = (query: SignatureQuery) =>
    SignatureHistory.use((h) => h.signaturesFor(query));
}

/**
 * Knows of no signatures, so every `hasSignature` policy denies.
 *
 * The default. Unlike `DecisionHistoryUnknown`, no polarity argument applies
 * here — `hasSignature` has no `hasNotSigned` counterpart the way
 * `HasActed`/`HasNotActed` do, so an empty list denying is unambiguous
 * (INV-QD-007: defaults fail closed).
 */
export const SignatureHistoryNone: Layer.Layer<SignatureHistory> = Layer.succeed(
  SignatureHistory,
  { name: "SignatureHistoryNone", signaturesFor: () => Effect.succeed([]) },
);
