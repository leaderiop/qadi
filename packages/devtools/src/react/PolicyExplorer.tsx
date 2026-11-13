"use client";
/**
 * Screen 3 — the policy explorer.
 *
 * What a rule *says*, with no subject and no evaluation anywhere in it. That is
 * the whole distinction from screen 2, and it is enforced rather than
 * remembered: `PolicyTree` is given `showStatus={false}`, so no node here can
 * carry a verdict ([INV-QD-041](../../../../spec/invariants.md)).
 *
 * The distinction matters because `inspect(policy, undefined)` marks every node
 * `NeverResolved` — which in the inspector truthfully reads *this branch was
 * short-circuited*, and here would say a policy was skipped when it was simply
 * never run.
 */
import type { CSSProperties, FC } from "react";
import type { ExplorerSession, ExplorerSnapshot } from "../model/ExplorerSession.ts";
import { inspect } from "../model/Inspect.ts";
import { PolicyTree } from "./PolicyTree.tsx";
import { button, colors, font, input, muted } from "./theme.ts";
import { useStoreSnapshot } from "./useStoreSnapshot.ts";

export interface PolicyExplorerProps {
  /** Owned by the dock, so what this shows survives leaving the tab (INV-QD-107). */
  readonly session: ExplorerSession;
}

const rail: CSSProperties = {
  width: 200,
  flexShrink: 0,
  borderRight: `1px solid ${colors.border}`,
  overflow: "auto",
};

const railItem = (selected: boolean): CSSProperties => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  appearance: "none",
  background: selected ? colors.surfaceRaised : "transparent",
  color: selected ? colors.text : colors.textMuted,
  border: "none",
  borderBottom: `1px solid ${colors.border}`,
  padding: "4px 8px",
  font: "inherit",
  cursor: "pointer",
});

type Showing = Extract<ExplorerSnapshot, { readonly _tag: "Showing" }>;

/**
 * Renders the explorer session; decides nothing.
 *
 * Which policy is shown, what a preview is, and what the JSON pane describes
 * are the session's (`ExplorerSession.ts`). This file is the wording and the
 * wiring.
 */
export const PolicyExplorer: FC<PolicyExplorerProps> = ({ session }) => {
  const snapshot = useStoreSnapshot(session);

  if (snapshot._tag === "Empty") {
    return (
      <p style={{ ...muted, padding: 16 }} data-testid="qadi-policies-empty">
        No policies to show. This rail lists what the log has seen, so it fills as
        decisions arrive — pass a <code>catalogue</code> to name policies that
        have not run yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%" }} data-testid="qadi-policies">
      <div style={rail}>
        {snapshot.sightings.map((entry, index) => (
          <button
            key={`${entry.label}-${index}`}
            type="button"
            data-testid="qadi-policy-rail-item"
            style={railItem(index === snapshot.railIndex)}
            onClick={() => session.choose(entry.policy)}
          >
            <div>{entry.label}</div>
            <div style={{ ...muted, fontSize: font.sizeSmall }}>
              {entry.count === 0
                ? "never evaluated"
                : `${entry.count} decision${entry.count === 1 ? "" : "s"}`}
            </div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0, overflow: "auto", padding: 12 }}>
        {snapshot.shown._tag === "Evicted" ? (
          <div
            style={{ ...muted, fontSize: font.sizeSmall, marginBottom: 8 }}
            data-testid="qadi-policies-evicted"
          >
            {snapshot.shown.value.label} is no longer in the log
          </div>
        ) : null}
        <Toolbar snapshot={snapshot} session={session} />
        <DepthLine depth={snapshot.depth} />
        {snapshot.view === "Json" ? (
          <JsonView snapshot={snapshot} session={session} />
        ) : (
          <PolicyTree node={inspect(snapshot.tree, undefined)} showStatus={false} />
        )}
      </div>
    </div>
  );
};

const Toolbar: FC<{ readonly snapshot: Showing; readonly session: ExplorerSession }> = ({
  snapshot,
  session,
}) => {
  const { simplification, view } = snapshot;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
      <button
        type="button"
        style={button(view === "Tree")}
        onClick={() => session.setView(view === "Tree" ? "Json" : "Tree")}
      >
        {view === "Json" ? "JSON" : "Tree"}
      </button>

      {/* Never automatic (ADR-QD-030), and never applied without being shown
          first: simplification rewrites the tree a reviewer is reading. */}
      <button
        type="button"
        style={button(simplification.previewing)}
        data-testid="qadi-simplify"
        onClick={() => session.setPreviewing(!simplification.previewing)}
      >
        {simplification.previewing ? "cancel" : "simplify"}
      </button>

      {simplification.previewing ? (
        <button type="button" style={button(false)} onClick={session.apply}>
          apply
        </button>
      ) : null}

      <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-simplify-effect">
        {simplification.changes
          ? "simplification would collapse or flatten this tree"
          // The two rewrites `simplify` performs are single-child composite
          // collapse and same-tag/same-strategy flattening. It deliberately
          // does NOT eliminate double negation, so a tree containing one is
          // reported as already simplified rather than as a missed rewrite.
          : "already as simple as this policy gets"}
      </span>
    </div>
  );
};

const DepthLine: FC<{ readonly depth: Showing["depth"] }> = ({ depth }) => (
  <div
    style={{ ...muted, fontSize: font.sizeSmall, marginBottom: 8 }}
    data-testid="qadi-policy-depth"
  >
    depth {depth.depth} of {depth.bound}
    {depth.overBound ? (
      <span style={{ color: colors.error, marginLeft: 6 }} data-testid="qadi-depth-over">
        — deeper than the default bound; `evaluate` would raise PolicyTooDeep
      </span>
    ) : null}
  </div>
);

/**
 * The real codec, not `JSON.stringify`.
 *
 * `toJson` is the encoder a persisted policy actually round-trips through, so
 * what this shows is what a caller would store — and `fromJson` is what would
 * read it back. Rendering an approximation here would make the screen useless
 * for the one job it has. Both run in the session, which also decides when an
 * unloaded edit and a refusal are still describing the text in the box.
 */
const JsonView: FC<{ readonly snapshot: Showing; readonly session: ExplorerSession }> = ({
  snapshot,
  session,
}) => (
  <div>
    <textarea
      aria-label="Policy JSON"
      data-testid="qadi-policy-json"
      value={snapshot.json.text}
      onChange={(event) => session.editJson(event.target.value)}
      style={{ ...input, width: "100%", minHeight: 160, fontFamily: "inherit" }}
    />
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
      <button
        type="button"
        style={button(false)}
        onClick={session.load}
        data-testid="qadi-policy-load"
      >
        load
      </button>
      {snapshot.json.refusal === undefined ? null : (
        <span style={{ color: colors.error }} data-testid="qadi-policy-json-error">
          {snapshot.json.refusal}
        </span>
      )}
    </div>
  </div>
);
