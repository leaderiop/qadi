/**
 * Hydrating against an atom set nobody registered.
 *
 * `hydrateDecisions` does not write to a decision atom. It writes to a **seed**
 * atom that sits beside it, and the map from an atom set to its seeds is a
 * `WeakMap` keyed by object identity that only `makeQadiAtoms` writes to. A
 * consumer that could reach a seed atom could write an authorization decision
 * straight into the registry, bypassing both the subject check and the evaluator
 * — so the channel is private, and being private is what makes this failure
 * possible.
 *
 * The realistic cause is two copies of `@qadi/react` in one bundle: the
 * `WeakMap` is module scope, so a server graph and a client graph resolving to
 * different module instances have different maps and neither can see the
 * other's. That is a pnpm/Turbopack resolution problem wearing an authorization
 * costume, and it is exactly the kind of thing that would otherwise present as
 * "hydration silently does nothing".
 *
 * Staged here with a spread — `{ ...atoms }` is a faithful copy and a different
 * object — because the module's own comment says what happens: *a wrapper, a
 * proxy or a test double is not registered*.
 */
import * as Effect from "effect/Effect";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { Unregistered } from "../../../src/client/Unregistered.tsx";
import { readSourceContact } from "../../../src/domain/policies.ts";
import { decideAll } from "../../../src/server/decide.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();
  const payload = await runAs(
    user.subject,
    Effect.map(decideAll([{ policy: readSourceContact }]), (decided) => decided.payload),
  );

  return (
    <Shell
      title="An atom set nobody registered"
      lede="A faithful copy of the atoms is not the atoms. Hydration seeds nothing and says so."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
      dock={false}
    >
      <Explain
        what="What happens here"
        how={
          <>
            The component below calls <code>hydrateDecisions</code> with{" "}
            <code>{`{ ...atoms }`}</code> — every property of the real atom set, in a different
            object. The seed lookup is a <code>WeakMap</code> keyed by identity, so there is nothing
            to write to.
          </>
        }
        watch={
          <>
            <code>UnregisteredAtoms</code> with a count equal to the payload&rsquo;s entries, and{" "}
            <strong>zero</strong> initial values returned. The fail-closed outcome is the same as
            every other unverifiable payload: seed nothing, ask again.
          </>
        }
      />
      <Unregistered payload={payload} subjectId={user.subject.id} />
    </Shell>
  );
};

export default Page;
