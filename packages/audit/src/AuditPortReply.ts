/**
 * A per-call answer for the shipped audit doubles: Ok, Fail, Die, Interrupt,
 * Never or Latch.
 *
 * `AuditTrailPortTest` and `AuditStagingPortTest` once took only a callback
 * returning a hand-built error, so every other way a store can misbehave — a
 * defect, an interruption, a call that never settles, one a test watches
 * arrive and then hang — was a hand-written `Layer.succeed(AuditTrailPort, …)`
 * in the test that needed it (eleven of them in `packages/audit/test`), and
 * `driveExit.ts` kept its own ok/fail/die mode table beside them. A script
 * answering each call with one of these replies covers all of those (D-05),
 * in the style of `@qadi/core`'s `scriptedPort`.
 *
 * The audit ports deliberately stay out of core's closed five-port registry
 * (ADR-QD-094): this is the doubles' own union, not core's `PortReply`, and
 * nothing here is a port description.
 *
 * `Fail` carries only a `cause`; the double builds the port's own typed error
 * (`AuditWriteError`, `AuditStagingError`) from the call it answers, so a test
 * never constructs one by hand.
 */
import * as Data from "effect/Data";
import type * as Latch from "effect/Latch";
import type { AuditEntry } from "./AuditEntry.ts";
import type { AuditStagingHandle } from "./AuditStagingPort.ts";

/**
 * How a scripted double answers one call. A closed union: the one interpreter
 * both doubles share fails to compile when an arm is missing.
 *
 * - `Ok`: the double's normal behaviour (record, stage, commit).
 * - `Fail`: the port's typed error, built by the double from the call, with
 *   this `cause`. Nothing is recorded.
 * - `Die`: a defect, as a crashing adapter would raise.
 * - `Interrupt`: the call interrupts itself.
 * - `Never`: the call never settles and signals nothing.
 * - `Latch`: the call opens `latch` when it starts, then never settles — a hung
 *   store the test can see arrive.
 */
export type AuditPortReply = Data.TaggedEnum<{
  Ok: {};
  Fail: { readonly cause: unknown };
  Die: { readonly defect: unknown };
  Interrupt: {};
  Never: {};
  Latch: { readonly latch: Latch.Latch };
}>;

/** Constructors and guards for {@link AuditPortReply}. */
export const AuditPortReply = Data.taggedEnum<AuditPortReply>();

/**
 * Answers `AuditTrailPortTest`'s `write`. `call` is the 0-based index of this
 * call among that double's writes; `undefined` means `Ok`.
 */
export type AuditTrailScript = (entry: AuditEntry, call: number) => AuditPortReply | undefined;

/**
 * Answers `AuditStagingPortTest`'s `stage`. `call` is the 0-based index of
 * this call among that double's stages; `undefined` means `Ok`.
 */
export type AuditStageScript = (entry: AuditEntry, call: number) => AuditPortReply | undefined;

/**
 * Answers `AuditStagingPortTest`'s `commit`. `entry` is the one staged under
 * `handle`; `call` is the 0-based index of this call among that double's
 * commits; `undefined` means `Ok`.
 */
export type AuditCommitScript = (
  handle: AuditStagingHandle,
  entry: AuditEntry,
  call: number,
) => AuditPortReply | undefined;
