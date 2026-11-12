"use client";
/**
 * The diagnostics poll's status, stated the same way on every screen that reads it.
 *
 * A stop turns a live-looking screen stale with no action by the reviewer, so it is
 * said once, prominently and with the way out, while `Starting` is the expected first
 * moment and stays quiet. Both screens that read the diagnostics render this one
 * component first and write no notice markup, copy or styles of their own.
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
   * The last stop whose alert was delivered, owned by the dock so it outlives every screen.
   *
   * It records only whether a stop was announced, never what the reading says (AGENTS.md §13).
   */
  readonly announced: RefObject<DiagnosticsStatus | undefined>;
}

type Stopped = Extract<DiagnosticsStatus, { readonly _tag: "Stopped" }>;

/**
 * The props a screen's root carries, so restart has a focus target and a test a hook.
 *
 * The root is focused programmatically and is not a tab stop. One helper means the
 * two screens cannot drift.
 */
export const diagnosticsRootProps = (status: DiagnosticsStatus) => ({
  "data-diagnostics-status": status._tag,
  tabIndex: -1,
  style: { padding: 12, outline: "none" },
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
  <div role="status" data-testid="qadi-diagnostics-starting" style={startingStyle}>
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
  readonly announced: RefObject<DiagnosticsStatus | undefined>;
}> = ({ status, onRestart, announced }) => {
  // Decided per mount and per new stop, so an unrelated re-render cannot flip the role.
  const [seen, setSeen] = useState(status);
  const [alert, setAlert] = useState(() => announced.current !== status);
  if (seen !== status) {
    setSeen(status);
    setAlert(announced.current !== status);
  }
  useLayoutEffect(() => {
    announced.current = status;
  }, [announced, status]);

  return (
    <section
      role={alert ? "alert" : undefined}
      data-testid="qadi-diagnostics-stopped"
      data-announce={alert ? "alert" : "none"}
      data-sampled={String(status.sampled)}
      style={stoppedStyle}
    >
      <strong style={{ fontWeight: 600, color: colors.error }}>{STOPPED_LEAD}</strong>{" "}
      {status.sampled ? STOPPED_BODY_SAMPLED : STOPPED_BODY_UNSAMPLED}
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

type Binding = Pick<DiagnosticsNoticeProps, "onRestart" | "announced">;

const noticeOf: (self: DiagnosticsStatus) => (binding: Binding) => ReactNode = Match.type<DiagnosticsStatus>().pipe(
  Match.tagsExhaustive({
    Off: () => () => null,
    Starting: () => () => <StartingNotice />,
    Live: () => () => null,
    Stopped: (status) => ({ onRestart, announced }: Binding) => (
      <StoppedNotice status={status} onRestart={onRestart} announced={announced} />
    ),
  }),
);

export const DiagnosticsNotice: FC<DiagnosticsNoticeProps> = ({ status, onRestart, announced }) =>
  noticeOf(status)({ onRestart, announced });
