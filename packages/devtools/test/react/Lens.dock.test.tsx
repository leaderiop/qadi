/**
 * The lens adapter's listener lifetime and the reveal of a pick, through the dock.
 *
 * Every cell renders `DevtoolsDock` and switches its tabs, so the file depends on the dock's
 * props and on nothing the panel takes. Two properties are held here: the three document
 * listeners picking needs are added once on entering picking and are not touched again when
 * the listed guards change, and a pick made under `StrictMode` reveals its row once and is
 * still marked, with no second reveal, after the panel is left and entered again. A third
 * holds what the handler does with the page: the click a pick consumes has its default action
 * cancelled.
 *
 * The registry, the guards and the pointer stub are written in this file on purpose: a shared
 * helper edited later would change what the file holds.
 */
import { afterEach, assert, beforeEach, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { hasPermission, permission } from "@qadi/core";
import { StrictMode } from "react";
import { vi } from "vitest";
import type { GateInstanceLike, GateRegistryLike } from "../../src/model/Gates.ts";
import { DevtoolsDock } from "../../src/react/DevtoolsDock.tsx";

const read = permission("doc", "read");
const asked = [{ policy: hasPermission(read) }];

/** A registry over an array: one snapshot per change, every listener called by the change. */
const makeRegistry = (initial: ReadonlyArray<GateInstanceLike>) => {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const announce = () => {
    for (const listener of listeners) listener();
  };
  const registry: GateRegistryLike = {
    instances: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    registry,
    add: (instance: GateInstanceLike) => {
      snapshot = [...snapshot, instance];
      announce();
    },
  };
};

const marker = (): HTMLElement => {
  const element = document.createElement("span");
  element.setAttribute("data-lens-fixture", "");
  document.body.appendChild(element);
  return element;
};

const guard = (id: string, element: HTMLElement): GateInstanceLike => ({
  id,
  kind: "Can",
  policy: hasPermission(read),
  state: "Allowed",
  element,
});

const originalElementFromPoint = document.elementFromPoint;
const originalScrollIntoView = Element.prototype.scrollIntoView;

const pointingAt = (element: Element | null) => {
  document.elementFromPoint = () => element;
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.click();
  });
};

const toReact = () => click(screen.getByRole("button", { name: "React" }));
const toLog = () => click(screen.getByRole("button", { name: "Log" }));

const pickButton = () => screen.getByTestId("qadi-pick");
const pickedRows = () =>
  screen.queryAllByTestId("qadi-instance").filter((row) => row.dataset["qadiPicked"] === "true");

const clickDocument = async () => {
  await act(async () => {
    fireEvent.click(document, { clientX: 5, clientY: 5 });
  });
};

const watched = ["pointermove", "click", "keydown"];

/** The watched event types a spy was called with, in a fixed order. */
const watchedTypes = (calls: ReadonlyArray<ReadonlyArray<unknown>>): ReadonlyArray<string> =>
  calls
    .map((call) => call[0])
    .filter((type): type is string => typeof type === "string" && watched.includes(type))
    .sort();

describe("the lens adapter through the dock", () => {
  let revealed = 0;

  beforeEach(() => {
    revealed = 0;
    Element.prototype.scrollIntoView = () => {
      revealed += 1;
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.elementFromPoint = originalElementFromPoint;
    Element.prototype.scrollIntoView = originalScrollIntoView;
    for (const element of document.querySelectorAll("[data-lens-fixture]")) element.remove();
    for (const element of document.querySelectorAll("[data-qadi-lens]")) element.remove();
  });

  it("entering picking adds three document listeners, and a change in the listed guards while picking adds none", async () => {
    const a = marker();
    const b = marker();
    const double = makeRegistry([guard("a", a)]);
    render(<DevtoolsDock gates={double.registry} reading={{ questions: asked }} />);
    await act(async () => {});
    await toReact();
    pointingAt(null);

    const added = vi.spyOn(document, "addEventListener");
    const removed = vi.spyOn(document, "removeEventListener");
    await click(pickButton());
    assert.deepStrictEqual(watchedTypes(added.mock.calls), ["click", "keydown", "pointermove"]);
    assert.deepStrictEqual(watchedTypes(removed.mock.calls), [], "removed on entering");

    await act(async () => {
      double.add(guard("b", b));
    });
    assert.strictEqual(screen.getAllByTestId("qadi-instance").length, 2, "both guards listed");
    assert.deepStrictEqual(
      watchedTypes(added.mock.calls),
      ["click", "keydown", "pointermove"],
      "added again by the change",
    );
    assert.deepStrictEqual(watchedTypes(removed.mock.calls), [], "removed by the change");
  });

  it("under StrictMode a pick reveals its row once, and after a switch to the log and back the row is still marked with no second reveal", async () => {
    const a = marker();
    const { registry } = makeRegistry([guard("a", a)]);
    render(
      <StrictMode>
        <DevtoolsDock gates={registry} reading={{ questions: asked }} />
      </StrictMode>,
    );
    await act(async () => {});
    await toReact();
    pointingAt(a);

    await click(pickButton());
    await clickDocument();
    assert.strictEqual(pickedRows().length, 1, "the row picked");
    assert.strictEqual(revealed, 1, "one reveal at the pick");

    await toLog();
    await toReact();
    assert.strictEqual(pickedRows().length, 1, "the row still marked on the return");
    assert.strictEqual(revealed, 1, "no second reveal on the return");
  });

  it("a click a pick consumes has its default action cancelled, and a click over no guard keeps it", async () => {
    const link = document.createElement("a");
    link.setAttribute("href", "#guarded");
    link.setAttribute("data-lens-fixture", "");
    document.body.appendChild(link);
    const other = marker();
    const { registry } = makeRegistry([guard("a", link)]);
    render(<DevtoolsDock gates={registry} reading={{ questions: asked }} />);
    await act(async () => {});
    await toReact();
    await click(pickButton());

    pointingAt(other);
    let proceeded = false;
    await act(async () => {
      proceeded = fireEvent.click(other, { clientX: 5, clientY: 5, detail: 1 });
    });
    assert.isTrue(proceeded, "a click over no guard keeps its default action");
    assert.strictEqual(pickedRows().length, 0, "nothing picked over no guard");

    pointingAt(link);
    await act(async () => {
      proceeded = fireEvent.click(link, { clientX: 5, clientY: 5, detail: 1 });
    });
    assert.isFalse(proceeded, "the picked link is not followed");
    assert.strictEqual(pickedRows().length, 1, "the guard picked");
  });
});
