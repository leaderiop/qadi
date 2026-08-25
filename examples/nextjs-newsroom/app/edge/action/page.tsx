/**
 * A Server Action is a public POST endpoint.
 *
 * Next gives an action an unguessable id rather than a route, which is obscurity
 * and not authorization: anything that can reach the app can invoke it, with
 * whatever arguments it likes, whether or not the page ever rendered a button.
 *
 * So `publish` in `src/server/actions.ts` calls `assert` before it mutates, with
 * no reference to what this page decided when it rendered. The page's decision
 * governed what was **drawn**; the action's governs what is **done**. The button
 * being hidden is a courtesy to the user, not a control.
 */
import * as Effect from "effect/Effect";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { PublishDesk } from "../../../src/client/PublishDesk.tsx";
import { articles } from "../../../src/domain/articles.ts";
import { canPublishArticle } from "../../../src/domain/policies.ts";
import { asResource, decideAll } from "../../../src/server/decide.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();

  const { payload, targets } = await runAs(
    user.subject,
    Effect.gen(function* () {
      const resources = yield* Effect.forEach(articles, asResource);
      const decided = yield* decideAll(
        resources.map((resource) => ({ policy: canPublishArticle, resource })),
      );
      return {
        payload: decided.payload,
        targets: articles.map((article, index) => ({
          id: article.id,
          title: article.title,
          resource: resources[index],
        })),
      };
    }),
  );

  return (
    <Shell
      title="An action re-authorizes"
      lede="The button is a courtesy. The check is in the action."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Explain
        what="What happens here"
        how={
          <>
            Each row shows this page&rsquo;s decision about <code>canPublishArticle</code> — a rule
            table with two independent refusals — and a button. The button is disabled by the
            decision; the <strong>action</strong> calls <code>assert</code> regardless and reports
            what it decided for itself.
          </>
        }
        watch={
          <>
            press a row you are not entitled to publish (every row, unless you are the chief
            editor) and read the refusal: it names <em>which rule</em> refused, because{" "}
            <code>AccessDenied</code> carries the trace. An outage is reported differently from a
            denial — an attribute store falling over must never read as &ldquo;you may not&rdquo;.
          </>
        }
      />
      <PublishDesk
        targets={targets.flatMap((target) =>
          target.resource === undefined ? [] : [{
            id: target.id,
            title: target.title,
            resource: target.resource,
          }]
        )}
      />
    </Shell>
  );
};

export default Page;
