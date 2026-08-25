"use client";
/**
 * Hydration against a copy of the atom set, run in front of you.
 *
 * Deliberately calls `hydrateDecisions` a second time — the page's `Providers`
 * already hydrated correctly — because the two results side by side are the
 * demonstration: same payload, same subject, one object registered and one not.
 *
 * `useState` with an initialiser rather than a bare call in the render body, so
 * the drop is reported once for this component rather than on every re-render.
 */
import { useState } from "react";
import { makeSubject } from "@qadi/core";
import { hydrateDecisions } from "@qadi/react";
import type { DehydratedDecisions, HydrationDrop } from "@qadi/react";
import { atoms } from "./atoms.ts";
import { card, mono, muted, pre } from "../ui/theme.ts";

export interface UnregisteredProps {
  readonly payload: DehydratedDecisions;
  readonly subjectId: string;
}

export const Unregistered = ({ payload, subjectId }: UnregisteredProps) => {
  const [result] = useState(() => {
    const subject = makeSubject({ id: subjectId });
    const drops: Array<HydrationDrop<unknown>> = [];
    const note = (drop: HydrationDrop<unknown>) => drops.push(drop);

    // The real atom set, registered by `makeQadiAtoms`.
    const registered = Array.from(hydrateDecisions(atoms, payload, subject, { onDropped: note }));

    // A faithful copy. Every property is the same value; the object is not.
    const copy = { ...atoms };
    const foreign = Array.from(hydrateDecisions(copy, payload, subject, { onDropped: note }));

    return {
      registeredCount: registered.length,
      foreignCount: foreign.length,
      drops: drops.map((drop) => `${drop.reason} × ${drop.entries.length}`),
      sameProperties: Object.keys(copy).length === Object.keys(atoms).length,
    };
  });

  return (
    <div style={card} data-testid="unregistered-result">
      <ul style={{ ...mono, margin: 0, paddingLeft: "1.1rem" }}>
        <li>
          the registered atom set seeded{" "}
          <strong data-testid="registered-count">{result.registeredCount}</strong> value(s)
        </li>
        <li>
          a copy of it seeded{" "}
          <strong data-testid="foreign-count">{result.foreignCount}</strong> value(s)
        </li>
        <li>
          the copy has the same properties: <strong>{String(result.sameProperties)}</strong>
        </li>
      </ul>
      <p style={{ ...muted, margin: "0.6rem 0 0.3rem" }}>drops reported by the two calls:</p>
      <pre style={pre} data-testid="unregistered-drops">
        {result.drops.length === 0 ? "none" : result.drops.join("\n")}
      </pre>
    </div>
  );
};
