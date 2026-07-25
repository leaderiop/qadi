import { render, screen, waitFor } from "@testing-library/react";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
} from "@guard/core";
import type { AuthSubject } from "@guard/core";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { assert, afterEach, describe, expect, it } from "vitest";
import {
  Can,
  Cannot,
  GuardProvider,
  MissingGuardProviderError,
  createGuardHooks,
  useCan,
  useSubject,
} from "../src/index.ts";

const read = permission("doc", "read");
const canRead = hasPermission(read);
const isAdmin = hasRole("admin");

const runtime = ManagedRuntime.make(
  Layer.mergeAll(AttributeResolverNone, RelationshipResolverNever, EvaluationIdLive),
);

const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });
const nobody: AuthSubject = makeSubject({ id: "u2" });

const wrap = (subject: AuthSubject | undefined, ui: React.ReactNode) =>
  render(
    <GuardProvider runtime={runtime} subject={subject}>
      {ui}
    </GuardProvider>,
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
    wrap(nobody, <Can policy={canRead} fallback={<span>nope</span>}>allowed</Can>);
    await waitFor(() => expect(screen.getByText("nope")).toBeDefined());
  });

  it("renders the pending node while the subject is loading", () => {
    // undefined subject means "still loading", so neither branch is decided.
    wrap(undefined, <Can policy={canRead} pending={<span>wait</span>}>allowed</Can>);
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
    // Failing loudly beats silently denying every check, which would look
    // like a permissions bug rather than a wiring bug.
    assert.throws(() => render(<Probe />), MissingGuardProviderError);
  });
});

describe("createGuardHooks", () => {
  it("produces an isolated context that does not see the default provider", async () => {
    const isolated = createGuardHooks();

    const Inner = () => {
      const allowed = isolated.useCan(isAdmin);
      return <span>{`isolated:${allowed}`}</span>;
    };

    render(
      <GuardProvider runtime={runtime} subject={reader}>
        <isolated.GuardProvider
          runtime={runtime}
          subject={makeSubject({ id: "tenant", roles: ["admin"] })}
        >
          <Inner />
        </isolated.GuardProvider>
      </GuardProvider>,
    );

    // The inner hook reads the isolated provider's subject, not the outer one.
    await waitFor(() => expect(screen.getByText("isolated:true")).toBeDefined());
  });

  it("its hooks throw outside their own provider", () => {
    const isolated = createGuardHooks();
    const Inner = () => <span>{String(isolated.useCan(canRead))}</span>;
    assert.throws(
      () =>
        render(
          <GuardProvider runtime={runtime} subject={reader}>
            <Inner />
          </GuardProvider>,
        ),
      MissingGuardProviderError,
    );
  });
});
