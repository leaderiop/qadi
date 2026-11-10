/**
 * A deterministic, in-memory `AuditTrailPort`, shipped as a public export.
 *
 * Any consumer wiring `AuditDecisionSinkLive` needs a deterministic port for
 * their own tests — this is directly useful beyond `@qadi/audit`'s own suite,
 * not just internal test infrastructure. Mirrors `@qadi/core`'s
 * `recordingPort`: a factory returning the `Layer` alongside a
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
import type { AuditTrailScript } from "./AuditPortReply.ts";
import { AuditPortReply } from "./AuditPortReply.ts";
import { answerReply } from "./AuditPortReplyInterpreter.ts";

export interface AuditTrailPortTestOptions {
  /**
   * Answers each `write` with an `AuditPortReply`; `undefined`, or no script
   * at all, is `Ok`. A `Fail` reply fails with `AuditWriteError({ entry, cause })`
   * built here, so a test never constructs the port's error by hand.
   */
  readonly write?: AuditTrailScript;
}

export interface AuditTrailPortTestHandle {
  readonly layer: Layer.Layer<AuditTrailPort>;
  /**
   * Every entry written so far, in call order. Live — always reflects every
   * write made so far, not a snapshot taken when the handle was created.
   */
  readonly written: () => ReadonlyArray<AuditEntry>;
  /** Every entry `write` was called with, in call order, whatever the reply. Live. */
  readonly calls: () => ReadonlyArray<AuditEntry>;
}

export const AuditTrailPortTest = (options?: AuditTrailPortTestOptions): AuditTrailPortTestHandle => {
  const store = MutableRef.make<ReadonlyArray<AuditEntry>>(Arr.empty());
  const log = MutableRef.make<ReadonlyArray<AuditEntry>>(Arr.empty());

  return {
    written: () => MutableRef.get(store),
    calls: () => MutableRef.get(log),
    layer: Layer.succeed(AuditTrailPort, {
      write: (entry) => {
        const call = MutableRef.get(log).length;
        MutableRef.update(log, (entries) => Arr.append(entries, entry));
        const ok = Effect.sync(() => {
          MutableRef.update(store, (entries) => Arr.append(entries, entry));
        });
        if (options?.write !== undefined) {
          const reply = options.write(entry, call) ?? AuditPortReply.Ok();
          return answerReply(reply)(ok, (cause) => new AuditWriteError({ entry, cause }));
        }
        return ok;
      },
    }),
  };
};
