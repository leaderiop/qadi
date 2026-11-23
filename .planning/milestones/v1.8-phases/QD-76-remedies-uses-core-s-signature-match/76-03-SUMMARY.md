---
phase: QD-76-remedies-uses-core-s-signature-match
plan: 03
subsystem: core
tags: [signature-history, fixture-judgement, total-refusal, sink-codec, http-error, api-surface]
phase_base: bf339146723bd1eabd1f08dd94f489d8480027ef
plan_head_before: e1398db96487ec252577f9f4d8f24a62c5b1f9fb
plan_head_after: d8a16aab42da04210205bd52dc5d088086ca4a77

requires: ["76-02"]
provides:
  - "SignatureHistoryUnavailable.subjectId is optional; signatureHistoryPort.failure is total over every request value"
  - "signatureAnswerFromSignatures(signatures, leaf, site): the signature port's answer over fixture rows, as a Result with no Effect"
  - "signatureLookup (module-private) and signatureAnswerOf (SignatureMatch.ts, out of the barrel): one lookup and one answer rule for the layer, the read and the judgement"
affects: [76-04, 76-05, 76-06, 76-07, 76-08]

actuals:
  tokens: 60000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a port error's members are set only when their schema admits the request's value, so building it is total"
    - "the judgement and the read share one lookup and one answer rule, compared on every case of a closed product"

key-files:
  created:
    - packages/core/test/SignatureHistory.tst.ts
  modified:
    - packages/core/src/Errors.ts
    - packages/core/src/SignatureHistory.ts
    - packages/core/src/SignatureMatch.ts
    - packages/core/src/PortAccess.ts
    - packages/http/src/QadiHttpError.ts
    - packages/core/test/SignatureHistory.test.ts
    - packages/core/test/SinkCodec.test.ts
    - packages/http/test/QadiHttpError.test.ts
    - spec/overview.md
    - scripts/check-package-install.mjs

key-decisions:
  - "The tst file's one title is a string continued with a backslash at column 0 and the header is rewrapped, because the plan's 90-column check counts every added line"
  - "The three conformance titles that hold 'as' are broken just after the 'as ', as 76-02 did, so no physical line reads 'as <word>' to the house-style scanner"

patterns-established:
  - "A refusal fails the read and the judgement through one mapping (describeKeyRefusal into signatureHistoryPort.failure); no separate branch for a refused query"

requirements-completed: []  # SIGM-02, SIGM-03, WX-03, WX-04, WX-06 are held by this plan but stay Pending: only 76-08 marks SIGM rows, and no plan marks a WX row

duration: about 35 min
completed: 2026-11-23
status: complete
---

# Phase 76 Plan 03: A signature request the key refuses fails typed, and core answers fixture signatures

A signature request whose subject id the key refuses now fails the read with `SignatureHistoryUnavailable` instead of
dying, and core exports `signatureAnswerFromSignatures`, one pure answer to "does a fixture row meet this signature leaf
at this site", built from the lookup the fixture layer reads and the answer rule `askSignature` uses.

## Accomplishments

- `SignatureHistoryUnavailable.subjectId` is `Schema.optional(SubjectIdSchema)` (`Errors.ts`); the description's `failure`
  sets `subjectId` and `resourceId` each only when `Schema.is` of its schema admits the request's value (`isSubjectId`,
  `isResourceId`, module-private), so building the error never throws and no call site gained a guard.
- `@qadi/http`'s wire and projection carry `subjectId` and `resourceId` each only when the error has it (conditional
  spreads, no `as`); the module doc says so. The sink record carries the absent member as it carries an absent resource
  id; the codec needed no change.
- `signatureLookup` (module-private) holds the pair-key grouping that was inline in `signatureHistoryFromSignatures`;
  the layer keeps its name, copy-per-query comment and refusal mapping word for word.
- `signatureAnswerFromSignatures` follows the fixture layer: `asks`, then `MissingResourceId` (built directly, never
  through `errorOf`, which would be a madge cycle) for a resource-scoped leaf with no resource id before any row is read,
  then the lookup and `signatureAnswerOf`. A refused row or key fails with `SignatureHistoryUnavailable`, never `matched:
  false`.
- `signatureAnswerOf` in `SignatureMatch.ts` builds `{ matched, onFile }` for `askSignature` and the judgement;
  `PortAccess.ts` no longer imports `signatureMatches`. `SignatureMatch.ts` stays out of the barrel (`index.ts` unchanged).
- The overview row sits directly after the fixture-layer row; `spec/overview.md` 1.133 to 1.134.

## Measured facts for later plans

| Item | Value |
| ---- | ----- |
| api-surface | 942 exports (was 941) |
| packed install | `package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))` (base 526) |
| type-test files | 73 (was 72); house-style `584 file(s) clean (3 declared switch(es), 73 type-test file(s))` |
| spec/overview.md | Revision 1.134, `spec-revise --check` clean |
| conformance product | 4 sites x 4 leaves x 73 lists = 1168 cases (36 single rows, each alone and after the decoy, plus `[]`) |
| core project, after Task 2 | 2770 tests, 4 failed: exactly the four history refusal rows still red |
| http project, after Task 1 | 308 tests, 0 failed |
| agreement check | `3 frozen and 3 append-only file(s) hold the statements of 22d5b10c` |
| devtools src | unchanged from `phase_base` |

RED rows after this plan, against `76-RED-EVIDENCE.md`:

| Row | State |
| --- | ----- |
| signature file, fixture-row refusal (`RemedySignatureConformance`) | still red: the remedy table has not changed (76-05) |
| signature file, site-subject refusal | still red for the same reason (76-05) |
| acted file, 14 `hasActed ... at scope Any` mismatches (4 site rows) | still red (76-04, 76-05) |
| acted file, 2 refusal rows | still red (76-04, 76-05) |
| core `SignatureHistory.test.ts` refusal row ("fails as SignatureHistoryUnavailable with no subject id ...") | GREEN, unchanged since 76-02 |
| core `DecisionHistory.test.ts`, the four history refusal rows | still red (76-04): subject-id symbol, event symbol, fixture row subject id symbol answer `NotActed`; one throws building the layer (revoked proxy) |

The two new rows (sink record, response body) and the four rows of `describe("signatureAnswerFromSignatures")` are green.
The devtools signature and acted files were not re-run here (no devtools source changed).

## Task Commits

1. **Task 1 (tracer): the error, the description, the sink record and the response body** - `cbdb553b` (fix) - five files.
2. **Task 2: the judgement, its shared pieces, its conformance tests, the overview row** - `00db0cee` (feat) - five files.
3. **Task 3: the type pin and the packed-consumer probe** - `d8a16aab` (test) - two files (amended once, see Deviations).

## Red runs (Task 1)

Both new rows were written first and run on the unchanged source with `--reporter=json`; each file's only failing row was
the new one (the rest of each file skipped by `-t`):

- `red-03-sink.json`: `a SignatureHistoryUnavailable with no subject id round-trips without one` failed with `Error: Schema
  validation failed` (`SchemaParser constructSync`, building the error with a symbol subject id).
- `red-03-http.json`: `the SignatureHistoryUnavailable projection and response body carry no subject id when the error has
  none` failed with the same `Error: Schema validation failed`.

Both build the error through `signatureHistoryPort.failure([refused], "store down")`, `refused` from `JSON.parse("{}")` with
`subjectId` set to a symbol; neither uses `new`, so `PORT_DOUBLE_BUDGET` is unchanged. After the change both pass.

## Readers of the optional members (T-76-28)

`git grep -l -e SignatureHistoryUnavailable -e DecisionHistoryUnavailable -- "packages/*/src/*" apps examples features`
lists 16 files (five website docs pages, two example files, `SignatureLedger.ts`, `DecisionHistory.ts`, `Errors.ts`,
`EvaluationMetrics.ts`, `PortAccess.ts`, `Predicate.ts`, `SignatureHistory.ts`, `SinkCodec.ts`, `QadiHttpError.ts`). The
reader grep (`.event` / `.subjectId` off anything other than context, entry, facts, pair, wire, leaf, query, question,
input, self, qadi) found hits only in `QadiHttpError.ts`:

| File:line | Reads | Handling |
| --------- | ----- | -------- |
| `QadiHttpError.ts` :279 | `DecisionHistoryUnavailable.event` | the history error is unchanged; `event` stays required |
| `QadiHttpError.ts` :294 | `SignatureHistoryUnavailable.subjectId` | edited here: conditional spread, pinned by the response-body row |
| `QadiHttpError.ts` :456-457 | `AccessDenied` / `UndischargedObligation` `.subjectId` | different classes, `subjectId` required |

Every other file either builds the error or names it in prose. The grep returned no hit outside an edited file, so no
unedited reader exists; `pnpm typecheck` agrees (no consumer assumes a defined subject id).

## Verification

| Check | Result |
| ----- | ------ |
| Task 1 `<automated>` (saved to a script file, run on HEAD after the commit) | `a refused signature request fails typed` |
| Task 2 `<automated>` | `the signature judgement agrees with the read` |
| Task 3 `<automated>` (after the amend) | `the signature judgement is pinned and probed` |
| Tasks 1 and 2 re-run after Task 3 | both still pass |
| `pnpm typecheck`, `pnpm circular` | clean |
| `node scripts/check-api-surface.mjs` | `942 export(s) documented across 9 package(s)` |
| `pnpm test:tstyche` (both passes) | 73 files passed |
| `node scripts/check-package-install.mjs` | 527 runtime exports |
| `pnpm exec oxlint` on every touched `.ts` and `.mjs` file | clean |
| `76-agreement-check.mjs` | holds |
| `git diff --quiet phase_base HEAD -- packages/devtools/src` | holds |

## Deviations from Plan

### Verification-only

**1. [Verification-only] The three verify one-liners were run from script files**
- **Found during:** all tasks
- **Issue:** the one-liners are long and zsh splits variables differently from bash.
- **Fix:** each was extracted byte for byte from the plan into a script in the scratchpad and run with `bash`; nothing it
  checks was weakened. oxlint was run with explicit file arguments from bash after a zsh word-splitting slip gave "No files
  found".

### Auto-fixed Issues

**2. [Rule 3 - Blocking] Long titles and long added lines in the new tests wrapped for the 90-column check**
- **Found during:** Tasks 1, 2 and 3
- **Issue:** the plan's titles and several added test lines run past 90 columns, which each verify refuses; the house-style
  scanner also reads one physical line at a time and flags `as <word>` inside a title.
- **Fix:** each long title is one literal continued with a backslash at column 0; the three titles that hold `as` break
  just after the `as `; long expressions are wrapped. No title or assertion changed.
- **Files modified:** `SinkCodec.test.ts`, `QadiHttpError.test.ts`, `SignatureHistory.test.ts`, `SignatureHistory.tst.ts`
- **Commits:** `cbdb553b`, `00db0cee`, `d8a16aab`

**3. [Rule 3 - Blocking] Task 3's commit was amended once**
- **Found during:** Task 3 verify
- **Issue:** the first `test(76-03)` commit left the type test's header and title over 90 columns; the verify named them.
- **Fix:** rewrapped and amended the unpushed commit (`ba14248e` to `d8a16aab`) so one commit still holds exactly the two
  files, as the verify requires.

Total deviations: 3 (1 verification-only, 2 Rule 3). Impact: none on behaviour or counts.

## Known Stubs

None.

## Threat Flags

None. The only new public surface is `signatureAnswerFromSignatures`, covered by T-76-06 and T-76-24 (a refused row or key
fails typed and never answers `matched: false`; building the error is total).

## Notes for later plans

- The two copies of the signature axes (core's `SignatureHistory.test.ts` and devtools' `RemedySignatureConformance.test.ts`)
  cross a package boundary on purpose: core's tests cannot import devtools' tests and no shipped module carries test data.
- `signatureLookup` and `signatureAnswerOf` are the pieces 76-06 mutates; `Result.match`'s two arms in the judgement are
  the one refusal mapping.
- WX-01..07 and SIGM-01..05 stay Pending; no requirement was marked complete.

## Self-Check: PASSED

Created and modified files exist; commits `cbdb553b`, `00db0cee` and `d8a16aab` are ancestors of HEAD.
