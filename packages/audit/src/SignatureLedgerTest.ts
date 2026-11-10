/**
 * A deterministic, in-memory `SignatureLedger`, shipped as a public export.
 *
 * Mirrors `AuditTrailPortTest`: a factory returning the ledger beside a live
 * read of what it holds, so a consumer can wire `signatureObligationHandler`'s
 * `ledger` option and `signatureHistoryFromLedger` in their own tests without
 * writing a store. It is an opaque-key multimap like any adapter: the exact-pair
 * rule lives in `signatureHistoryFromLedger`, not here.
 */
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as MutableHashMap from "effect/MutableHashMap";
import * as MutableRef from "effect/MutableRef";
import * as Option from "effect/Option";
import type {
  SignatureLedgerEntry,
  SignatureLedgerKey,
  SignatureLedgerShape,
} from "./SignatureLedger.ts";

export interface SignatureLedgerTestHandle {
  readonly ledger: SignatureLedgerShape;
  /**
   * Every entry appended so far, in call order. Live: reflects every append
   * made so far, not a snapshot taken when the handle was created.
   */
  readonly entries: () => ReadonlyArray<SignatureLedgerEntry>;
}

export const SignatureLedgerTest = (): SignatureLedgerTestHandle => {
  const log = MutableRef.make<ReadonlyArray<SignatureLedgerEntry>>(Arr.empty());
  const byKey = MutableHashMap.empty<SignatureLedgerKey, ReadonlyArray<SignatureLedgerEntry>>();

  return {
    entries: () => MutableRef.get(log),
    ledger: {
      name: "SignatureLedgerTest",
      append: (key, entry) =>
        Effect.sync(() => {
          MutableHashMap.modifyAt(byKey, key, (existing) =>
            Option.some(Arr.append(Option.getOrElse(existing, Arr.empty), entry)),
          );
          MutableRef.update(log, (entries) => Arr.append(entries, entry));
        }),
      // A fresh array per read: a caller mutating the answer must not change
      // the next one.
      entriesAt: (key) =>
        Effect.sync(() => [...Option.getOrElse(MutableHashMap.get(byKey, key), Arr.empty)]),
    },
  };
};
