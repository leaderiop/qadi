# Phase 14: The audit sink owns its deadline; audit port doubles are scriptable - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** ARCH-62 · review candidates #3 (Strong, defect) and #5 (Worth exploring)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`

<domain>
## Phase Boundary

`@qadi/audit`'s decision sink (`AuditDecisionSinkLive`) puts a deadline around every store call it makes
(stage, write, commit). A call that runs out of time is a failed attempt: the circuit breaker counts it, and the
sink returns a `WriteFailed` / `StageFailed` / `CommitFailed` outcome value. A store that hangs can no longer
stall evaluation, and enough hangs open the breaker.

As part of the same work, the shipped test doubles `AuditTrailPortTest` and `AuditStagingPortTest` gain a per-call
script (ok / fail / die / never / latch). That gives the hang case and the other cases a public way to be expressed,
and the 11 hand-written failing port layers in `packages/audit/test` go away.
</domain>

<evidence>
## Evidence (verified at 1721a42; the hang is reproduced by a probe)

- `packages/audit/src/AuditDecisionSinkLive.ts:139-158` — `admitted.attempt(trailPort.write(entry))` and
  `stagingPort.stage/commit` run with no time limit. `grep -rn timeout packages/audit/src` finds only the
  breaker's reset timeout.
- `packages/audit/src/CircuitBreaker.ts:394-401` — `attempt` waits on `Effect.exit(write)` for as long as the
  write takes. The breaker records failure only when the write settles; a probe holds its claim the whole time.
- `packages/core/src/SinkEmit.ts:48-54` — `sinkEmitter` runs `sink.record(record)` inline and only catches its
  cause. `Lifecycle.ts:233,279` yields it inside the evaluation, so a hung `record` hangs `evaluate`/`guard`.
- Spec it contradicts: ADR-QD-044 (lines ~129-132: a sink doing I/O "should buffer and flush on its own
  schedule"); BEH-QD-187 (`spec/behaviors/24-decision-sink.md:402-406`, a forwarder's send must not block);
  INV-QD-035 (an observer must not change the outcome — a hang changes it into "no outcome").
- Test doubles: `AuditTrailPortTest.ts:19-22` and `AuditStagingPortTest.ts:19-22` take only
  `failWith → error | undefined`. Hand-written layers: `test/AuditDecisionSinkLive.test.ts:260,316,390,398,444,476,497,643`,
  `test/Metrics.test.ts:78`, `test/driveExit.ts:100,108`. `driveExit.ts:20,52-53` keeps its own
  `Mode = "ok"|"fail"|"die"` script.
- **Probe (2026-11-10):** one shared layer, `failureThreshold: 1`, and a trail write of `() => Effect.never`. Three `decide`s,
  each followed by `TestClock.adjust("1 hour")`: none settled; the trail saw 3 write attempts; the breaker never recorded a
  failure and stayed Closed.
- No test has a write that never settles (`grep -rn "Effect.never" packages/audit/test` → only the breaker unit test).
</evidence>

<decisions>
## Implementation Decisions

- **D-01 (test first):** The first task is a RED regression test, using `TestClock` and a trail write of
  `Effect.never`. It shows `evaluate` with the sink wired never completing (use a `TestClock`-driven timeout
  inside the test to observe that), and the breaker staying `Closed` after N such writes. A second RED test does
  the same for a probe in HalfOpen.
- **D-02 (recommended; one-way for the public option name → `checkpoint:decision`):** the deadline is an
  option of `AuditDecisionSinkLive`'s config, with a finite default (recommend 5 s; the planner checks whether the
  existing config shape already has a natural slot). The checkpoint offers three choices: (A) one finite default
  deadline that a caller can override; (B) no default, with the option required; (C) the full ADR-044 route,
  a buffered sink with its own flush schedule. Recommend **(A) now, with (C) recorded as deferred**. The user
  prefers complete over simple, so the checkpoint must state honestly what (C) adds: no evaluation latency
  at all, against at-least-once delivery and memory bounds.
- **D-03:** a timeout is a **failed attempt**. It is recorded on the breaker in `attempt` (so `recordFailure` runs)
  and becomes the existing outcome tags. Add no new public error class unless the outcome union needs a
  distinct `TimedOut` reason. If it does, that is a closed-union change written out in full (user
  preference), and the changeset says so.
- **D-04:** BEH-QD-251 ("a caller's interruption is not a store failure") stays true. Amend it with one
  sentence: the sink's own deadline is not the caller's interruption, so it **is** a failure. Add a new BEH for
  "a hung store call is bounded by the deadline and counted".
- **D-05:** the doubles take a per-call script, whose modes are the closed union
  `Ok | Fail(error) | Die(defect) | Never | Latch(latch)`, in the style of core's `scriptedPort`
  (`packages/core/src/PortDoubles.ts`). They do **not** join core's closed five-port registry (ADR-QD-094). This
  revisits the v1.0 out-of-scope line "the audit *PortTest doubles … stay hand-written". It does not put
  them in the registry; it scripts the existing doubles. The planner records this in PROJECT.md Key Decisions.
- **D-06:** `driveExit.ts`'s mode table is deleted in favour of the doubles' script. The 11 hand layers are
  rewritten to use the scripted doubles. **Do not lower the mutation score:** port tests one by one and keep
  each assertion.
- **D-07:** `PORT_DOUBLE_BUDGET` stays core-only. In the plan, say whether to extend it to `packages/audit/test`
  (recommend: extend it, with an empty allow-list, so a new hand-written audit failing layer is refused). That
  is a `scripts/check-house-style.mjs` change, so AGENTS.md §6 is updated in the same task.
- **D-08:** Records: ADR (an amendment to ADR-QD-044, or a new ADR naming the sink's deadline), CCR row, BEH
  changes, INV-QD-035 note, `spec/overview.md` if the double's options type is exported, changeset
  (`@qadi/audit` minor if the config gains an option).

### Claude's Discretion
- Where the deadline is applied: around each port call, or around the whole `attemptWrite`. Recommend each
  call, so stage, write and commit each have their own outcome tag.
- The exact name of the option.
</decisions>

<canonical_refs>
## Canonical References
- `spec/decisions/` ADR-QD-044 (decision sink), ADR-QD-094 (port descriptions, doubles), ADR-QD-060 (wire errors)
- `spec/behaviors/24-decision-sink.md` (BEH-QD-187, BEH-QD-251), `spec/invariants.md` INV-QD-035
- `packages/audit/src/AuditDecisionSinkLive.ts`, `CircuitBreaker.ts`, `AuditTrailPortTest.ts`, `AuditStagingPortTest.ts`
- `packages/audit/test/AuditDecisionSinkLive.test.ts`, `Metrics.test.ts`, `driveExit.ts`, `CircuitBreaker.test.ts`
- `packages/core/src/SinkEmit.ts`, `Lifecycle.ts`, `PortDoubles.ts` (`scriptedPort` — the pattern to follow)
- `.planning/milestones/archive-pre-gsd/architecture/ARCH-07-circuit-breaker-protocol.md`, `ARCH-35-audit-write-outcome.md` (prior work on this module)
</canonical_refs>

<deferred>
## Deferred Ideas
- A buffered sink per ADR-044 (D-02 option C), unless the checkpoint picks it.
</deferred>

---
*Phase: 14-audit-sink-deadline · Context gathered: 2026-11-10*
