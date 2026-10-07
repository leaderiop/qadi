import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "fast-check";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { AttributeResolveError } from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { PortReply } from "../src/PortDescription.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import * as P from "../src/Policy.ts";
import type { Combining, FieldStrategy } from "../src/Policy.ts";
import { toPredicate } from "../src/Predicate.ts";
import {
  anyOfStopsAtAllow,
  effectiveCombining,
  isCombining,
  rulesDecisiveEffect,
} from "../src/ShortCircuit.ts";
import { subjectWith, testLayer } from "./helpers.ts";

/** In-process values outside the union, built via `JSON.parse` (no `as`, AGENTS.md §6). */
const BOGUS_VALUES = ["Xor", "toString", "constructor", "__proto__", "hasOwnProperty"];

/**
 * The whole contract is a literal table — one row per strategy and per combining
 * algorithm — so each row is asserted, which is what kills a flipped literal.
 */
describe("anyOfStopsAtAllow (ADR-QD-013, INV-QD-005)", () => {
  it("only First stops at the first allowing child", () => {
    assert.isTrue(anyOfStopsAtAllow("First"));
    assert.isFalse(anyOfStopsAtAllow("Intersection"));
    assert.isFalse(anyOfStopsAtAllow("Union"));
  });

  it("a value outside the union never stops early — not even a prototype key", () => {
    for (const raw of BOGUS_VALUES) {
      const bogus: FieldStrategy = JSON.parse(JSON.stringify(raw));
      assert.strictEqual(anyOfStopsAtAllow(bogus), false, raw);
    }
  });
});

describe("rulesDecisiveEffect (INV-QD-017)", () => {
  it("the overrides stop at the effect nothing later can beat", () => {
    assert.strictEqual(rulesDecisiveEffect("DenyOverrides"), "Deny");
    assert.strictEqual(rulesDecisiveEffect("PermitOverrides"), "Permit");
  });

  it("FirstApplicable has no overriding effect", () => {
    assert.isUndefined(rulesDecisiveEffect("FirstApplicable"));
  });

  it("a value outside the union decides as DenyOverrides — prototype keys included (C9)", () => {
    for (const raw of BOGUS_VALUES) {
      const bogus: Combining = JSON.parse(JSON.stringify(raw));
      assert.strictEqual(effectiveCombining(bogus), "DenyOverrides", raw);
      assert.strictEqual(rulesDecisiveEffect(bogus), "Deny", raw);
    }
  });

  it("isCombining admits exactly the three algorithms — not a prototype key, not a non-string", () => {
    // The membership test `effectiveCombining` and `Explanation.ts` share
    // (ADR-QD-092 amendment, CCR-QD-183).
    for (const combining of ["DenyOverrides", "PermitOverrides", "FirstApplicable"]) {
      assert.isTrue(isCombining(combining), combining);
    }
    for (const raw of [...BOGUS_VALUES, ""]) assert.isFalse(isCombining(raw), raw);
    for (const other of [42, true, null, undefined, {}, Symbol("DenyOverrides")]) {
      assert.isFalse(isCombining(other), String(other));
    }
    // `Object.hasOwn` coerces its key, so only the string check keeps this out.
    assert.isFalse(isCombining({ toString: () => "DenyOverrides" }));
  });

  it("a known value is its own effective algorithm", () => {
    for (const combining of ["DenyOverrides", "PermitOverrides", "FirstApplicable"] as const) {
      assert.strictEqual(effectiveCombining(combining), combining);
    }
  });
});

// ---------------------------------------------------------------------------
// The agreement itself (INV-QD-005, INV-QD-017, INV-QD-058, BEH-QD-265)
// ---------------------------------------------------------------------------

/** What a leaf does when the walk reaches it. */
type Outcome = "Holds" | "NotHeld" | "Fails";

/**
 * A leaf as the test builds it: a role (portless, a constant to both
 * interpreters) or an attribute the resolver answers. Only a port leaf can fail.
 */
interface Leaf {
  readonly via: "role" | "port";
  readonly outcome: Outcome;
}

/** One rule row's effect, beside its leaf. */
type Effect_ = "Permit" | "Deny";

type Shape =
  | { readonly kind: "allOf" }
  | { readonly kind: "anyOf"; readonly strategy: FieldStrategy }
  | { readonly kind: "rules"; readonly combining: Combining };

/** Where the walk ends, by index into the children. */
type Ending =
  | { readonly _tag: "Stopped"; readonly index: number }
  | { readonly _tag: "Failed"; readonly index: number }
  | { readonly _tag: "Exhausted" };

/**
 * The oracle, written from ADR-QD-013 and INV-QD-017's table and deliberately
 * not from `ShortCircuit.ts`: a failing leaf ends the walk, a stop ends it, and
 * everything else continues.
 *
 * - allOf stops on a leaf that does not hold;
 * - anyOf stops on a holding leaf under First and never under Union or
 *   Intersection;
 * - FirstApplicable stops on any holding rule, DenyOverrides on a holding Deny
 *   row and PermitOverrides on a holding Permit row.
 */
const expectedEnding = (
  shape: Shape,
  leaves: ReadonlyArray<Leaf>,
  effects: ReadonlyArray<Effect_>,
): Ending => {
  for (let index = 0; index < leaves.length; index++) {
    const leaf = leaves[index];
    if (leaf === undefined) continue;
    if (leaf.outcome === "Fails") return { _tag: "Failed", index };
    const holds = leaf.outcome === "Holds";
    const effect = effects[index];
    const stops =
      shape.kind === "allOf"
        ? !holds
        : shape.kind === "anyOf"
          ? holds && shape.strategy === "First"
          : holds &&
            (shape.combining === "FirstApplicable" ||
              (shape.combining === "DenyOverrides" && effect === "Deny") ||
              (shape.combining === "PermitOverrides" && effect === "Permit"));
    if (stops) return { _tag: "Stopped", index };
  }
  return { _tag: "Exhausted" };
};

const editor = subjectWith({ id: "u1", roles: ["editor"] });

const leafPolicy = (leaf: Leaf, index: number): P.Policy =>
  leaf.via === "role"
    ? P.hasRole(leaf.outcome === "Holds" ? "editor" : "admin")
    : P.hasAttribute(`a${index}`, M.eq(M.literal(true)));

const policyFor = (
  shape: Shape,
  leaves: ReadonlyArray<Leaf>,
  effects: ReadonlyArray<Effect_>,
): P.Policy => {
  const children = leaves.map(leafPolicy);
  if (shape.kind === "allOf") return P.allOf(children);
  if (shape.kind === "anyOf") return P.anyOf(children, { fieldStrategy: shape.strategy });
  return P.rules(
    children.map((condition, i) =>
      effects[i] === "Deny" ? P.denyWhen(condition) : P.permitWhen(condition),
    ),
    { combining: shape.combining },
  );
};

/**
 * Runs one case through both interpreters and asserts each ended where the
 * oracle says: the port log is the oracle's prefix of port leaves, the
 * evaluator's trace holds one child per child walked, and a failing leaf is the
 * typed error for that attribute.
 */
const assertAgreement = (
  shape: Shape,
  leaves: ReadonlyArray<Leaf>,
  effects: ReadonlyArray<Effect_>,
): void => {
  const label = JSON.stringify({ shape, leaves, effects });
  const ending = expectedEnding(shape, leaves, effects);
  const reach = ending._tag === "Exhausted" ? leaves.length : ending.index + 1;
  const askedFor = leaves.flatMap((leaf, i) => (leaf.via === "port" && i < reach ? [`a${i}`] : []));
  const policy = policyFor(shape, leaves, effects);

  const script = (_subjectId: string, attribute: string) => {
    const leaf = leaves[Number(attribute.slice(1))];
    if (leaf === undefined) return undefined;
    return leaf.outcome === "Fails" ? PortReply.fail("down") : PortReply.answer(leaf.outcome === "Holds");
  };

  const failedAttribute = (failure: unknown): string | undefined =>
    failure instanceof AttributeResolveError ? failure.attribute : undefined;

  const viaEvaluator = scriptedPort(attributeResolverPort, script);
  const evaluated = Effect.runSync(
    Effect.result(
      evaluate(policy).pipe(
        Effect.provide(testLayer(editor, { AttributeResolver: viaEvaluator.layer })),
      ),
    ),
  );
  assert.deepStrictEqual(
    viaEvaluator.calls.map((args) => args[1]),
    askedFor,
    `evaluator asked: ${label}`,
  );
  if (ending._tag === "Failed") {
    assert.strictEqual(evaluated._tag, "Failure", label);
    if (evaluated._tag === "Failure") {
      assert.strictEqual(failedAttribute(evaluated.failure), `a${ending.index}`, label);
    }
  } else {
    assert.strictEqual(evaluated._tag, "Success", label);
    if (evaluated._tag === "Success") {
      assert.strictEqual(evaluated.success.trace.children.length, reach, `trace: ${label}`);
    }
  }

  const viaTranslator = scriptedPort(attributeResolverPort, script);
  const translated = Effect.runSync(
    Effect.result(
      toPredicate(policy).pipe(
        Effect.provide(testLayer(editor, { AttributeResolver: viaTranslator.layer })),
      ),
    ),
  );
  assert.deepStrictEqual(
    viaTranslator.calls.map((args) => args[1]),
    askedFor,
    `translator asked: ${label}`,
  );
  if (ending._tag === "Failed") {
    assert.strictEqual(translated._tag, "Failure", label);
    if (translated._tag === "Failure") {
      assert.strictEqual(failedAttribute(translated.failure), `a${ending.index}`, label);
    }
  } else {
    assert.strictEqual(translated._tag, "Success", label);
  }
};

const LEAF_KINDS: ReadonlyArray<Leaf> = [
  { via: "role", outcome: "Holds" },
  { via: "role", outcome: "NotHeld" },
  { via: "port", outcome: "Holds" },
  { via: "port", outcome: "NotHeld" },
  { via: "port", outcome: "Fails" },
];

const SHAPES: ReadonlyArray<Shape> = [
  { kind: "allOf" },
  { kind: "anyOf", strategy: "First" },
  { kind: "anyOf", strategy: "Union" },
  { kind: "anyOf", strategy: "Intersection" },
  { kind: "rules", combining: "FirstApplicable" },
  { kind: "rules", combining: "DenyOverrides" },
  { kind: "rules", combining: "PermitOverrides" },
];

const EFFECTS: ReadonlyArray<Effect_> = ["Permit", "Deny"];

/** Every list of exactly `n` items drawn from `alphabet`. */
const sequences = <A>(alphabet: ReadonlyArray<A>, n: number): ReadonlyArray<ReadonlyArray<A>> =>
  n === 0
    ? [[]]
    : sequences(alphabet, n - 1).flatMap((rest) => alphabet.map((a) => [...rest, a]));

describe("both interpreters stop where the stop rule says (INV-QD-005, INV-QD-017, INV-QD-058, BEH-QD-265)", () => {
  // Translation asks no port a constant has already decided, and the evaluator
  // does not walk past a stop either: a stop is visible as the port log, the
  // trace's child count and which leaf's failure surfaces, all at once.
  it("every composite of up to three children, enumerated", () => {
    let cases = 0;
    for (const shape of SHAPES) {
      for (let n = 0; n <= 3; n++) {
        for (const leaves of sequences(LEAF_KINDS, n)) {
          // Effects only mean something to a rule table.
          const effectLists = shape.kind === "rules" ? sequences(EFFECTS, n) : [[]];
          for (const effects of effectLists) {
            assertAgreement(shape, leaves, effects);
            cases++;
          }
        }
      }
    }
    // 156 allOf + 3 x 156 anyOf + 3 x 1111 rules.
    assert.strictEqual(cases, 156 + 468 + 3333);
  }, 60_000);

  it("PROPERTY: up to eight children, generated", () => {
    const leafArb = FastCheck.constantFrom(...LEAF_KINDS);
    const shapeArb = FastCheck.constantFrom(...SHAPES);
    FastCheck.assert(
      FastCheck.property(
        shapeArb,
        FastCheck.array(FastCheck.tuple(leafArb, FastCheck.constantFrom(...EFFECTS)), {
          maxLength: 8,
        }),
        (shape, rows) => {
          assertAgreement(
            shape,
            rows.map(([leaf]) => leaf),
            rows.map(([, effect]) => effect),
          );
        },
      ),
      { numRuns: 300, seed: 2049 },
    );
  }, 60_000);
});
