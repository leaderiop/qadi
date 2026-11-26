/**
 * Counts the dock's commits around polls, through the public dock and a `React.Profiler`.
 *
 * The frame is private and a re-render is not visible in the markup, so the count is the
 * only way to see what the frame subscribes to. R1 is the claim: a poll that moves only the
 * reading, the status staying `Live`, commits nothing under the dock. R2 is the control that
 * keeps the counter honest: a poll that stops the feed commits, so R1's zero is not a blind
 * count. R3 pins that the hydration block follows the model's store alone, whatever the
 * frame reads.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Profiler } from "react";
import { vi } from "vitest";
import { DevtoolsDock } from "../../src/react/DevtoolsDock.tsx";
import { makeCollectorDouble } from "../collectorDouble.ts";
import { logOf } from "../dockModelFixtures.ts";

/** Counts every commit of the subtree it wraps. */
const counted = () => {
  const commits = { count: 0 };
  const onRender = () => {
    commits.count += 1;
  };
  return { commits, onRender };
};

/**
 * Waits until the poll has read at least `calls` samples.
 *
 * Testing Library's `waitFor` leaves React's act environment while it waits, so the
 * poll's updates commit as they would on a page; inside one `act` they would queue and
 * commit only when it closed, and a count would read nothing.
 */
const untilCalls = (state: { readonly calls: number }, calls: number) =>
  waitFor(() => {
    assert.isAtLeast(state.calls, calls);
  });

const countsOf = (seeded: number) => ({
  dehydrated: 0,
  seeded,
  rechecked: 0,
  mismatched: 0,
  drops: [],
});

describe("the dock's commits around polls", () => {
  it("R1 a poll that moves only the reading, the status staying Live, commits nothing under the dock", async () => {
    const { state, collector } = makeCollectorDouble((call) => logOf(String(call)));
    const { commits, onRender } = counted();
    render(
      <Profiler id="dock" onRender={onRender}>
        <DevtoolsDock diagnostics={{ collector, intervalMillis: 10 }} />
      </Profiler>,
    );
    await untilCalls(state, 2);
    const settled = commits.count;
    const from = state.calls;

    await untilCalls(state, from + 3);

    assert.strictEqual(commits.count, settled, "commits after the status settled on Live");
  });

  it("R2 a poll that stops the feed commits under the dock, so the count is not blind", async () => {
    const stop = { now: false };
    const { state, collector } = makeCollectorDouble((call) => {
      if (stop.now) throw new Error("the collector blew up");
      return logOf(String(call));
    });
    const { commits, onRender } = counted();
    render(
      <Profiler id="dock" onRender={onRender}>
        <DevtoolsDock diagnostics={{ collector, intervalMillis: 10 }} />
      </Profiler>,
    );
    await untilCalls(state, 2);
    const settled = commits.count;

    stop.now = true;
    await waitFor(() => {
      assert.isAbove(commits.count, settled);
    });
  });

  it("R3 counts handed to a mounted dock reach the open hydration block, and later counts replace them", async () => {
    const view = render(<DevtoolsDock diagnostics={{}} />);
    await act(async () => {});
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "React" }));
    });

    view.rerender(<DevtoolsDock diagnostics={{}} reading={{ hydration: countsOf(7) }} />);
    await vi.waitFor(() => {
      assert.include(screen.getByTestId("qadi-hydration-seeded").textContent ?? "", "7");
    });

    view.rerender(<DevtoolsDock diagnostics={{}} reading={{ hydration: countsOf(9) }} />);
    await vi.waitFor(() => {
      assert.include(screen.getByTestId("qadi-hydration-seeded").textContent ?? "", "9");
    });
  });
});
