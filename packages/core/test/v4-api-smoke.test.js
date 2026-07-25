/**
 * Canary for the Effect v4 APIs this library's design depends on.
 *
 * Effect v4 is beta and renamed a great deal from v3. If a beta bump breaks one
 * of these, the failure should surface here rather than diffused across the
 * whole codebase.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
class Greeter extends Context.Service()("smoke/Greeter") {
    // `use` requires the callback to RETURN an Effect, so it is a one-step method
    // accessor — not a `static current = X.use((x) => x)` identity read. That
    // alchemy idiom only typechecks when the service Shape is itself an Effect.
    static greet = (name) => Greeter.use((g) => g.greet(name));
}
const GreeterLive = Layer.effect(Greeter, Effect.gen(function* () {
    return {
        greet: (name) => Effect.succeed(`hello ${name}`),
    };
}));
// ---------------------------------------------------------------------------
// Errors: Data.TaggedError with namespaced tags
// ---------------------------------------------------------------------------
class Boom extends Data.TaggedError("smoke/Boom") {
}
class Bang extends Data.TaggedError("smoke/Bang") {
}
const NodeRef = Schema.suspend(() => NodeSchema);
const LeafSchema = Schema.TaggedStruct("Leaf", {
    value: Schema.Number,
});
const BranchSchema = Schema.TaggedStruct("Branch", {
    children: Schema.Array(NodeRef),
    strategy: Schema.Literals(["all", "any"]),
});
const NodeSchema = Schema.Union([LeafSchema, BranchSchema]);
const NodeFromJson = Schema.fromJsonString(NodeSchema);
describe("effect v4 API canary", () => {
    it.effect("Context.Service + Layer.effect + Effect.fn", () => Effect.gen(function* () {
        const run = Effect.fn("smoke.run")(function* (name) {
            const greeter = yield* Greeter;
            return yield* greeter.greet(name);
        });
        const result = yield* run("world");
        assert.strictEqual(result, "hello world");
    }).pipe(Effect.provide(GreeterLive)));
    it.effect("static method accessor via use", () => Effect.gen(function* () {
        assert.strictEqual(yield* Greeter.greet("x"), "hello x");
    }).pipe(Effect.provide(GreeterLive)));
    it.effect("catchTag array form handles a union of tagged errors", () => Effect.gen(function* () {
        const fail = (n) => n > 0
            ? Effect.fail(new Boom({ why: "positive" }))
            : Effect.fail(new Bang({ code: n }));
        const recovered = yield* fail(1).pipe(Effect.catchTag(["smoke/Boom", "smoke/Bang"], (e) => Effect.succeed(e._tag)));
        assert.strictEqual(recovered, "smoke/Boom");
    }));
    it.effect("recursive union schema round-trips through JSON", () => Effect.gen(function* () {
        const tree = {
            _tag: "Branch",
            strategy: "any",
            children: [
                { _tag: "Leaf", value: 1 },
                { _tag: "Branch", strategy: "all", children: [{ _tag: "Leaf", value: 2 }] },
            ],
        };
        const json = yield* Schema.encodeEffect(NodeFromJson)(tree);
        assert.isString(json);
        const back = yield* Schema.decodeUnknownEffect(NodeFromJson)(json);
        assert.deepStrictEqual(back, tree);
    }));
    it.effect("decoding rejects an unknown tag", () => Effect.gen(function* () {
        const result = yield* Effect.result(Schema.decodeUnknownEffect(NodeFromJson)(`{"_tag":"Nope"}`));
        assert.isTrue(result._tag === "Failure");
    }));
});
//# sourceMappingURL=v4-api-smoke.test.js.map