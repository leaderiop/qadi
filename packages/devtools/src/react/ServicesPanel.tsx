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
 * **The word "unwired" appears nowhere for a required port.** Five of the seven
 * are in `EvaluationServices`, so a program that has not provided them does not
 * run; what a card can truthfully say is *defaulted to a fail-closed
 * implementation*.
 */
import type { CSSProperties, FC } from "react";
import type { CacheReport, PortActivity, PortReport, WiringReport } from "../model/Wiring.ts";
import { colors, font, muted } from "./theme.ts";

export interface ServicesPanelProps {
  /** Absent when the host did not hand the dock its layer. */
  readonly wiring: WiringReport | undefined;
  readonly activity: ReadonlyArray<PortActivity>;
}

const card: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  padding: "6px 10px",
  marginBottom: 6,
};

export const ServicesPanel: FC<ServicesPanelProps> = ({ wiring, activity }) => (
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
        <PortCard key={port.port} port={port} activity={activityFor(activity, port.port)} />
      ))
    )}

    {wiring === undefined ? null : <CacheCard cache={wiring.cache} />}

    <p
      style={{ ...muted, fontSize: font.sizeSmall, marginBottom: 0 }}
      data-testid="qadi-activity-scope"
    >
      Call counts are process-wide aggregates — not per request, and not per
      decision. Correlating a call with one evaluation would mean threading a
      collector through the evaluator, which risks the short-circuit guarantee
      for a debug view.
    </p>
  </div>
);

const PortCard: FC<{
  readonly port: PortReport;
  readonly activity: PortActivity | undefined;
}> = ({ port, activity }) => (
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
  </section>
);

/**
 * The wording that keeps the five required ports honest.
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
