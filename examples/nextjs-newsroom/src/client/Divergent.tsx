"use client";
/**
 * The control that closes under you.
 *
 * Nothing here reacts to the divergence. There is no listener and no branch for
 * it: the guard reads its atom, and the atom's value stops being the seed the
 * moment this client has an answer of its own. A seed is a cache; it is not an
 * authorization.
 *
 * `seen` records every `AsyncResult` this guard has been handed, in order,
 * because the sequence is the whole demonstration and only the first of its
 * three states is ever in the served HTML:
 *
 *   1. `Success` — the seed. Hydration matches the server's, byte for byte.
 *   2. `Initial + waiting` — the re-check is in flight, and a seed must not be
 *      read while it is ([BEH-QD-151]). *Pending*, deliberately, rather than the
 *      server's now-stale allow.
 *   3. `Success` — this client's own denial, which is now the only answer.
 *
 * [BEH-QD-151]: ../../../../spec/behaviors/19-hydration.md
 */
import { useRef, useSyncExternalStore } from "react";
import { useDecision } from "@qadi/react";
import { inGoodStanding } from "../domain/policies.ts";
import { GateState, Guarded } from "./Guards.tsx";
import { mismatchSnapshot, subscribeMismatches } from "./atoms.ts";
import { card, mono, muted, pre } from "../ui/theme.ts";

export const Divergent = () => {
  const mismatches = useSyncExternalStore(
    subscribeMismatches,
    mismatchSnapshot,
    mismatchSnapshot,
  );

  // A ref rather than state: this records renders and must not cause one.
  const seen = useRef<Array<string>>([]);
  const result = useDecision(inGoodStanding);
  const tag = `${result._tag}${result.waiting ? "+waiting" : ""}`;
  if (seen.current[seen.current.length - 1] !== tag) seen.current.push(tag);

  return (
    <>
      <div style={card}>
        <GateState policy={inGoodStanding} label="standing" />
        <Guarded
          policy={inGoodStanding}
          testId="filing"
          denied="filing is closed — your standing was revoked"
        >
          <button type="button" style={{ font: "inherit" }}>
            File to the desk
          </button>
        </Guarded>
      </div>

      <div style={card} data-testid="seen-sequence" data-seen={seen.current.join(",")}>
        <div style={{ ...mono, marginBottom: 4 }}>every result this guard was handed</div>
        <pre style={pre}>{seen.current.join("\n")}</pre>
        <p style={{ ...muted, margin: 0 }}>
          The middle one is the point. The server&rsquo;s allow is <em>not</em> shown while this
          client is asking for itself — a decision being re-checked is not a decision.
        </p>
      </div>

      <div style={card} data-testid="mismatch-report">
        <div style={{ ...mono, marginBottom: 4 }}>
          disagreements reported: {mismatches.length}
        </div>
        {mismatches.length === 0
          ? (
            <p style={muted}>
              None — and here that is a <strong>known discrepancy</strong> rather than a quiet
              success. The verdict above really did change from the seed, so a reporter should have
              fired once. It does in a plain React render (<code>test/seed.test.tsx</code>) and does
              not in this app. The README carries the reproduction.
            </p>
          )
          : (
            <pre style={pre}>
              {mismatches
                .map((mismatch) =>
                  `seeded: ${mismatch.seeded._tag}\ndecided: ${mismatch.decided._tag}\n` +
                  `reason: ${
                    mismatch.decided._tag === "Deny" ? mismatch.decided.reason : "—"
                  }`
                )
                .join("\n\n")}
            </pre>
          )}
      </div>
    </>
  );
};
