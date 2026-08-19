/**
 * Hydration, exercised through a registry directly.
 *
 * Nothing renders. What matters here is which entries are trusted and what is
 * disclosed, and neither is a property of React.
 */
import {
  Allow,
  AttributeResolverNone,
  DecisionHistoryUnknown,
  Deny,
  EvaluationIdLive,
  RelationshipResolverNever,
  hasPermission,
  hasRole,
  makeSubject,
  makeSubjectId,
  obligation,
  permission,
} from "@qadi/core";
import * as Layer from "effect/Layer";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { describe, expect, it } from "vitest";
import { dehydrateDecisions, hydrateDecisions } from "../src/Hydration.ts";
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

  it("a hydrated denial reads as a denial, not as pending", () => {
    // The distinction ADR-QD-017 exists for: `Initial` and `Deny` are different
    // answers, and a seeded deny must be the second one.
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverDeny("u1") }]);
    const registry = registryWith(hydrateDecisions(atoms, payload, alice));

    const decision = currentDecision(registry.get(atoms.decision(isAdmin)));
    expect(decision?._tag).toBe("Deny");
    registry.dispose();
  });

  it("keeps the server's evaluation id, for correlation", () => {
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1") }]);
    const registry = registryWith(hydrateDecisions(atoms, payload, alice));

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

    const registry = registryWith(hydrateDecisions(atoms, minimal, alice));
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
