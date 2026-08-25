/**
 * The two things only React can get wrong: subscribing on mount, and stopping
 * on unmount.
 *
 * Everything else the hook exposes — ordering, pausing, clearing, snapshot
 * identity — is the store's, and is proved in `test/model/TimelineStore.test.ts`
 * without rendering anything. Re-proving it through a component would make the
 * test slower and vaguer, which is the reason `@qadi/react`'s atom tests render
 * nothing either (AGENTS.md §13).
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { toWire } from "@qadi/core";
import { useMemo } from "react";
import type { Source } from "../../src/model/Source.ts";
import { sourceFromEventSource, sourceFromRecords } from "../../src/model/Source.ts";
import { useTimeline, useTimelineStore } from "../../src/react/useTimeline.ts";
import { decisionRecord } from "../helpers.ts";

const frame = JSON.stringify(toWire(decisionRecord({ evaluationId: "streamed", at: 100 })));

// The idiom `@qadi/react`'s component tests already use: this project does not
// enable vitest globals, so testing-library's automatic cleanup never registers.
afterEach(() => {
  document.body.innerHTML = "";
});

const Panel = ({ source }: { readonly source: Source }) => {
  const { timeline, paused } = useTimeline(source);
  return (
    <div>
      <span data-testid="rows">
        {timeline.entries.map((e) => e.evaluationId).join(",")}
      </span>
      <span data-testid="paused">{String(paused)}</span>
    </div>
  );
};

describe("useTimeline", () => {
  it("renders what the source produced", async () => {
    const source = sourceFromRecords([
      decisionRecord({ evaluationId: "a", at: 100 }),
      decisionRecord({ evaluationId: "b", at: 200 }),
    ]);

    render(<Panel source={source} />);

    // The backlog is read on an Effect fiber, so the first paint is empty and
    // the rows arrive a tick later — which is exactly what a real feed does.
    await screen.findByText("a,b");
    assert.strictEqual(screen.getByTestId("paused").textContent, "false");
  });

  /**
   * E6.4, and the reason it matters beyond tidiness: with an SSE source the
   * fiber holds the stream's scope, and the scope holds the connection. A panel
   * that unmounts without interrupting leaves a browser retrying a feed nobody
   * is watching, forever.
   */
  it("closes the connection when the panel unmounts", async () => {
    let closed = 0;
    const source = sourceFromEventSource({
      url: "/__decisions",
      environment: "Server",
      open: () => ({
        onMessage: (handler) => handler(frame),
        onError: () => {},
        close: () => {
          closed += 1;
        },
      }),
    });

    const view = render(<Panel source={source} />);
    await screen.findByText("streamed");
    assert.strictEqual(closed, 0);

    await act(async () => {
      view.unmount();
    });

    await vi.waitFor(() => {
      assert.strictEqual(closed, 1);
    });
  });
});

const Manual = () => {
  const { timeline, store, paused, setPaused, clear } = useTimelineStore();
  const rows = useMemo(
    () => timeline.entries.map((e) => e.evaluationId).join(","),
    [timeline],
  );
  return (
    <div>
      <span data-testid="rows">{rows}</span>
      <span data-testid="paused">{String(paused)}</span>
      <button
        type="button"
        onClick={() => store.accept(decisionRecord({ evaluationId: "typed", at: 100 }))}
      >
        add
      </button>
      <button type="button" onClick={() => setPaused(!paused)}>
        pause
      </button>
      <button type="button" onClick={clear}>
        clear
      </button>
    </div>
  );
};

describe("useTimelineStore", () => {
  it("re-renders when a record is accepted, and when the view is cleared", async () => {
    render(<Manual />);
    assert.strictEqual(screen.getByTestId("rows").textContent, "");

    await act(async () => {
      screen.getByText("add").click();
    });
    assert.strictEqual(screen.getByTestId("rows").textContent, "typed");

    await act(async () => {
      screen.getByText("clear").click();
    });
    assert.strictEqual(screen.getByTestId("rows").textContent, "");
  });

  it("re-renders on the pause transition", async () => {
    render(<Manual />);
    assert.strictEqual(screen.getByTestId("paused").textContent, "false");

    await act(async () => {
      screen.getByText("pause").click();
    });
    assert.strictEqual(screen.getByTestId("paused").textContent, "true");
  });
});
