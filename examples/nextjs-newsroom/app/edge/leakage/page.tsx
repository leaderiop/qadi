/**
 * What actually crosses to the browser.
 *
 * Three disclosures, and they are not the same kind of thing:
 *
 * 1. **The subject's grants.** Unavoidable. `hasPermission` and `hasRole` read
 *    `AuthSubject` directly rather than through a port, so a browser that
 *    re-checks must hold them. Stripping them would make the client deny every
 *    permission question the server allowed — hydration's safety property turned
 *    into a mismatch on every page.
 * 2. **The decisions.** Deliberate, and the point of the payload.
 * 3. **The reasons.** *Withheld by default*, and this is the one a page controls.
 *    A trace names every node's label and the sentence explaining which branch
 *    this subject failed — a description of the policy's internal structure plus
 *    where this user falls short of it, readable by anyone with developer tools
 *    and by any script on the page.
 *
 * And one that is not a disclosure at all if you do it right: the **content**.
 * `project` removes what the decision did not make visible, on the server,
 * before anything crosses. `/newsroom` does that; the right-hand column here
 * shows the same page without it.
 */
import * as Effect from "effect/Effect";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { articles } from "../../../src/domain/articles.ts";
import { canReadArticle } from "../../../src/domain/policies.ts";
import { grantsOf } from "../../../src/domain/subjects.ts";
import { asResource, decideAll } from "../../../src/server/decide.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";
import { card, h2, mono, muted, pre } from "../../../src/ui/theme.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();

  const { withheld, disclosed } = await runAs(
    user.subject,
    Effect.gen(function* () {
      const first = articles.find((article) => article.status !== "published") ?? articles[0];
      const questions = first === undefined
        ? []
        : [{ policy: canReadArticle, resource: yield* asResource(first) }];
      return {
        withheld: (yield* decideAll(questions)).payload,
        disclosed: (yield* decideAll(questions, { includeTrace: true })).payload,
      };
    }),
  );

  const grants = grantsOf(user.subject);

  return (
    <Shell
      title="What crosses"
      lede="Three disclosures, one of them yours to control."
      subject={user.subject}
      currentUserId={user.id}
      payload={withheld}
    >
      <Explain
        what="What happens here"
        how={
          <>
            The same denial, dehydrated twice: once with the default and once with{" "}
            <code>includeTrace: true</code>. Both payloads are below, verbatim. Note that the
            default replaces a denial&rsquo;s reason with the literal string{" "}
            <code>&ldquo;hydrated&rdquo;</code> — the reason is withheld with the trace, because it
            is the same disclosure in one sentence.
          </>
        }
        watch={
          <>
            the second payload names the policy&rsquo;s branches and says which one you failed. On a
            production page that is a map of the policy and of where you fall short of it, handed to
            any script that can read the DOM.
          </>
        }
      />

      <h2 style={h2}>1. The subject&rsquo;s grants — unavoidable</h2>
      <div style={card}>
        <p style={{ ...muted, marginTop: 0 }}>
          Shipped because the browser cannot re-check without them. This is not a leak to be closed;
          it is a consequence to be understood.
        </p>
        <pre style={pre} data-testid="grants">
          {`roles:       ${grants.roles.join(", ") || "(none)"}
permissions: ${grants.permissions.join(", ") || "(none)"}`}
        </pre>
      </div>

      <h2 style={h2}>2. The decisions, with the reason withheld — the default</h2>
      <pre style={pre} data-testid="payload-withheld">
        {JSON.stringify(withheld, null, 2)}
      </pre>

      <h2 style={h2}>3. The same decisions with the trace — opt-in</h2>
      <pre style={pre} data-testid="payload-disclosed">
        {JSON.stringify(disclosed, null, 2)}
      </pre>

      <h2 style={h2}>4. The content — not a disclosure if you project</h2>
      <div style={card}>
        <p style={{ ...mono, margin: 0 }}>
          This page ships no article body at all. <code>/newsroom</code> ships exactly what{" "}
          <code>project</code> left of each one, computed on the server from that
          reader&rsquo;s own decision — so a field they may not see is absent rather than hidden
          behind a guard that has already been rendered around it.
        </p>
      </div>
    </Shell>
  );
};

export default Page;
