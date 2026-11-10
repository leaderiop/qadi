---
id: ARCH-35
title: An audit write's outcome is a value — one closed `AuditWriteOutcome` per record, projected once to its metrics, its log line and its hook
strength: Worth exploring   # from the 2026-10-07 architecture review (wave 4), card c6
status: done
evidence_verified_at: e635e68
depends_on: []              # ARCH-07 (withPermit) and ARCH-25 (reportEncodeRefusal) are both landed; this builds on them
blocks: []
adrs_touched:
  - ADR-QD-056 (amend, dated block: every record has exactly one write outcome; an entry that is not in the trail is witnessed by a log line naming its evaluationId — the standard the breaker-open drop already meets, extended to the two post-write-failure losses; `onOutcome` if D-35-a = B; `writes_total` counts breaker-refused records if D-35-d = A; the lost-entry counter if D-35-e = A. The "gap-marker" question stays open and is NOT decided here)
  - ADR-QD-095 / its 2026-10-07 amendment (constraint: an encode refusal is still reported through core's `reportEncodeRefusal`; this plan routes the Refused outcome to it, unchanged)
  - ADR-QD-051 (constraint: a span says what was asked; read for D-35-f, the `qadi.audit.record` span)
  - ADR-QD-034 / AGENTS.md §5a (constraint: `Match`, not `switch`; the projection is a module-scope `Match.type`)
  - ADR-QD-076 (constraint: `ignoreStatic: true` — a module-scope `Match.type(...)` is static; every arm must be pinned by a per-leaf test)
  - ADR-QD-073 (constraint: `UNTRACED_BUDGET` unchanged — no `Effect.fnUntraced`)
  - ADR-QD-037 (constraint: madge; the new module is imported by the sink and imports nothing from it)
  - ADR-QD-099 (constraint: closed entry points; the outcome is exported from the barrel only if D-35-a = B)
  - ADR-QD-038 (constraint: changeset, fixed version group; no release step)
packages: ["@qadi/audit"]
estimate: M   # ≈ 2 days for T0–T10. Defect-only path (T1 + T2 + T3) ≈ ½ day (S)
---

# ARCH-35 — An audit write's outcome is a value

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68`. `AuditDecisionSinkLive.ts` last changed in that commit (ARCH-25's
`onRefused` and ARCH-07's `withPermit` are both in it), so the review's line numbers are a few lines
stale. Probes ran from the scratchpad, never from the repo:

- **`probe-exits.mts`** (`scratchpad/wave4/ARCH-35/`) drives the real `AuditDecisionSinkLive`
  with hand-scripted `AuditTrailPort`/`AuditStagingPort` layers, a capturing `Logger.layer`, an
  isolated `Metric.MetricRegistry`, and `failureThreshold: 1` so one failing record trips the
  breaker. For each scenario it prints the metric **deltas**, the log lines (message +
  annotations), the rows written and the hook calls for one target record. The scratch dir has
  a `node_modules` symlink to `packages/audit/node_modules`. Run:
  `cd packages/audit && NODE_OPTIONS="--conditions=bun" ../../node_modules/.bin/tsx /private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-35/probe-exits.mts`
- **Mutation report:** `reports/mutation-audit/mutation.json` (mtime 2026-10-07 19:25, i.e. the
  wave-3 branch just before the merge). The surviving mutants' lines (177, 182, 183, 219) hold
  exactly the same text at `e635e68`, so the report applies. Summarised with a 10-line Python
  read of `files[*].mutants[*].status`.

### Every exit of `record`, as the probe printed it

`writes` = `qadi_audit_writes_total{outcome}`, `staging` = `qadi_audit_staging_total{outcome}`.
"Durability" is where the entry ends up: **Trail** (written), **StagingOnly** (recoverable from the
staging store), **Lost** (nowhere), **Refused** (never encodable).

| # | Path (encode → permit → stage → write → commit) | Metrics (delta) | Log line today | Hook | Durability |
| - | ------------------------------------------------ | --------------- | -------------- | ---- | ---------- |
| X1 | encode refused (any permit/staging) | `writes{encode_failed}` | `qadi/audit: a decision record could not be encoded for the audit trail; no row was written` + `qadi.refusal`, `qadi.path`, `evaluationId` (core's `reportEncodeRefusal`) | `onRefused` replaces the log | Refused |
| U1 | admitted, unwired, write ok | `writes{written}` | — | — | Trail |
| U2 | admitted, unwired, write fails (typed or defect) | `writes{write_failed}` | **— (none)** | — | **Lost** |
| U3 | refused by breaker, unwired | `staging{skipped_open}` (**no `writes`**) | `audit entry dropped: circuit breaker open and no staging port wired` + `evaluationId` | — | Lost |
| W1 | admitted, staged, write ok, commit ok | `staging{staged}`, `writes{written}` | — | — | Trail |
| W2 | admitted, staged, write ok, commit fails | `staging{staged}`, `staging{commit_failed}`, `writes{written}` | `audit staging commit failed: entry is durable in the trail, but its staged copy will remain marked uncommitted in the staging store` (+ cause) + `evaluationId` | — | Trail |
| W3 | admitted, staged, write fails | `staging{staged}`, `writes{write_failed}` | — | — | StagingOnly |
| W4 | admitted, stage fails (typed or defect), write ok | `staging{failed}`, `writes{written}` | — | — | Trail |
| W5 | admitted, stage fails, write fails | `staging{failed}`, `writes{write_failed}` | **— (none)** | — | **Lost** |
| W6 | refused by breaker, staged | `staging{staged}` (**no `writes`**) | — | — | StagingOnly |
| W7 | refused by breaker, stage fails | `staging{failed_open}` (**no `writes`**) | `audit entry dropped: circuit breaker open and staging failed` + `evaluationId` | — | Lost |
| — | caller interrupts the record (any point) | none | none | — | (no outcome; BEH-QD-251) |

Eleven leaves, four log lines (plus core's "an encode-refusal hook threw" when `onRefused`
throws), eight metric label values (`writes`: 3, `staging`: 5).

### Claims

| # | Claim (review card c6) | Verdict | At `e635e68` |
| - | ---------------------- | ------- | ------------ |
| C1 | `AuditDecisionSinkLive.ts:131-235`: encode, staging, breaker permit, write and commit produce ~7 metric outcomes and 2 different "dropped" log lines, each branch writing its own metric + log by hand | **CHANGED (details)** | `record` is `:136-238`. Encode `:139-148`; permit `:155`; staging `:164-201`; write/commit `:208-235`. **Eight** label values, not seven (`:73-75` and `:80-115`). The two "dropped" lines are `:181-183` and `:197-199`; there are four log lines in all (the commit warning `:217-224`, and the encode report `:141-145` through core). Every branch calls `Metric.update`/`Effect.logWarning` itself: 9 `Metric.update` sites and 3 `Effect.logWarning` sites interleaved with port calls. |
| C2 | `Metrics.test.ts` (493 lines) says "the metric alone would still pass if a mutant deleted the `Effect.logWarning`" | **CONFIRMED** | 493 lines. The sentence is at `:307-308` (skipped_open) and again at `:432-433` (commit_failed). |
| C3 | Tests check side effects instead of the outcome, **so a deleted `logWarning` goes unnoticed** | **CHANGED — half right** | It **is** noticed for the two lines the sentence above guards: `skipped_open`'s warning is pinned at `Metrics.test.ts:284-319` and the commit warning at `:428-476`, and ARCH-25 pinned the encode report (`AuditDecisionSinkLive.test.ts:532-548`). It **goes unnoticed for the `failed_open` drop** (W7): `grep -rn "failed_open\|staging failed" packages/audit/test` finds no assertion on its metric or its log. The mutation report agrees: the 5 survivors in this file are `:177` BlockStatement `{}` and ConditionalExpression `false` (the whole W7 branch emptied, or folded into W4's `failed`), `:182` StringLiteral `""` (the W7 message), `:183` ObjectLiteral `{}` (its `evaluationId`), and `:219` StringLiteral `""` (the second half of the commit message; the test only `include`s the first half). Fixed by T1. |
| C4 | Audit has the lowest mutation score (86.9) | **CHANGED (number) / misattributed** | 87.44 % (383 killed, 55 survived/no-coverage) — still the lowest (core 95.41, http 97.81, devtools 98.30, react 95.00, sql 95.59, prisma 91.67). But only **5 of the 55** survivors are in `AuditDecisionSinkLive.ts` (91.07 % there). **38** are in `CircuitBreaker.ts` (34 survived + 4 no-coverage: generation guards, `annotateCurrentSpan` attributes, `releaseProbe`'s condition), 7 in `SequenceIntegrity.ts`, 4 in `AuditEntry.ts`, 1 in `SignatureCapturePort.ts`. This plan lifts the package to ≈ 88.6 % at most (T1 alone kills all 5); the score argument belongs mostly to the breaker (orphan, §9). |
| C5 | ARCH-07 §4: "the sink keeps full control of staging and metrics" | **CONFIRMED** | ARCH-07's D-07-a rationale for `withPermit(use)`. `CircuitBreaker.ts:129-131` gives the sink a `Permit` and an `attempt` that returns the write's `Exit`; everything after that is the sink's. This plan does not touch the breaker. It turns what the sink does with that control into one value. |
| C6 | ARCH-25 (encode refusal described once) is done | **CONFIRMED** | `AuditDecisionSinkLive.ts:141-146` calls core's `reportEncodeRefusal`; `onRefused` exists (`:52-58`). The Refused outcome routes to it unchanged. |
| C7 | *(wave-3 orphan)* ARCH-07's `writesWriteFailed` has no log line either | **CONFIRMED, and worse than stated (defect)** | `:228-232`: `Metric.update(writesWriteFailed, 1)` only. The probe shows **two of the three** `write_failed` leaves are **unrecoverable losses** with no log anywhere: U2 (unwired) and W5 (stage failed, then write failed). They are the same loss as U3/W7, which ADR-QD-056's 2026-09-19 revision holds to "a log line and the counter" (`056-…md:259-265`). The counter cannot witness them either, because `write_failed` also counts W3, where the staged copy survives. ARCH-25 §3/§9 named this gap and deferred it to "ARCH-07/ADR-QD-056's gap-marker work". It is not gap-marker work: no new field or persisted marker is needed to log it. **Test-first task: T2.** |
| C8 | *(found during verification)* `qadi_audit_writes_total` does not count breaker-refused records, against its own description | **CONFIRMED (defect)** | The description is "SinkRecords the audit pipeline received, tagged by outcome." (`:70-72`, pinned by `Metrics.test.ts:110-123`). U3, W6 and W7 update no `writes` label at all, so `sum(writes_total)` = received − breaker-refused. During an outage, the metric that says "received" drops to near zero while records keep arriving. **Test-first task: T3** (direction per D-35-d). |
| C9 | *(found during verification)* `stagingFailed`'s doc comment is false for W5 | **CONFIRMED (doc defect)** | `:81-87`: "`stage()` failed while the breaker was **not** Open … this entry is recoverable through the trail even though staging never got a copy of it." When the write then fails (W5) the entry is in neither place. Fixed in T2's comment edit. |
| C10 | *(found during verification)* `record` is not `Effect.fn` | **CONFIRMED (known §5 deviation)** | `:136` is an arrow returning `Effect.gen`. ARCH-07 §3 recorded it as a non-goal ("an observability decision (ADR-QD-051)"). Re-opened as D-35-f, because the outcome is the natural span attribute. |

**Other facts the plan relies on.**

- `Metric.counter` registries key on `type:id:description` and memoise per metric object; a counter
  re-declared per call fails silently. The projection must map to the **existing module-scope**
  counters (`:70-115`) through a closed table, never build `Metric.withAttributes(...)` per call.
- `DecisionSink.record`'s contract is `Effect<void>` (never fails, never dies on a caller hook):
  `Evaluate.ts`/`SinkEmit.ts` swallow a sink failure silently, so a new hook must be contained here
  (as `reportEncodeRefusal` contains `onRefused`).
- `PORT_DOUBLE_BUDGET` covers core port errors only (`readPortErrorClassNames`,
  `scripts/check-house-style.mjs`); constructing `AuditWriteError`/`AuditStagingError` in audit tests
  is unaffected.
- `no-refusal-annotation-outside-core` (`scripts/check-house-style.mjs:241-254`) forbids
  `"qadi.refusal"`/`"qadi.path"` literals in `packages/*/src`. New log lines annotate `evaluationId`
  only (as the existing drop lines do), and the Refused leaf keeps going through core.
- The metrics are documented almost nowhere outside the code: `qadi_audit_*` appears in
  `spec/behaviors/33-audit-pipeline.md` (BEH-QD-250/251/252), ADR-QD-056 `:264` and `:329`, and
  `packages/audit/README.md:59`. No website page lists them.

## 2. Goal and success criteria

**Goal.** `record` today is one function in which the **port calls** (encode, permit, stage, write,
commit) and the **reports** (9 metric updates, 3 log lines, a hook) are interleaved branch by branch.
What an operator needs to know — *where did this entry end up?* — exists nowhere as a value; it is
implied by which combination of side effects fired, and two of the eleven combinations fire nothing
that says "lost". This plan splits the module along that seam. A **closed `AuditWriteOutcome`**
(write result × staging result, eleven legal leaves and no illegal ones) is the return value of one
function, `writeRecord`, which makes the port calls and nothing else. One **exhaustive projection**,
a module-scope `Match.type<AuditWriteOutcome>()` table, maps each leaf to its metric labels, its log
line and its hook; one `emit` applies the projection. **Locality:** a twelfth leaf is one compile
error in the table. **Depth:** the sink's interface (`record`) is unchanged; behind it, "what
happened" and "how it is reported" become two small modules that are each tested alone — exits →
outcome as a table over scripted ports, and outcome → report as a pure table with no registry or
logger. **Leverage:** `durabilityOf(outcome)` answers *lost or not* in one place, which fixes the two
silent losses (C7), makes a lost-entry counter one line (D-35-e), and gives a caller an `onOutcome`
hook to dead-letter a lost entry or write ADR-QD-056's gap marker themselves (D-35-a), without the
library deciding that design.

**Success criteria.**

1. The W7 (`failed_open`) metric and log and the full commit-failed message are pinned; re-running
   `pnpm exec stryker run stryker.audit.mjs` leaves **0** survivors in `AuditDecisionSinkLive.ts`
   (T1, re-checked in T9).
2. A record lost after a write failure (U2, W5) logs one warning containing `audit entry dropped`
   with `evaluationId`: `pnpm vitest run packages/audit/test/AuditDecisionSinkLive.test.ts` (T2).
3. `sum(qadi_audit_writes_total)` equals the number of records given to `record` across all eleven
   leaves, or the description says what it counts (D-35-d), checked by a table test (T3).
4. `AuditWriteOutcome` is a closed union; `describeAuditWriteOutcome` (the projection) is a
   module-scope `Match.type(...).pipe(Match.tagsExhaustive(...))`; `grep -c "Metric.update\|Effect.log" packages/audit/src/AuditDecisionSinkLive.ts`
   is **0** — every report goes through `emit` in the outcome module (T4/T5).
5. A table test drives all eleven leaves through `AuditDecisionSinkLive` and asserts the outcome (via
   `onOutcome` if D-35-a = B, else via the projection's observable effects), and a second, pure table
   asserts every leaf's projection exactly — labels, message, level, annotation keys (T4, T7).
6. `node scripts/check-house-style.mjs` passes with every budget unchanged; `pnpm circular` passes;
   `node scripts/check-api-surface.mjs` passes (new exports named, if D-35-a = B).
7. Every log message and metric label that exists today is byte-identical afterwards (the existing
   `Metrics.test.ts`/`AuditDecisionSinkLive.test.ts` assertions pass unmodified through T5).
8. `pnpm check` green, `stryker.audit.mjs` ≥ 80 (break) and ≥ today's 87.44 (T9).

## 3. Non-goals

- **The breaker's own survivors** (38 in `CircuitBreaker.ts`, C4). Different module, different tests;
  orphan in §9.
- **Gap-marker entries** (ADR-QD-056 Consequences — Negative). Writing a persisted marker is a wire and
  archive change. This plan only *exposes* the outcome (D-35-a = B), which is the input such a design
  needs; the design itself stays open.
- **Changing what is written, staged or committed**, or the breaker's admission. Only reporting moves.
- **Renaming existing metric labels or log messages.** Dashboards and alerts key on them (C7 risk).
  New lines and labels are added; none is renamed.
- **The evaluator's silent swallow of a sink failure** (`SinkEmit.ts`): ARCH-16's. `record` stays total.
- **`ObligationRecord` vs `DecisionRecord` reporting differences** — none exist; both take the same path.

## 4. Constraints

- **AGENTS.md §1.** Submodule imports (`effect/Data`, `effect/Match`, `effect/Metric`, `effect/Cause`),
  `.ts` relative imports, `import type` for type-only.
- **§4.** No new error class. The outcome is a value (`Data.taggedEnum`), not an error; `SCHEMA_ERROR_BUDGET`
  unchanged. No `Effect.orDie`.
- **§5 / ADR-QD-073.** `writeRecord` and `emit` are `Effect.fn` if they are top-level functions; inside
  the layer closure they may stay arrows returning `Effect.gen` like `record` today unless D-35-f = A.
  No `Effect.fnUntraced` (`UNTRACED_BUDGET` is pinned to `Walk.ts`).
- **§5a / ADR-QD-034.** The projection is `Match.type<AuditWriteOutcome>()` **at module scope**, with
  nested `Match.type` tables for the two staging sub-unions. No `switch`; `SWITCH_BUDGET` unchanged.
  The existing per-call `Match.value(permit)` (`:208`) may stay.
- **§6.** No `as`, `!`, `any`, `Date.now`. The label→counter map is a `Record<WritesLabel, Metric.Counter<number>>`
  (closed keys, TS2741 on a missing one — the `CIRCUIT_BREAKER_STATUSES_BY_STATUS` idiom,
  `CircuitBreaker.ts:168-172`), not a `Record<string, …>` (user rule).
- **User rule: closed union over widening.** Every staging sub-union and label union is spelled in full.
- **ADR-QD-076.** The module-scope `Match.type` construction is unmutated; each arm runs per call and
  is mutated, so the pure projection table must assert **every** leaf exactly (T4).
- **ADR-QD-037.** `AuditWriteOutcome.ts` imports `AuditEntry.ts` (types) and `@qadi/core`
  (`reportEncodeRefusal`); the sink imports it; it never imports the sink.
- **ADR-QD-099 / §9.** If D-35-a = A, `AuditWriteOutcome.ts` stays out of the barrel (package-private);
  if B, `export * from "./AuditWriteOutcome.ts"` alphabetically and every export named in
  `spec/overview.md` (gate 13).
- **INV-QD-104 / INV-QD-044 reasoning.** New log annotations carry `evaluationId` only — never a record
  value, never the entry. A hook may receive the entry (it is the caller's code, in process).
- **INV-QD-035.** A throwing `onOutcome` is caught and logged, never a defect and never a failed record.
- **INV-QD-051** (staging never changes committed entries) and **INV-QD-052** (breaker) are untouched;
  `Agreement.test.ts` and `CircuitBreaker.test.ts` must pass unmodified.
- **Metric registry keying** (see §1): map labels to the existing module-scope counters only.
- **Coverage 90 %** for `packages/audit/src/**` (`vitest.config.ts:70-75`).

## 5. Decisions needed before work starts

### D-35-a — Is the outcome public, with a hook?

- **(A) Package-private.** `AuditWriteOutcome.ts` is outside the barrel; tests import it by path. The
  refactor is internal; no API change.
- **(B) Exported type + `durabilityOf` reading + `AuditDecisionSinkOptions.onOutcome?: (outcome: AuditWriteOutcome) => void`.**
  Called once per record after the metrics and log, contained (a throw is logged as
  `qadi/audit: an onOutcome hook threw` + `evaluationId`, never a defect). It does **not** replace
  any log (unlike `onRefused`, which stays as it is). Non-Refused outcomes carry the `entry`, so a
  caller can dead-letter a `Lost` entry or record a gap marker — the ADR-QD-056 question, answered by
  the caller, not decided by the library.
- **(C) A narrower `onLost?: (entry, outcome) => void`.** Covers the dead-letter case only.

Tradeoff: (B) commits a closed union to the public surface — a twelfth leaf later is a breaking minor
(the user's closed-union rule accepts that). It gives callers the one thing logs cannot: the entry
itself, programmatically, at the moment it is lost. **Recommendation: (B).** Additive; needs sign-off
as a public-API decision (gate 13). `status: decided (2026-10-08, recommended default)` — B (public `AuditWriteOutcome` + `onOutcome`)

### D-35-b — The union's shape

- **(A) Nested, four tags with per-tag staging sub-unions (11 leaves, no illegal states):**
  `Refused { refusal: AuditEntryNotEncodable }`;
  `Written { entry, staging: WrittenStaging }` with `WrittenStaging = NotWired | StageFailed | Committed | CommitFailed { cause }`;
  `WriteFailed { entry, staging: UnwrittenStaging }` and `Skipped { entry, staging: UnwrittenStaging }`
  with `UnwrittenStaging = NotWired | Staged | StageFailed`. `Skipped` = refused by the breaker.
- **(B) Flat 7-case union (the card's sketch):** `EncodeRefused | Written | WrittenCommitFailed | WriteFailedStaged | WriteFailedLost | SkippedStaged | SkippedLost`.
  Loses which of NotWired/StageFailed caused a loss, which the existing labels distinguish
  (`skipped_open` vs `failed_open`), so the projection could not reproduce today's metrics.
- **(C) Flat 11-case union.** Exact but repeats the staging distinction eleven times by name.

**Recommendation: (A).** It is the product the probe table shows, it reproduces every existing label,
and `durabilityOf` is a two-line nested `Match`. `status: decided (2026-10-08, recommended default)` — A (nested, four tags, 11 leaves)

### D-35-c — Which outcomes log, and at what level

- **(A) Every entry not in the trail is witnessed.** Lost (U2, U3, W5, W7) → `Effect.logWarning`
  `audit entry dropped: …` (U3/W7 messages unchanged; new: `…: trail write failed and no staging port wired`
  and `…: trail write failed and staging failed`). StagingOnly (W3, W6) → `Effect.logInfo`
  `audit entry not written: <trail write failed | circuit breaker open>; its staged copy is left for reconciliation`.
  CommitFailed and Refused unchanged.
- **(B) Losses only** (Warning for U2/W5 added; W3/W6 stay silent).
- **(C) Status quo** (U2/W5 silent). Rejected: C7 is a defect by ADR-QD-056's own standard.

Tradeoff: (A)'s Info line fires once per record while the breaker is open with staging wired — the
same volume U3 already logs at Warning when unwired. **Recommendation: (A).** T2 ships (B)'s part
first because every option except C includes it. `status: decided (2026-10-08, recommended default)` — A (every entry not in the trail is witnessed; Info for staged-only)

### D-35-d — Does `qadi_audit_writes_total` count breaker-refused records?

- **(A) Yes: a new label `writes{outcome="skipped_open"}`** for every `Skipped` leaf (U3, W6, W7).
  The description becomes true: `sum(writes_total)` = received. `staging_total` keeps its labels.
  A dashboard computing `write_failed / sum(writes_total)` sees the denominator grow during outages
  (correctly).
- **(B) Change the description** to "SinkRecords the pipeline attempted to write or refused to encode".
  No series change; the "received" count stays unobservable in one metric.
- **(C) Leave it.** The description stays false.

**Recommendation: (A).** Observable metric change → needs sign-off. `status: decided (2026-10-08, recommended default)` — A (`writes{skipped_open}`)

### D-35-e — A lost-entry counter

- **(A) `qadi_audit_entries_lost_total{after: "write_failed" | "skipped_open", staging: "not_wired" | "failed"}`**,
  updated exactly for `durabilityOf(outcome) === "Lost"`. The compliance question ("how many audit
  entries did we lose?") becomes one series; today it is not computable at all (C7).
- **(B) No new counter;** losses are visible only through logs and `onOutcome`.

**Recommendation: (A).** Additive. `status: decided (2026-10-08, recommended default)` — A (`qadi_audit_entries_lost_total`)

### D-35-f — `record` gets a span

- **(A) `Effect.fn("qadi.audit.record")`** around `record`, with `Effect.annotateCurrentSpan({ "qadi.audit.outcome": <leaf path, e.g. "WriteFailed.StageFailed">, "qadi.audit.durability": … })`.
  Closes the §5 deviation ARCH-07 deferred (C10). ≈ 2.8 µs per record, next to a store write.
  Attributes are closed words, never values (INV-QD-044's reasoning).
- **(B) Keep the arrow.** The `withPermit` span already exists per admitted record.

**Recommendation: (A).** Not breaking; ADR-QD-051 note in the ADR-056 amendment. `status: decided (2026-10-08, recommended default)` — A (`Effect.fn("qadi.audit.record")`)

### D-35-g — Amend ADR-QD-056 or a new ADR

- **(A) Dated amendment to ADR-QD-056** + a new invariant INV-QD-NEXT "every record has exactly one
  write outcome, and an entry not in the trail is witnessed". **(B)** New ADR-QD-NEXT.

**Recommendation: (A)** — a refinement of ADR-056's reporting standard, as ARCH-25 did. `status: decided (2026-10-08, recommended default)` — A (dated amendment to ADR-QD-056 + INV-QD-106)

## 6. Tasks

### T0 — Re-baseline
- **Status:** [x] done (2026-10-08) - probe not re-run; `git diff e635e68 HEAD` on audit src/test was empty (worktree starts at ce6d248), ARCH-42 not landed (isolatedMetrics still in test/helpers.ts)
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/35-audit-write-outcome main`; record `git rev-parse --short HEAD`.
  2. `git diff --stat e635e68 HEAD -- packages/audit/src packages/audit/test`. If anything moved,
     correct §1's line numbers in §10.
  3. Copy `scratchpad/wave4/ARCH-35/probe-exits.mts` to a fresh scratch dir, `ln -s <repo>/packages/audit/node_modules node_modules`
     there, run it as in §1, and confirm the table (U2 and W5 log `(none)`; U3/W6/W7 have no `writes` delta).
  4. Check whether ARCH-42 (`isolatedMetrics` into `@qadi/testing`) has landed; if so, import it from
  there in every new test.
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §1 is re-confirmed or corrected in §10.

### T1 — Pin the `failed_open` drop and the full commit message (test-only, kills 5 survivors)
- **Status:** [x] done (2026-10-08) - pins pass at HEAD; targeted Stryker not run
- **Depends on:** T0. No decision.
- **Files:** `packages/audit/test/Metrics.test.ts`.
- **Steps:**
  1. In `describe("qadi_audit_staging_total")`, after `:319`, add
     `it.effect("wired, the breaker open and stage() failing is tagged 'failed_open', not 'failed'")`.
     Trail: `AuditTrailPortTest({ failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }) })`;
     staging: `AuditStagingPortTest({ failStageWith: (entry) => entry.record.evaluationId === "lost" ? new AuditStagingError({ entry, cause: "staging offline" }) : undefined })`.
     Record `fail-0…fail-4` (trips at the default 5), then `lost`, under `isolatedMetrics`. Assert
     `staging{failed_open}.count === 1` and `staging{failed}` is **undefined** (kills `:177` `false`).
  2. Add `it.effect("wired, open and stage() failing also logs the drop warning, not just the metric")`
     with the capturing logger pattern of `:291-305`. Assert exactly one log, message **equal** to
     `"audit entry dropped: circuit breaker open and staging failed"`, `annotations.evaluationId === "lost"`
     (kills `:177` block, `:182`, `:183`).
  3. In the existing commit-warning test (`:473`), replace `assert.include(String(entry.message), "audit staging commit failed")`
     with an assertion that the message **starts with** the full two-part text
     `"audit staging commit failed: entry is durable in the trail, but its staged copy will remain marked uncommitted in the staging store"`
     (the cause follows; kills `:219`).
- **Tests:** two new, one tightened. They pass at HEAD (they pin, they do not reproduce a defect).
- **Verify:** `pnpm vitest run packages/audit/test/Metrics.test.ts`; optionally
  `pnpm exec stryker run stryker.audit.mjs --mutate packages/audit/src/AuditDecisionSinkLive.ts` and
  confirm 0 survivors in that file.
- **Done when:** the tests pass and the targeted Stryker run shows the 5 mutants killed.

### T2 — Test-first: an entry lost after a write failure is witnessed (defect C7, C9)
- **Status:** [x] done (2026-10-08) - red first (3 of 4 failed); fixed through the T5 projection rather than an interim patch
- **Depends on:** T0. No decision (every D-35-c option but the rejected C includes it).
- **Files:** `packages/audit/test/AuditDecisionSinkLive.test.ts`, `packages/audit/src/AuditDecisionSinkLive.ts`.
- **Steps:**
  1. Add `describe("AuditDecisionSinkLive — an entry lost after a write failure is witnessed")` with:
     - `it.effect("unwired, a failed write logs the drop with its evaluationId")`: trail fails every
       write (typed), no staging, capturing logger, `sink.record(decisionRecord({ evaluationId: "lost-u" }))`.
       Assert one log, message equal to `"audit entry dropped: trail write failed and no staging port wired"`,
       `evaluationId === "lost-u"`. **Red** (0 logs).
     - Same with `write: () => Effect.die(new Error("trail bug"))` (a defect is a loss too). **Red.**
     - `it.effect("wired, a failed stage then a failed write logs the drop")`: staging fails stage,
       trail fails write; message `"audit entry dropped: trail write failed and staging failed"`. **Red.**
     - `it.effect("wired, a staged entry whose write fails is not reported as dropped")`: staging ok,
       write fails; assert **no** log containing `"dropped"` (W3 is recoverable). Green now, stays green.
  2. Fix minimally inside the `Admitted` arm (`:228-232`): `commitStaged` is undefined in both U2 and W5,
     but W4/W5 must be told apart from U2. Track the staging result in a local
     `let staging: "NotWired" | "Staged" | "StageFailed"` set where `commitStaged`/`stagingFailed` are
     set (`:165-201`). In the failure branch: if `staging !== "Staged"`, `yield* Effect.logWarning(staging === "NotWired" ? <U2 message> : <W5 message>).pipe(Effect.annotateLogs({ evaluationId: entry.record.evaluationId }))`.
     Comment it `// replaced by the AuditWriteOutcome projection in ARCH-35 T5`.
  3. Correct `stagingFailed`'s doc comment (`:81-87`): the entry is recoverable through the trail
     **only if the write then succeeds**; if it fails, the entry is lost and logged (C9).
- **Tests:** four new `it.effect`s, three red-first.
- **Verify:** `pnpm vitest run packages/audit/test/AuditDecisionSinkLive.test.ts packages/audit/test/Metrics.test.ts`.
- **Done when:** all pass. Ships alone as an `@qadi/audit` patch: changeset "an audit entry lost after
  a failed trail write is now logged with its `evaluationId`".

### T3 — Test-first: `writes_total` counts every received record (defect C8)
- **Status:** [x] done (2026-10-08) - red first (2 of 2 failed); fixed through the T5 projection
- **Depends on:** T0, **D-35-d**.
- **Files:** `packages/audit/test/Metrics.test.ts`, `packages/audit/src/AuditDecisionSinkLive.ts`.
- **Steps (D-35-d = A):**
  1. Add `it.effect("every record received is counted once in qadi_audit_writes_total, breaker-refused ones too")`:
     unwired, `failureThreshold: 1`, trail fails; record 3 records (1 trips, 2 skipped). Assert
     `sum over writes_total rows === 3` and `writes{skipped_open}.count === 2`. **Red** (sum is 1).
  2. Repeat wired (W6 and W7 leaves): staging ok for one skipped record, failing for the other; sum 3.
  3. Fix: declare `const writesSkippedOpen = Metric.withAttributes(writesTotal, { outcome: "skipped_open" })`
     at module scope beside `:73-75`, and in the `Refused` arm (`:210`) `Metric.update(writesSkippedOpen, 1)`.
- **Steps (D-35-d = B):** change the description string at `:71` and its pin at `Metrics.test.ts:122`;
  add a test that documents `sum(writes_total) = received − skipped` instead.
- **Tests:** two new, red-first under A.
- **Verify:** `pnpm vitest run packages/audit/test/Metrics.test.ts`.
- **Done when:** both pass. Ships alone as a patch (changeset names the new label).

### T4 — The outcome module: union, `durabilityOf`, and the pure projection
- **Status:** [x] done (2026-10-08) - split: public `AuditWriteOutcome.ts` (union, `durabilityOf`) + package-private `AuditWriteReport.ts` (projection, counters, `emitWriteOutcome`), so the labels stay out of the barrel (ADR-QD-099)
- **Depends on:** T1–T3, D-35-a, D-35-b, D-35-c, D-35-e.
- **Files:** `packages/audit/src/AuditWriteOutcome.ts` (*new*), `packages/audit/test/AuditWriteOutcome.test.ts` (*new*).
- **Steps:**
  1. Define with `Data.taggedEnum` (precedent: core's `EncodeRefusal`):
     `WrittenStaging = NotWired | StageFailed | Committed | CommitFailed { cause: Cause.Cause<AuditStagingError> }`,
     `UnwrittenStaging = NotWired | Staged | StageFailed`,
     `AuditWriteOutcome = Refused { refusal: AuditEntryNotEncodable } | Written { entry: AuditEntry; staging: WrittenStaging } | WriteFailed { entry; staging: UnwrittenStaging } | Skipped { entry; staging: UnwrittenStaging }`.
     Each type gets a one-line doc, then the "why" (D-35-b). `StageFailed` carries no cause (today's
     code logs none; adding one is a separate decision).
  2. `export type Durability = "Trail" | "StagingOnly" | "Lost" | "Refused"` and
     `durabilityOf: (self: AuditWriteOutcome) => Durability` — a module-scope `Match.type` with nested
     `Match.type<UnwrittenStaging>()`: `Written → Trail`; `WriteFailed`/`Skipped` with `Staged → StagingOnly`,
     else `Lost`; `Refused → Refused`.
  3. The projection, pure: `describeAuditWriteOutcome: (self) => AuditWriteReport` where
     `AuditWriteReport = { writes: WritesLabel; staging: ReadonlyArray<StagingLabel>; lost: LostLabel | undefined; log: LogLine | "encodeRefusal" | undefined }`,
     `WritesLabel = "encode_failed" | "written" | "write_failed" | "skipped_open"` (last one only if
     D-35-d = A), `StagingLabel = "staged" | "failed" | "skipped_open" | "failed_open" | "commit_failed"`,
     `LostLabel = { after: "write_failed" | "skipped_open"; staging: "not_wired" | "failed" }`,
     `LogLine = { level: "Warning" | "Info"; message: string; cause: Cause.Cause<unknown> | undefined }`.
     The arms reproduce §1's table plus D-35-c's lines. Note W2's labels are `["staged", "commit_failed"]`.
  4. `emit`: an `Effect.fn("qadi.audit.emitWriteOutcome")` taking `(outcome, options)`; maps labels to
     the existing module-scope counters through `Record<WritesLabel, Metric.Counter<number>>` /
     `Record<StagingLabel, …>` (move the counter declarations from the sink into this module, unchanged
     ids/descriptions/attributes); logs the `LogLine` annotated `{ evaluationId }`; for
     `"encodeRefusal"` calls `reportEncodeRefusal(refusal, { message: <unchanged>, onRefused: options.onRefused })`;
     updates the lost counter when `lost` is set (D-35-e = A); then calls `options.onOutcome` (D-35-a = B)
     under `Effect.sync(...).pipe(Effect.catchCause(logWarning("qadi/audit: an onOutcome hook threw") + evaluationId + "qadi.cause"))`.
  5. Tests (`AuditWriteOutcome.test.ts`), all pure, no registry, no logger:
     - **The projection table:** one row per leaf (11), asserting `describeAuditWriteOutcome(leaf)`
       deep-equals the expected report — exact labels, exact message, exact level.
     - `durabilityOf` per leaf (11 rows).
     - A type test (`packages/audit/test/AuditWriteOutcome.tst.ts`, *new*, if the package runs tstyche;
       confirm in T0, otherwise `@ts-expect-error` lines in the vitest file): `Written` rejects a
       `staging: Staged` (illegal state), `Skipped` rejects `Committed`.
- **Verify:** `pnpm vitest run packages/audit/test/AuditWriteOutcome.test.ts`; `pnpm circular`.
- **Done when:** 22 table rows pass; madge clean.

### T5 — The sink returns an outcome and emits it once
- **Status:** [x] done (2026-10-08)
- **Depends on:** T4, D-35-f.
- **Files:** `packages/audit/src/AuditDecisionSinkLive.ts`.
- **Steps:**
  1. Inside the layer, write `writeRecord = (sinkRecord): Effect.Effect<AuditWriteOutcome>`: encode →
     `Refused`; else `breaker.withPermit((permit) => …)` returning the outcome: stage under
     `Effect.exit` into an `UnwrittenStaging`; on `Refused` permit → `Skipped { entry, staging }`; on
     `Admitted` → `admitted.attempt(trailPort.write(entry))`; on failure → `WriteFailed { entry, staging }`;
     on success, if `Staged`, commit under `Effect.exit` → `Committed` / `CommitFailed { cause }`, then
     `Written { entry, staging }`. No `Metric.update`, no `Effect.log*` in this function.
  2. Emit **inside** `withPermit`'s `use` for non-Refused outcomes (`… .pipe(Effect.tap((o) => emit(o, options)))`),
     so metrics land in the same scope as today and a caller interruption after the write still
     loses nothing that was not already lost before. Refused emits outside, as today.
  3. `record = (sinkRecord) => writeRecord(sinkRecord)…` — if D-35-f = A, make it
     `Effect.fn("qadi.audit.record")` and annotate the span with the leaf path and durability.
  4. Delete T2's interim local logging and the moved counter declarations. Add
     `readonly onOutcome?: (outcome: AuditWriteOutcome) => void` to `AuditDecisionSinkOptions` (D-35-a = B),
     doc: called once per record, after metrics and logs; never replaces a log; a throw is logged.
  5. `grep -c "Metric.update\|Effect.log" packages/audit/src/AuditDecisionSinkLive.ts` → 0.
- **Tests:** none added; every existing test in `Metrics.test.ts`, `AuditDecisionSinkLive.test.ts`,
  `Agreement.test.ts`, `CircuitBreaker.test.ts` passes **unmodified**, plus T1–T3.
- **Verify:** `pnpm vitest run packages/audit/test`; `pnpm typecheck`; `node scripts/check-house-style.mjs`.
- **Done when:** all green; the grep holds.

### T6 — The lost-entry counter (D-35-e)
- **Status:** [x] done (2026-10-08) - counter lives in `AuditWriteReport.ts`; label pairs asserted in `Metrics.test.ts` via `driveExit`
- **Depends on:** T5, D-35-e (= A).
- **Files:** `packages/audit/src/AuditWriteOutcome.ts`, `packages/audit/test/Metrics.test.ts`.
- **Steps:** declare `qadi_audit_entries_lost_total` at module scope with description
  `"Audit entries in neither the trail nor staging, by what failed."` and the four `Metric.withAttributes`
  combinations as named constants in a closed `Record`; `emit` updates it from `report.lost`. Test:
  drive U2, U3, W5, W7 and W3/W6, assert counts 1 each for the lost four and absence for the
  recoverable two; pin the description.
- **Verify:** `pnpm vitest run packages/audit/test/Metrics.test.ts`.
- **Done when:** passes.

### T7 — Exits → outcome: the table test, replacing the scattered pins
- **Status:** [x] done (2026-10-08) - harness is `test/driveExit.ts` (not helpers.ts), table in `test/AuditWriteExits.test.ts`; 18 exits
- **Depends on:** T5 (and D-35-a: with B the table reads `onOutcome`; with A it imports `writeRecord`'s
  outcome through a package-private test seam — prefer B).
- **Files:** `packages/audit/test/AuditWriteOutcome.test.ts`, `packages/audit/test/Metrics.test.ts`,
  `packages/audit/test/helpers.ts`.
- **Steps:**
  1. In `helpers.ts`, add `driveExit(spec: { wired: boolean; open: boolean; encode: "ok" | "refused"; stage: "ok" | "fail" | "die"; write: "ok" | "fail" | "die"; commit: "ok" | "die" })`
     returning `{ outcome, metrics, logs, rows }` — the probe's harness, typed (no `Record<string, unknown>`;
     a closed `LabelCounts` type keyed by `WritesLabel`/`StagingLabel`).
  2. A table over every reachable spec (≥ 14 rows incl. typed/defect variants) asserting
     `outcome` (tag + staging tag), `durabilityOf(outcome)`, and that the **observed** metrics and log
     messages equal `describeAuditWriteOutcome(outcome)` — one assertion tying T4's pure table to
     reality, so the projection cannot drift from what is emitted.
  3. **Replace, don't layer:** delete from `Metrics.test.ts` the per-label tests that the table now
     covers (`:27-108` writes labels, `:264-476` staging labels and the two "also logs" tests), keeping
     the three `carries its documented description` tests and the whole
     `qadi_audit_circuit_breaker_transitions_total` block (`:126-261`), which tests the breaker.
     Keep T1's two W7 tests only if the table does not assert exact message + annotation (it should).
- **Verify:** `pnpm vitest run packages/audit/test`; `pnpm coverage` (audit ≥ 90).
- **Done when:** green, and `Metrics.test.ts` holds only descriptions and transitions.

### T8 — Spec, ADR, overview, traceability, docs, changeset
- **Status:** [x] done (2026-10-08)
- **Depends on:** T4–T7.
- **Files:** `spec/decisions/056-audit-companion-package.md`, `spec/behaviors/33-audit-pipeline.md`,
  `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md`,
  `packages/audit/README.md`, `apps/website/src/content/docs/docs/packages/audit/capabilities.md`, `.changeset/*.md` (*new*).
- **Steps:** every edit in §8; then `node scripts/check-api-surface.mjs`, `node scripts/check-doc-examples.mjs`.
- **Verify:** `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates`.
- **Done when:** all pass.

### T9 — Full gate, mutation first
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T1–T8.
- **Steps:** `pnpm exec stryker run stryker.audit.mjs`; expect 0 survivors in `AuditDecisionSinkLive.ts`
  and `AuditWriteOutcome.ts` (every arm pinned by T4's table under `ignoreStatic`). A survivor is a
  missing row, never a suppression (ADR-QD-076). Then `pnpm check`.
- **Verify:** `pnpm check`.
- **Done when:** green; record the new audit score in §10 and in ADR-056's "Implemented" line.

### T10 — Update the tracker
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T9.
- **Files:** this plan (frontmatter, boxes, §10). The orchestrator owns the README row.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-35-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Two tables, one tie.** Exits → outcome (T7, over the real sink with scripted ports) and
  outcome → report (T4, pure). T7's tie assertion — observed effects equal the projection — means the
  pure table is the single place to read "what does leaf X report", and it cannot drift.
- **Survive unchanged:** `CircuitBreaker.test.ts` (whole), `Agreement.test.ts` (INV-QD-051),
  `AuditDecisionSinkLive.test.ts` pipeline/probe/interrupt tests (`:19-519`), ARCH-25's encode-refusal
  block (`:521-621`), the transitions block in `Metrics.test.ts`.
- **Deleted as redundant (T7):** the per-label `Metrics.test.ts` tests, after T5 has shown they pass
  unmodified against the new code.
- **New:** T1 (pins), T2 (red-first ×3), T3 (red-first ×2), T4 (22 pure rows + type test), T6, T7.
- **Mutation:** the five survivors in this file die in T1; the projection arms are per-call and pinned
  row by row. Expected package score ≥ 88.6 %; the rest of the gap is the breaker (§9).
- **Property:** not needed — the domain is finite (11 leaves × typed/defect variants) and enumerated.

## 8. Spec and documentation updates

- **ADR-QD-056:** dated amendment (CCR-QD-NEXT), revision 1.10: every record has exactly one write
  outcome (`Written`, `WriteFailed`, `Skipped`, `Refused` × staging); an entry not in the trail is
  witnessed — lost by a warning naming its `evaluationId` (now including a failed write, unwired or
  after a failed stage), staged-only by an info line; `writes_total` counts every received record
  (D-35-d); `qadi_audit_entries_lost_total` (D-35-e); `onOutcome` gives a caller the lost entry, which
  is how a deployment can build the gap marker this ADR leaves open — the library still writes none.
  `record` has a span (D-35-f, ADR-QD-051 note). Update "Implemented" with the new mutation score.
- **BEH-QD-249:** the `ts` fence gains `onOutcome`. **BEH-QD-251/252:** new REQUIREMENTs — "an
  entry neither written nor staged MUST be reported by a warning naming its evaluation id"; "a
  staged entry not written SHOULD be reported at info"; "`qadi_audit_writes_total` MUST count every
  record `record()` receives exactly once". List the 11 leaves as a table in prose under BEH-QD-252.
  Bump the document revision.
- **Invariants:** INV-QD-NEXT "Every audit record has exactly one write outcome, and an entry not in
  the trail is witnessed". Source: `AuditWriteOutcome.ts`. Enforcement: T7's table and T4's projection.
  Related: INV-QD-051, INV-QD-052, INV-QD-104.
- **`spec/overview.md`** (gate 13, if D-35-a = B): `AuditWriteOutcome`, `WrittenStaging`,
  `UnwrittenStaging`, `Durability` (types), `durabilityOf`, `describeAuditWriteOutcome` (functions,
  or list the latter under "Not listed above" if kept internal), and `AuditDecisionSinkOptions` row
  notes `onOutcome`.
- **Traceability:** `AuditWriteOutcome.test.ts` → BEH-QD-251, BEH-QD-252, INV-QD-NEXT; the
  `Metrics.test.ts` row narrows to BEH-QD-249/251 (descriptions, transitions).
- **CCR register:** CCR-QD-NEXT listing every file.
- **Docs:** `packages/audit/README.md` and website `capabilities.md` gain a short "What the pipeline
  reports" table (outcome → metric → log), the first place outside code the metrics are listed.
- **Changeset:** `@qadi/audit` minor (`onOutcome`, new label and counter, new log lines); T2/T3 may
  ship earlier as patches.

## 9. Risks and rollback

- **Log/alert volume (D-35-c):** with staging wired and the breaker open, one Info line per record.
  Mitigation: Info, not Warning; `onOutcome` lets a caller aggregate.
- **Dashboard shift (D-35-d):** `sum(writes_total)` grows by the skipped records. Called out in the
  changeset; no label is renamed.
- **Emission timing:** reports move from mid-record to end-of-`use`. No test observes intermediate
  metrics; a caller interruption before `emit` drops the report of a record whose write already ran —
  the same window as today between `attempt` and `Metric.update(writesWritten)`.
- **Public union churn (D-35-a = B):** a future leaf is a breaking minor. Accepted (closed-union rule).
- **Overlap:** ARCH-42 may move `isolatedMetrics` into `@qadi/testing` — whichever lands second rebases
  the imports. ARCH-38 also amends ADR-QD-056 and `33-audit-pipeline.md`: land sequentially; the second
  takes the next revision numbers. ARCH-30 touches `SignatureCapturePort.ts` and the audit barrel only.
- **Orphan (out of scope):** `CircuitBreaker.ts` holds 38 of audit's 55 surviving mutants
  (generation guards `:298-303`, `:324-327`, `releaseProbe`'s condition `:374-378`, admission `:383-387`,
  the `withPermit` span attributes `:412-417`). That, not this file, is why audit has the lowest score.
- **Rollback:** T1–T3 are independent patches. T4–T7 revert together; T5's "existing tests unmodified"
  rule means a revert restores identical behaviour except the T2/T3 fixes.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence re-verified at `e635e68` with `probe-exits.mts` and the audit mutation report | planner |
| 2026-10-08 | T1 | W7 metric + log pins and the full commit message pinned (Metrics.test.ts) | impl agent |
| 2026-10-08 | T2 | red: "unwired, a failed write logs the drop with its evaluationId", "unwired, a write that dies is a loss too and logs the same drop", "wired, a failed stage then a failed write logs the drop" (AuditDecisionSinkLive.test.ts); green after T5 | impl agent |
| 2026-10-08 | T3 | red: "unwired, every record received is counted once, breaker-refused ones as 'skipped_open'", "wired, a breaker-refused record is counted whether or not it was staged"; green after T5 | impl agent |
| 2026-10-08 | T4-T7 | AuditWriteOutcome.ts, AuditWriteReport.ts, sink returns an outcome and emits once (0 `Metric.update`/`Effect.log` in the sink); lost counter; 11-leaf pure table + 18-exit table; per-label Metrics tests deleted as redundant. Two existing tests asserted exactly one log with 5 prior failed writes; they now filter on the breaker/drop message (U2 now logs, plan claim "pass unmodified" was wrong for those two) | impl agent |
| 2026-10-08 | T8 | ADR-QD-056 Rev 1.10, BEH-33 Rev 1.12, INV-QD-106, overview 1.57, traceability 1.106, README 1.102 (CCR-QD-203), audit README + website table, changeset `audit-write-outcome.md`; api-surface, doc-examples, spec:verify:strict, dod-table, claims, website-examples green; audit coverage 98.8% | impl agent |
| 2026-10-08 | T9 | NOT run: `stryker run stryker.audit.mjs` and full `pnpm check` (heavy, out of brief scope) | impl agent |
