"use client";
/**
 * The one box a feed's stop is shown in.
 *
 * Two feeds stop independently, the diagnostics poll and the timeline read, and one box
 * keeps their style, their alert rule and their Restart button from drifting apart. The
 * caller owns the copy and the test-id prefix; the box owns everything else.
 *
 * **The alert is fixed at mount.** A stop is announced as it arrives, so its alert role is
 * decided once, when the box mounts, and a second stop is a new mount (`stoppedKey`). The
 * stack-trace reason after it is never part of the alert.
 *
 * Package-private: it is in no barrel and so not importable (AGENTS.md §9, ADR-QD-099).
 */
import type { CSSProperties, MouseEvent, ReactElement, RefObject } from "react";
import { useLayoutEffect, useState } from "react";
import { button, colors, font, panel, withAlpha } from "./theme.ts";

/**
 * The last stop a box showed, and how many distinct stops boxes have shown.
 *
 * The dock owns it so it outlives every screen. It records only which stop was announced,
 * never what the reading says (AGENTS.md §13).
 */
export interface StopLedger<S> {
  readonly stop: S | undefined;
  readonly count: number;
}

/** A ledger with no stop in it: what a dock starts from. */
export const noStops: StopLedger<never> = { stop: undefined, count: 0 };

/** One key per stop, so a second stop remounts the box and its alert is announced as it arrives. */
export const stoppedKey = <S,>(ledger: StopLedger<S>, status: S): number =>
  ledger.stop === status ? ledger.count : ledger.count + 1;

/** What a feed hands the box. */
export interface StoppedBoxProps<S> {
  /** The stop value; its identity is the stop. */
  readonly status: S;
  /** The stack-trace reason; the block is left out when it is empty. */
  readonly reason: string;
  readonly lead: string;
  readonly body: string;
  readonly reasonLabel: string;
  readonly restartLabel: string;
  /** The test-id prefix for `-notice`, `-stopped`, `-reason` and `-restart`. */
  readonly hooks: "qadi-diagnostics" | "qadi-timeline";
  /** Where focus goes once Restart removes the button that had it. */
  readonly focusTarget: "[data-diagnostics-status]" | "[data-testid='qadi-dock-body']";
  /** Rendered as `data-sampled` only when given. */
  readonly sampled?: boolean | undefined;
  readonly onRestart: () => void;
  readonly announced: RefObject<StopLedger<S>>;
}

const stoppedStyle: CSSProperties = {
  ...panel,
  padding: "8px 12px",
  border: `1px solid ${colors.error}`,
  background: withAlpha(colors.error, 0.12),
  color: colors.text,
};

const reasonStyle: CSSProperties = {
  margin: "8px 0 0",
  padding: 8,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  fontFamily: "inherit",
  fontSize: font.sizeSmall,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  maxHeight: 96,
  overflow: "auto",
};

const restartStyle: CSSProperties = {
  ...button(false),
  color: colors.text,
  border: `1px solid ${colors.error}`,
  marginTop: 8,
};

export const StoppedBox = <S,>({
  status,
  reason,
  lead,
  body,
  reasonLabel,
  restartLabel,
  hooks,
  focusTarget,
  sampled,
  onRestart,
  announced,
}: StoppedBoxProps<S>): ReactElement => {
  // Decided at mount: a new stop is a new mount (see `stoppedKey`), so a role is never added to a mounted element.
  const [alert] = useState(() => announced.current.stop !== status);
  useLayoutEffect(() => {
    const { stop, count } = announced.current;
    if (stop !== status) announced.current = { stop: status, count: count + 1 };
  }, [announced, status]);

  // Puts focus back inside the screen, because the button that had it leaves the DOM.
  const restart = (event: MouseEvent<HTMLButtonElement>) => {
    onRestart();
    const target = event.currentTarget.closest(focusTarget);
    if (target instanceof HTMLElement) target.focus();
  };

  return (
    <section data-testid={`${hooks}-notice`} style={stoppedStyle}>
      <div
        role={alert ? "alert" : undefined}
        data-testid={`${hooks}-stopped`}
        data-announce={alert ? "alert" : "none"}
        data-sampled={sampled === undefined ? undefined : String(sampled)}
      >
        <strong style={{ fontWeight: 600, color: colors.error }}>{lead}</strong> {body}
      </div>
      {reason === "" ? null : (
        <pre data-testid={`${hooks}-reason`} role="group" aria-label={reasonLabel} tabIndex={0} style={reasonStyle}>
          {reason}
        </pre>
      )}
      <button type="button" data-testid={`${hooks}-restart`} style={restartStyle} onClick={restart}>
        {restartLabel}
      </button>
    </section>
  );
};
