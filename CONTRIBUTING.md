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

**While iterating**, `pnpm check` (measured at 27–29 minutes per CI leg,
`check.yml`) is the wrong tool — it is the pre-push/CI-identity gate, not the
loop you run after every edit (OT-05/EY-05). Use the scoped commands instead,
and save the full gate for before you push:

- `pnpm lint` — `oxlint` plus `scripts/check-house-style.mjs`, seconds, catches
  the budgeted-exception and import-style rules AGENTS.md §1–§6 describe.
- `pnpm --filter <package> typecheck` — a scoped `tsc -b`, e.g.
  `pnpm --filter @qadi/core typecheck`, far faster than the two full builds
  `pnpm typecheck` runs at the repo root.
- `npx vitest run --project <package>` — e.g. `npx vitest run --project core`
  — the affected package's own suite, without the other eight.

None of the three replaces `pnpm check` — coverage thresholds, mutation
testing, spec traceability, and the rest of the twenty-four steps only run
there — but for the common loop (edit one package, check it typechecks and
its tests pass) they are what to reach for, and `pnpm check` is what to run
once, before you push.

Six of those twenty-four steps are independent Stryker mutation runs, chained
sequentially by `&&` in the `mutation` script (`package.json`) because they
share no state to coordinate — sequential is simply what `&&` gives, not a
requirement. Nothing currently parallelizes or shards them, so their combined
wall-clock cost is paid in full on every `pnpm check` run; treat that as a
known, chosen cost rather than a surprise; revisiting it is a real option, not
yet taken.

**Platform notes**, since CI only ever runs `pnpm check` on `ubuntu-latest`
and these do not surface there:

- `pnpm spec:verify:strict` (step 10) shells out to `spec/scripts/verify-traceability.sh`,
  a `#!/usr/bin/env bash` script — the one non-Node, non-`tar` external
  binary the whole gate depends on. Stock Windows (cmd.exe/PowerShell with no
  WSL or Git Bash on `PATH`) has no `bash`, so completing `pnpm check` locally
  on native Windows needs one of those installed.
- `examples/nextjs-newsroom`'s own `check` (step 15) runs
  `playwright install --with-deps chromium`. `--with-deps` installs the
  browser's OS-level dependencies only on Linux (and needs passwordless
  `sudo`, which `ubuntu-latest` has and a local machine may not) — on macOS
  or Windows it installs the browser binary and silently skips that step. A
  local Playwright run failing to launch Chromium on macOS/Windows likely
  needs its OS dependencies installed by hand instead.

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
| Why `pnpm install` patches `node_modules/typescript` | `README.md`'s Development section — `effect-tsgo patch` is `@effect/tsgo`'s own `prepare` step, not this repo's |
| Why `apps/website/package.json` has no `engines` field, unlike every published package | Deliberate, not an oversight: the workspace floor is a claim about the nine *published* packages, and `apps/website` is `private: true` and publishes nothing, so it doesn't restate that number — it reads Astro's own floor live via `scripts/check-website-build.mjs` instead. The two floors happen to coincide at `>=22.12.0` as of this writing (they diverged before ADR-QD-074 raised the workspace floor to meet Astro's — see ADR-QD-059), but restating either number here would duplicate a fact one side could drift from independently of the other. `features/package.json`, which carries the workspace floor directly, has no such independent-drift risk |
| A budgeted exception (a new `switch`, `Effect.fnUntraced`, `any`, or `hasCustom` call site) | `AGENTS.md` §5/§5a for the discipline, plus the matching budget table in `scripts/check-house-style.mjs` (`SWITCH_BUDGET`/`HAS_CUSTOM_BUDGET`/`UNTRACED_BUDGET`/`ANY_BUDGET`) and the ADR that measured it (ADR-QD-055/073/075) — the table, the budget, and (for `fnUntraced`) the benchmark justifying it move in the same change, or the gate fails in the direction that caught the drift (JG-06) |
| A doc example or code comment under `spec/` | `AGENTS.md` §12 — ` ```typescript `/` ```tsx ` fences are compiled by `scripts/check-doc-examples.mjs` and must import what they use; ` ```ts ` is reference material only, not compiled (SM-06) |
| `AGENTS.md` itself | Its own doc-comment-shape preamble (lead with what, follow with why) — a fenced example inside it is illustrative prose (`ts`), never assumed to compile, unlike the same fence language under `spec/` (SM-06) |

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
2026-09-19): every `packages/*/package.json` reads `0.7.0`, and all nine
packages are published at `0.7.0` on npm. The root `package.json` is **not**
part of the fixed group above — `changeset version` never touches it — and it
stays frozen at its own, unrelated version; it is not a publish-status signal
for anything under `packages/`. `.changeset/` holds no pending changesets.
`pnpm publish`, never `npm publish` — AGENTS.md §16 explains why the
workspace-time `catalog:`/`workspace:*` protocols require it.
`scripts/check-publish-status.mjs` (merge gate 24) keeps this paragraph's
version honest going forward — it fails if a version quoted here, in
README.md, in spec/roadmap.md, or in apps/website/PRODUCT.md ever disagrees
with what every `packages/*/package.json` agrees on (RC-01/DH-05: it used to
check against the root's version instead, which is exactly the fact that had
gone stale).

## Why the rules read the way they do

Every non-obvious rule in `AGENTS.md` explains its own reason inline — a past
defect, a measured tradeoff, an ADR — rather than asking you to trust it.
Read that reasoning before working around a rule that looks like it's in
your way; it usually exists because of something that already went wrong
once.
