/**
 * What hydration counts, and what it says when it seeds nothing.
 *
 * Split from `Hydration.test.ts`, which is about *which entries are trusted*.
 * This file is about the two things that were missing whatever the answer to
 * that was: nothing retained how many entries made the trip, and three of the
 * four ways a payload fails to seed said nothing at all.
 *
 * Every count assertion is a **delta**. A `Metric` memoises its hooks on itself
 * at first touch and ignores the registry thereafter, so there is no way to
 * scope one to a test — an absolute assertion would depend on the order the
 * whole suite ran in.
 */
import {
  Allow,
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  hydrationDehydratedTotal,
  hydrationDropReasons,
  hydrationDroppedTotal,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  hydrationSeededTotal,
  hasPermission,
  hasRole,
  makeSubject,
  makeSubjectId,
  permission,
  RelationshipResolverNever,
} from "@qadi/core";
import type { HydrationDropReason } from "@qadi/core";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { describe, expect, it, vi } from "vitest";
import type { DehydratedDecisions, HydrationDrop, DehydratedEntry } from "../src/Hydration.ts";
import { dehydrateDecisions, hydrateDecisions } from "../src/Hydration.ts";
import { currentDecision, makeQadiAtoms } from "../src/QadiAtoms.ts";

const registry = Context.empty();

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });
const bob = makeSubject({ id: "u2" });

const atoms = makeQadiAtoms(
  Layer.mergeAll(
    AttributeResolverNone,
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
  ),
);

const serverAllow = (subjectId: string, id: string) =>
  new Allow({
    evaluationId: id,
    subjectId: makeSubjectId(subjectId),
    durationMillis: 3,
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

const counted = (metric: { readonly valueUnsafe: (c: typeof registry) => { readonly count: number } }, act: () => void): number => {
  const before = metric.valueUnsafe(registry).count;
  act();
  return metric.valueUnsafe(registry).count - before;
};

const dropped = (reason: HydrationDropReason, act: () => void): number => {
  const read = () => hydrationDroppedTotal.valueUnsafe(registry).occurrences.get(reason) ?? 0;
  const before = read();
  act();
  return read() - before;
};

/** Silences the default warning, which fires under vitest's `NODE_ENV`. */
const quietly = <A,>(act: () => A): A => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    return act();
  } finally {
    warn.mockRestore();
  }
};

describe("counting what crosses the network", () => {
  it("counts the entries a payload carries", () => {
    const moved = counted(hydrationDehydratedTotal, () => {
      dehydrateDecisions([
        { policy: canRead, decision: serverAllow("u1", "e1") },
        { policy: isAdmin, decision: serverAllow("u1", "e2") },
      ]);
    });
    expect(moved).toBe(2);
  });

  it("counts kept entries, not offered ones", () => {
    // The count has to agree with the payload, or the pair of numbers a panel
    // shows would report a loss on the *client* that happened on the server.
    const moved = counted(hydrationDehydratedTotal, () => {
      quietly(() =>
        dehydrateDecisions([
          { policy: canRead, decision: serverAllow("u1", "e1") },
          { policy: isAdmin, decision: serverAllow("u2", "e2") },
        ]),
      );
    });
    expect(moved).toBe(1);
  });

  it("counts a foreign-subject drop against its own reason", () => {
    const moved = dropped("ForeignSubject", () => {
      quietly(() =>
        dehydrateDecisions([
          { policy: canRead, decision: serverAllow("u1", "e1") },
          { policy: isAdmin, decision: serverAllow("u2", "e2") },
        ]),
      );
    });
    expect(moved).toBe(1);
  });

  it("counts the entries a client seeds", () => {
    const payload = dehydrateDecisions([
      { policy: canRead, decision: serverAllow("u1", "e1") },
      { policy: isAdmin, decision: serverAllow("u1", "e2") },
    ]);
    const moved = counted(hydrationSeededTotal, () => {
      hydrateDecisions(atoms, payload, alice);
    });
    expect(moved).toBe(2);
  });

  it("counts an empty payload as nothing, not as a failure", () => {
    const payload = dehydrateDecisions([]);
    const seeded = counted(hydrationSeededTotal, () => {
      hydrateDecisions(atoms, payload, alice);
    });
    // An empty payload is a page with nothing to hydrate. It must not land in
    // the drop bins, or a working system would report a fault on every request
    // that happened to ask no questions.
    const total = hydrationDropReasons.reduce(
      (sum, reason) => sum + dropped(reason, () => {}),
      0,
    );
    expect(seeded).toBe(0);
    expect(total).toBe(0);
  });
});

describe("a payload that seeds nothing says so", () => {
  const undecodable: DehydratedDecisions = {
    subjectId: "u1",
    entries: [{ policy: { _tag: "NotAPolicy" }, allowed: true, evaluationId: "e1", durationMillis: 1 }],
  };

  it("announces a payload made for another subject", () => {
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1", "e1") }]);
    const drops: Array<HydrationDrop<DehydratedEntry>> = [];

    const seeded = hydrateDecisions(atoms, payload, bob, {
      onDropped: (drop) => drops.push(drop),
    });

    expect(seeded).toEqual([]);
    expect(drops).toHaveLength(1);
    expect(drops[0]?.reason).toBe("PayloadSubjectMismatch");
    // Handed back whole. Unlike the dehydrate side this discloses nothing new —
    // they are the caller's own argument, returned.
    expect(drops[0]?.entries).toHaveLength(1);
  });

  it("announces an atom set it did not build", () => {
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1", "e1") }]);
    const drops: Array<HydrationDrop<DehydratedEntry>> = [];

    // A wrapper is not registered. Structurally a `QadiAtoms`, and refused.
    const wrapper = { ...atoms };
    const seeded = hydrateDecisions(wrapper, payload, alice, {
      onDropped: (drop) => drops.push(drop),
    });

    expect(seeded).toEqual([]);
    expect(drops[0]?.reason).toBe("UnregisteredAtoms");
  });

  it("announces entries whose policy did not decode", () => {
    const drops: Array<HydrationDrop<DehydratedEntry>> = [];

    const seeded = hydrateDecisions(atoms, undecodable, alice, {
      onDropped: (drop) => drops.push(drop),
    });

    expect(seeded).toEqual([]);
    expect(drops[0]?.reason).toBe("UndecodablePolicy");
    expect(drops[0]?.entries).toHaveLength(1);
  });

  it("reports undecodable entries once, not once each", () => {
    // A version skew makes every entry of a shape undecodable, so per-entry
    // reporting would bury a page's other output under a payload's worth of
    // identical lines.
    const many: DehydratedDecisions = {
      subjectId: "u1",
      entries: [
        ...undecodable.entries,
        ...undecodable.entries,
        ...undecodable.entries,
      ],
    };
    const drops: Array<HydrationDrop<DehydratedEntry>> = [];

    hydrateDecisions(atoms, many, alice, { onDropped: (drop) => drops.push(drop) });

    expect(drops).toHaveLength(1);
    expect(drops[0]?.entries).toHaveLength(3);
  });

  it("still seeds the entries that did decode", () => {
    // The undecodable ones are dropped; the rest are not held hostage to them.
    const good = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1", "e1") }]);
    const mixed: DehydratedDecisions = {
      subjectId: "u1",
      entries: [...undecodable.entries, ...good.entries],
    };
    const drops: Array<HydrationDrop<DehydratedEntry>> = [];

    const seeded = hydrateDecisions(atoms, mixed, alice, {
      onDropped: (drop) => drops.push(drop),
    });

    expect(seeded).toHaveLength(1);
    expect(drops[0]?.entries).toHaveLength(1);
  });

  it("counts each refusal against its own reason", () => {
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1", "e1") }]);

    expect(
      dropped("PayloadSubjectMismatch", () =>
        quietly(() => hydrateDecisions(atoms, payload, bob)),
      ),
    ).toBe(1);
    expect(
      dropped("UnregisteredAtoms", () =>
        quietly(() => hydrateDecisions({ ...atoms }, payload, alice)),
      ),
    ).toBe(1);
    expect(
      dropped("UndecodablePolicy", () =>
        quietly(() => hydrateDecisions(atoms, undecodable, alice)),
      ),
    ).toBe(1);
  });

  it("warns on the console when no reporter is supplied", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      hydrateDecisions(atoms, undecodable, alice);
      expect(warn).toHaveBeenCalledOnce();
      const message = String(warn.mock.calls[0]?.[0]);
      expect(message).toContain("did not seed 1 decision(s)");
      // The diagnosis, not just the fact: a developer meeting this is looking at
      // a page that re-decided everything and has no other clue why.
      expect(message).toContain("version skew");
    } finally {
      warn.mockRestore();
    }
  });

  it("names a different cause for each reason", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1", "e1") }]);
      hydrateDecisions(atoms, payload, bob);
      hydrateDecisions({ ...atoms }, payload, alice);

      const messages = warn.mock.calls.map((call) => String(call[0]));
      expect(messages[0]).toContain("different subject");
      expect(messages[1]).toContain("makeQadiAtoms");
    } finally {
      warn.mockRestore();
    }
  });

  it("says nothing in production unless a reporter was supplied", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      hydrateDecisions(atoms, undecodable, alice);
      expect(warn).not.toHaveBeenCalled();

      const drops: Array<HydrationDrop<DehydratedEntry>> = [];
      hydrateDecisions(atoms, undecodable, alice, { onDropped: (drop) => drops.push(drop) });
      // A supplied reporter runs in production, as `onHydrationMismatch` does.
      expect(drops).toHaveLength(1);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
      warn.mockRestore();
    }
  });

  it("counts a refusal even where nothing reports it", () => {
    // The count is not an artefact of the warning. A production build folds the
    // `console.warn` away entirely, and the metric has to survive that.
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect(dropped("UndecodablePolicy", () => hydrateDecisions(atoms, undecodable, alice))).toBe(1);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

describe("counting re-checks", () => {
  it("counts a seeded question this client answers for itself", () => {
    // A fresh atom set per test: `announced` is a closure flag living for the
    // life of the family entry, so a shared one would count only in whichever
    // test ran first.
    const fresh = freshAtoms();
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1", "e1") }]);

    const moved = counted(hydrationRechecksTotal, () => {
      const store = seededRegistryFor(fresh, payload);
      // Reading is what makes the client answer; until then the seed stands.
      currentDecision(store.get(fresh.decision(canRead)));
      store.dispose();
    });

    expect(moved).toBe(1);
  });

  it("does not count a question that was never seeded", () => {
    // A first answer is not a re-check. Counting one would make the ratio
    // against `hydrationMismatchesTotal` meaningless.
    const fresh = freshAtoms();

    const moved = counted(hydrationRechecksTotal, () => {
      const store = AtomRegistry.make({ initialValues: [[fresh.subject, alice] as const] });
      currentDecision(store.get(fresh.decision(isAdmin)));
      store.dispose();
    });

    expect(moved).toBe(0);
  });

  it("counts a disagreement against both counters, so the pair is a rate", () => {
    // The server allowed; this client holds nothing, so it denies.
    const fresh = freshAtoms();
    const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverAllow("u1", "e1") }]);

    let rechecks = 0;
    const mismatches = counted(hydrationMismatchesTotal, () => {
      rechecks = counted(hydrationRechecksTotal, () => {
        const store = AtomRegistry.make({
          initialValues: [
            [fresh.subject, alice] as const,
            ...(hydrateDecisions(fresh, payload, alice) as Iterable<readonly [never, never]>),
          ],
        });
        currentDecision(store.get(fresh.decision(isAdmin)));
        store.dispose();
      });
    });

    expect(rechecks).toBe(1);
    expect(mismatches).toBe(1);
  });

  it("counts an agreement as a re-check and not as a mismatch", () => {
    const fresh = freshAtoms();
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1", "e1") }]);

    let rechecks = 0;
    const mismatches = counted(hydrationMismatchesTotal, () => {
      rechecks = counted(hydrationRechecksTotal, () => {
        const store = seededRegistryFor(fresh, payload);
        currentDecision(store.get(fresh.decision(canRead)));
        store.dispose();
      });
    });

    expect(rechecks).toBe(1);
    expect(mismatches).toBe(0);
  });

  it("counts once per question, however often it is read", () => {
    const fresh = freshAtoms();
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1", "e1") }]);

    const moved = counted(hydrationRechecksTotal, () => {
      const store = seededRegistryFor(fresh, payload);
      // StrictMode renders twice, and a component may read many times. The
      // closure flag is what absorbs that.
      currentDecision(store.get(fresh.decision(canRead)));
      currentDecision(store.get(fresh.decision(canRead)));
      currentDecision(store.get(fresh.decision(canRead)));
      store.dispose();
    });

    expect(moved).toBe(1);
  });

  it("counts with no mismatch reporter wired", () => {
    // The count must not depend on `onHydrationMismatch`. It used to: the block
    // this counts in ran only when a reporter was present.
    const fresh = freshAtoms();
    const payload = dehydrateDecisions([{ policy: canRead, decision: serverAllow("u1", "e1") }]);
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const moved = counted(hydrationRechecksTotal, () => {
        const store = seededRegistryFor(fresh, payload);
        currentDecision(store.get(fresh.decision(canRead)));
        store.dispose();
      });
      expect(moved).toBe(1);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

/** An atom set of this test's own, so its `announced` flags start unset. */
const freshAtoms = () =>
  makeQadiAtoms(
    Layer.mergeAll(
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
  );

const seededRegistryFor = (
  set: ReturnType<typeof makeQadiAtoms>,
  payload: DehydratedDecisions,
) =>
  AtomRegistry.make({
    initialValues: [
      [set.subject, alice] as const,
      ...(hydrateDecisions(set, payload, alice) as Iterable<readonly [never, never]>),
    ],
  });
