# Definitions of Done

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-PROC-02                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Process Specification                          |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-QD-001) |

_Previous: [Requirement Identifier Scheme](./requirement-id-scheme.md)_

---

## Merge gate

`pnpm check` must pass. It runs, in order:

| # | Command | Gate |
| - | ------- | ---- |
| 1 | `tsc -b tsconfig.json` | Sources compile |
| 2 | `tsc -p tsconfig.test.json` | Tests compile |
| 3 | `oxlint` | Lint clean |
| 4 | `node scripts/check-house-style.mjs` | House rules the linter cannot express |
| 5 | `vitest run --coverage` | Tests pass; thresholds met |
| 6 | `pnpm --filter @qadi/features test` | Acceptance scenarios pass |
| 7 | `node scripts/check-doc-examples.mjs` | Every runnable example in `spec/` compiles |
| 8 | `bash spec/scripts/verify-traceability.sh --strict` | Specification is internally consistent |
| 9 | `node scripts/check-api-surface.mjs` | `spec/overview.md` names every export of every public package |
| 10 | `node scripts/check-package-install.mjs` | The packed packages install, resolve and authorize |
| 11 | `stryker run` | Mutation score on `packages/core` is at or above 80% |

Step 7 was absent from this table until CCR-QD-026 while `pnpm check` had been
running it for some time — the documented gate was *weaker* than the real one,
which is the safe direction and still a defect in a normative document.

**CI runs this command and nothing else** — `.github/workflows/check.yml`, added in
CCR-QD-036. A workflow enumerating its own steps would be a second definition of
"done", and this table would drift from it exactly as `spec/overview.md` drifted from
the exports. Adding a gate means editing `pnpm check` and this table together.

Note what that costs: CI is only as complete as `check`. `pnpm format:check` is *not*
in it and fails on 127 of 145 files, which is a pre-existing state nobody has decided
about — recorded here rather than left for someone to discover.

Step 4 gained a `SWITCH_BUDGET` in CCR-QD-039. AGENTS.md §5a bans dispatching on a
`_tag` with `switch` and had named **two** deliberate exceptions while there were
**four**, with nothing checking the count — the rule was enforced by memory alone. The
budget declares each file and its exact number and fails in both directions, so a new
switch needs a written reason and a converted one needs the document updated.

Step 9 is new in CCR-QD-034, and it exists because the document it checks drifted
**twice**. CCR-QD-025 found `spec/overview.md` still describing the library as it stood
before any of the seven enablers shipped; six commits later it was missing ten more
exports and a whole package. Two occurrences in one working session is not an
oversight but a property of the process — nothing connected an export to its
documentation, so the connection survived only as long as someone remembered it. The
third fix is a gate rather than an edit.

It runs before step 11 deliberately: it takes milliseconds and mutation testing takes
ninety seconds, so a drifted document fails fast.

Step 10 is new in CCR-QD-038, and it is the first gate that looks at the package rather
than the sources. Every test in this repository imports `src/` by relative path, so
nothing had ever resolved a `@qadi/*` specifier through a published `exports` map.
Checking by hand found two defects in an hour: `npm pack` copies pnpm's `catalog:` and
`workspace:` protocols into the tarball verbatim, making it uninstallable, so these
packages are publishable with `pnpm` and not with `npm`; and `tsconfig.build.json` had
omitted `@qadi/promise` since the day the facade landed, so `pnpm build` emitted nothing
for it and publishing would have shipped that package empty.

The second defect explains the shape of the gate. It survived ten green gates because
`pnpm typecheck` uses a *different* project graph, one that does include the package,
and `tsc -b` emits — so a `lib/` was always on disk looking like a build product. The
gate's first check therefore reads `tsconfig.build.json` statically, because it is the
only check here that a stale directory cannot fool. See ADR-QD-033.

Step 11 is new in CCR-QD-026. It closes the gap the roadmap opened: coverage says
which lines executed, not which assertions mean anything, and every enabler in
this library was signed off with a mutation pass **run by hand and quoted into an
ADR**. Quoted evidence nobody else can reproduce is the predecessor's failure mode
in miniature. It adds about 75 seconds to `pnpm check`, which is the price of the
gate being real rather than described.

## Per-change checklist

- [ ] Behaviour change is reflected in the relevant `behaviors/*.md`.
- [ ] A new constraint has an invariant in `invariants.md` naming its enforcement mechanism.
- [ ] A new design choice with a real alternative has an ADR.
- [ ] New identifiers appear in `traceability.md` and the directory `index.yaml`.
- [ ] Coverage thresholds still met (95% core, 90% workspace).
- [ ] New user-visible behaviour has a Gherkin scenario tagged `@REQ-QD-NNN`.

## What "done" excludes

A requirement is not done because code exists that appears to satisfy it. It is
done when a test would fail if the behaviour regressed.

This is not pedantry. The predecessor shipped an evaluation-trace feature whose
timestamps came from `Date.now()`, so no test could assert trace contents; an
asynchronous relationship API that nothing called; and qualification evidence
asserting properties it never tested. Each looked done.

## Coverage policy

Thresholds are configured in `vitest.config.ts` and **fail the run**, rather
than being reported for someone to notice.

`packages/core` is held at 95% because it is pure logic with no I/O and no
untestable branches; the rest of the workspace at 90%.

Chasing the last few percent by testing trivia is discouraged. Where coverage
highlights an uncovered branch, the first question is whether the branch should
exist — twice during initial implementation the answer was no, and the code was
simplified rather than tested.
