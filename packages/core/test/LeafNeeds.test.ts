/**
 * The table of what a leaf needs from the request (ARCH-97, ADR-QD-163; INV-QD-345,
 * INV-QD-346).
 *
 * The oracle and the fixtures are the characterisation's (`LeafFixtures.ts`),
 * written by hand from the D-05 rule and reading no table: a table that disagreed
 * with the rule would fail here rather than agree with itself.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Core from "../src/index.ts";
import { MissingAction, MissingResource, MissingResourceId } from "../src/Errors.ts";
import { holds } from "../src/Compare.ts";
import { evaluate } from "../src/Evaluate.ts";
import { makeSubjectId } from "../src/Identity.ts";
import {
  LEAF_NEEDS,
  LEAF_VERDICTS,
  absenceOf,
  errorOf,
  holdsAction,
  holdsPermission,
  holdsRole,
  isHeld,
} from "../src/LeafNeeds.ts";
import type { LeafOutcome } from "../src/LeafNeeds.ts";
import * as M from "../src/Matcher.ts";
import type { MatcherContext, Verdict } from "../src/Matcher.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import {
  FIXTURES,
  SHAPES,
  evaluateLabel,
  labelOf,
  leafLayer,
  leafSubject,
  oracle,
  predicateLabel,
} from "./LeafFixtures.ts";
import { subjectWith } from "./helpers.ts";

const ALL = Object.values(FIXTURES).flat();

describe("LEAF_NEEDS", () => {
  it("has one row per leaf tag (a missing row is TS2741, an extra one TS2353)", () => {
    assert.deepStrictEqual(
      Object.keys(LEAF_NEEDS).sort(),
      Object.keys(P.leafCases(() => 0)).sort(),
    );
    assert.strictEqual(Object.keys(LEAF_NEEDS).length, 10);
  });

  it("keeps rows equal in content as separate keyed rows", () => {
    assert.deepStrictEqual(LEAF_NEEDS.HasActed, LEAF_NEEDS.HasNotActed);
    assert.deepStrictEqual(LEAF_NEEDS.HasRole, LEAF_NEEDS.HasPermission);
    assert.deepStrictEqual(LEAF_NEEDS.HasRole, LEAF_NEEDS.HasCustom);
  });
});

describe("absenceOf", () => {
  it("says what the oracle says for every leaf, action and resource", () => {
    let cells = 0;
    for (const f of ALL) {
      for (const action of [false, true]) {
        for (const resource of [false, true]) {
          const absent = absenceOf(f.policy, { action, resource });
          const want = oracle({ ...f, scoped: false }, action, resource ? "id" : "none");
          if (absent === undefined) {
            assert.strictEqual(want, f.settled, `${f.label} action=${action} resource=${resource}`);
          } else {
            assert.strictEqual(
              labelOf(errorOf(absent)),
              want,
              `${f.label} action=${action} resource=${resource}`,
            );
          }
          cells++;
        }
      }
    }
    assert.strictEqual(cells, 4 * ALL.length);
  });

  it("gives no absence for a leaf that needs nothing, and none when both inputs are supplied", () => {
    for (const f of ALL) {
      assert.isUndefined(absenceOf(f.policy, { action: true, resource: true }), f.label);
      if (f.own === "Nothing" && f.refs === "none") {
        for (const action of [false, true]) {
          for (const resource of [false, true]) {
            assert.isUndefined(absenceOf(f.policy, { action, resource }), f.label);
          }
        }
      }
    }
  });

  it("never reports a Resource absence when the resource is supplied (toPredicate's view)", () => {
    for (const f of ALL) {
      const absent = absenceOf(f.policy, { action: false, resource: true });
      assert.isTrue(absent === undefined || absent._tag === "Action", f.label);
    }
  });

  it("reports the leaf's own input before what its matcher references", () => {
    const f = FIXTURES.HasResourceAttribute.find((x) => x.refs === "action");
    if (f === undefined) return assert.fail("no HasResourceAttribute fixture that references the action");
    assert.deepStrictEqual(absenceOf(f.policy, { action: false, resource: false }), {
      _tag: "Resource",
      attribute: "owner",
    });
  });

  it("never asks about the resource id", () => {
    for (const f of ALL) {
      for (const action of [false, true]) {
        for (const resource of [false, true]) {
          const absent = absenceOf(f.policy, { action, resource });
          assert.notStrictEqual(absent?._tag, "ResourceId", f.label);
        }
      }
    }
  });
});

describe("a row's resourceId is what readScoped does (D-06)", () => {
  it.effect("Never / Always / ByScope", () =>
    Effect.gen(function* () {
      for (const f of ALL) {
        const need = LEAF_NEEDS[f.policy._tag].resourceId;
        if (need === "Never") assert.isFalse(f.scoped, f.label);
        if (need === "Always") assert.isTrue(f.scoped, f.label);
        const claimed = need === "Always" || (need === "ByScope" && f.scoped);
        for (const { shape, resource } of SHAPES) {
          // The resource id is the last thing asked: only a request that no
          // earlier absence refuses reaches it.
          if (absenceOf(f.policy, { action: true, resource: resource !== undefined }) !== undefined) {
            continue;
          }
          const exit = yield* Effect.exit(
            evaluate(f.policy, {
              action: "read",
              ...(resource === undefined ? {} : { resource }),
            }),
          ).pipe(Effect.provide(leafLayer));
          const refused =
            Exit.isFailure(exit) && Cause.squash(exit.cause) instanceof MissingResourceId;
          assert.strictEqual(refused, claimed && shape !== "id", `${f.label} ${shape}`);
        }
      }
    }),
  );
});

describe("errorOf", () => {
  it("turns an absence into its error", () => {
    const bare = errorOf({ _tag: "Action" });
    assert.instanceOf(bare, MissingAction);
    assert.isFalse(Object.hasOwn(bare, "expected"));
    assert.strictEqual(errorOf({ _tag: "Action", expected: "read" }).expected, "read");
    const resource = errorOf({ _tag: "Resource", attribute: "owner" });
    assert.instanceOf(resource, MissingResource);
    assert.strictEqual(resource.attribute, "owner");
  });
});

describe("the port-free judgements", () => {
  it("holdsRole", () => {
    const held = P.hasRole("editor");
    const lacking = P.hasRole("admin");
    if (held._tag !== "HasRole" || lacking._tag !== "HasRole") return assert.fail("not HasRole");
    assert.isTrue(holdsRole(leafSubject, held));
    assert.isFalse(holdsRole(leafSubject, lacking));
  });

  it("holdsPermission", () => {
    const held = P.hasPermission(permission("doc", "read"));
    const lacking = P.hasPermission(permission("doc", "write"));
    if (held._tag !== "HasPermission" || lacking._tag !== "HasPermission") {
      return assert.fail("not HasPermission");
    }
    assert.isTrue(holdsPermission(leafSubject, held));
    assert.isFalse(holdsPermission(leafSubject, lacking));
  });

  it("holdsAction", () => {
    const leaf = P.hasAction("read");
    if (leaf._tag !== "HasAction") return assert.fail("not HasAction");
    assert.isTrue(holdsAction(leaf, "read"));
    assert.isFalse(holdsAction(leaf, "write"));
    assert.isFalse(holdsAction(leaf, undefined));
  });
});

describe("evaluate and toPredicate agree where both apply (D-11)", () => {
  const TRUE = 'PRED {"_tag":"True"}';
  const FALSE = 'PRED {"_tag":"False"}';

  it.effect("a HasAction deny keeps its reason, and compiles to False", () =>
    Effect.gen(function* () {
      const write = P.hasAction("write");
      assert.strictEqual(
        yield* evaluateLabel(write, true, "id"),
        "Deny: action is 'read', not 'write'",
      );
      assert.strictEqual(yield* predicateLabel(write, true), FALSE);
      assert.strictEqual(yield* evaluateLabel(write, false, "id"), "Action:write");
      assert.strictEqual(yield* predicateLabel(write, false), "Action:write");
    }),
  );

  it.effect("an allow is a True constant and a deny a False one, and an absence is the same", () =>
    Effect.gen(function* () {
      let constants = 0;
      for (const policy of [...ALL.map((f) => f.policy), P.hasAction("write")]) {
        for (const action of [false, true]) {
          const walked = yield* evaluateLabel(policy, action, "id");
          const compiled = yield* predicateLabel(policy, action);
          const where = `${policy._tag} action=${action ? "read" : "-"}: ${walked} / ${compiled}`;
          if (walked.startsWith("Action:") || compiled.startsWith("Action:")) {
            assert.strictEqual(compiled, walked, where);
          }
          if (compiled === TRUE || compiled === FALSE) {
            assert.strictEqual(walked === "Allow", compiled === TRUE, where);
            assert.isTrue(walked === "Allow" || walked.startsWith("Deny: "), where);
            constants++;
          }
        }
      }
      // The cells that compile to a constant, counted so that a fixture change
      // which drops them from the comparison is seen.
      assert.strictEqual(constants, 18);
    }),
  );
});

describe("LEAF_VERDICTS", () => {
  const context: MatcherContext = {
    subject: {},
    subjectId: makeSubjectId("u-1"),
    resource: { state: "open" },
    action: "read",
  };
  // One matcher and value per verdict, in the order the comparison reports them.
  const VERDICT_CELLS: ReadonlyArray<readonly [Verdict, M.Matcher, unknown]> = [
    ["Held", M.eq(M.literal("a")), "a"],
    ["NotHeld", M.eq(M.literal("a")), "b"],
    ["ValueAbsent", M.eq(M.literal("a")), undefined],
    ["ReferenceAbsent", M.eq(M.subject("missing")), "a"],
    ["Incomparable", M.gte(3), "5"],
  ];

  it("has one row per leaf tag (a missing row is TS2741, an extra one TS2353)", () => {
    assert.deepStrictEqual(Object.keys(LEAF_VERDICTS).sort(), Object.keys(LEAF_NEEDS).sort());
    assert.strictEqual(Object.keys(LEAF_VERDICTS).length, 10);
  });

  it("gives the two acted rows opposite polarities, and Unknown is never Held (ADR-QD-020)", () => {
    // All six cells, so a reordered check that moved any outcome is seen.
    assert.strictEqual(LEAF_VERDICTS.HasActed("Acted"), "Held");
    assert.strictEqual(LEAF_VERDICTS.HasActed("NotActed"), "NotPerformed");
    assert.strictEqual(LEAF_VERDICTS.HasActed("Unknown"), "Unknown");
    assert.strictEqual(LEAF_VERDICTS.HasNotActed("NotActed"), "Held");
    assert.strictEqual(LEAF_VERDICTS.HasNotActed("Acted"), "Performed");
    assert.strictEqual(LEAF_VERDICTS.HasNotActed("Unknown"), "Unknown");
  });

  it("answers a relationship, a custom predicate and a signature", () => {
    assert.strictEqual(LEAF_VERDICTS.HasRelationship("Related"), "Held");
    assert.strictEqual(LEAF_VERDICTS.HasRelationship("Unrelated"), "Unrelated");
    assert.strictEqual(LEAF_VERDICTS.HasRelationship("Unknown"), "Unknown");
    assert.strictEqual(LEAF_VERDICTS.HasCustom(true), "Held");
    assert.strictEqual(LEAF_VERDICTS.HasCustom(false), "NotHeld");
    assert.strictEqual(LEAF_VERDICTS.HasSignature({ matched: true, onFile: 1 }), "Held");
    assert.strictEqual(LEAF_VERDICTS.HasSignature({ matched: true, onFile: 0 }), "Held");
    assert.strictEqual(LEAF_VERDICTS.HasSignature({ matched: false, onFile: 0 }), "NoneOnFile");
    assert.strictEqual(LEAF_VERDICTS.HasSignature({ matched: false, onFile: 2 }), "NoneMatching");
  });

  it("answers a role, a permission and an action from the subject and the request", () => {
    const subject = subjectWith({ roles: ["editor"], permissions: ["doc:read"] });
    const role = P.hasRole("editor");
    const noRole = P.hasRole("admin");
    const perm = P.hasPermission(permission("doc", "read"));
    const noPerm = P.hasPermission(permission("doc", "write"));
    const act = P.hasAction("read");
    if (
      role._tag !== "HasRole" ||
      noRole._tag !== "HasRole" ||
      perm._tag !== "HasPermission" ||
      noPerm._tag !== "HasPermission" ||
      act._tag !== "HasAction"
    ) {
      return assert.fail("not the leaves built");
    }
    assert.strictEqual(LEAF_VERDICTS.HasRole(role, subject), "Held");
    assert.strictEqual(LEAF_VERDICTS.HasRole(noRole, subject), "NotHeld");
    assert.strictEqual(LEAF_VERDICTS.HasPermission(perm, subject), "Held");
    assert.strictEqual(LEAF_VERDICTS.HasPermission(noPerm, subject), "NotHeld");
    assert.strictEqual(LEAF_VERDICTS.HasAction(act, "read"), "Held");
    assert.strictEqual(LEAF_VERDICTS.HasAction(act, "write"), "NotHeld");
    assert.strictEqual(LEAF_VERDICTS.HasAction(act, undefined), "NotHeld");
  });

  it("gives the two attribute rows the matcher's own verdict (D-04)", () => {
    for (const [want, matcher, value] of VERDICT_CELLS) {
      const own = P.hasAttribute("department", matcher);
      const res = P.hasResourceAttribute("state", matcher);
      if (own._tag !== "HasAttribute" || res._tag !== "HasResourceAttribute") {
        return assert.fail("not the leaves built");
      }
      assert.strictEqual(LEAF_VERDICTS.HasAttribute(own, value, context), want, `own ${want}`);
      assert.strictEqual(LEAF_VERDICTS.HasResourceAttribute(res, value, context), want, `resource ${want}`);
      assert.strictEqual(
        LEAF_VERDICTS.HasAttribute(own, value, context),
        M.judgeMatcher(matcher, value, context),
        `judged ${want}`,
      );
    }
  });

  it("isHeld is true for Held only, and agrees with holds over the five verdicts", () => {
    const every: ReadonlyArray<LeafOutcome> = [
      "Held",
      "NotHeld",
      "ValueAbsent",
      "ReferenceAbsent",
      "Incomparable",
      "Unrelated",
      "Unknown",
      "Performed",
      "NotPerformed",
      "NoneOnFile",
      "NoneMatching",
    ];
    for (const outcome of every) assert.strictEqual(isHeld(outcome), outcome === "Held", outcome);
    for (const [verdict] of VERDICT_CELLS) assert.strictEqual(isHeld(verdict), holds(verdict), verdict);
  });
});

describe("the barrel", () => {
  it("does not export the table, the check or the judgements (ADR-QD-099)", () => {
    for (const name of [
      "LEAF_NEEDS",
      "absenceOf",
      "errorOf",
      "holdsRole",
      "holdsPermission",
      "holdsAction",
      "LEAF_VERDICTS",
      "isHeld",
    ]) {
      assert.isFalse(Object.hasOwn(Core, name), name);
    }
  });
});
