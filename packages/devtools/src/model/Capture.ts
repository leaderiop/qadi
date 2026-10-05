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
import {
  PortReply,
  decoratePorts,
  forEveryPort,
  mapPorts,
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
 * Keyed by **port name** and by each port's own description's `key`
 * (`@qadi/core`'s `PortDescription`), so the capture and the replay agree
 * about a key by construction rather than by calling the same hand-written
 * function from both sides — and so a port added to `@qadi/core`'s registry
 * is captured and replayed with no edit here. Every key includes the
 * **subject**, the axis a what-if sweep varies: a capture taken for `alice`
 * must not answer a question asked about `bob` after her `editor` role was
 * dropped. A relationship is keyed by `(subjectId, relation, resourceId)`,
 * never by relation alone; history by `(subjectId, event, resourceId?)` so
 * "ever, at all" stays distinct; a custom predicate by
 * `(subjectId, name, params)` — not by the resource, which is arbitrary
 * caller data, so a capture taken against more than one resource per triple
 * would collapse onto one answer (a simulation fixes one resource for its
 * duration, so this does not arise in practice).
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
 * can read what the layer wrote — the same arrangement `decisionSinkRing` uses,
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
    return d.make(`${inner.name ?? "?"} (capturing)`, (...args) =>
      record(maps[d.port], d.key(args), call(...args)),
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
 * Ports that answer from a capture.
 *
 * Each port is `@qadi/core`'s `scriptedPort` over its own description, named
 * `"snapshot"`: a captured answer is replayed as an answer, a captured outage
 * as the port's own typed error (built by the description's `failure` from the
 * captured message), and **a query the capture never saw answers the
 * fail-closed default** — the description's `none` answer, not an invented
 * value: `undefined` for an attribute, `Unknown` for a relationship and for
 * history, `false` for a custom predicate, no signatures. That is exactly what
 * a real deployment gets from an unwired port
 * ([INV-QD-007](../../../../spec/invariants.md)), so a what-if that wanders
 * outside the captured set denies for the reason a misconfigured deployment
 * would, rather than for a reason peculiar to this panel. The defaults used to
 * be re-declared here by hand, with a comment asking that they never diverge
 * from the real ones (ARCH-10 E14); they are now the same value.
 */
export const replayLayer = (answers: CapturedAnswers): Layer.Layer<EvaluationPorts> =>
  mergePorts(
    mapPorts(
      (d) =>
        scriptedPort(d, (...args) => replyOf(answers[d.port].get(d.key(args))), "snapshot").layer,
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
