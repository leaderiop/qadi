/**
 * The machinery that turns a port's span attributes into one table: a struct of
 * leaf schemas plus the `qadi.*` key each one is written under.
 *
 * `PortAccess.ts` encodes through it and `@qadi/devtools` decodes through it, so
 * a key is spelled once — in the description of the port it belongs to — and
 * both directions follow from that line (ARCH-21). Before this module the
 * writer and the reader each spelled thirteen keys and their types on their own,
 * and the two had drifted twice: `qadi.scope`/`qadi.resource_id` on a signature
 * span and `qadi.attempts` on every retried call were written and never read.
 *
 * **INV-QD-044 is a type here.** A field is constrained to a leaf whose `Type` is
 * a {@link SpanValue} — a string, a number or a boolean — so a port cannot
 * declare a span field that holds arbitrary data: `Schema.Unknown` and an
 * object-valued struct are compile errors. For the attribute port that leaves
 * `disclose` as the only path from a resolved value to a span, and it returns
 * `{ resolved: boolean }`.
 *
 * Deliberately out of the barrel (AGENTS.md §9, ADR-QD-077): writing port spans
 * is core's job alone, and a host has no port to describe — the registry is
 * closed. The public half is `PortSpan.ts` (the types a description names) and
 * `PortSpanDecode.ts` (the decoder).
 *
 * Not a Schema `Struct` + `encodeKeys` whole: that measured ≈1.1 µs per encode
 * and fails a whole row on one wrong-typed attribute, which BEH-QD-228 forbids.
 * Encoding here is a walk over the value's own entries; decoding takes each
 * field alone, so a wrong-typed value reads as absent and the rest are kept.
 */
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type { SpanFields, SpanKey, SpanStruct, SpanType, SpanValue } from "./PortSpan.ts";

/**
 * Builds a span struct from its fields and their keys.
 *
 * `keys` must name every field, so a field with no key — or a key outside the
 * `qadi.` namespace — is a compile error.
 */
export const spanStruct = <const Fields extends SpanFields>(
  fields: Fields,
  keys: { readonly [K in keyof Fields]: SpanKey },
): SpanStruct<Fields> => {
  const schema = Schema.Struct(fields);
  const fieldOf: SpanFields = fields;
  const keyOf: Readonly<Record<string, SpanKey>> = keys;
  return {
    fields,
    keys,
    decode: (attributes) => {
      const lenient: Record<string, unknown> = {};
      for (const [prop, key] of Object.entries(keyOf)) {
        const raw = attributes.get(key);
        const field = fieldOf[prop];
        if (raw === undefined || field === undefined) continue;
        const decoded = Schema.decodeUnknownOption(field)(raw);
        if (Option.isSome(decoded)) lenient[prop] = decoded.value;
      }
      return Schema.decodeUnknownSync(schema)(lenient);
    },
  };
};

/**
 * The attributes to annotate a span with: the struct's keys, the value's own
 * entries, and nothing that is `undefined`.
 *
 * Plain and synchronous — a table walk, no parse — because it runs twice per
 * port read on the resolver-miss path (ADR-QD-034).
 */
export const encodeSpan = <Fields extends SpanFields>(
  struct: SpanStruct<Fields>,
  value: SpanType<SpanStruct<Fields>>,
): Readonly<Record<string, SpanValue>> => {
  const out: Record<string, SpanValue> = {};
  const keyOf: Readonly<Record<string, SpanKey>> = struct.keys;
  for (const [prop, entry] of Object.entries(value)) {
    const key = keyOf[prop];
    if (key !== undefined && entry !== undefined) out[key] = entry;
  }
  return out;
};

/** Reads one struct out of a span's attributes; a wrong-typed field is absent. */
export const decodeSpan = <Fields extends SpanFields>(
  struct: SpanStruct<Fields>,
  attributes: ReadonlyMap<string, unknown>,
): SpanType<SpanStruct<Fields>> => struct.decode(attributes);

/** The two fields every port span's question carries. */
export const sharedQuestionFields = {
  subjectId: Schema.optionalKey(Schema.String),
  interpreter: Schema.optionalKey(Schema.Literals(["evaluate", "toPredicate"])),
};

/** Their keys, spelled once. */
export const sharedQuestionKeys = {
  subjectId: "qadi.subject_id",
  interpreter: "qadi.interpreter",
} as const;

/**
 * How many times a retried call ran — written by the retrying wrappers
 * (`PortDerivation.ts`) onto the span `PortAccess.ts` opened around the call.
 */
export const attemptsStruct = spanStruct(
  { attempts: Schema.optionalKey(Schema.Number) },
  { attempts: "qadi.attempts" },
);
