/**
 * How a timeline read by `useTimeline` lives across React's lifecycle.
 *
 * The hook's own tests prove it starts on mount and closes on unmount. These add
 * StrictMode, a re-render, a capacity change and a hidden `Activity`, written
 * against the shipped behaviour first so that a later change to how the hook is
 * built shows up here only as a deliberate edit.
 */
import { assert, describe, it } from "@effect/vitest";
import { vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import * as Result from "effect/Result";
import { encodeStoredRecordString } from "@qadi/core";
import { Activity, StrictMode, useState } from "react";
import {
  sourceFromEventSource,
  sourceFromRecords,
  type Source,
} from "../../src/model/Source.ts";
import type { TimelineStore } from "../../src/model/TimelineStore.ts";
import { useTimeline } from "../../src/react/useTimeline.ts";
import { decisionRecord } from "../helpers.ts";

const frame = Result.getOrElse(
  encodeStoredRecordString(decisionRecord({ evaluationId: "streamed", at: 100 })),
  () => "refused",
);

/** A stream that counts its connections: a current server sends an empty prelude, then one live frame. */
const streaming = () => {
  const counts = { opened: 0, closed: 0 };
  const source = sourceFromEventSource({
    url: "/__decisions",
    open: () => {
      counts.opened += 1;
      const handlers = new Map<string, (data: string) => void>();
      return {
        onEvent: (event, handler) => {
          handlers.set(event, handler);
          if (event !== "synced") return;
          queueMicrotask(() => {
            handlers.get("synced")?.('{"backlog":0}');
            handlers.get("message")?.(frame);
          });
        },
        onError: () => {},
        close: () => {
          counts.closed += 1;
        },
      };
    },
  });
  return { counts, source };
};

const Panel = ({ source }: { readonly source: Source }) => {
  const { timeline, paused } = useTimeline(source);
  return (
    <div>
      <span data-testid="rows">{timeline.entries.map((e) => e.evaluationId).join(",")}</span>
      <span data-testid="paused">{String(paused)}</span>
    </div>
  );
};

describe("useTimeline across React's lifecycle", () => {
  it("L1 under StrictMode opens the stream twice, closes the first, and shows the row once; unmount closes both", async () => {
    const { counts, source } = streaming();
    const view = render(
      <StrictMode>
        <Panel source={source} />
      </StrictMode>,
    );
    await screen.findByText("streamed");
    await vi.waitFor(() => {
      assert.strictEqual(counts.opened, 2);
      assert.strictEqual(counts.closed, 1);
    });
    assert.strictEqual(screen.getByTestId("rows").textContent, "streamed");

    await act(async () => {
      view.unmount();
    });
    await vi.waitFor(() => {
      assert.strictEqual(counts.closed, 2);
    });
  });

  it("L2 a re-render with the same source opens no second connection", async () => {
    const { counts, source } = streaming();
    const Host = () => {
      const [n, setN] = useState(0);
      return (
        <div>
          <button type="button" onClick={() => setN(n + 1)}>
            again
          </button>
          <Panel source={source} />
        </div>
      );
    };
    render(<Host />);
    await screen.findByText("streamed");
    assert.strictEqual(counts.opened, 1);

    await act(async () => {
      screen.getByText("again").click();
    });
    await act(async () => {
      screen.getByText("again").click();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    assert.strictEqual(counts.opened, 1);
    assert.strictEqual(counts.closed, 0);
  });

  it("L3 a capacity change hands back a new store", async () => {
    const source = sourceFromRecords([
      decisionRecord({ evaluationId: "a", at: 100 }),
      decisionRecord({ evaluationId: "b", at: 200 }),
    ]);
    const stores: Array<TimelineStore> = [];
    const Sized = ({ capacity }: { readonly capacity: number }) => {
      const { timeline, store } = useTimeline(source, { capacity });
      stores.push(store);
      return <span data-testid="rows">{timeline.entries.map((e) => e.evaluationId).join(",")}</span>;
    };

    const view = render(<Sized capacity={5} />);
    await screen.findByText("a,b");
    const before = stores.at(-1);
    assert.isDefined(before);

    view.rerender(<Sized capacity={2} />);
    await screen.findByText("a,b");
    const after = stores.at(-1);
    assert.isDefined(after);
    assert.notStrictEqual(after, before);
  });

  it("L4 a paused timeline stays paused across a hidden-then-shown tree", async () => {
    const source = sourceFromRecords([decisionRecord({ evaluationId: "a", at: 100 })]);
    const Pausable = () => {
      const { paused, setPaused } = useTimeline(source);
      return (
        <div>
          <span data-testid="paused">{String(paused)}</span>
          <button type="button" onClick={() => setPaused(true)}>
            pause
          </button>
        </div>
      );
    };
    const App = ({ mode }: { readonly mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <Pausable />
      </Activity>
    );

    const view = render(<App mode="visible" />);
    await act(async () => {
      screen.getByText("pause").click();
    });
    assert.strictEqual(screen.getByTestId("paused").textContent, "true");

    view.rerender(<App mode="hidden" />);
    view.rerender(<App mode="visible" />);
    assert.strictEqual(screen.getByTestId("paused").textContent, "true");
  });
});
