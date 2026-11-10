/**
 * Record what real resolvers answered, so a sweep can be run against it.
 *
 * The point is arithmetic. A what-if sweep runs one evaluation per edit, so a
 * subject with six grants is seven evaluations from one click — seven times the
 * lookups, against whatever store is behind the ports. Capturing once and
 * replaying six times is the same information for one round of I/O, and it is
 * the reason `LiveSource` is defensible at all rather than merely available.
 *
 * **A capture records answers, not calls.** `@qadi/core`'s `recordingPort`
 * records each request, which answers "was this consulted" and cannot answer
 * "with what". This records the pair, including failures, so a replay
 * reproduces an outage as an outage rather than as a miss.
 *
 * The fidelity of that reproduction is an agreement property in the family of
 * [INV-QD-018](../../../../spec/invariants.md) and INV-QD-038 — two paths
 * answering one question — and it is stated as
 * [INV-QD-043](../../../../spec/invariants.md) rather than assumed.
 */
import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Record from "effect/Record";
import * as Result from "effect/Result";
import {
  PortReply,
  decoratePorts,
  describeKeyRefusal,
  forEveryPort,
  mergePorts,
  scriptedPort,
  tabulatePorts,
} from "@qadi/core";
import type { AnswerOf, PortName, PortTypes } from "@qadi/core";
import type { EvaluationPorts } from "./SimulationInput.ts";

/**
 * One answer, as it was given.
 *
 * A closed union rather than a value beside an optional error: exactly one of
 * the two happened, and a shape admitting both or neither would put a "cannot
 * happen" branch in every replay.
 */
export type Answer<A> =
  | { readonly _tag: "Answered"; readonly value: A }
  | { readonly _tag: "Broke"; readonly message: string };

/**
 * Every answer a capture saw, per port, keyed by that port's request key.
 *
 * The keys are the text of each description's `key`. A request with no key
 * (a `KeyRefusal`: a cycle, a function, a class instance among its arguments)
 * is never captured, and always fails on replay.
 *
 * Keyed by **port name** and by each port's own description's `key`
 * (`@qadi/core`'s `PortDescription`), so the capture and the replay agree
 * about a key by construction rather than by calling the same hand-written
 * function from both sides — and so a port added to `@qadi/core`'s registry
 * is captured and replayed with no edit here. Every key is injective over
 * the request the port received (ADR-QD-094), so a capture taken for `alice`
 * does not answer a question asked about `bob`, nor about `alice` after her
 * `editor` role was dropped, nor about another resource or relationship depth
 * — the axes a what-if sweep and a session edit vary.
 */
export type CapturedAnswers = {
  readonly [K in PortName]: ReadonlyMap<string, Answer<AnswerOf<PortTypes[K]>>>;
};

/** The same, as the maps a running capture writes into. */
type CaptureMaps = { readonly [K in PortName]: Map<string, Answer<AnswerOf<PortTypes[K]>>> };

const freshMaps = (): CaptureMaps => tabulatePorts<CaptureMaps>(() => new Map());

export const emptyAnswers: CapturedAnswers = freshMaps();

/** How many answers a capture holds, for a panel that wants to say so. */
export const answerCount = (self: CapturedAnswers): number =>
  Record.values(self).reduce((total, answers) => total + answers.size, 0);

/**
 * Wraps live ports so every answer they give is recorded.
 *
 * Built on `@qadi/core`'s `decoratePorts`, which builds `ports` **once** and
 * derives every decorated service from that one context: five independent
 * `Layer.effect` blocks each building `ports` would not share a `MemoMap`, so
 * a `ports` layer with a side effect at construction (opening a connection)
 * would run it once per port for what is a single capture pass.
 *
 * State lives in this function's closure rather than the layer's, so `answers`
 * can read what the layer wrote — the same arrangement a decision log uses,
 * and the reason providing the returned layer twice shares one capture.
 */
export const capturing = (
  ports: Layer.Layer<EvaluationPorts>,
): {
  readonly layer: Layer.Layer<EvaluationPorts>;
  readonly answers: Effect.Effect<CapturedAnswers>;
} => {
  const maps = freshMaps();

  const layer = decoratePorts(ports, (d, inner) => {
    const call = d.invoke(inner);
    // A request with no key is passed through unrecorded: capturing never
    // changes what the live port answers, and a replay fails it on its own.
    return d.make(`${inner.name ?? "?"} (capturing)`, (...args) =>
      Result.match(d.key(args), {
        onSuccess: (key) => record(maps[d.port], key, call(...args)),
        onFailure: () => call(...args),
      }),
    );
  });

  return {
    layer,
    // Copied on read, so a caller holding a snapshot is not handed a map that
    // keeps changing under a later capture.
    answers: Effect.sync(() => {
      const copy = freshMaps();
      forEveryPort((d) => {
        for (const [key, answer] of maps[d.port]) copy[d.port].set(key, answer);
      });
      return copy;
    }),
  };
};

/**
 * Runs one call, stores what it answered, and hands the answer on unchanged.
 *
 * `tapError` rather than `catchAll`: a capture must **observe** a failure
 * without absorbing it. The live run being wrapped still has to fail the way it
 * would have, or the capture would be a capture of something that did not
 * happen.
 */
const record = <A, E>(
  into: Map<string, Answer<A>>,
  key: string,
  call: Effect.Effect<A, E>,
): Effect.Effect<A, E> =>
  call.pipe(
    Effect.tap((value) => Effect.sync(() => into.set(key, { _tag: "Answered", value }))),
    Effect.tapError((error) =>
      Effect.sync(() => into.set(key, { _tag: "Broke", message: renderError(error) })),
    ),
  );

/**
 * The part of a port failure worth keeping.
 *
 * `String(error)` alone is nearly useless here: every port error is a
 * `Data.TaggedError`, so it stringifies to its tag — `"AttributeResolveError"` —
 * and the `cause` a resolver actually reported is dropped. A replay
 * reconstructs the error *class* from which port it was, so the class is
 * already known and the cause is the only thing a capture has to carry.
 *
 * A message string, not the cause itself: on the record wire a `cause` crosses
 * through `Schema.Defect()` (ADR-QD-060), but a capture has no wire to
 * survive, and a replay rebuilds the error class from the port, so the message
 * is all it needs. A cause is `unknown`, so it may be an `Error`, a plain
 * object, or something that cannot be stringified at all.
 */
const renderError = (error: unknown): string => {
  const cause = Predicate.hasProperty(error, "cause") ? error.cause : undefined;
  if (cause === undefined) return String(error);
  if (cause instanceof Error) return cause.message;
  try {
    return String(cause);
  } catch {
    return "<unrenderable cause>";
  }
};

/**
 * Ports whose unseen request is an outage rather than the `none` answer.
 *
 * A closed table over {@link PortName}, so a port added to `@qadi/core`'s
 * registry is a compile error here until someone decides which it is. `true`
 * is the decision that a miss is **not safe to answer with the port's empty
 * answer**: the request key carries something the capture cannot recover from
 * what it holds. `SignatureHistory` is that port. Its key includes the asker's
 * `meaning` and `signerRole`, which a store receives and answers whatever they
 * say (ADR-QD-109), so a what-if that edits either asks a request the capture
 * never saw while the real store would have answered it. Answering `none` there
 * would claim the subject has no signatures on file, a claim nobody made, and
 * `not(hasSignature(...))` grants on it.
 *
 * Not re-keyed by `(subject, resource)` instead: a store may filter on the
 * requirement, and a capture that dropped it from the key would replay one
 * requirement's answer for another, in the direction that allows.
 */
const UNSEEN_REQUEST_IS_AN_OUTAGE: { readonly [K in PortName]: boolean } = {
  AttributeResolver: false,
  RelationshipResolver: false,
  CustomPredicate: false,
  DecisionHistory: false,
  SignatureHistory: true,
};

/**
 * The reply for a request the capture never saw: the port's own typed error for
 * a port in {@link UNSEEN_REQUEST_IS_AN_OUTAGE}, and `undefined` otherwise, which
 * `scriptedPort` answers with the description's `none`.
 */
const unseenReply = (port: PortName): PortReply<never> | undefined =>
  UNSEEN_REQUEST_IS_AN_OUTAGE[port]
    ? PortReply.fail(`the capture holds no answer for this ${port} request (not captured)`)
    : undefined;

/**
 * Ports that answer from a capture.
 *
 * Each port is `@qadi/core`'s `scriptedPort` over its own description, named
 * `"snapshot"`: a captured answer is replayed as an answer, a captured outage
 * as the port's own typed error (built by the description's `failure` from the
 * captured message), and **a query the capture never saw answers the
 * fail-closed default** — the description's `none` answer, not an invented
 * value: `undefined` for an attribute, `Unknown` for a relationship and for
 * history, `false` for a custom predicate. That is exactly what a real
 * deployment gets from an unwired port
 * ([INV-QD-007](../../../../spec/invariants.md)), so a what-if that wanders
 * outside the captured set answers as a misconfigured deployment would, rather
 * than for a reason peculiar to this panel. The defaults used to be re-declared
 * here by hand, with a comment asking that they never diverge from the real
 * ones (ARCH-10 E14); they are now the same value.
 *
 * **A request with no key fails** with the port's own typed error, naming why
 * it has none: the capture could not have recorded it, so the replay cannot
 * know what was answered.
 *
 * **One port is the exception: `SignatureHistory`'s unseen request fails** with
 * `SignatureHistoryUnavailable` (see {@link UNSEEN_REQUEST_IS_AN_OUTAGE}), so
 * a what-if that edits a `hasSignature` node's `meaning` or `signerRole`
 * reports a failure rather than a verdict, under the node and under `not(...)`
 * of it alike. Note what the default's "deny" does and does not buy: a leaf that
 * denies makes `not(leaf)` allow, so the other four ports' misses are safe only
 * for an un-negated leaf (INV-QD-043).
 */
export const replayLayer = (answers: CapturedAnswers): Layer.Layer<EvaluationPorts> =>
  mergePorts(
    tabulatePorts(
      (d) =>
        scriptedPort(
          d,
          (...args) =>
            Result.match(d.key(args), {
              onSuccess: (key) => replyOf(answers[d.port].get(key)) ?? unseenReply(d.port),
              onFailure: (refusal) =>
                PortReply.fail(`this ${d.port} request cannot be keyed: ${describeKeyRefusal(refusal)}`),
            }),
          "snapshot",
        ).layer,
    ),
  );

/**
 * A captured answer as a scripted reply. An outage replays as an outage:
 * turning a captured failure into a miss would make a snapshot *disagree* with
 * the run that produced it, which is exactly what INV-QD-043 forbids.
 */
const replyOf = <A>(captured: Answer<A> | undefined): PortReply<A> | undefined => {
  if (captured === undefined) return undefined;
  return captured._tag === "Answered"
    ? PortReply.answer(captured.value)
    : PortReply.fail(captured.message);
};
