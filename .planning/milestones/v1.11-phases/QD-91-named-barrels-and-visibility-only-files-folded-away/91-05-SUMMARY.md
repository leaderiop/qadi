---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 05
subsystem: testing
tags: [package-install, declaration-emit, escape-check, merge-gate, red-evidence]

requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: 91-check.mjs (commit, scratch, variant, escape, escape-scan, scan-ids, trailers modes) and the recorded phase_base
provides:
  - scripts/lib/declaration-escape.mjs (declarationEscapes, ESCAPE_SELF_CHECK, runEscapeSelfCheck)
  - gate 14 check 3c over every packed .d.ts, run before any barrel commit
  - two blocks of 91-RED-EVIDENCE.md showing the check failing on its self-check and on a real escaping declaration
affects: [91-09 through 91-13 (every barrel commit is now refused if a dependent's declaration escapes), 91-15 (the AGENTS.md section 16 sentence naming the check), 91-21 close]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: c294519744ccab6c7521a5df0e27ade06447bc22
plan_head_after: 5ce96c01152ecda0d000984f301494e9ec656525
commits: 2

actuals:
  tokens: 26000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a pure judge in scripts/lib with a frozen planted-case list, run by the gate on every run so a rule that stops matching cannot pass by finding nothing"
    - "a comment-stripping tokenizer that follows string and template literals and keeps /// <reference lines"

key-files:
  created:
    - scripts/lib/declaration-escape.mjs
  modified:
    - scripts/check-package-install.mjs
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md

key-decisions:
  - "The escape rule is two reasons per specifier, independent of each other: a /src/ segment (also inside the package) and a relative or absolute path resolving outside the package root; a bare specifier is judged only for the /src/ segment"
  - "Check 3c prints its clean line only when no escape was found, so a failing run never prints a sentence saying none was"

requirements-completed: []

duration: 30min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 05: The declaration escape check Summary

**Gate 14 now refuses a packed `.d.ts` that names a path outside its package or into `src/`, checks its own function on nine planted texts every run, and has been seen failing on both its self-check and a real `import("../../core/src/Decision.ts").Trace` in react's built declaration.**

## What was built

`scripts/lib/declaration-escape.mjs` (plain Node, no dependency):

- `declarationEscapes(packageRoot, fileRel, text)` strips comments with a small tokenizer that follows string and template literals (so a `"https://x"` type is not a comment) and keeps any line whose first non-blank text is `/// <reference`. It then collects specifiers from `import("…")`, `from "…"`, side-effect `import "…"`, `require("…")` and `<reference path="…">`. A specifier with a `/src/` segment (or starting `src/`) gives `names a src/ path: <spec>`; a specifier starting `.` or `/` is resolved against the file's directory and gives `resolves outside its package: <spec>` when the result is not inside `packageRoot`.
- `ESCAPE_SELF_CHECK`, a frozen list of nine planted `{ label, fileRel, text, expect }` cases: an outside escape (2), an inside `../src/` path (1), a reference-path escape (1), a doc comment and a line comment each naming an outside path (0), a string literal type holding `https://x` (0), an escape on the same line after that string (2), an escape between two strings holding comment markers (2), and a clean file of bare and in-package specifiers (0). The last two escape cases are the ones that distinguish a string-aware tokenizer from a naive one; a string-unaware strip would hide the escape and read zero.
- `runEscapeSelfCheck()` returns the labels judged differently from `expect`.

`scripts/check-package-install.mjs`: the header says "Seven checks", lists `3c. escape`, and carries a paragraph on why it reads the packed artifact and strips comments. Check 3c sits between 3b and 4: it runs the self-check (a mismatch calls `fail` with `[escape-self-check] planted case "<label>" was not judged as planted`), walks every `.d.ts` of every installed package (skipping a nested `node_modules`), calls `fail` with `<package>/<rel>: <reason>` per refusal, fails when it read zero files, and prints `declaration escape check: <n> packed .d.ts file(s), none names a path outside its package or into src/` only when it found nothing. No other check, probe list or fixture changed; the runtime-export figure is still printed and unpinned (D-09b).

Clean packed tree: `declaration escape check: 257 packed .d.ts file(s), none names a path outside its package or into src/`, then `package-install: 9 package(s) pack, resolve and authorize (528 runtime export(s))`, exit 0.

## Evidence: the check seen failing (91-RED-EVIDENCE.md)

| Label | Edit in the scratch clone | Seen failing |
| ----- | ------------------------- | ------------ |
| `escape-self-check` | the `/src/` rule of `declarationEscapes` disabled (`if (false)`); the full gate (`package`), exit 1 | `[escape-self-check] planted case …` for the three cases that expect a `src/` reason: "an escape outside the package", "a path into src inside the package", "an escape after a string holding //" |
| `escape-layout` | the D-09a layout: react's `node_modules` a real directory linking every entry of the main tree's except `@qadi/core`, so react resolves core through `tsconfig.base.json` `paths` only; core's barrel line `export * from "./Decision.ts"` replaced by an `export { 16 values }` and an `export type { 9 types }` group naming every name of that module except `Trace`; `pnpm build` exited 2 on the unrelated devtools TS2305 (`Inspect.ts`, `Trace`) after emitting react's `lib`; then the committed function over `packages/react/lib` through `91-check.mjs escape-scan`, exit 1 | `lib/HydrationEngine.d.ts: names a src/ path: ../../core/src/Decision.ts` and `resolves outside its package: ../../core/src/Decision.ts` (also `lib/SeededDecision.d.ts`) |

Layout statement: the escaping declaration appears only when the per-package `packages/react/node_modules/@qadi/core` link is absent. In the intact monorepo layout, omitting a name from the core barrel makes `tsc -b` fail with TS2883 and emit no `.d.ts` (RESEARCH P2: fifteen names tried, none exited 0 with an escape); that behaviour was taken from the research and not re-run here. Gate 14 reads the packed artifact, so it covers the layouts where `tsc` is silent, and the tarball ships `src/`, which is why the `/src/` rule is separate from the outside-the-package rule.

## Task Commits

1. Task 1: `24228231` `feat(91-05): refuse a packed declaration that escapes its package` (exactly `scripts/lib/declaration-escape.mjs` and `scripts/check-package-install.mjs`)
2. Task 2: `5ce96c01` `docs(91-05): record the escape check seen failing` (exactly `91-RED-EVIDENCE.md`)

Each carries the one trailer; `91-check.mjs commit` passes for both.

## Verification

- `node scripts/check-package-install.mjs` exit 0 with the escape line (257 files); `node 91-check.mjs escape` exits 0.
- `pnpm exec oxlint` over the two scripts exits 0; `node scripts/check-house-style.mjs` clean (652 files); `91-check.mjs scan-ids` clean; `91-check.mjs trailers` reports 16 commits each with the one trailer.
- The scratch root was removed with `scratch-clean` and checked gone; no `.vitest/`, `.stryker-tmp/` or `.package-check/` left behind.

## Deviations from Plan

None - plan executed exactly as written. Choices the plan left open (autonomous, most complete option): the self-check holds nine cases rather than the plan's six kinds, adding two escape cases that fail a string-unaware tokenizer (a string holding `//`, and strings holding `/*` and `*/`) and a clean `https://x` case, because a `0` case alone cannot tell a string-aware strip from a naive one; and the clean line is printed only when no escape was found.

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None: a pure script, a gate section and an evidence file; no source, network or schema change in shipped packages.

## Self-Check: PASSED

- `scripts/lib/declaration-escape.mjs` exists and exports `declarationEscapes`, `ESCAPE_SELF_CHECK` and `runEscapeSelfCheck`; `scripts/check-package-install.mjs` imports them and names check 3c.
- `24228231` and `5ce96c01` are ancestors of HEAD, each with the one trailer.
- `91-RED-EVIDENCE.md` holds `escape-self-check` and `escape-layout`, each with exit 1.
