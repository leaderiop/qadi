---
phase: "35"
slug: "the-atom-set-owns-its-eviction-sweep"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-12"
---

# Phase 35 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| The registry's dispose-then-reread window and the render path → the book's sweep | A sweep that ran inside either would drop a live question and make a guard re-evaluate with a lost seed or a transient absence | Question liveness, cached decisions |
| An atom set → its host (React or not) | The bound must hold with no provider, and one application's pressure must never sweep another's book | Memory bound, per-atom-set scheduler state |
| `@qadi/react` package-private modules ↔ its public surface | `SweepScheduler.ts` and the book's `signal` seam stay out of the barrel; the removed `sweepIntervalMillis` and `sweepEvictions` are compile errors, not inert knobs | Module surface |
| Phase changes → the evidence that judges them | Baseline, pins, spike record, gates, scripts and configs | Build integrity |
| `spec/`, changesets, upgrade guide, AGENTS.md §13 | The normative and consumer-facing record of the mechanism and the two removals | Specification integrity |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-35-01 | Tampering | `35-mutation-base.json` misclassifying or going stale | medium | mitigate | the baseline is the phase's first commit, alone (`a94cee6c`, one file); 35-07's comparison found it in exactly one commit | closed |
| T-35-02 | Repudiation | a vacuous characterisation pin | medium | mitigate | the pins hold their atom sets, count synchronously after render, use no `vi.mock`, and were green on the untouched base (35-01-SUMMARY) | closed |
| T-35-03 | Tampering | a candidate prototype left under `packages/` | high | mitigate | `git status --porcelain -- packages` empty; no tracked `spike`/`proto` file; spike commits carry `35-SPIKE.md` alone (35-07 order check exit 0) | closed |
| T-35-04 | Repudiation | spike evidence restated rather than run | high | mitigate | every `35-SPIKE.md` row quotes its own vitest or Playwright summary line from a run in 35-02/35-03 | closed |
| T-35-05 | Repudiation | the winner chosen by preference, not D-02's ranking | high | mitigate | the Conclusion applies all four D-02 rules in order over three measured candidates, with exactly one `Winner: candidate-1` line | closed |
| T-35-06 | Tampering | a candidate 2 or 3 prototype left or committed | high | mitigate | clean `packages/` tree; no `(35-03)` commit touches `packages/` | closed |
| T-35-07 | Tampering | a live question evicted by a sweep in the dispose-then-reread window or on the render path | high | mitigate | the book only signals; `SweepScheduler.ts:42` begins each episode with `Effect.yieldNow`; S3 and S4 assert `asked()` unchanged synchronously; four smoke pins canary the registry timings; e2e 30/30 | closed |
| T-35-08 | Denial of service | the bound never enforced without a provider | medium | mitigate | the atom set owns the sweep; S1 (flipped), S2 and S4 assert the bound on a bare registry | closed |
| T-35-09 | Denial of service | one O(n) sweep per signal under sustained pressure | low | mitigate | requests coalesce to one fiber per episode (C2, C9, S9, P5) | closed |
| T-35-10 | Tampering | module-scope scheduler state shared across atom sets | medium | mitigate | the pending flag lives in `makeSweepScheduler`'s closure; no module-scope `let`/`var` in `SweepScheduler.ts` or `QuestionBook.ts` (0 hits); C7 builds 300 independent schedulers | closed |
| T-35-11 | Elevation of privilege | a guard rendering an allow from an evicted question's stale atom | medium | mitigate | eviction-suite assertions kept verbatim (never a live entry, re-admission on re-read); P1..P4 keep the mounted gate's question under StrictMode and Activity; e2e 30/30 | closed |
| T-35-12 | Tampering | an inert `sweepIntervalMillis` kept for compatibility | low | mitigate | no `sweepIntervalMillis`, `sweepEvictions` or `DEFAULT_SWEEP_INTERVAL_MILLIS` in `packages/*/src` (0 hits); recorded as **Breaking** with an upgrade section | closed |
| T-35-13 | Repudiation | history rewritten instead of amended | medium | mitigate | AGENTS.md diff since base is +1/-1; house-rules-evidence has no removed line outside Document Control; ADR-QD-014 gets an `Amended:` line only | closed |
| T-35-14 | Tampering | an id outside the reservation or a `-NEXT` placeholder | medium | mitigate | the CCR-QD-426 row's Used/Unused line lists exactly the reserved ids; no `-NEXT` in shipped source, tests or features (`[no-numbering-placeholder]` under `pnpm lint`, green) | closed |
| T-35-15 | Tampering | a judging file loosened to pass a gate | high | mitigate | only `stryker.react.mjs` (one mutate entry plus header) and `AGENTS.md` (one line) changed among judging files since base; 35-07 integrity check exit 0 | closed |
| T-35-16 | Repudiation | a surviving mutant hidden | high | mitigate | after-run: QuestionBook.ts 0.9444→0.9659, QadiAtoms.ts 0.8947→0.8966, QadiProvider.tsx 0.75→0.8088, SweepScheduler.ts 1.0 (18/18); `35-mutation-after.json` committed alone (`8e861029`) | closed |
| T-35-17 | Repudiation | a pin rewritten after the change to agree with it | high | mitigate | 35-07's order and shape checks (exit 0) fix the pins' first commits before any src change and keep every base expect line | closed |
| T-35-SC | Tampering | npm/pip/cargo installs | high | accept | see Accepted Risks | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-35-01 | T-35-SC | No package was installed in any plan of this phase (`pnpm-lock.yaml` and every `package.json` unchanged since the phase base); the e2e used the Chromium already in the Playwright cache | plan-time threat model (all plans) | 2026-11-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-12 | 18 | 18 | 0 | secure-phase orchestrator (L1 grep, short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-12
