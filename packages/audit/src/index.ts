/**
 * The audit trail for `@qadi/core`: the trail and staging ports, the circuit
 * breaker, retention, the archive checks and e-signature capture, composed onto
 * `DecisionSink`.
 *
 * **The list below is the interface** (ADR-QD-047's amendment, ADR-QD-204): each
 * module's exports are named, modules in path order and, within a module, values
 * before types. A module's other names are reachable inside the package only: out
 * of the barrel means not importable (ADR-QD-099). Adding a value is a line here,
 * a row in `spec/overview.md` and a line in `test/surface.test.ts`'s value list;
 * adding a type is a line here and a row in `spec/overview.md`, because a type is
 * not a runtime key (AGENTS.md §9).
 */
export { SequenceIntegrityError, verifySequenceIntegrity } from "./ArchiveFacts.ts";
export {
  ArchiveInputInvalid,
  ArchiveInputRefusal,
  ArchiveNotVerified,
  ArchiveRefusal,
  archiveAuditTrail,
  readAuditArchive,
} from "./AuditArchive.ts";
export type {
  ArchivalOptions,
  AuditArchive,
  KeyMaterial,
  VerifiedArchive,
} from "./AuditArchive.ts";
export { AuditDecisionSinkLive } from "./AuditDecisionSinkLive.ts";
export type { AuditDecisionSinkOptions } from "./AuditDecisionSinkLive.ts";
export { decodeAuditEntry, encodeAuditEntry } from "./AuditEntry.ts";
export type { AuditEntry } from "./AuditEntry.ts";
export { AuditPortReply } from "./AuditPortReply.ts";
export type {
  AuditCommitScript,
  AuditStageScript,
  AuditTrailScript,
} from "./AuditPortReply.ts";
export { AuditStagingError, AuditStagingPort } from "./AuditStagingPort.ts";
export type { AuditStagingHandle, AuditStagingPortShape } from "./AuditStagingPort.ts";
export { AuditStagingPortTest } from "./AuditStagingPortTest.ts";
export type {
  AuditStagingPortTestHandle,
  AuditStagingPortTestOptions,
} from "./AuditStagingPortTest.ts";
export { AuditTrailPort, AuditWriteError } from "./AuditTrailPort.ts";
export type { AuditTrailPortShape } from "./AuditTrailPort.ts";
export { AuditTrailPortTest } from "./AuditTrailPortTest.ts";
export type {
  AuditTrailPortTestHandle,
  AuditTrailPortTestOptions,
} from "./AuditTrailPortTest.ts";
export {
  AuditWriteOutcome,
  UnwrittenStaging,
  WrittenStaging,
  durabilityOf,
} from "./AuditWriteOutcome.ts";
export type { Durability } from "./AuditWriteOutcome.ts";
export { InvalidAuditSinkOption } from "./InvalidAuditSinkOption.ts";
export {
  RetentionInputInvalid,
  RetentionInputRefusal,
  planPurge,
  planRetention,
} from "./Retention.ts";
export type { PurgePlan, RetentionPlan, RetentionPolicy } from "./Retention.ts";
export {
  SIGNATURE_MEANINGS,
  SignatureCaptureError,
  SignatureCapturePort,
  signatureObligationHandler,
} from "./SignatureCapturePort.ts";
export type {
  SignatureCapturePortShape,
  SignatureCaptureRequest,
  SignatureMeaning,
  SignatureValidationResult,
} from "./SignatureCapturePort.ts";
export {
  SignatureLedger,
  SignatureLedgerError,
  SignatureLedgerReadError,
  ledgerEntryOf,
  ledgerKeyOf,
  signatureHistoryFromLedger,
} from "./SignatureLedger.ts";
export type {
  LedgerKeySource,
  LedgerPair,
  SignatureLedgerEntry,
  SignatureLedgerKey,
  SignatureLedgerShape,
} from "./SignatureLedger.ts";
export {
  LedgerConformanceViolation,
  checkSignatureHistoryScoping,
  checkSignatureLedger,
} from "./SignatureLedgerConformance.ts";
export type { LedgerConformanceOptions } from "./SignatureLedgerConformance.ts";
export { SignatureLedgerTest } from "./SignatureLedgerTest.ts";
export type { SignatureLedgerTestHandle } from "./SignatureLedgerTest.ts";
