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

export type SubjectId = string & Brand.Brand<"SubjectId">;
export const makeSubjectId = Brand.nominal<SubjectId>();
export const SubjectIdSchema = Schema.String.pipe(Schema.fromBrand("SubjectId", makeSubjectId));

export type ResourceId = string & Brand.Brand<"ResourceId">;
export const makeResourceId = Brand.nominal<ResourceId>();
export const ResourceIdSchema = Schema.String.pipe(
  Schema.fromBrand("ResourceId", makeResourceId),
);
