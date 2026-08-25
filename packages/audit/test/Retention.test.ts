import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "effect/testing/FastCheck";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { enforceRetention, getPurgeableEntries } from "../src/Retention.ts";
import type { RetentionPolicy } from "../src/Retention.ts";
import { decisionRecord } from "./helpers.ts";

const entryAt = (at: number) =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: `e-${at}`, at })));

describe("getPurgeableEntries / enforceRetention", () => {
  it("an entry older than maxAgeMs is purgeable", () => {
    const entries = [entryAt(0)];
    const policy: RetentionPolicy = { maxAgeMs: 1_000 };
    assert.strictEqual(getPurgeableEntries(entries, policy, 2_000).length, 1);
    assert.strictEqual(enforceRetention(entries, policy, 2_000).length, 0);
  });

  it("an entry younger than maxAgeMs is retained", () => {
    const entries = [entryAt(1_500)];
    const policy: RetentionPolicy = { maxAgeMs: 1_000 };
    assert.strictEqual(getPurgeableEntries(entries, policy, 2_000).length, 0);
    assert.strictEqual(enforceRetention(entries, policy, 2_000).length, 1);
  });

  it("an entry exactly at the boundary is retained, not purged", () => {
    // now - at === maxAgeMs, not strictly greater than it.
    const entries = [entryAt(1_000)];
    const policy: RetentionPolicy = { maxAgeMs: 1_000 };
    assert.strictEqual(getPurgeableEntries(entries, policy, 2_000).length, 0);
    assert.strictEqual(enforceRetention(entries, policy, 2_000).length, 1);
  });
});

describe("PROPERTY: retained and purged partition entries", () => {
  it("retained ∪ purged = entries, retained ∩ purged = ∅", () => {
    const arb = FastCheck.tuple(
      FastCheck.array(FastCheck.integer({ min: 0, max: 100_000 }), { maxLength: 30 }),
      FastCheck.integer({ min: 1, max: 100_000 }),
      FastCheck.integer({ min: 0, max: 200_000 }),
    );

    FastCheck.assert(
      FastCheck.property(arb, ([timestamps, maxAgeMs, now]) => {
        const entries = timestamps.map((at, i) =>
          Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: `e-${i}`, at }))),
        );
        const policy: RetentionPolicy = { maxAgeMs };

        const retained = enforceRetention(entries, policy, now);
        const purged = getPurgeableEntries(entries, policy, now);

        const union = new Set<AuditEntry>([...retained, ...purged]);
        const intersection = retained.filter((e) => purged.includes(e));

        return (
          union.size === entries.length &&
          retained.length + purged.length === entries.length &&
          intersection.length === 0
        );
      }),
      { numRuns: 200 },
    );
  });
});
