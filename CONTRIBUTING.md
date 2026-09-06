# Contributing

This is an index, not a tutorial — it points at the section of `AGENTS.md`
(the house-style authority) or `spec/` (the normative behavior spec) that
governs whatever you're about to touch, so you don't have to read either end
to end before your first change. It's written for whoever's making that
change next: a new contributor, future-you cold, or an agent session
starting fresh.

**Before anything**: run `pnpm check`. It *is* the definition of done — see
`AGENTS.md` §15 for why there is deliberately no separate CI step list to
drift out of sync with it.

## "I'm changing..."

| ...this | Start here |
| --- | --- |
| A service (`Context.Service`, a `Shape` interface) | `AGENTS.md` §2 |
| A layer (an implementation of a service) | `AGENTS.md` §3 — one implementation per file, own file |
| An error | `AGENTS.md` §4 — `Data.TaggedError`, unprefixed `_tag` |
| Any effectful function | `AGENTS.md` §5 — `Effect.fn`, not bare `Effect.gen` |
| Dispatch on a tagged union | `AGENTS.md` §5a — `Match`, not `switch` (four named, budgeted exceptions) |
| Anything on the forbidden list (`as`, `!`, `async`, ambient time/uuid) | `AGENTS.md` §6 |
| The `Policy` ADT itself | `AGENTS.md` §7 and `spec/decisions/002-schema-derived-policy-adt.md` |
| `@qadi/react` | `AGENTS.md` §13 — no React state for decisions, atoms only |
| `@qadi/promise` | `AGENTS.md` §14 — the facade may never decide anything |
| The Next.js example | `examples/nextjs-newsroom/README.md` — it consumes the packages as a stranger does, and is step 15 of `pnpm check` |
| A test | `AGENTS.md` §10; coverage thresholds are gated, not advisory |
| Anything in `spec/` | `spec/README.md` is the index; `spec/process/definitions-of-done.md` explains the gates |
| A public export | `spec/overview.md` must list it — `scripts/check-api-surface.mjs` fails otherwise |
| A claim that something is absent, in `spec/devtools-spec/` | Register it in that folder's "Claims of absence" table with the reason — `scripts/check-devtools-claims.mjs` fails otherwise |
| A merge gate | `pnpm check` and `spec/process/definitions-of-done.md` together — `scripts/check-dod-table.mjs` fails otherwise. Name the script beside any "gate N" |
| Package `dependencies`/publishing | `AGENTS.md` §16 — `pnpm publish` only, `tsconfig.build.json` membership |
| Publish-status prose in README/CONTRIBUTING/roadmap/website | `scripts/check-publish-status.mjs` fails if a quoted version disagrees with `package.json`'s |

## Releasing a version

[ADR-QD-038](spec/decisions/038-changesets-for-versioned-releases.md) scoped
itself to *tracking* changes, deliberately not to publishing itself — neither
runs in CI or `pnpm check` (CCR-QD-049), so both are manual and neither has a
runbook anywhere else. This is it.

**Add a changeset alongside any change to a published package's public
behavior** — `pnpm changeset`, answer its prompts (bump type, one-line
summary), commit the generated `.changeset/*.md` file with your change. Not
every change needs one: a doc fix or an internal refactor with no public
surface change does not.

**To cut a release**, from `main` with a clean tree:

```sh
pnpm changeset-version   # consumes pending .changeset/*.md, bumps package.json
                          # versions and CHANGELOG.md files, commits nothing itself
pnpm changeset-publish   # pnpm publish for each package that changed
```

All nine `packages/*` are one `fixed` group in `.changeset/config.json` — a
release bumps every one of them to the same version together, whether or not
that specific package changed. Verify what would actually happen with
`pnpm exec changeset status` before running either command; it lists which
packages have pending changesets and what the resulting versions would be.

**State as of this writing** (verified live against the npm registry,
2026-09-06): the root and every `packages/*/package.json` read `0.4.0`, and
all nine packages are published at `0.4.0` on npm — the five that had never
been published before (`@qadi/http`, `@qadi/devtools`, `@qadi/audit`,
`@qadi/predicate-sql`, `@qadi/predicate-prisma`) went out for the first time
in this same release, under the permanent fixed group above. `.changeset/`
holds no pending changesets. `pnpm publish`, never `npm publish` — AGENTS.md
§16 explains why the workspace-time `catalog:`/`workspace:*` protocols
require it. `scripts/check-publish-status.mjs` (merge gate 24) keeps this
paragraph's version honest going forward — it fails if a version quoted here,
in README.md, in spec/roadmap.md, or in apps/website/PRODUCT.md ever
disagrees with `package.json`'s again.

## Why the rules read the way they do

Every non-obvious rule in `AGENTS.md` explains its own reason inline — a past
defect, a measured tradeoff, an ADR — rather than asking you to trust it.
Read that reasoning before working around a rule that looks like it's in
your way; it usually exists because of something that already went wrong
once.
