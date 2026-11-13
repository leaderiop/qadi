"use client";
/**
 * The timeline's stop, stated above the screens that show its entries.
 *
 * A dead read leaves those screens looking live with no action by the reviewer, so the
 * stop is said once, with the way out, over the same box the diagnostics notice renders.
 * There is no polite region: `Reading` is the ordinary state and stays quiet.
 *
 * Package-private: it is in no barrel and so not importable (AGENTS.md §9, ADR-QD-099).
 */
import type { FC, ReactNode, RefObject } from "react";
import * as Match from "effect/Match";
import type { TimelineStatus } from "../model/TimelineFeed.ts";
import { StoppedBox, stoppedKey, type StopLedger } from "./StoppedBox.tsx";

const STOPPED_LEAD = "Timeline stopped.";
const STOPPED_BODY =
  "The source failed with an unexpected error and is no longer delivering decisions. What it delivered before it stopped is kept, and nothing new will arrive.";
const RESTART_LABEL = "Restart timeline";
const REASON_LABEL = "Why the timeline stopped";

/** What the dock hands the timeline notice. */
export interface TimelineNoticeProps {
  /** The timeline feed's status, read once by the dock. */
  readonly status: TimelineStatus;
  /** Reads the source again; the feed goes through `Reading`, so the notice is removed. */
  readonly onRestart: () => void;
  /**
   * The stops the notice has shown, owned by the dock so it outlives every screen.
   *
   * It records only which stop was announced, never what the status says (AGENTS.md §13).
   */
  readonly announced: RefObject<StopLedger<TimelineStatus>>;
}

type Binding = Pick<TimelineNoticeProps, "onRestart" | "announced">;

const noticeOf: (self: TimelineStatus) => (binding: Binding) => ReactNode = Match.type<TimelineStatus>().pipe(
  Match.tagsExhaustive({
    Reading: () => () => null,
    Stopped: (status) => ({ onRestart, announced }: Binding) => (
      <div data-testid="qadi-timeline-notice-slot" style={{ padding: "12px 12px 0" }}>
        <StoppedBox<TimelineStatus>
          key={stoppedKey(announced.current, status)}
          status={status}
          reason={status.reason}
          lead={STOPPED_LEAD}
          body={STOPPED_BODY}
          reasonLabel={REASON_LABEL}
          restartLabel={RESTART_LABEL}
          hooks="qadi-timeline"
          focusTarget="[data-testid='qadi-dock-body']"
          onRestart={onRestart}
          announced={announced}
        />
      </div>
    ),
  }),
);

export const TimelineNotice: FC<TimelineNoticeProps> = ({ status, onRestart, announced }) => (
  <>{noticeOf(status)({ onRestart, announced })}</>
);
