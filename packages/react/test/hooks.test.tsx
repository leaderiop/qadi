import {
  AttributeResolveError,
  AttributeResolver,
  CustomPredicateNone,
  EvaluationIdLive,
  DecisionHistoryUnknown,
  RelationshipResolverNever,
  eq,
  gte,
  literal,
  hasAttribute,
  hasPermission,
  hasResourceAttribute,
  Allow,
  hasRole,
  decisionCacheLayer,
  makeSubject,
  makeSubjectId,
  permission,
  subjectId,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Suspense } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
  QadiProvider,
  currentDecision,
  dehydrateDecisions,
  hydrateDecisions,
  makeQadiAtoms,
  useDecision,
  useDecisionSuspense,
  useInvalidate,
  usePolicies,
  useProjected,
} from "../src/index.ts";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");
const needsClearance = hasAttribute("clearance", gte(1));

const working = makeQadiAtoms(
  Layer.mergeAll(
    Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(undefined) }),
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
  ),
);

/** A context whose attribute lookups always fail. */
const broken = makeQadiAtoms(
  Layer.mergeAll(
    Layer.succeed(AttributeResolver, {
      resolve: (_id: string, attribute: string) =>
        Effect.fail(new AttributeResolveError({ attribute, cause: "backend down" })),
    }),
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
  ),
);

const reader = makeSubject({ id: "u1", permissions: ["doc:read"] });

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useDecision", () => {
  const Probe = () => {
    const result = useDecision(needsClearance);
    if (AsyncResult.isInitial(result)) return <span>pending</span>;
    if (AsyncResult.isFailure(result)) return <span>errored</span>;
    return <span>{`allowed=${result.value._tag === "Allow"}`}</span>;
  };

  it("surfaces an evaluation failure as a failure, not a denial", async () => {
    // A broken attribute backend must stay distinguishable from "not
    // permitted", otherwise an outage sends an engineer to audit permissions.
    render(
      <QadiProvider atoms={broken} subject={reader}>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("errored")).toBeDefined());
  });

  it("reports a plain denial as a decision", async () => {
    render(
      <QadiProvider atoms={working} subject={reader}>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("allowed=false")).toBeDefined());
  });

  it("stops reporting a decision when the subject becomes unavailable", async () => {
    // Logging out must not leave the previous allow on screen. The raw result
    // still carries it — that is what `waiting` means — so the assertion is on
    // `currentDecision`, which is the value every consumer here reads.
    const Decided = () => {
      const decision = currentDecision(useDecision(canRead));
      return <span>{decision?._tag ?? "pending"}</span>;
    };

    const { rerender } = render(
      <QadiProvider atoms={working} subject={reader}>
        <Decided />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("Allow")).toBeDefined());

    rerender(
      <QadiProvider atoms={working} subject={undefined}>
        <Decided />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("pending")).toBeDefined());
  });

  it("evaluates against a resource when one is given", async () => {
    // "the resource's owner is me" — a relational rule expressed with a ref.
    const ownsIt = hasResourceAttribute("owner", eq(subjectId()));
    const Probe2 = ({ owner }: { readonly owner: string }) => {
      const result = useDecision(ownsIt, { owner });
      return <span>{AsyncResult.isSuccess(result) ? result.value._tag : "pending"}</span>;
    };

    render(
      <QadiProvider atoms={working} subject={makeSubject({ id: "u1" })}>
        <Probe2 owner="u1" />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("Allow")).toBeDefined());
  });
});

describe("usePolicies", () => {
  const POLICIES = { read: canRead, admin: isAdmin };

  const Probe = () => {
    const results = usePolicies(POLICIES);
    const state = (key: string) => {
      const result = results[key];
      if (result === undefined || AsyncResult.isInitial(result)) return "?";
      return String(AsyncResult.isSuccess(result) && result.value._tag === "Allow");
    };
    return <span>{`read=${state("read")} admin=${state("admin")}`}</span>;
  };

  it("evaluates every named policy", async () => {
    render(
      <QadiProvider atoms={working} subject={reader}>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("read=true admin=false")).toBeDefined());
  });

  it("stays pending while the subject is loading", () => {
    render(
      <QadiProvider atoms={working} subject={undefined}>
        <Probe />
      </QadiProvider>,
    );
    expect(screen.getByText("read=? admin=?")).toBeDefined();
  });
});

describe("useProjected", () => {
  const RECORD = { title: "Q3", salary: 120_000 };
  const titleOnly = hasPermission(permission("doc", "read"), { fields: ["title"] });

  const Probe = () => {
    const visible = useProjected(titleOnly, RECORD);
    return <span>{`fields=${Object.keys(visible).sort().join(",") || "none"}`}</span>;
  };

  it("narrows the record to the fields the policy exposes", async () => {
    render(
      <QadiProvider atoms={working} subject={reader}>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("fields=title")).toBeDefined());
  });

  it("exposes nothing when the policy denies", async () => {
    render(
      <QadiProvider atoms={working} subject={makeSubject({ id: "u9" })}>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("fields=none")).toBeDefined());
  });

  it("exposes nothing while the decision is still pending", () => {
    // No subject yet, so `useDecision` has nothing to resolve — `currentDecision`
    // reads `undefined` and `useProjected` must not call `project` on it.
    render(
      <QadiProvider atoms={working} subject={undefined}>
        <Probe />
      </QadiProvider>,
    );
    expect(screen.getByText("fields=none")).toBeDefined();
  });
});

describe("useDecisionSuspense", () => {
  const Probe = () => <span>{`decided:${useDecisionSuspense(canRead)._tag}`}</span>;

  it("suspends until the decision is known, then renders it", async () => {
    render(
      <QadiProvider atoms={working} subject={reader}>
        <Suspense fallback={<span>suspended</span>}>
          <Probe />
        </Suspense>
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("decided:Allow")).toBeDefined());
  });

  it("evaluates against a resource when one is given", async () => {
    const ownsIt = hasResourceAttribute("owner", eq(subjectId()));
    const WithResource = () => (
      <span>{`decided:${useDecisionSuspense(ownsIt, { owner: "u1" })._tag}`}</span>
    );

    render(
      <QadiProvider atoms={working} subject={makeSubject({ id: "u1" })}>
        <Suspense fallback={<span>suspended</span>}>
          <WithResource />
        </Suspense>
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("decided:Allow")).toBeDefined());
  });

  it("stays suspended through an intermediate still-pending notification", async () => {
    // A resolver held open under the test's own control, rather than a real
    // timer, gives the registry a deterministic gap between "evaluation
    // started" and "evaluation resolved" — a real-clock delay hit this same
    // branch in isolation but was flaky under full-suite load, since it raced
    // wall-clock time against `waitFor`'s polling instead of an explicit
    // handoff. This exercises `settled`'s "still Initial/waiting, keep
    // waiting" branch, not just its "done" one, without timing dependence.
    let resolveAttribute: (() => void) | undefined;
    const controlled = makeQadiAtoms(
      Layer.mergeAll(
        Layer.succeed(AttributeResolver, {
          resolve: () =>
            Effect.promise(
              () =>
                new Promise<number>((resolve) => {
                  resolveAttribute = () => resolve(1);
                }),
            ),
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
      ),
    );
    const SlowProbe = () => (
      <span>{`decided:${useDecisionSuspense(needsClearance)._tag}`}</span>
    );

    render(
      <QadiProvider atoms={controlled} subject={reader}>
        <Suspense fallback={<span>suspended</span>}>
          <SlowProbe />
        </Suspense>
      </QadiProvider>,
    );
    await waitFor(() => expect(resolveAttribute).toBeDefined());
    expect(screen.getByText("suspended")).toBeDefined();

    act(() => resolveAttribute?.());
    await waitFor(() => expect(screen.getByText("decided:Allow")).toBeDefined());
  });
});

describe("useInvalidate", () => {
  it("re-evaluates mounted decisions on demand", async () => {
    // The subject object never changes here. Only the resolver's answer does —
    // exactly what happens when a grant is edited by someone else.
    let clearance = 0;
    const shifting = makeQadiAtoms(
      Layer.mergeAll(
        Layer.succeed(AttributeResolver, { resolve: () => Effect.sync(() => clearance) }),
        RelationshipResolverNever,
    DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
      ),
    );

    const Probe = () => {
      const result = useDecision(needsClearance);
      const invalidate = useInvalidate();
      return (
        <button type="button" onClick={invalidate}>
          {AsyncResult.isSuccess(result) ? result.value._tag : "pending"}
        </button>
      );
    };

    render(
      <QadiProvider atoms={shifting} subject={reader}>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("Deny")).toBeDefined());

    clearance = 5;
    act(() => screen.getByRole("button").click());
    await waitFor(() => expect(screen.getByText("Allow")).toBeDefined());
  });
});

/**
 * The seam a browser actually reads through.
 *
 * `Hydration.test.ts` drives the same questions against a registry with
 * `registry.mount`, and every case there passes — including an asynchronous
 * re-check. These go through `QadiProvider` and `useDecision` instead, which is
 * what an application does, and it is the difference that matters: a mounted
 * atom and a subscribed one are not kept alive by the same mechanism.
 *
 * Both cases below were found by driving a Next.js application and neither had a
 * reproduction small enough to debug until now.
 */
describe("through a provider, as an application reads it", () => {
  const standing = hasAttribute("standing", eq(literal("good")));

  /** Answers on a later turn, the way a resolver over HTTP does. */
  const slow = (read: () => string) =>
    Layer.succeed(AttributeResolver, {
      resolve: (_id, attribute) =>
        Effect.flatMap(
          Effect.sleep("1 millis"),
          () => Effect.succeed(attribute === "standing" ? read() : undefined),
        ),
    });

  const Verdict = () => {
    const result = useDecision(standing);
    const decision = currentDecision(result);
    const invalidate = useInvalidate();
    return (
      <button type="button" data-testid="verdict" onClick={invalidate}>
        {decision === undefined ? "none" : decision._tag}
      </button>
    );
  };

  it("re-evaluates when invalidated, so a changed attribute is picked up", async () => {
    let answer = "good";
    let calls = 0;
    const atoms = makeQadiAtoms(
      Layer.mergeAll(
        slow(() => {
          calls += 1;
          return answer;
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        // The one thing an application layer has that the cases above do not.
        decisionCacheLayer(),
      ),
    );

    render(
      <QadiProvider atoms={atoms} subject={reader}>
        <Verdict />
      </QadiProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("verdict").textContent).toBe("Allow"));
    const before = calls;

    answer = "suspended";
    await act(async () => {
      screen.getByTestId("verdict").click();
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    // The whole point of the button: ask again, and notice.
    expect(calls).toBeGreaterThan(before);
    await waitFor(() => expect(screen.getByTestId("verdict").textContent).toBe("Deny"));
  });

  it("REPORTS a seeded allow this client denies, asynchronously", async () => {
    // `/edge/divergent`, reduced: the server said `good`, and by the time this
    // client asks it is `suspended`. `Hydration.test.ts` proves the same thing
    // through `registry.mount`; this is the seam an application reads through.
    const seen: Array<{ readonly seeded: string; readonly decided: string }> = [];
    const atoms = makeQadiAtoms(
      Layer.mergeAll(
        slow(() => "suspended"),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        decisionCacheLayer(),
      ),
      {
        onHydrationMismatch: (m) => seen.push({ seeded: m.seeded._tag, decided: m.decided._tag }),
      },
    );

    const payload = dehydrateDecisions([{
      policy: standing,
      decision: new Allow({
        evaluationId: "server-1",
        subjectId: makeSubjectId("u1"),
        durationMillis: 1,
        trace: { policyTag: "HasAttribute", allowed: true, children: [], obligations: [] },
        visibleFields: undefined,
        obligations: [],
      }),
    }]);

    render(
      <QadiProvider
        atoms={atoms}
        subject={reader}
        initialValues={Array.from(hydrateDecisions(atoms, payload, reader))}
      >
        <Verdict />
      </QadiProvider>,
    );

    // The client's own answer is what is in effect (INV-QD-028) …
    await waitFor(() => expect(screen.getByTestId("verdict").textContent).toBe("Deny"));
    // … and the disagreement is announced exactly once (BEH-QD-152).
    expect(seen).toEqual([{ seeded: "Allow", decided: "Deny" }]);
  });
});
