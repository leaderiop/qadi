---
phase: QD-76-remedies-uses-core-s-signature-match
fixed_at: 2026-11-23T23:00:00Z
review_path: .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-REVIEW.md
iteration: 3
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 76: Code Review Fix Report (iteration 3)

**Fixed at:** 2026-11-23
**Source review:** `.planning/phases/QD-76-remedies-uses-core-s-signature-match/76-REVIEW.md`
**Iteration:** 3

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), so the numbers reproduce from the tree.

## WR-01: BEH-QD-719 and ADR-QD-189 decision 5 say `remedyEdits` never throws for any value the form's subject or resource holds; it throws for a `hasRelationship` leaf and for a subject-attribute leaf

**Files modified:** `packages/devtools/src/model/Remedies.ts`, `packages/devtools/test/model/RemedyTotality.test.ts`
**Commit:** 028faf3f
**Applied fix:** The widened claim was kept and made true. `remedyEdits` now calls every requirement through one `remedyGuarded`, which runs the arm inside the one devtools guarded read (`readForm`). So no arm reads the raw form (the subject, its id, roles, permissions and attributes, the resource, its id and attributes, the action, the lists, `contextOf`'s reads, the Relationship arm and every other arm). A throw is a skip with the form's refusal sentence, named by one `requirementLabel` that every arm and the guard share. The Acted and Signature arms lost their separate `readForm` calls, since the outer guard covers them. `Remedies.ts`'s doc now states the total rule instead of "those two checks". `RemedyTotality.test.ts` gained a `describe` that pins a throwing getter for each field a requirement reads: subject roles, permissions, attributes and id (for `hasRelationship`); resource id (`hasRelationship`) and a resource attribute; the action; the relationships list; and a mixed policy where the readable requirement keeps its row beside the skipped one. The four new tests fail on the previous `Remedies.ts` and pass now.
**Status:** fixed: requires human verification (logic of the guard's scope)

## IN-01: `canonicalKey` writes the same `Unreadable` mapping as `readGuarded`, and `readGuarded`'s comment says no caller writes a `try`

**Files modified:** `packages/core/src/PortKey.ts`
**Commit:** 474303fd
**Applied fix:** One module-private `unreadable(path, error)` builds the refusal (copying the path, since a walk moves it on) and both `canonicalKey`'s catch and `readGuarded` use it. `readGuarded`'s comment now says it is the one guarded read callers use, so no caller outside the module writes a `try`, and that `canonicalKey` guards its own walk (its path is live where `readGuarded` copies it) and `thrownMessage` guards its own renderings.

## IN-02: `RemedyTotality.test.ts` documents the list tests above a helper and its header still says "a row or a site"

**Files modified:** `packages/devtools/test/model/RemedyTotality.test.ts`
**Commit:** 028faf3f (the same file as WR-01, so the same commit)
**Applied fix:** The list `describe`'s doc block moved to sit directly above that `describe`. The file header now names everything the file pins: rows, lists of rows, sites, the non-text class name, and the form fields the WR-01 arms read.

## IN-03: BEH-QD-445's current-tense paragraph still says the check is `readScoped`, against the dated note under it

**Files modified:** `spec/behaviors/30-port-calls.md` (Rev 1.25 through `spec-revise`), `spec/README.md` (Rev 1.346, last)
**Commit:** 01676245
**Applied fix:** The paragraph now says the check is one function, `requireResourceId` (`ScopedLeaf.ts`), which the one route, `readScoped` (`PortAccess.ts`), calls. The dated note keeps its date and ADR citation and now says only that the two fixture judgements call it too. The CCR-QD-468 row cites 30-port-calls.md at Rev 1.25 and README at Rev 1.346. All 13 cited revisions equal their headers, and the row's file list equals `git diff --name-only bf339146 HEAD -- packages spec scripts .changeset apps` exactly.

## Gates

Core (2788), devtools (1793) and http (310) vitest projects pass. `pnpm typecheck`, `pnpm test:tstyche` (74 files), `pnpm circular`, `check-house-style`, `check-doc-examples` (118), `check-website-doc-examples` (71), `check-api-surface` (940, unchanged), `check-package-install`, `oxlint` on the touched files, `spec-revise --check`, `76-agreement-check.mjs` and `--self-test` (28 passed) all pass. Strict `verify-traceability` reads PASS 21 / FAIL 0. No added line in `packages` is over 90 characters.

---

_Fixed: 2026-11-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
