---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
reviewed: 2026-11-25T03:30:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - packages/react/src/QadiProvider.tsx
  - packages/react/src/RegistryLease.ts
  - packages/react/test/QadiProvider.lifetime.test.tsx
  - packages/react/test/RegistryLease.test.ts
  - packages/react/test/edges.test.tsx
  - stryker.react.mjs
  - .changeset/react-registry-recycled-in-place.md
  - apps/website/src/content/docs/docs/packages/react/index.md
  - spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md
  - spec/behaviors/09-react.md
  - spec/invariants.md
  - spec/appendices/react-integration.md
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
  necessity: 0
status: issues_found
---

# Phase QD-82: Code Review Report

**Reviewed:** 2026-11-25
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The registry lifetime itself is sound. I traced these cases and found no defect in any of them:

- StrictMode double effects.
- `<Activity>` hide and reveal.
- Unmount.
- An atoms swap.
- A straggling read.
- A throwing recycle or defer. The lease sets its state before it calls `recycle`, so it stays usable.

`registry.reset()` in effect 4.1.2 clears timeout buckets and nodes, and the registry stays usable (`AtomRegistry.js:422`). No house-rule violation turned up in the source files: no `as`, `!`, `any`, module-scope `let` or `switch`. I did not check the test files for those.

I ran the three test files (38 pass) and mutated the code to check what the tests actually pin. There are no blockers. There are three warnings. Two are tests that cannot fail for something the records claim they pin. One is a spec sentence that states something the code does not do. The nit you named is confirmed, as IN-01.

## Warnings

### WR-01: BEH-QD-749 (and ADR LT6 row) claim a subject changed while hidden is what a consumer reads on reveal; the first revealed frame reads the old subject

**File:** `spec/behaviors/09-react.md` (BEH-QD-749 body, "including one that changed while the tree was hidden"); `spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md:127` (the "A subject changed while hidden" row); `packages/react/src/QadiProvider.tsx:264-269`
**Issue:**
- `latestRef` is written in a passive effect. A hidden `<Activity>` renders with new props but runs no effects. So "the subject of the latest commit" is the subject of the last commit whose effects ran, not the one that changed while hidden.
- I checked this with a scratch probe, since deleted. The sequence was: render with u1, long hide, change the prop to u2 while hidden, long hide, reveal. The consumer's `useSubject()` frames on reveal were `["u1","u2"]`.
- The recycle wrote back u1. The provider's subject effect then wrote u2, after the children had subscribed and rendered.
- That is the ticket-34 one-frame tradeoff the CONTEXT file (D-10) accepts. BEH-QD-749's sentence says the opposite: a consumer that subscribes on the reveal "reads the subject the last commit held, including one that changed while the tree was hidden".
- LT6 asserts only the settled `subject:u2` (`QadiProvider.lifetime.test.tsx:407`), not the first frame. Its title and the ADR row ("the revealed provider answers with the new subject") hide that a stale-subject frame renders. The `QadiProvider.tsx:264` comment ("the atoms and subject of the last commit") has the same ambiguity.
**Fix:**
- Strike the "including one that changed while the tree was hidden" clause from BEH-QD-749.
- State in BEH-QD-749 and the ADR row that the first frame after such a reveal reads the previous subject until the provider's effect writes the new one.
- Pin that frame in LT6 with an `IdLog`-style frame list asserting `ids` is `["u1","u2"]`, so the tradeoff is recorded as a pin and not an omission. Alternatively close the gap in code.
- Reword the `QadiProvider.tsx:264` comment to "the last commit whose effects ran".

### WR-02: Nothing pins that the recycle re-seeds the latest committed subject; neutralising the `latestRef` effect passes the whole React suite

**File:** `packages/react/src/QadiProvider.tsx:266-269`; `packages/react/test/QadiProvider.lifetime.test.tsx` (LT6, LT8, LT13)
**Issue:**
- I replaced the body of the `latestRef` effect with a no-op. The recycle then always re-seeds the first closure's `{atoms, subject}`.
- All 15 lifetime tests passed. So did the full `--project react` run (42 files, 675 tests).
- No test commits a visible subject or atoms change and then does a long hide and reveal. LT6 and LT8 change props only while hidden, where effects do not run. LT13 never changes the subject.
- ADR-QD-195 decision 4, BEH-QD-749 ("MUST NOT write ... the one the first closure held") and the commit-order paragraph name this as a pinned behaviour. It is not pinned. `QadiProvider.tsx` is outside the mutation list, so nothing else measures it.
**Fix:** Add a lifetime test, for example "LT16": mount with u1, `change({subject: otherReader})` while visible and settle, `longHide()`, then `change({mode: "visible", tick: 1})`. Assert that `IdLog`'s ids never contain `"none"` or `"u1"` after the reveal. Show it failing once under the scratch edit above.

### WR-03: LT12's "one fork and one sweep per episode across a long hide" assertion runs with zero forks and zero sweeps

**File:** `packages/react/test/QadiProvider.lifetime.test.tsx:539-570` (LT12); `spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md:132,186-188`
**Issue:**
- LT12 builds `countedAtoms(1)` and mounts one gate, so only one question is ever tracked and no pressure episode occurs.
- I printed the counts just before the assertion. Output: `PROBE forks 0 sweeps 0`.
- So `expect(counts.sweeps).toBe(counts.forks)` is `0 === 0`, and `sweepsAtFork` equals `[]`. The part that spans the hide proves nothing about the sweep bound.
- Only the tail (after `counter.reset()`) is real. It adds `atoms.decision(extra)` after the reveal, so it is a post-reveal pressure episode, not one across the hide.
- The ADR table row ("Pressure episodes across a long hide: one fork and one sweep per episode") and Consequences bullet claim D-13 is asserted. The code comment concedes the hidden-gate case is "not counted".
**Fix:** Either drive real pressure during the hide, or reword the claim.
- To drive pressure, mount two gates with `maxTrackedQuestions: 1`, or call `atoms.decision(extra)` before `show()`. Then assert `counts.forks >= 1` and `sweepsAtFork` strictly increasing across the hide.
- To reword, limit the ADR row and Consequences bullet to the post-reveal episode the test does pin.
- Either way, add `expect(counts.forks).toBeGreaterThan(0)` before the equality, so the check cannot be vacuous.

## Info

### IN-01: `leaseRef` is typed `ReturnType<typeof makeRegistryLease>`; the exported `RegistryLease` interface has no consumer (nit confirmed)

**File:** `packages/react/src/QadiProvider.tsx:276`; `packages/react/src/RegistryLease.ts:23`
**Issue:** Confirmed. `ReturnType<typeof makeRegistryLease>` is structurally `RegistryLease`, but the interface is exported and imported nowhere under `packages/react`. It is a dead export, and the provider spells the type the long way round. This is a style nit, not a bug.
**Fix:** `import type { RegistryLease } from "./RegistryLease.ts"` and `useRef<RegistryLease | undefined>(undefined)`.

### IN-02: The recycle callback is not atomic: a throw from `reset()` skips the subject re-seed

**File:** `packages/react/src/QadiProvider.tsx:277-280`
**Issue:**
- If a layer finalizer makes `registry.reset()` throw, the nodes are already cleared (`this.nodes.clear()` runs before `runAll`). `registry.set(subject)` is then skipped, and the error escapes from a bare `setTimeout` callback as an uncaught exception.
- The lease survives this (RL7). On reveal, consumers subscribe first and read an unset subject, so the gates render pending. That is fail-closed. The provider's subject effect repairs it afterwards.
- It is a narrow, unpinned path that depends on finalizer behaviour.
**Fix:** Optionally write the re-seed in a `try { registry.reset() } finally { registry.set(...) }`. Otherwise record the limit in ADR-QD-195 and leave it.

### IN-03: LT14's closing assertion does not depend on the lease

**File:** `packages/react/test/QadiProvider.lifetime.test.tsx:610-612`
**Issue:**
- `registry.getNodes().has(decision)` being false after a macrotask is plain idle removal of a non-`keepAlive` atom. It holds with the release skipped.
- The not-throw half does catch `dispose()`. The "leaves no node" half pins the registry's own behaviour, not the provider's.
- This is harmless, but BEH-QD-748 cites LT14 as pinning the release.
**Fix:** Cite LT14 for "throws nothing" only, or add a `keepAlive` host-atom read as `edges.test.tsx` does.

---

_Reviewed: 2026-11-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
