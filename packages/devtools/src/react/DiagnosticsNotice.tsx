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
import type { CSSProperties, FC, ReactNode, RefObject } from "react";
import * as Match from "effect/Match";
import type { DiagnosticsStatus } from "../model/DiagnosticsFeed.ts";
import { focusRingProps } from "./focusRing.ts";
import { StoppedBox, stoppedKey, type StopLedger } from "./StoppedBox.tsx";
import { colors, font, muted, panel } from "./theme.ts";

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
  readonly announced: RefObject<StopLedger<DiagnosticsStatus>>;
}

/**
 * The props a screen's root carries, so restart has a focus target and a test a hook.
 *
 * The root is focused programmatically and is not a tab stop, and it draws the dock's
 * own focus ring so a keyboard user can see where restart left them. One helper means
 * the two screens cannot drift.
 */
export const diagnosticsRootProps = (status: DiagnosticsStatus) => ({
  "data-diagnostics-status": status._tag,
  tabIndex: -1,
  ...focusRingProps,
  style: { padding: 12 },
});

const startingStyle: CSSProperties = {
  ...panel,
  padding: "8px 12px",
  ...muted,
  fontSize: font.size,
  border: `1px solid ${colors.border}`,
};

const StartingNotice: FC = () => (
  <div data-testid="qadi-diagnostics-starting" style={startingStyle}>
    <strong style={{ fontWeight: 600 }}>{STARTING_LEAD}</strong> {STARTING_BODY}
  </div>
);

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
        <StoppedBox<DiagnosticsStatus>
          key={stoppedKey(announced.current, status)}
          status={status}
          reason={status.reason}
          lead={STOPPED_LEAD}
          body={status.sampled ? STOPPED_BODY_SAMPLED : STOPPED_BODY_UNSAMPLED}
          reasonLabel={REASON_LABEL}
          restartLabel={RESTART_LABEL}
          hooks="qadi-diagnostics"
          focusTarget="[data-diagnostics-status]"
          sampled={status.sampled}
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
