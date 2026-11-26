"use client";
/**
 * The one box a feed's stop is shown in.
 *
 * Two feeds stop independently, the diagnostics poll and the timeline read, and one box
 * keeps their style, their alert rule and their Restart button from drifting apart. The
 * caller owns the copy and the test-id prefix; the box owns everything else.
 *
 * **The alert is fixed at mount.** `StoppedBox` is a wrapper that keys `StoppedBody` on
 * the stop (`stoppedKey`), so a second stop is a new mount and a role is never added to a
 * mounted element. The body decides its alert once, at mount, from the ledger it was
 * handed (`announcesStop`), and records its stop at commit, so a render that is thrown
 * away announces nothing. The stack-trace reason after the alert is never part of it.
 *
 * The ledger and the three functions over it are `model/StopLedger.ts` (ADR-QD-201).
 * Package-private: it is in no barrel and so not importable (AGENTS.md section 9, ADR-QD-099).
 */
import type { CSSProperties, MouseEvent, ReactElement } from "react";
import { useLayoutEffect, useState } from "react";
import { announcesStop, stoppedKey, type StopLedger } from "../model/StopLedger.ts";
import { button, colors, panel, reasonStyle, withAlpha } from "./theme.ts";

/**
 * The ledger a feed's notice reads, and the call that records a stop in it.
 *
 * Both come from one reducer the dock's frame holds per feed, so the ledger outlives every
 * screen. It records only which stop was announced, never what the reading says (AGENTS.md section 13).
 */
export interface AnnouncedStops<S> {
  readonly ledger: StopLedger<S>;
  readonly record: (status: S) => void;
}

/** What the dock hands a feed's stop notice. */
export interface StopNoticeProps<S> {
  /** The feed's status, read once by the dock. */
  readonly status: S;
  /** Starts the feed again; it leaves its stop, so the notice is replaced. */
  readonly onRestart: () => void;
  /** The last stop a box of this feed showed, and the call that records one. */
  readonly announced: AnnouncedStops<S>;
}

/** The two feeds that stop. */
type StoppedFeed = "diagnostics" | "timeline";

/**
 * Per feed, the test-id prefix for `-notice`, `-stopped`, `-reason` and `-restart`, and
 * where focus goes once Restart removes the button that had it.
 *
 * One row per feed, closed over `StoppedFeed`, so a prefix cannot be paired with the other
 * feed's focus target and a third feed is a missing key here (TS2741).
 */
const FEEDS: {
  readonly [K in StoppedFeed]: { readonly hooks: string; readonly focusTarget: string };
} = {
  diagnostics: { hooks: "qadi-diagnostics", focusTarget: "[data-diagnostics-status]" },
  timeline: { hooks: "qadi-timeline", focusTarget: "[data-testid='qadi-dock-body']" },
};

/** What a feed hands the box. */
export interface StoppedBoxProps<S> {
  /** What the dock hands the feed's notice: the stop, its restart and the ledger. */
  readonly notice: StopNoticeProps<S>;
  /** The stack-trace reason; the block is left out when it is empty. */
  readonly reason: string;
  readonly lead: string;
  readonly body: string;
  readonly reasonLabel: string;
  readonly restartLabel: string;
  /** Which feed stopped; it fixes the test-id prefix and where focus returns to (`FEEDS`). */
  readonly feed: StoppedFeed;
  /** Rendered as `data-sampled` only when given. */
  readonly sampled?: boolean | undefined;
}

const stoppedStyle: CSSProperties = {
  ...panel,
  padding: "8px 12px",
  border: `1px solid ${colors.error}`,
  background: withAlpha(colors.error, 0.12),
  color: colors.text,
};

const restartStyle: CSSProperties = {
  ...button(false),
  color: colors.text,
  border: `1px solid ${colors.error}`,
  marginTop: 8,
};

export const StoppedBox = <S,>(props: StoppedBoxProps<S>): ReactElement => (
  <StoppedBody key={stoppedKey(props.notice.announced.ledger, props.notice.status)} {...props} />
);

const StoppedBody = <S,>({
  notice: { status, onRestart, announced },
  reason,
  lead,
  body,
  reasonLabel,
  restartLabel,
  feed,
  sampled,
}: StoppedBoxProps<S>): ReactElement => {
  const { hooks, focusTarget } = FEEDS[feed];
  // Decided at mount: a new stop is a new mount (see `stoppedKey`), so a role is never added to a mounted element.
  const [alert] = useState(() => announcesStop(announced.ledger, status));
  useLayoutEffect(() => announced.record(status), [announced.record, status]);

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
