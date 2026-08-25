"use client";
/**
 * One row per variation, and what each one changed.
 *
 * The table is read in two directions and the grouping is what makes both
 * possible. A reviewer holding an **allow** reads the weakenings, asking which
 * of these grants is load-bearing; a reviewer holding a **denial** reads the
 * strengthenings, asking what would fix it. Interleaved they bury whichever half
 * the reader opened the screen for.
 *
 * **A row that changed nothing is still a row.** It is the answer to "was it
 * this?" — no — and dropping it would leave the reader unable to tell a grant
 * that did not matter from one the sweep never tried.
 */
import { useState, type CSSProperties, type FC } from "react";
import type { TraceDifference, VerdictChanged } from "@qadi/core";
import type { SimulationEdit } from "../model/SimulationEdit.ts";
import { verdictOfOutcome } from "../model/Verdict.ts";
import type { Comparison, WhatIfReport, WhatIfRow } from "../model/WhatIf.ts";
import { isChanged } from "../model/WhatIf.ts";
import { VerdictTag } from "./VerdictTag.tsx";
import { button, colors, font, heading, muted, panel } from "./theme.ts";

const th: CSSProperties = {
  textAlign: "left",
  padding: "3px 8px",
  borderBottom: `1px solid ${colors.border}`,
  color: colors.textMuted,
  fontWeight: 400,
  fontSize: font.sizeSmall,
};

const td: CSSProperties = {
  padding: "3px 8px",
  borderBottom: `1px solid ${colors.border}`,
  verticalAlign: "top",
};

export interface WhatIfTableProps {
  readonly report: WhatIfReport;
}

export const WhatIfTable: FC<WhatIfTableProps> = ({ report }) => {
  const [onlyChanged, setOnlyChanged] = useState(false);
  const rows = onlyChanged ? report.rows.filter((row) => isChanged(row.comparison)) : report.rows;
  const baseline = verdictOfOutcome(report.baseline);

  return (
    <section style={panel} data-testid="qadi-whatif">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <div style={{ ...heading, marginBottom: 0 }}>what if</div>
        <button
          type="button"
          style={button(onlyChanged)}
          aria-pressed={onlyChanged}
          data-testid="qadi-whatif-only-changed"
          onClick={() => setOnlyChanged(!onlyChanged)}
        >
          only what changed
        </button>
        <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-whatif-count">
          {report.rows.length} variation{report.rows.length === 1 ? "" : "s"} of{" "}
          {report.evaluations} evaluation{report.evaluations === 1 ? "" : "s"}
        </span>
      </div>

      {report.rows.length === 0 ? (
        <p style={{ ...muted, margin: 0 }} data-testid="qadi-whatif-empty">
          {/* E4.6 — said in words. An empty table reads like a sweep that found
              nothing, which is a different fact from a sweep with nothing to
              try. */}
          Nothing to vary. This subject holds no grant to drop, and the policy
          names nothing that could be supplied.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>edit</th>
              <th style={th}>verdict</th>
              <th style={th}>what changed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.edit.label} row={row} baseline={baseline} />
            ))}
          </tbody>
        </table>
      )}

      <Footnotes report={report} />
    </section>
  );
};

const Row: FC<{ readonly row: WhatIfRow; readonly baseline: string }> = ({ row, baseline }) => {
  const verdict = verdictOfOutcome(row.outcome);
  const changed = isChanged(row.comparison);

  return (
    <tr
      data-testid="qadi-whatif-row"
      data-changed={changed}
      style={changed ? { background: colors.disagree } : undefined}
    >
      <td style={td}>
        <Direction edit={row.edit} />
        {row.edit.label}
      </td>
      <td style={td}>
        <VerdictTag verdict={verdict} />
        {verdict === baseline ? null : (
          <span style={{ ...muted, marginLeft: 6, fontSize: font.sizeSmall }}>
            was {baseline}
          </span>
        )}
      </td>
      <td style={{ ...td, ...muted, fontSize: font.sizeSmall }}>
        <Changed comparison={row.comparison} />
      </td>
    </tr>
  );
};

/**
 * Which way the edit moves the subject's standing, as one character.
 *
 * A column of its own would be three characters wide and mostly whitespace; the
 * value of the distinction is grouping at a glance, and a prefix does that.
 */
const Direction: FC<{ readonly edit: SimulationEdit }> = ({ edit }) => (
  <span
    style={{ ...muted, marginRight: 6 }}
    title={
      edit.direction === "Weaken"
        ? "takes something away"
        : edit.direction === "Strengthen"
          ? "supplies something the policy asks for"
          : "both at once"
    }
  >
    {edit.direction === "Weaken" ? "−" : edit.direction === "Strengthen" ? "+" : "±"}
  </span>
);

/**
 * What a comparison found, in one line.
 *
 * The `Compared` arm leads with the node whose verdict turned, because *which
 * node* is the thing `diffTraces` exists to answer and *whether* is already in
 * the column to the left.
 */
const Changed: FC<{ readonly comparison: Comparison }> = ({ comparison }) => {
  if (comparison._tag === "BecameError") {
    return (
      <span style={{ color: colors.error }} data-testid="qadi-whatif-error">
        {/* Never rendered like a denial: this edit did not show the subject would
            be refused, it showed nothing could be decided (INV-QD-006). */}
        broke the evaluation — {comparison.error._tag}, so nothing was decided
      </span>
    );
  }
  if (comparison._tag === "Recovered") {
    return <span>decided, where the unedited input could not</span>;
  }
  if (comparison._tag === "StillFailed") {
    return (
      <span>
        {comparison.same
          ? `still ${comparison.after._tag}`
          : `a different failure: ${comparison.before._tag} then, ${comparison.after._tag} now`}
      </span>
    );
  }
  if (comparison.differences.length === 0) {
    return <span data-testid="qadi-whatif-nochange">no change</span>;
  }
  return (
    <span>
      {comparison.flipped === undefined ? null : <Flipped flipped={comparison.flipped} />}
      <Kinds differences={comparison.differences} />
    </span>
  );
};

const Flipped: FC<{ readonly flipped: VerdictChanged }> = ({ flipped }) => (
  <span style={{ color: colors.text }} data-testid="qadi-whatif-flipped">
    {flipped.policyTag} at {pathOf(flipped.path)} {flipped.before ? "allowed" : "denied"} →{" "}
    {flipped.after ? "allowed" : "denied"}
    {flipped.label === undefined ? null : ` (${flipped.label})`}
    {" · "}
  </span>
);

/**
 * The kinds of difference, deduplicated.
 *
 * Fields and obligations are named even when the verdict held: a narrowed grant
 * and a dropped duty both change what the caller may actually do
 * ([INV-QD-004](../../../../spec/invariants.md)), and a table reporting only
 * flips would call that *no change*.
 */
const Kinds: FC<{ readonly differences: ReadonlyArray<TraceDifference> }> = ({ differences }) => {
  const kinds = [...new Set(differences.map((one) => wording[one._tag]))];
  return <span data-testid="qadi-whatif-kinds">{kinds.join(", ")}</span>;
};

const wording: Record<TraceDifference["_tag"], string> = {
  VerdictChanged: "verdicts",
  ReasonChanged: "reasons",
  FieldsChanged: "visible fields",
  ObligationsChanged: "obligations",
  // A composite that short-circuited at a different point genuinely has fewer
  // children on one side — a real finding about the evaluation, and the point
  // past which `diffTraces` declines to descend.
  ChildCountChanged: "the path taken",
};

const pathOf = (path: ReadonlyArray<number>): string =>
  path.length === 0 ? "the root" : `$.${path.join(".")}`;

/**
 * What the sweep did not do.
 *
 * Both lines exist because silence would read as completeness: a capped pair
 * sweep looks like every pair, and a requirement with no buildable remedy looks
 * like a requirement already met.
 */
const Footnotes: FC<{ readonly report: WhatIfReport }> = ({ report }) => (
  <>
    {report.omittedPairs === 0 ? null : (
      <p
        style={{ ...muted, fontSize: font.sizeSmall, margin: "6px 0 0" }}
        data-testid="qadi-whatif-omitted"
      >
        {report.omittedPairs} further pair{report.omittedPairs === 1 ? " was" : "s were"} not
        tried — the pair count grows quadratically, so the sweep is bounded.
      </p>
    )}
    {report.skipped.length === 0 ? null : (
      <div style={{ marginTop: 6 }} data-testid="qadi-whatif-skipped">
        <div style={heading}>no remedy could be built for</div>
        {report.skipped.map((one) => (
          <div key={one.requirement} style={{ ...muted, fontSize: font.sizeSmall }}>
            {one.requirement} — {one.reason}
          </div>
        ))}
      </div>
    )}
  </>
);
