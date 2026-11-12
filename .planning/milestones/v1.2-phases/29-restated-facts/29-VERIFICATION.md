---
phase: 29-restated-facts
verified: 2026-11-12T00:30:00Z
status: passed
score: 3/3 roadmap criteria verified (13/13 checks incl. records, requirements, mutation)
covered_files:
  - ".planning/phases/29-restated-facts/29-01-PLAN.md"
  - ".planning/phases/29-restated-facts/29-01-SUMMARY.md"
  - ".planning/phases/29-restated-facts/29-02-PLAN.md"
  - ".planning/phases/29-restated-facts/29-02-SUMMARY.md"
  - ".planning/phases/29-restated-facts/29-03-PLAN.md"
  - ".planning/phases/29-restated-facts/29-03-SUMMARY.md"
  - "packages/core/src/PortDescription.ts"
  - "packages/core/src/PortMetrics.ts"
  - "packages/core/src/PortName.ts"
  - "packages/core/test/PortName.tst.ts"
  - "packages/devtools/src/model/Verdict.ts"
  - "packages/devtools/src/react/Inspector.tsx"
  - "packages/devtools/src/react/Simulator.tsx"
  - "packages/react/src/HydrationEngine.ts"
covered_digest: "v4:sha256:273f85ab0c636ff7e1c5b0a506c7330f4311e870c84f2bb078ebb600ad38c9f9"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 29: Restated facts Verification Report

**Phase Goal:** The three footnoted facts are each stated once.
**Verified:** 2026-11-12
**Status:** passed
**Re-verification:** No, initial verification (base `50c7292d`)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `PortName.ts` holds one five-row table; `PortDescription.span` is `PortSpanOf<N>` | VERIFIED | `packages/core/src/PortName.ts`: no `import` lines, a module-private `interface PortSpans` with five rows, `PortName = keyof PortSpans`, `PortSpanOf<N> = PortSpans[N]`, `PortSpanName = PortSpans[PortName]`. `PortDescription.ts` now has `readonly span: PortSpanOf<N>`. `29-01-SUMMARY.md` frontmatter has `d02_fallback: no`. `PortName.tst.ts` passes (3 tests, 6 assertions) and its last test asserts `{ span: "qadi.acted" }` is not assignable to `attributeResolverPort`'s span, so a wrong span is rejected. |
| 2 | `HydrationEngine.ts` withheld fields are one constant per entry kind | VERIFIED | `ALLOW_WITHHELD = ["subjectId","trace"] as const` and `DENY_WITHHELD = ["subjectId","trace","obligations","reason"] as const` at lines 90 and 96. Both are read by `AllowEntry`/`DenyEntry` and by `dehydrateDecision` (four use sites). `grep '"subjectId", "trace"'` finds only the two definitions. The values equal the removed inline lists in the 50c7292d diff. |
| 3 | One `FAILURE_IS_NOT_A_DENIAL` constant serves the Inspector and the Simulator; literal test assertions unedited | VERIFIED | Defined in `packages/devtools/src/model/Verdict.ts:31`. `Inspector.tsx:177` and `Simulator.tsx:444` render `{FAILURE_IS_NOT_A_DENIAL}`. The string "depended on failed" appears in one file only. The name is absent from devtools' barrels (three hits, all inside `src/model/Verdict.ts` and the two panels). `git diff 50c7292d -- packages/devtools/test` is empty. |

**Score:** 3/3 roadmap truths verified.

### Required Artifacts and Wiring

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/PortName.ts` | VERIFIED | Leaf, exported from `index.ts` via `export * from "./PortName.ts"`. 22 imports of it across core src/tests. |
| `packages/core/src/PortMetrics.ts` | VERIFIED | Declares neither union (diff shows both removed). It imports `type { PortName }` from the leaf. No `PortName`/`PortSpanName` is imported from `PortMetrics.ts` anywhere (every remaining `PortMetrics.ts` import in packages is a metric const). No metric id, description or type line changed (only the `PORT_NAMES_BY_NAME` doc comment). |
| Port modules | VERIFIED | `PortAccess`, `PortDerivation`, `PortDescription`, `PortDoubles`, `PortRemote`, `PortServing`, `Ports` and nine test files re-pointed; `pnpm typecheck` clean. |
| `packages/core/test/PortName.tst.ts` | VERIFIED | Run under tstyche, green. |
| `HydrationEngine.ts` constants | VERIFIED | See truth 2. |
| `Verdict.ts` constant | VERIFIED | See truth 3. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| core, react, devtools suites | `pnpm vitest run --project core --project react --project devtools` | 133 files, 3723 tests passed | PASS |
| Type pins | `pnpm exec tstyche packages/core/test/PortName.tst.ts` | 3 passed, 6 assertions | PASS |
| Typecheck | `pnpm typecheck` | no output, no errors | PASS |
| Cycles | `pnpm circular` | no circular dependency | PASS |
| Public surface | `pnpm spec:api` | 907 exports documented, gate passes | PASS |
| Revision seam | `node scripts/spec-revise.mjs --check` | every Revision matches its newest Change History entry | PASS |

### D-04 decode-guard claim (checked, not trusted)

`packages/react/test/HydrationPayload.test.ts:231` `it.each(policies)("%s survives dehydrate, JSON and hydrate")` loops `includeTrace` over `[false, true]`, runs `dehydrateDecisions`, JSON-round-trips, and hydrates through `seedWindow`. The policy list includes allow (`HasPermission`, `AllOf`, `Labeled`, `Obliged`) and deny (`HasRole (denied)`, `Not`) cases. The hydrate decode in `HydrationEngine.ts` uses `UNTRUSTED_DECODE_OPTIONS` for `decodeEnvelope` and `decodeEntry` (`onExcessProperty: "error"`). So a mismatch between the withheld list and the schema would surface as a refused entry. The claim holds, and D-04's "if no existing test" condition was correctly not triggered. 29-03 also added one separate test in `HydrationEngine.test.ts` (a nameless payload carrying entries is refused whole), which is a mutation-score kill, not a gate edit.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| TIDY-01 | SATISFIED | Truth 1. The "derive from descriptions if the compiler allows" clause was weighed and rejected in D-02 and recorded in the ADR-QD-094 amendment (the inverse derivation, one table, is stronger). |
| TIDY-02 | SATISFIED | Truth 2. |
| TIDY-03 | SATISFIED | Truth 3. |
| WX-01 | SATISFIED | The orchestrator ran `pnpm check:pr` (exit 0, mutation skipped by design). I did not re-run it, as instructed; my targeted checks agree. |
| WX-02 | SATISFIED | CCR-QD-419 row (`spec/README.md:357`, Rev 1.156); ADR-QD-094 Rev 1.11 amendment; ADR-QD-123 Rev 1.1 amendment (live line corrected, WR-01); `PortName.tst.ts` row in `spec/traceability.md` Rev 1.153. ADR-QD-141, BEH-QD-480..484 and INV-QD-302..303 are used nowhere outside the CCR row's own prose. |
| WX-03 | SATISFIED | `spec/overview.md` Rev 1.95 splits the row into `PortName`, `PortSpanName`, `PortSpanOf` (`PortName.ts`) and `PredicatePortName` (`PortMetrics.ts`). The `index.ts` diff is one `export *` line, so only `PortSpanOf` is new. `pnpm spec:api` passes. |
| WX-04 | SATISFIED | A scan of added package lines for `as` (other than `as const`), `any`, `switch`, `fnUntraced`, `console`, `async` and debt markers found only doc-comment prose. |
| WX-05 | SATISFIED | `dd158b25` is the phase's first `(29-0` commit and adds only `29-mutation-base.json`. All twelve files in `29-mutation-after.json` are at or above base. Eleven are equal; `HydrationEngine.ts` rose 0.9619 to 0.9693. |
| WX-06 | SATISFIED | No defect fixed (D-01); the existing pins stay green. Nothing to take RED. |

No orphaned requirements.

### Other Checks

- Changesets: `port-name-leaf.md` is `@qadi/core` minor, `hydration-withheld-fields.md` is `@qadi/react` patch, `failure-sentence-constant.md` is `@qadi/devtools` patch.
- No gate, threshold, budget, script, Stryker, vitest, oxlint, tsconfig, package.json or workflow file differs from 50c7292d. `git diff 50c7292d --name-only` outside `.planning/`, `packages/`, `spec/`, `.changeset/` is empty.

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX/TODO in the added lines; no new `as`, `any`, `switch`, `fnUntraced`, `async`, `console`.

### Human Verification Required

None.

### Gaps Summary

No gaps. Notes only:
- Review iteration 2 left IN-01..03 open as info (per the orchestrator); not blockers.
- `astro check` prompts to install `@astrojs/check` when stdin is closed. This predates the phase and is out of scope.
- The `PortName.tst.ts` negative check uses `not.toBeAssignableTo` against `attributeResolverPort`'s span rather than a deliberate compile error, because `tsconfig.test.json` compiles every `*.tst.ts`. This is sound; it fails if `span` reverts to the whole union.

---

_Verified: 2026-11-12_
_Verifier: Claude (gsd-verifier)_
