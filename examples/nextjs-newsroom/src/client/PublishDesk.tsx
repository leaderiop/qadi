"use client";
/**
 * The publish desk, and the gap between the button and the check.
 *
 * The button's disabled state comes from a decision this browser holds. The
 * action's answer comes from a decision the server takes when it is called. They
 * agree here, and the reason they agree is that both asked the same policy —
 * not because one trusted the other.
 *
 * The action is invoked whether or not the button was enabled, which is what a
 * caller with a network tab would do anyway.
 */
import { useState, useTransition } from "react";
import type { Resource } from "@qadi/core";
import { useCan } from "@qadi/react";
import { publish } from "../server/actions.ts";
import type { ActionOutcome } from "../server/actions.ts";
import { canPublishArticle } from "../domain/policies.ts";
import { GateState } from "./Guards.tsx";
import { button, card, mono, muted } from "../ui/theme.ts";

export interface Target {
  readonly id: string;
  readonly title: string;
  readonly resource: Resource;
}

const Row = ({ target }: { readonly target: Target }) => {
  const allowed = useCan(canPublishArticle, target.resource);
  const [outcome, setOutcome] = useState<ActionOutcome | undefined>(undefined);
  const [pending, start] = useTransition();

  return (
    <div style={card} data-testid={`publish-${target.id}`}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <strong>{target.title}</strong>
        <GateState
          policy={canPublishArticle}
          resource={target.resource}
          label={`publish:${target.id}`}
        />
        <button
          type="button"
          style={{ ...button, opacity: allowed ? 1 : 0.5 }}
          disabled={pending}
          data-testid={`publish-button-${target.id}`}
          data-allowed={String(allowed)}
          // Not gated on `allowed`. The action decides; this only decides how it
          // looks. A button that refused to fire would be hiding the very thing
          // this page is about.
          onClick={() => start(() => void publish(target.id).then(setOutcome))}
        >
          {pending ? "publishing…" : "publish anyway"}
        </button>
      </div>
      {outcome === undefined
        ? <p style={{ ...muted, margin: "0.4rem 0 0" }}>the action has not been called yet</p>
        : (
          <p
            style={{ ...mono, margin: "0.4rem 0 0", color: outcome.ok ? "#1f7a4d" : "#a4303f" }}
            data-testid={`publish-outcome-${target.id}`}
            data-ok={String(outcome.ok)}
          >
            {outcome.message}
          </p>
        )}
    </div>
  );
};

export const PublishDesk = ({ targets }: { readonly targets: ReadonlyArray<Target> }) => (
  <>
    {targets.map((target) => <Row key={target.id} target={target} />)}
  </>
);
