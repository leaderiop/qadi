import {
  AttributeResolveError,
  AttributeResolver,
  EvaluationIdLive,
  DecisionHistoryUnknown,
  RelationshipResolverNever,
  eq,
  gte,
  hasAttribute,
  hasPermission,
  hasResourceAttribute,
  hasRole,
  makeSubject,
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
