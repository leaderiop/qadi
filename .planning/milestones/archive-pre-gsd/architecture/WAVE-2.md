> Moved verbatim out of `README.md`. The tracker README keeps the active wave.

# Wave 2: the 2026-10-05 review (ARCH-08 to ARCH-15)

These plans resolve the candidates from the 2026-10-05 architecture review that were **still open on `arch/integration`**.
The report is outside the repo, at `/private/tmp/claude-502/…/scratchpad/architecture-review-20261005-145439.html`. That review ran against `main`,
and ARCH-01 to ARCH-07 already resolve several of its candidates. Those candidates are listed under "Superseded" below and get no plan.
Every wave-2 plan re-verified its evidence against **`e0ee958`** (`arch/integration`) using scratch probes outside the repo.

**Prerequisite.** These plans build on ARCH-01 to ARCH-07. Implement them on a branch cut from `arch/integration`, or better, after
`arch/integration` has passed CI and merged to `main`. In that case, first re-point `evidence_verified_at` and re-run each plan's §1 probes.

**Disk.** On 2026-10-05 the volume had about 2.3 GiB free, after the worktree cleanup. A full `pnpm check`, Stryker, or an extra worktree per plan
will need more. Free space before fanning out implementation agents.

## Plans

| ID | Plan | Review strength | Status | Tasks | Decisions | Estimate | Depends on |
| -- | ---- | --------------- | ------ | ----- | --------- | -------- | ---------- |
| [ARCH-08](ARCH-08-comparison-semantics.md) | One owner for comparison semantics: `Compare.ts` and a five-way `Verdict` | Strong | implemented | 16/17 (T17 deferred to final gate) | 9 (D-08-a…i) | L | — |
| [ARCH-09](ARCH-09-sinkcodec-outbound-inbound.md) | SinkCodec owns the outbound and inbound path: four `Result` functions and two refusal errors | Strong | implemented (branch `arch/deepening-10`; T13 deferred to final gate) | 12/13 | 7 (D-09-a…g) | L | — (blocks ARCH-15, and ARCH-11 T5) |
| [ARCH-10](ARCH-10-port-descriptions.md) | Describe each port once, then derive its wrappers, fail-closed default, environment type and scriptable test double | Strong | implemented (branch `arch/deepening-10`; T22 deferred to final gate) | 21/22 | 12 (D-10-a…l) | XL | ARCH-01, ARCH-04 (landed) |
| [ARCH-11](ARCH-11-decision-log.md) | One decision log: sink, backlog and live stream in one module; environment carried on the wire | Worth exploring | implemented (branch `arch/deepening-10`; T14 deferred to final gate) | 13/14 | 9 (D-11-a…i) | XL | ARCH-09 (T5 only) |
| [ARCH-12](ARCH-12-field-lattice-merge.md) | Field-strategy merging moves into `FieldLattice.ts` | Worth exploring | implemented | 11/12 (T12 deferred to final gate) | 6 (D-12-a…f) | M | — |
| [ARCH-13](ARCH-13-combinator-child-driver.md) | One child-loop driver for `allOf`/`anyOf`/`rules`, behind a benchmark gate | Speculative | dropped (D-13-a measured DROP; T0/T1/T4 landed, CCR-QD-171/176) | 5/14 (T5–T13 dropped) | 8 (D-13-a…h) | L (S if DROP) | ARCH-12 (soft) |
| [ARCH-14](ARCH-14-one-decision-read.md) | One `outcomeOf` decides what a gate renders, so the stale-allow rule lives once | Worth exploring | implemented | 12/13 (T11 deferred to final gate) | 8 (D-14-a…h) | L | ARCH-05, ARCH-06 (landed) |
| [ARCH-15](ARCH-15-wire-outcome-union.md) | An exclusive outcome union on the wire under `version: 2`; the three planned minors landed in one release (ADR-QD-903) | Speculative | implemented (branch `arch/deepening-10`; T14 deferred to final gate) | 14/15 | 10 (D-15-a…j) | L | ARCH-09 |

**Totals:** 120 tasks, 69 open decisions.

### Superseded review candidates (resolved by ARCH-01 to ARCH-07; no plan)

| 2026-10-05 candidate | Resolved by | Residual |
| -------------------- | ----------- | -------- |
| 04, HTTP enforcement outcome | ARCH-04 (`ENFORCEMENT_ERROR_WIRE`, one status table) | The bare route stays bodyless while HttpApi returns a body. ADR-QD-072 keeps this asymmetry on purpose. |
| 05, dialect translatable subset | ARCH-03 (`PredicateLiteral.ts`, `RenderablePredicate.ts`, one `PredicateNotRenderable`) | Non-finite *row* values, which ARCH-08 covers. |
| 06, circuit breaker runs the write | ARCH-07 (`withPermit`) | none |
| 07, hydration as an atom-set capability | ARCH-05 and ARCH-06 | The triple stale-decision read, which ARCH-14 covers. |
| 03, port boundary: call wrapping, and `toPredicate` calling ports bare | ARCH-01 (`PortAccess.ts`), ARCH-04 T3 | The wrapper matrix, doubles and environment type, which ARCH-10 covers. |
| Parked: "Decision described twice" | ARCH-05 (`DecisionWire.ts`) | none |

## Defects found while planning: ship these first

Each one is a test-first task that ships on its own, ahead of the refactor it sits in.

| Plan · task | Defect | Severity | Blocked on |
| ----------- | ------ | -------- | ---------- |
| ARCH-08 · T1–T4 | **`toPredicate` fails open.** It admits rows of `±Infinity` under `gte`/`lt` that `evaluate` denies. Compiled SQL and Prisma admit them too, and Postgres admits NaN rows, because NaN sorts above every number. T1 alone moves the fail-open into SQL rather than removing it; the renderer guard is T4. | **fail-open** | T1–T3: nothing. T4: D-08-f, and D-08-g for Prisma (spike T5). |
| ARCH-12 · T1–T3 | Three ways a policy built in code (not decoded JSON) fails open: an `anyOf` whose strategy is a prototype key (`"toString"`, `"__proto__"`) grants every field; `simplify` changes `visibleFields`, against INV-QD-024, in one case widening from none to all; an unknown `combining` permits where `DenyOverrides` denies. | **fail-open** (in-code policies) | T1: nothing. T2: D-12-d. T3: D-12-f. |
| ARCH-09 · T1–T2 | A circular `cause` crashes every SSE subscriber. Error causes serialize as `{}` on the SSE and audit paths. The guard accepts `Map`/`Set`/`RegExp`. Five poisoned `Failed` records trip the audit breaker, so healthy rows get dropped. Forwarding misreports encode failures as send failures. | crash / data loss | D-09-g (rec. ship the hotfix) |
| ARCH-14 · T1 | The published React guide (`react-integration.md` §5) and the website's `hooks.md` show the editor during a re-check, which is a stale allow. Both compile, so no gate notices. A `Failure` also keeps the previous allow in `previousSuccess`. | stale allow (docs) | nothing |
| ARCH-10 · T1 | `relationshipResolverRetrying` and `customPredicateRetrying` don't record `qadi.attempts`, though their docs say they mirror the attribute retry wrapper. | observability | nothing |
| ARCH-15 · T0–T2 | `@qadi/audit` has no strict decode: it strips policy typos and accepts records with both outcomes or neither. Since 0.5.0, pre-0.5 audit rows don't decode (`failed.code`). BEH-QD-200 *requires* the fabricated `MissingResource`. | audit integrity | nothing |
| ARCH-11 · T1–T2 | The ring-plus-feed recipe loses records made between reading the backlog and subscribing. Edge rows never reach the dock. `/api/backlog` fails to decode every row. BEH-QD-201 says `publishUnsafe` but the code uses `publish`. | devtools data loss | nothing |
| ARCH-13 · T0–T1 | `pnpm bench` fails on six single-benchmark `bench.compare` calls under vitest 5, on `main` too. BEH-QD-134 contradicts INV-QD-020 (CCR-QD-152). **T1 replaces ARCH-12 T4 step 3.** | tooling / spec | nothing |

**Startable now, no decision needed:**
- ARCH-08 T1–T3
- ARCH-10 T1
- ARCH-11 T1–T2
- ARCH-12 T1
- ARCH-13 T0–T1
- ARCH-14 T1
- ARCH-15 T0–T2
- ARCH-09 T1, the red tests (T2 needs only D-09-g)

## Claims the review got wrong (wave 2)

- **ARCH-08:** `foldAttribute` no longer exists, because ARCH-01 replaced it. ADR-QD-079 doesn't restate the false Infinity claim; its wording is incomplete rather than wrong.
- **ARCH-09:** hydration doesn't route through SinkCodec. It carries `Decision`s, not records, as RSC props. The comment calling `encodeRecordSync` "provably total" is wrong: it throws on policies nested about 5,000 levels deep.
- **ARCH-10:** `toPredicate` no longer reads ports bare (ARCH-01). `wrapService` *is* exported, just not from the barrel. There are 65 hand-rolled failing doubles across 27 files, not about 48. The real blocker is that core tests can't depend on `@qadi/testing`.
- **ARCH-11:** the ring and feed bounds differ (500 vs 256); only the eviction direction agrees. The 500 kept in step by comment is devtools' `DEFAULT_TIMELINE_CAPACITY`.
- **ARCH-12:** ARCH-02 already fixed `restrictsFields` and both duplicate tag registries in code. Only INV-QD-003's Source text still names them.
- **ARCH-13:** `Rules.test.ts` has no concurrency tests; they all live in `Evaluate.test.ts:3352-3896`.
- **ARCH-14:** the suspected live divergence is refuted. Across every real atom state, `currentDecision`, `classify` and `renderStateOf` disagree 0 times.
- **ARCH-15:** React hydration doesn't embed `SinkRecordWire`, and devtools `Capture.ts` isn't a wire consumer.

## Decision register (wave 2)

The full options and tradeoffs are in each plan's §5. "Rec." is the plan's recommendation. Where two plans conflict, the reconciliation note at the top of ARCH-11 and ARCH-15 decides.

| ID | Question | Rec. | Status |
| -- | -------- | ---- | ------ |
| D-08-a | Where the comparison module lives | internal `core/src/Compare.ts`, not in the barrel | decided (2026-10-05, (i) — recommended default) |
| D-08-b | Result shape | five-way `Verdict`: `Held`, `NotHeld`, `ValueAbsent`, `ReferenceAbsent`, `Incomparable` | decided (2026-10-05, (iii) — recommended default) |
| D-08-c | `evaluateMatcher` and the budgeted switch | new public `judgeMatcher` takes the switch; `evaluateMatcher` delegates (benchmark-gated) | decided (2026-10-05, (i) — by measurement: within baseline spread after module-local bindings; direct calls regressed ~2.4x/leaf under vitest) |
| D-08-d | Denial-reason text | built from the `Verdict`; delete `refIsUnresolved` | decided (2026-10-05, (i) — recommended default) |
| D-08-e | Fix first? | yes, the one-line guard (T1) | decided (2026-10-05, (i) — recommended default) |
| D-08-f | SQL exclusion of non-finite rows | `AND col - col = 0` on Postgres and SQLite, nothing on MySQL (SQL text changes, breaking) | decided (2026-10-05, (i) — recommended default) |
| D-08-g | Prisma | required `floating` declaration, spike first (T5); if the spike fails, refuse `Gte`/`Lt` on those columns | decided (2026-10-05, (iii) — by measurement: T5 spike showed `lte: MAX_VALUE` unsound on Prisma 7.10/SQLite) |
| D-08-h | `In` and an absent value | deny, like every other matcher | decided (2026-10-05, (i) — recommended default) |
| D-08-i | Devtools witnesses | check every synthesised witness against `judgeMatcher` | decided (2026-10-05, (i) — recommended default; per-leaf post-check) |
| D-09-a | Codec interface | `encodeSinkRecord`, `encodeSinkRecordString`, `decodeSinkRecord`, `decodeSinkRecordString` (pure, return `Result`) | decided (2026-10-05, A — recommended default) |
| D-09-b | Refusal types | `SinkRecordNotEncodable` and `SinkRecordNotDecodable` (`Data.TaggedError` with closed `TaggedEnum` reasons) in `Errors.ts`; new ACL codes | decided (2026-10-05, (i) — recommended default) |
| D-09-c | What outbound refuses | walk the whole Schema-encoded output; depth bound equals the decoder's | decided (2026-10-05, (i) — recommended default) |
| D-09-d | Audit row content | the encoded wire, plus a guarded `decodeAuditEntry` returning `Result` | decided (2026-10-05, (B) — recommended default) |
| D-09-e | Refusal reporting | forwarding through `onFailure`; SSE through `onRefused` or a log | decided (2026-10-05, (i) — recommended default) |
| D-09-f | Devtools `MalformedReason` | `"not-json" \| "too-deep" \| "not-a-record"` (ARCH-15 adds `"unsupported-version"`) | decided (2026-10-05, (i) — recommended default) |
| D-09-g | Hotfix first | yes (T2) | decided (2026-10-05, (i) — recommended default) |
| D-10-a | Arity differences between ports | a typed adapter over each port's one method; Shapes unchanged | decided (2026-10-05, rec. — recommended default) |
| D-10-b | Where descriptions live | beside each service; shared code in `PortDescription.ts` (absorbs `RetryingLayer.ts`); `Ports.ts` lists all five | decided (2026-10-05, rec. — recommended default) |
| D-10-c | Public surface | descriptions, environment builders and doubles public; scaffolding internal | decided (2026-10-05, rec. — recommended default) |
| D-10-d | Fail-closed defaults | derived from the descriptions | decided (2026-10-05, rec. — recommended default) |
| D-10-e | `PortAccess.ts` defect constructors | from the descriptions, identical output | decided (2026-10-05, rec. — recommended default) |
| D-10-f | `@qadi/testing`'s 11 per-port modules | delete (breaking) | decided (2026-10-05, rec. — recommended default) |
| D-10-g | Core test-helper override keys | rename to port names (codemod) | decided (2026-10-05, rec. — recommended default) |
| D-10-h | Wrapper metric domains | delete `RetryingPortName`/`TimingOutPortName`; registry keys unchanged | decided (2026-10-05, rec. — recommended default) |
| D-10-i | Devtools shows timeouts | yes | decided (2026-10-05, rec. — recommended default) |
| D-10-j | Ratchet on hand-rolled doubles | test-scope `PORT_DOUBLE_BUDGET` | decided (2026-10-05, rec. — recommended default) |
| D-10-k | Span name in the description | yes | decided (2026-10-05, rec. — recommended default) |
| D-10-l | Scripted reply kinds | answer, fail, die or throw | decided (2026-10-05, rec. — recommended default) |
| D-11-a | Deep module | `makeDecisionLog` in core (sink + backlog + live stream); `ingest` reaches live readers | decided (2026-10-05, A — recommended default) |
| D-11-b | Ring, feed, `sourceFromFeed` | delete in the same release (breaking) | decided (2026-10-05, A — recommended default) |
| D-11-c | Devtools `Source` | one scoped `read`; the log is passable as a source | decided (2026-10-05, B — recommended default) |
| D-11-d | Bound | one bound, default 500; 0 rejected | decided (2026-10-05, A — recommended default) |
| D-11-e | Environment on the wire | `{environment, record}` frame envelope; bare frames accepted for one minor | decided (2026-10-05, A — recommended default) |
| D-11-f | SSE backlog | backlog, then a `synced` marker, then live; plus a guarded JSON backlog route | decided (2026-10-05, C — recommended default) |
| D-11-g | Resume on reconnect | `Last-Event-ID`, last task | decided (2026-10-05, B — recommended default) |
| D-11-h | `StoredRecord` and ordering rule | move to `DecisionRecord.ts` | decided (2026-10-05, A — recommended default) |
| D-11-i | `decisionStreamRoute` input | takes the log | decided (2026-10-05, A — recommended default) |
| D-12-a | Module | internal `FieldLattice.ts`; `Decision.ts` re-exports, including a new public `mergeFields` | decided (2026-10-05, A — recommended default) |
| D-12-b | Dispatch | own-property law table; `SWITCH_BUDGET` 4→3 if the T4 benchmark shows no slowdown, otherwise the switch just moves | decided (2026-10-05, (b) — by measurement: table 0.97× the switch per dispatch; field-heavy Intersection +6.2% / Union −1.0% end to end, 6 paired runs) |
| D-12-c | `Intersection` output bytes | when two specs mean the same thing, keep the smaller one (independent of child order) | decided (2026-10-05, (ii) — recommended default) |
| D-12-d | `simplify` | consult the lattice's laws before flattening or unwrapping | decided (2026-10-05, (i) — recommended default) |
| D-12-e | `anyOf` short-circuit rule | owned by the lattice; `anyOfStopsAtAllow` reads it | decided (2026-10-05, (i) — recommended default) |
| D-12-f | Unknown `combining` | fail closed to `DenyOverrides` | decided (2026-10-05, (i) — recommended default) |
| D-13-a | Benchmark gate | vitest bench plus an in-process harness, calibrated for noise; hard fail at 5% slower by both. Outcomes: generic → evaluator-specific → folds only → DROP (ADR-QD-073 addendum) | decided (2026-10-05, A — by measurement: inconclusive twice (N_w > 10% on 16/26, load 17–198) → **DROP**; min-latency: up to 15% slower sequential (getter artefact), 14–26% slower concurrent allOf/anyOf in every variant) |
| D-13-b | Untraced site | the driver is the single `Effect.fnUntraced` site | decided (2026-10-05, (i) — recommended default; moot after DROP) |
| D-13-c | Driver interface | generic | decided (2026-10-05, generic — recommended default; measured as S2, failed; moot after DROP) |
| D-13-d | `toPredicate` uses the driver | yes (the pruning claim becomes a property) | decided (2026-10-05, (c) — recommended default; moot after DROP) |
| D-13-e | Fold home | internal `CombinatorFold.ts`; the three named functions deleted | decided (2026-10-05, (i) — recommended default; moot after DROP) |
| D-13-f | Fold state | a fresh mutable accumulator per walk | decided (2026-10-05, (i) — recommended default; moot after DROP) |
| D-13-g | Order with ARCH-12 | ARCH-12 first | decided (2026-10-05, (a) — recommended default; moot after DROP) |
| D-13-h | Tests deleted | 9 in `Evaluate.test.ts`, 16 in `Rules.test.ts` | decided (2026-10-05, delete as listed — recommended default; moot after DROP, nothing deleted) |
| D-14-a | Outcome cases | five cases; seeded folds into `Allowed`/`Denied` | decided (2026-10-05, A — recommended default) |
| D-14-b | What `Failed` carries | `cause` only, never `previousSuccess` | decided (2026-10-05, A — recommended default) |
| D-14-c | Module | leaf `DecisionOutcome.ts` owns `DecisionResult`, `outcomeOf`, `currentDecision`; `GateRenderState = DecisionOutcome["_tag"]` | decided (2026-10-05, A — recommended default) |
| D-14-d | Public surface | export `outcomeOf`/`DecisionOutcome`; no new hook; `useDecision` returns the raw result | decided (2026-10-05, A — recommended default) |
| D-14-e | `useDecisionSuspense` | keep `suspendOnWaiting`, pinned by a test | decided (2026-10-05, A — recommended default) |
| D-14-f | Enforcing a single read | house-style `DECISION_READ_BUDGET` plus doc-example gate checks | decided (2026-10-05, C — recommended default) |
| D-14-g | Mutation coverage | scoped `stryker.react.mjs` (changes the DoD table and gate 11) | decided (2026-10-05, B — recommended default) |
| D-14-h | Names | `DecisionOutcome` / `outcomeOf` | decided (2026-10-05, A — recommended default) |
| D-15-a | Outcome wire shape | `outcome: Decided \| Failed` under `version: 2` | decided (2026-10-05, (i) — recommended default) |
| D-15-b | Rollout | three minors: readers learn v1 and v2, then writers default to v2, then the v1 writer is removed | decided (2026-10-05, (i) — recommended default; the three phases landed in one release at the user's direction, readers-first left to the operator, ADR-QD-903) |
| D-15-c | Lenient envelope | keep only declared keys, then decode strictly; log ignored keys at debug | decided (2026-10-05, (i) — recommended default; sub-question (a) silent, not (b): the ARCH-09 codec is pure `Result`, no logger) |
| D-15-d | v1 reader lifetime | permanent (audit rows are persisted) | decided (2026-10-05, (i) — recommended default) |
| D-15-e | Inbound error surface | **reconciled:** an `UnsupportedVersion` variant of ARCH-09's `DecodeRefusal`; a separate class only without ARCH-09 | decided (2026-10-05, reconciled (i) — `DecodeRefusal.UnsupportedVersion { version, supported }`, no new class or code) |
| D-15-f | Devtools drop reason | `"unsupported-version"`, completing the four-value union | decided (2026-10-05, (i) — recommended default; four-value union) |
| D-15-g | Pre-0.5 `failed.code` rows | the v1 reader tolerates them | decided (2026-10-05, (i) — recommended default) |
| D-15-h | Audit row | closed union of v1 and v2 bytes; ARCH-09's `decodeAuditEntry` (`Result`) is the reader | decided (2026-10-05, (i) — recommended default; `decodeAuditEntry` keeps ARCH-09's `Result` shape) |
| D-15-i | `subjectId` in v2 | required | decided (2026-10-05, (i) — recommended default) |
| D-15-j | Version choice | `wireVersion` option on the three senders | decided (2026-10-05, (i) — recommended default; added in Phase A/B and removed in Phase C within the same change) |

## Cross-plan overlaps (wave 2, and against ARCH-01 to ARCH-07)

| File(s) / artefact | Plans | Sequencing |
| ------------------ | ----- | ---------- |
| `core/src/Evaluate.ts` | ARCH-08 (denial reason, `refIsUnresolved`), ARCH-12 (`mergeFields` out), ARCH-13 (combinators) | ARCH-08 T1–T4, then ARCH-12, then ARCH-13 (D-13-g). |
| `SWITCH_BUDGET` + AGENTS §5a table | ARCH-08 D-08-c (switch moves to `judgeMatcher`), ARCH-12 D-12-b (4→3) | Each plan edits the budget, the table and the bench evidence in the same commit. The second one rebases. |
| `UNTRACED_BUDGET` + AGENTS §5 + ADR-QD-073 | ARCH-13 | Only on a GO from the T2/T3 gate. |
| `Matcher.ts`, `Predicate.ts`, `PredicateLiteral.ts`, `RenderablePredicate.ts` | ARCH-08, ARCH-13 D-13-d (`toPredicate` run) | ARCH-08 first. |
| `predicate-sql`, `predicate-prisma` renderers and oracles | ARCH-08 T4–T6 | Breaking SQL text and a Prisma declaration. Needs one changeset. |
| `core/src/SinkCodec.ts`, `Errors.ts` (`QadiError`, ACL codes) | ARCH-09, then ARCH-15 | ARCH-09 first. Assign ACL codes at merge, after ARCH-03's `ACL018`. |
| `devtools/src/model/Source.ts` (`MalformedReason`, `decodeFrame`) | ARCH-09 D-09-f, ARCH-11 T5–T9, ARCH-15 D-15-f | ARCH-09, then ARCH-15 and ARCH-11 in either order. The final union has four values. |
| `audit/src/AuditEntry.ts` (`decodeAuditEntry`, row shape) | ARCH-09 D-09-d, then ARCH-15 D-15-h | ARCH-09 creates it; ARCH-15 widens it to v1 \| v2. |
| `spec/behaviors` BEH-QD-199/200/201 | ARCH-09, ARCH-15 T1, ARCH-11 | ARCH-15 T1 reverses BEH-QD-200's fabricated `MissingResource`. ARCH-09 corrects 199. ARCH-11 corrects 201. |
| SSE frame format | ARCH-11 D-11-e (`{environment, record}`), ARCH-15 (`version` inside `record`) | Decode the envelope, then the record. |
| `core/src/PortAccess.ts`, `PortMetrics.ts`, `RetryingLayer.ts`, `@qadi/testing` | ARCH-10 | Independent of the others. Large; land it in phases. |
| `react/src/QadiAtoms.ts`, `components.tsx`, `useGate.ts` | ARCH-14 | Independent. |
| `bench/*.bench.ts` | ARCH-13 T1 (all six), ARCH-12 T4 step 3 (superseded) | ARCH-13 T1 first. |
| Stryker configs / DoD table (gate 11) | ARCH-14 D-14-g (`stryker.react.mjs`) | Edit the `mutation` script and `definitions-of-done.md` together. |
| `examples/nextjs-newsroom` | ARCH-09 (two unguarded routes), ARCH-10 (host wiring), ARCH-11 (ring/feed, `/api/backlog`), ARCH-14 (docs) | Rebase each in landing order. The example is step 15 of `pnpm check`. |
| `spec/overview.md` (gate 13), traceability, CCR/ADR numbers, changesets | all | Use `…-NEXT` placeholders; number at merge. |

## Suggested order (wave 2)

1. **Land `arch/integration`** on `main` (CI green), then do the post-merge worktree cleanup above.
2. **Defect wave, no refactor:**
   - ARCH-08 T1–T4: the fail-open, renderer guard included.
   - ARCH-12 T1–T3.
   - ARCH-09 T1–T2.
   - ARCH-14 T1.
   - ARCH-15 T0–T2.
   - ARCH-11 T1–T2.
   - ARCH-10 T1.
   - ARCH-13 T0–T1, which also unblocks `pnpm bench` for every benchmark-gated decision.
3. **ARCH-08** in full. It is the only remaining fail-open, and ARCH-13 D-13-d builds on its shape.
4. **ARCH-09**, then **ARCH-15** (ADR first, then Phase A; Phases B and C in later minors), and **ARCH-11**.
5. **ARCH-12**, then the **ARCH-13** benchmark gate. Take the GO or DROP outcome as measured.
6. **ARCH-14**.
7. **ARCH-10**, phased. It is the largest; its T1 already shipped in step 2.

---

# Status (2026-10-06): merged

**ARCH-01…ARCH-15 are in PR #140** (https://github.com/leaderiop/qadi/pull/140), branch `arch/deepening` (HEAD `59c0a43`, 183 commits on `main` `c75220e`).
ARCH-08…15 were built on two tracks and merged in `210e09a`; track B's reserved 9xx ids were renumbered in `1bd6bfe`.
ARCH-13 was **dropped by measurement**; the addendum is in ADR-QD-073 Rev 1.3. Every other plan is implemented.

The full `pnpm check` gate passed in three passes: steps 1–13 at `a2094e5`, then mutation and the tail steps at HEAD.
Mutation scores: core 93.57, devtools 97.91, predicate-sql 95.59, predicate-prisma 91.67, audit 85.23, http 98.56, react 100.00.
Coverage: 2,959 tests, 98.78% statements and 95.54% branches. BDD: 525. Example e2e: 30/30.

**Cleanup:**
- Done on 2026-10-06, at the user's go-ahead:
  - Worktree `.claude/worktrees/arch-10` removed (it was clean).
  - Branches `arch/deepening-10` (`1bd6bfe`) and `arch/integration` (`e0ee958`) deleted. Both were first verified as ancestors of `origin/arch/deepening`, so their commits are still reachable.
- Still to do: remove `.claude/worktrees/agent-adb672833eb753a12` (`arch/deepening`) after PR #140 merges, using `git worktree remove` without `--force`. Then delete the branch with `git branch -d arch/deepening`.

**Merged 2026-10-05 23:23 UTC as `1fd8700`** (squash of PR #140, after CI was green on Node 22.12.0 and 26 at `4072dd7`). The squash tree was verified identical to the branch head. The last worktree (`agent-adb672833eb753a12`) and branch `arch/deepening` were then removed. Post-merge, `release.yml` opens a `chore(release): version packages` PR; nothing publishes until that PR merges.

**Released 2026-10-06 as 0.10.0.** Release PR #141 was verified locally (typecheck, spec:publish, spec:gates, spec:api, spec:package), merged as `47eb865` with the user's go-ahead, and passed CI on `main`. `release.yml` then published all nine `@qadi/*` packages at 0.10.0 with provenance via trusted publishing; each was confirmed against the registry's metadata, every dependent pins `@qadi/core ^0.10.0`, and git tags were created. Wire version 2 ships in this release: upgrade readers before writers.

