/**
 * The lens — every DOM call the devtools make into a guarded page.
 *
 * happy-dom performs **no layout**, so every rect it reports is zero. That is a
 * real limit and it shapes this file: what is asserted here is the *plumbing* —
 * which elements are found, what is drawn, what is cleaned up, and which
 * instance a point resolves to — and never a measured pixel. A test asserting a
 * height would pass for a lens that measured the wrong element.
 *
 * `boxOf` is exercised against a stub whose `getBoundingClientRect` returns
 * numbers, which is the only way to assert the arithmetic without a browser.
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach } from "vitest";
import {
  boxOf,
  boxesOf,
  clearLens,
  drawLens,
  gateIdAt,
  isMeasurable,
} from "../../src/react/Lens.ts";
import type { GateBox } from "../../src/react/Lens.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const box = (fields: Partial<GateBox>): GateBox => ({
  id: "g1",
  top: 0,
  left: 0,
  width: 10,
  height: 10,
  empty: false,
  ...fields,
});

/**
 * A marker whose contents measure to a known rect.
 *
 * The `Range` is what production measures, and happy-dom's returns zeros, so
 * the rect is stubbed on the range prototype for the arithmetic tests only.
 */
const measuring = (rect: { top: number; left: number; width: number; height: number }) => {
  const element = document.createElement("span");
  document.body.appendChild(element);
  const original = Range.prototype.getBoundingClientRect;
  Range.prototype.getBoundingClientRect = () =>
    ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect;
  return { element, restore: () => { Range.prototype.getBoundingClientRect = original; } };
};

describe("isMeasurable", () => {
  it("accepts an element", () => {
    assert.isTrue(isMeasurable(document.createElement("span")));
  });

  it("rejects the absent element a hook carries", () => {
    // A hook has no node of its own, so this is the ordinary case rather than
    // a fault — the lens must skip it, not throw on it.
    assert.isFalse(isMeasurable(undefined));
    assert.isFalse(isMeasurable(null));
  });

  it("rejects a value that merely looks like one", () => {
    assert.isFalse(isMeasurable({ ownerDocument: null }));
    assert.isFalse(isMeasurable("span"));
  });
});

describe("boxOf", () => {
  it("measures the marker's CONTENTS, not the marker", () => {
    // The property the whole design rests on: `display: contents` generates no
    // box, so `element.getBoundingClientRect()` is zeros. A lens built on that
    // would draw every overlay in the top-left corner.
    const stub = measuring({ top: 40, left: 20, width: 100, height: 30 });
    try {
      const found = boxOf("g1", stub.element);
      assert.strictEqual(found?.top, 40);
      assert.strictEqual(found?.left, 20);
      assert.strictEqual(found?.width, 100);
      assert.strictEqual(found?.height, 30);
      assert.isFalse(found?.empty);
    } finally {
      stub.restore();
    }
  });

  it("adds scroll offsets, so a box stays with its element", () => {
    const stub = measuring({ top: 10, left: 5, width: 1, height: 1 });
    const view = window;
    const scrollX = Object.getOwnPropertyDescriptor(view, "scrollX");
    const scrollY = Object.getOwnPropertyDescriptor(view, "scrollY");
    Object.defineProperty(view, "scrollX", { value: 100, configurable: true });
    Object.defineProperty(view, "scrollY", { value: 200, configurable: true });

    try {
      const found = boxOf("g1", stub.element);
      // Document coordinates, which is the frame `position: absolute` uses.
      assert.strictEqual(found?.top, 210);
      assert.strictEqual(found?.left, 105);
    } finally {
      if (scrollX !== undefined) Object.defineProperty(view, "scrollX", scrollX);
      if (scrollY !== undefined) Object.defineProperty(view, "scrollY", scrollY);
      stub.restore();
    }
  });

  it("REPORTS A GUARD THAT RENDERED NOTHING, rather than skipping it", () => {
    // The case the lens exists for. A zero-area rect is a place with no thing
    // in it, and pointing at it is the answer to "why is this button missing".
    const stub = measuring({ top: 12, left: 8, width: 0, height: 0 });
    try {
      const found = boxOf("g1", stub.element);
      assert.isTrue(found?.empty);
      assert.strictEqual(found?.top, 12);
    } finally {
      stub.restore();
    }
  });
});

describe("boxesOf", () => {
  it("skips the instances it cannot measure", () => {
    const element = document.createElement("span");
    document.body.appendChild(element);

    const boxes = boxesOf([
      { id: "a", element },
      { id: "b" },
      { id: "c", element: undefined },
    ]);
    assert.deepStrictEqual(
      boxes.map((one) => one.id),
      ["a"],
    );
  });

  it("measures nothing for an empty list", () => {
    assert.deepStrictEqual(boxesOf([]), []);
  });
});

describe("drawLens", () => {
  it("draws one overlay per box", () => {
    drawLens(document, [box({ id: "a" }), box({ id: "b" })]);
    assert.strictEqual(document.querySelectorAll("[data-qadi-lens]").length, 2);
  });

  it("never intercepts the page's own input", () => {
    // A lens that swallowed a click would change what it is debugging.
    drawLens(document, [box({})]);
    const overlay = document.querySelector("[data-qadi-lens]");
    assert.include(overlay?.getAttribute("style") ?? "", "pointer-events:none");
  });

  it("is scenery, so it is hidden from assistive technology", () => {
    drawLens(document, [box({})]);
    assert.strictEqual(
      document.querySelector("[data-qadi-lens]")?.getAttribute("aria-hidden"),
      "true",
    );
  });

  it("gives an empty guard a caret rather than a zero-sized box", () => {
    // A 0×0 overlay draws nothing at all, which would report "found it" and
    // show the reader the same blank space they were already looking at.
    drawLens(document, [box({ width: 0, height: 0, empty: true })]);
    const style = document.querySelector("[data-qadi-lens]")?.getAttribute("style") ?? "";

    assert.include(style, "width:2px");
    assert.include(style, "height:16px");
    // Distinguished by colour too: this is not the same finding as a box.
    assert.include(style, "border-left");
  });

  it("REPLACES what it drew before, rather than stacking", () => {
    drawLens(document, [box({ id: "a" }), box({ id: "b" })]);
    drawLens(document, [box({ id: "c" })]);

    const overlays = [...document.querySelectorAll("[data-qadi-lens]")];
    assert.strictEqual(overlays.length, 1);
    assert.strictEqual(overlays[0]?.getAttribute("data-qadi-lens"), "c");
  });

  it("clears with an empty list, so there is no separate teardown to forget", () => {
    drawLens(document, [box({})]);
    drawLens(document, []);
    assert.strictEqual(document.querySelectorAll("[data-qadi-lens]").length, 0);
  });

  it("positions in document coordinates", () => {
    drawLens(document, [box({ top: 40, left: 20, width: 100, height: 30 })]);
    const style = document.querySelector("[data-qadi-lens]")?.getAttribute("style") ?? "";

    assert.include(style, "position:absolute");
    assert.include(style, "top:40px");
    assert.include(style, "left:20px");
  });
});

describe("clearLens", () => {
  it("removes every overlay", () => {
    drawLens(document, [box({ id: "a" }), box({ id: "b" })]);
    clearLens(document);
    assert.strictEqual(document.querySelectorAll("[data-qadi-lens]").length, 0);
  });

  it("leaves the page's own elements alone", () => {
    const own = document.createElement("div");
    own.id = "app";
    document.body.appendChild(own);

    drawLens(document, [box({})]);
    clearLens(document);
    assert.isNotNull(document.getElementById("app"));
  });

  it("is safe when nothing was drawn", () => {
    clearLens(document);
    assert.strictEqual(document.querySelectorAll("[data-qadi-lens]").length, 0);
  });
});

describe("gateIdAt", () => {
  /** happy-dom has no hit testing, so the point lookup is stubbed. */
  const pointingAt = (element: Element | null) => {
    const original = document.elementFromPoint;
    document.elementFromPoint = () => element;
    return () => {
      document.elementFromPoint = original;
    };
  };

  it("finds the guard the point is inside", () => {
    const marker = document.createElement("span");
    const child = document.createElement("button");
    marker.appendChild(child);
    document.body.appendChild(marker);

    const restore = pointingAt(child);
    try {
      assert.strictEqual(gateIdAt(document, 1, 1, [{ id: "g1", element: marker }]), "g1");
    } finally {
      restore();
    }
  });

  it("MATCHES BY IDENTITY, not by the data attribute", () => {
    // The attribute is for a person reading the DOM. Making it the lookup would
    // put a string contract between two packages that do not import each other,
    // which is the silent failure ADR-QD-052 was written about. An element
    // carrying the attribute but not registered must not be found.
    const impostor = document.createElement("span");
    impostor.setAttribute("data-qadi-gate", "g1");
    document.body.appendChild(impostor);

    const restore = pointingAt(impostor);
    try {
      assert.isUndefined(gateIdAt(document, 1, 1, [{ id: "g1", element: undefined }]));
    } finally {
      restore();
    }
  });

  it("picks the NEAREST guard where they nest", () => {
    // The innermost is what decided whether this control is here, and is what
    // a reader pointing at it means.
    const outer = document.createElement("div");
    const inner = document.createElement("span");
    const leaf = document.createElement("button");
    inner.appendChild(leaf);
    outer.appendChild(inner);
    document.body.appendChild(outer);

    const restore = pointingAt(leaf);
    try {
      assert.strictEqual(
        gateIdAt(document, 1, 1, [
          { id: "outer", element: outer },
          { id: "inner", element: inner },
        ]),
        "inner",
      );
    } finally {
      restore();
    }
  });

  it("finds nothing where the point is outside every guard", () => {
    const stray = document.createElement("p");
    document.body.appendChild(stray);

    const restore = pointingAt(stray);
    try {
      assert.isUndefined(gateIdAt(document, 1, 1, [{ id: "g1", element: document.createElement("span") }]));
    } finally {
      restore();
    }
  });

  it("finds nothing where the point hits nothing at all", () => {
    const restore = pointingAt(null);
    try {
      assert.isUndefined(gateIdAt(document, 1, 1, [{ id: "g1", element: document.body }]));
    } finally {
      restore();
    }
  });
});
