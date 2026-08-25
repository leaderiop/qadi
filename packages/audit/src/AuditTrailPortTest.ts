/**
 * A deterministic, in-memory `AuditTrailPort`, shipped as a public export.
 *
 * Any consumer wiring `AuditDecisionSinkLive` needs a deterministic port for
 * their own tests — this is directly useful beyond `@qadi/audit`'s own suite,
 * not just internal test infrastructure. Mirrors `@qadi/testing`'s
 * `recordingAttributeResolver`: a factory returning the `Layer` alongside a
 * live read of what it recorded, rather than a bare `Layer` constant nothing
 * could inspect.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Arr from "effect/Array";
import * as MutableRef from "effect/MutableRef";
import type { AuditEntry } from "./AuditEntry.ts";
import { AuditTrailPort } from "./AuditTrailPort.ts";
import { AuditWriteError } from "./AuditTrailPort.ts";

export interface AuditTrailPortTestOptions {
  /** When present, `write` fails with the returned error instead of recording. */
  readonly failWith?: (entry: AuditEntry) => AuditWriteError | undefined;
}

export interface AuditTrailPortTestHandle {
  readonly layer: Layer.Layer<AuditTrailPort>;
  /** Every entry written so far, in call order. Live — reflects writes made after this is first read. */
  readonly written: () => ReadonlyArray<AuditEntry>;
}

export const AuditTrailPortTest = (options?: AuditTrailPortTestOptions): AuditTrailPortTestHandle => {
  const store = MutableRef.make<ReadonlyArray<AuditEntry>>(Arr.empty());

  return {
    written: () => MutableRef.get(store),
    layer: Layer.succeed(AuditTrailPort, {
      write: (entry) => {
        const failure = options?.failWith?.(entry);
        if (failure !== undefined) return Effect.fail(failure);
        return Effect.sync(() => {
          MutableRef.update(store, (entries) => Arr.append(entries, entry));
        });
      },
    }),
  };
};
