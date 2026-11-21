---
phase: QD-68-hygiene-and-recorded-close-outs
reviewed: 2026-11-21T00:00:00Z
depth: standard
files_reviewed: 44
files_reviewed_list:
  - packages/core/src/Admission.ts
  - packages/core/src/DecisionLog.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/src/UntrustedDecode.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/core/test/Admission.test.ts
  - packages/core/test/DecisionCache.test.ts
  - packages/core/test/FloatingEffectPins.tst.ts
  - packages/core/test/StoredEnvelope.test.ts
  - packages/core/test/UntrustedDecode.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/ExternalStore.test.ts
  - packages/devtools/test/model/Source.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/react/test/UntrustedSeams.test.ts
  - features/features/decision-log/decision-log.steps.test.ts
  - scripts/bench/ab.sh
  - scripts/bench/analyze.mjs
  - scripts/check-house-style.mjs
  - scripts/check-package-install.mjs
  - scripts/lib/type-tests.mjs
  - scripts/run-tstyche.mjs
  - scripts/spec-revise.mjs
  - .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation.mjs
  - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs
  - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-compare.mjs
  - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-mutation.mjs
  - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-reverify.mjs
  - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-stale.mjs
  - packages/devtools/README.md
  - .changeset/devtools-capacity-change-reads.md
  - spec/decisions/033-the-packed-artifact-is-the-product.md
  - spec/decisions/172-admission-produces-the-one-walk-environment.md
  - spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md
  - spec/decisions/174-a-decision-cache-is-asked-the-question.md
  - spec/decisions/175-a-negative-type-pin-can-fail.md
  - spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md
  - spec/behaviors/05-evaluator.md
  - spec/behaviors/28-devtools-screens.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase QD-68: Code Review Report

**Reviewed:** 2026-11-21
**Depth:** standard
**Files Reviewed:** 44
**Status:** issues_found

## Summary

No correctness or security defect in shipped code. The two behaviour changes hold:

- **`TimelineFeed.configure`'s `try { push() } finally { readSource }`.**
  - Resize only, source only and both each start exactly one read.
  - A throw on the emptied-timeline publish is rethrown after the read has started, so the new read is not skipped.
  - On a `Stopped` feed, a status listener's throw on the `Reading` that `readSource` publishes escapes from the `finally`. It replaces the timeline listener's throw and no read is forked. `status.set(READING)` notifies only on a change of reference, so a feed already `Reading` cannot hit this window. The wording in the `TimelineFeed.ts` docs, ADR-QD-177, BEH-QD-656, the README and the changeset states this residue exactly. TF26 to TF29 would fail on the base tree.
- **`admit`.**
  - `policy`, `maxDepth` and `subject` are each read once, and `resource` and `action` once into the matcher context.
  - Ordinary objects behave as before: destructuring uses the same `[[Get]]`, and `subject.*` is still touched only after the depth gate.
  - E11 to E13 would fail on the old code.

Three warnings are in the gate tooling and its text. None weakens `pnpm check`:

- `scripts/run-tstyche.mjs` with no arguments is the old path; filters are opt-in, an option is refused, and a filter that selects nothing fails.
- The `readJsonc` read of `tstyche.json` consumes a string whole before it looks for `//`, so a `//` inside a string is safe.
- The bench analyzer reproduces the committed `bench/final/analysis.tsv` byte for byte, and its self-test passes (14).
- `packages/*/src` is unchanged since the bench's head `769bf57c`.

I did not read `spec/traceability.md` or ADR-QD-174's re-wrap line by line; I relied on `check:pr` being green for their structure. I did not load `necessity-review.md`, so no necessity assessment was made and `necessity:` is omitted.

## Warnings

### WR-01: A timed-out child in the packed-install guard reports a blank cause

**File:** `scripts/check-package-install.mjs:183-187, 352-353, 436-437, 811-817, 862-870`
**Issue:** `CHILD_TIMEOUT_MS` makes a hung child fail the gate, but the catch sites print `error.stdout ?? error.message` or `error.stderr ?? error.message`. With `stdio: "pipe"`, a child killed by timeout carries `stdout: ""` and `stderr: ""` (I confirmed this on Node). `??` does not fall through on an empty string, so the output is:

- an empty line before "pnpm build FAILED";
- "importing the packed packages failed:" with nothing after it;
- "the consumer failed at runtime:" with nothing after it.

The gate still goes red. Nothing says "timed out after 600 s", so a CI hang reads as a mystery failure. `pnpm pack` and `tar` are uncaught, so they do show `ETIMEDOUT` in the stack.
**Fix:** One helper used at every catch site:
```js
const why = (error) => (error.code === "ETIMEDOUT" ? `timed out after ${CHILD_TIMEOUT_MS} ms` : (error.stderr || error.stdout || error.message));
```
Use `||` rather than `??`.

### WR-02: "Every child process the gate starts has a timeout" is not true

**File:** `scripts/check-package-install.mjs:955`; text in `spec/decisions/033-the-packed-artifact-is-the-product.md` (Amendment 2026-11-21), the CCR-QD-459 row in `spec/README.md`
**Issue:** `new API({ cwd: SANDBOX })` from `typescript/unstable/sync` starts a TypeScript server child process, and `.updateSnapshot(...)` blocks on it. That child has no timeout, so a hang there still hangs `pnpm check`. Both the ADR and the CCR row say every child has one. The code comment on `CHILD_TIMEOUT_MS` is accurate, since it speaks only of `execFileSync`.
**Fix:** Either reword the ADR and CCR row to "every `execFileSync` child", or bound the API use. For example, run the whole probe guard in a `node` child started through `execFileSync` with the timeout.

### WR-03: `analyze.mjs` accepts any two labels, so a swapped or equal pair gives a false pass

**File:** `scripts/bench/analyze.mjs:196-208` (`main`)
**Issue:** `<reference-label>` and `<candidate-label>` are read from argv and never checked against `meta.txt`'s `head_label` and `patched_label`, nor against each other.

- `analyze.mjs dir X X ...` compares an arm with itself and prints `gate: pass`.
- Swapping reference and candidate inverts the sign of every delta, so a real 6% regression reads as a 6% win and passes.

The roles are not fixed by the harness. In Phase 68's own record the "patched" arm is the phase base, so the reference is the patched label, which is exactly the case where an operator picks the wrong order. The self-test never exercises `main`, so neither case is covered.
**Fix:** In `main`, refuse `refLabel === candLabel`, and refuse a label that is neither `head_label` nor `patched_label` in `meta.txt`. Optionally record which label is the reference in `meta.txt`.

## Info

### IN-01: An odd round count leaves the arm order unbalanced

**File:** `scripts/bench/ab.sh:35-44`; `.planning/phases/QD-68-hygiene-and-recorded-close-outs/68-BENCH.md`
**Issue:** The header says alternating the order stops one arm always running on a warmer or colder host. With the 3 rounds the gate's minimum allows, the head arm runs first twice and the patched arm once (`final-1 base-1 base-2 final-2 final-3 base-3`), so only a third of the order bias is cancelled. The gate is still valid. The claim is stronger than the schedule.
**Fix:** State that the balance is exact only for an even round count, or have `ab.sh` refuse an odd count (the analyzer's minimum would then be 4).

### IN-02: A failing gate exits 0, and the analyzer self-test is run by nothing

**File:** `scripts/bench/analyze.mjs:3-4, 226`
**Issue:** The script exits 0 whenever the analysis completed, whatever `# gate:` says; this is documented. A caller that tests `$?` will pass a regression. `--self-test`, which is the proof that the 5% and +2% limits bite, is neither in `pnpm check` nor wired to anything, so a later edit to `MAX_SLOWDOWN` or the geomean arithmetic would go unseen.
**Fix:** Add `--strict`, or make the exit status 1 for `gate: fail` when asked. Run `--self-test` from an existing gate, or accept it as record-only and say so in `ab.sh`'s header.

### IN-03: `68-stale.mjs` can miss a cited file that was renamed, or one outside its path roots

**File:** `.planning/phases/QD-68-hygiene-and-recorded-close-outs/68-stale.mjs:12, 33`
**Issue:**

- `git diff --name-only <commit>..HEAD` uses rename detection, so a renamed cited file lists only its new path and the old cited path never matches.
- `PATH` matches `packages|scripts|spec|features|examples|apps|.planning` and a few root files. It does not match `.changeset/`, `.github/`, `pnpm-lock.yaml` or `.oxlintrc.json`. Phases 64 and 66 cite `.changeset/*` files, so a change to one would not make them stale.

No stale phase was missed today. The check is weaker than HYGN-06 reads.
**Fix:** Use `--no-renames`, and add `.changeset|.github` and the root dotfiles to `PATH`.

### IN-04: Two record scripts and a "types are not compared" blind spot

**File:** `67-mutation.mjs` and `68-mutation.mjs` self-tests (`gitStatus.toString() !== '…'`); `68-compare.mjs:62-72`
**Issue:**

- The self-tests compare `gitStatus.toString()` with a source-text literal to prove the status reader reads the right files. Any reformat or rename breaks it. It checks text, not behaviour.
- `68-compare.mjs` proves "comments, line breaks and titles only" through `transpileModule`, which erases types. A type-only edit, such as an annotation or a generic argument, therefore passes as "same" for `SinkCodec.ts`, `DecisionLog.ts` and the test files.
- No such edit exists in the files this phase compared. The proof's name is wider than what it checks.

**Fix:** Replace the `toString()` checks with a stub that records the pathspec passed to `git`. In `68-compare.mjs`, say in its header that type annotations are outside the comparison, or also compare `ts.createSourceFile` trees with comments stripped.

---

_Reviewed: 2026-11-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
