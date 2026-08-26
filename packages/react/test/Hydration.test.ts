/**
 * Hydration, exercised through a registry directly.
 *
 * Nothing renders. What matters here is which entries are trusted and what is
 * disclosed, and neither is a property of React.
 */
import {
  Allow,
  AttributeResolveError,
  AttributeResolver,
  AttributeResolverNone,
  CustomPredicateNone,
  SignatureHistoryNone,
  DecisionHistoryUnknown,
  Deny,
  EvaluationIdLive,
  RelationshipResolverNever,
  eq,
  hasAttribute,
  hasPermission,
  hasRole,
  literal,
  makeSubject,
  makeSubjectId,
  obligation,
  permission,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { describe, expect, it, vi } from "vitest";
import { dehydrateDecisions, hydrateDecisions } from "../src/Hydration.ts";
import type { HydrationMismatch } from "../src/QadiAtoms.ts";
import { currentDecision, makeQadiAtoms } from "../src/QadiAtoms.ts";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });
/** Deliberately holds NOTHING, so a leaked allow is visible as an allow. */
const bob = makeSubject({ id: "u2" });

const atoms = makeQadiAtoms(
  Layer.mergeAll(
    AttributeResolverNone,
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
    SignatureHistoryNone,
  ),
);

/** A server-side allow, as `evaluate` would have produced it. */
const serverAllow = (subjectId: string) =>
  new Allow({
    evaluationId: "eval-1",
    subjectId: makeSubjectId(subjectId),
    durationMillis: 3,
    trace: {
      policyTag: "HasPermission",
      allowed: true,
      children: [],
      visibleFields: ["id", "title"],
      obligations: [],
    },
    visibleFields: ["id", "title"],
    obligations: [obligation("audit.log")],
  });

const serverDeny = (subjectId: string) =>
  new Deny({
    evaluationId: "eval-2",
    subjectId: makeSubjectId(subjectId),
    durationMillis: 4,
    trace: {
      policyTag: "HasRole",
      allowed: false,
      reason: "subject lacks role 'admin'",
      children: [],
      visibleFields: undefined,
      obligations: [],
    },
    reason: "subject lacks role 'admin'",
  });

describe("dehydrateDecisions", () => {
  it("carries the verdict, the visible fields and the obligations", () => {
    const payload = dehydrateDecisions([
      { policy: canRead, decision: serverAllow("u1") },
    ]);

    expect(payload.subjectId).toBe("u1");
    expect(payload.entries).toHaveLength(1);
    expect(payload.entries[0]!.allowed).toBe(true);
    expect(payload.entries[0]!.visibleFields).toEqual(["id", "title"]);
    expect(payload.entries[0]!.obligations?.map((o) => o.id)).toEqual(["audit.log"]);
  });

  it("WITHHOLDS the trace and the denial reason by default", () => {
    // The security decision. A trace names every node's tag, its label and the
    // sentence explaining the refusal — the policy's internal structure plus which
    // branch THIS subject failed, readable by any script on the page.
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverDeny("u1") }]);
    const entry = payload.entries[0]!;

    expect(entry.reason).toBe("hydrated");
    expect(entry.trace?.children).toEqual([]);
    expect(JSON.stringify(payload)).not.toContain("lacks role");
  });

  it("discloses the trace only when asked", () => {
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverDeny("u1") }], {
      includeTrace: true,
    });
    expect(payload.entries[0]!.reason).toBe("subject lacks role 'admin'");
    expect(JSON.stringify(payload)).toContain("lacks role");
  });

  it("drops an entry belonging to a different subject", () => {
    // A payload mixing subjects is a bug whose only safe reading is to trust the
    // one it claims to be for.
    const payload = dehydrateDecisions([
      { policy: canRead, decision: serverAllow("u1") },
      { policy: isAdmin, decision: serverDeny("u2") },
    ]);
    expect(payload.subjectId).toBe("u1");
    expect(payload.entries).toHaveLength(1);
  });

  it("SAYS WHAT IT DROPPED, rather than shipping a short payload in silence", () => {
    // The drop is correct (BEH-QD-146); the silence was not. A server that
    // accidentally mixes subjects shipped one row where it meant to ship a
    // thousand and saw nothing — the last quiet failure left in hydration.
    const dropped: Array<ReadonlyArray<unknown>> = [];
    const payload = dehydrateDecisions(
      [
        { policy: canRead, decision: serverAllow("u1") },
        { policy: isAdmin, decision: serverDeny("u2") },
        { policy: canRead, decision: serverAllow("u3") },
      ],
      { onDropped: (d) => dropped.push(d) },
    );

    expect(payload.entries).toHaveLength(1);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toHaveLength(2);
  });

  it("says nothing when nothing was dropped", () => {
    const dropped: Array<ReadonlyArray<unknown>> = [];
    dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }], {
      onDropped: (d) => dropped.push(d),
    });
    expect(dropped).toEqual([]);
  });

  it("warns on the console when no reporter is supplied", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      dehydrateDecisions([
        { policy: canRead, decision: serverAllow("u1") },
        { policy: isAdmin, decision: serverDeny("u2") },
      ]);
      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls[0]?.[0]);
      expect(message).toContain("dropped 1 decision(s)");
      // NAMES NO SUBJECT AND NO POLICY. A dropped decision belongs to another
      // user, so printing it would be the disclosure the drop exists to prevent.
      expect(message).not.toContain("u2");
      expect(message).not.toContain("admin");
    } finally {
      warn.mockRestore();
    }
  });

  it("says nothing in a production build unless a reporter was supplied", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const mixed = [
        { policy: canRead, decision: serverAllow("u1") },
        { policy: isAdmin, decision: serverDeny("u2") },
      ];
      dehydrateDecisions(mixed);
      expect(warn).not.toHaveBeenCalled();

      // But an explicit reporter still runs — a payload mixing subjects is a
      // server-side bug worth alerting on in production.
      const dropped: Array<ReadonlyArray<unknown>> = [];
      dehydrateDecisions(mixed, { onDropped: (d) => dropped.push(d) });
      expect(dropped).toHaveLength(1);
    } finally {
      process.env.NODE_ENV = previous;
      warn.mockRestore();
    }
  });

  it("an empty entry list yields an empty payload, not a crash", () => {
    // `entries[0]?.decision.subjectId ?? ""` — a server that evaluated nothing is
    // an ordinary case (a page with no guarded controls), not an error.
    const payload = dehydrateDecisions([]);
    expect(payload.subjectId).toBe("");
    expect(payload.entries).toEqual([]);
  });

  it("survives a round trip through JSON", () => {
    // The point of the payload: it is embedded in a server-rendered page.
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }]);
    expect(JSON.parse(JSON.stringify(payload))).toEqual(
      JSON.parse(JSON.stringify(payload)),
    );
    expect(() => JSON.stringify(payload)).not.toThrow();
  });
});

describe("hydrateDecisions", () => {
  const registryWith = (initialValues: Iterable<readonly [never, never]> | unknown) =>
    AtomRegistry.make({
      initialValues: [
        [atoms.subject, alice] as const,
        ...(initialValues as Iterable<readonly [never, never]>),
      ],
    });

  /**
   * A registry holding the seeds, with the subject not yet known.
   *
   * The seed is observable only before this client has answered for itself. With
   * no subject the decision atom is `Effect.never` and stays `Initial`, which is
   * precisely the window hydration exists to cover — and so the only window in
   * which the payload's own contents, rather than a locally computed decision,
   * are what a consumer reads.
   */
  const seedsBeforeSubject = (initialValues: Iterable<readonly [never, never]> | unknown) =>
    AtomRegistry.make({
      initialValues: [
        [atoms.subject, undefined] as const,
        ...(initialValues as Iterable<readonly [never, never]>),
      ],
    });

  it("seeds a decision the first render can already read", () => {
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }]);
    const registry = registryWith(hydrateDecisions(atoms, payload, alice));

    // No await, no tick: the answer is there on the first read, which is the
    // whole feature.
    const decision = currentDecision(registry.get(atoms.decision(canRead)));
    expect(decision?._tag).toBe("Allow");
    registry.dispose();
  });

  it("seeds through a policy that was serialized and re-parsed", () => {
    // Only works because `Atom.family` keys STRUCTURALLY (ADR-QD-017): the client
    // policy is a different object from the server's and equal, so it maps to the
    // same atom. Reference keying would have made hydration inexpressible without
    // a caller-maintained key registry.
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }]);
    const overTheWire = JSON.parse(JSON.stringify(payload));
    const registry = registryWith(hydrateDecisions(atoms, overTheWire, alice));

    const decision = currentDecision(registry.get(atoms.decision(canRead)));
    expect(decision?._tag).toBe("Allow");
    registry.dispose();
  });

  it("REFUSES A PAYLOAD MADE FOR ANOTHER SUBJECT, and does not throw", () => {
    // The privilege escalation this module exists to prevent: a cached page
    // serving alice's allows into bob's registry.
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }]);

    expect(() => hydrateDecisions(atoms, payload, bob)).not.toThrow();
    expect(hydrateDecisions(atoms, payload, bob)).toEqual([]);

    const registry = AtomRegistry.make({
      initialValues: [
        [atoms.subject, bob] as const,
        ...hydrateDecisions(atoms, payload, bob),
      ],
    });
    // Nothing was seeded, so bob's registry decides for itself — and bob holds no
    // permission, so the answer is DENY. Had the payload leaked, this would read
    // `Allow` with alice's evaluation id, which is the escalation in one line.
    const decision = currentDecision(registry.get(atoms.decision(canRead)));
    expect(decision?._tag).toBe("Deny");
    expect(decision?.evaluationId).not.toBe("eval-1");
    registry.dispose();
  });

  it("drops an entry whose policy does not decode", () => {
    // Untrusted input, so a malformed entry fails closed the same way a
    // mismatched subject does.
    const seeded = hydrateDecisions(
      atoms,
      { subjectId: "u1", entries: [{ policy: { _tag: "NotAPolicy" }, allowed: true, evaluationId: "e", durationMillis: 0 }] },
      alice,
    );
    expect([...seeded]).toEqual([]);
  });

  // The malformed payloads below round-trip through JSON, the same idiom
  // `SinkCodec.test.ts` uses for untrusted input: `DehydratedEntry`'s fields
  // are legitimately typed for a well-behaved caller, and a hand-crafted or
  // version-skewed payload arriving as real JSON is exactly what these
  // fields' compile-time types cannot rule out.

  it("drops an entry whose durationMillis is not a number", () => {
    const policy = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }])
      .entries[0]!.policy;
    const dehydrated = JSON.parse(
      JSON.stringify({
        subjectId: "u1",
        entries: [{ policy, allowed: true, evaluationId: "e", durationMillis: "not-a-number" }],
      }),
    );
    const seeded = hydrateDecisions(atoms, dehydrated, alice);
    expect([...seeded]).toEqual([]);
  });

  it("drops an entry whose obligations is not an array", () => {
    const policy = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }])
      .entries[0]!.policy;
    const dehydrated = JSON.parse(
      JSON.stringify({
        subjectId: "u1",
        entries: [
          { policy, allowed: true, evaluationId: "e", durationMillis: 0, obligations: "nope" },
        ],
      }),
    );
    const seeded = hydrateDecisions(atoms, dehydrated, alice);
    expect([...seeded]).toEqual([]);
  });

  it("drops an entry whose trace does not match the shape", () => {
    const policy = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }])
      .entries[0]!.policy;
    const dehydrated = JSON.parse(
      JSON.stringify({
        subjectId: "u1",
        entries: [
          {
            policy,
            allowed: true,
            evaluationId: "e",
            durationMillis: 0,
            trace: { policyTag: "NotARealTag" },
          },
        ],
      }),
    );
    const seeded = hydrateDecisions(atoms, dehydrated, alice);
    expect([...seeded]).toEqual([]);
  });

  it("reports a malformed non-policy field under its own reason", () => {
    const policy = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }])
      .entries[0]!.policy;
    const dehydrated = JSON.parse(
      JSON.stringify({
        subjectId: "u1",
        entries: [{ policy, allowed: true, evaluationId: "e", durationMillis: "not-a-number" }],
      }),
    );
    const onDropped = vi.fn();
    hydrateDecisions(atoms, dehydrated, alice, { onDropped });
    expect(onDropped).toHaveBeenCalledWith(expect.objectContaining({ reason: "MalformedEntry" }));
  });

  it("a hydrated denial reads as a denial, not as pending", () => {
    // The distinction ADR-QD-017 exists for: `Initial` and `Deny` are different
    // answers, and a seeded deny must be the second one.
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverDeny("u1") }]);
    const registry = registryWith(hydrateDecisions(atoms, payload, alice));

    const decision = currentDecision(registry.get(atoms.decision(isAdmin)));
    expect(decision?._tag).toBe("Deny");
    registry.dispose();
  });

  it("DOES NOT LET A HYDRATED ALLOW OUTLIVE A CLIENT RE-CHECK THAT DENIES", async () => {
    // alice is not an admin. A seed is a first-paint optimisation, not an
    // authority: the client's own answer is the authoritative one and must
    // replace it. Every other test in this file reads the registry on the same
    // tick it was built, which asserts the seed is *present* and can never
    // observe whether it is ever *superseded*.
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverAllow("u1") }]);
    const registry = registryWith(hydrateDecisions(atoms, payload, alice));
    const unmount = registry.mount(atoms.decision(isAdmin));

    // For a policy that evaluates synchronously — every policy needing no
    // resolver — this client's answer is already there on the first read, so the
    // seed is never observed at all.
    expect(currentDecision(registry.get(atoms.decision(isAdmin)))?._tag).toBe("Deny");

    // And it does not revert once every scheduled turn has run. Seeding the
    // decision atom directly used to lose here permanently: `AtomRegistry`
    // preserves a seeded value over the one the node computes, and a synchronous
    // evaluation publishes by returning rather than through `setSelf`, so the
    // denial was discarded and alice kept an admin allow for the life of the page.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(currentDecision(registry.get(atoms.decision(isAdmin)))?._tag).toBe("Deny");

    unmount();
    registry.dispose();
  });

  it("seeds nothing for an atom set it did not build", () => {
    // Fail-closed, and the same shape as every other refusal here: an atom set
    // that did not come from `makeQadiAtoms` — a wrapper, a proxy, a test double
    // — has no seed atoms to write to. Seeding nothing leaves every decision
    // `Initial`, so the client asks each question properly.
    const foreign = { ...atoms };
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }]);

    expect([...hydrateDecisions(foreign, payload, alice)]).toEqual([]);
  });

  it("still covers the window before this client can answer", () => {
    // The other half of the same rule. With no subject yet the decision atom
    // cannot answer, and the seed is what a consumer reads — which is the flash
    // ADR-QD-028 exists to remove.
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }]);
    const registry = seedsBeforeSubject(hydrateDecisions(atoms, payload, alice));

    expect(currentDecision(registry.get(atoms.decision(canRead)))?._tag).toBe("Allow");
    registry.dispose();
  });

  it("keeps the server's evaluation id, for correlation", () => {
    // Read in the seed's own window. Once this client has decided, the id it
    // reports is its own — the decision on screen is the one this client made,
    // and reporting the server's id for it would be a lie.
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }]);
    const registry = seedsBeforeSubject(hydrateDecisions(atoms, payload, alice));

    expect(currentDecision(registry.get(atoms.decision(canRead)))?.evaluationId).toBe(
      "eval-1",
    );
    registry.dispose();
  });

  it("uses the disclosed trace when one was shipped", () => {
    // The `includeTrace` path through `rebuild`: the seeded decision carries the
    // server's own trace rather than the reduced stand-in.
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverDeny("u1") }], {
      includeTrace: true,
    });
    const registry = registryWith(hydrateDecisions(atoms, payload, alice));

    const decision = currentDecision(registry.get(atoms.decision(isAdmin)));
    expect(decision?.trace.reason).toBe("subject lacks role 'admin'");
    expect(decision?._tag === "Deny" && decision.reason).toBe("subject lacks role 'admin'");
    registry.dispose();
  });

  it("seeds an allow that restricts nothing", () => {
    // `visibleFields: undefined` is the TOP of the lattice — all fields — not the
    // empty set (INV-QD-004). Round-tripping it as `undefined` rather than `[]` is
    // the difference between an unrestricted allow and one that exposes nothing.
    const unrestricted = new Allow({
      evaluationId: "eval-3",
      subjectId: makeSubjectId("u1"),
      durationMillis: 1,
      trace: {
        policyTag: "HasPermission",
        allowed: true,
        children: [],
        visibleFields: undefined,
        obligations: [],
      },
      visibleFields: undefined,
      obligations: [],
    });

    const payload = dehydrateDecisions([{ policy: canRead, decision: unrestricted }]);
    const registry = registryWith(hydrateDecisions(atoms, payload, alice));

    const decision = currentDecision(registry.get(atoms.decision(canRead)));
    expect(decision?._tag).toBe("Allow");
    expect(decision?._tag === "Allow" && decision.visibleFields).toBeUndefined();
    registry.dispose();
  });

  it("tolerates a hand-crafted payload missing everything optional", () => {
    // The payload is UNTRUSTED input: it arrives as JSON in a page. Nothing
    // guarantees it was produced by `dehydrateDecisions`, so an entry with no
    // trace, no obligations and no reason has to yield a well-formed decision
    // rather than one with `undefined` where a reason belongs.
    const minimal = {
      subjectId: "u1",
      entries: [
        {
          policy: JSON.parse(
            JSON.stringify(
              dehydrateDecisions([{ policy: isAdmin, decision: serverDeny("u1") }])
                .entries[0]!.policy,
            ),
          ),
          allowed: false,
          evaluationId: "eval-x",
          durationMillis: 0,
        },
      ],
    };

    // Read in the seed's own window, so what is asserted is the rebuilt payload
    // rather than a decision this client computed for itself.
    const registry = seedsBeforeSubject(hydrateDecisions(atoms, minimal, alice));
    const decision = currentDecision(registry.get(atoms.decision(isAdmin)));

    expect(decision?._tag).toBe("Deny");
    expect(decision?._tag === "Deny" && decision.reason).toBe("hydrated");
    expect(decision?.trace.children).toEqual([]);
    registry.dispose();
  });

  it("tolerates a hand-crafted allow missing its obligations", () => {
    const minimal = {
      subjectId: "u1",
      entries: [
        {
          policy: dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }])
            .entries[0]!.policy,
          allowed: true,
          evaluationId: "eval-y",
          durationMillis: 0,
        },
      ],
    };

    const registry = registryWith(hydrateDecisions(atoms, minimal, alice));
    const decision = currentDecision(registry.get(atoms.decision(canRead)));

    expect(decision?._tag).toBe("Allow");
    expect(decision?._tag === "Allow" && decision.obligations).toEqual([]);
    registry.dispose();
  });

  it("seeds a resource-scoped decision under the right atom", () => {
    const resource = { id: "doc-1" };
    const payload = dehydrateDecisions([
      { policy: canRead, resource, decision: serverAllow("u1") },
    ]);
    const registry = registryWith(hydrateDecisions(atoms, payload, alice));

    expect(
      currentDecision(registry.get(atoms.decisionFor(canRead, resource)))?._tag,
    ).toBe("Allow");
    // And NOT under the resourceless atom, which is a different question. Alice
    // does hold the permission, so that atom decides Allow on its own — the tell
    // is that it carries a fresh evaluation id rather than the server's.
    expect(currentDecision(registry.get(atoms.decision(canRead)))?.evaluationId).not.toBe(
      "eval-1",
    );
    registry.dispose();
  });
});

describe("hydration mismatch", () => {
  const base = Layer.mergeAll(
    AttributeResolverNone,
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
    SignatureHistoryNone,
  );

  /** An atom set reporting into `seen`, with the subject already known. */
  const watching = () => {
    const seen: Array<HydrationMismatch> = [];
    const atomSet = makeQadiAtoms(base, { onHydrationMismatch: (m) => seen.push(m) });
    const open = (initialValues: unknown) =>
      AtomRegistry.make({
        initialValues: [
          [atomSet.subject, alice] as const,
          ...(initialValues as Iterable<readonly [never, never]>),
        ],
      });
    return { seen, atoms: atomSet, open };
  };

  it("REPORTS a server allow this client denies", async () => {
    // alice is not an admin. Post-I-0 her own denial wins, silently — so a
    // developer whose client is wired differently from the server sees a control
    // flash and vanish with nothing naming the cause.
    const { seen, atoms: watched, open } = watching();
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverAllow("u1") }]);
    const registry = open(hydrateDecisions(watched, payload, alice));
    const unmount = registry.mount(watched.decision(isAdmin));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(seen).toHaveLength(1);
    expect(seen[0]!.seeded._tag).toBe("Allow");
    expect(seen[0]!.decided._tag).toBe("Deny");
    // `toEqual`, not `toBe`: the policy reported is the one `hydrateDecisions`
    // DECODED from the payload, which is a distinct object equal to `isAdmin`.
    // They share an atom because `Atom.family` keys structurally (ADR-QD-017),
    // and the decoded one reached the family first.
    expect(seen[0]!.policy).toEqual(isAdmin);
    expect(seen[0]!.resource).toBeUndefined();
    unmount();
    registry.dispose();
  });

  it("carries the client's reason, which is the diagnosis", () => {
    const { seen, atoms: watched, open } = watching();
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverAllow("u1") }]);
    const registry = open(hydrateDecisions(watched, payload, alice));
    registry.get(watched.decision(isAdmin));

    const decided = seen[0]!.decided;
    expect(decided._tag === "Deny" && decided.reason).toBe("subject lacks role 'admin'");
    registry.dispose();
  });

  it("reports the reverse direction too, with no reason to give", () => {
    // The server denied and this client allows — the rarer half, and the one
    // where `decided` is an `Allow` and so carries no reason. The message has to
    // read as a sentence without one.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const plain = makeQadiAtoms(base);
      const payload = dehydrateDecisions([{ policy: canRead, decision: serverDeny("u1") }]);
      const registry = AtomRegistry.make({
        initialValues: [
          [plain.subject, alice] as const,
          ...(hydrateDecisions(plain, payload, alice) as Iterable<readonly [never, never]>),
        ],
      });
      // alice does hold `doc:read`, so her own answer allows.
      registry.get(plain.decision(canRead));

      const message = String(warn.mock.calls[0]?.[0]);
      expect(message).toContain("the server denied, this client allowed");
      expect(message).not.toContain("—");
      registry.dispose();
    } finally {
      warn.mockRestore();
    }
  });

  it("says nothing when the two agree", () => {
    const { seen, atoms: watched, open } = watching();
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverDeny("u1") }]);
    const registry = open(hydrateDecisions(watched, payload, alice));
    registry.get(watched.decision(isAdmin));

    expect(seen).toEqual([]);
    registry.dispose();
  });

  it("says nothing when nothing was seeded", () => {
    // No hydration at all is the ordinary client-only case, not a disagreement.
    const { seen, atoms: watched, open } = watching();
    const registry = open([]);
    registry.get(watched.decision(isAdmin));

    expect(seen).toEqual([]);
    registry.dispose();
  });

  it("A FAILURE IS NOT A DISAGREEMENT", async () => {
    // The client could not answer, so there is nothing for the server's answer
    // to disagree with. Reporting one would be INV-QD-006 in reverse — an
    // outage described as a difference of opinion about permission.
    const seen: Array<HydrationMismatch> = [];
    const failing = makeQadiAtoms(
      Layer.mergeAll(
        Layer.succeed(AttributeResolver, {
          resolve: () =>
            Effect.fail(new AttributeResolveError({ attribute: "dept", cause: "down" })),
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      ),
      { onHydrationMismatch: (m) => seen.push(m) },
    );
    const needsAttribute = hasAttribute("dept", eq(literal("legal")));
    const payload = dehydrateDecisions([
      { policy: needsAttribute, decision: serverAllow("u1") },
    ]);
    const registry = AtomRegistry.make({
      initialValues: [
        [failing.subject, alice] as const,
        ...(hydrateDecisions(failing, payload, alice) as Iterable<readonly [never, never]>),
      ],
    });
    const unmount = registry.mount(failing.decision(needsAttribute));

    await new Promise((resolve) => setTimeout(resolve, 0));

    // The failure genuinely happened — without this the case would pass on a
    // decision that never settled.
    expect(AsyncResult.isFailure(registry.get(failing.decision(needsAttribute)))).toBe(true);
    expect(seen).toEqual([]);
    unmount();
    registry.dispose();
  });

  it("reports ONCE PER QUESTION, not once per re-evaluation", async () => {
    // The seed stays in its atom for the life of the page, so without the latch
    // every invalidation would announce the same stale disagreement again.
    const { seen, atoms: watched, open } = watching();
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverAllow("u1") }]);
    const registry = open(hydrateDecisions(watched, payload, alice));
    registry.mount(watched.invalidate);
    const unmount = registry.mount(watched.decision(isAdmin));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen).toHaveLength(1);

    registry.set(watched.invalidate, undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    registry.get(watched.decision(isAdmin));

    expect(seen).toHaveLength(1);
    unmount();
    registry.dispose();
  });

  it("warns on the console when no reporter is supplied", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const plain = makeQadiAtoms(base);
      const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverAllow("u1") }]);
      const registry = AtomRegistry.make({
        initialValues: [
          [plain.subject, alice] as const,
          ...(hydrateDecisions(plain, payload, alice) as Iterable<readonly [never, never]>),
        ],
      });
      registry.get(plain.decision(isAdmin));

      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls[0]?.[0]);
      // NAMES THE POLICY THIS CLIENT EVALUATED. The seed's own trace is a
      // reduced projection — here it says "HasPermission", inherited from the
      // `serverAllow` fixture — and without a shipped trace it says nothing at
      // all. Reading the tag off the seed printed the wrong policy name.
      expect(message).toContain("hydration mismatch for HasRole");
      expect(message).toContain("the server allowed, this client denied");
      expect(message).toContain("subject lacks role 'admin'");
      registry.dispose();
    } finally {
      warn.mockRestore();
    }
  });

  it("SAYS NOTHING IN A PRODUCTION BUILD", () => {
    // The console warning is a development affordance. A bundler folds
    // `process.env.NODE_ENV` and eliminates it outright; where it is not folded,
    // this is the runtime half of the same rule.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      // Read at `makeQadiAtoms` time, so the layer must be built under it.
      const plain = makeQadiAtoms(base);
      const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverAllow("u1") }]);
      const registry = AtomRegistry.make({
        initialValues: [
          [plain.subject, alice] as const,
          ...(hydrateDecisions(plain, payload, alice) as Iterable<readonly [never, never]>),
        ],
      });
      registry.get(plain.decision(isAdmin));

      expect(warn).not.toHaveBeenCalled();
      registry.dispose();
    } finally {
      process.env.NODE_ENV = previous;
      warn.mockRestore();
    }
  });

  it("an explicit reporter still runs in a production build", () => {
    // The callback is not a development affordance: a server and a client
    // disagreeing about authorization is signal worth reporting in production,
    // which is the reason it is exposed at all.
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const seen: Array<HydrationMismatch> = [];
      const watched = makeQadiAtoms(base, { onHydrationMismatch: (m) => seen.push(m) });
      const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverAllow("u1") }]);
      const registry = AtomRegistry.make({
        initialValues: [
          [watched.subject, alice] as const,
          ...(hydrateDecisions(watched, payload, alice) as Iterable<readonly [never, never]>),
        ],
      });
      registry.get(watched.decision(isAdmin));

      expect(seen).toHaveLength(1);
      registry.dispose();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("reports a resource-scoped disagreement with its resource", () => {
    const { seen, atoms: watched, open } = watching();
    const resource = { id: "doc-1" };
    const payload = dehydrateDecisions([
      { policy: isAdmin, resource, decision: serverAllow("u1") },
    ]);
    const registry = open(hydrateDecisions(watched, payload, alice));
    registry.get(watched.decisionFor(isAdmin, resource));

    expect(seen).toHaveLength(1);
    expect(seen[0]!.resource).toEqual(resource);
    registry.dispose();
  });
});

describe("a re-check continues the server's evaluation", () => {
  it("carries the seeded evaluation id into the client's own answer", async () => {
    // The claim the unified-stream draft made and could not keep: the payload
    // carried an id, the client minted a fresh one, and nothing joined them.
    const registry = AtomRegistry.make({
      initialValues: hydrateDecisions(
        atoms,
        dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }]),
        alice,
      ),
    });
    registry.set(atoms.subject, alice);

    const decision = atoms.decision(canRead);
    await vi.waitFor(() => {
      const result = registry.get(decision);
      expect(AsyncResult.isSuccess(result) && !result.waiting).toBe(true);
    });

    const answered = currentDecision(registry.get(decision));
    expect(answered).toBeDefined();
    // The client re-evaluated for itself — this is not the seed being returned,
    // which INV-QD-028 requires — and still reports the server's id, so the two
    // halves are one story.
    expect(answered?.evaluationId).toBe("eval-1");
  });

  it("mints its own id when there is no seed to continue", async () => {
    const registry = AtomRegistry.make();
    registry.set(atoms.subject, alice);

    const decision = atoms.decision(canRead);
    await vi.waitFor(() => {
      const result = registry.get(decision);
      expect(AsyncResult.isSuccess(result) && !result.waiting).toBe(true);
    });

    // Nothing to correlate with, so the default stands: a fresh id, which
    // `EvaluationIdLive` makes a uuid rather than the server's "eval-1".
    const answered = currentDecision(registry.get(decision));
    expect(answered?.evaluationId).not.toBe("eval-1");
  });
});

/**
 * A re-check that has to wait for a port.
 *
 * Every mismatch case above uses a policy that settles **synchronously** —
 * `hasRole` and `hasPermission` read the subject, so the client answers on the
 * first read of the atom. A policy that reaches `AttributeResolver` cannot, and
 * that is the ordinary case in a browser whose ports are remote.
 *
 * Found by driving a Next.js app: a verdict genuinely changed from its seed and
 * nothing was reported. The synchronous cases passed throughout, which is why it
 * survived — the shape that fails is the one no test had.
 */
describe("a re-check that settles asynchronously", () => {
  const standing = hasAttribute("standing", eq(literal("good")));

  /** Answers on a later turn, the way an HTTP resolver does. */
  const slowResolver = (value: string) =>
    Layer.succeed(AttributeResolver, {
      resolve: (_subjectId, attribute) =>
        Effect.flatMap(
          Effect.sleep("1 millis"),
          () => Effect.succeed(attribute === "standing" ? value : undefined),
        ),
    });

  const seededAllow = (subjectId: string) =>
    new Allow({
      evaluationId: "eval-async",
      subjectId: makeSubjectId(subjectId),
      durationMillis: 2,
      trace: { policyTag: "HasAttribute", allowed: true, children: [], obligations: [] },
      visibleFields: undefined,
      obligations: [],
    });

  const mount = (answer: string) => {
    const seen: Array<HydrationMismatch> = [];
    const watched = makeQadiAtoms(
      Layer.mergeAll(
        slowResolver(answer),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      ),
      { onHydrationMismatch: (m) => seen.push(m) },
    );
    const payload = dehydrateDecisions([{ policy: standing, decision: seededAllow("u1") }]);
    const registry = AtomRegistry.make({
      initialValues: [
        [watched.subject, alice] as const,
        ...hydrateDecisions(watched, payload, alice),
      ],
    });
    const unmount = registry.mount(watched.decision(standing));
    return { seen, watched, registry, unmount };
  };

  it("REPORTS a server allow this client denies", async () => {
    // The server said `good`; by the time this client asks, it is `suspended`.
    const { seen, registry, unmount } = mount("suspended");

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(seen).toHaveLength(1);
    expect(seen[0]?.seeded._tag).toBe("Allow");
    expect(seen[0]?.decided._tag).toBe("Deny");
    unmount();
    registry.dispose();
  });
});
