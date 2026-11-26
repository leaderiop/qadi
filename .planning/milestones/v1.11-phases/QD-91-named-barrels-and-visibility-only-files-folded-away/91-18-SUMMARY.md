---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 18
subsystem: spec
tags: [citations, decision-notes, changesets, named-barrel]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the folds (91-10 to 91-13), ADR-QD-204 and the CCR-QD-483 row (91-16), the behaviours, invariants and overview cells (91-17)
provides:
  - the sequence check's not-tamper-evident disclaimer cited at ArchiveFacts.ts in the audit README, the URS, the purpose model and ADR-QD-009
  - a dated note on each of ADR-QD-009, 039, 051, 077, 080, 107, 110 and 140 saying where its subject lives
  - the three patch changesets (core, react, audit), each holding its stated sentence
affects: [91-19 (stale sweep, including the source comments left here), 91-20 (ledger reconcile), 91-21 (close)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: f3949152
plan_head_after: 2c6f9750f30585bc362b79a08e5cffdd4912d49a
commits: 4

actuals:
  tokens: 14000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a note on a decision is appended after the decision's last amendment, one `> **Note (<date>, ADR-QD-204, CCR-QD-483).**` block, and the decision's own history stays as written"

key-files:
  created:
    - .changeset/core-named-barrel.md
    - .changeset/react-named-barrel.md
    - .changeset/audit-named-barrel.md
  modified:
    - packages/audit/README.md
    - spec/urs.md
    - spec/models/17-purpose.md
    - spec/decisions/009-observability-via-effect.md
    - spec/decisions/039-a-seed-is-not-an-authority.md
    - spec/decisions/051-a-span-says-what-was-asked.md
    - spec/decisions/077-both-interpreters-read-ports-through-one-module.md
    - spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md
    - spec/decisions/107-a-port-is-answered-remotely-through-its-description.md
    - spec/decisions/110-an-archives-facts-are-computed-once.md
    - spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md
    - spec/README.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-check.mjs

key-decisions:
  - "ADR-QD-009 takes its re-pointed citation and its note with no revision row: it has no Document Control block (decided autonomously)"
  - "Each note is appended after the decision's last amendment rather than inserted beside the paragraph it qualifies, so the decisions' chronological order of amendments is kept"
  - "The react changeset holds the structural-hydrateDecisions sentence, because packages/react/src/Hydration.ts is gone at HEAD"

requirements-completed: []

duration: 40min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 18: Re-point the disclaimer citations, note the folds, add the three patches Summary

**The sequence check's disclaimer is cited at `ArchiveFacts.ts` in the four documents that cite it, eight decisions say where their subject lives, and `@qadi/core`, `@qadi/react` and `@qadi/audit` each carry one patch changeset with its stated sentence.**

## Accomplishments

- Citations (`fb1e1e4d`): `packages/audit/README.md` (lines 115 and 128), `spec/urs.md:48`, `spec/models/17-purpose.md:240` and `spec/decisions/009-observability-via-effect.md:45` name `ArchiveFacts.ts`, each keeping its "not cryptographic tamper-evidence" wording; `spec/urs.md` 1.23 to 1.24 and `spec/models/17-purpose.md` 1.0 to 1.1 (one bump each); ADR-QD-009 gains a `> **Note (2026-11-26, ADR-QD-204, CCR-QD-483).**` block and no revision row. The CCR-QD-483 row in `spec/README.md` (stays at 1.417) names the two revisions, ADR-QD-009's note and the audit README. The only `SequenceIntegrity.ts` left in the four documents is `spec/urs.md:13`, inside its Change History row.
- Notes (`7fceb163`): one note on each of ADR-QD-039 1.2 to 1.3 (`hydrateDecisions` in the part-public `HydrationEngine.ts`, structural over `hydrate`; a seed is still not an authority), 051 1.6 to 1.7 and 107 1.4 to 1.5 (`PortInterpreter` stated once in `PortSpan.ts`; where the text says `PortInterpreter.ts`, read `PortSpan.ts`), 077 1.3 to 1.4 (`decodePortSpan` in `PortSpanEncode.ts` beside the encoder, that module's only public name), 080 1.4 to 1.5 (`makeGateRegistry` in `GateWriter.ts`, the writer slot still unnamed), 110 1.4 to 1.5 (the check declared and published from `ArchiveFacts.ts` with its disclaimer; the two names the barrel takes from it), 140 1.4 to 1.5 (the leaf's one local import is `DeveloperSignals.ts`; still below the atom set and React-free). Each links ADR-QD-204. `spec/decisions/index.yaml` is unchanged (notes, not amendments). The CCR-QD-483 row names the seven revisions.
- Changesets (`94cea732`): `.changeset/core-named-barrel.md` (`@qadi/core`, "No export changes. The barrel names its exports per module; `decodePortSpan` and `PortInterpreter` are declared where their concepts live."), `.changeset/react-named-barrel.md` (`@qadi/react`, the structural-`hydrateDecisions` sentence of D-29) and `.changeset/audit-named-barrel.md` (`@qadi/audit`, "No export changes. The barrel names its exports per module; the sequence check is declared in the archive facts module."), each `patch` for one package. `changeset version` was not run.

## Task Commits

1. Task 1: `fb1e1e4d` `docs(91-18): re-point the sequence check's disclaimer citations` (the five paths); `91-check.mjs commit` accepts it.
2. Task 2: `7fceb163` `docs(91-18): note the folds on the decisions they touch` (the eight paths); `91-check.mjs commit` accepts it.
3. Task 3: `94cea732` `chore(91-18): add the core, react and audit patch changesets` (the three paths); `91-check.mjs commit` accepts it.
4. Off-table: `2c6f9750` `fix(91-18): read an edited package from every source file under src` (`91-check.mjs` only).

## Checks run

- `pnpm spec:verify:strict` (21 pass, 0 fail), `node scripts/spec-revise.mjs --check`, `91-check.mjs scan-ids`, `trailers` (66 commits, each with the one trailer) and `records` exit 0.
- `91-check.mjs changesets` exits 0: `changesets: 3 patch changesets, one per edited public package`.
- `91-check.mjs records --close` exits non-zero by design: what remains is later plans' work (PROJECT.md IN-02, AGENTS.md section 16's wording, the two `RegistryLease.ts` header lines). None names a citation, a note, a revision, the CCR row or a changeset.
- `91-check.mjs --self-test`: 475 passed (one new row).
- `91-earlier-checks.mjs`: exit 0, `87 runs, all match their rows`, after each of the four commits. The seven revision bumps did not move any earlier phase's close row (no earlier close pins ADR-QD-039, 051, 077, 080, 107, 110 or 140), so no ledger row was added.

## Deviations from Plan

### Plan defects

**1. `91-check.mjs changesets` could not see core and react as edited.** The task's verify requires `changesets` to exit 0, but `editedPublicPackages` listed the edited packages with the git pathspecs `packages/*/src`, `packages/*/README.md`, `packages/*/package.json`. A glob pathspec does not take a directory's contents, so `packages/*/src` matched no file under any `src/` and only `packages/audit/README.md` counted: the judge answered "a changeset names @qadi/core, which is not edited since phase_base" (and the same for react) although both packages' sources were edited by the folds. Before: `git("diff", "--name-only", base, "HEAD", "--", "packages/*/src", "packages/*/README.md", "packages/*/package.json")` found `audit` alone; with `packages/*/src/*` it finds core (5 files), react (9) and audit (4). After: the pathspecs are an exported `EDITED_PATHSPECS` list holding `packages/*/src/*`, and a self-test row plants a repository with a nested source file and a test-file edit and requires that only the source file is found. Nothing is weakened: the judge now sees every edit it was meant to see, and still refuses a changeset for an unedited package and an edited package with no changeset. Off-table commit `2c6f9750`.

**2. The task's verify runs `changesets` before the commit that adds the three files.** The judge reads the changesets added between `phase_base` and `HEAD`, so it can pass only after the commit. It was run after `94cea732` (and again after the fix above); the commit check was run alongside it.

### Choices the plan left open (autonomous, most complete option)

**3. ADR-QD-009 has no revision row and takes its note.** As the plan says; the one citation and the note are its whole edit.

**4. Note placement.** Each note is appended after the last amendment of its decision, not inserted beside the paragraph it qualifies (the plan says "beside the text"); each note names the sentence it qualifies in its own words ("where the 2026-10-08 amendment says `PortInterpreter.ts`, read `PortSpan.ts`"), so a reader of the earlier text is sent to the right module and the amendment order stays chronological.

**5. Source comments are left for the next plan.** The present-tense mentions `packages/audit/src/AuditArchive.ts:112`, `AuditDecisionSinkLive.ts:16`, `AuditEntry.ts:92` (`SequenceIntegrity.ts`) and `packages/core/src/Decision.ts:69`, `FieldLattice.ts:71`, `packages/react/src/SeededDecision.ts:15`, `SeededQuestion.ts:18`, `HydrationEvent.ts:23` (`Hydration.ts`) are source comments outside this plan's `files_modified`; they are for plan 19's sweep (the three changeset packages are already the packages those edits belong to, so no further changeset is needed). `packages/react/test/ServerRender.test.tsx:189` is a held test and is not touched.

**Total deviations:** 2 plan defects, 3 open choices. **Impact:** one extra commit; no check weakened.

## Known Stubs

None.

## Threat Flags

None. T-91-34 (a release note that hides the `hydrateDecisions` parameter change, or a package edited without a note) is mitigated: `changesets` checks the exact sentences, and with the pathspec fix it checks that the edited public packages equal the changesets' packages.

## Self-Check: PASSED

- `.changeset/core-named-barrel.md`, `.changeset/react-named-barrel.md` and `.changeset/audit-named-barrel.md` exist; each holds one `"@qadi/<p>": patch` line; `ls .changeset` holds no other file added since `phase_base`.
- `packages/audit/README.md`, `spec/urs.md`, `spec/models/17-purpose.md` and ADR-QD-009 hold `ArchiveFacts.ts` where they held `SequenceIntegrity.ts` and still hold `tamper`; each of the eight decisions holds one `> **Note (` line naming `ADR-QD-204`, `CCR-QD-483` and its truth's name; the seven with a Document Control block and `spec/urs.md`, `spec/models/17-purpose.md` are each exactly one minor above their `phase_base` revision.
- Commits `fb1e1e4d`, `7fceb163`, `94cea732` and `2c6f9750` are ancestors of HEAD, each with the one trailer.
