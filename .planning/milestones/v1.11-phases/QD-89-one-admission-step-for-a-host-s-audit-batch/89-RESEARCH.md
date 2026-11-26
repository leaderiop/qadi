# Phase 89: One admission step for a host's audit batch - Research

**Researched:** 2026-11-26
**Domain:** `@qadi/audit` trust-boundary admission (a package-private plain-`Result` step, a nominal brand over admitted rows, an `NowRefusalCases` fragment), characterisation and scratch-variant proof, spec records
**Confidence:** HIGH. Both suspected defects were probed on the base, the brand, fragment and read-once shapes were built and run under `tsc`, tstyche (both configs), d.ts emission, madge and house-style, and the mutation base was taken. Every measurement is from this session at HEAD `b1d9043b` (source identical to `b5557e0d`: `git diff --stat b5557e0d HEAD -- . ':!.planning'` is empty).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Standing instruction (verbatim, 89-CONTEXT.md line 3): "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". Breaking changes are allowed; source compatibility is never the tiebreaker.

#### Binding milestone decisions (carried forward from Phase 85; not re-decided)
- **D-01:** Work only on branch `arch-wave-16`, on the main tree, one phase at a time. No merge, push, tag, release, publish, `changeset version` or version-packages PR (WX-07). Never `git add -A` under `.planning/milestones`. Never stage `.planning/config.json`, `README.md`, `.agents/`, `.codex/`, `.planning/state.json`, `assets/` or `*.iter*.md`.
- **D-02:** Use only the reserved records: ARCH-136, ADR-QD-202, CCR-QD-481, BEH-QD-781..785, INV-QD-423..424. Never run `node scripts/next-id.mjs`. Name any unused reservation in the CCR row ("Unused: …"). Pass `--date 2026-11-26` (or the real edit date) to `scripts/spec-revise.mjs`.
- **D-03:** Every behaviour change is preceded by a test written on the phase base: RED there for a change, green for preserved behaviour. Every new check is shown failing once, with the scratch variant and the failing text recorded in `89-RED-EVIDENCE.md` (WX-06). `pnpm check:pr < /dev/null` is green at the phase end (WX-01).
- **D-04 (the wave's changeset policy, Phase 85 D-04):** one `.changeset/*.md` for `@qadi/audit`, a **patch**. See D-24.
- **D-05:** Every commit ends with exactly one trailer line, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

#### Area 1: The step's home, shape and order
- **D-06 (home and name):** a new package-private `packages/audit/src/HostBatch.ts`. It is out of the barrel (ADR-QD-099), and the `exports` map is closed, so it is not importable. Its imports are only `effect/*`, `./CodecMade.ts` (`rowsRefusal`, and `RowsRefusalCases` as a type) and `./AuditEntry.ts` as a type.
  - Not in `ArchiveFacts.ts`, because Phase 91 folds `SequenceIntegrity.ts` into it and should move two names, not an admission step.
  - Not in `CodecMade.ts`, which stays **byte-identical** to the base: a leaf that answers one question ("which rows the codec made"). The step is a consumer of it, not part of it.
  - The working name follows the research (`HostBatch.ts`). The planner may rename it, but must keep it a separate module that `ArchiveFacts.ts` imports only as a type.
- **D-07 (the step's types: closed shapes, a `Result`, no optional widening):**
  ```ts
  // HostBatch.ts (package-private)
  export type NowRefusalCases = { readonly NowNotFinite: { readonly value: unknown } };
  type NowRefusal = Data.TaggedEnum<NowRefusalCases>;
  type RowsRefusal = Data.TaggedEnum<RowsRefusalCases>;

  class AdmittedRows { declare private readonly nominal: never; /* holds the rows, read once */ }
  export type { AdmittedRows };                       // the class stays unexported: only this module mints one

  export interface DatedBatch<Terms, Refused> {      // archive and retention
    readonly now: number;
    readonly terms: () => Result.Result<Terms, Refused>;
    readonly entries: ReadonlyArray<AuditEntry>;
  }
  export interface AdmittedBatch<Terms> {
    readonly now: number;
    readonly terms: Terms;
    readonly rows: AdmittedRows;
  }

  export const admitRows: (entries: unknown) => Result.Result<AdmittedRows, RowsRefusal>;
  export const admitBatch: <Terms, Refused>(
    batch: DatedBatch<Terms, Refused>,
  ) => Result.Result<AdmittedBatch<Terms>, NowRefusal | Refused | RowsRefusal>;
  ```
  - `admitBatch` is the step. `admitRows` is its last stage, and it is also the whole step for the one entry point with no `now` and no terms (the public verify).
  - The refusal is a union of `Data.TaggedEnum` members. Each is assignable to the caller's public enum with no mapping, exactly as `rowsRefusal`'s answer is today (ADR-QD-190 decision 5). Each caller wraps it once: the writer and the verify with `Effect.fail(new ArchiveInputInvalid({ refusal }))`, retention with `Result.fail(new RetentionInputInvalid({ refusal }))`.
  - No `as`, no `!`, no `Record<string, unknown>`, no `Effect.fn`, no `switch`.
  - Rejected: **one function over a tagged union of the three batch kinds.** Its output differs per kind, so it would need overloads or a conditional return type, and the caller would narrow a union the call already knew.
  - Rejected: **`now?` and `terms?` as optional fields.** That widens the step's input to absent values the order then has to branch on. Two closed shapes state the same thing without a hole.
  - Rejected: **a refusal-or-`undefined` return** (PITFALLS 89-B's shape). The writer must write the key material it checked (read once, ADR-QD-190 third amendment), so the step has to return what it admitted. A bare refusal would force a second read.
- **D-08 (one order):** `now` (`Number.isFinite`, never the coercing `isFinite`), then `terms()` (called at most once, and **not called** when `now` is refused), then the rows (not read when the terms are refused). This one order is the base order of every entry point. The entry points differ only in which terms they pass: the writer passes key material, retention and purge pass `maxAgeMs`, and the verify passes nothing and calls `admitRows`.
  - Rejected: **a flat "now, rows, then terms".** It would change which refusal wins for key material plus rows and for max age plus rows (PITFALLS 89-A).
  - Rejected: **an ordered list of checks per caller.** With the terms as the caller's one thunk, every caller's order is the same, and a list would let a caller reorder what BEH-QD-722 fixes.
- **D-09 (admitted rows are a type, not a duty; the brand):** `AdmittedRows` follows the `AuditEntry` idiom (`declare private readonly nominal: never`, a type-only export, ADR-QD-190 decision 1). Only `admitRows` builds one.
  - `verifiedArchiveFacts` takes `AdmittedRows` and no longer asks `rowsRefusal`. "Facts from unadmitted host rows" stops compiling, and the writer asks the codec's record once, not twice (today it would ask twice if a step ran first and the wrapper kept its own check).
  - The pure `archiveFacts` keeps taking `ReadonlyArray<AuditEntry>`. It is the reader's, over rows `decodeAuditEntry` has just made (`AuditArchive.ts:386`), and `ArchiveFacts.test.ts` stays held.
  - Rejected: **branding the array itself.** That needs an `as` to mint.
  - Rejected: **branding `archiveFacts` too.** It would make the reader admit rows it made itself.
- **D-10 (spans: the roadmap's open choice; decided as the brand, with the trace change pinned and recorded):** admission runs before any span-opening step of the entry point's own work. The step opens no span.
  - Success traces are unchanged. An admitted archive opens `qadi.audit.archiveAuditTrail` with the child `qadi.audit.verifySequenceIntegrity`. An admitted verify opens exactly `["qadi.audit.verifySequenceIntegrity"]`. `AuditArchive.test.ts:41-77` stays held. Span names do not change.
  - Two refusal traces change, both pinned by plan 1's characterisation and flipped in one declared commit:
    - (a) `archiveAuditTrail` refused for its rows opens only `qadi.audit.archiveAuditTrail` (on the base, also the child `qadi.audit.verifySequenceIntegrity`);
    - (b) a refused public `verifySequenceIntegrity` opens no span (on the base, `qadi.audit.verifySequenceIntegrity`).
    A refusal of `now` or key material already opens only the writer's span, and is unchanged.
  - The rule the ADR records: **the sequence check's span opens only when the check runs, on admitted rows.** A refused input was never checked (ADR-QD-051: a span says what was asked). A refused archive still fails inside its own span. A refused verify is a typed failure in the host's own span.
  - Why this is the complete option. ADMIT-02 has the writer admit its whole batch (rows included) first. So (a) changes under **any** design that meets it, and "spans unchanged" is reachable only by leaving the writer's rows to a second admission inside the child span. That splits one batch's order across two calls, and the order could then not be tested once. Given that (a) moves anyway, admitting before the span everywhere is the one consistent rule. It also removes the double codec check.
  - Rejected: **admission inside the verify span**, keeping (b). Then `verifiedArchiveFacts` would take raw rows, the writer would ask the codec twice, and the brand would go.
  - Rejected: **naming the public verify's own `Effect.fn`.** A successful verify would then open two spans and break the held `AuditArchive.test.ts:76`.
  - Rejected: **two `Effect.fn`s that share one span-name literal.** It states the name twice, which is the drift ADR-QD-110 removed.
- **D-11 (`NowNotFinite` stated once):** `NowRefusalCases` lives in `HostBatch.ts`, beside the check that answers it, as `RowsRefusalCases` lives beside `rowsRefusal`.
  - `ArchiveInputRefusal = Data.TaggedEnum<RowsRefusalCases & NowRefusalCases & { KeyMaterialNotAList; KeyMaterialItemRefused }>` and `RetentionInputRefusal = Data.TaggedEnum<RowsRefusalCases & NowRefusalCases & { MaxAgeInvalid }>`.
  - Each keeps its own `Data.taggedEnum` constructors, so `ArchiveInputRefusal.NowNotFinite(…)` and `RetentionInputRefusal.NowNotFinite(…)` still exist. Same members, tags, fields and readonly-ness, the same two error classes (`Data.TaggedError`; `SCHEMA_ERROR_BUDGET` stays 12), and not Breaking.
  - The key `NowNotFinite:` is declared as a member in exactly one `packages/audit/src` file, `HostBatch.ts`. `89-check.mjs` judges this.
  - Rejected: **one shared public refusal enum or error** (FEATURES anti-feature; it reopens ADR-QD-190 and is Breaking).
  - Rejected: **exporting `NowRefusalCases`** (gate 13).
  - Rejected: **putting it in `CodecMade.ts`**, which has nothing to say about time.
- **D-12 (each input read once; what is checked is what is used):** the step is the trust boundary's reading rule for the whole batch, not only the order.
  - **Rows:** `admitRows` reads `length` once and each index once, into a fresh array. It checks that array and holds it in the `AdmittedRows`, so every later read (facts, age rule, purge pass) reads what was checked. It must not call a method or iterator the host's object can override (no instance `findIndex`, `slice`, spread or `Array.from` over the host's own `Symbol.iterator`); the planner chooses the exact read under that rule. A hole reads as `undefined` and is refused at its index, as today.
    - Plan 1 probes it on the base: a `Proxy` over a list whose index `0` answers a codec row on the first read and a plain row on the next. If the writer archives a bundle its reader refuses, that is the live defect the changeset names (INV-QD-399).
  - **Key material:** unchanged. `snapshotKeyMaterial` stays in `AuditArchive.ts`, beside `KeyMaterialSchema`, which the reader reuses. It is the writer's `terms`, so `options?.keyMaterial` is read once, inside the step's order.
  - **`maxAgeMs`:** retention's `terms` reads `policy?.maxAgeMs` once, refuses `!(value >= 0)` as `MaxAgeInvalid { value }` (`NaN` and negatives refused; `+Infinity`, `0` and `-0` valid), and returns the number. The age rule uses that number, never `policy.maxAgeMs` again.
    - A `policy` that is `null`, `undefined` or a primitive reads as `MaxAgeInvalid { value: undefined }`, the same refusal `{}` gets today. On the base it throws a `TypeError`. This closes a defect without a new member (a new member would be Breaking, outside ADMIT-03). RED on the base.
  - **`now`:** a primitive parameter, read once by construction. `-0` is finite and archived, as today.
- **D-13 (how each entry point calls the step first):**
  - `archiveAuditTrail`: the first statement admits `{ now, terms: () => snapshotKeyMaterial(options?.keyMaterial), entries }`. A refusal is `Effect.fail(new ArchiveInputInvalid({ refusal }))`. It then calls `verifiedArchiveFacts(admitted.rows)` and builds the bundle from `admitted.now` and `admitted.terms`. The function stays `Effect.fn("qadi.audit.archiveAuditTrail")`.
  - `verifySequenceIntegrity` (public, unnamed `Effect.fn`): `admitRows(entries)` first, then `verifiedArchiveFacts(rows)`.
  - `verifiedArchiveFacts`: takes `AdmittedRows`, keeps its span name, and its only failure is `SequenceIntegrityError`.
  - `planRetention`: admits `{ now, terms: () => maxAgeOf(policy), entries }`, then runs a module-private age rule over the admitted batch.
  - `planPurge`: admits its own batch first, the same way, then the same private age rule, then the archive pass over the **admitted rows**. It no longer maps `planRetention` and re-iterates the raw `entries` (`Retention.ts:171, 177`). Both plans share one age rule over one admitted batch, and the archive is still never asked for a refused batch.
  - The doc comments at `AuditArchive.ts:139-149`, `ArchiveFacts.ts:20-25`, `ArchiveFacts.ts:167-176`, `Retention.ts:83-95` and `Retention.ts:10-20` state "the step admits the batch" and name `HostBatch.ts`. They no longer restate the order.

#### Area 2: Characterisation, the order table, the type pin and the declared test edits
- **D-14 (plan 1: the characterisation on the base, ADMIT-01):** a new file, working name `packages/audit/test/AdmissionOrder.characterisation.test.ts`, committed green on the base. Rows:
  - **Which refusal wins, for every pair of faults, per entry point**, as an explicit literal table (not computed from an order list, so the table does not encode the abstraction it pins):
    - writer: `now` × {key material not a list, key-material item, rows not a list, row item, sequence break}, key material × {rows, row item, sequence break}, row item × sequence break;
    - `planRetention` and `planPurge`: `now` × {`maxAgeMs` `NaN` and `-1`, rows not a list, row item}, `maxAgeMs` × {rows not a list, row item};
    - the public verify: row item × sequence break;
    - `verifiedArchiveFacts` directly: row item × sequence break.

    Impossible pairs (a sequence break needs a list of codec rows; the two forms of one input exclude each other) are named as such. A `fast-check` row over every subset of each entry point's faults pins that the winner is the first fault in the base order.
  - **The spans each opens on each refusal**, read with the `Tracer.make` name collector of `AuditArchive.test.ts:41-58`:
    - writer: `now` and key material → `["qadi.audit.archiveAuditTrail"]`; rows and the sequence break → the writer's span plus `qadi.audit.verifySequenceIntegrity`;
    - verify: a rows refusal and a break → `["qadi.audit.verifySequenceIntegrity"]`;
    - `planRetention` and `planPurge`, run under the collector in `Effect.sync` → none.
  - **Laziness:** a refused `now` never reads `options.keyMaterial` (a counting getter, 0 reads). Refused key material never reads the rows (a counting `Proxy`).

  The file is held byte for byte from the commit that adds it, except two declared regions: the two span rows D-10 flips ((a) and (b)), and the `verifiedArchiveFacts`-direct rows. D-09 retypes that function, so the brand commit rewrites those rows as "takes only admitted rows; its one failure is `SequenceIntegrityError`" through `admitRows`.
- **D-15 (the order tested once, at the step, ADMIT-04):** a born `packages/audit/test/HostBatch.test.ts`:
  - The order table over stub terms (one that admits, one that refuses), for every subset of {bad `now`, refused terms, rows not a list, row item}. The winner is the first in `now` → terms → rows.
  - `terms` is called once, and zero times on a refused `now`. The rows are not read on refused terms.
  - `now` boundary rows: `NaN`, `±Infinity`, `"1"`, `undefined`, `null`, `1n` refused with the value given; `0`, `-0` and `1` admitted.
  - `admitRows`: not-a-list values (the seven of `ForeignRows.test.ts:187-195`), a hole, the proxied list (D-12), an empty list admitted, and the admitted rows being a fresh array.
  - It is seen RED before `HostBatch.ts` exists (module not found), then green.
- **D-16 (the declared test edits; every other test held byte for byte):** in `packages/audit/test`:
  - `ForeignRows.test.ts`: the order rows at 111-113, 156-165, 231-245, 359-363 and 365-367 are removed. One new `describe` takes their place, "each function that takes a batch refuses what the admission step refuses", with **one case per entry point** (`archiveAuditTrail`, `planRetention`, `planPurge`, `verifySequenceIntegrity`). Each runs the fault table from a shared test helper (working name `test/hostBatchFaults.ts`) through the entry point and through `admitBatch`/`admitRows`, and asserts the two refusals are equal. That proves the entry point calls the step, without re-listing the order.
    - Held unedited: 115-121 (rows refused before a sequence break: the writer's own work comes after admission) and 222-229 (`planPurge` fails before the archive is asked).
  - `Retention.test.ts:139-141` ("checks now before maxAgeMs") is removed and re-homed to `HostBatch.test.ts`.
  - D-14's two declared regions.
  - `ADR-QD-202` carries an audit table (the ADR-QD-200 and ADR-QD-201 precedent) naming each removed row and the row that now holds its property. "No property lost; tests removed: N" is stated with the real count.
  - Everything else is held byte for byte, including `AuditArchive.test.ts` (230 included), `ArchiveFacts.test.ts`, `ArchiveRoundTrip.test.ts`, `ArchiveWriterInputs.test.ts`, `SequenceIntegrity.test.ts`, `UntrustedSeams.test.ts`, every `*.tst.ts` and every `features/` file (none touches the archive).
- **D-17 (the type pin that can fail, ADMIT-03):** a born `packages/audit/test/HostBatch.tst.ts`, with positive pins and `not.toBeAssignableTo` only. No negative `toBeCallableWith` and no `toBeConstructableWith`, so `NOT_CALLABLE_PIN_BUDGET` and its table do not move.
  - Each public enum `toBe` its member set, **spelled out independently in the test** (the flat five and four members with their fields, the base shape). This fails if a member, tag, field or `readonly` moves.
  - Each public enum `toBe` `Data.TaggedEnum<RowsRefusalCases & NowRefusalCases & {own members spelled in the test}>`: "fragments plus its own members".
  - The shared members are one type: `Extract<ArchiveInputRefusal, { _tag: "NowNotFinite" }>` `toBe` the retention one `toBe` `Data.TaggedEnum<NowRefusalCases>`, and likewise for `EntriesNotAList` and `EntryNotMadeByCodec`.
  - `ReadonlyArray<AuditEntry>` and `{ entries }` are `not.toBeAssignableTo<AdmittedRows>`, and `Parameters<typeof verifiedArchiveFacts>[0]` `toBe` `AdmittedRows`.

  Seen failing: `value: number` in `NowRefusalCases`; a member dropped from the archive's own cases; `NowNotFinite` restated in retention's own cases with another field type; `verifiedArchiveFacts` taking a raw list. Each run's text goes in `89-RED-EVIDENCE.md`.
- **D-18 (RED before each behaviour change, WX-06):** written and seen RED on the base, before the change:
  - the two span flips (D-10 (a) and (b));
  - `maxAgeMs` read once (a counting getter on `policy`: 3 or more reads on the base, 1 after);
  - a non-object `policy` refused as `MaxAgeInvalid { value: undefined }` (it throws on the base);
  - the proxied rows list (D-12; RED only if plan 1's probe confirms the defect, otherwise a green preserved row).

  Preserved behaviour (every refusal value, `-0`, `+Infinity` `maxAgeMs`, `Number.isFinite`, key material read once, success spans) stays green through every commit.
- **D-19 (scratch variants, each seen failing with its text recorded):** `now` and terms swapped; rows before terms; `isFinite` for `Number.isFinite`; `terms` called on a refused `now`; rows read without the snapshot; admission moved inside `verifiedArchiveFacts`'s span; `planPurge` back to mapping `planRetention` and re-reading the raw `entries`; the age rule reading `policy.maxAgeMs` again; `NowNotFinite` restated in `Retention.ts`.

#### Area 3: Phase scripts and measurement
- **D-20 (phase scripts, the Phase 85-88 pattern):**
  - `89-check.mjs`: `base`, `commit`, `unchanged`, `seen-failing`, `vitest` and `suite` (over the `audit` vitest project), `scan-ids`, `scan-forbidden`, `trailers`, `records [--close]`, plus two shape judges:
    - `admission-step`: `HostBatch.ts` exists and is in no barrel; its imports are exactly D-06's; it has no `Effect.fn`, `Effect.gen`, `withSpan` or `Effect.` call at all; it uses `Number.isFinite` and no bare `isFinite(`; the member key `NowNotFinite:` appears in exactly one `packages/audit/src` file; `rowsRefusal(` and `Number.isFinite(` are called in `packages/audit/src` only by `HostBatch.ts`; `ArchiveFacts.ts` imports `./HostBatch.ts` only with `import type`; `CodecMade.ts` is byte-identical to the base.
    - `entry-points-first`: in each of `archiveAuditTrail`, `verifySequenceIntegrity`, `planRetention` and `planPurge`, the first statement of the body calls `admitBatch` or `admitRows`; `planPurge` does not call `planRetention`; `verifiedArchiveFacts`'s parameter is typed `AdmittedRows`.
  - `89-pinned-check.mjs`, implementing D-16's held and declared sets and D-14's, D-15's and D-17's born files.
  - `89-mutation.mjs`, implementing D-21.
  - `89-earlier-checks.mjs`, which runs Phases 85-88's checks from scratch copies with an **expected-reports ledger**. Phase 89 touches only `@qadi/audit`, so the ledger is expected empty, and a report names the 89 commit that explains it. The script never edits an archived check's path constants.

  Each script has a `--self-test`, and each mode is seen failing once. `scan-ids` adds `ADMIT-0\d`, `89-\d{2}`, `QD-89` and `Phase 89`. A test title names a property, never a D-number, a requirement id or a phase number (WX-07).
- **D-21 (mutation, WX-05):** `stryker.audit.mjs` mutates `packages/audit/src/**/*.ts` minus `index.ts`, so every touched file and `HostBatch.ts` is measured. **`UNMEASURED` is empty**, and the record says why: no touched file is outside that glob.
  - `89-mutation-base.json` is taken on the phase base for `AuditArchive.ts`, `ArchiveFacts.ts` and `Retention.ts` (touched), and for `CodecMade.ts` and `SequenceIntegrity.ts` (held, to show they do not drop). The close run uses the same invocation. A touched file's score must not fall. The code that moves (the two `now` checks, the rows wrap) is named in a `MOVED` note with its new home, and no file is renamed, so there is no `RENAMED` map.
  - `HostBatch.ts` must have **every mutant killed**, or each survivor recorded as an equivalent with its reason, and an Ignored static mutant only by the 87/88 `EXAMINED` mechanism (run by hand with `ignoreStatic: false`, seen Killed).
  - A survivor is closed with a test, never re-baselined. Coverage stays at or above 90% for audit.
  - `89-mutation-close.json` records `ArchiveFacts.ts`'s post-review score as **Phase 91's base** for that file (the roadmap's instruction).

#### Area 4: Records
- **D-22 (ADR-QD-202 new; ADR-QD-190 and ADR-QD-110 amended):** a new ADR is the complete record. The change adds a module and a brand, changes two traces, closes up to two defects, and carries its own rejected alternatives and an audit table. Folded into ADR-QD-190's fourth amendment, it would bury the span rule. The precedent is a new ADR per phase in this wave (198-201).
  - `spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md` states D-06 to D-13, the span rule and its two flips, the read-once rule, the audit table (D-16), and "What enforces it", naming commands, never gate numbers.
  - ADR-QD-190 (revision 1.6 to 1.7) gets a dated amendment: "`NowNotFinite` joins `RowsRefusalCases`' discipline as `NowRefusalCases` (`HostBatch.ts`); the rows are asked once, by the admission step; see ADR-QD-202". Its decision 5 still stands.
  - ADR-QD-110 (revision 1.3 to 1.4) gets a dated note on "the span keeps the name it had": the name is unchanged, and the span now opens only for admitted rows.
- **D-23 (BEH and INV allocation):** the planner may rebalance the allocation, but must use all five BEH and both INV ids or name an unused one in CCR-QD-481.
  - BEH-QD-781: one admission step checks a host's batch in one order (`now`, then the caller's terms, then the rows), and every entry point calls it before any fact, plan or span of its own work.
  - BEH-QD-782: each entry point refuses exactly what the step refuses for the same batch (the writer: `now`, key material, rows; retention and purge: `now`, `maxAgeMs`, rows; the verify: rows).
  - BEH-QD-783: the sequence check's span opens only for admitted rows. A refused archive opens only its own span, and a refused verify opens none. Success traces are unchanged.
  - BEH-QD-784: `NowNotFinite` is one case shared by both refusal enums, as the row refusals are, and both enums keep every member, tag and field.
  - BEH-QD-785: a policy's `maxAgeMs` is read once and the age rule uses the value checked. A policy that is not an object is `MaxAgeInvalid { value: undefined }`, never a defect.
  - INV-QD-423: no fact, plan or sequence check is computed from host rows the admission step did not admit. Only `HostBatch.ts` mints `AdmittedRows`.
  - INV-QD-424: each input of a host's batch is read once (the rows' list and each index, the key material and each item's fields, `maxAgeMs`), and what was checked is what is used. No input is a defect, whatever the value given.
  - BEH-QD-722 is restated: its order REQUIREMENTs point to BEH-QD-781, its `ts` listing shows the fragments, and its "Pinned by" list names the new files. BEH-QD-253 (the retention refusal REQUIREMENT) and BEH-QD-254 (the verify's `ArchiveInputInvalid` REQUIREMENT) each gain a link to BEH-QD-781.
  - The `spec/traceability.md` rows (`ForeignRows.test.ts` at 852 and the new files), `spec/decisions/index.yaml`, and the CCR-QD-481 row in `spec/README.md` move with them. Any ` ```typescript ` fence must compile (`check-doc-examples.mjs`). Signatures go in ` ```ts ` fences. `spec/overview.md` is unchanged: no export moves.
- **D-24 (the changeset):** `.changeset/audit-batch-admitted-once.md`, a `@qadi/audit` **patch**:
  - "A host's batch is admitted by one step, in one order (`now`, then key material or `maxAgeMs`, then the rows); every refusal is unchanged."
  - "A refused batch no longer opens the `qadi.audit.verifySequenceIntegrity` span (a refused `verifySequenceIntegrity` opens none; a refused `archiveAuditTrail` opens only its own)."
  - "`planRetention` and `planPurge` read `maxAgeMs` once and refuse a policy that is not an object as `MaxAgeInvalid` instead of throwing."
  - "Rows are read once", plus the INV-QD-399 fix sentence only if plan 1's probe confirmed the defect.
  - "No export changes."

  Not Breaking: no public name, type, tag or member moves, and a span is not part of a public type.

### Claude's Discretion
- The exact names of `HostBatch.ts`, `admitBatch`, `admitRows`, `AdmittedRows`, `DatedBatch`, `AdmittedBatch`, the retention terms function, the private age rule, the characterisation file and the fault helper, within the shapes fixed above.
- The exact once-only read of the rows list (D-12), under its rule.
- The plan count and the wave split, within these constraints:
  - plan 1 is the base record, the mutation base, the characterisation (D-14) and the defect probes (D-12);
  - the RED rows (D-18) precede their change;
  - `HostBatch.test.ts` is seen RED before `HostBatch.ts` exists;
  - the records plan comes last, before the close check.

### Deferred Ideas (OUT OF SCOPE)
- **`planPurge`'s `archive` from a JavaScript caller.** It is typed `VerifiedArchive` (nominal), but a value that is not one reaches `archive.holds` and throws, after admission, when a row has expired. Refusing it needs a new `RetentionInputRefusal` member. That is Breaking, and outside ADMIT-03's "unions unchanged". Record it for a later Breaking audit phase.
- **`archiveAuditTrail`'s `options`** given as a non-object reads as "no key material" (`options?.keyMaterial`). That is correct today, and the phase leaves it.
- **Folding `SequenceIntegrity.ts` into `ArchiveFacts.ts`** is Phase 91's (D2), with 89's post-review mutation score as its base.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIT-01 | A characterisation written on the base pins, for each entry point, which refusal wins for every pair of faults, and the spans each opens on a refusal. | "Span and order facts" holds the measured literal tables (12 writer pairs, 8 plan pairs, 1 verify pair, 1 direct pair, every span list, every laziness count). The "impossible pairs" list corrects CONTEXT: only `rowsNotList` pairs and the two forms of one input are impossible. |
| ADMIT-02 | One package-private admission step checks a host batch in the pinned order, every entry point calls it first; a plain function, no new span; `CodecMade.ts` stays a leaf. | "Architecture Patterns" has the spiked `HostBatch.ts` (compiled, d.ts-clean, house-style-clean, madge-clean) and the four call sites. D-06's "type only" clause is contradicted by D-13 and resolved (see Open Question 1). |
| ADMIT-03 | `NowNotFinite` stated once as a fragment; both unions, both error classes, every tag and member unchanged; a type pin proves each union equals its fragments plus its own. | "Spike evidence" S1/S2: the pin passes on the fragment form and on the base, and fails with the recorded text on V1 to V4 and V6. `readonly` is inert under `Data.TaggedEnum` (V5), so D-17's "fails if `readonly` moves" claim is wrong and is corrected. |
| ADMIT-04 | The order is tested once at the step; `ForeignRows.test.ts` keeps one case per entry point proving it calls the step. | "Test-removal audit": exactly 6 `it` rows go (5 in `ForeignRows.test.ts`, 1 in `Retention.test.ts`), each mapped to the `HostBatch.test.ts` row that holds its property. |
| ADMIT-05 | ADR-QD-202 records the step; BEH-QD-722 and INV/traceability move with it. | "Spec amendments" lists every anchor with its verbatim text, including three spec places that name `verifiedArchiveFacts` and become false (invariants 2474, 4629, 4641; ADR-QD-190 decision 2; ADR-QD-110 lines 37, 136). |
| WX-01 | `pnpm check:pr < /dev/null` green at phase end. | Validation Architecture. |
| WX-02 | Reserved ids only, `next-id.mjs` never run. | Reserved ids restated in the addendum; the two INV and five BEH have concrete homes. |
| WX-03 | `spec/overview.md` names every added export; gate 13. | No export moves: `pnpm spec:api` prints `api-surface: 942 export(s) documented across 9 package(s)` at HEAD (measured). |
| WX-04 | Nothing from the forbidden list is added. | "House-style traps": the spike and the prescriptive code use none of them; the tests use `Reflect.get` (`handedOver`) where a cast would be tempting. |
| WX-05 | Coverage holds, mutation score of touched files does not fall. | "Mutation base": 212 mutants, 100.00, 0 survivors, per-file Ignored counts; `HostBatch.ts` plan with one EQUIVALENT and one EXAMINED entry. |
| WX-06 | Every behaviour change preceded by a base test; every new check seen failing. | "Probe evidence" gives the base outcome of each RED row; "Validation Architecture" lists the scratch variants. |
| WX-07 | No D-numbers, plan ids or phase numbers in shipped source or titles; no release, push or merge. | Pitfall 6; the `scan-ids` pattern list. |
</phase_requirements>

## Summary

The step is small and its design holds. `HostBatch.ts` (about 60 lines, no `Effect`, no span, three imports) admits a batch in one order and returns the admitted batch. I built it, a brand over the admitted rows and the two fragment enums in scratch, and ran them under `tsc` (declaration emit), tstyche in both passes, `check-house-style.mjs`, madge and a read-counting proxy. All of it passed, and the seen-failing variants fail with recorded text. The scratch files are deleted; `git status --porcelain -- packages spec scripts features .changeset stryker.audit.mjs` prints nothing.

**Probe A is confirmed on the base: rows are read more than once, and a list that flips between reads breaks INV-QD-399.** A `Proxy` over a one-element list that answers a codec row on its first read of index `0` and `{ record, sequenceNumber: 1.5 }` afterwards makes `archiveAuditTrail` succeed and write the plain row (`sequenceNumber: 1.5`) into the bundle. `readAuditArchive` then refuses the bundle (`EntryNotDecodable`, `Expected an integer at ["sequenceNumber"]`). `planRetention` and `planPurge` have the same defect: each returns a row the codec never made in `retained`/`retain`. The base reads index `0` four times in the writer and the verify (`findIndex`, `flatMap`, `entries`, `toSorted`), twice in `planRetention` and three times in `planPurge`, and `length` three to five times. The changeset may therefore claim the INV-QD-399 fix.

**Probe B is confirmed in part.** `planRetention`/`planPurge` throw a `TypeError` for `null` and `undefined` policies (`Cannot read properties of null (reading 'maxAgeMs')`). A number, a string and `{}` already return `MaxAgeInvalid`, so the defect is only the two nullish values. The `maxAgeMs` read count is `1 + n` for a valid policy (n rows) and `2` for a refused one, not "3 or more" for every input, so D-18's RED row must use at least two rows (3 reads on the base, 1 after). The two defects together justify the "closes a defect" wording in the changeset.

Three corrections to CONTEXT the planner must carry. (1) D-06 says `ArchiveFacts.ts` imports `HostBatch.ts` only as a type, but D-13 puts `admitRows` in the public `verifySequenceIntegrity`, which lives in `ArchiveFacts.ts`. It must import `admitRows` as a value. This is safe: HostBatch imports only `effect/*`, `CodecMade.ts` and `AuditEntry.ts` (type), so there is no cycle (madge counts type edges too, and the spike graph is clean). (2) D-14's "impossible pairs": a row item and a sequence break are possible together (a plain row at index 0 with a break among codec rows: the writer answers `EntryNotMadeByCodec`), so only pairs with `rowsNotList` and the two forms of one input are impossible. (3) D-17's claim that the pin "fails if `readonly` moves" is false: `readonly` on a `Data.TaggedEnum` case field is inert (variant V5 passes).

**Primary recommendation:** build `HostBatch.ts` exactly as spiked below (typed `ReadonlyArray<AuditEntry>` parameter, one `Array.from({ length })` read of the list, `filter(Predicate.isNotUndefined)` to the brand), call it as the first statement of the four entry points, import `admitRows` as a value in `ArchiveFacts.ts`, and write plan 1's characterisation from the literal tables in "Span and order facts".

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Admitting a host batch (order, finite `now`, terms, codec rows) | Package-private step module (`HostBatch.ts`) | — | One trust boundary, one place. Pure `Result`, no `Effect`. |
| "A row the codec made" question | `CodecMade.ts` (leaf, byte-identical) | — | `rowsRefusal` is the only reader of the `WeakSet`. The step consumes it. |
| Key-material check and write | `AuditArchive.ts` (`snapshotKeyMaterial`, writer) | `KeyMaterialSchema` shared with the reader | It is the writer's terms; it stays beside the schema the reader reuses. |
| Age rule and purge pass | `Retention.ts` | — | Both plans share one private age rule over one admitted batch. |
| Sequence facts and the one failure `SequenceIntegrityError` | `ArchiveFacts.ts` (`verifiedArchiveFacts`, takes `AdmittedRows`) | the pure `archiveFacts` (reader's) | The span `qadi.audit.verifySequenceIntegrity` opens only here, on admitted rows. |
| Public refusal enums and error classes | `ArchiveFacts.ts` and `Retention.ts` (unchanged tags/fields) | — | Public surface is frozen (ADMIT-03); only `NowNotFinite` is stated elsewhere (the fragment). |
| Wrapping a refusal as a typed failure | Each entry point | — | Writer/verify `Effect.fail(new ArchiveInputInvalid(...))`; plans `Result.fail(new RetentionInputInvalid(...))`. |

## Verification at HEAD (file:line, with drift corrected)

Every row was read this session at HEAD `b1d9043b`. CONTEXT's numbers all hold; the corrections are in the last column.

| Claim | Where | Verbatim quote | Drift |
|-------|-------|----------------|-------|
| `archiveAuditTrail` checks `now` itself | `packages/audit/src/AuditArchive.ts:184-187` [VERIFIED: AuditArchive.ts:184-187] | `if (!Number.isFinite(now)) {` / `const refusal = ArchiveInputRefusal.NowNotFinite({ value: now });` | none |
| Key material read once through `snapshotKeyMaterial` | `AuditArchive.ts:72-93`, called `:190-194` [VERIFIED: AuditArchive.ts:72-93] | `const snapshot = snapshotKeyMaterial(options?.keyMaterial);` | none |
| Rows asked in the child span | `AuditArchive.ts:195` [VERIFIED] | `const facts = yield* verifiedArchiveFacts(entries);` | none |
| Writer is `Effect.fn("qadi.audit.archiveAuditTrail")` | `AuditArchive.ts:179` [VERIFIED] | `export const archiveAuditTrail = Effect.fn("qadi.audit.archiveAuditTrail")(function* (` | none |
| Reader reuses `archiveFacts` | `AuditArchive.ts:386` [VERIFIED] | `const facts = archiveFacts(entries);` | none |
| `ArchiveInputRefusal` flat intersection | `ArchiveFacts.ts:139-145`; `NowNotFinite` at 141; const `:148` [VERIFIED: ArchiveFacts.ts:139-148] | `NowNotFinite: { readonly value: unknown };` | none |
| `verifiedArchiveFacts` | `ArchiveFacts.ts:177-189` [VERIFIED] | `export const verifiedArchiveFacts = Effect.fn("qadi.audit.verifySequenceIntegrity")(function* (` / `const refused = rowsRefusal(entries);` (180) / `const facts = archiveFacts(entries);` (184) | none |
| Public verify is unnamed | `ArchiveFacts.ts:208-210` [VERIFIED] | `export const verifySequenceIntegrity = Effect.fn(function* (entries: ReadonlyArray<AuditEntry>) {` | none |
| `rowsRefusal` import | `ArchiveFacts.ts:30`, `Retention.ts:28` [VERIFIED] | `import { rowsRefusal } from "./CodecMade.ts";` | none |
| `RetentionInputRefusal` | `Retention.ts:49-54`; `NowNotFinite` at 51; const `:57` [VERIFIED] | `NowNotFinite: { readonly value: unknown };` | none |
| `planRetention` | `Retention.ts:96-123`; now `:101-104`, maxAge `:105-108`, rows `:109-112`, age rule `:115-121` [VERIFIED] | `if (!(policy.maxAgeMs >= 0)) {` (105) / `const refusal = rowsRefusal(entries);` (109) / `if (now - entry.record.at > policy.maxAgeMs) {` (116) | none |
| `planPurge` maps the plan and re-iterates raw rows | `Retention.ts:165-197`; `:171`, `:177` [VERIFIED] | `Result.map(planRetention(entries, policy, now), (age) => {` (171) / `for (const entry of entries) {` (177) | none |
| `CodecMade.ts` fragment and question | `CodecMade.ts:44-49` and `:63-71` [VERIFIED] | `export const rowsRefusal = (entries: unknown): RowsRefusal \| undefined => {` / `if (!Array.isArray(entries)) {` / `const index = entries.findIndex(` | none |
| `AuditEntry` nominal idiom | `AuditEntry.ts:94-105` [VERIFIED] | `declare private readonly nominal: never;` (102) / `export type { AuditEntry };` (105) | none |
| `Number.isFinite` occurs in `src` only at the two `now` checks | `AuditArchive.ts:184`, `Retention.ts:101` [VERIFIED: grep this session; `SinkOptionChecks.ts:40` is `Duration.isFinite`, a different token] | — | The judge must match the token `Number.isFinite(` exactly. |
| `rowsRefusal(` is called in `src` only at `ArchiveFacts.ts:180` and `Retention.ts:109` | [VERIFIED: grep] | — | The definition `rowsRefusal = (` is not a call; a judge must blank comments (`CodecMade.ts` mentions the name in docs). |
| Six order rows | `ForeignRows.test.ts:111`, `:156`, `:231`, `:359`, `:365`; `Retention.test.ts:139` [VERIFIED: grep -n of the `it(` lines] | titles quoted in "Test-removal audit" | none |
| Span-name tests | `AuditArchive.test.ts:41-58`, `:60-77` [VERIFIED] | `assert.deepStrictEqual(names, ["qadi.audit.verifySequenceIntegrity"]);` (76) | none |
| `stryker.audit.mjs` | `ignoreStatic: true`; `mutate` is `packages/audit/src/**/*.ts` minus `index.ts`; `thresholds: { high: 90, low: 80, break: 80 }`; `timeoutMS: 20000` [VERIFIED: stryker.audit.mjs] | — | none |
| Revisions at HEAD | ADR-QD-190 `1.6`, ADR-QD-110 `1.3`, `spec/README.md` `1.414`, `spec/traceability.md` `1.333`, `spec/invariants.md` `1.233` [VERIFIED: `> \| Revision` rows] | — | CONTEXT is right (190: 1.6 to 1.7; 110: 1.3 to 1.4). |
| Last INV is 422; last BEH of the file is 722 | `invariants.md:4928` is `## INV-QD-422`; `33-audit-pipeline.md:1208` is `## BEH-QD-722` [VERIFIED] | — | New ids go after these. |

Other facts used below: `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `verbatimModuleSyntax: true`, `strict: true` [VERIFIED: tsconfig.base.json:18-30]; `.oxlintrc.json` sets `no-explicit-any: error`, with one file-scoped override that is not ours [VERIFIED: .oxlintrc.json].

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| effect | 4.1.2 | `Data.TaggedEnum`, `Data.taggedEnum`, `Result`, `Predicate`, `Effect.fn`, `Tracer` | The package's runtime; `[VERIFIED: node_modules/effect/package.json "version"]` |
| vitest | 5.1.0 | Test runner, project name `audit` | `packages/audit/vitest.config.ts` has `name: "audit"` |
| @effect/vitest | 4.1.2 | `it.effect`, `assert`, `describe` | Repo-wide test idiom |
| fast-check | 4.10.2 | The order property over fault subsets | Already a devDependency of `packages/audit` (`/usr/bin/grep -c fast-check packages/audit/package.json` is 1) |
| tstyche | 7.2.5 | `HostBatch.tst.ts` (compiled under TypeScript 6.0.3 per its own banner) | `pnpm test:tstyche` runs it twice, once per tsconfig |
| @stryker-mutator/core | 10.1.1 | Mutation base and close | `stryker.audit.mjs` |
| madge | 8.0.0 | `pnpm circular` | Counts type-only imports as edges |
| typescript | 7.0.2 (repo), 6.0.3 (tstyche's) | `pnpm typecheck` | Two compilers read the same tests: write tests that pass on both |

### Supporting
None. The phase adds no dependency, no package and no export.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| A branded class `AdmittedRows` holding a fresh array | Brand the array type itself | Needs an `as` to mint (D-09, rejected). |
| `Array.from({ length: list.length }, (_, i) => list[i])` | `Array.from(list)`, `[...list]`, `list.slice()`, `list.map` | Measured below: each reads a method or `Symbol.iterator` the host's object can override. Only the `{ length }` form reads `length` once and each index once and nothing else. |
| `filter(Predicate.isNotUndefined)` to narrow the snapshot | `as ReadonlyArray<AuditEntry>` | The cast is forbidden (`no-type-assertion`). The filter is one EQUIVALENT mutant (see "Mutation base"). |

**Installation:** none. **Version verification:** the table was read from `node_modules/*/package.json` this session.

## Package Legitimacy Audit

No package is installed or added by this phase. `slopcheck`-style verification is not applicable; the stack above is the repository's own lockfile-pinned set.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
host call ───────────────────────────────────────────────────────────────────────────────
  archiveAuditTrail(entries, now, options)    verifySequenceIntegrity(entries)
  planRetention(entries, policy, now)         planPurge(entries, policy, now, archive)
        │                                             │
        │  FIRST STATEMENT (no span of the step's own)│
        ▼                                             ▼
  admitBatch({ now, terms, entries })           admitRows(entries)
        │  1 Number.isFinite(now)  ──refuse──► NowNotFinite { value }
        │  2 terms()  (once; not called on 1)  ──refuse──► KeyMaterial* | MaxAgeInvalid
        │  3 admitRows(entries)    (not read on 2)
        │       length once, each index once → fresh array
        │       rowsRefusal(fresh) ──refuse──► EntriesNotAList | EntryNotMadeByCodec
        │       new AdmittedRows(fresh)   (the only mint)
        ▼
  Result.fail(refusal) ──► caller wraps once:
        writer/verify: Effect.fail(new ArchiveInputInvalid({ refusal }))   (writer: inside its own span;
                                                                              verify: no span at all)
        plans:         Result.fail(new RetentionInputInvalid({ refusal }))
        │
  Result.succeed({ now, terms, rows: AdmittedRows })
        │
        ├─ writer ──► verifiedArchiveFacts(rows)   span qadi.audit.verifySequenceIntegrity (admitted rows only)
        │               archiveFacts(rows.entries) ──► SequenceIntegrityError | facts ──► bundle(now, terms, facts)
        ├─ verify ──► verifiedArchiveFacts(rows)   (same span, the only one)
        └─ plans  ──► ageRule(admitted)  (one private rule, maxAgeMs is the value checked)
                      planPurge: archive pass over admitted.rows.entries (never the raw list)
```

### Recommended Project Structure
```
packages/audit/src/
├── HostBatch.ts        # NEW: NowRefusalCases, AdmittedRows (type only), DatedBatch, AdmittedBatch, admitRows, admitBatch
├── CodecMade.ts        # UNCHANGED (byte-identical): rowsRefusal, RowsRefusalCases
├── ArchiveFacts.ts     # ArchiveInputRefusal = fragments + own; verifiedArchiveFacts(rows: AdmittedRows); verify calls admitRows
├── AuditArchive.ts     # writer calls admitBatch first; snapshotKeyMaterial stays
├── Retention.ts        # RetentionInputRefusal = fragments + own; maxAgeOf; private ageRule; both plans admit first
└── SequenceIntegrity.ts# UNCHANGED (two re-exports)
packages/audit/test/
├── AdmissionOrder.characterisation.test.ts   # NEW plan 1, green on the base
├── HostBatch.test.ts                         # NEW, RED before HostBatch.ts exists
├── HostBatch.tst.ts                          # NEW, positive pins and not.toBeAssignableTo only
├── hostBatchFaults.ts                        # NEW shared fault table for the per-entry-point rows
├── ForeignRows.test.ts                       # DECLARED edits (5 rows out, one describe in)
└── Retention.test.ts                         # DECLARED edit (1 row out)
```

### Prescriptive module API (spiked: compiled, d.ts-clean, tstyche-clean, house-style-clean, madge-clean)

The first block is the file as I built and ran it in scratch (typed parameter). The deviation from D-07's `unknown` parameter is explained under Open Question 2.

```ts
// packages/audit/src/HostBatch.ts (package-private; out of index.ts)
import * as Data from "effect/Data";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import type { AuditEntry } from "./AuditEntry.ts";
import { rowsRefusal } from "./CodecMade.ts";
import type { RowsRefusalCases } from "./CodecMade.ts";

export type NowRefusalCases = {
  readonly NowNotFinite: { readonly value: unknown };
};
type NowRefusal = Data.TaggedEnum<NowRefusalCases>;
type RowsRefusal = Data.TaggedEnum<RowsRefusalCases>;
const { NowNotFinite } = Data.taggedEnum<NowRefusal>();

class AdmittedRows {
  declare private readonly nominal: never;
  readonly entries: ReadonlyArray<AuditEntry>;
  constructor(entries: ReadonlyArray<AuditEntry>) {
    this.entries = entries;
  }
}
export type { AdmittedRows };

export interface DatedBatch<Terms, Refused> {
  readonly now: number;
  readonly terms: () => Result.Result<Terms, Refused>;
  readonly entries: ReadonlyArray<AuditEntry>;
}
export interface AdmittedBatch<Terms> {
  readonly now: number;
  readonly terms: Terms;
  readonly rows: AdmittedRows;
}

// One read of `length` and one read of each index, nothing the host's object can override.
const takeRows = (list: ReadonlyArray<AuditEntry>): Array<AuditEntry | undefined> =>
  Array.from({ length: list.length }, (_, index) => list[index]);

export const admitRows = (
  entries: ReadonlyArray<AuditEntry>,
): Result.Result<AdmittedRows, RowsRefusal> => {
  const taken = Array.isArray(entries) ? takeRows(entries) : entries;
  const refusal = rowsRefusal(taken);
  if (refusal !== undefined) {
    return Result.fail(refusal);
  }
  return Result.succeed(new AdmittedRows(taken.filter(Predicate.isNotUndefined)));
};

export const admitBatch = <Terms, Refused>(
  batch: DatedBatch<Terms, Refused>,
): Result.Result<AdmittedBatch<Terms>, NowRefusal | Refused | RowsRefusal> => {
  if (!Number.isFinite(batch.now)) {
    return Result.fail(NowNotFinite({ value: batch.now }));
  }
  const terms = batch.terms();
  if (Result.isFailure(terms)) {
    return Result.fail(terms.failure);
  }
  const rows = admitRows(batch.entries);
  if (Result.isFailure(rows)) {
    return Result.fail(rows.failure);
  }
  return Result.succeed({ now: batch.now, terms: terms.success, rows: rows.success });
};
```
[VERIFIED: scratch spike, `tsc` declaration output this session: `declare class AdmittedRows { private readonly nominal; readonly entries: ReadonlyArray<AuditEntry>; constructor(entries: ReadonlyArray<AuditEntry>); } export type { AdmittedRows };` and `export declare const admitBatch: <Terms, Refused>(batch: DatedBatch<Terms, Refused>) => Result.Result<AdmittedBatch<Terms>, NowRefusal | Refused | RowsRefusal>;`]

Call sites to write (not run end to end; each follows from the spike's types and the base code quoted above):

```ts
// ArchiveFacts.ts
import { admitRows } from "./HostBatch.ts";                       // a VALUE import (Open Question 1)
import type { AdmittedRows, NowRefusalCases } from "./HostBatch.ts";

export type ArchiveInputRefusal = Data.TaggedEnum<
  RowsRefusalCases &
    NowRefusalCases & {
      KeyMaterialNotAList: { readonly value: unknown };
      KeyMaterialItemRefused: { readonly index: number };
    }
>;

export const verifiedArchiveFacts = Effect.fn("qadi.audit.verifySequenceIntegrity")(function* (
  rows: AdmittedRows,
) {
  const facts = archiveFacts(rows.entries);
  if (facts.sequenceBreak !== undefined) {
    return yield* Effect.fail(new SequenceIntegrityError(facts.sequenceBreak));
  }
  return facts;
});

export const verifySequenceIntegrity = Effect.fn(function* (entries: ReadonlyArray<AuditEntry>) {
  const rows = admitRows(entries);
  if (Result.isFailure(rows)) {
    return yield* Effect.fail(new ArchiveInputInvalid({ refusal: rows.failure }));
  }
  yield* verifiedArchiveFacts(rows.success);
});
```

```ts
// AuditArchive.ts: the writer's first statement is the step; the bundle is built from what it admitted.
export const archiveAuditTrail = Effect.fn("qadi.audit.archiveAuditTrail")(function* (
  entries: ReadonlyArray<AuditEntry>,
  now: number,
  options?: ArchivalOptions,
) {
  const admitted = admitBatch({ now, terms: () => snapshotKeyMaterial(options?.keyMaterial), entries });
  if (Result.isFailure(admitted)) {
    return yield* Effect.fail(new ArchiveInputInvalid({ refusal: admitted.failure }));
  }
  const { now: createdAt, terms: keyMaterial, rows } = admitted.success;
  const facts = yield* verifiedArchiveFacts(rows);
  // ...the bundle, with createdAt, facts.* and the keyMaterial the step returned, as at AuditArchive.ts:197-206
});
```

```ts
// Retention.ts
export type RetentionInputRefusal = Data.TaggedEnum<
  RowsRefusalCases & NowRefusalCases & { MaxAgeInvalid: { readonly value: unknown } }
>;

/** The one read of `policy`: a policy that is not an object has no `maxAgeMs`, which is refused like `{}`. */
const maxAgeOf = (policy: RetentionPolicy): Result.Result<number, RetentionInputRefusal> => {
  const maxAgeMs = policy?.maxAgeMs;
  return maxAgeMs >= 0
    ? Result.succeed(maxAgeMs)
    : Result.fail(RetentionInputRefusal.MaxAgeInvalid({ value: maxAgeMs }));
};

const ageRule = (batch: AdmittedBatch<number>): RetentionPlan => {
  const retained: Array<AuditEntry> = [];
  const expired: Array<AuditEntry> = [];
  for (const entry of batch.rows.entries) {
    if (batch.now - entry.record.at > batch.terms) {
      expired.push(entry);
    } else {
      retained.push(entry);
    }
  }
  return { retained, expired };
};

export const planRetention = (entries: ReadonlyArray<AuditEntry>, policy: RetentionPolicy, now: number) => {
  const admitted = admitBatch({ now, terms: () => maxAgeOf(policy), entries });
  if (Result.isFailure(admitted)) {
    return Result.fail(new RetentionInputInvalid({ refusal: admitted.failure }));
  }
  return Result.succeed(ageRule(admitted.success));
};
// planPurge: the same first statement and the same ageRule, then the existing archive pass over
// `admitted.success.rows.entries` (never `entries`), returning the same four fields.
```

`maxAgeMs >= 0` with `NaN` is false (refused), `+Infinity` and `-0` are true (valid): the same set as base `!(policy.maxAgeMs >= 0)` [VERIFIED: Retention.ts:105 and the BEH-QD-253 text, "+Infinity is valid"]. Run `pnpm lint` on `policy?.maxAgeMs` (an optional chain on a non-nullable type); if the house rules object, spell it `Predicate.isObject(policy) ? policy.maxAgeMs : undefined`.

### Anti-Patterns to Avoid
- **A second `rowsRefusal` call anywhere in `packages/audit/src`.** The writer would ask twice; `verifiedArchiveFacts` takes `AdmittedRows` precisely so it does not.
- **Reading a host's list through anything but `length` and the index** (`Array.from(list)`, spread, `slice`, `map`, `findIndex`, `for … of`): each reads `Symbol.iterator`, `slice`, `map` or `constructor` and the base `findIndex`/`flatMap`/`toSorted`/`entries` chain is exactly the defect.
- **Building the brand with a cast** (`as AdmittedRows`): forbidden, and it voids INV-QD-423.
- **Putting `Effect.fn`/`Effect.gen` in `HostBatch.ts`**: a span would reopen the trace question and the `admission-step` judge refuses any `Effect.` call.
- **Restating `NowNotFinite:` as a member in any other `src` file.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Is this a row the codec made, and is it a list" | A second predicate or `instanceof AuditEntry` | `rowsRefusal` (`CodecMade.ts:63`) over the snapshot | A prototype can be imitated; the codec's `WeakSet` is the identity (ADR-QD-190). |
| Refusal enum constructors | Hand-built `{ _tag, value }` objects | `Data.taggedEnum<NowRefusal>()` in `HostBatch.ts` | Deep-equals the same member built by the public enums (measured below). |
| A nominal type | A `unique symbol` field or a cast | `declare private readonly nominal: never` on an unexported class + `export type { Class }` | The `AuditEntry` idiom; emits cleanly with no TS2883 (measured). |
| A once-only list read | An iterator or a method call over the host's list | `Array.from({ length }, (_, i) => list[i])` | The only form measured to read `length` once and each index once and nothing else. |
| An "optional terms" step | `terms?` and a branch | A thunk `() => Result` and `admitRows` for the no-terms caller | D-07: no hole in the input. |

**Key insight:** every defect here is a second read. The structural fix is that exactly one function reads the host's values, once, and everything after reads what that function kept.

## Runtime State Inventory

Not a rename or migration phase. None of the five categories apply: the phase changes no stored data, no registered service and no secret, and adds no build artifact beyond the usual `lib/` output. Nothing found; verified by reading D-01..D-24 (no string is renamed; one module is added).

## Probe evidence

Both probes ran on the base as scratch tests under `packages/audit/test` (deleted; copies in the session scratchpad). The values below are the printed output.

### Probe A: rows read more than once (D-12) - CONFIRMED

The proxy answers a codec row (`good`) on the first read of index `0` and `{ record: good.record, sequenceNumber: 1.5 }` afterwards.

```
PROBE A writer outcome SUCCESS
PROBE A bundle entry0 {"record":{"_tag":"Decision","version":2,"evaluationId":"good", ... },"sequenceNumber":1.5}
PROBE A reader REFUSED {"index":0,"refusal":{"message":"Expected an integer\n  at [\"sequenceNumber\"]","_tag":"Malformed"},"_tag":"EntryNotDecodable"}
PROBE A2 writer SUCCESS; reader REFUSED {"index":0,"refusal":{"message":"Expected no excess property\n  at [\"extra\"]","_tag":"Malformed"},"_tag":"EntryNotDecodable"}
PROBE A3 reverse writer {"refusal":{"index":0,"_tag":"EntryNotMadeByCodec"},"_tag":"ArchiveInputInvalid"} {"0":1,"findIndex":1,"length":1}
PROBE A planRetention expired 0 retained 1 retainedIsCodecRow false retainedAt 99999
PROBE A planPurge purge 0 retain 1 unarchived 1 retainIs-plain true
```
Reads on the base (one proxy of five rows; the plans three):
```
PROBE A writer reads {"0":4,"findIndex":1,"length":5,"flatMap":1,"constructor":"function Object() { [native code] }1","entries":1,"toSorted":1}
PROBE A verify reads {"0":4,"findIndex":1,"length":5,"flatMap":1,"constructor":"function Object() { [native code] }1","entries":1,"toSorted":1}
PROBE A planRetention reads {"0":2,"findIndex":1,"length":3,"Symbol(Symbol.iterator)":1}
PROBE A planPurge reads {"0":3,"findIndex":1,"length":5,"Symbol(Symbol.iterator)":2}
```
Verdict: **live defect in four functions.** The writer archives a bundle its own reader refuses (INV-QD-399 broken), and both plans return a row that is not the row the codec check saw. The changeset may name the INV-QD-399 fix. The RED row for D-18 is "an index read once flips: the admitted rows hold the row that was checked".

### Probe B: `maxAgeMs` reads and a non-object policy (D-12) - PARTLY CONFIRMED

```
PROBE B planRetention(null) THREW TypeError Cannot read properties of null (reading 'maxAgeMs')
PROBE B planPurge(null) THREW TypeError Cannot read properties of null (reading 'maxAgeMs')
PROBE B planRetention(undefined) THREW TypeError Cannot read properties of undefined (reading 'maxAgeMs')
PROBE B planPurge(undefined) THREW TypeError Cannot read properties of undefined (reading 'maxAgeMs')
PROBE B planRetention(1) RETURNED Failure {"_tag":"MaxAgeInvalid"}      (same for planPurge, "x" and {})
PROBE B planRetention maxAgeMs reads, rows 0 = 1   (planPurge the same)
PROBE B planRetention maxAgeMs reads, rows 1 = 2
PROBE B planRetention maxAgeMs reads, rows 3 = 4
PROBE L plan refused now: maxAgeMs reads 0 rows {}
PROBE L plan refused maxAge: maxAgeMs reads 2 rows {}
```
Verdict: only `null` and `undefined` are the defect (a primitive already answers `MaxAgeInvalid`, so D-12's "or a primitive" is a preserved row, green on the base). The read count is `1 + n` for a valid policy and `2` on a refusal. The RED row must read **at least two rows** and assert exactly one read (base: 3; after: 1), plus one read on a refused policy (base: 2).

## Spike evidence

All four spikes ran in scratch files that are deleted. Texts are the printed output.

### S1. The brand (D-09): positive twin, nominal check, d.ts

`HostBatch.tst.ts`-style pins (`not.toBeAssignableTo` only) passed under both tstyche passes (`tsconfig.tstyche.json` and `tsconfig.test.json`): `Tests: 6 passed, Assertions: 20 passed` in each. Seen failing:

- **V6, `nominal` removed from the class:** `fail … × the brand` / `Error: Type '{ readonly entries: readonly AuditEntry[]; }' is assignable to type 'AdmittedRows'.` / `Error: Type 'OtherAdmittedRows' is assignable to type 'AdmittedRows'.` (`OtherAdmittedRows` is a structurally identical class declared in another module, so the pin proves the brand is nominal and not merely structural.)
- **V4, `verifiedArchiveFacts` takes `{ entries }`:** `Error: Type '{ readonly entries: readonly AuditEntry[]; }' is not the same as type 'AdmittedRows'.`
- **V4b, takes `ReadonlyArray<AuditEntry>`:** `Error: Type 'readonly AuditEntry[]' is not the same as type 'AdmittedRows'.`

`tsc` with declaration emit and `madge --circular` over the scratch graph were clean (the d.ts is quoted above; no TS2883).

### S2. The fragment (D-11) and the pin (D-17)

On the fragment form, `ArchiveInputRefusal` and `RetentionInputRefusal` `toBe` their spelled member sets and `toBe` `Data.TaggedEnum<RowsRefusalCases & NowRefusalCases & {own}>`, and `Extract<…, { _tag: "NowNotFinite" }>` is one type across both enums and `Data.TaggedEnum<NowRefusalCases>` (the same pins pass on the base for the spelled sets). Seen failing:

- **V1, `value: number` in `NowRefusalCases`:** `fail … × fragment enums equal spelled members (positive)` `× public enums equal fragments plus own (positive)` / `Error: Type '{ readonly _tag: "NowNotFinite"; readonly value: number; } | { readonly _tag: "KeyMaterialNotAList"; readonly value: unknown; } | … is not the same as type '{ readonly _tag: "NowNotFinite"; readonly value: unknown; } | …'.` (4 errors, archive and retention, both pins).
- **V2, `KeyMaterialItemRefused` dropped from the archive's own cases:** `Tests: 2 failed, 4 passed` / `Error: Type '{ … "KeyMaterialNotAList" … } | { … "EntriesNotAList" … } | { … "EntryNotMadeByCodec" … }' is not the same as type '{ … "KeyMaterialNotAList" … } | { readonly _tag: "KeyMaterialItemRefused"; readonly index: number; } | …'.`
- **V3, `NowNotFinite` restated in retention's own cases with `value: string`:** `Tests: 2 failed, 4 passed` / `Error: Type '{ readonly _tag: "NowNotFinite"; readonly value: unknown; }' is not the same as type '{ readonly _tag: "NowNotFinite"; readonly value: string; }'.` (the "shared members are one type" pin is the one that catches this).
- **V5, `readonly` dropped from `NowRefusalCases`:** `pass … Tests: 6 passed, Assertions: 20 passed`. **`readonly` on a `Data.TaggedEnum` case field is inert**, so D-17's "fails if `readonly` moves" is not true and no scratch variant for it can be seen failing. State the pin as "fails if a member, a tag or a field type moves" and drop `readonly` from the claim (decided autonomously, see the addendum).

Equality of the constructors across modules, measured: `Equal.equals(NowNotFinite(...), ArchiveInputRefusal.NowNotFinite(...))` and the same for `RetentionInputRefusal` and `assert.deepStrictEqual(h, a)` held for `NaN`, `"1"`, `undefined`, `1n` (`PROBE D11 equal-check done`), so no mapping is needed (ADR-QD-190 decision 5 stands).

### S3. The once-only read (D-12): which read, measured

Counting proxy over a two-element array, reads by property:

```
Array.from(list)                         {"0":1,"1":1,"Symbol(Symbol.iterator)":1,"length":3}
[...list]                                {"0":1,"1":1,"Symbol(Symbol.iterator)":1,"length":3}
list.slice()                             {"0":1,"1":1,"slice":1,"length":1,"constructor":"function Object() { [native code] }1"}
list.map(x => x)                         {"0":1,"1":1,"map":1,"length":1,"constructor":"function Object() { [native code] }1"}
Array.from({length: l.length}, (_, i) => l[i])   {"0":1,"1":1,"length":1}
```
Only the last reads `length` once and each index once and nothing else. In the built `admitRows` (0, 1 and 3 rows): `PROBE D12 n 0 reads {"length":1} admitted`, `n 1 reads {"0":1,"length":1}`, `n 3 reads {"0":1,"1":1,"2":1,"length":1}`; a hole: `PROBE D12 hole {"index":1,"_tag":"EntryNotMadeByCodec"}` (a hole reads as `undefined` and is refused at its index, as on the base). The flipping proxy is admitted as the row that was checked (`r.entries[0] === good`, one read), and the admitted array is fresh (`assert.notStrictEqual(r.entries, list)`, `deepStrictEqual` equal).

Cost note (measured): `Array.from({ length })` over a sparse array of `3e7` holes took 779 ms; the base `findIndex` returns at the first hole in 0.035 ms. See Security Domain.

### S4. Laziness and order of the built step

`terms` is not called on a refused `now` (`calls === 0`), is called once on an admitted one (`calls === 1`, `-0` admitted), and rows are not read on refused terms (`PROBE D11 terms before rows {"value":1,"_tag":"KeyMaterialNotAList"}` with a `null` rows list).

## Span and order facts (literal tables, measured on the base)

Collector: the `Tracer.make` name list of `AuditArchive.test.ts:41-58`. `good` is a codec row; "row item" is a plain row at index 0; "break" is codec rows numbered 1 and 5.

### Which refusal wins (every possible pair)

Writer (`archiveAuditTrail`), base = flat tag of the failure:

| Faults | Winner |
|--------|--------|
| now (NaN) alone | `NowNotFinite` |
| key material not a list alone | `KeyMaterialNotAList` |
| key-material item alone | `KeyMaterialItemRefused` |
| rows not a list alone | `EntriesNotAList` |
| row item alone | `EntryNotMadeByCodec` |
| break alone | `SequenceIntegrityError` |
| now + each of {kmNotList, kmItem, rowsNotList, rowItem, break} | `NowNotFinite` (5 rows) |
| kmNotList + {rowsNotList, rowItem, break} | `KeyMaterialNotAList` (3 rows) |
| kmItem + {rowsNotList, rowItem, break} | `KeyMaterialItemRefused` (3 rows) |
| row item (plain at 0) + break (among the codec rows) | `EntryNotMadeByCodec` |

`planRetention` and `planPurge` give the same winner on every row (measured as `X / X`):

| Faults | Winner |
|--------|--------|
| now + {maxAgeMs NaN, maxAgeMs -1, rowsNotList, rowItem} | `NowNotFinite` (4 rows) |
| maxAgeMs {NaN, -1} + {rowsNotList, rowItem} | `MaxAgeInvalid` (4 rows) |
| rowsNotList alone | `EntriesNotAList`; row item alone: `EntryNotMadeByCodec` |

Public verify and `verifiedArchiveFacts` called directly (both measured): rows not a list `EntriesNotAList`; row item `EntryNotMadeByCodec`; break `SequenceIntegrityError`; row item + break `EntryNotMadeByCodec`.

**Impossible pairs, to be named in the file:** `kmNotList × kmItem` and `maxAgeMs NaN × maxAgeMs -1` (two forms of one input), `rowsNotList × rowItem` and `rowsNotList × break` (a value that is not a list has no rows to hold either). `rowItem × break` is **possible** (CONTEXT said a break needs codec rows; it does, but they are the other rows).

### Spans on each outcome (base, measured)

| Call | Outcome | Spans opened |
|------|---------|--------------|
| writer | now refused | `["qadi.audit.archiveAuditTrail"]` |
| writer | kmNotList / kmItem refused | `["qadi.audit.archiveAuditTrail"]` |
| writer | rowsNotList / rowItem / break / row item + break | `["qadi.audit.archiveAuditTrail","qadi.audit.verifySequenceIntegrity"]` |
| writer | success | `["qadi.audit.archiveAuditTrail","qadi.audit.verifySequenceIntegrity"]` |
| public verify | rowsNotList / rowItem / break / success | `["qadi.audit.verifySequenceIntegrity"]` |
| `verifiedArchiveFacts` direct | rowsNotList / rowItem / break / success | `["qadi.audit.verifySequenceIntegrity"]` |
| `planRetention`, `planPurge` under the collector in `Effect.sync` | any | `[]` |

After the phase (derived from the structure and the base facts; plan 1's flipped rows will measure them): writer rows refused or break: the break row keeps both spans, **rows refused opens only `["qadi.audit.archiveAuditTrail"]`** (flip a); public verify refused: `[]` (flip b: an unnamed `Effect.fn` opens no span of its own, proven by the base's success trace being exactly one span); `verifiedArchiveFacts` direct: only reached with admitted rows, so its tests go through `admitRows`.

### Laziness (base, measured)

`refused now reads keyMaterial 0`; `refused keyMaterial reads rows {}`; `refused now reads rows {}`; `plan refused now: maxAgeMs reads 0 rows {}`; `plan refused maxAge: maxAgeMs reads 2 rows {}` (after: 1, and 0 on a refused now).

## Mutation base

Invocation actually run (stdin closed, nothing else running), full package for the five files, 27 s:

```
pnpm exec stryker run stryker.audit.mjs --mutate packages/audit/src/AuditArchive.ts,packages/audit/src/ArchiveFacts.ts,packages/audit/src/Retention.ts,packages/audit/src/CodecMade.ts,packages/audit/src/SequenceIntegrity.ts
```
`Instrumented 5 source file(s) with 232 mutant(s)`; `Initial test run succeeded. Ran 490 tests`; `All files | 100.00 | 100.00 | 212 killed | 0 survived | 0 no cov`. The report's `config` records `ignoreStatic: true`, `disableBail: false`, and that exact `mutate` list. Close with the same string plus `,packages/audit/src/HostBatch.ts`.

| File | Mutants | Killed | Ignored (static) | Score |
|------|---------|--------|------------------|-------|
| `ArchiveFacts.ts` | 59 | 55 | 4 (ArrowFunction `() => undefined` L61; StringLiteral `""` L158, L162, L177) | 100.00 |
| `AuditArchive.ts` | 96 | 82 | 14 | 100.00 |
| `Retention.ts` | 59 | 57 | 2 (StringLiteral `""` L66; ArrowFunction `() => undefined` L165) | 100.00 |
| `CodecMade.ts` | 18 | 18 | 0 | 100.00 (held: must not drop) |
| `SequenceIntegrity.ts` | 0 | — | — | no mutants (two re-exports); the held-file evidence for it is its byte identity |

`AuditArchive.ts` Ignored: ObjectLiteral `{}` at L54, L321, L323, L332, L335; StringLiteral `""` at L136, L179, L254, L332 (twice); ArrayDeclaration `[]` L332; ArrowFunction `() => undefined` at L336, L337, L341. `UNMEASURED` is empty (every touched file is under the glob).

**The new module, measured on the scratch spike with my throwaway tests:** 23 mutants: 1 Ignored (ArrowFunction `() => undefined` on `takeRows`, a static module-scope arrow: the 87/88 `EXAMINED` entry, to be run by hand with `ignoreStatic: false` and seen Killed by a test that asserts the admitted rows), and survivors that were gaps in the scratch tests, not in the design: `ConditionalExpression -> false` and `BlockStatement -> {}` at the terms-failure branch, `ConditionalExpression -> false` at the rows-failure branch (+ one `NoCoverage` on its block), `ObjectLiteral -> {}` on the `NowNotFinite({ value })` argument (no test read the `value`) and on the success object (no test read `now`/`terms`/`rows`). The real `HostBatch.test.ts` kills these by asserting the `value`, `now`, `terms` and `rows` of every outcome and the refused-terms and refused-rows branches. **One genuine equivalent:** `MethodExpression -> taken` on `taken.filter(Predicate.isNotUndefined)`. After `rowsRefusal` passes no element is `undefined` (a hole is refused), so dropping the filter returns an equal list; its only effect is typing. Record it as an `EQUIVALENT` entry (`file`, `mutatorName` `MethodExpression`, `replacement` `taken`, the trimmed line text, reason "a hole is refused before this line, so no element is undefined and the filter only narrows the type"). Decided autonomously: this is cleaner than a cast.

Touched-file rule at close: the score of each touched file must not fall below 100.00; the `MOVED` note names the two `now` checks (to `HostBatch.ts`) and the rows wrap (to `admitRows`). Phase 91's base is `ArchiveFacts.ts`'s post-review score, written into `89-mutation-close.json`.

## Earlier-checks measured ledger

Run at HEAD from scratch copies (`89-earlier-checks.mjs` pattern; the archived scripts' path constants are not edited). Every result below is the measured exit and the line the script printed.

| Check | Exit | Line / reason |
|-------|------|----------------|
| 85-check `base`, `scan-forbidden`, `trailers`, `no-react-in-model`, `three-predicates`, `panel-decides-nothing`, `frame-reads-status`, `records`, `records --close`; 85-pinned | 0 | as 88's ledger (`trailers: 33 plan commits…`, `pinned: 18 files hold their base text, 1 of 1 born files held, 1 of 1 declared edits applied`) |
| 85-check `scan-ids` | 1 | `packages/devtools/test/model/DiagnosticsFeed.stop.test.ts:35 has phase-relative wording: /** The status tag of every notification a feed publishes from now on, in order. */` (the phase-87 line the 88 ledger already carries) |
| 86-check `base`, `scan-forbidden`, `trailers`, `owner-shape`, `provider-forwards-only`, `records`, `records --close`; 86-pinned | 0 | `pinned: 59 files hold their base text, 1 of 1 born files held` |
| 86-check `scan-ids` | 1 | the same single line |
| 87-check `base` … `records --close` (13 modes) | 0 | `trailers: 100 commits since phase_base, each with the one trailer` etc. |
| 87-pinned-check | 1 | `packages/devtools/test/helpers.ts: differs from its base text at line 14` (phase 88's declared edit to that file; already in 88's ledger) |
| the four `--self-test`s per phase | 0 | 85: 245/37/57/17, 86: 262/18/64/21, 87: 301/35/103/21 passed |
| 88-check `records --close` | (predicted 1) | See below |

`records --close` is revision-sensitive in 88 only: its `judgeClosed` requires README, traceability, invariants, `28-devtools-screens.md` and ADR-QD-197 to be exactly one revision above 88's `phase_base` (`is.minor !== was.minor + 1`) [VERIFIED: 88-check.mjs `judgeClosed` revision loop]. At HEAD: README 1.413 to 1.414, traceability 1.332 to 1.333, invariants 1.232 to 1.233 (all one above 88's base, so it passes today). Phase 89 revises README, traceability and invariants again, so after it **88's `records --close` is expected to report three lines** (one per document, naming Revision 1.415, 1.334 and 1.234 against the expected 1.414, 1.333, 1.233), explained by the Phase 89 records commit. 85's, 86's and 87's `records --close` are not revision-sensitive to these documents (85: no revision rule; 86: only ADR-QD-195 at 1.4; 87: the six `AMENDED_DECISIONS` ADRs 047, 150, 182, 192, 194, 196). Phase 89 touches none of those ADRs, so they stay green.

Other 88 modes that scan all non-`.planning` added lines since 88's `phase_base` (`scan-ids`, `scan-forbidden`, `judgeGuards`) will see Phase 89's added audit lines: they pass as long as the Phase 89 source, tests and spec avoid the forbidden forms and the phase-relative wording (D-20's `scan-ids` patterns are a superset). `judgeGuards` fails on any guard file that differs from 88's base ("no budget moves"); Phase 89 moves no budget, rule or house-style table, so it stays green. 88-pinned-check and 88's `box-keys-itself`/`ledger-module` read devtools files only.

**Expected ledger for `89-earlier-checks.mjs` (decided):** the 85/86 `scan-ids` set (one line) and 87-pinned (one line) as 88 recorded, plus 88's `records --close` three revision lines, each tagged with the Phase 89 records commit that explains it. Everything else exits 0 with the lines above. The CONTEXT's "expected empty" is wrong in this one place.

## Script porting (the 88 scripts to the 89 scripts)

Port by copy into `.planning/phases/QD-89-…/`, each keeping its `--self-test` and each new mode seen failing once (WX-06). Source: `.planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-{check,pinned-check,mutation,earlier-checks}.mjs` and `88-mutation-base.json`.

| 88 piece | 89 form |
|----------|---------|
| `88-check.mjs` modes `base commit unchanged seen-failing vitest suite scan-ids scan-forbidden trailers records --self-test` | Keep. `vitest` and `suite` run `--project audit` (the 88 `spawnSync` uses `--project devtools`; change the literal). `suite`'s base-test list is `git ls-tree -r --name-only <base> -- packages/audit/test` filtered to `.test.ts`. |
| `box-keys-itself`, `ledger-module` | Replace with `admission-step` and `entry-points-first` (D-20). Reuse `blank`, `topLevel`, `importsOf` (it reads every `import`/`export … from`, with `as` read by source name) and `sourceFiles`. The `admission-step` import rule is: `HostBatch.ts` imports exactly `effect/Data`, `effect/Predicate`, `effect/Result`, `./AuditEntry.ts` (type) and `./CodecMade.ts`; the "ArchiveFacts imports it type-only" clause is **dropped** (Open Question 1) and replaced by "`HostBatch.ts` imports no sibling that imports it back" (no cycle). `Number.isFinite(` and `rowsRefusal(` are matched on comment-and-string-blanked text. |
| `judgeIds` `scan-ids` | Add `ADMIT-0\d`, `89-\d{2}`, `QD-89`, `Phase 89` (D-20). Keep the existing patterns. |
| `judgeClosed` (`records --close`) | New: the BEH-QD-781..785 headings in `33-audit-pipeline.md` and their §1 rows (`covers` reads ranges, so `BEH-QD-721–722, BEH-QD-781–785` works), INV-QD-423/424 headings and §2 rows with the `**Source**:` naming `packages/audit/src/HostBatch.ts`, ADR-QD-202 file and `index.yaml` entry and §3 row, ADR-QD-190 at 1.7 and ADR-QD-110 at 1.4 each naming ADR-QD-202, the CCR-QD-481 row naming `ARCH-136` and `Unused:`, the three revised documents each one revision above `phase_base`, and one changeset `.changeset/audit-batch-admitted-once.md` starting with `---\n"@qadi/audit": patch\n---\n`. The 88 `addedChangesets` helper (diff `--diff-filter=A` plus untracked, excluding `README.md`) ports as is. |
| `88-pinned-check.mjs` | Held set: `git ls-tree -r --name-only <base> -- packages/audit/test` minus the declared files, plus `packages/audit/src/CodecMade.ts` and `packages/audit/src/SequenceIntegrity.ts` and `index.ts` (byte for byte). Declared: `ForeignRows.test.ts` (5 removed rows and the new `describe`), `Retention.test.ts` (1 row). Born: `AdmissionOrder.characterisation.test.ts` (held against its adding commit except its two declared regions), `HostBatch.test.ts`, `HostBatch.tst.ts`, `hostBatchFaults.ts`. Use the 88 region mechanism (`from`/`to` anchors, each occurring once at the base, text between held byte for byte). |
| `88-mutation.mjs` | Group `audit`: config `stryker.audit.mjs`, report `reports/mutation-audit/mutation.json`, files the five base files plus `HostBatch.ts` (born, judged absolutely by `judgeNew`) and a close judged against `89-mutation-base.json` for the touched three. `EQUIVALENT` holds the `filter` entry; `EXAMINED` holds the `takeRows` ArrowFunction entry. The audit config keeps `disableBail: false` at the base, so the base record's `invocation` field is the exact string above and the close uses it unchanged. |
| `88-earlier-checks.mjs` | Ledger rows for 85, 86, 87 and 88 as in the previous section, with 88's three `records --close` revision lines as one `set`-form row (`reasons: true`) explained by the 89 records commit. |

Scratch variants for each new mode (each seen failing once, text into `89-RED-EVIDENCE.md`): a second `rowsRefusal(` call in `ArchiveFacts.ts`; `NowNotFinite:` restated in `Retention.ts`; an `Effect.` call in `HostBatch.ts`; a bare `isFinite(`; `HostBatch.ts` added to `index.ts`; `planPurge` calling `planRetention`; a body whose first statement is not the step; `verifiedArchiveFacts`'s parameter typed `ReadonlyArray<AuditEntry>`.

## Spec amendments (anchors at HEAD, verbatim)

Mechanics: edit the body, then `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-26` (it bumps the minor and prepends the history entry mechanically; `--check` runs in `pnpm spec:verify`).

- **ADR-QD-202 (new)** `spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md`, Rev `1.0`, history `1.0 (2026-11-26): Initial (ARCH-136, CCR-QD-481)`. Layout to copy: ADR-QD-201's sections `## Context`, `## Decision`, `## Audit of the rows this decision edits` (the audit table), `## Alternatives considered`, `## Consequences`, `## What enforces it`, `## Related`. Add its entry to `spec/decisions/index.yaml` after `ADR-QD-201` (format: `  - id: "ADR-QD-202"` / `    file: …` / `    title: …` / `    status: "Accepted — amends ADR-QD-190 and ADR-QD-110"`).
- **ADR-QD-190** `spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md`, Rev `1.6` to `1.7`. Add `## Fourth amendment (2026-11-26, CCR-QD-481)` after the third (line 369). Also fix the text that says `verifiedArchiveFacts` asks: line 278 `2. **The functions that compute a fact from a host's rows ask.** \`verifiedArchiveFacts\` does, so \`archiveAuditTrail\`` and line 286 ("`ArchiveInputInvalid` is declared in `ArchiveFacts.ts`, which `verifiedArchiveFacts` needs") get a dated `>` note pointing to the amendment (history is not rewritten, per the house habit). `index.yaml` `status` becomes `"Accepted — amends ADR-QD-110 and ADR-QD-056; amended 2026-11-26 (ADR-QD-202: …)"`.
- **ADR-QD-110** `spec/decisions/110-an-archives-facts-are-computed-once.md`, Rev `1.3` to `1.4`. Anchor at line 38: "`and keeps the span \`qadi.audit.verifySequenceIntegrity\`.`" and the doc sentence in `ArchiveFacts.ts` "The span keeps the name it had before the facts were gathered here". Add a dated `>` note: the name is unchanged and the span now opens only for admitted rows. Lines 37, 46, 118, 136 name `verifiedArchiveFacts` and need no edit except line 136 ("`verifiedArchiveFacts` also refuses an entry the codec did not make") which gets the same `>` note.
- **BEH-QD-722** `spec/behaviors/33-audit-pipeline.md:1208` heading "The archive writer refuses a non-finite now and writes key material as declared": replace the flat ` ```ts ` listing (1213-1221) with `export type ArchiveInputRefusal = Data.TaggedEnum<RowsRefusalCases & NowRefusalCases & { KeyMaterialNotAList …; KeyMaterialItemRefused … }>` (signature, so ` ```ts `), keep `ArchiveInputInvalid`; the first three REQUIREMENTs (now / key material / rows, 1228-1252) keep the refusal values and replace the ordering clauses ("before it looks at the sequence facts", "after the `now` check and before it reads the entries", "after the `keyMaterial` check and before it computes any fact") with "in the order BEH-QD-781 states"; the "Pinned by" paragraph (1306) names `AdmissionOrder.characterisation.test.ts`, `HostBatch.test.ts`, `HostBatch.tst.ts` and the per-entry-point rows of `ForeignRows.test.ts`. The prose sentence "The check follows `now` and precedes the rows, in the order the inputs are read." stays true.
- **BEH-QD-253** (`:709`) and **BEH-QD-254** (`:773`): each gains a link `[BEH-QD-781](#beh-qd-781-…)` (BEH-254 already links BEH-722 at `:780`). Their REQUIREMENTs about `ArchiveInputInvalid`/`RetentionInputInvalid` keep their values.
- **BEH-QD-781..785** go after BEH-QD-722 (before the `---` / `_Previous:` footer at the end of `33-audit-pipeline.md`), each with `> **Invariant:**` and `> **See:**` lines and `REQUIREMENT:` blocks; the allocation is D-23's.
- **INV-QD-399** (`invariants.md`, `## INV-QD-399` at ~4624) **Source** line says "`verifiedArchiveFacts` refuses the first entry `CodecMade.ts` does not hold" and **INV-QD-400** (~4638) **Source** says "which `verifiedArchiveFacts` and `planRetention` read through `rowsRefusal`": both become false. Edit both to name `HostBatch.ts`'s `admitRows` and the admitted-rows brand, bump `invariants.md`'s revision once per document (one `spec-revise` entry covers the document), and keep `INV-QD-399`'s Enforcement list (`ForeignRows.test.ts`, `ArchiveRoundTrip.test.ts` …) true after the row removals (the property "the order `now`, `keyMaterial`, `entries`" now cites `HostBatch.test.ts`). `invariants.md:2474` ("fails on it through `verifiedArchiveFacts`, the same failure `archiveAuditTrail` raises") stays true.
- **INV-QD-423 and INV-QD-424** after `## INV-QD-422` (`invariants.md:4928`): each with `**Source**: \`packages/audit/src/HostBatch.ts\` …`, `**Implication**`, `**Enforcement**`, `**Related**` in the existing four-paragraph shape.
- **`spec/traceability.md`** (Rev 1.333): §1 row for file 33 (`:75`): `BEH-QD-721–722` becomes `BEH-QD-721–722, BEH-QD-781–785` and its source list names `HostBatch.ts`; §2 rows for INV-QD-423/424 and updated INV-QD-399/400 rows (`:289`, `:290`); §3 row for ADR-QD-202; §4 test file map: row `:852` (`ForeignRows.test.ts`) loses the removed-row descriptions it lists, row `:847` (`Retention.test.ts`) unchanged, and new rows for `AdmissionOrder.characterisation.test.ts`, `HostBatch.test.ts`, `HostBatch.tst.ts` (and `hostBatchFaults.ts` if the verify script requires a row for a helper; `88`'s close required one for each born test file and the ledger module). Run `pnpm spec:verify:strict`.
- **`spec/README.md`** (Rev 1.414): add the `CCR-QD-481` row after `CCR-QD-480` (`:417`) in the same format: date `2026-11-26`, the files with their new revisions, `ARCH-136`, and `Unused: none` (all five BEH and both INV are used).
- **`spec/overview.md`: unchanged.** `pnpm spec:api` is green and unchanged (942 exports); no export moves.
- **Changeset** `.changeset/audit-batch-admitted-once.md`, frontmatter `---\n"@qadi/audit": patch\n---\n` then D-24's sentences. Existing precedent: `.changeset/audit-entry-decoded-once.md` and `.changeset/devtools-stop-box-keys-itself.md`. A changeset may say "no longer" (the id scan exempts `.changeset/` for the phrase list but not for ids).

README of the package (`packages/audit/README.md:140-172`) describes the refusal members and says an invalid `now` fails "before the sequence check". Both stay true. The sentence at `:141-143` ("fails `ArchiveInputInvalid`, before the sequence check, because `createdAt` would be written as `null`") is still true; edit nothing unless a span or order sentence appears (grep found none).

## House-style traps (found or confirmed this session)

- **`no-type-assertion` fires on any `as` in a test**, including `as unknown as`, `(e as Error)`, `r.failure as { value?: unknown }` (my scratch tests tripped it seven times: `house-style: 7 violation(s)` then `643 file(s) clean` after removal). Use the `handedOver`/`host` helpers of `ForeignRows.test.ts:63-70` (`Reflect.get` on an `object` answers `any`), and read an error's field through `Match.tagsExhaustive` or `Reflect.get`.
- A counting `Proxy` needs a typed read, not a cast: build the proxy over `[...rows]` and pass it through `host(...)`.
- `Effect.fn` stays on the writer, the public verify and `verifiedArchiveFacts`; `HostBatch.ts` has none, and no new `Effect.fnUntraced` appears (`UNTRACED_BUDGET`).
- `no-numbering-placeholder`: reserve nothing with `next-id.mjs`; write the real ids only in spec files, never in `src`, tests or titles.
- `UNTRUSTED_DECODE_BUDGET`: `HostBatch.ts` has none of `onExcessProperty`, `exceedsJsonDepth`, `Schema.decode*`, `JSON.parse`. No row of that table moves.
- `MODULE_STATE_BUDGET`: no `let`/`var` at module scope in `HostBatch.ts`. The step's `const { NowNotFinite } = Data.taggedEnum<NowRefusal>()` is a `const`.
- `HAS_CUSTOM_BUDGET`, `SCHEMA_ERROR_BUDGET` (12), `ANY_BUDGET`, `SWITCH_BUDGET`: untouched. `Array.isArray(entries) ? takeRows(entries) : entries` is a conditional, not a `switch`.
- `NOT_CALLABLE_PIN_BUDGET`: `HostBatch.tst.ts` uses only positive pins and `not.toBeAssignableTo`; a pin on `admitBatch` itself (returns a plain `Result`) would be a bare negative pin counted by `[not-callable-pin]`, so do not write one.
- `ForeignRows.test.ts` and `Retention.test.ts` are listed in `PORT_DOUBLE_BUDGET`? No: the audit-port budgets count `AuditWriteError` hand construction; these files construct none. Not affected.
- Doc-comment shape: one-line summary of what the export is, then the why (ADR cites) in the paragraph after.
- `pnpm circular` is `madge --circular --extensions ts,tsx packages/*/src`; it counts type-only edges. The graph `ArchiveFacts → HostBatch → CodecMade`, `AuditArchive → ArchiveFacts, HostBatch`, `Retention → HostBatch, AuditArchive (type)` has no cycle.
- `tsconfig.base.json` has `noUncheckedIndexedAccess: true`: `list[index]` is `AuditEntry | undefined`, which is why `takeRows` returns `Array<AuditEntry | undefined>` and the filter is needed.

## Test-removal audit (D-16: tests removed: 6, properties lost: none)

| Removed row (file:line, title verbatim) | Property it held | Row that holds it after |
|-----------------|------------------|-------------------------|
| `ForeignRows.test.ts:111` "a non-finite now is refused before the rows are read" | `now` wins over a bad row (writer) | `HostBatch.test.ts` order table `now × row item` and `now × rows not a list`; the per-entry-point case in `ForeignRows.test.ts` |
| `ForeignRows.test.ts:156` "planRetention reads now and maxAgeMs before the rows" | `now` then `maxAgeMs` before rows (plan) | `HostBatch.test.ts` order table over stub terms; the plan cases of the per-entry-point `describe` |
| `ForeignRows.test.ts:231` "the inputs read before the rows are still read first" | `now`, key material, `maxAgeMs` each win over a rows-not-a-list | the same order table (`now × rows not a list`, `terms × rows not a list`) |
| `ForeignRows.test.ts:359` "now is read before the keys, and the keys before the rows" | `now` wins over a bad key item; a bad key item wins over a bad row | order table: `now × terms`, `terms × rows` |
| `ForeignRows.test.ts:365` "the rows are read after the keys the reader reads" | admitted key material then a bad row refuses the row | `HostBatch.test.ts` "admitted terms then a refused rows list" |
| `Retention.test.ts:139` "checks now before maxAgeMs" | `now` wins over `maxAgeMs` (plan) | order table `now × refused terms` |

Held unedited, as D-16 says: `ForeignRows.test.ts:115` "the rows are refused before a sequence break among them is looked for" and `:222` ("planPurge fails the same way, before the archive is asked"), plus `Retention.test.ts:227` ("refuses the same invalid input planRetention does"). Count: five of the six are the exact order rows D-16 lists at `111-113, 156-165, 231-245, 359-363, 365-367`, and the sixth is `Retention.test.ts:139-141`. The ADR-QD-202 audit table states "Tests removed: 6" and names these rows.

## Common Pitfalls

### Pitfall 1: Believing D-06's "type only"
**What goes wrong:** `ArchiveFacts.ts` cannot import `admitRows` as a type; the public verify calls it.
**How to avoid:** a value import; the `admission-step` judge checks no cycle instead. **Warning signs:** `TS1361: 'admitRows' cannot be used as a value because it was imported using 'import type'`.

### Pitfall 2: A typed `unknown` parameter on `admitRows`
**What goes wrong:** with `entries: unknown`, `Array.isArray` narrows to `any[]` and the not-a-list branch must restate `EntriesNotAList` (a second list question) or cast. **How to avoid:** the typed parameter of the spike (Open Question 2). **Warning signs:** a `EntriesNotAList` constructor in `HostBatch.ts`.

### Pitfall 3: Reading the list a second time "for the index"
**What goes wrong:** `rowsRefusal` over the host's list, then `new AdmittedRows(entries)` re-reads it, and the flip returns. **How to avoid:** `rowsRefusal(taken)` over the snapshot and `new AdmittedRows(taken.filter(…))`. **Warning signs:** the probe row "the proxied flipping list is admitted as what was checked" fails.

### Pitfall 4: The `findIndex` after the snapshot is fine; `rowsRefusal` is not the read
`rowsRefusal` calls `Array.isArray` and `findIndex` on its argument. On the snapshot (a real array, no host overrides) that is safe. **Do not** call it on the host's value anywhere.

### Pitfall 5: `planPurge` keeping the raw list
**What goes wrong:** the archive pass iterates `entries` (`Retention.ts:177`), so a flipped list changes what is purged after the age rule saw another. **How to avoid:** iterate `admitted.success.rows.entries`. The identity-keyed `new Set(age.expired)` still matches because the snapshot holds the same row objects, only in a new array. **Warning signs:** the scratch variant "planPurge re-reading the raw entries" survives the proxy row.

### Pitfall 6: Phase wording in tests and comments
The `scan-ids` judge refuses `ADMIT-0\d`, `89-\d{2}`, `QD-89`, `Phase 89`, D-numbers and phase-relative wording ("from now on", "no longer", "previously") in added `src` and `test` lines (the 87 line `from now on` is the one existing report). Titles name a property: "a refused batch opens no sequence span".

### Pitfall 7: Plan order and the characterisation file
The characterisation is committed green on the base with `verifiedArchiveFacts` rows over a raw list. The brand commit retypes that function, so its rows go through `admitRows`, a declared region of the file (D-14). Keep those rows in a clearly delimited `describe` so the declared region is one contiguous run of lines.

### Pitfall 8: Two Stryker ignored-static families
`takeRows` is a module-scope arrow, so its `() => undefined` mutant is Ignored under `ignoreStatic: true`. Run it by hand with `ignoreStatic: false` (a config copy spread, `--mutate packages/audit/src/HostBatch.ts`) and record the entry in `EXAMINED` only when seen Killed. The `NowNotFinite` constructor object (`const { NowNotFinite } = Data.taggedEnum<…>()`) may produce a static object-literal mutant too; examine it the same way.

### Pitfall 9: `maxAgeMs >= 0` on `undefined`
`undefined >= 0` is `false`, so a missing `maxAgeMs` is refused with `value: undefined`, the same as `{}` on the base. Preserve with a row for `{}`, `null`, `undefined`, `1`, `"x"` all giving `MaxAgeInvalid { value: undefined }`.

### Pitfall 10: tstyche compiles with TypeScript 6.0.3, `pnpm typecheck` with 7.0.2
A pin must hold on both. `Data.TaggedEnum` intersections printed identically under both in the spike. Do not rely on a compiler-specific error text in a title.

## Code Examples

### The order table at the step (shape; `HostBatch.test.ts`)
```ts
// Source: the measured tables above; test titles name properties, not ids.
const refusedTerms = (): Result.Result<string, ArchiveInputRefusal> =>
  Result.fail(ArchiveInputRefusal.KeyMaterialNotAList({ value: 1 }));
const goodTerms = (): Result.Result<string, ArchiveInputRefusal> => Result.succeed("terms");

it("a bad now wins over refused terms and a bad list, and terms is not called", () => {
  let calls = 0;
  const terms = () => {
    calls += 1;
    return refusedTerms();
  };
  const result = admitBatch({ now: Number.NaN, terms, entries: host(null) });
  assert.deepStrictEqual(Result.isFailure(result) ? { ...result.failure } : undefined, {
    _tag: "NowNotFinite",
    value: Number.NaN,
  });
  assert.strictEqual(calls, 0);
});
```

### The span reader (reuse of `AuditArchive.test.ts:41-58`)
```ts
// Source: packages/audit/test/AuditArchive.test.ts:41-58 (the collector the characterisation reuses)
const names: Array<string> = [];
const tracer = Layer.succeed(
  Tracer.Tracer,
  Tracer.make({
    span: (options) => {
      names.push(options.name);
      return new Tracer.NativeSpan(options);
    },
  }),
);
```

### The read counter (host helper, no cast)
```ts
const counting = (rows: ReadonlyArray<unknown>) => {
  const reads = new Map<string, number>();
  const proxy = new Proxy([...rows], {
    get(target, prop, receiver) {
      const key = typeof prop === "symbol" ? prop.toString() : prop;
      reads.set(key, (reads.get(key) ?? 0) + 1);
      return Reflect.get(target, prop, receiver);
    },
  });
  return { rows: host(proxy), reads };
};
```
(`host` is the `ForeignRows.test.ts` helper; the scratch version used a `Record<string, number>`, which the owner's rule forbids as a widening hack. A `Map` has none of that.)

### The type pin (shape; `HostBatch.tst.ts`)
```ts
import { expect, test } from "tstyche";
test("each public refusal is its fragments plus its own members", () => {
  expect<ArchiveInputRefusal>().type.toBe<ArchiveFragments>();
  expect<RetentionInputRefusal>().type.toBe<RetentionFragments>();
});
test("the shared member is one type", () => {
  expect<Extract<ArchiveInputRefusal, { _tag: "NowNotFinite" }>>().type.toBe<Data.TaggedEnum<NowRefusalCases>>();
});
test("rows the step did not admit are not admitted rows", () => {
  expect<ReadonlyArray<AuditEntry>>().type.not.toBeAssignableTo<AdmittedRows>();
  expect<Parameters<typeof verifiedArchiveFacts>[0]>().type.toBe<AdmittedRows>();
});
```
Each `not.toBeAssignableTo` needs its positive twin in the same file (`AdmittedRows` `toBeAssignableTo<{ readonly entries: ReadonlyArray<AuditEntry> }>`, as in the spike).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Each entry point checks its own batch | One admission step, one order | this phase | The order is tested once; `NowNotFinite` is declared once. |
| Rows asked by `findIndex`, then read again by facts | Snapshot read once, brand carries the checked array | this phase | Closes the INV-QD-399 defect. |
| `verifiedArchiveFacts(entries)` | `verifiedArchiveFacts(rows: AdmittedRows)` | this phase | "Facts from unadmitted host rows" does not compile. |

**Deprecated/outdated:** the "Live defect: no" line of the roadmap; D-06's "type only" clause; D-17's "readonly" claim; D-18's "3 or more reads for every input".

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | After the change an unnamed `Effect.fn` that fails before yielding opens no span (derived from the base's success trace being exactly one span, not run on the changed code). | Span facts | Plan 1's flipped RED rows measure it; a wrong derivation fails the plan's own row, not the user. |
| A2 | `policy?.maxAgeMs` on a non-nullable `RetentionPolicy` passes `oxlint` and `check-house-style` (not run; the typed form compiles under `tsc`). | Prescriptive API | Low: use `Predicate.isObject(policy) ? policy.maxAgeMs : undefined`. |
| A3 | The call-site assignability `NowRefusal | ArchiveInputRefusal | RowsRefusal` to `ArchiveInputRefusal` compiles with no mapping (follows from the S2 equality pins, call sites not built). | Call sites | Low; it is D-07's stated property and the pins prove the member types are equal. |
| A4 | `admission-step`'s cycle-free claim for the value import: madge counts type edges, and the spike graph (`HostBatch → CodecMade`, `AuditEntry` type) had no back edge to `ArchiveFacts`/`AuditArchive`/`Retention`. | Open Question 1 | Low; `pnpm circular` is the gate and is cheap. |
| A5 | Plan split suggested below. | Validation | Planner's discretion by D's own wording. |

## Open Questions (each decided autonomously, under the owner's standing instruction)

1. **D-06 says `ArchiveFacts.ts` imports `HostBatch.ts` only as a type; D-13 has the public verify (in `ArchiveFacts.ts`) call `admitRows`.**
   - Decided autonomously: import `admitRows` as a **value** (and `AdmittedRows`, `NowRefusalCases` as types). Moving the public verify out of `ArchiveFacts.ts` to keep the clause would split one function from its module just before Phase 91 folds `SequenceIntegrity.ts` back in. The module graph stays acyclic (HostBatch imports only `effect/*`, `CodecMade.ts`, and `AuditEntry.ts` as a type). The `admission-step` judge asserts the no-back-edge rule instead.
2. **D-07 types `admitRows`'s parameter `unknown`; the spike used `ReadonlyArray<AuditEntry>`.**
   - Decided autonomously: the typed parameter. It is what `DatedBatch.entries` already says, the callers are typed, and the not-a-list branch stays inside `rowsRefusal` (no restated `EntriesNotAList`, no cast). The run-time guard stays: `Array.isArray(entries) ? takeRows(entries) : entries` hands a non-array on to `rowsRefusal`, which refuses it with the value given.
3. **Does the changeset claim the INV-QD-399 fix?** Decided autonomously: yes. Probe A fails on the base (writer archives a bundle the reader refuses).
4. **D-17's `readonly` claim.** Decided autonomously: drop it; the pin fails if a member, a tag or a field type moves (V1 to V4, V6). `readonly` is inert in `Data.TaggedEnum` (V5).
5. **D-18's RED read-count row.** Decided autonomously: two or more rows, exactly one `maxAgeMs` read after (base 1 + n); a refused policy reads once after (base 2).
6. **D-14's impossible pairs.** Decided autonomously: as in "Span and order facts"; `row item × break` is in the table.
7. **D-20's "ledger expected empty".** Decided autonomously: three lines from 88's `records --close` (revision drift), plus the 85/86 `scan-ids` and 87-pinned lines already carried, each tagged with the 89 commit that explains it.
8. **A large sparse list costs O(length) in the snapshot.** Decided autonomously: accept. A host that hands a four-billion-hole array has already allocated it; the base `archiveFacts` is O(n) on the same list; recorded in the Security Domain. No guard.
9. **`takeRows` filter equivalent.** Decided autonomously: `filter(Predicate.isNotUndefined)` plus one `EQUIVALENT` entry, not a cast.
10. **Where `maxAgeOf` lives.** Decided autonomously: `Retention.ts`, module-private (it names `RetentionInputRefusal`), not in `HostBatch.ts` (which must not know a retention term).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | scripts, tests | yes | v26.13.0 | — |
| pnpm | every gate | yes | 10.17.1 | — |
| git | phase scripts | yes | 2.54.0 (Apple Git-157) | — |
| vitest, tstyche, stryker, madge, oxlint | gates | yes | `node_modules/.bin` holds all five | — |
| TypeScript | gates | yes | 7.0.2 (repo), 6.0.3 (tstyche's) | — |

**Missing dependencies with no fallback:** none. **Missing with fallback:** none. No network use.

## Validation Architecture

(`workflow.nyquist_validation: true` in `.planning/config.json`.)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + @effect/vitest 4.1.2 + fast-check 4.10.2; tstyche 7.2.5 for types |
| Config file | `packages/audit/vitest.config.ts` (project name `audit`); `tsconfig.tstyche.json` and `tsconfig.test.json` |
| Quick run command | `pnpm exec vitest run --project audit < /dev/null` (about 5 s for 490 tests) |
| Type quick run | `pnpm test:tstyche packages/audit/test/HostBatch.tst.ts < /dev/null` (two passes, about 4 s) |
| Full suite command | `pnpm check:pr < /dev/null` |
| Mutation | `pnpm exec stryker run stryker.audit.mjs --mutate <the six files> < /dev/null` (about 30 s) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIT-01 | winner and spans on every pair and refusal; laziness | unit + property | `pnpm exec vitest run --project audit packages/audit/test/AdmissionOrder.characterisation.test.ts` | Wave 0 (new, green on the base) |
| ADMIT-02 | the step's order, laziness, terms called once, `now` boundary, once-only read, fresh array | unit | `pnpm exec vitest run --project audit packages/audit/test/HostBatch.test.ts` | Wave 0 (new, RED first) |
| ADMIT-02 | every entry point calls the step first (shape) | check script | `node .planning/phases/QD-89-…/89-check.mjs entry-points-first` and `admission-step` | Wave 0 |
| ADMIT-03 | enums equal fragments plus own; shared member is one type; brand | type | `pnpm test:tstyche packages/audit/test/HostBatch.tst.ts` | Wave 0 (new) |
| ADMIT-04 | each entry point refuses what the step refuses | unit | `pnpm exec vitest run --project audit packages/audit/test/ForeignRows.test.ts` | edited (declared) |
| ADMIT-05 | records, revisions, ids | check script | `node …/89-check.mjs records --close` and `pnpm spec:verify:strict` | Wave 0 |
| WX-05 | mutation, coverage | mutation + coverage | `pnpm exec stryker run …`, `pnpm coverage` | existing config |
| WX-06 | each new check seen failing | scratch variants | recorded in `89-RED-EVIDENCE.md` | Wave 0 |

### Sampling Rate
- **Per task commit:** the quick vitest line for the touched files, and `node scripts/check-house-style.mjs < /dev/null` (0.6 s).
- **Per wave merge:** `pnpm exec vitest run --project audit`, `pnpm test:tstyche`, `pnpm circular`, `pnpm typecheck`, `pnpm lint`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, `pnpm spec:api` (942 exports unchanged), `pnpm spec:examples` (122 blocks), `pnpm spec:verify:strict`, `pnpm spec:gates`, the audit mutation run, and all four `89-*` scripts.

### Wave 0 Gaps
- [ ] `packages/audit/test/AdmissionOrder.characterisation.test.ts` — ADMIT-01 (green on the base; delimited `verifiedArchiveFacts` region)
- [ ] `packages/audit/test/HostBatch.test.ts` — ADMIT-02/04 (seen RED: module not found)
- [ ] `packages/audit/test/HostBatch.tst.ts` — ADMIT-03 (seen failing on V1 to V4, V6)
- [ ] `packages/audit/test/hostBatchFaults.ts` — the shared fault table
- [ ] `89-mutation-base.json` — taken on the phase base
- [ ] The four phase scripts with `--self-test`, and `89-RED-EVIDENCE.md`
- No framework install.

### Scratch variants (each seen failing, text recorded; D-19 plus the script judges)
Now and terms swapped; rows before terms; `isFinite` for `Number.isFinite`; `terms` called on a refused `now`; rows read without the snapshot (`new AdmittedRows(entries)`); admission moved inside `verifiedArchiveFacts`; `planPurge` mapping `planRetention` and re-iterating the raw list; the age rule reading `policy.maxAgeMs` again; `NowNotFinite` restated in `Retention.ts`; the type pins V1 to V4 and V6 (texts above); the judge variants listed under "Script porting".

### Suggested plan split (planner's discretion)
1. Base record: mutation base, characterisation (green), probes as RED/green rows (rows flip, `maxAgeMs`, non-object policy).
2. `HostBatch.test.ts` and `.tst.ts` RED, then `HostBatch.ts`.
3. Retention wiring (RED rows first) and the shared `ageRule`, `planPurge` over admitted rows.
4. `ArchiveFacts.ts` brand, writer and verify wiring; the declared characterisation flips.
5. `ForeignRows.test.ts` and `Retention.test.ts` declared edits, the per-entry-point describe.
6. The four scripts and the earlier-checks ledger.
7. Mutation close, review fixes.
8. Records, changeset, close check.

## Security Domain

`security_enforcement` is enabled (absent from `.planning/config.json` as `false`; line 10 is `true`).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | the admission step: finite `now`, terms, codec-made rows, each read once; typed refusals, never a defect |
| V6 Cryptography | no | key material is carried opaque and never judged (BEH-QD-722) |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A host list or getter that answers differently on a second read (TOCTOU) | Tampering | one read into a fresh array, the brand carries the checked array (Probe A) |
| A non-object policy reaching `.maxAgeMs` | Denial of service (a throw where a typed failure belongs) | `maxAgeOf` refuses it as `MaxAgeInvalid { value: undefined }` |
| A forged row (plain object, imitation prototype) | Spoofing | the codec's identity `WeakSet` via `rowsRefusal`, unchanged |
| A very long sparse list | Denial of service | accepted: O(length) snapshot (779 ms for `3e7` holes, measured) of a list the host already holds; base `archiveFacts` is O(n) on the same list; a guard would need a new refusal member (Breaking) |
| Secrets in key material | Information disclosure | unchanged: three declared fields, an extra property never carried |

## Sources

### Primary (HIGH confidence)
- The repository at HEAD `b1d9043b`: `packages/audit/src/{AuditArchive,ArchiveFacts,Retention,CodecMade,AuditEntry,SequenceIntegrity,index}.ts`, `packages/audit/test/{ForeignRows,Retention,AuditArchive}.test.ts`, `stryker.audit.mjs`, `.oxlintrc.json`, `tsconfig.base.json`, `package.json`, `spec/` (ADR-QD-190, ADR-QD-110, ADR-QD-201, BEH-QD-253/254/722, INV-QD-399/400, traceability, README, `index.yaml`), the 85 to 88 phase scripts.
- Session measurements: the probes, the spikes (tsc/d.ts, tstyche both passes, house-style, madge), the read-count experiment, the mutation base run and the earlier-checks run.
- `AGENTS.md` §§4, 5, 6, 7a, 9, 15 and the owner's memory notes (no `Record<string, unknown>` widening; closed unions; the most complete design wins; no new releases).

### Secondary / Tertiary
None used. No web source was needed: the phase is internal to the repo and Effect v4's APIs used here are exercised by the existing code and the spike.

## Hygiene record

Final check, run at the end of this research (stdin closed):
```
$ git status --porcelain -- packages spec scripts features .changeset stryker.audit.mjs < /dev/null
$
```
It prints nothing. The scratch files (`ZzScratch*`, `zz-scratch-89-*`) were deleted from `packages/audit/{src,test}`; the in-repo `reports/mutation-audit/` (gitignored) was restored from a backup; `.stryker-tmp` and `.vitest` do not exist. No source, spec, test, REQUIREMENTS.md, CONTEXT.md or archived script was edited, nothing was committed or pushed, and `scripts/next-id.mjs` was not run.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, read from `node_modules` and `package.json`.
- Architecture: HIGH, built and run in scratch under every gate that can fail it; the call sites follow from the spike's types (A3).
- Pitfalls: HIGH, each measured or read at a line.
- Earlier-checks ledger: HIGH for 85 to 88 as measured; the predicted three-line 88 `records --close` report is derived from its code (MEDIUM until 89's records commit exists).

**Research date:** 2026-11-26
**Valid until:** the next change under `packages/audit` or to the 85 to 88 scripts (none expected before this phase executes).

## Recommended CONTEXT addendum

(Each is decided autonomously, 2026-11-26, under the owner's standing instruction; the numbering continues D-24.)

- **D-06a (the value import):** `ArchiveFacts.ts` imports `admitRows` as a value and `AdmittedRows`, `NowRefusalCases` as types. D-06's "only as a type" clause and the `89-check.mjs` `admission-step` clause "`ArchiveFacts.ts` imports `./HostBatch.ts` only with `import type`" are replaced by "`HostBatch.ts` imports nothing from `ArchiveFacts.ts`, `AuditArchive.ts` or `Retention.ts`" (no back edge; `pnpm circular` clean). Reason: the public verify lives in `ArchiveFacts.ts` and calls `admitRows` first (D-13).
- **D-07a (the typed parameter):** `admitRows(entries: ReadonlyArray<AuditEntry>)`, not `unknown`. The run-time guard `Array.isArray(entries) ? takeRows(entries) : entries` stays, so a non-list reaches `rowsRefusal` and is refused with the value given. The list question is asked in one place (`CodecMade.ts`).
- **D-12a (the read):** `takeRows = (list) => Array.from({ length: list.length }, (_, index) => list[index])`, then `rowsRefusal(taken)`, then `new AdmittedRows(taken.filter(Predicate.isNotUndefined))`. Measured: one `length` read, one read per index, no method or iterator read. The `filter` mutant is one `EQUIVALENT` entry; the `takeRows` arrow is one `EXAMINED` entry.
- **D-12b (probe verdicts):** Probe A is confirmed (writer, verify and both plans): the changeset names the INV-QD-399 fix. Probe B is confirmed for `null` and `undefined` only; a primitive policy already answers `MaxAgeInvalid` (preserved row, green on the base). The `maxAgeMs` read count on the base is `1 + n` (valid) and `2` (refused).
- **D-14a (impossible pairs and the table):** only `kmNotList × kmItem`, `maxAgeMs NaN × maxAgeMs -1`, `rowsNotList × rowItem` and `rowsNotList × break` are impossible. `rowItem × break` is a real pair (winner `EntryNotMadeByCodec`). The writer table has 12 pairs, the plan table 8, the verify and the direct `verifiedArchiveFacts` one each.
- **D-17a (the pin):** drop "or `readonly`" from the claim. The pin fails if a member, a tag or a field type moves (seen failing on V1 to V4 and V6). Add the nominal twin `OtherAdmittedRows` (a structurally identical class in another module) to the brand pin so it proves nominal and not structural typing.
- **D-18a (RED rows):** `maxAgeMs` is read exactly once for at least two rows (RED: 3 reads on the base) and once on a refused policy (RED: 2 on the base); a policy of `null` or `undefined` is `MaxAgeInvalid { value: undefined }` (RED: `TypeError`); a flipping list is admitted as the row that was checked (RED: the writer archives the flipped row and the reader refuses the bundle).
- **D-20a (the earlier-checks ledger):** not empty. It holds 85's and 86's one `scan-ids` line, 87-pinned's one line (as 88 recorded), and 88's `records --close` three revision lines, each tagged with the 89 commit that explains it. The `admission-step` judge is the one in D-06a.
- **D-21a (mutation):** the base invocation is `pnpm exec stryker run stryker.audit.mjs --mutate <AuditArchive, ArchiveFacts, Retention, CodecMade, SequenceIntegrity>` (212 mutants, all killed; 232 with 20 Ignored static). `SequenceIntegrity.ts` has no mutants. The close adds `HostBatch.ts`.
- **D-22a (spec places that become false):** besides the amendments D-22 names, edit `INV-QD-399` and `INV-QD-400` **Source** lines (they say `verifiedArchiveFacts` refuses the row), and add dated `>` notes under ADR-QD-190 decision 2 and 3 (lines 278, 286) and ADR-QD-110 line 136.
- **D-25 (tests removed: 6):** the audit table in ADR-QD-202 states "Tests removed: 6", names the six rows above and the row that now holds each property.
