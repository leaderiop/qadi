---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 03
subsystem: testing
tags: [surface-diff, public-surface, typescript-api, merge-gate, definitions-of-done, red-evidence]

requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: 91-check.mjs (the commit, scratch, variant and surface modes this plan's tasks run through) and the recorded phase_base
provides:
  - scripts/surface-diff.mjs (snapshot, compare, --self-test) and scripts/lib/surface-scan.mjs, its compiler child
  - pnpm surface:self-test as the last step of pnpm check, DoD step 27, and the CCR-QD-483 row
  - 91-surface-base.json and 91-SURFACE.md, the public surface at phase_base
  - five blocks of 91-RED-EVIDENCE.md showing the tool and the new step failing
affects: [91-04 through 91-21, every barrel commit (each is compared with the base), 91-check.mjs surface and homes]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 5381a765b2831fde49a22aeb03d77d8f0cc44df3
plan_head_after: 1be6db3249a3ba2a9f239fb6cf117cdadb5c52b6

actuals:
  tokens: 43000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a parent that names entries and a child that reads one declaration file through typescript/unstable/sync under runTypescriptChild's timeout (the module-state-scan precedent)"
    - "a self-test that writes planted declarations outside the repository and asserts the exact report lines, so a classifier regression cannot pass quietly"
    - "a stored count is never trusted: every figure is recomputed from the lists on read"

key-files:
  created:
    - scripts/surface-diff.mjs
    - scripts/lib/surface-scan.mjs
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-surface-base.json
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-SURFACE.md
  modified:
    - package.json
    - spec/process/definitions-of-done.md
    - spec/README.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md

key-decisions:
  - "The snapshot is a phase-local working file and never a gate; names stay gate 13's and value kinds the surface.test.ts lists'"
  - "kind is computed from the final symbol's flags unless any alias hop is type-only (a specifier, its declaration, or an import clause says so)"

requirements-completed: []

duration: 45min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 03: The surface tool and the base surface Summary

**`scripts/surface-diff.mjs` reads every public entry point's built declarations through the compiler, records each export as a name and a kind (`value`, `type`, `both`), names every added, removed or re-kinded export on `compare`, and runs a planted-defect self-test as the last step of `pnpm check`; the base surface (948 exports over 10 entries, gate 13's 943) is recorded before any barrel moves.**

## The tool

- `snapshot <out.json> [--phase-base <sha>]` writes `{ entries: { "<package><subpath>": { names, count, both } }, head, phase_base?, total }` with sorted keys and a trailing newline (two runs are byte-identical). A public entry with no name is refused.
- `compare <a.json> <b.json>` recomputes every `count`, `both` and `total` from the lists and refuses a stored figure that disagrees, a list out of order or repeating a name, and an entry with no names. It prints one line per difference (`ADDED`, `REMOVED`, `KIND a -> b`, or an entry on one side only) to stderr and exits 1, or `surface-diff: equal, <total> exports over <n> entries` and exits 0.
- A missing built entry is `surface-diff: <package> <entry>: <path> is missing; run pnpm build`. The tool refuses to run outside the repository root.
- The child (`surface-scan.mjs`) opens a temporary tsconfig outside the repository, walks each export's alias chain with `getImmediateAliasedSymbol`, treats a hop as type-only when an `ExportSpecifier`, `ImportSpecifier`, `ImportClause`, `NamespaceExport` or `NamespaceImport` has `isTypeOnly`, or its parent's or grandparent's flag says so, and throws on an unresolved export. A snapshot of all ten entries takes about 0.7 s.

## Self-test

`node scripts/surface-diff.mjs --self-test` ends `surface-diff self-test: 20 passed` (about 0.6 s). It writes a scratch package under `os.tmpdir()` (and a private one that must stay out) and asserts: the kind of each form (a class and a const-and-type pair by name are `both`; a pair behind `export { type X }` is `type`); `$`-prefixed and mixed-case names in ASCII order; recomputed counts; the four planted defects reported as exactly `KIND @scratch/pkg Err both -> type`, `ADDED @scratch/pkg Extra (type)`, `KIND @scratch/pkg Pair both -> type`, `REMOVED @scratch/pkg Plain (type)`; an identical pair, and a snapshot read back from its serialised form, with no difference; byte-identical snapshots; an entry on one side only; seven refusals (a missing built entry, an entry exporting nothing, a count, a `both` count and a total that disagree with their lists, a zero-name entry, an unsorted list, a package with no types entry); and the command line's exit codes (0 for equal, 1 for different).

The self-test was written first and run against a `compare` that returned nothing: 3 failed, 17 passed (the four-defect report, the one-sided entry, and the exit-1 case). With the real `compare` it passes.

## The merge gate

`package.json` `check` ends `… && pnpm bench:self-test && pnpm surface:self-test`; `surface:self-test` is `node scripts/surface-diff.mjs --self-test`. `spec/process/definitions-of-done.md` is at Revision 1.21 with row 27 and a "Step 27 … new in CCR-QD-483" paragraph; `spec/README.md` is at Revision 1.417 with the CCR-QD-483 row (ARCH-138). `node scripts/check-dod-table.mjs` prints `27 step(s) match pnpm check`. `run-check.mjs` needed no edit: the step builds and serves nothing, so the fast tier runs it.

## The base surface (91-SURFACE.md)

`gate13: 943`; tool total 948 over 10 entries (the 5 names devtools' root and `/react` share are counted once by gate 13).

| Entry | Names | Of kind both |
| ----- | ----: | -----------: |
| @qadi/audit | 72 | 22 |
| @qadi/core | 545 | 72 |
| @qadi/devtools | 142 | 10 |
| @qadi/devtools/react | 15 | 2 |
| @qadi/http | 75 | 9 |
| @qadi/predicate-prisma | 10 | 1 |
| @qadi/predicate-sql | 6 | 1 |
| @qadi/promise | 4 | 0 |
| @qadi/react | 62 | 4 |
| @qadi/testing | 17 | 0 |

Core's `export declare class` count is 41. Gate 14 printed `528 runtime export(s)`, recorded and not compared. The snapshot's `phase_base` equals the record's.

The `both` counts for audit (22) and react (4) are larger than the research's rough figures (7 and 1): they are the tool's reading of the built declarations, class included, and are what later plans compare against.

## Evidence: the tool and the step seen failing

Each block is in `91-RED-EVIDENCE.md`, written by `91-check.mjs variant` on a scratch clone.

| Label | Edit | Recorded failing text |
| ----- | ---- | --------------------- |
| `surface-type-only-class` | `export type { AccessDenied } from "./Errors.ts";` appended to core's barrel | `KIND @qadi/core AccessDenied both -> type` |
| `surface-dropped-name` | `export * from "./Retention.ts";` removed from the audit barrel | `REMOVED @qadi/audit PurgePlan (type)` and two more `REMOVED @qadi/audit` lines |
| `surface-missing-lib` | none: a fresh clone with no build | `@qadi/audit .: packages/audit/lib/index.d.ts is missing; run pnpm build` |
| `surface-self-test-classifier` | the `parent.parent` clause removed from the scanner | the four-defect case reports only the added and removed names, the class and pair `KIND` lines are missing |
| `dod-step-27` | row 27 removed from the clone's table | `[missing] pnpm check runs node scripts/surface-diff.mjs --self-test as step 27 and the table stops at 26` |

## Task Commits

1. Task 1: `e0c321d1` `feat(91-03): add the surface-diff tool and run its self-test in the merge gate` (exactly the five paths)
2. Task 2: `e958e844` `docs(91-03): record the surface baseline` (exactly `91-surface-base.json` and `91-SURFACE.md`)
3. Task 3: `1be6db32` `docs(91-03): record the surface tool seen failing` (exactly `91-RED-EVIDENCE.md`)

Each carries the one trailer; `91-check.mjs commit` passes for all three, `trailers` and `scan-ids` exit 0.

## Deviations from Plan

### Plan defects resolved by the smallest honest reading

**1. [Plan defect] The step count lives in prose the plan did not list.**
- **Found during:** Task 1, `node scripts/check-dod-table.mjs` after adding row 27.
- **Issue:** the gate's COUNT check requires the root `README.md` line `pnpm check         # all twenty-six gates, in order` to equal the number of steps, so step 27 fails it; `CONTRIBUTING.md` (twice) and `spec/roadmap.md` also say twenty-six. The plan lists none of them, the commit's path set is exactly five paths, and the run rules never stage the root `README.md` (it holds unrelated uncommitted edits).
- **Fix:** the one word was changed to `twenty-seven` in the working-tree `README.md` and left unstaged, so `check-dod-table.mjs` passes here (`27 step(s) match pnpm check`). The committed `README.md` still says twenty-six, so a clean checkout of `e0c321d1` fails that one check (the `dod-step-27` evidence block shows the line failing in a clone). The owner has to commit that line with the README's other edits, or the orchestrator has to allow a one-hunk commit. `CONTRIBUTING.md` and `spec/roadmap.md` still say twenty-six and no gate reads them; plan 15 edits `CONTRIBUTING.md` and can correct its two counts there.

**2. [Plan defect] `--phase-base` and `head` in the snapshot.**
- The plan's schema lists `phase_base?` and `head`; both are written (`head` is `e0c321d163fb1e19cc367b1d16082eafed9c87c5`, the commit that landed the tool). No change of meaning.

### Choices the plan left open (autonomous, most complete option)

- `compare` prints its difference lines to stderr (the failure channel) and the `equal` line to stdout; both are read by `91-check.mjs surface`.
- The scanner treats `NamespaceExport` and `NamespaceImport` hops like the three the plan names, so `export type * as ns` is also read as type-only.
- `compare` also refuses an unsorted or repeating name list and an unknown kind, beyond the count and zero-name refusals the plan names.

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None: the tool reads built declarations and writes only its snapshot argument and a temporary directory it removes; no network call.

## Self-Check: PASSED

- `scripts/surface-diff.mjs`, `scripts/lib/surface-scan.mjs`, `91-surface-base.json`, `91-SURFACE.md` exist.
- `e0c321d1`, `e958e844` and `1be6db32` are ancestors of HEAD, each with the one trailer.
- `node scripts/surface-diff.mjs --self-test` (20 passed), `node scripts/check-dod-table.mjs` and `node 91-check.mjs surface` exit 0; five evidence blocks, each with a non-zero exit.
