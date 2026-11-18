/**
 * The Services tab's port cards, one pure function of the shown reading.
 *
 * Which implementation is behind each port, whether anything reached it, and what
 * being defaulted would cost: each card's words are decided here and the panel only
 * renders them. This is the counterpart of `joinQuestions` (`Gates.ts`) for the
 * Services tab, and the reason is the same: a rule written in a render function is
 * reachable only by rendering, so a test of it has to mount the dock.
 *
 * ADR-QD-047, restated by ADR-QD-168: the panel computes nothing. Activity is read
 * by a record keyed by `PortName`, so a misspelt port is a compile error and no port
 * is compared as a string. The five registry ports have a record entry; the four
 * other wired services (`EvaluationId`, `CurrentSubject`, `DecisionCache`,
 * `DecisionSink`) are not ports, and `isPortName` is what tells the join so.
 *
 * Package-private (ADR-QD-099): the dock model holds the result and nothing exports it.
 */
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import { PORTS, tabulatePorts } from "@qadi/core";
import type { PortName } from "@qadi/core";
import type { WiringRead } from "./DiagnosticsStore.ts";
import type { PortCall, PortCallInterpreter, PortCallLog } from "./PortCalls.ts";
import { describeCall } from "./PortReading.ts";
import type { PortActivity, PortReport, WiredServiceName } from "./Wiring.ts";

/** What the join reads: the wiring read and the activity, taken at one moment. */
export interface ServicesInput {
  readonly wiring: WiringRead;
  readonly activity: ReadonlyArray<PortActivity>;
  readonly portCalls: PortCallLog | undefined;
  /** No sample has been taken, so a missing field is not yet a statement about the host. */
  readonly unsampled: boolean;
}

/** A fail-closed default is a warning, not an error (00-overview's vocabulary rules). */
export type CardTone = "Warning" | "Plain";

/** One recent call, in the strings the card prints. */
export interface CallRow {
  /** The React key: the span, when it started and the sentence, which together name one call. */
  readonly key: string;
  /** What was asked and whether a value came back, with how many times it ran when more than once. */
  readonly text: string;
  /** `translation` or `served`; `undefined` for an evaluation and for an interpreter not recorded. */
  readonly interpreter: string | undefined;
  /** `in flight` for an unfinished call, else the milliseconds to one decimal. */
  readonly duration: string;
}

/**
 * What a card says of the calls made to its port.
 *
 * `Hidden` is nothing to say: no collector while unsampled (the dock cannot tell whether
 * one is configured), or a collector that saw nothing for this row. `Uncollected` is the
 * note that the detail needs `portCalls`, and `Listed` is the newest few with the count
 * of the ones behind them.
 */
export type CallsView = Data.TaggedEnum<{
  Hidden: {};
  Uncollected: {};
  Listed: { readonly calls: ReadonlyArray<CallRow>; readonly earlier: string | undefined };
}>;

export const CallsView = Data.taggedEnum<CallsView>();

/** One card, in words: nothing here is left for the panel to decide. */
export interface PortCardRow {
  readonly port: WiredServiceName;
  /** The `data-defaulted` value: `undefined` when there is nothing to say about defaulting. */
  readonly defaulted: "true" | "false" | undefined;
  readonly state: string;
  readonly activity: string;
  readonly consequence: string;
  readonly tone: CardTone;
  readonly calls: CallsView;
}

/**
 * What the tab shows of the wiring read.
 *
 * `Withheld` is no layer handed and no sample yet, which the panel renders as nothing;
 * `NotHanded` is a sample that found no layer. `Failed` carries the reason the layer
 * did not build, and `Read` the cards and the cache's one line.
 */
export type ServicesView = Data.TaggedEnum<{
  Withheld: {};
  NotHanded: {};
  Failed: { readonly reason: string };
  Read: { readonly rows: ReadonlyArray<PortCardRow>; readonly cache: string };
}>;

export const ServicesView = Data.taggedEnum<ServicesView>();

/** Each registry port's activity entry, or `undefined` when nothing reached it. */
export type ActivityByPort = { readonly [K in PortName]: PortActivity | undefined };

/** Each registry port's calls, oldest first as the log holds them; empty when none reached it. */
export type CallsByPort = { readonly [K in PortName]: ReadonlyArray<PortCall> };

/**
 * How many recent calls a card shows.
 *
 * A card, not a page: the question this screen answers is "was my store asked,
 * and about what", and the last few answer it. The collector's own bound is
 * larger, and the card says when there is more behind it.
 */
const SHOWN_PER_PORT = 5;

/** What a port's activity reads before any sample was taken: not "never called", which would be a claim. */
const NO_ACTIVITY_READING = "no activity reading";

const SERVICES_WITHHELD = ServicesView.Withheld();
const SERVICES_NOT_HANDED = ServicesView.NotHanded();

const CALLS_HIDDEN = CallsView.Hidden();
const CALLS_UNCOLLECTED = CallsView.Uncollected();
const NO_CALLS: ReadonlyArray<PortCall> = [];

/**
 * The label a call carries for the interpreter that made it.
 *
 * Only the two that are not an evaluation are labelled: an evaluation is the default
 * reading, and an unrecorded interpreter is not guessed at. `remote` is a read this host
 * made to answer another process (ARCH-31). A match rather than a table, so a fourth
 * interpreter is a compile error here.
 */
const interpreterLabel: (interpreter: PortCallInterpreter | undefined) => string | undefined =
  Match.type<PortCallInterpreter | undefined>().pipe(
    Match.when("toPredicate", () => "translation"),
    Match.when("remote", () => "served"),
    Match.when("evaluate", () => undefined),
    Match.when(Match.undefined, () => undefined),
    Match.exhaustive,
  );

/**
 * Whether a wired service is one of the registry's ports.
 *
 * Own keys only, so a word every object inherits is not a port.
 */
export const isPortName = (name: WiredServiceName): name is PortName => Object.hasOwn(PORTS, name);

/**
 * The activity grouped once per call, in the registry's order, the first entry of a port winning.
 *
 * A `Map` holds the grouping, so a host-supplied word such as `__proto__` is a key of nothing.
 */
export const activityByPort = (list: ReadonlyArray<PortActivity>): ActivityByPort => {
  const grouped = new Map<PortName, PortActivity>();
  for (const entry of list) {
    if (!grouped.has(entry.port)) grouped.set(entry.port, entry);
  }
  return tabulatePorts<ActivityByPort>((d) => grouped.get(d.port));
};

/**
 * The log grouped once per call by the port that made each call, log order kept.
 *
 * A `Map` holds the grouping and the record is read only at the registry's five names, so
 * a call whose tag is `__proto__` or any other word outside it is never read.
 */
export const callsByPort = (log: PortCallLog): CallsByPort => {
  const grouped = new Map<PortName, Array<PortCall>>();
  for (const call of log.calls) {
    const list = grouped.get(call._tag);
    if (list === undefined) grouped.set(call._tag, [call]);
    else list.push(call);
  }
  return tabulatePorts<CallsByPort>((d) => grouped.get(d.port) ?? NO_CALLS);
};

/**
 * One call as the strings its row prints.
 *
 * The sentence is `describeCall`'s, which says whether a value came back and never what it
 * was (INV-QD-044); this adds only how many times a retrying wrapper ran it.
 */
const callRowOf = (call: PortCall): CallRow => {
  const text =
    call.attempts === undefined || call.attempts <= 1
      ? describeCall(call)
      : `${describeCall(call)} · ${String(call.attempts)} attempts`;
  return {
    key: `${call.span}-${String(call.at)}-${text}`,
    text,
    interpreter: interpreterLabel(call.interpreter),
    // Not zero. A zero is a call that finished instantly.
    duration: call.durationMillis === undefined ? "in flight" : `${call.durationMillis.toFixed(1)} ms`,
  };
};

/**
 * What one card says of its calls.
 *
 * The absent case is stated rather than left blank: a card with no list looks exactly like
 * a port nothing asked, and the two are the difference between a finding and a missing tracer.
 */
const callsOf = (grouped: CallsByPort | undefined, port: WiredServiceName, unsampled: boolean): CallsView => {
  if (grouped === undefined) {
    // A collector may be configured and not yet sampled, and the dock cannot tell which.
    return unsampled ? CALLS_HIDDEN : CALLS_UNCOLLECTED;
  }
  const list = isPortName(port) ? grouped[port] : NO_CALLS;
  if (list.length === 0) return CALLS_HIDDEN;
  return CallsView.Listed({
    // Newest first, which is the opposite of the log's own order: a card shows a
    // handful, and the handful worth showing is the recent end.
    calls: list.toReversed().slice(0, SHOWN_PER_PORT).map(callRowOf),
    earlier: list.length > SHOWN_PER_PORT ? `and ${list.length - SHOWN_PER_PORT} earlier` : undefined,
  });
};

/**
 * The wording that keeps the seven required ports honest.
 *
 * A required port cannot be "unwired" — the program would not have started —
 * so an unnamed one is reported as unnamed, and the consequence line carries
 * what being defaulted actually costs.
 */
const stateOf = (port: PortReport): string => {
  if (!port.present) return port.required ? "not provided to this reader" : "absent";
  // The name, and the fact: a default reads as just another implementation
  // otherwise, which is exactly what it must not look like. `defaulted` is read
  // from the mark, not the name, so it is checked before the name can hide it.
  if (port.defaulted === true) return `defaulted — ${port.name ?? "unnamed"}`;
  return port.name ?? "wired, unnamed";
};

const activityOf = (entry: PortActivity | undefined, noReading: boolean): string => {
  // Distinct from absent: this port is wired, and nothing has reached it.
  if (entry === undefined) return noReading ? NO_ACTIVITY_READING : "never called";
  return `${entry.calls} call${entry.calls === 1 ? "" : "s"}${
    entry.translationCalls === 0 ? "" : ` · ${entry.translationCalls} from translation`
  }${entry.retries === 0 ? "" : ` · ${entry.retries} retried`}${
    entry.timeouts === 0 ? "" : ` · ${entry.timeouts} timed out`
  }`;
};

const rowOf = (
  port: PortReport,
  byPort: ActivityByPort,
  noReading: boolean,
  grouped: CallsByPort | undefined,
  unsampled: boolean,
): PortCardRow => ({
  port: port.port,
  defaulted: port.defaulted === undefined ? undefined : port.defaulted ? "true" : "false",
  state: stateOf(port),
  activity: activityOf(isPortName(port.port) ? byPort[port.port] : undefined, noReading),
  // Said for every card, but in its own voice: a defaulted port is paying
  // this cost now, and a wired one is only exposed to it.
  consequence: port.defaulted === false ? `if defaulted: ${port.consequence}` : port.consequence,
  tone: port.defaulted === true ? "Warning" : "Plain",
  calls: callsOf(grouped, port.port, unsampled),
});

/** One state of the wiring read, built once at module scope (AGENTS.md §5a). */
const viewOf: (self: WiringRead) => (input: ServicesInput) => ServicesView = Match.type<WiringRead>().pipe(
  Match.tagsExhaustive({
    NotHanded: () => (input: ServicesInput) => (input.unsampled ? SERVICES_WITHHELD : SERVICES_NOT_HANDED),
    Failed: ({ reason }) => () => ServicesView.Failed({ reason }),
    Read:
      ({ report }) =>
      (input: ServicesInput) => {
        const byPort = activityByPort(input.activity);
        const noReading = input.unsampled && input.activity.length === 0;
        const grouped = input.portCalls === undefined ? undefined : callsByPort(input.portCalls);
        return ServicesView.Read({
          rows: report.ports.map((port) => rowOf(port, byPort, noReading, grouped, input.unsampled)),
          cache: report.cache.present ? `${report.cache.size ?? 0} completed entries` : "absent",
        });
      },
  }),
);

/** The Services tab's cards for one reading: the one place their words are decided. */
export const portCards = (input: ServicesInput): ServicesView => viewOf(input.wiring)(input);
