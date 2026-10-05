import "server-only";
/**
 * One of each, per process — and why module scope is not enough.
 *
 * **A Route Handler and a Server Component are different module graphs.**
 * Measured on Next 16.3, not assumed: two pages visiting the same module-scope
 * counter see it climb together, and `app/api/[[...route]]/route.ts` sees a
 * different one entirely. A decision log declared at module scope in
 * `layer.ts` therefore becomes *two* logs — the pages fill one, and
 * `/__decisions` streams the other. The symptom is a devtools panel that shows
 * the API's own guard checks and none of the page's decisions, which reads as a
 * transport bug and is not one.
 *
 * The remedy is the one every published Effect-and-Next recipe reaches for
 * without saying why: pin it to `globalThis`, which is genuinely per-process.
 * Those recipes use `globalValue` from `effect/GlobalValue` — a module Effect v4
 * does not ship — so this is that idea, written out and typed.
 *
 * It is also what makes the dev server survivable: Next re-evaluates module
 * graphs on every edit, and a fresh log per hot reload empties it for reasons
 * that have nothing to do with the code being edited. The log's slot is named
 * `log`, not the `ring`/`feed` slots an older build of this example used, so a
 * dev server hot-reloading across that change cannot hand back a stale object
 * of the old shape.
 *
 * The slots are declared rather than reached through a cast, so this costs one
 * `declare global` and no `as`.
 */
import type * as Layer from "effect/Layer";
import type { DecisionLog } from "@qadi/core";
import type * as Effect from "effect/Effect";
import type { PortCallLog } from "@qadi/devtools";

export interface PortCallCollector {
  readonly layer: Layer.Layer<never>;
  readonly snapshot: Effect.Effect<PortCallLog>;
}

interface Slots {
  /** The process's decision log: its sink, its backlog and its live stream. */
  log?: DecisionLog;
  portCalls?: PortCallCollector;
  /** Subjects whose standing `/edge/divergent` has revoked. */
  revoked?: Set<string>;
}

declare global {
  // eslint-disable-next-line no-var
  var __qadiNewsroom: Slots | undefined;
}

const slots = (): Slots => (globalThis.__qadiNewsroom ??= {});

export const logOnce = (make: () => DecisionLog): DecisionLog => (slots().log ??= make());
export const portCallsOnce = (make: () => PortCallCollector): PortCallCollector =>
  (slots().portCalls ??= make());
export const revokedOnce = (): Set<string> => (slots().revoked ??= new Set<string>());
