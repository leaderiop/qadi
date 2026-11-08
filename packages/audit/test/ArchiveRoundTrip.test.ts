/**
 * Properties that the archive reader accepts what the writer writes, and
 * refuses every tampering of it.
 *
 * Written before the archive's facts module exists (ARCH-48, D-06): the writer
 * ({@link archiveAuditTrail}) and the reader ({@link readAuditArchive}) each
 * restate the order, the claim rule and the sequence-break check today, and the
 * refactor that states them once has to leave every behavior here unchanged. So
 * this file passes before and after that refactor, and imports only module
 * paths that survive it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { decisionRecord } from "./helpers.ts";

/** Twelve structurally distinct rows, each encoded once: the evaluationIds differ. */
const pool: ReadonlyArray<AuditEntry> = Array.from({ length: 12 }, (_, i) =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: "r-" + i }))),
);

/** The bundle's JSON shape, entries left opaque so a test can corrupt them. */
interface StoredBundle {
  readonly archiveVersion: string;
  readonly metadata: {
    readonly createdAt: number;
    readonly entryCount: number;
    readonly sequenceIntegrityVerified: boolean;
  };
  readonly entries: ReadonlyArray<unknown>;
  readonly keyMaterial?: ReadonlyArray<unknown> | undefined;
}

/** What a long-term store gives back for a bundle: text, then parsed. */
const stored = (archive: unknown): StoredBundle => JSON.parse(JSON.stringify(archive));

/**
 * A writer-acceptable input: `k` sequenced entries numbered `start..start+k-1`
 * (pool entry `i` carries `start + i`) and `u` unsequenced ones (pool entries
 * `k..k+u-1`), in any input order. The numbers are contiguous and unique, so
 * the writer accepts every input this produces.
 */
const intactInput = FastCheck.tuple(
  FastCheck.integer({ min: 0, max: 1_000 }),
  FastCheck.integer({ min: 0, max: 6 }),
  FastCheck.integer({ min: 0, max: 6 }),
).chain(([start, k, u]) => {
  const rows = pool.slice(0, k + u).map((entry, i) => (i < k ? { ...entry, sequenceNumber: start + i } : entry));
  return FastCheck.shuffledSubarray(rows, { minLength: k + u, maxLength: k + u }).map((input) => ({
    start,
    k,
    u,
    input,
  }));
});

describe("PROPERTY: readAuditArchive accepts every bundle archiveAuditTrail writes", () => {
  it("sequenced, unsequenced and mixed entries, in any order, with or without keyMaterial", () => {
    FastCheck.assert(
      FastCheck.property(
        intactInput,
        FastCheck.integer({ min: 0, max: 1_000_000_000 }),
        FastCheck.boolean(),
        ({ k, u, input }, createdAt, withKeyMaterial) => {
          const keyMaterial = [{ keyId: "k1", algorithm: "Ed25519", publicKey: "base64==" }];
          const archive = Effect.runSync(
            archiveAuditTrail(input, createdAt, withKeyMaterial ? { keyMaterial } : undefined),
          );
          const read = readAuditArchive(stored(archive));
          if (!Result.isSuccess(read)) return assert.fail("the reader refused a bundle the writer wrote");

          const verified = read.success;
          assert.strictEqual(verified.entryCount, k + u);
          assert.strictEqual(verified.createdAt, createdAt);
          // The test's own oracle for the claim rule, stated independently of the source.
          assert.strictEqual(verified.sequenceIntegrityVerified, k >= 2);
          assert.deepStrictEqual(verified.keyMaterial, withKeyMaterial ? keyMaterial : undefined);
          for (const entry of input) assert.strictEqual(verified.holds(entry), 1);

          const sequencedIds = Array.from({ length: k }, (_, i) => "r-" + i);
          const unsequencedIds = input
            .filter((entry) => entry.sequenceNumber === undefined)
            .map((entry) => entry.record.evaluationId);
          assert.deepStrictEqual(
            verified.entries.map((entry) => entry.record.evaluationId),
            [...sequencedIds, ...unsequencedIds],
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
