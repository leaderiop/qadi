/**
 * Topology 1 — client only. The same page with nothing seeded.
 *
 * This route exists as a control. Everything about it is identical to
 * `/newsroom` except that no decision is taken on the server, so every guard
 * starts in its pending state and settles after a round trip.
 *
 * That flash is not a bug and it is worth seeing once. It is what a
 * browser-only deployment looks like, it is what `/newsroom` would look like
 * without hydration, and it is what a page falls back to whenever a payload
 * cannot be verified — which is the fail-closed outcome every drop reason on the
 * other routes lands on.
 */
import { dehydrateDecisions } from "@qadi/react";
import { Shell } from "../../src/ui/Shell.tsx";
import { Explain } from "../../src/ui/Explain.tsx";
import { Spa } from "../../src/client/Spa.tsx";
import { articles } from "../../src/domain/articles.ts";
import { policyResource } from "../../src/domain/resource.ts";
import { currentUser } from "../../src/server/session.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();

  // No `runAs`, no `decideAll`. An empty payload is the honest way to say "this
  // page decided nothing", rather than a special case in the provider.
  const payload = dehydrateDecisions([]);

  // The resources still cross, because the browser has to ask about something.
  // `embargoLifted` is `false` here and that is fine: this page is not seeding,
  // so nothing has to match a server-side decision key.
  const resources = articles.map((article) => policyResource(article, 0));

  return (
    <Shell
      title="Client only"
      lede="Nothing seeded. Every guard starts pending — this is the flash the other route does not have."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Explain
        what="What happens here"
        how={
          <>
            No server evaluation at all. The browser builds its own atoms, asks each question
            through <code>/api/ports/*</code>, and renders the answer when it arrives.
          </>
        }
        watch={
          <>
            view source: every badge below is <strong>Pending</strong>. On{" "}
            <code>/newsroom</code> the same badges are already <strong>Allowed</strong> or{" "}
            <strong>Denied</strong> in the same view. In the dock&rsquo;s Log every row is stamped{" "}
            <strong>Client</strong> and none of them pair with anything, because no server row
            exists to pair with.
          </>
        }
      />
      <Spa resources={resources} />
    </Shell>
  );
};

export default Page;
