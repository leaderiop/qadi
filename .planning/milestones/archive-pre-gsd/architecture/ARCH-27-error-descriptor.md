---
id: ARCH-27
title: One descriptor per error tag — measured and recommended DROP; keep the cheap, independently useful pieces (derived port-error list, checked §4 table, SinkCodec vocabulary in a leaf module, honest comments)
strength: Speculative   # 2026-10-06 architecture review, candidate #12 ("One descriptor per error tag")
status: done           # (descriptor dropped; T1-T6, T10 landed 2026-10-07) was: not-started # D-27-a gates only T7–T9 (the descriptor itself); T1–T6 are startable now
evidence_verified_at: e328e75
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-008 (read: one code table, collisions visible in one place — the descriptor option would scatter codes across rows; INV-QD-010)
  - ADR-QD-037 (read: madge counts type-only edges; T3 is the leaf module that satisfies it; amend nothing)
  - ADR-QD-060 (read: the nine wire-crossing classes ARE the SinkCodec schema; unchanged)
  - ADR-QD-072 (read: an HTTP status and `httpApiStatus` stay out of core — caps the descriptor at "core row + http row")
  - ADR-QD-081 (read: two tag-keyed tables in core, one wire table in http; hand-written test expectations because of `ignoreStatic`; amend only if D-27-a = GO)
  - ADR-QD-094 (read: a new EvaluationError arrives with a new port description, which is the real cost of adding one)
  - ADR-QD-095 (amend, one sentence, T3: D-09-b's "declared in `Errors.ts`, which cannot import `SinkCodec.ts`" — the refusal vocabulary moves to a leaf both import)
  - ADR-QD-096 (read: `WireVersion`/`WIRE_VERSIONS` move with T3, unchanged in content)
  - ADR-QD-076 (read: `ignoreStatic` — module-scope tables carry no mutants either way)
  - ADR-QD-NEXT (only if D-27-a = GO: "an error tag is described once")
packages: ["@qadi/core", "@qadi/http", "scripts (house-style gate)", "spec", "AGENTS.md"]
estimate: M   # DROP path (T0–T6, T10–T11) ≈ 1–1½ days. GO path adds T7–T9 ≈ 3 days more (L overall)
---

# ARCH-27 — One descriptor per error tag

## 1. Verified evidence (at `e328e75`)

Re-checked on `main` at `e328e75` (`git log --oneline -1`). Nothing in the repo was
edited. Every probe ran on a copy of the tree:

```
S=/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/a032054c-2984-4500-9b86-240b3767ee96/scratchpad/wave3/ARCH-27
rsync -a --exclude /node_modules --exclude .git --exclude 'packages/*/lib' … ./ $S/repo/
ln -s <repo>/node_modules $S/repo/node_modules
find $S/repo -name '*.tsbuildinfo' -delete          # stale build info made the first run lie
```

Baseline on the copy: `tsc -b tsconfig.json` clean; `tsc -p tsconfig.test.json` has 27
pre-existing errors, all environmental (missing `fast-check`, `@electric-sql/pglite`,
`@prisma/adapter-better-sqlite3` and the generated Prisma client in this checkout's
`node_modules`). Every count below is a diff against that baseline.

**The simulation.** `QuotaStoreUnavailable`, a `Schema.TaggedError` with one `quota`
field, was added to `Errors.ts` and to the `EvaluationError` union only — the one edit
a contributor *means* to make. Then each table was fixed in turn and the compiler
re-run, so each remaining error is attributed to the site it forces.

### C1. The union is `Errors.ts:510` — **CONFIRMED**
`export type EvaluationError = …` at `packages/core/src/Errors.ts:510-519`, nine members.

### C2. `ERROR_CODES` at `:554` — **CONFIRMED, compile-forced**
`Errors.ts:554-575`, `as const satisfies Record<QadiError["_tag"], \`ACL${string}\`>`.
Simulation: TS2741 at the `satisfies` line (`:575` + 6 inserted lines = `:581`), plus a
TS7053 cascade in `errorCode` (`:579`).

### C3. `ENFORCEMENT_ERROR_CLASSES` at `:628` — **CONFIRMED, compile-forced**
`Errors.ts:628-657`, `satisfies EnforcementErrorClassTable`. Simulation: TS2741 at its
`satisfies`, cascades at `classifyEnforcementError` (`:667`), `EnforcementErrorTagOf`
(`:674`), and in `@qadi/http`'s `HTTP_ENFORCEMENT_CLASSES` (`QadiHttpError.ts:91`, which
spreads core's table). The http cascade disappears once core's row exists.

### C4. `enforcementErrorTags` at `:702` — **CONFIRMED, compile-forced**
`Errors.ts:702-714`, a literal tuple assigned to `ENFORCEMENT_ERROR_TAGS: CoversExactly<…>`
(`:721`). Simulation: TS2322 at `:721`. A missing tag is caught; so is a stray one.

### C5. `EVALUATION_ERROR_TAGS_BY_TAG` at `Evaluate.ts:117` — **CONFIRMED, compile-forced**
`Record<EvaluationError["_tag"], true>` at `packages/core/src/Evaluate.ts:117-127`,
feeding `qadi_evaluation_errors_total`'s `preregisteredWords` (`:130-150`). Simulation:
TS2741 at `:117`.

### C6. `EvaluationErrorSchema` at `SinkCodec.ts:104` — **CONFIRMED, compile-forced, but reported elsewhere**
`Schema.Union([...nine classes])` at `packages/core/src/SinkCodec.ts:104-114`. Nothing
at `:104` checks it. The omission is caught at the **consumer**, `outcomeOf`
(`SinkCodec.ts:175-180`), as TS2322 plus the Effect language service's TS377003
("Missing errors QuotaStoreUnavailable in the expected Effect type"). The message names
the missing class but points 70 lines away from the line to edit. Also needs the
class added to the value import at `:64-79`.

### C7. `ENFORCEMENT_ERROR_WIRE` at `http/src/QadiHttpError.ts:249` — **CONFIRMED, compile-forced**
`QadiHttpError.ts:249-287`, `satisfies EnforcementErrorWireTable`. With the core sites
fixed, the simulation still fails with TS2741 at `:287`, cascading into `projections`
(`:346`), `WireTypeByTag` (`:338`) and `RequirePermission.ts:347`
(`REQUIRE_PERMISSION_ERROR_SCHEMAS`). Adding the one row clears all of them.

### C8. "Every one is compile-checked, so the cost is edit count, not silent drift" — **CONFIRMED for all seven `src` sites**
After the union edit, the first compile reported 22 errors in 4 `src` files and 40
more in tests. Fixing the seven sites, one at a time, left zero `src` errors. Then
the test project still required five fixture edits, each compile-forced:

| Test site | Forced by |
| --- | --- |
| `core/test/Errors.test.ts:47` `everyError` | mapped type over `EnforcementError["_tag"]` (TS2741) |
| `core/test/Errors.test.ts:89` `expectedClass` | indexed by `ENFORCEMENT_ERROR_TAGS` (TS7053 at `:105`) |
| `core/test/SinkCodec.test.ts:90` `everyErrorFactory` | `Record<EvaluationError["_tag"], …>` (TS2741) |
| `http/test/QadiHttpError.test.ts:331` | indexed by the wire table (TS7053) |
| `http/test/fixtures/everyHttpEnforcementFailure.ts:36` | mapped type (TS2741) |

Not compile-forced, but failing a gate:
- `Errors.test.ts:63-75`, the hand-written `toEqual` of `ENFORCEMENT_ERROR_CLASSES`. It fails at
  runtime (ADR-QD-081 keeps it hand-written on purpose, because `ignoreStatic` skips table mutants).
- `SCHEMA_ERROR_BUDGET`: `node scripts/check-house-style.mjs` on the copy reports
  `declares 12 Schema.TaggedError class(es), found 13`. This is `pnpm lint`.
- Gate 13: `node scripts/check-api-surface.mjs` reports
  `QuotaStoreUnavailable is exported by @qadi/core and is not named in spec/overview.md`.
- `pnpm test:tstyche` (`Errors.tst.ts`, `QadiHttpError.tst.ts`, `RequirePermission.tst.ts`)
  still passes. Those files model an added tag generically and do not need an edit.

**Total for one wire-crossing outage tag:** 1 class, 7 `src` edits (all
compile-forced), 5 test fixtures (compile-forced), 1 runtime expectation, 1 budget
line, 1 AGENTS.md §4 row, and 1 overview mention (gate-forced). Nothing drifts
silently *among the tables*.

### C9. NEW: sites a new tag reaches that nothing checks — **CONFIRMED** (they weaken the candidate, see below)
- **`PORT_ERROR_CONSTRUCTION`** (`scripts/check-house-style.mjs:564-565`) is a regex
  naming the five port-error classes by hand. If the new tag is a port's error, which
  is the usual case (C11), `PORT_DOUBLE_BUDGET` silently stops covering it. Probe: the
  set of port-error tags derived from `Ports.ts`
  (`{ [K in PortName]: ErrorOf<PortTypes[K]>["_tag"] }[PortName]`) is today exactly
  `EnforcementErrorTagOf<"outage">`. A scratch `Same<…>` assertion compiled clean, so
  the list *can* be derived instead of restated.
- **AGENTS.md §4's table** is checked by count only. `SCHEMA_ERROR_BUDGET` compares a
  number. A table row naming the wrong class would pass.
- **The `…Response` named views** (`QadiHttpError.ts:320-331`) are a convention. Leaving
  one out compiles, and nothing lists them against the table.
- **Prose counts.** About 20 comments state a tag count, for example
  `QadiHttpError.ts:5-6,28,38,76,177,321,369`, `RequirePermission.ts:235,248,301,308,318,411`,
  `DecisionStreamRoute.ts:250`, `Errors.ts:16,20` and `SinkCodec.ts:36,85`.
  Two counts are **already stale**. `check-house-style.mjs:438` says "All eleven
  current members" and `:442` says "a twelfth … added", but the budget is 12.
  AGENTS.md §4 says "for the eleven above" under a table of twelve rows.

None of these is a table a descriptor would absorb. The prose and the AGENTS.md table
are documentation, the regex is a `.mjs` gate, and the views are named exports. So
they argue for small, targeted fixes (T1, T2, T4), not for the descriptor.

### C10. SinkCodec's vocabulary lives in `Errors.ts` only because of ADR-QD-037 — **CONFIRMED; a leaf module satisfies madge** (probe)
At `e328e75`, `Errors.ts:357-507` holds `SinkRecordTag` (`:366`), `WirePath`, `OpaqueKind`,
`UnrepresentableKind`, `EncodeRefusal` (`:417-427`), `SinkRecordNotEncodable` (`:442`),
`WireVersion` (`:463`), `WIRE_VERSIONS` (`:466`), `DecodeRefusal` (`:488-496`) and
`SinkRecordNotDecodable` (`:505`). Their own comments (`:436-441`, `:460-461`) and
ADR-QD-095 D-09-b give the reason: `Errors.ts` cannot import `SinkCodec.ts`.

Probe: the block (`SinkRecordTag` through `SinkRecordNotDecodable`) was moved verbatim
into a new `packages/core/src/SinkWire.ts`, which imports only `effect/Data`.
`Errors.ts` took `import type { SinkRecordNotDecodable, SinkRecordNotEncodable } from "./SinkWire.ts"`,
`SinkCodec.ts` imported from the leaf, and the barrel gained
`export * from "./SinkWire.ts"`. Results:
- `madge --circular --extensions ts,tsx packages/*/src`: **No circular dependency found** (139 files).
- `tsc -b`: one error, `DecisionSinkForwarding.ts:25` imports `SinkRecordNotEncodable` from
  `./Errors.ts`. The test project adds `Errors.tst.ts:26-28`,
  `SinkCodec.test.ts:26-36` and `DecisionSinkForwarding.test.ts:14`. All of them are
  import-path edits.
- `check-api-surface.mjs`: clean (844 exports; the public names are unchanged).
  `check-house-style.mjs`: clean.

`SinkRecordTag` must stay a restatement. A leaf importing `DecisionRecord.ts` would
close `Errors → leaf → DecisionRecord → Errors`. The two `…NotEncodable/…NotDecodable`
classes can stay in `Errors.ts` (vocabulary-only leaf) or move too (D-27-b).

### C11. NEW: how often a tag is added, and what comes with it — **measured**
`git log -S"| <Tag>" -- packages/core/src/Errors.ts` shows four of the nine tags in
the first commit (`991b82d`, 2026-07-25). `DecisionHistoryUnavailable` (2026-07-26),
`MissingAction` (2026-07-26), `CustomPredicateError` (2026-08-25) and
`SignatureHistoryUnavailable` (2026-08-26, `f86f028`) came later. None has been added
in the six weeks since. Every later addition arrived with a new **port** or a new
**dimension**, a change that under ADR-QD-094 also means a port description, a
`PortName` member, registry lines, a Policy tag and spec. The seven table edits are a
small part of that change, and the compiler lists every one.

### C12. NEW: the descriptor is feasible, with two limits (probes)
`$S/repo/packages/core/src/ZzProbe.ts`, compiled with `tsc -b packages/core`:
- **Union from rows:** `type Derived = (typeof ROWS)[keyof typeof ROWS]["schema"]["Type"]` equals
  `EvaluationError`. **Works.**
- **SinkCodec union from rows:** `Schema.Union(Record.values(ROWS).map((r) => r.schema))` has
  `Type` equal to `EvaluationError`. **Works.**
- **`catchTag` tuple from rows:** `Effect.catchTag(Record.keys(ROWS), …)` is **TS2345**
  ("Source provides no match for required element at position 0"). The array form needs
  a non-empty tuple, which the comment at `Errors.ts:686-700` already says.
  `Arr.map` over a `NonEmptyReadonlyArray` of rows compiles. So the rows must be a
  non-empty tuple, not a record, or the tags stay hand-listed.
- **`PolicyDecodeTooDeep`** — **the comment at `Errors.ts:524-531` (and `spec/overview.md:411-414`)
  is REFUTED.** It says `Errors.ts` "cannot import it as a value without a circular
  dependency". Policy.ts's transitive imports, from `madge --json packages/core/src/Policy.ts`,
  are `Compare, DecodeDepthGuard, Identity, Matcher, Obligation, Permission,
  SecurityLabel, Signature, TreeFold`. `Errors.ts` is not among them. A probe changed it
  to a value import and used it in a value position, and madge was clean. The
  type-only import is fine. The stated reason is wrong (T4 corrects it). This removes
  one obstacle to deriving `ERROR_CODES` for every `QadiError` from rows.
- **What the descriptor cannot absorb:** the HTTP wire row (status, `httpApiStatus` schema,
  redaction projection). ADR-QD-072 and ADR-QD-081 keep those in `@qadi/http`. The
  minimum for a new tag is therefore **two** edits, a core row and an http row, against
  seven today.

## 2. Goal and success criteria

The review's goal was one **module** per error tag: a descriptor row (code, class,
schema, enforcement class) that is the single **interface** to the taxonomy, with the
union, the tag tuples, the metric words and the SinkCodec union derived from it. That
would buy **locality**, because a tag is stated once, and **leverage**, because every
adapter reads the rows. §1 measured the price. The tables are already **deep enough**:
each is a typed lookup whose omission is a compile error, and the compiler is the
seam that lists every edit. The descriptor turns seven compiler-listed edits into two,
for a change that happens about once a month at most and always arrives inside a much
larger port change. Meanwhile the drift that *is* silent (C9) sits outside any
descriptor's reach.

**Recommendation: DROP the descriptor (D-27-a)** and ship the four cheap,
independently valuable pieces instead:

1. `PORT_ERROR_CONSTRUCTION` is derived from the same source as the port registry and checked against it, not restated (T1).
2. AGENTS.md §4's table is checked by **name**, not just count (T2).
3. SinkCodec's wire vocabulary leaves `Errors.ts` for a leaf module, so `Errors.ts` is the taxonomy again (T3, D-27-b).
4. Comments stop carrying counts that go stale, and the refuted `PolicyDecodeTooDeep` cycle claim is corrected (T4).

Success criteria (DROP path):

1. `grep -n "AttributeResolveError|RelationshipResolveError|DecisionHistoryUnavailable|CustomPredicateError|SignatureHistoryUnavailable" scripts/check-house-style.mjs` finds no hand-written alternation. The port-error class names are read from `packages/core/src/Errors.ts`'s `ENFORCEMENT_ERROR_CLASSES` `"outage"` rows.
2. A tstyche assertion pins `PortErrorTag` (derived from `Ports.ts`) **equal** to `EnforcementErrorTagOf<"outage">`. A port whose error is not an outage, or an outage that is not a port error, fails `pnpm test:tstyche`.
3. Renaming one class in AGENTS.md §4's table, or adding a row for a class not declared `extends Schema.TaggedError` in `Errors.ts`, makes `node scripts/check-house-style.mjs` exit non-zero with a `[schema-error-table]` message.
4. (If D-27-b = A or B) `grep -n "EncodeRefusal = Data.taggedEnum\|WIRE_VERSIONS" packages/core/src/Errors.ts` prints nothing. `pnpm circular` is clean. `@qadi/core`'s exported names are unchanged (`pnpm spec:api` reports the same count, 844 at `e328e75` plus whatever landed since).
5. `grep -nE "\b(nine|ten|eleven|twelve)\b" packages/core/src/Errors.ts packages/core/src/SinkCodec.ts packages/http/src/QadiHttpError.ts packages/http/src/RequirePermission.ts packages/http/src/DecisionStreamRoute.ts scripts/check-house-style.mjs` finds no count of error tags, except where the number is the subject of an ADR title being cited.
6. `Errors.ts`'s comment on `QadiError` no longer claims a value import of `PolicyDecodeTooDeep` would be circular. `spec/overview.md` says the same.
7. `pnpm check` passes.

Success criteria (GO path, only if D-27-a = GO) are in T7–T9.

## 3. Non-goals

- **No change to any error's shape, tag, code or class.** Every tag keeps its
  `ACL###`, so INV-QD-010 is untouched.
- **No move of HTTP facts into core** (ADR-QD-072). Even the GO path leaves
  `ENFORCEMENT_ERROR_WIRE` in `@qadi/http`.
- **No generated code.** A codegen step for the tables was not considered.
  `pnpm check` has no generation stage, and adding one costs more than the seven edits.
- **The test fixtures stay hand-written.** ADR-QD-081 keeps them that way because
  `ignoreStatic` skips table mutants. Deriving test expectations from the table under
  test would make those tests tautological.
- **ARCH-25** (encode-refusal description in core) owns *what a refusal says*. This
  plan only moves *where `EncodeRefusal` is declared* (T3). See §9 for the order.

## 4. Constraints

| Constraint | Consequence here |
| --- | --- |
| AGENTS.md §4, `SCHEMA_ERROR_BUDGET` (`check-house-style.mjs:449-451`, `"packages/core/src/Errors.ts": 12`) | The budget counts `extends Schema.TaggedError` lines **per file**. T3 moves only `Data.TaggedError` and `Data.TaggedEnum` declarations, so the count stays 12 in `Errors.ts`. Under D-27-b = B the two `…NotEncodable/…NotDecodable` classes are `Data.TaggedError` too, so the count is still unaffected. A GO-path descriptor that moved any `Schema.TaggedError` class out of `Errors.ts` would need a new budget key and an AGENTS.md table edit. The GO design in T7 keeps every class in `Errors.ts` for that reason. T2 makes the AGENTS.md table name-checked, so it must be kept true. |
| `PORT_DOUBLE_BUDGET` (`check-house-style.mjs:524-562`) | T1 changes how `PORT_ERROR_CONSTRUCTION` is built, not what it matches. The per-file counts must not move. Verify with the same `node scripts/check-house-style.mjs` output before and after. |
| `SWITCH_BUDGET`, `UNTRACED_BUDGET`, `ANY_BUDGET`, `HAS_CUSTOM_BUDGET`, `DECISION_READ_BUDGET` | Untouched. No `switch`, no `fnUntraced`, no `any`, no `hasCustom`, no `AsyncResult` read. |
| ADR-QD-037 / `pnpm circular` (madge counts type-only edges) | T3's leaf may import only `effect/*`. It must not import `DecisionRecord.ts` or `SinkCodec.ts` (the C10 cycle). |
| AGENTS.md §1 (`.ts` extensions, `import type`), §6 (no `as`) | T3's imports follow §1. The GO path's tag tuple must come from `Arr.map` over a `NonEmptyReadonlyArray` (C12), never `as`. |
| AGENTS.md §9 (barrels) | `SinkWire.ts` is public vocabulary, so `export * from "./SinkWire.ts"` goes in alphabetical order in `packages/core/src/index.ts`. |
| Gate 13 (`pnpm spec:api`, `check-api-surface.mjs`) | Names only. T3 keeps every public name, so the overview *prose* that says where they are declared (`spec/overview.md:439-441`) is updated by hand (T5). |
| ADR-QD-076 (`ignoreStatic`) | No new runtime logic in T1–T4. The script change in T1 is not under Stryker. |
| ADR-QD-095 D-09-b | Says the refusal types are "in `Errors.ts` (which cannot import `SinkCodec.ts` without a cycle)". T3 makes that history, so T5 adds a dated amendment line. |

## 5. Decisions needed before work starts

### D-27-a — GO or DROP on the per-tag descriptor
- **A. DROP (recommended).** Keep the seven tables. §1 shows each is compile-forced,
  that the compiler lists every edit, and that a tag is added rarely and always inside
  a larger port change (C11). The silent-drift sites (C9) are outside a descriptor's
  reach, so fix them directly (T1, T2, T4).
- **B. GO, core-only descriptor.** Create `EVALUATION_ERROR_ROWS`, a non-empty tuple of
  `{ tag, code, class, schema }` in `Errors.ts`. Derive from it `EvaluationError`, the
  evaluation half of `ERROR_CODES`, `ENFORCEMENT_ERROR_CLASSES`'s evaluation rows,
  `ENFORCEMENT_ERROR_TAGS` (via `Arr.map`), the metric words and `EvaluationErrorSchema`.
  `ENFORCEMENT_ERROR_WIRE` stays. Seven edits become two. Costs:
  - `ERROR_CODES` either splits across rows plus a residual table for the eleven
    non-evaluation tags, which loses ADR-QD-008's "every code visible in one table" and
    turns INV-QD-010 into a test-only guarantee, or becomes a third derived view.
  - The derived union is a new pattern next to AGENTS.md §7's hand-written default.
  - Every error message moves from "property X is missing in ERROR_CODES" to a type
    mismatch on a derived union.
  - ADR-QD-081 needs an amendment.
- **C. GO, all `QadiError` tags.** Same as B over all twenty tags, now feasible since
  C12 refuted the `PolicyDecodeTooDeep` cycle. It keeps one code table, as a view. It
  is the largest diff (`Errors.ts` restructured, plus `Policy.ts` row wiring) for the
  same two-edit floor.
- **Recommendation: A.** Revisit only if adding a tag becomes a regular event that does
  not come with a port (C11's history says it has not).
- `status: decided (2026-10-07, RECOMMENDED)`

### D-27-b — Where SinkCodec's wire vocabulary lives
- **A. Leaf module, vocabulary only (recommended).** Create `packages/core/src/SinkWire.ts`
  with `SinkRecordTag`, `WirePath`, `OpaqueKind`, `UnrepresentableKind`, `EncodeRefusal`,
  `WireVersion`, `WIRE_VERSIONS` and `DecodeRefusal`. The two `Data.TaggedError` classes
  stay in `Errors.ts`, with the rest of `QadiError`, and import their field types
  from the leaf. `Errors.ts` remains the one file that declares the taxonomy.
- **B. Leaf module including both error classes.** This is the probed shape (C10).
  `Errors.ts` imports the two types for `QadiError`, as it already does for
  `PolicyDecodeTooDeep`. It gives the most locality for the codec, and puts a second
  `QadiError` member outside `Errors.ts`.
- **C. Leave it.** It is correct today. The cost is only locality: ~140 lines of codec
  vocabulary inside the error file, and ARCH-25 would add more there.
- **Recommendation: A.** Name: `SinkWire.ts` (alternatives `SinkRefusal.ts` or
  `SinkWireVocabulary.ts`; `DecisionWire.ts` is taken).
- `status: decided (2026-10-07, RECOMMENDED)`

### D-27-c — Source of truth for the port-error class list in the house-style gate
- **A. Parse `ENFORCEMENT_ERROR_CLASSES`'s `"outage"` rows from `Errors.ts` text, and pin
  outage ≡ port error in tstyche (recommended).** The script already parses TS by
  regex. The tstyche pin (success criterion 2) makes the textual source honest.
- **B. A shared `scripts/lib/port-error-classes.mjs` list, imported by the script, plus
  a core test that checks it against `PORTS`.** No test imports from `scripts/` today,
  and a `.mjs` import into a strict TS test needs a declaration file. This is more
  machinery.
- **C. Leave the hand list and add a comment.** That keeps the defect C9 found.
- **Recommendation: A.**
- `status: decided (2026-10-07, RECOMMENDED)`

### D-27-d — How far T4 goes on prose counts
- **A. Replace every tag count in `src` comments and in the house-style comment with a
  reference to the table or tuple that holds the set (recommended).** Fix AGENTS.md §4's
  "the eleven above" the same way.
- **B. Fix only the two already-stale counts.** This is smaller and keeps the
  next-tag hazard.
- **Recommendation: A.** Counts in ADR *titles*
  (`060-schema-taggederror-for-the-nine-wire-crossing-errors.md`) are history and stay.
- `status: decided (2026-10-07, RECOMMENDED)`

## 6. Tasks

### T0 — Re-baseline
- **Status:** [x] done (2026-10-07)
- **Depends on:** —
- **Files:** none (scratch only)
- **Steps:**
  1. `git switch -c arch-27/error-tables main`. Record `git log --oneline -1`.
  2. Re-run C2–C8's simulation on a scratch copy (§1 commands). Confirm 7 `src` sites and 5 test sites, the `SCHEMA_ERROR_BUDGET` failure and the gate-13 failure.
  3. Re-run C10's leaf probe. Expect madge clean and only import-path errors.
  4. Re-run the C9 port-error `Same<…>` probe and the C12 `PolicyDecodeTooDeep` value-import probe.
  5. `grep -nE "\b(nine|ten|eleven|twelve)\b"` over the files in success criterion 5, and save the list for T4.
  6. If any line moved, update §1 in place and add a §10 row.
- **Tests:** none
- **Verify:** `pnpm circular && node scripts/check-house-style.mjs` on the branch, both clean.
- **Done when:** §1 matches the branch head, or is corrected.

### T1 — Derive the port-error class list in the house-style gate, and pin outage ≡ port error
- **Status:** [x] done (2026-10-07)
- **Depends on:** T0, D-27-c
- **Files:** `scripts/check-house-style.mjs`; `packages/core/test/Ports.tst.ts` (exists; add one `test(…)`)
- **Steps:**
  1. Test first. In `Ports.tst.ts`, declare
     `type PortErrorTag = { readonly [K in PortName]: ErrorOf<PortTypes[K]>["_tag"] }[PortName]`
     (import `ErrorOf`/`PortTypes` from `../src/Ports.ts` and `PortName` from `../src/PortMetrics.ts`)
     and `expect<PortErrorTag>().type.toBe<EnforcementErrorTagOf<"outage">>()`.
     It passes today (C9 probe). Then prove it can fail: temporarily change
     `CustomPredicateError: "outage"` to `"wiringMistake"` in a scratch copy, see tstyche
     fail, and revert.
  2. In the script, replace the literal alternation at `PORT_ERROR_CONSTRUCTION` (`:564-565`)
     with a list read from `packages/core/src/Errors.ts`. Locate the `ENFORCEMENT_ERROR_CLASSES = {`
     block, take each `^\s*(\w+): "outage",` key up to the closing `} as const satisfies`,
     and build `new RegExp(\`\\bnew\\s+(${names.join("|")})\\s*\\(\`)`.
  3. Fail loudly if the parse finds fewer than one name, with a
     `[port-error-list]` message naming the file. A rename of the table must not silently
     produce a regex that matches nothing.
  4. Update the script's doc comment above `PORT_DOUBLE_BUDGET` to say where the list comes from.
- **Tests:** the tstyche pin above. The script is its own test: its output must be byte-identical before and after.
- **Verify:** `node scripts/check-house-style.mjs` (same output as on `main`); `pnpm test:tstyche`.
- **Done when:** success criteria 1 and 2 hold.

### T2 — Check AGENTS.md §4's `Schema.TaggedError` table by name
- **Status:** [x] done (2026-10-07)
- **Depends on:** T0
- **Files:** `scripts/check-house-style.mjs`; `AGENTS.md` (only if the check finds drift)
- **Steps:**
  1. In the script, after the `SCHEMA_ERROR_BUDGET` loop (`~:1061-1081`), read `AGENTS.md`
     and find the §4 table: the rows after the `| Class | Crosses |` header up to the
     first blank line. Collect each first-column `` `Name` ``.
  2. Collect the class names from `export class (\w+) extends Schema\.TaggedError` in
     every file under `SCHEMA_ERROR_BUDGET`'s keys. Today that is only `Errors.ts`. The
     existing scan already has the lines (`schemaErrorLines`), so extend it to keep names.
  3. Compare the two sets in both directions. On a mismatch, emit
     `AGENTS.md  [schema-error-table] §4 lists X but no Schema.TaggedError class X is declared`
     and the converse.
  4. Fix the stale prose the check sits beside: `check-house-style.mjs:438` ("All eleven
     current members") and `:442` ("a twelfth … added"). Restate them without a count (D-27-d).
- **Tests:** run the script against a scratch copy in which one table row is renamed. It must fail with `[schema-error-table]`. Then rename back.
- **Verify:** `node scripts/check-house-style.mjs` clean on the branch.
- **Done when:** success criterion 3 holds.

### T3 — Move SinkCodec's wire vocabulary into a leaf module
- **Status:** [x] done (2026-10-07)
- **Depends on:** T0, D-27-b (A or B). Skip if D-27-b = C. Sequence with ARCH-25 (§9).
- **Files:** `packages/core/src/SinkWire.ts` (*new*); `packages/core/src/Errors.ts`; `packages/core/src/SinkCodec.ts`; `packages/core/src/DecisionSinkForwarding.ts`; `packages/core/src/index.ts`; `packages/core/test/Errors.tst.ts`; `packages/core/test/SinkCodec.test.ts`; `packages/core/test/DecisionSinkForwarding.test.ts`. Also `grep -rln "from \"\\./Errors.ts\"\|from \"\\.\\./src/Errors.ts\"" packages/core` for any other importer of the moved names.
- **Steps:**
  1. Create `SinkWire.ts` with a one-line summary doc comment ("The record wire's vocabulary: …"), then the *why* paragraph: it is a leaf so both `Errors.ts` and `SinkCodec.ts` can import it (ADR-QD-037). Import only `effect/Data`.
  2. Move `Errors.ts:357-507` into it, minus the two classes under D-27-b = A, or including them under B: `SinkRecordTag`, `WirePath`, `OpaqueKind`, `UnrepresentableKind`, `EncodeRefusal` (type and `Data.taggedEnum` value), `WireVersion`, `WIRE_VERSIONS`, `DecodeRefusal` (type and value). Keep every doc comment. Rewrite the three "Declared here rather than in `SinkCodec.ts` because…" sentences to name the leaf.
  3. In `Errors.ts`: under A, `import type { DecodeRefusal, EncodeRefusal, SinkRecordTag } from "./SinkWire.ts"`; under B, `import type { SinkRecordNotDecodable, SinkRecordNotEncodable } from "./SinkWire.ts"`.
  4. In `SinkCodec.ts:64-80`, split the import. `DecodeRefusal`, `EncodeRefusal` and `WIRE_VERSIONS` come as values from `./SinkWire.ts`, and `OpaqueKind`, `WirePath` and `WireVersion` as types. Under B the two classes also come from the leaf.
  5. `DecisionSinkForwarding.ts:25`: import from the leaf under B. No change under A.
  6. `index.ts`: add `export * from "./SinkWire.ts";` in alphabetical position.
  7. Fix the test imports (`Errors.tst.ts:26-28`, `SinkCodec.test.ts:26-36`, `DecisionSinkForwarding.test.ts:14`). The `SinkRecordTag` tstyche pin stays in `Errors.tst.ts` but imports from the leaf.
- **Tests:** no new behavior, so no new runtime test. The existing `Errors.tst.ts` "SinkRecordTag is exactly SinkRecord's tag" assertion keeps guarding the one restatement.
- **Verify:** `pnpm typecheck && pnpm circular && pnpm test:tstyche && pnpm vitest run packages/core/test/SinkCodec.test.ts packages/core/test/DecisionSinkForwarding.test.ts packages/core/test/Errors.test.ts && pnpm spec:api && node scripts/check-house-style.mjs`
- **Done when:** success criterion 4 holds and `SCHEMA_ERROR_BUDGET` still reads 12 for `Errors.ts`.

### T4 — Make the comments honest: no stale counts, no refuted cycle
- **Status:** [x] done (2026-10-07)
- **Depends on:** T0, D-27-d
- **Files:** `packages/core/src/Errors.ts` (`:8-25`, `:521-531`); `packages/core/src/SinkCodec.ts` (`:36`, `:85`); `packages/http/src/QadiHttpError.ts` (`:5-6`, `:28`, `:38`, `:76`, `:177`, `:321`, `:369`); `packages/http/src/RequirePermission.ts` (`:235`, `:248`, `:301`, `:308`, `:318`, `:411`); `packages/http/src/DecisionStreamRoute.ts` (`:250`); `AGENTS.md` §4 ("for the eleven above"). Use T0's grep output as the authoritative list.
- **Steps:**
  1. For each hit, replace the number with the set's name: "every `EnforcementError` tag", "each tag in `ENFORCEMENT_ERROR_WIRE`", "the wire-crossing `EvaluationError` classes (ADR-QD-060)". Keep ADR titles cited verbatim.
  2. `Errors.ts:521-531`: replace "cannot import it as a value without a circular dependency" with the true statement. It is imported type-only because only its type is needed. A value import would not be circular: `Policy.ts` does not reach `Errors.ts` (`madge --json packages/core/src/Policy.ts`).
  3. Keep doc-comment shape: summary line first, *why* after (AGENTS.md preamble).
- **Tests:** none (comments only).
- **Verify:** success criterion 5's grep; `pnpm typecheck` (nothing else should change).
- **Done when:** criteria 5 and 6 hold for the code side. The spec side is T5.

### T5 — Spec, ADR amendment, CCR, changeset
- **Status:** [x] done (2026-10-07)
- **Depends on:** T1–T4 (whichever were taken)
- **Files:** `spec/overview.md` (`:411-414` `PolicyDecodeTooDeep` cycle sentence; `:439-441` "Both are declared in `Errors.ts`…"); `spec/decisions/095-sinkcodec-owns-both-directions.md` (dated amendment under D-09-b, if T3); `spec/README.md` (CCR-QD-NEXT row); `spec/traceability.md` (extend `Ports.tst.ts`'s row with the T1 pin, citing ADR-QD-094 and `PORT_DOUBLE_BUDGET`); `.changeset/*.md` (*new*, `@qadi/core` patch: no API change; T3 moves declarations only).
- **Steps:**
  1. overview: under T3, say the vocabulary is declared in `SinkWire.ts`, a leaf both `Errors.ts` and `SinkCodec.ts` import, and keep the `SinkRecordTag` restatement sentence. Correct the `PolicyDecodeTooDeep` sentence to match T4.
  2. ADR-QD-095: add a revision row and a blockquote amendment, "2026-10-xx: the refusal vocabulary moved to `SinkWire.ts` (ARCH-27 T3); the classes stay in `Errors.ts`" (or "moved too" under D-27-b = B). Leave the original text unedited (§15: history is exempt).
  3. CCR-QD-NEXT row: list T1–T4's files and the refuted claim (C12).
  4. Changeset: `"@qadi/core": patch` (fixed group), body "Internal: SinkCodec's wire vocabulary is declared in its own module; no export changed."
- **Tests:** none.
- **Verify:** `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:api && pnpm spec:examples`
- **Done when:** the spec gates pass and every moved fact has one current statement.

### T6 — Full gate
- **Status:** [x] done (2026-10-07)
- **Depends on:** T5 (DROP path) / T9 (GO path)
- **Files:** —
- **Steps:** run `pnpm check` once. Fix any failure in the task that caused it.
- **Tests:** —
- **Verify:** `pnpm check`
- **Done when:** green.

### T7 — (GO only) Prototype the descriptor and re-measure
- **Status:** [-] dropped: D-27-a = DROP (measured: seven compile-forced tables, a floor of two edits, tags arrive with a port; ADR-QD-102)
- **Depends on:** T0, D-27-a
- **Files:** scratch only, then `packages/core/src/Errors.ts`
- **Steps:**
  1. In scratch, write `EVALUATION_ERROR_ROWS` as a non-empty tuple of `{ tag, code, class, schema }`, built with `satisfies Arr.NonEmptyReadonlyArray<Row>` and no `as`.
  2. Derive `EvaluationError` from `(typeof ROWS)[number]["schema"]["Type"]`, `ENFORCEMENT_ERROR_TAGS`'s evaluation part from `Arr.map`, `ERROR_CODES` (as a view built with `Record.fromEntries` plus a `satisfies Record<QadiError["_tag"], …>` check), and the classes.
  3. Repeat C8's simulation against the prototype. Record the edit count and every error message a contributor would see.
  4. Proceed to T8 only if the count is ≤ 2 and the messages name the row to add.
- **Tests:** C8's simulation, repeated.
- **Verify:** `tsc -b` on the scratch copy.
- **Done when:** a number and the messages are recorded in §10.

### T8 — (GO only) Land the descriptor
- **Status:** [-] dropped: D-27-a = DROP (measured: seven compile-forced tables, a floor of two edits, tags arrive with a port; ADR-QD-102)
- **Depends on:** T7
- **Files:** `packages/core/src/Errors.ts`, `Evaluate.ts:110-131`, `SinkCodec.ts:85-114`; `packages/core/test/Errors.tst.ts` (pin derived = previous hand union, both directions)
- **Steps:** replace the four hand tables with derivations from the rows. Keep every class in `Errors.ts`, so `SCHEMA_ERROR_BUDGET` stays 12. Keep the public names `ERROR_CODES`, `ENFORCEMENT_ERROR_CLASSES`, `ENFORCEMENT_ERROR_TAGS` and `EvaluationError` with identical types (tstyche `toBe` against literal snapshots written *before* the change, test first).
- **Tests:** tstyche literal snapshots first, then the refactor. The `Errors.test.ts` hand expectations stay unchanged (ADR-QD-081).
- **Verify:** `pnpm typecheck && pnpm test:tstyche && pnpm vitest run packages/core/test/Errors.test.ts packages/core/test/SinkCodec.test.ts packages/core/test/Tokens.test.ts`
- **Done when:** every public type is identical and the C8 simulation needs ≤ 2 edits.

### T9 — (GO only) ADR-QD-NEXT and ADR-QD-081 amendment
- **Status:** [-] dropped: D-27-a = DROP (measured: seven compile-forced tables, a floor of two edits, tags arrive with a port; ADR-QD-102)
- **Depends on:** T8
- **Files:** `spec/decisions/NNN-an-error-tag-is-described-once.md` (*new*), `spec/decisions/081-…md`, `spec/decisions/index.yaml`, AGENTS.md §4 (one sentence on where a new tag is added)
- **Steps:** record C8/C12's numbers, the two-edit floor and why the HTTP row stays separate.
- **Verify:** `pnpm spec:verify:strict && pnpm spec:gates`
- **Done when:** the ADR is indexed and the gates pass.

### T10 — Update the tracker
- **Status:** [x] done (2026-10-07)
- **Depends on:** T6
- **Files:** this plan (frontmatter `status`, task boxes, §5 statuses, §10). The orchestrator updates `.planning/architecture/README.md`.
- **Steps:** set `status:` (`done`, or `dropped` for the descriptor half with T1–T6 done). Record each decision's outcome. Add a §10 row.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-27-*.md`
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Survive unchanged:** `Errors.test.ts` (hand expectations, ADR-QD-081), `SinkCodec.test.ts`'s
  `everyErrorFactory`, `Tokens.test.ts:271` (INV-QD-010 injectivity), `Errors.tst.ts`,
  `QadiHttpError.tst.ts`, `RequirePermission.tst.ts`, and every `everyHttpEnforcementFailure`
  consumer. The DROP path changes no runtime behavior, so no test moves.
- **Added:** one tstyche pin (T1, outage ≡ port error). Script self-checks in T1 and T2,
  shown by a scratch mutation that must fail.
- **Deleted:** nothing.
- **Mutation:** no runtime code changes, so Stryker scores are unaffected. ADR-QD-081's
  note stands: the tables are static and covered by hand expectations plus tstyche.
- **GO path:** tstyche literal snapshots written before T8 are the differential: the
  derived types must equal the old hand-written ones exactly.

## 8. Spec and documentation updates

- `spec/overview.md`: the `PolicyDecodeTooDeep` sentence (`:411-414`), and the location of the sink vocabulary (`:439-441`).
- `spec/decisions/095-…md`: dated amendment (T3).
- `AGENTS.md` §4: the count-free sentence (T4). The table itself becomes gate-checked (T2), so it must stay exactly the declared classes.
- `spec/traceability.md`: extend `Ports.tst.ts`'s row for the T1 pin.
- `spec/README.md`: CCR-QD-NEXT.
- Changeset: `@qadi/core` patch (internal declaration move, no export change).
- GO only: ADR-QD-NEXT and an ADR-QD-081 amendment.

## 9. Risks and rollback

- **T1's text parse breaks on a reformat of `ENFORCEMENT_ERROR_CLASSES`** (comments
  interleaved, a different key quote style). Mitigation: the parse skips comment lines.
  Step 3's zero-match failure turns a broken parse into a loud gate failure, not a silent
  hole. Rollback: restore the literal regex (one line).
- **T2 parses AGENTS.md**, a prose document. A future reformat of the §4 table breaks
  the gate loudly. That is intended: the table is now a checked artefact, as
  `spec/process/definitions-of-done.md`'s table is for gate 11.
- **T3 collides with ARCH-25** (encode-refusal description in core, which edits the same
  `EncodeRefusal` region) and with any in-flight work importing `EncodeRefusal` from
  `./Errors.ts`. Order: land T3 first and let ARCH-25 add its description to
  `SinkWire.ts`, or land ARCH-25 first and move its additions with T3. Either way, one
  of them rebases a pure move. Rollback: revert the move. No public name changes.
- **ARCH-29** (loose-end defects, including the `./*` subpath export): a new
  `SinkWire.ts` is reachable as `@qadi/core/SinkWire` through `exports["./*"]`
  (`packages/core/package.json:28-33`) for as long as that subpath exists. That is
  harmless, but ARCH-29 should know the file exists.
- **GO path:** a derived union degrades error messages from "property X missing in
  ERROR_CODES" to a structural mismatch. This is the main reason D-27-a recommends DROP.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | Plan written. Evidence re-verified at `e328e75` by simulating a tenth `EvaluationError` (7 compile-forced `src` sites and 5 test sites, confirmed), a leaf-module probe (madge clean) and descriptor-feasibility probes. D-27-a recommends DROP. | planner |
| 2026-10-07 | all | Implemented on `arch/wave3`. D-27-a = DROP (T7-T9 `[-]`), D-27-b = A (`SinkWire.ts`, classes stay), D-27-c = A, D-27-d = A. Deviations: T0 re-baseline folded into the work (no scratch re-simulation; the §1 evidence stood and the leaf move was re-run for real). ARCH-25 had added `encodeRefusalPath`/`encodeRefusalAnnotations`/`EncodeRefusalAnnotations`/`describeEncodeRefusal` to `Errors.ts`; they moved with the vocabulary into `SinkWire.ts` (needs `effect/Match`), so `no-refusal-annotation-outside-core`'s exemption moved from `Errors.ts` to `SinkWire.ts`. `EncodeRefusalReport.ts` imports from the leaf. ADR-QD-102, CCR-QD-194, ADR-QD-095 Rev 1.3. | implementer |
