/**
 * Test doubles for any port, derived from its description: a scripted port
 * that answers, fails, dies or throws per request, and a recording decorator
 * that observes a real one.
 *
 * Core's own tests cannot import `@qadi/testing` (which depends on core), so
 * they hand-rolled a failing layer per test — 65 of them across 27 files, plus
 * 19 that died or threw (ARCH-10 E8) — while `@qadi/testing` kept a failing,
 * recording or fixture module per port (E7). One scripted double per
 * description covers all of them: an always-failing port is
 * `scriptedPort(attributeResolverPort, () => PortReply.fail("down"))`, a
 * per-key failure is a `replyTable`, and the call log is the typed request
 * tuples rather than a hand-formatted string.
 */
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import type * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as MutableRef from "effect/MutableRef";
import type { PortDescription, PortReply, PortScript, PortShape } from "./PortDescription.ts";
import { wrapPort } from "./PortDerivation.ts";
import type { PortName } from "./PortMetrics.ts";

/** A double's layer and the requests it has received. */
export interface PortDouble<Self, Args extends ReadonlyArray<unknown>> {
  readonly layer: Layer.Layer<Self>;
  /** Every request so far, in order. Live — reflects calls made after it is first read. */
  readonly calls: ReadonlyArray<Args>;
}

/**
 * A port that answers from `script`.
 *
 * Each call is logged, then `script` is consulted **synchronously, at the
 * call** — so a `Throw` reply throws from the method body, as a careless
 * adapter would, and a retrying wrapper (which re-invokes the method on every
 * attempt) consults the script once per attempt. A request the script leaves
 * `undefined` answers the description's `none.answer`, the fail-closed
 * default. Named `"scripted <port>"` unless `name` says otherwise.
 */
export const scriptedPort = <
  N extends PortName,
  Self,
  Shape extends PortShape,
  Args extends ReadonlyArray<unknown>,
  A,
  E,
>(
  d: PortDescription<N, Self, Shape, Args, A, E>,
  script: PortScript<NoInfer<Args>, NoInfer<A>>,
  name: string = `scripted ${d.port}`,
): PortDouble<Self, Args> => {
  const log = MutableRef.make<ReadonlyArray<Args>>(Arr.empty());
  const unscripted: Effect.Effect<A, E> = Effect.succeed(d.none.answer);
  // `NoInfer` on `script`/`entries`/`observe`: the description alone decides
  // `Args` and `A`, so a script written `() => …` is not read as a port that
  // takes no arguments.
  // Built once per double, not per call (AGENTS.md §5a): each arm returns the
  // reply's effect as a function of the request it answers.
  const replyWith: (reply: PortReply<A>) => (args: Args) => Effect.Effect<A, E> = Match.type<
    PortReply<A>
  >().pipe(
    Match.tagsExhaustive({
      Answer: (reply) => () => Effect.succeed(reply.value),
      Fail: (reply) => (args: Args) => Effect.fail(d.failure(args, reply.cause)),
      Die: (reply) => () => Effect.die(reply.defect),
      Throw: (reply) => (): Effect.Effect<A, E> => {
        throw reply.error;
      },
    }),
  );
  return {
    layer: Layer.succeed(
      d.service,
      d.make(name, (...args) => {
        MutableRef.update(log, (calls) => Arr.append(calls, args));
        const reply = script(...args);
        return reply === undefined ? unscripted : replyWith(reply)(args);
      }),
    ),
    get calls() {
      return MutableRef.get(log);
    },
  };
};

/**
 * A script that replies from a table of requests, keyed by the description's
 * `key` — so two requests that differ only in a field the key ignores share a
 * reply, exactly as a capture and its replay do. A request not in the table
 * falls through to the fail-closed default.
 */
export const replyTable = <
  N extends PortName,
  Self,
  Shape extends PortShape,
  Args extends ReadonlyArray<unknown>,
  A,
  E,
>(
  d: PortDescription<N, Self, Shape, Args, A, E>,
  entries: ReadonlyArray<readonly [NoInfer<Args>, PortReply<NoInfer<A>>]>,
): PortScript<Args, A> => {
  const table = new Map(entries.map(([args, reply]) => [d.key(args), reply] as const));
  return (...args) => table.get(d.key(args));
};

/**
 * Wraps `layer`'s port so every request is logged and every settled call is
 * reported to `observe` — the exit passed through unchanged. A recording must
 * observe a failure without absorbing it, or it would be a recording of
 * something that did not happen. Named `"<inner> (recording)"`.
 */
export const recordingPort = <
  N extends PortName,
  Self,
  Shape extends PortShape,
  Args extends ReadonlyArray<unknown>,
  A,
  E,
>(
  d: PortDescription<N, Self, Shape, Args, A, E>,
  layer: Layer.Layer<Self>,
  observe: (args: NoInfer<Args>, exit: Exit.Exit<NoInfer<A>, NoInfer<E>>) => void = () => {},
): PortDouble<Self, Args> => {
  const log = MutableRef.make<ReadonlyArray<Args>>(Arr.empty());
  return {
    layer: wrapPort(d, layer, "recording", (call) => (...args) =>
      Effect.suspend(() => {
        MutableRef.update(log, (calls) => Arr.append(calls, args));
        return call(...args);
      }).pipe(Effect.onExit((exit) => Effect.sync(() => observe(args, exit)))),
    ),
    get calls() {
      return MutableRef.get(log);
    },
  };
};
