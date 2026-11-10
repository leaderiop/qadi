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
import type { AuditCommitScript, AuditStageScript } from "./AuditPortReply.ts";
import { AuditPortReply } from "./AuditPortReply.ts";
import { answerReply } from "./AuditPortReplyInterpreter.ts";

export interface AuditStagingPortTestOptions {
  /**
   * Answers each `stage` with an `AuditPortReply`; `undefined`, or no script
   * at all, is `Ok`, which issues the next handle. A `Fail` reply fails with
   * `AuditStagingError({ entry, cause })` built here and issues no handle.
   */
  readonly stage?: AuditStageScript;
  /**
   * Answers each `commit` with an `AuditPortReply`; `undefined`, or no script
   * at all, is `Ok`. The script and a `Fail` reply's `AuditStagingError` get
   * the entry staged under the handle. A handle this double never issued gets
   * the entry of the most recent `stage` call instead, whatever its reply — a
   * test committing a forged handle exercises the sink's opacity, not the
   * entry — and a scripted commit before any `stage` call dies, since there is
   * no entry to answer with.
   */
  readonly commit?: AuditCommitScript;
}

export interface AuditStagingPortTestHandle {
  readonly layer: Layer.Layer<AuditStagingPort>;
  /** Handles staged but not yet committed, in stage order. */
  readonly staged: () => ReadonlyArray<AuditStagingHandle>;
  /** Handles committed, in commit order. */
  readonly committed: () => ReadonlyArray<AuditStagingHandle>;
  /** Every entry `stage` was called with, in call order, whatever the reply. Live. */
  readonly stageCalls: () => ReadonlyArray<AuditEntry>;
  /** Every handle `commit` was called with, in call order, whatever the reply. Live. */
  readonly commitCalls: () => ReadonlyArray<AuditStagingHandle>;
}

export const AuditStagingPortTest = (
  options?: AuditStagingPortTestOptions,
): AuditStagingPortTestHandle => {
  const stagedStore = MutableRef.make<ReadonlyArray<AuditStagingHandle>>(Arr.empty());
  const committedStore = MutableRef.make<ReadonlyArray<AuditStagingHandle>>(Arr.empty());
  const stageLog = MutableRef.make<ReadonlyArray<AuditEntry>>(Arr.empty());
  const commitLog = MutableRef.make<ReadonlyArray<AuditStagingHandle>>(Arr.empty());
  const stagedEntries = new Map<AuditStagingHandle, AuditEntry>();
  let nextHandle = 0;

  return {
    staged: () => MutableRef.get(stagedStore),
    committed: () => MutableRef.get(committedStore),
    stageCalls: () => MutableRef.get(stageLog),
    commitCalls: () => MutableRef.get(commitLog),
    layer: Layer.succeed(AuditStagingPort, {
      stage: (entry) => {
        const call = MutableRef.get(stageLog).length;
        MutableRef.update(stageLog, (entries) => Arr.append(entries, entry));
        const ok = Effect.sync(() => {
          const handle: AuditStagingHandle = nextHandle++;
          stagedEntries.set(handle, entry);
          MutableRef.update(stagedStore, (handles) => Arr.append(handles, handle));
          return handle;
        });
        if (options?.stage !== undefined) {
          const reply = options.stage(entry, call) ?? AuditPortReply.Ok();
          return answerReply(reply)(ok, (cause) => new AuditStagingError({ entry, cause }));
        }
        return ok;
      },
      commit: (handle) => {
        const call = MutableRef.get(commitLog).length;
        MutableRef.update(commitLog, (handles) => Arr.append(handles, handle));
        const ok = Effect.sync(() => {
          MutableRef.update(stagedStore, (handles) => handles.filter((h) => h !== handle));
          MutableRef.update(committedStore, (handles) => Arr.append(handles, handle));
        });
        if (options?.commit !== undefined) {
          const entry = stagedEntries.get(handle) ?? MutableRef.get(stageLog).at(-1);
          if (entry === undefined) {
            return Effect.die("AuditStagingPortTest: a scripted commit before any stage has no entry to answer with");
          }
          const reply = options.commit(handle, entry, call) ?? AuditPortReply.Ok();
          return answerReply(reply)(ok, (cause) => new AuditStagingError({ entry, cause }));
        }
        return ok;
      },
    }),
  };
};
