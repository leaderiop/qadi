---
phase: "47"
slug: "port-facts-read-from-the-description"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-16"
---

# Phase 47: Security

> The per-phase security contract: threat register, accepted risks, and audit trail. The register is the union of the `<threat_model>` blocks in 47-01..47-07-PLAN.md, written when the plans were authored. It was verified at ASVS L1 against `git diff 9f205122..HEAD` by grep-level checks, run by the orchestrator. Every Threat Flags section in the SUMMARYs reads "None".

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| A host's port shape → devtools' wiring report | The report reads whether a provided shape is the port's fail-closed default. This is a diagnostic, never a decision | The service object; the mark is a package-private unique symbol holding a `PortName` |
| `@qadi/core`'s mark → everything else | Only `nonePort` sets the mark. Wrappers and `decoratePorts` copy it from a marked inner. No evaluation or enforcement path reads it | The `PortName` under an unforgeable symbol key |
| Phase evidence → the close | Editing a baseline, gate or config would let the change judge itself | Mutation scores, RED and characterisation rows, scripts, configs, barrels |
| Branch → registry | Changesets and versions could publish | Package versions (nothing consumed) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-47-01 | Repudiation | `47-mutation-base.json` | medium | mitigate | Measured fresh on the untouched tree and committed alone as the first plan commit (`57c743ce`, parent `9f205122`) | closed |
| T-47-02 | Tampering | RED rows | high | mitigate | Exact name and `defaulted` assertions. RED recorded as `7 failed (7)` on `src` = `phase_base`, green at 47-04 with the file unedited | closed |
| T-47-03 | Spoofing | The base's name parse | medium | mitigate | `isDefaultName` was removed from `Wiring.ts` (grep is clean), and `defaulted` now comes from `isPortDefault` | closed |
| T-47-04 | Tampering | Characterisation substring pins | medium | mitigate | Whole-string `strictEqual`. No `toContain`, `include` or `match` in `ServicesPanel.reading.test.tsx` | closed |
| T-47-05 | Repudiation | Characterisation taken on edited src | medium | mitigate | Committed before any src commit (`027bc5a2`, `c04552f6`). 47-07's order check passed | closed |
| T-47-06 | Spoofing | A captured default reading as real | medium | mitigate | `decoratePorts` copies the mark. The `Capture.test.ts` row is green | closed |
| T-47-07 | Spoofing | A mark forged from outside core | medium | mitigate | `Symbol("qadi.PortDefault")` (not `Symbol.for`) in `PortDefault.ts`, which is not in `packages/core/src/index.ts` | closed |
| T-47-08 | Spoofing | A default under another port | medium | mitigate | The mark holds the `PortName`, and the reader compares it with `d.port`. Row M6 is green | closed |
| T-47-09 | Information disclosure | The mark leaking into JSON or keys | low | mitigate | A symbol key. Row M8 pins `Object.keys` and the JSON text | closed |
| T-47-10 | Spoofing | A scripted double or remote asker marked | medium | mitigate | `PortDoubles.ts` and `PortRemote.ts` do not mention the mark (grep is clean). Row M2 pins a scripted double false | closed |
| T-47-11 | Denial of service | A `Proxy` service whose trap throws | low | accept | See the Accepted Risks Log | closed |
| T-47-12 | Elevation of privilege | An evaluation path branching on the mark | high | mitigate | Only `PortDefault.ts`, `PortDescription.ts`, `PortDerivation.ts`, `Ports.ts` and devtools' `Wiring.ts` name the mark or the reader | closed |
| T-47-13 | Spoofing | A method-replacing spread reading defaulted | low | accept | See the Accepted Risks Log | closed |
| T-47-14 | Spoofing | A fresh-object or `Object.create` wrapper reading real | medium | accept | See the Accepted Risks Log | closed |
| T-47-15 | Tampering | Wording drifting when the readings move | medium | mitigate | 24 byte-exact rows and the panel suite are green and unedited (`git diff 50f85d96 -- packages/devtools/test` is empty) | closed |
| T-47-16 | Tampering | A widened row type | medium | mitigate | `rowOf` is monomorphic over `N, Q, Ans, O`. `ROWS` is typed `{ [K in PortName]: … PortCallOf<K> }`. There is no `as`, `any`, `!` or `unknown` overload | closed |
| T-47-17 | Tampering | The sixth-port scratch left in the tree | high | mitigate | `Probe6.ts` is absent. `Probe6` appears only in the 47-05-SUMMARY evidence text | closed |
| T-47-18 | Repudiation | An upgrade entry hiding the reverse direction | medium | mitigate | The upgrade entry and ADR-QD-160 state both directions, `Object.create`, and the spread advice | closed |
| T-47-19 | Spoofing | A duplicate `@qadi/core` install reading defaults as real | low | accept | See the Accepted Risks Log | closed |
| T-47-20 | Repudiation | The old BEH-QD-215 claim surviving | medium | mitigate | Amended in 47-06. The grep outside the change history is clean | closed |
| T-47-21 | Tampering | A change-history row rewritten | medium | mitigate | `spec-revise` only prepends. 47-07's scope check passed | closed |
| T-47-22 | Tampering | The mutation evidence | high | mitigate | The base's exact invocations, plus the two new files. The after JSON is committed alone (`36af1977`). No score fell | closed |
| T-47-23 | Tampering | A judging file edited | high | mitigate | `git diff 9f205122..HEAD` touches no script, `AGENTS.md`, Stryker or vitest config, oxlint config, or barrel | closed |
| T-47-24 | Elevation of privilege | The mark read on an evaluation path | high | mitigate | As T-47-12: the only callers are the five allowed files | closed |
| T-47-25 | Repudiation | A release, push or consumed changeset | high | mitigate | No tag contains the base. The branch is on no remote. No CHANGELOG changed. Both new changesets are present and unconsumed | closed |
| T-47-SC | Tampering | npm/pip/cargo installs | high | mitigate | No `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since `9f205122` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low. Only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-47-01 | T-47-11 | A service is the host's own in-process code. The reader runs only in devtools' wiring report, never on an evaluation path. Recorded in ADR-QD-160's consequences | Plan-time disposition (47-03) | 2026-11-16 |
| AR-47-02 | T-47-13 | `defaulted` means "built from the default's shape", not "answers fail-closed" (BEH-QD-572, ADR-QD-160). A diagnostic that errs towards warning errs in the safe direction | Plan-time disposition (47-04) | 2026-11-16 |
| AR-47-03 | T-47-14 | The documented limit (user decision D-04). BEH-QD-572, ADR-QD-160 and the 0.13 upgrade entry tell wrapper authors to spread `inner`. R7 of `WiringDefaulted.test.ts` pins it | User decision D-04 | 2026-11-16 |
| AR-47-04 | T-47-19 | The user chose a unique symbol (D-20): being unforgeable outweighs the duplicate-install case. ADR-QD-160 and BEH-QD-572 state the limit | User decision D-20 | 2026-11-16 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-16 | 26 | 26 | 0 | orchestrator (secure-phase, ASVS L1 short-circuit: register authored at plan time, threats_open 0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-16
