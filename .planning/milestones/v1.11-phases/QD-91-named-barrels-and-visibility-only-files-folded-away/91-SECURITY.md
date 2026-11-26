---
phase: "91"
slug: "named-barrels-and-visibility-only-files-folded-away"
status: verified
verdict: SECURED
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 38
threats_closed: 38
threats_open: 0
asvs_level: 1
created: "2026-11-26"
---

# Phase 91 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> The register was written at plan time: 21 PLAN `<threat_model>` blocks, with T-91-SC repeated in every plan and counted once.
> Verified at HEAD e083c5be against phase_base 69e5247d.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| a package root → its consumers' runtime and type imports | a value turned type-only, or a name dropped, breaks a consumer while the build passes | the public surface (values, types, kinds) |
| a future barrel edit → the published roots | an `export *` re-widens a root to every name a module declares | package-private names |
| a host application → `@qadi/react`'s root | the gate writer slot and the hydration seed slots must stay unreachable | writer and seed capabilities |
| a host value → `hydrateDecisions`'s first parameter | widened from `QadiAtoms` to anything with `hydrate` | the hydrate capability |
| server-rendered payload (untrusted JSON in a page) → `hydrateDecisions` | authorization state crossing a network | subject id, decisions, traces |
| span attributes (written by any tracer path) → `decodePortSpan` | the decoder reads attribute maps a tracer handed back | span attributes |
| packed tarball → a consumer's install | a declaration path resolves against whatever sits beside the package after install | `.d.ts` specifiers |
| built `lib/` declarations → the surface tool; the merge gate → the tool's self-test | the tool is the only check that sees a value turned type-only | export kinds |
| a compliance reader → the sequence check's doc | the not-tamper-evident disclaimer must travel with the names | documentation |
| phase scripts, records, scratch clones → the commit history and main tree | judges, base/close records, variants, spike patches | evidence records |
| this phase's commits → earlier phases' guarantees | a move can silently break what an earlier phase pinned | held tests, ledger rows |
| a changeset → the published release notes | a consumer decides from it whether an upgrade changes their code | release text |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation (evidence) | Status |
|-----------|----------|-----------|----------|-------------|-----------------------|--------|
| T-91-01 | Repudiation | `91-mutation-base.json`, `91-coverage-base.json` | low | mitigate | `91-mutation.mjs:189` `dirtyReasons` refuses a dirty tree. `landed` (l.646) checks the commit, its paths and its trailer. The first commit after phase_base is d491c0c1 (the scorer plus the mutation base), then 1aacd98a (the coverage base alone). `landed base` and `landed coverage-base` both print ok | closed |
| T-91-02 | Tampering | a coverage run that measures nothing | medium | mitigate | `91-mutation.mjs:423` refuses a summary that holds no file or lacks a touched file. `--self-test`: 125 passed. `landed coverage-close` prints ok | closed |
| T-91-03 | Tampering | a judge that passes on a hand list | medium | mitigate | `homesFor` reads the base barrel and snapshot (self-test rows `91-check.mjs:2383-2398`), and `judgeFolds` is derived (l.2422-2423). `91-check.mjs --self-test`: 477 passed. `homes`, `folds` and `changesets` each exit 0 at HEAD | closed |
| T-91-04 | Repudiation | `91-RED-EVIDENCE.md`, `91-BARRELS.md`, `91-FOLDS.md` | low | mitigate | The only appends are `variant` (`91-check.mjs:1429`) and `structural --record` (l.1773). Each block names the scratch sha, the diff SHA-256, the run, the exit and the failing text. Every evidence commit touches planning paths only, apart from 5165ac9e, which adds one test file of the phase's own (PortSpanFold.mutation.test.ts) | closed |
| T-91-05 | Tampering | a variant edit leaking into the main tree | medium | mitigate | `judgeScratchName` (`91-check.mjs:1227`) refuses `/` and `..`. `judgeScratchRoot` (l.1229) requires basename `qd91` under TMPDIR. No RED or variant commit touches `packages/`, and the 18 product commits are all plan-subject commits. `91-pinned-check.mjs --all-applied`: 515 held, clean | closed |
| T-91-06 | Tampering | a barrel turning a public class type-only | high | mitigate | `scripts/surface-diff.mjs:130-153` `compare` emits `KIND … both -> type`. RED `surface-type-only-class`: `KIND @qadi/core AccessDenied both -> type`, exit 1. Independent audit scan of the HEAD source barrels: core 545, react 62 and audit 72 names, every kind equal to `91-surface-base.json` | closed |
| T-91-07 | Tampering | a classifier regression passing silently | medium | mitigate | `package.json:29` `surface:self-test` is the last step of `check`, and `check-dod-table.mjs` reports 27 steps. RED `surface-self-test-classifier` (the `parent.parent` clause removed from `surface-scan.mjs:69-73`) exits 1. The self-test now gives 20 passed | closed |
| T-91-08 | Denial of service | a TypeScript server call that never returns | low | mitigate | `surface-diff.mjs:75` runs the scan through `runTypescriptChild` with `SCAN_TIMEOUT_MS` = 120 000 (l.39). On a signal, `typescript-server-child.mjs:57-` kills the server pids that are named | closed |
| T-91-09 | Tampering | a barrel line turning a value type-only | high | mitigate | Literal `ROOT_VALUES` plus `assert.deepStrictEqual(Object.keys(Root).sort(), …)` in core `surface.test.ts:366`, react l.19-52 and audit l.65. RED `values-core-type-only`, `values-react-type-only`, `values-audit-type-only` and `sequence-check-type-only` all exit 1. All three pass at HEAD | closed |
| T-91-10 | Repudiation | a list computed from the code it checks | medium | mitigate | Each of the three surface tests has exactly one `Object.keys`, on the actual side. The expected side is a string literal array | closed |
| T-91-11 | Tampering | a packed `.d.ts` naming `../../core/src/…` | medium | mitigate | Check 3c `check-package-install.mjs:491-517` applies `declarationEscapes` (`scripts/lib/declaration-escape.mjs:60-73`) to every packed `.d.ts`. RED `escape-layout` flags `lib/HydrationEngine.d.ts: resolves outside its package: ../../core/src/Decision.ts`, exit 1. The audit's own scan of all 257 built `.d.ts` found 0 escapes | closed |
| T-91-12 | Information disclosure | a declaration reaching a package's shipped `src/` | low | mitigate | `declaration-escape.mjs:66` refuses any `(^\|/)src/` segment, inside the package too. Planted case l.78 ("a path into src inside the package", expect 1) | closed |
| T-91-13 | Tampering | a check that silently matches nothing | medium | mitigate | `check-package-install.mjs:491` runs `runEscapeSelfCheck()` on every run, and l.513 fails when zero `.d.ts` files were read. RED `escape-self-check` (with the `/src/` rule disabled) exits 1 on 3 planted cases. The audit's run of the self-check returned `[]` | closed |
| T-91-14 | Tampering | a test body edited inside a fold commit | medium | mitigate | `91-pinned-check.mjs` held/declared regions, whose replacements must be imports only per the syntax tree. `--all-applied`: "515 held, 27 declared (27 applied), 5 born, 27 earlier-held, clean". RED `pinned-held-body`, `pinned-declared-outside` and `pinned-declared-non-import` all exit 1 | closed |
| T-91-15 | Tampering | an earlier phase's held file edited by an unexplained commit | low | mitigate | `EARLIER_HELD` (`91-pinned-check.mjs:320`). RED `pinned-earlier-held` exits 1 with only "docs(91-19): name the registry lease's one caller" allowed | closed |
| T-91-16 | Repudiation | an earlier check's output changing without an explaining commit | medium | mitigate | `91-earlier-checks.mjs` rows are computed and keyed on exact subjects. The audit's run gave "87 runs, all match their rows", exit 0. RED `earlier-unexplained`, `earlier-unmoved` and `earlier-row-without-run` all exit 1 | closed |
| T-91-17 | Tampering | the provider gaining logic when its import line moves | low | mitigate | `91-earlier-checks.mjs:291` holds a fixed row for `86-check.mjs provider-forwards-only`, exit 0, and self-test l.529 requires it to have no computed move. Audit run, line 17: "the provider builds the owner once and only forwards to it" | closed |
| T-91-18 | Repudiation | a fold verdict asserted without evidence | low | mitigate | `shasum -a 256` of all 10 `spike/*.patch` files equals `91-SPIKE.md` l.22-31. `91-check.mjs spike`: "10 candidates, each patch hashed and each verdict agreeing with its recorded outputs" | closed |
| T-91-19 | Tampering | a generated barrel widening a type-only name or dropping a value | high | mitigate | Same evidence as T-91-06 and T-91-09, plus `homes` and `barrels --text`, both exit 0. The audit's source scan shows no ADDED, REMOVED or KIND line for any of the three packages | closed |
| T-91-20 | Information disclosure | a barrel publishing a module's internal name | medium | mitigate | The audit's source scan equals the base snapshot name for name. `HydrationTarget`, `hydrateWith`, `gateWriterFor` and `portInterpreter` appear in no `index.d.ts`, only in their own package's module declarations. `check-api-surface.mjs`: 943 documented | closed |
| T-91-21 | Tampering | an unguarded decode added to the folded file | medium | mitigate | `check-house-style.mjs:662` `UNTRUSTED_DECODE_BUDGET` has `PortSpanEncode.ts: 2`. House-style: 648 files clean. RED `span-untrusted-decode` and `span-untrusted-decode-after-folds` ("found 3") both exit 1 | closed |
| T-91-22 | Information disclosure | the fold publishing `portInterpreter` or the span machinery | medium | mitigate | `packages/core/src/index.ts:416` names `PortInterpreter` as a type and l.427 names `decodePortSpan` alone. `portInterpreter` (`PortSpan.ts:93`) is not in the root (source scan and `surface.test.ts`). Gate 14 check 3b still refuses non-entry modules (`check-package-install.mjs:426-445`) | closed |
| T-91-23 | Tampering | a second spelling of a shared span key | low | mitigate | `[span-key-source]` in house-style. RED `span-key-source` and `span-key-source-after-folds` both exit 1 | closed |
| T-91-24 | Elevation of privilege | a host writing a guard's registration through `gateWriterFor` | medium | mitigate | `packages/react/src/index.ts:22-29` names only `makeGateRegistry` plus five types at `./GateWriter.ts`. `gateWriterFor`, `buildGateRegistry`, `reconcile` and `GateWriter`/`GateHandle` are absent (source scan equals base: 62). The folded `makeGateRegistry` body (`GateWriter.ts:425-428`) is identical to the base `GateRegistry.ts` | closed |
| T-91-25 | Repudiation | the sequence check read as tamper-evidence | medium | mitigate | `packages/audit/src/ArchiveFacts.ts:202-213` (the full disclaimer is the doc of `verifySequenceIntegrity`), l.169-172 (the error doc) and header l.18. `folds` exits 0 | closed |
| T-91-26 | Tampering | a collision report dropped by the folded constructor | low | mitigate | RED `gate-collision-ignored` (undefined reporter) fails 7 existing tests. Those tests pass at HEAD (the audit's vitest run: 14 files, 285 tests) | closed |
| T-91-27 | Elevation of privilege | a consumer reaching a seed slot through the folded module | high | mitigate | `packages/react/src/index.ts:30-36` names only `dehydrateDecisions`/`hydrateDecisions` and four types. `HydrationTarget` (`HydrationEngine.ts:561`), `hydrateWith` and `HydrationSeedLookup` are unnamed. The exports map is `.` only, and check 3b refuses every other module. The source scan equals base | closed |
| T-91-28 | Spoofing | a forwarding object seeding another subject's decisions | medium | mitigate | `hydrateDecisions` delegates to `atoms.hydrate` (`HydrationEngine.ts:768-773`). The atom set's `hydrate` → `hydrateWith` still refuses another subject (l.635) behind `untrustedDecoder` (l.176, 205, 288), unchanged by the fold. RED `hydrate-wrong-subject` fails 52 titles. See SEC-OBS-3 | closed |
| T-91-29 | Tampering | the payload's options dropped by the folded `dehydrateDecisions` | medium | mitigate | `HydrationEngine.ts:737` `dehydrateWith(entries, options)`. RED `dehydrate-drops-options` fails 16 titles, including the byte-for-byte pins | closed |
| T-91-30 | Information disclosure | an `export *` publishing a part-public module's internals | medium | mitigate | `check-house-style.mjs:2179-2257` covers `NAMED_BARRELS` (five barrels) and every `packages/*/src/**/index.ts(x)`. RED `named-barrel-star-{core,react,audit,devtools,devtools-react}`, `-mixed`, `-order` and `-unlisted` all exit 1. See SEC-OBS-2 | closed |
| T-91-31 | Tampering | a rule that silently matches nothing | medium | mitigate | `check-house-style.mjs:2249-2257` plants `export * from "./X.ts"` into each listed barrel on every run. RED `named-barrel-self-test` (with star detection disabled) exits 1 | closed |
| T-91-32 | Repudiation | a fold verdict or an enforcement claim with no evidence | low | mitigate | `spec/decisions/204-…md` l.75-86: the verdict table with each fold's short SHA. "What enforces it" (l.160-) names commands, not gate numbers. `records --close` exits 0 | closed |
| T-91-33 | Repudiation | a behaviour stated without a pinning test | low | mitigate | `records --close` exits 0. `verify-traceability.sh --strict`: PASS 21, FAIL 0 | closed |
| T-91-34 | Repudiation | a release note hiding the `hydrateDecisions` change, or a package edited without a note | medium | mitigate | `.changeset/react-named-barrel.md` states the structural parameter. `91-check.mjs changesets`: "3 patch changesets, one per edited public package" | closed |
| T-91-35 | Repudiation | the disclaimer cited at a deleted file | low | mitigate | `AuditArchive.ts:111-112,120` point at `ArchiveFacts.ts`. A grep of `packages/*/src`, the READMEs, `scripts`, `AGENTS.md` and `CONTRIBUTING.md` finds no `SequenceIntegrity.ts`, `PortSpanDecode`, `PortInterpreter.ts`, `GateRegistry.ts` or react `Hydration.ts` path (the remaining `Hydration` hits are devtools' own `model/Hydration.ts` and `Hydration.tst.ts`) | closed |
| T-91-36 | Tampering | a ledger row widened to hide a broken earlier guarantee | medium | mitigate | `91-earlier-checks.mjs:39` and self-test l.539 refuse a moved line before its subject. `--self-test`: 76 passed. The ledger run gives 87 of 87 matching | closed |
| T-91-37 | Tampering | a mutation score lowered by a fold and hidden by an allowance | medium | mitigate | `91-mutation.mjs:67-71` `RENAMED` combined base. `EQUIVALENT = []`, `EXAMINED = {}`, `STATIC_PROVEN = []` (l.107-118), so no allowance exists. `compare` and `landed close` exit 0: ArchiveFacts 54/54 → 54/54 and RegistryLease 28/28 → 28/28. PortSpan.ts is n/a | closed |
| T-91-SC | Tampering | npm/pip/cargo installs | high | accept | The only change between 69e5247d and HEAD to any `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` is two root-script lines (`surface:self-test` added and appended to `check`). No dependency was added. Logged as AR-91-01 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-91-01 | T-91-SC | The phase installs or adds no package (RESEARCH Package Legitimacy Audit: none). Verified: no dependency, lockfile or workspace-catalog change between phase_base and HEAD; root `package.json` gained one script entry only | plan-time disposition (91-01..91-21 PLAN), verified by gsd-security-auditor | 2026-11-26 |

*Accepted risks do not resurface in future audit runs.*

---

## Observations (not open threats)

| ID | Where | Observation | Failure scenario | Suggested action |
|----|-------|-------------|------------------|------------------|
| SEC-OBS-1 | `scripts/check-package-install.mjs:666-682` | The hydrate probe in gate 14's consumer (hydrate through the atom set, then through `{ hydrate }` alone, plus the `@ts-expect-error` refusal of `{}`) is on no probe guard list. `TYPE_ONLY_PROBES`, `REFUSED_SHAPE_PROBES` and `RUNTIME_PROBES` cover core names only. No register threat rests on it alone: `packages/react/test/HydrationTarget.tst.ts` pins the same acceptance and refusal, and the pinned check holds that file as born | Deleting the probe leaves gate 14 green, and the packed artifact's parameter is then checked only through the source-level tstyche pin | Optionally guard it: require the consumer text to call `hydrateDecisions` with a `{ hydrate:` argument and to carry the `@ts-expect-error` line |
| SEC-OBS-2 | `scripts/check-house-style.mjs:2185-2187` | `STAR_EXPORT` is line-anchored (`^\s*export … \*`, `m` flag). An `export *` after another statement on the same line is not seen. A barrel-local `export { x }` with no `from` is not a "group" either. Both are backstopped: a new value fails that package's `surface.test.ts` (literal `Object.keys` list), and a new name fails `check-api-surface.mjs` (overview tables) | `export { a } from "./A.ts"; export * from "./B.ts";` on one line passes `[named-barrel]` but still fails the surface test and gate 13 | None needed. Optionally match `export *` after `;` too |
| SEC-OBS-3 | `packages/react/src/HydrationEngine.ts:561-583,768-773` | The structural `HydrationTarget` adds no capability. Base `QadiAtoms` was already a structural interface, so `{ ...atoms, hydrate: f }` was accepted before. `InitialValues` is a public type a host can hand `QadiProvider` directly. The type is nameable as `Parameters<typeof hydrateDecisions>[0]` but holds only the public `hydrate` member, no seed slot. The untrusted payload still flows only through `hydrateWith`: envelope/entry/policy `untrustedDecoder` at l.176/205/288 and the subject check at l.635, all unchanged. A JSON value cannot be a target, because it has no callable `hydrate`, same as base | — | None |
| SEC-OBS-4 | `scripts/lib/declaration-escape.mjs:48-72` | Check 3c refuses relative or absolute escapes and `src/` segments. It does not refuse a bare specifier into a non-entry subpath (e.g. `import("@qadi/core/lib/X.js")`), which would also fail at a consumer. TypeScript under nodenext with a closed exports map reports TS2883 rather than emitting one, and a grep of every built `.d.ts` finds no deep `@qadi/*/…` specifier | A future emitter or config change prints a deep bare specifier; check 3c stays green while check 4's consumer may not touch that type | Optionally refuse `@qadi/<pkg>/<path>` specifiers that are not declared entry points |
| SEC-OBS-5 | `packages/{core,react,audit}/lib/` (local, gitignored) | The workstation's `lib/` still holds stale outputs of the five deleted modules (`PortSpanDecode.js`, `PortInterpreter.js`, `SequenceIntegrity.js`, `Hydration.js`, `GateRegistry.js`). `prepack` runs `tsc -b`, which does not clean. Release runs from a fresh CI checkout (`release.yml`), and the closed exports map refuses those modules anyway (check 3b) | A local `pnpm publish` without `pnpm clean` would ship unreachable stale files | Run `pnpm clean` before any local pack |
| SEC-OBS-6 | `scripts/surface-diff.mjs:19-22` | By design (ADR-QD-204), `surface-diff compare` is a manual, phase-local tool. In `pnpm check` only its self-test runs. Kind regressions of values are gated by each `surface.test.ts`, names by gate 13. A value-to-type change of a name that is a type in base is not a consumer break | — | None |
| SEC-OBS-7 | `packages/react/src/QadiProvider.tsx:49-50` | Two adjacent imports of `./GateWriter.ts` (`import type { GateRegistry }`, `import { gateWriterFor }`). Line 50 is held from base by the pinned check. No security impact | — | None (style; could merge once the pin allows) |
| SEC-OBS-8 | release facts (WX-07) | No `package.json` version, CHANGELOG or lockfile change. `git tag --points-at HEAD` is empty. There is no `origin/arch-wave-16` ref. The three changesets are `patch` and unconsumed | — | None |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-26 | 38 | 38 | 0 | gsd-security-auditor (ASVS L1, block_on high) |

Commands run (read-only for the tree): an independent surface scan of `packages/{core,react,audit}/src/index.ts` compared to `91-surface-base.json` (equal, 545/62/72); `declarationEscapes` over every built `.d.ts` (257 read, 0 escapes, self-check `[]`); `node scripts/check-house-style.mjs` (648 files clean); `node scripts/surface-diff.mjs --self-test` (20 passed); vitest on the three surface tests and on Hydration, HydrationPayload, HydrationCounts, UntrustedSeams, GateWriter, GateRegistry.store, GateWriter.reconcile, DeveloperSignals, PortSpan, PortSpanFold.mutation and SequenceIntegrity (14 files, 285 passed); `run-tstyche.mjs HydrationTarget Hydration` (both passes, 37 tests, 103 assertions); the four phase-script self-tests (477, 125, 97, 76 passed); `91-check.mjs` read-only modes (base, homes, barrels --text, folds, rule, changesets, records --close, scan-ids, scan-forbidden, trailers, circular with 246 files and no cycle, spike), all exit 0; `91-mutation.mjs landed base|coverage-base|close|coverage-close` and `compare`, all ok; `91-pinned-check.mjs --all-applied` clean; `91-earlier-checks.mjs` 87 of 87 rows match; `check-dod-table.mjs` 27 steps; `verify-traceability.sh --strict` 21 PASS; `check-api-surface.mjs` 943; `shasum` of the spike patches.

Not run: Stryker and coverage (the recorded close was relied on); `check-package-install.mjs` (its pack and `prepack` build write into the repo; the recorded runs and RED `hydrate-probe-refusal`/`escape-*` were relied on); `91-check.mjs close`/`suite`/`surface`/`escape`, `spike --rerun`, `pnpm check:pr`; re-running RED variants (the evidence blocks were read instead).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-26
