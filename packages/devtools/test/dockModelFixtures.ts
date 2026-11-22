/**
 * The dock model fixtures that more than one test file reads.
 *
 * One copy, so a fixture fixed in one file is fixed in every file that reads it:
 * `DockModel.test.ts` and the characterisation of the model's computed stores
 * build the same guards, the same one-port wiring and the same reading.
 */
import { assert } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as TestClock from "effect/testing/TestClock";
import type { Policy, Resource } from "@qadi/core";
import { WiringRead } from "../src/model/DiagnosticsStore.ts";
import type { DockModel } from "../src/model/DockModel.ts";
import type { GateInstanceLike, QuestionsSnapshot } from "../src/model/Gates.ts";
import type { PortCallLog } from "../src/model/PortCalls.ts";
import type { PortCardRow } from "../src/model/PortCards.ts";
import type { PortActivity } from "../src/model/Wiring.ts";
import { settleTurns } from "./helpers.ts";

/** The ids asking each asked question, row by row; empty with no rows. */
export const askingIds = (
  snapshot: QuestionsSnapshot,
): ReadonlyArray<ReadonlyArray<string>> =>
  snapshot.questions._tag === "Rows"
    ? snapshot.questions.rows.map((row) => row.asking?.map((one) => one.id) ?? [])
    : [];

/** Settles every fiber, steps the clock one poll interval, settles again. */
export const tick = Effect.gen(function* () {
  yield* settleTurns;
  yield* TestClock.adjust("2 seconds");
  yield* settleTurns;
});

/** One live guard asking `policy`, in the Allowed state unless a test says otherwise. */
export const guard = (
  id: string,
  policy: Policy,
  fields?: { readonly state?: string; readonly resource?: Resource | undefined },
): GateInstanceLike => ({
  id,
  kind: "Can",
  policy,
  state: fields?.state ?? "Allowed",
  resource: fields?.resource,
});

/** A one-port `Read` wiring whose only row is the AttributeResolver, named `name`. */
export const wiringNamed = (name: string): WiringRead =>
  WiringRead.Read({
    report: {
      ports: [
        {
          port: "AttributeResolver",
          name,
          required: true,
          present: true,
          defaulted: false,
          consequence: "an attribute policy denies",
        },
      ],
      cache: { present: false, size: undefined },
    },
  });

/** The AttributeResolver's activity, `calls` calls and nothing else. */
export const activityOf = (calls: number): ReadonlyArray<PortActivity> => [
  { port: "AttributeResolver", calls, retries: 0, timeouts: 0, translationCalls: 0 },
];

/** A call log holding one resolved attribute read per `attributes` entry. */
export const logOf = (...attributes: ReadonlyArray<string>): PortCallLog => ({
  calls: attributes.map((attribute, index) => ({
    _tag: "AttributeResolver",
    span: "qadi.attribute",
    interpreter: undefined,
    at: index + 1,
    durationMillis: 1,
    subjectId: "alice",
    attribute,
    resolved: true,
  })),
  dropped: 0,
  capacity: 200,
});

/** The AttributeResolver row of the services store's current snapshot. */
export const rowOf = (model: DockModel): PortCardRow => {
  const view = model.services.getSnapshot();
  if (view._tag !== "Read") return assert.fail(`expected Read, got ${view._tag}`);
  const row = view.rows[0];
  if (row === undefined) return assert.fail("expected a row");
  return row;
};

/** A counter of the services store's notifications, subscribed from now on. */
export const heardOf = (model: DockModel) => {
  const heard = { calls: 0 };
  model.services.subscribe(() => {
    heard.calls += 1;
  });
  return heard;
};
