# ADR-QD-033 — The packed artifact is the product, so a gate installs it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-033                                   |
> | Revision       | 1.7                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Accepted; amended 2026-11-21 (every child the gate starts has a timeout) |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.7 (2026-11-21): The killed child's TypeScript server exits when its pipe closes, shown on typescript@7.0.2; only a server that never reads its input again outlives the run, and the process-group kill is declined because Ctrl-C would no longer reach the child (CCR-QD-460)<br>1.6 (2026-11-21): amendment: the hang evidence is a blocked parser call in the child killed at the timeout, not a stopped TypeScript server (CCR-QD-460)<br>1.5 (2026-11-21): amendment: the probe guard's parse runs in a child under the gate's timeout, so every child the gate starts has one (CCR-QD-460)<br>1.4 (2026-11-21): amendment: the only child without a timeout, the TypeScript server behind `typescript/unstable/sync`'s `API`, is named, and a killed child reports its cause (ARCH-115, CCR-QD-459)<br>1.3 (2026-11-21): amendment: the probe guard reads what the consumer runs, and every `execFileSync` child has a timeout (ARCH-115, CCR-QD-459)<br>1.2 (2026-11-20): amendment: the consumer probes every make*Feed the packed devtools root exports and a DecisionCacheShape host cache, held by a probe guard (ARCH-110, CCR-QD-454)<br>1.1 (2026-10-07): check 3b added: the entry-point list is closed and the packed artifact is probed for it (ADR-QD-099, CCR-QD-188)<br>1.0 (2026-07-26): Initial release (CCR-QD-038) |

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

Six checks:

| # | Check | Catches |
| - | ----- | ------- |
| 0 | every public package is referenced by `tsconfig.build.json` | a package the publish path never builds |
| 1 | no `catalog:`/`workspace:`/`link:`/`file:`/`portal:` in the packed manifest | a tarball no registry can resolve |
| 2 | every path in `exports`, and every `files` entry, exists in the tarball | a manifest pointing at absent files |
| 3 | each entry point imports through that `exports` map | a broken module graph |
| 3b | no wildcard subpath in `exports`; every declared subpath imports, and every other `lib/` module is refused with `ERR_PACKAGE_PATH_NOT_EXPORTED` | a module the package meant to keep internal that a consumer can still import (ADR-QD-099) |
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

## Amendment (2026-11-20, ARCH-110, CCR-QD-454)

Check 4's consumer probes the names the devtools feeds and the decision cache made public,
through the packed artifact: it runs `makeGatesFeed` over a one-instance registry typed by
`GateRegistryLike`, runs `makeDiagnosticsFeed` to `Live` within a bounded yield loop and
refuses a `schedule` in `DiagnosticsOptions`, and wraps `decisionCacheLayer()` in a host
cache typed by `DecisionCacheShape`, with a `@ts-expect-error` on the pre-0.13
`getOrCompute(question, compute)` shape. A guard in `scripts/check-package-install.mjs`
keeps that list current: it reads the `make*Feed` names the packed `@qadi/devtools` root
exports and fails unless the fixture calls each one, read from the compiler's parse of the
fixture rather than its text. It also fails unless each name on a fixed type-only list,
today `DecisionCacheShape`, `GateInstanceLike` and `GateRegistryLike`, is a type reference
there outside a refused literal, and unless each name on a fixed refused-shape list, today
`DecisionCacheShape` paired with `getOrCompute` and `DiagnosticsOptions` paired with
`schedule`, annotates a declaration that holds a `@ts-expect-error` naming that member inside
its own text, so deleting the host cache, the pre-0.13 literal together with its directive,
or the `schedule` literal together with its directive, fails the check. A load, read or parse that fails is a failure, never a pass.

## Amendment (2026-11-21, ARCH-115, CCR-QD-459)

The probe guard reads what the consumer does, not only what its text names. A `make*Feed`
name counts as called when the consumer's run calls it: the consumer runs under a module
hook that wraps each `make*Feed` export of the packed `@qadi/devtools` and records each
call, so a probe that names a feed in code that never runs fails the check. A type-only name
counts only where it annotates a declared value outside a refused literal, and a refused
member only where the literal's own property of that name is led by the `@ts-expect-error`,
written `//` or `/* */`. Every `execFileSync` child the gate starts has a timeout, and one that is killed reports
its cause, the timeout or the signal, where it once printed nothing. When this amendment
was written, the one process the gate waited on without a timeout was the TypeScript server
that `typescript/unstable/sync`'s `API` starts: its calls block the process and the API
accepts no timeout, so a hang there hung the gate. The amendment below bounds it.
The diagnostics probe stops at `Stopped` and the check reports its reason; and a parser
that fails to load or run is reported naming the installed TypeScript, whose
`typescript/unstable/*` entry points the guard reads, so an upgrade that moves them fails
the gate naming that coupling.

## Amendment (2026-11-21, CCR-QD-460)

The probe guard's parse runs in a child process, `scripts/lib/probe-guard-parse.mjs`,
which the gate starts with `execFileSync` under the same timeout as every other child, so
every child the gate starts has a timeout. The child opens the sandbox's project with
`typescript/unstable/sync`'s `API`, reads `consumer.ts` and prints the probe names it found
as JSON; the gate decides every check from that, with the same failure texts as before, and
a child that fails, is killed or times out is reported naming the installed TypeScript and
the cause. A parser call that blocks, as a TypeScript server that stops answering would
make it, now ends the gate at the timeout instead of hanging it. What was shown is a hang
planted in the child (a blocked `API` constructor) ending the child at the timeout and being
reported, not a real stopped server. The gate kills only the child. The server that child
started reads its requests from the child's pipe and exits when that pipe closes: with
typescript@7.0.2, a child killed at the timeout left no server running, checked by the
server's own process id at once and three seconds later. Only a server stuck in a computation
that never reads its input again would outlive the run. Running the child in its own process
group and killing the group would end that case too, but a Ctrl-C at the terminal would then
no longer reach the child, so the gate does not do it.

---

_Related: [ADR-QD-032](./032-promise-facade.md) · [INV-QD-027](../invariants.md#inv-qd-027-the-published-package-decides-what-the-sources-decide) · [Definitions of done](../process/definitions-of-done.md)_
