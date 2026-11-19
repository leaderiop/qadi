---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
verified: 2026-11-19T01:40:00Z
status: passed
score: 6/6 must-haves verified
covered_files: [".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-01-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-01-SUMMARY.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-02-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-02-SUMMARY.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-03-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-03-SUMMARY.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-04-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-04-SUMMARY.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-05-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-05-SUMMARY.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-06-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-06-SUMMARY.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-07-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-07-SUMMARY.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-08-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-08-SUMMARY.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-09-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-09-SUMMARY.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-10-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-10-SUMMARY.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-11-PLAN.md",".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-11-SUMMARY.md","packages/audit/src/AuditArchive.ts","packages/audit/src/AuditEntry.ts","packages/core/src/EnvelopeKeys.ts","packages/core/src/SinkCodec.ts","packages/core/src/UntrustedDecode.ts","packages/react/src/HydrationEngine.ts"]
covered_digest: "v4:sha256:2a2c1c78da78c483be7e5f3824003f1db33e0a7f4c8dfce1c3b7e78ae7e2a0f4"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 57: untrustedDecoder states the envelope unknown-key policy Verification Report

**Phase Goal:** `untrustedDecoder` takes an envelope unknown top-level key policy as one stated option: refuse, or ignore without walking. Both SinkCodec envelopes stop building the rule by hand, and the five modules that wrap an envelope state the same policy the same way.
**Verified:** 2026-11-19
**Status:** passed
**Re-verification:** No, initial verification

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One closed option states the policy (KEYP-02) | VERIFIED | UntrustedDecode.ts: required `unknownKeys: UnknownKeyPolicy` ("refuse" | "ignore"), read through an own-key PROJECTION table; unknown value throws at build. Exported via the barrel and listed in spec/overview.md. |
| 2 | ignore never reads, guards or decodes an undeclared key; declared keys derived from the schema, not hand-written (KEYP-02, D-03, D-19, D-21) | VERIFIED | EnvelopeKeys.ts derives keys from SchemaAST.toEncoded through a hoisted Match over Objects/Union/Suspend; projection runs before guard and prepare. Open (index signature/rest) schemas throw at build. |
| 3 | Both SinkCodec envelopes decode through untrustedDecoder; ownValue, envelopeOf, hand-rolled stored reader deleted; budget and AGENTS.md 7a move together (KEYP-03) | VERIFIED | SinkCodec.ts: sinkWire and storedWire both use untrustedDecoder with unknownKeys "ignore"; grep finds no ownValue/envelopeOf/Object.hasOwn/JSON.parse token left. UNTRUSTED_DECODE_BUDGET SinkCodec.ts = 1 and AGENTS.md 7a row = 1; house-style gate clean. |
| 4 | Audit row, archive and hydration state their policy through the same option (KEYP-04) | VERIFIED | AuditEntry.ts:117, AuditArchive.ts:258, HydrationEngine.ts:164/193/209 all state unknownKeys "refuse" with their unwalked. Every other untrustedDecoder call site (Policy, PortWireEncode, PortRemote, bench) states it too (D-16). |
| 5 | The UntrustedSeams matrix runs per policy in core, audit, react; answers unchanged except D-01/D-17/D-18/D-20, each with a RED test first (KEYP-05, KEYP-01, WX-06) | VERIFIED | Per-policy describes in all three UntrustedSeams.test.ts; RED commits c0de5d80, bcadf99a precede src commit 9d109bab; vitest core 281, audit 47, react 25, devtools Source 44 pass. |
| 6 | Owner decision recorded (KEYP-01) | VERIFIED | ADR-QD-170 present, with CCR-QD-448, BEH-QD-621..625, INV-QD-359..360 each found in spec/; changesets core (minor, Breaking noted), audit (patch), devtools; upgrading.md carries the migration. |

**Score:** 6/6

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| House style | node scripts/check-house-style.mjs | 556 files clean | PASS |
| Core matrix and decoder | vitest --project core (UntrustedDecode, UntrustedSeams, SinkCodec) | 281 passed | PASS |
| Audit / react / devtools seams | vitest --project audit / react / devtools | 47 / 25 / 44 passed | PASS |
| WX-05 | 57-mutation.mjs compare 57-mutation-static.json (run from repo root) | WX-05 holds (D-12); no survivor added; EnvelopeKeys 58/58 | PASS |

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| KEYP-01 | SATISFIED | D-01 in ADR-QD-170; deep unknown record key now decodes (R-rows green, RED first) |
| KEYP-02 | SATISFIED | Truths 1-2 |
| KEYP-03 | SATISFIED | Truth 3 |
| KEYP-04 | SATISFIED | Truth 4 |
| KEYP-05 | SATISFIED | Truth 5 |
| WX-01 | SATISFIED (share) | check:pr exit 0 reported by 57-11 and the fixer; not re-run here (house-style and targeted vitest re-run green) |
| WX-02 | SATISFIED (share) | ADR-170, CCR-448, BEH-621..625, INV-359/360 all present |
| WX-03 | SATISFIED (share) | UnknownKeyPolicy in barrel and spec/overview.md |
| WX-04 | SATISFIED (share) | No new as/any/switch/fnUntraced/async/console in the src diff (only `as const`); budgets and AGENTS.md table agree |
| WX-05 | SATISFIED (share) | compare prints WX-05 holds (D-12) |
| WX-06 | SATISFIED (share) | RED-first commit order for D-01, D-17, D-18, D-20 |
| WX-07 | SATISFIED (share) | Core changeset marked Breaking and mirrored in upgrading.md; nothing released |

All 12 IDs are accounted for; WX-01..07 stay Pending in REQUIREMENTS.md by design. KEYP-01..05 are [x] and Complete. No orphaned requirements.

## Anti-Patterns Found

None blocking. No TBD/FIXME/XXX introduced.

## Notes (not gaps)

- 57-scan.mjs, run now, exits 1 with "57-mutation-after.json does not follow the last commit touching src, tests or bench". This is a stale close-time check: its rule looks for a chore(57-07) commit after the last src commit, but the review fixes (4daeb9d2..0b628571) touched src after 57-07 and redid the evidence as chore(57) in 43a65fd2, which is after them. The ordering the rule protects holds. The scan has not been updated for the review round.
- Review IN-01 (project doc says it reads no value; Object.entries invokes getters) is knowingly left; harmless for parsed JSON.
- Deferred to the owner: whether the hydration payload should be ignore (D-09 report).

## Human Verification Required

None.

---

_Verified: 2026-11-19_
_Verifier: Claude (gsd-verifier)_
