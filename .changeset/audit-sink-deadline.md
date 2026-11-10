---
"@qadi/audit": minor
---

An audit store call has a deadline. `AuditDecisionSinkLive` bounds every `stage`, `write` and `commit` call by the new `AuditDecisionSinkOptions.storeCallTimeout?: Duration.Input` (default 5 seconds; `Duration.infinity` opts out). Before, a store call that never settled held the decision with it, since `evaluate` awaits `record`, and the circuit breaker never opened, because it counts only calls that end. A call that reaches the deadline is a failed call: a write is `WriteFailed` and counts toward the breaker, a stage or commit is a staging failure, and each is reported through the existing `qadi_audit_writes_total`, `qadi_audit_entries_lost_total` and log lines. A store that is healthy but slower than 5 seconds now loses writes: raise `storeCallTimeout` for it. An adapter that makes itself uninterruptible is not bounded (ARCH-62, ADR-QD-126).

`AuditTrailPortTest` and `AuditStagingPortTest` answer each call from a script: new public `AuditPortReply` (`Ok`, `Fail`, `Die`, `Interrupt`, `Never`, `Latch`) and the script types `AuditTrailScript`, `AuditStageScript` and `AuditCommitScript`, taken as `write`, `stage` and `commit`. Each double also logs every call it receives (`calls()`, `stageCalls()`, `commitCalls()`).

**Breaking.** `AuditTrailPortTestOptions.failWith` and `AuditStagingPortTestOptions.failStageWith`/`failCommitWith` are removed. Replace `failWith: (entry) => new AuditWriteError({ entry, cause })` with `write: () => AuditPortReply.Fail({ cause })`, and the staging options with `stage`/`commit` scripts of the same shape. The double now builds `AuditWriteError`/`AuditStagingError` itself, and a commit's `Fail` carries the entry staged under its handle.
