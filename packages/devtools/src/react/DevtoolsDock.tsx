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
import { useCallback, useMemo, useState, type FC } from "react";
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
import { DecisionLog } from "./DecisionLog.tsx";
import { Inspector } from "./Inspector.tsx";
import { useTimeline } from "./useTimeline.ts";
import { body, button, colors, dock, font, input, muted, toolbar } from "./theme.ts";

/**
 * A stable empty source, so a dock mounted without one does not re-subscribe on
 * every render. `useTimeline` holds its source by identity.
 */
const nothing: Source = sourceFromRecords([]);

/**
 * Data-driven rather than a hard-coded pair.
 *
 * Screens 3 to 6 are later increments, and a tab model that assumed two would
 * have to be rewritten to admit the third.
 */
const TABS = [
  { id: "log", label: "Log" },
  { id: "inspector", label: "Inspector" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const VERDICTS: ReadonlyArray<Verdict> = ["Allow", "Deny", "Error", "Unknown"];

export interface DevtoolsDockProps {
  /** Where records come from. Omitted, the dock renders empty rather than throwing. */
  readonly source?: Source;
  /** How many rows to keep. Defaults to the timeline's own bound. */
  readonly capacity?: number;
}

export const DevtoolsDock: FC<DevtoolsDockProps> = ({ source = nothing, capacity }) => {
  const { timeline, paused, setPaused, clear } = useTimeline(
    source,
    capacity === undefined ? undefined : { capacity },
  );

  const [filters, setFilters] = useState<Filters>(noFilters);
  const [tab, setTab] = useState<TabId>("log");
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);

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

  const select = useCallback((key: string) => {
    setSelectedKey(key);
    setTab("inspector");
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
        {tab === "log" ? (
          <DecisionLog rows={rows} selectedKey={selectedKey} onSelect={select} />
        ) : (
          <Inspector selection={selection} />
        )}
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
