---
id: ARCH-29
title: Four loose ends from the 2026-10-06 review — archive order, retention on impossible ages, subject-set error policy, the `./*` subpath export
strength: n/a (defects noted, not deepenings)
status: done        # T1, T2, T5 start now; the rest wait on D-29-a…h (§5)
evidence_verified_at: e328e75
depends_on: []             # four independent items; each ships alone
blocks: []                 # see §9 "cross-plan coupling": ARCH-22 (foldTrace visibility) and ARCH-26 (ShortCircuit visibility) read D-29-g
adrs_touched:
  - ADR-QD-056 (read: "a reader reconstructs true order by sorting" (:200-207), retention outside the pipeline, the breaker "fully internal"; amend one paragraph if D-29-b lands — an entry of unknown age is never purgeable)
  - ADR-QD-095 (amend if D-29-d = A: the inbound side refuses a non-finite `at`, which the outbound walk already refuses)
  - ADR-QD-096 (constraint: wire version 2 only; D-29-d tightens what v2 decode accepts without a version bump, since no encoder ever emitted it)
  - ADR-QD-097 (constraint: `storedRecordOrder` stays the one order a reader uses, NaN-tolerant for in-memory records)
  - ADR-QD-022 (amend if D-29-e = B: the streamed siblings report per element instead of failing the stream)
  - ADR-QD-019 (constraint: review queries report, they do not enforce; this is why per-element failure isolation is right for them and wrong for `filter`)
  - ADR-QD-026 (constraint: `EvaluateOptions.concurrency` is about composite children inside one evaluation)
  - ADR-QD-033 (amend if D-29-h includes B: gate 14 also checks what the packed `exports` map refuses)
  - ADR-QD-090 (amend if D-29-g = A: "reachable only as the `@qadi/core/TreeFold` subpath" becomes "not reachable")
  - ADR-QD-091 (amend if D-29-g = A: "reachable as `@qadi/core/Compare`" becomes "not reachable")
  - ADR-QD-037 (constraint: madge; type-only edges count)
  - ADR-QD-038 (constraint: changesets, one fixed version group; one changeset per item so each ships alone)
  - ADR-QD-NEXT (new, item 4 only: "A package's entry points are a closed list")
packages: ["@qadi/audit", "@qadi/core", "@qadi/http", "@qadi/testing", "@qadi/promise", "@qadi/predicate-sql", "@qadi/predicate-prisma", "apps/website (docs only)", "scripts (gates 13, 14)"]
estimate: L   # item 1 ≈ ½ day (S); item 2 ≈ 1 day (M); item 3 ≈ ½ day minimal / 2 days with D-29-e = B; item 4 ≈ 1½ days (M)
---

# ARCH-29 — Four loose ends from the 2026-10-06 review

This plan is not one deepening. It collects four side findings from the
2026-10-06 review that nobody had verified, and handles each as its own item:
its own claim in §1, its own decisions, and its own test-first task chain.
Any item can merge without the others.

| Item | Area | Verdict at `e328e75` | First task |
| ---- | ---- | -------------------- | ---------- |
| **I1** | `archiveAuditTrail` keeps unsequenced entries in input order | **REFUTED as a defect.** It is intended, documented and tested. The spec is silent on where those entries go | T1 (pin and specify) |
| **I2** | Retention with a `NaN` `at` keeps the entry forever | **CONFIRMED, but it is the safe direction.** The nearby cases nobody flagged go the destructive way and purge: `at = -Infinity`, which a stored `-1e400` reaches; `now = +Infinity`; `maxAgeMs < 0` | T2 (red tests) |
| **I3** | `decideSubjects` partitions failures while the stream fails whole; `concurrency` is "ignored" | **Asymmetry CONFIRMED but specified, so not a defect.** "`concurrency` ignored" is **REFUTED**. Separately, a website example teaches the wrong signatures (CONFIRMED) | T5 |
| **I4** | `./*` makes the modules kept out of the barrel importable | **CONFIRMED and already documented.** §9 never promised privacy. The defect is that nothing decides whether a subpath is semver surface: the CHANGELOG says it is, `spec/overview.md` says it is not | T7 (red gate) |

## 1. Verified evidence (at `e328e75`)

`git log --oneline -1` → `e328e75 Keep mutation runs sequential, a worker per core; gate every Stryker config (#146)`.
All probes ran from `scratchpad/wave3/ARCH-29/`, never from the repo. The command was
`cd packages/core && NODE_OPTIONS="--conditions=bun" ../../node_modules/.bin/tsx <probe>.mts`,
importing `src` modules by absolute path:

- `nan-probe.mts`: what `Schema.Number`, `encodeSinkRecord`, `decodeSinkRecord`
  and `decodeAuditEntry` do with non-finite `at` and `sequenceNumber`; retention on
  non-finite `at`; archive order for a mixed sequenced/unsequenced input.
- `retention-inputs-probe.mts`: retention on non-finite `now` and negative or
  non-finite `maxAgeMs`.
- `subject-concurrency-probe.mts`: `decideSubjects` over an `allOf` of two slow
  attributes for two subjects, with and without `concurrency: "unbounded"`.

### I1 — Archive order for entries with no `sequenceNumber`

**C1.1 The code keeps input order for unsequenced entries — CONFIRMED.**
`packages/audit/src/AuditArchive.ts:100-102` sorts with
`(a.sequenceNumber ?? +∞) - (b.sequenceNumber ?? +∞)`. `∞ − ∞` is `NaN`, which
`toSorted` treats as `0`, so two unsequenced entries compare equal. The sort is
stable, so they keep their input order **after** every sequenced entry. Probe:
input `[u-late@300, s2@200#2, u-early@100, s1@150#1]` →
`s1#1, s2#2, u-late@300, u-early@100`, `sequenceIntegrityVerified: true`.

**C1.2 This contradicts ADR-QD-056 — REFUTED.** ADR-QD-056:200-207 says "every
`AuditEntry` carries `at`, and optionally `sequenceNumber`, so **a reader**
reconstructs true order by sorting rather than trusting write order". An archive is
not a reader. It is a bundle that a reader reads later. The order is intended, and
three places say so:
- the doc comment, `AuditArchive.ts:76-84`: "stably, so the (opt-in,
  unordered-by-definition) entries carrying none keep their relative order rather
  than being shuffled by an incidental comparator result";
- a test, `packages/audit/test/AuditArchive.test.ts:76-86`, "unsequenced entries
  keep their relative order, stably, rather than being shuffled";
- the spec, BEH-QD-254 (`spec/behaviors/33-audit-pipeline.md:288-291`): "archiveAuditTrail
  MUST store entries sorted by sequenceNumber, stably … never the caller-supplied
  array order verifySequenceIntegrity happens to tolerate".

Sorting unsequenced rows by `at` with `storedRecordOrder`
(`packages/core/src/DecisionRecord.ts:247-252`) would make the archive assert an
order it cannot verify. `at` comes off "a `Clock` in whichever process made the
decision … so it can be anything" (`DecisionRecord.ts:236-240`). The archive's only
ordering claim is tied to `sequenceIntegrityVerified`.

**C1.3 Gap, not a defect — CONFIRMED.** Neither BEH-QD-254 nor any test says where
unsequenced entries land **in a mixed input**. The mixed test,
`AuditArchive.test.ts:120-133`, asserts only the `verified` flag. So "after every
sequenced entry, in input order" is behaviour nothing pins. A mutant that put them
first would survive.

**C1.4 Side finding — the comparator can be inconsistent — CONFIRMED (minor).** A
`NaN` `sequenceNumber` (decode accepts it; see C2.4) gives `NaN − x = NaN`, which
sorts as "equal to everything". This is reachable only when exactly one entry is
sequenced, because with two or more `verifySequenceIntegrity` refuses `NaN`. Probe:
`[a#NaN, b]` archives with `verified: false`. It is folded into D-29-d.

### I2 — Retention when the age is impossible

**C2.1 `now − at > maxAgeMs` with a `NaN` `at` keeps the entry forever — CONFIRMED.**
See `packages/audit/src/Retention.ts:17-18`. Probe: `at = NaN` → retained, and
`at = +Infinity` → retained.

**C2.2 Keeping it is the safe direction for an audit trail — the claim's framing is REFUTED.**
`getPurgeableEntries` feeds a deletion routine (`Retention.ts:41-54`, which says to
archive before purging). A wrong *retain* keeps a row too long. A wrong *purge*
destroys evidence that may never have been archived. For this module, "fail closed"
means **never select a row for deletion without a finite age past a valid limit**.
It does not mean expiring the row.

**C2.3 The destructive cases nobody flagged — CONFIRMED (the real defect).** These
are probe outputs for a row written at `now`:

| Input | Purged? | Reachable from |
| ----- | ------- | -------------- |
| `at = -Infinity` | **yes, at once** | a stored row whose JSON says `"at":-1e400`: `JSON.parse` gives `-Infinity` and decode accepts it (C2.4) |
| `now = +Infinity` | **yes, every row** | a caller's clock arithmetic (`Number.MAX_VALUE * 2`, a bad `Duration` conversion) |
| `maxAgeMs = -1` | **yes, every row up to `now + 1`** | a caller's sign error, or a config value read as negative |
| `maxAgeMs = -Infinity` | **yes, every row** | same |
| `at = NaN`, `now = NaN`, `maxAgeMs = NaN`, `now = -Infinity`, `maxAgeMs = +Infinity` | no | (safe direction) |

**C2.4 Can `at` be non-finite after decode? — CHANGED: NaN cannot come from text, but ±Infinity can.**
- Encode refuses it. `SinkCodec.ts:366`'s `wireHazard` returns `NonFinite` for any
  non-finite number in the encoded record. Probe: `encodeSinkRecord` with `at = NaN`
  or `Infinity` → `{"path":["at"],"_tag":"NonFinite"}`. So `encodeAuditEntry` never
  writes one.
- Decode accepts it. The v2 fields declare `at: Schema.Number` (`SinkCodec.ts:137`,
  `:151`), and v4's `Schema.Number` accepts `NaN` and `±Infinity`. Probe: `true` for
  all three.
- Reached from JSON text, `NaN` is impossible: `JSON.stringify` writes `null`, which
  is refused as `Malformed`. But `"at":1e400` decodes to `Infinity` and is
  **accepted**, and `-1e400` decodes to `-Infinity`. Probe:
  `decodeAuditEntry via JSON at:1e400: ACCEPTED at=Infinity`. The codebase already
  knows this pattern: `packages/core/test/Predicate.test.ts:901` says
  "untrusted JSON, where `1e400` decodes to `Infinity`".
- Reached in process, both are accepted. `decodeSinkRecord`/`decodeAuditEntry` take
  `NaN` from an in-memory value (a driver that maps a float column, a
  structured clone), and `AuditEntry` is a plain type that a caller can build by
  hand without decoding at all.
- `sequenceNumber` is `Schema.optional(Schema.Number)` in two places,
  `AuditEntry.ts:112` and `:154`. `NaN` and `1.5` are accepted.
  `verifySequenceIntegrity` later refuses a fractional or `NaN` number when there are
  two or more, but not when there is exactly one (C1.4).

Conclusion: tightening decode (D-29-d) closes the cross-boundary paths. Retention
still needs its own guard (D-29-b/c), because a hand-built `AuditEntry` never passes
through decode.

**C2.5 INV-QD-053 holds and is not the issue — CONFIRMED.** The partition property
(`Retention.test.ts` "PROPERTY: retained and purged partition entries") draws only
integers in `[0, 200000]`. It never samples a non-finite or negative input, so none
of C2.3 is exercised.

### I3 — Subject-set error policies and `concurrency`

**C3.1 The array form partitions failures and the stream form fails whole — CONFIRMED, and specified.**
- `packages/core/src/SubjectSet.ts:117` uses `Effect.partition`, so it never fails.
  The stream form, `:195-210`, uses `Stream.mapEffect`, so the first
  `EvaluationError` fails the stream.
- The source says this on purpose (`SubjectSet.ts:180-193`, "Not given the array
  form's per-element failure isolation … a real API shape decision this file does
  not make unilaterally").
- So does the spec: `spec/behaviors/14-subject-sets.md:62-75` (BEH-QD-105's revised
  note, "The streamed siblings … are unchanged … accumulating one is future work
  this ticket does not take on"), and so does `spec/overview.md:158`.
- A test pins it: `packages/core/test/SubjectSet.test.ts:587-620`.

So this is deferred work, not a defect. The glossary entries for "Subject set" and
"Review query" (`spec/glossary.md:282-302`) say nothing about failures either way.

**C3.2 The spec's reason for the asymmetry is wrong; the source's is right — CONFIRMED (doc drift).**
BEH-QD-105:71-75 says a stream "has no 'batch' left to discard by the time an error
reaches a subscriber". The test at `:587-620` shows what actually happens: subject
`c`, which comes after the failing `b`, is **never evaluated**. The review stops,
and the consumer cannot learn how far it got. That is the very harm BEH-QD-108's
second requirement forbids for the array form ("the batch continues past a failing
element").

**C3.3 `decideSubjects` ignores `concurrency` — REFUTED.** `options` is passed
unchanged to `evaluate` (`SubjectSet.ts:121`, `:203`), where `concurrency` means
"evaluate the children of `allOf`/`anyOf`/`rules` concurrently"
(`Evaluate.ts:172-189`, ADR-QD-026). It was never a cross-subject option.
Probe (`allOf` of `x`, `y`; subjects `a`, `b`):
```
default   : start:a.x end:a.x start:a.y end:a.y start:b.x end:b.x start:b.y end:b.y
unbounded : start:a.x start:a.y end:a.x end:a.y start:b.x start:b.y end:b.x end:b.y
```
Children run concurrently inside each subject, and the subjects still run one after
another. BEH-QD-108 (`14-subject-sets.md:153-164`) **requires** that: "Elements MUST
be evaluated one at a time … Concurrency, if it is ever added, belongs as a bounded
option rather than a change of default." Nothing tests that `concurrency` reaches
each element. `SubjectSet.test.ts` mentions "concurrency" only in comments
(`:432`, `:545`). There is a usability hazard too: a caller who passes
`concurrency` hoping for fan-out across subjects gets none, and silently gives up
short-circuiting inside each subject (INV-QD-005).

**C3.4 New defect: the website teaches signatures that no longer exist — CONFIRMED.**
`apps/website/src/content/docs/docs/concepts/subject-sets.md:101-107` is a
` ```typescript ` fence, which gate 23 (`check-website-doc-examples.mjs`) compiles.
Its comments say `decideSubjects` returns
`Effect<ReadonlyArray<SubjectDecision>, EvaluationError, …>` and `filterSubjects`
returns `Effect<ReadonlyArray<AuthSubject>, EvaluationError, …>`. Both have been
false since BEH-QD-262 (issue #107). The real types are `SubjectSetOutcome, never`
and `FilteredSubjects, never`. Comments are not compiled, so the gate cannot see
this. Two spec mentions are design history and stay as they are:
`spec/decisions/022-subject-set-evaluation.md:121` (amended in place at `:52-62`,
`:127-129`) and `spec/models/34-ngac.md:188` (an E6 proposal sketch).

**C3.5 A test title claims more than the test checks — CONFIRMED (minor).**
`SubjectSet.test.ts:588` says "…and names the element that broke". The test asserts
`r.failure._tag === "AttributeResolveError"`. That error has only `attribute` and
`cause` (`Errors.ts:79-85`), so nothing names the subject.

### I4 — The `./*` subpath export

**C4.1 Seven public packages export `./*` — CONFIRMED.**
`node -e` over every `packages/*/package.json` gives:
- `audit`, `core`, `http`, `predicate-prisma`, `predicate-sql`, `promise` and
  `testing` export `[".", "./*"]`;
- `devtools` exports `[".", "./react"]` (an explicit list);
- `react` exports `["."]`.

That is seven packages with `./*`, not just core as the review suspected. Each
`./*` maps `types → ./lib/*.d.ts`, `bun → ./src/*.ts` and `import/default → ./lib/*.js`.
For `predicate-sql`, `predicate-prisma` and `promise`, `src/` holds only `index.ts`,
so the wildcard exposes nothing the root does not already expose.

**C4.2 The modules kept out of the barrel are importable — CONFIRMED.** Comparing
each `src/*.ts` against `index.ts` gives 7 modules in core (`Compare`,
`FieldLattice`, `FieldPath`, `PortAccess`, `PortDerivation`, `ShortCircuit`,
`TreeFold`) and 1 in audit (`CircuitBreaker`). Every other module is barreled, so
`@qadi/core/Policy` and the like also resolve, as a second path to names the root
already exports.

**C4.3 "§9 is not actually private" — REFUTED as stated: §9 never claimed privacy.**
AGENTS.md:540-546 gives the reason for keeping shared scaffolding out of the barrel
as "exporting internal helpers leaks generic names into the flat namespace". That is
about naming, not access. The reachability is documented, too:
- `spec/overview.md:804-811` lists all 8 modules in "Not listed above", each as
  "reachable only through the `./*` wildcard subpath";
- gate 13 (`scripts/check-api-surface.mjs:178-213`) expands `./*` to every
  `src/*.ts` module because of CCR-QD-102;
- the modules' own comments say so (`CircuitBreaker.ts:40-41`, `TreeFold.ts:28`,
  `Compare.ts:26`).

**C4.4 The real defect: nothing decides whether a subpath is semver surface — CONFIRMED.**
The repository says both things.

It says subpaths are surface:
- `packages/audit/CHANGELOG.md:30` and `packages/core/CHANGELOG.md:91`: "**Breaking,
  for `@qadi/audit/CircuitBreaker` subpath imports only.**"
- `core/CHANGELOG.md:61`: "`@qadi/core/RetryingLayer` is gone".
- ADR-QD-090:177 rejects an alternative partly because it "moves … off the
  `@qadi/core/Policy` subpath, breaking importers".
- `Decision.ts:205` and ADR-QD-092:108 keep a re-export "so `@qadi/core` and
  `@qadi/core/Decision` keep resolving".

It says they are not:
- `spec/overview.md:810` (Compare): "the module's interface stays free to change
  while only core consumes it".
- ADR-QD-056: the breaker is "fully internal".
- AGENTS.md §3: "`PortDerivation.ts` (internal; …)".

No ADR ever chose `./*`. `git log -S'"./*"'` traces it to the workspace scaffold
(`41f412c`, 2026-07-25), and later packages copied it (`b02c0f6` http, `476ad86`
audit).

**C4.5 Nothing in the repository imports a subpath — CONFIRMED.** Running
`git grep -nE "@qadi/(core|audit|http|predicate-prisma|predicate-sql|promise|testing)/[A-Za-z]"`
outside CHANGELOGs and `reports/` finds only comments and spec prose. Not a single
import: none in devtools, the examples, `apps/website`, `features/` or any test.
AGENTS.md §1 (:48-55) already forbids a cross-package subpath import, and ADR-QD-090:186
is why devtools keeps a private `TreeFold` twin. `tsconfig.json`'s `paths`
(:49-59) maps only the nine roots.

**C4.6 What the gates check — CONFIRMED.**
- Gate 13 (`check-api-surface.mjs`) treats a wildcard as "every `src/*.ts` is an
  entry point" (`:203-213`). It never asks whether a wildcard should exist.
- Gate 14 (`check-package-install.mjs`) handles wildcards in check 2 (`:193-221`) by
  substituting `index` for `*`. Check 3 (`:269-300`) imports only each package's root
  (`import * as m${i} from "${name}"`), and the check 4 fixture (`:340-355`) imports
  roots plus `@qadi/devtools/react`. **Neither gate ever imports a wildcard subpath,
  and neither asserts that a non-entry module is refused.**

## 2. Goal and success criteria

These are four small changes to four **interfaces**, each made honest about its own
**seam**:

- I1: the archive bundle's ordering contract is specified at the depth it already
  has.
- I2: retention becomes one deep function, `planRetention`, that owns the single
  "may this row be deleted?" rule, refuses impossible inputs, and leaves
  `getPurgeableEntries`/`enforceRetention` as thin projections. Its wire-side twin is
  the inbound codec refusing what the outbound codec already refuses, so the
  **locality** of "a stored `at` is a finite number" is one schema field.
- I3: the review-query module gains one per-subject step that both the array
  **adapter** and the stream adapter fold over. Per-element failure isolation then
  lives in one place, not two.
- I4: each package's entry points become a closed list. "Out of the barrel" then
  means "not reachable", which gives the internal modules (`ShortCircuit`, `TreeFold`,
  `PortAccess`, …) real freedom to change behind the root interface. ARCH-22 and
  ARCH-26 need exactly that **leverage**.

Success criteria, one block per item:

**I1**
1. `AuditArchive.test.ts` has a test that pins mixed-input placement (sequenced in
   number order, then unsequenced in input order), and BEH-QD-254 states it.
   `grep -n "MUST follow every sequenced entry" spec/behaviors/33-audit-pipeline.md`
   → 1 hit.

**I2**
2. No combination of `at`, `now` or `maxAgeMs` selects a row for purge unless `at`
   and `now` are finite, `maxAgeMs ≥ 0`, and `now − at > maxAgeMs`. A FastCheck
   property that also draws `±Infinity`, `NaN` and negative values proves it in
   `Retention.test.ts`.
3. `planRetention(entries, policy, now)` returns
   `Result<RetentionPlan, RetentionInputInvalid>`; a plan is
   `{ retained, purged, undated }` with `undated ⊆ retained`. INV-QD-053 (the
   partition) still holds for the two old functions.
4. With D-29-d = A, a stored row whose JSON says `"at":1e400` or `"at":-1e400`, or
   whose `sequenceNumber` is `1.5` or `NaN`, is refused by `decodeAuditEntry` as
   `Malformed`, and a test proves each case.

**I3**
5. The website fence carries type annotations, so gate 23 compiles the signatures it
   used to only assert in comments:
   `grep -n "EvaluationError, SubjectSetServices" apps/website/src/content/docs/docs/concepts/subject-sets.md`
   → nothing.
6. A test pins that `concurrency` reaches each element's composite children and the
   elements stay sequential.
7. With D-29-e = B, a stream review whose second element fails still evaluates the
   third, and the consumer receives a `SubjectFailed` for the second.

**I4**
8. No public `package.json` `exports` map has a key containing `*`. Gate 13 fails
   if one is added.
9. In gate 14's sandbox, `import("@qadi/core/TreeFold")` fails with
   `ERR_PACKAGE_PATH_NOT_EXPORTED`. Every declared entry point imports, and every
   source module outside the barrel and outside the declared list is refused.
10. AGENTS.md §9 states the rule, and ADR-QD-NEXT records it.

**All items**
11. `pnpm check` passes on each item's branch on its own.

## 3. Non-goals

- **Sorting archive entries by `at`.** C1.2 explains why: the archive cannot verify a
  multi-process clock.
- **Retention of `ObligationRecord`s by a different rule, or any notion of
  "archived".** `Retention.ts:44-53` keeps "archive before purge" a caller duty, and
  this plan does not change that.
- **A wire version bump.** D-29-d narrows what v2 decode accepts to what v2 encode
  could ever emit. INV-QD-096 is untouched.
- **Cross-subject concurrency (a `subjectConcurrency` option).** D-29-f records why
  not now.
- **Changing `Qadi.filter`/`filterStream` failure semantics.** They enforce
  (ADR-QD-019) and must still fail; `SubjectSet.ts:94-96` already explains why.
- **Moving devtools onto core's `foldTree`.** That is ARCH-22's scope, and AGENTS.md
  §1 forbids it while `foldTree` is unbarreled.
- **Publishing.** No `version-packages` merge and no `npm publish`, per standing
  user instruction (2026-10-06). Changesets only.

## 4. Constraints

- **AGENTS.md §1.** Cross-package imports are named imports from the root, so I4
  removes no in-repo import (C4.5). New audit and core code uses `effect/*`
  namespace imports and `.ts` relative specifiers.
- **AGENTS.md §4.** `RetentionInputInvalid` is a `Data.TaggedError`, because no codec
  needs its shape. So `SCHEMA_ERROR_BUDGET` stays at 12 and is untouched. Any new
  failure type in I3 reuses `EvaluationError`.
- **AGENTS.md §5.** A new per-subject step (`decideSubject`) is a named
  `Effect.fn("qadi.decideSubject")`. `UNTRACED_BUDGET` stays at 3: per-element
  tracing is not a per-node hot path, and changing that would need a benchmark first.
- **AGENTS.md §5a.** Dispatch over the new `SubjectOutcome` union uses
  `Match.tagsExhaustive`. `SWITCH_BUDGET` is unchanged.
- **AGENTS.md §6.** No `as`, `!` or `any` in tests or source, so `ANY_BUDGET` is
  unchanged. Retention takes `now` as a parameter; no `Date.now()`.
- **`PORT_DOUBLE_BUDGET` (§6).** Every new failing-port test in I3 uses
  `scriptedPort(attributeResolverPort, …)`. None constructs `AttributeResolveError`
  by hand, so no file joins the budget.
- **`DECISION_READ_BUDGET`, `HAS_CUSTOM_BUDGET`.** Not touched.
- **`no-catchtags-object-form`.** Any new handling uses `Effect.catchTag(…)` in
  array form.
- **AGENTS.md §9.** I4 rewrites its rationale; the alphabetical-barrel rule is
  unchanged.
- **AGENTS.md §11/§15.** Spec changes go with the code. Gate 13
  (`check-api-surface.mjs`) forces I2's and I3's new exports into `spec/overview.md`,
  and forces I4's removed subpath names **out** of "Not listed above" (STALE fails
  otherwise). Gate 9 (`check-doc-examples.mjs`) and gate 23
  (`check-website-doc-examples.mjs`) compile the fences.
- **AGENTS.md §16 / ADR-QD-033.** Gate 14 (`check-package-install.mjs`) is where I4's
  behavioural check belongs. `tsconfig.build.json` is unchanged, since no package
  is added.
- **ADR-QD-037 (madge, gate 5).** `SubjectSet.ts` gains no new import edges beyond
  `effect/*`. `Retention.ts` imports `effect/Data` and `effect/Result` only.
- **Mutation gates.** Gate 20 (`stryker run stryker.audit.mjs`) covers
  `Retention.ts` and `AuditArchive.ts`, and gate 16 (`stryker run`) covers
  `SubjectSet.ts`/`SinkCodec.ts`. Each new guard clause needs a test that kills it.
  Do not run these locally while sibling agents are running.

## 5. Decisions needed before work starts

### D-29-a — Where an unsequenced entry goes in an archive (I1)
- **A. Keep the current order, then specify and pin it.** Sequenced entries come
  first, in number order; unsequenced entries follow in input order. A reader that
  wants time order applies `storedRecordOrder` itself. This needs no code change,
  only a test and a BEH sentence.
- **B. Use `storedRecordOrder` as a secondary key for unsequenced entries.** This
  changes behaviour: it breaks the test at `AuditArchive.test.ts:76-86` and makes the
  archive vouch for multi-process clock order.
- **C. Interleave unsequenced entries among sequenced ones by `at`.** This mixes a
  verified order with an unverified one, and the result is not even a total order in
  general.
- **Recommendation: A.** ADR-QD-056 gives ordering to the *reader*, and the archive
  claims only what `sequenceIntegrityVerified` backs.
- `status: decided (2026-10-07, A)`

### D-29-b — What retention does with an entry of unknown or impossible age (I2)
- **A. Retain it, and also report it as `undated`.** "Undated" means `at` is not
  finite; `+Infinity`, which is not a future, is treated the same. This fixes
  `-Infinity`'s immediate purge (C2.3). Callers see the rows through
  `planRetention`'s `undated`, so they are retained, but not silently.
- **B. Purge it ("expire").** This destroys audit evidence on the strength of a
  corrupted field, and is the opposite of fail-closed for a deletion selector.
- **C. Refuse the whole run when any entry is undated.** One bad row then blocks
  every lawful purge, forever, until someone repairs the store by hand.
- **Recommendation: A.** It keeps INV-QD-053's partition (`undated ⊆ retained`).
- `status: decided (2026-10-07, A)`

### D-29-c — What retention does with invalid `now` or `policy` (I2)
- **A. Purge nothing, silently**, in the two existing functions. This is safe, but a
  misconfigured job then never purges, and nobody is told.
- **B. A, plus a typed refusal from a new `planRetention`.**
  `planRetention(entries, policy, now): Result<RetentionPlan, RetentionInputInvalid>`
  refuses when `now` is non-finite, or `maxAgeMs` is `NaN` or `< 0`. `+Infinity` is
  valid and means "retain forever". The two existing functions become projections:
  on a refusal, `purged = []` and `retained = entries`. Signatures stay the same, so
  there is no break.
- **C. Brand `RetentionPolicy` behind `makeRetentionPolicy`.** This breaks every
  `{ maxAgeMs }` literal, including the website example (`capabilities.md:88`), and
  still says nothing about `now`.
- **Recommendation: B.** One deep function owns the rule; the old interface keeps
  working and fails safe.
- `status: decided (2026-10-07, B)`

### D-29-d — Tighten the inbound wire for `at` and `sequenceNumber` (I2; core plus audit)
- **A. Decode `at` as `Schema.Finite` in both v2 field sets (`SinkCodec.ts:137`,
  `:151`), and `sequenceNumber` as `Schema.Int` in one shared field used by both
  `AuditEntry.ts:112` and `:154`.** This closes the `1e400` path (C2.4) and C1.4's
  `NaN` comparator. It refuses nothing an encoder could ever have produced, because
  `wireHazard` already refuses non-finite numbers. Devtools sources and the decision
  log, which share the wire, then refuse such a frame as `Malformed` rather than
  placing it last.
- **B. Leave decode alone and rely on the readers.** Retention's guard
  (D-29-b) and `storedRecordOrder` both tolerate it. Outbound and inbound then stay
  asymmetric, and every future reader must remember the guard.
- **C. A, but `sequenceNumber` as a non-negative `Int`.** Negativity cannot hide a
  gap, so this is stricter for no gain.
- **Recommendation: A.** It amends ADR-QD-095 with one paragraph; no wire version
  bump (ADR-QD-096) is needed. It overlaps ARCH-25 (the encode-refusal description in
  core), which edits `SinkCodec.ts`, so whichever lands second rebases.
- `status: decided (2026-10-07, A)`

### D-29-e — The streamed review's error policy (I3)
- **A. Keep it.** Fix the spec's wrong rationale (C3.2) and the test title (C3.5),
  and note in BEH-QD-105 that the stream stops at the first failure.
- **B. Report per element, through one shared step.** Add
  `SubjectOutcome = SubjectDecided { subject, decision } | SubjectFailed { subject, error }`
  (a `Data.TaggedEnum`) and `decideSubject(policy, subject, options): Effect<SubjectOutcome, never, SubjectSetServices>`.
  `decideSubjectsStream` would emit `SubjectOutcome`, with error channel `E2` only.
  `filterSubjectsStream` would emit only the allowed `SubjectDecided`s and every
  `SubjectFailed`, so a failure is never silently absent (BEH-QD-108). Its element
  type would become `SubjectAllowed { subject } | SubjectFailed`. `decideSubjects`
  would become `Effect.forEach` over `decideSubject` (sequential), followed by a
  partition: one implementation, and the array form stays at `never`. The stream
  element types change, so this is breaking (0.x minor).
- **C. Add new siblings (`reviewSubjectsStream`) and keep the old ones.** That makes
  two stream APIs with opposite failure policies, which is worse than either alone.
- **Recommendation: B.** A review query reports (ADR-QD-019), and a reporting batch
  that stops at the first flaky lookup is the defect #107 fixed for arrays. The
  source comment (`SubjectSet.ts:186-193`) already names this shape as the fix it
  deferred. It amends ADR-QD-022.
- `status: decided (2026-10-07, B)`

### D-29-f — Concurrency across subjects (I3)
- **A. None.** Document that `EvaluateOptions.concurrency` applies inside each
  element, and pin it with a test (T5).
- **B. Add a bounded `subjectConcurrency?: number` option**, which BEH-QD-108 allows
  "as a bounded option".
- **Recommendation: A.** The claim was refuted (C3.3) and nobody has asked for B.
  B is a feature for its own plan, and it should wait for a measured need.
- `status: decided (2026-10-07, A)`

### D-29-g — What the `exports` maps say (I4)
- **A. Root only.** Remove `./*` from all seven packages and keep devtools'
  `./react`. Barreled modules lose only a second path to the same names, and the
  migration is a specifier change (`@qadi/core/Policy` → `@qadi/core`). Each barreled module is re-exported with `export * from`, so every one of its names stays importable from the root. The 8
  unbarreled modules become unreachable, which is what ADR-QD-056 ("fully internal"),
  AGENTS.md §3 ("internal") and overview `:810` ("free to change") already assume.
  This breaks external subpath importers, of whom none are known (C4.5). Ship it as
  a 0.x minor with a migration note.
- **B. An explicit allowlist of named subpaths.** List only those with a reason, for
  example `./CircuitBreaker` if someone wants the breaker. No reason was found
  (C4.5), so B reduces to A plus a list that starts empty.
- **C. Keep `./*` and declare subpaths "reachable, not semver surface".** This amends
  §9 and stops CHANGELOGs calling subpath changes "Breaking". The ambiguity then
  becomes the policy, and every internal module's signature stays visible to
  consumers' type checkers.
- **D. Keep `./*` and map each unbarreled module to `null`.** This is a deny list,
  which drifts: a new internal module is public until someone remembers to add it.
- **Recommendation: A**, enforced by D-29-h. `status: decided (2026-10-07, A)` — the user ordered it.

### D-29-h — How the closed list is enforced (I4)
- **A. Statically, in gate 13 (`check-api-surface.mjs`).** It refuses any `exports`
  key containing `*`, and requires every non-root key to appear in a new overview
  table, "Entry points", with a reason. Today that table holds only
  `@qadi/devtools/react`. The wildcard-expansion code (`:203-213`) is replaced by the
  refusal.
- **B. Behaviourally, in gate 14 (`check-package-install.mjs`).** A new check 3b
  imports every declared entry point in the sandbox, and imports every
  `lib/<Module>.js` that is neither barreled nor declared, expecting
  `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- **C. Both.**
- **Recommendation: C.** A covers the manifest and B covers the artifact, which is
  ADR-QD-033's point: "the packed artifact is the product". Under D-29-g = C, B is
  dropped and A becomes "a wildcard is allowed only where overview says so".
- `status: decided (2026-10-07, C)`

## 6. Tasks

Each item's chain ships on its own branch: I1 = T1 (+T10a); I2 = T2→T3→T4 (+T10b);
I3 = T5→T6 (+T10c); I4 = T7→T8→T9 (+T10d). Before each chain merges, run T11 on its
branch.

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none (probes are re-created under `scratchpad/wave3/ARCH-29/`)
- **Steps:**
  1. `git switch -c arch-29/<item> main`. Use one branch per item:
     `arch-29/archive-order`, `arch-29/retention`, `arch-29/subject-sets`,
     `arch-29/entry-points`.
  2. Re-run the three probes from §1, using the commands in §1's header, and
     confirm each output line matches §1. Pay particular attention to:
     `-Infinity` purged; `1e400` accepted; `unbounded` interleaving only within a
     subject; and the archive order
     `s1#1, s2#2, u-late@300, u-early@100`.
  3. Re-run the I4 sweep:
     `for f in packages/*/package.json; do node -e "…Object.keys(p.exports)…"; done`
     and the C4.5 `git grep`. Both must match §1.
  4. If `main` has moved, re-check the line numbers in §1 and update them in this
     plan before starting.
- **Tests:** none
- **Verify:** the probe outputs as above
- **Done when:** every §1 claim is re-observed, or this plan has been corrected.

### T1 — Pin and specify unsequenced placement in an archive (I1)
- **Status:** [x] done
- **Depends on:** T0; D-29-a (the steps below assume A; under B/C, step 1's
  expectation changes and the test is red first)
- **Files:** `packages/audit/test/AuditArchive.test.ts`;
  `packages/audit/src/AuditArchive.ts` (doc comment only);
  `spec/behaviors/33-audit-pipeline.md` (BEH-QD-254)
- **Steps:**
  1. Add `it.effect("in a mixed input, sequenced entries come first in number order and unsequenced follow in input order")`.
     Its input is `[u-late@300, s2@200#2, u-early@100, s1@150#1]`. Assert
     `archive.entries.map(e => e.record.evaluationId)` deep-equals
     `["s1","s2","u-late","u-early"]`, and that `verified` is `true`.
  2. Add a second test: for an input of exactly one sequenced entry plus unsequenced
     entries, the one sequenced entry comes first. This kills the mutant that drops
     `?? +∞` to `?? -∞`.
  3. In `AuditArchive.ts:76-84`, add one sentence: "Placed after every sequenced
     entry, in the order given; ordering them by `at` is a reader's job
     (`storedRecordOrder`, ADR-QD-056), since the archive cannot verify a clock."
  4. Under BEH-QD-254, add the REQUIREMENT: "Entries carrying no sequenceNumber MUST
     follow every sequenced entry, in the order given; archiveAuditTrail MUST NOT
     order them by `at`."
- **Tests:** two new `it.effect`s (they pin current behaviour under A)
- **Verify:** `pnpm vitest run packages/audit/test/AuditArchive.test.ts`;
  `bash spec/scripts/verify-traceability.sh --strict`
- **Done when:** both tests pass, and BEH-QD-254 carries the requirement.

### T2 — Reproduce the destructive retention inputs, test-first (I2 defect)
- **Status:** [x] done
- **Depends on:** T0 (no decision: these assertions hold under every D-29-b/c
  option except B, which nobody recommends)
- **Files:** `packages/audit/test/Retention.test.ts`
- **Steps:**
  1. Add `describe("an impossible age is never purged")` with one `it` per row of
     C2.3's purged cases:
     - an entry built from `entryAt(1_000)` with `record.at` replaced by
       `Number.NEGATIVE_INFINITY` (build it as `{ ...e, record: { ...e.record, at } }`,
       without `as`) gives `getPurgeableEntries(…, {maxAgeMs: 1_000}, 2_000)` →
       `[]`;
     - `now = Number.POSITIVE_INFINITY` → `[]`;
     - `maxAgeMs = -1` → `[]`;
     - `maxAgeMs = Number.NEGATIVE_INFINITY` → `[]`.
     Each must also assert that `enforceRetention` returns the entry. Run them: four
     are **red** today.
  2. Add one test each for `NaN` `at`, `+Infinity` `at`, `NaN` `now` and `NaN`
     `maxAgeMs` (retained). These are green and pin the safe direction.
  3. Extend the partition property: draw `at`, `now` and `maxAgeMs` from
     `oneof(integer, constantFrom(NaN, ±Infinity), integer({min:-1000,max:-1}))`. Keep
     the union/intersection assertions, and add "purged ⇒ finite `at`, finite `now`,
     `maxAgeMs ≥ 0` and `now − at > maxAgeMs`". It is red today.
- **Tests:** 8 example tests (4 red, 4 green) and 1 extended property (red)
- **Verify:** `pnpm vitest run packages/audit/test/Retention.test.ts`. Expect exactly
  the 4 red examples and the red property.
- **Done when:** the red set is committed with the T3 fix, or as an `it.fails`
  checkpoint if T3 lands separately.

### T3 — `planRetention`: one rule, the old functions as projections (I2)
- **Status:** [x] done
- **Depends on:** T2; D-29-b; D-29-c
- **Files:** `packages/audit/src/Retention.ts`; `packages/audit/src/index.ts` (it
  already exports `Retention.ts` via `export *`, so check that nothing new is
  needed); `packages/audit/test/Retention.test.ts`
- **Steps (assuming D-29-b = A and D-29-c = B):**
  1. Add `export class RetentionInputInvalid extends Data.TaggedError("RetentionInputInvalid")<{ readonly field: "now" | "maxAgeMs"; readonly value: number }> {}`.
  2. Add `export interface RetentionPlan { readonly retained: ReadonlyArray<AuditEntry>; readonly purged: ReadonlyArray<AuditEntry>; readonly undated: ReadonlyArray<AuditEntry> }`.
     Document that `undated ⊆ retained`.
  3. Add `export const planRetention = (entries, policy, now): Result.Result<RetentionPlan, RetentionInputInvalid>`:
     - refuse when `!Number.isFinite(now)`;
     - refuse when `!(policy.maxAgeMs >= 0)`, which catches both `NaN` and negatives;
     - otherwise make one pass: if `!Number.isFinite(entry.record.at)`, push to
       `retained` and `undated`; else if `now − at > maxAgeMs`, push to `purged`;
       else push to `retained`.
  4. Rewrite `getPurgeableEntries` and `enforceRetention` as
     `Result.match(planRetention(…), { onFailure: () => [] / entries, onSuccess: p => p.purged / p.retained })`.
     Delete `partitionByRetention` and `isPurgeable`; their rule now lives in
     `planRetention`.
  5. Rewrite the doc comments: the module header gets the "never deletes without a
     finite age past a valid limit" rule. `planRetention`'s comment explains the two
     refusals and `undated`.
  6. Tests: T2 goes green. Add a test that `planRetention` refuses each of `now` =
     `±Infinity`/`NaN` and `maxAgeMs` = `NaN`/`-1`/`-Infinity` with the right `field`;
     that `maxAgeMs = +Infinity` is valid and purges nothing; and that `undated`
     holds exactly the non-finite-`at` rows.
- **Tests:** T2's set plus about 6 `planRetention` tests. The extended property now
  also asserts `undated ⊆ retained`.
- **Verify:** `pnpm vitest run packages/audit/test/Retention.test.ts`;
  `pnpm tsc -b packages/audit`; `node scripts/check-house-style.mjs`
- **Done when:** T2 is green, `grep -n "isPurgeable\|partitionByRetention" packages/audit/src`
  finds nothing, and the house-style gate passes.

### T4 — Inbound wire refuses a non-finite `at` and a non-integer `sequenceNumber` (I2)
- **Status:** [x] done
- **Depends on:** T0; D-29-d. Independent of T3; either can land first.
- **Files:** `packages/core/src/SinkCodec.ts` (`:137`, `:151`);
  `packages/core/test/SinkCodec.test.ts`; `packages/audit/src/AuditEntry.ts`
  (`:110-113`, `:153-156`); `packages/audit/test/AuditEntry.test.ts`
- **Steps (assuming D-29-d = A):**
  1. Red first, in `SinkCodec.test.ts`:
     `decodeSinkRecordString(text.replace('"at":1000', '"at":1e400'))` is a
     `Failure` with `refusal._tag === "Malformed"`. Do the same for `-1e400`, and for
     `decodeSinkRecord` of an in-memory record with `at: Number.NaN`. All three are
     red today.
  2. Red first, in `AuditEntry.test.ts`: `decodeAuditEntry` refuses
     `sequenceNumber: 1.5`, `sequenceNumber: Number.NaN` and a JSON `"at":1e400`. All
     are red today.
  3. In `SinkCodec.ts`, change `at: Schema.Number` to `at: Schema.Finite` in both
     field sets. Add a comment pointing at `wireHazard`'s `NonFinite` arm: "the
     inbound twin of the outbound refusal".
  4. In `AuditEntry.ts`, declare `const SequenceNumber = Schema.optional(Schema.Int)`
     once and use it in both `AuditEntry` and `decodeRow`. Two copies of the field
     was the locality defect.
  5. Check that the golden-bytes tests and INV-QD-096's round-trip property still
     pass, since the encoder never emits non-finite `at`. Then run the devtools
     source tests, which decode frames:
     `pnpm vitest run packages/devtools/test`.
- **Tests:** 6 new red-first cases, 3 in core and 3 in audit
- **Verify:** `pnpm vitest run packages/core/test/SinkCodec.test.ts packages/audit/test/AuditEntry.test.ts packages/devtools/test packages/core/test/DecisionLog.test.ts`
- **Done when:** all 6 pass, and no existing codec or devtools test changes its
  expectation.

### T5 — Fix what the subject-set docs and tests claim, and pin `concurrency` (I3)
- **Status:** [x] done
- **Depends on:** T0 (no decision; valid under every D-29-e/f option)
- **Files:** `apps/website/src/content/docs/docs/concepts/subject-sets.md`
  (`:89-108`); `packages/core/test/SubjectSet.test.ts` (`:588`, plus a new test);
  `spec/behaviors/14-subject-sets.md` (BEH-QD-105 `:71-75`, BEH-QD-108);
  `packages/core/src/SubjectSet.ts` (doc comment `:101-104` only)
- **Steps:**
  1. Red first: in the website fence, annotate both bindings with the types the
     comments claim, for example
     `const reviewed: Effect.Effect<ReadonlyArray<SubjectDecision>, EvaluationError, SubjectSetServices> = decideSubjects(…)`.
     Add the needed type imports and `import type * as Effect from "effect/Effect"`.
     Run `node scripts/check-website-doc-examples.mjs`: it fails with TS2322.
  2. Change the annotations to `SubjectSetOutcome, never` and
     `FilteredSubjects, never`, and the `// →` comments to
     `{ decisions: [alice: Allow, bob: Deny, carol: Allow], failures: [] }` and
     `{ subjects: [alice, carol], failures: [] }`. The gate goes green, and the
     compiler now checks the signatures.
  3. Rename the test at `SubjectSet.test.ts:588` to "a mid-stream failure ends the
     stream: the elements after it are never evaluated". Drop "names the element
     that broke", or, under D-29-e = B, T6 makes that claim true.
  4. Add `it.effect("concurrency applies within each subject's composite, never across subjects")`.
     It uses the `slow` resolver pattern at `:428-452` with
     `P.allOf([hasAttribute("x", …), hasAttribute("y", …)])`, two subjects and
     `{ concurrency: "unbounded" }`, and asserts the log is
     `["start:a.x","start:a.y","end:a.x","end:a.y","start:b.x","start:b.y","end:b.x","end:b.y"]`.
  5. In BEH-QD-105's revised note, replace "a stream consumed incrementally has no
     'batch' left to discard" with what happens: the stream stops at the first
     failing element, the elements after it are never evaluated, and the consumer
     cannot tell which subject broke. Under D-29-e = B, T6 rewrites this again.
  6. Under BEH-QD-108, add: "`EvaluateOptions.concurrency` MUST apply to each
     element's own evaluation and MUST NOT evaluate elements concurrently." Repeat
     it in `SubjectSet.ts:101-104`.
- **Tests:** 1 new pin test, 1 retitled test, and the doc fence now type-annotated
- **Verify:** `pnpm vitest run packages/core/test/SubjectSet.test.ts`;
  `node scripts/check-website-doc-examples.mjs`;
  `bash spec/scripts/verify-traceability.sh --strict`
- **Done when:** step 1's failure was observed and then fixed, the pin test passes,
  and the grep in success criterion 5 is empty.

### T6 — Per-element outcomes for the streamed review, through one step (I3)
- **Status:** [x] done
- **Depends on:** T5; D-29-e (= B; under A, drop this task)
- **Files:** `packages/core/src/SubjectSet.ts`;
  `packages/core/test/SubjectSet.test.ts`;
  `features/features/subject-sets/subject-sets.feature` and its step definitions
- **Steps:**
  1. Red first: add a test, "a mid-stream failure is reported as that subject's
     outcome and the stream continues". It uses
     `scriptedPort(attributeResolverPort, id => id === "b" ? PortReply.fail("down") : PortReply.answer(9))`
     over `[a, b, c]`, collects with `Stream.runCollect`, and asserts tags
     `["SubjectDecided","SubjectFailed","SubjectDecided"]`, that `b`'s `subject.id` is
     `"b"`, and that `calls.length === 3`. It does not compile today. Commit it
     together with step 2.
  2. Add `SubjectOutcome` as a `Data.TaggedEnum` with
     `SubjectDecided { subject, decision }` and `SubjectFailed { subject, error }`.
     Add `SubjectAllowed { subject }` and
     `FilteredSubjectOutcome = SubjectAllowed | SubjectFailed`.
  3. Add `export const decideSubject = Effect.fn("qadi.decideSubject")(function* (policy, subject, options) { … })`.
     It does what `provideService(evaluate(…), CurrentSubject, subject)` does now,
     maps the result to `SubjectDecided`, and maps any `EvaluationError` to
     `SubjectFailed`. Its error channel is `never`.
  4. `decideSubjectsStream` becomes
     `subjects.pipe(Stream.mapEffect(s => decideSubject(policy, s, options)), Stream.withSpan(…))`,
     with type `Stream<SubjectOutcome, E2, SubjectSetServices | R2>`.
  5. `filterSubjectsStream` becomes `decideSubjectsStream(…)` piped through
     `Stream.filterMap`, using a module-scope
     `Match.type<SubjectOutcome>().pipe(Match.tagsExhaustive({ SubjectDecided: o => isAllowed(o.decision) ? Option.some(SubjectAllowed({subject: o.subject})) : Option.none(), SubjectFailed: Option.some }))`.
  6. `decideSubjects` becomes `Effect.forEach(subjects, s => decideSubject(…))` (which
     is sequential), followed by a split into `decisions` (from `SubjectDecided`) and
     `failures` (from `SubjectFailed`). The public `SubjectSetOutcome`,
     `SubjectDecision` and `SubjectEvaluationFailure` are unchanged, and so is
     `filterSubjects`. This removes the second copy of the per-subject error
     mapping (`:121-124` vs `:203-204`).
  7. Update the existing stream tests (`:498-621`): the "fails the stream" tests
     become "reported per element". The "mid-stream" test from T5 is replaced by
     step 1's test (replace, don't layer). Keep the span test.
  8. Add one BDD scenario, tagged `@REQ-QD-014`: "a streamed review continues past
     a broken lookup".
- **Tests:** 1 red-first test, about 6 stream tests rewritten, and 1 BDD scenario.
  The array-form tests (`:36-496`) must pass **unchanged**; that proves step 6 kept
  the array contract.
- **Verify:** `pnpm vitest run packages/core/test/SubjectSet.test.ts`;
  `pnpm --filter @qadi/features test`; `pnpm tsc -b packages/core`;
  `node scripts/check-house-style.mjs`; `pnpm circular`
- **Done when:** step 1 passes, the array tests are untouched and green,
  `grep -n "Stream.mapEffect" packages/core/src/SubjectSet.ts` finds exactly one call
  and it goes through `decideSubject`, and the house-style gate passes.

### T7 — Make the open subpath fail a gate, test-first (I4)
- **Status:** [x] done
- **Depends on:** T0; D-29-g; D-29-h
- **Files:** `scripts/check-api-surface.mjs`; `scripts/check-package-install.mjs`
- **Steps (assuming D-29-g = A and D-29-h = C):**
  1. In gate 13, add a fourth check, `ENTRY`. For each public package, every
     `exports` key is `.` or appears in `spec/overview.md`'s new "Entry points" table,
     and no key contains `*`. Run `node scripts/check-api-surface.mjs`: it fails
     with 7 `ENTRY` errors, one per `./*`. That is the red.
  2. Replace `collectSourceTargets`'s wildcard expansion (`:203-213`) with the
     refusal from step 1. Keep the doc comment's CCR-QD-102 history as one sentence.
  3. In gate 14, add check 3b. For each installed package, write `probe-subpaths.mjs`
     that `await import()`s every key the packed `exports` map declares (each must
     succeed), and every `lib/<M>.js` whose `src/<M>.ts` is neither barreled nor
     declared (each must reject with `code === "ERR_PACKAGE_PATH_NOT_EXPORTED"`). The
     barrel membership comes from the same `BARREL` regex gate 13 uses. Run it: it
     fails for `@qadi/core/TreeFold` and the 7 other modules (red).
  4. Add the "Entry points" table to `spec/overview.md`. It holds a single row,
     `@qadi/devtools/react` (the React dock; ADR-QD-053), with that reason.
- **Tests:** the gates are the tests. Record both red outputs in the PR body.
- **Verify:** `node scripts/check-api-surface.mjs` (red until T8);
  `node scripts/check-package-install.mjs` (red until T8)
- **Done when:** both gates fail on `main`'s manifests for exactly the expected
  reasons.

### T8 — Close the entry points (I4)
- **Status:** [x] done
- **Depends on:** T7
- **Files:** `packages/{core,audit,http,testing,promise,predicate-sql,predicate-prisma}/package.json`;
  `spec/overview.md` (`:804-811`); `packages/core/src/{TreeFold,Compare,Decision}.ts`
  (comments); `packages/audit/src/CircuitBreaker.ts` (`:40-41`, comment);
  `spec/behaviors/04-matchers.md:318`
- **Steps:**
  1. In each of the 7 manifests, delete the `"./*"` block and leave `"."` only.
  2. Gate 13 STALE now fails on the 8 "Not listed above" rows (`overview.md:804-811`),
     because their names are no longer exports. Delete those rows. Delete the
     `isFieldStrategy`/`isCombining` mentions only if they are in the deleted rows
     (they are, `:808-809`).
  3. Rewrite the reachability sentences:
     - `TreeFold.ts:28`: "package-private: not exported from any entry point";
     - `Compare.ts:26` and `CircuitBreaker.ts:40-41`: the same;
     - `Decision.ts:205`: drop "and `@qadi/core/Decision`";
     - `04-matchers.md:318`: drop "`@qadi/core/Compare`".
  4. `pnpm build`, then run both gates; both are green.
  5. Check the website and examples once more:
     `git grep -nE "@qadi/[a-z-]+/[A-Za-z]" -- apps examples features packages ':!**/CHANGELOG.md'`
     must find only `@qadi/devtools/react` imports and comments.
- **Tests:** gates 13 and 14
- **Verify:** `pnpm build && node scripts/check-api-surface.mjs && node scripts/check-package-install.mjs`;
  `pnpm --filter @qadi/example-nextjs check` (gate 15, because the example imports
  roots only and this is the proof)
- **Done when:** gates 13, 14 and 15 are green, and no manifest has a `*` key.

### T9 — State the rule: out of the barrel means not reachable (I4)
- **Status:** [x] done
- **Depends on:** T8
- **Files:** `AGENTS.md` (§9, :540-546; §3's "internal" wording);
  `spec/decisions/NNN-entry-points-are-a-closed-list.md` (*new*, ADR-QD-NEXT);
  `spec/decisions/index.yaml`; `spec/decisions/090-*.md` (`:57`, `:186-187`);
  `spec/decisions/091-*.md` (`:51`); `spec/decisions/033-*.md` (gate 14 check 3b
  row in its table at `:67-68`)
- **Steps:**
  1. Rewrite AGENTS.md §9. Shared scaffolding stays out of the barrel, and because
     each package's `exports` map is a closed list (gate 13 `ENTRY`, gate 14
     check 3b), out of the barrel means not importable. The only non-root entry
     point is `@qadi/devtools/react`. Adding one is an edit to overview's "Entry
     points" table with a reason.
  2. ADR-QD-NEXT records the context (C4.4's contradiction), the decision (D-29-g/h),
     the rejected alternatives (B/C/D with their reasons from §5) and the
     consequences. The consequences are the external break, plus ARCH-22 and ARCH-26
     inheriting real privacy.
  3. Amend ADR-QD-090: "reachable only as the `@qadi/core/TreeFold` subpath" becomes
     "not reachable from outside `@qadi/core` (ADR-QD-NEXT)". The devtools-twin
     rationale at `:186` still holds, now for a stronger reason. Amend ADR-QD-091 the
     same way, and ADR-QD-033 with check 3b.
- **Tests:** none (documentation)
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict`;
  `node scripts/check-dod-table.mjs`. Gate 11: a "gate N" mention must name its
  command, which is why this plan names scripts everywhere.
- **Done when:** both scripts pass, and
  `grep -rn "reachable only\|reachable as \`@qadi" spec/decisions AGENTS.md packages/*/src`
  finds only history blocks.

### T10 — Spec, traceability, CCR and changesets, one block per item
- **Status:** [x] done
- **Depends on:** the item's code tasks (10a: T1; 10b: T3, T4; 10c: T5, T6; 10d: T9)
- **Files:** `spec/README.md` (CCR table); `spec/traceability.md`;
  `spec/invariants.md`; `spec/overview.md`; `spec/behaviors/33-audit-pipeline.md`;
  `spec/behaviors/14-subject-sets.md`; `spec/decisions/022-*.md`, `056-*.md`, `095-*.md`;
  `apps/website/src/content/docs/docs/packages/audit/capabilities.md` (`:65`, `:78`);
  `packages/audit/README.md` (`:78-88`); `.changeset/*.md` (*new*, one per item)
- **Steps:**
  - **10a (I1).** Bump BEH doc 33's revision. Add a `CCR-QD-NEXT` row. Add one
    sentence at `capabilities.md:78` ("unsequenced entries follow, in the order
    given"). No changeset is needed: there is no behaviour change. If the repo's
    convention wants an empty changeset, run `pnpm changeset --empty`.
  - **10b (I2).** BEH-QD-253 gains the requirements "an entry is purgeable only if
    its `at` and `now` are finite, `maxAgeMs ≥ 0`, and `now − at > maxAgeMs`" and
    "`planRetention` refuses a non-finite `now` or a `maxAgeMs` that is `NaN` or
    negative". Add a new INV-QD-NEXT, "Retention never selects a row without a finite
    age past a valid limit", with Source `Retention.ts` and Enforcement being the
    extended property. INV-QD-053's Enforcement names the widened generators.
    BEH-QD-312 gets "a non-finite `at` or a non-integer `sequenceNumber` is
    `Malformed`". Amend ADR-QD-056 (one paragraph, revision 1.8) and ADR-QD-095 (one
    paragraph). Overview rows for `planRetention`, `RetentionPlan` and
    `RetentionInputInvalid` (gate 13). Update the traceability rows for
    `Retention.test.ts`/`AuditEntry.test.ts`/`SinkCodec.test.ts`. Update the website
    `capabilities.md:65` and the audit README. Add a changeset:
    `"@qadi/audit": minor, "@qadi/core": patch`, describing a decode tightening of
    values no encoder emits, and the new export.
  - **10c (I3).** Already covered for BEH-QD-105/108 in T5. Under B: amend ADR-QD-022
    in place, as its amendment blocks at `:52-62` already do. Update overview row
    `:158` and add rows for `SubjectOutcome`, `SubjectDecided`, `SubjectFailed`,
    `SubjectAllowed` and `decideSubject`. Update the website `subject-sets.md:110-115`
    stream paragraph. Changeset: `"@qadi/core": minor`, **Breaking** for the
    streamed siblings' element types.
  - **10d (I4).** Add a `CCR-QD-NEXT` row, the ADR-QD-NEXT index entry, and a
    changeset `minor` for all 7 packages (the fixed group bumps together). Mark it
    **Breaking, for subpath importers only**, with the migration "import the same
    names from the package root; the unbarreled modules have no replacement".
  - For each block: CCR numbers and ADR numbers are assigned at merge, not in this
    plan.
- **Tests:** none
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict`;
  `node scripts/check-api-surface.mjs`; `node scripts/check-doc-examples.mjs`;
  `node scripts/check-website-doc-examples.mjs`; `node scripts/check-dod-table.mjs`
- **Done when:** all five scripts pass on the item's branch.

### T11 — Full gate, per item branch
- **Status:** [-] dropped for this branch: the orchestrator runs `pnpm check` once at the end (wave-3 brief); targeted gates were run per commit
- **Depends on:** the item's T10 block
- **Files:** none
- **Steps:**
  1. Confirm with the orchestrator that no sibling agent is running mutation or
     coverage.
  2. Run `pnpm check` on the item's branch.
  3. On failure, fix within the item's own tasks. A mutation survivor in
     `Retention.ts`'s guards (gate 20, `stryker run stryker.audit.mjs`) or in
     `SubjectSet.ts` (gate 16, `stryker run`) gets a killing test, not an
     `ignoreStatic` exclusion.
- **Tests:** the whole suite
- **Verify:** `pnpm check`
- **Done when:** `pnpm check` exits 0 on that branch.

### T12 — Update the tracker
- **Status:** [x] done
- **Depends on:** T11 for each item that lands
- **Files:** this plan's frontmatter and §10; `.planning/architecture/README.md`
  (the orchestrator's file: hand it the row, do not edit it from a planning agent)
- **Steps:**
  1. Tick the tasks.
  2. Record each D-29-x outcome as `status: decided (<date>, <choice>)`.
  3. Set `status:` to `in-progress`, and to `done` once all four items have landed
     or have been dropped. An item dropped by decision (for example D-29-e = A makes
     T6 unnecessary) is `[-] dropped`, with a reason.
  4. Add a §10 row per change. Hand the orchestrator the tracker-row text
     (`ARCH-29 | loose ends | n/a | <status> | <done>/13 | <open> (D-29-a…h) | L`)
     and the defects table rows for I2 (T2) and I3 (T5).
- **Tests:** none
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-29-*.md | sort | uniq -c`
- **Done when:** the frontmatter, the tasks and §10 agree.

## 7. Test strategy

- **I1.** The existing `AuditArchive.test.ts` tests all survive. Two are added (T1),
  and they kill the `?? +∞` → `?? -∞` and comparator-swap mutants that survive today.
- **I2 (replace, don't layer).** The three boundary examples in `Retention.test.ts`
  stay, and they now exercise `planRetention` through its projections. The partition
  property is **widened** (non-finite and negative draws) rather than duplicated, and
  gains the "purged ⇒ provable age" conjunct, which is the property form of the new
  invariant. `partitionByRetention` disappears, so no test targets it. The codec
  tests gain red-first refusals; INV-QD-096's round-trip property is untouched and
  must stay green, which proves the encoder never emitted what decode now refuses.
- **I3.** The array-form tests (`SubjectSet.test.ts:36-496`) are the regression
  oracle for T6 and must not change. The stream tests are **rewritten**, not added
  to: "fails the stream" becomes "reported per element", and the old mid-stream test
  is replaced by T6's. One concurrency pin test is added. The website fence becomes
  a compiled type assertion, so gate 23 now covers what comments used to claim.
- **I4.** The tests are the gates themselves (13: `ENTRY`; 14: check 3b), each shown
  red on `main` before the manifests change. ADR-QD-033 asks for the deliberate-break
  check, so T7's PR body records the break that check 3b catches: re-adding `./*` to
  one manifest.
- **Mutation.** Gate 20 (audit) and gate 16 (core) cover the changed modules. Every
  new branch, including `!Number.isFinite(at)`, `maxAgeMs >= 0` and each
  `Match.tagsExhaustive` arm, must have a killing test before T11.

## 8. Spec and documentation updates

| Item | Normative | Docs | Gate(s) touched |
| ---- | --------- | ---- | --------------- |
| I1 | BEH-QD-254 requirement (T1) | `capabilities.md:78` | 10 (`verify-traceability.sh`) |
| I2 | BEH-QD-253, BEH-QD-312, INV-QD-053 Enforcement, INV-QD-NEXT, ADR-QD-056 1.8, ADR-QD-095 amendment | audit README, `capabilities.md:65`, overview rows | 13 (`check-api-surface.mjs`), 10 |
| I3 | BEH-QD-105 note, BEH-QD-108 requirement, (B) ADR-QD-022 amendment | website `subject-sets.md:89-115`, overview `:158` + new rows | 23 (`check-website-doc-examples.mjs`), 13, 8 (BDD) |
| I4 | ADR-QD-NEXT, ADR-QD-090/091/033 amendments, AGENTS.md §9 | overview "Entry points" table, `:804-811` rows removed, module comments | 13, 14 (`check-package-install.mjs`), 11 (`check-dod-table.mjs`) |

There is one `CCR-QD-NEXT` row per item, numbered at merge. CHANGELOG entries come
from the changesets in T10, and nobody runs a version or publish step.

## 9. Risks and rollback

- **I4 breaks an unknown external subpath importer.** The likely candidates are the
  documented ones, `@qadi/audit/CircuitBreaker` and `@qadi/core/TreeFold`. It shows up
  as `ERR_PACKAGE_PATH_NOT_EXPORTED` in the consumer's build, and the changeset's
  migration note covers it. **Rollback** is to re-add `"./*"` to the affected
  manifests and revert gate 13's `ENTRY` check. To restore one module only, add a
  named key and an "Entry points" row (that is D-29-g = B).
- **I4 vs a Bun consumer.** The `bun` condition pointed `./*` at `src/*.ts`. A Bun
  user importing `@qadi/core/Policy` loses it in the same way, and the same migration
  applies.
- **D-29-d refuses a row someone already stored.** Only rows written by something
  other than `encodeAuditEntry`/`encodeSinkRecord` can hold `1e400` or a fractional
  `sequenceNumber`, so such a row was never a valid v2 record. The risk is a
  hand-rolled writer. **Rollback**: revert `Schema.Finite`/`Schema.Int`. Retention's
  guard (T3) keeps deletion safe on its own.
- **D-29-e = B changes the stream element types.** Every
  `Stream.runCollect(decideSubjectsStream(…))` consumer must handle `SubjectFailed`.
  This is intended (the failure was invisible before), but it is breaking.
  **Rollback**: revert T6 only. T5 stands alone.
- **Silent purge-nothing (D-29-c = A or B's projections) hides a misconfigured
  job.** It is mitigated by `planRetention` returning the refusal. The changeset and
  README tell callers to prefer `planRetention`.
- **Cross-plan coupling.**
  - ARCH-22 decides whether core exports `foldTrace`. Under D-29-g = A, an
    unbarreled `foldTrace` is unreachable from devtools, so ARCH-22 must either
    barrel it (an AGENTS.md §9 exception argued in that plan) or keep devtools'
    twin.
  - ARCH-26's pure short-circuit stepper lives in `ShortCircuit.ts`. Under A its
    interface becomes truly private, so ARCH-26 needs no CHANGELOG "Breaking" note
    for reshaping it. Under C it would.
  - ARCH-25 and T4 both edit `SinkCodec.ts`, so whichever lands second rebases.
  - Recommended order: land I4 (or at least decide D-29-g) before ARCH-22's and
    ARCH-26's public-surface decisions.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written | planner |
| 2026-10-07 | T0, T1 | D-29-a = A; two archive-order tests, BEH-QD-254, CCR-QD-185 (c44046d). T0 re-baselined in place on `arch/wave3` (no per-item branches, per the wave-3 brief); probes not re-run, the red/green tests were observed instead | implementer |
| 2026-10-07 | T2, T3, T4, T10b | Red observed (4 destructive examples + widened property; 4 codec/entry cases), then green. `planRetention`, `RetentionPlan`, `RetentionInputInvalid`; `Schema.Finite`/`Schema.Int`; INV-QD-101, CCR-QD-186 (7da2bcb). Deviation: INV-QD-NEXT is INV-QD-101 | implementer |
| 2026-10-07 | T5 (website part) | Fence annotated; swapping an annotation back to the old signature fails gate 23 with TS errors (2c7c82f) | implementer |
| 2026-10-07 | T5, T6, T10c | D-29-e = B. `decideSubject`, `SubjectOutcome`, `FilteredSubjectOutcome` (`Data.taggedEnum`s, not separate exported `SubjectDecided`/`SubjectFailed` types; `FilteredSubjectOutcome` carries its own `SubjectAllowed`/`SubjectFailed`); `Stream.filterMap` takes a `Filter`, so `Filter.fromPredicateOption`. BDD step `runSubjectSetStream`. CCR-QD-187 (6627fa6) | implementer |
| 2026-10-07 | T7, T8, T9, T10d | D-29-g = A, D-29-h = C. Red shown on the unchanged manifests (gate 13: stale rows; gate 14: 7 wildcards and every `lib/` module importable), then green; `pnpm example` (gate 15) green. Check 3b refuses every packed `lib/` module that is not a declared subpath, barreled or not. ADR-QD-099, CCR-QD-188 (d913a45) | implementer |
| 2026-10-07 | T11 | not run per branch; left to the orchestrator's single `pnpm check` | implementer |
| 2026-10-07 | T12 | tracker updated; status done | implementer |
