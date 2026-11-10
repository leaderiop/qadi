# Phase 10: Planning reconciliation - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** none (planning and records only; no ARCH id, no ADR, no package change)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, `.planning/phases/_SALVAGE.md`

<domain>
## Phase Boundary

Make `.planning/` tell the truth about what is on `main`, so no later planner or reviewer builds on a plan that
didn't land:
- The untracked 2026-10-13 tracker (`.planning/architecture/`) is marked superseded. Each lost ARCH-46…57 plan gets
  a status line that maps it to its wave-6 phase, or records that it was fixed on main, obsolete, or deferred.
- The rescue branches are documented, and the id collision is explained in one place.
- The stale build output from the lost wave (orphan `packages/*/lib/*.js` with no `src` counterpart) is cleared,
  so a reader grepping `lib/` doesn't find modules that don't exist.
</domain>

<evidence>
## Evidence (1721a42)
- `.planning/architecture/README.md` tracks ARCH-46…57 with statuses like `done`
  (e.g. `ARCH-52-signature-ledger-read-seam.md:5`) for code that is not on `main`.
- 31 orphan `lib/` files: Nov 9 18:04 (`DecisionStream`, `LeafNeeds`, `EvaluationMetrics`, `AccessPlan`, `UnguardedRoute`,
  `HydrationEvent`, `SimulationFields`, `SignatureLedgerConformance`, `SequenceBreak`, `CompileMetrics` ×2),
  plus older ones from Sep/Oct (testing `Failing*`/`Recording*`, react `HydrationSeed`/`HydrationWarning`/`settled`,
  core `RetryingLayer`/`DecisionSink*`, devtools `TreeFold`). `lib/` is build output (check `.gitignore`), so this is
  a local clean, not a commit.
- `.planning/architecture/` is neither tracked nor ignored since `e0365e0` removed its `.gitignore` lines
  (`git check-ignore` exits 1).
</evidence>

<decisions>
## Implementation Decisions
- **D-01:** `.planning/architecture/README.md` gets a banner at the top: superseded on 2026-11-10; it lists which
  wave-6 phase picks up each lost plan and points to `.planning/phases/_SALVAGE.md`. Each lost plan file
  (ARCH-46…57) gets its frontmatter `status:` set to one of `superseded-by-phase-NN`, `fixed-on-main (<sha>)`,
  `obsolete` or `deferred`, plus a one-line reason. The body text is kept as history.
- **D-02 (`checkpoint:decision`):** whether to track `.planning/architecture/` in git. (A) Track it (it is the
  only record of waves 1–5's plans and decisions, and `PROJECT.md`'s "Validated" list cites ARCH-01…45).
  (B) Re-add it to `.gitignore`. (C) Move it under `.planning/milestones/archive-pre-gsd/` and track it there.
  Recommend **C**.
- **D-03:** the orphan `lib/` files go away through the repo's own clean/build (`pnpm build` / `tsc -b --clean`;
  the planner checks the scripts in `package.json`), not a hand `rm`. Verify with the orphan-finder loop from
  the evidence returning nothing.
- **D-04:** rescue branches stay **local** (never pushed) until wave 6's salvage phases (11–13) are merged; then a
  final task in Phase 13 proposes deleting them (a human checkpoint, since deletion is destructive).
- **D-05:** `PROJECT.md` and `STATE.md` (v1.1 milestone) get a "Lost wave" note. That note is written by the
  milestone scaffolding; this phase only verifies it is accurate.

### Claude's Discretion
- Exact banner wording.
</decisions>

<canonical_refs>
## Canonical References
- `.planning/architecture/README.md`, `.planning/architecture/ARCH-46…57-*.md`, `WAVE-*.md`
- `.planning/phases/_SALVAGE.md`, `.planning/PROJECT.md`, `.gitignore`, root `package.json` scripts
</canonical_refs>

<deferred>
## Deferred Ideas
- ARCH-55 (named core barrel) stays deferred, as it was.
</deferred>

---
*Phase: 10-planning-reconciliation · Context gathered: 2026-11-10*
