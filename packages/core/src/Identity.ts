/**
 * Branded subject and resource identity.
 *
 * Total, non-validating brands (`Brand.nominal`, not `Schema.brand`) — unlike
 * the Policy-ADT's `RoleName`/`ActionName`/etc. (`Policy.ts`), these aren't
 * drawn from a closed, `SEGMENT_PATTERN`-shaped vocabulary. A subject or
 * resource id is caller-supplied identity from an external system — a
 * database row, a UUID — the same "open namespace" carve-out `Policy.ts`
 * documents for `attribute`. There is nothing to validate, only two
 * identically-shaped strings to keep from being transposed at a call site:
 * the same class of bug branding was introduced to prevent for role/action/
 * event names, one hop closer to the trust boundary.
 *
 * Kept in their own leaf file rather than `AuthSubject.ts`/`Evaluate.ts`: both
 * `SubjectId` and `ResourceId` are needed together by files on both sides of
 * that pair (`DecisionHistory.ts`, `Errors.ts`, `RelationshipResolver.ts` —
 * `Decision.ts` needs only `SubjectId`), and neither owning file should have
 * to depend on the other just to name the sibling brand.
 *
 * `SubjectIdSchema`/`ResourceIdSchema` wrap the same `Brand.Constructor`s via
 * `Schema.fromBrand` — for the handful of trust-boundary schemas (the nine
 * wire-crossing errors in `Errors.ts`, ADR-QD-060) that need a branded field
 * inside a `Schema.TaggedError`, not a second, independently-typed brand.
 */
import * as Brand from "effect/Brand";
import * as Schema from "effect/Schema";

/**
 * The brand tag itself, as a value — not just the type-level string literal
 * `"SubjectId"` `Brand.Brand`/`Schema.brand`/`Schema.fromBrand` each expect.
 *
 * `SubjectId` is a plain `Brand.nominal`, not a `Schema`, so a `Schema`-derived
 * field elsewhere in the codebase (`Signature.ts`'s `signerId`) cannot import
 * the brand itself and has to declare the same tag independently via
 * `Schema.brand(SUBJECT_ID_TAG)`. Exporting the tag as a constant, rather than
 * leaving `"SubjectId"` as a string literal repeated at each declaration site,
 * means a typo at the second site is a compile error (an unknown import) or a
 * reference to the wrong constant, not a silently-different nominal type that
 * only surfaces as an assignability error far from either declaration
 * (MP-06).
 */
export const SUBJECT_ID_TAG = "SubjectId" as const;

export type SubjectId = string & Brand.Brand<typeof SUBJECT_ID_TAG>;
export const makeSubjectId = Brand.nominal<SubjectId>();
export const SubjectIdSchema = Schema.String.pipe(
  Schema.fromBrand(SUBJECT_ID_TAG, makeSubjectId),
);

export type ResourceId = string & Brand.Brand<"ResourceId">;
export const makeResourceId = Brand.nominal<ResourceId>();
export const ResourceIdSchema = Schema.String.pipe(
  Schema.fromBrand("ResourceId", makeResourceId),
);
