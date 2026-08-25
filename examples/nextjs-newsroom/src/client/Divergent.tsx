"use client";
/**
 * The control that closes under you.
 *
 * Nothing here reacts to the divergence. There is no listener and no branch for
 * it: the guard reads its atom, and the atom's value stops being the seed the
 * moment this client has an answer of its own. The disagreement is reported
 * beside it — by the `onHydrationMismatch` reporter wired in `atoms.ts` — but
 * reporting is all it does. It observes; it cannot change the outcome, because
 * the client's answer is already the one in effect by the time it runs.
 */
import { useSyncExternalStore } from "react";
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

      <div style={card} data-testid="mismatch-report">
        <div style={{ ...mono, marginBottom: 4 }}>
          disagreements reported: {mismatches.length}
        </div>
        {mismatches.length === 0
          ? (
            <p style={muted}>
              None yet. The re-check is one HTTP round trip away; it usually lands within a frame or
              two of hydration.
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
