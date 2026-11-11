/**
 * The one test of whether a policy leaf asks about one resource, shared by what
 * a port's `asks` puts in the request and the read that answers it.
 *
 * `DecisionHistory` and `SignatureHistory` leave `resourceId` optional in their
 * request (an `Any`-scoped question has none), so nothing in the types stops a
 * `Resource`-scoped request reaching the port without one. What does is that
 * `asks` reads the id through {@link scopedResourceIdOf} and the read routes on
 * {@link isResourceScoped}, which the first calls: the request's id and the
 * route cannot disagree on the leaf's `scope` (INV-QD-288, ADR-QD-134).
 *
 * Deliberately out of the barrel (AGENTS.md §9): scaffolding for the port
 * modules and `PortAccess.ts`, not importable from outside `@qadi/core`.
 */
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
