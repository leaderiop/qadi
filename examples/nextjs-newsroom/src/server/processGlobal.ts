import "server-only";
/**
 * One of each, per process — and why module scope is not enough.
 *
 * **A Route Handler and a Server Component are different module graphs.**
 * Measured on Next 16.3, not assumed: two pages visiting the same module-scope
 * counter see it climb together, and `app/api/[[...route]]/route.ts` sees a
 * different one entirely. A `decisionSinkRing` declared at module scope in
 * `layer.ts` therefore becomes *two* rings — the pages fill one, and
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
 * graphs on every edit, and a fresh ring per hot reload empties the log for
 * reasons that have nothing to do with the code being edited.
 *
 * The slots are declared rather than reached through a cast, so this costs one
 * `declare global` and no `as`.
 */
import type * as Layer from "effect/Layer";
import type * as Stream from "effect/Stream";
import type { DecisionSink, SinkRecord, StoredRecord } from "@qadi/core";
import type * as Effect from "effect/Effect";
import type { PortCallLog } from "@qadi/devtools";

/** The past, for a reader arriving after the fact. */
export interface Ring {
  readonly layer: Layer.Layer<DecisionSink>;
  readonly snapshot: Effect.Effect<ReadonlyArray<StoredRecord>>;
  readonly clear: Effect.Effect<void>;
  readonly ingest: (record: SinkRecord, environment?: string) => Effect.Effect<void>;
}

/** The future, for a reader watching. */
export interface Feed {
  readonly layer: Layer.Layer<DecisionSink>;
  readonly stream: Stream.Stream<SinkRecord>;
}

export interface PortCallCollector {
  readonly layer: Layer.Layer<never>;
  readonly snapshot: Effect.Effect<PortCallLog>;
}

interface Slots {
  ring?: Ring;
  feed?: Feed;
  portCalls?: PortCallCollector;
  /** Subjects whose standing `/edge/divergent` has revoked. */
  revoked?: Set<string>;
}

declare global {
  // eslint-disable-next-line no-var
  var __qadiNewsroom: Slots | undefined;
}

const slots = (): Slots => (globalThis.__qadiNewsroom ??= {});

export const ringOnce = (make: () => Ring): Ring => (slots().ring ??= make());
export const feedOnce = (make: () => Feed): Feed => (slots().feed ??= make());
export const portCallsOnce = (make: () => PortCallCollector): PortCallCollector =>
  (slots().portCalls ??= make());
export const revokedOnce = (): Set<string> => (slots().revoked ??= new Set<string>());
