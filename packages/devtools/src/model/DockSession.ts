/**
 * The dock's own state — which screen, which filters, which row — and the readings derived from them, as a store.
 *
 * These rules lived in the dock's `useState`s and `useMemo`s, reachable only by
 * rendering the whole dock, so none of them fell under the model's tests or its
 * mutation gate. Two of them are the kind a reviewer acts on: rows are paired
 * against the **whole** timeline and filtered afterwards, so a row never looks
 * unpaired because its partner sat in an environment the reader narrowed away;
 * and the counts are of the whole timeline, never of the rows shown, so a header
 * cannot read "0 errors" because someone typed in the search box.
 *
 * Replaying a row is an act, not a consequence of state (ARCH-63): it reaches
 * the simulation as a command on every call, so replaying the same row twice
 * re-seeds twice. The simulation is a structural dependency handed in at
 * construction rather than an import, so this module knows nothing of how a
 * replay is carried out. The tab, like every screen's state the dock owns,
 * survives leaving a screen and coming back (INV-QD-107; ADR-QD-047).
 *
 * Package-private (ADR-QD-099): the dock is the one thing that drives it.
 */
import { applyFilters, environmentsOf, noFilters, type Filters } from "./Filters.ts";
import { makeExternalStore } from "./ExternalStore.ts";
import { pairedEntries, type PairedEntry } from "./Pairing.ts";
import { selectionOf, type Selection } from "./Selection.ts";
import type { Timeline, TimelineEntry } from "./Timeline.ts";
import { countsOf, type Counts } from "./Verdict.ts";

export type TabId = "log" | "inspector" | "policies" | "roles" | "services" | "simulator" | "questions";

export interface DockSnapshot {
  readonly tab: TabId;
  readonly filters: Filters;
  readonly selectedKey: string | undefined;
  /** The whole timeline paired, then filtered. */
  readonly rows: ReadonlyArray<PairedEntry>;
  /** Of the whole timeline, never of `rows`. */
  readonly counts: Counts;
  readonly environments: ReadonlyArray<string>;
  /** The held key resolved against the timeline. Not filtered: a selection survives a filter hiding its row. */
  readonly selection: Selection;
}

export interface DockSession {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => DockSnapshot;
  readonly setTimeline: (timeline: Timeline) => void;
  readonly setTab: (tab: TabId) => void;
  readonly setFilters: (filters: Filters) => void;
  /** Holds the row's key and moves to the inspector. */
  readonly select: (key: string) => void;
  /** Moves to the simulator and commands the simulation to re-seed from the entry, every time. */
  readonly replay: (entry: TimelineEntry) => void;
}

export interface DockSessionInit {
  readonly timeline: Timeline;
  readonly simulation: { readonly replay: (entry: TimelineEntry) => void };
}

const sameFilters = (a: Filters, b: Filters): boolean =>
  a.text === b.text && a.environment === b.environment && a.verdict === b.verdict;

export const makeDockSession = (init: DockSessionInit): DockSession => {
  let timeline = init.timeline;
  let tab: TabId = "log";
  let filters: Filters = noFilters;
  let selectedKey: string | undefined;

  // Read once per timeline, not per filter keystroke: pairing scans the whole
  // timeline per entry.
  let paired = pairedEntries(timeline);
  let counts = countsOf(timeline.entries);
  let environments = environmentsOf(timeline.entries);

  const filtered = (): ReadonlyArray<PairedEntry> => {
    const visible = new Set(applyFilters(timeline.entries, filters));
    return paired.filter((row) => visible.has(row.entry));
  };
  let rows = filtered();

  const build = (): DockSnapshot => ({
    tab,
    filters,
    selectedKey,
    rows,
    counts,
    environments,
    selection: selectionOf(timeline, selectedKey),
  });

  const store = makeExternalStore<DockSnapshot>(build());
  const commit = () => store.publish(build());

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,

    setTimeline: (next) => {
      if (next === timeline) return;
      timeline = next;
      paired = pairedEntries(timeline);
      counts = countsOf(timeline.entries);
      environments = environmentsOf(timeline.entries);
      rows = filtered();
      commit();
    },

    setTab: (next) => {
      if (next === tab) return;
      tab = next;
      commit();
    },

    setFilters: (next) => {
      if (sameFilters(next, filters)) return;
      filters = next;
      rows = filtered();
      commit();
    },

    select: (key) => {
      if (key === selectedKey && tab === "inspector") return;
      selectedKey = key;
      tab = "inspector";
      commit();
    },

    replay: (entry) => {
      init.simulation.replay(entry);
      if (tab === "simulator") return;
      tab = "simulator";
      commit();
    },
  };
};
