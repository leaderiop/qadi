---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
reviewed: 2026-11-25T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - packages/devtools/src/model/Diagnostics.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/Gates.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/PortCards.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/useDiagnostics.ts
  - packages/devtools/src/index.ts
  - packages/devtools/src/react/index.ts
  - packages/devtools/test/model/Diagnostics.test.ts
  - packages/devtools/test/model/Diagnostics.tst.ts
  - packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DockModel.reading.test.ts
  - packages/devtools/test/surface.tst.ts
  - scripts/check-package-install.mjs
  - .changeset/devtools-diagnostics-has-no-questions.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - apps/website/src/content/docs/docs/packages/devtools.md
  - packages/devtools/README.md
  - spec/decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md
  - spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md
  - spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md
  - spec/decisions/047-a-headless-devtools-model.md
  - spec/behaviors/28-devtools-screens.md
  - spec/invariants.md
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase QD-83: Code Review Report

**Reviewed:** 2026-11-25
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

The source change is sound. I found no defect in the shipped code. I traced the five points in the brief.

- **Sink order.** `accept` runs guard, then fold, then `sampled = true`, then `show(Live, reading)`. A stale run returns before it reads, folds or publishes, so it cannot publish. `foldReading` is pure, so a fold that throws leaves `sampled` false. A listener that throws on the `Live` publish leaves the snapshot held, becomes a defect, and ends as `Stopped { sampled: true }`, which matches ADR-QD-194.
- **`off()` and restart.** `off()` stops the run, clears `sampled` and sets the constant `diagnosticsOff`, so the reading is `noDiagnostics`. A start after `Off` folds into the empty reading. A `restart()` or a changed `configure` keeps the old reading under `Starting`, and `sampled` stays true until `Off`. That is the same as before the phase and is what BEH-QD-753 states.
- **`foldReading`.** It builds a four-field literal typed `Diagnostics`, keeps per-field identity through `keep`, and returns `previous` through `sameFields` when nothing moved. I found no way to break it. Both `Object.entries` lists always hold the same four keys.
- **Gates and tests.** `check-house-style` is clean and `tsc -b packages/devtools` is clean. The four Diagnostics test files (76 tests) pass under the root vitest `devtools` project.
- **Claims.** ADR-QD-196, BEH-QD-751..755 and INV-QD-411/412 are true of the code, and the tests they name exist. Two claims overreach:
  - A pinned order step is not observable (WR-02).
  - A named test cannot fail for the reason it names (WR-01).

The findings are test and documentation precision, not behaviour. No necessity findings were raised.

## Warnings

### WR-01: "a sample carries exactly the four fields the poll reads" reads the folded reading, so it cannot fail for the reason it names

**File:** `packages/devtools/test/model/Diagnostics.test.ts:272-284`
**Issue:** The test reads `held.reading()`, the sink's folded reading, not the sample.
- `foldReading` builds its result as a four-field object literal, or returns `previous`, which is `noDiagnostics` and also has four keys.
- If `runDiagnostics` sampled a fifth field, `Object.keys(held.reading())` would still be the four. The test passes whatever the poll samples.
- Only the compiler guards this, through the excess-property check on the `Effect.all` record.
- ADR-QD-196 (the "poll's sample" row), BEH-QD-754 (Pinned by) and INV-QD-412 (Enforcement) all cite this test as the pin for "a sample is those four reads and nothing else".

**Fix:** Record the raw sample in a sink that does not fold:
```ts
const samples: Array<Diagnostics> = [];
const fiber = yield* start({ accept: (sample) => { samples.push(sample); } });
assert.deepStrictEqual(Object.keys(samples[0] ?? {}).sort(), ["activity", "hydration", "portCalls", "wiring"]);
```

### WR-02: Nothing pins that a superseded run's sample does not set `sampled`, though ADR-QD-196 decision 4 and BEH-QD-752 state the order and cite FC9 and F33

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:187-194`; `packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts:232-258`; `packages/devtools/test/model/DiagnosticsFeed.test.ts:688-715`
**Issue:**
- FC9 and F33 observe only publishes (the tape, the status, the reading). Moving `sampled = true` above the `isCurrent` guard changes none of them.
- In both tests the newest run takes a real sample afterwards, which sets `sampled` anyway.
- The mutant would leave `Stopped.sampled` true when the reading holds no accepted sample.
- `isUnsampled` would then be false and the Services panel would claim "not handed over" for absent fields. That is the failure the flag exists to prevent (BEH-QD-753).

**Fix:** Add a row to the characterisation. Reuse FC9's setup, but make the newest run die before its first sample:
```ts
const superseded = makeCollectorDouble((call) => {
  if (call === 1)
    feed.configure({ collector: makeCollectorDouble(() => { throw new Error("boom"); }).collector });
  return logOf(1);
});
// expect the tape [Starting, Stopped { sampled: false, reading: "same" }]
```

### WR-03: The `DockModelInputs.reading` doc comment still says every field of a supplied reading takes precedence over the sampled one

**File:** `packages/devtools/src/model/DockModel.ts:146-157`
**Issue:**
- The comment says "Each field it carries takes precedence over the same field of what `diagnostics` samples", and goes on to list its `questions`.
- After this phase `questions` is not merged and is not sampled. It reaches the questions join and wins over the `questions` input (ADR-QD-169).
- The phase corrected this sentence in `README.md`, `apps/website/.../devtools.md` and `spec/overview.md`. It left the TSDoc on the public input type, the one an editor shows, unchanged. Only the import line in `DockModel.ts` was touched.

**Fix:** Mirror the README wording:
```
 * Each of `wiring`, `activity`, `hydration` and `portCalls` it carries takes precedence over the
 * same field of what `diagnostics` samples, and a field it omits falls through to the sample
 * (`mergeReading`). Its `questions` are not merged: the questions join reads them from this reading
 * and they win over the `questions` input (ADR-QD-169).
```

## Info

### IN-01: The changeset and the upgrade entry omit the model's `questions` store as the place to read from

**File:** `.changeset/devtools-diagnostics-has-no-questions.md:7`; `apps/website/src/content/docs/docs/reference/upgrading.md:925-960`
**Issue:**
- CONTEXT D-13, ADR-QD-196 Consequences and BEH-QD-754 all name two places a host that read `reading.questions` reads instead: "the `DiagnosticsReading` it supplied, or the model's `questions` store".
- The changeset and the upgrade entry name only the first.
- A host that read `reading.questions` off the dock model's `diagnostics` readout, which is where the field was observable, gets no pointer to the store.

**Fix:** Add "or the dock model's `questions` store" to the changeset's last paragraph and to the upgrade entry's closing line.

### IN-02: The characterisation header says F1, F2, F19 and F33 are "left" in `DiagnosticsFeed.test.ts`, then re-pins the same transitions as FC1, FC2, FC7 and FC9

**File:** `packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts:13-14`, rows FC1, FC2, FC7, FC9
**Issue:** The header says the rows `DiagnosticsFeed.test.ts` already pins are left there. FC1 duplicates F1, FC2 duplicates F2, FC7 duplicates F19 and FC9 duplicates F33. The duplication may be intended: the tape adds the reading's identity per field. The header contradicts the file and a reader cannot tell which one owns the fact.
**Fix:** Reword the header to say the FC rows re-state those transitions as a tape with the reading's per-field identity, and that the F rows keep the status-only assertions.

### IN-03: A supplied reading that carries only `questions` still produces a new, content-identical shown reading

**File:** `packages/devtools/src/model/Diagnostics.ts:131-142`; `packages/devtools/src/model/DockModel.ts:313-317`
**Issue:**
- `mergeReading` returns `sampled` itself only when `supplied === undefined`.
- Given `{ questions }` alone, it now builds a fresh four-field object whose fields are all the sampled references. Before the phase the new object differed in `questions`. Now it differs in nothing.
- Each change of the supplied reading's identity therefore publishes `diagnostics` with no moved field, and `useSyncExternalStore` readers of `model.diagnostics` re-render for nothing.
- This is not a regression in publish count, and FC11 pins "once". It does sit uneasily beside INV-QD-411's reasoning that a reading changes identity only when a field moved.
- This rests on judgement. `mergeReading`'s tests pin deep equality, not identity, for `{}`.

**Fix:** In `mergeReading`, return `sampled` when none of the four overrides is present. Alternatively, run the merged result through `foldReading(sampled, merged)`, which already does this.

### IN-04: Three new or changed lines exceed the hand-wrapped width

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:193`, `:203`; `packages/devtools/src/model/Diagnostics.ts:221`
**Issue:** The first two are code lines of about 110 and 105 columns. The third is a 140-column doc sentence ("Reads once at the start ... handing each sample to `sink.accept`. The error channel is"). AGENTS.md section 17 settles on hand-wrapping at about 90 columns. No gate enforces it.
**Fix:** Wrap by hand, for example:
```ts
        show(
          DiagnosticsStatus.$is("Live")(current.status) ? current.status : DiagnosticsStatus.Live(),
          reading,
        );
```

---

_Reviewed: 2026-11-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
