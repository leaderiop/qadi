---
phase: QD-76-remedies-uses-core-s-signature-match
plan: 04
subsystem: core
tags: [decision-history, fixture-judgement, total-refusal, sink-codec, http-error, api-surface, removal]
phase_base: bf339146723bd1eabd1f08dd94f489d8480027ef
plan_head_before: d0eced40b3821773f899ce36697f2813cd08219c
plan_head_after: 7b0e209a1198d82bf262a5a85ad1cf14792cd6cf

requires: ["76-03"]
provides:
  - "DecisionHistoryUnavailable.event is optional; decisionHistoryPort.failure is total over every request value"
  - "the history fixture keys rows and requests through decisionHistoryPort.key: a refused row or request fails typed, never NotActed, never a throw"
  - "actedAnswerFromEvents(events, leaf, site): the history port's answer over fixture events, as a Result with no Effect, typed Acted | NotActed or the read's two failures"
  - "actedLookup (module-private): one lookup for the fixture layer and the judgement"
affects: [76-05, 76-06, 76-07, 76-08]

actuals:
  tokens: 70000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a port error's members are set only when their schema admits the request's value, so building it is total"
    - "the judgement and the read share one lookup, compared on every case of a closed product"
    - "a removed export leaves with its overview rows in the same commit, so the api-surface gate stays the check"

key-files:
  created:
    - packages/core/test/DecisionHistory.tst.ts
  modified:
    - packages/core/src/Errors.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/SignatureHistory.ts
    - packages/http/src/QadiHttpError.ts
    - packages/core/test/DecisionHistory.test.ts
    - packages/core/test/SinkCodec.test.ts
    - packages/http/test/QadiHttpError.test.ts
    - spec/overview.md
    - scripts/check-package-install.mjs

key-decisions:
  - "Three long titles that hold 'as' are broken just after the 'as ', as 76-02 and 76-03 did, because the house-style scanner reads one physical line at a time"
  - "answerOf maps a success to { _tag: 'Answered', answer } so the projection is one tagged shape and JSON.stringify compares judgement and read"
  - "Judged is typed with the read's ActedResult (it includes Unknown) so the same projection takes the read and the judgement; the judgement itself is typed without Unknown"

patterns-established:
  - "A refusal fails the read and the judgement through one mapping (describeKeyRefusal into decisionHistoryPort.failure); no separate branch for a refused query"

requirements-completed: []  # SIGM-02, WX-03, WX-04, WX-06 are held by this plan but stay Pending: only 76-08 marks SIGM rows, and no plan marks a WX row

duration: about 15 min
completed: 2026-11-23
status: complete
---

# Phase 76 Plan 04: A history row or request the key refuses fails typed, and core answers fixture events

A history row or request the key refuses now fails with `DecisionHistoryUnavailable` instead of answering `"NotActed"`
(which `hasNotActed` reads as an allow) or throwing while the layer is built, and core exports `actedAnswerFromEvents`,
one pure answer to "do these fixture events meet this acted leaf at this site", read from the lookup the fixture layer reads.
`ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` are removed: nothing reads them any more.

## Accomplishments

- `DecisionHistoryUnavailable.event` is `Schema.optional(Schema.String)` (`Errors.ts`); the description's `failure` sets
  `event` only when `Schema.is(Schema.String)` admits the request's value (`isEvent`, module-private), so building the error
  never throws and no call site gained a guard.
- `@qadi/http`'s wire and projection carry `event` only when the error has it (a conditional spread, no `as`); the module doc
  names the member. The sink record carries the absent event as it carries an absent resource id; the codec needed no change.
- `actedLookup` (module-private) keys each row twice through `decisionHistoryPort.key` (its resource-scoped request and its
  `Any` request), gathers the keys with `Result.all` into one `Set<string>`, and answers `"Acted"` when a query's own key is in
  the set, `"NotActed"` otherwise, and the refusal for a key the port refuses. `decisionHistoryFromEvents` keeps its name and
  closed-world comment and maps the one refusal through `describeKeyRefusal`; `HashSet` and `Data` left the imports.
- `actedAnswerFromEvents` follows the fixture layer: `asks`, then `MissingResourceId` (built directly, never through
  `errorOf`, which would be a madge cycle) for a resource-scoped leaf with no resource id before any event is read, then the
  lookup. Typed `Result.Result<"Acted" | "NotActed", MissingResourceId | DecisionHistoryUnavailable>`: the closed world never
  answers `"Unknown"`.
- `ActedEvent`, `ActedAnywhere` (with their doc comment) and `ActedAnywhereInput` are deleted; `ActedEventInput` stays (read by
  `decisionHistoryFromEvents`, `Ports.ts`, devtools' simulation model). The class overview row is gone and the type row names
  `ActedEventInput` alone. `SignatureHistory.ts`'s fixture doc no longer compares its group with the removed `HashSet`
  separation.
- The overview row sits directly after the `decisionHistoryFromEvents` row; `spec/overview.md` 1.134 to 1.135.

## Measured facts for later plans

| Item | Value |
| ---- | ----- |
| api-surface | `940 export(s) documented across 9 package(s)` (942 after 76-03; one added, three removed) |
| packed install | `package-install: 9 package(s) pack, resolve and authorize (526 runtime export(s))` (back to the base count) |
| type-test files | 74; house-style `584 file(s) clean (3 declared switch(es), 74 type-test file(s))` |
| spec/overview.md | Revision 1.135, `spec-revise --check` clean |
| conformance product | 4 sites x 2 leaves x 17 lists = 136 cases (8 single rows, each alone and after the decoy, plus `[]`) |
| core project | 2774 tests, 0 failed (2771 after Task 1, 3 new rows in Task 2) |
| http project | 309 tests, 0 failed |
| agreement check | `3 frozen and 3 append-only file(s) hold the statements of 22d5b10c` |
| devtools src | unchanged from `phase_base` |
| removed names | `git grep -nw -e ActedEvent -e ActedAnywhere -e ActedAnywhereInput -- packages examples features` finds nothing (spec/decisions/189 and the overview's Change History line still name them, as history) |

RED rows after this plan, against `76-RED-EVIDENCE.md` (devtools Remedy files re-run here: 14 tests, 6 passed, 8 failed):

| Row | State |
| --- | ----- |
| core `DecisionHistory.test.ts`, the four history refusal rows | GREEN (written on the base, unchanged) |
| core `SignatureHistory.test.ts` refusal row | GREEN (since 76-03) |
| devtools acted file, `hasActed ... at scope Any` mismatches (4 site rows) | still red: the remedy table has not changed (76-05) |
| devtools acted file, fixture-row and site-subject refusal rows | still red (76-05) |
| devtools signature file, fixture-row and site-subject refusal rows | still red (76-05) |

The three new core rows of `describe("actedAnswerFromEvents")` and the two codec and response-body rows are green.

## Task Commits

1. **Task 1 (tracer): the keyed fixture, the optional event, the sink record and the response body** - `565b4a40` (fix) - five files.
2. **Task 2: the judgement, its conformance tests, the overview row, the removal** - `5451d320` (feat) - four files.
3. **Task 3: the type pin and the packed-consumer probe** - `7b0e209a` (test) - two files.

## Red runs (Task 1)

Both new rows were written first and run on the unchanged source with `--reporter=json`; each file's only failing row was the
new one (the rest skipped by `-t`):

- `red-04-sink.json`: `a DecisionHistoryUnavailable with no event round-trips without one` failed with `Error: Schema
  validation failed` (building the error with a symbol event).
- `red-04-http.json`: `the DecisionHistoryUnavailable projection and response body carry no event when the error has none`
  failed with the same `Error: Schema validation failed`.

Both build the error through `decisionHistoryPort.failure([refused], "store down")`, `refused` from `JSON.parse` with `event`
set to a symbol; neither uses `new`, so `PORT_DOUBLE_BUDGET` is unchanged. After the change both pass.

## Readers of the optional member (T-76-29)

`git grep -l -e DecisionHistoryUnavailable -e SignatureHistoryUnavailable -- "packages/*/src/*" apps examples features` lists 16
files (five website docs pages, two example files, `SignatureLedger.ts`, `DecisionHistory.ts`, `Errors.ts`,
`EvaluationMetrics.ts`, `PortAccess.ts`, `Predicate.ts`, `SignatureHistory.ts`, `SinkCodec.ts`, `QadiHttpError.ts`). The reader
grep (`.event` / `.subjectId` off anything other than context, entry, facts, pair, wire, leaf, query, question, input, self,
qadi) found hits only in `QadiHttpError.ts`:

| File:line | Reads | Handling |
| --------- | ----- | -------- |
| `QadiHttpError.ts` :279 | `DecisionHistoryUnavailable.event` | edited here: conditional spread, pinned by the response-body row |
| `QadiHttpError.ts` :294 | `SignatureHistoryUnavailable.subjectId` | edited in 76-03: conditional spread |
| `QadiHttpError.ts` :456-457 | `AccessDenied` / `UndischargedObligation` `.subjectId` | different classes, `subjectId` required |

No unedited file reads either member off an error value; Task 1's verify re-runs the same grep. `pnpm typecheck` agrees.

## Verification

| Check | Result |
| ----- | ------ |
| Task 1 `<automated>` (script extracted byte for byte, run on HEAD after Task 3) | `a refused history row or request fails typed` |
| Task 2 `<automated>` | `the acted judgement agrees with the read` |
| Task 3 `<automated>` | `the acted judgement is pinned and probed` |
| `pnpm typecheck`, `pnpm circular` | clean |
| `node scripts/check-api-surface.mjs` | `940 export(s) documented across 9 package(s)` |
| `pnpm test:tstyche` (both passes) | 74 files passed |
| `node scripts/check-package-install.mjs` | 526 runtime exports |
| `pnpm exec oxlint` on every touched `.ts` and `.mjs` file | clean |
| `76-agreement-check.mjs` | holds |
| `git diff --quiet phase_base HEAD -- packages/devtools/src` | holds |

## Deviations from Plan

### Verification-only

**1. [Verification-only] The three verify one-liners were run from script files**
- **Found during:** all tasks
- **Issue:** the one-liners are long and zsh splits variables differently from bash.
- **Fix:** each was extracted byte for byte from the plan into a script in the scratchpad and run with `bash`; nothing it
  checks was weakened. A reader-grep loop first run under zsh printed file names instead of reads, and was re-run under bash.

### Auto-fixed Issues

**2. [Rule 3 - Blocking] Long titles, one import and four type lines wrapped for the 90-column check**
- **Found during:** Tasks 1 and 2
- **Issue:** the `./Identity.ts` import, the judgement's return type, `Judged`, the `cases` annotation and two titles ran past
  90 columns, and the house-style scanner flagged `as <word>` inside three titles.
- **Fix:** each long title is one literal continued with a backslash; the three titles that hold `as` break just after the
  `as `; long types and the import are wrapped. No title or assertion changed.
- **Files modified:** `DecisionHistory.ts`, `DecisionHistory.test.ts`, `QadiHttpError.ts`
- **Commits:** `565b4a40`, `5451d320`

**3. [Rule 1 - Bug in the plan's test shape] `Judged` is typed with `ActedResult`, not `"Acted" | "NotActed"`**
- **Found during:** Task 2 typecheck
- **Issue:** `askActed`'s read answers the wider `ActedResult`, so one `answerOf` could not take both the read and the judgement.
- **Fix:** `Judged` is `Result<ActedResult, MissingResourceId | DecisionHistoryUnavailable>`; the judgement still returns the
  narrower type and is pinned by `DecisionHistory.tst.ts`.
- **Commit:** `5451d320`

Total deviations: 3 (1 verification-only, 1 Rule 3, 1 Rule 1). Impact: none on behaviour or counts.

## Known Stubs

None.

## Threat Flags

None. The only new public surface is `actedAnswerFromEvents`, covered by T-76-09 to T-76-11 and T-76-25 (a refused row or
request fails typed and never answers `"NotActed"`; building the error is total).

## Notes for later plans

- `actedLookup` is the piece 76-06 mutates; `Result.match`'s two arms in the judgement are the one refusal mapping.
- 76-05 changes the remedy table's acted arm to ask `actedAnswerFromEvents`; the eight red devtools rows turn green there.
- 76-07's core changeset and upgrade guide name `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` as removed with nothing
  replacing them.
- WX-01..07 and SIGM-01..05 stay Pending; no requirement was marked complete.

## Self-Check: PASSED

Created and modified files exist; commits `565b4a40`, `5451d320` and `7b0e209a` are ancestors of HEAD.
