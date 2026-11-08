/**
 * The "tests register once, not once per kind" property ARCH-49 promised.
 *
 * Every gate surface reaches the registry through one hook, `useGates`, so one
 * table states the per-kind facts for all eight of them: each registers exactly
 * once, under its own kind, with an element only for `Can` and `Cannot` and an id
 * that carries `/<name>` only for `usePolicies` and `useQuestions`. If the table
 * and the hook's per-kind facts disagree, a row fails.
 *
 * The last test pins BEH-QD-068's precision: changing one entry of a grouped hook
 * re-registers that entry alone, and a sibling's registry instance stays the very
 * same object.
 */
import {
  EvaluationServicesNone,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
} from "@qadi/core";
import { cleanup, render, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Can, Cannot } from "../src/components.tsx";
import type { GateKind } from "../src/GateWriter.ts";
import {
  useCan,
  useDecision,
  useDecisionSuspense,
  usePolicies,
  useProjected,
  useQuestions,
} from "../src/hooks.ts";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import { QadiProvider } from "../src/QadiProvider.tsx";

const policy = hasPermission(permission("doc", "read"));
const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

interface Row {
  readonly kind: GateKind;
  readonly element: boolean;
  readonly grouped: boolean;
  readonly Surface: ComponentType;
}

const resource = { id: "d1" };

const UsesCan = () => {
  useCan(policy, resource);
  return null;
};
const UsesDecision = () => {
  useDecision(policy, resource);
  return null;
};
const UsesProjected = () => {
  useProjected(policy, resource);
  return null;
};
const UsesSuspense = () => {
  useDecisionSuspense(policy, resource);
  return null;
};
const UsesPolicies = () => {
  usePolicies({ only: policy });
  return null;
};
const UsesQuestions = () => {
  useQuestions({ only: { policy } });
  return null;
};

const rows: ReadonlyArray<Row> = [
  { kind: "Can", element: true, grouped: false, Surface: () => <Can policy={policy}>c</Can> },
  {
    kind: "Cannot",
    element: true,
    grouped: false,
    Surface: () => <Cannot policy={policy}>c</Cannot>,
  },
  { kind: "useCan", element: false, grouped: false, Surface: UsesCan },
  { kind: "useDecision", element: false, grouped: false, Surface: UsesDecision },
  { kind: "useProjected", element: false, grouped: false, Surface: UsesProjected },
  {
    kind: "useDecisionSuspense",
    element: false,
    grouped: false,
    Surface: () => (
      <Suspense fallback={null}>
        <UsesSuspense />
      </Suspense>
    ),
  },
  { kind: "usePolicies", element: false, grouped: true, Surface: UsesPolicies },
  { kind: "useQuestions", element: false, grouped: true, Surface: UsesQuestions },
];

const mount = (children: ReactNode) => {
  const atoms = makeQadiAtoms(EvaluationServicesNone);
  render(
    <QadiProvider atoms={atoms} subject={alice} instrument>
      {children}
    </QadiProvider>,
  );
  return atoms;
};

describe("every gate kind registers once through the one hook", () => {
  it("the table covers all eight kinds", () => {
    expect(new Set(rows.map((row) => row.kind)).size).toBe(8);
  });

  it.each(rows)("$kind: registers once, under its own kind", async ({ kind, element, grouped, Surface }) => {
    const atoms = mount(<Surface />);

    await waitFor(() => {
      const listed = atoms.gates.instances();
      expect(listed).toHaveLength(1);
      expect(listed[0]?.state).not.toBe("Pending");
    });

    const [instance] = atoms.gates.instances();
    expect(instance?.kind).toBe(kind);
    expect(instance?.element !== undefined).toBe(element);
    expect(instance?.id.includes("/")).toBe(grouped);
    if (grouped) expect(instance?.id.endsWith("/only")).toBe(true);
  });
});

describe("a grouped hook re-registers only the entry that changed (BEH-QD-068)", () => {
  const Ask = ({ docId }: { readonly docId: string }) => {
    useQuestions({
      doc: { policy, resource: { id: docId } },
      admin: { policy: hasRole("admin") },
    });
    return null;
  };

  it("changing one entry re-registers that entry alone", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const tree = (docId: string) => (
      <QadiProvider atoms={atoms} subject={alice} instrument>
        <Ask docId={docId} />
      </QadiProvider>
    );
    const view = render(tree("d1"));
    await waitFor(() => {
      const listed = atoms.gates.instances();
      expect(listed).toHaveLength(2);
      expect(listed.every((one) => one.state !== "Pending")).toBe(true);
    });
    const kept = atoms.gates.instances().find((one) => one.id.endsWith("/admin"));
    const before = atoms.gates.instances().find((one) => one.id.endsWith("/doc"));
    expect(kept).not.toBeUndefined();
    expect(before).not.toBeUndefined();
    if (kept === undefined || before === undefined) return;

    view.rerender(tree("d2"));

    await waitFor(() => {
      const doc = atoms.gates.instances().find((one) => one.id.endsWith("/doc"));
      expect(doc?.resource).toEqual({ id: "d2" });
    });
    const admin = atoms.gates.instances().find((one) => one.id.endsWith("/admin"));
    const doc = atoms.gates.instances().find((one) => one.id.endsWith("/doc"));
    expect(admin).toBe(kept);
    expect(doc?.id).toBe(before.id);
  });
});
