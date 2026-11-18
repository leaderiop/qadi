---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
reviewed: 2026-11-18T20:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - packages/devtools/src/model/PortCards.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/Wiring.ts
  - packages/devtools/src/react/ServicesPanel.tsx
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/test/model/PortCards.test.ts
  - packages/devtools/test/model/PortCards.tst.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/Wiring.test.ts
  - packages/devtools/test/react/ServicesPanel.characterisation.test.tsx
  - packages/devtools/test/react/ServicesPanel.test.tsx
  - packages/devtools/test/react/ServicesPanel.reading.test.tsx
  - packages/devtools/test/react/servicesInput.ts
  - features/features/devtools-screens/devtools-screens.steps.test.ts
  - .changeset/devtools-port-activity-is-a-port-name.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - spec/decisions/168-a-port-card-is-a-model-row.md
  - spec/decisions/047-a-headless-devtools-model.md
  - spec/decisions/index.yaml
  - spec/behaviors/28-devtools-screens.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
  necessity: 0
status: issues_found
---

# Phase 55: Code Review Report (iteration 2)

**Reviewed:** 2026-11-18
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Iteration 1's WR-01 is fixed and its replacement pins are sound and complete. I found no new Critical or Warning issue. IN-01..03 from iteration 1 still apply and are carried forward unchanged, since they were out of fix scope.

**WR-01 replacement pins (`PortCards.tst.ts:32-42`).** I read the file at HEAD and ran `pnpm exec tstyche packages/devtools/test/model/PortCards.tst.ts`: 3 tests, 11 assertions, passed.

- **`keyof ActivityByPort` and `keyof CallsByPort` `toBe<PortName>`.** These fix the key set exactly. An extra misspelt key or a missing port makes `keyof` differ from `PortName`.
- **`not.toHaveProperty("AttributeResolvr")` and `not.toHaveProperty("SignatureHistry")`.** These are sound negatives. They fail if the record gains the misspelt key, and they pass on the real record. The fixer's scratch run shows the failing direction.
- **`not.toBeAssignableFrom<Partial<…>>`.** This is sound. A record with an optional key is not assignable to one with a required key, with or without `exactOptionalPropertyTypes`. It covers the one property `keyof` cannot see, optionality, and it states it by name. `CallsByPort`'s value is `ReadonlyArray<PortCall>`, which excludes `undefined`, so its `Partial` case fails on the optional `undefined` as well.
- **Redundancy.** `keyof` plus the `Partial` pin cover the key set and required-ness. The `toHaveProperty` pins add readability, not coverage, and they are harmless.
- **`PortActivity["port"]` `toBe<PortName>` with the two `not.toBeAssignableFrom` cases.** Unchanged and sound. Every other field is present in both sources, so the `port` field alone decides the result.
- **What the pins do not cover.** The value types of the two records, `PortActivity | undefined` and `ReadonlyArray<PortCall>`, are not pinned. The test title and INV-QD-355 do not claim them, and `PortCards.ts` and its behavioural tests catch a widened value. This is not a gap against the stated claim.

**Rest of the phase.** I re-read the changes against base `0c349d6f` and found nothing the first pass missed.

- **`portActivity` (`Wiring.ts:199-213`).** It now emits one entry per registry port in registry order. The old code emitted insertion order and passed through words outside the registry. The doc comment and the changeset both state this, and the panel took the first entry per port, so rendering is unaffected.
- **`reservice` (`DockModel.ts:253-271`).** It compares the four inputs by identity. Its subscription is registered after `rejoin` and before any host listener, so the join and the cards move first. The initial store value is built from the same `servicesKeyNow`, so there is no window where the view is stale.
- **`DevtoolsDock.tsx`.** The panel now takes `model.services`, and no other caller of `ServicesPanel` or `PortActivity` exists outside `packages/devtools`, the spec and the changesets. `spec/overview.md` lists `PortActivity` by what it carries, not its `port` type, so no claim in it is false.
- **Tests.** `vitest --project devtools packages/devtools/test/model packages/devtools/test/react/ServicesPanel` gave 1259 passed in 42 files.

## Info

### IN-01: `ServicesPanel.reading.test.tsx` header still says the file "stays unchanged"

**File:** `packages/devtools/test/react/ServicesPanel.reading.test.tsx:7-12`
**Issue:**
- The pre-existing paragraph says the file "names nothing the base lacks, so it stays unchanged through the move".
- The next paragraph, added in this phase, says the call readings and real-report cases moved to `PortCards.test.ts` in ARCH-102, and only the consequence table stays.
- Both are in one doc comment and contradict each other. The file did change; only `ServicesPanel.characterisation.test.tsx` is the never-edited pin.

**Fix:** reword the first paragraph in the past tense, or drop "so it stays unchanged through the move".

### IN-02: M54's title and BEH-QD-615's "notifies twice" claim exceed what is asserted

**File:** `packages/devtools/test/model/DockModel.test.ts:1844-1870` and `spec/behaviors/28-devtools-screens.md` (BEH-QD-615, line 2219)
**Issue:**
- The M54 title ends "(… and Off to Live)" under "keeps the services view". For Off to Live the test says the reference moves, and it asserts only `deepStrictEqual(off.services.getSnapshot(), offView)`.
- That assertion also passes if `reservice` never ran, so the Off-to-Live half pins nothing about recomputation.
- The spec says "the store notifies twice and ends on a new, structurally equal view". The test counts no notifications and does not check that the reference changed.
- This is the accepted M54 deviation, so no code change is needed. The title and the "twice" claim are what a future reader will trust.

**Fix:**
- Retitle: "a status change that leaves the sampled flag alone keeps the services view (Live to a Stopped that had sampled); Off to Live passes through Starting and ends on an equal view".
- Add `heardOf(off)` with `assert.strictEqual(heard.calls, 2)` and `assert.notStrictEqual(off.services.getSnapshot(), offView)`, or drop "twice" from the BEH text.

### IN-03: `reservice` runs `portCards` unguarded inside an unguarded listener loop

**File:** `packages/devtools/src/model/DockModel.ts:245-271`
**Issue:**
- The comment says "no host code is read, so nothing here is guarded". The inputs are host-supplied data: `inputs.reading` is merged into `shownReading`.
- `portCards` can throw on a malformed value, for example a non-number `durationMillis` reaching `toFixed(1)` in a reading rebuilt from JSON. The types forbid it.
- `makeExternalStore`'s `notify` has no try/catch. A throw in `reservice` would skip the React subscription registered after it and would propagate into `remerge` or `configure`.
- Before this phase the same throw happened in the panel's render and was contained to that panel. Typed callers cannot reach it, so this is not a bug against the stated types.

**Fix:** none required. If a host can pass a JSON-restored reading, catch inside `reservice`, hold `ServicesView.Failed({ reason })` and note that in the store comment. Otherwise reword the comment to say the input is typed data and a malformed one is the host's defect.

---

_Reviewed: 2026-11-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
