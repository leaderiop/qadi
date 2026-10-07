/**
 * Type-level tests for `AuditWriteOutcome`: an illegal staging state is not
 * constructible (ARCH-35).
 */
import { expect, test } from "tstyche";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { AuditWriteOutcome, UnwrittenStaging, WrittenStaging } from "../src/AuditWriteOutcome.ts";

declare const entry: AuditEntry;

test("a written entry cannot carry an uncommitted staged copy", () => {
  expect(AuditWriteOutcome.Written).type.not.toBeCallableWith({ entry, staging: UnwrittenStaging.Staged() });
  expect(AuditWriteOutcome.Written).type.toBeCallableWith({ entry, staging: WrittenStaging.Committed() });
});

test("an entry that was not written cannot report a commit", () => {
  expect(AuditWriteOutcome.Skipped).type.not.toBeCallableWith({ entry, staging: WrittenStaging.Committed() });
  expect(AuditWriteOutcome.WriteFailed).type.not.toBeCallableWith({ entry, staging: WrittenStaging.Committed() });
  expect(AuditWriteOutcome.Skipped).type.toBeCallableWith({ entry, staging: UnwrittenStaging.Staged() });
});
