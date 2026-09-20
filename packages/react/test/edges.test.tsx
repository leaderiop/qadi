/**
 * The branches the happy-path tests do not reach: failure rendering, the
 * Suspense promise, StrictMode remounting, and registry disposal.
 */
import {
  AttributeResolveError,
  AttributeResolver,
  CustomPredicateNone,
  SignatureHistoryNone,
  EvaluationIdLive,
  DecisionHistoryUnknown,
  EvaluationServicesNone,
  RelationshipResolverNever,
  gte,
  hasAttribute,
  hasPermission,
  makeSubject,
  permission,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Component, StrictMode, Suspense, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  Can,
  Cannot,
  QadiProvider,
  makeQadiAtoms,
  useDecisionSuspense,
  useSubject,
} from "../src/index.ts";

const needsClearance = hasAttribute("clearance", gte(1));
const canRead = hasPermission(permission("doc", "read"));
const reader = makeSubject({ id: "u1", permissions: ["doc:read"] });

const working = makeQadiAtoms(EvaluationServicesNone);

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
    SignatureHistoryNone,
  ),
);

class Boundary extends Component<{ readonly children: ReactNode }, { readonly failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? <span>boundary</span> : this.props.children;
  }
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("failure rendering", () => {
  it("Can renders the failure node when one is given", async () => {
    render(
      <QadiProvider atoms={broken} subject={reader}>
        <Can policy={needsClearance} fallback={<span>denied</span>} failure={<span>broken</span>}>
          allowed
        </Can>
      </QadiProvider>,
    );
    // An outage and a denial are different facts, and an operator needs to be
    // able to tell which one hid the control.
    await waitFor(() => expect(screen.getByText("broken")).toBeDefined());
  });

  it("Can falls back to the denial node when no failure node is given", async () => {
    render(
      <QadiProvider atoms={broken} subject={reader}>
        <Can policy={needsClearance} fallback={<span>denied</span>}>
          allowed
        </Can>
      </QadiProvider>,
    );
    // Lossy but closed: without somewhere to put the error, hiding is safer
    // than showing.
    await waitFor(() => expect(screen.getByText("denied")).toBeDefined());
  });

  it("Can renders nothing on failure when failure is explicitly null, even with a fallback configured", async () => {
    render(
      <QadiProvider atoms={broken} subject={reader}>
        <Can
          policy={needsClearance}
          fallback={<span>denied</span>}
          pending={<span>loading</span>}
          failure={null}
        >
          allowed
        </Can>
      </QadiProvider>,
    );
    // Wait until the decision has actually left the pending state — otherwise
    // this would trivially pass without ever reaching the Failure branch.
    await waitFor(() => expect(screen.queryByText("loading")).toBeNull());
    // An explicit `null` opts out of the `fallback` default for failure —
    // it is not the same as omitting `failure` altogether (CCR-QD-138).
    expect(screen.queryByText("denied")).toBeNull();
    expect(screen.queryByText("allowed")).toBeNull();
  });

  it("Cannot renders nothing on failure rather than the denial notice", async () => {
    render(
      <QadiProvider atoms={broken} subject={reader}>
        <Cannot policy={needsClearance}>you may not edit this</Cannot>
      </QadiProvider>,
    );
    // "We could not determine whether you may edit this" is not grounds for
    // telling the user they may not.
    await waitFor(() =>
      expect(screen.queryByText("you may not edit this")).toBeNull(),
    );
  });

  it("Cannot renders its pending node while the subject is loading", () => {
    render(
      <QadiProvider atoms={working} subject={undefined}>
        <Cannot policy={canRead} pending={<span>wait</span>}>
          denied
        </Cannot>
      </QadiProvider>,
    );
    expect(screen.getByText("wait")).toBeDefined();
  });
});

/** A resolver that answers on a later tick, so a decision is genuinely async. */
const slow = makeQadiAtoms(
  Layer.mergeAll(
    Layer.succeed(AttributeResolver, {
      resolve: () => Effect.delay(Effect.succeed(0), "1 millis"),
    }),
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
    SignatureHistoryNone,
  ),
);

describe("useDecisionSuspense", () => {
  it("shows the Suspense fallback before the decision settles", async () => {
    const Probe = () => <span>{`decided:${useDecisionSuspense(needsClearance)._tag}`}</span>;
    render(
      <QadiProvider atoms={slow} subject={reader}>
        <Suspense fallback={<span>suspended</span>}>
          <Probe />
        </Suspense>
      </QadiProvider>,
    );
    expect(screen.getByText("suspended")).toBeDefined();
    await waitFor(() => expect(screen.getByText("decided:Deny")).toBeDefined());
  });

  it("throws a failure to the error boundary rather than hiding it", async () => {
    const Probe = () => <span>{useDecisionSuspense(needsClearance)._tag}</span>;
    render(
      <QadiProvider atoms={broken} subject={reader}>
        <Boundary>
          <Suspense fallback={<span>suspended</span>}>
            <Probe />
          </Suspense>
        </Boundary>
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("boundary")).toBeDefined());
  });
});

describe("provider lifetime", () => {
  it("survives a StrictMode double mount", async () => {
    const Probe = () => <span>{useSubject()?.id ?? "none"}</span>;
    render(
      <StrictMode>
        <QadiProvider atoms={working} subject={reader}>
          <Probe />
        </QadiProvider>
      </StrictMode>,
    );
    // Development-mode remounting must not dispose the live registry: every
    // decision would be lost and re-evaluated on the next render.
    await waitFor(() => expect(screen.getByText("u1")).toBeDefined());
  });

  it("disposes its registry when unmounted", async () => {
    const Probe = () => <span>{useSubject()?.id ?? "none"}</span>;
    const { unmount } = render(
      <QadiProvider atoms={working} subject={reader}>
        <Probe />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("u1")).toBeDefined());
    unmount();
    await waitFor(() => expect(document.body.textContent).toBe(""));
  });
});

// AC-05: `QadiAtoms.test.ts` pins structural sharing and "one evaluation for
// ten subscribers" through direct, synchronous `registry.mount`/`.set` calls
// only — never through React, and never under StrictMode's double render.
// This is the sibling proof at the layer consumers actually exercise: two
// components, each building the SAME policy as a fresh, separately
// constructed (but `Equal.equals`-equal) object inline on every render, under
// `StrictMode` (which renders every component twice in development). If
// sharing ever regressed to reference keying — ADR-QD-014 calls that "silent
// and serious" — this is the test that would catch it; the atom-layer canary
// alone would not, because it never builds two *different* object instances
// of an equal policy through a real render.
describe("atom sharing under React (AC-05)", () => {
  it("evaluates a shared policy once across StrictMode's double render, from two components that each build it inline", async () => {
    const counter = { count: 0 };
    const counting = makeQadiAtoms(
      Layer.mergeAll(
        Layer.succeed(AttributeResolver, {
          resolve: () =>
            Effect.sync(() => {
              counter.count += 1;
              return 5;
            }),
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      ),
    );

    // Neither component holds a shared reference — each calls `hasAttribute`
    // itself, inline, so the two policy objects are distinct instances that
    // are merely `Equal.equals`-equal. `needsClearance` (module-scope, used
    // by other tests in this file) is deliberately NOT reused here.
    const RowA = () => {
      const decision = useDecisionSuspense(hasAttribute("clearance", gte(1)));
      return <span data-testid="row-a">{decision._tag}</span>;
    };
    const RowB = () => {
      const decision = useDecisionSuspense(hasAttribute("clearance", gte(1)));
      return <span data-testid="row-b">{decision._tag}</span>;
    };

    render(
      <StrictMode>
        <QadiProvider atoms={counting} subject={reader}>
          <Suspense fallback={<span>loading</span>}>
            <RowA />
            <RowB />
          </Suspense>
        </QadiProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByTestId("row-b").textContent).toBe("Allow"));
    expect(screen.getByTestId("row-a").textContent).toBe("Allow");

    // One evaluation, not two (one per component) and not four (StrictMode's
    // double render times two components).
    expect(counter.count).toBe(1);
  });
});

// H5: `settled()` used to memoise its subscription per atom rather than per
// registry (`packages/react/src/settled.ts`, defect 3 in its doc comment). A
// `QadiProvider` remount builds a fresh `AtomRegistry` over the *same*
// module-scope `atoms` — `Atom.family` means `atoms.decision(policy)` returns
// the identical `Atom` object across both generations — so these two tests
// reproduce exactly the scenario the bug needed: one atom, two registries.
describe("registry generations", () => {
  it("resolves a suspended decision after the provider remounts with a fresh registry", async () => {
    const Probe = () => <span>{`decided:${useDecisionSuspense(needsClearance)._tag}`}</span>;

    const first = render(
      <QadiProvider atoms={slow} subject={reader}>
        <Suspense fallback={<span>suspended</span>}>
          <Probe />
        </Suspense>
      </QadiProvider>,
    );
    expect(screen.getByText("suspended")).toBeDefined();

    // Unmount while the decision is still pending: the first generation's
    // registry — and the one long-lived listener `settled()` attached to it
    // — is torn down before it ever resolves. Against the pre-fix,
    // atom-only keying, the second generation below would see `subscribed`
    // already `true` for this atom and never subscribe its own registry,
    // hanging forever.
    first.unmount();

    const second = render(
      <QadiProvider atoms={slow} subject={reader}>
        <Suspense fallback={<span>suspended</span>}>
          <Probe />
        </Suspense>
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("decided:Deny")).toBeDefined());
    second.unmount();
  });

  it("resolves independently for two concurrently mounted providers sharing the same atoms", async () => {
    const ProbeA = () => <span>{`a:${useDecisionSuspense(needsClearance)._tag}`}</span>;
    const ProbeB = () => <span>{`b:${useDecisionSuspense(needsClearance)._tag}`}</span>;

    const both = render(
      <>
        <QadiProvider atoms={slow} subject={reader}>
          <Suspense fallback={<span>suspended-a</span>}>
            <ProbeA />
          </Suspense>
        </QadiProvider>
        <QadiProvider atoms={slow} subject={reader}>
          <Suspense fallback={<span>suspended-b</span>}>
            <ProbeB />
          </Suspense>
        </QadiProvider>
      </>,
    );

    expect(screen.getByText("suspended-a")).toBeDefined();
    expect(screen.getByText("suspended-b")).toBeDefined();

    // Two registries over the same atom set must each get their own
    // listener — sharing one means the second registry's transitions never
    // resolve.
    await waitFor(() => expect(screen.getByText("a:Deny")).toBeDefined());
    await waitFor(() => expect(screen.getByText("b:Deny")).toBeDefined());
    both.unmount();
  });
});
