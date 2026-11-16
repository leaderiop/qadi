/**
 * The table of what a leaf needs from the request (ARCH-97, ADR-QD-163; INV-QD-345,
 * INV-QD-346).
 *
 * Written before `LeafNeeds.ts` exists, so it is RED by import (D-14). The oracle
 * and the fixtures are the characterisation's (`LeafFixtures.ts`), written by hand
 * from the D-05 rule and reading no table: a table that disagreed with the rule
 * would fail here rather than agree with itself.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Core from "../src/index.ts";
import { MissingAction, MissingResource, MissingResourceId } from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import {
  LEAF_NEEDS,
  absenceOf,
  errorOf,
  holdsAction,
  holdsPermission,
  holdsRole,
} from "../src/LeafNeeds.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { FIXTURES, SHAPES, labelOf, leafLayer, leafSubject, oracle } from "./LeafFixtures.ts";

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
      if (LEAF_NEEDS[f.policy._tag].own === "Nothing" && f.refs === "none") {
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
    const id = errorOf({ _tag: "ResourceId", relation: "owner" });
    assert.instanceOf(id, MissingResourceId);
    assert.strictEqual(id.relation, "owner");
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

describe("the barrel", () => {
  it("does not export the table, the check or the judgements (ADR-QD-099)", () => {
    for (const name of [
      "LEAF_NEEDS",
      "absenceOf",
      "errorOf",
      "holdsRole",
      "holdsPermission",
      "holdsAction",
    ]) {
      assert.isFalse(Object.hasOwn(Core, name), name);
    }
  });
});
