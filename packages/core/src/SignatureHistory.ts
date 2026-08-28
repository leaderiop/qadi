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
import { makeSubjectId } from "./Identity.ts";
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

/**
 * One fixture signature, in the form a form or a test literal produces.
 *
 * `signedAt` defaults to `0` — `hasSignature`'s trust-on-presence semantics
 * (wayfinder ticket #14) never compare it to anything, so a fixture author
 * should not have to invent a timestamp to describe "this subject signed
 * this".
 */
export interface SignatureInput {
  readonly subjectId: string;
  /** Absent means this row only answers a subject-global (`resourceId` absent) query. */
  readonly resourceId?: string;
  readonly meaning: string;
  readonly signerRole?: string;
  readonly signedAt?: number;
  readonly algorithm?: string;
  readonly keyId?: string;
}

/**
 * Resolves against a static signature list.
 *
 * A closed world: a `(subjectId, resourceId)` pair not listed answers `[]`,
 * because this layer *is* the store and it does know — the same distinction
 * `decisionHistoryFromEvents` draws. A resource-scoped query only ever sees
 * rows stored with that same `resourceId`, and a subject-global query
 * (`resourceId` absent) only ever sees rows stored with none — the same
 * separation `ActedEvent`/`ActedAnywhere` keep, expressed here as a
 * `JSON.stringify`-keyed group rather than a `HashSet`, since the answer to
 * one key is a *list* of signatures rather than one membership bit.
 *
 * `JSON.stringify` on the pair, not a template-string join: unlike
 * `${a} ${b}`, which is exactly the collision `ActedEvent`'s own doc comment
 * warns about, `JSON.stringify` escapes each element, so `["a:b", "c"]` and
 * `["a", "b:c"]` serialize to different strings — the same collision-safety
 * `@qadi/devtools`'s `Capture.ts` already relies on for its own compound keys.
 */
export const signatureHistoryFromSignatures = (
  signatures: ReadonlyArray<SignatureInput>,
): Layer.Layer<SignatureHistory> => {
  const grouped = new Map<string, Array<Signature>>();
  for (const input of signatures) {
    const key = JSON.stringify([input.subjectId, input.resourceId ?? null]);
    const signature: Signature = {
      signerId: makeSubjectId(input.subjectId),
      meaning: input.meaning,
      signedAt: input.signedAt ?? 0,
      ...(input.signerRole === undefined ? {} : { signerRole: input.signerRole }),
      ...(input.algorithm === undefined ? {} : { algorithm: input.algorithm }),
      ...(input.keyId === undefined ? {} : { keyId: input.keyId }),
    };
    const existing = grouped.get(key);
    if (existing === undefined) grouped.set(key, [signature]);
    else existing.push(signature);
  }

  return Layer.succeed(SignatureHistory, {
    name: "signatureHistoryFromSignatures",
    signaturesFor: (query) =>
      Effect.succeed(
        grouped.get(JSON.stringify([query.subjectId, query.resourceId ?? null])) ?? [],
      ),
  });
};
