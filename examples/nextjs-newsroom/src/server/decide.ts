import "server-only";
/**
 * What a page asks, and what it hands the browser.
 *
 * The shape every route in this example uses: name the questions the page will
 * render, decide them all on the server, and project the answers into a payload
 * the client seeds its atoms from. Without the seed every guarded control
 * renders pending and re-decides after mount — a visible flash, and a round trip
 * per question the server already knew.
 *
 * The payload is **plain JSON**. `DehydratedDecisions` is booleans, strings,
 * numbers and encoded policies, which is what lets it cross the RSC boundary as
 * a prop. That is not automatic: React 19 refuses functions and class instances,
 * and a `Decision` is a `Data.TaggedClass`. `dehydrateDecisions` is what turns
 * one into the other, and is why it carries no `"use client"` directive — a
 * Server Component has to be able to call it.
 */
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import { decide } from "@qadi/core";
import type { Decision, Policy, Resource } from "@qadi/core";
import { dehydrateDecisions } from "@qadi/react";
import type { DecisionEntry, DehydratedDecisions } from "@qadi/react";
import type { Article } from "../domain/articles.ts";
import { policyResource } from "../domain/resource.ts";
import type { ArticleResource } from "../domain/resource.ts";

/** One thing a page wants to know. */
export interface Question {
  readonly policy: Policy;
  readonly resource?: Resource | undefined;
}

/**
 * The attributes a policy decides against, and nothing else.
 *
 * `Clock.currentTimeMillis`, never `Date.now()`: the clock belongs to the
 * evaluator, so an evaluation is reproducible under `TestClock`. That is not
 * fastidiousness — the predecessor to this library read the wall clock inside
 * the evaluator and made every trace untestable.
 *
 * See `domain/resource.ts` for why this is six fields rather than the article.
 */
export const asResource = (article: Article): Effect.Effect<ArticleResource> =>
  Effect.map(Clock.currentTimeMillis, (now) => policyResource(article, now));

export interface Decided {
  readonly entries: ReadonlyArray<DecisionEntry>;
  readonly payload: DehydratedDecisions;
  readonly byIndex: ReadonlyArray<Decision>;
}

export interface DecideOptions {
  /**
   * Ship the trace, and a denial's real reason.
   *
   * Off by default and that default is the security decision: a trace names
   * every node's label and the sentence explaining which branch this subject
   * failed. `/edge/leakage` turns it on so the difference is visible rather than
   * asserted.
   */
  readonly includeTrace?: boolean;
  /** Called with entries dropped for belonging to another subject. */
  readonly onDropped?: (dropped: ReadonlyArray<DecisionEntry>) => void;
}

/**
 * Decides every question and projects the answers.
 *
 * `decide`, not `check`: the page needs the whole `Decision` — its visible
 * fields, its obligations and its evaluation id — because the payload carries
 * all three, and the id is what later joins the server's row to the browser's
 * re-check in the devtools timeline.
 */
export const decideAll = (
  questions: ReadonlyArray<Question>,
  options?: DecideOptions,
) =>
  Effect.gen(function* () {
    const entries: Array<DecisionEntry> = [];
    for (const question of questions) {
      const decision = yield* decide(
        question.policy,
        question.resource === undefined ? undefined : { resource: question.resource },
      );
      entries.push({
        policy: question.policy,
        ...(question.resource === undefined ? {} : { resource: question.resource }),
        decision,
      });
    }

    return {
      entries,
      payload: dehydrateDecisions(entries, {
        includeTrace: options?.includeTrace ?? false,
        ...(options?.onDropped === undefined ? {} : { onDropped: options.onDropped }),
      }),
      byIndex: entries.map((entry) => entry.decision),
    } satisfies Decided;
  });
