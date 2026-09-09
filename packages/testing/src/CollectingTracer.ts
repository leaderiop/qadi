/**
 * A `Tracer` that replaces whatever is ambient and records every span it sees.
 *
 * `Tracer.Tracer` is a `Context.Reference`, so substituting it with
 * `Layer.succeed` is how a test captures every span an evaluation emits
 * without an exporter or a network (see the `observability` describe block in
 * `Evaluate.test.ts`, URS-QD-012). v4 deleted `TestTracer`, so this hand-roll
 * itself is justified — there is no upstream equivalent — but it existed five
 * times over before this file, one per call site, each an exact or
 * near-exact copy (`SubjectSet.test.ts`, `Evaluate.test.ts`,
 * `WhatIf.test.ts`, `PortCalls.test.ts`, and the port-calls feature steps).
 * This is the one implementation the other four now import.
 *
 * **Replaces rather than wraps.** Unlike `@qadi/devtools`'s
 * `collectPortCalls`, which reads the existing tracer first and delegates so
 * a host's own tracing survives, this one substitutes a brand-new
 * `Tracer.NativeSpan` for every span and never calls through to whatever was
 * there before. That is the behavior every site being consolidated here
 * already had, so this file changes where the code lives, not what it does.
 * A test that also needs to prove a host tracer is preserved builds its own
 * delegating tracer (see `PortCalls.test.ts`'s "the host's tracer still sees
 * every span") — this helper is deliberately not that.
 */
import * as Layer from "effect/Layer";
import * as Tracer from "effect/Tracer";

/**
 * Provide this anywhere the evaluations to be watched will run, and read
 * `spans` afterward for what it recorded.
 *
 * `spans` is a plain, caller-supplied array rather than a getter this
 * function owns: every site being consolidated here already declares its own
 * `Array<Tracer.Span>` and reads it back directly (`spans.find(...)`,
 * `spans.filter(...)`) after the effect under test completes, so taking the
 * array as a parameter keeps every call site's existing assertions unchanged.
 *
 * `Layer<never>`, not `Layer<Tracer.Tracer>` — the same reasoning
 * `@qadi/devtools`'s `collectPortCalls` documents for its own `layer`:
 * `Tracer.Tracer` is a `Context.Reference` with a default, so it is never an
 * unmet requirement and supplying one adds nothing to anybody's `R`.
 */
export const collectingTracer = (spans: Array<Tracer.Span>): Layer.Layer<never> =>
  Layer.succeed(
    Tracer.Tracer,
    Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options);
        spans.push(span);
        return span;
      },
    }),
  );
