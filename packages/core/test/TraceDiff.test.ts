import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import type { Trace } from "../src/Decision.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { diffTraces, flippedAt, tracePathKey } from "../src/TraceDiff.ts";
import { childKey } from "../src/TraceKey.ts";
import { chain, subjectWith, testLayer } from "./helpers.ts";
import { oracleDiffTraces, tracePairArbitrary } from "./TraceOracle.ts";

const read = permission("doc", "read");

/** Resolves `clearance` to whatever is given, so one input can be varied. */
const clearance = (value: unknown) =>
  Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(value) });

/**
 * A minimal `Trace` node, for tests that compare two hand-built traces
 * directly rather than evaluating a policy — needed where what matters is the
 * shape of a single node's `visibleFields`/`obligations`, not how a policy
 * tree produces them.
 */
const baseTrace = (overrides: Partial<Trace> = {}): Trace => ({
  policyTag: "HasPermission",
  allowed: true,
  children: [],
  obligations: [],
  ...overrides,
});

describe("diffTraces", () => {
  it.effect("two identical evaluations differ nowhere", () =>
    Effect.gen(function* () {
      const policy = P.allOf([P.hasPermission(read), P.hasRole("editor")]);
      const a = yield* evaluate(policy);
      const b = yield* evaluate(policy);

      // Stronger than "the verdicts match" — this is the check a replay wants.
      assert.deepStrictEqual(diffTraces(a.trace, b.trace), []);
    }).pipe(
      Effect.provide(
        testLayer(subjectWith({ permissions: ["doc:read"], roles: ["editor"] })),
      ),
    ));

  it.effect("names the leaf that flipped, by path", () =>
    Effect.gen(function* () {
      const policy = P.allOf([
        P.hasPermission(read),
        P.hasAttribute("clearance", M.gte(3)),
      ]);

      const denied = yield* evaluate(policy).pipe(Effect.provide(clearance(1)));
      const allowed = yield* evaluate(policy).pipe(Effect.provide(clearance(5)));

      const flip = flippedAt(denied.trace, allowed.trace);
      assert.isDefined(flip);
      // The root flipped too — but the OUTERMOST changed node is the root, and
      // the diff lists parents before children, so the caller can see both.
      assert.deepStrictEqual(flip?.path, []);

      const all = diffTraces(denied.trace, allowed.trace);
      const leaf = all.find(
        (d) => d._tag === "VerdictChanged" && d.policyTag === "HasAttribute",
      );
      assert.isDefined(leaf);
      assert.deepStrictEqual(leaf?.path, [1]);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("reports a shape difference and does not descend past it", () =>
    Effect.gen(function* () {
      // `anyOf` short-circuits, so which children exist in the trace depends on
      // where it stopped. That is a real difference in what was evaluated, not
      // an artefact — INV-QD-020 keeps the trace honest about it.
      const policy = P.anyOf([
        P.hasAttribute("clearance", M.gte(3)),
        P.hasPermission(read),
      ]);

      const stoppedFirst = yield* evaluate(policy).pipe(Effect.provide(clearance(5)));
      const wentFurther = yield* evaluate(policy).pipe(Effect.provide(clearance(1)));

      const diff = diffTraces(stoppedFirst.trace, wentFurther.trace);
      const shape = diff.find((d) => d._tag === "ChildCountChanged");
      assert.isDefined(shape);
      assert.strictEqual(shape?._tag === "ChildCountChanged" ? shape.before : -1, 1);
      assert.strictEqual(shape?._tag === "ChildCountChanged" ? shape.after : -1, 2);

      // Nothing below the divergence: "child 1 changed" is meaningless when one
      // side has no child 1.
      assert.isUndefined(diff.find((d) => d.path.length > 0));
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("a changed reason is reported without a verdict change", () =>
    Effect.gen(function* () {
      const policy = P.hasAttribute("clearance", M.gte(3));

      const a = yield* evaluate(policy).pipe(Effect.provide(clearance(1)));
      const b = yield* evaluate(policy).pipe(Effect.provide(clearance(undefined)));

      const diff = diffTraces(a.trace, b.trace);
      // Both deny, but for different reasons — "no value" versus "did not
      // match", which is the distinction INV-QD-029 added.
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0]?._tag, "ReasonChanged");
      assert.isUndefined(flippedAt(a.trace, b.trace));
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("a field-visibility change is reported", () =>
    Effect.gen(function* () {
      const wide = P.hasPermission(read, { fields: ["id", "title"] });
      const narrow = P.hasPermission(read, { fields: ["id"] });

      const a = yield* evaluate(wide);
      const b = yield* evaluate(narrow);

      const diff = diffTraces(a.trace, b.trace);
      const fields = diff.find((d) => d._tag === "FieldsChanged");
      assert.isDefined(fields);
      assert.deepStrictEqual(
        fields?._tag === "FieldsChanged" ? fields.after : undefined,
        ["id"],
      );
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("undefined fields and empty fields are not the same change", () =>
    Effect.gen(function* () {
      // Opposite ends of the lattice: `undefined` is every field, `[]` is none
      // (INV-QD-004). A comparison treating them as equal would hide a total
      // loss of visibility.
      const all = P.hasPermission(read);
      const none = P.hasPermission(read, { fields: [] });

      const a = yield* evaluate(all);
      const b = yield* evaluate(none);

      assert.isDefined(diffTraces(a.trace, b.trace).find((d) => d._tag === "FieldsChanged"));
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("an obligation change is reported", () =>
    Effect.gen(function* () {
      const plain = P.hasPermission(read);
      const obliged = P.obliged(obligation("audit.log"), P.hasPermission(read));

      const a = yield* evaluate(plain);
      const b = yield* evaluate(obliged);

      const diff = diffTraces(a.trace, b.trace);
      const obligations = diff.find((d) => d._tag === "ObligationsChanged");
      assert.isDefined(obligations);
      // The whole `Obligation`, not just its `id` — `ObligationsChanged` is
      // compared and reported by full value (issue 45).
      assert.deepStrictEqual(
        obligations?._tag === "ObligationsChanged" ? obligations.after : undefined,
        [obligation("audit.log")],
      );
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("a label-only change is reported, even though nothing else about the node differs", () =>
    Effect.gen(function* () {
      // The defect this pins: same verdict, same reason, same fields, same
      // obligations, same shape — the ONLY thing that changed is the label an
      // author gave the `Labeled` wrapper. Before the fix this produced an
      // empty diff, contradicting "empty means the two evaluations agree at
      // every node".
      const a = yield* evaluate(P.labeled("sod.role", P.hasRole("editor")));
      const b = yield* evaluate(P.labeled("sod.role.v2", P.hasRole("editor")));

      const diff = diffTraces(a.trace, b.trace);
      assert.deepStrictEqual(diff, [
        { _tag: "LabelChanged", path: [], policyTag: "Labeled", before: "sod.role", after: "sod.role.v2" },
      ]);
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["editor"] })))));

  it.effect("a policy-tag-only change is reported, even when the two nodes decide identically", () =>
    Effect.gen(function* () {
      // Two different node types that happen to allow the same way: same
      // verdict, no reason, no fields, no obligations, no children — the ONLY
      // difference is which kind of check sits at this node. Before the fix
      // this, too, produced an empty diff.
      const a = yield* evaluate(P.hasRole("editor"));
      const b = yield* evaluate(P.hasAction("read"), { action: "read" });

      const diff = diffTraces(a.trace, b.trace);
      assert.deepStrictEqual(diff, [
        { _tag: "PolicyTagChanged", path: [], policyTag: "HasAction", before: "HasRole", after: "HasAction" },
      ]);
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["editor"] })))));

  it.effect(
    "a label rename combined with a tag swap reports PolicyTagChanged and LabelChanged together",
    () =>
      Effect.gen(function* () {
        // The realistic what-if the two single-change tests above don't cover
        // together: an author renames a wrapper's label and swaps its node
        // kind in the same edit. `policyTag` and `label` are checked
        // independently (src/TraceDiff.ts), so a labeled node compared
        // against a differently-tagged, unlabeled one produces both entries
        // at the same path. A `Labeled` node also always wraps exactly one
        // child while `HasAction` is a leaf, so `ChildCountChanged` fires
        // too — documenting all three as intended rather than incidental.
        const a = yield* evaluate(P.labeled("sod.role", P.hasRole("editor")));
        const b = yield* evaluate(P.hasAction("read"), { action: "read" });

        const diff = diffTraces(a.trace, b.trace);
        assert.deepStrictEqual(diff, [
          {
            _tag: "PolicyTagChanged",
            path: [],
            policyTag: "HasAction",
            before: "Labeled",
            after: "HasAction",
          },
          {
            _tag: "LabelChanged",
            path: [],
            policyTag: "HasAction",
            before: "sod.role",
            after: undefined,
          },
          {
            _tag: "ChildCountChanged",
            path: [],
            policyTag: "HasAction",
            before: 1,
            after: 0,
          },
        ]);
      }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["editor"] })))),
  );

  it.effect("parents are listed before children", () =>
    Effect.gen(function* () {
      const policy = P.allOf([P.hasAttribute("clearance", M.gte(3))]);

      const a = yield* evaluate(policy).pipe(Effect.provide(clearance(1)));
      const b = yield* evaluate(policy).pipe(Effect.provide(clearance(5)));

      const paths = diffTraces(a.trace, b.trace).map((d) => d.path.length);
      // The ordering `flippedAt` depends on: it returns the FIRST verdict
      // change, which must be the outermost one.
      assert.deepStrictEqual([...paths].sort((x, y) => x - y), paths);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));
});

describe("diffTraces — the comparisons themselves", () => {
  // These exercise `sameFields` and the obligation comparison element by
  // element. Mutation testing found both were only ever reached with
  // different-LENGTH inputs, so an element-wise comparison that never compared
  // elements would have passed every test above.

  it.effect("two same-length field sets with different contents differ", () =>
    Effect.gen(function* () {
      const a = yield* evaluate(P.hasPermission(read, { fields: ["id"] }));
      const b = yield* evaluate(P.hasPermission(read, { fields: ["title"] }));

      const fields = diffTraces(a.trace, b.trace).find((d) => d._tag === "FieldsChanged");
      assert.isDefined(fields);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("equal-but-distinct field sets do not differ", () =>
    Effect.gen(function* () {
      // Two separately built policies, so the field arrays are structurally
      // equal and NOT the same object. Comparing the same policy twice would
      // pass under a reference check, which is what a `sameFields` reduced to
      // `a === b` would be — and that is exactly the mutant this kills.
      const a = yield* evaluate(P.hasPermission(read, { fields: ["id", "title"] }));
      const b = yield* evaluate(P.hasPermission(read, { fields: ["id", "title"] }));

      assert.deepStrictEqual(diffTraces(a.trace, b.trace), []);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("field sets sharing a prefix but not all elements differ", () =>
    Effect.gen(function* () {
      // Partially overlapping, so `every` and `some` disagree: every → false,
      // some → true. Fully disjoint arrays agree on both and cannot tell an
      // element-wise comparison from its inverse.
      const a = yield* evaluate(P.hasPermission(read, { fields: ["id", "title"] }));
      const b = yield* evaluate(P.hasPermission(read, { fields: ["id", "body"] }));

      assert.isDefined(diffTraces(a.trace, b.trace).find((d) => d._tag === "FieldsChanged"));
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("a field set that is a strict prefix of the other differs", () =>
    Effect.gen(function* () {
      // `before` shorter than `after`, so an element-wise walk over `before`
      // alone finds every element equal and would report no change. The length
      // check is what catches a widening.
      const a = yield* evaluate(P.hasPermission(read, { fields: ["id"] }));
      const b = yield* evaluate(P.hasPermission(read, { fields: ["id", "title"] }));

      assert.isDefined(diffTraces(a.trace, b.trace).find((d) => d._tag === "FieldsChanged"));
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it("field sets with the same elements in a different order do not differ", () => {
    // `FieldsChanged` documents SET semantics — "the set of fields this node
    // makes visible" — so a reorder alone must not report a change. Before
    // the fix, `sameFields` compared positionally and these two would have
    // produced a spurious `FieldsChanged`.
    const a = baseTrace({ visibleFields: ["id", "title"] });
    const b = baseTrace({ visibleFields: ["title", "id"] });

    assert.deepStrictEqual(diffTraces(a, b), []);
  });

  it("obligation sets with the same ids in a different order do not differ", () => {
    // Same set semantics as fields, and the same defect: two evaluations of
    // the same policy against differently-ordered attribute stores, or a
    // future change to `unionObligations`'s insertion order, must not turn
    // into a reported change. Before the fix, the positional comparison
    // would have reported this as an `ObligationsChanged`.
    const a = baseTrace({
      obligations: [obligation("audit.log"), obligation("notify.owner")],
    });
    const b = baseTrace({
      obligations: [obligation("notify.owner"), obligation("audit.log")],
    });

    assert.deepStrictEqual(diffTraces(a, b), []);
  });

  it("two obligations sharing an id but differing in attributes DO differ", () => {
    // The defect an id-only comparison has: `Obligation.ts` is explicit that
    // `id` is "not an identity: two duties may share one id", and
    // `unionObligations` already compares by the whole value for exactly that
    // reason. Before this fix, `diffTraces` compared obligations by `id`
    // alone and would have reported these two traces as identical, hiding a
    // real change to what the caller must discharge (issue 45).
    const a = baseTrace({ obligations: [obligation("audit.log", { level: "info" })] });
    const b = baseTrace({ obligations: [obligation("audit.log", { level: "warn" })] });

    const diff = diffTraces(a, b);
    const changed = diff.find((d) => d._tag === "ObligationsChanged");
    assert.isDefined(changed);
    assert.deepStrictEqual(diff, [
      {
        _tag: "ObligationsChanged",
        path: [],
        policyTag: "HasPermission",
        before: [obligation("audit.log", { level: "info" })],
        after: [obligation("audit.log", { level: "warn" })],
      },
    ]);
  });

  it("two obligations sharing an id and attributes but differing in advisory DO differ", () => {
    // The mirror case: `attributes` held equal, only `advisory` moved. A
    // caller distinguishing a binding duty from one it may ignore needs this
    // reported — `bindingObligations` (`Obligation.ts`) filters on exactly this
    // flag.
    const a = baseTrace({ obligations: [obligation("audit.log", {}, { advisory: true })] });
    const b = baseTrace({ obligations: [obligation("audit.log", {}, { advisory: false })] });

    assert.isDefined(diffTraces(a, b).find((d) => d._tag === "ObligationsChanged"));
  });

  it.effect("identical non-empty obligations produce no difference", () =>
    Effect.gen(function* () {
      // The negative case for the obligation comparison. Without it, a
      // comparison that always reports a change looks correct — every test
      // asserting a change still passes.
      const policy = P.obliged(obligation("audit.log"), P.hasPermission(read));

      const a = yield* evaluate(policy);
      const b = yield* evaluate(policy);

      assert.deepStrictEqual(diffTraces(a.trace, b.trace), []);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("obligation lists sharing a prefix but not all ids differ", () =>
    Effect.gen(function* () {
      const two = (second: string) =>
        P.obliged(
          obligation("audit.log"),
          P.obliged(obligation(second), P.hasPermission(read)),
        );

      const a = yield* evaluate(two("notify.owner"));
      const b = yield* evaluate(two("notify.legal"));

      assert.isDefined(
        diffTraces(a.trace, b.trace).find((d) => d._tag === "ObligationsChanged"),
      );
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("a defined field set and an undefined one differ, both ways round", () =>
    Effect.gen(function* () {
      const all = yield* evaluate(P.hasPermission(read));
      const some = yield* evaluate(P.hasPermission(read, { fields: ["id"] }));

      // `undefined` is the top of the lattice, so this is a real narrowing in
      // one direction and a real widening in the other (INV-QD-004).
      assert.isDefined(diffTraces(all.trace, some.trace).find((d) => d._tag === "FieldsChanged"));
      assert.isDefined(diffTraces(some.trace, all.trace).find((d) => d._tag === "FieldsChanged"));
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("two same-length obligation lists with different ids differ", () =>
    Effect.gen(function* () {
      const a = yield* evaluate(P.obliged(obligation("audit.log"), P.hasPermission(read)));
      const b = yield* evaluate(P.obliged(obligation("notify.owner"), P.hasPermission(read)));

      const obligations = diffTraces(a.trace, b.trace).find(
        (d) => d._tag === "ObligationsChanged",
      );
      assert.isDefined(obligations);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("flippedAt skips differences that are not verdict changes", () =>
    Effect.gen(function* () {
      // An `anyOf` whose FIRST child flips while the parent's verdict holds,
      // because the second child was already allowing. So the outermost
      // difference is not a VerdictChanged, and `flippedAt` has to look past it
      // rather than return the first difference of any kind.
      const policy = P.anyOf([
        P.hasAttribute("clearance", M.gte(3)),
        P.hasPermission(read),
      ]);

      const childDenied = yield* evaluate(policy).pipe(Effect.provide(clearance(1)));
      const childAllowed = yield* evaluate(policy).pipe(Effect.provide(clearance(5)));

      const all = diffTraces(childDenied.trace, childAllowed.trace);
      assert.isAbove(all.length, 0);
      // The parent allowed in both runs.
      assert.strictEqual(childDenied.trace.allowed, childAllowed.trace.allowed);

      const flip = flippedAt(childDenied.trace, childAllowed.trace);
      // Either the first child flipped and is reported, or the shape diverged
      // first — both are correct, and neither may be the root's verdict.
      if (flip !== undefined) assert.isAbove(flip.path.length, 0);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));
});

describe("diffTraces — stack safety, a trace of any nesting depth (ARCH-22 C2, INV-QD-090)", () => {
  const n = 100_000;
  const wrappers: ReadonlyArray<readonly [string, (inner: P.Policy) => P.Policy]> = [
    ["not", P.not],
    ["labeled", (inner) => P.labeled("l", inner)],
    ["allOf of one", (inner) => P.allOf([inner])],
    ["rules of one", (inner) => P.rules([P.permitWhen(inner)])],
  ];

  for (const [name, wrap] of wrappers) {
    it.effect(
      `diffs an evaluated 100k-deep ${name} chain against itself`,
      () =>
        Effect.gen(function* () {
          const policy = chain(wrap, n, P.hasRole("reader"));
          const holder = yield* evaluate(policy, { maxDepth: Infinity }).pipe(
            Effect.provide(testLayer(subjectWith({ roles: ["reader"] }))),
          );
          assert.deepStrictEqual(diffTraces(holder.trace, holder.trace), []);
          // Not a flipped pair: a verdict that differs at every level reports a
          // path per level, which is quadratic in depth by the public `TracePath`
          // type (ARCH-22 §9), so the single-difference case is the hand-built
          // pair below.
        }),
      60_000,
    );
  }

  it.effect(
    "diffs a 250k-wide allOf of leaves",
    () =>
      Effect.gen(function* () {
        const policy = P.allOf(Array.from({ length: 250_000 }, () => P.hasRole("reader")));
        const holder = yield* evaluate(policy).pipe(
          Effect.provide(testLayer(subjectWith({ roles: ["reader"] }))),
        );
        assert.strictEqual(holder.trace.children.length, 250_000);
        assert.deepStrictEqual(diffTraces(holder.trace, holder.trace), []);
      }),
    60_000,
  );

  it("reports a difference only near the root of a 100k-deep pair in constant stack", () => {
    const deep = (flip: boolean) => {
      let t: Trace = { policyTag: "HasRole", allowed: true, children: [], obligations: [] };
      for (let i = 0; i < n; i++)
        t = { policyTag: "Not", allowed: i === n - 1 ? flip : true, children: [t], obligations: [] };
      return t;
    };
    const diffs = diffTraces(deep(true), deep(false));
    assert.strictEqual(diffs.length, 1);
    assert.deepStrictEqual(diffs[0]?.path, []);
    assert.strictEqual(flippedAt(deep(true), deep(false))?.path.length, 0);
  }, 60_000);
});

describe("diffTraces — agrees with the recursive implementation it replaced (ARCH-22 T1)", () => {
  it("returns the same differences, in the same order, for any pair of shallow traces", () => {
    FastCheck.assert(
      FastCheck.property(tracePairArbitrary(6), ([before, after]) => {
        assert.deepStrictEqual(diffTraces(before, after), oracleDiffTraces(before, after));
      }),
      { seed: 2026100701, numRuns: 300 },
    );
  });
});

describe("tracePathKey (ARCH-22 D-22-c)", () => {
  it("addresses the root as `$` and a node by its indices", () => {
    assert.strictEqual(tracePathKey([]), "$");
    assert.strictEqual(tracePathKey([0]), "$.0");
    assert.strictEqual(tracePathKey([0, 2, 11]), "$.0.2.11");
  });

  it("is what extending a key one index at a time builds", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.array(FastCheck.nat(50), { maxLength: 12 }),
        FastCheck.nat(50),
        (path, index) => tracePathKey([...path, index]) === childKey(tracePathKey(path), index),
      ),
      { seed: 2026100703 },
    );
  });

  it("names the node a difference reports", () => {
    const leaf = (allowed: boolean): Trace => baseTrace({ allowed });
    const tree = (allowed: boolean): Trace =>
      baseTrace({ policyTag: "AllOf", children: [leaf(true), baseTrace({ policyTag: "Not", children: [leaf(allowed)] })] });
    const flip = flippedAt(tree(true), tree(false));
    assert.deepStrictEqual(flip?.path, [1, 0]);
    assert.strictEqual(tracePathKey(flip?.path ?? []), "$.1.0");
  });
});
