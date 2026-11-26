/**
 * Pins what the stop notice hook hands a notice and when a stop is recorded.
 *
 * These rows cannot be stated through `DevtoolsDock`: a render that is thrown away, a feed
 * restart that leaves the status the same stop, the identity of the props the hook returns
 * and the commits a stop costs are all below what the page shows. They go from the hook to
 * the notice to the page and read no field the hook keeps, so they hold however the hook
 * keeps its ledger of announced stops. This file is held byte for byte from its first
 * commit, and a later row goes in a new file.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { Component, Profiler, type ReactElement, type ReactNode } from "react";
import { vi } from "vitest";
import type { Source, SourceRead } from "../../src/model/Source.ts";
import { TimelineStatus } from "../../src/model/TimelineFeed.ts";
import { DevtoolsDock } from "../../src/react/DevtoolsDock.tsx";
import type { StopNoticeProps } from "../../src/react/StoppedBox.tsx";
import { TimelineNotice } from "../../src/react/TimelineNotice.tsx";
import { useStopNotice } from "../../src/react/useStopNotice.ts";
import { decisionRecord } from "../helpers.ts";

/** Shows a fallback once anything below it throws while rendering. */
class Boundary extends Component<{ readonly children: ReactNode }, { readonly failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? <span data-testid="fallback" /> : this.props.children;
  }
}

/** Throws while rendering when asked to, after the notice beside it has rendered. */
const Thrower = ({ now }: { readonly now: boolean }): ReactElement => {
  if (now) throw new Error("a sibling died after the notice rendered");
  return <></>;
};

const Held = ({
  status,
  dies,
  boundaryKey,
}: {
  readonly status: TimelineStatus;
  readonly dies: boolean;
  readonly boundaryKey: number;
}): ReactElement => {
  const notice = useStopNotice<TimelineStatus>(status, () => undefined);
  return (
    <Boundary key={boundaryKey}>
      <TimelineNotice {...notice} />
      <Thrower now={dies} />
    </Boundary>
  );
};

/** A source whose read succeeds with one decision and hands over the given live stream. */
const sourceOf = (live: SourceRead["live"]): Source => ({
  read: Effect.succeed({ backlog: [decisionRecord({ evaluationId: "a", at: 100 })], live }),
});

const settle = async () => {
  await act(async () => {});
  await act(async () => {});
};

describe("the stop notice hook", () => {
  it("H1 a render that is thrown away announces nothing, so the stop alerts when it is first shown", async () => {
    const status: TimelineStatus = TimelineStatus.Stopped({ reason: "boom" });
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const heard = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", heard);
    try {
      const view = render(<Held status={status} dies boundaryKey={0} />);
      await act(async () => {});
      assert.isNotNull(screen.queryByTestId("fallback"), "the render was thrown away");
      assert.isNull(screen.queryByTestId("qadi-timeline-stopped"), "and no stop box is on the page");

      view.rerender(<Held status={status} dies={false} boundaryKey={1} />);
      await act(async () => {});
      assert.strictEqual(screen.getByTestId("qadi-timeline-stopped").getAttribute("data-announce"), "alert");
    } finally {
      window.removeEventListener("error", heard);
      quiet.mockRestore();
    }
  });

  it("H2 a notice follows its feed restart while the status stays the same stop", async () => {
    const status: TimelineStatus = TimelineStatus.Stopped({ reason: "boom" });
    const calls: Array<string> = [];
    const Probe = ({ restart }: { readonly restart: () => void }): ReactElement => (
      <TimelineNotice {...useStopNotice<TimelineStatus>(status, restart)} />
    );
    const view = render(<Probe restart={() => calls.push("first")} />);
    view.rerender(<Probe restart={() => calls.push("second")} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("qadi-timeline-restart"));
    });
    assert.deepStrictEqual(calls, ["second"]);
  });

  it("H3 the notice is one value across a re-render that changes nothing it holds, and a new value for a new stop", () => {
    const seen: Array<StopNoticeProps<TimelineStatus>> = [];
    const restart = () => undefined;
    const stop: TimelineStatus = TimelineStatus.Stopped({ reason: "a" });
    const Probe = ({ status, tick }: { readonly status: TimelineStatus; readonly tick: number }): ReactElement => {
      seen.push(useStopNotice<TimelineStatus>(status, restart));
      return <span data-tick={tick} />;
    };
    const view = render(<Probe status={stop} tick={0} />);
    view.rerender(<Probe status={stop} tick={1} />);
    view.rerender(<Probe status={TimelineStatus.Stopped({ reason: "a" })} tick={2} />);
    assert.strictEqual(seen.length, 3);
    assert.strictEqual(seen[1], seen[0], "the same stop and the same restart give the same value");
    assert.notStrictEqual(seen[2], seen[1], "a new stop value, equal in its fields, is a new value");
  });

  it("C1 a newly shown stop adds at most one commit over a live source", async () => {
    const commitsOf = async (source: Source) => {
      const commits = { count: 0 };
      const view = render(
        <Profiler
          id="dock"
          onRender={() => {
            commits.count += 1;
          }}
        >
          <DevtoolsDock source={source} />
        </Profiler>,
      );
      await settle();
      view.unmount();
      return commits.count;
    };
    const live = await commitsOf(sourceOf(Stream.never));
    const stopped = await commitsOf(sourceOf(Stream.die(new Error("boom"))));
    assert.isAtLeast(live, 1);
    assert.isAtMost(stopped - live, 1, `commits over a live source: ${String(live)}, with a stop shown: ${String(stopped)}`);
  });
});
