/**
 * Why the hydration counters are process-wide, and why they move twice.
 *
 * Two facts a panel showing these numbers has to state, and neither is a defect:
 *
 * **1. A client component renders twice.** Once during the server pass, once
 * during hydration. `hydrateDecisions` is pure and synchronous precisely so it
 * can run in the first — that is what puts a settled control into the HTML — and
 * it therefore runs in the second as well. Every page seeds its entries twice,
 * once into a counter in the Node process and once into a counter in the
 * browser. They are different registries in different processes, and neither is
 * wrong, but a reader adding them up will be.
 *
 * **2. The registry is process-global.** `@qadi/core` declares the five metrics
 * at module scope, and a `Metric` memoises its hooks on itself at first touch —
 * keyed on attributes, not on the registry — so the first registry to reach one
 * owns it for the life of the process. On a long-lived Next server that means
 * the server-side counts accumulate across every request and every user. There
 * is no per-request view of them and there cannot be one without a different
 * design.
 *
 * The devtools React panel already says the numbers are process-wide
 * ([BEH-QD-232](../../../../../spec/behaviors/19-hydration.md)). This route is
 * why that sentence is in the requirement rather than in a footnote.
 *
 * The third thing here is topology 5: `/api/edge/decide` builds its layer per
 * invocation, forwards its record before returning, and the aggregator ingests
 * it stamped `Edge`.
 */
import * as Effect from "effect/Effect";
import { hydrationActivity } from "@qadi/devtools";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { Counters } from "../../../src/client/Counters.tsx";
import { articles } from "../../../src/domain/articles.ts";
import { readSourceContact } from "../../../src/domain/policies.ts";
import { decideAll } from "../../../src/server/decide.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";
import { card, mono, pre } from "../../../src/ui/theme.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();

  const payload = await runAs(
    user.subject,
    Effect.map(decideAll([{ policy: readSourceContact }]), (decided) => decided.payload),
  );

  // The server's own view of the same five counters, read after this request's
  // dehydration and before the browser has hydrated anything.
  const server = await Effect.runPromise(hydrationActivity);

  return (
    <Shell
      title="Counters are process-wide, and they move twice"
      lede="Two true numbers that must not be added together."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Explain
        what="What happens here"
        how={
          <>
            The left column is this Node process&rsquo;s counters, read during the render. The
            right is this browser&rsquo;s, read after hydration. Reload a few times and watch the
            left one climb without bound — it is counting every request this server has served since
            it started, for every user.
          </>
        }
        watch={
          <>
            <code>seeded</code> on the right is roughly <strong>twice</strong> the payload&rsquo;s
            entry count after one load, because the client component rendered on the server and
            again on hydration. Neither number is wrong; their sum is meaningless.
          </>
        }
      />

      <div style={card}>
        <div style={{ ...mono, marginBottom: 6 }}>this server process, during the render</div>
        <pre style={pre} data-testid="server-counters">
          {`dehydrated: ${server.dehydrated}
seeded:     ${server.seeded}
rechecked:  ${server.rechecked}
mismatched: ${server.mismatched}
drops:      ${server.drops.map((drop) => `${drop.reason}=${drop.count}`).join("  ")}`}
        </pre>
      </div>

      <Counters entriesInPayload={payload.entries.length} articleId={articles[0]?.id ?? ""} />
    </Shell>
  );
};

export default Page;
