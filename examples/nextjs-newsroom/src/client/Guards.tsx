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
import type { Policy, Resource } from "@qadi/core";
import type { DeniedNode } from "@qadi/react";
import { Can, outcomeOf, useDecision } from "@qadi/react";
import { badge, card, mono, muted } from "../ui/theme.ts";

/**
 * A guard, and a label saying which of the five states it is in.
 *
 * `outcomeOf`, never `AsyncResult.isSuccess`: a result that is `waiting`
 * carries the *previous* decision, and for authorization that staleness is an
 * over-permission however brief. Reading the result directly is how a stale
 * allow gets rendered
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
  // The five states come from `@qadi/react`'s own `outcomeOf` — the same read
  // the gate registry records and the devtools React panel displays — so this
  // page and that panel compare like with like by construction, not by a copy
  // kept in step.
  const state = outcomeOf(useDecision(policy, resource))._tag;

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
  readonly denied?: DeniedNode;
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
