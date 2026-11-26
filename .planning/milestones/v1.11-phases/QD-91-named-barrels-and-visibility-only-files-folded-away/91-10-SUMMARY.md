---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 10
subsystem: build
tags: [folds, core, port-span, barrels, span-rules]

requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the named core barrel (91-BARRELS.md), 91-check.mjs structural/commit/variant, 91-pinned-check.mjs, 91-earlier-checks.mjs
provides:
  - decodePortSpan declared in PortSpanEncode.ts, portInterpreter/PortInterpreter declared in PortSpan.ts, and the two visibility-only files deleted
  - 91-FOLDS.md, the first two structural blocks (madge 250 then 249)
  - the span-key and untrusted-decode rules seen failing on the folded file
affects: [91-11 through 91-14 (the remaining folds append their blocks), 91-15 (named-barrel rule), 91-18/19 (prose that names the deleted files)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 8e4c8c9c47ba6e863a3c32fd8bbf0b48107ae2e9
plan_head_after: 89bbb14649d8756eb991797c071f104da098ebe9
commits: 4

actuals:
  tokens: 3000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a public name is declared where its concept lives; its siblings stay package-private because the barrel names the one name, not the module"

key-files:
  created:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-FOLDS.md
  modified:
    - packages/core/src/PortSpanEncode.ts
    - packages/core/src/PortSpan.ts
    - packages/core/src/index.ts
    - packages/core/test/PortSpan.test.ts
    - scripts/check-house-style.mjs
    - AGENTS.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-check.mjs
  deleted:
    - packages/core/src/PortSpanDecode.ts
    - packages/core/src/PortInterpreter.ts

key-decisions:
  - "The interpreter fold leaves core's barrel byte-identical, so that commit holds three paths, not the four the plan lists"

requirements-completed: []

duration: 11min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 10: Core folds Summary

**`decodePortSpan` is declared with the span machinery it calls and `portInterpreter`/`PortInterpreter` with the span types; both visibility-only files are gone, the public surface is unchanged (948 exports, gate 13 at 943), and both span rules were seen biting on the folded file.**

## Accomplishments

- Decoder fold (`136830bf`): `decodePortSpan` and its doc moved verbatim to the end of `PortSpanEncode.ts`; its two type names (`PortSpanAttributes`, `PortSpanRow`) joined the existing `./PortSpan.ts` type import; the header paragraph now says the machinery is package-private, the barrel names only the decoder (ADR-QD-077, ADR-QD-204) and the decoder lives with the machinery so types-then-machinery has no cycle; `PortSpan.ts`'s header names the decoder as `decodePortSpan` in `PortSpanEncode.ts` (the two mentions only); `PortSpan.test.ts` line 19 became one name (`decodePortSpan`) in the existing `../src/PortSpanEncode.ts` import, inside its declared region; the `UNTRUSTED_DECODE_BUDGET` comment and AGENTS.md §7a's `PortSpanEncode.ts` row gained the clause "the public `decodePortSpan` reads through the same per-field struct decode, with no counted token". The budget value is still 2, no other AGENTS.md line moved, `SPAN_KEY_SHARED` is untouched.
- Interpreter fold (`92096e06`): `PortSpan.ts` imports `effect/Schema` as a value and declares `portInterpreter` and `PortInterpreter` (the doc moved, reworded only where it named a file); `PortInterpreter.ts` is deleted; `PortSpanEncode.ts` takes `portInterpreter` from `./PortSpan.ts` as a value import beside its type import.
- Barrel: regenerated with the recorded generator (`91-BARRELS.md` command). Module list after the decoder fold: `./PortSpanDecode.ts` replaced by `./PortSpanEncode.ts only decodePortSpan` (61 modules, 545 names, 0 collisions, 0 kind replacements); after the interpreter fold `./PortSpan.ts` became `./PortSpan.ts except portInterpreter`. The decoder fold changed one line of `packages/core/src/index.ts` (`export { decodePortSpan } from "./PortSpanEncode.ts";`); the interpreter fold's regeneration was byte-identical, because `PortInterpreter` is already named in the `./PortSpan.ts` type group and `portInterpreter` is excepted. Core's barrel names none of `portInterpreter`, `spanStruct`, `decodeSpan`, `encodeSpan`, `attemptsStruct`.

### Structural blocks (`91-FOLDS.md`, every command exit 0)

| Commit | madge files | circular | build | typecheck | surface (gate 13 at 943) | gate 14 | house-style |
| ------ | ----------: | -------- | ----- | --------- | ------------------------ | ------- | ----------- |
| `136830bf` decoder fold | 250 | exit 0 | exit 0 | exit 0 | equal to the base, 948 exports | exit 0, 9 packages, 528 runtime exports | exit 0, 651 files, `[untrusted-decode]` for `PortSpanEncode.ts` at 2 |
| `92096e06` interpreter fold | 249 | exit 0 | exit 0 | exit 0 | equal to the base, 948 exports | exit 0, 9 packages, 528 runtime exports | exit 0, 650 files |

Also, after each fold: `91-check.mjs vitest PortSpan.test.ts surface.test.ts` (29 tests, all passed), `scan-ids`, `scan-forbidden` clean, `91-pinned-check.mjs` clean (`516 held, 26 declared (1 applied), 3 born, 27 earlier-held`; before the decoder commit it correctly reported `PortSpan.test.ts: differs from its base text at line 19`, the declared region held as a base file). After both: `barrels` (3 barrels named, surface equals the base), `homes` (every name at its home, in its kind's group), `trailers` (33 commits, each with the one trailer), `91-check.mjs --self-test` 473 passed.

### The span rules seen failing on the folded file (`91-RED-EVIDENCE.md`)

| Label | Scratch | Edit | Result |
| ----- | ------- | ---- | ------ |
| `span-untrusted-decode` | `span-json` at `136830bf37` | `...JSON.parse("{}"),` spread into the object `decodePortSpan` returns | exit 1: `packages/core/src/PortSpanEncode.ts  [untrusted-decode] declares 2 untrusted-decode token(s), found 3 at line(s) 71, 74, 273.` |
| `span-key-source` | `span-key` at `136830bf37` | `...{ subjectId: "qadi.subject_id" },` spread into the same object | exit 1: `packages/core/src/PortSpanEncode.ts:273  [span-key-source] mentions the span key `qadi.subject_id`; read it through EvaluationSpan.ts (ADR-QD-188).` |

Both blocks are in the record commit `89bbb146`; Task 2's verify (both `## ` headings) exits 0. The scratch clones are still under the scratch root.

### Earlier-phase checks

`node 91-earlier-checks.mjs` run once, after both fold commits (the one heavy runner; the interpreter fold predicts no move): exit 0, `87 runs, all match their rows`. So the decoder-fold prediction held at HEAD: the 90 pinned row for `PortSpan.test.ts` moved, 85 to 89 `scan-forbidden` gained the `scripts/check-house-style.mjs` line, and 90's `scan-forbidden` its two lines (AGENTS.md outside §3, the budget file); the interpreter fold added no unpredicted movement. It was not run between the two folds, so a mismatch caused only by the second fold cannot be told apart from the first, but there was none.

## Task Commits

1. Task 1: `136830bf` `refactor(91-10): fold the port span decoder into the span machinery` (7 paths, `PortSpanDecode.ts` deleted); `91-check.mjs commit` accepts it.
2. Fix of the plan's path list: `1bc8e418` `fix(91-10): hold the interpreter fold to the three paths it changes` (`91-check.mjs` only; see Deviations).
3. Task 3: `92096e06` `refactor(91-10): fold the interpreter set into the span types` (3 paths, `PortInterpreter.ts` deleted); `91-check.mjs commit` accepts it with its three paths.
4. Task 3 record: `89bbb146` `docs(91-10): record the core fold verdicts and the span rules biting` (`91-FOLDS.md`, `91-RED-EVIDENCE.md`).

## Deviations from Plan

### Plan defects

**1. The interpreter fold holds no `index.ts`.** The plan, its Task 3 verify, `91-01-PLAN.md`'s subject table and `91-check.mjs`'s `PHASE_COMMITS` row all list `packages/core/src/index.ts` among the fold's four paths. The regenerated core barrel is byte-identical after that fold (`diff` empty): the only core name the fold touches is the type `PortInterpreter`, already named in the `./PortSpan.ts` type group at the same specifier, and `portInterpreter` is not named. A commit cannot hold an unchanged file, and an edit of the barrel made only to satisfy the list would be false. Fix, the smallest that keeps the check exact: the row's `paths` in `91-check.mjs` line 124, before `["packages/core/src/PortSpan.ts", "packages/core/src/PortInterpreter.ts", "packages/core/src/PortSpanEncode.ts", "packages/core/src/index.ts"]`, after the same list without `index.ts`; committed on its own as `1bc8e418` (the script's self-test, 473 passed, ran first). The Task 3 verify as written (with `index.ts`) therefore exits 1 (`the commit holds …PortInterpreter.ts, …PortSpan.ts, …PortSpanEncode.ts, not … index.ts`); the same command without `index.ts` exits 0. The unchanged core barrel also means `91-01-PLAN.md`'s table row (a planning document) still names four paths; it was not edited. The fix commit's subject is not a row of the phase table, so `91-check.mjs commit` cannot be asked about it; `trailers` accepts it.

### Choices the plan left open (autonomous, most complete option)

**2.** `PortSpanEncode.ts` takes `portInterpreter` through a value import `import { portInterpreter } from "./PortSpan.ts";` beside its existing `import type { … } from "./PortSpan.ts";`, the style `SinkCodec.ts` and others already use for one module, over an inline `type` marker import.

**3.** `PortSpan.ts`'s header sentence was extended with "with the one closed set they need, `portInterpreter`" and the decoder named in a sentence of its own, the plan's "described as the types a description names plus the one closed set those types need".

**4.** The two `variant` edits are single added lines spread into the object `decodePortSpan` returns, the smallest edit that puts the token in the function's body.

## Known Stubs

None.

## Threat Flags

None. T-91-21 (an unguarded decode in the folded file) and T-91-23 (a second span-key spelling) are mitigated and each seen failing; T-91-22 (publishing the machinery or `portInterpreter`) is covered by the barrel naming one name, `homes`, the surface compare (948 exports) and gate 14.

## Self-Check: PASSED

- `packages/core/src/PortSpanDecode.ts` and `packages/core/src/PortInterpreter.ts` do not exist; `PortSpanEncode.ts` declares `decodePortSpan`; `PortSpan.ts` declares `portInterpreter` and `PortInterpreter`; neither file holds `PortSpanDecode`; no `PortSpanDecode` or `PortInterpreter.ts` specifier remains under `packages/*/src`, `test`, `bench`, `features`, `examples` or `apps`.
- `UNTRUSTED_DECODE_BUDGET["packages/core/src/PortSpanEncode.ts"]` is 2; the budget comment and AGENTS.md §7a's row hold `decodePortSpan`.
- Commits `136830bf`, `1bc8e418`, `92096e06` and `89bbb146` are ancestors of HEAD, each with the one trailer.
- `91-FOLDS.md` holds both core blocks with every command exit 0 and madge 250 then 249.
