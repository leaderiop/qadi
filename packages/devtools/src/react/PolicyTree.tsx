"use client";
/**
 * One requirement tree, rendered — with a verdict on every node, or with none
 * at all.
 *
 * Shared by the inspector (screen 2) and the policy explorer (screen 3), which
 * want the same shape and emphatically not the same content. **A policy shown
 * without an evaluation must state no verdict**
 * ([INV-QD-041](../../../../spec/invariants.md)): `inspect(policy, undefined)`
 * marks every node `NeverResolved`, which in the inspector correctly reads
 * *this branch was short-circuited* and in the explorer would be a lie — the
 * policy was not skipped, it was never run.
 *
 * So `showStatus` is not a display preference. It is the difference between
 * reporting an evaluation and describing a rule, and the two screens are the
 * only callers precisely so that the difference lives in one place.
 */
import type { FC } from "react";
import type { InspectNode } from "../model/Inspect.ts";
import { colors, muted } from "./theme.ts";

const statusMark: Record<InspectNode["status"], string> = {
  Allowed: "✓",
  Denied: "✗",
  NeverResolved: "·",
};

const statusColor: Record<InspectNode["status"], string> = {
  Allowed: colors.allow,
  Denied: colors.error,
  NeverResolved: colors.textMuted,
};

export interface PolicyTreeProps {
  readonly node: InspectNode;
  /**
   * Render each node's verdict.
   *
   * `false` renders the rule alone — no marks, no dimming, no reasons — which
   * is what a policy nobody has evaluated actually warrants.
   */
  readonly showStatus: boolean;
  readonly depth?: number;
}

export const PolicyTree: FC<PolicyTreeProps> = ({ node, showStatus, depth = 0 }) => (
  <div
    data-testid="qadi-node"
    data-path={node.path}
    {...(showStatus ? { "data-status": node.status } : {})}
  >
    <div
      style={{
        paddingLeft: depth * 14,
        // A node nobody evaluated is dimmed and dotted, never struck through or
        // marked with a cross: it was not rejected, it was not reached. With no
        // evaluation at all there is nothing to dim.
        opacity: showStatus && node.status === "NeverResolved" ? 0.55 : 1,
      }}
    >
      {showStatus ? (
        <span style={{ color: statusColor[node.status], marginRight: 6 }}>
          {statusMark[node.status]}
        </span>
      ) : null}
      {node.effect === undefined ? null : (
        <span style={{ ...muted, marginRight: 6 }}>{node.effect.toLowerCase()} when</span>
      )}
      <span>{node.label}</span>
      {node.detail === undefined ? null : (
        <span style={{ ...muted, marginLeft: 6 }}>({node.detail})</span>
      )}
      {showStatus && node.status === "NeverResolved" ? (
        <span style={{ ...muted, marginLeft: 6 }} data-testid="qadi-never-resolved">
          never resolved
        </span>
      ) : null}
      {/* A reason belongs to an evaluation. Rendering one here without a status
          would be the same claim made quietly. */}
      {showStatus && node.reason !== undefined ? (
        <span style={{ ...muted, marginLeft: 6 }}>— {node.reason}</span>
      ) : null}
      {node.restrictsFields === undefined ? null : (
        <span style={{ ...muted, marginLeft: 6 }}>
          exposing only {node.restrictsFields.join(", ")}
        </span>
      )}
    </div>
    {node.children.map((child) => (
      <PolicyTree key={child.path} node={child} showStatus={showStatus} depth={depth + 1} />
    ))}
  </div>
);
