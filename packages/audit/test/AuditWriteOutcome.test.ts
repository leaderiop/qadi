import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry, AuditEntryNotEncodable } from "../src/AuditEntry.ts";
import { AuditStagingError } from "../src/AuditStagingPort.ts";
import { AuditWriteOutcome, durabilityOf, UnwrittenStaging, WrittenStaging } from "../src/AuditWriteOutcome.ts";
import type { Durability } from "../src/AuditWriteOutcome.ts";
import { describeAuditWriteOutcome, outcomePath } from "../src/AuditWriteReport.ts";
import type { AuditWriteReport } from "../src/AuditWriteReport.ts";
import { decisionRecord } from "./helpers.ts";

const entry: AuditEntry = Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: "ev-table" })));
const refusal: AuditEntryNotEncodable = Effect.runSync(
  Effect.flip(encodeAuditEntry(decisionRecord({ evaluationId: "poisoned", resource: { tags: new Set(["x"]) } }))),
);
const commitCause = Cause.fail(new AuditStagingError({ entry, cause: "commit offline" }));

const SUFFIX = "its staged copy is left for reconciliation";

interface Row {
  readonly name: string;
  readonly outcome: AuditWriteOutcome;
  readonly path: string;
  readonly durability: Durability;
  readonly report: AuditWriteReport;
}

/**
 * Every leaf of `AuditWriteOutcome` — the eleven rows of BEH-QD-252's table.
 * The projection is exhaustive by construction, but each arm runs per call and
 * is mutated, so each is asserted exactly here (ADR-QD-076).
 */
const ROWS: ReadonlyArray<Row> = [
  {
    name: "Refused",
    outcome: AuditWriteOutcome.Refused({ refusal }),
    path: "Refused",
    durability: "Refused",
    report: { writes: "encode_failed", staging: [], lost: undefined, log: "encodeRefusal" },
  },
  {
    name: "Written, no staging",
    outcome: AuditWriteOutcome.Written({ entry, staging: WrittenStaging.NotWired() }),
    path: "Written.NotWired",
    durability: "Trail",
    report: { writes: "written", staging: [], lost: undefined, log: undefined },
  },
  {
    name: "Written, stage failed",
    outcome: AuditWriteOutcome.Written({ entry, staging: WrittenStaging.StageFailed() }),
    path: "Written.StageFailed",
    durability: "Trail",
    report: { writes: "written", staging: ["failed"], lost: undefined, log: undefined },
  },
  {
    name: "Written, committed",
    outcome: AuditWriteOutcome.Written({ entry, staging: WrittenStaging.Committed() }),
    path: "Written.Committed",
    durability: "Trail",
    report: { writes: "written", staging: ["staged"], lost: undefined, log: undefined },
  },
  {
    name: "Written, commit failed",
    outcome: AuditWriteOutcome.Written({ entry, staging: WrittenStaging.CommitFailed({ cause: commitCause }) }),
    path: "Written.CommitFailed",
    durability: "Trail",
    report: {
      writes: "written",
      staging: ["staged", "commit_failed"],
      lost: undefined,
      log: {
        level: "Warn",
        message:
          "audit staging commit failed: entry is durable in the trail, but its staged copy will remain " +
          "marked uncommitted in the staging store",
        cause: commitCause,
      },
    },
  },
  {
    name: "WriteFailed, no staging",
    outcome: AuditWriteOutcome.WriteFailed({ entry, staging: UnwrittenStaging.NotWired() }),
    path: "WriteFailed.NotWired",
    durability: "Lost",
    report: {
      writes: "write_failed",
      staging: [],
      lost: { after: "write_failed", staging: "not_wired" },
      log: {
        level: "Warn",
        message: "audit entry dropped: trail write failed and no staging port wired",
        cause: undefined,
      },
    },
  },
  {
    name: "WriteFailed, staged",
    outcome: AuditWriteOutcome.WriteFailed({ entry, staging: UnwrittenStaging.Staged() }),
    path: "WriteFailed.Staged",
    durability: "StagingOnly",
    report: {
      writes: "write_failed",
      staging: ["staged"],
      lost: undefined,
      log: { level: "Info", message: `audit entry not written: trail write failed; ${SUFFIX}`, cause: undefined },
    },
  },
  {
    name: "WriteFailed, stage failed",
    outcome: AuditWriteOutcome.WriteFailed({ entry, staging: UnwrittenStaging.StageFailed() }),
    path: "WriteFailed.StageFailed",
    durability: "Lost",
    report: {
      writes: "write_failed",
      staging: ["failed"],
      lost: { after: "write_failed", staging: "failed" },
      log: {
        level: "Warn",
        message: "audit entry dropped: trail write failed and staging failed",
        cause: undefined,
      },
    },
  },
  {
    name: "Skipped, no staging",
    outcome: AuditWriteOutcome.Skipped({ entry, staging: UnwrittenStaging.NotWired() }),
    path: "Skipped.NotWired",
    durability: "Lost",
    report: {
      writes: "skipped_open",
      staging: ["skipped_open"],
      lost: { after: "skipped_open", staging: "not_wired" },
      log: {
        level: "Warn",
        message: "audit entry dropped: circuit breaker open and no staging port wired",
        cause: undefined,
      },
    },
  },
  {
    name: "Skipped, staged",
    outcome: AuditWriteOutcome.Skipped({ entry, staging: UnwrittenStaging.Staged() }),
    path: "Skipped.Staged",
    durability: "StagingOnly",
    report: {
      writes: "skipped_open",
      staging: ["staged"],
      lost: undefined,
      log: { level: "Info", message: `audit entry not written: circuit breaker open; ${SUFFIX}`, cause: undefined },
    },
  },
  {
    name: "Skipped, stage failed",
    outcome: AuditWriteOutcome.Skipped({ entry, staging: UnwrittenStaging.StageFailed() }),
    path: "Skipped.StageFailed",
    durability: "Lost",
    report: {
      writes: "skipped_open",
      staging: ["failed_open"],
      lost: { after: "skipped_open", staging: "failed" },
      log: {
        level: "Warn",
        message: "audit entry dropped: circuit breaker open and staging failed",
        cause: undefined,
      },
    },
  },
];

describe("AuditWriteOutcome — the eleven leaves", () => {
  it("covers exactly eleven distinct leaves", () => {
    assert.strictEqual(ROWS.length, 11);
    assert.strictEqual(new Set(ROWS.map((r) => r.path)).size, 11);
  });

  for (const row of ROWS) {
    it(`${row.name}: its projection is exactly the documented report`, () => {
      assert.deepStrictEqual(describeAuditWriteOutcome(row.outcome), row.report);
    });

    it(`${row.name}: durabilityOf is ${row.durability}`, () => {
      assert.strictEqual(durabilityOf(row.outcome), row.durability);
    });

    it(`${row.name}: its span path is ${row.path}`, () => {
      assert.strictEqual(outcomePath(row.outcome), row.path);
    });
  }

  it("a lost report is set exactly when the entry is Lost", () => {
    for (const row of ROWS) {
      assert.strictEqual(describeAuditWriteOutcome(row.outcome).lost !== undefined, durabilityOf(row.outcome) === "Lost");
    }
  });

  it("an entry not in the trail is witnessed by a log line, at warn when lost and info when staged", () => {
    for (const row of ROWS) {
      const durability = durabilityOf(row.outcome);
      if (durability !== "Lost" && durability !== "StagingOnly") continue;
      const log = describeAuditWriteOutcome(row.outcome).log;
      assert.notStrictEqual(log, undefined);
      assert.strictEqual(typeof log === "object" ? log.level : undefined, durability === "Lost" ? "Warn" : "Info");
    }
  });
});
