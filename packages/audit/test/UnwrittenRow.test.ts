/**
 * Pins that one row per unwritten staging decides whether an audit entry was lost.
 *
 * On the base three mappings decided it independently (`durabilityOf`, the
 * lost-entry counter's label and the level of the unwritten line) and agreed by
 * accident; now they all read `unwrittenRow` (ARCH-95, ADR-QD-161).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { AuditWriteOutcome, durabilityOf, UnwrittenStaging } from "../src/AuditWriteOutcome.ts";
import { describeAuditWriteOutcome } from "../src/AuditWriteReport.ts";
import { unwrittenRow } from "../src/UnwrittenRow.ts";
import { decisionRecord } from "./helpers.ts";

const entry: AuditEntry = Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: "ev-row" })));

const stagings = [
  { name: "NotWired", staging: UnwrittenStaging.NotWired() },
  { name: "Staged", staging: UnwrittenStaging.Staged() },
  { name: "StageFailed", staging: UnwrittenStaging.StageFailed() },
] as const;

const cases = [
  { name: "WriteFailed", after: "write_failed", make: AuditWriteOutcome.WriteFailed },
  { name: "Skipped", after: "skipped_open", make: AuditWriteOutcome.Skipped },
] as const;

describe("one row per unwritten staging decides lost-ness (ARCH-95, D-05)", () => {
  it("NotWired: lost, named not_wired", () => {
    assert.deepStrictEqual(unwrittenRow(UnwrittenStaging.NotWired()), { durability: "Lost", lost: "not_wired" });
  });
  it("Staged: staging only, with no word", () => {
    const row = unwrittenRow(UnwrittenStaging.Staged());
    assert.deepStrictEqual(row, { durability: "StagingOnly" });
    assert.isFalse(Object.hasOwn(row, "lost"));
  });
  it("StageFailed: lost, named failed", () => {
    assert.deepStrictEqual(unwrittenRow(UnwrittenStaging.StageFailed()), { durability: "Lost", lost: "failed" });
  });
});

describe("durabilityOf and the lost label read the row (D-05)", () => {
  for (const c of cases) {
    for (const s of stagings) {
      it(`${c.name}.${s.name}: durability and lost label are the row's`, () => {
        const outcome = c.make({ entry, staging: s.staging });
        const row = unwrittenRow(s.staging);
        assert.strictEqual(durabilityOf(outcome), row.durability);
        assert.deepStrictEqual(
          describeAuditWriteOutcome(outcome).lost,
          row.durability === "Lost" ? { after: c.after, staging: row.lost } : undefined,
        );
      });
    }
  }
});

describe("the unwritten line warns exactly when the row says lost (D-05a)", () => {
  for (const c of cases) {
    for (const s of stagings) {
      it(`${c.name}.${s.name}: Warn when lost, Info when staged`, () => {
        const log = describeAuditWriteOutcome(c.make({ entry, staging: s.staging })).log;
        assert.isTrue(typeof log === "object" && log !== undefined);
        if (typeof log !== "object" || log === undefined) return;
        const lost = unwrittenRow(s.staging).durability === "Lost";
        assert.strictEqual(log.level, lost ? "Warn" : "Info");
        // The wording reads the row too: only a lost entry is called dropped.
        assert.strictEqual(log.message.startsWith("audit entry dropped: "), lost);
        assert.strictEqual(log.message.startsWith("audit entry not written: "), !lost);
        assert.isUndefined(log.cause);
      });
    }
  }
});
