---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 05
subsystem: devtools-lens-session
tags: [lens, headless-session, tagged-enum, external-store, fast-check]
requires: [80-04]
provides:
  - makeLensSession, LensSnapshot, pickedOf, isPicking, LensSession in packages/devtools/src/model/LensSession.ts (package-private)
  - LensSession.test.ts, 15 tests seen failing against two scratch stubs first
affects: [80-06, 80-07, 80-12]
key-files:
  created:
    - packages/devtools/src/model/LensSession.ts
    - packages/devtools/test/model/LensSession.test.ts
  modified:
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-RED-EVIDENCE.md
key-decisions:
  - "useId branch is new: no retain command, and no clear command; only choose or toggle replaces the pick"
  - "choose arms the reveal before it publishes, so a listener told of the pick can take its reveal (pinned by a test)"
  - "the five transitions are module-scope Match.type matchers; the per-call argument is carried by a returned function (typed Draw for highlight)"
  - "one extra test title beyond the plan's list per edge the plan names: empty highlight, repeated commands, listener ordering, the armed-before-publish rule"
requirements-completed: [LENS-01, LENS-04]
metrics:
  duration: 35min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: 3b440199f1e9dbf2e2f19463df971f56ce37f93c
plan_head_after: 1965a1d0b54005595ff06fc0df286c52a793a039
actuals:
  tokens: 14000
  tasks: 2
  commits: 1
coverage:
  - deliverable: "the lens's rules as a headless session, each pinned by plain calls seen failing first"
    verification:
      - kind: command
        ref: "the plan's Task 1 verify one-liner (tests green; seen-failing, branch --check, scan-forbidden, scan-ids; oxlint; no barrel export; no resolveHeld or clear)"
        status: pass
    human_judgment: false
  - deliverable: "typechecked with the repository, clean under the house rules, committed"
    verification:
      - kind: command
        ref: "pnpm typecheck; node scripts/check-house-style.mjs (602 files clean, 3 declared switches); 80-check.mjs commit"
        status: pass
    human_judgment: false
---

# Phase QD-80 Plan 05: the highlight lens as a headless session Summary

`makeLensSession()`: the lens's rules (what is drawn, whether the reader is picking, the picked guard, the one-shot
reveal) as a scopeless session on `makeExternalStore`, with a two-arm `Data.taggedEnum` snapshot, under 15 plain and
property tests that were each seen failing before the module existed.

## Commit

- `1965a1d0` feat(80-05): the highlight lens as a headless session (`LensSession.ts`, `LensSession.test.ts`, the evidence)

## The module's exported surface (package-private, in neither barrel)

- `type LensSnapshot` / `const LensSnapshot = Data.taggedEnum<LensSnapshot>()`: `Idle { highlighted: ReadonlyArray<string>; picked: string | undefined }`, `Picking { highlighted: readonly [] | readonly [string] }`
- `pickedOf(snapshot): string | undefined`, `isPicking(snapshot): boolean`: module-scope `Match.type` + `tagsExhaustive`
- `interface LensSession extends ReadableStore<LensSnapshot>`: `toggle`, `hover(id | undefined)`, `choose(id | undefined): boolean`, `cancel`, `highlight(ids)`, `takeReveal(id): boolean`; no `retain`, no `clear`
- `makeLensSession(): LensSession`

Internals: `NOTHING`/`IDLE` shared constants; matchers `toggled`, `hovered`, `chosen`, `cancelled`, `highlighted`, each
returning the same reference on a no-op so the session publishes exactly when `next !== current`. `armed` is a `let`
inside `makeLensSession`. `choose` sets `armed = pickedOf(next)` before `store.publish`.

## Tests (15) and the seen-failing evidence

Run against two scratch stubs never committed (inert: all no-ops; eager: starts picking, publishes on every command,
`highlight` keeps picking, `choose`/`takeReveal`/`isPicking` always true). `80-RED-EVIDENCE.md` section
`## 80-05 the lens session` has one `- failed (inert|eager): <title>` per title: 12 fail under inert, and the 3 that
pass under inert (a new session is idle; the two properties) fail under eager. Titles: the plan's 11 behaviours, plus "highlight with no guards while idle draws nothing
and keeps the pick", "a repeated cancel, hover or highlight publishes once", "a listener told of a pick can take its
reveal" and "a command run from inside a listener sees the snapshot already published".

## Verification

- `pnpm exec vitest run --project devtools packages/devtools/test/model/LensSession.test.ts`: 15 passed
- Full devtools project: 1894 passed, 2 failed, and the two are exactly the `Lens.dock.test.tsx` cells (red until 80-07)
- `pnpm typecheck` clean; house-style `602 file(s) clean (3 declared switch(es), 76 type-test file(s))` (measured at this commit)
- oxlint clean, `scan-forbidden`, `scan-ids`, `branch --check` (new), no barrel export, no `resolveHeld`/`clear:`

## Deviations from Plan

**1. [Rule 3 - Blocking] Parameter annotations on the returned functions.** `tsc` reported TS7006 on `(id) =>`/`(ids) =>` inside the
matcher arms (the arm's return function has no contextual type through `Match`). Fixed by annotating the parameters; the
highlight matcher uses a named `Draw` type to hold the 90-column wrap. Commit: 1965a1d0.

**2. Wrap.** The first draft had four lines over 90 columns in source; wrapped before the commit. Test titles keep the plan's
long single-line titles (a string cannot be hand-wrapped without changing the title the evidence matches).

Otherwise none: the plan executed as written. `retain` is absent (branch `new`); the plan's own verify one-liners ran
unmodified.

## Decisions Made

Recorded under key-decisions: the reveal is armed before the publish; a no-op `choose` neither arms nor disarms; `toggle`
disarms on both arms; `cancel`, `hover` and `highlight` leave an armed reveal alone (pinned by the "reveals its row once"
test).

## Known Stubs

None.

## Threat Flags

None. T-80-10 (`choose` fails closed for idle and over-nothing) and T-80-11 (the two-arm union plus the property) are pinned
by named tests.

## For the next plan (80-06)

- Import from `./LensSession.ts` (named: `makeLensSession`, `type LensSession`, `type LensSnapshot`); nothing is in a barrel.
- `LensSession` is a `ReadableStore<LensSnapshot>` plus commands, so `DockModel`'s tenth store `lens` can hold it directly.
- A `Picking` snapshot never carries `picked`: read the pick through `pickedOf`, never `snapshot.picked`.
- `takeReveal(id)` is the only reveal read; it is true once per `choose` and never publishes.

## Self-Check: PASSED

- FOUND: packages/devtools/src/model/LensSession.ts, packages/devtools/test/model/LensSession.test.ts
- FOUND: commit 1965a1d0
