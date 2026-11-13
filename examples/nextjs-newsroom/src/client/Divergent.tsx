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
 * two states is ever in the served HTML:
 *
 *   1. `Success(SeededAllow)` — the seed. It covers the first frames and the client's first
 *      check, so hydration matches the server's byte for byte (ADR-QD-039).
 *   2. `Success(Deny)` — this client's own denial, which replaces the seed and is then
 *      the only answer. A re-check after an invalidation never falls back to it.
 *
 * The raw read is the exhibit, not an oversight: `outcomeOf` would fold these
 * into outcomes, and the e2e test pins the raw sequence. The decided tag is
 * recorded beside `Success` because the seed and the denial are both `Success`
 * results and would otherwise collapse into one entry.
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
  const tag = `${result._tag}${result.waiting ? "+waiting" : ""}${
    result._tag === "Success" ? `(${result.value._tag})` : ""
  }`;
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
          The server&rsquo;s allow covers the page only until this client&rsquo;s own answer,
          which then replaces it — a seed is a cache, not an authorization.
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
