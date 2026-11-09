/**
 * The record wire's own words: the version `decodeSinkRecord` reads, why it
 * refuses its input, and the tag of a record.
 *
 * A leaf, so `Errors.ts` (whose `SinkRecordNotDecodable` carries these types)
 * and `SinkCodec.ts` (which raises them) can both import it without a cycle:
 * `Errors.ts` cannot import `SinkCodec.ts` (ADR-QD-037, which counts type-only
 * edges), and this module imports only `effect` and one type from `Decision.ts`,
 * whose import closure does not reach this module. The error classes stay in
 * `Errors.ts` with the rest of `QadiError`; only the vocabulary they name lives
 * here (ADR-QD-095's ARCH-27 amendment). The encode-refusal vocabulary, which the
 * port wire reads too, lives in `JsonRefusal.ts` (ARCH-54, ADR-QD-116, amending
 * ADR-QD-095's ARCH-27 amendment). Package-private: the barrel re-exports every
 * name, so nothing here is reached by its own path.
 */
import * as Data from "effect/Data";
import type { DecisionDisagreement } from "./Decision.ts";

/**
 * The `_tag` of a `SinkRecord` — `"Decision"` or `"Obligations"`.
 *
 * Restated as a literal union rather than imported: `DecisionRecord.ts`
 * imports `EvaluationError` from `Errors.ts`, which imports this module, so
 * importing `SinkRecord` back — even as a type, which madge counts
 * (ADR-QD-037) — would be a cycle.
 * `Errors.tst.ts` pins it equal to `SinkRecord["_tag"]`, so the two cannot
 * drift.
 */
export type SinkRecordTag = "Decision" | "Obligations";

/**
 * A version of the record wire that `decodeSinkRecord` reads (ADR-QD-096).
 *
 * Version 2 carries `version: 2` and a decision's outcome as one tagged value.
 * It is the only one: version 1 — spelled by the absence of a `version` key,
 * the outcome as two optional fields `decided`/`failed`, written by every
 * `@qadi/core` before 0.10 — was read until 0.11.0 and is now refused as
 * `UnsupportedVersion` (ADR-QD-096's 2026-10-06 amendment). A closed union of
 * one member, kept rather than deleted because it is what
 * {@link DecodeRefusal}'s `UnsupportedVersion.supported` reports, and a
 * future version 3 is a full-union edit here, not a new export.
 *
 * Declared here rather than in `SinkCodec.ts` because {@link DecodeRefusal}
 * names it, and this leaf cannot import `SinkCodec.ts` (ADR-QD-037).
 */
export type WireVersion = 2;

/** Every wire version `decodeSinkRecord` reads: version 2, and only it. */
export const WIRE_VERSIONS: ReadonlyArray<WireVersion> = [2];

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
