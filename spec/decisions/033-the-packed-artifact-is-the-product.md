# ADR-QD-033 — The packed artifact is the product, so a gate installs it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-033                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-038) |

---

## Context

Ten merge gates checked the sources. None of them checked the package.

Every one of the 460 tests imports `src/` by relative path, and every example the doc
gate compiles does the same. So no gate had ever resolved a `@qadi/*` specifier through
a published `exports` map, and the artifact a consumer installs was verified by nobody.

That is not a theoretical gap. Verifying it by hand turned up two defects in an hour,
and the second one had been shipped for six commits.

**`npm pack` produces an uninstallable tarball.** Dependencies are declared with
pnpm's workspace-time protocols — `"effect": "catalog:"` in every package,
`"@qadi/core": "workspace:*"` in three — and `npm pack` copies them into the tarball
verbatim. Installing the result fails:

```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "catalog:": catalog:
```

`pnpm pack` rewrites both, to `>=4.0.0-beta.100 || >=4.0.0` and `0.0.0`. So these
packages are publishable with exactly one of the two tools, and nothing in the
repository recorded which.

**`tsconfig.build.json` never built `@qadi/promise`.** The reference was missing from
the day the facade landed in `dae3aa1`; the file had not been touched since the initial
scaffold. `pnpm build` emitted nothing for that package, so `pnpm publish` would have
shipped a manifest whose `exports` pointed at a `lib/` that did not exist — the whole
package, broken, on the registry.

The reason nobody noticed is the interesting part, and it is what the shape of this
gate had to answer to. `pnpm typecheck` runs `tsc -b tsconfig.json`, a **different**
project graph that *does* include the promise package, and `tsc -b` emits. So anything
that type-checked first left a `packages/promise/lib/` on disk that looked exactly like
a build product. The artifact appeared to exist because a different command had made
one.

## Decision

**`scripts/check-package-install.mjs`, gate 14, packs each public package, installs it into a throwaway sandbox, and makes a
TypeScript consumer authorize through it.** `scripts/check-package-install.mjs`, wired
into `pnpm check` before `stryker`.

Five checks:

| # | Check | Catches |
| - | ----- | ------- |
| 0 | every public package is referenced by `tsconfig.build.json` | a package the publish path never builds |
| 1 | no `catalog:`/`workspace:`/`link:`/`file:`/`portal:` in the packed manifest | a tarball no registry can resolve |
| 2 | every path in `exports`, and every `files` entry, exists in the tarball | a manifest pointing at absent files |
| 3 | each entry point imports through that `exports` map | a broken module graph |
| 4 | a TypeScript consumer type-checks against the shipped `.d.ts`, then authorizes | a declaration or behaviour regression |

**Check 0 is first because it is the only one a stale `lib/` cannot fool.** Checks 2 to
4 inspect whatever is on disk; if `pnpm typecheck` has already emitted a directory the
build path does not produce, they inspect that and pass. Reading the build graph is a
static question with a static answer. This is the one design decision in the script
that is not obvious, and it exists because the defect it catches had already hidden
from four other checks.

Check 4 asserts the security-relevant property rather than that the module loads: a
permission the subject holds allows, one it does not holds denies, and the Promise
facade agrees with the Effect path — including that a denial *resolves* `false` rather
than rejecting, which is [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)
seen from a consumer's position.

### Offline, deliberately

`effect` and `react` are symlinked out of the repository's own `node_modules` rather
than installed from a registry. A merge gate that needs the network fails for reasons
that have nothing to do with the change under review, and this one runs in CI behind a
gate that already takes minutes. The cost is that the sandbox resolves the versions this
workspace has installed rather than the versions the published range permits — which is
the right trade for a gate, and the wrong one for a compatibility matrix we do not have.

### One consumer fixture, compiled and then run

The fixture is a single `.ts` file. The gate compiles it with `tsc` and runs the emitted
JavaScript, rather than keeping a `.ts` copy for type-checking and a `.mjs` copy for
execution. Two copies of one consumer would be two representations of one thing, which
is the defect class this library was rewritten to remove; it would be a poor place to
reintroduce it.

## Alternatives considered

**`npm install` the tarballs from a registry-backed temp project.** This is what I did
by hand, and it is how the `catalog:` defect surfaced. Rejected as a gate: it needs the
network, takes an order of magnitude longer, and the failure it reports most often would
be a registry outage.

**`publint` or `arethetypeswrong`.** Both are good and both are narrower than the actual
finding. `publint` checks manifest well-formedness and would likely have caught the
`exports` half; neither reads `tsconfig.build.json`, so neither would have caught the
missing promise build, and neither runs an authorization. Adding a dependency to check
part of it, and then still writing checks 0 and 4 by hand, is worse than writing all
five. Reconsider if the manifest surface grows.

**Publish a release candidate and install it.** Rejected: it makes every verification
outward-facing and permanent. npm allows unpublishing for 72 hours and remembers the
version number forever.

**Test `lib/` directly, without packing.** Cheaper, and it would have missed both real
defects: `catalog:` only appears in a tarball's manifest, and `files` only matters when
something is packed. The tarball is the product.

## Consequences

[INV-QD-027](../invariants.md#inv-qd-027-the-published-package-decides-what-the-sources-decide)
carries the property: the package a consumer installs answers as the sources do. It is
asserted by installing it and asking — the same shape of evidence
[INV-QD-026](../invariants.md#inv-qd-026-the-facade-answers-what-the-core-answers) needed, and
for the same reason. Whenever there are two ways to obtain one answer, the agreement has
to be runnable rather than argued.

Publishing is now constrained in a way that is checked rather than remembered: **`pnpm
publish`, never `npm publish`.** The gate fails if a workspace protocol reaches a
tarball, which is what `npm publish` would do, so the constraint cannot rot into folklore.

The gate builds before packing, so `pnpm check` now runs `tsc -b` twice — once for the
typecheck graph and once for the build graph. That is a few seconds against a pipeline
that runs mutation testing, and it is the price of the two graphs being genuinely
different things: one includes tests and the acceptance suite, the other is what ships.

---

_Related: [ADR-QD-032](./032-promise-facade.md) · [INV-QD-027](../invariants.md#inv-qd-027-the-published-package-decides-what-the-sources-decide) · [Definitions of done](../process/definitions-of-done.md)_
