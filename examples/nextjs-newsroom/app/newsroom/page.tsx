/**
 * Topology 2 — SSR and hydration, working.
 *
 * The shape every real page in this app uses:
 *
 *   1. name the questions the page will render;
 *   2. decide them all in one pass on the server;
 *   3. **project** the content each decision permits, on the server;
 *   4. hand the projection and the payload to the client, which seeds its atoms;
 *   5. let the client re-check, and replace the seed with its own answer.
 *
 * Step 3 is the one that is easy to leave out, and leaving it out does not fail
 * anywhere visible: every guard still denies correctly and the redacted field is
 * in the HTML anyway, because it crossed as a prop before anything rendered.
 *
 * Step 5 is not an optimisation the page could skip. A seed is a cache of what
 * the server believed while it was rendering, and a page whose controls stayed
 * seeded would be a page whose authorization never expired.
 */
import * as Effect from "effect/Effect";
import { project } from "@qadi/core";
import { Shell } from "../../src/ui/Shell.tsx";
import { Newsroom } from "../../src/client/Newsroom.tsx";
import type { ArticleView } from "../../src/client/Newsroom.tsx";
import { articles } from "../../src/domain/articles.ts";
import {
  canPublishArticle,
  canReadArticle,
  readBriefing,
  readSourceContact,
  viewArticle,
} from "../../src/domain/policies.ts";
import { asResource, decideAll } from "../../src/server/decide.ts";
import type { Question } from "../../src/server/decide.ts";
import { runAs } from "../../src/server/runtime.ts";
import { currentUser } from "../../src/server/session.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();

  const { payload, views } = await runAs(
    user.subject,
    Effect.gen(function* () {
      // Paired up front, so nothing downstream has to line two arrays up by
      // index and no branch exists for a resource that cannot be missing.
      const pairs = yield* Effect.forEach(articles, (article) =>
        Effect.map(asResource(article), (resource) => ({ article, resource })));

      const questions: Array<Question> = [
        // Resource-free, so it settles synchronously on both sides and never
        // shows a pending frame at all.
        { policy: readSourceContact },
        ...pairs.flatMap(({ resource }) => [
          { policy: canReadArticle, resource },
          { policy: canPublishArticle, resource },
          { policy: viewArticle, resource },
          { policy: readBriefing, resource },
        ]),
      ];

      const decided = yield* decideAll(questions);

      // `project` is what removes a field. `visibleFields` on a decision says
      // what may be *seen*; it takes nothing away by itself, and a page that
      // read it and did nothing would have decided without acting.
      const views = pairs.map(({ article, resource }): ArticleView => {
        const view = decided.entries.find((entry) =>
          entry.policy === viewArticle && entry.resource === resource
        );
        return {
          resource,
          title: article.title,
          content: view === undefined ? {} : project(view.decision, article),
        };
      });

      return { payload: decided.payload, views };
    }),
  );

  return (
    <Shell
      title="The newsroom"
      lede={
        <>
          Server-decided, client-seeded, client-re-checked. Every control below is correct in the
          first byte of HTML — view source and look for <code>data-state</code>.
        </>
      }
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Newsroom articles={views} />
    </Shell>
  );
};

export default Page;
