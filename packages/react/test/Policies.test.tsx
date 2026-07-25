import { render, screen, waitFor } from "@testing-library/react";
import {
  AttributeResolver,
  AttributeResolveError,
  EvaluationIdLive,
  RelationshipResolverNever,
  gte,
  hasAttribute,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
} from "@guard/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { afterEach, describe, expect, it } from "vitest";
import { GuardProvider, usePolicies, usePolicy } from "../src/index.ts";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

const workingRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(undefined) }),
    RelationshipResolverNever,
    EvaluationIdLive,
  ),
);

/** A runtime whose attribute lookups always fail. */
const brokenRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    Layer.succeed(AttributeResolver, {
      resolve: (_id: string, attribute: string) =>
        Effect.fail(new AttributeResolveError({ attribute, cause: "backend down" })),
    }),
    RelationshipResolverNever,
    EvaluationIdLive,
  ),
);

const reader = makeSubject({ id: "u1", permissions: ["doc:read"] });

afterEach(() => {
  document.body.innerHTML = "";
});

describe("usePolicies", () => {
  const POLICIES = { read: canRead, admin: isAdmin };

  const Probe = () => {
    const results = usePolicies(POLICIES);
    return (
      <span>{`read=${results["read"]?.allowed ?? "?"} admin=${results["admin"]?.allowed ?? "?"}`}</span>
    );
  };

  it("evaluates every named policy", async () => {
    render(
      <GuardProvider runtime={workingRuntime} subject={reader}>
        <Probe />
      </GuardProvider>,
    );
    await waitFor(() => expect(screen.getByText("read=true admin=false")).toBeDefined());
  });

  it("stays empty while the subject is loading", () => {
    render(
      <GuardProvider runtime={workingRuntime} subject={undefined}>
        <Probe />
      </GuardProvider>,
    );
    expect(screen.getByText("read=? admin=?")).toBeDefined();
  });
});

describe("usePolicy error handling", () => {
  const needsAttribute = hasAttribute("clearance", gte(1));

  const Probe = () => {
    const state = usePolicy(needsAttribute);
    if (state.loading) return <span>loading</span>;
    if (state.error !== undefined) return <span>errored</span>;
    return <span>{`allowed=${state.allowed}`}</span>;
  };

  it("surfaces an evaluation failure as an error, not a denial", async () => {
    // A broken attribute backend must be distinguishable from "not permitted",
    // otherwise an outage looks like a permissions bug.
    render(
      <GuardProvider runtime={brokenRuntime} subject={reader}>
        <Probe />
      </GuardProvider>,
    );
    await waitFor(() => expect(screen.getByText("errored")).toBeDefined());
  });

  it("reports a plain denial without an error", async () => {
    render(
      <GuardProvider runtime={workingRuntime} subject={reader}>
        <Probe />
      </GuardProvider>,
    );
    await waitFor(() => expect(screen.getByText("allowed=false")).toBeDefined());
  });
});

describe("usePolicy decision", () => {
  const Probe = () => {
    const state = usePolicy(canRead);
    return <span>{state.decision?._tag ?? "pending"}</span>;
  };

  it("exposes the full decision, not just a boolean", async () => {
    render(
      <GuardProvider runtime={workingRuntime} subject={reader}>
        <Probe />
      </GuardProvider>,
    );
    await waitFor(() => expect(screen.getByText("Allow")).toBeDefined());
  });

  it("resets to pending when the subject becomes unavailable", async () => {
    const { rerender } = render(
      <GuardProvider runtime={workingRuntime} subject={reader}>
        <Probe />
      </GuardProvider>,
    );
    await waitFor(() => expect(screen.getByText("Allow")).toBeDefined());

    rerender(
      <GuardProvider runtime={workingRuntime} subject={undefined}>
        <Probe />
      </GuardProvider>,
    );
    await waitFor(() => expect(screen.getByText("pending")).toBeDefined());
  });
});
