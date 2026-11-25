/**
 * Pins the dock's two stop notices: each feed's stop is announced once, on its own history.
 *
 * This file is held byte for byte from its first commit, and a later row goes in a new
 * file. Each row reads only what the page shows (the announce attribute, the boxes, the
 * reads and calls a Restart makes) through `DevtoolsDock`, whose props are the only seam
 * the rows touch: the same rows hold however the dock keeps the two feeds' histories.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, render, screen } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { Activity } from "react";
import { vi } from "vitest";
import type { Source } from "../../src/model/Source.ts";
import { DevtoolsDock } from "../../src/react/DevtoolsDock.tsx";
import { makeCollectorDouble } from "../collectorDouble.ts";
import { decisionRecord } from "../helpers.ts";

/** A source whose read succeeds, then dies, and counts its reads. */
const dyingSource = () => {
  const counts = { reads: 0 };
  const source: Source = {
    read: Effect.sync(() => {
      counts.reads += 1;
      return {
        backlog: [decisionRecord({ evaluationId: "a", at: 100 })],
        live: Stream.die(new Error("boom")),
      };
    }),
  };
  return { counts, source };
};

/** A collector that throws on every call and counts the calls. */
const throwing = () =>
  makeCollectorDouble(() => {
    throw new Error("the collector blew up");
  });

const settle = async () => {
  await act(async () => {});
  await act(async () => {});
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.click();
  });
};

const goTo = (tab: "Log" | "Services") => click(screen.getByRole("button", { name: tab }));

const announceOf = (testId: string): string | null =>
  screen.getByTestId(testId).getAttribute("data-announce");

const timelineBox = () => announceOf("qadi-timeline-stopped");

/** The diagnostics box, once the poll has stopped and the box is on the screen. */
const diagnosticsBox = async (): Promise<string | null> => {
  await vi.waitFor(() => {
    assert.isNotNull(screen.queryByTestId("qadi-diagnostics-stopped"));
  });
  return announceOf("qadi-diagnostics-stopped");
};

describe("the dock's two stop notices", () => {
  it("DS1 a diagnostics stop and a timeline stop are each announced once, across tab switches between their screens", async () => {
    const { source } = dyingSource();
    const { collector } = throwing();
    render(<DevtoolsDock source={source} diagnostics={{ collector }} />);
    await settle();

    assert.strictEqual(timelineBox(), "alert", "the timeline stop on Log, first mount");
    await goTo("Services");
    assert.strictEqual(await diagnosticsBox(), "alert", "the diagnostics stop on Services, first mount");
    await goTo("Log");
    assert.strictEqual(timelineBox(), "none", "the timeline stop on Log, mounted again");
    await goTo("Services");
    assert.strictEqual(await diagnosticsBox(), "none", "the diagnostics stop on Services, mounted again");
  });

  it("DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again", async () => {
    const { source } = dyingSource();
    const { collector, state } = throwing();
    render(<DevtoolsDock source={source} diagnostics={{ collector }} />);
    await settle();

    assert.strictEqual(timelineBox(), "alert");
    await goTo("Services");
    assert.strictEqual(await diagnosticsBox(), "alert");
    await goTo("Log");
    assert.strictEqual(timelineBox(), "none");
    await goTo("Services");
    assert.strictEqual(await diagnosticsBox(), "none");

    const before = state.calls;
    await click(screen.getByRole("button", { name: "Restart diagnostics" }));
    await vi.waitFor(() => {
      assert.isAbove(state.calls, before);
    });
    assert.strictEqual(await diagnosticsBox(), "alert", "the second diagnostics stop is announced afresh");

    await goTo("Log");
    assert.strictEqual(timelineBox(), "none", "the timeline stop is not announced again");
  });

  it("DS3 after a hidden-then-shown dock, Restart on each notice restarts the rebuilt feed of its own kind", async () => {
    const { counts, source } = dyingSource();
    const { collector, state } = throwing();
    const App = ({ mode }: { readonly mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <DevtoolsDock source={source} diagnostics={{ collector }} />
      </Activity>
    );
    const view = render(<App mode="visible" />);
    await settle();
    assert.strictEqual(timelineBox(), "alert");

    view.rerender(<App mode="hidden" />);
    view.rerender(<App mode="visible" />);
    await settle();
    assert.strictEqual(timelineBox(), "alert", "the rebuilt timeline has stopped again");
    await goTo("Services");
    await diagnosticsBox();
    await goTo("Log");

    const reads = counts.reads;
    const calls = state.calls;
    await click(screen.getByTestId("qadi-timeline-restart"));
    await vi.waitFor(() => {
      assert.isAbove(counts.reads, reads);
    });
    await settle();
    assert.strictEqual(state.calls, calls, "the timeline Restart calls no collector");

    const readsAfter = counts.reads;
    await goTo("Services");
    await diagnosticsBox();
    await click(screen.getByTestId("qadi-diagnostics-restart"));
    await vi.waitFor(() => {
      assert.isAbove(state.calls, calls);
    });
    await settle();
    assert.strictEqual(counts.reads, readsAfter, "the diagnostics Restart reads no source");
  });
});
