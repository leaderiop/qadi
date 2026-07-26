import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import { isAllowed } from "../src/Decision.ts";
import type { Trace } from "../src/Decision.ts";
import { AttributeResolveError } from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import * as P from "../src/Policy.ts";
import { subjectWith, testLayer } from "./helpers.ts";

/** Applies to everyone; the row an author reaches for as a catch-all. */
const always = P.allOf([]);
/** Applies to nobody. */
const never = P.hasRole("no-such-role");

const editor = subjectWith({ id: "u1", roles: ["editor"] });

const run = (policy: P.Policy, subject = editor) =>
  evaluate(policy).pipe(Effect.provide(testLayer(subject)));

describe("rule tables", () => {
  it.effect("an explicit deny row refuses where the permits would have allowed", () =>
    Effect.gen(function* () {
      // The whole point of E3: a row saying "and if this matches, refuse",
      // visible as its own row rather than hoisted into a negated guard clause.
      const table = P.rules([P.denyWhen(P.hasRole("editor")), P.permitWhen(always)]);
      assert.isFalse(isAllowed(yield* run(table)));
    }));

  it.effect("no rule applying is a denial", () =>
    Effect.gen(function* () {
      const d = yield* run(P.rules([P.permitWhen(never), P.denyWhen(never)]));
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.reason, "no rule applied");
    }));

  it.effect("an empty table is a denial, not a vacuous allow", () =>
    Effect.gen(function* () {
      // `allOf([])` allows vacuously; a rule list must not, or a table emptied
      // by an administrator would grant everything.
      assert.isTrue(isAllowed(yield* run(P.allOf([]))));
      assert.isFalse(isAllowed(yield* run(P.rules([]))));
    }));

  it.effect("a final always-applying permit is the default-permit row", () =>
    Effect.gen(function* () {
      const table = P.rules([P.denyWhen(P.hasRole("suspended")), P.permitWhen(always)]);
      assert.isTrue(isAllowed(yield* run(table)));
    }));

  it.effect("defaults to FirstApplicable", () =>
    Effect.gen(function* () {
      const rs = [P.permitWhen(always), P.denyWhen(always)];
      const d = yield* run(P.rules(rs));
      const explicit = yield* run(P.rules(rs, { combining: "FirstApplicable" }));
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.reason, explicit.trace.reason);
    }));
});

describe("the deciding rule", () => {
  // One table, three answers. Row 0 permits, row 1 denies, and both apply.
  const contested = [P.permitWhen(always), P.denyWhen(always)] as const;

  it.effect("FirstApplicable: the first rule that applies", () =>
    Effect.gen(function* () {
      const d = yield* run(P.rules([...contested], { combining: "FirstApplicable" }));
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.reason, "rules[0] permitted");
    }));

  it.effect("DenyOverrides: the first applying Deny, wherever it sits", () =>
    Effect.gen(function* () {
      const d = yield* run(P.rules([...contested], { combining: "DenyOverrides" }));
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.reason, "rules[1] denied");
    }));

  it.effect("PermitOverrides: the first applying Permit, wherever it sits", () =>
    Effect.gen(function* () {
      const d = yield* run(
        P.rules([P.denyWhen(always), P.permitWhen(always)], {
          combining: "PermitOverrides",
        }),
      );
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.reason, "rules[1] permitted");
    }));

  it.effect("DenyOverrides falls back to the first applying Permit", () =>
    Effect.gen(function* () {
      // No Deny applies, so the answer is knowable only by asking every row —
      // and the row that decides is the first Permit, not the last.
      const d = yield* run(
        P.rules([P.denyWhen(never), P.permitWhen(always), P.permitWhen(always)], {
          combining: "DenyOverrides",
        }),
      );
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.reason, "rules[1] permitted");
    }));

  it.effect("PermitOverrides falls back to the first applying Deny", () =>
    Effect.gen(function* () {
      const d = yield* run(
        P.rules([P.permitWhen(never), P.denyWhen(always), P.denyWhen(always)], {
          combining: "PermitOverrides",
        }),
      );
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.reason, "rules[1] denied");
    }));
});

describe("order is meaning", () => {
  it.effect("a reordered table decides differently", () =>
    Effect.gen(function* () {
      // The property no existing test could have caught: `allOf` and `anyOf`
      // are order-observable but never order-dependent — their verdict is the
      // same whatever order the children are written in. This is the first
      // construct in Qadi where moving a row changes the answer.
      const permitFirst = [P.permitWhen(P.hasRole("editor")), P.denyWhen(always)];
      const denyFirst = [P.denyWhen(always), P.permitWhen(P.hasRole("editor"))];

      assert.isTrue(isAllowed(yield* run(P.rules(permitFirst))));
      assert.isFalse(isAllowed(yield* run(P.rules(denyFirst))));
    }));

  it.effect("the overrides are order-independent in the verdict", () =>
    Effect.gen(function* () {
      // ...and that is exactly why they cannot short-circuit both ways.
      const rs = [P.permitWhen(always), P.denyWhen(P.hasRole("editor"))];
      const forward = yield* run(P.rules(rs, { combining: "DenyOverrides" }));
      const reversed = yield* run(P.rules([...rs].reverse(), { combining: "DenyOverrides" }));
      assert.isFalse(isAllowed(forward));
      assert.isFalse(isAllowed(reversed));
    }));
});

describe("INV-QD-017: a rule list stops at the first rule that cannot be overridden", () => {
  const countingResolver = (counter: { calls: number }) =>
    Layer.succeed(AttributeResolver, {
      resolve: (_id: string, _attribute: string) =>
        Effect.sync(() => {
          counter.calls += 1;
          return 10;
        }),
    });

  /** Costs a resolver call and applies. */
  const costly = (name: string) => P.hasAttribute(name, M.gte(1));
  /** Costs a resolver call and does not apply — the row a walk must pay for
   *  without gaining anything, which is what the exhaustive algorithms do. */
  const probe = (name: string) => P.hasAttribute(name, M.gte(100));

  const count = (policy: P.Policy) =>
    Effect.gen(function* () {
      const counter = { calls: 0 };
      const d = yield* evaluate(policy).pipe(
        Effect.provide(testLayer(editor, { attributes: countingResolver(counter) })),
      );
      return { allowed: isAllowed(d), calls: counter.calls, trace: d.trace };
    });

  it.effect("FirstApplicable stops at the first applying rule", () =>
    Effect.gen(function* () {
      const r = yield* count(
        P.rules([P.permitWhen(always), P.permitWhen(costly("a")), P.denyWhen(costly("b"))]),
      );
      assert.isTrue(r.allowed);
      assert.strictEqual(r.calls, 0);
      assert.strictEqual(r.trace.children.length, 1);
    }));

  it.effect("DenyOverrides stops at the first applying Deny", () =>
    Effect.gen(function* () {
      const r = yield* count(
        P.rules([P.denyWhen(always), P.permitWhen(costly("a"))], {
          combining: "DenyOverrides",
        }),
      );
      assert.isFalse(r.allowed);
      assert.strictEqual(r.calls, 0);
      assert.strictEqual(r.trace.children.length, 1);
    }));

  it.effect("DenyOverrides must ask every rule to permit", () =>
    Effect.gen(function* () {
      // The cost profile inverts here: everywhere else in the library allowing
      // is the cheap outcome, and under this algorithm it is the expensive one,
      // because nothing-denied is knowable only by asking everything.
      const r = yield* count(
        P.rules([P.permitWhen(always), P.denyWhen(probe("a")), P.denyWhen(probe("b"))], {
          combining: "DenyOverrides",
        }),
      );
      assert.isTrue(r.allowed);
      assert.strictEqual(r.calls, 2);
      assert.strictEqual(r.trace.children.length, 3);
    }));

  it.effect("PermitOverrides stops at the first applying Permit", () =>
    Effect.gen(function* () {
      const r = yield* count(
        P.rules([P.permitWhen(always), P.denyWhen(costly("a"))], {
          combining: "PermitOverrides",
        }),
      );
      assert.isTrue(r.allowed);
      assert.strictEqual(r.calls, 0);
      assert.strictEqual(r.trace.children.length, 1);
    }));

  it.effect("PermitOverrides must ask every rule to deny", () =>
    Effect.gen(function* () {
      const r = yield* count(
        P.rules([P.denyWhen(always), P.permitWhen(probe("a")), P.permitWhen(probe("b"))], {
          combining: "PermitOverrides",
        }),
      );
      assert.isFalse(r.allowed);
      assert.strictEqual(r.calls, 2);
      assert.strictEqual(r.trace.children.length, 3);
    }));

  it.effect("a rule whose condition does not apply costs only that condition", () =>
    Effect.gen(function* () {
      // INV-QD-005 still holds inside a condition: the unreached branch of the
      // deciding row performs no lookup either.
      const r = yield* count(
        P.rules([P.permitWhen(P.anyOf([P.hasRole("editor"), costly("a")]))]),
      );
      assert.isTrue(r.allowed);
      assert.strictEqual(r.calls, 0);
    }));
});

describe("what the deciding rule contributes", () => {
  const audited = obligation("log-access");

  it.effect("a Permit rule contributes its condition's field set and obligations", () =>
    Effect.gen(function* () {
      const table = P.rules([
        P.permitWhen(
          P.obliged(
            audited,
            P.hasAttribute("tier", M.gte(0), { fields: ["id", "name"] }),
          ),
        ),
      ]);
      const d = yield* evaluate(table).pipe(
        Effect.provide(testLayer(subjectWith({ attributes: { tier: 3 } }))),
      );
      assert.isTrue(isAllowed(d));
      if (!isAllowed(d)) return;
      assert.deepStrictEqual(d.visibleFields, ["id", "name"]);
      assert.deepStrictEqual(
        d.obligations.map((o) => o.id),
        ["log-access"],
      );
    }));

  it.effect("a Deny rule contributes neither, though its condition allowed", () =>
    Effect.gen(function* () {
      // The first place in the library where an allowing subtree contributes
      // nothing to the decision above it: inside a Deny row, applicability and
      // permission point in opposite directions.
      const condition = P.obliged(
        audited,
        P.hasAttribute("tier", M.gte(0), { fields: ["id"] }),
      );
      const d = yield* evaluate(P.rules([P.denyWhen(condition)])).pipe(
        Effect.provide(testLayer(subjectWith({ attributes: { tier: 3 } }))),
      );
      assert.isFalse(isAllowed(d));
      const row = d.trace.children[0]!;
      // The condition's own node still records both, so a reviewer can see what
      // the row matched on — the same reason `Not` keeps them on the trace.
      assert.isTrue(row.allowed);
      assert.deepStrictEqual(row.visibleFields, ["id"]);
      assert.deepStrictEqual(
        row.obligations.map((o) => o.id),
        ["log-access"],
      );
      assert.deepStrictEqual(d.trace.visibleFields, undefined);
      assert.deepStrictEqual(d.trace.obligations, []);
    }));

  it.effect("a rule that applied but did not decide contributes nothing", () =>
    Effect.gen(function* () {
      // Row 0 permits and decides; row 2 also permits, and its duty is not
      // owed, because it granted nothing. ADR-QD-019's sentence, unchanged.
      const d = yield* evaluate(
        P.rules(
          [
            P.permitWhen(P.hasRole("editor")),
            P.denyWhen(never),
            P.permitWhen(P.obliged(audited, always)),
          ],
          { combining: "DenyOverrides" },
        ),
      ).pipe(Effect.provide(testLayer(editor)));
      assert.isTrue(isAllowed(d));
      if (!isAllowed(d)) return;
      assert.deepStrictEqual(d.obligations, []);
    }));
});

describe("the trace names the row that hit", () => {
  it.effect("in both directions", () =>
    Effect.gen(function* () {
      const permitted = yield* run(P.rules([P.permitWhen(always)]));
      const denied = yield* run(P.rules([P.denyWhen(always)]));
      // An allowing node carrying a reason is unique to `Rules`, and it is
      // there because a rule table's first question is *which row hit*.
      assert.strictEqual(permitted.trace.reason, "rules[0] permitted");
      assert.strictEqual(denied.trace.reason, "rules[0] denied");
    }));

  it.effect("children are the conditions actually evaluated, in order", () =>
    Effect.gen(function* () {
      const d = yield* run(
        P.rules([P.denyWhen(never), P.permitWhen(P.hasRole("editor")), P.denyWhen(always)]),
      );
      const tags = d.trace.children.map((c: Trace) => c.policyTag);
      assert.deepStrictEqual(tags, ["HasRole", "HasRole"]);
      assert.deepStrictEqual(
        d.trace.children.map((c: Trace) => c.allowed),
        [false, true],
      );
    }));

  it.effect("a labeled condition survives into the row's trace", () =>
    Effect.gen(function* () {
      const d = yield* run(
        P.rules([P.denyWhen(P.labeled("suspended-accounts", P.hasRole("editor")))]),
      );
      assert.strictEqual(d.trace.children[0]?.label, "suspended-accounts");
    }));
});

describe("rules compose with the rest of the ADT", () => {
  it.effect("a table nests inside a combinator and vice versa", () =>
    Effect.gen(function* () {
      const table = P.rules([P.permitWhen(P.hasRole("editor"))]);
      assert.isTrue(isAllowed(yield* run(P.allOf([table, P.hasRole("editor")]))));
      assert.isFalse(isAllowed(yield* run(P.not(table))));
      assert.isTrue(
        isAllowed(yield* run(P.rules([P.permitWhen(P.anyOf([never, P.hasRole("editor")]))]))),
      );
    }));

  it.effect("a table counts toward the depth bound", () =>
    Effect.gen(function* () {
      const deep = P.rules([P.permitWhen(P.rules([P.permitWhen(P.rules([P.permitWhen(always)]))]))]);
      const r = yield* Effect.result(
        evaluate(deep, { maxDepth: 2 }).pipe(Effect.provide(testLayer(editor))),
      );
      assert.strictEqual(r._tag, "Failure");
    }));

  it.effect("INV-QD-006: a broken lookup inside a condition fails the table", () =>
    Effect.gen(function* () {
      // Not "that row did not apply". A resolver outage inside a rule table
      // must not read as the table falling through to its default deny.
      const failing = Layer.succeed(AttributeResolver, {
        resolve: (_id: string, attribute: string) =>
          Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
      });
      const r = yield* Effect.result(
        evaluate(P.rules([P.denyWhen(P.hasAttribute("risk", M.gte(1))), P.permitWhen(always)]))
          .pipe(Effect.provide(testLayer(editor, { attributes: failing }))),
      );
      assert.strictEqual(r._tag, "Failure");
    }));
});
