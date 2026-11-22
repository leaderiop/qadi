/**
 * The http encoders write the stored envelope's bytes, pinned on the phase base.
 *
 * The routes' element type is what ADR-QD-171 changes (D-15), and the bytes they
 * write must not. Written before the change and green there, through public API
 * only (`makeDecisionLog`, `ingest`, `snapshot`, `jsonElements`, `recordData`), so
 * the change cannot edit it: no row reads a field of a stored record (D-06, D-07).
 */
import { assert, describe, it } from "@effect/vitest";
import { decodeSinkRecordString, makeDecisionLog } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { jsonElements, recordData } from "../src/DecisionLogHttp.ts";

// Hand-written in `packages/core/test/fixtures/sinkWireV2.ts` (`V2_FAILED_MISSING_RESOURCE`).
const FAILED_MISSING_RESOURCE =
  '{"_tag":"Decision","version":2,"evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"outcome":{"_tag":"Failed","error":{"_tag":"MissingResource","attribute":"owner"}}}';

// Hand-written in `packages/core/test/fixtures/sinkWireV2.ts` (`V2_OBLIGATIONS`).
const OBLIGATIONS =
  '{"_tag":"Obligations","version":2,"evaluationId":"g","at":1,"outcome":"Discharged","obligationIds":["audit.log"]}';

const RECORDS = [
  { name: "a failed decision", text: FAILED_MISSING_RESOURCE },
  { name: "an obligations record", text: OBLIGATIONS },
];

const CASES = RECORDS.flatMap(({ name, text }) =>
  ["Server", 'a"b'].map((label) => ({ name: `${name} under ${label}`, text, label })),
);

const composed = (label: string, text: string): string =>
  `{"environment":${JSON.stringify(label)},"record":${text}}`;

/** The record as the log stores it, ingested under `label`. */
const storedOf = (text: string, label: string) =>
  Effect.gen(function* () {
    const record = Result.getOrElse(decodeSinkRecordString(text), () => assert.fail("a fixture did not decode"));
    const log = yield* makeDecisionLog({ environment: "log-own" });
    yield* log.ingest(record, label);
    const snapshot = yield* log.snapshot;
    const first = snapshot[0];
    if (snapshot.length !== 1 || first === undefined) return assert.fail("expected exactly one stored record");
    return first;
  });

describe("the http encoders write the stored envelope's bytes (STOR-02, STOR-03, D-15)", () => {
  it.effect("W1 jsonElements yields one element equal to the parsed composed envelope", () =>
    Effect.gen(function* () {
      for (const { name, text, label } of CASES) {
        const stored = yield* storedOf(text, label);
        const elements = yield* jsonElements([stored]);
        assert.strictEqual(elements.length, 1, name);
        assert.deepStrictEqual(elements[0], JSON.parse(composed(label, text)), name);
      }
    }));

  it.effect("W2 recordData yields exactly the composed text", () =>
    Effect.gen(function* () {
      for (const { name, text, label } of CASES) {
        const stored = yield* storedOf(text, label);
        const data = yield* recordData()(stored);
        assert.deepStrictEqual(data, Option.some(composed(label, text)), name);
      }
    }));
});
