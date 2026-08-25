"use client";
/**
 * Where the server's answers become the browser's first frame.
 *
 * Three things happen here and the order matters:
 *
 * 1. `hydrateDecisions` turns the payload into `initialValues`. It is pure and
 *    synchronous, so it runs during render — including the **server** render of
 *    this client component, which is what puts an allowed control into the HTML
 *    rather than a pending one.
 * 2. `QadiProvider` seeds its registry at construction. Writing the subject in
 *    an effect afterwards would show every guard pending for one frame, which is
 *    the flash the seed exists to prevent.
 * 3. The client re-checks, and its own answer replaces the seed the moment it
 *    has one. A seed is a cache; it is not an authorization
 *    ([ADR-QD-017](../../../../spec/decisions/017-stale-decisions-are-not-decisions.md)).
 *
 * `useState` with an initialiser, not `useMemo`: React may discard and recompute
 * a `useMemo`, and re-seeding a registry that has since been overwritten by the
 * client's own decisions would resurrect the server's. The registry is built
 * once from these values and never re-seeded, so computing them twice would be
 * wasted at best and wrong at worst.
 */
import { useState, type ReactNode } from "react";
import type { AuthSubject } from "@qadi/core";
import { hydrateDecisions, QadiProvider } from "@qadi/react";
import type { DehydratedDecisions, HydrationDrop } from "@qadi/react";
import { atoms } from "./atoms.ts";

export interface DropNotice {
  readonly reason: string;
  readonly count: number;
}

export interface ProvidersProps {
  readonly subject: AuthSubject;
  readonly payload: DehydratedDecisions;
  /** Turns on the gate registry and the marker spans the lens measures. */
  readonly instrument?: boolean;
  readonly children: ReactNode;
}

/**
 * Every drop this page saw, for the routes that exist to cause one.
 *
 * Module scope rather than state, because `hydrateDecisions` runs during render
 * and setting state from a render is not allowed. The dock reads this through a
 * subscription like it reads everything else.
 */
const drops: Array<DropNotice> = [];
const listeners = new Set<() => void>();
let snapshot: ReadonlyArray<DropNotice> = [];

export const subscribeDrops = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const dropSnapshot = (): ReadonlyArray<DropNotice> => snapshot;

const noteDrop = (drop: HydrationDrop<unknown>): void => {
  drops.push({ reason: drop.reason, count: drop.entries.length });
  snapshot = [...drops];
  // Deferred, because this runs inside a render pass: notifying a subscriber
  // synchronously would have the dock setting state while this tree is still
  // rendering.
  queueMicrotask(() => {
    for (const listener of listeners) listener();
  });
};

export const Providers = ({ subject, payload, instrument = false, children }: ProvidersProps) => {
  // A supplied reporter replaces the development-mode console warning and runs
  // in production. Wanted here: the routes under `/edge` exist to make a drop
  // happen, and a drop nobody can see is exactly the defect BEH-QD-230 was
  // written about.
  const [initialValues] = useState(() =>
    Array.from(hydrateDecisions(atoms, payload, subject, { onDropped: noteDrop }))
  );

  return (
    <QadiProvider
      atoms={atoms}
      subject={subject}
      initialValues={initialValues}
      instrument={instrument}
    >
      {children}
    </QadiProvider>
  );
};
