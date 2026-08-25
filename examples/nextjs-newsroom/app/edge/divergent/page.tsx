/**
 * The seed was a cache, not an authorization.
 *
 * The server decides that this subject is in good standing, ships that allow as
 * a seed, and then **revokes the standing** before the browser has finished
 * hydrating. The browser re-checks, gets a different answer from the same
 * attribute store, and the control closes.
 *
 * This is the security property the whole design turns on
 * ([INV-QD-028](../../../../../spec/invariants.md)): once this client has an
 * answer of its own, that answer is what every consumer reads and the seed is
 * never read again. A page whose controls stayed seeded would be a page whose
 * authorization never expired.
 *
 * It rhymes with the Next.js finding one layer up. `middleware` is not a
 * security boundary because it ran earlier, somewhere else; a hydrated allow is
 * not an authorization for exactly the same reason.
 */
import * as Effect from "effect/Effect";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { Divergent } from "../../../src/client/Divergent.tsx";
import { inGoodStanding } from "../../../src/domain/policies.ts";
import { decideAll } from "../../../src/server/decide.ts";
import { restore, revoke } from "../../../src/server/revocations.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();

  // Restored first, so a reload replays the whole sequence rather than showing
  // the already-revoked steady state.
  restore(user.subject.id);

  const payload = await runAs(
    user.subject,
    Effect.map(decideAll([{ policy: inGoodStanding }]), (decided) => decided.payload),
  );

  // The revocation happens *after* the decision and *before* the response is
  // sent. By the time the browser asks the same question, the answer is no.
  revoke(user.subject.id);

  return (
    <Shell
      title="A seed is a cache"
      lede="The server said yes. It stopped being true before the page finished loading."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Explain
        what="What happens here"
        how={
          <>
            This page decides <code>inGoodStanding</code> on the server — an allow — and seeds it.
            Then, before responding, it revokes this subject&rsquo;s standing. The browser hydrates
            with the allow already in the HTML, re-checks against{" "}
            <code>/api/ports/attribute</code>, and gets <code>suspended</code>.
          </>
        }
        watch={
          <>
            the badge starts <strong>Allowed</strong> in the served HTML, goes{" "}
            <strong>Pending</strong> while this client asks for itself, and lands on{" "}
            <strong>Denied</strong> — the three-step sequence printed below. The Log shows the
            server&rsquo;s row and the browser&rsquo;s re-check as a <em>pair that differs</em>,
            because both carry one evaluation id.
          </>
        }
      />
      <Divergent />
    </Shell>
  );
};

export default Page;
