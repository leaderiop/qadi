/**
 * JOB 4 ledger — E4.1 … E4.9.
 *
 * **Driven by real evaluations, not hand-built traces.** The whole claim of this
 * module is that `explain(policy)` and a `Trace` align index for index, and a
 * hand-built trace proves nothing about that — it proves only that the zip
 * agrees with whatever the test author assumed the evaluator does. So every
 * tree below comes out of `evaluate`.
 *
 * The load-bearing case is E4.1. A short-circuited node must read as
 * *unexamined*, never as denied: INV-QD-005 says a branch that is never reached
 * performs no lookup, and a reviewer who reads such a node as "denied"
 * concludes their policy rejected something it never looked at.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  allOf,
  anyOf,
  AttributeResolverNone,
  currentSubjectLayer,
  CustomPredicateNone,
  Decided,
  DecisionHistoryUnknown,
  denyWhen,
  evaluate,
  EvaluationIdLive,
  fromRoles,
  hasPermission,
  hasRole,
  labeled,
  not,
  obligation,
  obliged,
  permission,
  permitWhen,
  RelationshipResolverNever,
  role,
  rules,
} from "@qadi/core";
import type { Decision, Policy, Trace } from "@qadi/core";
import {
  flattenTree,
  inspect,
  inspectEntry,
  isNeverResolved,
  isTruncated,
} from "../../src/model/Inspect.ts";
import type { InspectNode } from "../../src/model/Inspect.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import { decisionRecord, failedRecord, obligationRecord } from "../helpers.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");
const reader = role({ name: "reader", permissions: [read] });
const alice = fromRoles({ id: "alice", roles: [reader] });

const services = Layer.mergeAll(
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  CustomPredicateNone,
);

/** A real decision, with the trace the evaluator actually produced. */
const decide = (policy: Policy): Promise<Decision> =>
  Effect.runPromise(
    evaluate(policy).pipe(
      Effect.provide(currentSubjectLayer(alice)),
      Effect.provide(services),
    ),
  );

const treeOf = async (policy: Policy): Promise<InspectNode> =>
  inspect(policy, (await decide(policy)).trace);

const at = (node: InspectNode, path: string): InspectNode | undefined =>
  flattenTree(node).find((n) => n.path === path);

describe("the shape of the tree", () => {
  it("a leaf is one node, addressed at the root", async () => {
    const tree = await treeOf(hasPermission(read));

    assert.strictEqual(tree.path, "$");
    assert.strictEqual(tree.kind, "Requirement");
    assert.strictEqual(tree.label, "doc:read");
    assert.strictEqual(tree.detail, "permission");
    assert.deepStrictEqual(tree.children, []);
  });

  it("addresses every node by its path from the root", async () => {
    const tree = await treeOf(allOf([hasPermission(read), hasRole("reader")]));

    assert.deepStrictEqual(
      flattenTree(tree).map((n) => n.path),
      ["$", "$.0", "$.1"],
    );
  });

  it("names the combining algorithm on a composite", async () => {
    const all = await treeOf(allOf([hasPermission(read)]));
    const any = await treeOf(anyOf([hasPermission(read)], { fieldStrategy: "Union" }));

    assert.deepStrictEqual([all.label, all.detail], ["all of", "Intersection"]);
    assert.deepStrictEqual([any.label, any.detail], ["any of", "Union"]);
  });

  // E4.4 — a wrapper is one trace child, so indices must not drift beneath it.
  it("a Labeled wrapper carries its name and one child", async () => {
    const tree = await treeOf(labeled("can read", hasPermission(read)));

    assert.strictEqual(tree.kind, "Named");
    assert.strictEqual(tree.label, "can read");
    assert.strictEqual(tree.detail, "named");
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0]?.label, "doc:read");
    assert.strictEqual(tree.children[0]?.status, "Allowed");
  });

  it("an Obliged wrapper names the duty and one child", async () => {
    const tree = await treeOf(obliged(obligation("audit"), hasPermission(read)));

    assert.strictEqual(tree.kind, "Owing");
    assert.strictEqual(tree.label, "obliged");
    assert.strictEqual(tree.detail, "audit");
    assert.strictEqual(tree.children.length, 1);
  });

  it("a rule table names its rows' effects", async () => {
    const tree = await treeOf(
      rules([permitWhen(hasRole("nobody")), denyWhen(hasPermission(read))], {
        combining: "DenyOverrides",
      }),
    );

    assert.strictEqual(tree.kind, "Table");
    assert.strictEqual(tree.label, "rules");
    assert.strictEqual(tree.detail, "DenyOverrides");
    assert.deepStrictEqual(
      tree.children.map((c) => c.effect),
      ["Permit", "Deny"],
    );
  });

  it("a leaf outside a table has no effect", async () => {
    assert.isUndefined((await treeOf(hasPermission(read))).effect);
  });
});

describe("status", () => {
  it("an allowing leaf is Allowed and a denying one is Denied", async () => {
    assert.strictEqual((await treeOf(hasPermission(read))).status, "Allowed");
    assert.strictEqual((await treeOf(hasPermission(write))).status, "Denied");
  });

  it("carries the denial's reason", async () => {
    const tree = await treeOf(hasPermission(write));
    assert.isDefined(tree.reason);
  });

  /**
   * E4.1 — the case this module exists for.
   *
   * `allOf` short-circuits, so the second child is never evaluated and the
   * trace has one child where the explanation has two.
   */
  it("a short-circuited branch is NeverResolved, not Denied", async () => {
    const tree = await treeOf(allOf([hasPermission(write), hasPermission(read)]));

    assert.strictEqual(tree.status, "Denied");
    assert.strictEqual(tree.children[0]?.status, "Denied");
    // Never examined. Reading this as a denial would tell a reviewer their
    // policy rejected something it never looked at.
    assert.strictEqual(tree.children[1]?.status, "NeverResolved");
    assert.isTrue(isNeverResolved(tree.children[1] ?? tree));
  });

  /**
   * JOB 5's E5.7, pinned where the function lives.
   *
   * `dehydrateDecisions` ships a reduced trace unless `includeTrace` is set, so
   * a hydrated decision arrives with a root and no children — a **disclosure
   * boundary**, not an evaluation that stopped. It is distinguishable from
   * short-circuiting because a composite that short-circuits always evaluates
   * at least its first child, and the three cases below are exactly the ones a
   * looser predicate would confuse it with.
   */
  it("tells a truncated trace from every other shape that has unresolved children", async () => {
    const policy = allOf([hasPermission(read), hasPermission(read)]);

    // Root resolved, every child unexamined: only truncation produces this.
    assert.isTrue(
      isTruncated(
        inspect(policy, {
          policyTag: "AllOf",
          allowed: true,
          children: [],
          obligations: [],
        }),
      ),
    );

    // A failed evaluation has no trace at all, so the *root* is unresolved too.
    // Calling that undisclosed would blame a disclosure decision for an outage.
    assert.isFalse(isTruncated(inspect(policy, undefined)));

    // A leaf has no children to disclose, and warning on every
    // single-requirement policy in the log would be worse than saying nothing.
    assert.isFalse(isTruncated(await treeOf(hasPermission(read))));

    // Short-circuiting leaves the *first* child resolved.
    assert.isFalse(isTruncated(await treeOf(allOf([hasPermission(write), hasPermission(read)]))));
  });

  it("anyOf short-circuits after the first allow", async () => {
    const tree = await treeOf(anyOf([hasPermission(read), hasPermission(write)]));

    assert.strictEqual(tree.status, "Allowed");
    assert.strictEqual(tree.children[0]?.status, "Allowed");
    assert.strictEqual(tree.children[1]?.status, "NeverResolved");
  });

  it("everything beneath a short-circuited node is unexamined too", async () => {
    const tree = await treeOf(
      allOf([
        hasPermission(write),
        allOf([hasPermission(read), labeled("deep", hasPermission(read))]),
      ]),
    );

    const skipped = flattenTree(tree).filter((n) => n.path.startsWith("$.1"));
    assert.strictEqual(skipped.length, 4);
    assert.isTrue(skipped.every(isNeverResolved));
  });

  /**
   * E4.3 — a rule table's first diagnostic question is *which row hit*, and
   * ADR-QD-023 is why the trace carries a reason even when it allows.
   */
  it("a rule table names the row that decided, in both directions", async () => {
    const permitted = await treeOf(
      rules([permitWhen(hasRole("nobody")), permitWhen(hasPermission(read))]),
    );
    assert.include(permitted.reason ?? "", "rules[1]");

    const refused = await treeOf(
      rules([permitWhen(hasRole("nobody")), denyWhen(hasPermission(read))], {
        combining: "DenyOverrides",
      }),
    );
    assert.include(refused.reason ?? "", "rules[1]");
  });

  it("a rule table that stops early leaves later rows unexamined", async () => {
    const tree = await treeOf(
      rules([permitWhen(hasPermission(read)), permitWhen(hasRole("reader"))]),
    );

    assert.strictEqual(tree.children[0]?.status, "Allowed");
    assert.strictEqual(tree.children[1]?.status, "NeverResolved");
  });

  // E4.2 — the one place where a child's status and its parent's disagree by
  // design.
  it("a Not denies while its child allowed, and both are shown truthfully", async () => {
    const tree = await treeOf(not(hasPermission(read)));

    assert.strictEqual(tree.kind, "Negated");
    assert.strictEqual(tree.label, "not");
    assert.strictEqual(tree.status, "Denied");
    assert.strictEqual(tree.children[0]?.status, "Allowed");
    // The predicate must discriminate, not merely be callable: a node that was
    // examined and denied is emphatically not an unexamined one.
    assert.isFalse(isNeverResolved(tree));
    assert.isFalse(isNeverResolved(tree.children[0] ?? tree));
  });

  it("a Not allows while its child denied", async () => {
    const tree = await treeOf(not(hasPermission(write)));

    assert.strictEqual(tree.status, "Allowed");
    assert.strictEqual(tree.children[0]?.status, "Denied");
  });
});

describe("fields and duties", () => {
  // E4.5 — the direction of this error matters.
  it("undefined visibleFields is the top of the lattice, not an empty grant", async () => {
    const tree = await treeOf(hasPermission(read));

    // A renderer showing an empty list here understates "every field" into
    // "no fields", which is the direction a reviewer would act on.
    assert.isUndefined(tree.visibleFields);
    assert.strictEqual(tree.status, "Allowed");
  });

  it("a narrowing leaf reports what it narrows to, and what stayed visible", async () => {
    const tree = await treeOf(hasPermission(read, { fields: ["id", "title"] }));

    assert.deepStrictEqual(tree.restrictsFields, ["id", "title"]);
    assert.deepStrictEqual(tree.visibleFields, ["id", "title"]);
  });

  it("a leaf that narrows nothing says so", async () => {
    assert.isUndefined((await treeOf(hasPermission(read))).restrictsFields);
  });

  it("a path-aware spec carries through unchanged — it's an opaque string, not parsed here", async () => {
    const tree = await treeOf(hasPermission(read, { fields: ["id", "address.street", "contact.*"] }));

    assert.deepStrictEqual(tree.restrictsFields, ["id", "address.street", "contact.*"]);
  });

  it("an allowed obliged node carries its duty", async () => {
    const tree = await treeOf(obliged(obligation("audit"), hasPermission(read)));

    assert.deepStrictEqual(tree.obligations.map((o) => o.id), ["audit"]);
  });

  // E4.6 — ADR-QD-019's "defensible rather than silent".
  it("a duty an enclosing Not discarded is still visible on the node that owed it", async () => {
    const tree = await treeOf(not(obliged(obligation("audit"), hasPermission(read))));

    // The decision carries none — the `Not` dropped them — but the reviewer can
    // still see which node owed what.
    assert.deepStrictEqual(tree.obligations, []);
    assert.deepStrictEqual(tree.children[0]?.obligations.map((o) => o.id), ["audit"]);
  });

  it("an unresolved node owes nothing rather than undefined", async () => {
    const tree = await treeOf(allOf([hasPermission(write), obliged(obligation("x"), hasPermission(read))]));

    assert.deepStrictEqual(tree.children[1]?.obligations, []);
  });
});

describe("inspectEntry", () => {
  const fold = (records: ReadonlyArray<Parameters<typeof ingestAll>[1][number]>) =>
    ingestAll(emptyTimeline(), records);

  it("builds the tree from the row's own policy and trace", async () => {
    const policy = allOf([hasPermission(read), hasPermission(write)]);
    const decision = await decide(policy);
    const timeline = fold([
      decisionRecord({
        evaluationId: "a",
        at: 100,
        policy,
        outcome: new Decided({ decision }),
      }),
    ]);

    const node = inspectEntry(timeline.entries[0] ?? fail());

    // The record carries the policy precisely so this is reachable: a
    // `Decision` alone has only `trace.policyTag`, a string, so before
    // BEH-QD-183 the explanation of a denial was unreachable from the denial.
    assert.strictEqual(node?.kind, "All");
    assert.deepStrictEqual(node?.children.map((c) => c.label), ["doc:read", "doc:write"]);
    assert.strictEqual(node?.status, "Denied");
  });

  // E4.7 — the inversion this guards against is the worst one available.
  it("a failed evaluation has no tree at all, not an empty one", () => {
    const timeline = fold([failedRecord({ evaluationId: "e", at: 100 })]);

    // An empty requirement tree reads as "no requirements", which reads as
    // "allowed". Returning nothing forces the caller to render an error panel.
    assert.isUndefined(inspectEntry(timeline.entries[0] ?? fail()));
  });

  it("an orphaned outcome has no tree", () => {
    const timeline = fold([obligationRecord({ evaluationId: "ghost", at: 100 })]);
    assert.isUndefined(inspectEntry(timeline.entries[0] ?? fail()));
  });
});

describe("a trace that was not disclosed", () => {
  // E4.8 — a disclosure boundary, not a defect.
  it("no trace at all makes the whole tree unexamined", () => {
    const tree = inspect(allOf([hasPermission(read), hasPermission(write)]), undefined);

    // A dehydrated payload ships a reduced trace unless `includeTrace` is set.
    // The honest rendering is "not disclosed" everywhere — never a fabricated
    // verdict, and never an empty tree.
    assert.isTrue(flattenTree(tree).every(isNeverResolved));
    assert.strictEqual(flattenTree(tree).length, 3);
  });

  it("a trace whose children were dropped leaves the parent's own verdict intact", () => {
    const reduced: Trace = {
      policyTag: "AllOf",
      allowed: true,
      children: [],
      obligations: [],
    };
    const tree = inspect(allOf([hasPermission(read), hasPermission(write)]), reduced);

    assert.strictEqual(tree.status, "Allowed");
    assert.isTrue(tree.children.every(isNeverResolved));
  });
});

describe("depth", () => {
  // E4.9 — the evaluator bounds at 64 by default; the renderer must survive it.
  it("a deeply nested policy builds without exhausting the stack", async () => {
    let policy: Policy = hasPermission(read);
    for (let i = 0; i < 50; i += 1) policy = allOf([policy]);

    const tree = await treeOf(policy);
    assert.strictEqual(flattenTree(tree).length, 51);
    assert.strictEqual(at(tree, "$" + ".0".repeat(50))?.label, "doc:read");
  });
});

const fail = (): never => {
  throw new Error("expected a timeline entry");
};
