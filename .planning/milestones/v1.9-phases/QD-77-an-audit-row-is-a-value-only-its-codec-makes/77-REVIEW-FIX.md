---
phase: QD-77-an-audit-row-is-a-value-only-its-codec-makes
fixed_at: 2026-11-24T08:00:00Z
review_path: .planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-REVIEW.md
iteration: 3
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase QD-77: Code Review Fix Report

**Fixed at:** 2026-11-24
**Source review:** `.planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-REVIEW.md` (iteration 3, with its binding "Orchestrator disposition, iteration 3")
**Iteration:** 3

**Summary:**
- Findings in scope: 5 (fix scope `all`: WR-01, WR-02, WR-03, IN-01, IN-02)
- Fixed: 5
- Skipped: 0

Fixes were made in the main checkout on `arch-wave-14` (`workflow.use_worktrees` is `false`, so no worktree was created). Verification ran in the main checkout, so every number below is reproducible from the tree. Nothing was pushed, tagged or released. `scripts/next-id.mjs` was never run; only the reserved ids ADR-QD-190, CCR-QD-469, BEH-QD-721 and BEH-QD-722, INV-QD-399 and INV-QD-400 appear.

## Fixed Issues

### WR-01: `archiveAuditTrail` checks `keyMaterial` and then re-reads it

**Files modified:** `packages/audit/src/AuditArchive.ts`, `packages/audit/test/ForeignRows.test.ts`, `spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md` (Rev 1.5), `spec/invariants.md` (Rev 1.212), `spec/README.md` (Rev 1.356)
**Commit:** `3b74c980`
**Applied fix:** as the disposition decided. `snapshotKeyMaterial` reads `options?.keyMaterial` once, refuses a non-list, and for each item builds a fresh `{ keyId, algorithm, publicKey }` from one read of each field by name (`Predicate.isObject` guards the item, no cast), checks that object with the module's `isKeyMaterial` and returns the checked objects. What is checked is what is written. The fields are read by name and not spread, because a spread copies own properties only and would refuse a class whose fields are accessors on its prototype; a test pins that class as the positive twin. An extra property is never read, so a `privateKey` still does not reach the archive.

This is a logic change: **fixed: requires human verification** (the read-once property is pinned by tests below, and the mutation close has 0 survivors, but the choice of by-name reads over a spread is a judgement).

### WR-02: INV-QD-399 says no input is a defect "whatever the value given", but a non-list `entries` threw

**Files modified:** `packages/audit/src/CodecMade.ts`, `packages/audit/src/ArchiveFacts.ts`, `packages/audit/src/Retention.ts`, tests, specs, docs (see the commit below)
**Commit:** `f64b6d69` (with WR-03, IN-01 and IN-02, which cannot be stated apart, see the note at the end)
**Applied fix:** not narrowed, as the disposition decided. `firstNotCodecMade(entries: ReadonlyArray<unknown>)` is replaced by `rowsRefusal(entries: unknown)`, which asks `Array.isArray` first and then the codec's record. `verifiedArchiveFacts` (so `archiveAuditTrail` and `verifySequenceIntegrity`) and `planRetention` (so `planPurge`) ask it, so every function that takes host rows refuses a non-list as a typed `EntriesNotAList` carrying the value given. It comes after `now`, `maxAgeMs` and `keyMaterial`, as the rows did. INV-QD-399's sentence is unchanged and now holds as written for `entries`.

Not done, and recorded: the review also lists a throwing accessor or a hostile `Proxy` on an input as a defect. The disposition names a non-list `entries` only, so that case is outside it. ADR-QD-190's third amendment says a throwing accessor is the host's own throw and not a value the check reads. The invariant's wording was not changed.

### WR-03: `ArchiveInputInvalid.value: unknown` overloads one slot

**Files modified:** as WR-02, plus `spec/overview.md` (Rev 1.139), `spec/behaviors/33-audit-pipeline.md` (Rev 1.32), `spec/invariants.md` (Rev 1.213), `spec/traceability.md` (Rev 1.293), `spec/decisions/056-audit-companion-package.md` (Rev 1.18), `spec/decisions/110-an-archives-facts-are-computed-once.md` (Rev 1.3), `spec/decisions/190-...md` (Rev 1.6), `spec/README.md` (Rev 1.357), `.changeset/audit-row-made-only-by-its-codec.md`, `apps/website/src/content/docs/docs/reference/upgrading.md`, `apps/website/src/content/docs/docs/packages/audit/capabilities.md`, `packages/audit/README.md`
**Commits:** `f64b6d69`, and `4e7d47bf` (a mutation-close fix, below)
**Applied fix:** `ArchiveInputInvalid { refusal: ArchiveInputRefusal }`, a `Data.TaggedEnum` modelled on `ArchiveNotVerified { refusal: ArchiveRefusal }`, with one member per case the writer and `verifySequenceIntegrity` refuse:

| Member | Carries |
| ------ | ------- |
| `NowNotFinite` | `value: unknown`, the value given |
| `KeyMaterialNotAList` | `value: unknown`, the value given |
| `KeyMaterialItemRefused` | `index: number` |
| `EntriesNotAList` | `value: unknown`, the value given |
| `EntryNotMadeByCodec` | `index: number` |

Declared in `ArchiveFacts.ts`, re-exported by `AuditArchive.ts` for the barrel. `unknown` appears only where a member holds a value the caller gave, `index` is always a `number`, nothing is overloaded. Consumers read refusals with `Match.tagsExhaustive`: the new `ForeignRows.test.ts` does for both enums, and the upgrade guide has a compiled `typescript` fence that does.

The two members both enums share are stated once, as `RowsRefusalCases` in `CodecMade.ts`; each enum is that type plus its own members, so `rowsRefusal`'s answer is assignable to both with no mapping. This was chosen over repeating the two members in each enum with a mapping, which is a second statement of the case. ADR-QD-190's third amendment, item 5, records it and the rejection.

### IN-01: `RetentionInputInvalid.value` is still `number`

**Commit:** `f64b6d69`
**Applied fix:** `RetentionInputInvalid { refusal: RetentionInputRefusal }`, with exactly its own cases: `NowNotFinite { value: unknown }`, `MaxAgeInvalid { value: unknown }`, `EntriesNotAList { value: unknown }` and `EntryNotMadeByCodec { index: number }`. Both errors now carry the same shape, as the disposition decided.

`RetentionInputInvalid` is older than this release (its changelog entry is in `packages/audit/CHANGELOG.md`), so its shape change is a break for a host that read `error.field` or `error.value`. The release is already marked Breaking; the changeset, the upgrade guide (a new table row and the handler paragraph) and ADR-QD-190 item 6 say it.

### IN-02: `README.md` leaves out the non-list `keyMaterial` value

**Files modified:** `packages/audit/README.md`
**Commit:** `f64b6d69`
**Applied fix:** the README names the non-list case, worded with the new refusal names: a `keyMaterial` that is not a list is `KeyMaterialNotAList` carrying the value given, and an item that is not key material is `KeyMaterialItemRefused` carrying the `index`. The `RetentionInputInvalid` sentence and the capabilities page say the same.

## Records

Gate 13 (`scripts/check-api-surface.mjs`) now reads `942 export(s) documented across 9 package(s)` (940 before): `spec/overview.md` has a row for each of `ArchiveInputRefusal` and `RetentionInputRefusal` (type plus constructors, as `ArchiveRefusal` is listed) and the `ArchiveInputInvalid`, `RetentionInputInvalid`, `archiveAuditTrail` and `verifySequenceIntegrity` rows are restated. Also updated: BEH-QD-253, BEH-QD-254 and BEH-QD-722 (requirements, the listing, the explanation and the pinned-by list), INV-QD-399, INV-QD-400 and INV-QD-101 (statement, source, enforcement), the traceability rows for those three and `ForeignRows.test.ts`, ADR-QD-190 (a third amendment of seven items, and a "superseded by" note on the two earlier items that stated the `field`/`value` pair), the one-line mentions in ADR-QD-056 and ADR-QD-110, and the CCR-QD-469 row (a paragraph, and every `Rev` in it refreshed by a script that reads each document's header). `node scripts/spec-revise.mjs --check` reports every revision matches. No budget moved, so no AGENTS.md table changed.

## Tests first, RED then GREEN

The tests were written before any source change and run on the iteration-2 head `6ad128bb` (source untouched). `pnpm exec vitest run packages/audit/test/ForeignRows.test.ts packages/audit/test/Retention.test.ts packages/audit/test/AuditArchive.test.ts packages/audit/test/ArchiveRoundTrip.test.ts`:

```
Test Files  4 failed (4)
     Tests  36 failed | 72 passed (108)
```

- Thirty-three of the 36 fail because the new constructors and the `refusal` field do not exist on HEAD (`TypeError: Cannot read properties of undefined (reading 'EntryNotMadeByCodec')`, `'NowNotFinite'`, `'KeyMaterialItemRefused'`, `'KeyMaterialNotAList'`, `'_tag'`): the existing refusal tests, rewritten to expect a `refusal`, and the new `Match.tagsExhaustive` reading tests.
- Three of them reached the old defect itself: the non-list `entries` tests for `archiveAuditTrail`, `verifySequenceIntegrity` and `planRetention` failed with `TypeError: Cannot read properties of undefined (reading 'findIndex')`.
- Two are the WR-01 accessor probes, which fail on HEAD for the reason the review gave: `AssertionError: expected 2 to equal 1` for "a keyMaterial list is read once, so what is checked is what is written" and "an item field is read once, so a value that changes after the check is never archived" (the item probe's getter answers `"a"` first and a number second).
- The positive twins pass on HEAD and after: the class whose fields are accessors on its prototype, a list read as before (rows the codec made, and none) through all four functions, and key material the reader reads.

Each non-list test has the positive twin "a list is read as before: rows the codec made, and none". The order tests pin that `now`, `maxAgeMs` and `keyMaterial` are read before the rows.

**GREEN:** `pnpm exec vitest run packages/audit`: `Tests 618 passed (618)` (606 before, 12 new). `pnpm typecheck`, `pnpm exec oxlint packages/audit` and `node scripts/check-house-style.mjs` (`590 file(s) clean`) are clean.

**Each new check seen failing once**, on scratch edits restored from a copy:
- the list guard in `rowsRefusal` replaced by `false`: `Tests 5 failed | 35 passed (40)` in `ForeignRows.test.ts`.
- the list guard in `snapshotKeyMaterial` replaced by `false`: `Tests 2 failed | 38 passed (40)`.
- the item snapshot replaced by the item itself (the second read back): `Tests 3 failed | 37 passed (40)`.
- the `maxAgeMs` check replaced by `false`: `Tests 8 failed | 58 passed (66)` across `ForeignRows.test.ts` and `Retention.test.ts`.
- gate 13: the name `RetentionInputRefusal` renamed in `spec/overview.md`: `[missing] RetentionInputRefusal is exported by @qadi/audit and is not named in spec/overview.md` and a `[stale]` row, 2 drifts; restored, `942 export(s) documented`.

## Mutation close

Re-run with `77-mutation.mjs` for every touched group, one Stryker run per file (about one minute each, so each fits a 600000 ms timeout; the five ran in sequence under one background script with `stdin` closed), `record close entry --restart` first, on head `4e7d47bf` (the last commit that changed anything under `packages/`). `77-mutation-base.json` is unchanged. `node 77-mutation.mjs compare` exits 0 and `--self-test` ends `self-test: 31 passed`. `77-mutation-close.json` is re-committed (`13c0b7c7`).

| Group | File | Base | Close | Survived | NoCoverage | Ignored (base to close) |
| ----- | ---- | ---- | ----- | -------- | ---------- | ----------------------- |
| entry | `AuditEntry.ts` | 17/17 | 13/13 | 0 | 0 | 8 to 6 |
| facts | `ArchiveFacts.ts` | 66/66 | 55/55 | 0 | 0 | 4 to 4 |
| archive | `AuditArchive.ts` | 53/53 | 82/82 | 0 | 0 | 14 to 14 |
| retention | `Retention.ts` | 59/59 | 57/57 | 0 | 0 | 2 to 2 |
| made (close-only) | `CodecMade.ts` | none | 18/18 | 0 | 0 | none |

No survivor, so no test was added for the close. The first close (head `f64b6d69`) read `retention` 55/55 with one new Ignored mutant, `ArrowFunction -> () => undefined`: the module-scope `refuse` helper I had added to `Retention.ts` was a static arrow function Stryker ignores, and `compare` exits 1 on a new Ignored mutant. It was removed rather than excused by hand (`4e7d47bf`: each of the three refusals builds its `RetentionInputInvalid` where it is made, as the code did before the helper), the whole record was restarted on the new head, and `compare` then exited 0 with no new Ignored mutant. The scorer's `EXAMINED` table stays empty.

## Gate

`pnpm check:pr < /dev/null`, run in the main checkout on head `13c0b7c7` through `nohup` with an `EXIT:` marker (`$TMPDIR/qd77/checkpr-fix3.log`), waited on with a bounded `until grep -q EXIT:` loop.

**Exit status 0**, 17 of 18 steps (the log ends `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).`). Typecheck, lint (`house-style: 590 file(s) clean`), circular, tstyche, coverage (258 files, 6434 tests; All files 99.65% statements, 98.66% branches, 99.56% functions, 99.82% lines), bdd (34 files, 568 tests), spec examples (`doc-examples: 118 block(s) compile`), strict traceability (`PASS: 21 FAIL: 0`), gates (`dod-table: 26 step(s) match pnpm check, 159 reference(s) resolve`), claims, `api-surface: 942 export(s) documented across 9 package(s)`, package install, example, website examples (`website-doc-examples: 73 block(s) compile`, one more than before for the new handler fence), website, publish dry check and bench self-test all pass. Nothing under `packages`, `spec`, `scripts`, `apps` or the manifests changed after `4e7d47bf`; `13c0b7c7` is a `.planning` file only.

Also run on the way: `pnpm typecheck`, `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict`, `pnpm spec:gates`, `node scripts/check-website-doc-examples.mjs`.

## Skipped Issues

None.

## Notes for the orchestrator

- Commits, in order: `3b74c980` (WR-01), `f64b6d69` (WR-02, WR-03, IN-01 and IN-02 together), `4e7d47bf` (a source fix the mutation close asked for), `13c0b7c7` (mutation close record). Each ends with the `Co-Authored-By` trailer; none used `--no-verify`. Staged by explicit path only; `.planning/config.json`, `77-REVIEW.md` (modified by the review step), `.agents/`, `.codex/` and every `*REVIEW*.iter*.md` were left alone; this report is not committed.
- WR-02, WR-03, IN-01 and IN-02 are one commit on purpose. The non-list `entries` refusal is a member of the new enum (`EntriesNotAList`), the two enums share it from one type in `CodecMade.ts`, and the README's non-list `keyMaterial` sentence is written in the new names; stating the non-list refusal on the old `field`/`value` pair would have reintroduced the overloaded slot WR-03 removes. WR-01 is its own commit, built on the old shape and re-based by the next.
- Breaking, inside the release already marked Breaking: `RetentionInputInvalid` and `ArchiveInputInvalid` carry a `refusal` in place of `field` and `value`, and two exports are new (`ArchiveInputRefusal`, `RetentionInputRefusal`, each a type and its constructors). A non-list `entries` was a defect and is a typed failure.
- Named, not fixed: a throwing accessor or a `Proxy` on an input (the review's aside under WR-02). The disposition limits WR-02 to a non-list `entries`; ADR-QD-190 says where the line is.

---

_Fixed: 2026-11-24_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
