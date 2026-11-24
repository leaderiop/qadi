/**
 * Which audit rows the codec made: the run-time half of the rule that only
 * `encodeAuditEntry` and `decodeAuditEntry` make an `AuditEntry` (ADR-QD-190).
 *
 * The type refuses a literal or a spread of a row, but a store client returns rows as
 * `any` (`JSON.parse`, a raw SQL row, an untyped ORM result) and a JavaScript caller has
 * no compiler, so the type alone cannot keep a row the codec never made out of the
 * archive writer. The codec records each row it makes here, and a function that takes a
 * host's rows asks {@link firstNotCodecMade} before it computes a fact from them.
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
 * The index of the first entry the codec did not make, or `undefined` when it made
 * every one (an empty list included).
 *
 * An entry that is not an object, `null` included, is not a row the codec made.
 */
export const firstNotCodecMade = (entries: ReadonlyArray<unknown>): number | undefined => {
  const index = entries.findIndex(
    (entry) => !(Predicate.isObjectKeyword(entry) && codecMade.has(entry)),
  );
  return index === -1 ? undefined : index;
};
