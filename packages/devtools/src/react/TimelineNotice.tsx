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
import type { FC, ReactNode } from "react";
import * as Match from "effect/Match";
import type { TimelineStatus } from "../model/TimelineFeed.ts";
import { StoppedBox, type StopNoticeProps } from "./StoppedBox.tsx";

const STOPPED_LEAD = "Timeline stopped.";
const STOPPED_BODY =
  "The source failed with an unexpected error and is no longer delivering decisions. What it delivered before it stopped is kept, and nothing new will arrive.";
const RESTART_LABEL = "Restart timeline";
const REASON_LABEL = "Why the timeline stopped";

/** What the dock hands the timeline notice. */
export type TimelineNoticeProps = StopNoticeProps<TimelineStatus>;

const noticeOf: (self: TimelineStatus) => (notice: TimelineNoticeProps) => ReactNode =
  Match.type<TimelineStatus>().pipe(
    Match.tagsExhaustive({
      Reading: () => () => null,
      Stopped: (status) => (notice: TimelineNoticeProps) => (
        <div data-testid="qadi-timeline-notice-slot" style={{ padding: "12px 12px 0" }}>
          <StoppedBox<TimelineStatus>
            notice={notice}
            reason={status.reason}
            lead={STOPPED_LEAD}
            body={STOPPED_BODY}
            reasonLabel={REASON_LABEL}
            restartLabel={RESTART_LABEL}
            feed="timeline"
          />
        </div>
      ),
    }),
  );

export const TimelineNotice: FC<TimelineNoticeProps> = (notice) => (
  <>{noticeOf(notice.status)(notice)}</>
);
