import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { diffTraces, flippedAt } from "../src/TraceDiff.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");

/** Resolves `clearance` to whatever is given, so one input can be varied. */
const clearance = (value: unknown) =>
  Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(value) });

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
      assert.deepStrictEqual(
        obligations?._tag === "ObligationsChanged" ? obligations.after : undefined,
        ["audit.log"],
      );
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

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
