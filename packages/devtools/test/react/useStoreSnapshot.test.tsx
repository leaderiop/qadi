/**
 * The dock's one store read keeps a snapshot's identity and holds one subscription per store.
 *
 * What a store publishes is the store's and is proved without rendering; this is
 * the two things only React can get wrong, which are subscribing once and moving
 * the subscription when the store changes.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, render, screen } from "@testing-library/react";
import { makeExternalStore, type ExternalStore } from "../../src/model/ExternalStore.ts";
import { makeTimelineStore } from "../../src/model/TimelineStore.ts";
import { usePaused, useStoreSnapshot } from "../../src/react/useStoreSnapshot.ts";

interface Counted<A> {
  readonly store: ExternalStore<A>;
  readonly subscribed: () => number;
  readonly unsubscribed: () => number;
}

/** A store whose `subscribe` records how often it was called and how often its remover ran. */
const counted = <A,>(initial: A): Counted<A> => {
  const store = makeExternalStore(initial);
  let subscribed = 0;
  let unsubscribed = 0;
  return {
    store: {
      ...store,
      subscribe: (listener) => {
        subscribed += 1;
        const remove = store.subscribe(listener);
        return () => {
          unsubscribed += 1;
          remove();
        };
      },
    },
    subscribed: () => subscribed,
    unsubscribed: () => unsubscribed,
  };
};

const Reader = ({ store }: { readonly store: ExternalStore<{ readonly n: number }> }) => (
  <span data-testid="n">{useStoreSnapshot(store).n}</span>
);

const PausedReader = ({ timeline }: { readonly timeline: ReturnType<typeof makeTimelineStore> }) => (
  <span data-testid="paused">{String(usePaused(timeline))}</span>
);

describe("the store-snapshot hook", () => {
  it("S1 shows the store's value and the very value it published", () => {
    const store = makeExternalStore({ n: 1 });
    const seen: Array<{ readonly n: number }> = [];
    const Probe = () => {
      const value = useStoreSnapshot(store);
      seen.push(value);
      return <span data-testid="n">{value.n}</span>;
    };
    render(<Probe />);
    assert.strictEqual(screen.getByTestId("n").textContent, "1");

    const next = { n: 2 };
    act(() => store.set(next));
    assert.strictEqual(screen.getByTestId("n").textContent, "2");
    assert.strictEqual(seen[seen.length - 1], next);
  });

  it("S2 subscribes once across re-renders, releases on unmount, and moves to a new store", () => {
    const first = counted({ n: 1 });
    const second = counted({ n: 2 });
    const view = render(<Reader store={first.store} />);
    view.rerender(<Reader store={first.store} />);
    view.rerender(<Reader store={first.store} />);
    assert.strictEqual(first.subscribed(), 1);
    assert.strictEqual(first.unsubscribed(), 0);

    view.rerender(<Reader store={second.store} />);
    assert.strictEqual(screen.getByTestId("n").textContent, "2");
    assert.strictEqual(first.unsubscribed(), 1);
    assert.strictEqual(second.subscribed(), 1);
    assert.strictEqual(second.unsubscribed(), 0);

    view.unmount();
    assert.strictEqual(second.unsubscribed(), 1);
    assert.strictEqual(first.subscribed(), 1);
  });

  it("S3 reads a timeline's pause through the timeline's own single subscription", () => {
    const timeline = makeTimelineStore();
    let subscribed = 0;
    const counting = {
      ...timeline,
      subscribe: (listener: () => void) => {
        subscribed += 1;
        return timeline.subscribe(listener);
      },
    };
    const view = render(<PausedReader timeline={counting} />);
    assert.strictEqual(screen.getByTestId("paused").textContent, "false");

    act(() => timeline.setPaused(true));
    assert.strictEqual(screen.getByTestId("paused").textContent, "true");

    view.rerender(<PausedReader timeline={counting} />);
    assert.strictEqual(subscribed, 1);
  });
});
