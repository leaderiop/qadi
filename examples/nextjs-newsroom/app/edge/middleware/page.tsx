/**
 * The proxy is not a security boundary — and neither is a hydrated allow.
 *
 * Next renamed this convention in 16.3: `middleware.ts` is deprecated and the
 * file is now `proxy.ts`. The rename is the concession — its own documentation
 * says the layer "should not be used as a full session management or
 * authorization solution".
 *
 * Two independent enforcement points, both reachable, both re-deciding:
 *
 * - **This page**, which reads the session cookie and asks the policy itself.
 * - **The route handler** at `/api/articles/:id`, which does the same through
 *   `addGuardedRoute` and mints an `Authorized<P>` witness the handler cannot
 *   fabricate.
 *
 * Neither consults `proxy.ts`, and neither reads any header a caller could
 * set. That is defence in depth in the only form that means anything: not a
 * fallback behind a primary check, but two places that each own their decision.
 */
import { headers } from "next/headers";
import * as Effect from "effect/Effect";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { Probe } from "../../../src/client/Probe.tsx";
import { articles } from "../../../src/domain/articles.ts";
import { canReadArticle } from "../../../src/domain/policies.ts";
import { asResource, decideAll } from "../../../src/server/decide.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";
import { card, mono, muted } from "../../../src/ui/theme.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();
  const incoming = await headers();
  // The article nobody but its author or an Editor may read, so a Reader
  // probing the route handler directly gets a real denial rather than a
  // published article.
  const target = articles.find((article) => article.status === "draft") ?? articles[0];

  const { payload, resource } = await runAs(
    user.subject,
    Effect.gen(function* () {
      if (target === undefined) {
        return { payload: (yield* decideAll([])).payload, resource: undefined };
      }
      const resource = yield* asResource(target);
      const decided = yield* decideAll([{ policy: canReadArticle, resource }]);
      return { payload: decided.payload, resource };
    }),
  );

  return (
    <Shell
      title="The proxy is not a boundary"
      lede="It ran. Nothing downstream asked it anything."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Explain
        what="What happens here"
        how={
          <>
            <code>proxy.ts</code> — what Next 16.3 renamed <code>middleware.ts</code> to — sets two
            headers and decides nothing. This page reads the session cookie and asks{" "}
            <code>canReadArticle</code> for itself; the route handler at{" "}
            <code>/api/articles/{target?.id ?? ":id"}</code> asks it again, independently, through{" "}
            <code>addGuardedRoute</code>.
          </>
        }
        watch={
          <>
            the probe below calls the route handler with a forged{" "}
            <code>x-middleware-subrequest</code> header and an{" "}
            <code>x-claimed-user: hakim</code>. Both are ignored: the answer tracks the{" "}
            <em>cookie</em>, which is the only thing either enforcement point reads.
          </>
        }
      />

      <div style={card}>
        <div style={{ ...mono, marginBottom: 4 }}>what the proxy left on this request</div>
        <ul style={{ ...mono, margin: 0, paddingLeft: "1.1rem" }}>
          <li>x-newsroom-proxy: {incoming.get("x-newsroom-proxy") ?? "(absent)"}</li>
          <li>
            x-newsroom-claimed-user: {incoming.get("x-newsroom-claimed-user") ?? "(absent)"}
          </li>
        </ul>
        <p style={{ ...muted, margin: "0.5rem 0 0" }}>
          Both are echoed for the reader&rsquo;s benefit and read by nothing that decides.
        </p>
      </div>

      <Probe
        articleId={target?.id ?? ""}
        {...(resource === undefined ? {} : { resource })}
      />
    </Shell>
  );
};

export default Page;
