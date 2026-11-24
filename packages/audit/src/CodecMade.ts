/**
 * Which audit rows the codec made: the run-time half of the rule that only
 * `encodeAuditEntry` and `decodeAuditEntry` make an `AuditEntry` (ADR-QD-190).
 *
 * The type refuses a literal or a spread of a row, but a store client returns rows as
 * `any` (`JSON.parse`, a raw SQL row, an untyped ORM result) and a JavaScript caller has
 * no compiler, so the type alone cannot keep a row the codec never made out of the
 * archive writer. The codec records each row it makes here, and a function that takes a
 * host's rows asks {@link rowsRefusal} before it computes a fact from them. The same
 * caller can pass something that is not a list at all, so the list is the first thing
 * asked.
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
import * as Data from "effect/Data";
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

type RowsRefusal = Data.TaggedEnum<RowsRefusalCases>;
const { EntriesNotAList, EntryNotMadeByCodec } = Data.taggedEnum<RowsRefusal>();

/**
 * Why `entries` is not a list of rows the codec made, or `undefined` when it is one (an
 * empty list included).
 *
 * `EntriesNotAList` carries what was given, so the host that passed `undefined`, `null` or
 * an object for the list can see it. `EntryNotMadeByCodec` carries the index of the first
 * entry the codec did not make; an entry that is not an object, `null` included, is not a
 * row the codec made.
 */
export const rowsRefusal = (entries: unknown): RowsRefusal | undefined => {
  if (!Array.isArray(entries)) {
    return EntriesNotAList({ value: entries });
  }
  const index = entries.findIndex(
    (entry) => !(Predicate.isObjectKeyword(entry) && codecMade.has(entry)),
  );
  return index === -1 ? undefined : EntryNotMadeByCodec({ index });
};
