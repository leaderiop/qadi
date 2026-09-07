# Qadi Full Audit — Dashboard

**Date:** 2026-09-07 · **Method:** 50 parallel auditors (26 deep code slices, 24 cross-cutting sweeps), structured JSON verdicts, 4 headline findings spot-verified against source by the synthesizer. One auditor died mid-run and was retried; all 50 slices reported.

**Scope:** 9 packages (~113 src files, ~100 test files), `spec/` (33 behaviors, 59 ADRs), `features/` BDD, `scripts/` gates, CI, website, example app.

---

## Verdict

**8.43 / 10.** A genuinely rigorous codebase — the discipline machinery (gates, invariants, traceability, mutation testing) is real and mostly does what the docs claim. The defects that remain cluster in three places: **`Neq`/absent-value semantics** (the one matcher that fails open on `undefined`), **observability-path isolation** (feed, sink fan-out, audit circuit breaker — the decision path itself stays safe), and **one critical dialect-compiler divergence** in `@qadi/predicate-prisma`.

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 7 |
| Medium | 70 |
| Low | 132 |
| Info | 104 |

---

## Rating matrix — package × dimension (0–10)

| Package | Overall | Correctness | Design | Security | Tests | Docs | Style | Perf | C/H/M/L/I |
|---|---|---|---|---|---|---|---|---|---|
| core (16 slices) | **8.50** | 8.7 | 9.0 | 8.9 | 8.4 | 8.2 | 9.1 | 8.8 | 0/2/22/38/20 |
| http | **8.60** | 8.5 | 9.0 | 9.0 | 8.5 | 8.0 | 9.5 | 9.0 | 0/0/2/7/0 |
| audit | **7.50** | 7.0 | 9.0 | 9.0 | 8.0 | 8.0 | 9.0 | 8.5 | 0/1/4/3/2 |
| react | **8.30** | 8.0 | 9.0 | 9.0 | 8.0 | 9.0 | 9.0 | 9.0 | 0/1/0/3/1 |
| promise | **8.50** | 9.5 | 9.5 | 9.0 | 7.0 | 9.0 | 9.0 | 9.0 | 0/0/3/3/0 |
| devtools | **8.35** | 8.0 | 9.0 | 9.0 | 8.5 | 8.5 | 9.0 | 8.0 | 0/0/6/6/3 |
| testing | **8.20** | 9.0 | 7.0 | 9.0 | 7.0 | 9.0 | 9.0 | 9.0 | 0/0/2/4/1 |
| predicate-sql/prisma | **5.50** | 5.0 | 9.0 | 6.0 | 7.0 | 7.0 | 9.0 | 8.0 | 1/1/2/1/1 |
| BDD suite | **8.60** | 9.0 | 9.0 | 9.0 | 8.0 | 8.0 | 8.0 | 9.0 | 0/0/3/5/2 |
| examples/website | **8.60** | 8.0 | 9.0 | 8.0 | 9.0 | 9.0 | 9.0 | 8.0 | 0/0/1/4/0 |
| security sweeps | **7.60** | 7.5 | 8.5 | 7.5 | 7.0 | 8.5 | 8.5 | 7.5 | 0/2/4/7/1 |
| spec/docs | **8.61** | 8.9 | 8.8 | 9.0 | 8.4 | 8.6 | 8.6 | – | 0/0/9/19/37 |
| infra/gates/CI | **8.40** | 8.8 | 8.7 | 8.7 | 8.5 | 8.6 | 8.6 | 8.3 | 0/0/9/25/22 |
| house-style sweeps | **9.00** | 9.2 | 9.3 | 9.0 | 8.3 | 9.0 | 9.0 | – | 0/0/3/7/14 |

---

## Slice scores (all 50)

| Slice | Pkg | Score | C/H/M/L/I |
|---|---|---|---|
| PolicyAdt | core | 8.5 | 0/0/2/4/0 |
| MatcherSlice | core | 8.0 | 0/1/2/1/0 |
| EvaluateSlice | core | 8.3 | 0/0/3/1/0 |
| DecisionCore | core | 8.6 | 0/0/1/5/1 |
| FacadeSlice | core | 8.4 | 0/0/1/4/2 |
| PortsSlice | core | 8.4 | 0/0/2/3/0 |
| PredicatesSlice | core | 9.0 | 0/0/0/1/2 |
| ErrorsExplain | core | 8.5 | 0/0/4/1/0 |
| SinksSlice | core | 7.5 | 0/1/2/3/1 |
| SignatureGuard | core | 9.2 | 0/0/1/1/1 |
| MetricsHistory | core | 8.3 | 0/0/1/2/2 |
| FieldLattice | core | 8.5 | 0/0/1/1/1 |
| CoreSurface | core | 8.5 | 0/0/0/3/3 |
| CoreTestsA | core | 9.3 | 0/0/0/2/1 |
| CoreTestsB | core | 8.5 | 0/0/1/3/3 |
| CoreArchitecture | core | 8.5 | 0/0/1/3/3 |
| HttpSlice | http | 8.6 | 0/0/2/7/0 |
| AuditSlice | audit | 7.5 | 0/1/4/3/2 |
| ReactSlice | react | 8.3 | 0/1/0/3/1 |
| PromiseSlice | promise | 8.5 | 0/0/3/3/0 |
| DevtoolsModel | devtools | 8.3 | 0/0/3/2/2 |
| DevtoolsReact | devtools | 8.4 | 0/0/3/4/1 |
| TestingSlice | testing | 8.2 | 0/0/2/4/1 |
| PredicateDialects | predicates | 5.5 | 1/1/2/1/1 |
| FeaturesBdd | bdd | 8.6 | 0/0/3/5/2 |
| ExamplesWebsite | examples | 8.6 | 0/0/1/4/0 |
| SecEnforce | security | 8.0 | 0/1/2/4/0 |
| SecUntrusted | security | 7.2 | 0/1/2/3/1 |
| SpecConA/B/C | spec | 8.5 ×3 | 0/0/5/6/6 |
| ApiSurface | spec | 8.5 | 0/0/1/2/4 |
| Invariants | spec | 9.0 | 0/0/0/1/2 |
| Traceability | spec | 7.5 | 0/0/2/3/2 |
| Docs | spec | 8.5 | 0/0/1/0/1 |
| SpecProcess | spec | 9.0 | 0/0/0/2/2 |
| PriorAudit | spec | 9.5 | 0/0/0/5/20 |
| Gates | infra | 7.5 | 0/0/2/7/2 |
| CIAudit | infra | 9.0 | 0/0/1/1/5 |
| BuildPublish | infra | 8.5 | 0/0/0/3/3 |
| TestInfra | infra | 8.5 | 0/0/1/2/3 |
| Deps | infra | 8.5 | 0/0/0/3/3 |
| Platform | infra | 8.5 | 0/0/2/3/0 |
| Mutation | infra | 8.7 | 0/0/2/3/2 |
| Perf | infra | 8.0 | 0/0/1/3/4 |
| HouseStyle | sweeps | 9.0 | 0/0/1/1/3 |
| Determinism | sweeps | 9.5 | 0/0/0/2/3 |
| TypeSafety | sweeps | 9.0 | 0/0/0/1/4 |
| ErrorTaxonomy | sweeps | 9.0 | 0/0/1/2/2 |
| EffectV4 | sweeps | 8.5 | 0/0/1/1/2 |

---

## Critical

**C1 — `@qadi/predicate-prisma`: nested empty-array identities invert denials into admissions** *(spot-verified in source)*
`renderNode` emits Prisma's "vacuous identities": `True → {AND: []}`, `False → {OR: []}` (`index.ts:132-133`), null-Gte/Lt → `{OR: []}` (`:158`), empty `MemberOf` → `{OR: []}` (`:179`) — with no constant-folding when nested (`And` arm `:201-202` nests parts verbatim; the module's own doc `:112-117` assumes top-level semantics). Per open Prisma issues (#17367, #21856), `{OR: []}`/`{AND: []}` **nested** inside AND/OR/NOT are silently dropped, and `{NOT: {AND: []}}` returns all rows. So `allOf([hasResourceAttribute("role", inArray([])), tenantEq])` — intended "deny role-less users" — compiles to a query that admits them. The agreement tests cannot catch it: `matchesPrismaWhere.ts` implements JS `.every`/`.some`, the same semantics the compiler wrongly assumes. Spec BEH-QD-239/242 encode the same wrong belief.
**Fix:** constant-fold `False` (and `True` under `Negate`) inside `renderNode` so identities only appear at the top level; add an interpreter that models Prisma's actual engine semantics.

## High

**H1 — Fail-open: `hasAttribute` + resource-referencing `neq` allows when no resource is supplied** *(spot-verified)*
`Evaluate.ts` `HasAttribute` arm guards `referencesAction` with `MissingAction` but has no mirror guard for `referencesResource` — which exists (`Matcher.ts:284`) and is consumed only by the predicate translator (`Predicate.ts:292`). With `options.resource` undefined, `neq(resource("tenantId"))` is `undefined !== x → true` → **allow**. This is the exact INV-QD-032 bug shape `guard`'s doc comment says was closed — reopened through `enforce`/`check`/`assert`, which don't bind a resource. **Fix:** fail with `MissingResource` when `referencesResource(matcher)` and no resource.

**H2 — `Neq` on an unresolvable ref matches, contradicting the spec**
`Matcher.ts:316`: `value !== resolveRef(...)` is true whenever the ref resolves to `undefined` — `hasResourceAttribute("raisedBy", neq(subjectId()))` grants on records missing the field. BEH-QD-026 states "a reference that resolves to nothing denies; it is not an error" (spot-verified: `Matcher.ts:315-316`). No test pins `Neq` on absent data; the repo's own SoD policy composes `not(eq(...))` instead. **Fix:** reconcile spec and semantics (scope the sentence to affirmative comparators or make `Neq` deny on absent operands) + pinning test.

**H3 — Decision-sink feed drops the *newest* records when full**
`DecisionSinkFeed.ts:78` uses `PubSub.publishUnsafe` ("Sliding means it always accepts" — spot-verified at `:75-78`). In Effect v4, the sliding evict-oldest strategy is applied only by the effectful `publish`; `publishUnsafe` returns-false-on-full. Once a subscriber lags and the buffer fills, every subsequent record is silently discarded newest-first — inverting BEH-QD-201 and the ring's evict-oldest story. The eviction test exercises the zero-subscriber replay path, so both suite and mutation gate miss it. **Fix:** `Effect.asVoid(PubSub.publish(pubsub, record))` (never suspends on sliding) + a subscriber-active overflow test.

**H4 — Interrupted/defecting half-open probe write permanently bricks the audit circuit breaker**
Half-open allows one probe (`claimProbe` one-shot, `CircuitBreaker.ts:204-207`; status read `:146` never recovers a `HalfOpen` with `openedAt: undefined`). The probe write runs under `Effect.result` (`AuditDecisionSinkLive.ts:149`) — an interruption (client disconnect, `Effect.timeout`, filter fan-out) or a defecting store adapter releases nothing; the breaker then treats every future record as open: staged rows never commit (unbounded staging growth) or entries drop, silently. Trigger window is exactly when the backend is flaky. **Fix:** release the probe on abnormal exit (`Effect.onExit`) and/or age out a stuck HalfOpen; test interrupting a half-open probe.

**H5 — `settled()` memoises suspense promises per atom, not per registry**
`packages/react/src/settled.ts:73-77` — `pending`/`resolvers`/`subscribed` keyed by atom only. A `QadiProvider` remount builds a fresh registry but inherits the dead promise (`existing` returned before any freshness check) → **permanent suspension** of the guarded subtree; two concurrent providers share one listener so the second registry's transitions never resolve. **Fix:** key by `(registry, atom)` or validate the memo against the current registry before reuse.

**H6 — `SinkCodec.decodeRecord` decodes untrusted input with unbounded recursion**
`Policy.fromJson` guards with `exceedsJsonDepth` (MAX_DECODE_DEPTH=512) precisely because Schema's recursive descent RangeErrors — but `decodeRecordWire` (`SinkCodec.ts:463`, self-recursive `TraceSchema` + embedded `Policy`) has no such guard, and its consumers are untrusted: devtools decodes SSE frames (`Source.ts:206`, where the RangeError surfaces as a defect that freezes the live timeline) and cross-process forwarding ingests records the same way. **Fix:** extract the depth guard, run it in `decodeRecord`/Hydration, fail with a typed error so `malformed` drops the frame.

**H7 — Gte/Lt with string/boolean values compile to live dialect comparisons**
Reference `evaluatePredicate` requires both sides `number` (constant-false otherwise), but both compilers admit any `isSafeValue` and render `"title" >= $1` / `{level: {gte: "3"}}`. MySQL/SQLite coerce and admit rows the reference denies; Prisma string-compares. Same INV-QD-047/048 disagreement class as the already-handled Date/NULL cases, on the parameter side. **Fix:** constant-fold non-numeric Gte/Lt like the null arm already does.

---

## Medium findings — grouped by theme

**Spec drift (normative docs behind code)** — the largest cluster (~20 findings): BEH-QD-017 says 13 variants, code has 16; BEH-QD-033 R-channel omits CustomPredicate/SignatureHistory; 07-enforcement fences predate `EnforceOptions`/`filterStream`; BEH-QD-181 types `DecisionSink.record` as DecisionRecord vs SinkRecord; SSE `reauth` option (revocation on long-lived connections — security-relevant) absent from BEH-QD-202/ADR-046; BEH-QD-177 status table missing 2 of 11 mappings; spec/README behavior index stops at 26 of 33; `@REQ-QD-NNN` tags exist only in `features/`, not packages (AGENTS.md §10 unimplemented as stated).

**Gate blind spots** — check-dod-table misses plural refs ("steps 17–20") and .github/*.yml (stale "gate 22" live in check.yml); check-api-surface stale-check skips prose sections and is name-existence-only; check-website-doc-examples exits 0 when the docs dir is missing; check-doc-examples passes when zero `typescript` fences exist; CI uploads 5 of 6 mutation reports and the JSON report is overwritten by each stryker run.

**Test gaps that explain the highs** — feed eviction path untested; reauth wiring branch untested (survived mutants id 15/25 in mutation.json); `recordingSignatureHistory.calls` never asserted; DecisionCache "same subject hits" control vacuous (inner layer shadows the counting resolver); HasSignature zero codec round-trip coverage; signature-key collision-safety untested unlike its two sibling builders; facade never asserts rejection `_tag`s nor exercises the relationship path; SignatureHistory (9th service) ships in devtools with zero tests; simplify's HasCustom arm never exercised.

**Semantics/comment drift** — `attributeReason`/`resolveRef` comments claim "every matcher fails undefined" (false for Neq); "Unknown" denial asserts "no resolver wired" even for wired-but-silent resolvers (BEH-QD-045); explanation rendering drops `fieldStrategy` and `HasRelationship.depth` (non-equivalent policies render identically, straining INV-QD-031); TraceDiff compares obligations by id only; PortMetrics says "three closed values", there are five.

**DecisionCache seam** — key omits `maxDepth`: a cached success bypasses `PolicyTooDeep` for a stricter caller; coalesced waiters inherit the claimant's interruption.

**Other notables** — untrusted `onExcessProperty: ignore` silently strips mistyped policy keys (decode-then-persist narrows; unpinned by test); `isJsonSafe` is itself stack-exhaustible and O(d²); devtools CheckCard/JsonView keep stale edited text across re-seeds ("form lies about what it runs"); Remedies offers deny-rule requirements as "strengthenings" (anti-remedies); audit `stage`/`write` defects bypass both breaker and metrics (`Effect.result` vs `commit`'s `catchCause`); `effect-tsgo patch` in `prepare` mutates node_modules with no docs; engines floor drift (>=20 vs >=20.19.0); vitest `typecheck` wiring is dead (runs zero files).

---

## What is exemplary

- **Determinism (9.5):** zero unsanctioned forbidden-API hits in all of `packages/*/src`; every id/timestamp minted through `EvaluationId`/`Clock`; both exemptions single-file, documented, gate-enforced.
- **Prior-audit follow-through (9.5):** every high from 2026-09-06 remediated and honestly narrowed where full strength wasn't added (e.g. `SequenceIntegrity` docstring now states exactly what it does not do).
- **House-style conformance (9.0):** all 15 service ids namespaced, zero object-form `catchTag`, zero `orDie` in decision paths, `Effect.fn` universal; the 4-switch budget holds (with 2 of 4 missing the `never` arm — flagged).
- **Invariant discipline (9.0):** all 12 sampled security-critical invariants have identifiable enforcement points and pinning tests; deny-reason honesty is tested at the *sentence* level.
- **Docs compile (Docs slice):** 15+ examples across READMEs/website trace symbol-by-symbol to real exports — the predecessor's "uniformly uncompilable docs" failure is not repeated.
- **CI honesty:** workflow runs `pnpm check` and nothing else (plus one documented diagnostics upload); least-privilege, frozen lockfile, measured timeout.

## Recommended fix order

1. **C1** (predicate-prisma folding) — wrong-authorization class, user-facing query path.
2. **H1 + H2** together (one `Neq`/absent-value semantics decision closes both).
3. **H3, H4** (observability-path isolation: two one-line fixes + the two missing tests).
4. **H5** (react suspense hang), **H6** (shared depth guard), **H7** (non-numeric compare folding).
5. Spec-drift sweep as a single documentation pass; gate-scope fixes (`check-dod-table` plural/yml, api-surface prose, silent-pass exits).
6. The named test gaps (feed overflow, reauth wiring, facade rejection tags, devtools SignatureHistory).

---

*Method notes: each auditor returned strict JSON (scope, 0–10 score, per-dimension scores, evidence-backed findings). Scores are per-slice; package cells average the slices mapped to them. The critical finding's Prisma-engine behavior is sourced to open upstream issues (#17367, #21856) and its code shape was independently confirmed; the four headline findings were re-verified against source by the synthesizer. Full auditor outputs: `agent://<slice-id>` (session artifacts), aggregate at `local://audit-aggregate.json` and `local://audit-matrix.json`.*
