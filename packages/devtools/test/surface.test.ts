/**
 * The interface of `@qadi/devtools`, as a list (ARCH-40, ADR-QD-047's amendment).
 *
 * The barrels name their exports, so the list of values below *is* the
 * interface a host crosses: the three stores (`TimelineStore`,
 * `SimulationSession`, `DiagnosticsStore`) with their runners, the host wiring
 * the dock takes, and the timeline readings ADR-QD-047 lists. A screen's
 * mechanics (form codecs, sweep planning, remedies, capture, replay, role
 * trees, gate grouping, lens geometry) are package-private.
 *
 * Changing the list is three deliberate edits, not one: the barrel line, a
 * `spec/overview.md` row (gate 13), and this file. The types are pinned by
 * `surface.tst.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as ReactEntry from "../src/react/index.ts";
import * as Root from "../src/index.ts";

const ROOT_VALUES: ReadonlyArray<string> = [
  "DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS",
  "DEFAULT_PORT_CALL_CAPACITY",
  "DEFAULT_TIMELINE_CAPACITY",
  "Evicted",
  "NoSelection",
  "Selected",
  "TimelineDecision",
  "TimelineOrphan",
  "WiringRead",
  "applyFilters",
  "catalogueOf",
  "collectPortCalls",
  "countsOf",
  "describeTracePath",
  "emptyTimeline",
  "entryKey",
  "environmentsOf",
  "flattenTree",
  "hasHydrated",
  "hydrationActivity",
  "ingest",
  "ingestAll",
  "inspect",
  "inspectEntry",
  "isNeverResolved",
  "isTruncated",
  "isUnfiltered",
  "makeDiagnosticsStore",
  "makeSimulationSession",
  "makeTimelineStore",
  "mergeReading",
  "mergeSources",
  "noDiagnostics",
  "noFilters",
  "pairedEntries",
  "pairsOf",
  "portActivity",
  "runDiagnostics",
  "runSource",
  "searchTextOf",
  "selectionOf",
  "sourceFromEventSource",
  "sourceFromRecords",
  "unaccountedEntries",
  "verdictOf",
  "verdictOfOutcome",
  "wiringReport",
];

const REACT_VALUES: ReadonlyArray<string> = [
  "DevtoolsDock",
  "useDiagnostics",
  "useOwnedSimulationSession",
  "useSimulationSession",
  "useSimulationSnapshot",
  "useTimeline",
  "useTimelineStore",
];

describe("@qadi/devtools' interface (ADR-QD-047, ADR-QD-099)", () => {
  it("the root exports exactly the stores, the host wiring and the timeline readings", () => {
    assert.deepStrictEqual(Object.keys(Root).sort(), [...ROOT_VALUES].sort());
  });

  it("the React entry exports exactly the dock and the stores' hooks", () => {
    assert.deepStrictEqual(Object.keys(ReactEntry).sort(), [...REACT_VALUES].sort());
  });
});
