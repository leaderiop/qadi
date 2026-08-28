"use client";
/**
 * Screen 6 — services and cache.
 *
 * One card per port, each saying three things: which implementation is behind
 * it, whether anything ever reached it, and what it means if it is defaulted.
 * The first two look like one question and are opposite problems — a store that
 * is wired but never consulted and one that is not wired at all both render as
 * an empty screen otherwise.
 *
 * **The word "unwired" appears nowhere for a required port.** Six of the eight
 * are in `EvaluationServices`, so a program that has not provided them does not
 * run; what a card can truthfully say is *defaulted to a fail-closed
 * implementation*.
 */
import type { CSSProperties, FC } from "react";
import * as Match from "effect/Match";
import type { PortCall, PortCallLog } from "../model/PortCalls.ts";
import type { CacheReport, PortActivity, PortReport, WiringReport } from "../model/Wiring.ts";
import { colors, font, muted } from "./theme.ts";

/**
 * How many recent calls a card shows.
 *
 * A card, not a page: the question this screen answers is "was my store asked,
 * and about what", and the last few answer it. The collector's own bound is
 * larger, and the card says when there is more behind it.
 */
const SHOWN_PER_PORT = 5;

export interface ServicesPanelProps {
  /** Absent when the host did not hand the dock its layer. */
  readonly wiring: WiringReport | undefined;
  readonly activity: ReadonlyArray<PortActivity>;
  /**
   * Recent calls, read from `collectPortCalls`.
   *
   * Absent by default and absent in most deployments — it needs a tracer layer
   * the host provides. Without it the cards still show counts, and say what the
   * detail would need.
   */
  readonly portCalls?: PortCallLog;
}

const card: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  padding: "6px 10px",
  marginBottom: 6,
};

export const ServicesPanel: FC<ServicesPanelProps> = ({ wiring, activity, portCalls }) => (
  <div style={{ padding: 12 }} data-testid="qadi-services">
    {wiring === undefined ? (
      <p style={muted} data-testid="qadi-wiring-absent">
        {/* Not an error state: the metrics below need no wiring at all, so the
            screen is still useful without this. */}
        No layer was handed to the dock, so which implementation is behind each
        port cannot be shown. Pass <code>wiring</code> to see it.
      </p>
    ) : (
      wiring.ports.map((port) => (
        <PortCard
          key={port.port}
          port={port}
          activity={activityFor(activity, port.port)}
          calls={callsFor(portCalls, port.port)}
          collecting={portCalls !== undefined}
        />
      ))
    )}

    {wiring === undefined ? null : <CacheCard cache={wiring.cache} />}

    <p
      style={{ ...muted, fontSize: font.sizeSmall, marginBottom: 0 }}
      data-testid="qadi-activity-scope"
    >
      {/* Still true, and now only half the story — so it says which half. The
          counts come from metrics and are process-wide; the calls beneath each
          card come from spans and are the recent ones this reader collected. */}
      Call counts are process-wide aggregates — not per request, and not per
      decision. Correlating a call with one evaluation would mean threading a
      collector through the evaluator, which risks the short-circuit guarantee
      for a debug view. The listed calls are read from spans instead, and are
      the recent ones rather than all of them.
    </p>
  </div>
);

const PortCard: FC<{
  readonly port: PortReport;
  readonly activity: PortActivity | undefined;
  readonly calls: ReadonlyArray<PortCall>;
  readonly collecting: boolean;
}> = ({ port, activity, calls, collecting }) => (
  <section style={card} data-testid="qadi-port" data-port={port.port}>
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
      <strong>{port.port}</strong>
      <span data-testid="qadi-port-state" style={{ fontSize: font.sizeSmall }}>
        {stateOf(port)}
      </span>
      <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-port-activity">
        {activity === undefined
          // Distinct from absent: this port is wired, and nothing has reached it.
          ? "never called"
          : `${activity.calls} call${activity.calls === 1 ? "" : "s"}${
            activity.retries === 0 ? "" : ` · ${activity.retries} retried`
          }`}
      </span>
    </div>
    <div style={{ ...muted, fontSize: font.sizeSmall }}>{port.consequence}</div>
    <RecentCalls calls={calls} collecting={collecting} />
  </section>
);

/**
 * What this port was actually asked, most recent first.
 *
 * The absent case is stated rather than left blank: a card with no list looks
 * exactly like a port nothing asked, and the two are the difference between a
 * finding and a missing tracer.
 */
const RecentCalls: FC<{
  readonly calls: ReadonlyArray<PortCall>;
  readonly collecting: boolean;
}> = ({ calls, collecting }) => {
  if (!collecting) {
    return (
      <div
        style={{ ...muted, fontSize: font.sizeSmall, marginTop: 4 }}
        data-testid="qadi-calls-uncollected"
      >
        What each call asked is not shown — pass <code>portCalls</code> from{" "}
        <code>collectPortCalls</code> to read it from the spans.
      </div>
    );
  }
  if (calls.length === 0) return null;

  // Newest first, which is the opposite of the log's own order: a card shows a
  // handful, and the handful worth showing is the recent end.
  const shown = [...calls].reverse().slice(0, SHOWN_PER_PORT);

  return (
    <div style={{ marginTop: 4 }} data-testid="qadi-port-calls">
      {shown.map((call) => (
        <div
          key={`${call.span}-${String(call.at)}-${describe(call)}`}
          style={{ fontSize: font.sizeSmall, display: "flex", gap: 8 }}
          data-testid="qadi-port-call"
        >
          <span>{describe(call)}</span>
          <span style={muted} data-testid="qadi-port-call-duration">
            {call.durationMillis === undefined
              // Not zero. A zero is a call that finished instantly.
              ? "in flight"
              : `${call.durationMillis.toFixed(1)} ms`}
          </span>
        </div>
      ))}
      {calls.length > shown.length ? (
        <div style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-port-calls-more">
          and {calls.length - shown.length} earlier
        </div>
      ) : null}
    </div>
  );
};

/**
 * One call in a sentence, built once at module scope per AGENTS.md §5a.
 *
 * Every field can be absent, because a span is decoded from `unknown` and a call
 * that failed before it was made never recorded an answer. *Not recorded* rather
 * than a blank or a plausible default: a reader chasing a wiring problem needs
 * to know the difference between "it said nothing" and "nobody asked".
 */
const describe: (self: PortCall) => string = Match.type<PortCall>().pipe(
  Match.tagsExhaustive({
    AttributeResolver: (call) =>
      `${call.attribute ?? "not recorded"} → ${
        call.resolved === undefined
          ? "no answer"
          : call.resolved
            ? "a value"
            : "nothing"
      }`,
    DecisionHistory: (call) =>
      `${call.event ?? "not recorded"} ${
        call.resourceId === undefined ? "anywhere" : `on ${call.resourceId}`
      } → ${call.answer ?? "no answer"}`,
    RelationshipResolver: (call) =>
      `${call.relation ?? "not recorded"} on ${call.resourceId ?? "no resource"}${
        call.depth === undefined ? "" : ` (depth ${String(call.depth)})`
      } → ${call.answer ?? "no answer"}`,
    CustomPredicate: (call) =>
      `${call.name ?? "not recorded"} → ${
        call.answer === undefined ? "no answer" : call.answer ? "true" : "false"
      }`,
    SignatureHistory: (call) =>
      `${call.meaning ?? "not recorded"}${
        call.signerRole === undefined ? "" : ` from a '${call.signerRole}'`
      } → ${call.matched === undefined ? "no answer" : call.matched ? "matched" : "no match"}`,
  }),
);

const callsFor = (log: PortCallLog | undefined, port: string): ReadonlyArray<PortCall> =>
  log === undefined ? [] : log.calls.filter((call) => call._tag === port);

/**
 * The wording that keeps the seven required ports honest.
 *
 * A required port cannot be "unwired" — the program would not have started —
 * so an unnamed one is reported as unnamed, and the consequence line carries
 * what being defaulted actually costs.
 */
const stateOf = (port: PortReport): string => {
  if (!port.present) return port.required ? "not provided to this reader" : "absent";
  return port.name === undefined ? "wired, unnamed" : port.name;
};

/**
 * The cache card, which must not be confused with the record log.
 *
 * `clear` on a `DecisionCache` discards completed decisions so the next
 * question is recomputed; `decisionSinkRing`'s `clear` discards the *log of
 * what was decided*. Conflating them would let a reader empty their audit view
 * while meaning to invalidate a cache.
 *
 * The wording avoids the phrase "the same as": `check-house-style.mjs` matches
 * `as` textually and reads it inside a string. The sentence is phrased around
 * the rule rather than the rule loosened to admit it — the same call made in
 * `Inspector.tsx`.
 *
 * **No TTL is offered**, because there is none: the bound is `capacity`, and
 * entries are evicted by insertion order rather than by age. Offering a TTL
 * control would imply a cache design the library does not have.
 */
const CacheCard: FC<{ readonly cache: CacheReport }> = ({ cache }) => (
  <section style={card} data-testid="qadi-cache-card">
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <strong>DecisionCache</strong>
      <span style={{ fontSize: font.sizeSmall }} data-testid="qadi-cache-size">
        {cache.present ? `${cache.size ?? 0} completed entries` : "absent"}
      </span>
    </div>
    <div style={{ ...muted, fontSize: font.sizeSmall }}>
      Bounded by capacity and evicted by insertion order — there is no
      time-to-live. Flushing a cache differs from clearing this panel&apos;s log.
    </div>
  </section>
);

const activityFor = (
  activity: ReadonlyArray<PortActivity>,
  port: string,
): PortActivity | undefined => activity.find((entry) => entry.port === port);
