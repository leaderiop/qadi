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
 * **The drops are per render, not module scope**, and that is a correction. They
 * were collected into a module-level array, which on a server is shared by every
 * request the process handles — so one visitor's `PayloadSubjectMismatch`
 * appeared in the next visitor's HTML, on a page that had had no such thing
 * happen to it. Module scope on a server is request-shared state; it is the same
 * lesson `processGlobal.ts` records from the other direction.
 *
 * `useState` with an initialiser, not `useMemo`: React may discard and recompute
 * a `useMemo`, and re-running hydration against a registry the client has since
 * overwritten with its own decisions would resurrect the server's.
 */
import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthSubject } from "@qadi/core";
import { hydrateDecisions, QadiProvider } from "@qadi/react";
import type { DehydratedDecisions } from "@qadi/react";
import { atoms } from "./atoms.ts";

export interface DropNotice {
  readonly reason: string;
  readonly count: number;
}

/**
 * What hydration refused to seed on **this** render.
 *
 * A context rather than a store, because it is a property of one hydration and
 * never changes afterwards: `hydrateDecisions` runs once per provider and
 * everything it refused, it refused then.
 */
const DropContext = createContext<ReadonlyArray<DropNotice>>([]);

export const useDrops = (): ReadonlyArray<DropNotice> => useContext(DropContext);

export interface ProvidersProps {
  readonly subject: AuthSubject;
  readonly payload: DehydratedDecisions;
  /** Turns on the gate registry and the marker spans the lens measures. */
  readonly instrument?: boolean;
  readonly children: ReactNode;
}

export const Providers = ({ subject, payload, instrument = false, children }: ProvidersProps) => {
  // A supplied reporter replaces the development-mode console warning and runs
  // in production. Wanted here: the routes under `/edge` exist to make a drop
  // happen, and a drop nobody can see is the defect BEH-QD-230 was written about.
  const [{ initialValues, drops }] = useState(() => {
    const captured: Array<DropNotice> = [];
    const values = Array.from(
      hydrateDecisions(atoms, payload, subject, {
        onDropped: (drop) => captured.push({ reason: drop.reason, count: drop.entries.length }),
      }),
    );
    return { initialValues: values, drops: captured };
  });

  return (
    <DropContext.Provider value={drops}>
      <QadiProvider
        atoms={atoms}
        subject={subject}
        initialValues={initialValues}
        instrument={instrument}
      >
        {children}
      </QadiProvider>
    </DropContext.Provider>
  );
};
