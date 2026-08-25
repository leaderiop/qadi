/**
 * Two subjects' decisions in one payload.
 *
 * This one is caught on the **writing** side, not the reading side, and that is
 * the point of having both. `hydrateDecisions` checks a payload's binding;
 * `dehydrateDecisions` checks that there is only one binding to check. A server
 * that assembled a page from two users' decisions — a batched loader, a shared
 * request context, a `Promise.all` over the wrong array — would otherwise mint a
 * payload whose id is whichever entry happened to be first.
 *
 * So the first entry's subject names the payload and every entry disagreeing
 * with it is dropped, and the drop is **reported** — the default message naming
 * a count and no subject and no policy, because a warning that discloses who was
 * mixed with whom is a warning that leaks.
 */
import * as Effect from "effect/Effect";
import type { DecisionEntry } from "@qadi/react";
import { dehydrateDecisions } from "@qadi/react";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { Drops } from "../../../src/client/Drops.tsx";
import { readSourceContact } from "../../../src/domain/policies.ts";
import { users } from "../../../src/domain/subjects.ts";
import { decideAll } from "../../../src/server/decide.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";
import { card, mono } from "../../../src/ui/theme.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();
  const other = users.find((candidate) => candidate.id !== user.id);

  const mine = await runAs(
    user.subject,
    Effect.map(decideAll([{ policy: readSourceContact }]), (decided) => decided.entries),
  );
  const theirs: ReadonlyArray<DecisionEntry> = other === undefined ? [] : await runAs(
    other.subject,
    Effect.map(decideAll([{ policy: readSourceContact }]), (decided) => decided.entries),
  );

  // Assembled by hand, the way a batched loader would assemble it by accident.
  let droppedCount = 0;
  const payload = dehydrateDecisions([...mine, ...theirs], {
    onDropped: (dropped) => {
      droppedCount = dropped.length;
    },
  });

  return (
    <Shell
      title="Two subjects, one payload"
      lede="Caught while writing the payload, not while reading it."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Explain
        what="What happens here"
        how={
          <>
            The page decides the same question twice — once as{" "}
            <code style={mono}>{user.subject.id}</code>, once as{" "}
            <code style={mono}>{other?.id ?? "—"}</code> — and hands both to{" "}
            <code>dehydrateDecisions</code>. The first entry&rsquo;s subject names the payload;
            everything disagreeing with it is dropped before the payload exists.
          </>
        }
        watch={
          <>
            the server dropped <strong data-testid="server-dropped">{droppedCount}</strong>{" "}
            entr{droppedCount === 1 ? "y" : "ies"} — a <code>ForeignSubject</code> drop, counted in{" "}
            <code>qadi_hydration_dropped_total</code>. Nothing reaches the browser to be refused,
            which is why the client-side list below is empty and the question still seeds.
          </>
        }
      />
      <div style={card}>
        <div style={mono}>
          payload subject: <strong>{payload.subjectId}</strong> · entries kept:{" "}
          <strong>{payload.entries.length}</strong>
        </div>
      </div>
      <Drops
        testId="mixed-payload"
        expect="ForeignSubject"
        questions={[{ policy: readSourceContact, label: "sources" }]}
      />
    </Shell>
  );
};

export default Page;
