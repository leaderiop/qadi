/**
 * Declarative guards.
 *
 * These render nothing of their own; they choose between the nodes they are
 * given. All the state lives in the atoms.
 */
import type { Policy, Resource } from "@guard/core";
import { isAllowed } from "@guard/core";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { ReactNode } from "react";
import { useDecision } from "./hooks.ts";

export interface CanProps {
  readonly policy: Policy;
  /** The resource under consideration, if the policy inspects one. */
  readonly resource?: Resource;
  /** Rendered when the policy denies. */
  readonly fallback?: ReactNode;
  /** Rendered while the decision is not yet known. */
  readonly pending?: ReactNode;
  /**
   * Rendered when the decision could not be determined at all.
   *
   * Defaults to `fallback`, so the interface fails closed. That default is
   * safe but lossy — an outage and a denial look identical to the user. Supply
   * this to tell them apart, or use `useDecision` and handle the failure.
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
  const result = useDecision(policy, resource);
  // `waiting` is checked before the failure branch on purpose: a decision being
  // re-checked is not yet an answer, whichever answer it held before.
  if (AsyncResult.isInitial(result) || result.waiting) return pending;
  if (AsyncResult.isFailure(result)) return failure ?? fallback;
  return isAllowed(result.value) ? children : fallback;
};

export interface CannotProps {
  readonly policy: Policy;
  readonly resource?: Resource;
  readonly pending?: ReactNode;
  readonly failure?: ReactNode;
  readonly children: ReactNode;
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
  const result = useDecision(policy, resource);
  if (AsyncResult.isInitial(result) || result.waiting) return pending;
  if (AsyncResult.isFailure(result)) return failure;
  return isAllowed(result.value) ? null : children;
};
