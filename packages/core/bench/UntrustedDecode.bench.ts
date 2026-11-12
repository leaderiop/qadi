/**
 * What the untrusted decoder's depth guard costs, and what the two seams that
 * guard twice cost (ADR-QD-143, D-15).
 *
 * Hydration walks an entry (its `policy` unwalked), then the policy from its
 * own root; the audit path reads a row (its `record` unwalked), then the record
 * from its own root. Each is a second walk over the part the first one left
 * out, so nothing is walked twice and no guard is dropped; this file measures
 * the price of having two decoders instead of one. Three groups:
 *
 * - (a) the policy decoder alone, against an entry decoder then the policy decoder;
 * - (b) `decodeSinkRecord` alone, against it then a row decoder;
 * - (c) the guard's own cost: `untrustedDecoder(Policy)` against the same strict
 *   decode with no guard (bench scope, so `[untrusted-decode]` does not apply).
 *
 * Throughput moves about 30% between runs (AGENTS.md §5a); read the ratio of one
 * pair within a run, not an absolute figure.
 */
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { test } from "vitest";
import { decodeSinkRecord } from "../src/SinkCodec.ts";
import * as P from "../src/Policy.ts";
import { untrustedDecoder } from "../src/UntrustedDecode.ts";
import * as V2 from "../test/fixtures/sinkWireV2.ts";

const options = { time: 1000, warmupTime: 300 };

/** A policy `frames` levels deep: `Not` nested around one permission check. */
const nested = (frames: number): unknown => {
  let policy: unknown = { _tag: "HasPermission", permission: { resource: "doc", action: "read" } };
  for (let i = 0; i < frames; i++) policy = { _tag: "Not", policy };
  return policy;
};

const policyDecoder = untrustedDecoder(P.Policy);

// An entry as hydration reads it: scalar fields plus a `policy` the first walk leaves to the second.
const entryDecoder = untrustedDecoder(
  Schema.Struct({
    version: Schema.Number,
    evaluationId: Schema.String,
    subjectId: Schema.String,
    policy: Schema.Unknown,
  }),
  { unwalked: ["policy"] },
);

const rowDecoder = untrustedDecoder(
  Schema.Struct({ record: Schema.Unknown, sequenceNumber: Schema.Number }),
  { unwalked: ["record"] },
);

const strictNoGuard = Schema.decodeUnknownResult(P.Policy, { onExcessProperty: "error" });

const policies = [
  ["10 frames", nested(10)],
  ["60 frames", nested(60)],
] as const;

for (const [name, policy] of policies) {
  const entry = { version: 2, evaluationId: "g", subjectId: "u1", policy };

  test(`hydration — ${name}: one decoder or two`, async ({ bench }) => {
    await bench.compare(
      bench("policy decoder alone", () => {
        Result.getOrThrow(policyDecoder.decode(policy));
      }),
      bench("entry decoder, then the policy decoder", () => {
        const decoded = Result.getOrThrow(entryDecoder.decode(entry));
        Result.getOrThrow(policyDecoder.decode(decoded.policy));
      }),
      options,
    );
  });

  test(`guard — ${name}: guarded or unguarded`, async ({ bench }) => {
    await bench.compare(
      bench("strict decode, no guard", () => {
        Result.getOrThrow(strictNoGuard(policy));
      }),
      bench("untrustedDecoder(Policy).decode", () => {
        Result.getOrThrow(policyDecoder.decode(policy));
      }),
      options,
    );
  });
}

// A decision record as it arrives in an audit row: the V2 fixture's decided allow.
const record = JSON.parse(V2.V2_DECIDED_ALLOW);
const row = { record, sequenceNumber: 1 };

test("audit — a decision record: one decoder or two", async ({ bench }) => {
  await bench.compare(
    bench("decodeSinkRecord alone", () => {
      Result.getOrThrow(decodeSinkRecord(record));
    }),
    bench("row decoder, then decodeSinkRecord", () => {
      const decoded = Result.getOrThrow(rowDecoder.decode(row));
      Result.getOrThrow(decodeSinkRecord(decoded.record));
    }),
    options,
  );
});
