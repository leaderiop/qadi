"use client";
/**
 * The shell: a dock across the bottom of the host page.
 *
 * **It does not mount itself.** The host renders `<DevtoolsDock />` where it
 * wants it, and nothing in this package runs on import. An overlay that
 * installed itself would need a side effect at module scope, and this package
 * declares `"sideEffects": false` — so a bundler would be entitled to drop it
 * and the dock would vanish in exactly the production build nobody tests.
 *
 * **The dock is one surface, not the only one.** It presupposes a browser page
 * running the host application, and three of Qadi's six deployments have none —
 * a backend-only service, a serverless function, a replicated server. Their
 * decisions are reachable at `/__decisions`; what renders them is not this.
 */
import { useCallback, useMemo, useState, type FC, type ReactNode } from "react";
import {
  applyFilters,
  environmentsOf,
  noFilters,
  type Filters,
} from "../model/Filters.ts";
import { pairedEntries } from "../model/Pairing.ts";
import { selectionOf } from "../model/Selection.ts";
import { sourceFromRecords, type Source } from "../model/Source.ts";
import { countsOf, type Verdict } from "../model/Verdict.ts";
import { catalogueOf, type Catalogue, type PolicySighting } from "../model/Catalogue.ts";
import type { PortCallLog } from "../model/PortCalls.ts";
import type { PortActivity, WiringReport } from "../model/Wiring.ts";
import type { PairedEntry } from "../model/Pairing.ts";
import type { Selection } from "../model/Selection.ts";
import type { EvaluationPortsLayer } from "../model/SimulationInput.ts";
import type { TimelineEntry } from "../model/Timeline.ts";
import type { Role } from "@qadi/core";
import { DecisionLog } from "./DecisionLog.tsx";
import { Inspector } from "./Inspector.tsx";
import { PolicyExplorer } from "./PolicyExplorer.tsx";
import { QuestionsPanel, type AskedQuestionLike } from "./QuestionsPanel.tsx";
import { RoleViewer } from "./RoleViewer.tsx";
import { ServicesPanel } from "./ServicesPanel.tsx";
import { Simulator } from "./Simulator.tsx";
import { useTimeline } from "./useTimeline.ts";
import { body, button, colors, dock, font, input, muted, toolbar } from "./theme.ts";

/**
 * A stable empty source, so a dock mounted without one does not re-subscribe on
 * every render. `useTimeline` holds its source by identity.
 */
const nothing: Source = sourceFromRecords([]);

/**
 * Data-driven, which is what made growing from two screens to six an entry in
 * this list rather than a rewrite. A seventh is the same.
 */
const TABS = [
  { id: "log", label: "Log" },
  { id: "inspector", label: "Inspector" },
  { id: "policies", label: "Policies" },
  { id: "roles", label: "Roles" },
  { id: "services", label: "Services" },
  { id: "simulator", label: "Simulator" },
  { id: "questions", label: "React" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const VERDICTS: ReadonlyArray<Verdict> = ["Allow", "Deny", "Error", "Unknown"];

export interface DevtoolsDockProps {
  /** Where records come from. Omitted, the dock renders empty rather than throwing. */
  readonly source?: Source;
  /** How many rows to keep. Defaults to the timeline's own bound. */
  readonly capacity?: number;
  /**
   * Policies and roles the application names.
   *
   * Optional because the policy rail is built from what the log has **seen** —
   * every record carries its policy — so this adds only what has not run yet,
   * plus the names. Roles are not observable at all and come only from here.
   */
  readonly catalogue?: Catalogue;
  /** Read with `wiringReport` provided the application's layer. */
  readonly wiring?: WiringReport;
  /** Read with `portActivity`, which needs no wiring at all. */
  readonly activity?: ReadonlyArray<PortActivity>;
  /**
   * Recent port calls, read with `collectPortCalls`.
   *
   * Needs the collector's tracer layer wired where evaluations run, so it is
   * opt-in. Without it the services panel shows counts and says what the detail
   * would take.
   */
  readonly portCalls?: PortCallLog;
  /** Usually `atoms.asked()` from `@qadi/react`. */
  readonly questions?: ReadonlyArray<AskedQuestionLike>;
  /** Parent names `resolveRoleGraph` dropped. */
  readonly unknownParents?: ReadonlyArray<string>;
  /** Verdict disagreements counted by an `onHydrationMismatch` reporter. */
  readonly hydrationMismatches?: number;
  /** Usually `useInvalidate()`. */
  readonly onInvalidate?: () => void;
  /**
   * The application's own resolvers, for the simulator's `Live` source.
   *
   * The only way anything in this package performs I/O, so it is opt-in by the
   * application author. Without it the simulator still works on fixtures, and
   * the `Live` option is shown disabled with the reason.
   */
  readonly ports?: EvaluationPortsLayer;
}

export const DevtoolsDock: FC<DevtoolsDockProps> = ({
  source = nothing,
  capacity,
  catalogue,
  wiring,
  activity = [],
  portCalls,
  questions,
  unknownParents,
  hydrationMismatches,
  onInvalidate,
  ports,
}) => {
  const { timeline, paused, setPaused, clear } = useTimeline(
    source,
    capacity === undefined ? undefined : { capacity },
  );

  const [filters, setFilters] = useState<Filters>(noFilters);
  const [tab, setTab] = useState<TabId>("log");
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);
  /**
   * The row the simulator is seeded from.
   *
   * Separate from `selectedKey` on purpose: moving on in the log should not
   * silently re-seed a form the reviewer is halfway through filling in, so
   * seeding is an act rather than a consequence.
   */
  const [seed, setSeed] = useState<TimelineEntry | undefined>(undefined);

  // Paired against the **whole** timeline and filtered afterwards: pairing a
  // filtered view would make a row look unpaired because its partner happened
  // to be in another environment the reader had narrowed away.
  const rows = useMemo(() => {
    const visible = new Set(applyFilters(timeline.entries, filters));
    return pairedEntries(timeline).filter((row) => visible.has(row.entry));
  }, [timeline, filters]);
  // Of the whole timeline, never of `rows`. A header reading "0 errors" because
  // someone typed in the search box hides the thing they most need to see.
  const counts = useMemo(() => countsOf(timeline.entries), [timeline]);
  const environments = useMemo(() => environmentsOf(timeline.entries), [timeline]);
  const selection = useMemo(() => selectionOf(timeline, selectedKey), [timeline, selectedKey]);
  const sightings = useMemo(() => catalogueOf(timeline, catalogue), [timeline, catalogue]);

  const select = useCallback((key: string) => {
    setSelectedKey(key);
    setTab("inspector");
  }, []);

  // E8.1 — switches tab *and* seeds. Doing only the first would leave the
  // reviewer on a blank form wondering which row they came from.
  const replay = useCallback((entry: TimelineEntry) => {
    setSeed(entry);
    setTab("simulator");
  }, []);

  return (
    <section style={dock} data-testid="qadi-devtools" aria-label="Qadi devtools">
      <div style={toolbar}>
        <strong style={{ color: colors.accent, letterSpacing: 0.6 }}>qadi</strong>

        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            style={button(tab === entry.id)}
            aria-pressed={tab === entry.id}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}

        <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-counts">
          {counts.decisions} decisions · {counts.denies} denied · {counts.errors} errors
          {counts.orphans === 0 ? "" : ` · ${counts.orphans} unattached`}
        </span>

        <input
          style={input}
          placeholder="subject, action, resource…"
          aria-label="Filter decisions"
          value={filters.text}
          onChange={(event) => setFilters({ ...filters, text: event.target.value })}
        />

        <Segment
          label="All"
          options={environments}
          value={filters.environment}
          onChange={(environment) => setFilters({ ...filters, environment })}
        />
        <Segment
          label="Any"
          options={VERDICTS}
          value={filters.verdict}
          onChange={(verdict) => setFilters({ ...filters, verdict: asVerdict(verdict) })}
        />

        <button
          type="button"
          style={button(paused)}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? "paused" : "live"}
        </button>
        {/* Clears the view. It deliberately does not reach back to any sink's
            own log — a devtools panel emptying a server's record buffer would
            be a surprising amount of authority for a button. */}
        <button type="button" style={button(false)} onClick={clear}>
          clear view
        </button>
      </div>

      <div style={body}>
        <Screen
          tab={tab}
          rows={rows}
          selectedKey={selectedKey}
          onSelect={select}
          selection={selection}
          sightings={sightings}
          roles={catalogue?.roles ?? []}
          {...(unknownParents === undefined ? {} : { unknownParents })}
          wiring={wiring}
          activity={activity}
          {...(portCalls === undefined ? {} : { portCalls })}
          questions={questions}
          {...(hydrationMismatches === undefined ? {} : { hydrationMismatches })}
          {...(onInvalidate === undefined ? {} : { onInvalidate })}
          onReplay={replay}
          {...(seed === undefined ? {} : { seed })}
          {...(ports === undefined ? {} : { ports })}
        />
      </div>
    </section>
  );
};

const Segment: FC<{
  readonly label: string;
  readonly options: ReadonlyArray<string>;
  readonly value: string | undefined;
  readonly onChange: (value: string | undefined) => void;
}> = ({ label, options, value, onChange }) => (
  <span style={{ display: "inline-flex", gap: 4 }}>
    <button type="button" style={button(value === undefined)} onClick={() => onChange(undefined)}>
      {label}
    </button>
    {options.map((option) => (
      <button
        key={option}
        type="button"
        style={button(value === option)}
        aria-pressed={value === option}
        onClick={() => onChange(option)}
      >
        {option}
      </button>
    ))}
  </span>
);

/** Narrows a segment's string back to the closed union it came from. */
const asVerdict = (value: string | undefined): Verdict | undefined =>
  VERDICTS.find((verdict) => verdict === value);

/**
 * One tab's body.
 *
 * A lookup rather than a chain of ternaries, so adding a seventh screen is an
 * entry rather than a rewrite — and so the tab model stays the data-driven one
 * `TABS` already is.
 */
const Screen: FC<{
  readonly tab: TabId;
  readonly rows: ReadonlyArray<PairedEntry>;
  readonly selectedKey: string | undefined;
  readonly onSelect: (key: string) => void;
  readonly selection: Selection;
  readonly sightings: ReadonlyArray<PolicySighting>;
  readonly roles: ReadonlyArray<Role>;
  readonly unknownParents?: ReadonlyArray<string>;
  readonly wiring: WiringReport | undefined;
  readonly activity: ReadonlyArray<PortActivity>;
  readonly portCalls?: PortCallLog;
  readonly questions: ReadonlyArray<AskedQuestionLike> | undefined;
  readonly hydrationMismatches?: number;
  readonly onInvalidate?: () => void;
  readonly onReplay: (entry: TimelineEntry) => void;
  readonly seed?: TimelineEntry;
  readonly ports?: EvaluationPortsLayer;
}> = (props) => {
  const screens: Record<TabId, () => ReactNode> = {
    log: () => (
      <DecisionLog rows={props.rows} selectedKey={props.selectedKey} onSelect={props.onSelect} />
    ),
    inspector: () => <Inspector selection={props.selection} onReplay={props.onReplay} />,
    policies: () => <PolicyExplorer sightings={props.sightings} />,
    roles: () => (
      <RoleViewer
        roles={props.roles}
        {...(props.unknownParents === undefined ? {} : { unknownParents: props.unknownParents })}
      />
    ),
    services: () => (
      <ServicesPanel
        wiring={props.wiring}
        activity={props.activity}
        {...(props.portCalls === undefined ? {} : { portCalls: props.portCalls })}
      />
    ),
    simulator: () => (
      <Simulator
        sightings={props.sightings}
        {...(props.seed === undefined ? {} : { seed: props.seed })}
        {...(props.ports === undefined ? {} : { ports: props.ports })}
      />
    ),
    questions: () => (
      <QuestionsPanel
        questions={props.questions}
        {...(props.hydrationMismatches === undefined
          ? {}
          : { hydrationMismatches: props.hydrationMismatches })}
        {...(props.onInvalidate === undefined ? {} : { onInvalidate: props.onInvalidate })}
      />
    ),
  };

  return <>{screens[props.tab]()}</>;
};
