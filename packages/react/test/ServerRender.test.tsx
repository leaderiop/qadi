/**
 * Server rendering, through `react-dom/server` rather than a DOM.
 *
 * The suite had no server-rendering test of any kind, which left three claims
 * unexercised: that `useSyncExternalStore`'s `getServerSnapshot` argument is
 * supplied at all (React throws without it), that hydration's whole purpose —
 * a seeded decision visible in the *first* HTML — actually holds, and that
 * `dehydrateDecisions` runs with no React environment.
 *
 * All three are properties of the server pass specifically. `render()` from
 * `@testing-library/react` cannot see any of them: it mounts into a DOM, where
 * the client snapshot is what gets read.
 *
 * `"use client"` is not in play here and does not need to be. It marks a
 * bundler boundary in a framework build; it does not disable server rendering,
 * and `renderToString` on these components is exactly what a framework does on
 * the first request.
 */
import {
  Allow,
  AttributeResolver,
  AttributeResolverNone,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  eq,
  hasAttribute,
  hasPermission,
  hasRole,
  literal,
  makeSubject,
  makeSubjectId,
  permission,
} from "@qadi/core";
import type { AuthSubject, Trace } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Can,
  Cannot,
  QadiProvider,
  dehydrateDecisions,
  hydrateDecisions,
  makeQadiAtoms,
} from "../src/index.ts";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

const atoms = makeQadiAtoms(
  Layer.mergeAll(
    AttributeResolverNone,
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
  ),
);

const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });

/**
 * An atom set whose evaluation cannot settle inside one synchronous pass.
 *
 * The distinction this file turns on. A policy needing no resolver answers on
 * the first read and never observes its seed (BEH-QD-151); one that reaches a
 * resolver cannot finish during `renderToString` however fast the resolver is,
 * and that is precisely the pending frame hydration exists to cover.
 */
const needsAttribute = hasAttribute("tier", eq(literal("gold")));

const slow = makeQadiAtoms(
  Layer.mergeAll(
    Layer.succeed(AttributeResolver, {
      resolve: () => Effect.delay(Effect.succeed("gold"), "1 millis"),
    }),
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
  ),
);

const serverAllow = (policyTag: Trace["policyTag"]) =>
  new Allow({
    evaluationId: "eval-server",
    subjectId: makeSubjectId("u1"),
    durationMillis: 2,
    trace: { policyTag, allowed: true, children: [], visibleFields: undefined, obligations: [] },
    visibleFields: undefined,
    obligations: [],
  });

describe("server rendering", () => {
  it("RENDERS WITHOUT A DOM, which needs getServerSnapshot", () => {
    // `useSyncExternalStore` throws "Missing getServerSnapshot" on the server
    // when its third argument is absent. Nothing else in this suite reaches
    // that path, so this is the test standing behind QadiProvider.tsx:71.
    const html = renderToString(
      <QadiProvider atoms={atoms} subject={reader}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(html).toContain("allowed");
  });

  it("renders the pending node when a decision cannot be reached synchronously", () => {
    // No subject means the decision is not computable, so neither branch is
    // decided — the server must not guess, and must not render the fallback.
    const html = renderToString(
      <QadiProvider atoms={atoms} subject={undefined}>
        <Can policy={canRead} pending={<span>wait</span>} fallback={<span>nope</span>}>
          allowed
        </Can>
      </QadiProvider>,
    );
    expect(html).toContain("wait");
    expect(html).not.toContain("nope");
    expect(html).not.toContain("allowed");
  });

  it("denies in the server HTML when the subject does not qualify", () => {
    const html = renderToString(
      <QadiProvider atoms={atoms} subject={reader}>
        <Can policy={isAdmin} fallback={<span>nope</span>}>
          allowed
        </Can>
        <Cannot policy={isAdmin}>blocked</Cannot>
      </QadiProvider>,
    );
    expect(html).toContain("nope");
    expect(html).toContain("blocked");
    expect(html).not.toContain("allowed");
  });

  it("A SYNCHRONOUS POLICY IGNORES ITS SEED, even on the server", () => {
    // The seed loses, and that is INV-QD-028 rather than a defect. `isAdmin`
    // needs no resolver, so this render answers for itself on the first read and
    // the seed is never observed — BEH-QD-151 says so in as many words, and this
    // is where it is literally the first frame. `reader` holds no roles, so the
    // honest answer is a denial and the deliberately-inconsistent seeded allow
    // does not survive it.
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverAllow("HasRole") }]);
    const html = renderToString(
      <QadiProvider
        atoms={atoms}
        subject={reader}
        initialValues={hydrateDecisions(atoms, payload, reader)}
      >
        <Can policy={isAdmin} fallback={<span>nope</span>}>
          seeded
        </Can>
      </QadiProvider>,
    );
    expect(html).toContain("nope");
    expect(html).not.toContain("seeded");
  });

  it("an unresolvable policy renders pending, because a server pass cannot await", () => {
    // `renderToString` is one synchronous pass, so an evaluation needing a
    // resolver cannot settle inside it however fast that resolver is. Without a
    // seed this is a guaranteed pending frame — which is the gap hydration
    // exists to close, and the next test closes it.
    const html = renderToString(
      <QadiProvider atoms={slow} subject={reader}>
        <Can policy={needsAttribute} pending={<span>wait</span>} fallback={<span>nope</span>}>
          allowed
        </Can>
      </QadiProvider>,
    );
    expect(html).toContain("wait");
    expect(html).not.toContain("nope");
  });

  it("A SEEDED DECISION IS IN THE FIRST HTML, which is the point of hydration", () => {
    // The end-to-end claim BEH-QD-145 makes and nothing proved: seeding through
    // `initialValues` rather than an effect after mount is what removes the
    // pending frame. The previous test is the control — same policy, same
    // provider, no seed, and it renders `wait`.
    const payload = dehydrateDecisions([
      { policy: needsAttribute, decision: serverAllow("HasAttribute") },
    ]);
    const html = renderToString(
      <QadiProvider
        atoms={slow}
        subject={reader}
        initialValues={hydrateDecisions(slow, payload, reader)}
      >
        <Can policy={needsAttribute} pending={<span>wait</span>}>
          seeded
        </Can>
      </QadiProvider>,
    );
    expect(html).toContain("seeded");
    expect(html).not.toContain("wait");
  });

  it("dehydrateDecisions runs with no React involved", () => {
    // `Hydration.ts` carries no "use client" directive precisely so a Server
    // Component can call this. Renders nothing, imports nothing from React.
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("HasPermission") }]);
    expect(payload.subjectId).toBe("u1");
    expect(payload.entries).toHaveLength(1);
  });
});
