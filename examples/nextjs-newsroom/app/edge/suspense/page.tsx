/**
 * A question the server render could not settle.
 *
 * `QadiProvider` and the guards render under `renderToString`, and a policy that
 * needs no resolver **decides during the server pass** — `hasPermission` and
 * `hasRole` read the subject, so they settle synchronously and the answer is in
 * the HTML.
 *
 * A policy that reaches a resolver cannot, however fast that resolver is, because
 * `renderToString` is a single synchronous pass and an effect that suspends has
 * nowhere to suspend to ([BEH-QD-067]). It renders pending, and the browser
 * settles it after mount.
 *
 * **That is precisely the gap a hydration seed covers**, which is why this route
 * deliberately does not seed one of its two questions. Left uncovered, the
 * resolver-bound question shows a fallback and then resolves; seeded, it would
 * have been correct in the first byte like everything on `/newsroom`.
 *
 * [BEH-QD-067]: ../../../../../spec/behaviors/09-react.md
 */
import * as Effect from "effect/Effect";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { SuspenseDemo } from "../../../src/client/SuspenseDemo.tsx";
import { readSourceContact } from "../../../src/domain/policies.ts";
import { decideAll } from "../../../src/server/decide.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();

  // Only the synchronous question is seeded. `inGoodStanding` is deliberately
  // left out of the payload so the difference is visible rather than described.
  const payload = await runAs(
    user.subject,
    Effect.map(decideAll([{ policy: readSourceContact }]), (decided) => decided.payload),
  );

  return (
    <Shell
      title="What a server render can and cannot settle"
      lede="One question is in the HTML. The other could not be, and says so."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Explain
        what="What happens here"
        how={
          <>
            <code>readSourceContact</code> is a permission check: it reads the subject, settles
            synchronously, and its answer is in the served HTML.{" "}
            <code>inGoodStanding</code> is an attribute check: it reaches{" "}
            <code>AttributeResolver</code>, which in the browser is an HTTP call, and this page does
            not seed it.
          </>
        }
        watch={
          <>
            view source: the first badge is already settled; the second reads{" "}
            <strong>Rechecking</strong> because its resolver could not be reached from the server at
            all. The suspended block resolves <em>during</em> the server render, because the App
            Router awaits Suspense boundaries — which is also why suspending on a question the
            server cannot answer holds the response open. Measured, and written up at the bottom of
            the page.
          </>
        }
      />
      <SuspenseDemo />
    </Shell>
  );
};

export default Page;
