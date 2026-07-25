import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Qadi from "../src/Qadi.ts";
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
        Effect.catchTag("qadi/AccessDenied", (e) =>
          Effect.succeed(`${e.subjectId}|${e.policyTag}|${e.reason}`),
        ),
      );
      assert.include(recovered, "u1|HasPermission|");
      assert.include(recovered, "doc:read");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

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
