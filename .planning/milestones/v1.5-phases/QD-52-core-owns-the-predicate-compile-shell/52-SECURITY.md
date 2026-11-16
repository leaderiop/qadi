---
phase: "52"
slug: "core-owns-the-predicate-compile-shell"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-16"
---

# Phase 52 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Predicate → dialect output | `compilePredicate` applies the defaults, runs `toRenderable`'s refusals, then the dialect's renderer | What SQL text/params or Prisma where object a caller's query receives; which predicates are refused |
| Metric series | Each package's own `compiledTotal` series, updated by core's shell | Compile volume and refusal counts read by operators |
| Package surface | Three new `@qadi/core` exports (`compilePredicate`, `CompilePredicateOptions`, `CompileOutcomes`); both dialects' `.d.ts` byte-identical to the base | The packed `exports` map (gate 14) and `spec/overview.md` (gate 13) |
| Evidence → decision | The mutation comparison (D-09a) decides whether the change holds | `52-mutation-base.json`, `52-mutation-after.json` |
| Branch → release | Nothing in this phase versions, tags, pushes or publishes | Three changesets only (core minor, sql patch, prisma patch) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-52-01 | Repudiation | 52-mutation-base.json: measured on an edited tree, from a stale report, from a different file set, or under contention | medium | mitigate | the precondition requires a clean tree for packages, spec, scripts and the three Stryker configs and no concurrent heavy process; `tools/mutation.mjs` refuses a stale report, a report holding other files, a `source` differing from disk and a config reporting elsewhere; Task 2's second verify requires the JSON alone as the first plan commit with `phase_base` its parent | closed |
| T-52-02 | Tampering | the survivor and shell identities: recorded loosely, so a new survivor or an unkilled moved mutant passes at the close | medium | mitigate | each survivor and each shell mutant is stored as mutator, status, replacement, mutated text and line text; `tools/mutation.mjs compare` (52-05) refuses any after-survivor not in the base set and any moved mutant without a detected counterpart in `compilePredicate` | closed |
| T-52-03 | Repudiation | the reserved ids: one already used at the base | low | mitigate | Task 1's id check runs against `phase_base` itself, whole-id matched, across every tracked tree the spec gates read | closed |
| T-52-04 | Tampering | a CompileShell file reading `toRenderable` or `compilePredicate`, or a row edited to pass, so an output change in 52-03 is hidden | medium | mitigate | rows are literal and written on the base; each task's second verify refuses any import beyond the public entry points and any mention of the code under change; `tools/scan.mjs` (52-05) repeats it and requires exactly one `test(52-02)` commit per file | closed |
| T-52-05 | Repudiation | a test declaring a `qadi_*` counter or matching an id literal, so the counter rows read a different series than the package updates | low | mitigate | counters are read through `compiledTotal`'s export inside `isolatedMetrics`; the second verify refuses a `"qadi_` literal and any `Metric.<ctor>(`; `check:pr`'s house style runs `[metric-id-literal]` | closed |
| T-52-06 | Tampering | `compilePredicate`: a renderer reached without classification, or a dialect rule (`reservedColumns`, `negation`, `finiteness`, `finiteExclusion`) dropped in the move, so an unsafe column or value reaches SQL text or Prisma | high | mitigate | `render` is only ever `Effect.map`ped over `toRenderable`'s success (Task 1's structure verify checks the pipe order); each package's rules literal is checked line by line (Tasks 1-2 verifies); the CompileShell refusal rows for `UnsafeColumn`, `UnsafeValue`, `ReservedColumn`, `NonFiniteColumn` and `NullOnNonNullableColumn` and the engine-agreement suites stay green | closed |
| T-52-07 | Information disclosure | SQL `params` shared across two runs of one compiled Effect, leaking one query's parameters into another | medium | mitigate | the array is allocated inside `render`, per run (Task 1's verify requires it there); the CompileShell row "the returned Effect is reusable … fresh params array" asserts distinct arrays | closed |
| T-52-08 | Elevation of privilege | a default lost or loosened in the move (`identifiers` no longer `Ascii`, `maxInValues` no longer 1000), widening what compiles | medium | mitigate | the defaults live only in `compilePredicate` (scoped grep clean in the packages); CompilePredicate.test.ts tests both defaults with the option omitted and explicitly `undefined`; CompileShell rows pin 1000 compiling, 1001 refusing and `é` refusing under the default | closed |
| T-52-09 | Repudiation | the counters misreport: refused not counted, compiled counted on a defect (Prisma's base order) | low | mitigate | one `tapError(refused)` and one `tap(compiled)` after `map(render)` in core; CompilePredicate.test.ts's defect test reads 0/0; CompileShell's 3-and-2 rows; D-06a stated in 52-04's records | closed |
| T-52-10 | Repudiation | a record citing an id outside the reservation, or INV-QD-350 used without being named | low | mitigate | the verifies check each heading's exact id and title, that INV-QD-350 is not a heading and that the CCR row says `Unused: INV-QD-350.`; `tools/scan.mjs` (52-05) refuses any new id outside the ten reserved | closed |
| T-52-11 | Tampering | a changeset with the wrong bump (core patch, a dialect minor), a missing package, or a false Breaking | medium | mitigate | Task 3's verify compares each front matter exactly and refuses Breaking; `tools/scan.mjs` repeats it; `pnpm changeset version` is never run | closed |
| T-52-12 | Information disclosure | the Prisma counting correction left unstated, so an operator reading the compile counter sees a silent change | low | mitigate | ADR-QD-165's section, BEH-QD-597 and the Prisma changeset each state it; Task 3's verify requires the changeset to | closed |
| T-52-13 | Repudiation | the mutation comparison: a fall hidden by re-measuring the base, by comparing counts instead of identities, or by accepting a moved mutant that core does not kill | medium | mitigate | Task 1's second verify requires `52-mutation-base.json` to have exactly its `chore(52-01)` commit; `compare` matches survivor identities, requires each moved shell mutant's detected counterpart in `compilePredicate` and every `compilePredicate` mutant detected | closed |
| T-52-14 | Tampering | a close check made to pass by editing `tools/`, a gate script, a Stryker config or a budget | medium | mitigate | the prohibitions; Task 2's verify refuses any commit since `phase_base` touching `tools/`, `scripts/` or a Stryker config; `scan.mjs`'s scope check refuses any file outside the phase's list | closed |
| T-52-15 | Elevation of privilege | a release, tag or push from a phase that must not release | high | mitigate | Task 3's release check (tags, CHANGELOG, package.json, base changesets, remote branches, staging); `pnpm changeset version` is never run | closed |
| T-52-SC | Tampering | npm/pip/cargo installs | high | mitigate | no install task in this phase (RESEARCH Package Legitimacy Audit: no package added; Stryker and vitest already installed); `tools/scan.mjs` (52-05) refuses any file outside the phase's list, `package.json` and the lockfile included | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-16 | 16 | 16 | 0 | gsd-security-auditor (sonnet) |

Evidence highlights (auditor, read-only): `RenderablePredicate.ts:561-569` renders only on the success channel and counts `compiled` after it; the explicit `identifiers`/`maxInValues` follow `...options.rules`, so a caller's rules cannot loosen them at runtime; SQL's `params` is allocated per run (`CompileShell.test.ts` asserts a fresh array per run); both dialects' `.d.ts` re-emitted fresh from HEAD hash-match the base; `tools/mutation.mjs compare` printed `WX-05 holds (D-09a)` with survivors +0 −0 per file and all 8 moved shell mutants killed in `compilePredicate`; `tools/scan.mjs` printed `phase scan clean`; no tag, remote branch, CHANGELOG, package.json or lockfile change. Not verifiable after the fact: that nothing else ran during the base Stryker run (no Timeout in either JSON; non-blocking).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-16
