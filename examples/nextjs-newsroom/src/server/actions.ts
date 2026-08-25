"use server";
/**
 * Server actions, and the rule that makes them safe.
 *
 * **A Server Action is a public POST endpoint.** Next gives it an unguessable id
 * rather than a route, which is obscurity and not authorization: anything that
 * can reach the app can invoke it. So every action that mutates re-authorizes
 * here, in the action, with no reference to what the page decided when it
 * rendered. The page's decision governed what was *drawn*; this one governs what
 * is *done*.
 *
 * That is the same rule as `/edge/middleware` and the same rule as ADR-QD-017,
 * one layer up: a decision taken somewhere else, earlier, is not this decision.
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import * as Effect from "effect/Effect";
import { assert } from "@qadi/core";
import { articleById } from "../domain/articles.ts";
import { canPublishArticle } from "../domain/policies.ts";
import { knownUserIds } from "../domain/subjects.ts";
import { asResource } from "./decide.ts";
import { runAs } from "./runtime.ts";
import { SESSION_COOKIE, currentUser } from "./session.ts";

/** Switches the demo session. Not authorization — this is the login. */
export const switchUser = async (formData: FormData): Promise<void> => {
  const wanted = formData.get("user");
  const id = typeof wanted === "string" && knownUserIds.includes(wanted) ? wanted : "";
  const jar = await cookies();
  if (id === "") jar.delete(SESSION_COOKIE);
  else jar.set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
};

export interface ActionOutcome {
  readonly ok: boolean;
  readonly message: string;
}

/**
 * Publishes an article, if the policy says so.
 *
 * `assert` rather than `check`: the caller has said "proceed only if permitted",
 * so a denial is a failure of this operation and not a boolean to branch on.
 * `AccessDenied` carries the trace, which is why the message below can name the
 * rule that refused rather than only say that something did.
 */
export const publish = async (articleId: string): Promise<ActionOutcome> => {
  const user = await currentUser();
  const article = articleById(articleId);
  if (article === undefined) return { ok: false, message: "no such article" };

  const outcome = await runAs(
    user.subject,
    Effect.gen(function* () {
      const resource = yield* asResource(article);
      return yield* assert(canPublishArticle, { resource, action: "publish" }).pipe(
        Effect.as<ActionOutcome>({ ok: true, message: `published “${article.title}”` }),
        // Named individually rather than caught wholesale: an `AccessDenied` is
        // an answer and an `AttributeResolveError` is an outage, and reporting
        // the second as the first is how an attribute store falling over becomes
        // "you may not publish this".
        Effect.catchTag("AccessDenied", (denied) =>
          Effect.succeed<ActionOutcome>({ ok: false, message: `refused: ${denied.reason}` })),
        Effect.catchTag(
          [
            "AttributeResolveError",
            "RelationshipResolveError",
            "DecisionHistoryUnavailable",
            "MissingAction",
            "MissingResource",
            "MissingResourceId",
            "PolicyTooDeep",
            "UndischargedObligation",
          ],
          (error) =>
            Effect.succeed<ActionOutcome>({
              ok: false,
              message: `could not decide (${error._tag}) — an outage, not a denial`,
            }),
        ),
      );
    }),
  );

  revalidatePath("/edge/action");
  return outcome;
};
