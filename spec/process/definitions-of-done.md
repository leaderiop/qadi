# Definitions of Done

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-PROC-02                                   |
> | Revision       | 1.5                                            |
> | Effective Date | 2026-08-28                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Process Specification                          |
> | Change History | 1.5 (2026-08-28): Step 22 — `apps/website` itself must type-check and build; step 21 alone only checked its embedded doc snippets (found in review, CCR-QD-091)<br>1.4 (2026-08-27): Step 21 — doc-snippet type-checking for `apps/website` (wayfinder #25, CCR-QD-090)<br>1.3 (2026-08-25): Step 20 — mutation testing for `@qadi/audit` (ADR-QD-056, CCR-QD-086)<br>1.2 (2026-08-25): Steps 18 and 19 — mutation testing for `@qadi/predicate-sql` and `@qadi/predicate-prisma` (ADR-QD-054, CCR-QD-080)<br>1.1 (2026-08-25): The document control caught up with five CCRs that had edited this table without touching it — CCR-QD-026 (step 13), CCR-QD-034 (step 11), CCR-QD-038 (step 12), CCR-QD-039 (the `SWITCH_BUDGET` note) and CCR-QD-048 (steps 5–6). Step 14 tabled, having run untabled since CCR-QD-067; steps 15 and 16 added (CCR-QD-075)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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
| 5 | `madge --circular --extensions ts,tsx packages/*/src` | No circular imports across any package's sources |
| 6 | `tstyche` | Type-level tests pass (`*.tst.ts`) |
| 7 | `vitest run --coverage` | Tests pass; thresholds met |
| 8 | `pnpm --filter @qadi/features test` | Acceptance scenarios pass |
| 9 | `node scripts/check-doc-examples.mjs` | Every runnable example in `spec/` compiles |
| 10 | `bash spec/scripts/verify-traceability.sh --strict` | Specification is internally consistent |
| 11 | `node scripts/check-dod-table.mjs` | This table is the merge gate `pnpm check` actually runs |
| 12 | `node scripts/check-devtools-claims.mjs` | `spec/devtools-spec/` says why each thing it calls absent still is |
| 13 | `node scripts/check-api-surface.mjs` | `spec/overview.md` names every export of every public package |
| 14 | `node scripts/check-package-install.mjs` | The packed packages install, resolve and authorize |
| 15 | `pnpm --filter @qadi/example-nextjs check` | The Next.js example type-checks, builds, and its claims hold in a browser |
| 16 | `stryker run` | Mutation score on `packages/core` is at or above 80% |
| 17 | `stryker run stryker.devtools.mjs` | Mutation score on the `@qadi/devtools` **model** is at or above 80% |
| 18 | `stryker run stryker.predicate-sql.mjs` | Mutation score on `packages/predicate-sql` is at or above 80% |
| 19 | `stryker run stryker.predicate-prisma.mjs` | Mutation score on `packages/predicate-prisma` is at or above 80% |
| 20 | `stryker run stryker.audit.mjs` | Mutation score on `packages/audit` is at or above 80% |
| 21 | `node scripts/check-website-doc-examples.mjs` | Every runnable example in `apps/website`'s docs content compiles |
| 22 | `node scripts/check-website-build.mjs` | `apps/website` type-checks and builds (`astro check && astro build`) on every matrix leg whose Node satisfies astro's own `engines.node`; below that floor the step states the skip and names the leg that does build |

Step 21 (`node scripts/check-website-doc-examples.mjs`) is a sibling of step 9
(`node scripts/check-doc-examples.mjs`), not an extension of it (wayfinder
#25): it walks `apps/website/src/content/docs` instead of `spec/`, shares the
same fence extraction via `scripts/lib/extract-code-fences.mjs`, and compiles
under the workspace's own TypeScript 7.x rather than `apps/website`'s local
6.0.3 pin — that pin is about Astro/Starlight tooling lag, not about what a
snippet-copying reader experiences. It checks the *content* embedded in
`apps/website`'s docs, not the app itself: neither `tsc -b tsconfig.json`
(step 1) nor `oxlint` (step 3) reaches `.astro` files or this workspace
member, so without step 22 a broken Astro page, an invalid component prop, or
a sidebar `slug:` pointing at a file that doesn't exist would fail
`astro build` locally but ship past a green `pnpm check`. Step 22 closes that
gap the same way step 15 closes it for the Next.js example — one workspace
boundary, one step, `check-dod-table.mjs`'s stated reason for not expanding
past `pnpm --filter`.

Both steps are appended rather than inserted, so steps 1–20 keep their
numbers and every existing cross-reference to a gate by number stays correct.

Step 15 is new in CCR-QD-076. It runs `examples/nextjs-newsroom`'s own `check` —
`tsc --noEmit`, `vitest run`, `next build`, then Playwright against `next start` —
as **one** step, because a workspace boundary is one step and
`check-dod-table.mjs` stops expanding at `pnpm --filter` for exactly that reason.

It is placed after `check-package-install.mjs` and before mutation testing.
After, because that gate already runs `pnpm build` and the example consumes the
packages through their `exports` maps rather than through the workspace's `src`
path aliases — it is a consumer, and it should compile against what ships.
Before, because it takes about a minute and mutation testing takes rather more.

Its Playwright half is the only place in this repository where a real browser
runs, and it earns that: the lens measures a `display: contents` marker with
`Range.selectNodeContents`, happy-dom has no layout, and
`packages/devtools/test/react/Lens.test.ts` therefore stubs the measurement. The
one claim that needed an engine was the one nothing had ever run in one. The
browser is installed inside the example's own `check` rather than in CI, because
CI runs `pnpm check` and nothing else and a second list of steps would be a
second definition of done.

Steps 5 and 6 are new in CCR-QD-048 ([ADR-QD-037](../decisions/037-circular-imports-and-type-level-tests-are-gates.md)).
Both are placed here — after the lint family, before the slower runtime
suite — for the same reason `check-doc-examples.mjs` already sits ahead of
mutation testing: each takes under two seconds combined, so a regression in
either fails before anything slower even starts. Step 6 depends on
`tstyche.json` pinning a specific TypeScript version (`6.0.3`, the newest
`tstyche` currently supports) rather than the workspace's own
`typescript@^7.0.0` — a real, standing gap the ADR records rather than
hides; a `.tst.ts` assertion passing is not the same claim `tsc -b` makes.

`node scripts/check-doc-examples.mjs`, step 9, was absent from this table until
CCR-QD-026 while `pnpm check` had been running it for some time — the documented
gate was *weaker* than the real one, which is the safe direction and still a
defect in a normative document. It happened again with the devtools mutation run;
see step 16.

**CI runs this command and nothing else** — `.github/workflows/check.yml`, added in
CCR-QD-036. A workflow enumerating its own steps would be a second definition of
"done", and this table would drift from it exactly as `spec/overview.md` drifted from
the exports. Adding a gate means editing `pnpm check` and this table together.

Note what that costs: CI is only as complete as `check`. `pnpm format:check` is *not*
in it and fails on 127 of 145 files, which is a pre-existing state nobody has decided
about — recorded here rather than left for someone to discover.

`node scripts/check-house-style.mjs`, step 4, gained a `SWITCH_BUDGET` in CCR-QD-039. AGENTS.md §5a bans dispatching on a
`_tag` with `switch` and had named **two** deliberate exceptions while there were
**four**, with nothing checking the count — the rule was enforced by memory alone. The
budget declares each file and its exact number and fails in both directions, so a new
switch needs a written reason and a converted one needs the document updated.

`node scripts/check-api-surface.mjs`, step 13, is new in CCR-QD-034, and it exists
because the document it checks drifted **twice**. CCR-QD-025 found `spec/overview.md` still describing the library as it stood
before any of the seven enablers shipped; six commits later it was missing ten more
exports and a whole package. Two occurrences in one working session is not an
oversight but a property of the process — nothing connected an export to its
documentation, so the connection survived only as long as someone remembered it. The
third fix is a gate rather than an edit.

It runs before `stryker run`, step 16, deliberately: it takes milliseconds and
mutation testing takes ninety seconds, so a drifted document fails fast.

`node scripts/check-package-install.mjs`, step 14, is new in CCR-QD-038, and it is the
first gate that looks at the package rather than the sources. Every test in this repository imports `src/` by relative path, so
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

Step 16 is new here in CCR-QD-075 and was **running untabled since CCR-QD-067**.
`"mutation"` was `stryker run && stryker run stryker.devtools.mjs` — two configs,
because `stryker.config.mjs` pins `vitest.dir` to `packages/core` and a mutant in
another package would have no covering test, survive, and fail the gate for a
reason unrelated to the change under review. The table documented one of the two,
so the documented gate was **weaker than the real one** — the same defect
`check-doc-examples.mjs` caused above, and one that misled a reader of this
repository into reporting a devtools-only score as the whole picture.
`scripts/check-dod-table.mjs` now checks this table against `pnpm check`, so a
third occurrence fails the build.

Steps 18 and 19 are new in CCR-QD-080, for the same reason step 17 exists:
`@qadi/predicate-sql` and `@qadi/predicate-prisma` (ADR-QD-054) are compilers a
surviving mutant in makes wrong, not slow — the SQL/`WhereInput` a caller's
query actually runs, checked against `evaluatePredicate` by INV-QD-047 and
INV-QD-048. Each package gets its own config for the same `vitest.dir`
reason step 17's config does, and `"mutation"` now runs all four in sequence.

Step 20 is new in CCR-QD-086, for the same reason: `@qadi/audit`
(ADR-QD-056) writes what a compliance reviewer trusts, and a surviving
mutant there is a wrong audit trail, not a slow one — checked against
INV-QD-051 through INV-QD-055. `stryker.audit.mjs` mirrors
`stryker.config.mjs`'s barrel exclusion (`!packages/audit/src/index.ts`)
rather than the predicate compilers' pattern, because `@qadi/audit`'s
`index.ts` is a real re-export barrel, not the implementation itself.
`"mutation"` now runs all five in sequence.

Step 15 is new in CCR-QD-026. It closes the gap the roadmap opened: coverage says
which lines executed, not which assertions mean anything, and every enabler in
this library was signed off with a mutation pass **run by hand and quoted into an
ADR**. Quoted evidence nobody else can reproduce is the predecessor's failure mode
in miniature. It adds about 75 seconds to `pnpm check`, which is the price of the
gate being real rather than described.

`pnpm bench` is **not** a gate and is not in `pnpm check` (ADR-QD-034). A timing
threshold on a shared runner fails for reasons unrelated to the change under test — the
same property that made the mutation artefact upload `continue-on-error`. Benchmarks are
a tool for arguing about a regression, with `vitest bench --compare`, and
`packages/*/bench` is type-checked so one cannot rot away from the API it measures.

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
