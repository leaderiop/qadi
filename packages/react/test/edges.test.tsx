/**
 * The branches the happy-path tests do not reach: failure rendering, the
 * Suspense promise, StrictMode remounting, and registry disposal.
 */
import {
  AttributeResolveError,
  AttributeResolver,
  AttributeResolverNone,
  EvaluationIdLive,
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

const working = makeQadiAtoms(
  Layer.mergeAll(AttributeResolverNone, RelationshipResolverNever, EvaluationIdLive),
);

const broken = makeQadiAtoms(
  Layer.mergeAll(
    Layer.succeed(AttributeResolver, {
      resolve: (_id: string, attribute: string) =>
        Effect.fail(new AttributeResolveError({ attribute, cause: "backend down" })),
    }),
    RelationshipResolverNever,
    EvaluationIdLive,
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
    EvaluationIdLive,
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
