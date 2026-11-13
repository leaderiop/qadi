/**
 * A hydrated seed answers a gate that mounts late, until this client answers.
 *
 * The registry removes a node nothing holds one macrotask after it is created, and a
 * seed is not held until a gate reads it. A gate that mounted late, one under an
 * Activity hidden and shown below the provider, or one that unmounted and mounted
 * again used to find no seed and stayed pending. Each case waits a real turn between
 * steps because the removal is a real macrotask no test clock controls, and
 * observes the rendered gate. The provider's subject is unset, or its resolver never
 * answers, wherever a seed alone has to render the text.
 */
import {
  Allow,
  AttributeResolver,
  Deny,
  EvaluationIdLive,
  EvaluationServicesNone,
  eq,
  hasAttribute,
  hasRole,
  literal,
  makeSubject,
  makeSubjectId,
} from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Activity } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Can, QadiProvider, dehydrateDecisions, hydrateDecisions, makeQadiAtoms } from "../src/index.ts";
import { settle } from "./support/settle.ts";

const isAdmin = hasRole("admin");
const standing = hasAttribute("standing", eq(literal("good")));
const reader: AuthSubject = makeSubject({ id: "u1" });

const serverDeny = new Deny({
  evaluationId: "eval-deny",
  subjectId: makeSubjectId("u1"),
  durationMillis: 1,
  trace: {
    policyTag: "HasRole",
    allowed: false,
    reason: "subject lacks role 'admin'",
    children: [],
    obligations: [],
  },
});

const serverAllow = new Allow({
  evaluationId: "eval-allow",
  subjectId: makeSubjectId("u1"),
  durationMillis: 2,
  trace: { policyTag: "HasAttribute", allowed: true, children: [], obligations: [] },
});

const turn = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** An atom set whose attribute resolver answers by `resolve`. */
const atomsResolvingBy = (resolve: () => Effect.Effect<unknown>) =>
  makeQadiAtoms(
    Layer.merge(Layer.merge(EvaluationServicesNone, Layer.succeed(AttributeResolver, { resolve })), EvaluationIdLive),
    { onHydrationMismatch: () => {} },
  );

const seededDeny = (atoms: ReturnType<typeof makeQadiAtoms>) =>
  hydrateDecisions(atoms, dehydrateDecisions([{ policy: isAdmin, decision: serverDeny }]), reader);

const seededAllow = (atoms: ReturnType<typeof makeQadiAtoms>) =>
  hydrateDecisions(atoms, dehydrateDecisions([{ policy: standing, decision: serverAllow }]), reader);

describe("a seed for a gate that mounts late", () => {
  it("SD1 a gate mounted a macrotask late reads the seed", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const initialValues = seededDeny(atoms);
    const ui = (withGate: boolean) => (
      <QadiProvider atoms={atoms} subject={undefined} initialValues={initialValues}>
        {withGate ? (
          <Can policy={isAdmin} pending="pending" fallback="denied">
            allowed
          </Can>
        ) : null}
      </QadiProvider>
    );

    const { rerender } = render(ui(false));
    await settle();
    await turn(20);
    rerender(ui(true));
    await settle();

    expect(screen.getByText("denied")).toBeDefined();
  });

  it("SD2 a gate mounted late reads the seed while the client is still asking", async () => {
    const atoms = atomsResolvingBy(() => Effect.never);
    const initialValues = seededAllow(atoms);
    const ui = (withGate: boolean) => (
      <QadiProvider atoms={atoms} subject={reader} initialValues={initialValues}>
        {withGate ? (
          <Can policy={standing} pending="pending" fallback="denied">
            allowed
          </Can>
        ) : null}
      </QadiProvider>
    );

    const { rerender } = render(ui(false));
    await settle();
    await turn(20);
    rerender(ui(true));
    await settle();

    expect(screen.getByText("allowed")).toBeDefined();
  });

  it("SD3 a gate under a hidden-then-shown Activity, the provider outside, reads the seed", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const initialValues = seededDeny(atoms);
    const ui = (mode: "visible" | "hidden") => (
      <QadiProvider atoms={atoms} subject={undefined} initialValues={initialValues}>
        <Activity mode={mode}>
          <Can policy={isAdmin} pending="pending" fallback="denied">
            allowed
          </Can>
        </Activity>
      </QadiProvider>
    );

    const { rerender } = render(ui("visible"));
    await settle();
    rerender(ui("hidden"));
    await settle();
    await turn(20);
    rerender(ui("visible"));
    await settle();

    expect(screen.getByText("denied")).toBeDefined();
  });

  it("SD4 a gate that unmounts and mounts again later reads the seed", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const initialValues = seededDeny(atoms);
    const ui = (withGate: boolean) => (
      <QadiProvider atoms={atoms} subject={undefined} initialValues={initialValues}>
        {withGate ? (
          <Can policy={isAdmin} pending="pending" fallback="denied">
            allowed
          </Can>
        ) : null}
      </QadiProvider>
    );

    const { rerender } = render(ui(true));
    await settle();
    rerender(ui(false));
    await settle();
    await turn(20);
    rerender(ui(true));
    await settle();

    expect(screen.getByText("denied")).toBeDefined();
  });

  it("SD5 a late seed is superseded by the client's answer and a stale allow never sticks", async () => {
    const atoms = atomsResolvingBy(() => Effect.flatMap(Effect.sleep("1 millis"), () => Effect.succeed("suspended")));
    const initialValues = seededAllow(atoms);
    const ui = (withGate: boolean) => (
      <QadiProvider atoms={atoms} subject={reader} initialValues={initialValues}>
        {withGate ? (
          <Can policy={standing} pending="pending" fallback="denied">
            allowed
          </Can>
        ) : null}
      </QadiProvider>
    );

    const { rerender } = render(ui(false));
    await settle();
    await turn(20);
    rerender(ui(true));
    await turn(200);

    expect(screen.getByText("denied")).toBeDefined();
  });
});
