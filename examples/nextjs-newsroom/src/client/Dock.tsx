"use client";
/**
 * The dock, with every prop supplied.
 *
 * `DevtoolsDockProps` has twelve optional fields and a dock mounted with none of
 * them still renders every tab — each empty screen saying why it is empty
 * ([BEH-QD-218](../../../../spec/behaviors/28-devtools-screens.md)). That is the
 * right default and it is not what this example is for: the point here is to
 * wire all twelve, because the wiring is the part no unit test can prove and the
 * part a reader actually has to copy.
 *
 * **The source is two sources.** The server's decisions arrive over SSE from
 * `/api/__decisions`; the browser's own come from an in-process feed. They carry
 * one `evaluationId` — the client's re-check continues the server's evaluation
 * rather than starting an unrelated one — so merging them is what makes the log
 * show them as a pair rather than as two unrelated rows in two panels.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import * as Effect from "effect/Effect";
import { resolveRoleGraph } from "@qadi/core";
import type { Role } from "@qadi/core";
import {
  hydrationActivity,
  mergeSources,
  portActivity,
  sourceFromEventSource,
  sourceFromFeed,
  wiringReport,
} from "@qadi/devtools";
import type { HydrationActivity, PortActivity, PortCallLog, WiringReport } from "@qadi/devtools";
import { DevtoolsDock } from "@qadi/devtools/react";
import { gateInstances, subscribeGates, useInvalidate } from "@qadi/react";
import { catalogue } from "../domain/policies.ts";
import { allRoles } from "../domain/roles.ts";
import {
  atoms,
  clientFeed,
  clientPortCalls,
  clientRing,
  mismatchSnapshot,
  subscribeMismatches,
} from "./atoms.ts";
import { browserPorts } from "./ports.ts";
import { useDrops } from "./Providers.tsx";

/**
 * Both halves of this deployment's decisions, in one timeline.
 *
 * Built once at module scope: `useTimeline` holds its source by identity, and a
 * fresh one per render would re-subscribe — reopening the `EventSource` on every
 * keystroke in the dock's filter box.
 */
const source = mergeSources([
  sourceFromEventSource({
    url: "/api/__decisions",
    environment: "Server",
    withCredentials: true,
    // A frame that does not decode is one row lost, never the stream. The panel
    // is what you are looking at when something is already wrong.
    onMalformed: (frame, reason) => {
      console.warn(`qadi: dropped a ${reason} frame`, frame.slice(0, 120));
    },
  }),
  sourceFromFeed({
    stream: clientFeed.stream,
    environment: "Client",
    backlog: clientRing.snapshot,
  }),
]);

/** Parent names `resolveRoleGraph` could not resolve. Collected once. */
const unknownParents: Array<string> = [];
const roles: ReadonlyArray<Role> = allRoles;
void Effect.runSync(
  resolveRoleGraph(
    allRoles.map((role) => ({
      name: role.name,
      permissions: [...role.permissions],
      inherits: role.inherits.map((parent) => parent.name),
    })),
    { onUnknownParent: (names) => unknownParents.push(...names) },
  ).pipe(Effect.catchTag("CircularRoleInheritance", () => Effect.succeed([]))),
);

/**
 * Re-read on a timer.
 *
 * `wiringReport`, `portActivity` and `hydrationActivity` are pull-based: they
 * read the metric registry and the context rather than pushing. A subscription
 * would need the library to publish on every port call, which is a cost every
 * production deployment would pay for a panel almost nobody has open. Two
 * seconds is a debug affordance's refresh rate.
 */
const useSampled = <A,>(read: Effect.Effect<A>, everyMillis = 2_000): A | undefined => {
  const [value, setValue] = useState<A | undefined>(undefined);
  useEffect(() => {
    const sample = () => setValue(Effect.runSync(read));
    sample();
    const timer = setInterval(sample, everyMillis);
    return () => clearInterval(timer);
  }, [read, everyMillis]);
  return value;
};

export const Dock = () => {
  const invalidate = useInvalidate();

  const gates = useSyncExternalStore(subscribeGates, gateInstances, gateInstances);
  const mismatches = useSyncExternalStore(
    subscribeMismatches,
    mismatchSnapshot,
    mismatchSnapshot,
  );
  // Read from the provider above this one, so it is this render's drops and
  // never another request's.
  const drops = useDrops();

  const wiring: WiringReport | undefined = useSampled(
    useMemo(() => Effect.provide(wiringReport, browserPorts), []),
  );
  const activity: ReadonlyArray<PortActivity> | undefined = useSampled(portActivity);
  const hydration: HydrationActivity | undefined = useSampled(hydrationActivity);
  const [portCalls, setPortCalls] = useState<PortCallLog | undefined>(undefined);

  useEffect(() => {
    const sample = () => setPortCalls(Effect.runSync(clientPortCalls.snapshot));
    sample();
    const timer = setInterval(sample, 2_000);
    return () => clearInterval(timer);
  }, []);

  // Questions are read off the atom set rather than subscribed to, for the
  // reason `asked()` documents: the list only grows, and a panel that re-rendered
  // on every question would re-render on every guard's first mount.
  const questions = atoms.asked();

  const onInvalidate = useCallback(() => {
    invalidate();
  }, [invalidate]);

  return (
    <>
      {drops.length > 0
        ? (
          <p data-testid="hydration-drops" style={{ fontFamily: "monospace", fontSize: 12 }}>
            hydration dropped:{" "}
            {drops.map((drop) => `${drop.reason}×${drop.count}`).join(", ")}
          </p>
        )
        : null}
      <DevtoolsDock
        source={source}
        catalogue={{ policies: catalogue, roles }}
        {...(wiring === undefined ? {} : { wiring })}
        activity={activity ?? []}
        {...(portCalls === undefined ? {} : { portCalls })}
        questions={questions}
        gates={gates}
        unknownParents={unknownParents}
        {...(hydration === undefined ? {} : { hydration })}
        hydrationMismatches={mismatches.length}
        onInvalidate={onInvalidate}
        ports={browserPorts}
      />
    </>
  );
};

export default Dock;
