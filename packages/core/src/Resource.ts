/**
 * Arbitrary resource attributes a policy may inspect.
 *
 * Its own leaf file rather than `Evaluate.ts`, where it used to live:
 * `Decision.ts` needs it for `project`/`isFieldOf`, and `Evaluate.ts` needs
 * `Decision.ts`'s `Trace` — so defining it in `Evaluate.ts` made that a
 * type-only import cycle. Erased at compile time either way, but a leaf
 * module the evaluation engine doesn't own is the shape everything else in
 * this file's dependency graph already follows (`Identity.ts`,
 * `Permission.ts`, `Obligation.ts`).
 */
import { makeResourceId } from "./Identity.ts";
import type { ResourceId } from "./Identity.ts";

export type Resource = Readonly<Record<string, unknown>>;

/**
 * The id a resource is recorded under, or `undefined` when it has none.
 *
 * The **writer's** half of the rule `askSignature` and `askActedForResource`
 * read with: a string `id` is the resource's id, anything else (absent, a
 * number, a nested object) is "no id". A capture flow that stores a signature
 * for a resource keys it with this, so a resource-scoped `hasSignature` asks
 * the store the question it was written under. `Walk.ts`'s own reads stay raw
 * (`resource?.["id"]`) because they must tell "no id" from "a non-string id"
 * (`MissingResourceId`); this function deliberately cannot.
 */
export const resourceIdOf = (resource: Resource | undefined): ResourceId | undefined => {
  const id = resource?.["id"];
  return typeof id === "string" ? makeResourceId(id) : undefined;
};
