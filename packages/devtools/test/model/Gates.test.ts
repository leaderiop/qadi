/**
 * Grouping live guards by the question they ask.
 *
 * The load-bearing property is that a group here is **exactly an atom** in
 * `@qadi/react`: both use `Equal.equals`, which is structural in Effect v4. If
 * they disagreed, the panel would claim two questions where the evaluator sees
 * one — which is the failure BEH-QD-217 was written to prevent, and this
 * increment preserves it rather than abandoning it.
 */
import { assert, describe, it } from "@effect/vitest";
import { hasPermission, hasRole, permission } from "@qadi/core";
import {
  GATE_STATES,
  displayOfGateState,
  gateGroups,
  instancesAsking,
  isLocatable,
  joinQuestions,
  locatableIds,
} from "../../src/model/Gates.ts";
import type { AskedQuestionLike, GateGroup, GateInstanceLike, QuestionsSnapshot } from "../../src/model/Gates.ts";
import { displayOfNodeStatus, displayOfVerdict } from "../../src/model/Verdict.ts";
import { readPolicy } from "../helpers.ts";

/** AGENTS.md §6 leaves no `!`, and an absent group is a failure worth naming. */
const only = (groups: ReadonlyArray<GateGroup>): GateGroup => {
  const first = groups[0];
  if (first === undefined) throw new Error("expected one group, got none");
  return first;
};

const isAdmin = hasRole("admin");

const instance = (fields: Partial<GateInstanceLike> & { readonly id: string }): GateInstanceLike => ({
  kind: "Can",
  policy: readPolicy,
  state: "Allowed",
  ...fields,
});

describe("gateGroups", () => {
  it("groups two guards asking the same question", () => {
    const groups = gateGroups([instance({ id: "a" }), instance({ id: "b" })]);

    assert.strictEqual(groups.length, 1);
    assert.strictEqual(groups[0]?.instances.length, 2);
  });

  it("GROUPS A POLICY BUILT TWICE, because equality is structural", () => {
    // The property that makes a group an atom. Two separately constructed but
    // equal policies share one atom in `@qadi/react`; they must share one row
    // here, or the panel disagrees with the evaluator.
    const groups = gateGroups([
      instance({ id: "a", policy: hasPermission(permission("doc", "read")) }),
      instance({ id: "b", policy: hasPermission(permission("doc", "read")) }),
    ]);
    assert.strictEqual(groups.length, 1);
  });

  it("separates two different questions", () => {
    const groups = gateGroups([
      instance({ id: "a", policy: readPolicy }),
      instance({ id: "b", policy: isAdmin }),
    ]);
    assert.strictEqual(groups.length, 2);
  });

  it("separates the same policy with and without a resource", () => {
    // BEH-QD-217's surviving requirement: they are two questions.
    const groups = gateGroups([
      instance({ id: "a" }),
      instance({ id: "b", resource: { id: "invoice-42" } }),
    ]);
    assert.strictEqual(groups.length, 2);
  });

  it("separates two different resources", () => {
    const groups = gateGroups([
      instance({ id: "a", resource: { id: "one" } }),
      instance({ id: "b", resource: { id: "two" } }),
    ]);
    assert.strictEqual(groups.length, 2);
  });

  it("groups two equal resources built separately", () => {
    const groups = gateGroups([
      instance({ id: "a", resource: { id: "one" } }),
      instance({ id: "b", resource: { id: "one" } }),
    ]);
    assert.strictEqual(groups.length, 1);
  });

  it("keeps registration order, so rows do not jump", () => {
    const groups = gateGroups([
      instance({ id: "a", policy: isAdmin }),
      instance({ id: "b", policy: readPolicy }),
    ]);
    assert.deepStrictEqual(
      groups.map((group) => group.label),
      ["admin", "doc:read"],
    );
  });

  it("groups nothing from nothing", () => {
    assert.deepStrictEqual(gateGroups([]), []);
  });

  describe("counts", () => {
    it("reports only the states that occurred", () => {
      // The opposite call from `hydrationActivity`'s drop reasons, and
      // deliberately: there the closed set at zero is the reassurance, here a
      // row of zeros would be four fifths noise beside the instance list.
      const groups = gateGroups([
        instance({ id: "a", state: "Allowed" }),
        instance({ id: "b", state: "Allowed" }),
        instance({ id: "c", state: "Denied" }),
      ]);

      assert.deepStrictEqual(groups[0]?.counts, [
        { state: "Denied", count: 1 },
        { state: "Allowed", count: 2 },
      ]);
    });

    it("orders worst news first", () => {
      // A reader opens this panel because something is missing.
      const groups = gateGroups(
        ["Allowed", "Pending", "Rechecking", "Denied", "Failed"].map((state, index) =>
          instance({ id: String(index), state }),
        ),
      );
      assert.deepStrictEqual(
        groups[0]?.counts.map((count) => count.state),
        [...GATE_STATES],
      );
    });

    it("puts a state it does not know AFTER the ones it does", () => {
      // This package reads a structure it does not own. An unknown value is
      // shown as itself — a wrong label is visible, a missing row is not.
      const groups = gateGroups([
        instance({ id: "a", state: "Somersault" }),
        instance({ id: "b", state: "Failed" }),
      ]);
      assert.deepStrictEqual(
        groups[0]?.counts.map((count) => count.state),
        ["Failed", "Somersault"],
      );
    });
  });
});

describe("isLocatable", () => {
  it("is true for an instance carrying an element", () => {
    assert.isTrue(isLocatable(instance({ id: "a", element: {} })));
  });

  it("is false for a hook, which has no node of its own", () => {
    assert.isFalse(isLocatable(instance({ id: "a" })));
  });

  it("is false for a ref that was never attached", () => {
    // A ref holds `null`; the registry's type says absent. Both must read the
    // same way here or the panel offers a highlight that does nothing.
    assert.isFalse(isLocatable(instance({ id: "a", element: null })));
  });
});

describe("locatableIds", () => {
  it("names only the instances the lens can point at", () => {
    const groups = gateGroups([
      instance({ id: "a", element: {} }),
      instance({ id: "b" }),
      instance({ id: "c", element: {} }),
    ]);
    assert.deepStrictEqual(locatableIds(only(groups).instances), ["a", "c"]);
  });

  it("counts them on the group, so a panel can say how many it cannot show", () => {
    const groups = gateGroups([instance({ id: "a", element: {} }), instance({ id: "b" })]);

    assert.strictEqual(groups[0]?.locatable, 1);
    assert.strictEqual(groups[0]?.instances.length, 2);
  });

  it("is empty where nothing can be pointed at", () => {
    const groups = gateGroups([instance({ id: "a", kind: "useCan" })]);
    // A caller must be able to tell "highlighted nothing" from "nothing to
    // highlight" — this is what makes that possible.
    assert.deepStrictEqual(locatableIds(only(groups).instances), []);
  });
});

describe("instancesAsking", () => {
  const groups = gateGroups([
    instance({ id: "a", policy: readPolicy }),
    instance({ id: "b", policy: readPolicy, resource: { id: "x" } }),
  ]);

  it("finds the guards asking one question", () => {
    assert.deepStrictEqual(
      instancesAsking(groups, readPolicy, undefined).map((one) => one.id),
      ["a"],
    );
  });

  it("distinguishes the resource-scoped question", () => {
    assert.deepStrictEqual(
      instancesAsking(groups, readPolicy, { id: "x" }).map((one) => one.id),
      ["b"],
    );
  });

  it("is empty for a question nothing is mounted for", () => {
    // A real and common state, not an error: a component that asked and then
    // unmounted leaves its question behind in the atom layer.
    assert.deepStrictEqual(instancesAsking(groups, isAdmin, undefined), []);
  });
});

describe("displayOfGateState", () => {
  it("maps each of the five render states, a failure to Error and never to Deny", () => {
    assert.deepStrictEqual(
      ["Allowed", "Denied", "Failed", "Pending", "Rechecking"].map(displayOfGateState),
      ["Allow", "Deny", "Error", "Pending", "Rechecking"],
    );
  });

  it("calls a state this build does not know Unrecognised, not an answer", () => {
    assert.strictEqual(displayOfGateState("Suspended"), "Unrecognised");
    // A key every object inherits is still not a render state.
    assert.strictEqual(displayOfGateState("toString"), "Unrecognised");
    assert.strictEqual(displayOfGateState(""), "Unrecognised");
  });

  it("GATE_STATES lists exactly the mapped states, worst news first", () => {
    assert.deepStrictEqual([...GATE_STATES], ["Failed", "Denied", "Rechecking", "Pending", "Allowed"]);
    for (const state of GATE_STATES) {
      assert.notStrictEqual(displayOfGateState(state), "Unrecognised");
    }
  });
});

describe("displayOfNodeStatus and displayOfVerdict", () => {
  it("shows a node never resolved as not reached, never as a denial", () => {
    assert.deepStrictEqual(
      (["Allowed", "Denied", "NeverResolved"] as const).map(displayOfNodeStatus),
      ["Allow", "Deny", "NotReached"],
    );
  });

  it("shows each verdict as itself", () => {
    assert.deepStrictEqual(
      (["Allow", "Deny", "Error", "Unknown"] as const).map(displayOfVerdict),
      ["Allow", "Deny", "Error", "Unknown"],
    );
  });
});

describe("joinQuestions: the panel's rows, decided once", () => {
  const canWrite = hasPermission(permission("doc", "write"));
  const noQuestions = {
    questions: undefined,
    gates: undefined,
    failed: undefined,
    questionsFailed: undefined,
    unsampled: false,
  };

  /** The ids asking each question, row by row; `undefined` when the view is not `Rows`. */
  const askingIds = (snapshot: QuestionsSnapshot): ReadonlyArray<ReadonlyArray<string> | undefined> | undefined =>
    snapshot.questions._tag === "Rows"
      ? snapshot.questions.rows.map((row) => row.asking?.map((one) => one.id))
      : undefined;

  it("an absent registry is Absent, and its instances are one empty constant", () => {
    const first = joinQuestions(noQuestions);
    const second = joinQuestions(noQuestions);

    assert.strictEqual(first.gates._tag, "Absent");
    assert.deepStrictEqual(first.instances, []);
    assert.strictEqual(first.instances, second.instances);
  });

  it("an empty registry is Empty, not Absent, and its instances are that very array", () => {
    const none: ReadonlyArray<GateInstanceLike> = [];
    const snapshot = joinQuestions({ ...noQuestions, gates: none });

    assert.strictEqual(snapshot.gates._tag, "Empty");
    assert.strictEqual(snapshot.instances, none);
  });

  it("a registry with guards is Listed, carrying the registry's own array", () => {
    const guards = [instance({ id: "a" }), instance({ id: "b", policy: isAdmin })];
    const snapshot = joinQuestions({ ...noQuestions, gates: guards });

    assert.strictEqual(snapshot.gates._tag, "Listed");
    assert.strictEqual(snapshot.instances, guards);
  });

  it("no questions is Unsampled while the poll has not sampled, and Absent once it has", () => {
    assert.strictEqual(joinQuestions({ ...noQuestions, unsampled: true }).questions._tag, "Unsampled");
    assert.strictEqual(joinQuestions({ ...noQuestions, unsampled: false }).questions._tag, "Absent");
  });

  it("an empty list of questions is Empty", () => {
    assert.strictEqual(joinQuestions({ ...noQuestions, questions: [] }).questions._tag, "Empty");
  });

  it("pairs each question with the guards asking it, in registry order", () => {
    const questions: ReadonlyArray<AskedQuestionLike> = [
      { policy: readPolicy },
      { policy: isAdmin },
      { policy: readPolicy, resource: { id: "x" } },
      { policy: canWrite },
    ];
    const guards = [
      instance({ id: "a", policy: readPolicy }),
      // Built separately, equal by structure: the same question as `a`.
      instance({ id: "b", policy: hasPermission(permission("doc", "read")) }),
      // A state this build does not know is listed, not dropped.
      instance({ id: "c", policy: isAdmin, state: "Suspended" }),
      instance({ id: "d", policy: readPolicy, resource: { id: "x" } }),
    ];

    const snapshot = joinQuestions({ questions, gates: guards, failed: undefined, questionsFailed: undefined, unsampled: false });

    assert.deepStrictEqual(askingIds(snapshot), [["a", "b"], ["c"], ["d"], []]);
    if (snapshot.questions._tag === "Rows") {
      assert.deepStrictEqual(
        snapshot.questions.rows.map((row) => row.question),
        questions,
      );
    }
  });

  it("a question with no registry is a row asked by nobody", () => {
    const snapshot = joinQuestions({
      questions: [{ policy: readPolicy }],
      gates: undefined,
      failed: undefined,
      questionsFailed: undefined,
      unsampled: false,
    });

    assert.deepStrictEqual(askingIds(snapshot), [[]]);
  });

  it("a registry that could not be read is Failed with its reason, lists no guard and makes no claim in any row", () => {
    const guards = [instance({ id: "a" })];
    const snapshot = joinQuestions({
      questions: [{ policy: readPolicy }],
      gates: guards,
      failed: "boom",
      questionsFailed: undefined,
      unsampled: false,
    });

    assert.strictEqual(snapshot.gates._tag, "Failed");
    if (snapshot.gates._tag === "Failed") assert.strictEqual(snapshot.gates.reason, "boom");
    assert.deepStrictEqual(snapshot.instances, []);
    assert.deepStrictEqual(askingIds(snapshot), [undefined]);
  });

  it("a failed read keeps the questions view as it is", () => {
    assert.strictEqual(joinQuestions({ ...noQuestions, failed: "boom" }).questions._tag, "Absent");
    assert.strictEqual(joinQuestions({ ...noQuestions, failed: "boom", questions: [] }).questions._tag, "Empty");
  });

  it("a thunk's failure is stated when no questions are read, before unsampled and absent", () => {
    const failed = joinQuestions({ ...noQuestions, questionsFailed: "boom" });
    const failedUnsampled = joinQuestions({ ...noQuestions, questionsFailed: "boom", unsampled: true });

    for (const snapshot of [failed, failedUnsampled]) {
      assert.strictEqual(snapshot.questions._tag, "Failed");
      if (snapshot.questions._tag === "Failed") assert.strictEqual(snapshot.questions.reason, "boom");
    }
  });

  it("questions read win over a thunk's failure", () => {
    // The failure alone is stated, so the two reads below are won by the questions and not by its absence.
    assert.strictEqual(joinQuestions({ ...noQuestions, questionsFailed: "boom" }).questions._tag, "Failed");
    assert.strictEqual(joinQuestions({ ...noQuestions, questions: [], questionsFailed: "boom" }).questions._tag, "Empty");
    assert.strictEqual(
      joinQuestions({
        ...noQuestions,
        questions: [{ policy: readPolicy }],
        questionsFailed: "boom",
      }).questions._tag,
      "Rows",
    );
  });

  it("the two failures are independent", () => {
    const guards = [instance({ id: "a" })];
    const onlyQuestions = joinQuestions({ ...noQuestions, gates: guards, questionsFailed: "no questions" });

    assert.strictEqual(onlyQuestions.gates._tag, "Listed");
    assert.strictEqual(onlyQuestions.instances, guards);
    assert.strictEqual(onlyQuestions.questions._tag, "Failed");

    const both = joinQuestions({ ...noQuestions, gates: guards, failed: "no registry", questionsFailed: "no questions" });

    assert.strictEqual(both.gates._tag, "Failed");
    if (both.gates._tag === "Failed") assert.strictEqual(both.gates.reason, "no registry");
    assert.strictEqual(both.questions._tag, "Failed");
    if (both.questions._tag === "Failed") assert.strictEqual(both.questions.reason, "no questions");
    assert.deepStrictEqual(both.instances, []);
  });
});
