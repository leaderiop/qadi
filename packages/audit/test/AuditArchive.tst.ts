/**
 * Type-level tests for `VerifiedArchive`: the evidence a purge needs cannot be
 * written by hand (ARCH-38).
 */
import { expect, test } from "tstyche";
import type { VerifiedArchive } from "../src/AuditArchive.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";

test("an object literal with the same public fields is not a VerifiedArchive", () => {
  expect<{
    readonly entries: ReadonlyArray<AuditEntry>;
    readonly createdAt: number;
    readonly entryCount: number;
    readonly sequenceIntegrityVerified: boolean;
    readonly keyMaterial: undefined;
    readonly holds: (entry: AuditEntry) => number;
  }>().type.not.toBeAssignableTo<VerifiedArchive>();
});
