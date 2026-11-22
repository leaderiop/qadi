---
phase: "62"
slug: "type-pins-that-can-fail"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-20"
---

# Phase 62 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Nothing in this phase runs at product runtime. `packages/*/src` is byte-identical to `phase_base` 4cab2e74.
The phase changes type tests, two tool configs, two gate scripts and the spec. Its threats are threats to the integrity of the merge gate.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| repo config → tstyche | tstyche trusts `tstyche.json` and the tsconfig it names | compiler options, plugin entry (repo-internal, non-sensitive) |
| repo tree → house-style gate | `check-house-style.mjs` trusts the type-test walk and AGENTS.md section 6's table | pin counts, file list (repo-internal) |
| gate script → child process | `run-tstyche.mjs` spawns tstyche | constant argv, no shell |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-62-01 | Tampering | `tsconfig.tstyche.json` | medium | mitigate | `[tstyche-plugin-drift]` (check-house-style.mjs) holds the entry to the base minus `floatingEffect`, and after review WR-02 the file to `extends` + `compilerOptions.plugins` only | closed |
| T-62-02 | Tampering | `packages/core/src/DecisionLog.ts` | medium | mitigate | RED probe restored the original bytes; `git diff --quiet 4cab2e74 -- 'packages/*/src'` exits 0 | closed |
| T-62-03 | Tampering | `zz-flip-*.tst.ts` copies | medium | mitigate | No probe or flip file is tracked or untracked under `packages`/`scripts` (`git status --porcelain` empty) | closed |
| T-62-04 | Repudiation | `62-FLIP-SWEEP.md` rows | low | mitigate | `62-FLIP-SWEEP.md` holds the sweep output (87 pins, 0 outside the oracle) | closed |
| T-62-05 | Tampering | `walkTypeTests` / `TYPE_TEST_FILE` | medium | mitigate | Empty walk fails (`found no type-test files`); a `testFileMatch` fails; `run-tstyche.mjs` cross-checks `--listFiles` against the shared walk (`scripts/lib/type-tests.mjs`, review WR-03) | closed |
| T-62-06 | Repudiation | `NOT_CALLABLE_PIN_BUDGET` | low | mitigate | Budget checked both directions; `[not-callable-pin-table]` holds AGENTS.md section 6 to it | closed |
| T-62-07 | Tampering | `tsconfig.tstyche.json` plugin entry | medium | mitigate | `[tstyche-plugin-drift]`: one own plugin entry with `floatingEffect: "off"`, `extends` chain and `tstyche.json` pointer checked | closed |
| T-62-08 | Elevation of privilege | `scripts/run-tstyche.mjs` spawn | low | mitigate | `spawnSync(process.execPath, …)` with constant args; no `shell:`, `execSync` or `exec(` in code (one match is the "No shell" comment) | closed |
| T-62-09 | Tampering | `--skip` text over-matching | medium | mitigate | `RULE_OFF_ONLY` / `RULE_ON_ONLY` must each appear once, in the characterisation only; re-review confirmed neither title contains the other's text | closed |
| T-62-10 | Tampering | id allocation | medium | mitigate | ADR-QD-175 file and index entry exist; 0 `-NEXT` placeholders added; `verify-traceability --strict` passes | closed |
| T-62-11 | Repudiation | release and publish | low | mitigate | 0 changesets added, 0 tags containing `phase_base`, nothing pushed | closed |
| T-62-12 | Repudiation | `[not-callable-control]` parse | medium | mitigate | Every counted negative must be a parsed one, so an unreadable pin fails closed | closed |
| T-62-13 | Tampering | probe files left in `packages/core/test` or `scripts/` | low | mitigate | Same check as T-62-03: no probe files remain | closed |
| T-62-14 | Tampering | `packages/*/src` | medium | mitigate | `git diff --quiet 4cab2e74 -- 'packages/*/src'` exits 0 (checked again at the security audit) | closed |
| T-62-15 | Repudiation | release and publish | low | mitigate | Close scan (13/13) refused changesets, tags and release commits; same evidence as T-62-11 | closed |
| T-62-16 | Repudiation | a twin that does not run | high | mitigate | `RUN_MODE = /\.\s*(skip\|only\|todo)\b/` and `DIRECTIVE = /@tstyche\b/` refused beside a negative pin, characterisation excepted by path | closed |
| T-62-17 | Tampering | `tsconfig.base.json` `floatingEffect` | high | mitigate | Drift check fails unless the base's severity is unset or `"error"`; pass 2's directive-free block goes red if the config loses the rule (review WR-01, probed: `off`, `diagnostics:false`, `plugins:[]`) | closed |
| T-62-18 | Tampering | a type test compiled under tstyche's baseline options | medium | mitigate | Each pass fails when tstyche names a project other than its own (`uses TypeScript … with` check) | closed |
| T-62-19 | Repudiation | close-scan's forbidden-construct claim | medium | mitigate | 62-08 close scan 13/13; leak check reads word-level added runs (orchestrator-approved deviation, recorded in 62-08-SUMMARY) | closed |
| T-62-SC | Tampering | npm/pip/cargo installs | low | accept | No package installed, upgraded or removed in this phase | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-62-01 | T-62-SC | No dependency is installed, upgraded or removed in this phase, so there is no supply-chain surface to audit | plan-time disposition (62-01..62-08) | 2026-11-20 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-20 | 20 | 20 | 0 | orchestrator, L1 grep verification (ASVS 1, register authored at plan time, auditor skipped by rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-20
