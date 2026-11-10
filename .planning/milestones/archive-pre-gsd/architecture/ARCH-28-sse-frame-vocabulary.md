---
id: ARCH-28
title: Core owns the decision stream's frame vocabulary — event names and the synced payload — beside LogCursor, so http and devtools import one definition instead of agreeing by hand
strength: Speculative   # 2026-10-06 architecture review, candidate #13 ("SSE frame vocabulary in core")
status: done            # T0–T1 startable now; T2–T4's export shape waits on D-28-c
evidence_verified_at: e328e75
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-097 (amend: D-11-f/D-11-g's protocol words — `backlog`, `synced`, `message`, and the `{"backlog":n}` payload — are declared in `@qadi/core` beside `LogCursor`; the route and the reader import them)
  - ADR-QD-046 (read: SSE, guarded; nothing about the transport changes)
  - ADR-QD-047 (read: devtools model is headless and depends only on core — the reason the names are re-declared today, and why core is the only common home)
  - ADR-QD-081 (read: D-04-d's precedent — names moved without re-export shims, shipped as a breaking minor; D-28-c follows it)
  - ADR-QD-037 (read: madge; `DecisionLog.ts` gains only an `effect/Schema` import)
  - ADR-QD-034 / AGENTS.md §5a (read: no `switch` on event names; the existing `===` comparisons are not `_tag` dispatch)
  - ADR-QD-012 (read: nothing here reads a clock)
packages: ["@qadi/core", "@qadi/http", "@qadi/devtools", "features", "spec"]
estimate: M   # ≈ 1 day: code is small (T1–T4 ≈ ½ day), spec + overview + changeset + ADR amendment the rest
---

# ARCH-28 — SSE frame vocabulary in core

## 1. Verified evidence (at `e328e75`)

Re-checked on `main` at `e328e75`. Nothing in the repo was edited. Probes ran on a
scratch copy of the tree,
`$S=/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/a032054c-2984-4500-9b86-240b3767ee96/scratchpad/wave3/ARCH-27/repo`.
This is ARCH-27's copy, rsync'd from the repo with `node_modules` symlinked and stale
`.tsbuildinfo` files deleted. The installed `features/node_modules/@qadi` in this
checkout lacks the `http` link, although `features/package.json` declares it. The copy
got `ln -s ../../../packages/http features/node_modules/@qadi/http` so the BDD file
could load. The real repo needs `pnpm install` for the same reason.

### C1. `http/src/DecisionStreamRoute.ts:117-173` declares the frame vocabulary — **CONFIRMED**
- `:117` `export type DecisionFrameEvent = "backlog" | "message";`
- `:125-127` `export const DecisionStreamSynced = Schema.Struct({ backlog: Schema.Number });` and its type.
- `:152-162` `frame(event, cursor?)`, which writes `event` and `id` through `Sse.encoder.write`.
- `:165-172` `syncedFrame(backlog)`, the only place the literal `"synced"` appears in http (`:170`).
- `:227` `framed("backlog")` and `:233` `framed("message")` are the two uses.

### C2. `devtools/src/model/Source.ts:78` re-declares the names because devtools depends only on core — **CONFIRMED**
- `:78` `export type DecisionEventName = "backlog" | "synced" | "message";`
- `:229` `const DECISION_EVENTS: ReadonlyArray<DecisionEventName> = ["message", "backlog", "synced"];` is a
  second, value-level copy, registered one listener per name (`:177-181`).
- Literal uses: `:196` (`"synced"` ends the prelude wait), `:205` (a `synced` on the live half
  is dropped), and `:219` (`"backlog"` frames are the backlog).
- `packages/devtools/package.json:46-48`: `"dependencies": { "@qadi/core": "workspace:^" }`, with
  no `@qadi/http`. ADR-QD-047 and AGENTS.md §13 say the devtools model is headless and core-only.

### C3. Only `features/decision-log` checks that the two still agree — **CONFIRMED** (mutation probe), with a third hand copy found
- Feature: `features/features/decision-log/decision-log.feature` (`@decision-log @REQ-QD-033`, 5
  scenarios). Steps: `features/features/decision-log/decision-log.steps.test.ts`. They serve
  `decisionStreamRoute` through a real `HttpRouter.toWebHandler` (`:58-66`) and pipe the
  bytes through `Sse.makeParser` into `sourceFromEventSource` (`:74-110`).
- **Third copy.** The steps restate the names: `:55-56`
  `const isDecisionEvent = (name: string): name is DecisionEventName => name === "backlog" || name === "synced" || name === "message";`.
- **A fourth, in docs.** The `spec/overview.md:717` row spells `"backlog" | "synced" | "message"`.
  `spec/behaviors/26-decision-stream.md:259` spells `DecisionFrameEvent`.
- **Mutation probe.** In the copy, http's `"backlog"` was renamed to `"history"` (`:117` and
  `:227`), and the stock suites were run:
  - `tsc -b tsconfig.json`: **clean**.
  - `vitest run packages/devtools/test/model/Source.test.ts`: **38/38 pass**. Devtools tests
    drive a fake `EventSource` with devtools' own literals.
  - `vitest run packages/http/test/decisionStream.test.ts`: **5 fail**. They assert http's
    literal frame text, so they are a same-package self-check that a renamer edits in
    the same commit. They do not check the reader.
  - `features/ vitest run features/decision-log`: **2 of 5 scenarios fail** ("A reader that
    arrives late…", "The reader over SSE sees what a reader in the process sees").
    "An empty log is an empty history", the live scenarios and the Edge scenario still
    **pass**.
  So the cross-package agreement is checked by two BDD scenarios and nothing else. A
  rename on either side compiles. The same test was restored after the probe.

### C4. Core already owns `LogCursor`'s format (ADR-QD-097) — **CONFIRMED**
`packages/core/src/DecisionLog.ts:85-88` (`LogCursor`), `:103` (`formatLogCursor`, `<epoch>.<seq>`)
and `:115-121` (`parseLogCursor`, strict). Its doc comment (`:75-84`) already says it is
"what `/__decisions` sends as each frame's SSE `id`". http imports both (`DecisionStreamRoute.ts:100-107`).
So core already holds one protocol fact about the SSE wire, which supports giving it the event
names too.

### C5. `frame` and `decisionFrames` are public http exports "for testability" — **CONFIRMED**
`DecisionStreamRoute.ts:136-138` ("Exported so the refusal can be tested directly against a plain
record"), `:207-210` (`decisionFrames`, "Exported for the same reason `frame` and `reauthCheck`
are"), and `:308-310` (`reauthCheck`). All are re-exported through `packages/http/src/index.ts:7`
and listed in `spec/overview.md:531-536`. ARCH-19 (one HTTP-edge authorization step) is the plan
that may change what http exports. See D-28-f.

### C6. NEW: the reader never decodes `synced`'s payload — **CONFIRMED**
`Source.ts:194-198` ends the prelude wait on `next.event === "synced"` and ignores `data`.
Nothing outside http's tests (`decisionStream.test.ts:888,944,1063`) reads `{"backlog":n}`.
`DecisionStreamSynced`'s doc comment (`:120-124`) says it is "its own schema … so a reader can
decode it as untrusted input", but no reader does. Its `backlog: Schema.Number` accepts
`-1`, `1.5` and `NaN`, all impossible for "the backlog frames actually sent" (BEH-QD-314).
This is latent, not a defect: no consumer exists. See D-28-d and D-28-e.

### C7. NEW: the spec for the protocol — **CONFIRMED**
`spec/behaviors/26-decision-stream.md`: BEH-QD-311 (`:254-299`, signature block lists
`DecisionFrameEvent`), BEH-QD-314 (`:304-381`, signature block lists `DecisionStreamSynced` and
`syncedFrame` under http, and `StoredRecordJson`/`encodeStoredRecord`/`decodeStoredRecord` under
`// @qadi/core`), and BEH-QD-316 (`:411-440`, `LogCursor`). `spec/behaviors/27-devtools-timeline.md:69-70`
(BEH-QD-203) names `synced` from the reader's side. Traceability: `spec/traceability.md:68`
(doc 26 → files), `:296` (`DecisionLog.test.ts`), `:299` (`decisionStream.test.ts`), `:302`
(`Source.test.ts`), `:404` (REQ-QD-033 → `decision-log.feature`).

### C8. Prototype: core-owned vocabulary compiles, passes madge and keeps the BDD green — **probe**
In the copy, `DecisionLog.ts` gained
`export const DecisionStreamEvent = Schema.Literals(["backlog", "synced", "message"])`, its type,
`DecisionRecordEvent = Exclude<DecisionStreamEvent, "synced">` and `DecisionStreamSynced`.
http's `DecisionFrameEvent` became an alias and `DecisionStreamSynced` a re-export. Devtools'
`DecisionEventName` became an alias with `DECISION_EVENTS = DecisionStreamEvent.literals`.
`Schema.is(DecisionStreamEvent)` type-checks as a guard (no `as`). Results:
`tsc -b` clean, `madge --circular` clean, decision-log BDD 5/5, and `decisionStream.test.ts`
36/36. `Source.test.ts` failed **1**/38: `:743` pins listener registration order
`["message", "backlog", "synced", "error"]`, and core's protocol order is
`backlog, synced, message`. Registration order has no effect on `EventSource` dispatch, so the
expectation is updated (T3), not the order.

## 2. Goal and success criteria

The decision stream's protocol words are an **interface** shared by two **adapters**:
`@qadi/http`'s route, which writes frames, and `@qadi/devtools`' `sourceFromEventSource`, which
reads them. Today each adapter declares its own copy, and the **seam** between them is checked
only by two BDD scenarios (C3). Core is the one package both depend on, and it already owns the
stream's other protocol fact, the `LogCursor` text (C4). The goal is **locality**: the event names
and the `synced` payload schema are declared once in `@qadi/core`'s `DecisionLog.ts` beside
`LogCursor`. Both adapters, and the acceptance steps, import that one definition. A rename becomes
a compile error at every user instead of a two-scenario BDD failure. The framing itself
(`Sse.encoder` calls, the `id` and empty-`event` rules) stays in http, which is the transport
module. The move adds no **depth** to the module, only one definition where there were four, and
the plan is sized to match.

Success criteria:

1. `grep -rnE '"backlog" \| "synced"|"backlog" \| "message"|"message", "backlog"' packages/*/src features/features` finds nothing. No package restates the union.
2. `grep -n "DecisionStreamEvent\|DecisionRecordEvent\|DecisionStreamSynced" packages/core/src/DecisionLog.ts` shows all three declared there. `packages/http/src` and `packages/devtools/src` import them from `@qadi/core`.
3. Mutation check (T0's probe, re-run at the end): renaming `"backlog"` in `DecisionLog.ts`'s literal fails `pnpm typecheck`, at http's `framed("backlog")` and devtools' `"backlog"` comparison, not only the BDD.
4. `DecisionStreamSynced` refuses `{"backlog":-1}`, `{"backlog":1.5}` and `{"backlog":NaN}` on decode (D-28-d), shown by a `DecisionLog.test.ts` case.
5. A golden test pins the wire words: `DecisionStreamEvent.literals` deep-equals `["backlog", "synced", "message"]`, and `syncedFrame(0)` is still `event: synced\ndata: {"backlog":0}\n\n` (`decisionStream.test.ts:888`, unchanged).
6. `pnpm spec:api` (gate 13) passes with the new core names in `spec/overview.md` and the removed http/devtools names gone from it (D-28-c).
7. `pnpm check` passes.

## 3. Non-goals

- **The SSE encoding stays in `@qadi/http`.** `frame`, `syncedFrame` and `decisionFrames` keep
  calling `Sse.encoder.write`. Moving framing into core (D-28-b C) would put a transport encoder
  in core for one caller.
- **No protocol change.** The bytes on the wire are identical before and after. The `synced`
  tightening (D-28-d) changes what a *decoder* accepts, and no decoder exists today (C6).
- **No change to `LogCursor`.** It stays where ADR-QD-097 put it.
- **What http exports** (`frame`, `decisionFrames`, `syncedFrame`, `reauthCheck`) is ARCH-19's
  question. This plan changes only `frame`'s parameter *type name*, to an identical literal union.
- **Refusal reporting** in the same file (`reportRefused`, `:178-197`) is ARCH-25's. **Devtools
  `Source` sampling/diagnostics** is ARCH-24's. Neither is touched here.

## 4. Constraints

| Constraint | Consequence here |
| --- | --- |
| Gate 13, `pnpm spec:api` (`check-api-surface.mjs`) | The three new core names need `spec/overview.md` rows in the same commit that exports them (T1). Under D-28-c = A, removing `DecisionFrameEvent`/`DecisionStreamSynced` from http and `DecisionEventName` from devtools needs their rows (`:534-535`, `:717`) edited in the same commits (T2, T3), or the gate fails "documented but not exported". |
| AGENTS.md §1 (namespace `effect/*` imports, named cross-package imports) | `DecisionLog.ts` adds `import * as Schema from "effect/Schema"`. http and devtools use `import { DecisionStreamEvent, DecisionStreamSynced } from "@qadi/core"` and `import type { DecisionRecordEvent } from "@qadi/core"`. |
| AGENTS.md §6 (no `as`) | The membership guard is `Schema.is(DecisionStreamEvent)` (C8), not a cast. The list is `DecisionStreamEvent.literals`, not `Object.keys`. |
| AGENTS.md §5a / `SWITCH_BUDGET` | Untouched. The reader's `===` checks on event names are not `_tag` dispatch, and no `switch` is added. |
| `UNTRACED_BUDGET`, `ANY_BUDGET`, `HAS_CUSTOM_BUDGET`, `SCHEMA_ERROR_BUDGET`, `PORT_DOUBLE_BUDGET`, `DECISION_READ_BUDGET` | Untouched. No `fnUntraced`, no `any`, no `hasCustom`, no error class, no port double, no `AsyncResult` read. |
| ADR-QD-037 / `pnpm circular` | `DecisionLog.ts` gains only `effect/Schema` (C8: madge clean). |
| AGENTS.md §9 (barrels) | `DecisionLog.ts` is already `export *`'d from `packages/core/src/index.ts:9`, so no barrel edit is needed. |
| ADR-QD-081 D-04-d precedent | Moving a public name between packages without a re-export shim is a breaking `minor` in the fixed version group. D-28-c follows it unless decided otherwise. |
| §12 doc fences | BEH-QD-311/314's signature blocks are ` ```ts ` (reference, not compiled). If any ` ```typescript ` fence in `spec/` imports `DecisionFrameEvent`/`DecisionStreamSynced` from `@qadi/http`, `pnpm spec:examples` fails until it is updated. At `e328e75`, `git grep` finds none outside ` ```ts ` blocks. T0 re-checks. |
| ADR-QD-076 (Stryker `ignoreStatic`) | The new declarations are module-scope statics, so no new mutants. The tightened schema's check is exercised by T1's decode cases. |

## 5. Decisions needed before work starts

### D-28-a — Where the vocabulary lives in core
- **A. `DecisionLog.ts`, beside `LogCursor` (recommended).** It is the module ADR-QD-097
  made the protocol's home in core, and `LogCursor`'s doc comment already speaks of SSE `id`s.
  No new file and no barrel edit.
- **B. A new `DecisionStream.ts` in core, moving `LogCursor`/`formatLogCursor`/`parseLogCursor` into it too.**
  All the wire protocol in one module. But it churns three public names' home for no behavior
  change, and every `@qadi/core` import site stays the same anyway.
- **C. `SinkCodec.ts`, beside `StoredRecordJson`.** That module is the record codec, and
  event names are not record encoding.
- **Recommendation: A.**
- `status: decided (2026-10-07, DecisionLog.ts)`

### D-28-b — What moves
- **A. Event names only** (`DecisionStreamEvent`, `DecisionRecordEvent`).
- **B. Event names and the `synced` payload schema (recommended).** `DecisionStreamSynced` is
  as much a protocol fact as the names. It is a frame's data, which a reader in either
  package decodes as untrusted input, and it has no dependency on http.
- **C. B plus the frame encoders** (`frame`/`syncedFrame` move to core). This puts
  `effect/encoding/Sse` in core for one caller, contradicts "the SSE encoding is http's"
  (§3), and leaves ARCH-19's export question without a home.
- **Recommendation: B.**
- `status: decided (2026-10-07, event names + synced schema)`

### D-28-c — The old public names
- **A. Remove without shims (recommended).** `@qadi/http` stops exporting `DecisionFrameEvent`
  and `DecisionStreamSynced`, and `@qadi/devtools` stops exporting `DecisionEventName`. Each
  name has one home, and gate 13 has one row each. This follows ADR-QD-081 D-04-d and
  ships as a `minor` changeset marked breaking (fixed group, 0.x). There are no known
  external importers: `git grep` over `examples/`, `apps/website` and package READMEs at
  `e328e75` finds none.
- **B. Keep them as aliases** (`export type DecisionFrameEvent = DecisionRecordEvent`, and so on).
  Non-breaking, but there are two names per concept, a gate-13 row per alias, and devtools'
  alias would keep the misleading "re-declared" shape in its public surface.
- **C. Keep http's `DecisionFrameEvent` as its own name** for the record-carrying subset, and
  remove the others. `DecisionRecordEvent` in core already names that subset.
- **Recommendation: A.**
- `status: decided (2026-10-07, remove without shims)`

### D-28-d — Tighten `DecisionStreamSynced` while moving it
- **A. `backlog: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))` (recommended).** "The
  backlog frames actually sent" is a count. The schema's stated purpose (decoding untrusted
  frames) is served only if it refuses non-counts. It costs nothing: the encoder already writes
  `frames.length`, and no decoder exists (C6). Same idiom as `Policy.ts:424-426`.
- **B. Keep `Schema.Number`.** A pure move, with the schema still accepting `NaN`.
- **Recommendation: A.**
- `status: decided (2026-10-07, non-negative integer)`

### D-28-e — Should the devtools reader decode `synced`'s payload?
- **A. No (recommended).** The reader ends the prelude wait on the event name. A count
  mismatch inside one TCP connection is not a failure the reader can act on: dropped or
  undecodable backlog frames are already reported per frame through `onMalformed` (BEH-QD-204).
  Decoding adds a branch with nothing to do on mismatch.
- **B. Yes, report a malformed `synced` through `onMalformed` with a new `MalformedReason`.**
  This widens a closed public union, `MalformedReason` (`Source.ts:325`), for a frame no server
  sends malformed.
- **Recommendation: A.** T-x is listed but stays blocked unless B is chosen.
- `status: decided (2026-10-07, no)`

### D-28-f — Sequencing with ARCH-19 (http exports) and ARCH-24/25 (same files)
- **A. Land ARCH-28 first (recommended).** Its http edit is two imports and one parameter type
  (`DecisionFrameEvent` → `DecisionRecordEvent`, the identical union). ARCH-19 can then
  un-export `frame`/`decisionFrames`/`syncedFrame` or keep them, with no dependency on this.
  ARCH-25 (`reportRefused` in the same file) and ARCH-24 (`Source.ts` diagnostics) rebase onto
  import-line changes.
- **B. After ARCH-19.** If ARCH-19 un-exports `frame`, D-28-c's http half shrinks to
  `DecisionStreamSynced`. The work is otherwise the same, and it waits on a larger plan.
- **Recommendation: A.**
- `status: decided (2026-10-07, land first)`

## 6. Tasks

### T0 — Re-baseline
- **Status:** [x] done
- **Depends on:** —
- **Files:** none (scratch only)
- **Steps:**
  1. `git switch -c arch-28/stream-vocabulary main`. Record `git log --oneline -1`.
  2. Run `pnpm install` if `features/node_modules/@qadi/http` is missing (C3's note).
  3. Repeat C3's mutation probe on a scratch copy. Rename `"backlog"`→`"history"` at
     `DecisionStreamRoute.ts:117,227`. Confirm `tsc -b` is clean, `Source.test.ts` passes, and
     the decision-log BDD fails 2/5.
  4. `git grep -nE '"backlog"|"synced"|DecisionEventName|DecisionFrameEvent|DecisionStreamSynced' -- packages examples apps features spec`,
     and save the list. Every hit is either converted by T1–T5 or justified as a wire golden
     (http's raw-frame assertions in `decisionStream.test.ts`, devtools tests feeding raw frames).
  5. Check whether ARCH-19 has landed (D-28-f) and whether any ` ```typescript ` fence imports the names.
- **Tests:** —
- **Verify:** `pnpm vitest run packages/http/test/decisionStream.test.ts packages/devtools/test/model/Source.test.ts && pnpm test:bdd`
- **Done when:** §1 matches the branch head, or is corrected with a §10 row.

### T1 — Declare the vocabulary in core, test first
- **Status:** [x] done
- **Depends on:** T0, D-28-a, D-28-b, D-28-d
- **Files:** `packages/core/src/DecisionLog.ts`; `packages/core/test/DecisionLog.test.ts`; `packages/core/test/DecisionLog.tst.ts` (exists); `spec/overview.md` (core table, next to the `LogCursor` row at `:266`)
- **Steps:**
  1. Tests first, red until step 2:
     - `DecisionLog.test.ts`: `DecisionStreamEvent.literals` deep-equals `["backlog", "synced", "message"]`
       (a wire golden: changing it is a protocol break). `Schema.decodeUnknownResult(DecisionStreamSynced)`
       accepts `{ backlog: 0 }` and `{ backlog: 3 }`, and refuses `{ backlog: -1 }`, `{ backlog: 1.5 }`,
       `{ backlog: Number.NaN }` and `{}`. `Schema.is(DecisionStreamEvent)` holds for the three names
       and not for `"error"` or `""`.
     - `DecisionLog.tst.ts`: `expect<DecisionRecordEvent>().type.toBe<"backlog" | "message">()` and
       `expect<DecisionStreamEvent>().type.toBe<"backlog" | "synced" | "message">()`.
  2. In `DecisionLog.ts`, after `DecisionLogEntries` and before `formatLogCursor`, add
     `import * as Schema from "effect/Schema"` and:
     - `export const DecisionStreamEvent = Schema.Literals(["backlog", "synced", "message"]);` with
       `export type DecisionStreamEvent = typeof DecisionStreamEvent.Type;`. Doc comment: summary
       line ("The events a decision log is served as: …"), then the *why*. It is declared in
       core because the writer (`@qadi/http`) and the reader (`@qadi/devtools`) share only this
       package (ADR-QD-047), as `LogCursor` is (ADR-QD-097). It is a closed union, in protocol
       order.
     - `export type DecisionRecordEvent = Exclude<DecisionStreamEvent, "synced">;`, "the events
       that carry a stored record".
     - `export const DecisionStreamSynced = Schema.Struct({ backlog: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)) });`
       with its type. Under D-28-d = B, use `Schema.Number`.
  3. Add one `spec/overview.md` row in core's Services table beside `:266`, e.g.
     ``| `DecisionStreamEvent`, `DecisionRecordEvent`, `DecisionStreamSynced` | schema + type, type, schema + type | `DecisionLog.ts` — the decision stream's protocol words …``.
- **Tests:** as step 1.
- **Verify:** `pnpm vitest run packages/core/test/DecisionLog.test.ts && pnpm test:tstyche && pnpm circular && pnpm spec:api`
- **Done when:** the three names are exported from `@qadi/core` and documented, and nothing else changed. This task is shippable alone as a pure addition.

### T2 — `@qadi/http` imports the vocabulary
- **Status:** [x] done
- **Depends on:** T1, D-28-c
- **Files:** `packages/http/src/DecisionStreamRoute.ts`; `packages/http/test/DecisionStreamRoute.tst.ts`; `packages/http/test/decisionStream.test.ts` (only if it imports `DecisionStreamSynced`; `grep -n DecisionStreamSynced packages/http/test`); `spec/overview.md` (`:533-535`)
- **Steps:**
  1. Delete `:112-117` (`DecisionFrameEvent`) and `:119-127` (`DecisionStreamSynced` and its
     type). Under D-28-c = B, replace them with alias re-exports instead.
  2. Imports: add `DecisionStreamSynced` to the value import from `@qadi/core` (`:100-107`) and
     `DecisionRecordEvent` to the type import (`:88-99`). Drop the `Schema` namespace import if
     nothing else uses it (`syncedFrame` uses `Schema.encodeSync`, so it likely stays).
  3. `frame(event: DecisionRecordEvent, cursor?)` (`:152`) and `framed(event: DecisionRecordEvent)` (`:220`).
  4. `syncedFrame` keeps `event: "synced"` as a literal. Under D-28-d = A it now encodes through the
     tightened schema, and `frames.length` always satisfies it. Optionally write
     `event: "synced" satisfies DecisionStreamEvent` so a rename in core reaches this line too.
     Recommended: it closes success criterion 3 for the one remaining literal.
  5. Update the module doc comment (`:5-15`) to say the words are `@qadi/core`'s
     (`DecisionStreamEvent`).
  6. `DecisionStreamRoute.tst.ts:27-31`: the three `frame` callability assertions stay as written,
     because they pin the same closed set.
  7. `spec/overview.md`: the `frame` row (`:533`) says `DecisionRecordEvent`. Remove the
     `DecisionFrameEvent` row (`:534`) and the `DecisionStreamSynced` half of `:535` (keep `syncedFrame`).
- **Tests:** `decisionStream.test.ts` runs unchanged. Its raw-frame assertions (`:888`, `:929`, `:944`,
  `:954`, `:991`, `:1058-1075`) are the wire goldens and must not be rewritten to import the names.
  They check that the bytes did not change.
- **Verify:** `pnpm vitest run packages/http/test/decisionStream.test.ts && pnpm test:tstyche && pnpm spec:api`
- **Done when:** http declares no event-name union and no synced schema of its own.

### T3 — `@qadi/devtools` imports the vocabulary
- **Status:** [x] done
- **Depends on:** T1, D-28-c
- **Files:** `packages/devtools/src/model/Source.ts`; `packages/devtools/src/index.ts:29` (`export *` from `./model/Source.ts`, so no barrel edit); `packages/devtools/test/model/Source.test.ts`; `packages/devtools/test/react/useTimeline.test.tsx`; `spec/overview.md:717`
- **Steps:**
  1. Delete `Source.ts:73-78` (`DecisionEventName`). Under D-28-c = B, alias it instead.
  2. `DecisionEventSource.onEvent(event: DecisionStreamEvent, …)` (`:90`) and `Frame.event: DecisionStreamEvent` (`:97`).
  3. `:229`: replace the local list with `DecisionStreamEvent.literals`. Inline it at the
     registration loop (`:177`) or keep a module-scope `const DECISION_EVENTS = DecisionStreamEvent.literals`.
  4. Keep the three `===` comparisons (`:196`, `:205`, `:219`). Under the core type, a renamed
     literal there is now a compile error ("This comparison appears to be unintentional").
  5. Imports: `import { DecisionStreamEvent, decodeStoredRecordString, storedRecordOrder } from "@qadi/core"`.
     Keep the type-only import list sorted.
  6. Tests: `Source.test.ts:86` `queueEvent(event: DecisionStreamEvent, …)`. Change `:743`'s
     expectation to `[...DecisionStreamEvent.literals, "error"]` (C8; order is irrelevant to
     dispatch). Update `useTimeline.test.tsx`'s `onEvent` stand-in type if it names `DecisionEventName`.
  7. `spec/overview.md:717`: drop `DecisionEventName` from the row, and say `onEvent` takes core's
     `DecisionStreamEvent`.
- **Tests:** existing `Source.test.ts` (38) and `useTimeline.test.tsx`, retyped and not rewritten.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Source.test.ts packages/devtools/test/react/useTimeline.test.tsx && pnpm spec:api`
- **Done when:** devtools declares no event-name union, and success criterion 1 holds for `packages/*/src`.

### T4 — Acceptance steps import the vocabulary
- **Status:** [x] done
- **Depends on:** T2, T3
- **Files:** `features/features/decision-log/decision-log.steps.test.ts`
- **Steps:**
  1. Replace `:55-56`'s `isDecisionEvent` with `const isDecisionEvent = Schema.is(DecisionStreamEvent);`,
     importing `DecisionStreamEvent` from `@qadi/core` and `effect/Schema` as a namespace.
  2. `:44`: import `DecisionEventSource`/`SourceRead` from `@qadi/devtools`, and take the event type from core.
  3. Re-run T0's mutation probe on a scratch copy of the branch. Renaming core's `"backlog"` must
     now fail `pnpm typecheck` (success criterion 3).
- **Tests:** the five scenarios, unchanged.
- **Verify:** `pnpm test:bdd` (or `cd features && pnpm vitest run features/decision-log`)
- **Done when:** the feature file passes and the steps restate nothing.

### T5 — Spec, ADR amendment, traceability, CCR, changeset
- **Status:** [x] done
- **Depends on:** T1–T4
- **Files:** `spec/behaviors/26-decision-stream.md` (BEH-QD-311 `:258-268`, BEH-QD-314 `:308-316`, change-history row); `spec/behaviors/27-devtools-timeline.md` (BEH-QD-203 only if it names `DecisionEventName`); `spec/decisions/097-a-decision-log-is-a-sink-and-its-own-history.md` (dated amendment); `spec/decisions/index.yaml` (if amendments are indexed); `spec/traceability.md` (`:68` already lists `DecisionLog.ts`; `:296` gains "stream vocabulary goldens"; `:302` unchanged); `spec/README.md` (CCR-QD-NEXT); `.changeset/*.md` (*new*)
- **Steps:**
  1. BEH-QD-311's signature block: `frame(event: DecisionRecordEvent, …)` and a
     `// @qadi/core` line for `DecisionRecordEvent`. Delete the `DecisionFrameEvent` line.
  2. BEH-QD-314's block: move `DecisionStreamSynced` under `// @qadi/core`, add
     `DecisionStreamEvent`, keep `syncedFrame` under http. Add one requirement:
     ```
     REQUIREMENT: The event names and the `synced` payload MUST be `@qadi/core`'s
                  `DecisionStreamEvent` and `DecisionStreamSynced`; a writer or reader
                  MUST NOT declare its own.
     ```
     Bump the document's revision and change-history row (CCR-QD-NEXT).
  3. ADR-QD-097: a dated amendment blockquote (house pattern, original text unedited). "The
     protocol words D-11-f names — `backlog`, `synced`, `message`, and `{"backlog":n}` — are
     declared in `@qadi/core` beside `LogCursor` (ARCH-28). `@qadi/http` writes them and
     `@qadi/devtools` reads them, so a rename is a compile error in both." State D-28-d's
     tightening.
  4. traceability: `DecisionLog.test.ts` (`:296`) gains BEH-QD-314. `DecisionLog.tst.ts`'s row
     gains the two type pins.
  5. Changeset: `@qadi/core` minor (new exports). `@qadi/http` and `@qadi/devtools` get a minor
     marked **Breaking** under D-28-c = A. Migration: "import `DecisionStreamSynced`,
     `DecisionStreamEvent`, `DecisionRecordEvent` from `@qadi/core`." One fixed group.
- **Tests:** —
- **Verify:** `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && pnpm spec:api && pnpm spec:examples`
- **Done when:** every spec statement of the protocol words names core as their home.

### T-x — (only if D-28-e = B) The reader decodes `synced`
- **Status:** [-] dropped — D-28-e = A (the reader does not decode `synced`)
- **Depends on:** T3
- **Files:** `packages/devtools/src/model/Source.ts`; `Source.test.ts`; `spec/behaviors/27-devtools-timeline.md` (BEH-QD-204)
- **Steps:** test first: a fake `synced` with `data: "{}"` is reported through `onMalformed` with a new `MalformedReason`, and the prelude still completes. Then decode with `Schema.decodeUnknownResult(DecisionStreamSynced)` after `Schema.fromJsonString`, and widen `MalformedReason` as a full closed-union edit.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Source.test.ts`
- **Done when:** a malformed `synced` is reported and the read continues.

### T6 — Full gate
- **Status:** [x] done
- **Depends on:** T5
- **Files:** —
- **Steps:** `pnpm check`. Fix any failure in the task that caused it.
- **Verify:** `pnpm check`
- **Done when:** green.

### T7 — Update the tracker
- **Status:** [x] done
- **Depends on:** T6
- **Files:** this plan (frontmatter, task boxes, §5 statuses, §10). The orchestrator updates `.planning/architecture/README.md`.
- **Steps:** set `status: done`, record each decision, add a §10 row with the CCR number.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-28-*.md`
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Survive unchanged:** `packages/http/test/decisionStream.test.ts` keeps its raw frame-text
  assertions. They are the wire golden, so they stay literal strings and must not import the
  names they check. The five decision-log scenarios stay. `DecisionStreamRoute.tst.ts`'s
  `frame` pins stay.
- **Retyped, not rewritten:** `Source.test.ts` (`queueEvent`'s parameter type, and `:743`'s
  registration expectation derived from core), `useTimeline.test.tsx`'s stand-in, and the BDD
  steps' guard.
- **Added:** `DecisionLog.test.ts` golden for the literal order and the `synced` decode cases.
  `DecisionLog.tst.ts` pins for the two types.
- **Deleted:** nothing. The BDD scenarios remain the end-to-end differential (in-process vs
  over SSE). After this plan they no longer *also* carry the name-agreement check, which the
  compiler now does.
- **Mutation:** no runtime branches change. The `synced` check adds a refinement exercised by the
  new decode cases. Stryker `ignoreStatic` (ADR-QD-076) skips the module-scope declarations,
  as it does `LogCursor`'s regex.

## 8. Spec and documentation updates

- `spec/behaviors/26-decision-stream.md`: BEH-QD-311 and BEH-QD-314 signature blocks, one new
  REQUIREMENT, revision bump.
- `spec/decisions/097-…md`: dated amendment (D-28-a/b/d).
- `spec/overview.md` (gate 13): one core row added, http rows `:533-535` edited, devtools row `:717` edited.
- `spec/traceability.md`: `DecisionLog.test.ts`/`DecisionLog.tst.ts` rows.
- `spec/README.md`: CCR-QD-NEXT.
- `spec/devtools-spec/00-overview.md:69` mentions `synced` in prose, which is still true. No claim
  of absence changes, so gate 12 (`spec:claims`) is unaffected.
- Changesets: core minor; http and devtools minor, Breaking under D-28-c = A.

## 9. Risks and rollback

- **External importers of the removed names** (D-28-c = A). There are none in-repo. A third
  party importing `DecisionStreamSynced` from `@qadi/http` gets a compile error with an obvious
  fix. The changeset names it. Rollback: add the aliases (D-28-c = B), which is additive.
- **Tightened `synced` schema rejects a value a future server sends.** The server is the same
  release (fixed group) and only ever writes `frames.length`. Rollback: relax to `Schema.Number`.
- **Conflicts:** ARCH-25 edits `DecisionStreamRoute.ts` (`reportRefused`, `:178-197`), and ARCH-24
  edits `Source.ts`. Both are import-line rebases. ARCH-19 may remove `frame`/`decisionFrames`
  from http's barrel; if it lands first, T2 step 7's overview edits shrink accordingly (D-28-f).
  ARCH-29's `./*` subpath note does not apply: no new file.
- **`features/node_modules` drift** (C3's note): if `@qadi/http` is not linked, the decision-log
  BDD fails to import before any assertion runs. T0 step 2 covers it. CI runs `pnpm install`
  first.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | Plan written. Evidence re-verified at `e328e75`. A rename mutation showed only 2 of 5 decision-log scenarios catch drift (tsc and devtools tests stay green), a third hand copy was found in the BDD steps, and a core-owned prototype passed tsc, madge, the BDD and the http tests. | planner |
| 2026-10-07 | T0–T7 | Implemented (CCR-QD-195, ADR-QD-097 amendment). Deviations: spec/overview line numbers had moved (found by grep); `Source.test.ts` and `decisionStream.test.ts` imports retyped; tests and source landed together so no separate red run was recorded; mutation probe (rename core `"backlog"`) fails typecheck at `DecisionStreamRoute.ts` and `Source.ts`. `pnpm check` is left to the orchestrator. T-x dropped. | implementer |
