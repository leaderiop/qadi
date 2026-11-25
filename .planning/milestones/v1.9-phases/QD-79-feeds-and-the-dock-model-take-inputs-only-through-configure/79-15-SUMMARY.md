---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 15
subsystem: release-notes
tags: [changeset, upgrade-guide, readme, ccr, adr-correction, spec-revise, docs]
requires: ["79-14"]
provides:
  - .changeset/devtools-feeds-take-inputs-through-configure.md, a Breaking @qadi/devtools minor with eight listed changes
  - the 0.13 upgrade section "the feeds and the dock model take their inputs only through configure", last in upgrading.md, with a Change/Before/After table, a Before ts fence, a compiled After typescript fence and the ADR-QD-192 link
  - the devtools README says a feed is built bare, configured before it subscribes, and that a configure in which nothing moved does nothing
  - ADR-QD-192 decision 2 and ADR-QD-185's amendment say the dock applies the one rule through its feeds
  - the CCR-QD-471 row lists the changeset, the upgrade page, the website devtools page and the README, with current revision citations
affects: [79-16, 79-17]
key-files:
  created:
    - .changeset/devtools-feeds-take-inputs-through-configure.md
  modified:
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - packages/devtools/README.md
    - spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md
    - spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "The changeset states the package-private hook input type's deletion as a parenthesis of the DevtoolsDockProps bullet, because UseDockModelInput was never importable by a consumer"
  - "The changeset and the upgrade section add a closing line that the simulation session is unchanged, because a reader would otherwise ask whether it moved"
  - "The ADR correction rides in its own commit before the CCR row is completed, so the row cites final revisions"
requirements-completed: []
metrics:
  duration: 35min
  completed: 2026-11-24
status: complete
commits: 3
plan_head_before: 6ab52fa06ba3f4fc54f7b26b74b8ec18caaac722
plan_head_after: 3df9dab14c45f8e2d7ec214370fd7613ed499c57
actuals:
  tokens: 11000
  tasks: 2
  commits: 3
coverage:
  - deliverable: "the Breaking changeset, the 0.13 upgrade section and the README prose; both doc-fence gates pass; nothing is tagged"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-15-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
  - deliverable: "the CCR-QD-471 row completed with the non-spec files and the README's own revision; spec-revise check and spec:verify:strict pass; one commit holds exactly spec/README.md"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-15-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 15: The release notes and the completed CCR row

**A Breaking `@qadi/devtools` minor changeset, a 0.13 upgrade section with a compiled After example, and the README's prose tell a consumer to build a feed bare, configure it before subscribing, and expect a configure that moved nothing to do nothing; ADR-QD-192 now says the dock applies the one rule through its feeds.**

## Accomplishments

- `bb58292d` (`docs(79-15)`): the changeset (`**Breaking.**`, eight changes: the bare constructors, a no-op configure, an omitted input equal to `undefined`, the retry of a failed watch and the quiet mend, the pre-subscribed publishes, `DiagnosticsOptions` accepting `undefined`, `DevtoolsDockProps` as the dock model's inputs plus its two host props, and the simulation session left as it was); the upgrade section at the end of `upgrading.md` (one paragraph on what changed and why, a seven-row Change/Before/After table, a Before `ts` fence of `makeTimelineFeed({ source })` and `makeDiagnosticsFeed(options)`, an After `typescript` fence that builds both bare and configures before subscribing, and the ADR-QD-192 link); two README sentences (the root's feeds are built bare and take their inputs only through `configure`; a host configures before it subscribes, a no-op configure does nothing, and a failed watch is the one thing any configure retries).
- `f92ce4ab` (`docs(79-15)`, orchestrator-decided): see Deviations.
- `3df9dab1` (`docs(79-15)`): the CCR-QD-471 row lists `.changeset/devtools-feeds-take-inputs-through-configure.md`, the upgrading page, the website's devtools page and the devtools README beside the spec documents, its closing sentence names them in place of "follow in this change", and it cites `spec/README.md` Rev 1.368 (this row). No reserved number is Unused.
- Verification: both task verifies exit 0; `check-website-doc-examples.mjs` (75 blocks, one more), `check-doc-examples.mjs` (119), `check-api-surface.mjs` (942, unchanged), `check-house-style.mjs`, `spec-revise.mjs --check` and `pnpm spec:verify:strict` (21 pass, 0 fail) pass; HEAD is not tagged; nothing was versioned, published or pushed.

## Deviations from Plan

### Orchestrator-decided corrections

**1. [Orchestrator decision, 2026-11-24 - spec wording] ADR-QD-192 decision 2 said the dock applies `sameFields`**
- **Found during:** the brief for this plan (carried out as its own commit before Task 2)
- **Issue:** decision 2 read "every feed and the dock apply it to their inputs", but `DockModel.ts` never calls `sameFields`: the dock applies the rule through its feeds and holds one comparison of its own, the catalogue's (decision 9; INV-QD-403 and INV-QD-389's Source already said so). The same claim sat in ADR-QD-185's amendment (title, body and Status note), `spec/decisions/index.yaml`'s ADR-QD-185 status note, two `spec/traceability.md` rows (INV-QD-389 and ADR-QD-185) and the CCR-QD-471 row.
- **Fix:** decision 2 now says every feed applies it to its inputs and the dock applies it through its feeds, with no comparison of its own beside the catalogue's. Each other occurrence says "applied by the feeds, and through them by the dock". Revisions through `scripts/spec-revise.mjs --date 2026-11-24`: ADR-QD-192 1.1 to 1.2, ADR-QD-185 1.3 to 1.4, `traceability.md` 1.299 to 1.300, `README.md` 1.366 to 1.367; the CCR row's citations were set to 1.2, 1.4, 1.300 and 1.367 in the same commit (then 1.368 in Task 2's). A grep of `spec/` for "feeds and the dock", "the dock apply", "dock applies" and `sameFields` found no other occurrence (INV-QD-403 and INV-QD-404's Source, BEH-QD-732 and INV-QD-389's Source were already right).
- **Files modified:** the ADR, ADR-QD-185, `index.yaml`, `traceability.md`, `README.md`
- **Commit:** f92ce4ab

### Auto-fixed Issues

None. No plan verify failed on its own text.

## Decisions Made (autonomous)

- `UseDockModelInput` was exported from its module only and never from either barrel, so a consumer could not import it. The changeset says the hook's separate, package-private input type is deleted, inside the `DevtoolsDockProps` bullet, rather than as a change of its own.
- The simulation session is named as unchanged in both the changeset (its eighth bullet) and the upgrade section, so a host does not look for a `configure` on it.
- No new test or check was added, so `79-RED-EVIDENCE.md` has no entry for this plan.

## Risks for later plans

- 79-16's scans read added shipped lines: the changeset, the upgrade section and the README sentences were checked for decision numbers, plan and requirement ids and "no longer", "any more", "this phase", "until now" and "from now on"; none is present.
- The CCR row's README revision citation is read by a verify and moves with every later `spec-revise` of `spec/README.md`; a later plan that revises it again must update the citation in the same commit.

## Known Stubs

None.

## Threat Flags

None. The change is documentation and release notes: no endpoint, auth path, file access or schema change.

## Self-Check: PASSED

- FOUND: .changeset/devtools-feeds-take-inputs-through-configure.md
- FOUND commits: bb58292d, f92ce4ab, 3df9dab1
