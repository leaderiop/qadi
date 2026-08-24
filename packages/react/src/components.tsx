"use client";
/**
 * Declarative guards.
 *
 * These render nothing of their own; they choose between the nodes they are
 * given. All the state lives in the atoms.
 */
import type { Deny, Policy, Resource } from "@qadi/core";
import { isAllowed } from "@qadi/core";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { useGate } from "./useGate.ts";

/**
 * The marker's style, and the whole reason a marker is affordable.
 *
 * `display: contents` makes the element generate **no box**: its children lay
 * out exactly as if it were not there, so wrapping every guard changes nothing
 * about flex, grid, margins or selectors that depend on adjacency. It is the one
 * way to put a handle in the tree without putting a box in the layout.
 *
 * The consequence is that the marker itself has no rect either — a caller
 * measuring one has to measure its *contents*, which is what
 * `@qadi/devtools`'s lens does with a `Range`.
 */
const MARKER: CSSProperties = { display: "contents" };

/**
 * Wraps what a guard rendered, so devtools can find it.
 *
 * Returns the node untouched when uninstrumented — not a wrapper with the
 * marker style, but no wrapper at all. Off has to mean *absent*, or every
 * consumer's DOM snapshots change the day this package is upgraded.
 *
 * The `data-` attribute is for a person reading the DOM in a browser inspector.
 * It is deliberately **not** how the lens finds the element — that goes through
 * the ref on the registry entry, because a string agreed between two packages
 * that do not import each other is the failure ADR-QD-052 has already paid for.
 */
const marked = (
  rendered: ReactNode,
  id: string,
  ref: RefObject<HTMLSpanElement | null> | undefined,
): ReactNode =>
  ref === undefined ? rendered : (
    <span ref={ref} style={MARKER} data-qadi-gate={id}>
      {rendered}
    </span>
  );

/**
 * A node, or a function of the denial that produced it.
 *
 * The function form exists because the guard is already holding the `Deny` —
 * with its reason and its whole trace — at the moment it decides to render
 * nothing, and used to discard it. "Why is this control not here?" was
 * therefore the one question the declarative API could not answer, and the
 * answer was one argument away. Render it with `renderTrace`.
 *
 * A plain node stays the common case: most fallbacks say nothing about the
 * denial, and should not have to take one.
 */
export type DeniedNode = ReactNode | ((decision: Deny) => ReactNode);

const renderDenied = (node: DeniedNode, decision: Deny): ReactNode =>
  typeof node === "function" ? node(decision) : node;

export interface CanProps {
  readonly policy: Policy;
  /** The resource under consideration, if the policy inspects one. */
  readonly resource?: Resource;
  /** Rendered when the policy denies, given the denial when it asks for it. */
  readonly fallback?: DeniedNode;
  /** Rendered while the decision is not yet known. */
  readonly pending?: ReactNode;
  /**
   * Rendered when the decision could not be determined at all.
   *
   * Defaults to `fallback`, so the interface fails closed. That default is
   * safe but lossy — an outage and a denial look identical to the user. Supply
   * this to tell them apart, or use `useDecision` and handle the failure.
   *
   * The default does **not** apply when `fallback` is a function: there is no
   * denial to hand it, and a fallback written to explain one would describe a
   * refusal that never happened. A function fallback with no `failure` renders
   * nothing, which is still closed. This is INV-QD-006 at the component layer —
   * failure is not denial.
   */
  readonly failure?: ReactNode;
  readonly children: ReactNode;
}

/** Renders `children` when the policy allows. */
export const Can = ({
  policy,
  resource,
  fallback = null,
  pending = null,
  failure,
  children,
}: CanProps): ReactNode => {
  const { result, id, ref } = useGate("Can", policy, resource);
  // `waiting` is checked before the failure branch on purpose: a decision being
  // re-checked is not yet an answer, whichever answer it held before.
  //
  // The branching is unchanged and the marker wraps whatever came out of it,
  // including `null`. That is the case the lens exists for: a guard that
  // rendered nothing still says *where* the nothing is, which is the whole of
  // "why is this button missing".
  return marked(chosen(result, children, fallback, pending, failure), id, ref);
};

const chosen = (
  result: ReturnType<typeof useGate>["result"],
  children: ReactNode,
  fallback: DeniedNode,
  pending: ReactNode,
  failure: ReactNode,
): ReactNode => {
  if (AsyncResult.isInitial(result) || result.waiting) return pending;
  if (AsyncResult.isFailure(result)) {
    return failure ?? (typeof fallback === "function" ? null : fallback);
  }
  const decision = result.value;
  return isAllowed(decision) ? children : renderDenied(fallback, decision);
};

export interface CannotProps {
  readonly policy: Policy;
  readonly resource?: Resource;
  readonly pending?: ReactNode;
  readonly failure?: ReactNode;
  /** Rendered when the policy denies, given the denial when it asks for it. */
  readonly children: DeniedNode;
}

/**
 * Renders `children` when the policy denies.
 *
 * A failure renders `failure`, and `null` if none is given — not `children`.
 * "We could not determine whether you may edit this" is not grounds for
 * showing the you-may-not-edit-this notice.
 */
export const Cannot = ({
  policy,
  resource,
  pending = null,
  failure = null,
  children,
}: CannotProps): ReactNode => {
  const { result, id, ref } = useGate("Cannot", policy, resource);
  return marked(refused(result, children, pending, failure), id, ref);
};

const refused = (
  result: ReturnType<typeof useGate>["result"],
  children: DeniedNode,
  pending: ReactNode,
  failure: ReactNode,
): ReactNode => {
  if (AsyncResult.isInitial(result) || result.waiting) return pending;
  if (AsyncResult.isFailure(result)) return failure;
  const decision = result.value;
  return isAllowed(decision) ? null : renderDenied(children, decision);
};
