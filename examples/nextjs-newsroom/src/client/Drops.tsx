"use client";
/**
 * What hydration refused to seed, and why.
 *
 * Four routes share this. Each arranges a different way for a payload to be
 * unusable, and each one is **announced and counted** rather than silent — which
 * is the whole of [BEH-QD-230](../../../../spec/behaviors/19-hydration.md). All
 * three client-side exits were once silent, which made a page that re-decided
 * everything from scratch indistinguishable from one that had nothing to
 * hydrate.
 *
 * The reason matters as much as the count, because the three causes want three
 * different fixes: a mismatched subject is a cache-key bug, an unregistered atom
 * set is a wiring mistake, and an undecodable policy is version skew.
 */
import type { Policy, Resource } from "@qadi/core";
import { GateState } from "./Guards.tsx";
import { useDrops } from "./Providers.tsx";
import { badge, card, mono, muted } from "../ui/theme.ts";

export interface DropsProps {
  readonly testId: string;
  /** The reason this route is arranged to produce. Asserted, not decorative. */
  readonly expect: string;
  readonly questions: ReadonlyArray<{
    readonly policy: Policy;
    readonly resource?: Resource;
    readonly label: string;
  }>;
}

export const Drops = ({ testId, expect, questions }: DropsProps) => {
  const drops = useDrops();
  const matching = drops.filter((drop) => drop.reason === expect);

  return (
    <>
      <div style={card} data-testid={`drops-${testId}`} data-reason={matching[0]?.reason ?? ""}>
        <div style={{ ...mono, marginBottom: 6 }}>hydration drops</div>
        {drops.length === 0
          ? <p style={muted}>none reported</p>
          : (
            <ul style={{ ...mono, margin: 0, paddingLeft: "1.1rem" }}>
              {drops.map((drop, index) => (
                <li key={`${drop.reason}-${index}`}>
                  <span style={badge(drop.reason === expect ? "deny" : "pending")}>
                    {drop.reason}
                  </span>{" "}
                  × {drop.count}
                </li>
              ))}
            </ul>
          )}
        {/*
          One line per reason, not one per entry. A version skew makes *every*
          entry of a shape undecodable, and one warning each would bury the
          page's other output under a payload's worth of identical lines.
        */}
        <p style={{ ...muted, margin: "0.5rem 0 0" }}>
          Reported once per reason, never once per entry.
        </p>
      </div>

      <div style={card}>
        <div style={{ ...mono, marginBottom: 6 }}>
          the questions this page asked, unseeded
        </div>
        {questions.map((question) => (
          <GateState
            key={question.label}
            policy={question.policy}
            {...(question.resource === undefined ? {} : { resource: question.resource })}
            label={question.label}
          />
        ))}
      </div>
    </>
  );
};
