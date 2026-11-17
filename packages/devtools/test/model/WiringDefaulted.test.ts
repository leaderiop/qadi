/**
 * Pins that a hand-written wrapper around a fail-closed default is reported by what it wraps,
 * not by what it is called.
 *
 * On the phase base `wiringReport` decided `defaulted` by parsing BEH-QD-196's
 * `"<inner> (<suffix>)"` display name (`isDefaultName`), so a wrapper that spread a default and
 * renamed itself was reported as a real adapter, and a fresh object named after a default was
 * reported as defaulted. ARCH-94 makes it a fact the default carries and a spread keeps; the
 * name is a display string and nothing reads it to decide (ADR-QD-160, D-04, D-09).
 *
 * Every row asserts its wrapper's name before `defaulted`, so a row that is red because the
 * wrapper was built wrong is told apart from the defect.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { AttributeResolver, AttributeResolverNone, forEveryPort, portsLayer } from "@qadi/core";
import type { DescriptionOf, PortName, PortTypes, ServiceOf } from "@qadi/core";
import { wiringReport } from "../../src/model/Wiring.ts";

/** A hand-written wrapper: spreads `inner`, renames it, forwards the call. */
const audited = <K extends PortName>(d: DescriptionOf<K>): Layer.Layer<ServiceOf<PortTypes[K]>> =>
  Layer.effect(
    d.service,
    Effect.gen(function* () {
      const inner = Context.get(yield* Layer.build(portsLayer()), d.service);
      const call = d.invoke(inner);
      return { ...inner, ...d.make(`audited ${d.port}`, (...args) => call(...args)) };
    }),
  );

describe("a hand-written wrapper around a fail-closed default (PFCT-02, D-09)", () => {
  forEveryPort((d) =>
    it.effect(`${d.port}: a spreading wrapper named audited ${d.port} reads defaulted`, () =>
      Effect.gen(function* () {
        const row = (yield* wiringReport).ports.find((p) => p.port === d.port);

        assert.strictEqual(row?.name, `audited ${d.port}`);
        assert.isTrue(row?.defaulted);
      }).pipe(Effect.provide(audited(d))),
    ),
  );

  it.effect("R6: an unnamed spreading wrapper around the default reads defaulted", () =>
    Effect.gen(function* () {
      const row = (yield* wiringReport).ports.find((p) => p.port === "AttributeResolver");

      assert.isUndefined(row?.name);
      assert.isTrue(row?.defaulted);
    }).pipe(
      Effect.provide(
        Layer.effect(
          AttributeResolver,
          Effect.gen(function* () {
            const inner = yield* AttributeResolver;
            return AttributeResolver.of({
              ...inner,
              name: undefined,
              resolve: (subjectId, attribute) => inner.resolve(subjectId, attribute),
            });
          }),
        ).pipe(Layer.provide(AttributeResolverNone)),
      ),
    ));

  it.effect("R7: a fresh object named after the default reads as a real adapter (D-04)", () =>
    Effect.gen(function* () {
      const row = (yield* wiringReport).ports.find((p) => p.port === "AttributeResolver");

      assert.strictEqual(row?.name, "AttributeResolverNone (audited)");
      assert.isFalse(row?.defaulted);
    }).pipe(
      Effect.provide(
        Layer.effect(
          AttributeResolver,
          Effect.gen(function* () {
            const inner = yield* AttributeResolver;
            return AttributeResolver.of({
              name: "AttributeResolverNone (audited)",
              resolve: (subjectId, attribute) => inner.resolve(subjectId, attribute),
            });
          }),
        ).pipe(Layer.provide(AttributeResolverNone)),
      ),
    ));
});
