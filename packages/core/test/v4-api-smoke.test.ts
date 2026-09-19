/**
 * Canary for the Effect v4 APIs this library's design depends on.
 *
 * Effect v4 is beta and renamed a great deal from v3. If a beta bump breaks one
 * of these, the failure should surface here rather than diffused across the
 * whole codebase.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Brand from "effect/Brand";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";

// ---------------------------------------------------------------------------
// Services: Context.Service<Self, Shape>()("ns/Id") + standalone Layer const
// ---------------------------------------------------------------------------

interface GreeterShape {
  readonly greet: (name: string) => Effect.Effect<string>;
}

class Greeter extends Context.Service<Greeter, GreeterShape>()("smoke/Greeter") {
  // `use` requires the callback to RETURN an Effect, so it is a one-step method
  // accessor — not a `static current = X.use((x) => x)` identity read. That
  // alchemy idiom only typechecks when the service Shape is itself an Effect.
  static greet = (name: string) => Greeter.use((g) => g.greet(name));
}

const GreeterLive = Layer.effect(
  Greeter,
  Effect.gen(function* () {
    return {
      greet: (name: string) => Effect.succeed(`hello ${name}`),
    };
  }),
);

// ---------------------------------------------------------------------------
// Errors: Data.TaggedError, and the array form of catchTag
// ---------------------------------------------------------------------------

class Boom extends Data.TaggedError("smoke/Boom")<{ readonly why: string }> {}
class Bang extends Data.TaggedError("smoke/Bang")<{ readonly code: number }> {}

// ---------------------------------------------------------------------------
// Recursive tagged-union schema (the Policy ADT shape)
// ---------------------------------------------------------------------------

type Node = Leaf | Branch;

interface Leaf {
  readonly _tag: "Leaf";
  readonly value: number;
}

interface Branch {
  readonly _tag: "Branch";
  readonly children: ReadonlyArray<Node>;
  readonly strategy: "all" | "any";
}

const NodeRef = Schema.suspend((): Schema.Codec<Node> => NodeSchema);

const LeafSchema = Schema.TaggedStruct("Leaf", {
  value: Schema.Number,
});

const BranchSchema = Schema.TaggedStruct("Branch", {
  children: Schema.Array(NodeRef),
  strategy: Schema.Literals(["all", "any"]),
});

const NodeSchema: Schema.Codec<Node> = Schema.Union([LeafSchema, BranchSchema]);

const NodeFromJson = Schema.fromJsonString(NodeSchema);

// ---------------------------------------------------------------------------
// Match.tagsExhaustive over the same two-tag union — the compile-forced-
// exhaustiveness idiom AGENTS.md §5a leans on at 25+ dispatch sites across
// core, devtools and http. Built once at module scope, per §5a's own
// preference (maxwell-brown, MB-02: the canary imported Context/Data/Effect/
// Layer/Schema but never Match, so a silent semantic shift in
// `tagsExhaustive` — an overload change, a variance change, degrading to a
// partial match — would surface as diffuse breakage instead of failing here).
// ---------------------------------------------------------------------------

const describeNode: (self: Node) => string = Match.type<Node>().pipe(
  Match.tagsExhaustive({
    Leaf: (n) => `leaf:${n.value}`,
    Branch: (n) => `branch:${n.strategy}:${n.children.length}`,
  }),
);

// ---------------------------------------------------------------------------
// Brand.nominal + Schema.fromBrand — the branded-identifier idiom
// `Identity.ts`'s `SubjectId`/`ResourceId` are built from (MB-02). A total,
// non-validating brand: the `Brand.Constructor` never fails, and the schema
// wrapping it exists for the trust-boundary decode, not for validation.
// ---------------------------------------------------------------------------

const WIDGET_ID_TAG = "WidgetId" as const;
type WidgetId = string & Brand.Brand<typeof WIDGET_ID_TAG>;
const makeWidgetId = Brand.nominal<WidgetId>();
const WidgetIdSchema = Schema.String.pipe(Schema.fromBrand(WIDGET_ID_TAG, makeWidgetId));

describe("effect v4 API canary", () => {
  it.effect("Context.Service + Layer.effect + Effect.fn", () =>
    Effect.gen(function* () {
      const run = Effect.fn("smoke.run")(function* (name: string) {
        const greeter = yield* Greeter;
        return yield* greeter.greet(name);
      });

      const result = yield* run("world");
      assert.strictEqual(result, "hello world");
    }).pipe(Effect.provide(GreeterLive)));

  it.effect("static method accessor via use", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* Greeter.greet("x"), "hello x");
    }).pipe(Effect.provide(GreeterLive)));

  it.effect("catchTag array form handles a union of tagged errors", () =>
    Effect.gen(function* () {
      const fail = (n: number): Effect.Effect<string, Boom | Bang> =>
        n > 0
          ? Effect.fail(new Boom({ why: "positive" }))
          : Effect.fail(new Bang({ code: n }));

      const recovered = yield* fail(1).pipe(
        Effect.catchTag(["smoke/Boom", "smoke/Bang"], (e) => Effect.succeed(e._tag)),
      );
      assert.strictEqual(recovered, "smoke/Boom");
    }));

  it.effect("recursive union schema round-trips through JSON", () =>
    Effect.gen(function* () {
      const tree: Node = {
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

  it.effect("decoding rejects an unknown tag", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        Schema.decodeUnknownEffect(NodeFromJson)(`{"_tag":"Nope"}`),
      );
      assert.isTrue(result._tag === "Failure");
    }));

  // Pins the `ParseOptions` contract `UNTRUSTED_DECODE_OPTIONS` (Policy.ts)
  // depends on: v4's *default* is `onExcessProperty: "ignore"` (Policy.test.ts
  // documents the same fact where the untrusted-decode path actually lives).
  // Left unpinned here, an rc bump that changed excess-property handling would
  // be caught one layer down by the policy suite, not by the canary whose job
  // is to pin v4 API assumptions at the source (xavier-leroy, XL-04).
  it.effect("onExcessProperty default is 'ignore'; 'error' rejects an excess key", () =>
    Effect.gen(function* () {
      const withExcessKey = `{"_tag":"Leaf","value":1,"bogus":true}`;

      const ignored = yield* Schema.decodeUnknownEffect(NodeFromJson)(withExcessKey);
      assert.deepStrictEqual(ignored, { _tag: "Leaf", value: 1 });

      const result = yield* Effect.result(
        Schema.decodeUnknownEffect(NodeFromJson, { onExcessProperty: "error" })(withExcessKey),
      );
      assert.isTrue(result._tag === "Failure");
    }));

  it.effect("Match.tagsExhaustive dispatches both arms of a tagged union", () =>
    Effect.gen(function* () {
      assert.strictEqual(describeNode({ _tag: "Leaf", value: 3 }), "leaf:3");
      assert.strictEqual(
        describeNode({ _tag: "Branch", strategy: "all", children: [] }),
        "branch:all:0",
      );
    }));

  it.effect("Brand.nominal + Schema.fromBrand round-trips a branded identifier", () =>
    Effect.gen(function* () {
      const id = makeWidgetId("widget-1");
      assert.strictEqual(id, "widget-1");

      const decoded = yield* Schema.decodeUnknownEffect(WidgetIdSchema)("widget-2");
      assert.strictEqual(decoded, "widget-2");
    }));
});
