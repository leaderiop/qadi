/**
 * The dock's rules, tested with no DOM (DOCK-02, DOCK-03).
 *
 * Pair the whole timeline and then filter; count the whole timeline; selecting
 * moves to the inspector; replaying moves to the simulator and commands the
 * simulation every time. Each command's no-op is pinned against a listener, so
 * a `useSyncExternalStore` reader does not re-render for a command that changed
 * nothing.
 */
import { assert, describe, it } from "@effect/vitest";
import { Decided } from "@qadi/core";
import { makeDockSession, type DockSession, type TabId } from "../../src/model/DockSession.ts";
import { noFilters, type Filters } from "../../src/model/Filters.ts";
import {
  emptyTimeline,
  entryKey,
  ingestAll,
  type Timeline,
  type TimelineEntry,
} from "../../src/model/Timeline.ts";
import { allow, decisionRecord, deny, failedRecord } from "../helpers.ts";

const fold = (records: ReadonlyArray<Parameters<typeof ingestAll>[1][number]>) =>
  ingestAll(emptyTimeline(), records);

const allowRecord = (evaluationId: string, at: number, environment = "Server", subjectId = "alice") =>
  decisionRecord({
    evaluationId,
    at,
    environment,
    subjectId,
    outcome: new Decided({ decision: allow({ evaluationId, subjectId }) }),
  });

const denyRecord = (evaluationId: string, at: number, environment = "Server") =>
  decisionRecord({
    evaluationId,
    at,
    environment,
    subjectId: "bob",
    outcome: new Decided({ decision: deny({ evaluationId, subjectId: "bob" }) }),
  });

/** A request answered on the server and re-checked on the client, plus one failure and one denial. */
const timeline: Timeline = fold([
  allowRecord("pair", 100, "Server"),
  allowRecord("pair", 200, "Client"),
  failedRecord({ evaluationId: "broken", at: 300, subjectId: "carol" }),
  denyRecord("refused", 400),
]);

const at = (entries: ReadonlyArray<TimelineEntry>, index: number): TimelineEntry => {
  const entry = entries[index];
  if (entry === undefined) throw new Error(`no entry at ${index}`);
  return entry;
};

/** A session with a recording simulation, so a replay can be counted. */
const make = (initial: Timeline = timeline) => {
  const replayed: Array<TimelineEntry> = [];
  const session = makeDockSession({
    timeline: initial,
    simulation: { replay: (entry) => replayed.push(entry) },
  });
  return { session, replayed };
};

/** Counts notifications, so a no-op can be told from an effective command. */
const watch = (session: DockSession) => {
  const seen = { calls: 0 };
  session.subscribe(() => {
    seen.calls += 1;
  });
  return seen;
};

describe("construction", () => {
  it("starts on the log, unfiltered, with nothing selected", () => {
    const snapshot = make().session.getSnapshot();
    assert.strictEqual(snapshot.tab, "log");
    assert.deepStrictEqual(snapshot.filters, noFilters);
    assert.isUndefined(snapshot.selectedKey);
    assert.strictEqual(snapshot.selection._tag, "NoSelection");
  });

  it("reads rows, counts and environments of the timeline it is given", () => {
    const snapshot = make().session.getSnapshot();
    assert.deepStrictEqual(
      snapshot.rows.map((row) => row.entry),
      timeline.entries,
    );
    assert.deepStrictEqual(snapshot.counts, {
      decisions: 4,
      allows: 2,
      denies: 1,
      errors: 1,
      orphans: 0,
    });
    assert.deepStrictEqual(snapshot.environments, ["Server", "Client"]);
  });

  it("TabId is a closed union of the seven screens", () => {
    const { session } = make();
    const screens: ReadonlyArray<TabId> = [
      "log",
      "inspector",
      "policies",
      "roles",
      "services",
      "simulator",
      "questions",
    ];
    for (const screen of screens) {
      session.setTab(screen);
      assert.strictEqual(session.getSnapshot().tab, screen);
    }
    // @ts-expect-error — not a screen the dock has
    const unknown: TabId = "timeline";
    assert.isString(unknown);
  });
});

describe("pair the whole timeline, then filter (T-15-05)", () => {
  it("a row filtered to one environment still carries its partner from the other", () => {
    const { session } = make();
    session.setFilters({ ...noFilters, environment: "Client" });
    const rows = session.getSnapshot().rows;
    assert.strictEqual(rows.length, 1);
    const [row] = rows;
    assert.strictEqual(row?.entry, at(timeline.entries, 1));
    assert.strictEqual(row?.role, "Continuation");
    assert.deepStrictEqual(row?.partners, [at(timeline.entries, 0)]);
  });

  it("keeps the timeline's order among the rows that survive", () => {
    const { session } = make();
    session.setFilters({ ...noFilters, environment: "Server" });
    assert.deepStrictEqual(
      session.getSnapshot().rows.map((row) => row.entry.evaluationId),
      ["pair", "broken", "refused"],
    );
  });
});

describe("count the whole timeline (T-15-04)", () => {
  it("a filter that hides every error still counts the error", () => {
    const { session } = make();
    session.setFilters({ ...noFilters, text: "alice" });
    const snapshot = session.getSnapshot();
    assert.isTrue(snapshot.rows.every((row) => row.entry.evaluationId === "pair"));
    assert.strictEqual(snapshot.counts.errors, 1);
    assert.strictEqual(snapshot.counts.denies, 1);
    assert.deepStrictEqual(snapshot.environments, ["Server", "Client"]);
  });

  it("a filter keystroke re-reads the rows and nothing that depends only on the timeline", () => {
    const { session } = make();
    const before = session.getSnapshot();
    session.setFilters({ ...noFilters, verdict: "Deny" });
    const after = session.getSnapshot();
    assert.notStrictEqual(after.rows, before.rows);
    assert.strictEqual(after.counts, before.counts);
    assert.strictEqual(after.environments, before.environments);
  });

  it("a tab switch re-reads no rows", () => {
    const { session } = make();
    const before = session.getSnapshot();
    session.setTab("roles");
    assert.strictEqual(session.getSnapshot().rows, before.rows);
  });
});

describe("setTimeline", () => {
  it("re-reads rows, counts, environments and the selection, keeping the filters", () => {
    const { session } = make(fold([allowRecord("pair", 100, "Server")]));
    session.setFilters({ ...noFilters, environment: "Client" });
    assert.deepStrictEqual(session.getSnapshot().rows, []);

    session.setTimeline(timeline);
    const snapshot = session.getSnapshot();
    assert.deepStrictEqual(
      snapshot.rows.map((row) => row.entry),
      [at(timeline.entries, 1)],
    );
    assert.strictEqual(snapshot.rows[0]?.role, "Continuation");
    assert.strictEqual(snapshot.counts.decisions, 4);
    assert.deepStrictEqual(snapshot.environments, ["Server", "Client"]);
    assert.strictEqual(snapshot.filters.environment, "Client");
  });

  it("the same timeline publishes nothing; a new one publishes", () => {
    const { session } = make();
    const seen = watch(session);
    session.setTimeline(timeline);
    assert.strictEqual(seen.calls, 0);
    session.setTimeline(fold([allowRecord("pair", 100)]));
    assert.strictEqual(seen.calls, 1);
  });
});

describe("select", () => {
  it("holds the key, moves to the inspector, and reads the row as Selected", () => {
    const { session } = make();
    const entry = at(timeline.entries, 2);
    session.select(entryKey(entry));
    const snapshot = session.getSnapshot();
    assert.strictEqual(snapshot.selectedKey, entryKey(entry));
    assert.strictEqual(snapshot.tab, "inspector");
    assert.strictEqual(snapshot.selection._tag, "Selected");
    assert.strictEqual(snapshot.selection._tag === "Selected" ? snapshot.selection.entry : undefined, entry);
  });

  it("a key a later timeline dropped reads Evicted", () => {
    const { session } = make();
    const key = entryKey(at(timeline.entries, 3));
    session.select(key);
    session.setTimeline(fold([allowRecord("pair", 100)]));
    const selection = session.getSnapshot().selection;
    assert.strictEqual(selection._tag, "Evicted");
    assert.strictEqual(selection._tag === "Evicted" ? selection.key : undefined, key);
  });

  it("survives a filter that hides its row", () => {
    const { session } = make();
    const entry = at(timeline.entries, 2);
    session.select(entryKey(entry));
    session.setFilters({ ...noFilters, verdict: "Allow" });
    const snapshot = session.getSnapshot();
    assert.isFalse(snapshot.rows.some((row) => row.entry === entry));
    assert.strictEqual(snapshot.selection._tag, "Selected");
  });

  it("the same key on the inspector publishes nothing; from another tab it moves back", () => {
    const { session } = make();
    const key = entryKey(at(timeline.entries, 0));
    session.select(key);
    const seen = watch(session);
    session.select(key);
    assert.strictEqual(seen.calls, 0);

    session.setTab("log");
    session.select(key);
    assert.strictEqual(seen.calls, 2);
    assert.strictEqual(session.getSnapshot().tab, "inspector");
  });

  it("another key on the inspector publishes", () => {
    const { session } = make();
    session.select(entryKey(at(timeline.entries, 0)));
    const seen = watch(session);
    session.select(entryKey(at(timeline.entries, 1)));
    assert.strictEqual(seen.calls, 1);
    assert.strictEqual(session.getSnapshot().selectedKey, entryKey(at(timeline.entries, 1)));
  });
});

describe("replay", () => {
  it("moves to the simulator and commands the simulation with the entry", () => {
    const { session, replayed } = make();
    const entry = at(timeline.entries, 3);
    const seen = watch(session);
    session.replay(entry);
    assert.strictEqual(session.getSnapshot().tab, "simulator");
    assert.deepStrictEqual(replayed, [entry]);
    assert.strictEqual(seen.calls, 1);
  });

  it("replaying the same row again commands the simulation again (ARCH-63)", () => {
    const { session, replayed } = make();
    const entry = at(timeline.entries, 0);
    session.replay(entry);
    const seen = watch(session);
    session.replay(entry);
    assert.deepStrictEqual(replayed, [entry, entry]);
    // Already on the simulator: the snapshot did not change, so nothing re-renders.
    assert.strictEqual(seen.calls, 0);
  });

  it("does not touch the selection", () => {
    const { session } = make();
    const key = entryKey(at(timeline.entries, 1));
    session.select(key);
    session.replay(at(timeline.entries, 3));
    assert.strictEqual(session.getSnapshot().selectedKey, key);
  });
});

describe("a command that changes nothing publishes nothing", () => {
  it("setTab to the tab shown", () => {
    const { session } = make();
    const seen = watch(session);
    session.setTab("log");
    assert.strictEqual(seen.calls, 0);
    session.setTab("services");
    assert.strictEqual(seen.calls, 1);
  });

  it("setFilters field-wise equal, in a new object", () => {
    const { session } = make();
    session.setFilters({ text: "alice", environment: "Server", verdict: "Allow" });
    const seen = watch(session);
    session.setFilters({ text: "alice", environment: "Server", verdict: "Allow" });
    assert.strictEqual(seen.calls, 0);
  });

  it("setFilters publishes when any one field differs", () => {
    const base: Filters = { text: "alice", environment: "Server", verdict: "Allow" };
    const changes: ReadonlyArray<Filters> = [
      { ...base, text: "bob" },
      { ...base, environment: "Client" },
      { ...base, verdict: "Deny" },
    ];
    for (const changed of changes) {
      const { session } = make();
      session.setFilters(base);
      const seen = watch(session);
      session.setFilters(changed);
      assert.strictEqual(seen.calls, 1);
      assert.deepStrictEqual(session.getSnapshot().filters, changed);
    }
  });
});
