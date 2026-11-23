/**
 * The one test of whether a policy leaf asks about one resource, and the one
 * failure of asking about one without an id for it.
 *
 * It is shared by what a port's `asks` puts in the request, the read that
 * answers it and the fixture judgements that answer what the read would.
 *
 * `DecisionHistory` and `SignatureHistory` leave `resourceId` optional in their
 * request (an `Any`-scoped question has none), so nothing in the types stops a
 * `Resource`-scoped request reaching the port without one. What does is that
 * `asks` reads the id through {@link scopedResourceIdOf} and the read routes on
 * {@link isResourceScoped}, which the first calls: the request's id and the
 * route cannot disagree on the leaf's `scope` (INV-QD-288, ADR-QD-134).
 * {@link requireResourceId} is the check that a resource-scoped request has its id:
 * `readScoped` (`PortAccess.ts`) and both judgements (`actedAnswerFromEvents`,
 * `signatureAnswerFromSignatures`) call it, so the three cannot disagree on when a
 * request is missing one or on what that fails as. It builds `MissingResourceId`
 * here, and not through `LeafNeeds.ts`, because that module's type imports of the
 * port modules would close a cycle through them.
 *
 * Deliberately out of the barrel (AGENTS.md §9): scaffolding for the port
 * modules and `PortAccess.ts`, not importable from outside `@qadi/core`.
 */
import * as Result from "effect/Result";
import { MissingResourceId } from "./Errors.ts";
import type { ResourceId } from "./Identity.ts";
import { resourceIdOf } from "./Resource.ts";
import type { Resource } from "./Resource.ts";

/** A policy leaf that says whether it asks about one resource or the subject alone. */
interface ScopedLeaf {
  readonly scope: "Resource" | "Any";
}

/** Whether a leaf's question is about one resource (`scope: "Resource"`). */
export const isResourceScoped = (leaf: ScopedLeaf): boolean => leaf.scope === "Resource";

/**
 * The id a leaf's request carries: the site's resource id for a `Resource`-scoped
 * leaf (`undefined` when the site has none, which the read refuses) and none for
 * an `Any`-scoped one.
 */
export const scopedResourceIdOf = (
  leaf: ScopedLeaf,
  resource: Resource | undefined,
): ResourceId | undefined => (isResourceScoped(leaf) ? resourceIdOf(resource) : undefined);

/**
 * The id a request about the leaf's resource carries, or `MissingResourceId` for
 * `relation` when the leaf asks about one resource and the request has none.
 *
 * An `Any`-scoped leaf asks about the subject alone, so it needs no id and the
 * answer is `undefined`; for a leaf whose `scope` is `"Resource"` the answer is the
 * id, so a caller holding one such leaf (`readScoped`) has it without a second
 * test. `relation` is the event, the relation or the meaning the leaf asks.
 */
export function requireResourceId(
  leaf: { readonly scope: "Resource" },
  resourceId: ResourceId | undefined,
  relation: string,
): Result.Result<ResourceId, MissingResourceId>;
export function requireResourceId(
  leaf: ScopedLeaf,
  resourceId: ResourceId | undefined,
  relation: string,
): Result.Result<ResourceId | undefined, MissingResourceId>;
export function requireResourceId(
  leaf: ScopedLeaf,
  resourceId: ResourceId | undefined,
  relation: string,
): Result.Result<ResourceId | undefined, MissingResourceId> {
  return isResourceScoped(leaf) && resourceId === undefined
    ? Result.fail(new MissingResourceId({ relation }))
    : Result.succeed(resourceId);
}
