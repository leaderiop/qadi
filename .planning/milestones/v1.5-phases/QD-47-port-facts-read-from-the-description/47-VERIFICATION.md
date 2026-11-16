---
phase: QD-47-port-facts-read-from-the-description
verified: 2026-11-16T07:30:00Z
status: passed
score: 8/8 must-haves verified
covered_files:
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-01-PLAN.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-01-SUMMARY.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-02-PLAN.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-02-SUMMARY.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-03-PLAN.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-03-SUMMARY.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-04-PLAN.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-04-SUMMARY.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-05-PLAN.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-05-SUMMARY.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-06-PLAN.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-06-SUMMARY.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-07-PLAN.md"
  - ".planning/phases/QD-47-port-facts-read-from-the-description/47-07-SUMMARY.md"
  - "packages/core/src/PortDefault.ts"
  - "packages/core/src/PortDerivation.ts"
  - "packages/core/src/PortDescription.ts"
  - "packages/core/src/Ports.ts"
  - "packages/core/test/PortDefault.test.ts"
  - "packages/core/test/PortDefault.tst.ts"
  - "packages/devtools/src/model/PortCalls.ts"
  - "packages/devtools/src/model/PortReading.ts"
  - "packages/devtools/src/model/Wiring.ts"
  - "packages/devtools/src/react/ServicesPanel.tsx"
  - "packages/devtools/test/model/Capture.test.ts"
  - "packages/devtools/test/model/WiringDefaulted.test.ts"
  - "packages/devtools/test/react/ServicesPanel.reading.test.tsx"
  - "packages/devtools/test/react/ServicesPanel.test.tsx"
covered_digest: "v4:sha256:0360a0ddbab3d47cc440d64f6dd6c060b8ddac710ad1bcf4c182b2beea3f46af"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 47: Port facts read from the description Verification Report

**Phase Goal:** Whether a port's service is its fail-closed default, what that costs, and how a call row reads are facts the port description states once, so devtools no longer parses a display-name convention and a hand-written wrapper can no longer make a fail-closed default look like a real adapter.
**Verified:** 2026-11-16
**Status:** passed
**Re-verification:** No, initial verification (the code-review loop's source changes, commits b1ce4e15..a7d385c2, are included)

## Goal Achievement

### Observable Truths

The five ROADMAP success criteria (the contract), plus the three phase-wide gates.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: whether a service is its port's fail-closed default, through any number of derived wrappers, is a structural fact core exposes, and `isDefaultName` is deleted (PFCT-01) | VERIFIED | `PortDefault.ts` holds a module-private `Symbol("qadi.PortDefault")` key (D-20), `markDefault`, `isMarkedDefault` and `carryDefault`. `nonePort` marks (`PortDerivation.ts:384`). `wrapPort` and `boundedPort` call `carryDefault`. `timingOutPort` and `retryingPort` are built on `wrapPort`, and `PortDoubles.ts:150`'s recording double uses `wrapPort`. `decoratePorts` carries it (`Ports.ts`, D-17). `isPortDefault(d, service)` is exported from `PortDescription.ts`, which the barrel re-exports with `export *`. `/usr/bin/grep isDefaultName\|CONSEQUENCES\|describeOne` over `packages/*/src` hits only a doc comment in `PortReading.ts` that names the old tables. I ran `PortDefault.test.ts`: 46 passed. `PortDefault.tst.ts` passes in the `check:pr` log. The mark is compared to `d.port` (D-02), so a default moved onto another port's service does not read as that port's default. |
| 2 | SC2: a hand-written wrapper whose name does not follow `"<inner> (<suffix>)"`, around a fail-closed default, is reported as defaulted, and the test was RED on the base (PFCT-02) | VERIFIED | `WiringDefaulted.test.ts` has 7 rows (one per port via `forEveryPort`, plus the fresh-object reverse row). It was committed as `eff51e78` with the RED output recorded in 47-01-SUMMARY, before the first `packages/*/src` edit (`368e3a1d`). It passes now: part of the 1163 devtools tests I ran, all green. The spread-wrapper rule (D-04) and its fresh-object limit are pinned. |
| 3 | SC3: each port's consequence sentence and call-row reading are stated once per port in one module keyed by `PortName`; `CONSEQUENCES` and the per-port arms of `describeOne` are gone; `ServicesPanel.tsx` knows no port's span field (PFCT-03) | VERIFIED | `PortReading.ts` exports `PORT_READING: { readonly [K in PortName]: PortReader<K> }`, with a `consequence` and a `describe` for each of five ports, and a generic `describeCall`. `Wiring.ts`'s `portRow` reads `PORT_READING[port].consequence`. `ServicesPanel.tsx` calls only `describeCall` and keeps the `attempts` suffix (D-06). The grep `call\.(attribute\|resolved\|event\|relation\|depth\|meaning\|signerRole\|matched\|scope\|name\|answer\|resourceId)` over `ServicesPanel.tsx` finds nothing. |
| 4 | SC4: `ROWS` is built by one fully type-checked row builder over the registry's descriptions (reworded by D-18), and a throwaway sixth port needs no devtools edit beyond what the compiler asks for (PFCT-04, PFCT-05) | VERIFIED | `PortCalls.ts` has one monomorphic `rowOf(d)`, and `ROWS` is five one-line entries `rowOf(PORTS.X)` with the mapped type `{ [K in PortName]: (span) => PortCallOf<K> }` still checking each entry. `PortCall` is derived: `{ [K in PortName]: PortCallOf<K> }[PortName]`. `tsc -p tsconfig.test.json` is clean. There is no `as`, `!` or `any` in the added source lines (scan below). 47-05-SUMMARY records the scratch sixth port (`Probe6`): the compiler flagged exactly `PortCalls.ts`, `PortReading.ts`, `SimulationFields.ts` and `SimulationSource.ts`, which is the list D-19 accepts. `Wiring.ts` and `ServicesPanel.tsx` were not flagged. It was reverted, and `git status --porcelain -- packages` is empty now. This deliberately differs from the original "built from the registry" wording of D-07, per the user's D-18/D-19. |
| 5 | SC5: rendered output for the five ports is unchanged (characterisation written on the base), and devtools still depends only on `@qadi/core` | VERIFIED | `ServicesPanel.reading.test.tsx` (252 lines, 20 readings and four card rows) was committed as `027bc5a2`, green on the base, before any source edit. It is green now. `Capture.test.ts` gained the captured-default row (`c04552f6`, also before the source edit). No `package.json` changed. `pnpm circular` passed in the `check:pr` log. One deliberate rendering change is recorded and pinned: a defaulted wrapper with no name now reads `defaulted — unnamed` (review WR-01, `ServicesPanel.test.tsx` +22 lines). It follows from reading the fact, not the name, and it does not change the wording for any of the five ports' named readings. |
| 6 | Records (WX-02, WX-03, WX-07): ADR, CCR, BEH/INV and traceability use only the reserved ids; `spec/overview.md` names `isPortDefault`; both changesets exist, with no release | VERIFIED | `BEH-QD-571..575`, `INV-QD-339/340`, `ADR-QD-160` and the `CCR-QD-438` row all exist in `spec/`, and CCR-QD-438 is revised through the review fixes (`spec/README.md` Rev 1.206). `spec/overview.md` Rev 1.114 has an `isPortDefault` row and the `PortReport` row now says it is read from `isPortDefault`. No placeholder ids are in source. `scripts/next-id.mjs` is untouched. `.changeset/port-default-is-a-mark.md` is `@qadi/core` minor, and `.changeset/devtools-defaulted-from-core.md` is `@qadi/devtools` patch. Both match D-14, and both correctly say not Breaking (the export is additive and the mark is invisible to `Object.keys` and JSON). The upgrade guide has the 0.13 entry. No `package.json`, `CHANGELOG`, `scripts/` or `AGENTS.md` change in `9f205122..HEAD`, so no budget moved and nothing was released. `check:pr` steps 8 to 12 (`spec:verify:strict`, `spec:gates`, `spec:claims`, `spec:api`, `spec:package`) all pass. |
| 7 | WX-01, WX-04, WX-06: `check:pr` is green, nothing forbidden was added, and tests precede changes | VERIFIED | The `check:pr` log ends `ran 16 of 17 steps` with exit 0 (mutation skipped by design, run by me below instead). A scan of the `+` lines of `git diff 9f205122..HEAD -- packages/*/src` for `as <Type>`, postfix `!`, `: any`, `switch`, `fnUntraced`, `async`/`await`, `console.`, `process.env`, clock and randomness calls, and `@ts-`/`eslint-disable` returned nothing. Commit order: `57c743ce` (mutation base, alone) is first, `eff51e78` (RED) and `027bc5a2`/`c04552f6` (characterisations) follow, and the first src commit is `368e3a1d`. |
| 8 | WX-05: coverage holds and no touched file's Stryker score falls, with a new file's survivors killed or named | VERIFIED | See the mutation table below. Coverage in the `check:pr` log: all files 99.57 statements, 98.38 branches, and the step passed, so the per-package thresholds hold. |

**Score:** 8/8 truths verified (0 present but behavior-unverified)

### Mutation evidence (WX-05), judged

The rule: a touched file must not fall below its base in `47-mutation-base.json`, and a new file's survivor is killed or named with file:line:col, mutator and why no test can observe it. `47-mutation-after.json` (from 47-07) predates the review fixes, so I used the post-review scores in `47-REVIEW-FIX.md` and `47-REVIEW-FIX.iter2.md`. Source changed after 47-07 in `PortDefault.ts` and `ServicesPanel.tsx` only (`git diff 36af1977 HEAD -- packages`), so the other files' after-scores stand.

| File | Base | Final | Verdict |
|------|------|-------|---------|
| `core/src/PortDerivation.ts` | 0.98 | 0.98 (49/50) | holds; the one survivor (`173:45`, `InvalidBoundedPermits({})`) is the base's own |
| `core/src/PortDescription.ts` | 1 | 1 | holds |
| `core/src/Ports.ts` | 1 | 1 | holds |
| `core/src/PortDoubles.ts` | 1 | 1 (47-07; file not edited since) | holds |
| `devtools/src/model/PortCalls.ts` | 1 | 1 (47-07; not edited since) | holds |
| `devtools/src/model/Wiring.ts` | 1 | 1 (47-07; not edited since) | holds |
| `devtools/src/model/PortReading.ts` | new | 1 | no survivor |
| `core/src/PortDefault.ts` | new | 85.71 | two survivors, both named, see below |
| `devtools/src/react/ServicesPanel.tsx` | not instrumentable | n/a | recorded as `unmeasured` in the base file with the reason |

The two `PortDefault.ts` survivors, which I checked against the file:

- `38:11`, BlockStatement: `defineMark`'s `catch { return false; }` becomes `catch {}`. The empty catch returns `undefined`, which the ternary in `markDefault` treats as falsy, so the same copy branch runs. A test cannot tell the two apart. Equivalent.
- `70:11`, BlockStatement: `ownMark`'s `catch { return undefined; }` becomes `catch {}`. The empty catch returns `undefined` as well. Equivalent.

**Judgement: WX-05 is satisfied.** The 85.71 is not a fall, because the file is new and has no base. Both survivors are named with file:line:col, the mutator and a reason no test can observe them, and the only other mutants in the file are killed, including the `false`-to-`true` mutant in the catch (killed by test M13). PortDefault's behaviour is pinned by 46 tests, among them M9 to M13 for frozen, sealed, proxy-refusing and proxy-throwing results. I read the strict wording ("killed or named") as met, not "100% required".

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/PortDefault.ts` | the mark and its helpers, package-private | VERIFIED | 90 lines. Not in the barrel; only `isPortDefault` in `PortDescription.ts` is exported. Reads own property only, total over any value. |
| `packages/core/src/PortDescription.ts` `isPortDefault` | the one public reader | VERIFIED | `isMarkedDefault(d.port, service)`, in the overview. |
| `packages/devtools/src/model/PortReading.ts` | one reading per port, keyed by `PortName` | VERIFIED | Five rows, wording moved byte-for-byte from the deleted arms, and not in either barrel. |
| `packages/devtools/src/model/PortCalls.ts` | `ROWS` and `PortCall` from the registry | VERIFIED | `rowOf` plus five one-line entries. |
| `packages/devtools/src/model/Wiring.ts` | reads the fact | VERIFIED | `isPortDefault(d, Option.getOrUndefined(shape))`. |
| `packages/devtools/src/react/ServicesPanel.tsx` | no port span fields | VERIFIED | Generic `describe` over `describeCall`. |
| Tests | RED, characterisation, core pins, tstyche | VERIFIED | `WiringDefaulted`, `ServicesPanel.reading`, `Capture`, `PortDefault.test` (46) and `PortDefault.tst`. |
| `47-mutation-base.json` | committed alone first | VERIFIED | `57c743ce` is a one-file commit and the first of the phase. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `nonePort` | `markDefault` | direct call | WIRED | `PortDerivation.ts:384` |
| `wrapPort` / `boundedPort` | `carryDefault` | direct call | WIRED | `retryingPort`, `timingOutPort` and the recording double reach it through `wrapPort`. |
| `decoratePorts` | `carryDefault` | per slot | WIRED | `Ports.ts`; pinned by the `Capture.test.ts` row. |
| `wiringReport` | `isPortDefault` | `forEveryPort` over `serviceOption` | WIRED | `Wiring.ts` |
| `portRow` | `PORT_READING` | `.consequence` | WIRED | `Wiring.ts` |
| `ServicesPanel` | `describeCall` | `describe` | WIRED | `ServicesPanel.tsx` |
| `ROWS` | `rowOf` | five entries | WIRED | `PortCalls.ts` |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| `PortReport.defaulted` | `isDefault` | the live service from `Effect.serviceOption(d.service)`, marked by `nonePort` | yes | FLOWING |
| `PortReport.consequence` | `PORT_READING[port].consequence` | the static reading table | n/a, a constant by design | FLOWING |
| `PortCall` rows | decoded span attributes | `decodePortSpan(d, span.attributes)` | yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| core mark and reader | `pnpm exec vitest run --project core packages/core/test/PortDefault.test.ts` | 46 passed | PASS |
| devtools model and panel | `pnpm exec vitest run --project devtools packages/devtools/test/model packages/devtools/test/react/ServicesPanel` | 1163 passed | PASS |
| type graph | `pnpm exec tsc -p tsconfig.test.json` | exit 0, no output | PASS |
| whole gate | `check:pr` log | 16 of 17 steps, exit 0 | PASS (read from the supplied log, not re-run) |

### Probe Execution

SKIPPED: the phase declares no probe scripts.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PFCT-01 | 47-03, 47-04 | structural defaultedness fact; `isDefaultName` deleted | SATISFIED | Truth 1 |
| PFCT-02 | 47-01, 47-04 | spreading wrapper with another name reads defaulted, RED on base | SATISFIED | Truth 2 |
| PFCT-03 | 47-02, 47-04 | consequence and call-row reading stated once per port | SATISFIED | Truth 3 |
| PFCT-04 | 47-04 | `ROWS` by one fully type-checked builder (D-18 wording) | SATISFIED | Truth 4 |
| PFCT-05 | 47-05 | a sixth port needs only the compiler's list | SATISFIED | Truth 4, 47-05-SUMMARY evidence |
| WX-01 | 47-07 | `check:pr` green | SATISFIED | Truth 7 |
| WX-02 | 47-05, 47-06 | reserved ids only, ADR/CCR/BEH/INV recorded | SATISFIED | Truth 6 |
| WX-03 | 47-03, 47-06 | overview names the new export | SATISFIED | Truth 6, `spec:api` passes |
| WX-04 | 47-07 | nothing forbidden added, budgets unchanged | SATISFIED | Truth 7 |
| WX-05 | 47-01, 47-07 | coverage holds, no mutation score drop | SATISFIED | Truth 8 and the table above |
| WX-06 | 47-01, 47-02 | tests precede changes | SATISFIED | Truth 7 |
| WX-07 | 47-05 | changesets and upgrade guide, nothing released | SATISFIED | Truth 6 |

All twelve IDs from the roadmap appear in the plans' frontmatter and in REQUIREMENTS.md (all `[x]`, traceability "Complete"). No ORPHANED requirement: REQUIREMENTS.md maps no other ID to Phase 47.

### Decisions D-01..D-20

Honored. D-01/D-03 (symbol-keyed, package-private, one reader) and D-02 (mark holds the `PortName`) are in `PortDefault.ts`. D-04 (fresh-object limit) has a test row and is stated in the records. D-05/D-06 (`PortReading.ts`, generic `describe`) are met, and D-07 is superseded by D-18, which `rowOf` implements. D-08 (byte-identical wording) is pinned by the characterisation tests. D-09 to D-12 (RED row, core pins, characterisation, sixth port) are met. D-13 to D-16 (display name kept, changesets, base committed first, records) are met. D-17 (`decoratePorts`) and D-20 (unique `Symbol`) are met.

One refinement beyond the decisions needs naming: the review loop changed `markDefault` to mark an extensible object in place and to copy a non-extensible one with its prototype and descriptors (WR-01 to WR-03, through `defineMark`). BEH-QD-571, ADR-QD-160 and the upgrade entry were updated to say so, and tests M9 to M13 pin it. It sits inside D-01's contract (an own, enumerable, symbol-keyed property) and widens no scope.

### Anti-Patterns Found

None blocking. No `TBD`/`FIXME`/`XXX` markers in the changed source. The two `catch` blocks in `PortDefault.ts` are deliberate (a revoked proxy has no mark to read) and carry a comment where it is not obvious. `return undefined` there is an answer, not a stub.

### Human Verification Required

None. `47-UI-REVIEW.md` covers the one visual question (the `defaulted — unnamed` card text), and a render test pins it.

### Gaps Summary

No gaps. Two things for the orchestrator to know and not to re-open: (1) the SC4 wording was changed by the user's D-18 decision, so "built from the registry's descriptions" is met by a monomorphic helper taking each registry description once, not a single registry-wide loop, which was shown not to type-check without a widened implementation type; (2) PortDefault.ts's 85.71 is below 100 only because of two named, provably equivalent catch-block survivors.

---

_Verified: 2026-11-16_
_Verifier: Claude (gsd-verifier)_
