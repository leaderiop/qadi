"use client";
/**
 * The dock, wired the way a host would copy it.
 *
 * `DevtoolsDockProps` has fifteen optional fields and a dock mounted with none
 * of them still renders every tab — each empty screen saying why it is empty
 * ([BEH-QD-218](../../../../spec/behaviors/28-devtools-screens.md)). That is the
 * right default and it is not what this example is for: the point here is to
 * wire the ones a host supplies — `source`, `catalogue`, `diagnostics`, `gates`,
 * `unknownParents`, `hydrationMismatches`, `onInvalidate` and `ports` — because
 * the wiring is the part no unit test can prove and the part a reader actually
 * has to copy. `capacity` has a sensible default. `wiring`, `activity`,
 * `portCalls`, `hydration` and `questions` are deliberately **not** passed:
 * they carry a reading taken *elsewhere* (another process, a fixture), and
 * `diagnostics` samples this one for the dock, so the host runs no loop of its
 * own.
 *
 * **The source is two sources.** The server's decisions arrive over SSE from
 * `/api/__decisions` — its backlog first, then live, each frame labelled by the
 * process that made it (`Server`, or `Edge` for a record the aggregator
 * ingested); the browser's own come from its in-process decision log, passed
 * as is. They carry one `evaluationId` — the client's re-check continues the
 * server's evaluation rather than starting an unrelated one — so merging them
 * is what makes the log show them as a pair rather than as two unrelated rows
 * in two panels. No environment is named here: each producer names its own.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import * as Effect from "effect/Effect";
import { permissionKey, resolveRoleGraph } from "@qadi/core";
import type { Role } from "@qadi/core";
import { mergeSources, sourceFromEventSource } from "@qadi/devtools";
import { DevtoolsDock } from "@qadi/devtools/react";
import type { DiagnosticsDockOptions } from "@qadi/devtools/react";
import { useGateInstances, useInvalidate, useSubject } from "@qadi/react";
import { catalogue } from "../domain/policies.ts";
import { readDevtools } from "../domain/permissions.ts";
import { allRoles } from "../domain/roles.ts";
import {
  atoms,
  browserLayer,
  clientLog,
  clientPortCalls,
  mismatchSnapshot,
  subscribeMismatches,
} from "./atoms.ts";
import { browserPorts } from "./ports.ts";
import { useDrops } from "./Providers.tsx";

/**
 * Both halves of this deployment's decisions, in one timeline.
 *
 * **Rebuilt when the subject changes, and only then.** `useTimeline` holds its
 * source by identity, so a fresh one per render would reopen the `EventSource`
 * on every keystroke in the filter box — but a source built *once* is worse in a
 * different way, and this example shipped that version first.
 *
 * `/__decisions` is guarded by a policy, so the connection is authorized as
 * whoever held the session when it opened. Open the page as a subject without
 * `devtools:read` and the stream is refused; switch to one who has it and the
 * connection is never retried, because nothing asked for a new one. The panel
 * then shows the browser's own decisions and none of the server's —
 * indistinguishable from the transport being broken, which is what it looked
 * like.
 */
const makeSource = () =>
  mergeSources([
    sourceFromEventSource({
      url: "/api/__decisions",
      withCredentials: true,
      // A frame that does not decode is one row lost, never the stream. The
      // panel is what you are looking at when something is already wrong.
      onMalformed: (frame, reason) => {
        console.warn(`qadi: dropped a ${reason} frame`, frame.slice(0, 120));
      },
    }),
    clientLog,
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
 * What the dock samples for the Services and React panels.
 *
 * The wiring report, the port activity and the hydration counts are pull-based:
 * they read the metric registry and the context rather than pushing, because a
 * subscription would need the library to publish on every port call, a cost
 * every production deployment would pay for a panel almost nobody has open.
 * The dock runs that pull on a two-second schedule, builds `layer` once while
 * it is mounted and keeps a reading's identity while nothing changed.
 *
 * `layer` is `browserLayer`, whose cache is built once at module scope
 * (`atoms.ts`), so the dock's own build of it reads **the atoms' cache**, not a
 * throwaway: a layer value built twice is two caches. `questions` is read off
 * the atom set on the same schedule rather than subscribed to, for the reason
 * `asked()` documents: the list changes whenever a question is first asked
 * or swept, and a panel that re-rendered on every question would re-render on
 * every guard's first mount. Every value is at
 * module scope, because the run restarts when one of them changes identity.
 */
export const diagnostics: DiagnosticsDockOptions = {
  layer: browserLayer,
  collector: clientPortCalls,
  questions: () => atoms.asked(),
};

export const Dock = () => {
  const invalidate = useInvalidate();
  const subject = useSubject();

  // One connection per session. `useSubject` comes from the provider above, so
  // this rebuilds exactly when the session the stream is authorized against
  // changes — and never on a re-render that changes nothing about it.
  const source = useMemo(makeSource, [subject?.id]);

  // Who is asking, from the provider's own registry — the one `atoms.asked()`
  // below belongs to, so the two halves of the Questions panel share a scope.
  const gates = useGateInstances();
  const mismatches = useSyncExternalStore(
    subscribeMismatches,
    mismatchSnapshot,
    mismatchSnapshot,
  );
  // Read from the provider above this one, so it is this render's drops and
  // never another request's.
  const drops = useDrops();

  const onInvalidate = useCallback(() => {
    invalidate();
  }, [invalidate]);

  // Said on screen, because otherwise its absence looks like a broken transport.
  // `/__decisions` is guarded by `canReadDevtools`, which only the chief editor
  // and the legal reviewer hold — there is deliberately no environment-variable
  // gate and no unguarded variant (BEH-QD-174), so a reader without the
  // permission sees their own browser's decisions and none of the server's.
  const mayReadServer = subject?.permissions.has(permissionKey(readDevtools)) ?? false;

  return (
    <>
      {mayReadServer ? null : (
        <p
          data-testid="server-feed-refused"
          style={{ fontFamily: "monospace", fontSize: 12, color: "#8a7c2f" }}
        >
          the Log below shows this browser&rsquo;s decisions only — `/__decisions` is guarded by
          `devtools:read`, which this subject does not hold. Switch to the chief editor or the legal
          reviewer to see the server&rsquo;s half and the pairs.
        </p>
      )}
      {drops.length > 0
        ? (
          <p data-testid="hydration-drops" style={{ fontFamily: "monospace", fontSize: 12 }}>
            hydration dropped:{" "}
            {drops.map((drop) => `${drop.reason}×${drop.count}`).join(", ")}
          </p>
        )
        : null}
      {/* The dock is fixed to the bottom 45vh of the viewport and sits above the
          page, so without room to scroll into, whatever a page renders in its
          lower half is under it and cannot be clicked — `/edge/double-count`'s
          button was, once the dock had mounted. A spacer as tall as the dock
          lets every element scroll clear of it. */}
      <div aria-hidden="true" style={{ height: "45vh" }} />
      <DevtoolsDock
        source={source}
        catalogue={{ policies: catalogue, roles }}
        diagnostics={diagnostics}
        gates={gates}
        unknownParents={unknownParents}
        hydrationMismatches={mismatches.length}
        onInvalidate={onInvalidate}
        ports={browserPorts}
      />
    </>
  );
};

export default Dock;
