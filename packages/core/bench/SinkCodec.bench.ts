/**
 * The record codec's outbound cost, old interface against new (ARCH-09 T5).
 *
 * The SSE route used to run `isRecordJsonSafe` and `JSON.stringify(toWire(r))`
 * — a partial walk and no schema encode — and forwarding ran
 * `encodeRecordSync(toWire(r))` — a schema encode and no walk. Both now make one
 * call, `encodeSinkRecordString` / `encodeSinkRecord`, which runs the depth
 * pre-checks, the schema encode and a walk over the whole encoded record. This
 * measures what that costs per record on three shapes:
 *
 * - (a) a one-node `Decided` record;
 * - (b) an `allOf`×64 `Decided` record, the default-limit worst case;
 * - (c) a `Failed` record with an `Error` cause and a 20-key resource.
 *
 * The "old" cases are deleted once the old exports are (ARCH-09 T10), so the
 * file then benches only the current interface.
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
import {
  encodeRecordSync,
  encodeSinkRecord,
  encodeSinkRecordString,
  isRecordJsonSafe,
  toWire,
} from "../src/SinkCodec.ts";

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
  test(`SSE frame data — ${name}`, async ({ bench }) => {
    await bench.compare(
      bench("old: isRecordJsonSafe + JSON.stringify(toWire)", () => {
        if (isRecordJsonSafe(record)) JSON.stringify(toWire(record));
      }),
      bench("new: encodeSinkRecordString", () => {
        encodeSinkRecordString(record);
      }),
      options,
    );
  });

  test(`forwarding value — ${name}`, async ({ bench }) => {
    await bench.compare(
      bench("old: encodeRecordSync(toWire)", () => {
        encodeRecordSync(toWire(record));
      }),
      bench("new: encodeSinkRecord", () => {
        encodeSinkRecord(record);
      }),
      options,
    );
  });
}
