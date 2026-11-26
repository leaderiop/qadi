---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
reviewed: 2026-11-26T04:26:56Z
depth: deep
files_reviewed: 20
files_reviewed_list:
  - packages/audit/src/HostBatch.ts
  - packages/audit/src/Retention.ts
  - packages/audit/src/ArchiveFacts.ts
  - packages/audit/src/AuditArchive.ts
  - packages/audit/test/AdmissionOrder.characterisation.test.ts
  - packages/audit/test/BatchReadOnce.test.ts
  - packages/audit/test/ForeignRows.test.ts
  - packages/audit/test/HostBatch.test.ts
  - packages/audit/test/HostBatch.tst.ts
  - packages/audit/test/Retention.test.ts
  - packages/audit/test/hostBatchFaults.ts
  - .changeset/audit-batch-admitted-once.md
  - spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md
  - spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md
  - spec/decisions/110-an-archives-facts-are-computed-once.md
  - spec/decisions/index.yaml
  - spec/behaviors/33-audit-pipeline.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 1
  warning: 3
  info: 7
  total: 11
  necessity: 1
status: issues_found
---

# Phase 89: Code Review Report

**Reviewed:** 2026-11-26T04:26:56Z
**Depth:** deep. Cross-file: `CodecMade.ts` (`rowsRefusal`), `AuditEntry.ts`, `SequenceIntegrity.ts`, `index.ts`, `stryker.audit.mjs` and `89-pinned-check.mjs` (commit `22f41722`) were traced as callees and context. The spec hunks were read against the code.
**Files Reviewed:** 20 (diff `8ee14f6f..1ad87644`).
**Status:** issues_found

## Summary

The mechanism is mostly sound. I traced these paths and found no defect in any of them:

- **Order and laziness.** `admitBatch` (`HostBatch.ts:95-110`) checks `now`, then calls `terms()` once, then the rows. A refused `now` never calls the thunk, and refused terms never touch `entries`. H13, H14 and L1 to L5 pin this.
- **Rows read once.** `takeRows` (`HostBatch.ts:69-70`) reads `length` once and each index once through `Array.from({ length })`. `Array.isArray` on a Proxy fires no trap. `rowsRefusal` and the brand then work on the copy. I re-ran the probe: a flipping list is admitted as the checked row in all four entry points (B6 to B9).
- **Spans.** The writer's refusal happens inside `qadi.audit.archiveAuditTrail` and before `verifiedArchiveFacts`. The public verify is still an unnamed `Effect.fn`, so a refused verify opens nothing and an admitted one opens exactly one span. This matches ADR-QD-202's span table.
- **planPurge.** It admits its own batch (`Retention.ts:188-191`), runs the shared `ageRule`, and then walks `admitted.success.rows.entries`, not the raw `entries`. The archive is never asked about a refused batch.
- **Item 2: unions unchanged, `NowNotFinite` stated once.** Checked clean in source. Both public enums still hold the base cases, with the same tags and field types. `HostBatch.tst.ts:26-44` spells them out, and the tags are `EntriesNotAList`, `EntryNotMadeByCodec`, `NowNotFinite`, `KeyMaterialNotAList` and `KeyMaterialItemRefused` for the archive, and `MaxAgeInvalid` instead of the two key-material tags for retention. The member key `NowNotFinite:` appears only at `HostBatch.ts:26`. What enforces "stated once" is a separate matter, see WR-03.
- **House rules.** Effect imports are namespaced, relative imports use `.ts`, type-only imports use `import type`. There is no `as`, `!`, `any`, `switch` or module-scope `let`, and no new decode token. `HostBatch.ts` is not in the barrel and is not importable through the closed `exports` map. No back edge, so no cycle.
- **Order restated outside `HostBatch.ts` (item 5).** Checked clean. `AuditArchive.ts:140-146` and `Retention.ts:121-127` list the refusals and defer to the step. The "refuses it first" bullets at `ArchiveFacts.ts:120-136` mean "before archiving", not the step's order. BEH-QD-722's REQUIREMENTs still say "after the `now` check", and they link BEH-QD-781 as D-23 asks.
- **Verification run.** `vitest run --project audit` over the five new and edited runtime test files: 172 of 172 pass.

There is one Critical finding. The retention terms check (`maxAgeOf`) admits a `maxAgeMs` that is not a number, so three of the phase's new normative claims are false: BEH-QD-785, INV-QD-424 and ADR-QD-202 decision 5. The deletion selector also fails open. For example, `{ maxAgeMs: null }` purges every archived row, and I reproduced this. The coercion already existed on the base, but this phase states, as its own invariant, the opposite of what the code does.

The three Warnings:
- Four characterisation titles now state the opposite of what they assert.
- A runtime `filter` that does nothing, standing in for a type refinement (item 1).
- "Stated once" and the mutation floor are claimed as gate-enforced, but no merge gate can fail on them.

The Infos cover:
- the CCR-QD-481 note count (item 4);
- the pinned-check correction (item 3: honest, but looser than needed);
- overclaims and tests that cannot fail;
- stale prose.

## Critical Issues

### CR-01: `maxAgeOf` admits a non-number limit: the age rule re-coerces it per row, `null` purges everything, and a Symbol throws

**File:** `packages/audit/src/Retention.ts:88-100` (`maxAgeOf`), `:107-111` (`ageRule`). Spec: `spec/behaviors/33-audit-pipeline.md:1511-1525` (BEH-QD-785), `spec/invariants.md:4952-4954` (INV-QD-424), `spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md:94-98` (decision 5), `Retention.ts:10-21` (module doc).

**Issue:** `maxAgeOf` reads `policy?.maxAgeMs` once and admits any value for which `value >= 0` is true. It returns that value as `Result.succeed(value)`, typed `number`. JavaScript's relational coercion makes this admit values that are not numbers. I reproduced each case against the source (`node`, importing `src/Retention.ts`, one codec row 99 s old, `NOW = 100_000`):

| `maxAgeMs` given | Result |
| ---------------- | ------ |
| `null`, `false`, `""`, `[]` | admitted as a limit of `0`, so the row is **expired**. `planPurge` puts it in `purge` (control: `10_000_000` retains it) |
| `"5"`, `true` | admitted, compared as `5` and `1` |
| `{ valueOf }` returning `10_000_000` then `-Infinity` | the check sees `10_000_000`. The age rule (`batch.now - at > batch.terms`) calls `valueOf` **again for every row** and sees `-Infinity`, so every row is expired and purged (2 `valueOf` calls for 1 row) |
| `Symbol()`, `Object.create(null)` | **throws** `TypeError` from `planRetention` and `planPurge` |

These cases contradict the phase's own statements:

- **INV-QD-424:** "the limit a row is compared with [is] the value the check saw … No input is a defect, whatever the value given".
- **BEH-QD-785:** "compare each row with the number they checked, never with the policy read again".
- **ADR-QD-202 decision 5:** "return the number".
- **The `maxAgeOf` doc:** "refuses one that is not a number from zero up".
- **The module doc:** "Fail-closed for a deletion selector means retaining, never expiring".

For a deletion selector this fails open. A host whose config gives `maxAgeMs: null` to mean "no limit" gets every archived row selected for purge. The phase closed the same check-versus-use split for rows and key material, but left it open for the limit, through an object's `valueOf` instead of a getter. BatchReadOnce B1 to B5 only use a numeric getter, so no row can catch this.

**Fix:** refuse anything that is not a number. The closed enum is unchanged: `MaxAgeInvalid { value }` already carries what was given.

```ts
const maxAgeOf = (
  policy: RetentionPolicy,
): Result.Result<number, ReturnType<typeof RetentionInputRefusal.MaxAgeInvalid>> => {
  const value: unknown = policy?.maxAgeMs;
  return typeof value === "number" && value >= 0
    ? Result.succeed(value)
    : Result.fail(RetentionInputRefusal.MaxAgeInvalid({ value }));
};
```

Add BatchReadOnce rows that run each plan over `null`, `false`, `""`, `"5"`, `[]`, `{ valueOf }`, `Symbol()` and `Object.create(null)`, each expecting `MaxAgeInvalid` with the value given. Those rows are RED today. Record the behaviour change in the changeset: a string or boolean limit was admitted before.

## Warnings

### WR-01: SF1 to SF4 titles state the trace the rows assert is gone

**File:** `packages/audit/test/AdmissionOrder.characterisation.test.ts:457-472`

**Issue:** Commit `05d6e9da` flipped the assertions:
- SF1 and SF2 now expect `names: [WRITER]`, but their titles still say "opens its span and the sequence span".
- SF3 and SF4 now expect `names: []`, but their titles still say "opens only the sequence span".

These titles were held byte for byte because `89-pinned-check.mjs` declares the `spanFlips` region with `kept: [/^it(?:\.effect)?\("SF[1-4] /]`, and a kept pattern requires the matching base lines verbatim. So each title now says the opposite of what its row asserts. A regression back to the base trace would fail with a message that describes the regression as the expected behaviour. The phase rule "a test title names a property" is broken in the file that pins the span rule (BEH-QD-783). The `direct` region was loosened for exactly this reason (`22f41722`), but `spanFlips` was not.

**Fix:** retitle the four rows to what they assert, for example `"SF1 the writer refused for rows that are not a list opens only its own span"` and `"SF3 the verify refused for rows that are not a list opens no span"`. Rename the describe to "no sequence span on refused rows". If the pinned check is re-run, declare the region with its exact new lines (`becomes`).

### WR-02: Impossible-state guard: `taken.filter(Predicate.isNotUndefined)` is a runtime no-op that stands in for a refinement (item 1)

**File:** `packages/audit/src/HostBatch.ts:78-87` (and `:69-70`)
**Category:** necessity

**Issue:** The filter runs only after `rowsRefusal(taken)` has returned `undefined`. `rowsRefusal` refuses every element that is not an object the codec recorded (`CodecMade.ts:67-69`: `!(Predicate.isObjectKeyword(entry) && codecMade.has(entry))`), and that includes `undefined` and holes. So no element the filter could drop reaches it. The phase's own mutation close proves this: the `MethodExpression -> taken` mutant survives and is recorded as `EQUIVALENT` (`89-mutation-close.json`, 89-09-SUMMARY).

The filter exists only so the type changes from `Array<AuditEntry | undefined>` to `Array<AuditEntry>`. It is a cast written as a runtime pass, and it carries a permanent equivalent-mutant entry. It also suggests to a reader that holes can reach that line.

The same root cause produces the second wart (item 1b). `admitRows(entries: ReadonlyArray<AuditEntry>)` declares a list, but its body has a live non-list branch (`Array.isArray(entries) ? takeRows(entries) : entries`). The type checker sees that branch as unreachable, and the doc comment on the same function says "A value that is not a list is passed on unread". Pitfall 2 picked the typed parameter only because `unknown` would need either this filter or a second `EntriesNotAList`.

Both warts come from `rowsRefusal` answering `RowsRefusal | undefined` instead of a narrowed result. Under the owner rule (most complete and clean, monomorphize or use a type predicate, never a widening), the cleaner shape is a refinement where the evidence is: the codec's record.

**Fix:** give the codec check a narrowing answer and drop the filter.
1. Add an honest guard where the class and the record meet, in `AuditEntry.ts`. It already imports `CodecMade.ts`, so this adds no new edge: `export const isCodecMadeRow = (entry: unknown): entry is AuditEntry => entry instanceof AuditEntry && isCodecMade(entry);`. The `instanceof` gives the type and the `WeakSet` gives provenance. `CodecMade.ts` gains `isCodecMade(entry: unknown): boolean`, which is the predicate `rowsRefusal` already uses.
2. `admitRows(entries: unknown)`:

```ts
export const admitRows = (entries: unknown): Result.Result<AdmittedRows, RowsRefusal> => {
  if (!Array.isArray(entries)) return Result.fail(EntriesNotAList({ value: entries }));
  const taken: Array<AuditEntry> = [];
  const length: number = entries.length; // one read
  for (let index = 0; index < length; index += 1) {
    const entry: unknown = entries[index]; // one read per index
    if (!isCodecMadeRow(entry)) return Result.fail(EntryNotMadeByCodec({ index }));
    taken.push(entry);
  }
  return Result.succeed(new AdmittedRows(taken));
};
```

This removes the filter, the `EQUIVALENT` record and the parameter type that lies. The cost is that D-06's "`CodecMade.ts` byte-identical" constraint must give, and the two row constructors move to the step, so `rowsRefusal` can be deleted (`HostBatch.ts` is its only caller). If D-06 is to hold, the next-best shape is to keep the filter but record in its doc comment that it only narrows the type. A disguised predicate (`taken is …` decided by `refusal === undefined`) is worse than either.

### WR-03: "NowNotFinite is stated once" and the `HostBatch.ts` mutation floor are claimed as enforced by gates that cannot fail on them

**File:** `spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md:231-234`, `spec/behaviors/33-audit-pipeline.md:1507-1509` (BEH-QD-784 "Pinned by"), `spec/invariants.md:4948` (INV-QD-423 Enforcement)

**Issue:** BEH-QD-784's first REQUIREMENT ("`NowNotFinite { value }` MUST be declared once") cites only `HostBatch.tst.ts`. That file's pins are `toBe` equalities, and `Data.TaggedEnum` maps the keys of the intersection. A second declaration of `NowNotFinite: { readonly value: unknown }` in `Retention.ts`'s own cases gives the identical union. I compiled `TaggedEnum<Rows & Now & { MaxAgeInvalid; NowNotFinite: { readonly value: unknown } }>` against the pinned form with tsc: it is equal (exit 0). It differs only when the restated field type differs (exit 1), and that is why D-17 had to pick "another field type" for its RED variant. The declared-once rule is judged only by the phase-local `89-check.mjs admission-step`, and `pnpm check` does not run that.

Likewise, ADR-QD-202 says `pnpm mutation` ensures "`HostBatch.ts` has no open mutant but the recorded equivalent one". `stryker.audit.mjs` only breaks below 80% for the whole package (`thresholds.break: 80`), and the `EQUIVALENT` record lives in `.planning/…/89-mutation.mjs`. AGENTS.md §15 says a claim that CI does something is true exactly when that something is in `pnpm check`. The "mutation floor" wording does recur in earlier invariants, so that half is a repo convention, but the "stated once" half has no enforcement at all after the phase.

**Fix:** either:
- add a house-style rule, or a stated-once check in `scripts/check-house-style.mjs` (the member key `NowNotFinite:` and `EntriesNotAList:` declared in exactly one `packages/audit/src` file), and cite it;
- or restate BEH-QD-784's "Pinned by" and ADR-QD-202's "What enforces it" to say the tstyche pins hold the member set and field types, and that "declared once" is a review rule.

Reword the mutation line as "`pnpm mutation` holds the audit package at its 80% break threshold. The equivalent survivor is recorded in the phase record."

## Info

### IN-01: CCR-QD-481 says ADR-QD-110 gets "a dated note"; it holds two (item 4, confirmed)

**File:** `spec/README.md:418`. `spec/decisions/110-an-archives-facts-are-computed-once.md:40` and `:149`

**Issue:** ADR-QD-110 has two `> **Amended 2026-11-26 (ADR-QD-202).**` notes: one under the span-name bullet (line 40), and one under the third-amendment text (line 149), which D-22a added. The CCR row says "Rev 1.4 (amended: a dated note, the span keeps its name …)", which names only the first.
**Fix:** "two dated notes: the span keeps its name and opens only for admitted rows; and the rows are refused by the step before `verifiedArchiveFacts` runs".

### IN-02: The mid-phase pinned-check change (`22f41722`) is an honest correction, but looser than needed, and two records understate it (item 3)

**File:** `.planning/phases/QD-89-…/89-pinned-check.mjs:112, 120`. `packages/audit/test/AdmissionOrder.characterisation.test.ts:7-9`. `spec/decisions/202-…md:160-162`

**Issue:** Verdict: honest, not a weakening of intent. D-14 always said the brand commit "rewrites those rows" through `admitRows`. The base check's `kept: /^it\("F[1-5] /` required the base F titles verbatim, and those titles ("F1 rows that are not a list: EntriesNotAList") become false after the retyping. The `factsFailure` helper had to go because it passes a list to `verifiedArchiveFacts`, which no longer typechecks.

But the replacement is weaker than it needs to be:
- `direct` runs `to: null`, which is the end of the file.
- It now keeps only the describe line, so the check no longer requires any F row. All five could be deleted, or rows appended after them, and it would still pass.
- An exact `becomes: [...]` form, which every removal region uses, would have pinned the rewrite.

The file header (lines 7-9) names three edited regions and omits the helper. ADR-QD-202 line 161 says "two declared regions … moved". There are four regions: the import, `factsFailure`, `spanFlips` and `direct`.
**Fix:** in a future check, declare `direct` with its exact lines. Correct the ADR sentence to name the four regions, and the header to name the helper.

### IN-03: INV-QD-424's "No input is a defect, whatever the value given" fails for a Proxy list

**File:** `packages/audit/src/HostBatch.ts:69-70`. `spec/invariants.md:4954`

**Issue:** A Proxy over `[]` whose `length` answers `Infinity` makes `Array.from({ length: Infinity })` throw `RangeError: Invalid array length` (reproduced). This is a value, not a throwing accessor, so the invariant's exception does not cover it. On the base, `findIndex` looped for about 2^53 steps, so this is an improvement, but the absolute claim is false.
**Fix:** either refuse a `length` that is not a safe array length as `EntriesNotAList { value }`, or narrow the invariant: "a list whose `length` is not an array length is the host's own defect".

### IN-04: F3 and F4 claim "never reach verifiedArchiveFacts" but only assert `admitRows`

**File:** `packages/audit/test/AdmissionOrder.characterisation.test.ts:547-552`. `spec/decisions/202-…md:224-225`. `spec/invariants.md:4948`

**Issue:** F3 and F4 assert `admitRows(rowsNotList)` and `admitRows(rowItemBreak)`, which duplicates H17 and H5. Nothing in them involves `verifiedArchiveFacts`; the "never reach" half holds by the type. ADR-QD-202 and INV-QD-423 still describe F1 to F5 as "`verifiedArchiveFacts` over admitted rows".
**Fix:** retitle them as `admitRows` rows, or drop them as duplicates of H5 and H17, and describe F1, F2 and F5 accurately in the records.

### IN-05: `export const IMPOSSIBLE` is read by nothing

**File:** `packages/audit/test/AdmissionOrder.characterisation.test.ts:85-90`

**Issue:** D-14 requires impossible pairs to be "named as such". They are named as an exported constant that no test, helper or phase script imports or asserts (repo grep). It is documentation dressed as code, and an export from a test module.
**Fix:** make it a comment, or assert something with it, for example that the pair tables plus `IMPOSSIBLE` cover every pair of each entry point's faults.

### IN-06: The nominal pins in `HostBatch.tst.ts` have no positive anchor

**File:** `packages/audit/test/HostBatch.tst.ts:81-92`

**Issue:** All three brand pins are `not.toBeAssignableTo<AdmittedRows>()`, and the other two pins compare `AdmittedRows` with itself. If `AdmittedRows` collapsed to `never`, or to an unrelated class, every pin would still pass. AGENTS.md requires a positive twin only for negative callable and constructable pins, so this is not a house-rule breach.
**Fix:** add `expect<AdmittedRows>().type.toBeAssignableTo<{ readonly entries: ReadonlyArray<AuditEntry> }>()` so the negative pins are seen to fail for nominality, not for emptiness.

### IN-07: Stale or drifting prose around the moved age rule, and one line far past the hand-wrap width

**File:** `packages/audit/src/Retention.ts:12, 121`. `packages/audit/src/AuditArchive.ts:147`. `spec/behaviors/33-audit-pipeline.md:1216, 1467`

**Issue:**
- The module doc still says the age rule is "in {@link planRetention}", and `planRetention`'s doc opens with "The one age rule". The rule is now the private `ageRule` (`:107`), which both plans share.
- `AuditArchive.ts:147` is about 125 columns, in a doc block hand-wrapped at about 90 (AGENTS.md §17).
- The BEH-QD-722 and BEH-QD-784 listings show `export type NowRefusalCases` and `export type RowsRefusalCases` as API. BEH-QD-784's own REQUIREMENT says `NowRefusalCases` MUST NOT be exported from the package, so the listing reads as a package export.

**Fix:**
- Point the module doc at the private rule ("the age rule both plans run").
- Open `planRetention`'s doc with what it returns.
- Re-wrap line 147.
- Mark the two fragments in the listings as package-private (for example, a `// HostBatch.ts / CodecMade.ts, package-private` comment line).

---

_Reviewed: 2026-11-26T04:26:56Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
