/**
 * The machinery that turns a port's question and answer schemas into one
 * {@link PortWire}: encode and decode through a strict schema, refuse what has
 * no JSON form, and never throw.
 *
 * Each port module states its wire as one `portWire({...})` call beside its
 * span, and `PortRemote.ts` consumes only the resulting `PortWire`, so generic
 * code never names a port's question type (ARCH-31, ADR-QD-094).
 *
 * Deliberately out of the barrel (AGENTS.md §9, ADR-QD-099): a host has no port
 * to describe — the registry is closed — so the builder is core's alone. It
 * imports `JsonHazard.ts`, `DecodeDepthGuard.ts` and `Policy.ts`, and no port
 * module (ADR-QD-037).
 */
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type { AuthSubject } from "./AuthSubject.ts";
import { exceedsJsonDepth } from "./DecodeDepthGuard.ts";
import type { SubjectId } from "./Identity.ts";
import { toJson } from "./JsonHazard.ts";
import { MAX_DECODE_DEPTH, UNTRUSTED_DECODE_OPTIONS } from "./Policy.ts";
import type { PortWire, PortWireSpan } from "./PortWire.ts";
import { describeEncodeRefusal } from "./SinkWire.ts";
import type { EncodeRefusal } from "./SinkWire.ts";

/** The depth bound a wire value is held to — the one a policy and a sink record are. */
export const WIRE_MAX_DEPTH = MAX_DECODE_DEPTH;

/**
 * Converts a value to the port's wire shape and refuses with the walk's reason.
 *
 * `toQuestion` and `toAnswer` return a `Result` because converting an
 * arbitrary value (an attribute's, a custom predicate's `params`) to JSON can
 * be refused; a port whose answer is already its wire shape passes
 * {@link sameAnswer}.
 */
export interface PortWireSpec<
  Args extends ReadonlyArray<unknown>,
  A,
  Q extends { readonly subjectId: SubjectId },
  QE,
  W,
  WE,
> {
  readonly question: Schema.Codec<Q, QE>;
  readonly answer: Schema.Codec<W, WE>;
  readonly toQuestion: (args: Args) => Result.Result<Q, EncodeRefusal>;
  readonly fromQuestion: (question: Q, subject: AuthSubject) => Args;
  readonly toAnswer: (answer: A) => Result.Result<W, EncodeRefusal>;
  readonly fromAnswer: (wire: W) => A;
  readonly asked: (args: Args) => string | undefined;
  readonly spanQuestion: (args: Args) => PortWireSpan;
  readonly spanAnswer: (answer: A) => PortWireSpan;
}

/** The answer conversions of a port whose answer is its own wire shape. */
export const sameAnswer = <T>() => ({
  toAnswer: (answer: T): Result.Result<T, EncodeRefusal> => Result.succeed(answer),
  fromAnswer: (wire: T): T => wire,
});

const refusal = (reason: EncodeRefusal): string => describeEncodeRefusal(reason);

/** Builds a {@link PortWire} from a port's question and answer schemas. */
export const portWire = <
  Args extends ReadonlyArray<unknown>,
  A,
  Q extends { readonly subjectId: SubjectId },
  QE,
  W,
  WE,
>(
  spec: PortWireSpec<Args, A, Q, QE, W, WE>,
): PortWire<Args, A> => {
  const encodeQ = Schema.encodeResult(spec.question);
  const decodeQ = Schema.decodeUnknownResult(spec.question, UNTRUSTED_DECODE_OPTIONS);
  const encodeA = Schema.encodeResult(spec.answer);
  const decodeA = Schema.decodeUnknownResult(spec.answer, UNTRUSTED_DECODE_OPTIONS);

  return {
    encodeQuestion: (args) =>
      Result.try({ try: () => spec.toQuestion(args), catch: (error) => String(error) }).pipe(
        Result.flatMap((converted) => Result.mapError(converted, refusal)),
        Result.flatMap((question) =>
          Result.mapError(encodeQ(question), (error) => error.message),
        ),
        Result.flatMap((encoded) =>
          Result.mapError(toJson(encoded, WIRE_MAX_DEPTH), refusal),
        ),
      ),
    decodeQuestion: (input) =>
      exceedsJsonDepth(input, WIRE_MAX_DEPTH)
        ? Result.fail("the question nests deeper than the decode bound")
        : Result.map(
            Result.mapError(decodeQ(input), (error) => error.message),
            (question) => ({
              subjectId: question.subjectId,
              args: (subject: AuthSubject) => spec.fromQuestion(question, subject),
            }),
          ),
    encodeAnswer: (answer) =>
      Result.try({ try: () => spec.toAnswer(answer), catch: (error) => String(error) }).pipe(
        Result.flatMap((converted) => Result.mapError(converted, refusal)),
        Result.flatMap((wire) => Result.mapError(encodeA(wire), (error) => error.message)),
        Result.flatMap((encoded) =>
          Result.mapError(toJson(encoded, WIRE_MAX_DEPTH), refusal),
        ),
      ),
    decodeAnswer: (input) =>
      exceedsJsonDepth(input, WIRE_MAX_DEPTH)
        ? Result.fail("the answer nests deeper than the decode bound")
        : Result.map(
            Result.mapError(decodeA(input), (error) => error.message),
            spec.fromAnswer,
          ),
    asked: spec.asked,
    spanQuestion: spec.spanQuestion,
    spanAnswer: spec.spanAnswer,
  };
};
