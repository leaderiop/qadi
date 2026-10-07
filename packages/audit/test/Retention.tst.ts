/**
 * Type-level tests for `planPurge`: there is no purge selection without a
 * verified archive (ARCH-38).
 */
import { expect, test } from "tstyche";
import type { VerifiedArchive } from "../src/AuditArchive.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { planPurge } from "../src/Retention.ts";
import type { RetentionPolicy } from "../src/Retention.ts";

declare const entries: ReadonlyArray<AuditEntry>;
declare const policy: RetentionPolicy;
declare const archive: VerifiedArchive;

test("planPurge cannot be called without an archive", () => {
  expect(planPurge).type.not.toBeCallableWith(entries, policy, 0);
  expect(planPurge).type.toBeCallableWith(entries, policy, 0, archive);
});

test("planPurge refuses anything but a VerifiedArchive as evidence", () => {
  expect(planPurge).type.not.toBeCallableWith(entries, policy, 0, { entries });
  expect(planPurge).type.not.toBeCallableWith(entries, policy, 0, undefined);
});
