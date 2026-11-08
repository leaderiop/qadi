/**
 * Pins what `usePolicies` does across equal re-renders (ARCH-49, D-07, GATE-04).
 *
 * `usePolicies` builds a fresh `questions` record on every render. ARCH-49 asked
 * whether that re-creates its group atom or its registrations. The atom keying
 * rule (AGENTS.md section 13, BEH-QD-071) predicts it does not: the atom set's
 * `decisions` family keys structurally, so an equal record is the same atom, and
 * the gate's per-entry identity is keyed on that atom. This file pins the answer
 * either way, so a later change to how a grouped hook memoises cannot start
 * re-creating atoms or registrations unnoticed.
 *
 * The consumer builds both policies inline on every render, which is stronger
 * than hoisting them to module constants: the objects are distinct, only
 * `Equal.equals`-equal. The atom set is a spread copy of a real one whose
 * `decision` and `decisions` properties record their calls. The real atom set's
 * own grouped atom calls its closure-local `decision`, not the property, so the
 * `decision` counter sees only hook-level lookups. `gates` is carried over from
 * the real set, so the spread copy writes to the same registry.
 *
 * The `decisions` call count is deliberately not asserted. It records the
 * per-render structural lookup of a fresh record (the hash walk AGENTS.md
 * section 13 advises hoisting to avoid), which is a cost and not a re-creation.
 */
import {
  EvaluationServicesNone,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
} from "@qadi/core";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { outcomeOf } from "../src/DecisionOutcome.ts";
import { usePolicies } from "../src/hooks.ts";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import type { QadiAtoms } from "../src/QadiAtoms.ts";
import { QadiProvider } from "../src/QadiProvider.tsx";

const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

/** An atom set that counts the lookups hooks make through it. */
const counting = () => {
  const real = makeQadiAtoms(EvaluationServicesNone);
  const groups = new Set<object>();
  const calls = { opened: 0, grouped: 0 };
  const copy: QadiAtoms = {
    ...real,
    decision: (policy, resource) => {
      calls.opened += 1;
      return real.decision(policy, resource);
    },
    decisions: (questions) => {
      const group = real.decisions(questions);
      groups.add(group);
      calls.grouped += 1;
      return group;
    },
  };
  return { real, copy, groups, calls };
};

/** Both policies are built inline, as fresh objects, on every render. */
const Consumer = ({ tick }: { readonly tick: number }) => {
  const results = usePolicies({
    read: hasPermission(permission("doc", "read")),
    admin: hasRole("admin"),
  });
  const states = Object.values(results)
    .map((result) => outcomeOf(result)._tag)
    .sort()
    .join(",");
  return (
    <>
      <span data-testid="tick">{tick}</span>
      <span data-testid="states">{states}</span>
    </>
  );
};

describe("usePolicies across equal re-renders (D-07)", () => {
  it("instrumented: no second group atom, no further decision lookup, no registry notification", async () => {
    const { real, copy, groups, calls } = counting();
    let notified = 0;
    real.gates.subscribe(() => {
      notified += 1;
    });
    const tree = (tick: number) => (
      <QadiProvider atoms={copy} subject={alice} instrument>
        <Consumer tick={tick} />
      </QadiProvider>
    );
    const view = render(tree(0));
    await waitFor(() =>
      expect(
        real.gates
          .instances()
          .map((one) => one.state)
          .sort(),
      ).toEqual(["Allowed", "Denied"]),
    );
    const opened = calls.opened;
    const settled = notified;
    const ids = real.gates.instances().map((one) => one.id);

    for (const tick of [1, 2, 3]) {
      view.rerender(tree(tick));
      await waitFor(() => expect(screen.getByTestId("tick").textContent).toBe(String(tick)));
    }

    expect(groups.size).toBe(1);
    expect(calls.opened).toBe(opened);
    expect(notified).toBe(settled);
    expect(real.gates.instances().map((one) => one.id)).toEqual(ids);
  });

  it("uninstrumented: no second group atom and no further decision lookup", async () => {
    const { copy, groups, calls } = counting();
    const tree = (tick: number) => (
      <QadiProvider atoms={copy} subject={alice}>
        <Consumer tick={tick} />
      </QadiProvider>
    );
    const view = render(tree(0));
    await waitFor(() => expect(screen.getByTestId("states").textContent).toBe("Allowed,Denied"));
    const opened = calls.opened;

    for (const tick of [1, 2, 3]) {
      view.rerender(tree(tick));
      await waitFor(() => expect(screen.getByTestId("tick").textContent).toBe(String(tick)));
    }

    expect(groups.size).toBe(1);
    expect(calls.opened).toBe(opened);
  });
});
