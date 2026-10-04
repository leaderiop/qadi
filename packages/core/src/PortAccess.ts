/**
 * Every port read either interpreter makes, with its question, span, call
 * metric and defect mapping.
 *
 * `evaluate` and `toPredicate` are two interpreters over one policy tree
 * (ADR-QD-024). Before this module they agreed about *how to ask a port* only by
 * convention: the evaluator read each port through a traced, counted,
 * defect-mapped wrapper and the translator re-implemented two of those reads
 * bare, so a port that threw reached `toPredicate`'s caller as a defect while the
 * same port reached `evaluate`'s caller as a typed error (issue #100, and
 * ARCH-01's E4/E6). Each read lives here once, and each interpreter keeps only
 * what is genuinely its own: what to do with the answer.
 *
 * Deliberately out of the barrel (AGENTS.md §9): scaffolding shared by the two
 * interpreters, like `RetryingLayer.ts`, reachable only through the `./*`
 * subpath.
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";

/**
 * Converts a port call's defect into its own typed error, leaving an
 * already-typed failure — or an interruption — to pass through unchanged.
 *
 * A port's declared error channel (`AttributeResolveError`, and its four
 * siblings) is a promise about what a *failure* looks like; nothing in that
 * promise said what happens when an adapter throws instead of failing, so a
 * defecting port sailed straight past `Effect.retry` (which only ever sees typed
 * errors) and reached `@qadi/http` as a bare 500 instead of the taxonomy's 502
 * (issue #100). Wrapping every port read in this module with this closes that gap
 * without changing what a well-behaved port already promised.
 *
 * Only a genuine defect is rewritten:
 * - `Cause.hasFails` — the port already failed with its declared error —
 *   passes through via `Effect.failCause`, unchanged, rather than being
 *   wrapped a second time. `retry`, `catchTag`, and everything downstream
 *   must keep seeing exactly the value the port raised.
 * - a cause with no `Fail` reason at all (a pure interruption, or an empty
 *   cause) also passes through unchanged: converting an interruption into an
 *   ordinary typed failure would let a caller's `Effect.retry` retry work
 *   that was deliberately cancelled — worse than the defect this function
 *   exists to catch, and not what "an authorization decision must never
 *   become a defect" (AGENTS.md §4) asks for.
 * - only a cause carrying a `Die` and no `Fail` becomes `onDefect(cause)`.
 *
 * Mirrors `DecisionSinkForwarding.ts`'s `Effect.catchCause` in spirit — a
 * port adapter can die as easily as `send` can — but where that swallows
 * every cause into `void`, a port call must still fail with something a
 * caller's `Effect.retry` can see, so a defect becomes the port's own typed
 * error instead of being silently absorbed.
 */
export const catchPortDefect =
  <E>(onDefect: (cause: Cause.Cause<E>) => E) =>
  <A, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    effect.pipe(
      Effect.catchCause((cause) =>
        Cause.hasFails(cause) || !Cause.hasDies(cause)
          ? Effect.failCause(cause)
          : Effect.fail(onDefect(cause)),
      ),
    );
