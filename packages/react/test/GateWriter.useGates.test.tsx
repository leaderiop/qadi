/**
 * Pins, through the public surfaces, the behaviour ARCH-49 must keep while it
 * moves the gate machinery behind one hook.
 *
 * Characterisation cases, written against the code as it stood before the move
 * and kept green across it: an instrumented `<Can>` registers once, as itself,
 * carrying its marker; an uninstrumented one registers nothing and renders no
 * marker; a gate outside a provider fails loudly, naming itself; and a
 * one-question gate hands back the very result its decision atom holds.
 *
 * New behaviour (D-04), which the pre-move code would fail: `useDecisionSuspense`
 * opens its decision atom once rather than twice, pinned both where a sibling
 * has already settled it and where the probe suspends cold.
 */
import {
  AttributeResolver,
  EvaluationIdLive,
  EvaluationServicesNone,
  eq,
  hasAttribute,
  hasPermission,
  literal,
  makeSubject,
  permission,
  portsLayer,
} from "@qadi/core";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Can } from "../src/components.tsx";
import type { DecisionResult } from "../src/DecisionOutcome.ts";
import { outcomeOf } from "../src/DecisionOutcome.ts";
import { useDecision, useDecisionSuspense } from "../src/hooks.ts";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import type { QadiAtoms } from "../src/QadiAtoms.ts";
import { MissingQadiProviderError, QadiProvider, useQadiContext } from "../src/QadiProvider.tsx";

const policy = hasPermission(permission("doc", "read"));
const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });

// Each mount builds its own atom set, so its registry is its own (ADR-QD-080).
let current: QadiAtoms = makeQadiAtoms(EvaluationServicesNone);

const mount = (children: ReactNode, instrument: boolean) => {
  const set = makeQadiAtoms(EvaluationServicesNone);
  current = set;
  return render(
    <QadiProvider atoms={set} subject={alice} instrument={instrument}>
      {children}
    </QadiProvider>,
  );
};

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const seen: { result: DecisionResult | undefined; held: DecisionResult | undefined } = {
  result: undefined,
  held: undefined,
};

const Probe = () => {
  const { registry, atoms } = useQadiContext("probe");
  const result = useDecision(policy);
  seen.result = result;
  seen.held = registry.get(atoms.decision(policy));
  return <span>{outcomeOf(result)._tag}</span>;
};

describe("useGates: one hook over the provider's writer (ARCH-49)", () => {
  it("an instrumented <Can> registers once, as Can, carrying its marker", async () => {
    mount(<Can policy={policy}>allowed</Can>, true);
    await waitFor(() => expect(current.gates.instances()).toHaveLength(1));
    const [instance] = current.gates.instances();
    const node = document.querySelector("[data-qadi-gate]");
    expect(instance?.kind).toBe("Can");
    expect(node).not.toBeNull();
    expect(instance?.element).toBe(node);
    expect(instance?.id).toBe(node?.getAttribute("data-qadi-gate"));
  });

  it("uninstrumented, nothing registers and no marker renders", async () => {
    mount(<Can policy={policy}>allowed</Can>, false);
    await screen.findByText("allowed");
    expect(current.gates.instances()).toEqual([]);
    expect(document.querySelector("[data-qadi-gate]")).toBeNull();
  });

  it("a gate outside a provider throws MissingQadiProviderError naming its kind", () => {
    const quiet = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Can policy={policy}>x</Can>)).toThrow(MissingQadiProviderError);
      expect(() => render(<Can policy={policy}>x</Can>)).toThrow(
        /^Can must be used inside <QadiProvider>/,
      );
    } finally {
      console.error = quiet;
    }
  });

  it("a one-question gate hands back the very result its decision atom holds", async () => {
    mount(<Probe />, false);
    await waitFor(() => {
      expect(seen.result).toBeDefined();
      expect(seen.result === undefined ? undefined : outcomeOf(seen.result)._tag).toBe("Allowed");
    });
    expect(seen.result).toBe(seen.held);
  });

  it("useDecisionSuspense opens its decision atom once (D-04)", async () => {
    const real = makeQadiAtoms(EvaluationServicesNone);
    let opened = 0;
    const counting: QadiAtoms = {
      ...real,
      decision: (question, resource) => {
        opened += 1;
        return real.decision(question, resource);
      },
    };
    const SuspenseProbe = () => <span>{useDecisionSuspense(policy)._tag}</span>;
    const tree = (withProbe: boolean) => (
      <QadiProvider atoms={counting} subject={alice}>
        <Can policy={policy}>can</Can>
        {withProbe ? (
          <Suspense fallback={<span>waiting</span>}>
            <SuspenseProbe />
          </Suspense>
        ) : null}
      </QadiProvider>
    );
    const view = render(tree(false));
    await screen.findByText("can");
    const before = opened;
    view.rerender(tree(true));
    await screen.findByText("Allow");
    expect(opened - before).toBe(1);
  });

  it("a cold useDecisionSuspense opens its decision atom at most once per render attempt, across suspend and retry (D-04)", async () => {
    // The probe is the first and only asker, and its answer is held, so the atom
    // is pending when the probe first renders: it suspends, React discards its
    // render-local state, and every retry runs the lookup again. That re-run is
    // legitimate, so the invariant is at most one open per render attempt, not
    // one open in all: an attempt that follows a commit keeps its memo and opens
    // nothing. Before ARCH-49 each fresh attempt opened it twice, once in
    // `useGate` and once in the hook's own lookup, so `opened` exceeded
    // `attempts`. A sibling that had already settled the atom would let the
    // probe skip suspension altogether, which is why none is mounted.
    const held = Deferred.makeUnsafe<unknown>();
    const holding = Layer.succeed(AttributeResolver, { resolve: () => Deferred.await(held) });
    const real = makeQadiAtoms(
      Layer.mergeAll(portsLayer({ AttributeResolver: holding }), EvaluationIdLive),
    );
    let opened = 0;
    let attempts = 0;
    const counting: QadiAtoms = {
      ...real,
      decision: (question, resource) => {
        opened += 1;
        return real.decision(question, resource);
      },
    };
    const cold = hasAttribute("dept", eq(literal("legal")));
    const SuspenseProbe = () => {
      attempts += 1;
      return <span>{useDecisionSuspense(cold)._tag}</span>;
    };
    render(
      <QadiProvider atoms={counting} subject={alice} instrument>
        <Suspense fallback={<span>waiting</span>}>
          <SuspenseProbe />
        </Suspense>
      </QadiProvider>,
    );
    // Held: the probe has suspended, so the fallback shows and nothing registered.
    await screen.findByText("waiting");
    expect(real.gates.instances()).toEqual([]);
    expect(attempts).toBeGreaterThanOrEqual(1);
    expect(opened).toBeGreaterThanOrEqual(1);
    expect(opened).toBeLessThanOrEqual(attempts);

    Deferred.doneUnsafe(held, Effect.succeed("legal"));
    await screen.findByText("Allow");
    await waitFor(() => expect(real.gates.instances()).toHaveLength(1));
    // The retry after release is a further attempt, and it opened at most once.
    expect(attempts).toBeGreaterThanOrEqual(2);
    expect(opened).toBeLessThanOrEqual(attempts);
  });
});
