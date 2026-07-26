import {
  AttributeResolverNone,
  EvaluationIdLive,
  DecisionHistoryUnknown,
  RelationshipResolverNever,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
} from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
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
