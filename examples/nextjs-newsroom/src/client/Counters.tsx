"use client";
/**
 * The browser's own five counters, and the serverless round trip.
 *
 * Sampled on a timer rather than subscribed to. `hydrationActivity` reads the
 * metric registry, which does not publish — and making it publish would cost
 * every production deployment something for the benefit of a panel almost nobody
 * has open.
 */
import { useEffect, useState } from "react";
import * as Effect from "effect/Effect";
import { hydrationActivity, unaccountedEntries } from "@qadi/devtools";
import type { HydrationActivity } from "@qadi/devtools";
import { button, card, colors, mono, muted, pre } from "../ui/theme.ts";

interface EdgeOutcome {
  readonly verdict: string;
  readonly forwardFailures: ReadonlyArray<string>;
}

const isEdgeOutcome = (value: unknown): value is EdgeOutcome =>
  typeof value === "object" && value !== null && "verdict" in value && "forwardFailures" in value;

export const Counters = ({
  entriesInPayload,
  articleId,
}: {
  readonly entriesInPayload: number;
  readonly articleId: string;
}) => {
  const [activity, setActivity] = useState<HydrationActivity | undefined>(undefined);
  const [edge, setEdge] = useState<EdgeOutcome | undefined>(undefined);
  const [edgeError, setEdgeError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sample = () => setActivity(Effect.runSync(hydrationActivity));
    sample();
    const timer = setInterval(sample, 1_000);
    return () => clearInterval(timer);
  }, []);

  const unaccounted = activity === undefined ? undefined : unaccountedEntries(activity);

  const callEdge = () => {
    setEdgeError(undefined);
    void fetch(`/api/edge/decide?article=${encodeURIComponent(articleId)}`, {
      credentials: "same-origin",
    })
      .then((response) => response.json())
      .then((body: unknown) => {
        if (isEdgeOutcome(body)) setEdge(body);
        else setEdgeError("the edge route answered something unexpected");
      })
      .catch((error: unknown) => setEdgeError(String(error)));
  };

  return (
    <>
      <div style={card}>
        <div style={{ ...mono, marginBottom: 6 }}>this browser, after hydration</div>
        <pre style={pre} data-testid="client-counters">
          {activity === undefined ? "sampling…" : `dehydrated: ${activity.dehydrated}
seeded:     ${activity.seeded}   (payload carried ${entriesInPayload})
rechecked:  ${activity.rechecked}
mismatched: ${activity.mismatched}
drops:      ${activity.drops.map((drop) => `${drop.reason}=${drop.count}`).join("  ")}`}
        </pre>
        <p style={{ ...muted, margin: "0.5rem 0 0" }}>
          {/*
            `unaccountedEntries` is `dehydrated − seeded`, and it is deliberately
            `undefined` rather than negative when seeded exceeds dehydrated —
            which is exactly what happens in a browser, where nothing dehydrated
            anything. A panel reporting "−4 unaccounted" would be reporting an
            arithmetic artefact as a finding.
          */}
          unaccounted (dehydrated − seeded):{" "}
          <strong data-testid="unaccounted">
            {unaccounted === undefined ? "not reportable here" : unaccounted}
          </strong>
        </p>
      </div>

      <div style={card}>
        <div style={{ ...mono, marginBottom: 6 }}>topology 5 — an invocation that ends</div>
        <button type="button" style={button} onClick={callEdge} data-testid="edge-call">
          decide on the serverless route
        </button>
        {edgeError !== undefined
          ? (
            <p style={{ ...mono, color: colors.deny, margin: "0.5rem 0 0" }}>
              {edgeError}
            </p>
          )
          : edge === undefined
          ? (
            <p style={{ ...muted, margin: "0.5rem 0 0" }}>
              It builds its layer per request, forwards the record before returning, and the
              aggregator ingests it stamped <code>Edge</code>.
            </p>
          )
          : (
            <p style={{ ...mono, margin: "0.5rem 0 0" }} data-testid="edge-result">
              verdict {edge.verdict} · forward failures {edge.forwardFailures.length} — look for an{" "}
              <strong>Edge</strong> row in the dock&rsquo;s Log
            </p>
          )}
      </div>
    </>
  );
};
