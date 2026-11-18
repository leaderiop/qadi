---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
reviewed: 2026-11-18T18:00:00Z
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
  warning: 1
  info: 3
  total: 4
  necessity: 0
status: issues_found
---

# Phase 55: Code Review Report

**Reviewed:** 2026-11-18
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

I found no BLOCKER and no behavior regression.

I diffed `PortCards.ts` against the base `ServicesPanel.tsx` join branch by branch and found the same words, the same gating and the same ordering. That covers:
- Withheld versus NotHanded.
- `noReading`.
- Uncollected versus Hidden.
- First activity entry wins.
- Newest five, newest first.
- The `earlier` count.
- The `attempts` suffix.
- Interpreter labels.
- The `in flight` reading.
- The consequence prefix.
- `data-defaulted`.

The `reservice` identity rule matches the base's per-render inputs. Its four keys are the wiring read, the activity, the call log and `isUnsampled(status)`, the last of which the panel read from the notice status before.

Verification I ran:
- `vitest --project devtools` on `PortCards`, `DockModel`, `Wiring` and `ServicesPanel*`: 212 passed.
- `check-house-style.mjs`: clean.
- `oxlint`: no findings in the phase's files (two `prefer-as-const` warnings in `HeldChoice.test.ts`, outside this phase).
- devtools `tsc --noEmit`: clean.
- `tstyche` on `PortCards.tst.ts`: passes.

The spec docs state names, tags and counts accurately. I cross-checked:
- nine stores;
- four inputs;
- sixteen characterisation cells (I counted 16 `it`s);
- the M48..M54 range;
- BEH-QD-611..615;
- INV-QD-355 and INV-QD-356;
- the 0.13 upgrade-note examples.

The `spec/overview.md`-unchanged claim holds. `PortCards`, `ServicesView` and `DockModel` are not in either barrel.

One answer was requested.

**Does `PortCards.tst.ts` prove "a misspelt port is a compile error"?** In whole, yes, but not by the mechanism its text claims.

- `PortActivity["port"]` `toBe<PortName>` plus the two `not.toBeAssignableFrom` cases, the misspelt literal and `string`, is complete and sound. Every other field is present, so the port alone decides the result.
- `keyof ActivityByPort` and `keyof CallsByPort` `toBe<PortName>` carry the misspelling claim. I confirmed in a scratch file that a record with an extra misspelt key fails this pin (`keyof … | "AttributeResolvr"` is not `PortName`).
- The `Omit<…> & { misspelt }` assertions are the weak part. The misspelt half is dead: assignability never rejects an extra key, so the assertion fails only because the real key is missing. What it does catch, incidentally, is optionality. A `Partial` record keeps `keyof` equal to `PortName`, and I confirmed the assertion then fails.

So nothing is unpinned, but one assertion's stated purpose is untrue and the guarantee it provides is unnamed (WR-01).

## Warnings

### WR-01: `PortCards.tst.ts` per-port record pins credit a misspelling they cannot detect

**File:** `packages/devtools/test/model/PortCards.tst.ts:32-37`
**Issue:**
- `not.toBeAssignableFrom<Omit<ActivityByPort, "AttributeResolver"> & { readonly AttributeResolvr: undefined }>` (and the `CallsByPort` twin) is a negative assertion over a source that is missing a required key. It would pass for any `ActivityByPort` that requires `AttributeResolver`, whether or not the misspelt key is present.
- Assignability to a record never rejects extra keys, so the misspelt member contributes nothing.
- The only guarantee the assertion gives is that every key is required, and that guarantee is not stated anywhere.
- The test title and INV-QD-355 and BEH-QD-611's "Pinned by" lines say the pin proves "a misspelt port is a compile error in the per-port records". The `keyof` pins carry that claim, not these.
- A reader who deletes the Omit assertions as redundant, as the task suspected, silently drops required-ness: a `Partial`-shaped record would still pass `keyof … toBe<PortName>`.

**Fix:** the smallest complete pin is the two `keyof` assertions already there plus two that say what they mean. Both candidates passed `tstyche` in a scratch run.

```ts
test("the per-port records have exactly the registry's keys, all required", () => {
  expect<keyof ActivityByPort>().type.toBe<PortName>();            // key set is exact
  expect<keyof CallsByPort>().type.toBe<PortName>();
  expect<ActivityByPort>().type.not.toHaveProperty("AttributeResolvr"); // a misspelt key is not readable
  expect<CallsByPort>().type.not.toHaveProperty("SignatureHistry");
  expect<ActivityByPort>().type.not.toBeAssignableFrom<Partial<ActivityByPort>>(); // none is optional
  expect<CallsByPort>().type.not.toBeAssignableFrom<Partial<CallsByPort>>();
});
```

Drop the two `Omit<…> & { misspelt }` assertions. Their only real effect is the `Partial` case above, which the new lines state directly.

## Info

### IN-01: `ServicesPanel.reading.test.tsx` header still says the file "stays unchanged"

**File:** `packages/devtools/test/react/ServicesPanel.reading.test.tsx:9-14`
**Issue:**
- The pre-existing paragraph says "this file names nothing the base lacks, so it stays unchanged through the move".
- The next paragraph, added in this phase, says the call readings and real-report cases moved out and one case remains.
- Both sit in one doc comment and contradict each other. The file did change; only `ServicesPanel.characterisation.test.tsx` is the never-edited pin.

**Fix:** reword the first paragraph to the past tense and say the consequence table is what stays, or drop "so it stays unchanged through the move".

### IN-02: M54's title and BEH-QD-615's "notifies twice" claim exceed what is asserted

**File:** `packages/devtools/test/model/DockModel.test.ts:1858` and `spec/behaviors/28-devtools-screens.md` (BEH-QD-615)
**Issue:**
- The M54 title ends "(… and Off to Live)" under "keeps the services view". The Off-to-Live half asserts the opposite of keeping the reference: the view moves through `Starting` and ends structurally equal (`deepStrictEqual`).
- The spec says "the store notifies twice and ends on a new, structurally equal view". The test asserts only the equal end state. It never counts notifications or checks that the reference moved.
- This is the accepted M54 deviation, so no code change is needed. The title and the "twice" claim are what a future reader will trust.

**Fix:**
- Retitle: "a status change that leaves the sampled flag alone keeps the services view (Live to a Stopped that had sampled); Off to Live passes through Starting and ends on an equal view".
- Either add `heardOf(off)` with `assert.strictEqual(heard.calls, 2)` and `assert.notStrictEqual(off.services.getSnapshot(), offView)`, or drop "twice" from the BEH text.

### IN-03: `reservice` runs `portCards` unguarded inside an unguarded listener loop

**File:** `packages/devtools/src/model/DockModel.ts:245-271`
**Issue:**
- The comment says "no host code is read, so nothing here is guarded". The inputs are host-supplied data: `inputs.reading` is merged into `shownReading`.
- `portCards` can throw on a malformed value. One example is a non-number `durationMillis` reaching `toFixed(1)`, for instance from a reading rebuilt from JSON. The types forbid it.
- `makeExternalStore`'s `notify` has no try/catch. A throw in `reservice` would skip the React subscription registered after it, and would propagate into `remerge` or `configure`.
- The same throw used to happen in the panel's render and was contained to that panel. Typed callers cannot reach it, so this is not a bug against the stated types.

**Fix:** none required. If a host can pass a JSON-restored reading, catch inside `reservice`, hold `ServicesView.Failed({ reason })` and note that in the store comment. Otherwise reword the comment to say the input is typed data and a malformed one is the host's defect.

---

_Reviewed: 2026-11-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
