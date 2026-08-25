"use client";
/**
 * The guarded controls, and the four states a guard can be in.
 *
 * Every one of these reads a **seeded** atom on its first frame and this
 * client's own answer thereafter. The `data-state` attributes exist so the
 * end-to-end tests can assert what was in the HTML *before* any JavaScript ran,
 * which is the only honest way to test "no flash".
 */
import type { ReactNode } from "react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { Deny, Policy, Resource } from "@qadi/core";
import { Can, useDecision } from "@qadi/react";
import { currentDecision } from "@qadi/react";
import { badge, card, mono, muted } from "../ui/theme.ts";

/**
 * A guard, and a label saying which of the four states it is in.
 *
 * `currentDecision`, never `AsyncResult.isSuccess`: a result that is `waiting`
 * carries the *previous* decision, and for authorization that staleness is an
 * over-permission however brief. This is the single place that rule lives in a
 * consumer, and reading the result directly is how a stale allow gets rendered
 * ([ADR-QD-017](../../../../spec/decisions/017-stale-decisions-are-not-decisions.md)).
 */
export const GateState = ({
  policy,
  resource,
  label,
}: {
  readonly policy: Policy;
  readonly resource?: Resource;
  readonly label: string;
}) => {
  const result = useDecision(policy, resource);

  // The same five states, in the same order, as `@qadi/react`'s internal
  // `renderStateOf` — the one the gate registry records and the devtools React
  // panel displays. Written out rather than imported because `useGate.ts` is
  // deliberately out of the barrel; kept identical so a reader comparing this
  // page to that panel is comparing like with like.
  //
  // The **order** is the substance. `isInitial` first, so a question being
  // asked for the first time reads *Pending* rather than *Rechecking*; `waiting`
  // before `isFailure`, so a re-check in flight never renders the previous
  // answer. `currentDecision` enforces the same thing for the value.
  const decision = currentDecision(result);
  const state = AsyncResult.isInitial(result)
    ? "Pending"
    : result.waiting
    ? "Rechecking"
    : AsyncResult.isFailure(result)
    ? "Failed"
    : decision === undefined
    ? "Pending"
    : decision._tag === "Allow"
    ? "Allowed"
    : "Denied";

  return (
    <span style={{ ...mono, marginRight: "1rem" }} data-testid={`state-${label}`} data-state={state}>
      <span
        style={badge(
          state === "Allowed" ? "allow" : state === "Denied" || state === "Failed" ? "deny" : "pending",
        )}
      >
        {state}
      </span>{" "}
      {label}
    </span>
  );
};

export interface GuardedProps {
  readonly policy: Policy;
  readonly resource?: Resource;
  readonly testId: string;
  readonly children: ReactNode;
  /** Rendered instead when the answer is no. Given the denial, so it can say why. */
  readonly denied?: ReactNode | ((decision: Deny) => ReactNode);
}

/**
 * `<Can>`, with every branch supplied.
 *
 * `pending` and `failure` are distinct from `fallback` on purpose: *not decided
 * yet*, *could not be decided*, and *decided no* are three different facts, and
 * collapsing them into a boolean is what makes an attribute-store outage look
 * like a permissions problem.
 */
export const Guarded = ({ policy, resource, testId, children, denied }: GuardedProps) => (
  <Can
    policy={policy}
    // Spread, not `resource={resource}`. `CanProps.resource` is declared
    // `resource?: Resource` rather than `resource?: Resource | undefined`, so a
    // consumer compiling with `exactOptionalPropertyTypes` — as this example
    // does, and as the library itself does — cannot pass an explicit
    // `undefined` through. Forwarding an optional prop therefore needs a
    // conditional spread at every hop. Noted in the README.
    {...(resource === undefined ? {} : { resource })}
    pending={
      <span style={{ ...mono, color: "#8a7c2f" }} data-testid={`${testId}-pending`}>
        deciding…
      </span>
    }
    failure={
      <span style={{ ...mono, color: "#a4303f" }} data-testid={`${testId}-failure`}>
        could not decide — this is an outage, not a denial
      </span>
    }
    fallback={denied ?? (
      <span style={{ ...mono, color: "#6b6560" }} data-testid={`${testId}-denied`}>
        not available to you
      </span>
    )}
  >
    <span data-testid={testId}>{children}</span>
  </Can>
);

/** A read-only field list, for showing what a projection left behind. */
export const Fields = ({
  title,
  value,
}: {
  readonly title: string;
  readonly value: Readonly<Record<string, unknown>>;
}) => (
  <div style={card}>
    <div style={{ ...mono, marginBottom: 4 }}>{title}</div>
    {Object.keys(value).length === 0
      ? <p style={muted}>nothing — the projection removed every field</p>
      : (
        <ul style={{ ...mono, margin: 0, paddingLeft: "1.1rem" }}>
          {Object.entries(value).map(([key, entry]) => (
            <li key={key}>
              {key}: {typeof entry === "string" ? entry : JSON.stringify(entry)}
            </li>
          ))}
        </ul>
      )}
  </div>
);
