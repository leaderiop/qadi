---
phase: 91
review: 91-REVIEW.md
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "The named-barrel rule refused less than its spec said, and its self-test planted one of its refusals"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "Gate 14's hydrate probe was in no probe guard, so deleting it left the gate green"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "BEH-QD-792 and BEH-QD-794 said every other name of the module stays package-private, which was false"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "The three-edit rule could not be followed for a type name, and four public packages have no surface.test.ts"
  - id: WR-05
    severity: warning
    disposition: fixed
    title: "BEH-QD-145's listing and the website page typed hydrateDecisions by QadiAtoms"
  - id: WR-06
    severity: warning
    disposition: fixed
    title: "INV-QD-427 claimed the kind and the 948-name baseline are held; no merge step holds either"
  - id: WR-07
    severity: warning
    disposition: fixed
    title: "mkdirSync on a directory mkdtempSync had just created"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "The folded GateRegistry.ts header was a free-floating block attached to nothing"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "HydrationTarget: a wrong reason for staying out of the root, and a pin that did not pin what it claimed"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "Leftovers from the folds (partly fixed: test names kept by decision)"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "PortSpanFold.mutation.test.ts was named for the refactor and cited a function that does not exist"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "ADR-QD-204 and BEH-QD-795 called the promise and predicate roots pure export * barrels"
  - id: IN-06
    severity: info
    disposition: fixed
    title: "ADR-QD-078's note credited HydrationEngine.ts with the seed atoms and the precedence"
  - id: IN-07
    severity: info
    disposition: fixed
    title: "surface-diff's validated threw a raw TypeError on a null entries or name"
  - id: SEC-OBS-1
    severity: info
    disposition: fixed
    title: "The hydrate probe in gate 14's consumer was unguarded"
  - id: SEC-OBS-2
    severity: info
    disposition: fixed
    title: "STAR_EXPORT was line-anchored"
  - id: SEC-OBS-3
    severity: info
    disposition: accepted
    title: "The structural HydrationTarget adds no capability"
  - id: SEC-OBS-4
    severity: info
    disposition: fixed
    title: "Check 3c did not refuse a bare specifier into a non-entry subpath"
  - id: SEC-OBS-5
    severity: info
    disposition: fixed
    title: "Stale local lib/ outputs of the five deleted modules"
  - id: SEC-OBS-6
    severity: info
    disposition: accepted
    title: "surface-diff compare is a manual, phase-local tool"
  - id: SEC-OBS-7
    severity: info
    disposition: no-change
    title: "Two adjacent imports of ./GateWriter.ts in QadiProvider.tsx"
  - id: SEC-OBS-8
    severity: info
    disposition: accepted
    title: "Release facts: no version, changelog, tag or upstream change"
  - id: VAL G-1
    severity: gap
    disposition: fixed
    title: "Gate 14's hydrate probe was on no probe list"
open: 0
---

# Phase 91 — Review disposition

Findings from `91-REVIEW.md`, plus the observations in `91-SECURITY.md` and gap G-1 in `91-VALIDATION.md`. All decided
autonomously 2026-11-26 under the owner's rule (the most complete and clean fix, not the simplest). Every seen-failing block
named below is in `91-RED-EVIDENCE.md` (`e929195d`).

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | `5fc4f5d6`, `ddba1c36`: `named-barrel` reads each listed barrel through TypeScript's parse (`scripts/lib/barrel-scan.mjs`, a child under the shared timeout) and refuses an `export *` anywhere, any statement that is not a module group (declaration, import, `export { x }` with no `from`, export assignment), a group whose module is not in the package's own `src/`, a second value or type group for one module, a type group before its value group, an inline `type` in a value group, names out of name order and groups out of module-path order (both case-sensitive ASCII; AGENTS.md §9 states both orders with the check). An unlisted `index.ts` with a relative named group, or mixing a group with an `export *`, fails too. The self-test plants one violation per reason into each listed barrel, plus two unlisted plants and two controls, every run. Seen failing: `named-barrel-review-*` (14 reasons on the real barrels) and `named-barrel-review-self-test-*` (12, each plant neutralised). AGENTS.md §9, BEH-QD-795, INV-QD-427, INV-QD-428, ADR-QD-204 and the traceability row state exactly this. |
| SEC-OBS-2 | info | fixed | with WR-01: the parse sees an `export *` wherever it sits (`named-barrel-review-star-after-statement`). |
| WR-02 | warning | fixed | `ff3a8994`: gate 14's probe guard covers `@qadi/react`'s `hydrateDecisions` in the guard-list form: `REACT_RUNTIME_PROBES` (`hydrateDecisions:atoms`, `hydrateDecisions:capability`, recorded by the module hook from the shape of each call's first argument) and `REFUSED_CALL_PROBES` (a call on an object literal without `hydrate`, led by `@ts-expect-error`, read by `scripts/lib/probe-guard-parse.mjs`). A missing call or refusal fails with a named reason; a packed root without the export fails too. Seen failing (scratch clone, gate 14 exit 1): `hydrate-probe-deleted`, `hydrate-probe-capability-deleted`, `hydrate-probe-refusal-deleted`, `hydrate-probe-never-run`. |
| SEC-OBS-1, VAL G-1 | info, gap | fixed | `ff3a8994` (see WR-02). |
| SEC-OBS-4 | info | fixed | `9e378625`: check 3c also refuses a bare `@qadi/<pkg>/<subpath>` no installed manifest's `exports` map declares; `entryPointsOf` reads the entry points from the manifests (fail-closed with none given). Four planted cases added (thirteen in all). Seen failing: `escape-undeclared-subpath` (a react declaration naming `@qadi/core/lib/Decision.js`, gate 14 exit 1) and `escape-self-check-subpath` (the refusal neutralised, the self-check names the three planted cases). AGENTS.md §16, ADR-QD-204 and INV-QD-427 say so; gate 14 prints `… none names a path outside its package, into src/ or to an undeclared entry point`. |
| WR-03 | warning | fixed | `a6f86b9e`: BEH-QD-792 and BEH-QD-794 REQUIREMENT 1, the module docs of `HydrationEngine.ts` and `ArchiveFacts.ts`, and the ADR-QD-039 and ADR-QD-078 notes say the barrel names an exact list of the module's names, those are public (`InitialValues`, `HydrationMismatch`, `HydrationMismatchReporter` through `QadiProvider.tsx` and `QadiAtoms.ts`; `ArchiveInputInvalid`, `ArchiveInputRefusal` through `AuditArchive.ts`), and every name it does not list is package-private. Comment-only in source, so no mutation re-take. |
| WR-04 | warning | fixed | `10ba6dbe`: AGENTS.md §9, CONTRIBUTING.md, ADR-QD-204, BEH-QD-795 and ADR-QD-047: a public name is a root line and an overview row (gate 13); a value is also a line in the value list of `test/surface.test.ts` in the four packages that have one (`@qadi/audit`, `@qadi/core`, `@qadi/devtools`, `@qadi/react`); a type has no line there and gets one in a type pin only where one exists (`@qadi/devtools`' `surface.tst.ts`). |
| WR-04 (barrel headers) | warning | fixed | `b9dccc9a`: the header comments of the five named barrels (core, react and audit `index.ts`, devtools `index.ts` and `react/index.ts`) say what AGENTS.md §9 says: a value is a root line, an overview row and a line in `test/surface.test.ts`'s value list; a type is a root line and an overview row, plus a line in devtools' `test/surface.tst.ts` where that type pin exists. Comment lines only; `named-barrel` stays green. Declarations: `f8ea4654` (the devtools barrels move from held source to declared files whose only regions are doc-comment lines under that one subject), `1d91324f` (phase 88's pinned row is computed on that subject). Because `@qadi/devtools` now has a `src` edit, it gets a patch changeset saying no export changes (`3089d7fb`); `8aa52fa6` adds it to `91-check.mjs changesets`, `c574d649` counts it in the closes of phases 88, 89 and 90, and `32f9c3ff` records it in ADR-QD-204 and the CCR-QD-483 row. Seen failing (`49de3342`): `barrel-header-outside-region`, `barrel-header-statement-in-region`. |
| WR-05 | warning | fixed | `5ca0ca79`: BEH-QD-145's listing and the website hydration page type the first parameter as `{ readonly hydrate: QadiAtoms["hydrate"] }`; BEH-QD-145 links BEH-QD-792. `check-doc-examples` (122 blocks) and `check-website-doc-examples` (79 blocks) compile. |
| WR-06 | warning | fixed | `fd3459c0`: INV-QD-427 says what each check holds: values and their runtime presence by each `surface.test.ts` (audit, core, devtools, react), names by gate 13, export kinds and the 948-name baseline by `node scripts/surface-diff.mjs compare`, run by hand or by a phase and no merge step, with only its self-test in `pnpm check`. BEH-QD-795 and BEH-QD-791 say the same. No committed-baseline gate added. |
| WR-07 | warning | fixed | `151ac752`: the redundant `mkdirSync` in `scripts/lib/surface-scan.mjs` deleted. |
| IN-01 | info | fixed | `778dd81c`: the rationale block in `GateWriter.ts` is the doc comment of `GateRegistry`, which it explains, in the house shape (summary line first); its last paragraph (the store's contract) moved to `makeGateRegistry`'s doc; `GateRegistryOptions` has a summary line. |
| IN-02 | info | fixed | `cc9e5b76`: `HydrationTarget`'s doc says it stays out of the root so the surface does not grow (a consumer names it as `Parameters<typeof hydrateDecisions>[0]`), and the ADR-QD-039 rationale moved to `QadiAtoms`, which owns the seed atoms. `HydrationTarget.tst.ts` adds two pins ("a value holding the written-out hydrate alone is a hydrate target"; "a value whose hydrate reads another payload is not a hydrate target") and renames one title; positive pins and `not.toBeAssignableTo` only, so `NOT_CALLABLE_PIN_BUDGET` and the AGENTS.md §6 table do not move. ADR-QD-204 says no type pin can tell `extends HydrationTarget` from a redeclared signature, so no check claims it. Seen failing: `hydrate-target-review-atoms-lack-hydrate`, `-second-member`, `-any-payload` (every title, both passes). |
| IN-03 | info | fixed (partly, by decision) | `90a19755`: ADR-QD-053 carries a dated note (`> **Note (2026-11-26, ADR-QD-204, CCR-QD-483).**`) that `GateRegistry.ts` is folded into `GateWriter.ts`, Rev 1.7 → 1.8, and the CCR-QD-483 row names it. The six test files named after deleted modules keep their names: each names the behaviour under test, and budgets, the traceability matrix and earlier phases' pinned checks cite them. Stale `lib/` outputs (SEC-OBS-5): `pnpm clean && pnpm build` run locally; gate 14 then read 246 packed `.d.ts`, not 257. |
| SEC-OBS-5 | info | fixed | local `pnpm clean && pnpm build` (gitignored; nothing to commit). |
| IN-04 | info | fixed | `e461853f`: `PortSpanFold.mutation.test.ts` renamed `PortSpanRead.test.ts`; its header cites `decodeSpan`; the interpreter row keeps its literal expected list and checks it against `portInterpreter.literals`; a traceability row added. Seen failing: `port-span-read-fourth-interpreter`. `PortSpan.ts` and `PortSpanEncode.ts` unchanged, so the recorded mutation close stands. |
| IN-05 | info | fixed | `10ba6dbe` (with WR-04): `@qadi/http` and `@qadi/testing` stay pure `export *`; the roots of `@qadi/promise` and the two predicate packages are their implementation, not a barrel (ADR-QD-204, BEH-QD-795, AGENTS.md §9). |
| IN-06 | info | fixed | `a6f86b9e` (with WR-03): ADR-QD-078's note says the engine owns the codec and the two entry points, and the seed slot and the precedence stay `SeededQuestion.ts`'s (ADR-QD-155). |
| IN-07 | info | fixed | `264dc155`: `validated` refuses a null or missing `entries`, a null entry and a null or nameless name, each with a named message; five self-test rows (25 in all). Seen failing: `surface-diff-null-entries`. |
| SEC-OBS-3, SEC-OBS-6, SEC-OBS-8 | info | accepted | 3: the structural target adds no capability; base `QadiAtoms` was already structural. 6: `surface-diff compare` stays a phase tool by design (ADR-QD-204); INV-QD-427 says so. 8: release facts unchanged. |
| SEC-OBS-7 | info | no change | a separate `import type` beside a value import is the house pattern. |

The barrel header comments, first recorded here as not done, were fixed on the orchestrator's decision (see the WR-04
(barrel headers) row).

Script declarations changed, each named:

- `91-pinned-check.mjs` (`3a7fc814`): a born file may name one `review` commit, by exact subject, that changes it anywhere from
  the text its chain leaves (`HydrationTarget.tst.ts`, under `cc9e5b76`'s subject); the mutation close's `anyTest` kind may name
  `renames`, one commit by exact subject moving an added test from the text it was added with (`PortSpanFold.mutation.test.ts`
  → `PortSpanRead.test.ts`, under `e461853f`'s subject); each is held at that commit's text after. Fifteen self-test rows
  (112 in all).
- `91-check.mjs` (`600d448e`): `judgeEscapeRun` requires the escape line that covers entry points; `judgeEscapeModule`
  requires `entryPointsOf` exported and imported; `escape-scan` reads the entry points from the workspace manifests; the close
  runs `seen-failing packages/core/test/PortSpanRead.test.ts`; `MUTATION_TESTS` keeps the born name, with a note. Five
  self-test rows (480 in all).
- `91-mutation.mjs` (`a6636e0f`): the `EXAMINED` note names the renamed test. Self-test 125.
- `91-pinned-check.mjs` (`f8ea4654`): a declared region may be `docComment: true`, replaced only by ` * ` continuation lines
  that do not close the block; `packages/devtools/src/index.ts` (base lines 19-20) and `packages/devtools/src/react/index.ts`
  (16-17) leave `HELD_SOURCE` for `DECLARED` with one such region each, under `fix(91-review): state the edits a public name
  needs in each barrel's header`; the phase-89 earlier-held row of the audit barrel admits that subject. Eight self-test
  rows (120 in all).
- `91-earlier-checks.mjs` (`1d91324f`): `REVIEW_SUBJECT` (not a plan subject, carried by one commit at most) and the computed
  row `pinned88`: Phase 88's pinned check names the two devtools barrels once that subject exists. Five self-test rows (81 in
  all); its 87 runs match their rows. `c574d649`: the devtools changeset subject, counted by `addedBy`, moves the
  changeset count of the closes of 88, 89 and 90 by one, and adds the file line to 90's close. Three self-test rows (84 in all).
- `91-check.mjs` (`8aa52fa6`): `CHANGESETS` names the fourth, `.changeset/devtools-named-barrel-headers.md`, a
  `No export changes.` patch. Two self-test rows (482 in all).

Spec edits, all in place within this phase's unreleased revisions except one bump: ADR-QD-053 Rev 1.8 (`spec-revise.mjs`,
2026-11-26). Edited in place: ADR-QD-204, ADR-QD-047, ADR-QD-039, ADR-QD-078, `spec/invariants.md` (INV-QD-427,
INV-QD-428), `spec/traceability.md`, `spec/behaviors/09-react.md` (BEH-QD-795), `19-hydration.md` (BEH-QD-145, BEH-QD-792),
`30-port-calls.md` (BEH-QD-791), `33-audit-pipeline.md` (BEH-QD-794), and `spec/README.md`'s CCR-QD-483 row, which names
ADR-QD-053 and the review's other edits. Outside `spec/`: AGENTS.md §9 and §16, CONTRIBUTING.md, the website hydration page.
The first round's source edits are comments in `@qadi/react` and `@qadi/audit`, which already had changesets. The barrel-header
fix edits `@qadi/devtools`' `src` (comments only), so it adds one patch changeset for it (`3089d7fb`).

Final checks, at code head `32f9c3ff` (after the barrel-header fix):

- `91-check.mjs close`: exit 0, 25 checks and the no-release facts pass (pinned `--all-applied`: 513 held, 29 declared and
  applied, 5 born, 27 earlier-held, clean; `91-earlier-checks.mjs`: 87 runs, all match their rows; `records --close`: exit 0;
  `changesets`: 4 patch changesets, one per edited public package; mutation `compare`, `landed close` and
  `landed coverage-close`: ok; `escape`: clean).
- `--self-test`: `91-check` 482, `91-pinned-check` 120, `91-earlier-checks` 84, `91-mutation` 125, all passed.
- `node scripts/check-house-style.mjs`: 648 files clean.
- `pnpm check:pr`: exit 0, 18 of 19 steps (`pnpm mutation` skipped, as for every non-release PR): 308 test files and 6981
  tests, coverage 99.68 / 98.75 / 99.61 / 99.84, gate 14 nine packages and 528 runtime exports, `surface:self-test` 25 passed.
- `91-check.mjs scratch-clean` and `scratch-clean --check`: `$TMPDIR/qd91` removed.

The first round's checks, at `e929195d`, passed the same way (close 25 checks, `check:pr` exit 0).
