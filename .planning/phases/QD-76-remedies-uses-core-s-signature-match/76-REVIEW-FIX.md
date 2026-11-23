---
phase: QD-76-remedies-uses-core-s-signature-match
fixed_at: 2026-11-23T21:00:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-76-remedies-uses-core-s-signature-match/76-REVIEW.md
iteration: 2
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 76: Code Review Fix Report (iteration 2)

**Fixed at:** 2026-11-23
**Source review:** .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 9 (4 warnings, 5 info; fix scope all)
- Fixed: 9
- Skipped: 0

`workflow.use_worktrees` is `false`, so every edit, commit and gate ran in the main checkout (no worktree, no recovery
sentinel). Every gate below was run on the final tree, from the main checkout.

## Fixed Issues

### WR-01: The row arrays and the form's `signatures`/`history` reads are outside the guarded read; a revoked proxy, a throwing `length` or a throwing getter still throws

**Files modified:** `packages/core/src/PortKey.ts`, `packages/core/src/SignatureHistory.ts`,
`packages/core/src/DecisionHistory.ts`, `packages/devtools/src/model/Remedies.ts`, `packages/core/test/helpers.ts`,
`packages/core/test/SignatureHistory.test.ts`, `packages/core/test/DecisionHistory.test.ts`,
`packages/devtools/test/model/RemedyTotality.test.ts`, `spec/behaviors/06-services.md`,
`spec/behaviors/29-devtools-simulator.md`, `spec/invariants.md`, `spec/traceability.md`,
`spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md`
**Commit:** 3f01baa1
**Status:** fixed: requires human verification
**Applied fix:** one iteration helper, `readRows(path, rows)`, beside `readGuarded` in `PortKey.ts` (package-private, the
barrel is unchanged): it copies the list with a spread inside the guarded read, so a revoked proxy, a `length` or an index
getter that throws, and a value that is not iterable, are one `KeyRefusal.Unreadable` naming the list. Both lookups read
their rows through it (`["signatures"]`, `["events"]`), so the layer, the read over it and both judgements fail typed.
In `Remedies.ts` the form's own `fieldOps("history"|"signatures").elements(input)` moved inside `readForm`, so a getter
for the list that throws is skipped with the form's sentence, and a list core cannot read is skipped with the port's.
New pins: a `HOSTILE_LISTS` helper (revoked proxy, throwing `length`, throwing element, not iterable), a "a list that
cannot be read fails every read, naming the list and what was thrown" describe in both core files (layer, read and
judgement), and three list tests in `RemedyTotality.test.ts`. BEH-QD-410, BEH-QD-716, BEH-QD-719, INV-QD-397,
INV-QD-398 and ADR-QD-189 decision 4 say "the list of rows" and name the pins. The WR-02 pin titles and ADR sentence
share hunks with these edits and landed in this commit.

### WR-02: `describeKeyRefusal` throws for an unkeyable object whose constructor `name` is not a string, so a row or site holding one still throws out of the judgements and the remedy table

**Files modified:** `packages/core/src/PortKey.ts`, `packages/core/test/helpers.ts`, `packages/core/test/PortKey.test.ts`,
`packages/core/test/SignatureHistory.test.ts`, `packages/core/test/DecisionHistory.test.ts`,
`packages/devtools/test/model/RemedyTotality.test.ts`, `spec/traceability.md`
**Commit:** e0da53cd
**Status:** fixed: requires human verification
**Applied fix:** `brandOf` reads the constructor's `name` through `Reflect.get` as `unknown` and accepts it only when it
is a non-empty string, else it names the object by its `Object.prototype.toString` brand (still inside `canonicalKey`'s
guarded read, so a throwing `name` getter stays `Unreadable`). Every other value in a refusal sentence was already text
by construction: the path segments are strings or numbers the walk wrote, `kind` is a literal, and `message` comes from
`thrownMessage`, which never throws. Pinned with the review's two cases (a class whose `name` is a symbol, an object
`name` with a throwing `toString`) in `PortKey.test.ts`, both core judgements (a row and a site) and
`RemedyTotality.test.ts`. A scratch edit that restored the old `brandOf` turned the core rows red. ADR-QD-189 decision 4
states it (in the WR-01 commit, same hunk).

### WR-03: BEH-QD-588 still requires `readScoped` to fail with the `MissingResourceId` "that `errorOf` builds"

**Files modified:** `spec/behaviors/30-port-calls.md`, `spec/traceability.md`
**Commit:** ce33803f
**Status:** fixed
**Applied fix:** the second BEH-QD-588 requirement now says `requireResourceId` (`ScopedLeaf.ts`) builds the
`MissingResourceId`; the 30-port-calls change history (Rev 1.23, through `scripts/spec-revise.mjs`) names BEH-QD-588.
The port-calls row in the traceability table said the same stale thing (`through errorOf`) and was corrected with it.

### WR-04: `LeafNeeds.test.ts` "never asks about the resource id" can no longer fail

**Files modified:** `packages/core/test/LeafNeeds.test.ts`, `spec/traceability.md`
**Commit:** e31f388b
**Status:** fixed
**Applied fix:** replaced the tautology with "asks for exactly the inputs its own read and its matcher reference": for
every leaf it collects the set of absence tags over the four action and resource cells and compares it exactly with the
set the fixture's `own` and `refs` name, so a missing or a surplus absence fails. No other test in the file or in the
core tests asserts on a tag `Absence` no longer has (checked by grep for the tag and for `ResourceIdAbsence`).

### IN-01: The one guarded read is restated in `PortDerivation.ts`, against the doc comment that says no caller writes its own

**Files modified:** `packages/core/src/PortDerivation.ts`
**Commit:** dc2a5a89
**Status:** fixed
**Applied fix:** `key` is `readGuarded([], () => presentMembers(wire.toQuestion(args))).pipe(Result.flatMap(canonicalKey))`;
the now-unused `KeyRefusal` and `thrownMessage` imports are gone.

### IN-02: The "absent exactly when the schema refuses the value" rule has a third producer it does not describe

**Files modified:** `packages/core/src/DecisionHistory.ts`, `packages/core/src/Errors.ts`,
`packages/core/test/DecisionHistory.test.ts`, `.changeset/core-signature-answer-from-signatures.md`,
`.changeset/http-port-error-members-optional.md`, `apps/website/src/content/docs/docs/reference/upgrading.md`,
`spec/behaviors/06-services.md`, `spec/behaviors/12-history.md`, `spec/behaviors/23-http.md`, `spec/traceability.md`,
`spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md`
**Commit:** 1604604b
**Status:** fixed: requires human verification
**Applied fix:** the rule is now "a member is absent exactly when the request's value for it is unreadable or is not one
its schema admits, whether or not the key refuses it", written the same way in `Errors.ts` (both classes), BEH-QD-093,
BEH-QD-260, BEH-QD-410, BEH-QD-716, ADR-QD-189 decision 4, the upgrade guide and both changesets. The code meets it:
`actedAnswerFromEvents`'s unreadable-site failure carries `leaf.event` when its schema admits it (the event is the leaf's
own, which the site does not decide). The signature judgement's site failure keeps no member, as its subject id and
resource id are what was unreadable. Pinned: the two acted site tests (unreadable subject, resource id that throws) now
assert `event === "approved"`, and the first is retitled "a site subject that cannot be read fails the judgement with the
leaf's event, naming the site" in the test and in the four spec places that quote it.

### IN-03: ADR-QD-189 decision 4 says the refusal sentence "names the value"

**Files modified:** `spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md`
**Commit:** 8f4ae4af
**Status:** fixed
**Applied fix:** "which names the member and the kind of value", matching `describeKeyRefusal`'s own comment and
INV-QD-044.

### IN-04: BEH-QD-445's rewritten sentence leaves "Before it" without a referent

**Files modified:** `spec/behaviors/30-port-calls.md`
**Commit:** 861ed5cb
**Status:** fixed
**Applied fix:** the paragraph reads as it did before the phase ("The check is one function, `readScoped` ... Before it the
check was written three times ..."), which is still true, so "it" has its referent again; the phase's addition is a dated
note under it (2026-11-23, ADR-QD-189) that `requireResourceId` is the one decision and the fixture judgements call it
too. The 30-port-calls history entry (Rev 1.24) records it.

### IN-05: `agreeAt` is byte-identical in the two frozen agreement files, and the evidence note says no declaration is

**Files modified:** `.planning/phases/QD-76-remedies-uses-core-s-signature-match/76-RED-EVIDENCE.md`
**Commit:** 25e5db2a
**Status:** fixed
**Applied fix:** both `agreeAt` copies stay (the decision is frozen statements, and each closes over its own file's `LEAVES`,
`LISTS` and `mismatchOf`, so a move would change what it reads). A dated correction paragraph (2026-11-23, code review
IN-05) follows the original note, which is untouched: `agreeAt` has the same text in both files, what differs is what it
closes over, and `refusalOf` differs by one string, the error tag.

## Close

Not committed by the fixer: this report. Spec bookkeeping, committed: `spec/README.md` Rev 1.345, whose CCR-QD-468 row
cites each header's revision (06-services 1.23, 12-history 1.6, 23-http 1.20, 29-devtools-simulator 1.31, 30-port-calls
1.24, ADR-QD-189 "Rev 1.8 (new at 1.0; what enforces it at 1.1; corrected at 1.2 to 1.8, in code review)", invariants
1.205, traceability 1.286) and a file list equal to `git diff --name-only bf339146 HEAD -- packages spec scripts
.changeset apps` (46 files; `PortDerivation.ts` and `PortKey.test.ts` joined it). Commit 7960438b.

**Gates, on the final tree, main checkout:** `vitest --project core` 2788 passed; `--project devtools` 1789 passed;
`--project http` 310 passed; `pnpm typecheck` clean; `pnpm test:tstyche` 400 passed; `pnpm circular` clean;
`check-house-style` clean; `check-doc-examples` 118 blocks; `check-website-doc-examples` 71 blocks; `check-api-surface`
940 exports (unchanged: `readRows` is package-private); `check-package-install` 9 packages; `oxlint` on every phase `.ts`
file clean; `spec-revise --check` clean; `76-agreement-check.mjs` passes (3 frozen, 3 append-only files) and its
`--self-test` 28 passed; strict `verify-traceability` PASS 21 / FAIL 0.

---

_Fixed: 2026-11-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
