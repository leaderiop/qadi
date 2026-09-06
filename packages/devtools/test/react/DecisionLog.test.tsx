/**
 * The subject column, across both outcomes.
 *
 * `DecisionRecord.subjectId` is top-level for both `Decided` and `Failed`
 * (`DecisionRecord.ts`), so the log's subject cell must read it the same way
 * regardless of outcome — a `Failed` row blanking the column here is the same
 * drift the model-level fixes in `Replay.ts` and `Filters.ts` correct.
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PairedEntry } from "../../src/model/Pairing.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import type { TimelineEntry } from "../../src/model/Timeline.ts";
import { DecisionLog } from "../../src/react/DecisionLog.tsx";
import { decisionRecord, failedRecord } from "../helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const entryOf = (record: Parameters<typeof ingestAll>[1][number]): TimelineEntry => {
  const [entry] = ingestAll(emptyTimeline(), [record]).entries;
  if (entry === undefined) throw new Error("expected a timeline entry");
  return entry;
};

const rowOf = (entry: TimelineEntry): PairedEntry => ({
  entry,
  role: "Alone",
  partners: [],
  disagrees: false,
});

const subjectCells = () =>
  screen.getAllByTestId("qadi-log-row").map((row) => row.querySelectorAll("td")[1]?.textContent);

describe("the subject column", () => {
  it("reads the subject id for a decided row", () => {
    const row = rowOf(entryOf(decisionRecord({ evaluationId: "a", subjectId: "alice" })));
    render(<DecisionLog rows={[row]} selectedKey={undefined} onSelect={() => {}} />);

    assert.deepStrictEqual(subjectCells(), ["alice"]);
  });

  // The regression: a Failed outcome carries no `Decision`, but `subjectId` is
  // top-level on `DecisionRecord` regardless — the column must not blank out.
  it("reads the subject id for a failed row too, not a blank cell", () => {
    const row = rowOf(entryOf(failedRecord({ evaluationId: "e", subjectId: "carol" })));
    render(<DecisionLog rows={[row]} selectedKey={undefined} onSelect={() => {}} />);

    assert.deepStrictEqual(subjectCells(), ["carol"]);
  });
});
