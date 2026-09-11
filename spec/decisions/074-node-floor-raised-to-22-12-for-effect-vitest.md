# ADR-QD-074 — The Node floor moves to `>=22.12.0`, forced by the `effect`/`vitest` bump

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-074                                   |
> | Revision       | 1.1                                             |
> | Effective Date | 2026-09-11                                      |
> | Status         | Accepted                                        |
> | Author         | Qadi Engineering                                |
> | Classification | Architecture Decision Record                    |
> | Change History | 1.1 (2026-09-11): The `vitest` 5 bump broke the mutation gate too — `@stryker-mutator/vitest-runner`'s per-test coverage filter stopped matching anything under `vitest` 5, collapsing the mutation score to ~18% with no code change of ours. Patched (`pnpm patch`) rather than worked around, since no config workaround exists upstream. §"Mutation gate" added, `stryker.config.mjs` and the changeset both reference this ADR<br>1.0 (2026-09-11): Initial release |

---

## Context

`effect` was hard-pinned at `4.0.0-rc.112`. `@effect/vitest` and
`@effect/platform-node` publish against the same `effect` line and needed the
matching bump to stay lockstep with it — the same reasoning
`pnpm-workspace.yaml`'s own comment already gives for pinning `effect` itself
exactly rather than on a caret range.

The newest rc at the time this bump started was `4.0.0-rc.113`, and it was
tried first. It turned out to be a broken release: `effect`'s own shipped
`.d.ts` bundle references two types it never actually exports —
`Match.d.ts` imports `Contextual` from `internal/matcher.d.ts`, which does
not export it, and `Schema.d.ts` references `AnnotationSchemaConstraint`,
defined nowhere in that file. Both surfaced as a wave of `TS7006: Parameter
implicitly has an 'any' type` errors at every `Match.tagsExhaustive` and
several `Schema` call sites across the workspace — confirmed as an upstream
defect rather than a qadi-side regression by a ten-line reproduction outside
this codebase, and by inspecting the raw `npm pack`ed tarball directly,
which ruled out a local install or pnpm-linking problem. `4.0.0-rc.115`
(effect's own `rc.114` does not appear in its published version list — most
likely pulled for the same defect) fixes both: `Contextual` is now defined
inline in `Match.d.ts` instead of imported, and `AnnotationSchemaConstraint`
was renamed to `Constraint` and defined in the same file it's used in. This
bump lands on `4.0.0-rc.115`, not `rc.113`, for that reason.

`@effect/vitest@4.0.0-rc.115` narrowed its own peer requirement from
`vitest: ">=4.1.0 <5.0.0"` (what `rc.112` accepted) to `vitest: ">=5.0.0
<6.0.0"`. `vitest@5.0.0` in turn declares `engines.node: "^22.12.0 ||
^24.0.0 || >=26.0.0"` — it does not run on Node 20 at all, under any patch.
The workspace's declared floor was `>=20.19.0`, verified as a real,
CI-blocking claim rather than an aspirational one by ADR-QD-059's two-leg
matrix (`check.yml`'s `["20.19.0", "26"]`), and `packages/react/src/settled.ts`
documents a whole bug-hunt ("the Node 20.19.0 floor leg", COMPAT-01) built on
top of that floor being real and tested. This is a public commitment, not an
implementation detail: README's Requirements section and every published
package's `engines.node` state it, and a consumer building against qadi on
Node 20 today is relying on it.

There is no path that keeps both: `vitest` 5 is the version `@effect/vitest`
rc.115 requires, and it does not support Node 20 at any patch level. Two
alternatives were available instead of raising the floor:

- **Leave `@effect/vitest` on `rc.112` while bumping only `effect`.**
  Rejected: this is exactly the
  ABI-mismatch risk `pnpm-workspace.yaml`'s pin comment names for `effect`
  itself — "two rc builds satisfying a range are not guaranteed
  ABI-compatible" — just relocated to the test-tooling package instead of
  `effect`. Running the whole test suite through an `@effect/vitest` build
  linked against a different `effect` rc than the one it was tested against
  is the specific thing the exact-pin policy exists to avoid.
- **Don't bump `effect` yet; wait for a `vitest`-4-compatible `@effect/vitest`
  patch, or for `effect` to stabilize.** Viable, but forecloses the newest rc
  (bug fixes: `Cache.refresh` eviction/interruption fixes, `Equal`/`Hash`
  around `Effect.all`, etc.) indefinitely, on a dependency the maintainers do
  not control the timeline of. Not chosen — the newest working rc was the
  destination this bump set out to reach, and turned out to require going one
  rc further than planned (`rc.115`, not `rc.113`) once `rc.113` itself proved
  broken.

## Decision

Raise the workspace's declared Node floor from `>=20.19.0` to `>=22.12.0`,
everywhere it was previously stated:

- `engines.node` in the root `package.json` and every published package's
  `package.json` (all nine `@qadi/*` packages, `features/package.json`,
  `examples/nextjs-newsroom/package.json`).
- `README.md`'s Requirements section.
- `.github/workflows/check.yml`'s two-leg matrix: `["20.19.0", "26"]` →
  `["22.12.0", "26"]`. This is still a two-leg matrix for the same reason
  ADR-QD-059 gives — the floor leg turns `engines` into a verified claim, not
  a promise with nothing behind it — just re-pointed at the new floor.
- `@types/node` bumped from `^20.19.0` to `^22.12.0` in the three places that
  pinned it, to match.

This drops Node 20 support outright — not a deprecation window, a Node major
qadi's published packages no longer claim to run on as of the next release.
`packages/react/src/settled.ts`'s "Node 20.19.0 floor leg" comment and
`spec/behaviors/09-react.md`'s reference to the same are left as historical
discovery records (how those bugs were found), not current-support claims,
consistent with how this repository already treats rc-specific "verified
against build X" comments across a version bump — they are not restated on
every floor move.

`apps/website`'s Node floor (`>=22.12.0`, Astro's own) and the workspace floor
now coincide. ADR-QD-059's mechanism — reading Astro's floor live from its
manifest rather than restating it in `check-website-build.mjs` — is
unaffected and stays: the two floors are independently sourced and were
allowed to differ before this ADR, so nothing here should make them
structurally the same going forward, only currently equal. `CONTRIBUTING.md`'s
"why `apps/website/package.json` has no `engines` field" row and
`check-website-build.mjs`'s own doc comment are both updated to describe the
current numbers without claiming the two floors are now tied together by
anything other than coincidence.

## Mutation gate

The `vitest` 5 bump broke a third thing, discovered only once CI ran the full
gate suite (not caught by any local run against a real, isolated checkout —
see "Verification" below): `@stryker-mutator/vitest-runner`'s
`coverageAnalysis: "perTest"` mode filters which tests re-run against a given
mutant by building a `testNamePattern` regex from the suite-chain-plus-test
name, joined with a space. `vitest` 5 changed what that pattern matches
against — the full chain joined with `' > '` instead. The filter therefore
matched zero tests for every mutant, each ran against nothing, and Stryker's
default verdict for "no test result came back" is "Survived" — collapsing
`packages/core`'s mutation score from its normal ~90%+ to **17.64%** against
an 80% break threshold, with no change to any source file or test assertion.
Confirmed as upstream, not qadi-side, via
[stryker-mutator/stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)
(opened days before this bump, still open, no released fix) and its
companion fix, [PR #6214](https://github.com/stryker-mutator/stryker-js/pull/6214)
(open, unmerged, no target version at the time of this bump). The issue
thread explicitly rules out a config-level workaround — `coverageAnalysis:
"all"` does not avoid it either, so this could not be fixed by changing
`stryker.config.mjs`'s settings alone.

`@stryker-mutator/core`/`@stryker-mutator/vitest-runner` are bumped `9.6.1` →
`10.0.0` regardless (it also drops Node 20 support, matching this ADR's own
floor move), and `@stryker-mutator/vitest-runner@10.0.0` is patched via
`pnpm patch` (`patches/@stryker-mutator__vitest-runner@10.0.0.patch`) to
backport PR #6214's fix ahead of an upstream release: the per-test filter and
the sandbox's own copy of the same test-id-building logic
(`stryker-setup.js`, which is copied verbatim into the mutation sandbox and
cannot import from the package's own modules) both join with `' > '` on
`vitest >=5.0.0` and a plain space otherwise, matching how `vitest` 5 itself
joins. Verified by running all six mutation suites after patching: core
91.57%, devtools 98.17%, predicate-sql 97.97%, predicate-prisma 95.52%, audit
85.19%, http 85.41% — all clear the 80% break threshold. The patch is a
stopgap: remove it (`pnpm patch-remove @stryker-mutator/vitest-runner`, plus
dropping `stryker.config.mjs`'s comment) once a released
`@stryker-mutator/vitest-runner` version ships the fix.

## Alternatives considered

See Context — the two alternatives that would have avoided a floor change
were both rejected, for reasons specific to each rather than to raising the
floor itself. The mutation-gate breakage above had no alternative to weigh:
no config workaround exists, so patching the dependency was the only path
that didn't mean disabling a stated, load-bearing merge gate.

## Consequences

**Positive**:

- `effect`, `@effect/vitest`, and `@effect/platform-node` stay on the same rc
  line, preserving the ABI-compatibility guarantee the exact-pin policy
  exists for, rather than trading it away on the test-tooling side to keep
  Node 20 alive.
- Picks up the `vitest` 5 and `effect` `rc.115` fixes (including the two
  broken-`.d.ts` defects `rc.113` shipped) without an indefinite wait on
  upstream Node-20 support that may never come, given `vitest` 5 itself has
  already dropped it.
- `apps/website`'s floor and the workspace floor coinciding removes one
  standing source of confusion (two different Node floors in one repo) even
  though it's not architecturally guaranteed to stay that way.

**Negative** (named honestly, not minimized):

- Real, immediate loss of Node 20 support for every consumer of the nine
  published packages — this is a breaking change to a stated public
  requirement, not an internal refactor, and ships with a changeset
  documenting it as such rather than folded silently into a patch/minor note
  about the `effect` bump.
- `packages/react/src/settled.ts`'s Node-20-specific race-condition bug hunt
  becomes untested going forward (no CI leg exercises Node 20 anymore); the
  fix itself (never letting a subscription's listener count reach zero) is
  defensive and not Node-version-specific, so it is expected to remain
  correct on Node 22+, but that expectation is no longer continuously
  verified the way ADR-QD-059 made the floor claim continuously verified.

**Implemented**: `pnpm-workspace.yaml`, every published package's
`package.json`, `README.md`, `.github/workflows/check.yml`,
`CONTRIBUTING.md`, `scripts/check-website-build.mjs`'s doc comment,
`patches/@stryker-mutator__vitest-runner@10.0.0.patch`, `stryker.config.mjs`.
