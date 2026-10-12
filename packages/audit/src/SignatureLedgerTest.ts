/**
 * A deterministic, in-memory `SignatureLedger`, shipped as a public export.
 *
 * Mirrors `AuditTrailPortTest`: a factory returning the ledger beside a live
 * read of what it holds, so a consumer can wire `signatureObligationHandler`'s
 * `ledger` option and `signatureHistoryFromLedger` in their own tests without
 * writing a store. Entries are grouped by `signatureHistoryPort.key`, the very
 * key `hasSignature` reads with, so the write and the read cannot disagree.
 */
import * as Effect from "effect/Effect";
import * as MutableRef from "effect/MutableRef";
import * as Arr from "effect/Array";
import { signatureHistoryPort } from "@qadi/core";
import type { Signature } from "@qadi/core";
import type { SignatureLedgerEntry, SignatureLedgerShape } from "./SignatureLedger.ts";

export interface SignatureLedgerTestHandle {
  readonly ledger: SignatureLedgerShape;
  /**
   * Every entry appended so far, in call order. Live: reflects every append
   * made so far, not a snapshot taken when the handle was created.
   */
  readonly entries: () => ReadonlyArray<SignatureLedgerEntry>;
}

export const SignatureLedgerTest = (): SignatureLedgerTestHandle => {
  const store = MutableRef.make<ReadonlyArray<SignatureLedgerEntry>>(Arr.empty());

  return {
    entries: () => MutableRef.get(store),
    ledger: {
      name: "SignatureLedgerTest",
      append: (entry) =>
        Effect.sync(() => {
          MutableRef.update(store, (entries) => Arr.append(entries, entry));
        }),
      // A fresh array per read, as `signatureHistoryFromSignatures` returns:
      // a caller mutating the answer must not change the next one.
      signaturesFor: (query) =>
        Effect.sync((): ReadonlyArray<Signature> => {
          const key = signatureHistoryPort.key([query]);
          return MutableRef.get(store)
            .filter(
              (entry) =>
                signatureHistoryPort.key([
                  { subjectId: entry.subjectId, resourceId: entry.resourceId },
                ]) === key,
            )
            .map((entry) => entry.signature);
        }),
    },
  };
};
