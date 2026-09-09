import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Tracer from "effect/Tracer";
import { collectingTracer } from "../src/CollectingTracer.ts";

describe("collectingTracer", () => {
  it.effect("captures every span emitted while it is provided, in order", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* Effect.void.pipe(
        Effect.withSpan("first"),
        Effect.andThen(Effect.void.pipe(Effect.withSpan("second"))),
        Effect.provide(collectingTracer(spans)),
      );

      assert.deepStrictEqual(
        spans.map((s) => s.name),
        ["first", "second"],
      );
    }));

  it.effect("captures the attributes annotated on a span", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* Effect.annotateCurrentSpan({ "qadi.subject_id": "u1" }).pipe(
        Effect.withSpan("qadi.evaluate"),
        Effect.provide(collectingTracer(spans)),
      );

      const span = spans.find((s) => s.name === "qadi.evaluate");
      assert.isDefined(span);
      if (span === undefined) return;
      assert.deepStrictEqual(Object.fromEntries(span.attributes), {
        "qadi.subject_id": "u1",
      });
    }));

  it.effect("a fresh array passed to a second call collects independently", () =>
    Effect.gen(function* () {
      const spansA: Array<Tracer.Span> = [];
      const spansB: Array<Tracer.Span> = [];

      yield* Effect.void.pipe(Effect.withSpan("a"), Effect.provide(collectingTracer(spansA)));
      yield* Effect.void.pipe(Effect.withSpan("b"), Effect.provide(collectingTracer(spansB)));

      assert.deepStrictEqual(
        spansA.map((s) => s.name),
        ["a"],
      );
      assert.deepStrictEqual(
        spansB.map((s) => s.name),
        ["b"],
      );
    }));
});
