/**
 * Answering a port's question for another process, and asking one: the two
 * transport-free halves of a remote port (ARCH-31, ADR-QD-NEXT).
 *
 * A client that re-checks a seeded decision (BEH-QD-151) needs its ports
 * answered by a server. Both halves are derived from each port's description
 * (`PortDescription.wire`), so one derivation serves five ports and any number
 * of hosts, and a sixth port is a compile error until it states its wire.
 *
 * - {@link answerRemotely} decodes a question, **refuses one about any subject
 *   but the session's**, checks the host's serving declaration, reads the port
 *   through `PortAccess.ts` like any other read, and replies with a closed
 *   {@link PortWireReply}. It never fails.
 * - {@link askRemotely} builds a port's Shape from any `send` and turns every
 *   non-answer into the port's **own** typed error, so a remote outage reaches
 *   the evaluator as an outage and denies like one — never as `"Unknown"`
 *   (INV-QD-006, INV-QD-NEXT).
 *
 * The **seam** is `send` on one side and the reply union on the other. An HTTP
 * route and client (`@qadi/http`) are one adapter at it; a Next server action
 * or a WebSocket would be another. Only `@qadi/http` speaks HTTP (ADR-QD-036).
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { CurrentSubject } from "./CurrentSubject.ts";
import { exceedsJsonDepth } from "./DecodeDepthGuard.ts";
import { foldPolicy, UNTRUSTED_DECODE_OPTIONS } from "./Policy.ts";
import type { Policy } from "./Policy.ts";
import { servePortRead } from "./PortAccess.ts";
import { nonePort } from "./PortDerivation.ts";
import type { PortName } from "./PortMetrics.ts";
import { PortWireReply, RemotePortError, RemotePortFailure } from "./PortWire.ts";
import { WIRE_MAX_DEPTH } from "./PortWireEncode.ts";
import { mapPorts, mergePorts } from "./Ports.ts";
import type { ArgsOf, DescriptionOf, ErrorOf, PortServices, PortTypes, ServiceOf, ShapeOf } from "./Ports.ts";

/**
 * What a host agrees to answer, port by port.
 *
 * A port that is not named is not served at all. Where a question is
 * open-ended and its answer is a value (an attribute) or a client-chosen
 * resource (a custom predicate), the allowlist is **required**: a host that
 * served any attribute name would serve `constructor` and `__proto__` too
 * (ARCH-31 C13). A relation or an event may be left open, because its answer is
 * a closed three-valued word that discloses no more than a policy tag does
 * (INV-QD-044). The signature port answers full `Signature` records — more than
 * evaluation reads — so serving it is an explicit one-member opt-in.
 */
export interface PortServing {
  readonly AttributeResolver?: { readonly attributes: ReadonlyArray<string> } | undefined;
  readonly RelationshipResolver?: { readonly relations?: ReadonlyArray<string> | undefined } | undefined;
  readonly DecisionHistory?: { readonly events?: ReadonlyArray<string> | undefined } | undefined;
  readonly CustomPredicate?: { readonly names: ReadonlyArray<string> } | undefined;
  readonly SignatureHistory?: { readonly signatures: "own-records" } | undefined;
}

/** The serving declaration of the one port named `K`. */
export type PortServingOf<K extends PortName> = NonNullable<PortServing[K]>;

/**
 * The names a declaration admits, or `undefined` when it leaves the port open.
 * Closed over `PortName`, so a sixth port without a row is TS2741.
 */
const ADMITTED: { readonly [K in PortName]: (serving: PortServingOf<K>) => ReadonlyArray<string> | undefined } = {
  AttributeResolver: (serving) => serving.attributes,
  RelationshipResolver: (serving) => serving.relations,
  DecisionHistory: (serving) => serving.events,
  CustomPredicate: (serving) => serving.names,
  SignatureHistory: () => undefined,
};

/**
 * Answers one port's question for another process, as JSON.
 *
 * In order: the question decodes (`Refused: Malformed`); it is about the
 * session's own subject — `CurrentSubject`, never a subject read from the body
 * (`Refused: SubjectMismatch`); the host's declaration admits it
 * (`Refused: NotServed`); the port is read through `servePortRead`, which opens
 * its span and counts it (`Unavailable` when the store fails); and the answer
 * has a JSON form (`Refused: Unencodable`). Only then is it `Answered`.
 *
 * **Never fails**, whatever the body or the store does, and puts no server
 * cause on the reply: an `Unavailable` or `Unencodable` outcome is logged once,
 * with the port and without the cause text or the value (INV-QD-044's
 * reasoning).
 */
export const answerRemotely = <K extends PortName>(d: DescriptionOf<K>, serving: PortServingOf<K>) =>
  Effect.fn("qadi.port.answerRemotely")(function* (
    body: unknown,
  ): Effect.fn.Return<PortWireReply, never, ServiceOf<PortTypes[K]> | CurrentSubject> {
    const subject = yield* CurrentSubject;
    const decoded = d.wire.decodeQuestion(body);
    if (Result.isFailure(decoded)) return { _tag: "Refused", reason: "Malformed" };
    if (decoded.success.subjectId !== subject.id) {
      return { _tag: "Refused", reason: "SubjectMismatch" };
    }
    const args = decoded.success.args(subject);
    const admitted = ADMITTED[d.port](serving);
    const asked = d.wire.asked(args);
    if (admitted !== undefined && (asked === undefined || !admitted.includes(asked))) {
      return { _tag: "Refused", reason: "NotServed" };
    }
    const answered = yield* Effect.result(servePortRead(d, ...args));
    if (Result.isFailure(answered)) {
      yield* Effect.logWarning("a served port read failed").pipe(
        Effect.annotateLogs({ "qadi.port": d.port }),
      );
      return { _tag: "Unavailable" };
    }
    const encoded = d.wire.encodeAnswer(answered.success);
    if (Result.isFailure(encoded)) {
      yield* Effect.logWarning("a served port answer has no JSON form").pipe(
        Effect.annotateLogs({ "qadi.port": d.port }),
      );
      return { _tag: "Refused", reason: "Unencodable" };
    }
    return { _tag: "Answered", answer: encoded.success };
  });

/**
 * A reply, read as the answer it carries or the failure it is.
 *
 * Hoisted `Match.type` (§5a): a reply is dispatched on every remote read, and
 * the arms close over nothing.
 */
const replyOutcome: (reply: PortWireReply) => Result.Result<Schema.Json, RemotePortFailure> =
  Match.type<PortWireReply>().pipe(
    Match.tagsExhaustive({
      Answered: (reply) => Result.succeed(reply.answer),
      Unavailable: () => Result.fail(RemotePortFailure.Unavailable()),
      Refused: (reply) => Result.fail(RemotePortFailure.Refused({ reason: reply.reason })),
    }),
  );

/** The port's own typed error, its `cause` a readable {@link RemotePortError}. */
const remoteFailure = <K extends PortName>(
  d: DescriptionOf<K>,
  args: ArgsOf<PortTypes[K]>,
  failure: RemotePortFailure,
): ErrorOf<PortTypes[K]> => d.failure(args, new RemotePortError({ failure }));

const decodeReply = Schema.decodeUnknownResult(PortWireReply, UNTRUSTED_DECODE_OPTIONS);

/**
 * Builds the port's Shape from any `send`.
 *
 * `send` carries one question to the answering side and brings back whatever
 * came back, or a {@link RemotePortFailure}. Every non-answer — an unencodable
 * question, a transport failure, an unreadable reply, an `Unavailable` or
 * `Refused` reply, an answer this port cannot decode — fails with **the port's
 * own typed error**, built by its description with the failure as its `cause`
 * (INV-QD-095). `"Unknown"` is therefore only ever an answer the serving port
 * gave.
 */
export const askRemotely = <K extends PortName>(
  d: DescriptionOf<K>,
  send: (question: Schema.Json) => Effect.Effect<unknown, RemotePortFailure>,
): ShapeOf<PortTypes[K]> =>
  d.make(`${d.port} (remote)`, (...args) =>
    Effect.gen(function* () {
      const question = d.wire.encodeQuestion(args);
      if (Result.isFailure(question)) {
        return yield* Effect.fail(
          remoteFailure(d, args, RemotePortFailure.Refused({ reason: "Unencodable" })),
        );
      }
      const raw = yield* send(question.success).pipe(
        Effect.mapError((failure) => remoteFailure(d, args, failure)),
      );
      const reply = exceedsJsonDepth(raw, WIRE_MAX_DEPTH)
        ? Result.fail("the reply nests deeper than the decode bound")
        : Result.mapError(decodeReply(raw), (error) => error.message);
      if (Result.isFailure(reply)) {
        return yield* Effect.fail(
          remoteFailure(d, args, RemotePortFailure.Undecodable({ message: reply.failure })),
        );
      }
      const outcome = replyOutcome(reply.success);
      if (Result.isFailure(outcome)) return yield* Effect.fail(remoteFailure(d, args, outcome.failure));
      const answer = d.wire.decodeAnswer(outcome.success);
      if (Result.isFailure(answer)) {
        return yield* Effect.fail(
          remoteFailure(d, args, RemotePortFailure.Undecodable({ message: answer.failure })),
        );
      }
      return answer.success;
    }),
  );

/**
 * The serving declaration a set of policies needs: every attribute, relation,
 * event and predicate name they ask a port about, and the signature port when
 * any of them asks it.
 *
 * What a host that serves "the questions this application's policies can ask"
 * wants, derived rather than listed by hand. A property test pins it: every
 * question `evaluate` puts to a port for a generated policy is admitted by
 * `servingFor([policy])`. A matcher's `subject(...)` ref reads the subject the
 * request already carries, never a port, so only a node's own names are
 * collected. Every port a policy can reach is named, with an empty allowlist
 * where it has no name to give.
 */
export const servingFor = (policies: Iterable<Policy>): PortServing => {
  const attributes = new Set<string>();
  const relations = new Set<string>();
  const events = new Set<string>();
  const names = new Set<string>();
  const signatures = new Set<string>();
  for (const policy of policies) {
    foldPolicy<void>(policy, (node) => {
      collectNames(node, { attributes, relations, events, names, signatures });
    });
  }
  return {
    AttributeResolver: { attributes: [...attributes].toSorted() },
    RelationshipResolver: { relations: [...relations].toSorted() },
    DecisionHistory: { events: [...events].toSorted() },
    CustomPredicate: { names: [...names].toSorted() },
    ...(signatures.size > 0 ? { SignatureHistory: { signatures: "own-records" as const } } : {}),
  };
};

interface Collector {
  readonly attributes: Set<string>;
  readonly relations: Set<string>;
  readonly events: Set<string>;
  readonly names: Set<string>;
  readonly signatures: Set<string>;
}

/**
 * What one policy node asks a port about, if anything.
 *
 * `Match.value` rather than a hoisted matcher (§5a): it runs once per node of a
 * policy set at start-up, never per request, and its arms close over the
 * collector.
 */
const collectNames: (node: Policy, into: Collector) => void = (node, into) =>
  Match.value(node).pipe(
    Match.tag("HasAttribute", (n) => void into.attributes.add(n.attribute)),
    Match.tag("HasRelationship", (n) => void into.relations.add(n.relation)),
    Match.tag("HasActed", "HasNotActed", (n) => void into.events.add(n.event)),
    Match.tag("HasCustom", (n) => void into.names.add(n.name)),
    Match.tag("HasSignature", () => void into.signatures.add("own-records")),
    Match.orElse(() => undefined),
  );

/**
 * The ports of a process that answers them remotely: each listed port is asked
 * through `send`, and every other port keeps its fail-closed default.
 *
 * `send` is told which port a question is for, because a transport routes per
 * port. The layer needs nothing, so a host provides it exactly where it would
 * provide `portsLayer`.
 */
export const remotePorts = (
  send: (port: PortName, question: Schema.Json) => Effect.Effect<unknown, RemotePortFailure>,
  ports: ReadonlyArray<PortName>,
): Layer.Layer<PortServices> =>
  mergePorts(
    mapPorts((d) =>
      ports.includes(d.port)
        ? Layer.succeed(d.service, askRemotely(d, (question) => send(d.port, question)))
        : nonePort(d),
    ),
  );
