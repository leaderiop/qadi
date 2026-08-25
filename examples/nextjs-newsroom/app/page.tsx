/**
 * The index: what each route is for.
 *
 * No decisions here, so no payload and no dock.
 *
 * The payload still names this subject, because `dehydrateDecisions([])` cannot:
 * with no entries there is no `entries[0].decision.subjectId` to take, so the id
 * is `""` and hydration reports a `PayloadSubjectMismatch` of zero entries. See
 * `src/server/emptyPayload.ts`.
 */
import Link from "next/link";
import { Shell } from "../src/ui/Shell.tsx";
import { currentUser } from "../src/server/session.ts";
import { emptyPayload } from "../src/server/emptyPayload.ts";
import { card, h2, mono, muted, navLink } from "../src/ui/theme.ts";

export const dynamic = "force-dynamic";

const TOPOLOGIES = [
  {
    href: "/newsroom",
    title: "SSR and hydration — topology 2",
    body:
      "The server decides, the browser seeds those answers into its atoms, and then re-checks them for itself. Guarded controls are correct in the very first byte of HTML.",
  },
  {
    href: "/spa",
    title: "Client only — topology 1",
    body:
      "No server evaluation at all. Every guard starts pending and settles after a round trip, which is exactly the flash the route above does not have.",
  },
  {
    href: "/newsroom",
    title: "Separate origin over SSE — topology 4",
    body:
      "The dock's timeline merges the server's decisions, streamed from `/api/__decisions`, with the browser's own. Rows sharing an evaluation id show as a pair.",
  },
  {
    href: "/edge/double-count",
    title: "Serverless — topology 5",
    body:
      "An edge invocation cannot keep a ring, so it forwards each record before it ends and an aggregator ingests it. Rows arrive stamped `Edge`.",
  },
] as const;

const EDGES = [
  ["/edge/divergent", "the seed was a cache, not an authorization"],
  ["/edge/wrong-subject", "a payload minted for someone else"],
  ["/edge/version-skew", "a policy this build cannot decode"],
  ["/edge/mixed-payload", "two subjects' decisions in one payload"],
  ["/edge/unregistered", "hydrating against an atom set nobody registered"],
  ["/edge/middleware", "middleware is not a security boundary"],
  ["/edge/leakage", "what actually crosses to the browser"],
  ["/edge/action", "a server action is a public endpoint"],
  ["/edge/suspense", "a question the server render could not settle"],
  ["/edge/invalidate", "a decision being re-checked is not a decision"],
  ["/edge/double-count", "why the hydration counters are process-wide"],
] as const;

const Page = async () => {
  const user = await currentUser();

  return (
    <Shell
      title="Qadi in a Next.js app"
      lede={
        <>
          Effect is the backend, mounted at one Route Handler. Qadi decides on the server, seeds
          those decisions into the browser, and the devtools dock shows both halves in one timeline.
        </>
      }
      subject={user.subject}
      currentUserId={user.id}
      payload={emptyPayload(user.subject)}
      dock={false}
      instrument={false}
    >
      <h2 style={h2}>Four of the six deployments</h2>
      {TOPOLOGIES.map((topology) => (
        <div key={topology.title} style={card}>
          <Link href={topology.href} style={{ ...navLink, marginRight: 0 }}>
            {topology.title}
          </Link>
          <p style={{ ...muted, margin: "0.35rem 0 0" }}>{topology.body}</p>
        </div>
      ))}

      <h2 style={h2}>The edges</h2>
      <p style={muted}>
        One route per way this can go wrong, each of them arranged to actually go wrong rather than
        described.
      </p>
      <ul style={{ ...mono, paddingLeft: "1.1rem" }}>
        {EDGES.map(([href, what]) => (
          <li key={href} style={{ marginBottom: 3 }}>
            <Link href={href} style={{ ...navLink, marginRight: 6 }}>
              {href}
            </Link>
            {what}
          </li>
        ))}
      </ul>
    </Shell>
  );
};

export default Page;
