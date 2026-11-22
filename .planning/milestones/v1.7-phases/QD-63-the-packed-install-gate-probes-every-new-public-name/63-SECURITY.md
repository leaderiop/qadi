---
phase: "63"
slug: "the-packed-install-gate-probes-every-new-public-name"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-20"
---

# Phase 63 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Nothing in this phase runs at product runtime. `packages/*/src` is byte-identical to `phase_base` 11dc168f.
The phase changes one gate script (`scripts/check-package-install.mjs`) and the spec. Its threats are threats to the integrity of merge gate 14.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| gate script → child process | the guard reads the packed `@qadi/devtools` keys through `node -e` | constant argv and program, no shell; output is a JSON key list |
| gate script → TypeScript parser | the guard loads `typescript/unstable/*` and parses the sandbox `consumer.ts` | the fixture text the script itself wrote (repo-internal) |
| packed tarballs → consumer fixture | the fixture compiles and runs against the installed artifacts | public exports and `.d.ts` of the 9 packages |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-63-01 | Tampering | the key-read child process | low | mitigate | `execFileSync("node", ["--input-type=module", "-e", <constant program>], { cwd: SANDBOX })`: fixed argv, no shell, no interpolated value | closed |
| T-63-02 | Repudiation | the guard reporting green after its parser broke | high | mitigate | The three `await import("typescript/unstable/…")` loads and the walk sit in one `try` whose `catch` calls `fail()`; an unreadable `consumer.ts` and an empty feed set each `fail()`; 63-01 variant g5 shows a missing subpath failing the gate | closed |
| T-63-03 | Tampering | parser supply chain | medium | mitigate | The only imports added are `typescript/unstable/sync`, `/ast/is`, `/ast/scanner` (the root dependency's exported subpaths) and the packed `@qadi/devtools`; no `.pnpm` or `dist/` path | closed |
| T-63-04 | Repudiation | a probe that passes whatever the artifact says | high | mitigate | Gates `Read`/1 vs `Unwatched`, diagnostics `Live` + `hydration`, host cache `miss,hit`/1 resolve/size 1; 63-03's m1–m3 each fail the gate on the assertion they break | closed |
| T-63-05 | Denial of service | a probe that waits forever | medium | mitigate | `turns < 200` cap on the `Effect.yieldNow` loop, inside `Effect.scoped`; no `Date.now`, `performance.now`, `setTimeout` or `Effect.sleep` in the script | closed |
| T-63-06 | Tampering | a `@ts-expect-error` swallowing an unrelated error | medium | mitigate | Each directive sits directly on the refused property (`schedule:`, `getOrCompute:`) and names it; r3/r6 show the dropped directive surfaces TS2345/TS2353, and `dts` shows an unused directive fails with TS2578 | closed |
| T-63-07 | Tampering | a scratch variant reaching the repository | medium | mitigate | No `.scratch/qd63*` directory remains; nothing under `.scratch/` is tracked | closed |
| T-63-08 | Tampering | a variant clobbering the real gate's sandbox | low | mitigate | Variants used their own `SANDBOX` under `.scratch/qd63-*` and ran one at a time (63-03 and 63-REVIEW-FIX record it); gate 14 green at HEAD | closed |
| T-63-09 | Repudiation | a proof that overstates what the guard catches | medium | mitigate | `63-RED-EVIDENCE.md` holds the eleven 63-03 rows (c0, r1–r6, dts, m1–m3) plus the 63-01 matrix; review WR-01's extra refusal was proven failing alone in 63-REVIEW-FIX | closed |
| T-63-10 | Tampering | reserved ids used or misnumbered | medium | mitigate | No `spec/decisions/176-*`; `next-id.mjs` never run; `verify-traceability --strict` 21/0/0 | closed |
| T-63-11 | Elevation of privilege | an accidental release | high | mitigate | 0 `.changeset/` files added, 0 tags containing `phase_base`, 0 release or version commits, nothing pushed | closed |
| T-63-12 | Repudiation | a record that claims more than the guard does | medium | mitigate | f4398b04 aligned ADR-QD-033 and CCR-QD-454 with the guard's full lists and dropped the "directive on another property cannot stand in" claim; b5310eb7 did the same for the script's comments (review iter2 IN-01) | closed |
| T-63-13 | Repudiation | a close scan that reads green while a rule broke | medium | mitigate | Lexer pinned by SHA-256; the scan's set-aside regex defect was caught (20/21), fixed in scratch only and pinned to exactly three loads, and shown failing on a stray `await` and a fourth import before reading 21/21 (63-05-SUMMARY deviations) | closed |
| T-63-14 | Denial of service | `check:pr` and gate 14 sharing `.package-check/` | medium | mitigate | `check:pr` ran alone, once in 63-05 and once by the orchestrator after the review fixes, each exit 0 | closed |
| T-63-15 | Tampering | requirement records ticked beyond what the phase proved | medium | mitigate | PROBE-01..05 Complete; all seven WX rows Pending (phase.complete's WX ticks reverted by the orchestrator) | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-63-01 | T-63-SC | No dependency is installed, upgraded or removed in this phase, so there is no supply-chain surface to audit | plan-time disposition (63-01..63-05) | 2026-11-20 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit (63-REVIEW IN-01..IN-04, Info): the directive is matched by text within the declaration; any type reference counts as a type use; `typescript ^7` lets the `unstable/*` API move (a break fails the gate loudly); no timeout on the guard's import or `tsgo`. A feed call written but never run passes the guard (documented `shortcut:`).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-20 | 16 | 16 | 0 | orchestrator, L1 grep verification (ASVS 1, register authored at plan time, auditor skipped by rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-20
