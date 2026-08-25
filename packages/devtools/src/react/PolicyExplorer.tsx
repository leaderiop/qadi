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
import { useMemo, useState, type CSSProperties, type FC } from "react";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Result from "effect/Result";
import { fromJson, policyDepth, simplify, toJson } from "@qadi/core";
import type { Policy } from "@qadi/core";
import type { PolicySighting } from "../model/Catalogue.ts";
import { inspect } from "../model/Inspect.ts";
import { PolicyTree } from "./PolicyTree.tsx";
import { button, colors, font, input, muted } from "./theme.ts";

/**
 * The depth `evaluate` bounds at unless a caller says otherwise.
 *
 * Shown beside a policy's own depth because `policyDepth(p) <= n` is *exactly*
 * the condition under which `evaluate(p, { maxDepth: n })` will not raise
 * ([INV-QD-037](../../../../spec/invariants.md)) — so the comparison is
 * meaningful rather than indicative.
 */
const DEFAULT_MAX_DEPTH = 64;

export interface PolicyExplorerProps {
  readonly sightings: ReadonlyArray<PolicySighting>;
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

export const PolicyExplorer: FC<PolicyExplorerProps> = ({ sightings }) => {
  const [selected, setSelected] = useState(0);
  const [json, setJson] = useState(false);
  /** A policy loaded from pasted JSON, or produced by applying a simplification. */
  const [draft, setDraft] = useState<Policy | undefined>(undefined);
  const [preview, setPreview] = useState<Policy | undefined>(undefined);
  const [pasteError, setPasteError] = useState<string | undefined>(undefined);

  const sighting = sightings[selected];
  const policy = draft ?? sighting?.policy;

  if (policy === undefined) {
    return (
      <p style={{ ...muted, padding: 16 }} data-testid="qadi-policies-empty">
        No policies to show. This rail lists what the log has seen, so it fills as
        decisions arrive — pass a <code>catalogue</code> to name policies that
        have not run yet.
      </p>
    );
  }

  const choose = (index: number) => {
    setSelected(index);
    // A draft belongs to the policy it was derived from; carrying it across a
    // selection would show one policy's JSON under another's name.
    setDraft(undefined);
    setPreview(undefined);
    setPasteError(undefined);
  };

  return (
    <div style={{ display: "flex", height: "100%" }} data-testid="qadi-policies">
      <div style={rail}>
        {sightings.map((entry, index) => (
          <button
            key={`${entry.label}-${index}`}
            type="button"
            data-testid="qadi-policy-rail-item"
            style={railItem(index === selected && draft === undefined)}
            onClick={() => choose(index)}
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
        <Toolbar
          json={json}
          onToggleJson={() => setJson(!json)}
          policy={policy}
          preview={preview}
          onPreview={setPreview}
          onApply={(next) => {
            setDraft(next);
            setPreview(undefined);
          }}
        />
        <DepthLine policy={policy} />
        {json ? (
          <JsonView
            policy={policy}
            error={pasteError}
            onLoad={(text) => {
              const decoded = Effect.runSync(Effect.result(fromJson(text)));
              if (Result.isFailure(decoded)) {
                // The issue is shown rather than swallowed: a paste that did not
                // decode is the ordinary way to learn a payload is malformed.
                setPasteError(String(decoded.failure));
                return;
              }
              setPasteError(undefined);
              setDraft(decoded.success);
            }}
          />
        ) : (
          <PolicyTree node={inspect(preview ?? policy, undefined)} showStatus={false} />
        )}
      </div>
    </div>
  );
};

const Toolbar: FC<{
  readonly json: boolean;
  readonly onToggleJson: () => void;
  readonly policy: Policy;
  readonly preview: Policy | undefined;
  readonly onPreview: (policy: Policy | undefined) => void;
  readonly onApply: (policy: Policy) => void;
}> = ({ json, onToggleJson, policy, preview, onPreview, onApply }) => {
  const simplified = useMemo(() => simplify(policy), [policy]);
  const changes = !Equal.equals(simplified, policy);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
      <button type="button" style={button(!json)} onClick={onToggleJson}>
        {json ? "JSON" : "Tree"}
      </button>

      {/* Never automatic (ADR-QD-030), and never applied without being shown
          first: simplification rewrites the tree a reviewer is reading. */}
      <button
        type="button"
        style={button(preview !== undefined)}
        data-testid="qadi-simplify"
        onClick={() => onPreview(preview === undefined ? simplified : undefined)}
      >
        {preview === undefined ? "simplify" : "cancel"}
      </button>

      {preview === undefined ? null : (
        <button type="button" style={button(false)} onClick={() => onApply(simplified)}>
          apply
        </button>
      )}

      <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-simplify-effect">
        {changes
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

const DepthLine: FC<{ readonly policy: Policy }> = ({ policy }) => {
  const depth = policyDepth(policy);
  const overBound = depth > DEFAULT_MAX_DEPTH;

  return (
    <div
      style={{ ...muted, fontSize: font.sizeSmall, marginBottom: 8 }}
      data-testid="qadi-policy-depth"
    >
      depth {depth} of {DEFAULT_MAX_DEPTH}
      {overBound ? (
        <span style={{ color: colors.error, marginLeft: 6 }} data-testid="qadi-depth-over">
          — deeper than the default bound; `evaluate` would raise PolicyTooDeep
        </span>
      ) : null}
    </div>
  );
};

/**
 * The real codec, not `JSON.stringify`.
 *
 * `toJson` is the encoder a persisted policy actually round-trips through, so
 * what this shows is what a caller would store — and `fromJson` below is what
 * would read it back. Rendering an approximation here would make the screen
 * useless for the one job it has.
 *
 * `Effect.runSync` behind `Effect.result`: encoding a policy is synchronous and
 * total, and wrapping it means a failure becomes a value rather than a throw
 * inside a render.
 */
const JsonView: FC<{
  readonly policy: Policy;
  readonly error: string | undefined;
  readonly onLoad: (text: string) => void;
}> = ({ policy, error, onLoad }) => {
  const encoded = useMemo(() => Effect.runSync(Effect.result(toJson(policy))), [policy]);
  const [text, setText] = useState<string | undefined>(undefined);
  const shown = text ?? (Result.isSuccess(encoded) ? encoded.success : String(encoded.failure));

  return (
    <div>
      <textarea
        aria-label="Policy JSON"
        data-testid="qadi-policy-json"
        value={shown}
        onChange={(event) => setText(event.target.value)}
        style={{ ...input, width: "100%", minHeight: 160, fontFamily: "inherit" }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <button
          type="button"
          style={button(false)}
          onClick={() => onLoad(shown)}
          data-testid="qadi-policy-load"
        >
          load
        </button>
        {error === undefined ? null : (
          <span style={{ color: colors.error }} data-testid="qadi-policy-json-error">
            {error}
          </span>
        )}
      </div>
    </div>
  );
};
