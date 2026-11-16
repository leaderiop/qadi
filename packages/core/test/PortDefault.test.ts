/**
 * Pins that a port's fail-closed default is a fact its service carries, not a name a reader parses.
 *
 * ARCH-94: devtools read `defaulted` from BEH-QD-196's `"<inner> (<suffix>)"` display name, so a
 * wrapper that spread a default and renamed itself hid it. `nonePort` now sets a mark on the
 * default it builds (an own, symbol-keyed property naming its port), every derived wrapper and
 * `decoratePorts` copy it from what they wrap, and `isPortDefault` reads it, own properties only.
 * The mark is package-private: its key is not exported and cannot be minted with `Symbol.for`, so a
 * wrapper keeps it by spreading `...inner` (it can be read off a default with
 * `Object.getOwnPropertySymbols`, so copying it is deliberate, not accidental).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import {
  AttributeResolver,
  AttributeResolverNone,
  attributeResolverBounded,
  attributeResolverFromRecord,
  attributeResolverPort,
  attributeResolverRetrying,
  attributeResolverTimingOut,
} from "../src/AttributeResolver.ts";
import { makeSubjectId } from "../src/Identity.ts";
import { CustomPredicate, customPredicateFromRecord, customPredicatePort } from "../src/CustomPredicate.ts";
import { isPortDefault, PortReply } from "../src/PortDescription.ts";
import type { PortName } from "../src/PortName.ts";
import { recordingPort, replyTable, scriptedPort } from "../src/PortDoubles.ts";
import { askRemotely } from "../src/PortRemote.ts";
import { decoratePorts, forEveryPort, portsLayer } from "../src/Ports.ts";
import type { DescriptionOf } from "../src/Ports.ts";

/** The shape `portsLayer()` builds for `d`'s service: that port's fail-closed default. */
const defaultOf = <K extends PortName>(d: DescriptionOf<K>) =>
  Effect.gen(function* () {
    const context = yield* Layer.build(portsLayer());
    return Context.get(context, d.service);
  });

/** The AttributeResolver shape `layer` builds. */
const attributeShapeOf = <E>(layer: Layer.Layer<AttributeResolver, E>) =>
  Effect.gen(function* () {
    const context = yield* Layer.build(layer);
    return Context.get(context, AttributeResolver);
  });

describe("a port's fail-closed default is a fact the service carries (PFCT-01, D-01 to D-03)", () => {
  forEveryPort((d) =>
    it.effect(`${d.port}: its fail-closed default is its default`, () =>
      Effect.gen(function* () {
        assert.isTrue(isPortDefault(d, yield* defaultOf(d)));
      }),
    ),
  );

  it.effect("M1: a real adapter is not a default", () =>
    Effect.gen(function* () {
      const real = yield* attributeShapeOf(attributeResolverFromRecord({}));

      assert.isFalse(isPortDefault(attributeResolverPort, real));
    }),
  );

  it.effect("M2: a scripted double is not a default, even when it answers like one", () =>
    Effect.gen(function* () {
      const scripted = yield* attributeShapeOf(
        scriptedPort(attributeResolverPort, () => PortReply.answer(undefined)).layer,
      );

      assert.isFalse(isPortDefault(attributeResolverPort, scripted));
    }),
  );

  it.effect("M3: a spread copy of the default keeps it", () =>
    Effect.gen(function* () {
      const none = yield* defaultOf(attributeResolverPort);

      assert.isTrue(isPortDefault(attributeResolverPort, { ...none, name: "spread" }));
    }),
  );

  it.effect("M4: a fresh object is not a default (D-04)", () =>
    Effect.gen(function* () {
      const none = yield* defaultOf(attributeResolverPort);

      assert.isFalse(
        isPortDefault(attributeResolverPort, { name: "AttributeResolverNone", resolve: none.resolve }),
      );
    }),
  );

  it.effect("M5: an inherited mark is not a default", () =>
    Effect.gen(function* () {
      const none = yield* defaultOf(attributeResolverPort);
      const delegating: unknown = Object.create(none);

      assert.isFalse(isPortDefault(attributeResolverPort, delegating));
    }),
  );

  it.effect("M6: a default under another port is not that port's default (D-02)", () =>
    Effect.gen(function* () {
      const context = yield* Layer.build(portsLayer());
      const defaults = forEveryPort((d) => ({ port: d.port, shape: Context.get(context, d.service) }));

      for (const owner of defaults) {
        for (const asked of defaults) {
          assert.strictEqual(isPortDefault({ port: asked.port }, owner.shape), owner.port === asked.port);
        }
      }
    }),
  );

  forEveryPort((d) => {
    const built = (layer: Layer.Layer<typeof d.service.Identifier>) =>
      Effect.gen(function* () {
        const context = yield* Layer.build(layer);
        return Context.get(context, d.service);
      });

    return it.effect(`${d.port}: a scripted double, a replay and a remote asker never carry the mark`, () =>
      Effect.gen(function* () {
        const scripted = yield* built(scriptedPort(d, () => undefined).layer);
        const replay = yield* built(scriptedPort(d, replyTable(d, [])).layer);

        assert.isFalse(isPortDefault(d, scripted));
        assert.isFalse(isPortDefault(d, replay));
        assert.isFalse(isPortDefault(d, askRemotely(d, () => Effect.never)));
      }),
    );
  });

  it.effect("M2b: the record fixtures are not defaults", () =>
    Effect.gen(function* () {
      const context = yield* Layer.build(
        Layer.mergeAll(attributeResolverFromRecord({}), customPredicateFromRecord({})),
      );

      assert.isFalse(isPortDefault(attributeResolverPort, Context.get(context, AttributeResolver)));
      assert.isFalse(isPortDefault(customPredicatePort, Context.get(context, CustomPredicate)));
    }),
  );

  it("M7: a value that is not a shape is never a default", () => {
    const notShapes: ReadonlyArray<unknown> = [
      undefined,
      null,
      "AttributeResolverNone",
      () => undefined,
      0,
      {},
    ];

    for (const value of notShapes) assert.isFalse(isPortDefault(attributeResolverPort, value));
  });

  it("M7b: a proxy whose descriptor trap throws, or a revoked one, reads not defaulted", () => {
    const hostile = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error("trap");
        },
      },
    );
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();

    assert.isFalse(isPortDefault(attributeResolverPort, hostile));
    assert.isFalse(isPortDefault(attributeResolverPort, revoked.proxy));
  });

  it.effect("M8: the mark never shows in keys or JSON", () =>
    Effect.gen(function* () {
      const none = yield* defaultOf(attributeResolverPort);
      const marks = Object.getOwnPropertySymbols(none);

      assert.deepStrictEqual(Object.keys(none), ["name", "resolve"]);
      assert.strictEqual(JSON.stringify(none), '{"name":"AttributeResolverNone"}');
      assert.strictEqual(marks.length, 1);
      for (const mark of marks) {
        assert.strictEqual(mark.description, "qadi.PortDefault");
        assert.isTrue(Object.prototype.propertyIsEnumerable.call(none, mark));
        assert.strictEqual(Object.getOwnPropertyDescriptor(none, mark)?.value, "AttributeResolver");
      }
    }),
  );
});

const retrying = attributeResolverRetrying(Schedule.recurs(1));
const bounded = attributeResolverBounded(2);
const timingOut = attributeResolverTimingOut(Duration.seconds(1));
const recording = (layer: Layer.Layer<AttributeResolver>) =>
  recordingPort(attributeResolverPort, layer).layer;

/** Asserts the built shape's name first, so a row red for a wrong stack is told from the defect. */
const readsAs = <E>(layer: Layer.Layer<AttributeResolver, E>, name: string, defaulted: boolean) =>
  Effect.gen(function* () {
    const shape = yield* attributeShapeOf(layer);

    assert.strictEqual(shape.name, name);
    assert.strictEqual(isPortDefault(attributeResolverPort, shape), defaulted);
  });

describe("a derived wrapper is its port's default exactly when what it wraps is (PFCT-01, D-17)", () => {
  it.effect("W1: retrying around the default", () =>
    readsAs(retrying(AttributeResolverNone), "AttributeResolverNone (retrying)", true),
  );

  it.effect("W2: bounded around the default", () =>
    readsAs(bounded(AttributeResolverNone), "AttributeResolverNone (bounded 2)", true),
  );

  it.effect("W3: timing out around the default", () =>
    readsAs(timingOut(AttributeResolverNone), "AttributeResolverNone (timing out)", true),
  );

  it.effect("W4: recording around the default", () =>
    readsAs(recording(AttributeResolverNone), "AttributeResolverNone (recording)", true),
  );

  it.effect("W5: recording, timing out, retrying, bounded", () =>
    readsAs(
      bounded(retrying(timingOut(recording(AttributeResolverNone)))),
      "AttributeResolverNone (recording) (timing out) (retrying) (bounded 2)",
      true,
    ),
  );

  it.effect("W6: retrying, timing out, recording, bounded", () =>
    readsAs(
      bounded(recording(timingOut(retrying(AttributeResolverNone)))),
      "AttributeResolverNone (retrying) (timing out) (recording) (bounded 2)",
      true,
    ),
  );

  it.effect("W7: retrying twice", () =>
    readsAs(retrying(retrying(AttributeResolverNone)), "AttributeResolverNone (retrying) (retrying)", true),
  );

  it.effect("W8: retrying and bounded around a real adapter", () =>
    readsAs(
      bounded(retrying(attributeResolverFromRecord({}))),
      "attributeResolverFromRecord (retrying) (bounded 2)",
      false,
    ),
  );

  it.effect("W9: decoratePorts around a real adapter", () =>
    Effect.gen(function* () {
      const context = yield* Layer.build(
        decoratePorts(
          portsLayer({ AttributeResolver: attributeResolverFromRecord({}) }),
          (d, inner) => d.make(`${inner.name ?? "?"} (decorated)`, d.invoke(inner)),
        ),
      );
      const shape = Context.get(context, AttributeResolver);

      assert.strictEqual(shape.name, "attributeResolverFromRecord (decorated)");
      assert.isFalse(isPortDefault(attributeResolverPort, shape));
    }),
  );

  it.effect("W10: decoratePorts keeps the prototype of what the decorator returns (WR-03)", () =>
    Effect.gen(function* () {
      const context = yield* Layer.build(
        decoratePorts(portsLayer(), (_d, inner) => Object.create(inner)),
      );
      const shape = Context.get(context, AttributeResolver);

      assert.isFalse(Object.hasOwn(shape, "resolve"));
      assert.isTrue(isPortDefault(attributeResolverPort, shape));
      assert.isUndefined(yield* shape.resolve(makeSubjectId("alice"), "clearance"));
    }),
  );

  forEveryPort((d) =>
    it.effect(`${d.port}: decoratePorts keeps its default`, () =>
      Effect.gen(function* () {
        const context = yield* Layer.build(
          decoratePorts(portsLayer(), (e, inner) => e.make(`${inner.name ?? "?"} (decorated)`, e.invoke(inner))),
        );
        const shape = Context.get(context, d.service);

        assert.strictEqual(shape.name, `${d.none.name} (decorated)`);
        assert.isTrue(isPortDefault(d, shape));
      }),
    ),
  );
});
