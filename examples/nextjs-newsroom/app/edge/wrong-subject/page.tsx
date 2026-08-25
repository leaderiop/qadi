/**
 * A payload minted for somebody else.
 *
 * The realistic cause is a cache key: a CDN or a `revalidate` that serves one
 * user's rendered page to another. So the whole payload is bound to the subject
 * it was decided for, and hydration checks that binding before it seeds
 * anything.
 *
 * **The whole payload is refused, not the entries one by one.** The id is a
 * property of the payload, so one wrong id means the wrong page, and picking
 * through it for entries that happen to match would be trusting a document that
 * has already proved it cannot be trusted.
 *
 * It does not throw, either. Turning a cache misconfiguration into a blank page
 * would be a worse outcome than re-deciding; trusting it would be a breach. So
 * it seeds nothing, the controls flash, and the client asks the questions
 * properly — which is exactly what would have happened with no hydration at all.
 */
import * as Effect from "effect/Effect";
import { Shell } from "../../../src/ui/Shell.tsx";
import { Explain } from "../../../src/ui/Explain.tsx";
import { Drops } from "../../../src/client/Drops.tsx";
import { canReadArticle, readSourceContact } from "../../../src/domain/policies.ts";
import { articles } from "../../../src/domain/articles.ts";
import { users } from "../../../src/domain/subjects.ts";
import { asResource, decideAll } from "../../../src/server/decide.ts";
import { runAs } from "../../../src/server/runtime.ts";
import { currentUser } from "../../../src/server/session.ts";
import { mono } from "../../../src/ui/theme.ts";

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await currentUser();
  // Whoever is not currently logged in. The mismatch has to be real: a payload
  // that names the hydrating subject seeds normally, however it was built.
  const other = users.find((candidate) => candidate.id !== user.id) ?? users[0];

  const payload = await runAs(
    other?.subject ?? user.subject,
    Effect.gen(function* () {
      const first = articles[0];
      const questions = first === undefined
        ? [{ policy: readSourceContact }]
        : [
          { policy: readSourceContact },
          { policy: canReadArticle, resource: yield* asResource(first) },
        ];
      return (yield* decideAll(questions)).payload;
    }),
  );

  return (
    <Shell
      title="A payload for the wrong subject"
      lede="Decided for one user, hydrated as another. Nothing is seeded and nothing throws."
      subject={user.subject}
      currentUserId={user.id}
      payload={payload}
    >
      <Explain
        what="What happens here"
        how={
          <>
            The page decides as <code style={mono}>{other?.id ?? "—"}</code> and hydrates as{" "}
            <code style={mono}>{user.subject.id}</code>. <code>hydrateDecisions</code> compares the
            payload&rsquo;s <code>subjectId</code> to the hydrating subject&rsquo;s, finds them
            different, and refuses the payload whole.
          </>
        }
        watch={
          <>
            <code>PayloadSubjectMismatch</code> below, with a count equal to the number of entries;
            every control starts <strong>Pending</strong> rather than seeded, then settles on{" "}
            <em>this</em> user&rsquo;s real answers. The flash is the correct outcome.
          </>
        }
      />
      <Drops
        testId="wrong-subject"
        expect="PayloadSubjectMismatch"
        questions={[{ policy: readSourceContact, label: "sources" }]}
      />
    </Shell>
  );
};

export default Page;
