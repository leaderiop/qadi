/**
 * What a port's question and answer look like on a wire, and the closed
 * vocabulary two processes use to talk about one.
 *
 * A host that re-checks a seeded decision in the browser (BEH-QD-151) needs the
 * ports answered by a server. Every such host wrote both halves by hand — query
 * parsing, answer guards restating core's literal sets, and an outage mapping
 * the example got wrong on two of three ports, so a store outage became a
 * denial and, under `not(...)`, a grant (ARCH-31). A port's description now
 * states its wire once, beside its span (`PortDescription.wire`, ADR-QD-094),
 * and `answerRemotely` / `askRemotely` (`PortRemote.ts`) derive both halves
 * from it, transport-free.
 *
 * The wire is **not** the span. A span field is a `SpanValue` and cannot hold
 * an attribute's value (INV-QD-044); the wire carries it, to the session's own
 * subject, and a span never does.
 */
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import type * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type { AuthSubject } from "./AuthSubject.ts";
import type { SubjectId } from "./Identity.ts";
import type { SpanValue } from "./PortSpan.ts";

/**
 * Why a served question was not answered at all — not a failure of the store.
 *
 * Closed, so a status table or a reporter over it is a compile error away from
 * a new reason (ADR-QD-NEXT).
 *
 * - `SubjectMismatch`: the question names a subject other than the session's.
 * - `Malformed`: the question does not decode, or nests past the decode bound.
 * - `NotServed`: the host's serving declaration does not admit the question.
 * - `Unencodable`: the store answered with a value that has no JSON form.
 */
export const PortWireRefusal = Schema.Literals([
  "SubjectMismatch",
  "Malformed",
  "NotServed",
  "Unencodable",
]);

export type PortWireRefusal = typeof PortWireRefusal.Type;

/**
 * What the answering side says, as JSON.
 *
 * `Answered` carries the port's own answer, so `"Unknown"` crosses only as an
 * answer the serving port gave. `Unavailable` is an outage — the store failed
 * or died — and carries **nothing**: a server's `cause` never crosses to a
 * client (`QadiHttpError.ts`'s precedent, ADR-QD-072). `Refused` is a question
 * that was not asked of the store.
 */
export const PortWireReply = Schema.Union([
  Schema.TaggedStruct("Answered", { answer: Schema.Json }),
  Schema.TaggedStruct("Unavailable", {}),
  Schema.TaggedStruct("Refused", { reason: PortWireRefusal }),
]);

export type PortWireReply = typeof PortWireReply.Type;

/**
 * Why an asker could not get an answer, as the `cause` of the port's own typed
 * error.
 *
 * A `Data.TaggedEnum`, not a `Schema.TaggedError`: it is a client-side cause
 * and no codec decodes it (AGENTS.md §4). The asker fails with
 * `d.failure(args, RemotePortFailure.X)`, so a remote outage reaches the
 * evaluator as the same error a local outage does and denies like one
 * (INV-QD-006), never as `"Unknown"`.
 *
 * - `Unavailable`: the answering side's store failed.
 * - `Refused`: the answering side did not ask its store.
 * - `Transport`: no reply came back at all.
 * - `Undecodable`: a reply came back that is not a reply this port can read.
 */
export type RemotePortFailure = Data.TaggedEnum<{
  Unavailable: {};
  Refused: { readonly reason: PortWireRefusal };
  Transport: { readonly message: string };
  Undecodable: { readonly message: string };
}>;

/** Constructors and guards for {@link RemotePortFailure}. */
export const RemotePortFailure = Data.taggedEnum<RemotePortFailure>();

/**
 * One sentence for a {@link RemotePortFailure}, naming its tag and, for a
 * refusal, its reason.
 *
 * What `RemotePortError.message` says, and so what a port whose error has no
 * `cause` field (`CustomPredicateError`) renders into its `reason`: a bare
 * enum would render as `[object Object]` there.
 */
export const describeRemotePortFailure: (self: RemotePortFailure) => string =
  Match.type<RemotePortFailure>().pipe(
    Match.tagsExhaustive({
      Unavailable: () => "Unavailable: the answering side's store did not answer",
      Refused: (failure) => `Refused (${failure.reason}): the answering side did not ask its store`,
      Transport: (failure) => `Transport: no reply came back (${failure.message})`,
      Undecodable: (failure) => `Undecodable: the reply is not one this port can read (${failure.message})`,
    }),
  );

/**
 * The `cause` a remote port's typed error carries: a {@link RemotePortFailure}
 * with a readable message.
 *
 * An `Error`, so every port's `failure` renders it — `AttributeResolveError`
 * keeps it as `cause`, `CustomPredicateError` renders its `message` into
 * `reason` — and a log of the chain says what happened. It never carries the
 * answering side's own cause (ADR-QD-072): the failure is the closed enum.
 */
export class RemotePortError extends Data.TaggedError("RemotePortError")<{
  readonly failure: RemotePortFailure;
}> {
  override get message(): string {
    return describeRemotePortFailure(this.failure);
  }
}

/**
 * A question read off the wire, before it is bound to a session.
 *
 * `args` takes the subject because the wire carries only the subject's **id**:
 * the answering side builds the port's request with the session's own subject,
 * so a custom predicate is handed the session's roles and attributes, never a
 * client's description of them.
 */
export interface DecodedQuestion<Args extends ReadonlyArray<unknown>> {
  readonly subjectId: SubjectId;
  readonly args: (subject: AuthSubject) => Args;
}

/**
 * The attributes of a span, as a plain table: what a wire projects a question
 * or an answer into, for `PortAccess.ts` to encode through the port's own span
 * struct.
 */
export type PortWireSpan = { readonly [prop: string]: SpanValue | undefined };

/**
 * One port's wire: encode and decode its question and its answer, closed over
 * the question type so generic code never names it.
 *
 * Every operation returns a `Result` with a message and never throws, whatever
 * it is given (INV-QD-NEXT). Encoding refuses a value with no JSON form with
 * the same walk `SinkCodec` uses, and decoding runs the depth bound and a
 * strict, excess-property-rejecting decode, because a question arriving at a
 * server crosses a trust boundary (ADR-QD-002).
 *
 * - `asked` — the one name an allowlist can admit or refuse: the attribute, the
 *   relation, the event, the predicate's name; `undefined` where the port has
 *   none (the signature port).
 * - `spanQuestion` / `spanAnswer` — the projection into the port's span, which
 *   `servePortRead` writes through the description's span structs.
 */
export interface PortWire<Args extends ReadonlyArray<unknown>, A> {
  readonly encodeQuestion: (args: Args) => Result.Result<Schema.Json, string>;
  readonly decodeQuestion: (input: unknown) => Result.Result<DecodedQuestion<Args>, string>;
  readonly encodeAnswer: (answer: A) => Result.Result<Schema.Json, string>;
  readonly decodeAnswer: (input: unknown) => Result.Result<A, string>;
  readonly asked: (args: Args) => string | undefined;
  readonly spanQuestion: (args: Args) => PortWireSpan;
  readonly spanAnswer: (answer: A) => PortWireSpan;
}
