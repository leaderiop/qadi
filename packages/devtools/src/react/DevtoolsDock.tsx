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
import { useMemo, type FC, type ReactNode } from "react";
import { sourceFromRecords, type Source } from "../model/Source.ts";
import type { Verdict } from "../model/Verdict.ts";
import { catalogueOf, type Catalogue, type PolicySighting } from "../model/Catalogue.ts";
import {
  mergeReading,
  type Diagnostics,
  type DiagnosticsReading,
  type WiringRead,
} from "../model/DiagnosticsStore.ts";
import type { TabId } from "../model/DockSession.ts";
import type { ExplorerSession } from "../model/ExplorerSession.ts";
import type { HeldChoiceStore } from "../model/HeldChoice.ts";
import { sameRole } from "../model/RoleTree.ts";
import type { PortCallLog } from "../model/PortCalls.ts";
import type { AskedQuestionLike, GateInstanceLike } from "../model/Gates.ts";
import type { HydrationActivity } from "../model/Hydration.ts";
import type { PortActivity } from "../model/Wiring.ts";
import type { PairedEntry } from "../model/Pairing.ts";
import type { Selection } from "../model/Selection.ts";
import type { EvaluationPortsLayer } from "../model/SimulationInput.ts";
import type { SimulationSession } from "../model/SimulationSession.ts";
import type { TimelineEntry } from "../model/Timeline.ts";
import type { Role } from "@qadi/core";
import { DecisionLog } from "./DecisionLog.tsx";
import { Inspector } from "./Inspector.tsx";
import { PolicyExplorer } from "./PolicyExplorer.tsx";
import { QuestionsPanel } from "./QuestionsPanel.tsx";
import { RoleViewer } from "./RoleViewer.tsx";
import { ServicesPanel } from "./ServicesPanel.tsx";
import { Simulator } from "./Simulator.tsx";
import { useDiagnostics, type DiagnosticsDockOptions } from "./useDiagnostics.ts";
import { useDockSnapshot, useOwnedDockSession } from "./useDockSession.ts";
import { useOwnedExplorerSession, useOwnedHeldChoice } from "./useExplorerSession.ts";
import { useOwnedSimulationSession } from "./useSimulationSession.ts";
import { useTimeline, type UseTimeline } from "./useTimeline.ts";
import { body, button, colors, dock as dockStyle, font, input, muted, toolbar } from "./theme.ts";

/**
 * A stable empty source, so a dock mounted without one does not re-subscribe on
 * every render. `useTimeline` holds its source by identity.
 */
const nothing: Source = sourceFromRecords([]);

/** A stable empty list, so an absent catalogue does not dispatch `setList` on every render. */
const NO_ROLES: ReadonlyArray<Role> = [];

/**
 * Data-driven, which is what made growing from two screens to six an entry in
 * this list rather than a rewrite. A seventh is the same. Typed against the
 * session's closed `TabId`, so the list and the union cannot drift apart.
 */
const TABS = [
  { id: "log", label: "Log" },
  { id: "inspector", label: "Inspector" },
  { id: "policies", label: "Policies" },
  { id: "roles", label: "Roles" },
  { id: "services", label: "Services" },
  { id: "simulator", label: "Simulator" },
  { id: "questions", label: "React" },
] as const satisfies ReadonlyArray<{ readonly id: TabId; readonly label: string }>;

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
  /**
   * What to sample while the dock is mounted: the application's layer, the
   * port-call collector and a question source, each optional.
   *
   * The way to keep the Services and React panels current without writing the
   * loop: the dock samples on a schedule, keeps a reading's identity while it is
   * unchanged, and releases the layer on unmount. Absent, nothing is sampled and
   * the panels explain what they would need; `{}` samples the metric reads
   * alone. Hold the fields at module scope, since the run restarts when one of
   * them changes identity.
   *
   * Gates are not in it: they are pushed by `@qadi/react`'s registry through the
   * host's subscription, and stay the plain `gates` prop below.
   */
  readonly diagnostics?: DiagnosticsDockOptions;
  /**
   * A reading taken elsewhere, such as another process's or a fixture's.
   *
   * Each field it carries takes precedence over the same field of what
   * `diagnostics` samples, and a field it omits falls through to the sample
   * (`mergeReading`). It answers "what did another process see", which sampling
   * this one cannot: for this process, hand over `diagnostics` instead. Its
   * `wiring` is a `WiringRead`, so a reading from elsewhere can state a failed
   * read as well as a report; its `portCalls` come from `collectPortCalls` and
   * need the collector's tracer layer wired where evaluations ran; its
   * `questions` are usually `atoms.asked()` from `@qadi/react`.
   */
  readonly reading?: DiagnosticsReading;
  /**
   * The live guards, usually `useGateInstances()` or `atoms.gates.instances()` from `@qadi/react`.
   *
   * Needs `instrument` on the `QadiProvider`, so it is opt-in twice over — a
   * host has to ask for the registry and then hand it here.
   */
  readonly gates?: ReadonlyArray<GateInstanceLike>;
  /** Parent names `resolveRoleGraph` dropped. */
  readonly unknownParents?: ReadonlyArray<string>;
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
  diagnostics,
  reading,
  unknownParents,
  gates,
  onInvalidate,
  ports,
}) => {
  const timeline = useTimeline(source, capacity === undefined ? undefined : { capacity });

  // Each field is the supplied reading's when it carries one, and the sampled
  // reading's otherwise: a supplied reading answers "what another process or a
  // fixture saw", which a sample of this one cannot.
  const sampled = useDiagnostics(diagnostics);
  const shown = useMemo(() => mergeReading(sampled, reading), [sampled, reading]);

  const sightings = useMemo(
    () => catalogueOf(timeline.timeline, catalogue),
    [timeline.timeline, catalogue],
  );
  /**
   * The simulator's session, owned here rather than by the screen.
   *
   * A screen is unmounted when its tab is left, and a session held by it would
   * take the form, the capture (one round of live I/O) and the result with it.
   * Held by the dock it survives a round trip, and the seed and ports arrive
   * as commands rather than being re-derived on each render.
   *
   * It is built in a scope this component owns, so it does not exist on the first
   * pass, and the frame below, whose hooks read it once, is not rendered until it does.
   */
  const simulation = useOwnedSimulationSession({ sightings, ports });

  return simulation === undefined ? null : (
    <DockFrame
      timeline={timeline}
      sightings={sightings}
      shown={shown}
      catalogue={catalogue}
      unknownParents={unknownParents}
      gates={gates}
      onInvalidate={onInvalidate}
      simulation={simulation}
    />
  );
};

/**
 * The dock once its simulation exists: its own choices, the other screens' sessions, and the page.
 *
 * Split from the owner because `useOwnedDockSession` reads its replay target once,
 * at construction, and so must never be handed a session that is not there yet.
 */
const DockFrame: FC<{
  readonly timeline: UseTimeline;
  readonly sightings: ReadonlyArray<PolicySighting>;
  readonly shown: Diagnostics;
  readonly catalogue: Catalogue | undefined;
  readonly unknownParents: ReadonlyArray<string> | undefined;
  readonly gates: ReadonlyArray<GateInstanceLike> | undefined;
  readonly onInvalidate: (() => void) | undefined;
  readonly simulation: SimulationSession;
}> = ({
  timeline: { timeline, paused, setPaused, clear },
  sightings,
  shown,
  catalogue,
  unknownParents,
  gates,
  onInvalidate,
  simulation,
}) => {
  /**
   * The explorer's session and the role viewer's choice, owned here for the
   * simulator's reason: what a screen shows is not a choice the reviewer made by
   * looking elsewhere and coming back (INV-QD-107).
   */
  const explorer = useOwnedExplorerSession(sightings);
  const roleChoice = useOwnedHeldChoice(catalogue?.roles ?? NO_ROLES, sameRole);
  /**
   * The dock's own choices — tab, filters, selected row — and what they derive.
   *
   * Rows are the whole timeline paired, then filtered; counts are of the whole
   * timeline; replay switches tab *and* commands the simulation to re-seed, every
   * time (E8.1, ARCH-63). Those rules are `DockSession.ts`'s, not this view's.
   */
  const dock = useOwnedDockSession(timeline, simulation);
  const view = useDockSnapshot(dock);

  return (
    <section style={dockStyle} data-testid="qadi-devtools" aria-label="Qadi devtools">
      <div style={toolbar}>
        <strong style={{ color: colors.accent, letterSpacing: 0.6 }}>qadi</strong>

        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            style={button(view.tab === entry.id)}
            aria-pressed={view.tab === entry.id}
            onClick={() => dock.setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}

        <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-counts">
          {view.counts.decisions} decisions · {view.counts.denies} denied · {view.counts.errors} errors
          {view.counts.orphans === 0 ? "" : ` · ${view.counts.orphans} unattached`}
        </span>

        <input
          style={input}
          placeholder="subject, action, resource…"
          aria-label="Filter decisions"
          value={view.filters.text}
          onChange={(event) => dock.setFilters({ ...view.filters, text: event.target.value })}
        />

        <Segment
          label="All"
          options={view.environments}
          value={view.filters.environment}
          onChange={(environment) => dock.setFilters({ ...view.filters, environment })}
        />
        <Segment
          label="Any"
          options={VERDICTS}
          value={view.filters.verdict}
          onChange={(verdict) => dock.setFilters({ ...view.filters, verdict: asVerdict(verdict) })}
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
          tab={view.tab}
          rows={view.rows}
          selectedKey={view.selectedKey}
          onSelect={dock.select}
          selection={view.selection}
          sightings={sightings}
          explorer={explorer}
          roleChoice={roleChoice}
          {...(unknownParents === undefined ? {} : { unknownParents })}
          wiring={shown.wiring}
          activity={shown.activity}
          {...(shown.portCalls === undefined ? {} : { portCalls: shown.portCalls })}
          questions={shown.questions}
          {...(gates === undefined ? {} : { gates })}
          {...(shown.hydration === undefined ? {} : { hydration: shown.hydration })}
          {...(onInvalidate === undefined ? {} : { onInvalidate })}
          onReplay={dock.replay}
          simulation={simulation}
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
  readonly explorer: ExplorerSession;
  readonly roleChoice: HeldChoiceStore<Role>;
  readonly unknownParents?: ReadonlyArray<string>;
  readonly wiring: WiringRead;
  readonly activity: ReadonlyArray<PortActivity>;
  readonly portCalls?: PortCallLog;
  readonly questions: ReadonlyArray<AskedQuestionLike> | undefined;
  readonly gates?: ReadonlyArray<GateInstanceLike>;
  readonly hydration?: HydrationActivity;
  readonly onInvalidate?: () => void;
  readonly onReplay: (entry: TimelineEntry) => void;
  readonly simulation: SimulationSession;
}> = (props) => {
  const screens: Record<TabId, () => ReactNode> = {
    log: () => (
      <DecisionLog rows={props.rows} selectedKey={props.selectedKey} onSelect={props.onSelect} />
    ),
    inspector: () => <Inspector selection={props.selection} onReplay={props.onReplay} />,
    policies: () => <PolicyExplorer session={props.explorer} />,
    roles: () => (
      <RoleViewer
        choice={props.roleChoice}
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
    simulator: () => <Simulator sightings={props.sightings} session={props.simulation} />,
    questions: () => (
      <QuestionsPanel
        questions={props.questions}
        {...(props.gates === undefined ? {} : { gates: props.gates })}
        {...(props.hydration === undefined ? {} : { hydration: props.hydration })}
        {...(props.onInvalidate === undefined ? {} : { onInvalidate: props.onInvalidate })}
      />
    ),
  };

  return <>{screens[props.tab]()}</>;
};
