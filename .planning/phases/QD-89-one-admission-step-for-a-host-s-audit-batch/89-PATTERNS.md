# Phase 89: One admission step for a host's audit batch - Pattern Map

**Mapped:** 2026-11-26
**Files analyzed:** 32 (6 source/test-support, 6 test, 4 scripts + 2 records, 12 spec/changeset, plan shape)
**Analogs found:** 32 / 32 (all analog paths verified git-tracked; no `.gsd` mirror paths)

Decided autonomously where the task left a choice: the Phase 88 directory is the script and plan analog, `AuditEntry.characterisation.test.ts` (audit) is the characterisation-file analog, and ADR-QD-201 is the ADR layout analog (ADR-QD-200 shares it).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/audit/src/HostBatch.ts` (new) | utility (admission step, plain `Result`) | transform / request-response | `packages/core/src/Admission.ts` + `AuditEntry.ts:94-105` + `CodecMade.ts:44-71` | role-match (composite) |
| `packages/audit/src/AuditArchive.ts` (edit) | service (writer) | request-response | itself, `archiveAuditTrail` 179-208; `snapshotKeyMaterial` 72-93 | exact |
| `packages/audit/src/ArchiveFacts.ts` (edit) | service (facts + verify) | transform | itself, 125-210 | exact |
| `packages/audit/src/Retention.ts` (edit) | service (plans) | transform | itself, 49-57, 96-123, 165-197 | exact |
| `packages/audit/test/HostBatch.test.ts` | test | request-response | `ForeignRows.test.ts` helpers 29-70; `ArchiveFacts.test.ts` fast-check | role-match |
| `packages/audit/test/HostBatch.tst.ts` | type test | n/a | `AuditEntry.tst.ts`, `Retention.tst.ts` | exact |
| `packages/audit/test/AdmissionOrder.characterisation.test.ts` | test | request-response | `packages/audit/test/AuditEntry.characterisation.test.ts` | exact |
| `packages/audit/test/hostBatchFaults.ts` | test helper | transform | `ForeignRows.test.ts` 29-70 (`fromStore`, `handedOver`, `host`) | role-match |
| `packages/audit/test/ForeignRows.test.ts`, `Retention.test.ts` (declared edits) | test | request-response | themselves | exact |
| `89-check.mjs`, `89-pinned-check.mjs`, `89-mutation.mjs`, `89-earlier-checks.mjs` | phase script | batch | `.planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-*.mjs` | exact |
| `89-mutation-base.json` | record | file-I/O | `88-mutation-base.json` | exact |
| `spec/decisions/202-…md` | ADR | doc | `spec/decisions/201-…md`, `200-…md` | exact |
| ADR-190, ADR-110 amendments | ADR amendment | doc | ADR-197 line 93 (dated bold note) + `spec-revise.mjs` | exact |
| `spec/behaviors/33-audit-pipeline.md` BEH-781..785 | spec | doc | BEH-QD-722 (1208) and `28-devtools-screens.md` BEH-QD-780 (4567) | exact |
| `spec/invariants.md` INV-423/424 | spec | doc | INV-QD-421/422 (4900+) | exact |
| `spec/traceability.md`, `decisions/index.yaml`, `spec/README.md` | spec index | doc | CCR-QD-480 row / ADR-QD-201 rows | exact |
| `.changeset/audit-batch-admitted-once.md` | changeset | doc | `.changeset/audit-entry-decoded-once.md` | exact |
| `89-*-PLAN.md` | plan | doc | `88-01-PLAN.md` ... `88-10-PLAN.md` | exact |

## Pattern Assignments

### `packages/audit/src/HostBatch.ts` (utility, transform)

Three analogs, one per concern. The spiked full body is in `89-RESEARCH.md` lines 360-427 (compiled, d.ts-clean, madge-clean); copy it. The real-code idioms it follows:

**Nominal brand** (`packages/audit/src/AuditEntry.ts:94-105`):
```ts
class AuditEntry extends Data.Class<{ ... }> {
  /** Makes the type nominal ... Declared only: it has no slot at run time. */
  declare private readonly nominal: never;
}
export type { AuditEntry };
```
For `AdmittedRows`: a plain class (no `Data.Class`) with `declare private readonly nominal: never;`, one `readonly entries` field, `export type { AdmittedRows }` only. Only `admitRows` calls `new AdmittedRows(...)`.

**Fragment + constructors beside the check** (`packages/audit/src/CodecMade.ts:44-71`):
```ts
export type RowsRefusalCases = {
  readonly EntriesNotAList: { readonly value: unknown };
  readonly EntryNotMadeByCodec: { readonly index: number };
};
type RowsRefusal = Data.TaggedEnum<RowsRefusalCases>;
const { EntriesNotAList, EntryNotMadeByCodec } = Data.taggedEnum<RowsRefusal>();
export const rowsRefusal = (entries: unknown): RowsRefusal | undefined => { ... };
```
`NowRefusalCases` copies this shape exactly (`export type NowRefusalCases = { readonly NowNotFinite: { readonly value: unknown } }`, a private `NowRefusal`, `const { NowNotFinite } = Data.taggedEnum<NowRefusal>()`). `CodecMade.ts` stays byte-identical. The doc-comment shape is the `RowsRefusalCases` one: one-line summary, then the ADR-QD-190/202 why.

**Admission as a package-private plain `Result` function** (`packages/core/src/Admission.ts`): imports `* as Result from "effect/Result"`, returns `Result.fail(...)`/`Result.succeed(...)`, header comment says "Package-private, out of the barrel (ADR-QD-099)". `HostBatch.ts` imports exactly: `effect/Data`, `effect/Predicate`, `effect/Result`, `import type { AuditEntry } from "./AuditEntry.ts"`, `import { rowsRefusal } from "./CodecMade.ts"`, `import type { RowsRefusalCases } from "./CodecMade.ts"`. No `Effect.` token, no `let`/`var`, no `switch`, no `as`/`!`.

**Order (copy verbatim from the spike)**: `Number.isFinite(batch.now)` -> `batch.terms()` once -> `admitRows(batch.entries)`. `admitRows(entries: ReadonlyArray<AuditEntry>)` keeps `Array.isArray(entries) ? takeRows(entries) : entries`, `takeRows = (list) => Array.from({ length: list.length }, (_, index) => list[index])`, then `rowsRefusal(taken)`, then `new AdmittedRows(taken.filter(Predicate.isNotUndefined))` (addendum D-07a, D-12a).

---

### `packages/audit/src/AuditArchive.ts` (edit)

Keep `snapshotKeyMaterial` (72-93, no change; it is the writer's `terms`). Replace the first statements of `archiveAuditTrail` (`Effect.fn("qadi.audit.archiveAuditTrail")`, 179; `now` check at 184-187; `snapshotKeyMaterial` at 190-194; `verifiedArchiveFacts(entries)` at 195) with the call-site block in `89-RESEARCH.md` 465-479:
```ts
const admitted = admitBatch({ now, terms: () => snapshotKeyMaterial(options?.keyMaterial), entries });
if (Result.isFailure(admitted)) {
  return yield* Effect.fail(new ArchiveInputInvalid({ refusal: admitted.failure }));
}
const { now: createdAt, terms: keyMaterial, rows } = admitted.success;
const facts = yield* verifiedArchiveFacts(rows);
```
Add `import { admitBatch } from "./HostBatch.ts";`; drop the local `ArchiveInputRefusal.NowNotFinite` use and any `Number.isFinite`. The reader (`archiveFacts(entries)` at 386) is untouched. Update the doc comments at 139-149 to say "the step admits the batch" and name `HostBatch.ts`, without restating the order. Existing import idiom: relative `.ts` extension, `import type` for types, `import * as Result from "effect/Result"` (add if absent).

### `packages/audit/src/ArchiveFacts.ts` (edit)

- Enum (139-148) becomes `Data.TaggedEnum<RowsRefusalCases & NowRefusalCases & { KeyMaterialNotAList: ...; KeyMaterialItemRefused: ... }>`; `export const ArchiveInputRefusal = Data.taggedEnum<ArchiveInputRefusal>()` is unchanged. The key `NowNotFinite:` is deleted from this file.
- Imports: drop `import { rowsRefusal } from "./CodecMade.ts"` (line 30); keep `import type { RowsRefusalCases } from "./CodecMade.ts"`; add `import { admitRows } from "./HostBatch.ts"` (VALUE import, addendum D-06a) and `import type { AdmittedRows, NowRefusalCases } from "./HostBatch.ts"`.
- `verifiedArchiveFacts` (177-189): parameter `rows: AdmittedRows`; delete the `rowsRefusal` block (180-183); `archiveFacts(rows.entries)`; its one failure is `SequenceIntegrityError`; keep `Effect.fn("qadi.audit.verifySequenceIntegrity")`.
- `verifySequenceIntegrity` (208-210, unnamed `Effect.fn`): body from `89-RESEARCH.md` 455-461 (`admitRows` first statement, `Effect.fail(new ArchiveInputInvalid({ refusal: rows.failure }))`, then `yield* verifiedArchiveFacts(rows.success)`).
- Doc comments at 20-25 and 167-176 restate "admitted by `HostBatch.ts`", not the order.

### `packages/audit/src/Retention.ts` (edit)

Enum (49-57) -> `Data.TaggedEnum<RowsRefusalCases & NowRefusalCases & { MaxAgeInvalid: { readonly value: unknown } }>`; drop `rowsRefusal` import (28). Add `maxAgeOf`, module-private `ageRule(batch: AdmittedBatch<number>)` over `batch.rows.entries`, and both plans' first statement `admitBatch({ now, terms: () => maxAgeOf(policy), entries })`, wrapped once with `Result.fail(new RetentionInputInvalid({ refusal: admitted.failure }))` (code at `89-RESEARCH.md` 482-517). `planPurge` (165-197) no longer calls `planRetention` (171) nor iterates raw `entries` (177); it admits itself, runs `ageRule`, then the archive pass over `admitted.success.rows.entries`. `maxAgeMs >= 0` keeps NaN refused and `+Infinity`/`-0` valid. Lint check noted in RESEARCH 519 (`policy?.maxAgeMs`; fall back to `Predicate.isObject(policy) ? policy.maxAgeMs : undefined`).

---

### `packages/audit/test/HostBatch.test.ts` (test, request-response)

**Analog:** `packages/audit/test/ForeignRows.test.ts:1-70` for helpers (copy, do not import across tests unless in `hostBatchFaults.ts`):
```ts
import { assert, describe, it } from "@effect/vitest";
const codecRow = (evaluationId: string): AuditEntry =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId })));
const fromStore = (rows: ReadonlyArray<unknown>): ReadonlyArray<AuditEntry> =>
  JSON.parse(JSON.stringify(rows));
const handedOver = <T>(value: unknown): T => {
  const box: object = { value };
  return Reflect.get(box, "value");
};
const host = (value: unknown): ReadonlyArray<AuditEntry> => handedOver(value);
```
No `as` anywhere in a test (`no-type-assertion`). Property row: `FastCheck.assert(FastCheck.property(...))` as in `ArchiveFacts.test.ts:139-145` (`import * as FastCheck from "fast-check"`; arbitraries like `FastCheck.array(FastCheck.option(FastCheck.integer({ min: 0, max: 8 }), { nil: undefined }), ...)`). Titles name properties only (no D-numbers, ids, phase numbers). Must be seen RED (module not found) before `HostBatch.ts` exists; record it in `89-RED-EVIDENCE.md`.

### `packages/audit/test/HostBatch.tst.ts` (type test)

**Analogs:** `AuditEntry.tst.ts:1-25` (header comment shape, `import { expect, test } from "tstyche"`, `import type` of `../src/*.ts` modules, `declare const` subjects) and `Retention.tst.ts:1-24` (`test("...", () => { expect(...) })`). Positive pins and `not.toBeAssignableTo` only (no `not.toBeCallableWith`/`toBeConstructableWith`, so `NOT_CALLABLE_PIN_BUDGET` is untouched). Import `NowRefusalCases`, `AdmittedRows` types from `../src/HostBatch.ts` and `RowsRefusalCases` from `../src/CodecMade.ts`. Pins per addendum D-17a: spelled-out member sets `toBe`; `Data.TaggedEnum<RowsRefusalCases & NowRefusalCases & {own}>` `toBe`; shared `Extract<..., {_tag:"NowNotFinite"}>` one type; `ReadonlyArray<AuditEntry>` and `{ entries }` and a structurally identical `OtherAdmittedRows` (declared in the test, a second nominal-less twin class) `not.toBeAssignableTo<AdmittedRows>`; `Parameters<typeof verifiedArchiveFacts>[0]` `toBe` `AdmittedRows`. Drop the `readonly` claim.

### `packages/audit/test/AdmissionOrder.characterisation.test.ts` (test)

**Analog:** `packages/audit/test/AuditEntry.characterisation.test.ts` (header: what it pins and why a table; `assert, describe, it` from `@effect/vitest`; helpers `decisionRecord, numbered` from `./helpers.ts`; a table of input and exact refusal so a change edits exactly its row). Elsewhere in repo: `packages/devtools/test/model/StatedRun.characterisation.test.ts`. Writer/plan tables are the literal ones in `89-RESEARCH.md` 634-661 (12 writer pairs, 8 plan pairs, verify 1, direct 1; impossible pairs named). Span reader, copy from `AuditArchive.test.ts:41-77`:
```ts
const names: Array<string> = [];
const tracer = Layer.succeed(Tracer.Tracer, Tracer.make({
  span: (options) => { names.push(options.name); return new Tracer.NativeSpan(options); },
}));
yield* archiveAuditTrail([entry], 0).pipe(Effect.provide(tracer));
assert.deepStrictEqual(names, ["qadi.audit.verifySequenceIntegrity"]);
```
Plans run under the collector inside `Effect.sync` (expect `[]`). Laziness: a counting getter on `options.keyMaterial` and a counting `Proxy` over `[...rows]` passed through `host(...)`. Committed green on the base; two declared regions (the two span flips, the `verifiedArchiveFacts`-direct rows) flip in later commits. Defect probes A and B (RESEARCH 548-584) are the RED rows of D-18a, in a separate commit before the change.

### `packages/audit/test/hostBatchFaults.ts` (helper)

Plain `.ts` module (like `test/helpers.ts`, `driveExit.ts`, `observeLeaf.ts`, which exist beside the tests and are held out of vitest's `*.test.ts` glob). Exports the fault table (now, key material, `maxAgeMs`, rows-not-a-list, row item) and builders reusing `codecRow`, `fromStore`, `host`. The new `describe` in `ForeignRows.test.ts` runs the table through each entry point and through `admitBatch`/`admitRows`, asserting equal refusals (`assert.deepStrictEqual({ ...error }, { _tag: "ArchiveInputInvalid", refusal })` as in `archiveInvalid`, `ForeignRows.test.ts:72-74`).

### Declared edits to existing tests

- `ForeignRows.test.ts`: remove the five `it`s at 111 ("a non-finite now is refused before the rows are read"), 156, 231, 359, 365 (RESEARCH 779-783 has titles and holders); add the one `describe` with one case per entry point; hold 115-121 and 222-229 byte for byte.
- `Retention.test.ts:139-141` ("checks now before maxAgeMs") removed; `HostBatch.test.ts` order table holds it.
- `ADR-QD-202` audit table states "Tests removed: 6" (addendum D-25).

---

## Phase scripts (analog: `.planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-*.mjs`)

Copy each, rename `88-` to `89-`, keep `--self-test`, keep "The script never edits an archived check's path constants". Exact changes:

### `89-check.mjs` (from `88-check.mjs`, 1602 lines)

| 88 line | 88 text | 89 value |
|---|---|---|
| 46-47 | `EVIDENCE = ${D}88-RED-EVIDENCE.md`, `BASE_RECORD = ${D}88-mutation-base.json` | `89-` forms |
| 49 | `TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` | The phase brief and the repo reminder disagree: D-05 says `Claude Opus 5.5`; the current commit reminder says `Claude Sonnet 5.5 <noreply@anthropic.com>`. Keep the script constant equal to what the plans commit with, and decide once in plan 1 (autonomous: follow D-05, the phase's own locked decision, and record it in `89-RED-EVIDENCE.md`). |
| 50 | `PLAN_SUBJECT = /^[a-z]+[(]88-[0-9]{2}[)]!?: /` | `[(]89-[0-9]{2}[)]` |
| 53 | `PLANNING_HEAD = "947bb0a3"` | the last planning-only commit: `b37ccea6` (HEAD `docs(phase-89): add validation strategy`) - verify nothing outside `.planning` differs from `b5557e0d` (`git diff --stat b5557e0d HEAD -- . ':!.planning'` empty) |
| 65 | NEVER_STAGED last pattern `\.planning\/phases\/(?!QD-88-stoppedbox-...\/)` | `QD-89-one-admission-step-for-a-host-s-audit-batch` |
| 257-264 | `ID_TOKENS` incl. `SBOX-0\d`, `88-\d{2}`, `QD-88`, `Phase 88` | replace the three 88 tokens with `ADMIT-0\d`, `89-\d{2}`, `QD-89`, `Phase 89`; keep `D-\d+`, `WX-0\d`, `-NEXT` |
| 268 | `PHRASE` / `PHRASE_EXEMPT` (the `publishes from now on` carve-out) | keep PHRASE; drop the `publishes` carve-out unless an 89 file needs it (it does not) |
| 295-306 | `isSrc` over `packages/(devtools|core)/src`, SRC_ONLY/EVERYWHERE | `packages/audit/src` (and core only if touched; it is not) |
| 459-473 | MODEL/REACT/TESTS/LEDGER/BOX constants, `KEYED` | replace with `AUDIT_SRC = "packages/audit/src/"`, `HOST_BATCH`, `ARCHIVE`, `FACTS`, `RETENTION`, `CODEC`, `INDEX`, `BORN_TESTS = [AdmissionOrder.characterisation, HostBatch.test, HostBatch.tst, hostBatchFaults]` |
| 725-756 | `SCREENS`, `PINNED`, `NEW_BEHAVIORS = [776..780]`, `NEW_INVARIANTS`, `AUDIT_KEYS`, `CHANGESET_SENTENCE`, `TEST_PATH` | spec file `spec/behaviors/33-audit-pipeline.md`; `NEW_BEHAVIORS = [781,782,783,784,785]`; `NEW_INVARIANTS` 423, 424; changeset header `---\n"@qadi/audit": patch\n---\n`; `inPackage` default `packages/audit/` |
| 881 | changeset check `'---\n"@qadi/devtools": patch\n---\n'` | `"@qadi/audit"` |
| 923 | `OUTSIDE = [":!.planning", ":!.agents", ":!.codex", ":!assets", ":!README.md"]` | unchanged |
| 998-1001 | `vitest` mode: `rmSync(report, { force: true })` first, then `hadReporterDir`, `spawnSync("pnpm", ["exec","vitest","run","--project","devtools", ...files, "--reporter=json", "--outputFile=${report}"])`, then `rmSync(".vitest", ...)` if it did not exist | the same block with `"--project", "audit"`. The stale-report deletion is the `rmSync(report, { force: true })` before the spawn, under the comment "A report left by an earlier run must not stand for this one." |
| 1023-1025 | `suite` base list: `git ls-tree -r --name-only base -- packages/devtools/test` filtered `/\.test\.tsx?$/` | `packages/audit/test`, `/\.test\.ts$/` |
| self-test (1121-1130, 1269) | planted lines `"see 88-03"`, `"SBOX-02 holds"`, `"QD-88 closes"`, `"Phase 88 added"` | `"see 89-03"`, `"ADMIT-02 holds"`, `"QD-89 closes"`, `"Phase 89 added"`; negative cases `"ADR-QD-202"`, `"INV-QD-424"`, `"BEH-QD-781"`, `"CCR-QD-481"`, `"ARCH-136"`, `"ADR-QD-89"`, `"Phase 890"` |

Modes: keep `base commit unchanged seen-failing vitest suite scan-ids scan-forbidden trailers records [--close] --self-test`. Delete `box-keys-itself` and `ledger-module`; add `admission-step` and `entry-points-first` per D-20 with addendum D-06a replacing the "type-only import" clause by "`HostBatch.ts` imports nothing from `ArchiveFacts.ts`, `AuditArchive.ts` or `Retention.ts`". Reuse helpers `blank`, `topLevel`, `importsOf`, `sourceFiles`. Judge tokens on comment-and-string-blanked text: `Number.isFinite(` and `rowsRefusal(` only in `HostBatch.ts` (note `SinkOptionChecks.ts:40` has `Duration.isFinite`, a different token; `CodecMade.ts` mentions `rowsRefusal` in docs and defines it with `rowsRefusal = (`, which is not a call). `judgeClosed` is new (RESEARCH 734): BEH headings and traceability §1 range `BEH-QD-721–722, BEH-QD-781–785`, INV 423/424 with `**Source**` naming `packages/audit/src/HostBatch.ts`, ADR-202 file + index entry + §3 row, ADR-190 at 1.7 and ADR-110 at 1.4 each naming ADR-QD-202, CCR-QD-481 row naming `ARCH-136` and `Unused:`, README/traceability/invariants each one revision above `phase_base`, one changeset starting `---\n"@qadi/audit": patch\n---\n`.

### `89-pinned-check.mjs` (from `88-pinned-check.mjs`)

Constants (88 lines 36-50): `TEST_DIR = "packages/audit/test"`; `HELD_EXTRA = ["packages/audit/src/CodecMade.ts", "packages/audit/src/SequenceIntegrity.ts", "packages/audit/src/index.ts"]` (88's was dock + two barrels); `BORN = [AdmissionOrder.characterisation.test.ts, HostBatch.test.ts, HostBatch.tst.ts, hostBatchFaults.ts]` under `TEST_DIR`; declared files `FOREIGN = ${TEST_DIR}/ForeignRows.test.ts`, `RETENTION = ${TEST_DIR}/Retention.test.ts`. The held set stays computed (`git ls-tree -r --name-only <phase_base> -- packages/audit/test`) minus the declared files; do not list it by hand. Declared regions use the 88 mechanism (`DECLARED = [{ file, regions, applied }]`, regions `{ name, from, to, kept }`, each anchor once at the base; see 88-pinned-check.mjs 100-125). For `ForeignRows.test.ts` the regions are the five removed `it(` blocks (`from: '  it("a non-finite now is refused before the rows are read"'` etc., `to` the next `it(`) plus one new-`describe` region; `applied: (t) => t.includes("each function that takes a batch refuses what the admission step refuses")`. `Retention.test.ts` region: `from: '  it("checks now before maxAgeMs"'`. `AdmissionOrder.characterisation.test.ts` is `BORN` but with two declared regions (the two span rows and the direct-`verifiedArchiveFacts` rows) held against its adding commit. `phase_base` is read from `89-mutation-base.json`. Header comment keeps "three kinds: held, declared, born".

### `89-mutation.mjs` (from `88-mutation.mjs`, 477 lines)

| 88 | 89 |
|---|---|
| line 35-39 `CONFIG = "stryker.devtools.mjs"`, `GROUPS = { ledger: { config, report: "reports/mutation-devtools/mutation.json", files: [LEDGER], closeOnly: true, disableBail: true, killers: ... } }` | `CONFIG = "stryker.audit.mjs"`; group `audit`: `report: "reports/mutation-audit/mutation.json"`, `files` = the five base files plus `HostBatch.ts` at close; base invocation is exactly `pnpm exec stryker run stryker.audit.mjs --mutate packages/audit/src/AuditArchive.ts,packages/audit/src/ArchiveFacts.ts,packages/audit/src/Retention.ts,packages/audit/src/CodecMade.ts,packages/audit/src/SequenceIntegrity.ts` (RESEARCH 686; the audit config keeps `disableBail: false`, so no `--disableBail` suffix and `invocation()` drops that ternary); the close adds `,packages/audit/src/HostBatch.ts`. `closeOnly` is false: touched files are compared with the base, `HostBatch.ts` is judged absolutely by `judgeNew` |
| 40 `NEW_FILES = [LEDGER]` | `[HOST_BATCH]`; `touched: [AuditArchive, ArchiveFacts, Retention]`, held `[CodecMade, SequenceIntegrity]`; add a `MOVED` note naming the two `now` checks (to `HostBatch.ts`) and the rows wrap (to `admitRows`); no `RENAMED` map |
| 48 `EQUIVALENT = []` | one entry `{ file: HOST_BATCH, mutatorName: "MethodExpression", replacement: "taken", lineText: "return Result.succeed(new AdmittedRows(taken.filter(Predicate.isNotUndefined)));", reason: "a hole is refused before this line, so no element is undefined and the filter only narrows the type" }` |
| 54-62 `EXAMINED` (ObjectLiteral `{}` 1, ArrowFunction 3) | `{ [HOST_BATCH]: { "ArrowFunction () => undefined": 1 } }` for `takeRows`, run by hand with `ignoreStatic: false` and seen Killed by a test asserting the admitted rows (comment as in 88: name the killing rows) |
| 64-71 `UNMEASURED` (4 react files) | `[]`, with a recorded reason: every touched file is under `packages/audit/src/**/*.ts` minus `index.ts` |
| 236, 255, 272 `phase: "88"` | `"89"`; `restart` shape `{ phase: "89", phase_base, unmeasured: UNMEASURED, groups: {} }` |
| 255 `measured: { config: CONFIG, mutate: ${MODEL}**/*.ts, files: modelAt(head) }` | `mutate: "packages/audit/src/**/*.ts"` and `files` = the five base files with blobs |
| `base_run` | no longer "none": record the measured base (212 mutants, all killed, 232 with 20 Ignored static; per-file Ignored counts RESEARCH 690-698) |

Close records `ArchiveFacts.ts`'s post-review score into `89-mutation-close.json` as Phase 91's base. Mutation runs sequentially with stdin closed, never beside vitest or another Stryker run (88-01 prohibition).

### `89-earlier-checks.mjs` (from `88-earlier-checks.mjs`, 363 lines)

- Line 46 `OUT = join(realpathSync(process.env.TMPDIR || "/tmp"), "qd88")` -> `"qd89"`.
- `P85_COPIED`/`P86_COPIED`/`P87_COPIED` (47-50) kept; add `P88_COPIED = ["88-check.mjs","88-pinned-check.mjs","88-mutation.mjs","88-earlier-checks.mjs","88-01-SUMMARY.md","88-RED-EVIDENCE.md","88-mutation-base.json","88-mutation-close.json"]`; extend `COPIED` and `PHASE_PREFIX` with `p88: "QD-88-"`. The directory finder (by name prefix under `.planning/phases/` or `.planning/milestones/*-phases/`) is unchanged.
- Ledger rows (the `LEDGER` array from line ~94): keep the 85, 86, 87 rows (85/86 `scan-ids` stay `reasons: true` with `set: PHASE_RELATIVE`; 87 rows are `fixed`/`pattern`; 87-pinned is `computed` from `EXPLAINED`); add 88 rows. The `EXPLAINED` table (88 lines ~76-90) is for 87-pinned and carries 88's subjects; keep it as is (88 explained it already).
- New row for `88-check.mjs records --close`: `exit: 1, reasons: true, set: [three revision lines]` (README 1.415 vs 1.414, traceability 1.334 vs 1.333, invariants 1.234 vs 1.233; exact wording from a measured run after the 89 records commit), each tagged with the 89 records commit subject that explains it (the kind of row 88 used for 87-pinned: "every differing file must have been touched by a commit since `phase_base` whose subject is one of the subjects `EXPLAINED` names"). Write the subject here before the commit exists and make plan N commit with exactly it.
- Ledger is therefore NOT empty (addendum D-20a; CONTEXT's "expected empty" is superseded).

---

## Records

### `spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md`

**Analog:** `spec/decisions/201-a-stop-notices-box-keys-itself-and-owns-the-announce-once-rule.md`. Header block, verbatim shape:
```
# ADR-QD-202 — One admission step for a host's audit batch

> **Document Control**
>
> | Property       | Value |
> | Document ID    | QADI-ADR-202 |
> | Revision       | 1.0 |
> | Effective Date | 2026-11-26 |
> | Status         | Accepted — amends ADR-QD-190 and ADR-QD-110 |
> | Author         | Qadi Engineering |
> | Classification | Architecture Decision Record |
> | Change History | 1.0 (2026-11-26): Initial (ARCH-136, CCR-QD-481) |
```
Sections in order: `## Context`, `## Decision` (numbered; D-06..D-13, the span rule and its two flips, read-once), `## Audit of the rows this decision edits`, `## Alternatives considered`, `## Consequences`, `## What enforces it`, `## Related`. Audit table columns (201, lines 109-116): `| Row | What it pinned | Change | Held by |`, followed by "Tests removed: N." then a prose paragraph. For 89 the table has six rows (the removed rows, RESEARCH 779-784), the sentence is "Tests removed: 6." with "No property is lost", and the "Held by" cells name the `HostBatch.test.ts` rows and the per-entry-point `describe`. "What enforces it" bullets (201 lines 170-196): one bullet per test file with its rows, the mutation command in code font (`pnpm exec stryker run stryker.audit.mjs --mutate ...`), `pnpm test:tstyche`, scratch variants each with the row that fails, and the closing "The merge gate by command (`pnpm check`), never by number." `## Related`: dashed list of links `[ADR-QD-190](./190-an-audit-row-is-a-value-only-its-codec-makes.md)`, `[ADR-QD-110](./110-an-archives-facts-are-computed-once.md)`, `[ADR-QD-099](./099-entry-points-are-a-closed-list.md)`, BEH-QD-781..785 and INV-QD-423/424 links in the `behaviors/33-audit-pipeline.md#...` anchor form. Never write a phase script path or a D-number in this file.

`spec/decisions/index.yaml` (after the ADR-QD-201 entry, line ~633):
```yaml
  - id: "ADR-QD-202"
    file: "202-one-admission-step-for-a-hosts-audit-batch.md"
    title: "One admission step for a host's audit batch"
    status: "Accepted — amends ADR-QD-190 and ADR-QD-110"
```
Also extend the 190 and 110 statuses with `; amended 2026-11-26 (ADR-QD-202: ...)` as line 620 did for ADR-197 (`"Accepted — amends ...; amended 2026-11-26 (ADR-QD-201: the stop ledger is a reducer ...)"`).

### ADR-QD-190 (1.6 to 1.7) and ADR-QD-110 (1.3 to 1.4) amendments

**Analog:** ADR-QD-197 line 93: `   **Amended 2026-11-26 ([ADR-QD-201](./201-....md)).** The ...` (a bold dated note indented inside the amended decision, with a link) and ADR-190's own `## Third amendment (2026-11-24, CCR-QD-469, ...)` heading at line 369. For 190 add `## Fourth amendment (2026-11-26, CCR-QD-481)` after the third amendment (decision 8 of the second amendment shows the closing line: "**Decided autonomously on 2026-11-26**, under the owner's standing instruction of 2026-11-22."), plus dated `>` notes under decision 2 (line 278) and line 286; for 110 a dated `>` note at line 38 and line 136. Revision bump mechanics (RESEARCH 743): edit body, then
```
node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-26 < /dev/null
```
once per document, then extend the newest Change History entry by hand (88-09 plan line 90: "once per document; extend the newest Change History entry by hand afterwards"; ADR-197's 1.5 entry: "...; the amendment is linked to ADR-QD-201 (CCR-QD-480)"). Spec body names no phase script path.

### `spec/behaviors/33-audit-pipeline.md` BEH-QD-781..785

**Analogs:** the BEH block shape of `28-devtools-screens.md` BEH-QD-780 (4567-4589) and the file's own BEH-QD-722 (1208-1262): heading `## BEH-QD-7xx: <sentence>`, the link line (here `> **Invariant:** [INV-...]` / `> **See:** [ADR-QD-202](...)`, per BEH-722's two-line form; 28-devtools uses `> **Decision:** ... · > **Invariant:**`), a fenced block of `REQUIREMENT:` lines (continuation lines indented 13 spaces), explanatory paragraph, then `Pinned by \`path\` (row descriptions) ... Specified in ADR-QD-202 (CCR-QD-481).` Insert after BEH-QD-722 and before the `---` + `_Previous: [32 — Custom Predicates](./32-custom-predicates.md)_` footer. BEH-722: replace the flat ` ```ts ` listing (1213-1221) with the fragment form (signatures stay in ` ```ts ` fences, never ` ```typescript ` unless it compiles); order clauses in its first three REQUIREMENTs become "in the order BEH-QD-781 states"; extend its "Pinned by" paragraph (the one ending `ArchiveRoundTrip.test.ts` (the property over finite `now` and any `keyMaterial`).`). BEH-QD-253 (709) and BEH-QD-254 (773) each gain a `[BEH-QD-781](#beh-qd-781-...)` link as 254 already does for 722 (780).

### `spec/invariants.md` INV-QD-423/424

**Analog:** INV-QD-421/422 (after `## INV-QD-420`, new ones go after `## INV-QD-422` at 4928). Shape: `## INV-QD-423: <sentence>`, a paragraph, then four bold-label paragraphs in order: `**Source**: \`packages/audit/src/HostBatch.ts\` — ...`, `**Implication**: ...`, `**Enforcement**: tests and the mutation floor. \`packages/audit/test/HostBatch.test.ts\` ...`, `**Related**: [BEH-QD-781](behaviors/33-audit-pipeline.md#beh-qd-781-...), ...` (links are relative `behaviors/...` here, unlike `../` in a behavior doc). Edit INV-QD-399 and INV-QD-400 **Source** lines to name `admitRows` and the brand. One `spec-revise` entry for the document.

### `spec/traceability.md`, `spec/README.md`

- traceability §1 row (line 75): `BEH-QD-721–722` -> `BEH-QD-721–722, BEH-QD-781–785`, add `HostBatch.ts` to the source list; §2 rows INV-QD-399/400 (289-290) updated, new INV-QD-423/424 rows; §3 row for ADR-QD-202 after the ADR-QD-201 row (501); §4 test-map: row 852 (`ForeignRows.test.ts`) loses the removed-row descriptions, new rows after 700-style entries for `AdmissionOrder.characterisation.test.ts`, `HostBatch.test.ts`, `HostBatch.tst.ts` (and `hostBatchFaults.ts` only if the close judge requires one; 88's close required one per born test file). Row format: `| \`packages/audit/test/X\` | BEH-..., INV-..., ADR-QD-202 — <what it pins> |`. Revision 1.333 to 1.334 via `spec-revise`, history entry style "1.333 (2026-11-26): the ADR-QD-201 row ...".
- README CCR row (after CCR-QD-480, line 417):
`| CCR-QD-481 | 2026-11-26 | \`spec/README.md\` Rev 1.415 (this row), \`spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md\` Rev 1.0 (new; its audit table names the six removed rows and the row that holds each property, \`Tests removed: 6\`; its Related list links BEH-QD-781 to BEH-QD-785, INV-QD-423 and INV-QD-424), \`spec/decisions/index.yaml\`, \`spec/decisions/190-...md\` Rev 1.7, \`spec/decisions/110-...md\` Rev 1.4, \`spec/behaviors/33-audit-pipeline.md\`, \`spec/invariants.md\` Rev 1.234, \`spec/traceability.md\` Rev 1.334 | ARCH-136. **...** Unused: none |`. Column 4 holds the bold one-line summary then prose (see CCR-QD-270's form). `spec/overview.md` is unchanged; `pnpm spec:api` stays at 942 exports.

### `.changeset/audit-batch-admitted-once.md`

**Analog:** `.changeset/audit-entry-decoded-once.md` (frontmatter `---\n"@qadi/audit": patch\n---\n` then one paragraph; also `.changeset/devtools-stop-box-keys-itself.md`, which ends "No export changes."). Body is the D-24 sentences, with the INV-QD-399 fix sentence included (probe A confirmed, addendum D-12b). "no longer" is allowed in a changeset (the phrase scan exempts `.changeset/`, ids are not exempt: write no id).

---

## Plan shape (analog: `.planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-01-PLAN.md` ... `88-10-PLAN.md`)

**Frontmatter** (88-01 lines 1-27): `phase: QD-89-one-admission-step-for-a-host-s-audit-batch`, `plan: 01`, `type: execute`, `wave: 1`, `depends_on: []` (88 ran one plan per wave, 10 waves; plan N `depends_on: ["88-<N-1>"]`), `files_modified:` list of absolute-from-root paths, `autonomous: true`, `requirements: [ADMIT-01, WX-05, WX-06, WX-07]`, an `assumption_delta_decision` block (`noun`, `decision: no-change`, `rationale`), `estimate: { tokens, raw_tokens, tasks, confidence }`, then `must_haves: { truths: [...], prohibitions: [...], artifacts: [{ path, provides, contains }] }`. Truth entries are one sentence ending with decision refs in parentheses; backstop items use `statement:` + `verification: backstop`; prohibitions use `statement:`, `status: flagged`, `verification: test`.

**Body**: `<objective>` with an `Output:` paragraph that names each commit subject; "Plan-time evidence" paragraph; "Run rules" paragraph (88-01 lines 108-123): branch `arch-wave-16` only; no push/merge/tag/release/publish/`changeset version`; stage explicit paths, never `git add -A`; never stage `.planning/config.json`, `.planning/state.json`, `.planning/REQUIREMENTS.md`, root `README.md`, `.agents/`, `.codex/`, `assets/`, `*.iter*.md`, `.planning/milestones/`; commit with `git commit` (never `--no-verify`); exactly one trailer line; read `git log -1 --format=%B` after each commit; reserved records only (ARCH-136, ADR-QD-202, CCR-QD-481, BEH-QD-781..785, INV-QD-423..424), never `node scripts/next-id.mjs`; no D-number, plan id, requirement id, phase id/number or the phrases `this phase`, `until now`, ... in shipped source or titles.

**Tasks**: `<tasks>` holding `<task type="tracer">` (first) or `<task type="auto">`, each with `<name>Task N: ...</name>`, prose action, then:
```
<verify>
  <automated>bash -c '...'</automated>
  <fails_when>non-zero exit; stderr `<exact message 1>`, `<exact message 2>` ...</fails_when>
</verify>
<acceptance_criteria> - ... </acceptance_criteria>
<done>one sentence</done>
```
Every `echo "..." >&2; exit 1` message in the bash is listed verbatim in `fails_when`, including the one that fires "at HEAD before this task". Shell hygiene: `< /dev/null` on commands, `/usr/bin/grep`, `pnpm exec vitest run --project audit <file> --reporter=json --outputFile="$R" < /dev/null`, scratch dir under `$TMPDIR/qd89`, `git status --porcelain -- packages` empty after scratch edits restored with `cp`.

**`phase_base` handling in 88-01 (task 1)**: `phase_base` is the HEAD when plan 1 starts, written by `89-mutation.mjs record base` into `89-mutation-base.json` (`{ "phase": "89", "phase_base": "<40 hex>", "invocation": ..., "base_run": ..., "unmeasured": [...], ... }`), and every later script reads it from that committed record (`readBase()`; `89-check.mjs base` prints it after checking `PLANNING_HEAD` and `phase_base` are ancestors of HEAD and nothing outside `.planning/` differs between them). The record and its scorer are committed together, alone, as the first plan commit after `phase_base` (verify: that commit is a child of `phase_base`, holds exactly `89-mutation.mjs` and `89-mutation-base.json`, ends with the one trailer). For 89 this commit also must precede every test and source change, and the audit mutation base run (RESEARCH 686) is taken here, on the unchanged tree, nothing else running.

**Commit subjects 88 fixed** (the `git log` list, in plan order) and the 89 forms to fix in each plan's text:

| 88 | 89 form |
|---|---|
| `docs(88-01): record the mutation base` | `docs(89-01): record the mutation base` |
| `test(88-01): pin announce-once through the dock on the base` / `test(88-01): pin the stop notice hook on the base` | `test(89-01): pin the admission order and spans on the base`, `test(89-01): pin the defects of the batch reads on the base` |
| `chore(88-02): add the phase check` | `chore(89-02): add the phase check` |
| `chore(88-03): add the pinned-test check` | `chore(89-03): add the pinned-test check` |
| `chore(88-04): add the earlier-phase checks` | `chore(89-04): add the earlier-phase checks` |
| `feat(88-05): add the stop ledger` | `test(89-05): pin the admission step before it exists` (RED, module not found), then `feat(89-05): add the admission step` |
| `refactor(88-06): ...` (+ `test(88-06): ...` declared edits) | `refactor(89-06): every entry point admits its batch first` plus `test(89-06): ...` for the declared span-flip regions and ForeignRows/Retention edits |
| `docs(88-07): record the ... variants` | `docs(89-07): record the scratch variants` |
| `docs(88-08): record the mutation close`, `chore(88-08): admit the examined static mutants of ...`, `chore(88-08): add the patch changeset` | same pattern with `89-08` |
| `docs(88-09): record the ... decision`, `docs(88-09): state the ... rules in the behaviors and invariants`, `docs(88-09): amend the ... decision` | same with `89-09` and the ADR-QD-202 wording |
| `docs(88-10): complete the merge gate plan` | `docs(89-10): complete the merge gate plan` |
| `docs(88-NN): complete the ... plan` (SUMMARY commit per plan) | `docs(89-NN): complete the ... plan` |

Subjects must match `^[a-z]+[(]89-[0-9]{2}[)]!?: ` and are written into the plans and into `89-earlier-checks.mjs`'s EXPLAINED rows before the commits exist. Suggested wave split within the CONTEXT constraints: 01 base + characterisation + probes (RED rows D-18a seen failing on the base), 02-04 the three phase scripts, 05 `HostBatch.test.ts`/`.tst.ts` RED then `HostBatch.ts`, 06 the four entry points + declared edits, 07 scratch variants (D-19, text into `89-RED-EVIDENCE.md`, format `- failed (base V1): <row title>` / `  (scratch edit: ...; N row(s) failed under it)`), 08 mutation close + changeset, 09 spec records, 10 merge gate (`pnpm check:pr < /dev/null`).

---

## Shared Patterns

### Result-returning refusal wrapped once at the entry point
**Source:** `packages/audit/src/ArchiveFacts.ts:177-189` (today) and `Retention.ts:96-123`. Writer/verify: `return yield* Effect.fail(new ArchiveInputInvalid({ refusal }))`; plans: `Result.fail(new RetentionInputInvalid({ refusal }))`. Refusal values built by `HostBatch.ts`'s constructors deep-equal the public enums' (RESEARCH S2, no mapping).
**Apply to:** the four entry points.

### House-style traps for tests and source
- No `as`/`!`/`any` in tests either; read an untyped value through `handedOver`/`host` (`Reflect.get` on an `object`) (`ForeignRows.test.ts:63-70`).
- `Effect.fn` stays on the writer, public verify and `verifiedArchiveFacts`; `HostBatch.ts` has no `Effect.` token; no new `Effect.fnUntraced` (`UNTRACED_BUDGET`).
- Doc-comment shape: one-line summary, then why/ADR (AGENTS.md preamble).
- Relative imports with `.ts`; `import type` for types; effect imports as `import * as X from "effect/X"`.
- Barrel `packages/audit/src/index.ts` unchanged; `pnpm circular` after the move (`ArchiveFacts -> HostBatch -> CodecMade`, no back edge).
- Test titles name a property, never an id (`scan-ids`).

### Spec edits
Body edit, then `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-26 < /dev/null`, then `pnpm spec:verify:strict`, `pnpm spec:examples`, `pnpm spec:claims`, `pnpm spec:gates`, `pnpm spec:api` (each `< /dev/null`). Name scripts, never gate numbers (AGENTS.md section 15).

## No Analog Found

| File | Role | Reason |
|---|---|---|
| A counting `Proxy`/getter list probe | test helper | no existing flipping/counting proxy in audit tests; build it with `Proxy` over `[...rows]` passed through `host(...)` (RESEARCH 563-566 shows the reads recorded) |
| `judgeClosed` for audit spec files | phase script | 88's judge is devtools-specific; port its revision loop (`is.minor !== was.minor + 1`) and `addedChangesets` helper, new content per RESEARCH 734 |

## Metadata

**Analog search scope:** `packages/audit/{src,test}`, `packages/core/src/Admission.ts`, repo-wide `*characterisation*`, `.planning/phases/QD-88-*`, `spec/decisions`, `spec/behaviors/33-audit-pipeline.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`, `.changeset`.
**Files scanned:** about 45; all named analog paths confirmed tracked with `git ls-files` (source and test analogs) or read from the tracked planning tree.
**Pattern extraction date:** 2026-11-26
