"use client";
/**
 * Screen 2 — the decision inspector.
 *
 * Four panels, and three of them exist to say something the row itself cannot:
 * *why* it was decided, *what* the caller may see, and *what they still owe*.
 *
 * Two states are rendered explicitly rather than as an empty panel, because an
 * empty panel reads as "nothing was required", which reads as "allowed":
 * a **failed** evaluation has no tree at all, and a **hydrated** decision may
 * carry a reduced one. Both say so in words.
 */
import type { CSSProperties, FC } from "react";
import { isAllowed } from "@qadi/core";
import type { Allow, Obligation } from "@qadi/core";
import { inspectEntry, type InspectNode } from "../model/Inspect.ts";
import type { Selection } from "../model/Selection.ts";
import type { TimelineDecision, TimelineEntry } from "../model/Timeline.ts";
import { verdictOf } from "../model/Verdict.ts";
import { colors, font, muted } from "./theme.ts";
import { EnvironmentTag, VerdictTag } from "./VerdictTag.tsx";

/**
 * The `Allow` behind a row, when there is one.
 *
 * `Deny` carries neither `visibleFields` nor `obligations` — a denial permits
 * nothing, so it has no field set to narrow and no duty to attach — and a
 * `Failed` outcome carries no decision at all. Narrowing once here keeps three
 * panels from each re-deriving it.
 */
const allowOf = (entry: TimelineDecision): Allow | undefined => {
  const outcome = entry.decision.outcome;
  if (outcome._tag !== "Decided") return undefined;
  return isAllowed(outcome.decision) ? outcome.decision : undefined;
};

const panel: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  padding: "8px 10px",
  marginBottom: 8,
};

const heading: CSSProperties = {
  ...muted,
  fontSize: font.sizeSmall,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  marginBottom: 6,
};

export const Inspector: FC<{ readonly selection: Selection }> = ({ selection }) => {
  if (selection._tag === "NoSelection") {
    return (
      <p style={{ ...muted, padding: 16 }} data-testid="qadi-inspector-empty">
        Select a decision to inspect it.
      </p>
    );
  }

  if (selection._tag === "Evicted") {
    return (
      <p style={{ ...muted, padding: 16 }} data-testid="qadi-inspector-evicted">
        {/* Not a silent return to the placeholder: the row they were reading is
            gone, and a panel that empties itself without saying so reads as a
            bug in the tool rather than as a bounded buffer doing its job. */}
        That decision has scrolled out of the log — the buffer is bounded, and it
        was dropped to make room.
      </p>
    );
  }

  return <Detail entry={selection.entry} />;
};

const Detail: FC<{ readonly entry: TimelineEntry }> = ({ entry }) => (
  <div style={{ padding: 12 }} data-testid="qadi-inspector">
    <Header entry={entry} />
    {entry._tag === "TimelineDecision" ? <DecisionPanels entry={entry} /> : <OrphanPanel />}
  </div>
);

const Header: FC<{ readonly entry: TimelineEntry }> = ({ entry }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
    <EnvironmentTag environment={entry.environment} />
    <VerdictTag verdict={verdictOf(entry)} />
    <span style={muted} data-testid="qadi-inspector-id">
      {entry.evaluationId}
    </span>
    <span style={muted}>qadi.evaluate</span>
  </div>
);

const OrphanPanel: FC = () => (
  <section style={panel} data-testid="qadi-orphan">
    <div style={heading}>obligations</div>
    <p style={muted}>
      An obligation outcome arrived for this evaluation, but the decision it
      belongs to never did — so there is nothing to explain. It is kept because a
      duty that was refused turned someone&apos;s allow into an error.
    </p>
  </section>
);

const DecisionPanels: FC<{ readonly entry: TimelineDecision }> = ({ entry }) => {
  const outcome = entry.decision.outcome;
  const tree = inspectEntry(entry);
  const allow = allowOf(entry);

  return (
    <>
      {outcome._tag === "Failed" ? <FailurePanel entry={entry} /> : null}
      {tree === undefined ? null : <ExplanationPanel tree={tree} />}
      {/* Only an allow has a field set or duties: `Deny` carries neither, and
          the type says so — a denial permits nothing, so there is nothing for
          it to narrow and nothing it can oblige. */}
      {allow === undefined ? null : <FieldsPanel fields={allow.visibleFields} />}
      <ObligationsPanel entry={entry} />
      <CachePanel entry={entry} />
    </>
  );
};

/**
 * The error panel, which replaces the requirement tree rather than sitting
 * beside it.
 *
 * There is no trace on a failed evaluation, so there is nothing to explain —
 * and rendering an empty tree here would be the inversion INV-QD-006 exists to
 * prevent.
 */
const FailurePanel: FC<{ readonly entry: TimelineDecision }> = ({ entry }) => {
  const outcome = entry.decision.outcome;
  if (outcome._tag !== "Failed") return null;

  return (
    <section style={{ ...panel, borderColor: colors.error }} data-testid="qadi-failure">
      <div style={{ ...heading, color: colors.error }}>error — no verdict was reached</div>
      <div data-testid="qadi-failure-tag">{outcome.error._tag}</div>
      <p style={{ ...muted, marginTop: 6, marginBottom: 0 }}>
        A lookup this evaluation depended on failed, so nothing was decided. This
        is not a denial.
      </p>
    </section>
  );
};

const ExplanationPanel: FC<{ readonly tree: InspectNode }> = ({ tree }) => (
  <section style={panel} data-testid="qadi-explanation">
    <div style={heading}>explanation</div>
    {isTruncated(tree) ? (
      <p style={{ ...muted, marginTop: 0 }} data-testid="qadi-trace-undisclosed">
        {/* A dehydrated payload ships a reduced trace unless `includeTrace` is
            set. That is a disclosure boundary rather than a defect, so the fix
            is to say so — never to fabricate a tree, and never to let the
            reader read "never resolved" as "short-circuited". */}
        Trace not disclosed below the root. This decision was hydrated from a
        payload that did not carry one.
      </p>
    ) : null}
    <Node node={tree} depth={0} />
  </section>
);

/**
 * A trace that stops at the root.
 *
 * Distinguishable from short-circuiting, and the distinction is the whole point
 * of saying it: a composite that short-circuits always evaluates at least its
 * first child, so a root that *was* resolved while **every** child was not can
 * only mean the trace was truncated before it reached the reader. Wording that
 * as "never resolved" would blame the evaluator for a disclosure decision.
 */
const isTruncated = (tree: InspectNode): boolean =>
  tree.status !== "NeverResolved" &&
  tree.children.length > 0 &&
  tree.children.every((child) => child.status === "NeverResolved");

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

const Node: FC<{ readonly node: InspectNode; readonly depth: number }> = ({ node, depth }) => (
  <div data-testid="qadi-node" data-path={node.path} data-status={node.status}>
    <div
      style={{
        paddingLeft: depth * 14,
        // A node nobody evaluated is dimmed and dotted, never struck through or
        // marked with a cross: it was not rejected, it was not reached.
        opacity: node.status === "NeverResolved" ? 0.55 : 1,
      }}
    >
      <span style={{ color: statusColor[node.status], marginRight: 6 }}>
        {statusMark[node.status]}
      </span>
      {node.effect === undefined ? null : (
        <span style={{ ...muted, marginRight: 6 }}>{node.effect.toLowerCase()} when</span>
      )}
      <span>{node.label}</span>
      {node.detail === undefined ? null : (
        <span style={{ ...muted, marginLeft: 6 }}>({node.detail})</span>
      )}
      {node.status === "NeverResolved" ? (
        <span style={{ ...muted, marginLeft: 6 }} data-testid="qadi-never-resolved">
          never resolved
        </span>
      ) : null}
      {node.reason === undefined ? null : (
        <span style={{ ...muted, marginLeft: 6 }}>— {node.reason}</span>
      )}
    </div>
    {node.children.map((child) => (
      <Node key={child.path} node={child} depth={depth + 1} />
    ))}
  </div>
);

/**
 * `undefined` is the **top** of the field lattice and means every field.
 *
 * Rendering it as an empty list would understate a full grant into a grant of
 * nothing, which is the one direction of error a reviewer acts on.
 */
const FieldsPanel: FC<{ readonly fields: ReadonlyArray<string> | undefined }> = ({ fields }) => (
  <section style={panel} data-testid="qadi-fields">
    <div style={heading}>visible fields</div>
    {fields === undefined ? (
      <span data-testid="qadi-fields-all">every field</span>
    ) : fields.length === 0 ? (
      <span data-testid="qadi-fields-none">no fields</span>
    ) : (
      <span data-testid="qadi-fields-some">{fields.join(", ")}</span>
    )}
  </section>
);

/**
 * Duties, with the state marked **unobtainable per duty** rather than guessed.
 *
 * `ObligationHandler` receives the whole array and returns `void`, so the
 * library observes that a set was presented and that the handler succeeded or
 * failed — never which individual duty was met. Showing a per-duty tick would
 * be an invention.
 */
const ObligationsPanel: FC<{ readonly entry: TimelineDecision }> = ({ entry }) => {
  const duties = allowOf(entry)?.obligations ?? [];
  if (duties.length === 0 && entry.obligations === undefined) return null;

  return (
    <section style={panel} data-testid="qadi-obligations">
      <div style={heading}>obligations</div>
      {duties.map((duty: Obligation) => (
        <div key={duty.id}>
          <span>{duty.id}</span>
          <span style={{ ...muted, marginLeft: 6 }}>
            {duty.advisory ? "advisory" : "binding"}
          </span>
        </div>
      ))}
      <p style={{ ...muted, marginBottom: 0, marginTop: 6 }} data-testid="qadi-obligation-state">
        {entry.obligations === undefined
          ? duties.length === 0
            ? "None owed."
            : "Outcome not yet reported. An undischarged binding duty turns this allow into a refusal at the enforcement boundary."
          : `Gate outcome: ${entry.obligations.outcome}. Per-duty state is not observable — a handler receives the whole set and reports once.`}
      </p>
    </section>
  );
};

/**
 * Absent and `"miss"` are different facts and are worded differently.
 *
 * Absent means no cache was consulted at all; `"miss"` means one was asked and
 * did not have it.
 */
const CachePanel: FC<{ readonly entry: TimelineDecision }> = ({ entry }) => (
  <section style={panel} data-testid="qadi-cache">
    <div style={heading}>cache</div>
    <span data-testid="qadi-cache-state">
      {/* Worded without the phrase "as a miss": `scripts/check-house-style.mjs`
          matches `as` textually and reads it inside a template literal, so the
          sentence is phrased to avoid a false positive rather than the rule
          loosened to admit one. */}
      {entry.decision.cache === undefined
        ? "no cache was consulted"
        : `${entry.decision.cache} — a hit and a miss produce the same verdict, trace and fields`}
    </span>
  </section>
);
