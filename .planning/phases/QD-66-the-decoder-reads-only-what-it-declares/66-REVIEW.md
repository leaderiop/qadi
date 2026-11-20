---
phase: QD-66-the-decoder-reads-only-what-it-declares
reviewed: 2026-11-20T23:45:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - packages/core/src/UntrustedDecode.ts
  - packages/core/src/EnvelopeKeys.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/test/UntrustedDecode.test.ts
  - packages/core/test/UntrustedSeams.test.ts
  - packages/core/bench/UntrustedDecode.bench.ts
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/ab.sh
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/analyze.mjs
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation.mjs
  - AGENTS.md
  - spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/behaviors/08-serialization.md
  - spec/overview.md
  - spec/traceability.md
  - spec/README.md
  - .changeset/core-decoder-reads-declared-keys.md
findings:
  critical: 0
  warning: 1
  info: 6
  total: 7
status: issues_found
---

# Phase QD-66: Code Review Report

**Reviewed:** 2026-11-20
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

The new `ignore` projection is correct. I read it against `git diff 48921088` and checked it by running it, not only by reading. On plain data it accepts and refuses exactly what the old one did, so the only behaviour change is the intended one: an undeclared accessor is no longer invoked.

- **Tests and gates.** The three affected test files pass (149 tests). `StoredEnvelope.test.ts` is untouched. The two test files only have lines added. `scripts/check-house-style.mjs` is clean, and `UNTRUSTED_DECODE_BUDGET` is unchanged.
- **House rules.** I found no `as`, `!`, `any`, `switch` or `async`, and no new `Record<string, unknown>` annotation. The one `Record<string, unknown>` reached through `isPlainObject` is pre-existing. The tests build accessor values with `Object.defineProperty`, never spread.
- **Probes (scratch scripts run against `src` with the Node type-stripping flag, since deleted).**
  - A `JSON.parse` result with an own `__proto__` key cannot pollute: `Object.fromEntries` creates an own property, and the probe saw no `({}).x`.
  - An inherited `_tag` getter on a class instance and a non-enumerable `_tag` both take the first member, and U26 pins this.
  - Symbol keys and non-enumerable declared keys are dropped by `Object.keys`, as `Object.entries` dropped them before.
  - Arrays, primitives and `null` pass through unchanged.
  - The single-member early return sits after both build-time throws, so the build-time refusals are intact.
- **Measured reads.** These match the shipped text:

  | Case | Reads |
  | --- | --- |
  | union under `ignore` | `_tag` read 2 times |
  | one-object schema under `ignore` | declared `_tag` read once, as a kept value |
  | unwalked slot, `refuse` | 2 |
  | unwalked slot, `ignore` | 1 |

- **Text problems.** The remaining problems are in the spec text: one contradiction in INV-QD-097, one MUST wording that is slightly wider than the code, and a few unpinned edges. There is no Critical finding.

Necessity assessment (#4100) was not performed: I did not load `necessity-review.md`, so `necessity:` is omitted from the frontmatter. I found no candidate on inspection. The single-member shortcut is the point of the change, and the `propertyIsEnumerable` guard is pinned by U26.

## Warnings

### WR-01: INV-QD-097 still opens with an unscoped "never throw, whatever they are given"

**File:** `spec/invariants.md` (INV-QD-097, the paragraph starting "`encodeSinkRecord`, `encodeSinkRecordString`, `decodeSinkRecord` and `decodeSinkRecordString` never throw")

**Issue:**
- The phase scopes totality to JSON by appending a sentence: "The decode is total over JSON text and JSON values: an in-process value's accessor that `decodeSinkRecord` reads (INV-QD-377) and that throws is thrown out of it."
- The first sentence is left as it was. It says `decodeSinkRecord` never throws "whatever they are given".
- The invariant now contradicts itself. A declared accessor that throws is thrown out of `decodeSinkRecord`, and R17 pins this.
- A depth-guard read one level down throws too (U28). That is a second case of the same family, and the new sentence names only the top-level one.
- The "No adapter … lets one record end a feed" clause that follows depends on the unscoped claim.
- The same pairing is what `SinkCodec.ts` got right for `decodeStoredRecord`: "Never throws on a JSON value; an in-process value's declared accessor … is thrown out".

**Fix:** Scope the first sentence instead of contradicting it.
- Make `decodeSinkRecord` and `decodeSinkRecordString` never throw "on any JSON text or JSON value".
- Replace the trailing sentence with: "On an in-process value, an own accessor that the decoder reads (a declared top-level one, or any one under a kept value) and that throws is thrown out of `decodeSinkRecord` (INV-QD-377)."
- Say that `decodeSinkRecordString` is total for every input, because its input is text.

## Info

### IN-01: BEH-QD-666 and INV-QD-377 say "a union's `_tag` is read twice", but the code gates on the flattened member count

**File:** `spec/behaviors/08-serialization.md` (BEH-QD-666, second REQUIREMENT); `spec/invariants.md` (INV-QD-377); `packages/core/src/EnvelopeKeys.ts:84`

**Issue:**
- `envelopeKeysOf` returns the no-read shortcut when `members.length === 1`. That count is taken after `membersOf` flattens unions and unwraps `Suspend`.
- So `Schema.Union([Schema.TaggedStruct("A", …)])`, a union that flattens to one member, is a union that reads its `_tag` once.
- I measured `{"_tag":1,"a":1}` for it. BEH-QD-666 says a union's `_tag` MUST be read twice.
- This is a degenerate case, and the reads are harmless. But the requirement is a MUST, and no test pins the degenerate case.

**Fix:** Word the requirement by member count: "a schema that flattens to more than one object member reads `_tag` to choose one, so its `_tag` is read twice; one that flattens to a single member reads no `_tag` to choose". Optionally add one U-test for the one-member union.

### IN-02: Two behaviour differences on non-idempotent in-process accessors are neither stated nor pinned

**File:** `packages/core/src/UntrustedDecode.ts:179-190`; `packages/core/src/EnvelopeKeys.ts:85-88`

**Issue:** For plain data and for idempotent accessors the projection behaves exactly as before. These cases differ, and I measured both:
- **A `_tag` that answers differently on its second read.** A union's `_tag` is now read once to choose the member and once as the kept value. I measured a flip-flop `_tag` ("A", then "B") picking A's keys and copying `_tag: "B"`. The result was a `Failure`, so it fails closed: the strict decode checks the copy. The old code took one read and could not disagree with itself.
- **An accessor that deletes a later own key.** `Object.keys` is a snapshot, so the key stays in the list. `input[key]` then returns `undefined`, and the copy holds `b: undefined`. The old `Object.entries` skipped a key that had been deleted. The refusal is still `Malformed`, but its message is "Expected number at ["b"]" where it was "Missing key".

No test pins either, and the text does not mention either. This is in-process hostile input, so it is Info. The fix choices are to say so in INV-QD-377's Implication (one line each), or to read `_tag` once and reuse it for the copy.

**Fix:** Add a sentence to the INV-QD-377 Implication saying a non-idempotent accessor can make the two reads disagree and the strict decode then refuses. Pin one case if you want it recorded. The cheaper code fix is for the union branch to copy `_tag` from the value it already read.

### IN-03: Mutation scorer `compare` is weaker than its header says in two places

**File:** `.planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation.mjs` (`compare`, the `atBase` loop and the `known`/`wasIgnored` sets)

**Issue:**
- **The "line the phase wrote" test exempts a line by its text.** It exempts any open evidence-run mutant whose trimmed line text also appears anywhere in the base file. `(members.find((member) => member.literals.get(TAG) === tag) ?? first).keys;` exists verbatim at base and is exempt. Yet its behaviour changed: it now sits behind the new one-member shortcut and the `propertyIsEnumerable` read. A static-only survivor there would pass.
- **Multiplicity is lost.** `known` and `wasIgnored` are `Set`s of `status`, `mutator`, `replacement` and line text. A second open mutant with the same key (identical line text appearing twice) is invisible. The two survivors at `UntrustedDecode.ts:240` are such a pair today, and they are matched as one entry.

Neither affects this phase's result: close is 44/46 against 41/43, with the same two pre-existing equivalent survivors, and static is 46/48. But the scorer's claim "no mutant on a line the phase wrote is left open" is weaker than it reads.

**Fix:** Match against the diff's added lines (`git diff -U0 <base>.. -- <file>` hunks) instead of the base line set, and compare counts per key (a `Map` of key to count) instead of a `Set`.

### IN-04: The bench A/B always runs the same arm first in a round, and the ADR quotes the gate's statistic without naming it

**File:** `.planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/ab.sh` (the `for arm in "$HEAD_LABEL" "$PATCHED_LABEL"` loop); `spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md` (amendment, last paragraph)

**Issue:**
- **Fixed arm order.** `final` runs first and `base` second in each of the 3 rounds. Any thermal or cache drift favours or disfavours one arm systematically. The median of per-run minima limits the damage, but the interleave is not counterbalanced.
- **Statistic not named.** The ADR says "no workload was more than 5% slower, and the geometric mean of the deltas was no worse than +2%". That holds only for the median of per-run minima (`analysis.tsv`). The recorded mean deltas for `decodeStoredRecord` are +15%, +11% and +27% (one-undeclared-key case). The p50 deltas (+0.8% to +2.0%) corroborate. The geometric mean is -2.13%, pulled down by one -13% workload, so it would not catch a per-workload regression under the 5% band. None of this is a bug in the gate, which was fixed before the run. It does make the ADR's sentence read stronger than the evidence.

**Fix:** In the ADR, add "by the median of per-run minima; the p50 deltas agree and the noisy means are recorded in `66-BENCH.md`". In `ab.sh`, alternate the arm order by round parity.

### IN-05: Comment wraps left ragged, and one comment line far over the hand-wrap width

**File:** `packages/core/src/EnvelopeKeys.ts:57-68`; `packages/core/src/UntrustedDecode.ts:143-145`

**Issue:**
- In the `envelopeKeysOf` doc, the sentence "Throws, at build, for a schema" is cut after five words and the next lines are wrapped at a different width, so the paragraph reads as two wraps spliced together.
- In `UntrustedDecoderOptions`, the line "declares for the member the input's own enumerable `_tag` selects, and needs a schema that is an object or a union of" is about 120 columns, against the file's roughly 90-column hand-wrap (AGENTS.md §17).
- Cosmetic only.

**Fix:** Re-wrap the two paragraphs to about 90 columns.

### IN-06: A test helper named `Either`

**File:** `packages/core/test/UntrustedDecode.test.ts` (the `const Either = () => Schema.Union([...])` inside the new `describe`)

**Issue:** The house rules retired `effect/Either` for `Result` (AGENTS.md §6). A schema union named `Either` reads as a reference to the removed type and invites a grep false positive. It is a function that builds a fresh schema each call, which is fine for these tests.

**Fix:** Rename it to `TwoMembers` or `AorB`.

---

_Reviewed: 2026-11-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
