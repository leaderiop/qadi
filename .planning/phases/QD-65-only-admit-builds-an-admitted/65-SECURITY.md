---
phase: "65"
slug: "only-admit-builds-an-admitted"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-20"
---

# Phase 65 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase changes one package-private module, `packages/core/src/Admission.ts`. `Admitted` gains a private constructor and a declared private `nominal` member. `admit` becomes its static method, and the `"asked"` row's supplied flags are read from the one matcher context `admit` builds. The phase also adds two test files' worth of pins and cases, and the spec records. It adds no network, auth, file-access or schema surface, and no export (939 before and after). Its threats are a construction path that skips the depth gate, a question that answers differently on a second read, and records or gates that claim more than the code holds.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| caller → `admit` | `Walk.ts` (`"asked"`) and `Predicate.ts` (`"row"`) hand `admit` a caller-built `Question` | the policy, subject, resource and action; the depth bound |
| `Admitted` → walk | holding an `Admitted` is what lets the walk run on a policy | the admitted policy, the supplied flags, the matcher context |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-65-01 | Repudiation | a RED pin or case failing for another reason | medium | mitigate | `65-RED-EVIDENCE.md` records, on `phase_base` d1ac1df0: both tstyche passes `2 failed, 4 passed` on unused directives (ts2578); `pnpm typecheck` exactly two TS2578 in `WalkEnvironment.tst.ts`; `pin-codes.mjs` reads nothing; E7–E9 fail `expected undefined to equal`, E10 green | closed |
| T-65-02 | Tampering | a base mutation record from a stale or wrong report | medium | mitigate | `65-mutation-base.json` `head` = d1ac1df0…; committed by 9cc5b766, its only commit, before any test edit | closed |
| T-65-03 | Denial of service | Stryker beside vitest or after a red test | low | mitigate | 65-01 ran Stryker in Task 1 (9cc5b766) before Task 2 added the pins (5c71ddea); no concurrent run | closed |
| T-65-04 | Elevation of privilege | a construction path that skips the depth gate | high | mitigate | `Admission.ts:93` `declare private readonly nominal: never`, `:95` `private constructor(`, `:111` `static admit`, `:138` `export const admit = Admitted.admit`; both pins green (TS2673, TS2741 by `pin-codes.mjs`); each half shown necessary (public constructor → TS2741 only, no member → TS2673 only). Type-level only: at run time `Admitted` is an ordinary class (flagged in 65-06-SUMMARY) | closed |
| T-65-05 | Denial of service | `admit` called detached with a `this` in its body | medium | mitigate | zero `this` in `Admission.ts` code (comments stripped); `Walk.ts:878` and `Predicate.ts:664` call `admit` detached and the core suite (2653) passes | closed |
| T-65-06 | Tampering | resource or action answering differently on a second read | medium | mitigate | `question.resource` and `question.action` are each read once (`Admission.ts:121-122`) into the context, and `SUPPLIED[rowSource](context)` (`:129`) reads only it; E7–E10 pin it; the derive variants fail E8,E9 (action) and E7,E10 (resource). `policy`, `maxDepth` and `subject` are still read more than once: out of scope, flagged, and no text claims otherwise (review WR-01 fixed) | closed |
| T-65-07 | Elevation of privilege | the `"row"` row deriving its resource from an empty context | medium | mitigate | `Admission.ts:70` keeps `resource: true`; the table stays checked against `SuppliedBy` | closed |
| T-65-08 | Repudiation | a bench of a tree other than the committed source | medium | mitigate | `65-BENCH.md` records the measured head 6843e25e and the harness hashes; the only `packages/*/src` commits after the bench commit 6c4be029 are a23dacf1 and c0be0db8, proved comment-only (token-identical by the fixer, comment-stripped diff empty by the verifier) | closed |
| T-65-09 | Tampering | re-running the bench until a pass | medium | mitigate | one run of record (19:48:17–19:53:00), `# gate: pass`, 35 workloads, `# slower: 0`; all run files committed in 6c4be029 | closed |
| T-65-10 | Repudiation | a text claiming the compiler holds the `"asked"` flags | medium | mitigate | INV-QD-376 (`spec/invariants.md:4327`) says "The compiler does not check this"; no "compile-time guarantee" in `invariants.md` | closed |
| T-65-11 | Tampering | an id outside the reservation | low | mitigate | only ARCH-112, CCR-QD-456, BEH-QD-661/662 and INV-QD-375/376 used, and ADR-QD-172 amended; ADR-QD-178 and BEH-QD-663–665 appear only in the CCR-QD-456 row (`spec/README.md:393`); no `spec/decisions/178-*`; `next-id.mjs` never run | closed |
| T-65-12 | Repudiation | requirements ticked on evidence from another tree | medium | mitigate | ADMT-01..04 ticked in 0e4a1d7a after `check:pr` exit 0 on ef97dc58; after the review fixes `check:pr` re-ran green on cc7fdc37; b56f32c0 changes one Markdown row; all seven WX rows Pending (phase.complete's ticks reverted) | closed |
| T-65-13 | Tampering | a mutation drop hidden by re-baselining, or a release slipped in | medium | mitigate | base record untouched since 9cc5b766; close compare `65-mutation-close.json`: Admission.ts 18/18 → 20/20, Predicate.ts 280/280 and Walk.ts 260/273 unchanged; no changeset added, no tag contains d1ac1df0, no version/release/publish commit in `d1ac1df0..HEAD`, `arch-wave-12` has no upstream | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-65-01 | T-65-SC | No dependency is installed, upgraded or removed in this phase, so there is no supply-chain surface to audit | plan-time disposition (65-01..65-06) | 2026-11-20 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **Review IN-02:** the constructor pin's positive control repeats an earlier line and does not exercise `new Admitted(...)`'s arguments. Only `pin-codes.mjs` reads the code TS2673.
- **Review IN-03:** `pin-codes.mjs` hard-codes the `typescript@6.0.3` path and prints nothing when it finds nothing.
- **Verifier info:** the INV-QD-364 trace row (`spec/traceability.md:196`) is less precise than the invariant itself.
- **Out of scope:** `admit`'s second reads of `policy`, `maxDepth` and `subject`, flagged under ADMT-03.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-20 | 14 | 14 | 0 | orchestrator, L1 grep verification (ASVS 1, register authored at plan time, auditor skipped by rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-20
