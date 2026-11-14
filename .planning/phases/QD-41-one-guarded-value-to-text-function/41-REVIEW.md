---
phase: QD-41-one-guarded-value-to-text-function
reviewed: 2026-11-14T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - packages/core/src/ValueText.ts
  - packages/core/src/Explanation.ts
  - packages/core/src/index.ts
  - packages/devtools/src/model/Remedies.ts
  - packages/devtools/src/model/Filters.ts
  - packages/devtools/src/model/SimulationForm.ts
  - packages/core/test/ValueText.test.ts
  - packages/core/test/NonJsonLiteral.test.ts
  - packages/core/test/Explanation.test.ts
  - packages/devtools/test/model/NonJsonWitness.test.ts
  - packages/devtools/test/model/ValueTextConsumers.test.ts
  - packages/devtools/test/model/Remedies.test.ts
  - packages/devtools/test/model/Filters.test.ts
  - packages/devtools/test/model/SimulationForm.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
  necessity: 0
status: issues_found
---

# Phase QD-41: Code Review Report

**Reviewed:** 2026-11-14
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

`valueText` itself is sound: one `try`/`catch` around `JSON.stringify`, never throws, and it is the only
`JSON.stringify` of an unknown value left in `packages/core/src` and `packages/devtools/src` (the remaining
`JSON.stringify` calls take a string or an encoded wire value). No `as`, `any`, `!` or `switch` was added, no
value content or error message reaches a label or log (the sentinel tests confirm this for `toJSON`), and a
revoked proxy is handled in the label paths (`typeof` does not touch the proxy and `valueText` catches).

Three real defects remain. The label rule is restated in two packages, not stated once. One label changed
that D-07 says must stay byte-identical, and the base-pinned tests were edited to match. The `In` fallback
can still throw.

## Warnings

### WR-01: The label rule is written twice, in core and in devtools

**File:** `packages/core/src/Explanation.ts:290-302`, `packages/devtools/src/model/Remedies.ts:567-582`
**Issue:** D-13 says there is one function and D-14 says `explain` follows the same rule as Remedies. The
guard is shared, but the rule that turns "no text" into a label is not. `NO_JSON_FORM` is declared in both
files, and `literalText` and `render` are the same three-branch expression: bigint as digits and `n`, then
`valueText(v) ?? (typeof v === "object" ? NO_JSON_FORM : "undefined")`. Nothing ties the two together. If
one changes the wording or the object/function split, `explain` and the remedy labels drift apart without a
failing test, which is the defect shape this phase exists to remove. The same applies to the `"undefined"`
word.
**Fix:** Export the label from core next to `valueText`, for example `valueLabel(value: unknown): string`
(with the bigint, fixed-words and `undefined` branches), and have `Explanation.literalText` and
`Remedies.render` (after its bare-string case) call it. Delete both `NO_JSON_FORM` constants. This also needs
the `spec/overview.md` row for the new export.

### WR-02: A label D-07 requires unchanged was changed, and its base-pinned tests were edited

**File:** `packages/core/src/Explanation.ts:296-303`, `packages/devtools/src/model/Remedies.ts:577-583`;
tests `packages/core/test/Explanation.test.ts:988-993`, `packages/devtools/test/model/Remedies.test.ts:889-893`
**Issue:** D-07 says a value that rendered before renders the same, and only a value that threw gets the new
label. An object whose `toJSON` returns `undefined` did not throw. It rendered as `equals undefined` and
`x = undefined` on the base, and both pins were written green on the base (commit 8217de3f). Now
`valueText` gives `undefined`, `typeof value === "object"` is true, and the label becomes `a value with no
JSON form`. The two characterisation tests were rewritten to the new text instead of staying as pins. BEH-QD-541 documents
this as "the one label that changed", but that is a decision the locked context does not allow, and it
alters an existing label for a case that never failed. The cause is that "object" is used as a stand-in for
"stringify threw", which `valueText`'s `string | undefined` contract cannot tell apart from "stringify gave
nothing".
**Fix:** Either keep D-07 (distinguish the two, for example by having the label path catch separately, or by
checking `JSON.stringify` result for `undefined` before the throw path) and restore both pinned strings, or
get D-07 amended explicitly and record it in the context. As written the code and the locked decision
disagree.

### WR-03: The `In` fallback can still throw, and its text differs from the main path

**File:** `packages/core/src/Explanation.ts:323`
**Issue:** When `valueText(m.values)` is `undefined`, the fallback runs `m.values.map(literalText)`. That
call is unguarded. If `m.values` is a revoked proxy, an array with a throwing `get` trap, or (from an untyped
caller) not an array at all, `.map` throws `TypeError` from `explain`, which is the failure this phase
removes. The fallback also gives a different reading from the guarded path for the same elements:
`JSON.stringify([undefined, () => 1])` is `[null,null]` while the fallback gives `[undefined,undefined]`,
and holes in a sparse array are skipped by `.map` and so print as empty slots. These cases are only reached
when some other element has no text, so they are rare and inconsistent.
**Fix:** Guard the fallback, for example `Array.isArray` is itself unsafe on a revoked proxy, so wrap the
`.map` in the same one-function guard, or fall back to the fixed words for the whole list when
`valueText(m.values)` is `undefined` (consistent with how `Remedies` labels an array holding a bigint). The
whole-list fixed words also remove the second rendering rule.

## Info

### IN-01: Two distinct non-JSON witnesses on one attribute are collapsed to one remedy

**File:** `packages/devtools/src/model/Remedies.ts:577-583` (label), consumer dedupe in the remedy list
**Issue:** All objects with no JSON form share one label, so `anyOf` over two different cycles offers one
remedy, the first kept (pinned by the new "deduplicated" test). The second, different witness is dropped.
It is documented in BEH-QD-541, so it is a known trade-off, but it is a silent loss of an offered remedy
that the task text (D-05: "still offered and still applies") does not mention for the second one.
**Fix:** Accept and keep documented, or dedupe on witness identity rather than label.

### IN-02: Dead branch in `render`/`literalText` ordering invites misreading

**File:** `packages/devtools/src/model/Remedies.ts:579-583`
**Issue:** The bigint check is placed before `valueText`, which is needed (a bigint has no JSON text), but a
function and a symbol also reach `valueText` first and only then fall to the `"undefined"` word. That is
correct, but it relies on `typeof v === "object"` rejecting `null` implicitly (`JSON.stringify(null)` is
`"null"`, so it never reaches the check). Safe today, and a comment would stop a later reader adding a
`null` guard.
**Fix:** One-line comment, or fold into the shared `valueLabel` of WR-01.

### IN-03: `valueText` is a generic name in core's flat namespace

**File:** `packages/core/src/index.ts:59`, `packages/core/src/ValueText.ts:11`
**Issue:** AGENTS.md section 9 warns against generic names leaking into the flat barrel. `valueText` is
descriptive enough and was chosen deliberately (D-13), so this is a note, not a defect. `spec/overview.md`
must name it (gate 13); that file is outside this review's scope and was not checked.
**Fix:** None required; confirm the `spec/overview.md` row exists.

---

_Reviewed: 2026-11-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
