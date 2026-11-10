# Wave 6 — shared context for every phase (read before any phase's CONTEXT.md)

**Source review:** 2026-11-10 architecture review, `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261110-004912.html`
(local, outside the repo). Base commit: `1721a42` (`main`).

## House rules (non-negotiable)
- `AGENTS.md` is authoritative: `effect/*` submodule namespace imports, `.ts` relative imports, `import type`,
  `Context.Service` with a separate `…Shape`, top-level layer consts, `Data.TaggedError` (Schema only for the
  twelve budgeted classes), `Effect.fn`, `Match` not `switch`, no `as`/`!`/`any`, no `async`/`await`,
  no `Date.now`/`new Date`/`performance.now`/`console`/`process.env` outside the exempt file.
- Budgets in `scripts/check-house-style.mjs` (UNTRACED, SWITCH, ANY, SCHEMA_ERROR, HAS_CUSTOM, DECISION_READ,
  PORT_DOUBLE) are exact counts checked both ways. A plan that changes one updates AGENTS.md's table and the
  budget in the same task.
- Spec is normative (AGENTS.md §11): public behaviour change ⇒ `spec/behaviors/*`, `spec/invariants.md`,
  `spec/traceability.md`, `spec/README.md` (Document history + a CCR row), ADR + `spec/decisions/index.yaml`
  when a decision is made, `spec/overview.md` for any export added/removed (gate 13), `.changeset/*.md`.
  ` ```typescript ` fences in spec are compiled (gate: `check-doc-examples.mjs`).
- Merge gate is `pnpm check`; during work run `pnpm check:pr` (skips mutation). Run vitest from the repo
  root with `--project`, never from inside a package directory.
- **Test first** for every defect: the regression test is written and seen RED on `1721a42` before the fix.
- Mutation: plans must not lower the Stryker score of touched files — add tests at the new seam before
  deleting the old ones.
- Never merge or approve a version-packages PR, and never publish (standing instruction since 2026-10-06).

## User preferences (from memory — treat as locked)
- **Closed union over widening:** adding a case means writing out the full union, not `old | "New"`.
- **Prefer complete over simple:** don't plan the minimal option when a complete one is right; build every
  mode, layered.
- **`Record<string, unknown>` is a hack:** never use it as a widened implementation type to dodge `as`.
- **Ask once when blocked** on a human decision (one `checkpoint:decision`), then proceed.

## Numbering (wave 6)
- Phase dirs `10`–`20`; ARCH ids `ARCH-59` (Phase 11) … `ARCH-68` (Phase 20), in phase order. Phase 10 has none.
  (ARCH-46…54 and 58 are used by merged work; ARCH-46…57 were also used by the lost 2026-10-13 plans, so
  **never** reuse any id below 59.)
- ADR / CCR / BEH / INV: see `.planning/PROJECT.md` "Numbering reserved for this wave". Executors grep
  `spec/` to confirm a number is free before using it; ADR Document IDs must equal the file number (gate 10).

## Vocabulary
Architecture terms follow the codebase-design glossary: module, interface, implementation, depth, seam,
adapter, leverage, locality. Domain terms follow `spec/glossary.md`.

## Verify-command hygiene (added after plan-check, 2026-11-10)
- The executor's interactive shell is **zsh with `grep` aliased to a ugrep function**. Every verify command runs
  under `bash -c '…'` or uses `/usr/bin/grep` explicitly; patterns with `$`, `{`, `}` use `grep -F`; every glob
  argument is quoted (`--include='*.ts'`). A gate whose baseline was not measured with the same invocation is invalid.
- A negative gate ("this id/literal no longer appears") is scoped to the lines **this phase adds**
  (`git diff <phase-base> -U0 -- <paths> | /usr/bin/grep '^+'`), never to a whole tree that legitimately cites
  merged meanings of the same id (ADR-QD-108..116, INV-QD-243/244, CCR-QD-384..393 are merged and cited on main).
- A task's verify never runs a suite that still contains another task's intentionally RED test; exclude it by exact
  name (`-t` negation / file filter) or move the RED test into the fixing task.
- **Lost-wave ids (never new):** ADR-QD-108…110, CCR-QD-383…391, BEH-QD-334…336, INV-QD-242…245, ARCH-46…57.
- **Execution:** phases run strictly one at a time in numeric order (ROADMAP). Preconditions on a prior phase check for
  its phase-close `NN-*-SUMMARY.md` files, never for an ARCH id in a commit subject. A phase's base commit is its first
  commit's parent (find it from the phase's first plan id in `git log`), never `1721a42` for phases after 10.
- `use_worktrees` is false, so plans of the same wave run **one at a time** in the shared tree unless every
  verify they run is scoped to their own vitest project and files (repo-wide `pnpm typecheck`/`lint` only in a phase's
  final plan or when no sibling is mid-RED).
- **XC-05 mutation comparison:** record per-file Stryker scores at the phase base (`reports/mutation/*.json`, the
  path the repo's stryker configs write — check them) into the phase dir as `NN-mutation-base.json`, and compare with a
  node one-liner that fails if any touched file's score drops. "The report exists" is not a check.
