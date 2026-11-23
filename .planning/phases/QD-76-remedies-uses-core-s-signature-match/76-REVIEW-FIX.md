---
phase: QD-76-remedies-uses-core-s-signature-match
fixed_at: 2026-11-23T19:00:00Z
review_path: .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 76: Code Review Fix Report

**Fixed at:** 2026-11-23
**Source review:** .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9 (two of them in part, stated below)
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), so every number below is reproducible
from the tree.

## Fixed Issues

### WR-01: "Never a throw, for any value the rows or the site hold" is false for rows, subjects and resources whose property reads throw

**Files modified:** `packages/core/src/PortKey.ts`, `packages/core/src/SignatureHistory.ts`,
`packages/core/src/DecisionHistory.ts`, `packages/devtools/src/model/Remedies.ts`,
`packages/core/test/helpers.ts`, `packages/core/test/SignatureHistory.test.ts`,
`packages/core/test/DecisionHistory.test.ts`, `packages/devtools/test/model/RemedyTotality.test.ts` (new),
`.changeset/core-signature-answer-from-signatures.md`, `.changeset/devtools-remedy-asks-core-signature.md`, and the spec
text of BEH-QD-093, BEH-QD-410, BEH-QD-716, BEH-QD-719, INV-QD-397, INV-QD-398, ADR-QD-189 and the traceability rows.
**Commit:** f4c0fd78 (status: fixed: requires human verification, a logic fix)
**Applied fix:** The claim is made true. One guarded read, `readGuarded` in `PortKey.ts`, built on `Result.try` and
`thrownMessage`, turns any throw into `KeyRefusal.Unreadable` naming the field. Both fixture lookups read each row field
through it (a `null` or `undefined` row, a getter that throws and a proxy whose trap throws fail the layer, the read and
the judgement typed, with the member absent and the cause naming the field and what was thrown). Both judgements read the
site once through it. `remedyEdits` reads the form's subject and resource through one guarded read (`readForm`) and
skips with what was thrown. Each case is pinned for each fixture, each judgement and `remedyEdits`, in new top-level
describes only. The new core rows failed on the code before the fix (three per signature file, checked by restoring the
old source). ADR-QD-189 decision 4 and 5, the BEH-QD-410 note, BEH-QD-716, BEH-QD-719, INV-QD-397 and INV-QD-398 state
the one rule, with Pinned-by lines naming the new rows.
**Interpretation to confirm:** "the port reads over them" is read as the reads over the fixture layers (they share the
guarded lookup). The evaluator's own read of its site (`askSignature`, `askActed` inside `evaluate`) is not guarded,
because it holds a subject `evaluate` already read; BEH-QD-716 and ADR-QD-189 say so plainly.

### WR-02: The optional error members are documented as absent only for a key-refused request, but the code (and tests) leave them absent for a keyable non-string subject id too

**Files modified:** `packages/core/src/Errors.ts`, `spec/behaviors/12-history.md`, `spec/behaviors/23-http.md`,
`spec/behaviors/06-services.md`, `spec/decisions/189-…md`, `apps/website/src/content/docs/docs/reference/upgrading.md`,
`.changeset/core-signature-answer-from-signatures.md`, `.changeset/http-port-error-members-optional.md`,
`packages/core/test/SignatureHistory.test.ts`, `packages/core/test/DecisionHistory.test.ts`
**Commit:** 15f5dc46
**Applied fix:** Every statement now says: a member is absent exactly when the request's value is not one the member's
schema admits, whether or not the key refuses it; the cause is the refusal's sentence when the key refuses and the
store's own cause when it admits. Two new top-level describes pin the case the review found (a subject id that is an
object, an event that is a number, with a failing store from `scriptedPort`): member-less error, the store's own cause,
and the key admits the request.

### WR-03: A resource-scoped leaf asked with no resource id fails `MissingResourceId` through the same test restated in both judgements

**Files modified:** `packages/core/src/ScopedLeaf.ts`, `packages/core/src/PortAccess.ts`,
`packages/core/src/SignatureHistory.ts`, `packages/core/src/DecisionHistory.ts`, `packages/core/src/LeafNeeds.ts`,
`packages/core/test/LeafNeeds.test.ts`, ADR-QD-163, INV-QD-288, INV-QD-398, BEH-QD-445, BEH-QD-717, traceability
**Commit:** df556b19
**Applied fix:** `requireResourceId` in `ScopedLeaf.ts` is the one check, called by `readScoped` and both judgements;
`isResourceScoped` is no longer restated anywhere else. It returns a `Result` (so `readScoped` keeps the narrowing of
`resourceId`), and builds the error in `ScopedLeaf.ts` because importing `LeafNeeds` would close a madge cycle. That left
`LeafNeeds`'s resource-id absence dead, so it is removed with its one assertion, and ADR-QD-163, INV-QD-288 and
BEH-QD-445 say so. INV-QD-398 and BEH-QD-717 list the helper among the shared pieces.

### IN-01: Two near-identical skip-sentence constants and a mangled `skipReason` doc comment

**Files modified:** `packages/devtools/src/model/Remedies.ts`, `spec/behaviors/29-devtools-simulator.md`
**Commit:** 5d04cd61
**Applied fix:** One `refusal(who, cause)` template writes the sentence for both ports and the form; `skipReason` is one
dispatcher over the three tags; its doc comment leads with a correct summary sentence.

### IN-02: Two conformance files and `remedyAgreement.ts` leave `gave`, `agreeAt`, `unkeyableRow`, `unkeyableSubject` and `refusalOf` copied in both

**Files modified:** `packages/devtools/test/remedyAgreement.ts`,
`packages/devtools/test/model/RemedySignatureConformance.test.ts`,
`packages/devtools/test/model/RemedyActedConformance.test.ts`,
`.planning/phases/QD-76-remedies-uses-core-s-signature-match/76-agreement-check.mjs`,
`.planning/phases/QD-76-remedies-uses-core-s-signature-match/76-RED-EVIDENCE.md`
**Commit:** 8ef46eac (status: fixed in part)
**Applied fix:** `gave`, `unkeyableRow` and `unkeyableSubject` moved to `remedyAgreement.ts` and are imported back under
their own names. The agreement check gained a moved-helper rule. "Equivalent" means the declaration's text, whitespace
collapsed and its leading `export` dropped, is the first commit's exactly; what the helper reads (a name only it used)
may leave the mover's imports if the shared module imports the same binding. The `--self-test` grew from 18 to 28 cases:
an identical move, other whitespace and the import move pass; a changed moved helper, a changed title, a changed
expected value, a helper the shared module does not export, a missing import in the shared module, a deleted helper, an
import dropped while the helper stayed, and an unnamed statement added to the shared module fail. `BASE` is unchanged.
`76-RED-EVIDENCE.md` has a dated note saying why. **Not moved:** `agreeAt` closes over each file's own `LEAVES`, `LISTS`
and `mismatchOf`, and `refusalOf` checks a different error tag per file, so no declaration of either is identical across
the pair; moving one would change a frozen statement, which the rule compares whole. The review's own fix named only
`gave`, `unkeyableRow` and `unkeyableSubject`, and parameterising `agreeAt` is exactly that kind of change.

### IN-03: The core copy of the devtools axes is justified, but the two core files copy their own helpers

**Files modified:** `packages/core/test/helpers.ts`, `packages/core/test/SignatureHistory.test.ts`,
`packages/core/test/DecisionHistory.test.ts`
**Commit:** 42eaa5ee
**Applied fix:** `alice`, `SITES`, the decoy row, `disagreement`, and the untyped builders (`untypedWith`,
`unkeyableRow`, `unkeyableSubject`) live in `helpers.ts` once. Leaves are chosen by structure (a `LEAVES` record keyed
by scope and role, a filter on `signerRole`), never by position or title.

### IN-04: `DecisionHistory.test.ts` restates the scope and id rule it checks, and a title misdescribes its body

**Files modified:** `packages/core/test/DecisionHistory.test.ts`, the pinned titles in BEH-QD-093/716/717 and ADR-QD-189
**Commit:** 42eaa5ee (shares the commit with IN-03, because both rewrote the same describe)
**Applied fix:** The row was outside the frozen prefix of `22d5b10c` (it sits in `describe("actedAnswerFromEvents")`), so
it was fixed: two tests, "a site whose subject id is a symbol fails as the read does, with the refusal and never
NotActed" and "an event row whose subject id is a symbol …", each naming its one input and stating the expected tags
literally in a table keyed by site and scope.

### IN-05: ADR-QD-189 and the CCR row carry planning-process wording in current-tense spec text

**Files modified:** `spec/decisions/189-…md`, `spec/README.md`
**Commit:** b32c08d3 (ADR), 3c8cf3f8 (CCR row)
**Applied fix:** Decision 1 states the decision and its reason (the alternative keeps two statements of one rule); decision
7 reads "Core's public surface gains two names, because the acted arm had the same defect in the same function"; the CCR
row says the same. No "roadmap", "milestone" or quoted instruction remains.

### IN-06: The `hasCustom` remedy test no longer pins the sentence it was written to pin

**Files modified:** `packages/devtools/test/model/SimulationFields.test.ts`, BEH-QD-720, ADR-QD-189, traceability
**Commit:** a7271f09
**Applied fix:** `Remedies.test.ts` is in the append-only prefix, so its row, title and its read of
`NO_CUSTOM_PREDICATE_FIELD.reason` are left (the check declares that substitution). The duplicated `remedyEdits` half of
the identity row in `SimulationFields.test.ts` is removed, and its title now says what it checks ("the custom-predicate
cell is the one shared no-vocabulary value"), so each fact is checked once. The literal stays pinned once, in "says why a
custom predicate has no cell". The spec text and its Pinned-by lines follow.

## Spec bookkeeping

Revisions through `node scripts/spec-revise.mjs --date 2026-11-23` (`--check` passes). The CCR-QD-468 row cites
06-services 1.21, 12-history 1.5, 23-http 1.19, 29-devtools-simulator 1.30, 30-port-calls 1.22, ADR-QD-058 1.3,
ADR-QD-094 1.12, ADR-QD-163 1.10, ADR-QD-189 1.5 ("new at 1.0; what enforces it at 1.1; corrected at 1.2 to 1.5, in code
review"), invariants 1.204, overview 1.135, traceability 1.281, README 1.344, and its file list equals
`git diff --name-only bf339146 HEAD -- packages spec scripts .changeset apps` (checked by script).

## Gates (all in the main checkout)

| Gate | Result |
| ---- | ------ |
| `vitest --project core` | 85 files, 2783 tests pass |
| `vitest --project devtools` | 76 files, 1785 tests pass |
| `vitest --project http` | 15 files, 310 tests pass |
| `pnpm typecheck` | clean |
| `pnpm test:tstyche` | 400 pass, 2 skipped (both passes) |
| `pnpm circular` | no cycle |
| `check-house-style` | 585 files clean |
| `check-doc-examples` / `check-website-doc-examples` | 118 / 71 blocks compile |
| `check-api-surface` | 940 exports (unchanged) |
| `check-package-install` | 9 packages pass |
| `oxlint` on touched `.ts` files | no finding |
| `spec-revise --check` | every Revision matches |
| `76-agreement-check.mjs`, `--self-test` | holds, 28 cases pass |
| `verify-traceability.sh --strict` | PASS 21 / FAIL 0 |
| added lines over 90 columns in `packages` | none |

---

_Fixed: 2026-11-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
