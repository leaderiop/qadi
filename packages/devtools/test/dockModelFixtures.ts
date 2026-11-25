/**
 * The fixtures of a built dock model, read by `DockModel.test.ts` and by the
 * characterisation of the model's computed stores.
 *
 * One copy, so a fixture fixed in one file is fixed in the other: both build the
 * same one-port wiring, the same activity and call log, and read the same rows.
 * What a test of a store or a feed reads too (`heardOn`, `guard`, `tick`) lives in
 * `helpers.ts`.
 */
import { assert } from "@effect/vitest";
import { WiringRead } from "../src/model/Diagnostics.ts";
import type { DockModel } from "../src/model/DockModel.ts";
import type { QuestionsSnapshot } from "../src/model/Gates.ts";
import type { HydrationActivity } from "../src/model/Hydration.ts";
import type { PortCallLog } from "../src/model/PortCalls.ts";
import type { PortCardRow } from "../src/model/PortCards.ts";
import type { PortActivity } from "../src/model/Wiring.ts";
import { heardOn } from "./helpers.ts";

/** The ids asking each asked question, row by row; empty with no rows. */
export const askingIds = (
  snapshot: QuestionsSnapshot,
): ReadonlyArray<ReadonlyArray<string>> =>
  snapshot.questions._tag === "Rows"
    ? snapshot.questions.rows.map((row) => row.asking?.map((one) => one.id) ?? [])
    : [];

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
export const heardOf = (model: DockModel) => heardOn(model.services);

/** The one activity a test supplies as the host's own reading. */
export const suppliedActivity: ReadonlyArray<PortActivity> = activityOf(1);

/** A reading holding every field the services store reads. */
export const oneReading = () => ({
  wiring: wiringNamed("one"),
  activity: activityOf(1),
  portCalls: logOf("tier"),
});

/** The hydration activity a test supplies as the host's own reading. */
export const suppliedHydration: HydrationActivity = {
  dehydrated: 2,
  seeded: 1,
  rechecked: 0,
  mismatched: 0,
  drops: [],
};
