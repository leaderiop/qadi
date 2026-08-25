/**
 * A decision being re-checked is not a decision.
 *
 * `useInvalidate()` discards every decision this atom set holds and re-evaluates
 * the mounted ones. While that is in flight the results are `waiting` — and an
 * `AsyncResult` that is `waiting` carries the **previous** value.
 *
 * For most data that staleness is a feature. For authorization it is an
 * over-permission, however brief: the user has logged out, or their grants have
 * just been revoked, and the answer on screen is the one from before. So every
 * consumer in `@qadi/react` goes through `currentDecision`, which is the single
 * place that rule lives ([ADR-QD-017]), and a re-checking value reads as *not
 * decided yet* rather than as its old verdict.
 *
 * The failure mode this prevents is specific and easy to reach: a consumer that
 * reads `AsyncResult.isSuccess` directly will report stale allows, and will do it
 * only during the window when it matters most.
 *
 * [ADR-QD-017]: ../../../../../spec/decisions/017-stale-decisions-are-not-decisions.md
 */
import * as Effect from "effect/Effect";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { Invalidation } from "../../../src/client/Invalidation.tsx";
import { inGoodStanding, readSourceContact } from "../../../src/domain/policies.ts";
import { restore } from "../../../src/server/revocations.ts";
import { decideAll } from "../../../src/server/decide.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();
  // Cleared, so arriving here from `/edge/divergent` does not start already
  // suspended and hide what this route is about.
  restore(user.subject.id);

  const payload = await runAs(
    user.subject,
    Effect.map(
      decideAll([{ policy: readSourceContact }, { policy: inGoodStanding }]),
      (decided) => decided.payload,
    ),
  );

  return (
    <Shell
      title="Re-checking is not deciding"
      lede="Invalidate, and every mounted guard reads pending — never its old answer."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Explain
        what="What happens here"
        how={
          <>
            Both questions are seeded, so both start settled. Pressing{" "}
            <strong>invalidate</strong> discards them and re-evaluates. One is synchronous and
            re-settles inside a frame; the other reaches an HTTP resolver, so its{" "}
            <em>rechecking</em> window is long enough to see.
          </>
        }
        watch={
          <>
            the attribute-bound badge goes <strong>Rechecking</strong>, not{" "}
            <strong>Allowed</strong>, while the round trip is in flight — and the raw{" "}
            <code>AsyncResult</code> beside it still says <code>isSuccess: true</code> the whole
            time. That gap is the entire reason <code>currentDecision</code> exists.
          </>
        }
      />
      <Invalidation />
    </Shell>
  );
};

export default Page;
