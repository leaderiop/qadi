/**
 * The runtime values of `@qadi/audit`'s root, as a list (ADR-QD-099).
 *
 * The list of values below *is* the interface a consumer's code crosses at run
 * time: the audit sink and its ports, the signature ledger, and the archive,
 * retention and sequence-integrity readings. A module the root leaves out is package-private and free to
 * change.
 *
 * Changing the list is three deliberate edits, not one: the barrel line, a
 * `spec/overview.md` row that `node scripts/check-api-surface.mjs` checks, and
 * this file. Type names are that script's, not this file's: it reads every name
 * from the built declarations and cannot tell a value from a type. A value
 * re-exported type-only keeps its name there and drops out of the module at run
 * time, which is what this list catches and that script cannot.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Root from "../src/index.ts";

const ROOT_VALUES: ReadonlyArray<string> = [
  "ArchiveInputInvalid",
  "ArchiveInputRefusal",
  "ArchiveNotVerified",
  "ArchiveRefusal",
  "AuditDecisionSinkLive",
  "AuditPortReply",
  "AuditStagingError",
  "AuditStagingPort",
  "AuditStagingPortTest",
  "AuditTrailPort",
  "AuditTrailPortTest",
  "AuditWriteError",
  "AuditWriteOutcome",
  "InvalidAuditSinkOption",
  "LedgerConformanceViolation",
  "RetentionInputInvalid",
  "RetentionInputRefusal",
  "SIGNATURE_MEANINGS",
  "SequenceIntegrityError",
  "SignatureCaptureError",
  "SignatureCapturePort",
  "SignatureLedger",
  "SignatureLedgerError",
  "SignatureLedgerReadError",
  "SignatureLedgerTest",
  "UnwrittenStaging",
  "WrittenStaging",
  "archiveAuditTrail",
  "checkSignatureHistoryScoping",
  "checkSignatureLedger",
  "decodeAuditEntry",
  "durabilityOf",
  "encodeAuditEntry",
  "ledgerEntryOf",
  "ledgerKeyOf",
  "planPurge",
  "planRetention",
  "readAuditArchive",
  "signatureHistoryFromLedger",
  "signatureObligationHandler",
  "verifySequenceIntegrity",
];

describe("@qadi/audit's root", () => {
  it("exports exactly these runtime values", () => {
    assert.deepStrictEqual(Object.keys(Root).sort(), [...ROOT_VALUES].sort());
  });
});
