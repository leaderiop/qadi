/**
 * The documented ring + feed pairing, pinned as expected failures (ARCH-11 T1).
 *
 * Each case states a property a host serving a `decisionSinkRing` needs and
 * does not get. It is `.fails` so the suite stays green while the defect
 * stands; when the fix lands, the marker fails loudly and the case moves.
 *
 * The C9 (handoff loss) and C10 (ingest never reaches a live reader) cases
 * moved to `DecisionLog.test.ts` as passing tests against `makeDecisionLog`
 * (ARCH-11 T3). C7 waits for the stored-record envelope (T5).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { decisionSinkRing } from "../src/DecisionSinkRing.ts";
import { evaluate } from "../src/Evaluate.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { decodeSinkRecord } from "../src/SinkCodec.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const allowed = subjectWith({ permissions: ["doc:read"] });
const policy = P.hasPermission(read);

describe("the ring + feed pairing", () => {
  it.effect.fails("the backlog a host serves decodes (C7)", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });
      yield* evaluate(policy).pipe(Effect.provide(ring.layer));

      const served: ReadonlyArray<unknown> = JSON.parse(JSON.stringify(yield* ring.snapshot));
      assert.isAbove(served.length, 0);
      for (const element of served) assert.isTrue(Result.isSuccess(decodeSinkRecord(element)));
    }).pipe(Effect.provide(testLayer(allowed))));
});
