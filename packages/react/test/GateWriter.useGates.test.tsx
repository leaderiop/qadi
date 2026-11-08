/**
 * Pins, through the public surfaces, the behaviour ARCH-49 must keep while it
 * moves the gate machinery behind one hook.
 *
 * Written against the code as it stood before the move and kept green across it:
 * an instrumented `<Can>` registers once, as itself, carrying its marker; an
 * uninstrumented one registers nothing and renders no marker; a gate outside a
 * provider fails loudly, naming itself; and a one-question gate hands back the
 * very result its decision atom holds.
 */
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
});
