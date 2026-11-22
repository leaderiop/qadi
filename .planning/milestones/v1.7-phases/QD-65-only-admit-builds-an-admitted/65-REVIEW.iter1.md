---
phase: QD-65-only-admit-builds-an-admitted
reviewed: 2026-11-20T20:30:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - packages/core/src/Admission.ts
  - packages/core/test/Admission.test.ts
  - packages/core/test/WalkEnvironment.tst.ts
  - .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs
  - spec/decisions/172-admission-produces-the-one-walk-environment.md
  - spec/invariants.md
  - spec/behaviors/05-evaluator.md
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

# Phase QD-65: Code Review Report

**Reviewed:** 2026-11-20T20:30:00Z
**Depth:** standard
**Files Reviewed:** 9 (plus `spec/decisions/index.yaml`, read as the 172 entry)
**Status:** issues_found

## Summary

The code is correct. No Critical issue was found.

Checked and clean:

- **Construction lock.** `admit` never uses `this`: its body names `Admitted`, `Result`, `policyDepth` and `SUPPLIED` only. So `export const admit = Admitted.admit` is safe detached. The generic signature survives the alias, and `WalkEnvironment.tst.ts` pins both return types through the alias.
- **Private constructor and `nominal`.** A private constructor blocks `extends`. `declare private readonly nominal: never` makes the type nominal and is erased at run time.
- **Other constructor callers.** `grep` found no `new Admitted` outside `Admission.ts` and the one pin. `Walk.ts:878` and `Predicate.ts:664` call `admit` by name.
- **Derivation.** `SUPPLIED` now reads the `MatcherContext` that `admit` builds once. `question.resource` and `question.action` are each read exactly once.
- **Tests.** E7 to E10 give a real read count, and they fail against the old two-read code. E10 passes both before and after, as the ADR says (E7 to E9 are the ones that failed before).
- **House rules.** No `as`, `!`, `any`, `switch` or `async` in the changed code. The known and accepted multiple reads of `policy`, `maxDepth` and `subject` are left alone.

Commands run:

- `vitest run packages/core/test/Admission.test.ts`: 17 passed.
- `tstyche packages/core/test/WalkEnvironment.tst.ts`: 6 tests, 23 assertions passed.
- `tsc -p tsconfig.test.json --noEmit`: no diagnostics in the changed files.
- `oxlint` on the three source and test files: clean.
- `node scripts/check-house-style.mjs`: clean.
- `pin-codes.mjs`: prints exactly `TS2673 62` and `TS2741 68`, which matches the spec.

The spec records agree with the code on numbers, ids and revisions. The findings below are text that says more than the code holds, plus two pin weaknesses.

## Warnings

### WR-01: "One read of the question" overclaims, in the code comment and four spec records

**File:** `packages/core/src/Admission.ts:60-61`
**Issue:** The `SUPPLIED` comment says the `matcherContext` is built "from one read of the question". `admit` (lines 115-131) does not read the question once:

- `question.policy` is read twice (lines 115 and 127).
- `question.maxDepth` is read three times (lines 115, 116 and 131).
- `question.subject` is read three times (lines 119, 120 and 128).

The accepted scope is "`admit` still reads `policy`, `maxDepth` and `subject` more than once". Only `resource` and `action` are read once. Four spec texts use the broader phrase:

- ADR-QD-172 line 59: "come from one read of the question".
- ADR-QD-172 line 285: "come from that one read".
- INV-QD-376's title and its anchor, repeated in `spec/traceability.md:203`: "come from one read of the question".

The ADR amendment's own last bullet admits that depth is judged on a separate read, so the record contradicts itself. A reader taking the title at face value would think a `subject` getter is covered. It is not, and E6 pins `subject` only by reference.
**Fix:** Say what is held. In `Admission.ts`:

```ts
 * the matcher context because each row reads that context, in which `admit`
 * read the question's resource and action once each, and the tests pin it.
```

Retitle INV-QD-376 to "The supplied flags and the matcher context come from one read of the question's resource and action". Apply the same narrowing in the ADR lines above and in the `traceability.md:203` row and anchor. Update the `#inv-qd-376-...` links in `invariants.md` (INV-QD-375's Related list), `traceability.md` and BEH-QD-662, because renaming the heading changes the anchor.

## Info

### IN-01: `Admitted.admit`'s doc cites INV-QD-364 for the read-once rule, which INV-QD-376 owns

**File:** `packages/core/src/Admission.ts:108`
**Issue:** The doc says "the question's resource and action are each read once (INV-QD-364)". INV-QD-364 states what a request supplied is a function of row source and question. The read-once property is INV-QD-376, added by this phase. The reference sends a reader to the wrong record. `Admitted`'s class doc also cites no invariant for the construction lock (INV-QD-375).
**Fix:** `... each read once (INV-QD-376). It names `Admitted` and never `this`, ...`. Optionally add `(INV-QD-375)` to the class doc where the private constructor is described.

### IN-02: The constructor pin's "positive control" is not a twin of the call it guards

**File:** `packages/core/test/WalkEnvironment.tst.ts:60-64`
**Issue:** `INV-QD-375`, `traceability.md` and the file comment say each pin sits "beside a positive control on `admit`". In the constructor test the control is `expect(admit(question, "asked")).type.toBe<...>()`. That line duplicates line 53 and says nothing about the `new Admitted(...)` call it follows.

The `@ts-expect-error` swallows any diagnostic on its line. If the arguments later drift (a changed `SuppliedBy`, a new constructor parameter), TS2345 or TS2554 would satisfy the directive and the pin would go on "passing". The directive's text is a comment and is not checked. Only the manually run `pin-codes.mjs` reads the code, and `pnpm check:pr` does not run it. The literal pin (lines 66-82) is better: its control assigns `built.success` to the same declared type.
**Fix:** Make the constructor control meaningful. For example, call the constructor with the same arguments inside a static-visible context (not possible outside the class), or assert the argument tuple against the constructor's parameter types:

```ts
type CtorArgs = ConstructorParameters<typeof Admitted<"asked">>;
```

(`ConstructorParameters` on a private constructor does not resolve, which is the weakness.) The alternative is to keep the pin and state in INV-QD-375 and BEH-QD-661 that the TS2673 reason is checked by `pin-codes.mjs` and not by the gate. The invariant already says `pnpm check:pr` does not run it, so this is a wording tightening and the claim "each beside a positive control" should be softened.

### IN-03: `pin-codes.mjs` is tied to one pnpm store path and prints nothing on success

**File:** `.planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs:10`
**Issue:** The script hard-codes `node_modules/.pnpm/typescript@6.0.3/node_modules/typescript`. The next TypeScript bump makes it throw at import. The header says it uses "the TypeScript tstyche uses", but nothing ties the path to tstyche's resolution. It also prints only diagnostics. A run that finds none, for example if the directive-blanking regex stops matching, is silent and looks the same as a run where the pins held.
**Fix:** Resolve TypeScript the way tstyche does, and print a count so an empty run is visible:

```js
const ts = createRequire(resolve("node_modules/tstyche/package.json"))("typescript");
// ... after the loop:
console.log(`${count} diagnostic(s)`);
```

It is a phase record and not a gate, so this is optional.

---

_Reviewed: 2026-11-20T20:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
