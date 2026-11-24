/**
 * The highlight lens as the dock shows it, on the code before ADR-QD-193.
 *
 * Every cell renders `DevtoolsDock` and switches its tabs, so the file depends on the dock's
 * props and on nothing the panel takes. A check holds it to the text it was first committed
 * with: a pin edited to follow a change stops guarding it. Four assertions are declared as
 * changes the lens is meant to make, each an exact line the check knows by name: a pick kept
 * across a tab switch, a highlight that ends picking (two lines) and one overlay kept across
 * two pointer moves over the same guard. Every other assertion holds whatever owns the lens.
 *
 * The registry, the guards and the pointer stub are written in this file on purpose: a
 * shared helper edited later would change what a held file means.
 */
import { afterEach, assert, beforeEach, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { hasPermission, permission } from "@qadi/core";
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
    remove: (id: string) => {
      snapshot = snapshot.filter((instance) => instance.id !== id);
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
const overlays = () => document.querySelectorAll("[data-qadi-lens]");

const move = async () => {
  await act(async () => {
    fireEvent.pointerMove(document, { clientX: 5, clientY: 5 });
  });
};

const clickDocument = async () => {
  await act(async () => {
    fireEvent.click(document, { clientX: 5, clientY: 5 });
  });
};

const mount = async (registry: GateRegistryLike) => {
  render(<DevtoolsDock gates={registry} reading={{ questions: asked }} />);
  await act(async () => {});
  await toReact();
};

describe("the lens through the dock", () => {
  let revealed = 0;
  const scrolls = () => revealed;

  beforeEach(() => {
    revealed = 0;
    Element.prototype.scrollIntoView = () => {
      revealed += 1;
    };
  });

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint;
    Element.prototype.scrollIntoView = originalScrollIntoView;
    for (const element of document.querySelectorAll("[data-lens-fixture]")) element.remove();
    for (const element of overlays()) element.remove();
  });

  it("a pick, then a switch to the log and back", async () => {
    const a = marker();
    await mount(makeRegistry([guard("a", a)]).registry);
    pointingAt(a);

    await click(pickButton());
    await clickDocument();
    assert.strictEqual(pickedRows().length, 1, "the row picked");
    assert.strictEqual(scrolls(), 1, "one reveal at the pick");

    await toLog();
    await toReact();
    assert.strictEqual(pickedRows().length, 1, "the row picked before the switch");
    assert.strictEqual(pickButton().textContent, "pick a control on the page");
    assert.strictEqual(overlays().length, 0, "no overlay on the return");
    assert.strictEqual(scrolls(), 1, "no reveal on the return");
  });

  it("a highlight, then a switch to the log and back", async () => {
    const a = marker();
    await mount(makeRegistry([guard("a", a)]).registry);

    await click(screen.getByTestId("qadi-highlight"));
    assert.strictEqual(overlays().length, 1, "drawn by the highlight");

    await toLog();
    assert.strictEqual(overlays().length, 0, "none on the log");
    await toReact();
    assert.strictEqual(overlays().length, 0, "none on the return");
  });

  it("the highlight button pressed while picking", async () => {
    const a = marker();
    await mount(makeRegistry([guard("a", a)]).registry);
    pointingAt(null);

    await click(pickButton());
    await click(screen.getByTestId("qadi-highlight"));
    assert.strictEqual(overlays().length, 1, "drawn by the highlight");
    assert.strictEqual(pickButton().textContent, "pick a control on the page", "while picking, after the highlight");

    await move();
    assert.strictEqual(overlays().length, 1, "after a pointer move over the dock");
  });

  it("two pointer moves over one guard while picking", async () => {
    const a = marker();
    await mount(makeRegistry([guard("a", a)]).registry);
    pointingAt(a);

    await click(pickButton());
    await move();
    const first = document.querySelector("[data-qadi-lens]");
    await move();
    const second = document.querySelector("[data-qadi-lens]");
    assert.isNotNull(first);
    assert.strictEqual(second, first, "the overlay after the second move");
    assert.strictEqual(overlays().length, 1, "one overlay at a time");
  });

  it("a pick on a guard swallows its click and ends picking", async () => {
    const a = marker();
    let pressed = 0;
    a.addEventListener("click", () => {
      pressed += 1;
    });
    await mount(makeRegistry([guard("a", a)]).registry);
    pointingAt(a);

    await click(pickButton());
    await act(async () => {
      a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    assert.strictEqual(pressed, 0, "the guard's own click");
    assert.strictEqual(pickedRows().length, 1, "the row picked");
    assert.strictEqual(pickButton().textContent, "pick a control on the page");
  });

  it("a click over no guard goes through and picking stays on", async () => {
    const a = marker();
    const stray = marker();
    let pressed = 0;
    stray.addEventListener("click", () => {
      pressed += 1;
    });
    await mount(makeRegistry([guard("a", a)]).registry);
    pointingAt(stray);

    await click(pickButton());
    await act(async () => {
      stray.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    assert.strictEqual(pressed, 1, "the stray click");
    assert.include(pickButton().textContent ?? "", "picking —", "still picking");
    assert.strictEqual(pickedRows().length, 0, "no row picked");
  });

  it("Escape after a pick keeps the pick", async () => {
    const a = marker();
    await mount(makeRegistry([guard("a", a)]).registry);
    pointingAt(a);

    await click(pickButton());
    await clickDocument();
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    assert.strictEqual(pickedRows().length, 1, "the row still picked");
    assert.strictEqual(pickButton().textContent, "pick a control on the page");
  });

  it("entering picking again drops the pick, and leaving it does not restore it", async () => {
    const a = marker();
    await mount(makeRegistry([guard("a", a)]).registry);
    pointingAt(a);

    await click(pickButton());
    await clickDocument();
    assert.strictEqual(pickedRows().length, 1, "the row picked");

    pointingAt(null);
    await click(pickButton());
    assert.include(pickButton().textContent ?? "", "picking —", "picking again");
    assert.strictEqual(pickedRows().length, 0, "the pick dropped on entering");

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    assert.strictEqual(pickButton().textContent, "pick a control on the page");
    assert.strictEqual(pickedRows().length, 0, "not restored on leaving");
  });

  it("a pick whose guard unmounted marks no row, and the guard mounted in its place is not marked", async () => {
    const a = marker();
    const b = marker();
    const double = makeRegistry([guard("a", a)]);
    await mount(double.registry);
    pointingAt(a);

    await click(pickButton());
    await clickDocument();
    assert.strictEqual(pickedRows().length, 1, "the row picked");

    await act(async () => {
      double.remove("a");
    });
    await act(async () => {
      double.add(guard("b", b));
    });
    assert.strictEqual(screen.queryAllByTestId("qadi-instance").length, 1, "one guard listed");
    assert.strictEqual(pickedRows().length, 0, "no row marked");
  });

  it("a switch to the log while picking ends picking and leaves no listener", async () => {
    const a = marker();
    let pressed = 0;
    a.addEventListener("click", () => {
      pressed += 1;
    });
    await mount(makeRegistry([guard("a", a)]).registry);
    pointingAt(null);

    await click(pickButton());
    await toLog();
    pointingAt(a);
    await act(async () => {
      a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    assert.strictEqual(pressed, 1, "the click went through on the log");

    pointingAt(null);
    await toReact();
    assert.strictEqual(pickButton().textContent, "pick a control on the page");
  });
});
