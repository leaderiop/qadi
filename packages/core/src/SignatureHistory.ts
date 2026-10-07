/**
 * Answers "which signatures does this subject/resource have on file?" — the
 * port `PortAccess.ts`'s `askSignature` reads from to answer a
 * `hasSignature` policy node.
 *
 * Wayfinder ticket #14 (`hasSignature`) is implemented end to end
 * (ADR-QD-057, ADR-QD-058): this was once the port declared ahead of that
 * leaf, but that gap closed when `HasSignature` shipped.
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
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import { SignatureHistoryUnavailable } from "./Errors.ts";
import type { InvalidBoundedPermits } from "./Errors.ts";
import { makeSubjectId } from "./Identity.ts";
import type { ResourceId, SubjectId } from "./Identity.ts";
import { boundedPort, nonePort, retryingPort, timingOutPort } from "./PortDerivation.ts";
import type { PortDescription } from "./PortDescription.ts";
import { sharedQuestionFields, sharedQuestionKeys, spanStruct } from "./PortSpanEncode.ts";
import type { Signature } from "./Signature.ts";

export interface SignatureQuery {
  readonly subjectId: SubjectId;
  /** The resource the question is scoped to. Absent for a subject-global question. */
  readonly resourceId: ResourceId | undefined;
}

export interface SignatureHistoryShape {
  /** Which implementation this is. A label only — see `AttributeResolverShape`. */
  readonly name?: string | undefined;
  /**
   * Returns every signature on file matching the query.
   *
   * An implementation is not required to fail cleanly. `PortAccess.ts`'s
   * `askSignature` catches a defect from this call and converts it
   * into this same `SignatureHistoryUnavailable`, matching
   * `AttributeResolverShape.resolve`'s own contract — see its doc comment for
   * why (issue #100).
   */
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
 * The fail-closed answer: no signatures. Frozen, because one array is shared
 * by every call that gets it — a caller pushing onto the answer must not
 * change what the next caller is told.
 */
const NO_SIGNATURES: ReadonlyArray<Signature> = Object.freeze([]);

/**
 * What `HasSignature` needs from the signatures on file: whether one matched,
 * and whether there were any at all (the deny reason distinguishes "nothing on
 * file" from "none match").
 *
 * What the signature span's `disclose` reads. `onFile` is deliberately not on
 * the span (ARCH-21's non-goals): a count of signatures is a disclosure
 * decision of its own.
 */
export interface SignatureAnswer {
  readonly matched: boolean;
  readonly onFile: number;
}

/**
 * What the signature span says (BEH-QD-227). `qadi.matched` rather than a
 * three-valued answer: a signature either matches or it does not.
 */
const signatureSpan = {
  question: spanStruct(
    {
      meaning: Schema.optionalKey(Schema.String),
      scope: Schema.optionalKey(Schema.Literals(["Any", "Resource"])),
      signerRole: Schema.optionalKey(Schema.String),
      resourceId: Schema.optionalKey(Schema.String),
      ...sharedQuestionFields,
    },
    {
      meaning: "qadi.meaning",
      scope: "qadi.scope",
      signerRole: "qadi.signer_role",
      resourceId: "qadi.resource_id",
      ...sharedQuestionKeys,
    },
  ),
  answer: spanStruct({ matched: Schema.optionalKey(Schema.Boolean) }, { matched: "qadi.matched" }),
  disclose: (outcome: SignatureAnswer) => ({ matched: outcome.matched }),
};

/**
 * The signature-history port, described once (`PortDescription.ts`).
 *
 * A request is keyed by `(subjectId, resourceId)`, with an absent resource as
 * `null` — the same pair `signatureHistoryFromSignatures` groups by.
 */
export const signatureHistoryPort: PortDescription<
  "SignatureHistory",
  SignatureHistory,
  SignatureHistoryShape,
  [query: SignatureQuery],
  ReadonlyArray<Signature>,
  SignatureHistoryUnavailable,
  typeof signatureSpan
> = {
  port: "SignatureHistory",
  method: "signaturesFor",
  span: "qadi.hasSignature",
  attributes: signatureSpan,
  service: SignatureHistory,
  invoke: (shape) => (query) => shape.signaturesFor(query),
  make: (name, call) => ({ name, signaturesFor: call }),
  failure: ([query], cause) =>
    new SignatureHistoryUnavailable({
      subjectId: query.subjectId,
      resourceId: query.resourceId,
      cause,
    }),
  defect: ([query], cause) =>
    new SignatureHistoryUnavailable({
      subjectId: query.subjectId,
      resourceId: query.resourceId,
      cause: Cause.squash(cause),
    }),
  key: ([query]) => JSON.stringify([query.subjectId, query.resourceId ?? null]),
  none: { name: "SignatureHistoryNone", answer: NO_SIGNATURES },
};

/**
 * Knows of no signatures, so every `hasSignature` policy denies.
 *
 * The default. Unlike `DecisionHistoryUnknown`, no polarity argument applies
 * here — `hasSignature` has no `hasNotSigned` counterpart the way
 * `HasActed`/`HasNotActed` do, so an empty list denying is unambiguous
 * (INV-QD-007: defaults fail closed). Derived from
 * {@link signatureHistoryPort}'s `none` (ADR-QD-040).
 */
export const SignatureHistoryNone: Layer.Layer<SignatureHistory> = nonePort(signatureHistoryPort);

/**
 * One fixture signature, in the form a form or a test literal produces.
 *
 * `signedAt` defaults to `0` — `hasSignature`'s trust-on-presence semantics
 * (wayfinder ticket #14) never compare it to anything, so a fixture author
 * should not have to invent a timestamp to describe "this subject signed
 * this". The same is true of `algorithm` and `keyId` below: `askSignature`
 * (`PortAccess.ts`) matches only on `meaning` and, when given, `signerRole` — an
 * on-file signature with an unrecognized `algorithm` or a stale `keyId` still
 * matches, and no expiry is derived from `signedAt` either. `Signature`'s doc
 * comment on the type itself carries the full statement of this limitation;
 * this fixture just needs no value for either to build a matching row.
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
    // A copy per query, not the live array `grouped` holds: handing out the
    // internal reference would let a caller's push/splice on the returned
    // list corrupt every future answer for that same key.
    signaturesFor: (query) =>
      Effect.succeed([
        ...(grouped.get(JSON.stringify([query.subjectId, query.resourceId ?? null])) ?? []),
      ]),
  });
};

/**
 * Wraps a signature-history layer so every `signaturesFor` call retries on
 * `SignatureHistoryUnavailable` under the given schedule before surfacing it —
 * `attributeResolverRetrying` for this port: it annotates `qadi.attempts` on
 * the caller's span and counts failed attempts in `portRetriesTotal`. Derived
 * from {@link signatureHistoryPort} by `PortDerivation.ts`'s `retryingPort`.
 */
export const signatureHistoryRetrying: (
  schedule: Schedule.Schedule<unknown, SignatureHistoryUnavailable>,
) => (layer: Layer.Layer<SignatureHistory>) => Layer.Layer<SignatureHistory> =
  retryingPort(signatureHistoryPort);

/**
 * Wraps a signature-history layer so no more than `permits` calls to
 * `signaturesFor` run at once, queuing the rest — `attributeResolverBounded`
 * for this port. `permits` that is not a positive integer fails construction
 * with `InvalidBoundedPermits`.
 */
export const signatureHistoryBounded: (
  permits: number,
) => (
  layer: Layer.Layer<SignatureHistory>,
) => Layer.Layer<SignatureHistory, InvalidBoundedPermits> = boundedPort(signatureHistoryPort);

/**
 * Wraps a signature-history layer so a `signaturesFor` call that does not
 * settle within `duration` fails with a typed `SignatureHistoryUnavailable`
 * instead of holding its caller open — `attributeResolverTimingOut` for this
 * port (see its doc comment for the composition order) — and counts in
 * `portTimeoutsTotal`.
 */
export const signatureHistoryTimingOut: (
  duration: Duration.Input,
) => (layer: Layer.Layer<SignatureHistory>) => Layer.Layer<SignatureHistory> =
  timingOutPort(signatureHistoryPort);
