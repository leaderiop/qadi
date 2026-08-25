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
 * `SubjectId` and `ResourceId` are needed from files on both sides of that
 * pair (`DecisionHistory.ts`, `Errors.ts`, `DecisionCache.ts`,
 * `RelationshipResolver.ts`, `Decision.ts`), and neither owning file should
 * have to depend on the other just to name the sibling brand.
 */
import * as Brand from "effect/Brand";

export type SubjectId = string & Brand.Brand<"SubjectId">;
export const makeSubjectId = Brand.nominal<SubjectId>();

export type ResourceId = string & Brand.Brand<"ResourceId">;
export const makeResourceId = Brand.nominal<ResourceId>();
