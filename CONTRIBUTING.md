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

## Why the rules read the way they do

Every non-obvious rule in `AGENTS.md` explains its own reason inline — a past
defect, a measured tradeoff, an ADR — rather than asking you to trust it.
Read that reasoning before working around a rule that looks like it's in
your way; it usually exists because of something that already went wrong
once.
