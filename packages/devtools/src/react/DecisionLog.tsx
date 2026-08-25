"use client";
/**
 * Screen 1 — the decision log.
 *
 * One chronological table of every record from every wired sink. Environment is
 * a **badge on the row**, not a mode of the tool: the cross-environment story is
 * the thing this exists to show, and a switcher would hide exactly that.
 */
import type { CSSProperties, FC } from "react";
import type { PairedEntry } from "../model/Pairing.ts";
import { entryKey, type TimelineEntry } from "../model/Timeline.ts";
import { verdictOf } from "../model/Verdict.ts";
import { colors, font, muted, truncate } from "./theme.ts";
import { EnvironmentTag, VerdictTag } from "./VerdictTag.tsx";

export interface DecisionLogProps {
  readonly rows: ReadonlyArray<PairedEntry>;
  readonly selectedKey: string | undefined;
  readonly onSelect: (key: string) => void;
}

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: font.size,
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "4px 8px",
  color: colors.textMuted,
  fontWeight: 500,
  fontSize: font.sizeSmall,
  borderBottom: `1px solid ${colors.border}`,
  position: "sticky",
  top: 0,
  background: colors.surfaceRaised,
};

const td: CSSProperties = { padding: "3px 8px", verticalAlign: "top" };

export const DecisionLog: FC<DecisionLogProps> = ({ rows, selectedKey, onSelect }) => {
  if (rows.length === 0) {
    return (
      <p style={{ ...muted, padding: 16 }} data-testid="qadi-log-empty">
        No decisions to show.
      </p>
    );
  }

  return (
    <table style={table} data-testid="qadi-log">
      <thead>
        <tr>
          <th style={th}>env</th>
          <th style={th}>subject</th>
          <th style={th}>action</th>
          <th style={th}>resource</th>
          <th style={th}>verdict</th>
          <th style={th}>ms</th>
          <th style={th}>pair</th>
          <th style={th}>evaluation</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Row
            key={entryKey(row.entry)}
            row={row}
            selected={entryKey(row.entry) === selectedKey}
            onSelect={onSelect}
          />
        ))}
      </tbody>
    </table>
  );
};

const Row: FC<{
  readonly row: PairedEntry;
  readonly selected: boolean;
  readonly onSelect: (key: string) => void;
}> = ({ row, selected, onSelect }) => {
  const key = entryKey(row.entry);
  const decision = row.entry._tag === "TimelineDecision" ? row.entry.decision : undefined;

  return (
    <tr
      data-testid="qadi-log-row"
      data-evaluation={row.entry.evaluationId}
      data-selected={selected}
      onClick={() => onSelect(key)}
      style={{
        cursor: "pointer",
        background: selected
          ? colors.surfaceRaised
          : row.disagrees
            ? colors.disagree
            // A continuation is tinted so a pair reads as one story rather than
            // as two rows that happen to share an id.
            : row.role === "Continuation"
              ? "rgba(78, 161, 255, 0.06)"
              : "transparent",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <td style={td}>
        <EnvironmentTag environment={row.entry.environment} />
      </td>
      <td style={{ ...td, ...truncate }}>{subjectOf(row.entry)}</td>
      {/* Absent columns render blank. Writing "undefined" into a cell is how a
          reader comes to believe a field held that string. */}
      <td style={td}>{decision?.action ?? ""}</td>
      <td style={{ ...td, ...truncate }}>{resourceOf(row.entry)}</td>
      <td style={td}>
        <VerdictTag verdict={verdictOf(row.entry)} />
      </td>
      <td style={{ ...td, ...muted }}>{durationOf(row.entry)}</td>
      <td style={td}>
        <PairCell row={row} onSelect={onSelect} />
      </td>
      <td style={{ ...td, ...muted, ...truncate }}>{row.entry.evaluationId}</td>
    </tr>
  );
};

/**
 * The pair column links rows that share an evaluation.
 *
 * Clicking it moves to the partner in **either** direction, which is what makes
 * "watch a decision hydrate and then get re-checked" one glance rather than two
 * searches. `Alone` renders nothing at all — a column full of "unpaired" costs a
 * glance per row and says nothing.
 */
const PairCell: FC<{
  readonly row: PairedEntry;
  readonly onSelect: (key: string) => void;
}> = ({ row, onSelect }) => {
  const partner = row.partners[0];
  if (partner === undefined) return null;

  return (
    <button
      type="button"
      data-testid="qadi-pair"
      title={`${row.partners.length} other row(s) for ${row.entry.evaluationId}`}
      onClick={(event) => {
        // Without this the row's own handler also fires and the click selects
        // the row it started from.
        event.stopPropagation();
        onSelect(entryKey(partner));
      }}
      style={{
        appearance: "none",
        background: "transparent",
        border: "none",
        padding: 0,
        font: "inherit",
        fontSize: font.sizeSmall,
        cursor: "pointer",
        color: row.disagrees ? colors.error : colors.accent,
      }}
    >
      {row.disagrees ? "⇅ differs" : row.role === "Origin" ? "⇅ continued" : "⇅ continues"}
    </button>
  );
};

const subjectOf = (entry: TimelineEntry): string => {
  if (entry._tag !== "TimelineDecision") return "";
  const outcome = entry.decision.outcome;
  // A failed evaluation has no subject on it: `subjectId` lives on the
  // `Decision`, and there is none.
  return outcome._tag === "Decided" ? outcome.decision.subjectId : "";
};

const resourceOf = (entry: TimelineEntry): string => {
  if (entry._tag !== "TimelineDecision") return "";
  const resource = entry.decision.resource;
  if (resource === undefined) return "";
  const id = resource["id"];
  // `id` is the field a reader recognises; anything else falls back to the key
  // list, which at least says what the resource *was*.
  return typeof id === "string" ? id : Object.keys(resource).join(", ");
};

/**
 * Blank for a row with no duration to report.
 *
 * A failed evaluation has no `Decision` and therefore no `durationMillis`, and
 * inventing a zero would read as "instantaneous" rather than as "never
 * finished".
 */
const durationOf = (entry: TimelineEntry): string => {
  if (entry._tag !== "TimelineDecision") return "";
  const outcome = entry.decision.outcome;
  return outcome._tag === "Decided" ? String(outcome.decision.durationMillis) : "";
};
