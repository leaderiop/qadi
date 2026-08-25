"use client";
/**
 * What a server render can settle, and what suspending on it costs.
 *
 * Three sections, and the third is a warning with a measurement behind it.
 *
 * `useDecisionSuspense` throws the pending decision's promise, which is what
 * suspends the subtree. In the App Router that promise is awaited **by the
 * server**, not only by the browser — the streaming renderer is not
 * `renderToString`'s single synchronous pass, so a boundary it can resolve, it
 * will.
 *
 * The corollary is the hazard. A question the server *cannot* answer — an
 * unseeded, resolver-bound one, where the resolver is a browser fetch — suspends
 * a boundary that will never resolve, and the response stays open. Measured
 * here: still streaming at twenty seconds, which is where the test gave up
 * rather than where the server did.
 *
 * So: suspend on a question you have seeded. `useDecision` is the right hook for
 * anything a page can render without the answer, and it gives you the three
 * states separately instead of collapsing them into "not yet".
 */
import { Suspense } from "react";
import { isAllowed } from "@qadi/core";
import { useDecisionSuspense } from "@qadi/react";
import { inGoodStanding, readSourceContact } from "../domain/policies.ts";
import { GateState } from "./Guards.tsx";
import { badge, card, colors, h2, mono, muted, note } from "../ui/theme.ts";

/** Suspends until this client has an answer — which, seeded, it already has. */
const Verdict = () => {
  const decision = useDecisionSuspense(readSourceContact);
  return (
    <span style={mono} data-testid="suspense-verdict">
      <span style={badge(isAllowed(decision) ? "allow" : "deny")}>
        {isAllowed(decision) ? "Allowed" : "Denied"}
      </span>{" "}
      evaluation {decision.evaluationId}
    </span>
  );
};

export const SuspenseDemo = () => (
  <>
    <h2 style={h2}>Seeded and synchronous — settled in the HTML</h2>
    <div style={card}>
      <GateState policy={readSourceContact} label="sources" />
      <p style={{ ...muted, margin: "0.4rem 0 0" }}>
        A permission check reads the subject, so it settles during the server pass whether or not it
        was seeded. Here it is both.
      </p>
    </div>

    <h2 style={h2}>Unseeded and resolver-bound — pending in the HTML</h2>
    <div style={card}>
      <GateState policy={inGoodStanding} label="standing" />
      <p style={{ ...muted, margin: "0.4rem 0 0" }}>
        An attribute check reaches a port, and this app&rsquo;s browser-side port is an HTTP call
        that cannot be made from the server render. So the resolver does not settle there — it does
        not guess, and it does not fail either, because the question was never asked. The guard
        reads <strong>pending</strong> and the browser settles it after mount.
      </p>
    </div>

    <h2 style={h2}>Suspended — on a question that was seeded</h2>
    <div style={card}>
      <Suspense
        fallback={
          <span style={{ ...mono, color: colors.pending }} data-testid="suspense-fallback">
            waiting for a decision…
          </span>
        }
      >
        <Verdict />
      </Suspense>
    </div>

    <div style={note}>
      <strong>Do not suspend on a question the server cannot answer.</strong> The App Router awaits
      Suspense boundaries during the server render, so <code>useDecisionSuspense</code> on an
      unseeded resolver-bound question suspends a boundary that never resolves — and the response
      stays open. This route was written that way first; the request was still streaming at twenty
      seconds, which is where the test gave up rather than where the server did. Seed the question,
      or use <code>useDecision</code> and render the pending state.
    </div>
  </>
);
