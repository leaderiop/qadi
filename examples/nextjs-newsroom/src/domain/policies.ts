/**
 * The questions this newsroom asks, one per mechanism.
 *
 * Chosen for coverage rather than for realism: between them these six reach
 * every port (`AttributeResolver`, `RelationshipResolver`, `DecisionHistory`),
 * every combinator, a rule table, a negation, an obligation and the label
 * lattice. That is what makes the devtools' Inspector, Policy explorer and
 * Services screens show something other than an empty state.
 *
 * Every branch is `labeled`, because a trace of bare tags reads as a stack dump
 * and a trace of labels reads as sentences — which is the difference between the
 * explanation tree being useful and being decoration.
 */
import {
  allOf,
  anyOf,
  denyWhen,
  dominates,
  eq,
  hasActed,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  labeled,
  literal,
  not,
  obligation,
  obliged,
  permitWhen,
  resource,
  rules,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import {
  publishArticle,
  readArticle,
  readDevtools,
  readSource,
  writeArticle,
} from "./permissions.ts";

/**
 * Three ways to be allowed to read: it is published, you wrote it, or you edit.
 *
 * `AnyOf` short-circuits, which is why the Inspector can show a node that was
 * *never resolved* rather than denied — and why that distinction had to be built
 * ([BEH-QD-208](../../../../spec/behaviors/27-devtools-timeline.md)).
 */
export const canReadArticle: Policy = labeled(
  "may read this article",
  anyOf([
    labeled("it is published", hasResourceAttribute("status", eq(literal("published")))),
    labeled("you wrote it", hasRelationship("author-of")),
    labeled("you edit here", hasRole("Editor")),
  ]),
);

/**
 * A rule table, denying overrides.
 *
 * Two independent reasons to refuse and one reason to permit. `DenyOverrides`
 * means the permit row cannot rescue an embargo, which is the whole reason a
 * table is the right shape here rather than an `allOf` of negations: a reviewer
 * reading the Policy explorer sees the two refusals as rows, named.
 */
export const canPublishArticle: Policy = labeled(
  "may publish this article",
  rules(
    [
      denyWhen(
        labeled(
          "the embargo has not lifted",
          // `embargoLifted` is a **derived** resource attribute: the caller
          // computes it from the evaluator's clock and puts it on the resource,
          // rather than the policy reading a clock of its own.
          //
          // It is derived because it cannot be written any other way. The
          // matcher DSL compares a value to a `ValueRef` for `Eq`, `Neq` and
          // `Dominates`, and its relational matchers — `Gte`, `Lt` — take a
          // **literal number only**. There is no way to say "this resource's
          // `embargoUntil` is at or before this subject's `nowMillis`", so the
          // comparison happens where the clock already is. See the README.
          not(hasResourceAttribute("embargoLifted", eq(literal(true)))),
        ),
      ),
      denyWhen(
        labeled(
          "legal has not signed it off",
          not(hasActed("legal-review", { scope: "Resource" })),
        ),
      ),
      permitWhen(labeled("you may publish", hasPermission(publishArticle))),
    ],
    { combining: "DenyOverrides" },
  ),
);

/**
 * The same question, with the fields the answer permits.
 *
 * `Intersection` is the strategy that matters: an `allOf` whose branches each
 * name a field set answers with what **both** allow, so adding a requirement can
 * only narrow what is visible. `Union` here would let one satisfied branch widen
 * a denial's redaction, which is the field-lattice version of a fail-open.
 */
export const viewArticle: Policy = labeled(
  "may view this article, and how much of it",
  allOf(
    [
      canReadArticle,
      labeled(
        "sources are Editor and above",
        anyOf([
          hasPermission(readSource),
          // The branch that restricts. Below Editor this is the only satisfied
          // arm, and its `fields` is what the intersection lands on.
          hasPermission(readArticle, {
            fields: ["id", "title", "status", "authorId", "embargoUntil", "classification", "body"],
          }),
        ]),
      ),
    ],
    { fieldStrategy: "Intersection" },
  ),
);

/** Reading a source is allowed, and owes an audit entry for having been. */
export const readSourceContact: Policy = labeled(
  "may read the source contact",
  obliged(
    obligation("audit-source-read", { channel: "newsroom-audit" }),
    hasPermission(readSource),
  ),
);

/**
 * Bell–LaPadula, no read up.
 *
 * `dominates` compares two `SecurityLabel`s — a level and a compartment set —
 * and it is a partial order, so *incomparable* is a real answer and is a denial.
 * The subject's clearance arrives through `AttributeResolver`; the resource's
 * label is on the article.
 */
export const readBriefing: Policy = labeled(
  "your clearance covers this classification",
  hasAttribute("clearance", dominates(resource("classification"))),
);

/**
 * Standing — the attribute `/edge/divergent` revokes mid-flight.
 *
 * Deliberately a subject attribute rather than a role or a permission: those two
 * are read off `AuthSubject` and settle synchronously, so the browser would
 * answer from the copy it already holds and could never disagree with the
 * server. An attribute goes through `AttributeResolver`, which in the browser is
 * an HTTP call — so the two sides can genuinely be told different things, which
 * is the whole point.
 */
export const inGoodStanding: Policy = labeled(
  "you are in good standing",
  hasAttribute("standing", eq(literal("good"))),
);

/** What guards `/__decisions` and `/__permissions`. */
export const canReadDevtools: Policy = labeled(
  "may read this deployment's decisions",
  hasPermission(readDevtools),
);

/** Draft editing, used by the server action route. */
export const canWriteArticle: Policy = labeled(
  "may write this article",
  allOf([
    hasPermission(writeArticle),
    labeled("it is yours, or you edit here", anyOf([
      hasRelationship("author-of"),
      hasRole("Editor"),
    ])),
  ]),
);

/**
 * Named for the Policy explorer's left rail and the dock's `catalogue`.
 *
 * The rail is built from what the log has *seen*, so this adds only the ones
 * that have not run yet — and the names, which a `Policy` does not carry.
 */
export const catalogue: Readonly<Record<string, Policy>> = {
  canReadArticle,
  inGoodStanding,
  canWriteArticle,
  canPublishArticle,
  viewArticle,
  readSourceContact,
  readBriefing,
  canReadDevtools,
};
