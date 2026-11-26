/**
 * Which audit rows the codec made: the run-time half of the rule that only
 * `encodeAuditEntry` and `decodeAuditEntry` make an `AuditEntry` (ADR-QD-190).
 *
 * The type refuses a literal or a spread of a row, but a store client returns rows as
 * `any` (`JSON.parse`, a raw SQL row, an untyped ORM result) and a JavaScript caller has
 * no compiler, so the type alone cannot keep a row the codec never made out of the
 * archive writer. The codec records each row it makes here, and the admission step
 * (`HostBatch.ts`) asks {@link isCodecMade} of each entry of a host's rows, as it reads
 * it, before any fact is computed from them.
 *
 * Membership is identity, which a class check is not: `instanceof` is answered by a
 * prototype, and `Object.create` gives any object a row's. A `WeakSet` holds no row
 * alive, and only this module's two exports touch it. The module is out of the barrel,
 * so a host cannot record a row of its own (ADR-QD-099).
 *
 * The record is one per loaded copy of the module: one copy of `@qadi/audit` must make a
 * row and read it. A row made by another copy (two versions installed side by side, two
 * bundles with separate module graphs, a test that resets modules) is not one the codec
 * made, and the writer refuses it as `ArchiveInputInvalid` naming `entries`, with nothing
 * in the message to say the copies differ. A registry on `globalThis` would lift the limit
 * and let any host record a row of its own, which defeats the check, so the limit stays
 * and a second copy is a configuration to fix: install one.
 */
import * as Predicate from "effect/Predicate";

const codecMade = new WeakSet<object>();

/** Records `row` as made by the codec and returns it. Only the codec calls this. */
export const markCodecMade = <Row extends object>(row: Row): Row => {
  codecMade.add(row);
  return row;
};

/**
 * Why a host's rows are refused: the two members every function that takes rows shares.
 *
 * `ArchiveInputRefusal` and `RetentionInputRefusal` each add the members of their own
 * inputs to these, so a row is refused in one place and by one reading of "a row the
 * codec made" (ADR-QD-190).
 */
export type RowsRefusalCases = {
  /** `entries` is not a list; `value` is what was given. */
  readonly EntriesNotAList: { readonly value: unknown };
  /** The entry at `index` is not a row the codec made. */
  readonly EntryNotMadeByCodec: { readonly index: number };
};

/**
 * Whether `entry` is a row the codec made: the question the admission step asks of each
 * entry of a host's rows.
 *
 * An entry that is not an object, `null` and a hole's `undefined` included, is not a row
 * the codec made. The record holds only what the codec made, so `HostBatch.ts` reads a
 * `true` as the row type; the type is not named here because `AuditEntry.ts` imports this
 * module to fill the record, and naming it back would close a cycle.
 */
export const isCodecMade = (entry: unknown): boolean =>
  Predicate.isObjectKeyword(entry) && codecMade.has(entry);
