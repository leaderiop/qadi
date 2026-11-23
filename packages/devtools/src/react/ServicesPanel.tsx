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
 * **The word "unwired" appears nowhere for a required port.** Seven of the
 * nine are in `EvaluationServices`, so a program that has not provided them
 * does not run; what a card can truthfully say is *defaulted to a fail-closed
 * implementation*.
 *
 * The cards are the dock model's `services` store, rendered without a decision
 * of their own (ADR-QD-168): every word, count and tone arrives in the row.
 */
import type { CSSProperties, FC, ReactNode } from "react";
import * as Match from "effect/Match";
import type { ReadableStore } from "../model/ExternalStore.ts";
import type { CallsView, CardTone, PortCardRow, ServicesView } from "../model/PortCards.ts";
import { DiagnosticsNotice, diagnosticsRootProps } from "./DiagnosticsNotice.tsx";
import type { DiagnosticsNoticeProps } from "./DiagnosticsNotice.tsx";
import { colors, font, muted } from "./theme.ts";
import { useStoreSnapshot } from "./useStoreSnapshot.ts";

export interface ServicesPanelProps {
  /**
   * The dock model's `services` store: no layer handed over, a layer that failed to
   * build, or the cards, each stated rather than left blank.
   *
   * It holds a view and not a reading, so the panel has no wording rule, count or
   * filter of its own to keep in step with the model's.
   */
  readonly services: ReadableStore<ServicesView>;
  /**
   * The dock's diagnostics status and restart, stated by the shared notice.
   *
   * Required, so a screen cannot forget it.
   */
  readonly diagnostics: DiagnosticsNoticeProps;
}

const card: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  padding: "6px 10px",
  marginBottom: 6,
};

/** What a card's tone looks like, keyed by the closed `CardTone` so a new tone is a compile error here. */
const TONE_STYLE: { readonly [K in CardTone]: CSSProperties } = {
  // A fail-closed default is a warning, not an error (00-overview's
  // vocabulary rules), so it takes the amber the dock uses for one.
  Warning: { color: colors.error },
  Plain: {},
};

/**
 * One state of the services view, built once at module scope (AGENTS.md §5a). The
 * first two are not error screens of the panel's own: the metrics below need no
 * wiring at all, so the screen is still useful without it.
 */
const screenOf: (self: ServicesView) => ReactNode = Match.type<ServicesView>().pipe(
  Match.tagsExhaustive({
    Withheld: () => null,
    NotHanded: () => (
      <p style={muted} data-testid="qadi-wiring-absent">
        No layer was handed to the dock, so which implementation is behind each
        port cannot be shown. Pass <code>{"diagnostics={{ layer }}"}</code>, or a{" "}
        <code>wiring</code> report read elsewhere.
      </p>
    ),
    Failed: ({ reason }) => (
      <p style={{ ...muted, color: colors.error }} data-testid="qadi-wiring-failed">
        The layer handed to the dock failed to build, so which implementation is
        behind each port cannot be shown: {reason}
      </p>
    ),
    Read: ({ rows, cache }) => (
      <>
        {rows.map((row) => (
          <PortCard key={row.port} row={row} />
        ))}
        <CacheCard size={cache} />
      </>
    ),
  }),
);

export const ServicesPanel: FC<ServicesPanelProps> = ({ services, diagnostics }) => {
  const view = useStoreSnapshot(services);
  return (
    <div {...diagnosticsRootProps(diagnostics.status)} data-testid="qadi-services">
      <DiagnosticsNotice {...diagnostics} />
      {screenOf(view)}

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
};

const PortCard: FC<{ readonly row: PortCardRow }> = ({ row }) => (
  <section
    style={card}
    data-testid="qadi-port"
    data-port={row.port}
    data-defaulted={row.defaulted}
  >
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
      <strong>{row.port}</strong>
      <span data-testid="qadi-port-state" style={{ fontSize: font.sizeSmall }}>
        {row.state}
      </span>
      <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-port-activity">
        {row.activity}
      </span>
    </div>
    <div
      style={{ ...muted, fontSize: font.sizeSmall, ...TONE_STYLE[row.tone] }}
      data-testid="qadi-port-consequence"
    >
      {/* Said for every card, but in its own voice: a defaulted port is paying
          this cost now, and a wired one is only exposed to it. */}
      {row.consequence}
    </div>
    {callsOf(row.calls)}
  </section>
);

/**
 * What this port was actually asked, most recent first.
 *
 * The absent case is stated rather than left blank: a card with no list looks
 * exactly like a port nothing asked, and the two are the difference between a
 * finding and a missing tracer.
 */
const callsOf: (self: CallsView) => ReactNode = Match.type<CallsView>().pipe(
  Match.tagsExhaustive({
    Hidden: () => null,
    Uncollected: () => (
      <div
        style={{ ...muted, fontSize: font.sizeSmall, marginTop: 4 }}
        data-testid="qadi-calls-uncollected"
      >
        What each call asked is not shown — pass <code>portCalls</code> from{" "}
        <code>collectPortCalls</code> to read it from the spans.
      </div>
    ),
    Listed: ({ calls, earlier }) => (
      <div style={{ marginTop: 4 }} data-testid="qadi-port-calls">
        {calls.map((call) => (
          <div
            key={call.key}
            style={{ fontSize: font.sizeSmall, display: "flex", gap: 8 }}
            data-testid="qadi-port-call"
          >
            <span>{call.text}</span>
            {call.interpreter === undefined ? null : (
              <span style={muted} data-testid="qadi-port-call-interpreter">
                {call.interpreter}
              </span>
            )}
            <span style={muted} data-testid="qadi-port-call-duration">
              {call.duration}
            </span>
          </div>
        ))}
        {earlier === undefined ? null : (
          <div style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-port-calls-more">
            {earlier}
          </div>
        )}
      </div>
    ),
  }),
);

/**
 * The cache card, which must not be confused with the record log.
 *
 * `clear` on a `DecisionCache` discards completed decisions so the next
 * question is recomputed; a decision log's `clear` discards the *log of
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
const CacheCard: FC<{ readonly size: string }> = ({ size }) => (
  <section style={card} data-testid="qadi-cache-card">
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <strong>DecisionCache</strong>
      <span style={{ fontSize: font.sizeSmall }} data-testid="qadi-cache-size">
        {size}
      </span>
    </div>
    <div style={{ ...muted, fontSize: font.sizeSmall }}>
      Bounded by capacity and evicted by insertion order — there is no
      time-to-live. Flushing a cache differs from clearing this panel&apos;s log.
    </div>
  </section>
);
