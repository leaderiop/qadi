---
phase: 22-scoped-port-read
verified: 2026-11-12T01:30:00Z
status: passed
score: 12/12 must-haves verified
covered_files:
  - ".planning/phases/22-scoped-port-read/22-01-PLAN.md"
  - ".planning/phases/22-scoped-port-read/22-01-SUMMARY.md"
  - ".planning/phases/22-scoped-port-read/22-02-PLAN.md"
  - ".planning/phases/22-scoped-port-read/22-02-SUMMARY.md"
  - ".planning/phases/22-scoped-port-read/22-03-PLAN.md"
  - ".planning/phases/22-scoped-port-read/22-03-SUMMARY.md"
  - ".planning/phases/22-scoped-port-read/22-04-PLAN.md"
  - ".planning/phases/22-scoped-port-read/22-04-SUMMARY.md"
  - "packages/core/src/PortAccess.ts"
  - "packages/core/src/PortDescription.ts"
  - "packages/core/src/PortName.ts"
  - "packages/core/src/PortRemote.ts"
  - "packages/core/src/PortServing.ts"
  - "packages/core/src/Predicate.ts"
  - "packages/core/src/ScopedLeaf.ts"
  - "packages/core/src/Walk.ts"
  - "packages/core/test/PortAccess.test.ts"
  - "packages/core/test/PortAccess.tst.ts"
  - "packages/core/test/PortAsks.tst.ts"
  - "packages/core/test/PortRemote.test.ts"
  - "spec/decisions/134-a-resource-scoped-port-read-is-one-read.md"
  - "spec/traceability.md"
covered_digest: "v4:sha256:3ad8f04e137f86c834619dec08fa473f5ff6eab6bd8406dff1f5df40e5d40827"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 12/12
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 22: One scoped port read — Verification Report

**Phase Goal:** The three resource-scoped port reads are one read with one trace shape, every read takes its policy leaf, and the leaf to request mapping is stated once for evaluation and serving.
**Verified:** 2026-11-12 (HEAD of `arch-wave-7`, after Phases 23-29)
**Status:** passed
**Re-verification:** Yes. Previous report: 2026-11-11, `passed`, 12/12, reported `stale` because later phases changed covered files.

## Re-verification note

What changed since the 2026-11-11 report, against phase base `7f64db9a`:

- **Phase 22's own review fixes landed after that report** (commits `23e54421` WR-01, `d4d62133` WR-02, `3371400e` IN-01, `c76c3595` IN-02, `2e4afe54` IN-03, `93f93cff` IN-04, `9e2b90bc` IN-05). They add `packages/core/src/ScopedLeaf.ts` (new), a second law test in `PortAccess.test.ts`, and edit `Walk.ts`, `Predicate.ts`, `DecisionHistory.ts`, `SignatureHistory.ts`, `scripts/check-house-style.mjs` (comment only).
- **Phase 29** (`2bfc6cc1`, `e66748b1`) moved `PortName`, `PortSpanName`, `PortSpanOf` from `PortMetrics.ts` to the new leaf module `PortName.ts`; `PortAccess.ts` now imports `PortName` from there and only the call metrics from `PortMetrics.ts`. No behaviour change; Phase 22 truths do not depend on which file holds the name.
- **Phases 23-28** touched only spec rows (`spec/traceability.md` history, `spec/overview.md`), not Phase 22's source.

File and line drift: `PortAccess.ts` is 517 lines (readScoped :271, readActed :379, askRelationship :436, askSignature :477); `PortRemote.ts` `SERVING_SITE` :180, `askedOf` :192, `servingFor` :224 (were :176/:200/:221); `PortAccess.test.ts` D-07 table :571-684, new law test :686; `PortDescription.ts` `LeafOf`/`ReadSite`/`LeafRequests` :119-141, `asks` :236 (was :235). The old line numbers in the 2026-11-11 report are superseded by these.

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence at HEAD |
| -- | ----- | ------ | ---------------- |
| 1 | ROADMAP SC1: one parameterised test over the three descriptions pins the trace shape for a missing id, and `MissingResourceId.relation` | VERIFIED | `PortAccess.test.ts:571-684` ("a missing resource id still leaves its question on the span (D-07)"): `MISSING: { readonly [K in ScopedPort]: Missing }` is closed over `DecisionHistory`, `RelationshipResolver`, `SignatureHistory`; one `for (const row of Record.values(MISSING))` loop asserts `failure.relation === row.asked` (:660), span list equals `[row.span]`, zero port calls, zero counted calls. `pnpm vitest run --project core`: 62 files, 2084 tests pass. |
| 2 | ROADMAP SC2: `UNTRACED_BUDGET` and `SWITCH_BUDGET` unchanged | VERIFIED | `UNTRACED_BUDGET` is still `Walk.ts: 3` (`evaluateAllOf/AnyOf/Rules`), `SWITCH_BUDGET` still `Walk.ts: 1`, `Matcher.ts: 2`. `git diff 7f64db9a HEAD -- scripts/` is one file, `check-house-style.mjs`, comment lines 445-453 only (IN-02, no value change). `pnpm lint:style`: "457 file(s) clean (3 declared switch(es))". |
| 3 | ROADMAP SC3: span change recorded as public behaviour (BEH-QD-227 amended, BEH-QD-445) | VERIFIED | `spec/behaviors/30-port-calls.md` change history 1.7 amends BEH-QD-227; `## BEH-QD-445` at :145; 5 `BEH-QD-445` hits in `spec/traceability.md`; `.changeset/one-port-read.md` carries a bold "Observable change (not Breaking)" paragraph naming the removed `qadi.requireScopedResourceId` span. `pnpm spec:verify:strict`: 21 pass, 0 fail, 0 skip. |
| 4 | 22-01: `d02_outcome`/`d05_outcome: state-once` recorded; base recorded | VERIFIED | `22-01-SUMMARY.md` unchanged since; `22-base.txt` = `7f64db9a`, which is an ancestor of HEAD. |
| 5 | 22-02: baseline mutation recorded before src change; D-07 table closed over `ScopedPort`; `PortAccess.tst.ts` and `PortAsks.tst.ts` exist and were RED-first | VERIFIED | `22-mutation-base.json` present; RED commits `aa595231`, `78a14584`, `e7c8d96c` precede `7d8bd021` (`git merge-base --is-ancestor aa595231 7d8bd021` true). `tstyche` on `PortAccess.tst.ts`, `PortAsks.tst.ts`, `PortServing.tst.ts`: 3 files, 18 tests, 39 assertions pass. |
| 6 | 22-03: all five descriptions state `asks`; `PortServingFacet` has no `leaves`; `ServedLeaves` gone | VERIFIED | `asks:` at `AttributeResolver.ts:178`, `DecisionHistory.ts:197`, `RelationshipResolver.ts:286`, `CustomPredicate.ts:230`, `SignatureHistory.ts:240`; `PortDescription.asks` :236. `grep ServedLeaves packages/*/src`: none. `PortServing.ts`'s only `leaves` hit is the explanatory comment at :98. |
| 7 | 22-03: `servingFor` derives every served name as `serving.asked(asks[tag](node, SERVING_SITE))`; property test + site-independence law | VERIFIED | `PortRemote.ts:180-200` (`SERVING_SITE`, `askedOf`) and :224-239 (`servingFor` calls `askedOf(d, node._tag, node)`); `PortRemote.test.ts` passes within the core run. |
| 8 | 22-03: every read takes its policy leaf and builds its request through `asks`; `askActed` replaces `askActedAny`/`askActedForResource` | VERIFIED | `PortAccess.ts`: `readAttribute(interpreter, subject, leaf)` :340, `readActed` :379 (`asks[leaf._tag](leaf, {subject, resource})`), `askRelationship` :436, `askCustom` :452, `askSignature` :477. `grep -E "askActedAny\|askActedForResource\|requireResourceId\|requireScopedResourceId" packages/*/src`: none (`makeResourceId` hits are only `packages/audit/src/SignatureLedgerConformance.ts`, unrelated). `PortAccess.tst.ts` pins the loose-string refusal. |
| 9 | 22-03: one plain `readScoped` owns the id test, early annotation, `MissingResourceId`, `readPort`; no `=== "string"`/`makeResourceId` in `PortAccess.ts`; missing id leaves only the port span | VERIFIED | `readScoped` :271-292 is `Effect.gen` (no `Effect.fn`, no span), tests `resourceId === undefined` over the request `asks` built, annotates the question with `scope: "Resource"`, fails `MissingResourceId({ relation })`, else `readPort(d, interpreter, completeRequest[d.port](request, resourceId))`. All three scoped paths go through it (`readActed` :387, `askRelationship` :442, `askSignature` :485). `grep` for `=== "string"` / `makeResourceId` in `PortAccess.ts`: none. |
| 10 | 22-03: `PortAccess.ts`, `Walk.ts`, `Predicate.ts` never read a serving facet; budgets and lint green | VERIFIED | `grep "\.serving"` over the three files: none. `pnpm lint:style` clean. |
| 11 | 22-04: ADR-QD-134, amended ADRs, BEH-QD-445/446, INV-QD-288/289, traceability rows, CCR-QD-412, `spec/overview.md`, AGENTS.md, changesets | VERIFIED | ADR file `134-a-resource-scoped-port-read-is-one-read.md`, `index.yaml:417`; BEH-QD-445 `30-port-calls.md:145`, BEH-QD-446 `34-remote-ports.md:97`; `INV-QD-288` `invariants.md:3486`, INV-QD-289 follows; CCR-QD-412 `spec/README.md:350`; `overview.md:287` lists `LeafRequests`, `ReadSite`, `LeafOf`; `PortName` row at `overview.md:313` now cites `PortName.ts`. `node scripts/check-api-surface.mjs`: 907 exports documented across 9 packages (up from 900 because later phases added exports; no omission). |
| 12 | 22-04: no touched file's Stryker score below base; no budget/threshold edit | VERIFIED (recorded evidence) | `22-mutation-after.json` vs `22-mutation-base.json` unchanged on disk: every touched file at or above base (PortRemote .824 to .837, Walk .943 to .951, PortAccess .976 to 1, others equal or higher). Stryker was not re-run (out of scope); the review-fix pass changed `Walk.ts`, `Predicate.ts`, `DecisionHistory.ts`, `SignatureHistory.ts`, `PortAccess.ts` after that measurement, and `22-REVIEW-FIX.md` records WR-01's law test as mutation-checked, but no post-fix per-file score exists. Not counted as a gap: the gate is `pnpm check`, which the orchestrator reports green at the end of Phase 29. |

**Score:** 12/12 truths verified (0 present, behavior-unverified).

Behavior-dependent truths (missing-id trace shape; served name equals read name; request and route agree on scope) are covered by tests I executed, not by presence: the D-07 table drives a real read under a collecting tracer with scripted ports, the WR-01 law test drives `askActed`/`askSignature` over absent, id-less, non-string and usable resources at both scopes, and the `servingFor` property test runs real `evaluate` over generated policies.

### Review warnings at HEAD

`22-REVIEW.md` frontmatter lists 2 warnings and 5 infos; `22-REVIEW-FIX.md` (iteration 1) says 7 of 7 fixed. Verified against the tree, not the report:

- **WR-01 (INV-QD-288 overclaim for DecisionHistory/SignatureHistory): FIXED at HEAD, and fixed by making it true rather than softening it.** `packages/core/src/ScopedLeaf.ts` (37 lines, package-private, not in the barrel) holds the one `leaf.scope === "Resource"` test as `isResourceScoped` and `scopedResourceIdOf` (which calls it). `SignatureHistory.ts:183` reads the id through `scopedResourceIdOf`; `PortAccess.ts` routes on `isResourceScoped` in `readActed` :386 and `askSignature` :484. Request and route share one test and cannot disagree. Law test `PortAccess.test.ts:686` ("a scoped read reaches its port only with the id its leaf's scope calls for (INV-QD-288)") passes: Resource scope with no usable id fails and the port is never called; Any scope calls with `undefined`; a usable id is passed through. INV-QD-288's Source/Implication/Enforcement text names `scopedResourceIdOf`, the structural-vs-shared-test distinction, and the law test. One residual, noted only: for these two ports the guarantee is still a shared-test discipline rather than a type-level impossibility (their request types keep `resourceId` optional); that is what the invariant now says, so the spec no longer overstates it.
- **WR-02 (traceability row falsely attributed "no `leaves`" to `PortServing.tst.ts`): FIXED at HEAD.** `spec/traceability.md:369` describes only the five-member facet, the closed description, the allowlist word and the mismatched-word refusal; the row contains no `leaves` claim (`sed -n 369p | grep -c leaves` = 0). The only remaining mention of `leaves` with that filename is change-history entry 1.146, which records this very fix.
- **IN-01..IN-05: all FIXED.** IN-01 `Walk.ts:199` `const resourceId = resourceIdOf(resource)` (no `rawId` left); IN-02 `check-house-style.mjs` comment names `askActed`, `readScoped`, no stale helper; IN-03 `Predicate.ts:306,380` use `LeafOf[...]`; IN-04 `PortAccess.ts` header says "is, or wraps, a named `Effect.fn`", `readActed` has its summary; IN-05 `.changeset/one-port-read.md` opens the span-removal paragraph with "**Observable change (not Breaking):**".

The previous report's two advisories (WR-01, WR-02) are therefore resolved and dropped from this report's frontmatter.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `22-01-SUMMARY.md` | recorded answers | VERIFIED | `d05_outcome: state-once` |
| `packages/core/test/PortAccess.test.ts` | closed missing-id table, scope law | VERIFIED | `ScopedPort`, `MISSING`, :686 law test; passes |
| `packages/core/test/PortAccess.tst.ts` | `not.toBeCallableWith` | VERIFIED | tstyche green |
| `packages/core/test/PortAsks.tst.ts` | `toHaveProperty("asks")` | VERIFIED | tstyche green |
| `packages/core/src/PortDescription.ts` | `asks`, `LeafRequests`, `ReadSite`, `LeafOf` | VERIFIED | :119-141, :236 |
| `packages/core/src/PortAccess.ts` | `readScoped`, leaf-taking reads | VERIFIED | read in full |
| `packages/core/src/ScopedLeaf.ts` | one scope test (review fix) | VERIFIED | used by `PortAccess.ts`, `DecisionHistory.ts`, `SignatureHistory.ts` |
| `packages/core/src/PortRemote.ts` | `SERVING_SITE`, derived `servingFor` | VERIFIED | :180-239 |
| `packages/core/src/PortName.ts` | `PortName` home (Phase 29) | VERIFIED | `PortAccess.ts:48` imports from it; `PortName.tst.ts` passes |
| `spec/decisions/134-...md` | ADR-QD-134 | VERIFIED | present, indexed |
| `spec/README.md` | CCR-QD-412 row | VERIFIED | :350 |
| `spec/overview.md` | `LeafRequests`, `ReadSite`, `LeafOf` | VERIFIED | :287 |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `PortRemote.ts` | each port's `asks` | `d.asks[tag](...)`, `d.serving.asked(...)` in `askedOf` | WIRED |
| `PortAccess.ts` | each port's `asks` | `<port>Port.asks.<Tag>(leaf, { subject, resource })` in all five reads | WIRED |
| `DecisionHistory.ts`/`SignatureHistory.ts` `asks` | `ScopedLeaf.ts` | `scopedResourceIdOf`, same test the reads route on | WIRED |
| `Walk.ts` | `PortAccess.ts` | port arms pass the leaf and resource (typecheck + Evaluate tests green) | WIRED |
| `30-port-calls.md` BEH-QD-445 | `PortAccess.test.ts` | traceability rows | WIRED |
| `34-remote-ports.md` BEH-QD-446 | `PortRemote.test.ts` | traceability rows | WIRED |

### Data-Flow Trace (Level 4)

Not applicable (library code, no rendered dynamic data). The served-name path was traced: leaf node to `asks[tag]` at `SERVING_SITE` to `serving.asked` to `declare`, with the property test confirming every question `evaluate` asks is admitted.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Core suite incl. D-07 table, WR-01 law, served/local equality, `servingFor` property | `pnpm vitest run --project core` | 62 files, 2084 tests pass | PASS |
| Type-level refusals, `asks` presence, facet shape, `PortName` | `pnpm exec tstyche` on `PortAccess.tst.ts`, `PortAsks.tst.ts`, `PortServing.tst.ts`, `PortName.tst.ts` | 4 files pass | PASS |
| Typecheck | `pnpm typecheck` (`tsc -b` + `tsc -p tsconfig.test.json`) | no errors | PASS |
| House style, budgets | `pnpm lint:style` | 457 files clean, 3 declared switches | PASS |
| Spec gates | `pnpm spec:verify:strict` | PASS 21 / FAIL 0 / SKIP 0 | PASS |
| API surface (gate 13) | `node scripts/check-api-surface.mjs` | 907 exports documented | PASS |
| Whole workspace tests, tstyche | orchestrator-reported | 177 files / 4596 tests; 233 tstyche; `check:pr` exit 0 at end of Phase 29 | PASS (not re-run by me) |

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh` scripts.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| SCOPE-01 | 22-03 | SATISFIED | one `readScoped` owns annotation, id test, `MissingResourceId`, `readPort`; three reads use it |
| SCOPE-02 | 22-01..04 | SATISFIED | D-07 table, shape A on all three ports, passes at HEAD |
| SCOPE-03 | 22-02, 22-03 | SATISFIED | reads take the leaf; `PortAccess.tst.ts` refuses transposed strings |
| SCOPE-04 | 22-01..04 | SATISFIED | `asks` drives reads and `servingFor`; `ServedLeaves` gone; property test retained |
| SCOPE-05 | 22-03, 22-04 | SATISFIED | BEH-QD-227/445, INV-QD-288, ADR-QD-134, changeset; budgets unchanged |
| WX-01 | 22-04 | SATISFIED | gates re-run here pass; `check:pr` exit 0 reported at end of Phase 29 |
| WX-02 | 22-04 | SATISFIED | ADR-QD-134, CCR-QD-412, BEH/INV/traceability, reserved numbers only |
| WX-03 | 22-04 | SATISFIED | gate 13 green; overview names `LeafRequests`, `ReadSite`, `LeafOf` |
| WX-04 | 22-03, 22-04 | SATISFIED | no budget value changed; lint clean; no new `switch`/`fnUntraced` (`readScoped` is `Effect.gen`) |
| WX-05 | 22-02, 22-04 | SATISFIED | recorded after >= base for all touched files; not re-measured after review fixes (see truth 12) |
| WX-06 | 22-02 | SATISFIED | RED commits precede `7d8bd021` |

Orphaned requirements: none. `.planning/REQUIREMENTS.md` traceability rows (217, 225) read `Pending` while the checkboxes at 150-154 and 199-204 are `[x]`; this is the expected phase-close bookkeeping for the orchestrator, not a code gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `packages/core/src/PortServing.ts` | 98 | word "leaves" in a comment | Info | explains the member's removal; not a stub |
| `packages/core/src/PortServing.ts` | 48 | `"own-records"` literal | Info | the opt-in declaration's value, not a served-name pseudo-name |
| `packages/core/src/PortAccess.ts` | 174-175 | doc line over ~90 columns | Info | pre-existing wrap drift, noted by the fixer; cosmetic |

No `TBD`/`FIXME`/`XXX` markers in the phase's source files (grep over `PortAccess`, `ScopedLeaf`, `PortRemote`, `PortServing`, `Predicate`, `Walk`, `PortDescription`: none).

### Human Verification Required

None.

### Gaps Summary

No gaps. All three ROADMAP success criteria and every PLAN must-have hold at HEAD of `arch-wave-7`. Later phases' changes (the `PortName.ts` extraction, spec history rows) did not disturb Phase 22's code, and the review-fix commits that postdate the first report strengthened it (WR-01 made structural for the shared scope test, WR-02 corrected). The only thing not re-measured is the post-review-fix per-file Stryker score, which is outside this re-verification's scope and is covered by the end-of-phase `pnpm check` gate.

---

_Verified: 2026-11-12_
_Verifier: Claude (gsd-verifier)_

## Orchestrator addendum (2026-11-12): post-review-fix mutation re-measure

The "Not checked" Stryker gap above is closed. A core Stryker run at HEAD d37a4355 over Phase 21's and 22's baselined files plus `ScopedLeaf.ts` found one drop: `SignatureHistory.ts` 0.9583 against this phase's base 0.9600 (its refusal branch had no test). 80fc5b5f added a test (an unkeyable fixture entry fails every read with `SignatureHistoryUnavailable`, never an empty list); a fresh run scored it 0.9861 (71/72, the survivor is equivalent). Every file is now at or above its base: `22-mutation-recheck.json`. The same test exposed a pre-existing gap, recorded for the milestone audit: an *untyped query* with an unkeyable subject dies (the error's schema rejects the symbol `subjectId`) instead of failing typed — still fail-closed, fixture-only, untouched here.
