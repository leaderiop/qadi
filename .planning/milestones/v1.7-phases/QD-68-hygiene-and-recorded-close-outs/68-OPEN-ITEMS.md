# Phase 68 input: open items left by phases 62 to 67 (milestone v1.7)

Compiled 2026-11-21 on `arch-wave-12` at `c9498175`. Every item was re-checked against the tree as it is today.
Nothing in this file has been fixed, and no other file was changed.

**Sources read:** `NN-REVIEW.md` and every `.iter*.md`, `NN-REVIEW-FIX.md`, `NN-VERIFICATION.md`, `NN-SECURITY.md`
("Not threats" lists), every `NN-0K-SUMMARY.md` ("Flagged", "Deviations"), and the `[Phase 62..67]` lines in
`.planning/STATE.md`. Line numbers are as of today and several moved since the reviews (noted per item).

**How to read the risk notes.** "Bench" means a hot-path file (`Walk.ts`, `Admission.ts`, `DecisionCache.ts`,
`SharedComputation.ts`) where a source change needs a bench gate. "Mutation base" means a per-file Stryker base taken
before the first edit. "Pinned" means a file whose phase verification or a gate cites it.

**Phase 68 overlap:** none of the items below is one of HYGN-01..06 as written. OI-08 is adjacent to HYGN-02 (same
kind of stale test text, different file, not named there). OI-03's over-width lines are outside HYGN-01, which
names three lines only ("Change only the named over-width lines", ROADMAP planning notes).

## Dropped (checked, not open)

| Candidate | Why dropped |
| --- | --- |
| 62 WR-01..WR-03, IN-05/IN-06 of iteration 2 | Fixed (630519f3, 4cf8ee88, 198ac3f7, 76a617e9, 1d4e9929), re-reviewed clean. |
| 62 summary: `pnpm lint` warning at `scripts/run-tstyche.mjs:40` (`no-control-regex`) | Fixed in d232723a. `oxlint scripts/run-tstyche.mjs` prints nothing today. |
| 63 WR-01 (DiagnosticsOptions refusal and `*Like` types unheld) and WR-02 / iter2 WR-01 (false mitigation claim) | Fixed in 81847868, f4398b04, b5310eb7. `REFUSED_SHAPE_PROBES` and the `shortcut:` note read correctly. |
| 63 iter2 IN-01 (script comments overstate "directive on another property") | Fixed in b5310eb7; the iteration-3 review is clean. |
| 64 WR-01 as a *text* defect | The five amended texts were fixed in 87267447. The *code* half is still open: OI-09. |
| 65 WR-01 (read-once overclaim) and IN-01 (INV-QD-364 cited for INV-QD-376) | Fixed in a23dacf1 and c0be0db8. `Admission.ts:108` cites INV-QD-376. |
| 66 WR-01 (INV-QD-097 contradiction), IN-01, IN-04 (statistic unnamed), IN-05 (ragged wrap), IN-06 (`Either` helper) | Fixed in a25de426, 179285d1, 2b8e3249, 5435e2fc. `grep Either packages/core/test/UntrustedDecode.test.ts` finds nothing. IN-04's `ab.sh` half is open: OI-24. |
| 66 IN-03 in **67's** scorer copy | Fixed there: `67-mutation.mjs` maps lines with `mapLine`/`hunks` over `git diff -U0` and counts with `bag(...)`/`new Map`. It is still present in **66's own** copy: OI-23. |
| 67 WR-01 (scorer records from a dirty tree) and IN-03/IN-04 of iteration 1; iteration-2 IN-04 | Fixed in 4dce107b, 36036666, e5c18e6f, 82f87b4f. `refuseDirty()` is called at `67-mutation.mjs:166` and `:179`. Its call sites are untested: OI-25. |
| 62-02 PIN-03 / PIN-02 etc. "Flagged for review" | Record-only; gathered in OI-28. |
| 62 `SECURITY`, `VERIFICATION` | No open items beyond those already listed (62-SECURITY has no "not threats" list). |

---

## Class: wording

### OI-01 Three descriptions of the characterisation omit or overstate the third block
- **source:** 62, `62-REVIEW.md` (iteration 3) IN-05. STATE.md line 825 says "a wording IN-05" is open.
- **file:line now:** `packages/core/test/FloatingEffectPins.tst.ts:27-29`; `spec/decisions/175-a-negative-type-pin-can-fail.md:42-48`; `spec/traceability.md:514` (was 508).
- **what is wrong:** The test header says "Each block's title carries the text its skip uses" although the directive block has no skip text, the ADR's "The tool's reading is pinned" paragraph names two readings not three, and the traceability row never mentions the block that holds the pins under the config alone.
- **the smallest fix:** Reword the header to "the two blocks that skip carry the text their skip uses", add one clause to the ADR paragraph and the traceability row, and bump through `spec-revise`.
- **evidence it still holds:** header reads "Each block's title carries the text its skip uses, and the text appears once" (line 27); ADR lines 42-47 describe only the `fixme` reading and the directive reading; traceability row 514 ends "below the in-file directive ... the same negative pins pass".
- **risk notes:** Pinned characterisation file (`FloatingEffectPins.tst.ts`; `run-tstyche.mjs` counts the two skip texts in the lower-cased whole file and requires each exactly once, so a header edit must not add `under the tstyche tsconfig` or `under tsconfig.test.json` a second time). Comment-only, no mutation base. Spec edits need `spec-revise` and keep the README CCR-QD-453 row's cited revisions aligned. Phase 62 is what HYGN-06 re-verifies, so do this before that sweep.

### OI-02 "A throw during a publish from the poll is stated as the poll's stop" holds only if the `Stopped` publish does not also throw
- **source:** 64, `64-REVIEW.md` IN-01 (also `64-SECURITY.md` not-threats, `64-VERIFICATION.md`).
- **file:line now:** `packages/devtools/src/model/DiagnosticsFeed.ts:97-103` (the `subscribe` doc of `DiagnosticsReadout`).
- **what is wrong:** The sentence reads as stronger than the code: a listener that throws on `Live` is the likeliest to throw on `Stopped`, which is a defect inside a finalizer (`SupersedingRun.ts:118-124`), so the status stays `Live` with a dead poll.
- **the smallest fix:** Append "unless a listener throws on that `Stopped` publish too, in which case the status stays as it was."
- **evidence it still holds:** line 100 still reads "A throw during a publish from the poll is stated as the poll's stop." with no qualifier.
- **risk notes:** Comment only in `@qadi/devtools` src; no mutation base needed (token-identical). Cited by 64 verification. If OI-03 is done in the same pass, make both edits in one comment-only commit and prove it with the token-stream comparison 65/66 used.

### OI-03 The timeline resize caveat says "a new source" where a capacity-only `configure` is also affected, and its lines are 114-118 columns
- **source:** 64, `64-REVIEW.md` IN-03.
- **file:line now:** `packages/devtools/src/model/TimelineFeed.ts:81-83` (the `configure` doc, 118/114/114 columns); `packages/devtools/README.md:171-173`; the `subscribe` doc at `TimelineFeed.ts:60-62`; ADR-QD-177 decision 5; BEH-QD-656's trailing paragraph; CCR-QD-455 row.
- **what is wrong:** `configure` re-reads whenever `resized`, so a throw on the resize publish also skips the refill of the emptied timeline from an unchanged source, which the texts describe only as "a new source ... is not read"; the `configure` doc's wrap is also far past the file's width.
- **the smallest fix:** Say "the read is skipped: the previous read goes on, the emptied timeline is not refilled, a new source is not read" in the six texts and re-wrap the `configure` doc to about 90 columns.
- **evidence it still holds:** `TimelineFeed.ts:180` is `if (resized || next.source !== before.source) readSource(next.source);` and the README reads "a new `source` in the same call is not read".
- **risk notes:** Six files, three of them spec (ADR-QD-177, BEH-QD-656, README CCR row, need `spec-revise`). Cited by 64 verification. If OI-09 (code fix) is taken instead, this item disappears because the escape no longer exists. Decide OI-09 first.

### OI-04 `UntrustedDecoderOptions` says `ignore` keeps keys "for the member the input's own enumerable `_tag` selects" without the more-than-one-member qualifier
- **source:** 66, `66-VERIFICATION.md` (Doc imprecision, info); `66-SECURITY.md` not-threats; STATE.md line 829.
- **file:line now:** `packages/core/src/UntrustedDecode.ts:142-143`.
- **what is wrong:** For a schema that flattens to one member nothing selects by `_tag`, which BEH-QD-623 and ADR-QD-170 state correctly.
- **the smallest fix:** Add "when the schema has more than one member" to the sentence and re-wrap (lines 142-146 are 95-98 columns).
- **evidence it still holds:** line 142 reads "schema's encoded side declares for the member the input's own enumerable `_tag` selects, and needs a schema that is an object or a union of".
- **risk notes:** Comment only in a file under the 66 bench of record and `UNTRUSTED_DECODE_BUDGET` (token-identical comment edit leaves both valid; prove it by token stream as 66 did). Mutation base not needed for a comment-only change. Pinned by 66 verification.

### OI-05 Two behaviours on non-idempotent in-process accessors are neither stated nor pinned
- **source:** 66, `66-REVIEW.md` IN-02 (carried; deferred to the audit by the owner).
- **file:line now:** `packages/core/src/UntrustedDecode.ts:179-190` (`project`); `packages/core/src/EnvelopeKeys.ts:85-88`; text home: the INV-QD-377 Implication in `spec/invariants.md`.
- **what is wrong:** A union's `_tag` that answers differently on its second read can choose one member's keys and copy another `_tag` (the strict decode then refuses), and an accessor that deletes a later own key changes the refusal message from "Missing key" to "Expected number at ..."; neither is written down.
- **the smallest fix (wording):** One sentence each in INV-QD-377's Implication, with `spec-revise`. The code alternative (copy `_tag` from the value already read in the union branch) is not needed.
- **evidence it still holds:** `grep -in "idempot\|answers differently\|second read" spec/invariants.md spec/behaviors/08-serialization.md spec/decisions/170*.md packages/core/test/UntrustedDecode.test.ts` finds only unrelated hits (INV-QD-376 mentions a differently answering property on the *question*, not the decoder).
- **risk notes:** Wording route touches `spec/invariants.md` (heavily shared register; also edited by 68's own INV/BEH work, so serialise with those). The code route would touch a file under the 66 bench of record and Stryker bases (`66-mutation-base.json`), so do not take it.

### OI-06 "Each beside a positive control on `admit`" is not true of the constructor pin
- **source:** 65, `65-REVIEW.md` IN-02 (carried); `65-SECURITY.md` not-threats.
- **file:line now:** `packages/core/test/WalkEnvironment.tst.ts:59-63`; wording in `spec/invariants.md` (INV-QD-375 Enforcement, around line 4324); `spec/behaviors/05-evaluator.md:450` (BEH-QD-661).
- **what is wrong:** The constructor pin's "control" (`expect(admit(question, "asked")).type.toBe<...>()`, line 62) duplicates line 53 and says nothing about the `new Admitted(...)` call it follows, and a `@ts-expect-error` accepts any diagnostic on its line, so only the manually run `pin-codes.mjs` reads the code TS2673.
- **the smallest fix:** Soften the two spec sentences to say the TS2673/TS2741 reason is read by `pin-codes.mjs`, not by the gate, and that only the literal pin has a real control.
- **evidence it still holds:** test lines 59-63 read as in the review; both spec sentences still say "each beside a positive control on `admit`".
- **risk notes:** Spec-only route touches INV-QD-375 and BEH-QD-661 (two shared registers; bump via `spec-revise`, and the CCR-QD-456 row cites their revisions as history, which is exempt). Do not edit the `.tst.ts` for this: `WalkEnvironment.tst.ts` is a pinned type test (tstyche budget, `NOT_CALLABLE_PIN_BUDGET` not affected as it holds only `admit` pins, but its row 520 in traceability names it).

### OI-07 The INV-QD-364 trace row is less precise than the invariant
- **source:** 65, `65-VERIFICATION.md` (info); `65-SECURITY.md` not-threats.
- **file:line now:** `spec/traceability.md:196`.
- **what is wrong:** The row says `admit` computes `supplied` "from it and from the question alone", while the context it derives from is now built by `admit` from the question.
- **the smallest fix:** Reword to "`supplied` is read from the matcher context `admit` builds from the question" and bump `spec-revise`.
- **evidence it still holds:** row 196 contains "and `admit` computes `supplied` from it and from the question alone (`Admission.ts`)".
- **risk notes:** `spec/traceability.md` is the most contended register (also edited by OI-01, OI-06 and 68's own traceability rows). Do it in the same traceability bump as OI-01. No source, no mutation, no bench.

### OI-08 Three capacity tests still describe the deleted eviction loop
- **source:** 67, `67-REVIEW.md` IN-01 (deliberately skipped by WX-06; deferred to the audit). `67-VERIFICATION.md`, `67-SECURITY.md`, 67-03 summary.
- **file:line now:** `packages/core/test/DecisionCache.test.ts:1052` (title "rejects a negative capacity rather than looping forever"), `:1054-1056`, `:1077-1078` (NaN test), `:1095-1096` (fractional test).
- **what is wrong:** The title and three comments name an eviction loop that `Chunk.splitAt` replaced; the assertions are right, the stated mechanism is not.
- **the smallest fix:** Retitle to "rejects a negative capacity rather than retaining nothing" and restate the comments as the split ("`Chunk.splitAt` reads a negative count as zero and the overflow as everything"); no assertion changes.
- **evidence it still holds:** line 1052 and 1054 read as quoted; `grep -rln "rather than looping forever" spec packages features scripts` finds only this file, so no spec or trace row cites the title.
- **risk notes:** Adjacent to HYGN-02 (same kind of fix, not named there). Pinned: `DecisionCache.test.ts` is cited by 67 verification and the INV-QD-379 trace row, and WX-06 kept it unedited through phase 67, so this is the first edit since. Titles are program text: prove titles-and-comments-only with the compiler-based comparison HYGN-02 already plans. Not a hot path (test file); no mutation base unless Stryker maps tests by title (it does not).

---

## Class: code

### OI-09 A throwing listener on the timeline resize publish skips `readSource` (the code fix offered to the owner and never applied)
- **source:** 64, `64-REVIEW.iter1.md` WR-01 (offered as a code option "call `readSource` before `push()`, or wrap `push()` and rethrow after"); `64-REVIEW-FIX.md`: "fixed in texts only ... no code reordering"; the final `64-REVIEW.md` records that the code was left untouched.
- **file:line now:** `packages/devtools/src/model/TimelineFeed.ts:173-180` (`push()` at 178, `readSource(next.source)` at 180).
- **what is wrong:** On a capacity change, `push()` publishes the emptied timeline first, so a throwing listener ends `configure` before `begin()` and `readSource`: the old read keeps feeding the new store, a new source is never read, `inputs` already holds `next` so repeating `configure` does not re-read, and only `status.restart()` recovers.
- **the smallest fix:** Call `readSource` before `push()` in the resized branch (or `try`/rethrow around `push()`), and then update the five texts that describe the escape (OI-03's list) in the same change.
- **evidence it still holds:** lines 173-180 are `inputs = next; const resized = ...; if (resized) { inner = bounded(next.capacity); inner.subscribe(push); push(); } if (resized || next.source !== before.source) readSource(next.source);`
- **risk notes:** This is a behaviour change in shipped `@qadi/devtools` source, so under WX-06 it needs a RED characterisation test on the unchanged tree first (this is OI-11's test), a per-file mutation base on `TimelineFeed.ts` (`64-mutation-base.json` is stale after any edit; take a fresh `68-mutation-base.json`-style one), and a `@qadi/devtools` patch changeset. Not a hot path, no bench. Not a pinned characterisation file, but the dock's `*.characterisation.test.tsx` files (LSTN-04, empty diff required) must still pass; ADR-QD-177 decision 5 and BEH-QD-656 would have to be rewritten, not just caveated. Phase 68 says "no behaviour change" and "no changeset", so this does not fit 68 as scoped; surface it to the owner as a decision.

### OI-10 `admit` still reads `policy`, `maxDepth` and `subject` more than once
- **source:** 65, `65-05-SUMMARY.md` and `65-01..` flag ADMT-03 ("flagged, not changed"); `65-SECURITY.md` not-threats ("Out of scope"); STATE.md line 828.
- **file:line now:** `packages/core/src/Admission.ts:105-130` (`question.policy` twice, `question.maxDepth` three times, `question.subject` three times).
- **what is wrong:** A question whose `policy` getter answered shallow and then deep would pass the depth check yet carry the deep tree; only `resource` and `action` are read once (INV-QD-376).
- **the smallest fix:** Read `policy`, `maxDepth` and `subject` into locals once at the top of `admit`.
- **evidence it still holds:** `if (policyDepth(question.policy) > question.maxDepth)`, `new PolicyTooDeep({ maxDepth: question.maxDepth })`, `question.subject.attributes`, `question.subject.id`, then `question.policy, question.subject, ..., question.maxDepth` inside `new Admitted(...)`.
- **risk notes:** Hot path (`Admission.ts` runs once per evaluation): needs the Phase 65 A/B bench (`65-BENCH.md`, 35 workloads) re-run and a mutation base (`65-mutation-base.json`; `Admission.ts` held 18/18 then 20/20, so retake on the current tree). It also changes the documented contract (INV-QD-375/376 and ADR-QD-172 amendment state the double read as accepted) so spec text moves with it. Not in Phase 68's scope. Behaviour-visible only for hostile getters, so low value; report as a decision, not a hygiene fix.

---

## Class: test

### OI-11 No test pins the post-throw feed states the docs describe
- **source:** 64, `64-REVIEW.md` IN-02 (carried; `64-VERIFICATION.md` calls it a WARNING-level hardening suggestion).
- **file:line now:** `packages/devtools/test/model/TimelineFeed.test.ts:512` (TF25), `packages/devtools/test/model/DiagnosticsFeed.test.ts:601` (F30).
- **what is wrong:** TF25 and F30 cover isolation and rethrow only; nothing asserts `Reading` with nothing reading, a diagnostics feed that stays `Starting` with no new poll, or the resize case, so reordering `push()` and `readSource` would leave every test green while making the prose false.
- **the smallest fix:** One test per described window (subscribe a throwing listener, drive `restart()`/`configure`, assert the rethrow, the status tag and, under `TestClock`, no further samples or records), including the resize case in the review.
- **evidence it still holds:** `grep -n -i throw packages/devtools/test/model/TimelineFeed.test.ts` shows only TF25's `throw boom` (line 519); no test calls `configure` with a changed capacity under a throwing listener.
- **risk notes:** Test-only, no mutation base, no bench. Not a pinned file, but it is the characterisation OI-09 requires, so it is the first step of that item. Do not touch the dock's `*.characterisation.test.tsx` files (empty diff required by LSTN-04).

### OI-12 No test throws a value that throws when read (hostile getter, revoked proxy) through `notify`
- **source:** 64, `64-04`/`64-05-SUMMARY.md` "Flagged for review" LSTN-01 (unclassified).
- **file:line now:** `packages/devtools/test/model/ExternalStore.test.ts` (the notify cases; none uses a hostile thrown value).
- **what is wrong:** `notify` never reads what it holds, which the design relies on, but no case proves it; mutation variant v4 (reads the thrown value) stands in for it.
- **the smallest fix:** One `ExternalStore.test.ts` case that throws a `Proxy` whose every trap throws, and asserts it comes back out by identity.
- **evidence it still holds:** `grep -n "getter\|Proxy\|hostile" packages/devtools/test/model/ExternalStore.test.ts` finds nothing.
- **risk notes:** Test-only; low value. Stryker `ExternalStore.ts` is 41/42 with the one known equivalent survivor (`sameElements` `a === b` to `false`), so a new test cannot change the score.

### OI-13 No test pins a second unknown key or a nested one under `refuse`
- **source:** 66, `66-01-SUMMARY.md` flag A2 (DECL-03).
- **file:line now:** `packages/react/test/UntrustedSeams.test.ts` (the hydration H1 case: one shallow unknown envelope key -> `MalformedPayload`).
- **what is wrong:** DECL-03 is met by one shallow key, so "hydration keeps `refuse`" would survive a change that only refuses the first unknown key.
- **the smallest fix:** Add one H-case with two unknown top-level keys and one with an unknown key under a kept value, both expecting `MalformedPayload`.
- **evidence it still holds:** `grep -n "H1" packages/react/test/UntrustedSeams.test.ts` is the single hydration unknown-key case; `packages/react/src` still builds hydration with `unknownKeys: "refuse"`.
- **risk notes:** `@qadi/react` test only; `UntrustedSeams.test.ts` is a seam-pin file the 66 spec rows cite. No mutation base, no bench.

### OI-14 The race test's trailing `oneSided` assertion is redundant with `capped`
- **source:** 67, `67-REVIEW.md` IN-02 (owner decision to keep it, 67-CONTEXT).
- **file:line now:** `packages/core/test/DecisionCache.test.ts:1249, 1302, 1317-1320`.
- **what is wrong:** After `assert.deepStrictEqual(capped, [])` passes, `oneSided` is empty by construction, so the assertion and the `sides` array that feeds it cannot fail on their own.
- **the smallest fix:** None under the owner's decision; if reopened, delete `sides`, `oneSided` and its comment.
- **evidence it still holds:** lines 1317-1320 compute `oneSided` from `sides`, and `capped.push` (line 1311) fires on exactly the same condition.
- **risk notes:** Recommend leave: the owner kept it deliberately. Pinned (cited by 67 verification, INV-QD-379 row).

---

## Class: tooling

### OI-15 `pnpm test:tstyche <path>` ignores its arguments
- **source:** 62, `62-REVIEW.md` IN-02.
- **file:line now:** `scripts/run-tstyche.mjs` (the two `spawnSync` argument lists, around lines 128-138).
- **what is wrong:** `process.argv` is never read, so a path filter is dropped and all 66 type-test files run twice; the previous bare `tstyche` filtered.
- **the smallest fix:** Append `process.argv.slice(2)` to both argument lists, or say in the header that the wrapper takes none.
- **evidence it still holds:** `grep -n argv scripts/run-tstyche.mjs` returns nothing.
- **risk notes:** `scripts/` and a DoD row (`pnpm test:tstyche` is a `pnpm check` step; DoD Rev 1.19 text and `check-dod-table.mjs` read it). A filtered run must not weaken the `--listFiles` equality check, which should stay unfiltered. Verification of 62 cites this script (HYGN-06).

### OI-16 Two small robustness gaps in the pin-budget gate
- **source:** 62, `62-REVIEW.md` IN-03.
- **file:line now:** `scripts/check-house-style.mjs:2294` and `:2352`.
- **what is wrong:** `tstyche.json` is read with a bare `JSON.parse` at 2294 (a comment added to it crashes `[not-callable-pin]`, while `[tstyche-plugin-drift]` uses `readJsonc` at 2500), and `listed.set(m[1], ...)` at 2352 silently overwrites a duplicated AGENTS.md section 6 row.
- **the smallest fix:** Use `readJsonc("tstyche.json")` at 2294 and fail when `listed.has(m[1])` before the `set` at 2352.
- **evidence it still holds:** line 2294 is `JSON.parse(readFileSync(join(ROOT, "tstyche.json"), "utf8"))`; line 2352 has no `has` guard.
- **risk notes:** `scripts/check-house-style.mjs` is the merge gate; every gate edit needs both directions proved (a probe with a duplicated row must go red). Pinned by 62 verification. Not a mutation or bench matter.

### OI-17 The `CHARACTERISATION` path is declared in two scripts
- **source:** 62, `62-REVIEW.md` IN-04.
- **file:line now:** `scripts/run-tstyche.mjs:41`; `scripts/check-house-style.mjs:2381` (plus its budget key).
- **what is wrong:** The same path string is a separate constant in each script, so renaming the file needs three edits and a miss is caught only indirectly.
- **the smallest fix:** Export it from `scripts/lib/type-tests.mjs` and import it in both.
- **evidence it still holds:** both declarations present as above.
- **risk notes:** Gate scripts; same proof burden as OI-16. Do both in one change.

### OI-18 `scripts/spec-revise.mjs` drops its first positional argument unless `--date` is given
- **source:** 62, `62-07-SUMMARY.md` "Tooling note (not fixed, out of scope)" and "Deferred / out of scope".
- **file:line now:** `scripts/spec-revise.mjs:68-71`.
- **what is wrong:** `index !== dateFlag + 1` is `index !== 0` when no `--date` flag exists (`dateFlag` is -1), so the first positional is dropped and the script prints usage.
- **the smallest fix:** `index !== dateFlag + 1 || dateFlag === -1`, or filter by `dateFlag !== -1 && index === dateFlag + 1`.
- **evidence it still holds:** line 70: `const positional = args.filter((arg, index) => !arg.startsWith("--") && index !== dateFlag + 1);`
- **risk notes:** Phase 68 itself runs `spec-revise` repeatedly (HYGN-03, HYGN-04), so fixing it first removes a trap; every executor so far passed `--date` to work around it. Merge-gate script (`spec-revise.mjs --check` is a gate); keep `--check` behaviour byte-identical.

### OI-19 Gate 14's guard is lexical in four places
- **source:** 63, `63-REVIEW.md` IN-01, IN-02 and WR-02 (the documented `shortcut:`); `63-SECURITY.md` not-threats; `63-05-SUMMARY.md` PROBE-01.
- **file:line now:** `scripts/check-package-install.mjs:851-857` (`holdsDirective`: `startsWith("// @ts-expect-error") && includes(member)`), `:874` (any call with an identifier callee counts as "called"), `:875` (any type reference outside a refusal counts as "typed").
- **what is wrong:** A directive anywhere in the declaration naming the member, a feed call that is never run, or any type use of `DecisionCacheShape` satisfies the guard; `//@ts-expect-error` and `/* @ts-expect-error */` give a false red.
- **the smallest fix:** None required (the limits are documented in the header and the `shortcut:` note); optionally attach the directive check to the `PropertyAssignment` whose `name.text === member`.
- **evidence it still holds:** the three lines above, unchanged; comment at 871-873 states the `shortcut:` limit correctly.
- **risk notes:** Gate 14 is a merge gate and its removal proof is the recorded `63-RED-EVIDENCE.md` (r1..r5), not a committed self-test, so any change must re-run that matrix against scratch copies. Pinned by 63 verification.

### OI-20 The packed-install guard rests on `typescript/unstable/*` under a `^7.0.0` catalog range
- **source:** 63, `63-REVIEW.md` IN-03.
- **file:line now:** `scripts/check-package-install.mjs:840-843`; `pnpm-workspace.yaml:32` (`typescript: ^7.0.0`; installed `7.0.2`).
- **what is wrong:** A 7.x minor may move the `unstable` entry points, which would break the merge gate on a routine bump with a message that does not name the coupling.
- **the smallest fix:** Name the coupling in the `catch` message ("unstable API, pinned by ^7"); pinning the catalog is the heavier alternative.
- **evidence it still holds:** the three `await import("typescript/unstable/...")` calls and the `^7.0.0` range are as quoted.
- **risk notes:** Prefer the message change: a catalog edit touches `pnpm-workspace.yaml` and `pnpm-lock.yaml` (dependency change, forbidden in a hygiene phase). Gate 14.

### OI-21 Gate 14's probe code has no timeouts, a run-varying assertion label, a repeated magic `200` and no `Stopped` break
- **source:** 63, `63-REVIEW.md` IN-04; iteration-3 note on the over-width comment.
- **file:line now:** `scripts/check-package-install.mjs:797, 809, 824-826` (`execFileSync` without `timeout`; `tsgo` child); `:621` (`turns < 200`) and `:631` (label embeds `String(diagnosed.turns)`); the loop at 620-624 does not look at `Stopped`; comment line 851 is 99 columns.
- **what is wrong:** A hung child hangs `pnpm check`; the assertion label varies run to run; a failing diagnostics probe reports only "never Live in 200 turns" with no reason.
- **the smallest fix:** Add a `timeout` to the `execFileSync` calls, hoist `200`, keep the label constant (put the turn count in a separate line), and break the loop on `Stopped` including its reason.
- **evidence it still holds:** the lines above.
- **risk notes:** Gate 14; the existing calls at 177/195/211 are equally unbounded, so this is consistent with the file as it stands and is low priority. Re-run the 63 removal matrix after any edit.

### OI-22 `pin-codes.mjs` is tied to one pnpm store path and prints nothing on success
- **source:** 65, `65-REVIEW.md` IN-03 (carried); `65-SECURITY.md` not-threats.
- **file:line now:** `.planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs:10` (`node_modules/.pnpm/typescript@6.0.3/...`).
- **what is wrong:** The next TypeScript bump makes it throw at import, and a run that finds no diagnostic looks the same as a run where the pins held.
- **the smallest fix:** Resolve TypeScript through `createRequire(resolve("node_modules/tstyche/package.json"))("typescript")` and print a diagnostic count.
- **evidence it still holds:** line 10 as quoted; `node_modules/.pnpm` holds typescript 5.9.3, 6.0.3 and 7.0.2.
- **risk notes:** Phase-record script, not a gate. It is the only reader of TS2673/TS2741 for OI-06, so if OI-06 is softened the script can stay as is; if it is kept as the claimed check it should be fixed first.

### OI-23 Phase 66's mutation scorer exempts lines by text and drops multiplicity
- **source:** 66, `66-REVIEW.md` IN-03 (carried; deferred to the audit).
- **file:line now:** `.planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation.mjs:95-99` (`known`, `wasIgnored` are `Set`s of the key) and `:109-110` (`atBase` is the set of trimmed base lines).
- **what is wrong:** A static-only survivor on a line the phase wrote passes if the same trimmed text exists anywhere in the base file, and two identical open mutants count as one (the two at `UntrustedDecode.ts:240`).
- **the smallest fix:** None: Phase 67's copy (`67-mutation.mjs`, `mapLine`/`hunks`/`bag`) already fixes both; the 66 copy is a frozen record and its result (44/46 close, 46/48 static) is unaffected.
- **evidence it still holds:** the `Set`/`atBase` lines above are present in 66's file; `67-mutation.mjs:60` (`mapLine`), `:76` and `:85` (`Map`) show the fix lives only in 67.
- **risk notes:** Recommend record-only. Editing 66's script would invalidate the committed `66-mutation-close.json` comparison; `67-mutation.mjs` is what 68's `68-mutation-base.json` work should copy.

### OI-24 Phase 66 and 67's bench harness always runs the same arm first, and there are now three copies
- **source:** 66, `66-REVIEW.md` IN-04 (the `ab.sh` half, never applied) and `66-03-SUMMARY.md` "add-alongside harness debt".
- **file:line now:** `.planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/ab.sh:85` and `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/ab.sh:85` (`for arm in "$HEAD_LABEL" "$PATCHED_LABEL"`), plus Phase 59's archived copy.
- **what is wrong:** The fixed arm order is not counterbalanced across rounds, and the harness is copied per phase instead of living once under `scripts/`.
- **the smallest fix:** None for the shipped records (the gates were fixed before the runs); if a fourth A/B gate is needed, promote one harness to `scripts/` with the order alternated by round parity.
- **evidence it still holds:** both `ab.sh` files still contain the loop at line 85.
- **risk notes:** Recommend record-only until a bench gate is needed again. Phase 68 takes no bench. Do not edit either phase's `ab.sh`: their `bench/final/` records were produced by them.

### OI-25 `67-mutation.mjs --self-test` covers `dirtyReasons` but not `refuseDirty`'s call sites
- **source:** 67, `67-REVIEW.md` iteration 2 IN-03; `67-SECURITY.md` not-threats; STATE.md line 830.
- **file:line now:** `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs:38-41, 166, 179, 228`.
- **what is wrong:** Deleting `refuseDirty()` from `record` or `evidence`, or giving `git status` the wrong paths, leaves the self-test green because only the pure predicate is planted.
- **the smallest fix:** Pass the `git status` reader into `refuseDirty` (or share one helper) and plant a stub returning a modified line; or note the limit in the header.
- **evidence it still holds:** the self-test at line 228 calls only `dirtyReasons(planted)` and `dirtyReasons("")`.
- **risk notes:** Phase-local evidence tooling run once per record. If 68 copies this scorer for `68-mutation-base.json`, fix it in the copy.

---

## Class: record

### OI-26 Four Phase 64-05 commits carry `Co-Authored-By: Claude Sonnet 5.5` instead of Opus
- **source:** orchestration (known item); `git log --format='%h %(trailers:key=Co-Authored-By,valueonly)'` over `44510112..c9498175`.
- **file:line now:** history, not a file.
- **what is wrong:** `188a57a1` (docs(64-05): complete the phase-closing plan), `64959921` (docs(64-05): summary), `933291bd` (docs(64-05): LSTN-01..04 complete) and `8cd28a51` (docs(64-05): close scan, mutation compare, edge coverage and diff review) carry the Sonnet 5.5 trailer; the other 21 Phase 64 commits carry Opus 5.5 and 5 have no trailer.
- **the smallest fix:** None. It cannot be fixed without rewriting published history; record only.
- **evidence it still holds:** `git log --format='%h|%(trailers:key=Co-Authored-By,valueonly,separator=;)|%s' 44510112..c9498175 | grep '(64' | grep -i sonnet` prints exactly those four.
- **risk notes:** Wider than the known item: the same command finds 35 Phase 62 commits and 14 Phase 63 commits with the Sonnet 5.5 trailer too (and Phase 61 and the v1.7 research commit `2ba25865` before them). Phases 65 to 67 have none. Record the wider count too; do not rewrite.

### OI-27 WX-01..07 stay `[ ]` in REQUIREMENTS.md
- **source:** STATE.md lines 825-830 ("Orchestrator reverted phase.complete's WX-* ticks", "WX-01..07 Pending"); `65-VERIFICATION.md` ("WX rows left Pending").
- **file:line now:** `.planning/REQUIREMENTS.md:109-122`.
- **what is wrong:** The seven cross-cutting requirements are unticked by decision until the milestone audit, so they read as unmet.
- **the smallest fix:** Tick them at the milestone audit after Phase 68 has run `pnpm check:pr` and the leak scan one last time.
- **evidence it still holds:** lines 109, 110, 112, 114, 117, 120, 122 are all `- [ ]`. HYGN-01..06 (93-104) are also `[ ]`, as expected for the unexecuted phase.
- **risk notes:** Not a source edit; `.planning` bookkeeping only. Phase 68's own requirements list WX-01..07, so 68's close is the natural point.

### OI-28 Flagged assumptions and limits that are stated and accepted, with nothing to change
- **source:** 62-01 PIN-01 and 62-03 PIN-03; 63-05 PROBE-02, PROBE-04, PROBE-05 and WX-07; 65-05 ADMT-02 and ADMT-04, and its mutation-count note; 66-03 (bench on a host at load 26 to 37; six `*.log` files gitignored and uncommitted); 67-01 (the margin is not clipped by the cap; budget 5 did not fail in the one split run recorded), 67-02/67-05 (dispatch rests on one run per candidate, base spreads 6 to 15%, 67-05 not noise-free), and 67-07 (nine static survivors on lines the phase did not write: `SharedComputation.ts:89-99` and `DecisionCache.ts:141`).
- **file:line now:** none (records). The survivors are at `packages/core/src/SharedComputation.ts:89-99` (the `afterReset`, `afterLastLeave` and arms tables) and `packages/core/src/DecisionCache.ts:141` (the `"qadi/..."` service id string).
- **what is wrong:** Each is a known limit of a measurement or a lock (the characterisation pins tstyche 7.2.5 with `@effect/language-service` 0.87.5 only; `Parameters<>` reads one signature; the packed gates probe is structural and the `coalesced` outcome is not probed through the packed artifact; the `Admitted` lock is type-level only; bench verdicts are for this host and one 3+3 run; `Admission.ts` has 20 valid mutants at close against 18 at base and 15 at Phase 59, uninvestigated).
- **the smallest fix:** None; do not change source for these. Re-state them in the milestone audit as accepted.
- **evidence it still holds:** the static survivors are listed in `67-SECURITY.md` and `67-mutation-static.json`; the survivors' lines are tables and an id string (equivalent or outside the gate's score).
- **risk notes:** Touching `SharedComputation.ts`, `DecisionCache.ts` or `Admission.ts` for any of these would need a bench and a mutation base for no behaviour gain.

### OI-29 Phase 66 and 63 plan verifies that could not pass on a correct tree
- **source:** 66-04 (a sort-order verify) and 66-05 (a diff-line regex), `66-SECURITY.md` ("Plan verifies"); 63-05's close-scan set-aside regex, STATE.md line 826.
- **file:line now:** `66-04-PLAN.md`, `66-05-PLAN.md`, `63-05-PLAN.md` (history); fixes lived only in scratch copies.
- **what is wrong:** Each plan shipped a verify that fails on the correct commit; the executors ran corrected scratch copies and the plans were left as written.
- **the smallest fix:** None; the plans are records. Carry the lesson to planning of future phases: run a plan's verify against its own expected output before dispatch.
- **evidence it still holds:** the summaries of 66-04, 66-05 and 63-05 describe the scratch workarounds and say the plans were untouched.
- **risk notes:** none.

---

## Counts

| Class | Items |
| --- | --- |
| wording | 8 (OI-01 to OI-08) |
| code | 2 (OI-09, OI-10) |
| test | 4 (OI-11 to OI-14) |
| tooling | 11 (OI-15 to OI-25) |
| record | 4 (OI-26 to OI-29) |
| **total** | **29** |

Of these, items I recommend as record-only or leave-alone (no edit): OI-14, OI-19, OI-23, OI-24, OI-26 to OI-29.

## Files touched if every non-record item were fixed

Source (comments only unless noted):
- `packages/devtools/src/model/DiagnosticsFeed.ts` (OI-02)
- `packages/devtools/src/model/TimelineFeed.ts` (OI-03; code at OI-09)
- `packages/core/src/UntrustedDecode.ts` (OI-04; OI-05 only if the code route is taken, not recommended)
- `packages/core/src/Admission.ts` (OI-10, code, hot path)

Tests:
- `packages/core/test/FloatingEffectPins.tst.ts` (OI-01, pinned)
- `packages/core/test/WalkEnvironment.tst.ts` (OI-06 alternative only; recommended: leave)
- `packages/core/test/DecisionCache.test.ts` (OI-08; OI-14 only if reopened)
- `packages/devtools/test/model/TimelineFeed.test.ts`, `packages/devtools/test/model/DiagnosticsFeed.test.ts` (OI-11)
- `packages/devtools/test/model/ExternalStore.test.ts` (OI-12)
- `packages/react/test/UntrustedSeams.test.ts` (OI-13)

Spec and docs:
- `spec/decisions/175-a-negative-type-pin-can-fail.md` (OI-01)
- `spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md`, `spec/behaviors/28-devtools-screens.md`, `packages/devtools/README.md`, `spec/README.md` CCR-QD-455 row (OI-03; again if OI-09)
- `spec/invariants.md` (OI-05, OI-06), `spec/behaviors/05-evaluator.md` (OI-06)
- `spec/traceability.md` (OI-01, OI-07)
- `.planning/REQUIREMENTS.md` (OI-27, at the milestone audit)

Tooling:
- `scripts/run-tstyche.mjs` (OI-15, OI-17), `scripts/check-house-style.mjs` (OI-16, OI-17), `scripts/lib/type-tests.mjs` (OI-17)
- `scripts/spec-revise.mjs` (OI-18)
- `scripts/check-package-install.mjs` (OI-19, OI-20, OI-21)
- `.planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs` (OI-22)
- `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs` (OI-25)

Never touch: `.planning/phases/QD-66-*/66-mutation.mjs`, both `bench/ab.sh` files (records, OI-23 and OI-24).
