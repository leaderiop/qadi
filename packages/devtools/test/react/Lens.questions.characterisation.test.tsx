/**
 * Pins the lens over the questions store, through the panel, while the store republishes.
 *
 * This file is held byte for byte from its first commit, and a later row goes in a new
 * file. Each row reads what the page shows (the overlay's position, the pick, the number
 * of subscriptions) and never how the lens reads the store, so the panel's props are the
 * only seam the rows touch: the same rows hold however the lens is handed the guards it
 * lists.
 */
import { afterEach, assert, describe, it } from "@effect/vitest";
import { hasPermission, permission } from "@qadi/core";
import { act, fireEvent, render } from "@testing-library/react";
import { vi } from "vitest";
import { makeExternalStore } from "../../src/model/ExternalStore.ts";
import { joinQuestions, type GateInstanceLike } from "../../src/model/Gates.ts";
import { isPicking, makeLensSession, pickedOf, type LensSession } from "../../src/model/LensSession.ts";
import { QuestionsPanel } from "../../src/react/QuestionsPanel.tsx";
import { liveNotice } from "../helpers.ts";

const read = permission("doc", "read");
const originalElementFromPoint = document.elementFromPoint;
const originalRangeRect = Range.prototype.getBoundingClientRect;

const guard = (id: string, element: HTMLElement): GateInstanceLike => ({
  id,
  kind: "Can",
  policy: hasPermission(read),
  state: "Allowed",
  element,
});

const control = (): HTMLButtonElement => {
  const element = document.createElement("button");
  document.body.appendChild(element);
  return element;
};

const snapshotOf = (gates: ReadonlyArray<GateInstanceLike>) =>
  joinQuestions({ questions: [], gates, questionsFailed: undefined, unsampled: false });

/** Each element measures to the rect its top names, so the overlay's `top` says which element is drawn. */
const measuredAt = (tops: ReadonlyMap<Node, number>) => {
  Range.prototype.getBoundingClientRect = function (this: Range): DOMRect {
    const top = tops.get(this.startContainer) ?? 0;
    return {
      top,
      left: 10,
      width: 40,
      height: 20,
      right: 50,
      bottom: top + 20,
      x: 10,
      y: top,
      toJSON: () => ({}),
    };
  };
};

const overlayTops = (): ReadonlyArray<string | null> =>
  [...document.querySelectorAll("[data-qadi-lens]")].map(
    (overlay) => /top:([-0-9.]+)px/.exec(overlay.getAttribute("style") ?? "")?.[1] ?? null,
  );

const overlayIds = (): ReadonlyArray<string | null> =>
  [...document.querySelectorAll("[data-qadi-lens]")].map((overlay) =>
    overlay.getAttribute("data-qadi-lens"),
  );

const mount = (gates: ReadonlyArray<GateInstanceLike>) => {
  const lens = makeLensSession();
  const questions = makeExternalStore(snapshotOf(gates));
  const view = render(<QuestionsPanel diagnostics={liveNotice} questions={questions} lens={lens} />);
  return { lens, questions, ...view };
};

afterEach(() => {
  vi.restoreAllMocks();
  document.elementFromPoint = originalElementFromPoint;
  Range.prototype.getBoundingClientRect = originalRangeRect;
  document.body.innerHTML = "";
});

describe("the lens over the questions store, through the panel", () => {
  it("LQ1 a highlight follows a guard the questions store republishes with another element", async () => {
    const first = control();
    const second = control();
    measuredAt(
      new Map([
        [first, 100],
        [second, 300],
      ]),
    );
    const { lens, questions } = mount([guard("g1", first)]);

    await act(async () => {
      lens.highlight(["g1"]);
    });
    assert.deepStrictEqual(overlayTops(), ["100"], "drawn over the first element");

    await act(async () => {
      questions.set(snapshotOf([guard("g1", second)]));
    });
    assert.deepStrictEqual(overlayTops(), ["300"], "moved to the element the store now lists");
  });

  it("LQ2 a pointer move and a click while picking resolve against the current list of the store", async () => {
    const early = control();
    const late = control();
    measuredAt(
      new Map([
        [early, 100],
        [late, 300],
      ]),
    );
    const { lens, questions } = mount([guard("g1", early)]);
    await act(async () => {
      lens.toggle();
    });

    await act(async () => {
      questions.set(snapshotOf([guard("g1", early), guard("g2", late)]));
    });
    document.elementFromPoint = () => late;
    await act(async () => {
      fireEvent.pointerMove(document, { clientX: 5, clientY: 5 });
    });
    assert.deepStrictEqual(overlayIds(), ["g2"], "the guard registered while picking is hovered");
    assert.deepStrictEqual(overlayTops(), ["300"], "over its own element");

    await act(async () => {
      fireEvent.click(document, { clientX: 5, clientY: 5 });
    });
    assert.strictEqual(pickedOf(lens.getSnapshot()), "g2", "and picked");
    assert.isFalse(isPicking(lens.getSnapshot()), "picking ended");
  });

  it("LQ3 a guard dropped from the store while it is highlighted leaves no overlay", async () => {
    const element = control();
    measuredAt(new Map([[element, 100]]));
    const { lens, questions } = mount([guard("g1", element)]);

    await act(async () => {
      lens.highlight(["g1"]);
    });
    assert.deepStrictEqual(overlayIds(), ["g1"], "drawn while listed");

    await act(async () => {
      questions.set(snapshotOf([]));
    });
    assert.deepStrictEqual(overlayIds(), [], "gone once the store lists no guard");
  });

  it("LQ4 the panel holds one subscription to each store across the publishes", async () => {
    const element = control();
    measuredAt(new Map([[element, 100]]));
    const session = makeLensSession();
    const store = makeExternalStore(snapshotOf([guard("g1", element)]));
    let heldLens = 0;
    let heldQuestions = 0;
    const lens: LensSession = {
      ...session,
      subscribe: (listener) => {
        heldLens += 1;
        const unsubscribe = session.subscribe(listener);
        return () => {
          heldLens -= 1;
          unsubscribe();
        };
      },
    };
    const questions = {
      ...store,
      subscribe: (listener: () => void) => {
        heldQuestions += 1;
        const unsubscribe = store.subscribe(listener);
        return () => {
          heldQuestions -= 1;
          unsubscribe();
        };
      },
    };
    const { unmount } = render(<QuestionsPanel diagnostics={liveNotice} questions={questions} lens={lens} />);
    assert.deepStrictEqual([heldLens, heldQuestions], [1, 1], "after mount");

    await act(async () => {
      lens.highlight(["g1"]);
    });
    await act(async () => {
      store.set(snapshotOf([guard("g1", control())]));
    });
    await act(async () => {
      lens.toggle();
    });
    await act(async () => {
      store.set(snapshotOf([guard("g1", element)]));
    });
    assert.deepStrictEqual([heldLens, heldQuestions], [1, 1], "across the highlight, the publishes and picking");

    unmount();
    assert.deepStrictEqual([heldLens, heldQuestions], [0, 0], "after unmount");
  });
});
