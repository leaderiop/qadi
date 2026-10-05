/**
 * FROZEN COPY FOR ARCH-12 — DELETE IN T8.
 *
 * The oracle the move of field-strategy merging into `FieldLattice.ts` is
 * checked against: `mergeFields` (`Evaluate.ts`) and `intersectFields`/
 * `unionFields` (`Decision.ts`) copied verbatim as they stood before the move,
 * and a differential that evaluates real `allOf`/`anyOf` trees and compares
 * their `visibleFields` with the frozen merge. It must stay green across
 * ARCH-12 T5–T7 and is deleted once `FieldLattice.test.ts` tests the lattice at
 * its interface (ARCH-02's oracle pattern).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as FastCheck from "fast-check";
import type { VisibleFields } from "../src/Decision.ts";
import { evaluate } from "../src/Evaluate.ts";
import type { Containment } from "../src/FieldPath.ts";
import { compareShapes, shapeOf } from "../src/FieldPath.ts";
import * as P from "../src/Policy.ts";
import { subjectWith, testLayer } from "./helpers.ts";

// --- frozen copies ----------------------------------------------------------

type ContainmentKeep = "A" | "B" | undefined;
const CONTAINMENT_KEEP: (self: Containment) => ContainmentKeep = Match.type<
  Containment
>().pipe(
  Match.whenOr("Equal", "BLessA", () => "B" as const),
  Match.when("ALessB", () => "A" as const),
  Match.when("Incomparable", () => undefined),
  Match.exhaustive,
);

const oracleIntersect = (a: VisibleFields, b: VisibleFields): VisibleFields => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const shapedA = a.map((spec) => ({ spec, shape: shapeOf(spec) }));
  const shapedB = b.map((spec) => ({ spec, shape: shapeOf(spec) }));
  const kept: Array<string> = [];
  for (const specA of shapedA) {
    for (const specB of shapedB) {
      const keep = CONTAINMENT_KEEP(compareShapes(specA.shape, specB.shape));
      if (keep === "B") kept.push(specB.spec);
      else if (keep === "A") kept.push(specA.spec);
    }
  }
  return [...new Set(kept)].sort();
};

const oracleMerge = (strategy: P.FieldStrategy, sets: ReadonlyArray<VisibleFields>): VisibleFields =>
  Match.value(strategy).pipe(
    Match.when("Intersection", () =>
      sets.reduce<VisibleFields>((acc, cur) => oracleIntersect(acc, cur), undefined),
    ),
    Match.when("Union", (): VisibleFields => {
      if (sets.length === 0) return undefined;
      const merged = new Set<string>();
      for (const set of sets) {
        if (set === undefined) return undefined;
        for (const field of set) merged.add(field);
      }
      return [...merged].sort();
    }),
    Match.when("First", () => (sets.length === 0 ? undefined : sets[0])),
    Match.orElse((): VisibleFields => []),
  );

// --- the differential -------------------------------------------------------

const segment = FastCheck.constantFrom("a", "b", "c");
const literalPath = FastCheck.array(segment, { minLength: 1, maxLength: 3 }).map((s) =>
  s.join("."),
);
const wildcardPath = FastCheck.tuple(
  FastCheck.array(segment, { minLength: 0, maxLength: 2 }),
  FastCheck.constantFrom("*", "**"),
).map(([prefix, terminal]) => [...prefix, terminal].join("."));
const malformedPath = FastCheck.constantFrom("a.", ".b", "a.*.b", "**.a");
const fieldSpec = FastCheck.oneof(literalPath, wildcardPath, malformedPath);
const visibleFields: FastCheck.Arbitrary<VisibleFields> = FastCheck.oneof(
  FastCheck.constant(undefined),
  FastCheck.array(fieldSpec, { minLength: 0, maxLength: 4 }),
);
const sets = FastCheck.array(visibleFields, { minLength: 1, maxLength: 5 });

const leafWith = (fields: VisibleFields): P.Policy =>
  fields === undefined ? P.hasRole("r") : P.hasRole("r", { fields });

const layer = testLayer(subjectWith({ id: "u-1", roles: ["r"] }));

const fieldsOf = (policy: P.Policy) =>
  Effect.map(evaluate(policy), (d) => (d._tag === "Allow" ? d.visibleFields : "denied"));

describe("ARCH-12 oracle: the evaluator merges as the frozen mergeFields did", () => {
  it.effect("allOf, every strategy", () =>
    Effect.gen(function* () {
      for (const strategy of ["Intersection", "Union", "First"] as const) {
        for (const s of FastCheck.sample(sets, { numRuns: 300, seed: 1212 })) {
          const got = yield* fieldsOf(P.allOf(s.map(leafWith), { fieldStrategy: strategy }));
          assert.deepStrictEqual(got, oracleMerge(strategy, s), `${strategy} ${JSON.stringify(s)}`);
        }
      }
    }).pipe(Effect.provide(layer)));

  it.effect("anyOf, every strategy (First stops at its first allow)", () =>
    Effect.gen(function* () {
      for (const strategy of ["Intersection", "Union", "First"] as const) {
        for (const s of FastCheck.sample(sets, { numRuns: 300, seed: 1213 })) {
          const got = yield* fieldsOf(P.anyOf(s.map(leafWith), { fieldStrategy: strategy }));
          const want = strategy === "First" ? s[0] : oracleMerge(strategy, s);
          assert.deepStrictEqual(got, want, `${strategy} ${JSON.stringify(s)}`);
        }
      }
    }).pipe(Effect.provide(layer)));

  it.effect("a strategy outside the union grants no fields", () =>
    Effect.gen(function* () {
      for (const raw of ["Xor", "toString", "__proto__"]) {
        const bogus: P.FieldStrategy = JSON.parse(JSON.stringify(raw));
        for (const s of FastCheck.sample(sets, { numRuns: 50, seed: 1214 })) {
          assert.deepStrictEqual(yield* fieldsOf(P.allOf(s.map(leafWith), { fieldStrategy: bogus })), oracleMerge(bogus, s));
          assert.deepStrictEqual(yield* fieldsOf(P.anyOf(s.map(leafWith), { fieldStrategy: bogus })), oracleMerge(bogus, s));
        }
      }
    }).pipe(Effect.provide(layer)));
});
