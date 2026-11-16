/**
 * Pins that a port's fail-closed default is a fact its service carries, not a name a reader parses.
 *
 * ARCH-94: devtools read `defaulted` from BEH-QD-196's `"<inner> (<suffix>)"` display name, so a
 * wrapper that spread a default and renamed itself hid it. `nonePort` now sets a mark on the
 * default it builds (an own, symbol-keyed property naming its port), every derived wrapper and
 * `decoratePorts` copy it from what they wrap, and `isPortDefault` reads it, own properties only.
 * The mark is package-private: nothing outside core can mint it, so a wrapper keeps it only by
 * spreading `...inner`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolver,
  attributeResolverFromRecord,
  attributeResolverPort,
} from "../src/AttributeResolver.ts";
import { isPortDefault, PortReply } from "../src/PortDescription.ts";
import type { PortName } from "../src/PortName.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import { forEveryPort, portsLayer } from "../src/Ports.ts";
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
