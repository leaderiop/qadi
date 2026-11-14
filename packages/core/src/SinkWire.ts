/**
 * The record wire's own words: the version `encodeSinkRecord` writes, the version
 * `decodeSinkRecord` reads, why it refuses its input, and the tag of a record.
 *
 * A leaf, so `Errors.ts` (whose `SinkRecordNotDecodable` carries these types)
 * and `SinkCodec.ts` (which raises them) can both import it without a cycle:
 * `Errors.ts` cannot import `SinkCodec.ts` (ADR-QD-037, which counts type-only
 * edges), and this module imports only `effect`, one type each from `Decision.ts`
 * and `UntrustedDecode.ts`, and two from `SinkRecordFields.ts`, none of whose import
 * closures reach this module.
 * The error classes stay in `Errors.ts` with the rest of `QadiError`; only the
 * vocabulary they name lives here (ADR-QD-095's ARCH-27 amendment). The
 * encode-refusal vocabulary, which the port wire reads too, lives in
 * `JsonRefusal.ts` (ARCH-54, ADR-QD-116, amending ADR-QD-095's ARCH-27
 * amendment). Package-private: the barrel re-exports every name, so nothing here
 * is reached by its own path.
 */
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import type { DecisionDisagreement } from "./Decision.ts";
import type { DECISION_RECORD_TAG, OBLIGATION_RECORD_TAG } from "./SinkRecordFields.ts";
import type { UntrustedRefusal } from "./UntrustedDecode.ts";

/**
 * The `_tag` of a `SinkRecord` — `"Decision"` or `"Obligations"`.
 *
 * Derived from the record tags' one statement in `SinkRecordFields.ts`, a leaf
 * that imports only `effect`, `Policy.ts` and `Identity.ts`, so importing it here
 * is no cycle: `DecisionRecord.ts` imports `EvaluationError` from `Errors.ts`,
 * which imports this module, so importing `SinkRecord` back — even as a type,
 * which madge counts (ADR-QD-037) — would be one. `Errors.tst.ts` still pins it
 * equal to `SinkRecord["_tag"]`.
 */
export type SinkRecordTag = typeof DECISION_RECORD_TAG | typeof OBLIGATION_RECORD_TAG;

/**
 * The record-wire version `encodeSinkRecord` writes, stated once (ADR-QD-096,
 * ADR-QD-151).
 *
 * The schema literals, the encoder, {@link WIRE_VERSIONS} and {@link WireVersion}
 * derive from it, so retyping the version is one edit. `as const` because a bare
 * `= 2` widens to `number` in the encoder's spread. Exported and declared in this
 * leaf because {@link DecodeRefusal}'s `supported` lives here and this leaf cannot
 * import `SinkCodec.ts` (ADR-QD-037); the barrel's `export *` makes it public.
 */
export const WIRE_VERSION = 2 as const;

/**
 * Every wire version `decodeSinkRecord` reads: version 2, and only it.
 *
 * The read set, a separate idea from the write version {@link WIRE_VERSION}:
 * today it is that one version, and a reader that keeps an older version lists it
 * here beside a schema for it (ADR-QD-151).
 */
export const WIRE_VERSIONS = [WIRE_VERSION] as const;

/**
 * A version of the record wire that `decodeSinkRecord` reads (ADR-QD-096).
 *
 * Version 2 carries `version: 2` and a decision's outcome as one tagged value.
 * It is the only one: version 1 — spelled by the absence of a `version` key,
 * the outcome as two optional fields `decided`/`failed`, written by every
 * `@qadi/core` before 0.10 — was read until 0.11.0 and is now refused as
 * `UnsupportedVersion` (ADR-QD-096's 2026-10-06 amendment). Derived from
 * {@link WIRE_VERSIONS}, so it is `2` while the read set is `[2]`, and kept
 * because {@link DecodeRefusal}'s `UnsupportedVersion.supported` reports it.
 *
 * Declared here rather than in `SinkCodec.ts` because {@link DecodeRefusal}
 * names it, and this leaf cannot import `SinkCodec.ts` (ADR-QD-037).
 */
export type WireVersion = (typeof WIRE_VERSIONS)[number];

/**
 * Why `decodeSinkRecord` refused its input.
 *
 * A closed union, edited as a whole when a reason is added.
 *
 * - `NotJson`: the text did not parse as JSON (`decodeSinkRecordString` only).
 * - `TooDeep`: the input nests deeper than `maxDepth`; refused before the
 *   schema recurses into it.
 * - `Malformed`: the input is not a record of the version it claims — not a
 *   JSON object at all, or a `version: 2` record whose content does not match
 *   (an unknown `_tag`, a typo inside the embedded policy, a field of the wrong
 *   type).
 * - `UnsupportedVersion`: the input is an object whose `version` is not one
 *   this reader reads (`supported`). A different fix from `Malformed`: the
 *   other end runs a release this one does not speak to (ADR-QD-096). `version`
 *   is the value as sent, which may be any JSON value, and is `undefined` when
 *   the input names no version — a pre-0.10 (version-1) record, which 0.11.0
 *   no longer reads: re-encode it with 0.10.x, or upgrade its sender. A newer
 *   `version` means upgrade this reader.
 * - `Inconsistent`: a well-formed version-2 record that contradicts itself: a
 *   decision whose verdict, `visibleFields`, `obligations` or `reason` differ
 *   from its own trace root's, or whose ids or policy tag differ from its
 *   record's (`disagreement` names the first, INV-QD-170). A producer that
 *   built a decision by hand, or tampering; not version skew.
 */
export type DecodeRefusal = Data.TaggedEnum<{
  NotJson: Record<never, never>;
  TooDeep: { readonly maxDepth: number };
  Malformed: { readonly message: string };
  Inconsistent: { readonly disagreement: DecisionDisagreement };
  UnsupportedVersion: { readonly version: unknown; readonly supported: ReadonlyArray<WireVersion> };
}>;

/** Constructors and guards for {@link DecodeRefusal}. */
export const DecodeRefusal = Data.taggedEnum<DecodeRefusal>();

/**
 * An untrusted decoder's refusal, or a version refusal, in the sink wire's own
 * vocabulary.
 *
 * The one mapping (ADR-QD-153), which `SinkCodec.ts` and `@qadi/audit` read
 * rather than restate. `NotJson`'s parser message is dropped because the wire's
 * `NotJson` carries none; `Inconsistent` is not an input, it comes later from
 * the record's rebuild; a version refusal passes through unchanged.
 */
export const decodeRefusalOf: (
  refusal: UntrustedRefusal | Extract<DecodeRefusal, { readonly _tag: "UnsupportedVersion" }>,
) => DecodeRefusal = Match.type<
  UntrustedRefusal | Extract<DecodeRefusal, { readonly _tag: "UnsupportedVersion" }>
>().pipe(
  Match.tagsExhaustive({
    NotJson: () => DecodeRefusal.NotJson(),
    TooDeep: ({ maxDepth }) => DecodeRefusal.TooDeep({ maxDepth }),
    Malformed: ({ message }) => DecodeRefusal.Malformed({ message }),
    UnsupportedVersion: (refusal) => refusal,
  }),
);

/** How many UTF-16 code units of a version string {@link describeDecodeRefusal} shows. */
const SHOWN_VERSION_CHARS = 40;

/** How many UTF-16 code units of a `Malformed` message {@link describeDecodeRefusal} shows. */
const SHOWN_MESSAGE_CHARS = 200;

/**
 * A refusal's `version`, described without reading it.
 *
 * The version is sender data of any type, so this dispatches on `typeof` alone: no
 * property read, no `toString`, no array test (which throws on a revoked
 * `Proxy`), and `JSON.stringify` only on a string slice. A string is quoted and
 * cut at {@link SHOWN_VERSION_CHARS} code units.
 */
const shownVersion = (version: unknown): string => {
  if (version === undefined) return "none";
  if (version === null) return "null";
  if (typeof version === "string") {
    const shown = JSON.stringify(version.slice(0, SHOWN_VERSION_CHARS));
    return version.length > SHOWN_VERSION_CHARS ? `${shown}…` : shown;
  }
  if (typeof version === "number" || typeof version === "boolean") return String(version);
  if (typeof version === "bigint") return "a bigint";
  if (typeof version === "symbol") return "a symbol";
  if (typeof version === "function") return "a function";
  return "an object";
};

/** A `Malformed` message cut at {@link SHOWN_MESSAGE_CHARS} code units. */
const shownMessage = (message: string): string =>
  message.length > SHOWN_MESSAGE_CHARS ? `${message.slice(0, SHOWN_MESSAGE_CHARS)}…` : message;

/**
 * The log and span annotations of a refused record: which refusal, under the key
 * the encode side uses. Exactly one key, and never a value from the record
 * (INV-QD-104).
 */
export type DecodeRefusalAnnotations = { readonly "qadi.refusal": DecodeRefusal["_tag"] };

/**
 * A refusal's log and span annotations: which refusal, never what was sent.
 *
 * Never `Malformed.message` or `UnsupportedVersion.version`, which are sender
 * data: the default log implementation copies annotations onto the current span,
 * so an annotation is span data (INV-QD-104, ADR-QD-153). The key is the one
 * `EncodeRefusalAnnotations` uses, so a reader filters both sides by it.
 */
export const decodeRefusalAnnotations = (self: DecodeRefusal): DecodeRefusalAnnotations => ({
  "qadi.refusal": self._tag,
});

/**
 * One sentence per {@link DecodeRefusal}, naming the reason and its fix, for a
 * caller holding the refusal.
 *
 * It may carry the sender's message and a bounded description of its version, so
 * it is never an annotation and never a default log message (INV-QD-104). Built
 * once at module scope (AGENTS.md §5a); a new refusal is a compile error here and
 * only here (ADR-QD-153). Total: it never throws and never calls code the sender
 * supplied, whatever the version holds.
 */
export const describeDecodeRefusal: (self: DecodeRefusal) => string = Match.type<DecodeRefusal>().pipe(
  Match.tagsExhaustive({
    NotJson: () =>
      "not JSON: the text did not parse, so something between the sender and this reader truncated or replaced it",
    TooDeep: ({ maxDepth }) =>
      `nested deeper than ${maxDepth} levels: a current sender refuses to emit that, so the sender is older or foreign`,
    Malformed: ({ message }) =>
      `not a record this reader can read, so the sender and this reader disagree about the wire form: ${shownMessage(message)}`,
    Inconsistent: ({ disagreement }) =>
      `a record that contradicts itself (${disagreement}): built by hand or tampered with, not version skew`,
    UnsupportedVersion: ({ version, supported }) =>
      `a record of wire version ${shownVersion(version)}, which this reader does not read (it reads ${supported.join(", ")}): upgrade the reader if the version is newer, or the sender if it has none`,
  }),
);
