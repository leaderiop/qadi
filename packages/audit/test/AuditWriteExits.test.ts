import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { durabilityOf } from "../src/AuditWriteOutcome.ts";
import { describeAuditWriteOutcome, outcomePath } from "../src/AuditWriteReport.ts";
import type { StagingLabel, WritesLabel } from "../src/AuditWriteReport.ts";
import type { ExitSpec } from "./driveExit.ts";
import { driveExit } from "./driveExit.ts";

interface ExitRow {
  readonly name: string;
  readonly spec: ExitSpec;
  readonly path: string;
  readonly rows: number;
}

const WRITES_LABELS: ReadonlyArray<WritesLabel> = ["encode_failed", "written", "write_failed", "skipped_open"];
const STAGING_LABELS: ReadonlyArray<StagingLabel> = [
  "staged",
  "failed",
  "skipped_open",
  "failed_open",
  "commit_failed",
];

const base: ExitSpec = {
  wired: false,
  open: false,
  encode: "ok",
  stage: "ok",
  write: "ok",
  commit: "ok",
};

/**
 * Every reachable exit of `record`, typed and defect variants included. Each
 * row names the ports' behaviour and the leaf it must reach; the assertion
 * below ties what the pipeline then *emitted* to `describeAuditWriteOutcome`,
 * so the pure table in `AuditWriteOutcome.test.ts` cannot drift from reality.
 */
const EXITS: ReadonlyArray<ExitRow> = [
  { name: "encode refused, unwired", spec: { ...base, encode: "refused" }, path: "Refused", rows: 0 },
  { name: "encode refused, wired", spec: { ...base, wired: true, encode: "refused" }, path: "Refused", rows: 0 },
  { name: "unwired, write ok", spec: base, path: "Written.NotWired", rows: 1 },
  { name: "unwired, write fails", spec: { ...base, write: "fail" }, path: "WriteFailed.NotWired", rows: 0 },
  { name: "unwired, write dies", spec: { ...base, write: "die" }, path: "WriteFailed.NotWired", rows: 0 },
  { name: "unwired, breaker open", spec: { ...base, open: true }, path: "Skipped.NotWired", rows: 0 },
  { name: "wired, all ok", spec: { ...base, wired: true }, path: "Written.Committed", rows: 1 },
  {
    name: "wired, commit fails",
    spec: { ...base, wired: true, commit: "fail" },
    path: "Written.CommitFailed",
    rows: 1,
  },
  {
    name: "wired, commit dies",
    spec: { ...base, wired: true, commit: "die" },
    path: "Written.CommitFailed",
    rows: 1,
  },
  {
    name: "wired, stage fails, write ok",
    spec: { ...base, wired: true, stage: "fail" },
    path: "Written.StageFailed",
    rows: 1,
  },
  {
    name: "wired, stage dies, write ok",
    spec: { ...base, wired: true, stage: "die" },
    path: "Written.StageFailed",
    rows: 1,
  },
  {
    name: "wired, staged, write fails",
    spec: { ...base, wired: true, write: "fail" },
    path: "WriteFailed.Staged",
    rows: 0,
  },
  {
    name: "wired, staged, write dies",
    spec: { ...base, wired: true, write: "die" },
    path: "WriteFailed.Staged",
    rows: 0,
  },
  {
    name: "wired, stage fails, write fails",
    spec: { ...base, wired: true, stage: "fail", write: "fail" },
    path: "WriteFailed.StageFailed",
    rows: 0,
  },
  {
    name: "wired, stage dies, write dies",
    spec: { ...base, wired: true, stage: "die", write: "die" },
    path: "WriteFailed.StageFailed",
    rows: 0,
  },
  {
    name: "wired, breaker open, staged",
    spec: { ...base, wired: true, open: true },
    path: "Skipped.Staged",
    rows: 0,
  },
  {
    name: "wired, breaker open, stage fails",
    spec: { ...base, wired: true, open: true, stage: "fail" },
    path: "Skipped.StageFailed",
    rows: 0,
  },
  {
    name: "wired, breaker open, stage dies",
    spec: { ...base, wired: true, open: true, stage: "die" },
    path: "Skipped.StageFailed",
    rows: 0,
  },
];

describe("AuditDecisionSinkLive — every exit of record has one outcome, and reports exactly it", () => {
  it("covers every leaf of the union", () => {
    assert.strictEqual(new Set(EXITS.map((r) => r.path)).size, 11);
  });

  for (const row of EXITS) {
    it.effect(row.name, () =>
      Effect.gen(function* () {
        const observed = yield* driveExit(row.spec);
        const report = describeAuditWriteOutcome(observed.outcome);

        assert.strictEqual(outcomePath(observed.outcome), row.path);
        assert.strictEqual(observed.hookCalls, 1);
        assert.strictEqual(observed.rows, row.rows);

        // The observed metrics are exactly the projection's: one write label,
        // the staging labels it names, and the lost counter iff Lost.
        for (const label of WRITES_LABELS) {
          assert.strictEqual(observed.writes[label], label === report.writes ? 1 : 0, `writes ${label}`);
        }
        for (const label of STAGING_LABELS) {
          assert.strictEqual(
            observed.staging[label],
            report.staging.filter((l) => l === label).length,
            `staging ${label}`,
          );
        }
        assert.strictEqual(observed.lost, report.lost === undefined ? 0 : 1);
        assert.strictEqual(report.lost !== undefined, durabilityOf(observed.outcome) === "Lost");

        // And the observed log is exactly its line: none, the encode refusal's
        // own report, or one message at one level naming the evaluation.
        const line = report.log;
        if (line === undefined) {
          assert.strictEqual(observed.logs.length, 0);
        } else if (line === "encodeRefusal") {
          assert.strictEqual(observed.logs.length, 1);
          assert.include(observed.logs[0]?.message, "could not be encoded for the audit trail");
          assert.strictEqual(observed.logs[0]?.evaluationId, "target");
        } else {
          assert.strictEqual(observed.logs.length, 1);
          assert.strictEqual(observed.logs[0]?.message, line.message);
          assert.strictEqual(observed.logs[0]?.level, line.level === "Warn" ? "Warn" : "Info");
          assert.strictEqual(observed.logs[0]?.evaluationId, "target");
        }
      }));
  }
});
