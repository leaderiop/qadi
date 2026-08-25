/**
 * A policy this build cannot decode.
 *
 * The realistic cause is a deploy: a server on a newer `@qadi/core` ships a
 * policy shape the browser's older bundle has never heard of, or the reverse
 * during a rolling release. A payload identifies each policy **by its serialized
 * form** rather than by a caller-supplied key ([BEH-QD-150]), which is what makes
 * that detectable at all — a key registry would have matched the key and seeded
 * the wrong answer with nothing to notice.
 *
 * Three undecodable entries here rather than one, because the requirement is
 * that they are reported **once, not once each**. A version skew makes every
 * entry of a shape undecodable at the same moment, and one warning per entry
 * would bury the page's other output under a payload's worth of identical lines.
 *
 * [BEH-QD-150]: ../../../../../spec/behaviors/19-hydration.md
 */
import * as Effect from "effect/Effect";
import type { DehydratedDecisions, DehydratedEntry } from "@qadi/react";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { Drops } from "../../../src/client/Drops.tsx";
import { readSourceContact } from "../../../src/domain/policies.ts";
import { decideAll } from "../../../src/server/decide.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";

export const dynamic = "force-dynamic";

/**
 * What a future `@qadi/core` might send.
 *
 * `DehydratedEntry.policy` is typed `unknown` precisely because it is the
 * untrusted side of the boundary: it is whatever came off the wire, and it is
 * `Schema.decodeUnknownOption` that decides whether it is a policy.
 */
const fromTheFuture = (index: number): DehydratedEntry => ({
  policy: { _tag: "HasQuantumClearance", threshold: index },
  allowed: true,
  evaluationId: `skew-${index}`,
  durationMillis: 0,
});

const Page = async () => {
  const user = await currentUser();

  const real = await runAs(
    user.subject,
    Effect.map(decideAll([{ policy: readSourceContact }]), (decided) => decided.payload),
  );

  // One good entry and three bad ones, in one payload. The good one must still
  // seed: a refused entry may not prevent the entries that did decode from being
  // seeded, or a single unknown shape would take a whole page's hydration with it.
  const payload: DehydratedDecisions = {
    subjectId: real.subjectId,
    entries: [...real.entries, fromTheFuture(1), fromTheFuture(2), fromTheFuture(3)],
  };

  return (
    <Shell
      title="A policy from a newer build"
      lede="Three entries the browser cannot decode, and one it can. The one still seeds."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Explain
        what="What happens here"
        how={
          <>
            The payload carries three entries whose <code>policy</code> is{" "}
            <code>{`{ _tag: "HasQuantumClearance" }`}</code> — a shape no released{" "}
            <code>@qadi/core</code> can decode — alongside one real decision. Decoding is the
            untrusted side of this boundary, so a shape that does not decode is dropped rather than
            thrown on.
          </>
        }
        watch={
          <>
            <code>UndecodablePolicy × 3</code> below — <strong>one</strong> line, not three — and
            the real question still <strong>seeded</strong> rather than pending. A refused entry
            does not take the payload with it.
          </>
        }
      />
      <Drops
        testId="version-skew"
        expect="UndecodablePolicy"
        questions={[{ policy: readSourceContact, label: "sources" }]}
      />
    </Shell>
  );
};

export default Page;
