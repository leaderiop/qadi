/**
 * Pins every drop event the hydration engine emits, its order and its counts,
 * through `hydrateWith` and `dehydrateWith`.
 *
 * Written against the engine before its events were derived from the entries each
 * call collects. No existing row's expected values have changed since: later edits
 * wrapped lines, retitled the order rows for what they feed, derived a constant from
 * the declared reasons and added rows.
 * Any change to an event, an order or a count fails here, whichever way the engine
 * builds them (BEH-QD-230, BEH-QD-231, INV-QD-045). Each row pins the reporter
 * calls in order, the change in every drop count, the seeded or dehydrated change,
 * and, inside each reporter call, that its reason is already counted and what was
 * seeded or written has not been yet.
 *
 * Every count read is a delta of the default registry, which a test cannot scope.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Atom from "effect/reactivity/Atom";
import {
  Allow,
  gte,
  hasAttribute,
  hasPermission,
  hasRole,
  hydrationDehydratedTotal,
  hydrationDropReasons,
  hydrationDroppedTotal,
  hydrationSeededTotal,
  MAX_DECODE_DEPTH,
  makeSubject,
  makeSubjectId,
  permission,
} from "@qadi/core";
import type { HydrationDropReason, Policy, Resource } from "@qadi/core";
import type { HydrationDrop } from "../src/DeveloperSignals.ts";
import { dehydrateWith, hydrateWith } from "../src/HydrationEngine.ts";
import type { DecisionEntry, HydrationSeedLookup } from "../src/HydrationEngine.ts";
import type { SeededDecision } from "../src/SeededDecision.ts";

const registry = Context.empty();
const OVER = MAX_DECODE_DEPTH + 10;
const alice = makeSubject({ id: "u1" });

const serverAllow = (subject: string, evaluationId: string): Allow =>
  new Allow({
    evaluationId,
    subjectId: makeSubjectId(subject),
    durationMillis: 3,
    trace: {
      policyTag: "HasPermission",
      allowed: true,
      children: [],
      visibleFields: undefined,
      obligations: [],
    },
  });

/** An object `levels` deep, built iteratively so the test itself cannot overflow the stack. */
const nested = (levels: number): unknown => {
  let value: unknown = { leaf: true };
  for (let i = 0; i < levels; i++) value = { inner: value };
  return value;
};

/** A `Not` chain `levels` deep around a leaf policy. */
const deepPolicy = (levels: number): unknown => {
  let value: unknown = { _tag: "HasRole", role: "x" };
  for (let i = 0; i < levels; i++) value = { _tag: "Not", policy: value };
  return value;
};

// Entries as a page's payload carries them: plain JSON values, each a distinct object.
const good = (evaluationId: string) => ({
  policy: { _tag: "HasRole", role: "admin" },
  decision: {
    _tag: "Allow",
    evaluationId,
    durationMillis: 0,
    obligations: [],
    disclosure: { _tag: "Withheld" },
  },
});
const malformed = (evaluationId: string) => ({ ...good(evaluationId), extra: true });
const undecodable = (evaluationId: string) => ({
  ...good(evaluationId),
  policy: { _tag: "NotAPolicy" },
});
const tooDeep = (evaluationId: string) => ({ ...good(evaluationId), policy: deepPolicy(OVER) });

/** An entry whose disclosed trace is rooted at `HasPermission` on a `HasRole` policy, as JSON. */
const disagreeing: unknown = JSON.parse(
  JSON.stringify(
    dehydrateWith([{ policy: hasRole("admin"), decision: serverAllow("u1", "e-disagree") }], {
      includeTrace: true,
      onDropped: () => {},
    }).entries[0],
  ),
);

const envelope = (entries: ReadonlyArray<unknown>) => ({ version: 2, subjectId: "u1", entries });

const dropCount = (reason: HydrationDropReason): number =>
  hydrationDroppedTotal.valueUnsafe(registry).occurrences.get(reason) ?? 0;
const seededCount = (): number => hydrationSeededTotal.valueUnsafe(registry).count;
const dehydratedCount = (): number => hydrationDehydratedTotal.valueUnsafe(registry).count;

/** One expected reporter call. */
interface Expected<A> {
  readonly reason: HydrationDropReason;
  readonly entries: ReadonlyArray<A>;
  readonly wholePayload: boolean;
}
const dropped = <A>(reason: HydrationDropReason, ...entries: ReadonlyArray<A>): Expected<A> => ({
  reason,
  entries,
  wholePayload: false,
});
const refused = <A>(reason: HydrationDropReason, ...entries: ReadonlyArray<A>): Expected<A> => ({
  reason,
  entries,
  wholePayload: true,
});

/** What a reporter saw when it was called: the drop, and the counts at that moment. */
interface Observed<A> {
  readonly drop: HydrationDrop<A, HydrationDropReason>;
  readonly reasonDelta: number;
  readonly movedDelta: number;
}

/** Watches one engine call: `moved` reads the count that stays unmoved while a reporter runs. */
const watch = <A>(moved: () => number) => {
  const before = new Map(
    hydrationDropReasons.map((reason): [HydrationDropReason, number] => [
      reason,
      dropCount(reason),
    ]),
  );
  const movedBefore = moved();
  const observed: Array<Observed<A>> = [];
  return {
    observed,
    onDropped: (drop: HydrationDrop<A, HydrationDropReason>): void => {
      observed.push({
        drop,
        reasonDelta: dropCount(drop.reason) - (before.get(drop.reason) ?? 0),
        movedDelta: moved() - movedBefore,
      });
    },
    dropDeltas: (): ReadonlyArray<readonly [HydrationDropReason, number]> =>
      hydrationDropReasons.map((reason): readonly [HydrationDropReason, number] => [
        reason,
        dropCount(reason) - (before.get(reason) ?? 0),
      ]),
    movedDelta: () => moved() - movedBefore,
  };
};

/** Asserts the reporter calls in order: each reason already counted, nothing yet moved. */
const assertCalls = <A>(
  observed: ReadonlyArray<Observed<A>>,
  calls: ReadonlyArray<Expected<A>>,
): void => {
  assert.strictEqual(observed.length, calls.length);
  calls.forEach((call, index) => {
    const seen = observed[index];
    assert.isDefined(seen);
    if (seen === undefined) return;
    assert.strictEqual(seen.drop.reason, call.reason);
    assert.strictEqual(seen.drop.wholePayload, call.wholePayload);
    assert.strictEqual(seen.drop.entries.length, call.entries.length);
    call.entries.forEach((entry, at) => assert.strictEqual(seen.drop.entries[at], entry));
    assert.strictEqual(
      seen.reasonDelta,
      call.wholePayload ? Math.max(1, call.entries.length) : call.entries.length,
    );
    assert.strictEqual(seen.movedDelta, 0);
  });
};

/** Asserts the change in every drop count: the listed ones as given, the rest unmoved. */
const assertDeltas = (
  actual: ReadonlyArray<readonly [HydrationDropReason, number]>,
  expected: ReadonlyArray<readonly [HydrationDropReason, number]>,
): void => {
  assert.strictEqual(actual.length, hydrationDropReasons.length);
  for (const [reason, delta] of actual) {
    const want = expected.find(([listed]) => listed === reason);
    assert.strictEqual(delta, want === undefined ? 0 : want[1], reason);
  }
  assert.strictEqual(expected.length, new Set(expected.map(([reason]) => reason)).size);
  for (const [reason] of expected) assert.isTrue(hydrationDropReasons.includes(reason));
};

/** A lookup recording each call. */
const recordingLookup = () => {
  const calls: Array<{ readonly policy: Policy; readonly resource: Resource | undefined }> = [];
  const lookup: HydrationSeedLookup = (policy, resource) => {
    const atom = Atom.make<SeededDecision | undefined>(undefined);
    calls.push({ policy, resource });
    return { hold: (decision) => [atom, decision] };
  };
  return { calls, lookup };
};

interface HydrateRow {
  readonly title: string;
  readonly payload: unknown;
  readonly calls: ReadonlyArray<Expected<unknown>>;
  readonly drops: ReadonlyArray<readonly [HydrationDropReason, number]>;
  readonly seeded: number;
}

/** Hydrates a row's payload and asserts everything the row pins. */
const runHydrate = (row: HydrateRow): void => {
  const { calls, lookup } = recordingLookup();
  const watched = watch<unknown>(seededCount);
  const initial = hydrateWith(lookup, row.payload, alice, { onDropped: watched.onDropped });
  assertCalls(watched.observed, row.calls);
  assertDeltas(watched.dropDeltas(), row.drops);
  assert.strictEqual(watched.movedDelta(), row.seeded);
  assert.strictEqual([...initial].length, row.seeded);
  assert.strictEqual(calls.length, row.seeded);
};

const t1 = tooDeep("t1");
const t2 = tooDeep("t2");
const m1 = malformed("m1");
const m2 = malformed("m2");
const u1 = undecodable("u1");
const g1 = good("g1");
const g2 = good("g2");

const rowH9: HydrateRow = {
  title: "all three entry reasons beside a good entry are three events in the declared order",
  payload: envelope([u1, m1, g1, t1]),
  calls: [
    dropped("EntryTooDeep", t1),
    dropped("MalformedEntry", m1),
    dropped("UndecodablePolicy", u1),
  ],
  drops: [
    ["EntryTooDeep", 1],
    ["MalformedEntry", 1],
    ["UndecodablePolicy", 1],
  ],
  seeded: 1,
};
const rowH3: HydrateRow = {
  title: "a malformed entry alone is one MalformedEntry event",
  payload: envelope([m1]),
  calls: [dropped("MalformedEntry", m1)],
  drops: [["MalformedEntry", 1]],
  seeded: 0,
};

const entryRows: ReadonlyArray<HydrateRow> = [
  {
    title: "a payload with nothing to drop reports nothing and seeds every entry",
    payload: envelope([g1, g2]),
    calls: [],
    drops: [],
    seeded: 2,
  },
  {
    title: "an entry nested past the bound alone is one EntryTooDeep event",
    payload: envelope([t1]),
    calls: [dropped("EntryTooDeep", t1)],
    drops: [["EntryTooDeep", 1]],
    seeded: 0,
  },
  rowH3,
  {
    title: "an undecodable policy alone is one UndecodablePolicy event",
    payload: envelope([u1]),
    calls: [dropped("UndecodablePolicy", u1)],
    drops: [["UndecodablePolicy", 1]],
    seeded: 0,
  },
  {
    title: "an entry whose trace disagrees with its policy alone is one MalformedEntry event",
    payload: envelope([disagreeing]),
    calls: [dropped("MalformedEntry", disagreeing)],
    drops: [["MalformedEntry", 1]],
    seeded: 0,
  },
  {
    title: "EntryTooDeep precedes UndecodablePolicy when the input lists UndecodablePolicy first",
    payload: envelope([u1, t1]),
    calls: [dropped("EntryTooDeep", t1), dropped("UndecodablePolicy", u1)],
    drops: [
      ["EntryTooDeep", 1],
      ["UndecodablePolicy", 1],
    ],
    seeded: 0,
  },
  {
    title: "EntryTooDeep precedes UndecodablePolicy when the input lists EntryTooDeep first",
    payload: envelope([t1, u1]),
    calls: [dropped("EntryTooDeep", t1), dropped("UndecodablePolicy", u1)],
    drops: [
      ["EntryTooDeep", 1],
      ["UndecodablePolicy", 1],
    ],
    seeded: 0,
  },
  {
    title: "MalformedEntry precedes UndecodablePolicy when the input lists UndecodablePolicy first",
    payload: envelope([u1, m1]),
    calls: [dropped("MalformedEntry", m1), dropped("UndecodablePolicy", u1)],
    drops: [
      ["MalformedEntry", 1],
      ["UndecodablePolicy", 1],
    ],
    seeded: 0,
  },
  {
    title: "MalformedEntry precedes UndecodablePolicy when the input lists MalformedEntry first",
    payload: envelope([m1, u1]),
    calls: [dropped("MalformedEntry", m1), dropped("UndecodablePolicy", u1)],
    drops: [
      ["MalformedEntry", 1],
      ["UndecodablePolicy", 1],
    ],
    seeded: 0,
  },
  {
    title: "EntryTooDeep precedes MalformedEntry when the input lists MalformedEntry first",
    payload: envelope([m1, t1]),
    calls: [dropped("EntryTooDeep", t1), dropped("MalformedEntry", m1)],
    drops: [
      ["EntryTooDeep", 1],
      ["MalformedEntry", 1],
    ],
    seeded: 0,
  },
  {
    title: "EntryTooDeep precedes MalformedEntry when the input lists EntryTooDeep first",
    payload: envelope([t1, m1]),
    calls: [dropped("EntryTooDeep", t1), dropped("MalformedEntry", m1)],
    drops: [
      ["EntryTooDeep", 1],
      ["MalformedEntry", 1],
    ],
    seeded: 0,
  },
  rowH9,
  {
    title: "a malformed and a disagreeing entry share one MalformedEntry event in input order",
    payload: envelope([m1, disagreeing, m2]),
    calls: [dropped("MalformedEntry", m1, disagreeing, m2)],
    drops: [["MalformedEntry", 3]],
    seeded: 0,
  },
  {
    title: "a disagreeing entry before a malformed one keeps input order in their shared event",
    payload: envelope([disagreeing, m1]),
    calls: [dropped("MalformedEntry", disagreeing, m1)],
    drops: [["MalformedEntry", 2]],
    seeded: 0,
  },
  {
    title: "two entries nested past the bound share one EntryTooDeep event",
    payload: envelope([t1, g1, t2]),
    calls: [dropped("EntryTooDeep", t1, t2)],
    drops: [["EntryTooDeep", 2]],
    seeded: 1,
  },
];

const payloadRows: ReadonlyArray<HydrateRow> = [
  {
    title: "a value that is not an envelope is MalformedPayload with no entries and counts one",
    payload: 42,
    calls: [refused("MalformedPayload")],
    drops: [["MalformedPayload", 1]],
    seeded: 0,
  },
  {
    title: "an envelope with an excess key is MalformedPayload with the entries it showed",
    payload: { ...envelope([g1]), extra: true },
    calls: [refused("MalformedPayload", g1)],
    drops: [["MalformedPayload", 1]],
    seeded: 0,
  },
  {
    title: "version 3 is UnsupportedPayloadVersion with every entry it carried",
    payload: { version: 3, subjectId: "u1", entries: [g1, g2] },
    calls: [refused("UnsupportedPayloadVersion", g1, g2)],
    drops: [["UnsupportedPayloadVersion", 2]],
    seeded: 0,
  },
  {
    title: "a payload with no version is UnsupportedPayloadVersion",
    payload: { subjectId: "u1", entries: [g1] },
    calls: [refused("UnsupportedPayloadVersion", g1)],
    drops: [["UnsupportedPayloadVersion", 1]],
    seeded: 0,
  },
  {
    title: "a subjectId nested past the bound is PayloadTooDeep",
    payload: { version: 2, subjectId: nested(OVER), entries: [g1] },
    calls: [refused("PayloadTooDeep", g1)],
    drops: [["PayloadTooDeep", 1]],
    seeded: 0,
  },
  {
    title: "another subject is PayloadSubjectMismatch with every entry, malformed ones included",
    payload: { version: 2, subjectId: "u2", entries: [g1, m1] },
    calls: [refused("PayloadSubjectMismatch", g1, m1)],
    drops: [["PayloadSubjectMismatch", 2]],
    seeded: 0,
  },
  {
    title: "another subject with no entries is PayloadSubjectMismatch and counts one",
    payload: { version: 2, subjectId: "u2", entries: [] },
    calls: [refused("PayloadSubjectMismatch")],
    drops: [["PayloadSubjectMismatch", 1]],
    seeded: 0,
  },
  {
    title: "entries with no subject are PayloadSubjectMismatch",
    payload: { version: 2, entries: [g1] },
    calls: [refused("PayloadSubjectMismatch", g1)],
    drops: [["PayloadSubjectMismatch", 1]],
    seeded: 0,
  },
  {
    title: "an empty payload with no subject reports and counts nothing",
    payload: { version: 2, entries: [] },
    calls: [],
    drops: [],
    seeded: 0,
  },
  {
    title: "an empty payload for this subject reports and counts nothing",
    payload: envelope([]),
    calls: [],
    drops: [],
    seeded: 0,
  },
];

describe("hydrateWith reports each entry drop once and in declared order", () => {
  for (const row of entryRows) it(row.title, () => runHydrate(row));
});

describe("hydrateWith refuses a payload whole with exactly one event", () => {
  for (const row of payloadRows) it(row.title, () => runHydrate(row));
});

const read = hasPermission(permission("doc", "read"));
const unencodable = hasAttribute("age", gte(Number.NaN));
const own1: DecisionEntry = { policy: read, decision: serverAllow("u1", "e1") };
const own2: DecisionEntry = { policy: read, decision: serverAllow("u1", "e2") };
const foreign1: DecisionEntry = { policy: read, decision: serverAllow("u2", "e3") };
const unenc1: DecisionEntry = { policy: unencodable, decision: serverAllow("u1", "e4") };
const foreignUnenc: DecisionEntry = { policy: unencodable, decision: serverAllow("u2", "e5") };

interface DehydrateRun {
  readonly entries: ReadonlyArray<DecisionEntry>;
  readonly calls: ReadonlyArray<Expected<DecisionEntry>>;
  readonly drops: ReadonlyArray<readonly [HydrationDropReason, number]>;
  readonly dehydrated: number;
  readonly written: ReadonlyArray<string>;
  readonly subjectId: string | undefined;
}
interface DehydrateRow {
  readonly title: string;
  readonly runs: ReadonlyArray<DehydrateRun>;
}

/** Dehydrates a run's entries and asserts everything the run pins. */
const runDehydrate = (run: DehydrateRun): void => {
  const watched = watch<DecisionEntry>(dehydratedCount);
  const payload = dehydrateWith(run.entries, { onDropped: watched.onDropped });
  assertCalls(watched.observed, run.calls);
  assertDeltas(watched.dropDeltas(), run.drops);
  assert.strictEqual(watched.movedDelta(), run.dehydrated);
  assert.strictEqual(payload.version, 2);
  assert.strictEqual(payload.subjectId, run.subjectId);
  assert.deepStrictEqual(
    payload.entries.map((entry) => entry.decision.evaluationId),
    run.written,
  );
};

const leaveOutBoth: DehydrateRun = {
  entries: [own1, unenc1, foreign1],
  calls: [dropped("ForeignSubject", foreign1), dropped("UnencodablePolicy", unenc1)],
  drops: [
    ["ForeignSubject", 1],
    ["UnencodablePolicy", 1],
  ],
  dehydrated: 1,
  written: ["e1"],
  subjectId: "u1",
};
const leaveOutUnencodable: DehydrateRun = {
  entries: [own1, unenc1],
  calls: [dropped("UnencodablePolicy", unenc1)],
  drops: [["UnencodablePolicy", 1]],
  dehydrated: 1,
  written: ["e1"],
  subjectId: "u1",
};

const dehydrateRows: ReadonlyArray<DehydrateRow> = [
  {
    title: "entries of one subject that all encode report nothing and write every entry",
    runs: [
      {
        entries: [own1, own2],
        calls: [],
        drops: [],
        dehydrated: 2,
        written: ["e1", "e2"],
        subjectId: "u1",
      },
    ],
  },
  {
    title: "an entry for another subject is one ForeignSubject event",
    runs: [
      {
        entries: [own1, foreign1],
        calls: [dropped("ForeignSubject", foreign1)],
        drops: [["ForeignSubject", 1]],
        dehydrated: 1,
        written: ["e1"],
        subjectId: "u1",
      },
    ],
  },
  {
    title: "an entry whose policy does not encode is one UnencodablePolicy event",
    runs: [leaveOutUnencodable],
  },
  {
    title: "ForeignSubject is reported before UnencodablePolicy whatever the input order",
    runs: [leaveOutBoth, { ...leaveOutBoth, entries: [own1, foreign1, unenc1] }],
  },
  {
    title: "an entry both foreign and unencodable is ForeignSubject only",
    runs: [
      {
        entries: [own1, foreignUnenc],
        calls: [dropped("ForeignSubject", foreignUnenc)],
        drops: [["ForeignSubject", 1]],
        dehydrated: 1,
        written: ["e1"],
        subjectId: "u1",
      },
    ],
  },
  {
    title: "an unencodable first entry still names the subject",
    runs: [{ ...leaveOutBoth, entries: [unenc1, foreign1, own1] }],
  },
  {
    title: "no entries writes an empty payload and reports nothing",
    runs: [
      { entries: [], calls: [], drops: [], dehydrated: 0, written: [], subjectId: undefined },
    ],
  },
  {
    title: "a single foreign-looking entry names its own subject and is written",
    runs: [
      {
        entries: [foreign1],
        calls: [],
        drops: [],
        dehydrated: 1,
        written: ["e3"],
        subjectId: "u2",
      },
    ],
  },
];

describe("dehydrateWith reports each left-out entry once and in declared order", () => {
  for (const row of dehydrateRows) it(row.title, () => row.runs.forEach(runDehydrate));
});

describe("each call collects into its own buckets", () => {
  it("a second hydration reports only its own drops", () => {
    runHydrate(rowH9);
    runHydrate(rowH3);
  });

  it("a second dehydration reports only what it left out", () => {
    runDehydrate(leaveOutBoth);
    runDehydrate(leaveOutUnencodable);
  });
});
