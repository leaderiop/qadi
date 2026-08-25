/**
 * A deterministic, in-memory `AuditStagingPort`, shipped as a public export.
 *
 * The same rationale as `AuditTrailPortTest.ts`: any consumer wiring staging
 * into `AuditDecisionSinkLive` needs a deterministic double for their own
 * tests. Handles are plain incrementing numbers here — this implementation's
 * own choice, never inspected by `@qadi/audit` itself, which treats
 * `AuditStagingHandle` as fully opaque.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Arr from "effect/Array";
import * as MutableRef from "effect/MutableRef";
import type { AuditEntry } from "./AuditEntry.ts";
import type { AuditStagingHandle } from "./AuditStagingPort.ts";
import { AuditStagingPort } from "./AuditStagingPort.ts";
import { AuditStagingError } from "./AuditStagingPort.ts";

export interface AuditStagingPortTestOptions {
  readonly failStageWith?: (entry: AuditEntry) => AuditStagingError | undefined;
  readonly failCommitWith?: (handle: AuditStagingHandle) => AuditStagingError | undefined;
}

export interface AuditStagingPortTestHandle {
  readonly layer: Layer.Layer<AuditStagingPort>;
  /** Handles staged but not yet committed, in stage order. */
  readonly staged: () => ReadonlyArray<AuditStagingHandle>;
  /** Handles committed, in commit order. */
  readonly committed: () => ReadonlyArray<AuditStagingHandle>;
}

export const AuditStagingPortTest = (
  options?: AuditStagingPortTestOptions,
): AuditStagingPortTestHandle => {
  const stagedStore = MutableRef.make<ReadonlyArray<AuditStagingHandle>>(Arr.empty());
  const committedStore = MutableRef.make<ReadonlyArray<AuditStagingHandle>>(Arr.empty());
  let nextHandle = 0;

  return {
    staged: () => MutableRef.get(stagedStore),
    committed: () => MutableRef.get(committedStore),
    layer: Layer.succeed(AuditStagingPort, {
      stage: (entry) => {
        const failure = options?.failStageWith?.(entry);
        if (failure !== undefined) return Effect.fail(failure);
        return Effect.sync(() => {
          const handle: AuditStagingHandle = nextHandle++;
          MutableRef.update(stagedStore, (handles) => Arr.append(handles, handle));
          return handle;
        });
      },
      commit: (handle) => {
        const failure = options?.failCommitWith?.(handle);
        if (failure !== undefined) return Effect.fail(failure);
        return Effect.sync(() => {
          MutableRef.update(stagedStore, (handles) => handles.filter((h) => h !== handle));
          MutableRef.update(committedStore, (handles) => Arr.append(handles, handle));
        });
      },
    }),
  };
};
