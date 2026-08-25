"use client";
/**
 * Pointing at a guard on the page, in both directions.
 *
 * **Every DOM call in the devtools reach of `@qadi/react` is in this file.** The
 * guard package holds a ref React filled in and calls nothing; this measures it,
 * draws over it, and hit-tests it. Keeping that boundary in one named module is
 * the discipline `HydrationWarning.ts` applies to `console` and
 * `HydrationCounts.ts` to `Context.empty()` — a boundary with a file name stays
 * visible where one spread across a component tree dissolves.
 *
 * Two directions, and they are genuinely different features:
 *
 * - **highlight** — the panel names instances, the page shows where they are.
 * - **pick** — the page is pointed at, the panel selects the row.
 *
 * ## Why a `Range` and not `getBoundingClientRect`
 *
 * The marker is `display: contents`, which is what makes it free: it generates
 * **no box**, so it changes no layout. It also therefore has no rect of its own
 * — `marker.getBoundingClientRect()` returns zeros, and a lens built on that
 * would draw every box in the top-left corner. A `Range` over the element's
 * *contents* measures what is actually there, text nodes included.
 *
 * A guard that rendered nothing measures as a **zero-area rect at its insertion
 * point**, and that is not a failure to handle away: it is the answer to "why is
 * this button missing", which is where the control would have been.
 */

/** What the lens found for one instance. */
export interface GateBox {
  readonly id: string;
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
  /**
   * The guard rendered nothing, so there is a place but no thing.
   *
   * Reported rather than filtered: a caller drawing this needs to draw a caret
   * rather than a box, and a caller counting them needs to say "3 guards, 1
   * rendering nothing" instead of silently showing two.
   */
  readonly empty: boolean;
}

/**
 * Whether this is something the lens can measure.
 *
 * A type predicate rather than a cast: the model carries `element` as `unknown`
 * because a headless model has no business knowing what one is, and narrowing it
 * is this file's job. Duck-typed on the two methods actually used, so a test
 * double works and so a node from another document does too.
 */
export const isMeasurable = (value: unknown): value is Element =>
  typeof value === "object" &&
  value !== null &&
  "ownerDocument" in value &&
  "getBoundingClientRect" in value;

/**
 * Measures one marker, in document coordinates.
 *
 * Scroll offsets are added, so a box stays with its element when the page
 * scrolls under a fixed overlay. `position: absolute` on the overlay is what
 * makes that the right frame; `fixed` would want viewport coordinates and would
 * then need a scroll listener to stay correct.
 */
export const boxOf = (id: string, element: Element): GateBox | undefined => {
  const document = element.ownerDocument;
  const view = document.defaultView;
  if (view === null) return undefined;

  const range = document.createRange();
  range.selectNodeContents(element);
  const rect = range.getBoundingClientRect();

  return {
    id,
    top: rect.top + view.scrollY,
    left: rect.left + view.scrollX,
    width: rect.width,
    height: rect.height,
    empty: rect.width === 0 && rect.height === 0,
  };
};

/** Measures every instance that can be measured, skipping those that cannot. */
export const boxesOf = (
  instances: ReadonlyArray<{ readonly id: string; readonly element?: unknown }>,
): ReadonlyArray<GateBox> =>
  instances.flatMap((instance) => {
    if (!isMeasurable(instance.element)) return [];
    const box = boxOf(instance.id, instance.element);
    return box === undefined ? [] : [box];
  });

const OVERLAY_ATTRIBUTE = "data-qadi-lens";

const overlayStyle = (box: GateBox): string =>
  [
    "position:absolute",
    `top:${String(box.top)}px`,
    `left:${String(box.left)}px`,
    `width:${String(Math.max(box.width, box.empty ? 2 : 0))}px`,
    `height:${String(Math.max(box.height, box.empty ? 16 : 0))}px`,
    // Never intercepts a click. A lens that swallowed the page's own input
    // would be a debugging tool that changes what it is debugging.
    "pointer-events:none",
    "z-index:2147483000",
    "box-sizing:border-box",
    box.empty
      ? "border-left:2px solid #e3a008;background:rgba(227,160,8,0.25)"
      : "border:2px solid #4ea1ff;background:rgba(78,161,255,0.16)",
  ].join(";");

/**
 * Draws over the given boxes, replacing whatever was drawn before.
 *
 * Idempotent: calling it twice with the same boxes leaves the same overlays, and
 * calling it with `[]` is how a caller clears. There is no separate teardown to
 * forget, which matters because this is reachable from a React effect whose
 * cleanup ordering is not something a panel author should have to reason about.
 */
export const drawLens = (target: Document, boxes: ReadonlyArray<GateBox>): void => {
  clearLens(target);
  for (const box of boxes) {
    const overlay = target.createElement("div");
    overlay.setAttribute(OVERLAY_ATTRIBUTE, box.id);
    overlay.setAttribute("style", overlayStyle(box));
    // `aria-hidden`, because this is scenery. A screen reader announcing a
    // debugging overlay would make the tool actively worse for the user most
    // likely to be checking whether a control is reachable.
    overlay.setAttribute("aria-hidden", "true");
    target.body.appendChild(overlay);
  }
};

/** Removes every overlay this module drew. Safe to call when none exist. */
export const clearLens = (target: Document): void => {
  // `querySelectorAll` is static, so removing as we go cannot skip one. A live
  // `getElementsByTagName` here would need the copy the spread was making.
  for (const overlay of target.querySelectorAll(`[${OVERLAY_ATTRIBUTE}]`)) {
    overlay.remove();
  }
};

/**
 * The instance id of the nearest guard containing a point, or `undefined`.
 *
 * Matched by **element identity** against the markers the registry holds, not by
 * a `[data-qadi-gate]` selector. The attribute exists for a person reading the
 * DOM in a browser inspector; making it the lookup would put a string contract
 * between two packages that do not import each other, which is exactly the
 * silent-failure shape ADR-QD-052 was written about. An identity comparison
 * cannot drift, and it keeps working for a marker in another document.
 *
 * Walks **up** from the element under the pointer, so the nearest guard wins
 * where they nest — the innermost one is what decided whether *this* control is
 * here, and it is the one a reader means.
 */
export const gateIdAt = (
  target: Document,
  x: number,
  y: number,
  instances: ReadonlyArray<{ readonly id: string; readonly element?: unknown }>,
): string | undefined => {
  let node: Element | null = target.elementFromPoint(x, y);

  while (node !== null) {
    const current = node;
    const match = instances.find((instance) => instance.element === current);
    if (match !== undefined) return match.id;
    node = node.parentElement;
  }
  return undefined;
};
