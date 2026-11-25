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
import type { FC, ReactNode } from "react";
import type { Verdict } from "../model/Verdict.ts";
import type { Diagnostics } from "../model/Diagnostics.ts";
import type { DockModel, DockModelInputs } from "../model/DockModel.ts";
import type { DockSnapshot, TabId } from "../model/DockSession.ts";
import { DecisionLog } from "./DecisionLog.tsx";
import type { DiagnosticsNoticeProps } from "./DiagnosticsNotice.tsx";
import { focusRingProps } from "./focusRing.ts";
import { Inspector } from "./Inspector.tsx";
import { PolicyExplorer } from "./PolicyExplorer.tsx";
import { QuestionsPanel } from "./QuestionsPanel.tsx";
import { RoleViewer } from "./RoleViewer.tsx";
import { ServicesPanel } from "./ServicesPanel.tsx";
import { Simulator } from "./Simulator.tsx";
import { TimelineNotice, type TimelineNoticeProps } from "./TimelineNotice.tsx";
import { useDockModel } from "./useDockModel.ts";
import { useStopNotice } from "./useStopNotice.ts";
import { usePaused, useStoreSnapshot } from "./useStoreSnapshot.ts";
import { body, button, colors, dock as dockStyle, font, input, muted, toolbar } from "./theme.ts";

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

/**
 * Which tabs render entries from the timeline, and so state its stop above them.
 *
 * Closed over `TabId`, so a new tab is a compile error until it says whether it reads the
 * timeline: a set would let a new tab default to "no" and show stale entries unmarked.
 */
const readsTimeline: Record<TabId, boolean> = {
  log: true,
  inspector: true,
  policies: true,
  roles: false,
  services: false,
  simulator: true,
  questions: false,
};

const VERDICTS: ReadonlyArray<Verdict> = ["Allow", "Deny", "Error", "Unknown"];

/**
 * What `DevtoolsDock` takes: the dock model's inputs, stated once on `DockModelInputs`, and
 * the two the host hands its screens untouched.
 */
export interface DevtoolsDockProps extends DockModelInputs {
  /** Parent names `resolveRoleGraph` dropped. */
  readonly unknownParents?: ReadonlyArray<string> | undefined;
  /** Usually `useInvalidate()`. */
  readonly onInvalidate?: (() => void) | undefined;
}

/** What the dock hands its screens untouched: the host's own, not the model's. */
type HostProps = Pick<DevtoolsDockProps, "unknownParents" | "onInvalidate">;

export const DevtoolsDock: FC<DevtoolsDockProps> = ({ unknownParents, onInvalidate, ...inputs }) => {
  /**
   * The model owns every store a screen reads, so leaving a tab is not a choice
   * the reviewer made by looking elsewhere and coming back (INV-QD-107), and the
   * rules between the stores (a new timeline reaches every screen, a replay
   * commands the simulation, an unchanged prop dispatches nothing) are its, not
   * this view's (ARCH-74).
   *
   * It is built in a scope this component owns, so it does not exist on the first
   * pass, and the frame below, whose hooks read it once, is not rendered until it does.
   */
  const model = useDockModel(inputs);

  return model === undefined ? null : <DockFrame model={model} host={{ unknownParents, onInvalidate }} />;
};

/**
 * The dock once its model exists: the toolbar over the one screen the reviewer chose.
 *
 * Split from the owner because every reader below reads the model once, and so must
 * never be handed one that is not there yet, or one a hidden `Activity` has closed.
 */
const DockFrame: FC<{
  readonly model: DockModel;
  readonly host: HostProps;
}> = ({ model, host }) => {
  const { dock, timeline } = model;
  const view = useStoreSnapshot(dock);
  // Each field is the supplied reading's when it carries one, and the sample's otherwise: the model merges.
  const { status, reading: shown } = useStoreSnapshot(model.diagnostics);
  const notice = useStopNotice(status, model.diagnostics.restart);
  const timelineStatus = useStoreSnapshot(model.timelineStatus);
  const timelineNotice = useStopNotice(timelineStatus, model.timelineStatus.restart);
  const paused = usePaused(timeline);

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
          onClick={() => timeline.setPaused(!paused)}
        >
          {paused ? "paused" : "live"}
        </button>
        {/* Clears the view. It deliberately does not reach back to any sink's
            own log — a devtools panel emptying a server's record buffer would
            be a surprising amount of authority for a button. */}
        <button type="button" style={button(false)} onClick={() => timeline.clear()}>
          clear view
        </button>
      </div>

      <div style={body} tabIndex={-1} data-testid="qadi-dock-body" {...focusRingProps}>
        <Screen
          model={model}
          view={view}
          shown={shown}
          notice={notice}
          timeline={timelineNotice}
          host={host}
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
  readonly model: DockModel;
  readonly view: DockSnapshot;
  readonly shown: Diagnostics;
  readonly notice: DiagnosticsNoticeProps;
  readonly timeline: TimelineNoticeProps;
  readonly host: HostProps;
}> = (props) => {
  const { notice } = props;
  const screens: Record<TabId, () => ReactNode> = {
    log: () => (
      <DecisionLog
        rows={props.view.rows}
        selectedKey={props.view.selectedKey}
        onSelect={props.model.dock.select}
      />
    ),
    inspector: () => (
      <Inspector selection={props.view.selection} onReplay={props.model.dock.replay} />
    ),
    policies: () => <PolicyExplorer session={props.model.explorer} />,
    roles: () => (
      <RoleViewer choice={props.model.roles} unknownParents={props.host.unknownParents} />
    ),
    services: () => (
      <ServicesPanel services={props.model.services} diagnostics={notice} />
    ),
    simulator: () => <Simulator session={props.model.simulation} />,
    questions: () => (
      <QuestionsPanel
        questions={props.model.questions}
        lens={props.model.lens}
        hydration={props.shown.hydration}
        onInvalidate={props.host.onInvalidate}
        diagnostics={notice}
      />
    ),
  };

  return (
    <>
      {readsTimeline[props.view.tab] ? <TimelineNotice {...props.timeline} /> : null}
      {screens[props.view.tab]()}
    </>
  );
};
