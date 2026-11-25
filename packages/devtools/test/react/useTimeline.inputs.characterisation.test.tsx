/**
 * Pins that the timeline hook's fresh inputs record each render costs nothing.
 *
 * The hook builds a new record every render on purpose; the feed's own `configure` decides
 * whether an input moved, so an equal record publishes nothing and a moved capacity does.
 * The timeline store is counted by a listener and the status is read by reference, because
 * `UseTimeline` exposes no status store. This file is held byte for byte from its first
 * commit.
 */
import { assert, describe, it } from "@effect/vitest";
import { renderHook, waitFor } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import type { Source } from "../../src/model/Source.ts";
import { useTimeline } from "../../src/react/useTimeline.ts";
import { decisionRecord } from "../helpers.ts";

/** A backlog of one, then a live half that dies, so the status settles on a stopped value. */
const dying: Source = {
  read: Effect.succeed({
    backlog: [decisionRecord({ evaluationId: "a", at: 100 })],
    live: Stream.die(new Error("boom")),
  }),
};

type Options = { readonly capacity?: number } | undefined;

/** Renders the hook over the dying source and waits until its status reads stopped. */
const settled = async (options: Options) => {
  const view = renderHook(({ options: held }: { readonly options: Options }) => useTimeline(dying, held), {
    initialProps: { options },
  });
  await waitFor(() => assert.strictEqual(view.result.current.status._tag, "Stopped"));
  let publishes = 0;
  view.result.current.store.subscribe(() => {
    publishes += 1;
  });
  return { view, publishes: () => publishes, status: view.result.current.status };
};

describe("the timeline hook's per-render inputs", () => {
  it("TI1 a re-render with a fresh options object holding the same capacity and source publishes nothing from either store", async () => {
    const held = await settled({ capacity: 10 });
    held.view.rerender({ options: { capacity: 10 } });
    assert.strictEqual(held.publishes(), 0);
    assert.strictEqual(held.view.result.current.status, held.status);
  });

  it("TI2 a re-render with no options after no options publishes nothing from either store", async () => {
    const held = await settled(undefined);
    held.view.rerender({ options: undefined });
    assert.strictEqual(held.publishes(), 0);
    assert.strictEqual(held.view.result.current.status, held.status);
  });

  it("TI3 a re-render with a moved capacity publishes from the timeline store and moves the status", async () => {
    const held = await settled({ capacity: 10 });
    held.view.rerender({ options: { capacity: 20 } });
    await waitFor(() => assert.strictEqual(held.view.result.current.status._tag, "Stopped"));
    assert.isAbove(held.publishes(), 0);
    assert.notStrictEqual(held.view.result.current.status, held.status);
  });
});
