"use client";
/**
 * The diagnostics poll's status, stated the same way on every screen that reads it.
 *
 * A stop turns a live-looking screen stale with no action by the reviewer, so it is
 * said once, prominently and with the way out, while `Starting` is the expected first
 * moment and stays quiet. Both screens that read the diagnostics render this one
 * component first and write no notice markup, copy or styles of their own.
 *
 * **The polite status region is always rendered**, empty unless the poll is `Starting`.
 * A live region announces reliably only when it already exists as its text arrives, so
 * it is not mounted with its content. The alert is the opposite: it is mounted with
 * its content, and only for the lead and body, never the stack-trace reason after it.
 *
 * Package-private: it is in no barrel and so not importable (AGENTS.md §9, ADR-QD-099).
 */
import type { CSSProperties, FC, MouseEvent, ReactNode, RefObject } from "react";
import { useLayoutEffect, useState } from "react";
import * as Match from "effect/Match";
import type { DiagnosticsStatus } from "../model/DiagnosticsFeed.ts";
import { button, colors, font, muted, panel, withAlpha } from "./theme.ts";

const STARTING_LEAD = "Waiting for the first sample.";
const STARTING_BODY =
  "Diagnostics has started and has not read anything yet. This screen fills in when the first sample arrives.";
const STOPPED_LEAD = "Diagnostics stopped.";
const STOPPED_BODY_SAMPLED =
  "The sampler failed with an unexpected error and is no longer polling. The reading below is the last one it took and is not updating.";
const STOPPED_BODY_UNSAMPLED =
  "The sampler failed with an unexpected error before it took a reading, and is no longer polling. Nothing below was sampled by this dock.";
const RESTART_LABEL = "Restart diagnostics";
const REASON_LABEL = "Why diagnostics stopped";

/** What a screen hands the shared notice. */
export interface DiagnosticsNoticeProps {
  /** The diagnostics store's status, read once by the dock. */
  readonly status: DiagnosticsStatus;
  /** Starts the poll again; the poll goes through `Starting`, so the notice is replaced. */
  readonly onRestart: () => void;
  /**
   * The stops notices have shown, owned by the dock so it outlives every screen.
   *
   * It records only which stop was announced and how many there have been, never what
   * the reading says (AGENTS.md §13).
   */
  readonly announced: RefObject<StopLedger>;
}

/** The last stop a notice showed, and how many distinct stops notices have shown. */
export interface StopLedger {
  readonly stop: DiagnosticsStatus | undefined;
  readonly count: number;
}

/** A ledger with no stop in it: what a dock starts from. */
export const noStops: StopLedger = { stop: undefined, count: 0 };

type Stopped = Extract<DiagnosticsStatus, { readonly _tag: "Stopped" }>;

/**
 * The props a screen's root carries, so restart has a focus target and a test a hook.
 *
 * The root is focused programmatically and is not a tab stop, and it keeps the
 * browser's own focus ring so a keyboard user can see where restart left them. One
 * helper means the two screens cannot drift.
 */
export const diagnosticsRootProps = (status: DiagnosticsStatus) => ({
  "data-diagnostics-status": status._tag,
  tabIndex: -1,
  style: { padding: 12 },
});

const startingStyle: CSSProperties = {
  ...panel,
  padding: "8px 12px",
  ...muted,
  fontSize: font.size,
  border: `1px solid ${colors.border}`,
};

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

const StartingNotice: FC = () => (
  <div data-testid="qadi-diagnostics-starting" style={startingStyle}>
    <strong style={{ fontWeight: 600 }}>{STARTING_LEAD}</strong> {STARTING_BODY}
  </div>
);

/** Puts focus back inside the screen, because the button that had it leaves the DOM. */
const restart = (onRestart: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
  onRestart();
  const root = event.currentTarget.closest("[data-diagnostics-status]");
  if (root instanceof HTMLElement) root.focus();
};

const StoppedNotice: FC<{
  readonly status: Stopped;
  readonly onRestart: () => void;
  readonly announced: RefObject<StopLedger>;
}> = ({ status, onRestart, announced }) => {
  // Decided at mount: a new stop is a new mount (see `keyOf`), so a role is never added to a mounted element.
  const [alert] = useState(() => announced.current.stop !== status);
  useLayoutEffect(() => {
    const { stop, count } = announced.current;
    if (stop !== status) announced.current = { stop: status, count: count + 1 };
  }, [announced, status]);

  return (
    <section data-testid="qadi-diagnostics-notice" style={stoppedStyle}>
      <div
        role={alert ? "alert" : undefined}
        data-testid="qadi-diagnostics-stopped"
        data-announce={alert ? "alert" : "none"}
        data-sampled={String(status.sampled)}
      >
        <strong style={{ fontWeight: 600, color: colors.error }}>{STOPPED_LEAD}</strong>{" "}
        {status.sampled ? STOPPED_BODY_SAMPLED : STOPPED_BODY_UNSAMPLED}
      </div>
      {status.reason === "" ? null : (
        <pre
          data-testid="qadi-diagnostics-reason"
          role="group"
          aria-label={REASON_LABEL}
          tabIndex={0}
          style={reasonStyle}
        >
          {status.reason}
        </pre>
      )}
      <button
        type="button"
        data-testid="qadi-diagnostics-restart"
        style={{ ...button(false), marginTop: 8 }}
        onClick={restart(onRestart)}
      >
        {RESTART_LABEL}
      </button>
    </section>
  );
};

/** One key per stop, so a second stop remounts the notice and its alert is announced as it arrives. */
const keyOf = (ledger: StopLedger, status: Stopped): number =>
  ledger.stop === status ? ledger.count : ledger.count + 1;

type Binding = Pick<DiagnosticsNoticeProps, "onRestart" | "announced">;

/** What a status puts in the always-present polite region, and what it puts beside it. */
interface Parts {
  readonly region: ReactNode;
  readonly stopped: ReactNode;
}

const NOTHING: Parts = { region: null, stopped: null };

const noticeOf: (self: DiagnosticsStatus) => (binding: Binding) => Parts = Match.type<DiagnosticsStatus>().pipe(
  Match.tagsExhaustive({
    Off: () => () => NOTHING,
    Starting: () => () => ({ region: <StartingNotice />, stopped: null }),
    Live: () => () => NOTHING,
    Stopped: (status) => ({ onRestart, announced }: Binding) => ({
      region: null,
      stopped: (
        <StoppedNotice
          key={keyOf(announced.current, status)}
          status={status}
          onRestart={onRestart}
          announced={announced}
        />
      ),
    }),
  }),
);

export const DiagnosticsNotice: FC<DiagnosticsNoticeProps> = ({ status, onRestart, announced }) => {
  const { region, stopped } = noticeOf(status)({ onRestart, announced });
  return (
    <>
      <div role="status" data-testid="qadi-diagnostics-region">
        {region}
      </div>
      {stopped}
    </>
  );
};
