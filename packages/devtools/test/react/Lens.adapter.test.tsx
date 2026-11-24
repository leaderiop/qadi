/**
 * The lens adapter's click, driven over a session of its own with no dock around it.
 *
 * Two properties of the click handler are held here: a click is consumed exactly when a
 * pick was made, even when a subscriber to the session throws while being told of the
 * pick, and a click that a keyboard made is placed by the control it was made on and not
 * by a point it did not report. The panel that draws from the same session holds one
 * subscription to it and not one for the adapter and another for itself.
 */
import { afterEach, assert, describe, it } from "@effect/vitest";
import { hasPermission, permission } from "@qadi/core";
import { act, fireEvent, render } from "@testing-library/react";
import { vi } from "vitest";
import { makeExternalStore } from "../../src/model/ExternalStore.ts";
import { joinQuestions, type GateInstanceLike } from "../../src/model/Gates.ts";
import { makeLensSession, pickedOf, type LensSession } from "../../src/model/LensSession.ts";
import { QuestionsPanel } from "../../src/react/QuestionsPanel.tsx";
import { useLens } from "../../src/react/useLens.ts";
import { liveNotice } from "../helpers.ts";
import { panelInput } from "./questionsPanelInput.ts";

const read = permission("doc", "read");
const originalElementFromPoint = document.elementFromPoint;

const guard = (id: string, element: HTMLElement): GateInstanceLike => ({
  id,
  kind: "Can",
  policy: hasPermission(read),
  state: "Allowed",
  element,
});

const control = (parent: HTMLElement = document.body): HTMLButtonElement => {
  const element = document.createElement("button");
  parent.appendChild(element);
  return element;
};

/** The adapter alone, over a session and the one guard list it is given. */
const mount = (instances: ReadonlyArray<GateInstanceLike>) => {
  const lens = makeLensSession();
  const questions = makeExternalStore(
    joinQuestions({
      questions: [],
      gates: instances,
      questionsFailed: undefined,
      unsampled: false,
    }),
  );
  const Probe = () => {
    useLens(lens, questions);
    return null;
  };
  render(<Probe />);
  return lens;
};

const picking = async (lens: LensSession) => {
  await act(async () => {
    lens.toggle();
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  document.elementFromPoint = originalElementFromPoint;
  document.body.innerHTML = "";
});

describe("the lens adapter's click", () => {
  it("a click that made a pick is still consumed when a subscriber throws while being told of it, and its failure is not caught by the adapter", async () => {
    const marker = document.createElement("span");
    document.body.appendChild(marker);
    const target = control(marker);
    const lens = mount([guard("a", marker)]);
    await picking(lens);
    document.elementFromPoint = () => target;

    const boom = new Error("a subscriber failed");
    lens.subscribe(() => {
      if (pickedOf(lens.getSnapshot()) !== undefined) throw boom;
    });
    // A browser reports a listener's error to the window and carries on, and happy-dom
    // throws it out of `dispatchEvent`: the failure is read from whichever the DOM does.
    const surfaced: Array<unknown> = [];
    const report = (event: ErrorEvent): void => {
      surfaced.push(event.error);
      event.preventDefault();
    };
    window.addEventListener("error", report);
    // Built here, so the event can be read after a dispatch that threw.
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
    try {
      await act(async () => {
        try {
          target.dispatchEvent(click);
        } catch (error) {
          surfaced.push(error);
        }
      });
    } finally {
      window.removeEventListener("error", report);
    }

    assert.strictEqual(pickedOf(lens.getSnapshot()), "a", "the pick was recorded");
    assert.isTrue(click.defaultPrevented, "the click was consumed");
    assert.isTrue(surfaced.includes(boom), "the subscriber's failure surfaced");
  });

  it("a click made with no pointer is placed by the control it was made on, not by a point it did not report", async () => {
    const marker = document.createElement("span");
    document.body.appendChild(marker);
    const held = control(marker);
    const beside = control();
    const lens = mount([guard("a", marker)]);
    await picking(lens);

    document.elementFromPoint = () => marker;
    let proceeded = false;
    await act(async () => {
      proceeded = fireEvent.click(beside, { detail: 0, clientX: 0, clientY: 0 });
    });
    assert.isTrue(proceeded, "a control no guard holds keeps its click");
    assert.isUndefined(pickedOf(lens.getSnapshot()), "nothing picked");

    document.elementFromPoint = () => null;
    await act(async () => {
      proceeded = fireEvent.click(held, { detail: 0, clientX: 0, clientY: 0 });
    });
    assert.isFalse(proceeded, "a control a guard holds is a pick");
    assert.strictEqual(pickedOf(lens.getSnapshot()), "a");
  });
});

describe("the lens panel's subscription", () => {
  it("the panel holds one subscription to the lens while it is mounted and none after", () => {
    const session = makeLensSession();
    let held = 0;
    const lens: LensSession = {
      ...session,
      subscribe: (listener) => {
        held += 1;
        const unsubscribe = session.subscribe(listener);
        return () => {
          held -= 1;
          unsubscribe();
        };
      },
    };
    const { unmount } = render(
      <QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: [], lens })} />,
    );
    assert.strictEqual(held, 1, "while mounted");
    unmount();
    assert.strictEqual(held, 0, "after unmount");
  });
});
