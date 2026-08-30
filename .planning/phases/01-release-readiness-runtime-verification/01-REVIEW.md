---
phase: 01-release-readiness-runtime-verification
reviewed: 2026-08-30T02:35:06Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - .changeset/config.json
  - .github/workflows/check.yml
  - package.json
  - packages/audit/CHANGELOG.md
  - packages/audit/package.json
  - packages/core/CHANGELOG.md
  - packages/core/package.json
  - packages/devtools/CHANGELOG.md
  - packages/devtools/package.json
  - packages/http/CHANGELOG.md
  - packages/http/package.json
  - packages/predicate-prisma/CHANGELOG.md
  - packages/predicate-prisma/package.json
  - packages/predicate-sql/CHANGELOG.md
  - packages/predicate-sql/package.json
  - packages/promise/CHANGELOG.md
  - packages/promise/package.json
  - packages/react/CHANGELOG.md
  - packages/react/package.json
  - packages/testing/CHANGELOG.md
  - packages/testing/package.json
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-30T02:35:06Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

This phase's diff is entirely release-metadata: the changesets "fixed" group
was populated with all nine publishable packages, every package.json in that
group was bumped to `0.3.0`, nine `CHANGELOG.md` files were generated (and one
follow-up commit reordered — but did not reword — five of them for
readability), and `.github/workflows/check.yml` grew a two-Node matrix with a
90-minute-derived timeout bump.

I verified rather than trusted the release-engineering claims this phase makes
about itself, since that is exactly the kind of thing this codebase's own
`AGENTS.md` treats as a repeat offender (drifted docs, uncompiled examples,
mis-stated CI behavior):

- **Version arithmetic checks out.** Every package's pre-bump version and its
  own changeset entries (minor vs. patch) are consistent with landing at
  `0.3.0` under changesets' "fixed" semantics (highest bump in the group wins
  for everyone) — including packages whose *own* changes were patch-only
  (`@qadi/promise`) or would have landed one minor below `0.3.0` on their own
  (`@qadi/http`, `@qadi/devtools`, `@qadi/audit`, `@qadi/predicate-sql`,
  `@qadi/predicate-prisma`, all previously `0.1.0`).
- **The nine-package fixed group matches the nine publishable packages** under
  `packages/*` exactly; the three private workspace packages
  (`@qadi/website`, `@qadi/example-nextjs`, `@qadi/features`) are correctly
  outside it and need no `ignore` entry.
- **The CHANGELOG reordering commit's own claim was checked, not trusted**: a
  sorted-line diff confirms all five reordered files really are a pure
  permutation with no content added, dropped, or reworded.
- Every `ADR-QD-`/`INV-QD-`/`BEH-QD-` citation sampled from the new
  CHANGELOGs resolves to a real entry under `spec/`; none are dangling.
- All touched JSON is valid, the workflow YAML parses, and the
  `@changesets/config@4.0.0` schema reference in `.changeset/config.json`
  matches what the installed `@changesets/cli@3.0.1` actually depends on.
- The `engines` mismatch between the root (`>=20.19.0`) and each published
  package (`>=20`) is *not* a bug: the CI comment explains the tighter floor
  is a dev-tooling (`oxlint`) requirement, not a runtime requirement for
  consumers of the published libraries.

Two real defects surfaced in `.github/workflows/check.yml`, both in the
"Upload mutation report" step, and both undercut the step's own stated
purpose ("the one thing `pnpm check` produces that a log cannot show").

## Warnings

### WR-01: Mutation-report artifact name collides across the new Node matrix legs

**File:** `.github/workflows/check.yml:89-97`
**Issue:** This phase's commit (`03242c5`) turned the single-run `check` job
into a two-leg matrix (`node-version: ["20.19.0", "26"]`), but the "Upload
mutation report" step still uploads under a fixed, unparameterized name:

```yaml
- name: Upload mutation report
  if: always()
  continue-on-error: true
  uses: actions/upload-artifact@v4
  with:
    name: mutation-report
    path: reports/mutation/
    if-no-files-found: ignore
    retention-days: 14
```

`actions/upload-artifact@v4` enforces unique artifact names **per workflow
run**, not per job — unlike v3, two uploads with the same name in one run is a
409 Conflict, not a merge. With two matrix legs now running this step in the
same workflow run, whichever leg finishes second will fail to create the
artifact. `continue-on-error: true` hides this from the job's pass/fail
status, so the failure is silent: only one Node version's mutation-testing
report is ever actually retrievable from a given run, and which one "wins" is
a race rather than a choice. This directly defeats the diagnostic purpose the
step's own comment describes, for exactly the leg that loses the race.

**Fix:** Key the artifact name on the matrix dimension:

```yaml
      - name: Upload mutation report
        if: always()
        continue-on-error: true
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report-node${{ matrix.node-version }}
          path: reports/mutation/
          if-no-files-found: ignore
          retention-days: 14
```

### WR-02: Mutation-report upload only captures one of five Stryker report directories

**File:** `.github/workflows/check.yml:89-97`
**Issue:** `pnpm check` runs `pnpm mutation`, which (per `package.json`)
executes five separate Stryker configurations in sequence:

```
stryker run && stryker run stryker.devtools.mjs && stryker run stryker.predicate-sql.mjs && stryker run stryker.predicate-prisma.mjs && stryker run stryker.audit.mjs
```

Each writes its HTML report to a different directory
(`stryker.config.mjs` → `reports/mutation/`, `stryker.devtools.mjs` →
`reports/mutation-devtools/`, `stryker.predicate-sql.mjs` →
`reports/mutation-predicate-sql/`, `stryker.predicate-prisma.mjs` →
`reports/mutation-predicate-prisma/`, `stryker.audit.mjs` →
`reports/mutation-audit/`). The workflow's `path: reports/mutation/` only
picks up the first (core's). If a mutation score drops in `@qadi/devtools`,
`@qadi/predicate-sql`, `@qadi/predicate-prisma`, or `@qadi/audit` — four of
the five mutation-tested packages, three of which this very phase's
changesets specifically call out for hardened mutation coverage
(`@qadi/audit` 81.46% → 92.03%, `@qadi/devtools` "100% with no survivors") —
there is no uploaded artifact to inspect; only core's report survives the
run.

**Fix:** Upload all five directories, e.g. by widening the glob and using a
name that reflects the breadth:

```yaml
      - name: Upload mutation report
        if: always()
        continue-on-error: true
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report-node${{ matrix.node-version }}
          path: reports/mutation*/
          if-no-files-found: ignore
          retention-days: 14
```

(Combine with WR-01's fix — both bugs are in the same step.)

## Info

### IN-01: Private root package gains a version bump with no consumer

**File:** `package.json:3`
**Issue:** `qadi-monorepo`'s own `version` field moved from `0.0.0` to
`0.3.0` in this phase, mirroring the published packages' bump. The package is
`"private": true` and is never published, and nothing in `scripts/` reads its
own `package.json` version programmatically (checked: no
`require("./package.json").version` or equivalent reference anywhere in
`scripts/`). The bump is harmless but has no functional effect and invites a
reader to wonder whether some tool depends on it staying in sync with the
fixed group.
**Fix:** No action required; if this becomes a habit, either document why the
private root's version should track the fixed group (e.g., a future tool
reads it) or leave it at `0.0.0` to make clear it is inert.

---

_Reviewed: 2026-08-30T02:35:06Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
