/**
 * What a port's span attributes are: the types a description names.
 *
 * Each port's description states its span's attributes once
 * (`PortDescription.attributes`, ADR-QD-094): a **question** annotated before
 * the call, an **answer** annotated after it, and a `disclose` projection from
 * the port's outcome to the answer. `PortAccess.ts` writes through that
 * statement and `@qadi/devtools` reads through it with `decodePortSpan`,
 * so neither restates a key (BEH-QD-227, BEH-QD-228).
 *
 * The question and the answer are two structs, not one, because BEH-QD-227
 * requires a span to carry its question even when the port failed.
 * `qadi.attempts` is written between them by a different module, the retrying
 * wrappers, and is decoded (`PortSpanDecode.ts`) for every port.
 *
 * Every field is a {@link SpanValue}, which is INV-QD-044 as a type: a field
 * that could hold arbitrary data does not compile. The machinery that builds a
 * struct is internal (`PortSpanEncode.ts`); only the types a description names
 * live here, and the decoder is `PortSpanDecode.ts`.
 */
import type * as Schema from "effect/Schema";

/**
 * A value a span attribute may hold.
 *
 * Nothing else can be a field's `Type`, which is INV-QD-044's floor stated as a
 * type: a resolved attribute value is arbitrary data, and a span attribute goes
 * to whatever backend the host wired.
 */
export type SpanValue = string | number | boolean;

/**
 * The fields of one span struct: each a leaf schema whose `Type` is a
 * {@link SpanValue}, decodable and encodable with no services.
 *
 * Every field is declared with `Schema.optionalKey`: a span may be read before
 * its answer is written, and by a producer that wrote only some of it.
 */
export type SpanFields = {
  readonly [prop: string]: Schema.Top & {
    readonly Type: SpanValue;
    readonly DecodingServices: never;
    readonly EncodingServices: never;
  };
};

/** The `qadi.`-namespaced key one field is written under. */
export type SpanKey = `qadi.${string}`;

/**
 * What a struct's value looks like: each field optional, and `undefined`
 * accepted so a caller can pass a conditional without a spread.
 */
export type SpanType<S> =
  S extends SpanStruct<infer Fields>
    ? { readonly [K in keyof Fields]?: Fields[K]["Type"] | undefined }
    : never;

/**
 * One span struct: its fields, the key each is written under, and a lenient
 * reader.
 *
 * `decode` is built once, with the struct. It is not a `Schema.Struct` member so
 * that a struct of specific fields stays assignable to the structural bound a
 * description's seventh parameter uses (`PortSpanAttributesLike`).
 */
export interface SpanStruct<Fields extends SpanFields> {
  readonly fields: Fields;
  readonly keys: { readonly [K in keyof Fields]: SpanKey };
  readonly decode: (attributes: ReadonlyMap<string, unknown>) => SpanType<SpanStruct<Fields>>;
}

/** Which interpreter is asking — `qadi.interpreter` on every port span. */
export type PortInterpreter = "evaluate" | "toPredicate";

/**
 * One port's span attributes: its question, its answer, and the projection
 * from what the port returned to what the span may say.
 *
 * - `Q`/`Ans` — the fields of the question and of the answer.
 * - `O` — the outcome `disclose` reads: the port's own answer for four ports
 *   and `SignatureAnswer` for the signature port, whose match is made in
 *   `PortAccess.ts`.
 *
 * `disclose` is the only path from an outcome to a span. For the attribute port
 * it is `(value) => ({ resolved: value !== undefined })` — INV-QD-044 in one
 * expression, and a type that cannot carry the value.
 */
export interface PortSpanAttributes<Q extends SpanFields, Ans extends SpanFields, O> {
  readonly question: SpanStruct<Q>;
  readonly answer: SpanStruct<Ans>;
  readonly disclose: (outcome: O) => SpanType<SpanStruct<Ans>>;
}

/**
 * The structural upper bound `PortDescription`'s `Span` parameter defaults to,
 * so the generic derivations over a description need not name its fields.
 */
export interface PortSpanAttributesLike {
  readonly question: SpanStruct<SpanFields>;
  readonly answer: SpanStruct<SpanFields>;
  readonly disclose: (outcome: never) => SpanType<SpanStruct<SpanFields>>;
}

/** The decoded row for a question and an answer, with `attempts` on every one. */
export type PortSpanRow<Q extends SpanFields, Ans extends SpanFields> = SpanType<SpanStruct<Q>> &
  SpanType<SpanStruct<Ans>> &
  { readonly attempts?: number | undefined };

/** The decoded row of one port, read from its description's type. */
export type PortSpanRowOf<D> = D extends {
  readonly attributes: PortSpanAttributes<infer Q, infer Ans, infer _O>;
}
  ? PortSpanRow<Q, Ans>
  : never;
