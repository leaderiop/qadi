import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import { renderTrace } from "../src/Decision.ts";
import * as M from "../src/Matcher.ts";
import * as Qadi from "../src/Qadi.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const canRead = P.hasPermission(read);

describe("Qadi.check / decide", () => {
  it.effect("check reduces a decision to a boolean", () =>
    Effect.gen(function* () {
      assert.isTrue(yield* Qadi.check(canRead));
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("decide returns the full decision", () =>
    Effect.gen(function* () {
      const d = yield* Qadi.decide(canRead);
      assert.strictEqual(d._tag, "Deny");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));
});

describe("Qadi.enforce", () => {
  it.effect("runs the wrapped effect when allowed", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("payload").pipe(Qadi.enforce(canRead));
      assert.strictEqual(result, "payload");
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("fails with AccessDenied and never starts the effect when denied", () =>
    Effect.gen(function* () {
      let started = false;
      const guarded = Effect.sync(() => {
        started = true;
        return "payload";
      }).pipe(Qadi.enforce(canRead));

      const r = yield* Effect.result(guarded);
      assert.strictEqual(r._tag, "Failure");
      // The point of an aspect: the protected work is not merely discarded,
      // it never runs.
      assert.isFalse(started);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("AccessDenied is catchable by tag and carries the reason", () =>
    Effect.gen(function* () {
      const recovered = yield* Effect.succeed("x").pipe(
        Qadi.enforce(canRead),
        Effect.catchTag("AccessDenied", (e) =>
          Effect.succeed(`${e.subjectId}|${e.policyTag}|${e.reason}`),
        ),
      );
      assert.include(recovered, "u1|HasPermission|");
      assert.include(recovered, "doc:read");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("AccessDenied CARRIES THE TRACE, not only the root sentence", () =>
    Effect.gen(function* () {
      // `Errors.ts` promised this in a doc comment long before the field
      // existed. The whole subtree was built and then discarded at the one place
      // most callers meet a denial.
      const nested = P.allOf([P.hasRole("admin"), canRead]);
      const result = yield* Effect.result(Effect.succeed("x").pipe(Qadi.enforce(nested)));

      assert.isTrue(Result.isFailure(result));
      if (!Result.isFailure(result)) return;
      const failure = result.failure;
      assert.strictEqual(failure._tag, "AccessDenied");
      if (failure._tag !== "AccessDenied") return;

      // The root's own sentence is all `reason` ever had.
      assert.strictEqual(failure.reason, failure.trace.reason);

      // The tree beneath it is what `reason` cannot say: which branch refused.
      const rendered = renderTrace(failure.trace);
      assert.include(rendered, "✗ AllOf");
      assert.include(rendered, "✗ HasRole");
      assert.isAbove(failure.trace.children.length, 0);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("assert succeeds silently when allowed", () =>
    Effect.gen(function* () {
      yield* Qadi.assert(canRead);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));
});

describe("Qadi.enforceProjected", () => {
  const record = { id: "1", title: "T", secret: "S" };

  it.effect("returns only the fields the policy exposes", () =>
    Effect.gen(function* () {
      const policy = P.hasPermission(read, { fields: ["id", "title"] });
      const out = yield* Effect.succeed(record).pipe(Qadi.enforceProjected(policy));
      assert.deepStrictEqual(out, { id: "1", title: "T" });
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("returns everything when the policy sets no field restriction", () =>
    Effect.gen(function* () {
      const out = yield* Effect.succeed(record).pipe(Qadi.enforceProjected(canRead));
      assert.deepStrictEqual(out, record);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("fails with AccessDenied when denied", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        Effect.succeed(record).pipe(Qadi.enforceProjected(canRead)),
      );
      assert.strictEqual(r._tag, "Failure");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("ignores fields the record does not have", () =>
    Effect.gen(function* () {
      const policy = P.hasPermission(read, { fields: ["id", "absent"] });
      const out = yield* Effect.succeed(record).pipe(Qadi.enforceProjected(policy));
      assert.deepStrictEqual(out, { id: "1" });
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));
});

describe("Qadi.guard", () => {
  const write = permission("doc", "write");
  const canWrite = P.hasPermission(write);
  const doc = { id: "1" };

  it.effect("hands the handler a witness carrying the exact permission checked", () =>
    Effect.gen(function* () {
      const out = yield* Qadi.guard(
        read,
        canRead,
      )(doc, (authorized, resource) => Effect.succeed({ permission: authorized.permission, resource }));
      assert.deepStrictEqual(out.permission, read);
      assert.deepStrictEqual(out.resource, doc);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("EVALUATES THE POLICY AGAINST THE GUARDED RESOURCE", () =>
    Effect.gen(function* () {
      // The resource used to reach only the handler. `enforce` ran with
      // `options.resource`, which nothing set, so a resource-scoped policy was
      // evaluated against no resource — and an absent resource does not deny:
      // `neq` on `undefined` is true. A rule written to refuse a mismatched
      // tenant therefore allowed one (INV-QD-032).
      const sameTenant = P.hasAttribute("homeTenant", M.neq(M.resource("tenant")));
      let leaked = false;

      const r = yield* Effect.result(
        Qadi.guard(read, sameTenant)({ id: "d1", tenant: "evil" }, () =>
          Effect.sync(() => {
            leaked = true;
            return "payload";
          }),
        ),
      );

      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "AccessDenied");
      assert.isFalse(leaked);
    }).pipe(
      Effect.provide(testLayer(subjectWith({ attributes: { homeTenant: "evil" } }))),
    ));

  it.effect("allows when the guarded resource satisfies the policy", () =>
    Effect.gen(function* () {
      // The other direction, so the test above cannot pass by denying
      // everything — which a `guard` that simply refused resource-scoped
      // policies would also do.
      const otherTenant = P.hasAttribute("homeTenant", M.neq(M.resource("tenant")));
      const out = yield* Qadi.guard(read, otherTenant)(
        { id: "d1", tenant: "acme" },
        (_authorized, resource) => Effect.succeed(resource.id),
      );
      assert.strictEqual(out, "d1");
    }).pipe(
      Effect.provide(testLayer(subjectWith({ attributes: { homeTenant: "evil" } }))),
    ));

  it.effect("an empty resource DENIES a resource policy rather than erroring", () =>
    Effect.gen(function* () {
      // What `@qadi/http`'s RequirePermission relies on: it guards with `{}`
      // before any resource is loaded. `{}` reaches the evaluator and the
      // attribute is simply absent, so this is a denial. Evaluated with no
      // resource at all it would fail with MissingResource — a 500 where a 403
      // belongs.
      const ownedByMe = P.hasResourceAttribute("ownerId", M.eq(M.subjectId()));
      const r = yield* Effect.result(
        Qadi.guard(read, ownedByMe)({}, () => Effect.succeed("payload")),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "AccessDenied");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("the guarded resource overrides one passed in options", () =>
    Effect.gen(function* () {
      // Two channels for one value is what caused the defect. The positional
      // resource is the one the handler and the witness describe, so it is the
      // one evaluated — anything else lets the three disagree.
      const ownedByMe = P.hasResourceAttribute("ownerId", M.eq(M.subjectId()));
      const out = yield* Qadi.guard(read, ownedByMe, {
        resource: { ownerId: "someone-else" },
      })({ ownerId: "u1" }, (_a, resource) => Effect.succeed(resource.ownerId));
      assert.strictEqual(out, "u1");
    }).pipe(Effect.provide(testLayer(subjectWith({ id: "u1" })))));

  it.effect("fails with AccessDenied and never starts the handler when denied", () =>
    Effect.gen(function* () {
      let started = false;
      const guarded = Qadi.guard(
        write,
        canWrite,
      )(doc, () =>
        Effect.sync(() => {
          started = true;
          return "payload";
        }),
      );

      const r = yield* Effect.result(guarded);
      assert.strictEqual(r._tag, "Failure");
      // Same property `enforce` guarantees: refusing after running the
      // handler would be no protection at all.
      assert.isFalse(started);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("fails with UndischargedObligation the same way enforce does", () =>
    Effect.gen(function* () {
      const logIt = obligation("log-write", { channel: "audit" });
      const audited = P.obliged(logIt, canWrite);

      const r = yield* Effect.result(
        Qadi.guard(write, audited)(doc, () => Effect.succeed("payload")),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "UndischargedObligation");
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:write"] })))));

  // The type-level guarantee that a witness for one permission cannot
  // satisfy a position typed for a different permission's is pinned in
  // `Qadi.tst.ts` (`tstyche`) rather than here — a real assertion instead of
  // an `it()` that only type-checks and never runs.
});

describe("Qadi.filter", () => {
  it.effect("keeps only the items the policy allows", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute(
        "state",
        // eq against a literal, so each item is judged on its own attributes
        { _tag: "Eq", ref: { _tag: "LiteralRef", value: "open" } },
      );
      const items = [
        { id: "a", state: "open" },
        { id: "b", state: "closed" },
        { id: "c", state: "open" },
      ];
      const kept = yield* Qadi.filter(policy, items);
      assert.deepStrictEqual(
        kept.map((i) => i["id"]),
        ["a", "c"],
      );
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("returns an empty list when nothing qualifies", () =>
    Effect.gen(function* () {
      const kept = yield* Qadi.filter(P.hasRole("nobody"), [{ id: "a" }]);
      assert.strictEqual(kept.length, 0);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));
});

describe("Qadi.filterStream", () => {
  it.effect("keeps only the items the policy allows, same as filter", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute(
        "state",
        { _tag: "Eq", ref: { _tag: "LiteralRef", value: "open" } },
      );
      const items = [
        { id: "a", state: "open" },
        { id: "b", state: "closed" },
        { id: "c", state: "open" },
      ];
      const kept = yield* Stream.runCollect(Qadi.filterStream(policy, Stream.fromIterable(items)));
      assert.deepStrictEqual(
        kept.map((i) => i["id"]),
        ["a", "c"],
      );
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("returns an empty stream when nothing qualifies", () =>
    Effect.gen(function* () {
      const kept = yield* Stream.runCollect(
        Qadi.filterStream(P.hasRole("nobody"), Stream.fromIterable([{ id: "a" }])),
      );
      assert.strictEqual(kept.length, 0);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("discharges per allowed element, and refuses rather than silently dropping an obliged one", () =>
    Effect.gen(function* () {
      const logIt = obligation("log-access", { channel: "audit" });
      const discharged: Array<string> = [];
      const policy = P.obliged(logIt, P.hasResourceAttribute("state", M.eq(M.literal("open"))));
      const items = [
        { id: "a", state: "open" },
        { id: "b", state: "closed" },
        { id: "c", state: "open" },
      ];

      const kept = yield* Stream.runCollect(
        Qadi.filterStream(policy, Stream.fromIterable(items), {
          onObligations: (obligations) =>
            Effect.sync(() => {
              for (const o of obligations) discharged.push(o.id);
            }),
        }),
      );
      assert.deepStrictEqual(kept.map((k) => k["id"]), ["a", "c"]);
      assert.deepStrictEqual(discharged, ["log-access", "log-access"]);

      const refused = yield* Effect.result(
        Stream.runCollect(Qadi.filterStream(policy, Stream.fromIterable(items))),
      );
      assert.strictEqual(refused._tag, "Failure");
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));
});

describe("Qadi.filterStream — concurrency across items", () => {
  // Mirrors "Qadi.filter — concurrency across items" below: `options.concurrency`
  // has to reach `Stream.mapEffect`'s own options, not just get threaded into each
  // item's `evaluate` call. Proven the same way — a resolver blocking on a shared
  // gate, so "how many lookups are in flight" is observed directly, not inferred.
  const policy = P.hasAttribute("clearance", M.gte(1));
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  const blockingResolver = (invocations: Ref.Ref<number>, gate: Deferred.Deferred<void>) =>
    Layer.succeed(AttributeResolver, {
      resolve: () =>
        Ref.update(invocations, (n) => n + 1).pipe(
          Effect.flatMap(() => Deferred.await(gate)),
          Effect.as(5),
        ),
    });

  it.effect("without a concurrency option, one item's lookup is in flight at a time", () =>
    Effect.gen(function* () {
      const invocations = yield* Ref.make(0);
      const gate = yield* Deferred.make<void>();

      yield* Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(
          Stream.runCollect(Qadi.filterStream(policy, Stream.fromIterable(items))),
        );
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
        assert.strictEqual(
          yield* Ref.get(invocations),
          1,
          "sequential filterStream should never have more than one item's lookup in flight",
        );
        yield* Deferred.succeed(gate, undefined);
        yield* Fiber.join(fiber);
      }).pipe(
        Effect.provide(
          testLayer(subjectWith({}), { attributes: blockingResolver(invocations, gate) }),
        ),
      );
    }));

  it.effect("with concurrency: 'unbounded', every item's lookup is in flight at once", () =>
    Effect.gen(function* () {
      const invocations = yield* Ref.make(0);
      const gate = yield* Deferred.make<void>();

      yield* Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(
          Stream.runCollect(
            Qadi.filterStream(policy, Stream.fromIterable(items), { concurrency: "unbounded" }),
          ),
        );
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
        assert.strictEqual(
          yield* Ref.get(invocations),
          items.length,
          "concurrent filterStream should have every item's lookup in flight before any completes",
        );
        yield* Deferred.succeed(gate, undefined);
        yield* Fiber.join(fiber);
      }).pipe(
        Effect.provide(
          testLayer(subjectWith({}), { attributes: blockingResolver(invocations, gate) }),
        ),
      );
    }));
});

describe("Qadi obligations", () => {
  // `enforce` returns the guarded effect's value, not the decision, so an
  // obligation would otherwise be computed and thrown away while the caller ran
  // the protected work believing the permission was unconditional — ADR-QD-019.
  const logIt = obligation("log-access", { channel: "audit" });
  const advice = obligation("prefer-redacted", {}, { advisory: true });
  const audited = P.obliged(logIt, canRead);
  const advised = P.obliged(advice, canRead);

  const reader = subjectWith({ permissions: ["doc:read"] });

  it.effect("decide reports obligations without enforcing them", () =>
    Effect.gen(function* () {
      const d = yield* Qadi.decide(audited);
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, [logIt]);
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("enforce refuses a binding obligation it cannot discharge", () =>
    Effect.gen(function* () {
      let started = false;
      const guarded = Effect.sync(() => {
        started = true;
        return "payload";
      }).pipe(Qadi.enforce(audited));

      const r = yield* Effect.result(guarded);
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "UndischargedObligation");
      if (r.failure._tag !== "UndischargedObligation") return;
      assert.deepStrictEqual(r.failure.obligationIds, ["log-access"]);
      // Refusing after running the work would be no protection at all.
      assert.isFalse(started);
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("a handler discharges the obligation and the effect runs", () =>
    Effect.gen(function* () {
      const discharged: Array<string> = [];
      const result = yield* Effect.succeed("payload").pipe(
        Qadi.enforce(audited, {
          onObligations: (obligations) =>
            Effect.sync(() => {
              for (const o of obligations) discharged.push(o.id);
            }),
        }),
      );
      assert.strictEqual(result, "payload");
      assert.deepStrictEqual(discharged, ["log-access"]);
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("the handler runs before the guarded effect, not after", () =>
    Effect.gen(function* () {
      // An obligation is a condition on the permission, not a follow-up to it.
      const order: Array<string> = [];
      yield* Effect.sync(() => order.push("work")).pipe(
        Qadi.enforce(audited, {
          onObligations: () => Effect.sync(() => order.push("obligation")),
        }),
      );
      assert.deepStrictEqual(order, ["obligation", "work"]);
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("a failing handler stops the guarded effect", () =>
    Effect.gen(function* () {
      let started = false;
      const r = yield* Effect.result(
        Effect.sync(() => {
          started = true;
        }).pipe(
          Qadi.enforce(audited, {
            onObligations: () => Effect.fail(new Error("audit log unreachable")),
          }),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
      assert.isFalse(started);
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("onObligations is never invoked when the decision carries no obligation", () =>
    Effect.gen(function* () {
      // `canRead` (unlike `audited`/`advised`) is not wrapped in `obliged`, so
      // an allow for it carries an empty obligations array. The handler exists
      // to discharge duties, not to run unconditionally on every allow.
      let called = false;
      const result = yield* Effect.succeed("payload").pipe(
        Qadi.enforce(canRead, {
          onObligations: () => Effect.sync(() => { called = true; }),
        }),
      );
      assert.strictEqual(result, "payload");
      assert.isFalse(called);
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("an advisory obligation never blocks", () =>
    Effect.gen(function* () {
      // XACML's advice: the caller may ignore it, so it is reported and does
      // not stand between the subject and their permission.
      const result = yield* Effect.succeed("payload").pipe(Qadi.enforce(advised));
      assert.strictEqual(result, "payload");
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("a handler still sees advisory obligations", () =>
    Effect.gen(function* () {
      const seen: Array<string> = [];
      yield* Effect.succeed("x").pipe(
        Qadi.enforce(advised, {
          onObligations: (obligations) =>
            Effect.sync(() => {
              for (const o of obligations) seen.push(o.id);
            }),
        }),
      );
      assert.deepStrictEqual(seen, ["prefer-redacted"]);
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("a denial reports AccessDenied, not an undischarged obligation", () =>
    Effect.gen(function* () {
      // The obligation never attached, because the wrapped policy denied.
      const r = yield* Effect.result(Effect.succeed("x").pipe(Qadi.enforce(audited)));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "AccessDenied");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("assert refuses a binding obligation too", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(Qadi.assert(audited));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "UndischargedObligation");
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("enforceProjected refuses one as well, and still projects when handled", () =>
    Effect.gen(function* () {
      const row = { id: "1", title: "T", secret: "S" };
      const policy = P.obliged(logIt, P.hasPermission(read, { fields: ["title"] }));

      const refused = yield* Effect.result(
        Effect.succeed(row).pipe(Qadi.enforceProjected(policy)),
      );
      assert.strictEqual(refused._tag, "Failure");

      const projected = yield* Effect.succeed(row).pipe(
        Qadi.enforceProjected(policy, { onObligations: () => Effect.void }),
      );
      assert.deepStrictEqual(projected, { title: "T" });
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("filter refuses rather than silently dropping an obliged element", () =>
    Effect.gen(function* () {
      // Dropping it would report a wiring mistake as a denial — INV-QD-006.
      // `filter` hands back data, so it enforces rather than reports.
      const r = yield* Effect.result(Qadi.filter(audited, [{ id: "a" }, { id: "b" }]));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "UndischargedObligation");
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("filter discharges per allowed element when handled", () =>
    Effect.gen(function* () {
      const discharged: Array<string> = [];
      const policy = P.obliged(
        logIt,
        P.hasResourceAttribute("state", M.eq(M.literal("open"))),
      );

      const kept = yield* Qadi.filter(
        policy,
        [
          { id: "a", state: "open" },
          { id: "b", state: "closed" },
          { id: "c", state: "open" },
        ],
        {
          onObligations: (obligations) =>
            Effect.sync(() => {
              for (const o of obligations) discharged.push(o.id);
            }),
        },
      );

      assert.deepStrictEqual(kept.map((k) => k["id"]), ["a", "c"]);
      // Once per *allowed* element: a denied row owes nothing.
      assert.deepStrictEqual(discharged, ["log-access", "log-access"]);
    }).pipe(Effect.provide(testLayer(reader))));

  it.effect("check reports the boolean and leaves the obligation to the caller", () =>
    Effect.gen(function* () {
      // `check` runs nothing and hands back nothing, so there is no protected
      // work an undischarged duty could guard. Documented, not overlooked.
      assert.isTrue(yield* Qadi.check(audited));
    }).pipe(Effect.provide(testLayer(reader))));
});

describe("Qadi.filter — concurrency across items", () => {
  // The claim: `filter`'s outer fan-out over `items`, not just each item's own
  // `allOf`/`anyOf` tree, now honours `options.concurrency`. Proven the same
  // way `DecisionCache.test.ts`'s coalescing tests are — a resolver that
  // blocks on a shared gate, so "how many lookups are in flight when the gate
  // is still shut" is directly observable rather than inferred from timing.
  // A subject attribute, not a resource one: `HasResourceAttribute` reads
  // straight from the resource in hand, but `HasAttribute` goes through
  // `AttributeResolver` — the call this test needs to observe.
  const policy = P.hasAttribute("clearance", M.gte(1));
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  const blockingResolver = (invocations: Ref.Ref<number>, gate: Deferred.Deferred<void>) =>
    Layer.succeed(AttributeResolver, {
      resolve: () =>
        Ref.update(invocations, (n) => n + 1).pipe(
          Effect.flatMap(() => Deferred.await(gate)),
          Effect.as(5),
        ),
    });

  it.effect("without a concurrency option, one item's lookup is in flight at a time", () =>
    Effect.gen(function* () {
      const invocations = yield* Ref.make(0);
      const gate = yield* Deferred.make<void>();

      yield* Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(Qadi.filter(policy, items));
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
        assert.strictEqual(
          yield* Ref.get(invocations),
          1,
          "sequential filter should never have more than one item's lookup in flight",
        );
        yield* Deferred.succeed(gate, undefined);
        yield* Fiber.join(fiber);
      }).pipe(
        Effect.provide(
          testLayer(subjectWith({}), { attributes: blockingResolver(invocations, gate) }),
        ),
      );
    }));

  it.effect("with concurrency: 'unbounded', every item's lookup is in flight at once", () =>
    Effect.gen(function* () {
      const invocations = yield* Ref.make(0);
      const gate = yield* Deferred.make<void>();

      yield* Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(
          Qadi.filter(policy, items, { concurrency: "unbounded" }),
        );
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
        assert.strictEqual(
          yield* Ref.get(invocations),
          items.length,
          "concurrent filter should have every item's lookup in flight before any completes",
        );
        yield* Deferred.succeed(gate, undefined);
        yield* Fiber.join(fiber);
      }).pipe(
        Effect.provide(
          testLayer(subjectWith({}), { attributes: blockingResolver(invocations, gate) }),
        ),
      );
    }));

  it.effect("concurrency changes overlap, never which items are kept", () =>
    Effect.gen(function* () {
      const openItems = [
        { id: "a", state: "open" },
        { id: "b", state: "closed" },
        { id: "c", state: "open" },
      ];
      const statePolicy = P.hasResourceAttribute(
        "state",
        { _tag: "Eq", ref: { _tag: "LiteralRef", value: "open" } },
      );

      const [sequential, concurrent] = yield* Effect.gen(function* () {
        const s = yield* Qadi.filter(statePolicy, openItems);
        const c = yield* Qadi.filter(statePolicy, openItems, { concurrency: "unbounded" });
        return [s, c] as const;
      }).pipe(Effect.provide(testLayer(subjectWith({}))));

      assert.deepStrictEqual(
        sequential.map((i) => i.id),
        ["a", "c"],
      );
      assert.deepStrictEqual(
        concurrent.map((i) => i.id),
        ["a", "c"],
      );
    }));
});
