import {
  AttributeResolver,
  AttributeResolveError,
  AttributeResolverNone,
  EvaluationIdLive,
  DecisionHistoryUnknown,
  RelationshipResolverNever,
  eq,
  hasAttribute,
  literal,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
  renderTrace,
} from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { assert, afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  Can,
  Cannot,
  QadiProvider,
  MissingQadiProviderError,
  makeQadiAtoms,
  useCan,
  useSubject,
} from "../src/index.ts";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

const atoms = makeQadiAtoms(
  Layer.mergeAll(
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
);

const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });
const nobody: AuthSubject = makeSubject({ id: "u2" });

const wrap = (subject: AuthSubject | undefined, ui: React.ReactNode) =>
  render(
    <QadiProvider atoms={atoms} subject={subject}>
      {ui}
    </QadiProvider>,
  );

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Can / Cannot", () => {
  it("renders children when the policy allows", async () => {
    wrap(reader, <Can policy={canRead}>allowed</Can>);
    await waitFor(() => expect(screen.getByText("allowed")).toBeDefined());
  });

  it("renders the fallback when the policy denies", async () => {
    wrap(
      nobody,
      <Can policy={canRead} fallback={<span>nope</span>}>
        allowed
      </Can>,
    );
    await waitFor(() => expect(screen.getByText("nope")).toBeDefined());
  });

  it("HANDS THE FALLBACK THE DENIAL, so it can say why", async () => {
    // The guard already holds the `Deny` at the moment it decides to render
    // nothing, and used to throw it away — which made "why is this control not
    // here?" the one question the declarative API could not answer.
    wrap(
      nobody,
      <Can policy={canRead} fallback={(decision) => <span>{decision.reason}</span>}>
        allowed
      </Can>,
    );
    await waitFor(() => expect(screen.getByText(/doc:read/)).toBeDefined());
  });

  it("hands Cannot's children the denial too", async () => {
    wrap(
      nobody,
      <Cannot policy={canRead}>
        {(decision) => <span>{`blocked: ${decision.trace.policyTag}`}</span>}
      </Cannot>,
    );
    await waitFor(() => expect(screen.getByText("blocked: HasPermission")).toBeDefined());
  });

  it("renders the whole trace when the fallback asks for it", async () => {
    wrap(
      nobody,
      <Can
        policy={canRead}
        fallback={(decision) => <pre>{renderTrace(decision.trace, { term: (t) => t })}</pre>}
      >
        allowed
      </Can>,
    );
    await waitFor(() => expect(screen.getByText(/✗ HasPermission/)).toBeDefined());
  });

  it("DOES NOT REUSE A FUNCTION FALLBACK FOR A FAILURE", async () => {
    // A fallback written to explain a denial would describe a refusal that never
    // happened. Failure is not denial (INV-QD-006), and there is no `Deny` to
    // hand it — so it renders nothing, which is still closed.
    const failing = makeQadiAtoms(
      Layer.mergeAll(
        Layer.succeed(AttributeResolver, {
          resolve: () =>
            Effect.fail(new AttributeResolveError({ attribute: "dept", cause: "down" })),
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
      ),
    );
    const needsAttribute = hasAttribute("dept", eq(literal("legal")));

    // First: a *node* fallback IS reused for a failure — the fail-closed
    // default. This half is what proves the failure branch is genuinely
    // reached, so the second half is not passing on a still-pending decision.
    const closed = render(
      <QadiProvider atoms={failing} subject={reader}>
        <Can policy={needsAttribute} fallback={<span>closed</span>}>
          allowed
        </Can>
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("closed")).toBeDefined());
    closed.unmount();

    // Second: a function fallback is not reused, because there is no denial to
    // hand it. Nothing renders, which is still closed.
    render(
      <QadiProvider atoms={failing} subject={reader}>
        <Can policy={needsAttribute} fallback={(d) => <span>{`denied: ${d.reason}`}</span>}>
          allowed
        </Can>
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.queryByText("allowed")).toBeNull());
    expect(screen.queryByText(/^denied:/)).toBeNull();
  });

  it("renders the pending node while the subject is loading", () => {
    // An undefined subject means the decision is not computable yet, so neither
    // branch has been decided.
    wrap(
      undefined,
      <Can policy={canRead} pending={<span>wait</span>}>
        allowed
      </Can>,
    );
    expect(screen.getByText("wait")).toBeDefined();
  });

  it("Cannot renders children when denied", async () => {
    wrap(nobody, <Cannot policy={canRead}>denied</Cannot>);
    await waitFor(() => expect(screen.getByText("denied")).toBeDefined());
  });

  it("Cannot renders nothing when allowed", async () => {
    wrap(reader, <Cannot policy={canRead}>denied</Cannot>);
    await waitFor(() => expect(screen.queryByText("denied")).toBeNull());
  });
});

describe("hooks", () => {
  const Probe = () => {
    const allowed = useCan(canRead);
    const subject = useSubject();
    return <span>{`${subject?.id ?? "none"}:${allowed}`}</span>;
  };

  it("useCan reflects the decision and useSubject exposes the subject", async () => {
    wrap(reader, <Probe />);
    await waitFor(() => expect(screen.getByText("u1:true")).toBeDefined());
  });

  it("useCan is false for a denied policy", async () => {
    wrap(nobody, <Probe />);
    await waitFor(() => expect(screen.getByText("u2:false")).toBeDefined());
  });

  it("throws a helpful error outside a provider", () => {
    // Failing loudly beats silently denying every check, which would look like
    // a permissions bug rather than a wiring bug.
    assert.throws(() => render(<Probe />), MissingQadiProviderError);
  });

  it("follows the subject when it changes", async () => {
    const Probe2 = () => <span>{`admin=${useCan(isAdmin)}`}</span>;
    const { rerender } = wrap(reader, <Probe2 />);
    await waitFor(() => expect(screen.getByText("admin=false")).toBeDefined());

    rerender(
      <QadiProvider atoms={atoms} subject={makeSubject({ id: "u3", roles: ["admin"] })}>
        <Probe2 />
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("admin=true")).toBeDefined());
  });
});

describe("isolated contexts", () => {
  it("keeps two authorization contexts apart", async () => {
    // Two atom sets, two registries. A tenant cannot observe another tenant's
    // decisions even when both providers are mounted in the same tree.
    const tenant = makeQadiAtoms(
      Layer.mergeAll(
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
    );

    const Inner = () => <span>{`isolated:${useCan(isAdmin)}`}</span>;

    render(
      <QadiProvider atoms={atoms} subject={reader}>
        <QadiProvider atoms={tenant} subject={makeSubject({ id: "t", roles: ["admin"] })}>
          <Inner />
        </QadiProvider>
      </QadiProvider>,
    );

    await waitFor(() => expect(screen.getByText("isolated:true")).toBeDefined());
  });
});
