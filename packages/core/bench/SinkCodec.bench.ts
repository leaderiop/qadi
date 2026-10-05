/**
 * The record codec's outbound cost per record (ARCH-09).
 *
 * `encodeSinkRecordString` is what the decision stream frames with and
 * `encodeSinkRecord` what forwarding and the audit encoder call: depth
 * pre-checks, the schema encode, and one walk over the whole encoded record.
 * Three shapes:
 *
 * - (a) a one-node `Decided` record;
 * - (b) an `allOf`×64 `Decided` record, the default-limit worst case;
 * - (c) a `Failed` record with an `Error` cause and a 20-key resource.
 *
 * When this replaced the per-caller guards (ARCH-09 T5, recorded in
 * ADR-QD-902), the old paths were measured beside it in this file: by per-call
 * minimum the new path cost about 1.8–1.9× the old forwarding encode and 2–3.7×
 * the old SSE path, which ran no schema encode at all. The old cases went with
 * the old exports.
 */
import { test } from "vitest";
import { Allow } from "../src/Decision.ts";
import type { Trace } from "../src/Decision.ts";
import { Decided, DecisionRecord, Failed } from "../src/DecisionRecord.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { AttributeResolveError } from "../src/Errors.ts";
import { makeSubjectId } from "../src/Identity.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { encodeSinkRecord, encodeSinkRecordString } from "../src/SinkCodec.ts";

const read = permission("doc", "read");

const leafTrace: Trace = { policyTag: "HasPermission", allowed: true, children: [], obligations: [] };

const decided = (policy: P.Policy, trace: Trace): SinkRecord =>
  new DecisionRecord({
    evaluationId: "bench",
    at: 1,
    subjectId: makeSubjectId("u1"),
    policy,
    resource: { id: "doc-1", owner: "u1" },
    action: "read",
    outcome: new Decided({
      decision: new Allow({
        evaluationId: "bench",
        subjectId: makeSubjectId("u1"),
        durationMillis: 1,
        trace,
        visibleFields: undefined,
        obligations: [],
      }),
    }),
  });

const oneNode = decided(P.hasPermission(read), leafTrace);

const wide: SinkRecord = (() => {
  let policy: P.Policy = P.hasPermission(read);
  let trace: Trace = leafTrace;
  for (let i = 0; i < 64; i++) {
    policy = P.allOf([policy]);
    trace = { policyTag: "AllOf", allowed: true, children: [trace], obligations: [] };
  }
  return decided(policy, trace);
})();

const failed: SinkRecord = new DecisionRecord({
  evaluationId: "bench",
  at: 1,
  subjectId: makeSubjectId("u1"),
  policy: P.hasPermission(read),
  resource: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, i % 2 === 0 ? `v${i}` : i])),
  outcome: new Failed({
    error: new AttributeResolveError({ attribute: "clearance", cause: new Error("db down") }),
  }),
});

const options = { time: 1000, warmupTime: 300 };

const cases: ReadonlyArray<readonly [string, SinkRecord]> = [
  ["(a) one node", oneNode],
  ["(b) allOf×64", wide],
  ["(c) Failed, Error cause, 20-key resource", failed],
];

for (const [name, record] of cases) {
  test(`outbound — ${name}`, async ({ bench }) => {
    await bench.compare(
      bench("encodeSinkRecordString (SSE frame data)", () => {
        encodeSinkRecordString(record);
      }),
      bench("encodeSinkRecord (forwarding, audit)", () => {
        encodeSinkRecord(record);
      }),
      options,
    );
  });
}
