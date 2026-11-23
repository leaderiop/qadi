---
phase: "71"
slug: "developer-signal-reporters-resolved-through-one-table"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-22"
---

# Phase 71 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase changes how `@qadi/react` resolves the reporter each developer signal is told through. One table, `SIGNALS` in `DeveloperSignals.ts` (`satisfies SignalTable`, keyed by every `DeveloperSignal` tag), states for each signal where its default speaks, how often, when each entry point resolves its reporter and under which option name; `reporterFor` is the one resolver, `contain` the one place a supplied reporter's throw is caught, `once` the one reader of the one module-scope latch, and `holdsHere` the one reader of a row's environment condition (`QadiProvider` reads it too). The registry store moved to `GateWriter.ts` as `buildGateRegistry`, so `makeGateRegistry` and the atom set each name their own option when a collision reporter throws (the one observable change, SIGR-01). `MODULE_STATE_BUDGET` in `scripts/check-house-style.mjs` counts every rebindable module-scope binding in library source through a syntax-tree scan and allows only the latch. No network, auth, file, dependency or public-export surface changes: `check-api-surface` still reads 941 exports and the package's `exports` map is the closed `"."`. The threats are a supplied reporter's throw escaping, a default line disclosing an entry's contents, a throw announced under an option the caller never passed or announced twice, new module-scope state, records and spec that claim more than ran, and the release path.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| host callback → library | a reporter the host supplies (`onHydrationMismatch`, `onGateIdCollision`, `onIdCollision`, `onDropped`, `onDeveloperSignal`) | an arbitrary function that may throw or return anything |
| library → developer console | the default line a signal prints | the signal's reason and counts, never an entry's subject, policy or resource |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-71-01 | Tampering | mutation base measured on a tree already holding a phase test | medium | mitigate | `71-mutation-base.json` written by `ce254a0a`, the first commit after `phase_base` d147287a and the only commit touching it; all five groups' `head` = d147287a | closed |
| T-71-02 | Repudiation | characterisation edited later to match changed behaviour | high | mitigate | `7d565d81` adds only `DeveloperSignalReporters.test.tsx`, before any source change; review edits (`375ef883`, `721ccf7e`) changed layout, helpers and the header only: titles unchanged, every console-line constant unchanged, `threwBoom(x)` builds the identical string | closed |
| T-71-03 | Information disclosure | default line printing a dropped entry's contents | high | mitigate | drop lines built from `reason` and `entries.length` only (`DeveloperSignals.ts:182-196`); whole-line constants compared with `toEqual`; `DeveloperSignals.test.ts` feeds `secret-u2` entries and asserts neither the subject nor `HasRole` appears | closed |
| T-71-04 | Repudiation | throw announced under an option the caller never passed | medium | mitigate | `GateRegistry.store.test.ts` compares the whole line per entry point in both environments; the two `makeGateRegistry` rows red on the base (`71-RED-EVIDENCE.md`), test `2c6f6726` before fix `9b8645ee` | closed |
| T-71-05 | Tampering | type pin passing for the wrong reason | medium | mitigate | `DeveloperSignals.tst.ts`: written-out unions, positive twins, no negative callable pin; five gut runs each failed exactly its pin (`71-RED-EVIDENCE.md`), the `holdsHere` pin seen failing (`71-REVIEW-FIX.iter1.md`) | closed |
| T-71-06 | Denial of service | supplied reporter's throw escaping into a guard effect or registration | high | mitigate | `contain` called once, in `reporterFor`; `buildGateRegistry` takes the resolved reporter; ids still `["x","x~1"]` after a throw; every row × entry point thrown through in both environments | closed |
| T-71-07 | Elevation of privilege | moved builder reachable from the barrel | high | mitigate | `buildGateRegistry`/`gateWriterFor` live in non-barrel `GateWriter.ts`; `GateRegistry.ts` exports only its types and `makeGateRegistry`; `check-api-surface` 941 | closed |
| T-71-08 | Repudiation | one throw announced twice | medium | mitigate | the atom set hands `buildGateRegistry` its own resolved reporter and never calls `makeGateRegistry`; `saidOnly` asserts exactly one sentence | closed |
| T-71-09 | Information disclosure | dehydrate default paired with the hydrate row | high | mitigate | each engine call site names its own row and entry point; a `@ts-expect-error` pin refuses the dehydrate reporter on the hydrate row (gut #5 red) | closed |
| T-71-10 | Denial of service | production-instrumentation line printed per provider, or never | low | mitigate | one module-scope `let`, read and written only inside `once`, used only for the one `OncePerProcess` row; `QadiProvider.production.test.tsx` (unchanged) asserts one call | closed |
| T-71-11 | Tampering | supplied reporter's throw escaping hydration or render | high | mitigate | one `contain(` call site and one `console.` call (`say`); the eight entry-point rows enumerated and checked equal to the table, then thrown through in both environments | closed |
| T-71-12 | Information disclosure | new module-scope `let` carrying tenant data | medium | mitigate | `MODULE_STATE_BUDGET` syntax-tree scan over `packages/*/src` fails any unbudgeted binding (indented, block, loop, destructured with holes, `export var`, `let a, b` counted per name; plants recorded in `71-RED-EVIDENCE.md`, `71-REVIEW-FIX.iter1.md`, `iter2.md`, `iter3.md`); gate green, 569 files | closed |
| T-71-13 | Tampering | budget silently widened or latch renamed | low | mitigate | count checked in both directions, `[module-state-names]` requires the latch's name, `[module-state-table]` checks AGENTS.md §6; a scan failure or timeout fails the gate and leaves no TypeScript server behind (`scripts/lib/typescript-server-child.mjs`) | closed |
| T-71-14 | Repudiation | AGENTS.md denying the state the code holds | low | mitigate | AGENTS.md §13 names the latch; the superseded sentence quoted in `spec/process/house-rules-evidence.md` §7 | closed |
| T-71-15 | Repudiation | ADR-QD-184 over-claiming what the compiler enforces | medium | mitigate | Consequences split into what the compiler refuses (with the pins seen failing) and what only tests hold | closed |
| T-71-16 | Tampering | CCR row citing a non-existent revision | low | mitigate | every revision CCR-QD-463 cites equals its header (README 1.289 … ADR-033 1.10); strict traceability 21/21, `spec-revise --check` passes | closed |
| T-71-17 | Information disclosure | changeset over- or under-describing | low | mitigate | `.changeset/react-reporter-option-names.md`, a patch, names both options and says nothing else a consumer sees changes | closed |
| T-71-18 | Repudiation | spec claiming the compiler enforces resolution timing | medium | mitigate | INV-QD-387 and BEH-QD-695 say no type checks resolution timing and name the run-time tests, which exist verbatim | closed |
| T-71-19 | Tampering | traceability row or revision pointing at nothing | low | mitigate | strict traceability: 4839 relative links resolve, 312 test files exist; INV-QD-387/388 and BEH-QD-691..695 traced | closed |
| T-71-20 | Tampering | mutation drop hidden by re-baselining or broad EXAMINED | medium | mitigate | base json touched once; close re-recorded for all five groups at 43c0b44e after code review; `compare` exit 0; the grown Ignored kinds equal `EXAMINED` exactly, each admitted after a by-hand `ignoreStatic: false` run killed it (`9a480334`, and at 825d2fac for the three the review added: 169/172 killed, the 3 survivors the base's own) | closed |
| T-71-21 | Tampering | forbidden construct, suppression or stray id slipping in | low | mitigate | close scan over the whole phase diff including review commits: 0 casts, `!`, `any`, `switch`, suppressions, placeholder ids or plan/requirement ids | closed |
| T-71-22 | Repudiation | requirements marked complete on a red tree | low | mitigate | SIGR-01..05 marked in `40bc1a9e` after the close and the green `check:pr`, with no code change between; after code review `check:pr` 0 again on 02daf4f9 (17/18, mutation skipped by design), only `.planning` changed since; WX-01..07 still Pending | closed |
| T-71-SC | Tampering | dependency installs (every plan) | low | accept | see AR-71-01 | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-71-01 | T-71-SC | No package is installed, added or upgraded; no `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` changed since `phase_base` | plan-time disposition (71-01..71-08) | 2026-11-22 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **Plan-time checks superseded by code review:** 71-08's close scan required the characterisation touched by exactly one commit and `QadiProvider.tsx` equal to `phase_base`. Review touched the characterisation twice more (layout, helpers, header; no expected value) and changed `QadiProvider.tsx` to read the row's condition through `holdsHere` (behaviour-equivalent: `CONDITIONS.Production` is `!isDevelopment()`). Both were judged against the substance, not the plan-time literal check.
- **Non-durable evidence:** the Stryker by-hand logs and the `check:pr` logs live in the session scratchpad; the durable record is `71-RED-EVIDENCE.md`, the `71-REVIEW-FIX*.md` reports, `71-mutation-close.json` and the passing tests.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-22 | 23 | 23 | 0 | gsd-security-auditor at 823d7c4a (ASVS 1, block on high, register authored at plan time; judged against the post-review code; independent scan run on a scratch project, `compare`, strict traceability, house-style, api-surface, characterisation diff since its first commit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-22
