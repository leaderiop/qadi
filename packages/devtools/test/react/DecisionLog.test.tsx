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
import { fireEvent, render, screen } from "@testing-library/react";
import type { PairedEntry } from "../../src/model/Pairing.ts";
import { emptyTimeline, entryKey, ingestAll } from "../../src/model/Timeline.ts";
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

// A keyboard/switch user has no pointer, so the row's only way in was
// unreachable to them (WCAG 2.1.1). This pins that the row is a stop on the
// keyboard tab order and that Enter/Space select it, the same as a click.
describe("keyboard selection", () => {
  it("is in the tab order", () => {
    const row = rowOf(entryOf(decisionRecord({ evaluationId: "a" })));
    render(<DecisionLog rows={[row]} selectedKey={undefined} onSelect={() => {}} />);

    assert.strictEqual(screen.getByTestId("qadi-log-row").getAttribute("tabindex"), "0");
  });

  it("selects on Enter", () => {
    const entry = entryOf(decisionRecord({ evaluationId: "a" }));
    const selected: Array<string> = [];
    render(
      <DecisionLog rows={[rowOf(entry)]} selectedKey={undefined} onSelect={(key) => selected.push(key)} />,
    );

    fireEvent.keyDown(screen.getByTestId("qadi-log-row"), { key: "Enter" });

    assert.deepStrictEqual(selected, [entryKey(entry)]);
  });

  it("selects on Space", () => {
    const entry = entryOf(decisionRecord({ evaluationId: "a" }));
    const selected: Array<string> = [];
    render(
      <DecisionLog rows={[rowOf(entry)]} selectedKey={undefined} onSelect={(key) => selected.push(key)} />,
    );

    fireEvent.keyDown(screen.getByTestId("qadi-log-row"), { key: " " });

    assert.deepStrictEqual(selected, [entryKey(entry)]);
  });

  it("ignores every other key", () => {
    const row = rowOf(entryOf(decisionRecord({ evaluationId: "a" })));
    const selected: Array<string> = [];
    render(<DecisionLog rows={[row]} selectedKey={undefined} onSelect={(key) => selected.push(key)} />);

    fireEvent.keyDown(screen.getByTestId("qadi-log-row"), { key: "ArrowDown" });

    assert.deepStrictEqual(selected, []);
  });

  it("reports its selection state through aria-selected", () => {
    const entry = entryOf(decisionRecord({ evaluationId: "a" }));
    render(<DecisionLog rows={[rowOf(entry)]} selectedKey={entryKey(entry)} onSelect={() => {}} />);

    assert.strictEqual(screen.getByTestId("qadi-log-row").getAttribute("aria-selected"), "true");
  });
});
