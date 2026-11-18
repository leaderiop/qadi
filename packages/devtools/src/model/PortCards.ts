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
import type { PortCallLog } from "./PortCalls.ts";
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

/** One card, in words: nothing here is left for the panel to decide. */
export interface PortCardRow {
  readonly port: WiredServiceName;
  /** The `data-defaulted` value: `undefined` when there is nothing to say about defaulting. */
  readonly defaulted: "true" | "false" | undefined;
  readonly state: string;
  readonly activity: string;
  readonly consequence: string;
  readonly tone: CardTone;
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

/** What a port's activity reads before any sample was taken: not "never called", which would be a claim. */
const NO_ACTIVITY_READING = "no activity reading";

const SERVICES_WITHHELD = ServicesView.Withheld();
const SERVICES_NOT_HANDED = ServicesView.NotHanded();

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
  const grouped = new Map<string, PortActivity>();
  for (const entry of list) {
    if (!grouped.has(entry.port)) grouped.set(entry.port, entry);
  }
  return tabulatePorts<ActivityByPort>((d) => grouped.get(d.port));
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

const rowOf = (port: PortReport, byPort: ActivityByPort, noReading: boolean): PortCardRow => ({
  port: port.port,
  defaulted: port.defaulted === undefined ? undefined : port.defaulted ? "true" : "false",
  state: stateOf(port),
  activity: activityOf(isPortName(port.port) ? byPort[port.port] : undefined, noReading),
  // Said for every card, but in its own voice: a defaulted port is paying
  // this cost now, and a wired one is only exposed to it.
  consequence: port.defaulted === false ? `if defaulted: ${port.consequence}` : port.consequence,
  tone: port.defaulted === true ? "Warning" : "Plain",
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
        return ServicesView.Read({
          rows: report.ports.map((port) => rowOf(port, byPort, noReading)),
          cache: report.cache.present ? `${report.cache.size ?? 0} completed entries` : "absent",
        });
      },
  }),
);

/** The Services tab's cards for one reading: the one place their words are decided. */
export const portCards = (input: ServicesInput): ServicesView => viewOf(input.wiring)(input);
