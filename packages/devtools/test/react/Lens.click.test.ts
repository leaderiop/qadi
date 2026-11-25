/**
 * Which guard a click was made on.
 *
 * A pointer click is placed by where the pointer was; a click that a keyboard made, on a
 * control with focus, reports no pointer at all, and a point read from it would land on
 * whatever sits at the page's corner. Such a click is placed by the element it was made
 * on. `Lens.test.ts` holds the point lookup this builds on, so the cells are here.
 *
 * happy-dom has no hit testing, so the point lookup is stubbed, as it is there.
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach } from "vitest";
import { gateIdOfClick } from "../../src/react/Lens.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const pointingAt = (element: Element | null) => {
  const original = document.elementFromPoint;
  document.elementFromPoint = () => element;
  return () => {
    document.elementFromPoint = original;
  };
};

/** A guard's marker holding a control, and a control beside it that no guard holds. */
const page = () => {
  const marker = document.createElement("span");
  const inside = document.createElement("button");
  marker.appendChild(inside);
  const outside = document.createElement("button");
  document.body.append(marker, outside);
  return { marker, inside, outside, instances: [{ id: "g1", element: marker }] };
};

/** A click at a fixed point, with the pointer reported or not. */
const clicked = (
  detail: number,
  target: EventTarget | null,
  instances: ReadonlyArray<{ readonly id: string; readonly element?: unknown }>,
) => gateIdOfClick(document, { detail, target, clientX: 3, clientY: 4 }, instances);

describe("gateIdOfClick", () => {
  it("a click that reports a pointer is placed by its coordinates, wherever its target is", () => {
    const { inside, outside, instances } = page();
    const restore = pointingAt(inside);
    try {
      assert.strictEqual(clicked(1, outside, instances), "g1");
      assert.strictEqual(clicked(2, document, instances), "g1");
    } finally {
      restore();
    }
    const away = pointingAt(outside);
    try {
      assert.isUndefined(clicked(1, inside, instances));
    } finally {
      away();
    }
  });

  it("a click with no pointer is placed by the element it was made on, not by a point", () => {
    const { marker, inside, outside, instances } = page();
    const restore = pointingAt(marker);
    try {
      assert.isUndefined(
        clicked(0, outside, instances),
        "a control no guard holds, under a point inside one",
      );
    } finally {
      restore();
    }
    const away = pointingAt(outside);
    try {
      assert.strictEqual(
        clicked(0, inside, instances),
        "g1",
        "a control a guard holds, under a point outside it",
      );
      assert.strictEqual(
        clicked(0, marker, instances),
        "g1",
        "the marker itself",
      );
    } finally {
      away();
    }
  });

  it("a click with no pointer and no element to name falls back to its coordinates", () => {
    const { inside, instances } = page();
    const restore = pointingAt(inside);
    try {
      assert.strictEqual(clicked(0, document, instances), "g1");
      assert.strictEqual(clicked(0, null, instances), "g1");
    } finally {
      restore();
    }
  });
});
