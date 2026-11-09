/**
 * The decision log's HTTP wire refuses alike in every framing: a record the codec
 * will not encode drops only its own element, is reported exactly once, and a
 * hook that throws neither ends the feed nor empties the response.
 *
 * ARCH-50 gave both routes one module (`DecisionLogHttp.ts`) in place of two
 * hand-kept copies of an encode-or-report loop, and D-06 asks for one table over
 * framings × scenarios rather than a copy of each refusal test per route. The
 * expectation lives on the scenario, not on the framing, so a framing that kept,
 * dropped or reported differently from the others fails its own cells. That is
 * the "one encoder, one refusal policy" property; only the words and the span
 * name are the framing's own.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  Allow,
  Decided,
  DecisionRecord,
  decodeStoredRecord,
  decodeStoredRecordString,
  hasPermission,
  makeSubjectId,
  permission,
  stampRecord,
} from "@qadi/core";
import type { LogEntry, SinkRecordNotEncodable, StoredRecord } from "@qadi/core";
import { collectingLogger, collectingTracer } from "@qadi/testing";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import type * as Tracer from "effect/Tracer";
import { frameEntries, frameEntry, jsonElements } from "../src/DecisionLogHttp.ts";
import type { DecisionLogServeOptions } from "../src/DecisionLogHttp.ts";

const policy = hasPermission(permission("devtools", "read"));

const decision = (evaluationId: string, resource?: Record<string, unknown>) =>
  new DecisionRecord({
    evaluationId,
    at: 1_000,
    subjectId: makeSubjectId("alice"),
    policy,
    ...(resource === undefined ? {} : { resource }),
    outcome: new Decided({
      decision: new Allow({
        evaluationId,
        subjectId: makeSubjectId("alice"),
        durationMillis: 1,
        trace: { policyTag: "HasPermission", allowed: true, children: [], obligations: [] },
      }),
    }),
  });

const stored = (record: DecisionRecord): StoredRecord => stampRecord(record, "Server");

type Scenario = "all encodable" | "one refused in the middle" | "onRefused throws" | "no onRefused";
type Framing = "json" | "sse backlog" | "sse live";
type Hook = "none" | "collect" | "throw";

interface ExpectedLine {
  /** `framing` is the framing's own warning; `hook-threw` is core's containment line. */
  readonly message: "framing" | "hook-threw";
  readonly annotations: Readonly<Record<string, string>>;
}

interface ScenarioSpec {
  readonly ids: ReadonlyArray<string>;
  readonly refusedAt: number | undefined;
  readonly hook: Hook;
  readonly kept: ReadonlyArray<string>;
  /** `[evaluationId, refusal._tag]` pairs the hook receives. */
  readonly collected: ReadonlyArray<readonly [string, string]>;
  readonly lines: ReadonlyArray<ExpectedLine>;
  readonly spans: number;
}

const SCENARIOS = {
  "all encodable": {
    ids: ["before", "middle", "after"],
    refusedAt: undefined,
    hook: "collect",
    kept: ["before", "middle", "after"],
    collected: [],
    lines: [],
    spans: 0,
  },
  "one refused in the middle": {
    ids: ["before", "refused", "after"],
    refusedAt: 1,
    hook: "collect",
    kept: ["before", "after"],
    collected: [["refused", "Opaque"]],
    lines: [],
    spans: 1,
  },
  "onRefused throws": {
    ids: ["before", "refused", "after"],
    refusedAt: 1,
    hook: "throw",
    kept: ["before", "after"],
    collected: [],
    lines: [{ message: "hook-threw", annotations: { "qadi.refusal": "Opaque", evaluationId: "refused" } }],
    spans: 1,
  },
  "no onRefused": {
    ids: ["before", "refused", "after"],
    refusedAt: 1,
    hook: "none",
    kept: ["before", "after"],
    collected: [],
    lines: [
      {
        message: "framing",
        annotations: { "qadi.refusal": "Opaque", "qadi.path": "resource.tags", evaluationId: "refused" },
      },
    ],
    spans: 1,
  },
} satisfies Record<Scenario, ScenarioSpec>;

interface FramingSpec {
  /** Runs the framing over `records` and returns the kept evaluation ids, read back through the codec. */
  readonly drive: (
    records: ReadonlyArray<StoredRecord>,
    options: DecisionLogServeOptions | undefined,
  ) => Effect.Effect<ReadonlyArray<string>>;
  readonly message: string;
  readonly span: string;
}

const idsOf = (decoded: ReadonlyArray<Result.Result<StoredRecord, unknown>>): ReadonlyArray<string> =>
  decoded.flatMap((result) => (Result.isSuccess(result) ? [result.success.evaluationId] : []));

const entriesOf = (records: ReadonlyArray<StoredRecord>): ReadonlyArray<LogEntry> =>
  records.map((record, seq) => ({ cursor: { epoch: 1, seq }, record }));

/** The envelope an SSE frame carries on its `data:` line, read back through the codec. */
const decodeFrame = (text: string): Result.Result<StoredRecord, unknown> => {
  const data = text.split("\n").find((line) => line.startsWith("data: "));
  return data === undefined ? Result.fail("no data line") : decodeStoredRecordString(data.slice("data: ".length));
};

const SSE_MESSAGE = "qadi/http: a decision record could not be framed";
const SSE_SPAN = "qadi.http.decisionStream.refused";

const FRAMINGS = {
  json: {
    drive: (records, options) =>
      Effect.map(jsonElements(records, options), (elements) => idsOf(elements.map(decodeStoredRecord))),
    message: "qadi/http: a decision record could not be served in the backlog",
    span: "qadi.http.decisionBacklog.refused",
  },
  "sse backlog": {
    drive: (records, options) =>
      Effect.map(frameEntries("backlog", entriesOf(records), options), (frames) => idsOf(frames.map(decodeFrame))),
    message: SSE_MESSAGE,
    span: SSE_SPAN,
  },
  "sse live": {
    drive: (records, options) =>
      Effect.map(
        Stream.runCollect(Stream.filterMapEffect(Stream.fromIterable(entriesOf(records)), frameEntry("message", options))),
        (frames) => idsOf(frames.map(decodeFrame)),
      ),
    message: SSE_MESSAGE,
    span: SSE_SPAN,
  },
} satisfies Record<Framing, FramingSpec>;

const recordsOf = (spec: ScenarioSpec): ReadonlyArray<StoredRecord> =>
  spec.ids.map((id, index) =>
    stored(decision(id, index === spec.refusedAt ? { tags: new Set(["x"]) } : undefined)),
  );

describe("the decision log's HTTP wire refuses alike in every framing", () => {
  for (const [framingName, framing] of Object.entries(FRAMINGS)) {
    for (const [scenarioName, scenario] of Object.entries(SCENARIOS)) {
      it.effect(`${framingName} · ${scenarioName}`, () =>
        Effect.gen(function* () {
          const logger = collectingLogger();
          const spans: Array<Tracer.Span> = [];
          const refused: Array<readonly [string, string]> = [];
          const options: DecisionLogServeOptions | undefined =
            scenario.hook === "none"
              ? undefined
              : scenario.hook === "collect"
                ? { onRefused: (refusal: SinkRecordNotEncodable) => void refused.push([refusal.evaluationId, refusal.refusal._tag]) }
                : {
                    onRefused: () => {
                      throw new Error("hook bug");
                    },
                  };

          const kept = yield* framing
            .drive(recordsOf(scenario), options)
            .pipe(Effect.provide(Layer.merge(logger.layer, collectingTracer(spans))));

          assert.deepStrictEqual(kept, scenario.kept);
          assert.deepStrictEqual(refused, scenario.collected);
          assert.strictEqual(logger.lines.length, scenario.lines.length);
          scenario.lines.forEach((expected, index) => {
            const line = logger.lines[index];
            const message = String(line?.message);
            if (expected.message === "framing") assert.strictEqual(message, framing.message);
            else assert.include(message, "hook threw");
            for (const [key, value] of Object.entries(expected.annotations)) {
              assert.strictEqual(line?.annotations[key], value);
            }
          });
          assert.strictEqual(spans.filter((span) => span.name === framing.span).length, scenario.spans);
        }),
      );
    }
  }
});
