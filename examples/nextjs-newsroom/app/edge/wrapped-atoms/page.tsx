/**
 * Hydrating against a copy of the atom set.
 *
 * `hydrateDecisions` does not write to a decision atom. It writes to a **seed**
 * atom that sits beside it, and the capability to do so is a closure the atom set
 * owns (`QadiAtoms.hydrate`). A consumer that could reach a seed atom could write
 * an authorization decision straight into the registry, bypassing both the
 * subject check and the evaluator — so the seed atoms never leave that closure.
 *
 * That is also why a wrapper is fine. `{ ...atoms }` is a different object whose
 * decision atoms are the real ones, and it carries `hydrate` along, so it seeds
 * exactly the questions the original does. Hydration used to refuse it whole,
 * reporting `UnregisteredAtoms`, because the lookup was a side table keyed on the
 * atom set's object identity — a property of the keying, not a defence of
 * anything, and a pnpm/Turbopack duplicate-module problem wearing an authorization
 * costume when it fired.
 */
import * as Effect from "effect/Effect";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { WrappedAtoms } from "../../../src/client/WrappedAtoms.tsx";
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
      title="A copy of the atom set"
      lede="A faithful copy of the atoms seeds the same questions, because its decision atoms are the real ones."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
      dock={false}
    >
      <Explain
        what="What happens here"
        how={
          <>
            The component below calls <code>hydrateDecisions</code> twice with the same payload:
            once with the atom set, once with <code>{`{ ...atoms }`}</code> — every property of the
            real atom set, in a different object.
          </>
        }
        watch={
          <>
            both calls seed the <strong>same number</strong> of values, and no drop is reported. The
            seed atoms are private to the atom set&rsquo;s closure, and the copy carries the
            capability that writes to them.
          </>
        }
      />
      <WrappedAtoms payload={payload} subjectId={user.subject.id} />
    </Shell>
  );
};

export default Page;
