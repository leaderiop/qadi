/**
 * The Inspector's outcome and obligation rendering, pinned.
 *
 * Characterisation tests: they state what the Inspector renders for each kind
 * of record, written before its outcome reading moved into `readOutcome`
 * (ARCH-67, D-03), and they must pass unchanged on both sides of that move.
 * Records come from the shared builders, folded through the real timeline, so
 * the entry the Inspector receives is the one the dock would hand it.
 */
import { assert, describe, it } from "@effect/vitest";
import { render, screen } from "@testing-library/react";
import { Decided, MissingResource, obligation } from "@qadi/core";
import type { Decision, StoredRecord } from "@qadi/core";
import { Selected } from "../../src/model/Selection.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import { Inspector } from "../../src/react/Inspector.tsx";
import { allow, decisionRecord, deny, failedRecord, obligationRecord } from "../helpers.ts";

const fail = (): never => {
  throw new Error("expected a timeline entry");
};

/** Renders the Inspector over the first entry the records fold into. */
const inspectFirst = (records: ReadonlyArray<StoredRecord>) => {
  const entry = ingestAll(emptyTimeline(), records).entries[0] ?? fail();
  render(<Inspector selection={new Selected({ entry })} />);
};

const owing = allow({ obligations: [obligation("audit")] });

const decided = (decision: Decision) =>
  decisionRecord({ outcome: new Decided({ decision }) });

const UNREPORTED =
  "Outcome not yet reported. An undischarged binding duty turns this allow into a refusal at the enforcement boundary.";

const reportedText = (outcome: string) =>
  `Gate outcome: ${outcome}. Per-duty state is not observable — a handler receives the whole set and reports once.`;

describe("Inspector — the outcome", () => {
  it("a failed record shows the failure panel with the error's tag, and no tree, fields or duties", () => {
    inspectFirst([failedRecord({ error: new MissingResource({ attribute: "doc.owner" }) })]);

    assert.strictEqual(screen.getByTestId("qadi-failure-tag").textContent, "MissingResource");
    assert.include(screen.getByTestId("qadi-failure").textContent ?? "", "not a denial");
    assert.isNull(screen.queryByTestId("qadi-explanation"));
    assert.isNull(screen.queryByTestId("qadi-fields"));
    assert.isNull(screen.queryByTestId("qadi-obligations"));
  });

  it("a denied record shows the tree and no field or duty list", () => {
    inspectFirst([decided(deny())]);

    assert.isNotNull(screen.getByTestId("qadi-explanation"));
    assert.strictEqual(screen.getAllByTestId("qadi-node")[0]?.getAttribute("data-status"), "Denied");
    assert.isNull(screen.queryByTestId("qadi-failure"));
    assert.isNull(screen.queryByTestId("qadi-fields"));
    assert.isNull(screen.queryByTestId("qadi-obligations"));
  });

  it("an allowed record shows the tree, its fields and its duties", () => {
    inspectFirst([
      decided(allow({ visibleFields: ["id", "title"], obligations: [obligation("audit")] })),
    ]);

    assert.isNotNull(screen.getByTestId("qadi-explanation"));
    assert.strictEqual(screen.getAllByTestId("qadi-node")[0]?.getAttribute("data-status"), "Allowed");
    assert.isNull(screen.queryByTestId("qadi-failure"));
    assert.strictEqual(screen.getByTestId("qadi-fields-some").textContent, "id, title");
    assert.include(screen.getByTestId("qadi-obligations").textContent ?? "", "audit");
  });

  it("an allow with undefined fields shows every field, not none (INV-QD-004)", () => {
    inspectFirst([decided(allow({ visibleFields: undefined }))]);

    assert.isNotNull(screen.getByTestId("qadi-fields-all"));
    assert.isNull(screen.queryByTestId("qadi-fields-none"));
  });
});

describe("Inspector — the obligation state", () => {
  it("none owed: no obligations panel and no state line", () => {
    inspectFirst([decided(allow())]);

    assert.isNull(screen.queryByTestId("qadi-obligations"));
    assert.isNull(screen.queryByTestId("qadi-obligation-state"));
  });

  it("owed and not yet reported", () => {
    inspectFirst([decided(owing)]);

    assert.strictEqual(screen.getByTestId("qadi-obligation-state").textContent, UNREPORTED);
  });

  it("reported, with the gate's outcome", () => {
    inspectFirst([decided(owing), obligationRecord({ outcome: "Refused" })]);

    assert.strictEqual(screen.getByTestId("qadi-obligation-state").textContent, reportedText("Refused"));
  });

  it("a report on an allow that listed no duties is still shown", () => {
    inspectFirst([decided(allow()), obligationRecord({ outcome: "NotRequired" })]);

    assert.strictEqual(
      screen.getByTestId("qadi-obligation-state").textContent,
      reportedText("NotRequired"),
    );
  });

  it("a report on a denied record is still shown, beside the tree", () => {
    inspectFirst([decided(deny()), obligationRecord({ outcome: "Discharged" })]);

    assert.isNotNull(screen.getByTestId("qadi-explanation"));
    assert.isNull(screen.queryByTestId("qadi-fields"));
    assert.strictEqual(
      screen.getByTestId("qadi-obligation-state").textContent,
      reportedText("Discharged"),
    );
  });

  it("a report on a failed record is still shown, beside the failure", () => {
    inspectFirst([failedRecord(), obligationRecord({ outcome: "HandlerFailed" })]);

    assert.isNotNull(screen.getByTestId("qadi-failure"));
    assert.strictEqual(
      screen.getByTestId("qadi-obligation-state").textContent,
      reportedText("HandlerFailed"),
    );
  });
});
