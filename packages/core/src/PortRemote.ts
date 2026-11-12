/**
 * Answering a port's question for another process, and asking one: the two
 * transport-free halves of a remote port (ARCH-31, ADR-QD-107).
 *
 * A client that re-checks a seeded decision (BEH-QD-151) needs its ports
 * answered by a server. Both halves are derived from each port's description
 * (`PortDescription.wire`), so one derivation serves five ports and any number
 * of hosts, and a sixth port is a compile error until it states its wire.
 *
 * - {@link answerRemotely} decodes a question, **refuses one about any subject
 *   but the session's**, checks the host's serving declaration through the
 *   port's own `serving` facet (`PortServing.ts`), reads the port through
 *   `PortAccess.ts` like any other read, and replies with a closed
 *   {@link PortWireReply}. It never fails.
 * - {@link askRemotely} builds a port's Shape from any `send` and turns every
 *   non-answer into the port's **own** typed error, so a remote outage reaches
 *   the evaluator as an outage and denies like one — never as `"Unknown"`
 *   (INV-QD-006, INV-QD-241).
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
import { anonymous } from "./AuthSubject.ts";
import { CurrentSubject } from "./CurrentSubject.ts";
import { foldPolicy } from "./Policy.ts";
import type { Policy } from "./Policy.ts";
import { servePortRead } from "./PortAccess.ts";
import { nonePort } from "./PortDerivation.ts";
import type { LeafOf, ReadSite } from "./PortDescription.ts";
import type { PortName } from "./PortName.ts";
import type { PortServing, PortServingOf } from "./PortServing.ts";
import { PortWireReply, RemotePortError, RemotePortFailure } from "./PortWire.ts";
import { undecodableMessage } from "./PortWireEncode.ts";
import { untrustedDecoder } from "./UntrustedDecode.ts";
import { forEveryPort, mergePorts, tabulatePorts } from "./Ports.ts";
import type { ArgsOf, DescriptionOf, ErrorOf, PortServices, PortTypes, ServiceOf, ShapeOf } from "./Ports.ts";

/**
 * Answers one port's question for another process, as JSON.
 *
 * In order: the question decodes (`Refused: Malformed`); it is about the
 * session's own subject — `CurrentSubject`, never a subject read from the body
 * (`Refused: SubjectMismatch`); the host's declaration admits it, checked
 * through the port's own `serving` facet (`Refused: NotServed`); the port is
 * read through `servePortRead`, which opens its span and counts it
 * (`Unavailable` when the store fails); and the answer has a JSON form
 * (`Refused: Unencodable`). Only then is it `Answered`.
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
    const admitted = d.serving.admitted(serving);
    const asked = d.serving.asked(args);
    // The facet's own word decides what a missing list means: `"required"` is
    // fail-closed, so a declaration that reaches here without its list (loaded
    // from JSON, or built by a caller the type checker does not see) serves
    // nothing, and a value that is not a list never gets `String#includes`'s
    // substring semantics. Only an `"open"` port reads a missing list as open.
    const notServed = Array.isArray(admitted)
      ? asked === undefined || !admitted.includes(asked)
      : admitted !== undefined || d.serving.allowlist === "required";
    if (notServed) {
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

const replyDecoder = untrustedDecoder(PortWireReply);

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
      const reply = Result.mapError(replyDecoder.decode(raw), (refused) =>
        undecodableMessage(refused)("reply"),
      );
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
 * The site `servingFor` reads each leaf's request at: the library's own
 * "no particular subject" (`anonymous`) asking about no resource.
 *
 * A `Resource`-scoped leaf at it yields exactly the request a read with no
 * resource id annotates before it fails, so `servingFor` builds no request
 * shape evaluation does not. The name a leaf asks cannot depend on the site (the
 * law in `PortRemote.test.ts`), which is what makes one site enough.
 */
const SERVING_SITE: ReadSite = { subject: anonymous, resource: undefined };

/**
 * The name `leaf` asks the port `d` describes, when the port reads this tag at
 * all, and whether it does.
 *
 * The name is `asked` of the request `d.asks` builds at {@link SERVING_SITE}: the
 * same request a read of the leaf puts to the port, so what is served and what
 * is read are one statement (ARCH-70, ADR-QD-134). Typed through {@link LeafOf}
 * rather than `Extract<Policy, …>` so the entry stored under `tag` is applied to
 * a node of exactly that tag.
 */
const askedOf = <K extends PortName, T extends Policy["_tag"]>(
  d: DescriptionOf<K>,
  tag: T,
  leaf: LeafOf[T],
): { readonly asked: boolean; readonly name: string | undefined } => {
  const ask = d.asks[tag];
  return ask === undefined
    ? { asked: false, name: undefined }
    : { asked: true, name: d.serving.asked(ask(leaf, SERVING_SITE)) };
};

/**
 * The serving declaration a set of policies needs: every attribute, relation,
 * event and predicate name they ask a port about, and the signature port when
 * any of them asks it.
 *
 * What a host that serves "the questions this application's policies can ask"
 * wants, derived rather than listed by hand. The name a leaf asks is `asked` of
 * the request each port's `asks` builds for it (the one statement of leaf to
 * request, ARCH-70), read as an anonymous subject asking about no resource, so a
 * new port-reading leaf is one entry in one description and nothing here
 * changes. A property test pins it: every question `evaluate` puts to a port for
 * a generated policy is admitted by `servingFor([policy])`, and a law test pins
 * that a leaf's name is the same at every site. A matcher's `subject(...)` ref
 * reads the subject the request already carries, never a port, so only a node's
 * own names are collected. Every port a policy can reach is named, with an empty
 * allowlist where it has no name to give; an opt-in port with nothing asked
 * contributes no member at all.
 *
 * Runs once per node at start-up, never per request, which is why folding every
 * node past every port is fine.
 */
export const servingFor = (policies: Iterable<Policy>): PortServing => {
  const heard = tabulatePorts<{
    readonly [K in PortName]: { readonly names: Set<string>; asked: boolean };
  }>(() => ({ names: new Set(), asked: false }));
  for (const policy of policies) {
    foldPolicy<void>(policy, (node) => {
      forEveryPort((d) => {
        const { asked, name } = askedOf(d, node._tag, node);
        if (asked) heard[d.port].asked = true;
        if (name !== undefined) heard[d.port].names.add(name);
      });
    });
  }
  return forEveryPort((d): PortServing =>
    d.serving.declare({ names: [...heard[d.port].names].toSorted(), asked: heard[d.port].asked }),
  ).reduce<PortServing>((all, part) => ({ ...all, ...part }), {});
};

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
    tabulatePorts((d) =>
      ports.includes(d.port)
        ? Layer.succeed(d.service, askRemotely(d, (question) => send(d.port, question)))
        : nonePort(d),
    ),
  );
