/**
 * The part of an article a policy decides against — and only that part.
 *
 * **The resource is part of the atom key.** `Atom.family` keys structurally, so
 * a seeded decision lands on the client's atom only if the client holds a
 * resource *equal* to the one the server decided against. Which means: whatever
 * you decide against crosses the RSC boundary, guard or no guard.
 *
 * This example learned that by leaking. `/newsroom` originally handed whole
 * `Article`s to a client component and wrapped the sensitive fields in `<Can>`.
 * Every guard denied correctly and every source contact was in the HTML anyway,
 * because a `<Can>` chooses what to *render* and a prop crosses before anything
 * is rendered at all. It is the Next.js hazard in its own words — "Server
 * Components that pass full data objects as props to Client Components can leak
 * data that should stay server-side" — arriving through an authorization
 * library's front door.
 *
 * So the rule this file exists to enforce: **decide against attributes, never
 * against content.** Six fields, all of them things a policy matches on, none of
 * them anything worth reading. The article's body and its source travel
 * separately, already narrowed by `project` on the server, and what a reader may
 * not see is *absent* rather than hidden.
 */
import type { Resource } from "@qadi/core";
import type { Article } from "./articles.ts";

export interface ArticleResource extends Resource {
  readonly id: string;
  readonly status: string;
  readonly authorId: string;
  readonly embargoUntil: number;
  /**
   * Derived from the evaluator's clock by the caller.
   *
   * The matcher DSL compares a value to a `ValueRef` for `Eq`, `Neq` and
   * `Dominates`, and its relational matchers take a **literal number**. There is
   * no way to write "this resource's `embargoUntil` is at or before now", so the
   * comparison happens where the clock already is.
   */
  readonly embargoLifted: boolean;
  readonly classification: { readonly level: number; readonly compartments: ReadonlyArray<string> };
}

export const policyResource = (article: Article, nowMillis: number): ArticleResource => ({
  id: article.id,
  status: article.status,
  authorId: article.authorId,
  embargoUntil: article.embargoUntil,
  embargoLifted: nowMillis >= article.embargoUntil,
  classification: article.classification,
});
