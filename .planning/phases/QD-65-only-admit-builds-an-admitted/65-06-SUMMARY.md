---
phase: QD-65-only-admit-builds-an-admitted
plan: 06
subsystem: testing
tags: [stryker, close-scan, merge-gate, requirements]
phase_base: d1ac1df0629e95797f406c5c46da364e6542dce2

requires:
  - phase: QD-65-only-admit-builds-an-admitted
    provides: 65-01 to 65-05 (the pins, the private-constructor class, the single-read derivation, the bench verdict, the records)
provides:
  - 65-mutation-close.json, the Stryker close counts of the three admission files
  - the 30-check close scan over the whole phase range, green
  - the diff review of `packages` and the 28-row edge coverage table
  - the merge gate (`pnpm check:pr`) read once on the scanned tree
  - ADMT-01 to ADMT-04 recorded complete
affects: [v1.7 milestone audit]

plan_head_before: 05b6c06ee754fa52abe273bdcd447605da01f644
plan_head_after: 0e4a1d7acfbf3dbec54557a8b8e849e19cce7422
commits: 2

tech-stack:
  added: []
  patterns:
    - "the close is a scratch scan over the phase range, the committed scorer's compare and one merge-gate run on the tree the scan read"

key-files:
  created:
    - .planning/phases/QD-65-only-admit-builds-an-admitted/65-mutation-close.json
    - .planning/phases/QD-65-only-admit-builds-an-admitted/65-06-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md

key-decisions:
  - "None beyond the plan: no score fell, so no test was added and no packages/*/src file was touched after the bench"

requirements-completed: [ADMT-01, ADMT-02, ADMT-03, ADMT-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07]

duration: about 70 min
completed: 2026-11-20
status: complete
---

# Phase 65 Plan 06: The close Summary

**The phase is closed on one tree: the Stryker close run shows no file's score fell (`Admission.ts` rose from 18/18 to 20/20), the 30-check close scan is green over `phase_base..HEAD`, and `pnpm check:pr` ran once and alone on that tree; ADMT-01 to ADMT-04 are ticked and WX-01 to WX-07 stay Pending.**

## Close scan

`node <S>/close-scan.mjs d1ac1df0629e95797f406c5c46da364e6542dce2` (`<S>` is `$TMPDIR/qd65`; the lexer's SHA-256 is `3efe72bd03e3929dbb6c1d5056f0e6226906c23b5d63b5508a2bdd4b2cae7d06`, and `close-scan.mjs` is head, lexer and tail byte for byte). Its output, verbatim:

```text
ok   the touched packages/*/src file is Admission.ts alone: packages/core/src/Admission.ts
ok   exactly the 9 planned files changed outside .planning: packages/core/src/Admission.ts, packages/core/test/Admission.test.ts, packages/core/test/WalkEnvironment.tst.ts, spec/README.md, spec/behaviors/05-evaluator.md, spec/decisions/172-admission-produces-the-one-walk-environment.md, spec/decisions/index.yaml, spec/invariants.md, spec/traceability.md
ok   no changeset, no tag on the phase's commits and no release or version commit:   
ok   the RED commits land before the class and the derivation, and each of those holds only Admission.ts: pins 1, cases 2, class 6 [packages/core/src/Admission.ts], derivation 10 [packages/core/src/Admission.ts]
ok   the bench is the last executable change: it measured HEAD's packages/*/src and no later commit touches them: 6843e25e54d4bee5d1af1c5e2ba94cd88d95b3af 
ok   the bench gate passed over 35 workloads, 3 + 3, its patch the committed source back to phase_base: 35 rows; patch matches
ok   Admission.ts: a private constructor, the nominal member, a static admit, the one construction inside the class, and admit exported as Admitted.admit: new 1, private constructor 1, static admit 1
ok   Admission.ts reads the question's resource and action once each, and SUPPLIED reads the context admit built: resource 1, action 1
ok   the two pins refuse for the reasons they name: TS2673 on the constructor call, TS2741 on the literal, and nothing else: TS2673 new Admitted("asked", policy, subject, { action: true, resource: true }, matcherContext, 7); | TS2741 const forged: Admitted<"asked"> = {
ok   no forbidden construct, clock or timer added to Admission.ts
ok   no forbidden construct, clock or timer added to the two test files
ok   no Stryker disable added
ok   no plan, decision, requirement, change or phase id added under packages (169 added run(s))
ok   no plan, decision, requirement or phase id added under spec/ (95 added run(s))
ok   the unused ids appear only in the CCR-QD-456 row; BEH-QD-661, BEH-QD-662, INV-QD-375 and INV-QD-376 exist once each: 1 unused-id line(s)
ok   no old-contract sentence remains
ok   INV-QD-376 says the compiler does not check the asked flags: The supplied flags and the matcher context come from one read of the question `a
ok   the 4 pins WalkEnvironment.tst.ts held at phase_base are unedited, the keyof Admitted pin among them
ok   Admission.test.ts gains lines only and LeafMatrix.test.ts is unchanged: 0 removed line(s); 
ok   WalkEnvironment.tst.ts keeps 2 negative callable pins and no constructable pin: 2 callable, 0 constructable
ok   one CCR-QD-456 row, citing every spec document the phase revised at its current Revision, and naming the unused ids: 1 row(s); cited [spec/README.md,spec/behaviors/05-evaluator.md,spec/decisions/172-admission-produces-the-one-walk-environment.md,spec/invariants.md,spec/traceability.md]; 
ok   house-style clean, line unchanged: house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))
ok   oxlint clean on packages/core, the committed scorer and the pin-code reader
ok   939 exports documented
ok   gate 11 (node scripts/check-dod-table.mjs) at 25 steps; package.json, the DoD, the overview, AGENTS.md and scripts unchanged
ok   verify-traceability --strict: PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
ok   spec-revise --check, devtools claims and doc examples: 0 0 0
ok   the mutation compare holds, against a base recorded at phase_base: base head d1ac1df0629e95797f406c5c46da364e6542dce2
ok   no untracked file under packages, scripts, spec or .changeset (no probe or scratch copy left)
ok   every phase commit (22) carries exactly the trailer Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
close-scan: 30 of 30 check(s) green
```

## Mutation

Invocation (recorded as `invocation` in both records): `pnpm exec stryker run stryker.config.mjs --mutate packages/core/src/Admission.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts`, run alone with stdin closed (1 minute 29 seconds). `65-mutation-base.json` has `head` `d1ac1df0629e95797f406c5c46da364e6542dce2` (`phase_base`); `65-mutation-close.json` has `head` `05b6c06ee754fa52abe273bdcd447605da01f644`. `node <D>65-mutation.mjs compare` printed:

```text
packages/core/src/Admission.ts 18/18 -> 20/20, ignored 4 -> 3
packages/core/src/Predicate.ts 280/280 -> 280/280, ignored 22 -> 22
packages/core/src/Walk.ts 260/273 -> 260/273, ignored 27 -> 27
no touched file's score fell
```

| File | Detected / valid at base | Detected / valid at close | Ignored at base | Ignored at close |
| ---- | ------------------------ | ------------------------- | --------------- | ---------------- |
| `Admission.ts` | 18/18 | 20/20 | 4 | 3 |
| `Predicate.ts` | 280/280 | 280/280 | 22 | 22 |
| `Walk.ts` | 260/273 | 260/273 | 27 | 27 |

`Walk.ts` has 273 valid mutants and 260 detected (259 killed, 1 timeout), so 13 are open: 11 `Survived` (nine `depth - 1` arithmetic mutants and two `{}` object literals at `:705` and `:812`) and 2 `NoCoverage` string literals at `:434` and `:486`. The base held the same 13 (65-01's prose counted 11 open and seven `depth - 1` mutants; the record and the compare are right, and that sentence in 65-01's summary was a miscount). The compare matches open mutants by status, mutator, replacement and line text, so no file has an open mutant the base did not have.

`Admission.ts` holds 20 valid mutants where the base held 18, and 3 ignored where it held 4: the rewrite into a class with a static method moved two statements from the ignored (static) set into the valid set. All 20 are detected. This is stated from the counts only; the mutants were not listed one by one.

## Diff review

`git diff d1ac1df0629e95797f406c5c46da364e6542dce2 -- packages` (3 files, 169 insertions, 42 deletions) read hunk by hand.

`packages/core/src/Admission.ts`:

- The `SUPPLIED` doc says the `"asked"` row's flags are `boolean` and "the type does not check them", that they agree with the matcher context because each row reads that context, which `admit` built from one read of the question, "and the tests pin it". It claims no compile-time check of the flags. The rows' parameter is now `(context: MatcherContext)`; the `"row"` row keeps `resource: true`.
- The `Admitted` doc says only `Admitted.admit`, exported as `admit`, builds one, that the constructor is private and the private `nominal` member keeps an object literal of the same shape from passing for one, and that the policy rides with it "as `admit` read it from the question; the depth check reads the question's policy separately". That last clause is the honest statement of the second read of `policy`: it does not claim every field is read once.
- The `nominal` doc says it is declared only and has no slot at run time, which the emitted `Admission.d.ts` and `Admission.js` showed in 65-02.
- The `admit` doc says "the question's resource and action are each read once"; the code reads `question.resource` once and `question.action` once (the close scan counts both), and still reads `question.policy` twice, `question.maxDepth` twice and `question.subject` twice, which the doc does not deny. It names `Admitted` and never `this` (the scan finds no `this` in code), so the detached `export const admit = Admitted.admit;` is sound.
- The two `INV-QD-` ids in doc comments are spec ids, house style; no plan, decision, requirement, change or phase id is in the file.

`packages/core/test/WalkEnvironment.tst.ts`:

- The first directive's text is the compiler's TS2673 message without its trailing period: `Constructor of class 'Admitted<Source>' is private and only accessible within the class declaration`. The second is TS2741's message with the object type elided as `...`: `Property 'nominal' is missing in type ... but required in type 'Admitted<"asked">'`. The elision is not the compiler's verbatim text; the reason it names (the missing `nominal`) and the code it holds (TS2741, read by number by `pin-codes.mjs`) are the compiler's.
- Each refusal sits in its own test beside a positive control on `admit` (`expect(admit(question, "asked")).type.toBe<...>()` and the `built.success` assignment). The four tests the base held are unedited.

`packages/core/test/Admission.test.ts`:

- A new `describe` of four cases (E7 to E10), added lines only. The titles carry the local case labels `E7` to `E10` and no decision, plan, requirement or phase id; the leak scan found none. Each getter counts its reads and asserts the count is 1, and compares the flag with the matcher context.

Nothing under `packages` outside these three files changed; `Walk.ts`, `Predicate.ts` and `index.ts` are byte-identical to `phase_base`.

## Edge coverage

| # | Requirement | Category | Disposition | Evidence |
| - | ----------- | -------- | ----------- | -------- |
| 1 | ADMT-01 | adjacency | explicit | 65-02's variants (`public constructor: TS2741`, `no nominal member: TS2673`); the close scan's pin-code check reads `TS2673` on the constructor call and `TS2741` on the literal and nothing else |
| 2 | ADMT-01 | empty | explicit | `65-RED-EVIDENCE.md` `## RED on the base`: two TS2578, `2 failed` in each tstyche pass, `pin-codes.mjs` reading nothing |
| 3 | ADMT-01 | ordering | explicit | Close scan: the pins commit (index 1) before the class commit (index 6); each refusal sits beside its positive control in the same test (diff review above) |
| 4 | ADMT-02 | unclassified | flagged | Flagged for review: the lock holds in type-checked code only (see `## Flagged for review`) |
| 5 | ADMT-03 | unclassified | flagged | Flagged for review: `policy`, `maxDepth` and the subject are still read twice |
| 6 | ADMT-04 | unclassified | flagged | Flagged for review: one host, one 3 + 3 run, loads recorded in `65-BENCH.md` (verdict: pass, `# slower: 0`) |
| 7 | WX-01 | adjacency | explicit | Close scan: gate 11 (`node scripts/check-dod-table.mjs`) at 25 steps; the `check:pr` log's `ran 16 of 17 steps` line is in `## Merge gate` |
| 8 | WX-01 | empty | explicit | Task 2 reads both the recorded exit status and the last log line; both are in `## Merge gate` |
| 9 | WX-01 | ordering | explicit | `check:pr` ran once, after the Stryker close and the close scan, on the scanned tree (`## Merge gate` gives the head and the diff since it) |
| 10 | WX-02 | adjacency | explicit | 65-05 records: ADR-QD-172 Rev 1.1 with its Status row, index entry, amendment before `## Related` and amended row; close scan `verify-traceability --strict` PASS 21 |
| 11 | WX-02 | empty | explicit | Close scan: ADR-QD-178 and BEH-QD-663–665 appear on one tracked line outside `.planning`, the CCR-QD-456 row |
| 12 | WX-02 | encoding | explicit | Close scan: the CCR-QD-456 row cites the five revised spec documents at their current Revisions and ends `Unused: ADR-QD-178, BEH-QD-663–665. |` (en-dash range) |
| 13 | WX-02 | ordering | explicit | 65-05 `trace-red.log` (`PASS: 19   FAIL: 2`) before the rows; the close scan finds the one CCR-QD-456 row and `spec-revise --check` exits 0 |
| 14 | WX-03 | adjacency | explicit | Close scan: `api-surface: 939 export(s) documented across 9 package(s)` at close, the same figure as the base facts in 65-01 |
| 15 | WX-03 | empty | explicit | Close scan: `index.ts`, `spec/overview.md` and `scripts` have no diff from `phase_base`; `git diff --stat -- packages` lists the three files only |
| 16 | WX-03 | encoding | explicit | 65-02: the emitted `Admission.d.ts` holds `export declare const admit: typeof Admitted.admit;`, `private constructor();` and `private readonly nominal;` |
| 17 | WX-03 | ordering | explicit | Close scan: `spec/overview.md` is in the untouched list and the list was empty |
| 18 | WX-04 | adjacency | explicit | Close scan's whole-word scan on blanked code, each file against its own `phase_base` text: no forbidden construct, clock or timer added to `Admission.ts` or the two test files |
| 19 | WX-04 | empty | explicit | Only `Admission.ts`, `Admission.test.ts` and `WalkEnvironment.tst.ts` are scanned for added constructs; the diff review above read the rest |
| 20 | WX-04 | encoding | explicit | The scan blanks comments and string text (a template's `${…}` kept); the plan-time planted `x as number` was found and `// as any` was not, and a planted `ADMT-01` in a test title was found |
| 21 | WX-04 | ordering | explicit | Close scan: `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`, and `package.json`, the DoD table, the overview, `AGENTS.md` and `scripts` unchanged |
| 22 | WX-05 | boundary | explicit | The compare decides by integer cross-multiplication: 18/18 to 20/20, 280/280 equal and 260/273 equal all pass; coverage thresholds are held by the coverage run inside `check:pr` (`## Merge gate`) |
| 23 | WX-05 | precision | explicit | The compare reads counts by status, not Stryker's percentages, and matches open mutants by status, mutator, replacement and line text |
| 24 | WX-05 | concurrency | explicit | Stryker ran alone with stdin closed by the recorded invocation, nothing else running; `record close` refuses a report whose source is not the file on disk and wrote the record |
| 25 | WX-06 | adjacency | explicit | 65-02's variants (one half of the lock each) and 65-03's variants (one re-read fact each), recorded in `65-RED-EVIDENCE.md` |
| 26 | WX-06 | empty | explicit | Both pins and E7 to E9 red on the base (65-01), the variants (65-02, 65-03), the register RED (65-05) and the close scan's planted constructs (plan time) |
| 27 | WX-06 | ordering | explicit | Close scan: pins at log index 1 and cases at 2, then the class at 6, then the derivation at 10, each of those two holding only `Admission.ts`; the Stryker base was recorded first (`9cc5b766`) |
| 28 | WX-07 | unclassified | flagged | Flagged for review: the leak scan's patterns and the version-packages pull request (see `## Flagged for review`); the diff review above |

## Flagged for review

The four assumptions in this plan's `must_haves.assumptions`, unresolved and flagged for the owner:

1. **ADMT-02.** The lock holds where code is type-checked. At run time `Admitted` is an ordinary class: plain JavaScript or `Reflect.construct` can call its constructor, and a type assertion can claim an `Admitted`. The house style forbids `as` and the close scan refused none added, but no run-time guard exists, by the context's choice of a declared-only brand with no run-time slot. ADR-QD-172's amendment and INV-QD-375 say so.
2. **ADMT-03.** Beyond the two facts the flags describe, `admit` still reads `question.policy` twice (the depth check and the stored environment), `question.maxDepth` twice (the comparison and the stored bound) and the subject twice. A question whose `policy` getter answered a shallow tree and then a deep one would pass the depth check and carry the deep tree. The phase is scoped to the resource and the action; this is flagged, not changed.
3. **ADMT-04.** The bench verdict is about this host, these 35 workloads and one run of 3 + 3. The band absorbs the base's own spread, and the load is logged around every run rather than waited for, as in Phase 59; a loaded host widens the band. `65-BENCH.md` records the loads, and no re-run was made to change the verdict.
4. **WX-07.** The leak scan's patterns (`\bD-?\d{1,2}\b`, `\b(ADMT|WX)-0\d\b`, `\b65-0\d\b`, `[Pp]hase 6\d`, `QD-65`, and under `packages` also `ARCH-` and `CCR-QD-` ids) catch the spellings this repository uses; another spelling would pass, so the diff review above read the added titles, comments and directives by hand. Nothing released is checked as no changeset, no tag containing the base and no release commit; a version-packages pull request lives outside the tree and no script here reads it.

**The pin form against the context's `toRaiseError` wording** (from 65-01's summary). The context locked each construction refusal as a `@ts-expect-error` plus a tstyche `toRaiseError(<code>)`. One expression cannot carry both: tstyche's suppressed-error check consumes the diagnostic the directive suppresses, so `toRaiseError` on that expression reports "Expression did not raise a type error", and a `toRaiseError` on a second copy of the expression without a directive is a real error under `pnpm typecheck`. Each refusal is therefore the form `PolicyArity.tst.ts:1-18` already uses: a directive whose text is the compiler's own message, which `pnpm typecheck` holds by TS2578 and tstyche holds as a matched suppression, with the code read by number by the committed `pin-codes.mjs`. The second directive's text elides the object type with `...` (diff review above).

**One count to look at.** `Admission.ts` holds 20 valid mutants at close where the base held 18, and 3 ignored where it held 4; the shape change moved two mutants out of the ignored set, all 20 are detected, and the base's own difference from Phase 59 (15 valid) was also left uninvestigated in 65-01.

## Deviations from Plan

None - plan executed exactly as written. No score fell, so no `test(65-06)` commit was made; no file under `packages`, `spec`, `scripts` or `.changeset` changed in this plan.

## Known Stubs

None.

## Threat Flags

None.

## Task Commits

1. **Task 1 (tracer): the Stryker close, the compare, the 30-check close scan, the summary** - the `docs(65-06): close scan, mutation compare, edge coverage and diff review` commit
2. **Task 2: the merge gate and ADMT-01..04 complete** - the `docs(65-06): ADMT-01..04 complete` commit


## Merge gate

`pnpm check:pr < /dev/null` ran once, alone, in the foreground on head `ef97dc58174a8f8607b19798ef4b3025089e28f2` (the close commit, the tree the scan read), from 19:11:16Z to about 19:13:50Z (about 2 min 35 s). Exit status `0`. Its log's last line:

```text
run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).
```

The coverage step (`pnpm coverage`, 5 of 16) passed its thresholds (`All files 99.61 | 98.46 | 99.48 | 99.83`), and the traceability step printed `known, tracked gap unchanged`. The tree differs from that head only by `.planning/REQUIREMENTS.md` and this summary, which the next commit holds: ADMT-01 to ADMT-04 are ticked `[x]` and `Complete` there, and WX-01 to WX-07 stay `[ ]` and `Pending` (they span every v1.7 phase and wait for the milestone audit).

## Self-Check: PASSED

`65-mutation-close.json` and this summary exist; the close commit `ef97dc58` is on `arch-wave-12` after `phase_base`; the Task 1 verify exited 0 and `check:pr` exited 0.
