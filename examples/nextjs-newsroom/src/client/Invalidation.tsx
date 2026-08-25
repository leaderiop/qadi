"use client";
/**
 * The safe reading and the unsafe one, side by side.
 *
 * The left column goes through `currentDecision`. The right reads the
 * `AsyncResult` directly, the way a consumer would if they had never been told
 * not to. During a re-check they disagree, and the one that disagrees by
 * reporting the *old* answer is the one that would have kept a revoked user's
 * button live.
 */
import { useState } from "react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { currentDecision, useDecision, useInvalidate } from "@qadi/react";
import type { Policy } from "@qadi/core";
import { inGoodStanding, readSourceContact } from "../domain/policies.ts";
import { badge, button, card, colors, mono, muted } from "../ui/theme.ts";

const Pair = ({ policy, label }: { readonly policy: Policy; readonly label: string }) => {
  const result = useDecision(policy);
  const safe = currentDecision(result);

  // What a consumer gets by reading the result rather than going through
  // `currentDecision`. Kept deliberately naive; this is the mistake, rendered.
  const naive = AsyncResult.isSuccess(result) ? result.value : undefined;

  const safeState = safe === undefined
    ? (result.waiting ? "Rechecking" : "Pending")
    : safe._tag;
  const naiveState = naive === undefined ? "—" : naive._tag;

  return (
    <tr data-testid={`row-${label}`}>
      <td style={{ ...mono, paddingRight: 16 }}>{label}</td>
      <td style={{ paddingRight: 16 }}>
        <span
          style={badge(
            safeState === "Allow" ? "allow" : safeState === "Deny" ? "deny" : "pending",
          )}
          data-testid={`safe-${label}`}
          data-state={safeState}
        >
          {safeState}
        </span>
      </td>
      <td style={{ paddingRight: 16 }}>
        <span
          style={{ ...mono, color: result.waiting ? colors.deny : colors.muted }}
          data-testid={`naive-${label}`}
          data-state={naiveState}
        >
          {naiveState}
          {result.waiting ? " ← stale" : ""}
        </span>
      </td>
      <td style={mono}>{result.waiting ? "waiting: true" : "waiting: false"}</td>
    </tr>
  );
};

export const Invalidation = () => {
  const invalidate = useInvalidate();
  const [rounds, setRounds] = useState(0);

  return (
    <div style={card}>
      <button
        type="button"
        style={button}
        data-testid="invalidate"
        onClick={() => {
          invalidate();
          setRounds((count) => count + 1);
        }}
      >
        invalidate
      </button>
      <span style={{ ...mono, marginLeft: 10, color: colors.muted }}>
        {rounds} round{rounds === 1 ? "" : "s"}
      </span>

      <table style={{ marginTop: "0.8rem", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: colors.muted }}>
            <th style={{ paddingRight: 16 }}>question</th>
            <th style={{ paddingRight: 16 }}>currentDecision</th>
            <th style={{ paddingRight: 16 }}>reading the result directly</th>
            <th>result</th>
          </tr>
        </thead>
        <tbody>
          <Pair policy={readSourceContact} label="sources (synchronous)" />
          <Pair policy={inGoodStanding} label="standing (over HTTP)" />
        </tbody>
      </table>

      <p style={{ ...muted, margin: "0.6rem 0 0" }}>
        The third column is the bug. It is not showing a wrong answer — it is showing the{" "}
        <em>previous</em> answer, which is worse, because it is right almost all of the time.
      </p>
    </div>
  );
};
