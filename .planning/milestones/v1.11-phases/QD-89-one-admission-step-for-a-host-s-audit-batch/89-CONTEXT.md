# Phase 89: One admission step for a host's audit batch - Context

**Gathered:** 2026-11-26 (smart discuss, autonomous mode. Every decision below was decided autonomously on 2026-11-26 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". Breaking changes are allowed; source compatibility is never the tiebreaker.)
**Status:** Ready for planning

<domain>
## Phase Boundary

A host hands `@qadi/audit` a batch: a `now`, a list of rows, and the terms its call adds (key material for the archive
writer, a `maxAgeMs` for retention). Four public calls take one (`archiveAuditTrail`, `planRetention`, `planPurge`,
`verifySequenceIntegrity`), through one package-private wrapper (`verifiedArchiveFacts`). Each checks its own batch
today, and `NowNotFinite` is declared twice.

Code at HEAD `b5557e0d`. No file under `packages/audit` has changed since `ac7578f3` (`git log -- packages/audit`), so
the numbers below are the base numbers, re-read at HEAD:
- `src/AuditArchive.ts` (404 lines). `archiveAuditTrail` (179-208, an `Effect.fn("qadi.audit.archiveAuditTrail")`)
  checks `now` itself (`Number.isFinite`, 184-187). It then reads key material once through the module-private
  `snapshotKeyMaterial` (72-93, called at 190-194, over `KeyMaterialSchema` 54-58, which the reader reuses at 329).
  It leaves the rows to `verifiedArchiveFacts` (195). Its doc (139-149) states the order: now, key material, rows,
  then the sequence.
- `src/ArchiveFacts.ts` (210 lines). `ArchiveInputRefusal` = `Data.TaggedEnum<RowsRefusalCases & { NowNotFinite;
  KeyMaterialNotAList; KeyMaterialItemRefused }>` (139-145, `NowNotFinite` at 141, its doc bullet at 117-121).
  `verifiedArchiveFacts` (177-189, an `Effect.fn("qadi.audit.verifySequenceIntegrity")`) asks `rowsRefusal` first
  (180-183), then `archiveFacts` (184), then fails `SequenceIntegrityError` on a break (185-187). The public
  `verifySequenceIntegrity` (208-210) is an **unnamed** `Effect.fn` that delegates, "so a call opens exactly one"
  span (205-206). The pure `archiveFacts` (91-111) is also the reader's, over rows it has just decoded
  (`AuditArchive.ts:386`).
- `src/Retention.ts` (197 lines). `RetentionInputRefusal` = `Data.TaggedEnum<RowsRefusalCases & { NowNotFinite;
  MaxAgeInvalid }>` (49-54, `NowNotFinite` at 51). `planRetention` (96-123, a plain function returning `Result`)
  checks `now` (101-104), then `!(policy.maxAgeMs >= 0)` (105-108), then `rowsRefusal` (109-112). It reads
  `policy.maxAgeMs` three times: at 105, at 106 and on every row at 116. `planPurge` (165-197) is
  `Result.map(planRetention(...), …)` (171), so it has no admission of its own, and it then iterates the **raw**
  `entries` a second time (177).
- `src/CodecMade.ts` (71 lines). It imports only `effect/Data` and `effect/Predicate`, so it is a leaf in the
  package's module graph. It states `RowsRefusalCases` (44-49) and `rowsRefusal(entries: unknown)` (63-71): first
  `Array.isArray`, then the codec's `WeakSet`.
- `src/SequenceIntegrity.ts` (26 lines) re-exports the two public names from `ArchiveFacts.ts`. Phase 91 folds it
  into `ArchiveFacts.ts`.
- `test/ForeignRows.test.ts` (468 lines) re-tests the order per entry point at 111-113, 156-165, 231-245, 359-363 and
  365-367. `test/Retention.test.ts:139-141` ("checks now before maxAgeMs") re-tests it a sixth time.
  `test/AuditArchive.test.ts:41-58` and `:60-77` pin the span **names** on success: `verifySequenceIntegrity` opens
  exactly `["qadi.audit.verifySequenceIntegrity"]`. No test pins the spans on a refusal.

**Stale or imprecise claims in the roadmap, `_WAVE16-CONTEXT.md` and the research (each checked at HEAD):**
1. "`ArchiveFacts.ts:139` holds `ArchiveInputRefusal.NowNotFinite`": line 139 opens the `ArchiveInputRefusal` type.
   The `NowNotFinite` member is at 141, with its doc bullet at 117-121.
2. "`AuditArchive.ts:185` checks its own batch": the `now` check is 184-187, and 185 only builds the refusal. The
   writer itself checks `now` and key material (184-194). Its rows are checked in `ArchiveFacts.ts:180-183`, inside
   the child span.
3. Goal: "shared by `archiveAuditTrail`, `planRetention`, `verifiedArchiveFacts` and `planPurge`". `planPurge` holds
   no check code (it maps `planRetention`'s result, `Retention.ts:171`). `verifiedArchiveFacts` is package-private.
   The public entry point is `verifySequenceIntegrity` (`ArchiveFacts.ts:208`), which delegates to it.
4. Goal and PROJECT.md list the batch as "`now`, rows, key material or max age". That is not the check order. Every
   dated entry point checks `now`, then its terms, then the rows. The roadmap's own planning note says so.
5. "`CodecMade.ts` … an import-free leaf": it imports two `effect` modules. It is a leaf (no `./` import), not
   import-free. This context reads "leaf" throughout.
6. "`ForeignRows.test.ts` re-tests the check order per entry point": true, and `Retention.test.ts:139-141` does too,
   which the roadmap does not name.
7. STACK.md places the fragment intersections "in `ArchiveFacts.ts:151` and `Retention.ts:48`". They are at
   `ArchiveFacts.ts:139-145` and `Retention.ts:49-54`. FEATURES.md 89.1 cites `AuditArchive.ts:178-190` and
   `Retention.ts:96-120`. The functions span 179-208 and 96-123.
8. FEATURES.md 89.5 says "not Breaking, no changeset". Phase 85 D-04 overrides that: a patch for every edited public
   package.
9. SUMMARY.md says the public "spans unchanged". D-10 changes two refusal traces, pinned and recorded, under the
   roadmap's own tie-break.
10. "Live defect: no". Two live defects are suspected, each to be confirmed by a RED probe in plan 1 (D-12): rows
    read twice (a proxied list can pass the codec check with one row and be archived with another, which breaks
    INV-QD-399), and `planRetention(rows, null, now)` throwing a `TypeError` (a defect where a typed failure
    belongs). If a probe stays green on the base, its decision is recorded as preserved behaviour and the changeset
    does not claim a fix.

After this phase:
- One package-private module, `src/HostBatch.ts`, admits a host's batch in one order: `now`, then the terms the
  caller adds, then the rows. It reads each input once and returns the admitted batch or the first refusal. It is a
  plain function, with no `Effect` and no span.
- `NowNotFinite` is stated once, as `NowRefusalCases`, a fragment intersected into both public enums the way
  `RowsRefusalCases` is. Both enums, both error classes, every tag, member and field are unchanged.
- Admitted rows are a type that only `HostBatch.ts` can make. `verifiedArchiveFacts` takes that type, so a fact is
  never computed from rows the step did not admit, and the rows are asked once, not twice.
- Every public entry point calls the step first. The order is tested once, at the step. `ForeignRows.test.ts` keeps
  one case per entry point, proving it refuses what the step refuses.

ARCH-136. Package: `@qadi/audit` only (a patch changeset; no export changes; gate 13 unmoved). Records: ADR-QD-202
(new), CCR-QD-481, BEH-QD-781..785, INV-QD-423..424. ADR-QD-190 and ADR-QD-110 get dated amendments. BEH-QD-722 is
restated, and BEH-QD-253 and BEH-QD-254 gain links.

Evidence: the code at HEAD (file:line above and in `<code_context>`); `.planning/phases/_WAVE16-CONTEXT.md` §Phase 89;
`.planning/research/` (SUMMARY §Phase 89 and "Where the researchers disagree" (89), ARCHITECTURE §Phase 89, PITFALLS
89-A..D, FEATURES §89.1-89.6, STACK §Phase 89); ADR-QD-190 (third amendment, decisions 3-5), ADR-QD-110, ADR-QD-099,
core's `Admission.ts` (the admission-as-a-plain-`Result` precedent); BEH-QD-253, 254, 722; INV-QD-399, 400.
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (carried forward from Phase 85; not re-decided)
- **D-01:** Work only on branch `arch-wave-16`, on the main tree, one phase at a time. No merge, push, tag, release,
  publish, `changeset version` or version-packages PR (WX-07). Never `git add -A` under `.planning/milestones`. Never
  stage `.planning/config.json`, `README.md`, `.agents/`, `.codex/`, `.planning/state.json`, `assets/` or `*.iter*.md`.
- **D-02:** Use only the reserved records: ARCH-136, ADR-QD-202, CCR-QD-481, BEH-QD-781..785, INV-QD-423..424. Never
  run `node scripts/next-id.mjs`. Name any unused reservation in the CCR row ("Unused: …"). Pass `--date 2026-11-26`
  (or the real edit date) to `scripts/spec-revise.mjs`.
- **D-03:** Every behaviour change is preceded by a test written on the phase base: RED there for a change, green for
  preserved behaviour. Every new check is shown failing once, with the scratch variant and the failing text recorded
  in `89-RED-EVIDENCE.md` (WX-06). `pnpm check:pr < /dev/null` is green at the phase end (WX-01).
- **D-04 (the wave's changeset policy, Phase 85 D-04):** one `.changeset/*.md` for `@qadi/audit`, a **patch**. See D-24.
- **D-05:** Every commit ends with exactly one trailer line, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Area 1: The step's home, shape and order
- **D-06 (home and name):** a new package-private `packages/audit/src/HostBatch.ts`. It is out of the barrel
  (ADR-QD-099), and the `exports` map is closed, so it is not importable. Its imports are only `effect/*`,
  `./CodecMade.ts` (`rowsRefusal`, and `RowsRefusalCases` as a type) and `./AuditEntry.ts` as a type.
  - Not in `ArchiveFacts.ts`, because Phase 91 folds `SequenceIntegrity.ts` into it and should move two names, not an
    admission step.
  - Not in `CodecMade.ts`, which stays **byte-identical** to the base: a leaf that answers one question ("which rows
    the codec made"). The step is a consumer of it, not part of it.
  - The working name follows the research (`HostBatch.ts`). The planner may rename it, but must keep it a separate
    module that `ArchiveFacts.ts` imports only as a type.
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
  - `admitBatch` is the step. `admitRows` is its last stage, and it is also the whole step for the one entry point
    with no `now` and no terms (the public verify).
  - The refusal is a union of `Data.TaggedEnum` members. Each is assignable to the caller's public enum with no
    mapping, exactly as `rowsRefusal`'s answer is today (ADR-QD-190 decision 5). Each caller wraps it once: the
    writer and the verify with `Effect.fail(new ArchiveInputInvalid({ refusal }))`, retention with
    `Result.fail(new RetentionInputInvalid({ refusal }))`.
  - No `as`, no `!`, no `Record<string, unknown>`, no `Effect.fn`, no `switch`.
  - Rejected: **one function over a tagged union of the three batch kinds.** Its output differs per kind, so it would
    need overloads or a conditional return type, and the caller would narrow a union the call already knew.
  - Rejected: **`now?` and `terms?` as optional fields.** That widens the step's input to absent values the order
    then has to branch on. Two closed shapes state the same thing without a hole.
  - Rejected: **a refusal-or-`undefined` return** (PITFALLS 89-B's shape). The writer must write the key material it
    checked (read once, ADR-QD-190 third amendment), so the step has to return what it admitted. A bare refusal would
    force a second read.
- **D-08 (one order):** `now` (`Number.isFinite`, never the coercing `isFinite`), then `terms()` (called at most once,
  and **not called** when `now` is refused), then the rows (not read when the terms are refused). This one order is
  the base order of every entry point. The entry points differ only in which terms they pass: the writer passes key
  material, retention and purge pass `maxAgeMs`, and the verify passes nothing and calls `admitRows`.
  - Rejected: **a flat "now, rows, then terms".** It would change which refusal wins for key material plus rows and
    for max age plus rows (PITFALLS 89-A).
  - Rejected: **an ordered list of checks per caller.** With the terms as the caller's one thunk, every caller's order
    is the same, and a list would let a caller reorder what BEH-QD-722 fixes.
- **D-09 (admitted rows are a type, not a duty; the brand):** `AdmittedRows` follows the `AuditEntry` idiom
  (`declare private readonly nominal: never`, a type-only export, ADR-QD-190 decision 1). Only `admitRows` builds one.
  - `verifiedArchiveFacts` takes `AdmittedRows` and no longer asks `rowsRefusal`. "Facts from unadmitted host rows"
    stops compiling, and the writer asks the codec's record once, not twice (today it would ask twice if a step ran
    first and the wrapper kept its own check).
  - The pure `archiveFacts` keeps taking `ReadonlyArray<AuditEntry>`. It is the reader's, over rows `decodeAuditEntry`
    has just made (`AuditArchive.ts:386`), and `ArchiveFacts.test.ts` stays held.
  - Rejected: **branding the array itself.** That needs an `as` to mint.
  - Rejected: **branding `archiveFacts` too.** It would make the reader admit rows it made itself.
- **D-10 (spans: the roadmap's open choice; decided as the brand, with the trace change pinned and recorded):**
  admission runs before any span-opening step of the entry point's own work. The step opens no span.
  - Success traces are unchanged. An admitted archive opens `qadi.audit.archiveAuditTrail` with the child
    `qadi.audit.verifySequenceIntegrity`. An admitted verify opens exactly `["qadi.audit.verifySequenceIntegrity"]`.
    `AuditArchive.test.ts:41-77` stays held. Span names do not change.
  - Two refusal traces change, both pinned by plan 1's characterisation and flipped in one declared commit:
    - (a) `archiveAuditTrail` refused for its rows opens only `qadi.audit.archiveAuditTrail` (on the base, also the
      child `qadi.audit.verifySequenceIntegrity`);
    - (b) a refused public `verifySequenceIntegrity` opens no span (on the base, `qadi.audit.verifySequenceIntegrity`).
    A refusal of `now` or key material already opens only the writer's span, and is unchanged.
  - The rule the ADR records: **the sequence check's span opens only when the check runs, on admitted rows.** A
    refused input was never checked (ADR-QD-051: a span says what was asked). A refused archive still fails inside its
    own span. A refused verify is a typed failure in the host's own span.
  - Why this is the complete option. ADMIT-02 has the writer admit its whole batch (rows included) first. So (a)
    changes under **any** design that meets it, and "spans unchanged" is reachable only by leaving the writer's rows
    to a second admission inside the child span. That splits one batch's order across two calls, and the order could
    then not be tested once. Given that (a) moves anyway, admitting before the span everywhere is the one consistent
    rule. It also removes the double codec check.
  - Rejected: **admission inside the verify span**, keeping (b). Then `verifiedArchiveFacts` would take raw rows, the
    writer would ask the codec twice, and the brand would go.
  - Rejected: **naming the public verify's own `Effect.fn`.** A successful verify would then open two spans and break
    the held `AuditArchive.test.ts:76`.
  - Rejected: **two `Effect.fn`s that share one span-name literal.** It states the name twice, which is the drift
    ADR-QD-110 removed.
- **D-11 (`NowNotFinite` stated once):** `NowRefusalCases` lives in `HostBatch.ts`, beside the check that answers it,
  as `RowsRefusalCases` lives beside `rowsRefusal`.
  - `ArchiveInputRefusal = Data.TaggedEnum<RowsRefusalCases & NowRefusalCases & { KeyMaterialNotAList;
    KeyMaterialItemRefused }>` and `RetentionInputRefusal = Data.TaggedEnum<RowsRefusalCases & NowRefusalCases &
    { MaxAgeInvalid }>`.
  - Each keeps its own `Data.taggedEnum` constructors, so `ArchiveInputRefusal.NowNotFinite(…)` and
    `RetentionInputRefusal.NowNotFinite(…)` still exist. Same members, tags, fields and readonly-ness, the same two
    error classes (`Data.TaggedError`; `SCHEMA_ERROR_BUDGET` stays 12), and not Breaking.
  - The key `NowNotFinite:` is declared as a member in exactly one `packages/audit/src` file, `HostBatch.ts`.
    `89-check.mjs` judges this.
  - Rejected: **one shared public refusal enum or error** (FEATURES anti-feature; it reopens ADR-QD-190 and is
    Breaking).
  - Rejected: **exporting `NowRefusalCases`** (gate 13).
  - Rejected: **putting it in `CodecMade.ts`**, which has nothing to say about time.
- **D-12 (each input read once; what is checked is what is used):** the step is the trust boundary's reading rule
  for the whole batch, not only the order.
  - **Rows:** `admitRows` reads `length` once and each index once, into a fresh array. It checks that array and holds
    it in the `AdmittedRows`, so every later read (facts, age rule, purge pass) reads what was checked. It must not
    call a method or iterator the host's object can override (no instance `findIndex`, `slice`, spread or
    `Array.from` over the host's own `Symbol.iterator`); the planner chooses the exact read under that rule. A hole
    reads as `undefined` and is refused at its index, as today.
    - Plan 1 probes it on the base: a `Proxy` over a list whose index `0` answers a codec row on the first read and a
      plain row on the next. If the writer archives a bundle its reader refuses, that is the live defect the changeset
      names (INV-QD-399).
  - **Key material:** unchanged. `snapshotKeyMaterial` stays in `AuditArchive.ts`, beside `KeyMaterialSchema`, which
    the reader reuses. It is the writer's `terms`, so `options?.keyMaterial` is read once, inside the step's order.
  - **`maxAgeMs`:** retention's `terms` reads `policy?.maxAgeMs` once, refuses `!(value >= 0)` as `MaxAgeInvalid
    { value }` (`NaN` and negatives refused; `+Infinity`, `0` and `-0` valid), and returns the number. The age rule
    uses that number, never `policy.maxAgeMs` again.
    - A `policy` that is `null`, `undefined` or a primitive reads as `MaxAgeInvalid { value: undefined }`, the same
      refusal `{}` gets today. On the base it throws a `TypeError`. This closes a defect without a new member (a new
      member would be Breaking, outside ADMIT-03). RED on the base.
  - **`now`:** a primitive parameter, read once by construction. `-0` is finite and archived, as today.
- **D-13 (how each entry point calls the step first):**
  - `archiveAuditTrail`: the first statement admits `{ now, terms: () => snapshotKeyMaterial(options?.keyMaterial),
    entries }`. A refusal is `Effect.fail(new ArchiveInputInvalid({ refusal }))`. It then calls
    `verifiedArchiveFacts(admitted.rows)` and builds the bundle from `admitted.now` and `admitted.terms`. The function
    stays `Effect.fn("qadi.audit.archiveAuditTrail")`.
  - `verifySequenceIntegrity` (public, unnamed `Effect.fn`): `admitRows(entries)` first, then
    `verifiedArchiveFacts(rows)`.
  - `verifiedArchiveFacts`: takes `AdmittedRows`, keeps its span name, and its only failure is
    `SequenceIntegrityError`.
  - `planRetention`: admits `{ now, terms: () => maxAgeOf(policy), entries }`, then runs a module-private age rule
    over the admitted batch.
  - `planPurge`: admits its own batch first, the same way, then the same private age rule, then the archive pass over
    the **admitted rows**. It no longer maps `planRetention` and re-iterates the raw `entries` (`Retention.ts:171,
    177`). Both plans share one age rule over one admitted batch, and the archive is still never asked for a refused
    batch.
  - The doc comments at `AuditArchive.ts:139-149`, `ArchiveFacts.ts:20-25`, `ArchiveFacts.ts:167-176`,
    `Retention.ts:83-95` and `Retention.ts:10-20` state "the step admits the batch" and name `HostBatch.ts`. They no
    longer restate the order.

### Area 2: Characterisation, the order table, the type pin and the declared test edits
- **D-14 (plan 1: the characterisation on the base, ADMIT-01):** a new file, working name
  `packages/audit/test/AdmissionOrder.characterisation.test.ts`, committed green on the base. Rows:
  - **Which refusal wins, for every pair of faults, per entry point**, as an explicit literal table (not computed from
    an order list, so the table does not encode the abstraction it pins):
    - writer: `now` × {key material not a list, key-material item, rows not a list, row item, sequence break},
      key material × {rows, row item, sequence break}, row item × sequence break;
    - `planRetention` and `planPurge`: `now` × {`maxAgeMs` `NaN` and `-1`, rows not a list, row item}, `maxAgeMs` ×
      {rows not a list, row item};
    - the public verify: row item × sequence break;
    - `verifiedArchiveFacts` directly: row item × sequence break.

    Impossible pairs (a sequence break needs a list of codec rows; the two forms of one input exclude each other) are
    named as such. A `fast-check` row over every subset of each entry point's faults pins that the winner is the first
    fault in the base order.
  - **The spans each opens on each refusal**, read with the `Tracer.make` name collector of `AuditArchive.test.ts:41-58`:
    - writer: `now` and key material → `["qadi.audit.archiveAuditTrail"]`; rows and the sequence break → the writer's
      span plus `qadi.audit.verifySequenceIntegrity`;
    - verify: a rows refusal and a break → `["qadi.audit.verifySequenceIntegrity"]`;
    - `planRetention` and `planPurge`, run under the collector in `Effect.sync` → none.
  - **Laziness:** a refused `now` never reads `options.keyMaterial` (a counting getter, 0 reads). Refused key material
    never reads the rows (a counting `Proxy`).

  The file is held byte for byte from the commit that adds it, except two declared regions: the two span rows D-10
  flips ((a) and (b)), and the `verifiedArchiveFacts`-direct rows. D-09 retypes that function, so the brand commit
  rewrites those rows as "takes only admitted rows; its one failure is `SequenceIntegrityError`" through `admitRows`.
- **D-15 (the order tested once, at the step, ADMIT-04):** a born `packages/audit/test/HostBatch.test.ts`:
  - The order table over stub terms (one that admits, one that refuses), for every subset of {bad `now`, refused terms,
    rows not a list, row item}. The winner is the first in `now` → terms → rows.
  - `terms` is called once, and zero times on a refused `now`. The rows are not read on refused terms.
  - `now` boundary rows: `NaN`, `±Infinity`, `"1"`, `undefined`, `null`, `1n` refused with the value given; `0`, `-0`
    and `1` admitted.
  - `admitRows`: not-a-list values (the seven of `ForeignRows.test.ts:187-195`), a hole, the proxied list (D-12),
    an empty list admitted, and the admitted rows being a fresh array.
  - It is seen RED before `HostBatch.ts` exists (module not found), then green.
- **D-16 (the declared test edits; every other test held byte for byte):** in `packages/audit/test`:
  - `ForeignRows.test.ts`: the order rows at 111-113, 156-165, 231-245, 359-363 and 365-367 are removed. One new
    `describe` takes their place, "each function that takes a batch refuses what the admission step refuses", with
    **one case per entry point** (`archiveAuditTrail`, `planRetention`, `planPurge`, `verifySequenceIntegrity`). Each
    runs the fault table from a shared test helper (working name `test/hostBatchFaults.ts`) through the entry point
    and through `admitBatch`/`admitRows`, and asserts the two refusals are equal. That proves the entry point calls the
    step, without re-listing the order.
    - Held unedited: 115-121 (rows refused before a sequence break: the writer's own work comes after admission) and
      222-229 (`planPurge` fails before the archive is asked).
  - `Retention.test.ts:139-141` ("checks now before maxAgeMs") is removed and re-homed to `HostBatch.test.ts`.
  - D-14's two declared regions.
  - `ADR-QD-202` carries an audit table (the ADR-QD-200 and ADR-QD-201 precedent) naming each removed row and the row
    that now holds its property. "No property lost; tests removed: N" is stated with the real count.
  - Everything else is held byte for byte, including `AuditArchive.test.ts` (230 included), `ArchiveFacts.test.ts`,
    `ArchiveRoundTrip.test.ts`, `ArchiveWriterInputs.test.ts`, `SequenceIntegrity.test.ts`, `UntrustedSeams.test.ts`,
    every `*.tst.ts` and every `features/` file (none touches the archive).
- **D-17 (the type pin that can fail, ADMIT-03):** a born `packages/audit/test/HostBatch.tst.ts`, with positive pins
  and `not.toBeAssignableTo` only. No negative `toBeCallableWith` and no `toBeConstructableWith`, so
  `NOT_CALLABLE_PIN_BUDGET` and its table do not move.
  - Each public enum `toBe` its member set, **spelled out independently in the test** (the flat five and four members
    with their fields, the base shape). This fails if a member, tag, field or `readonly` moves.
  - Each public enum `toBe` `Data.TaggedEnum<RowsRefusalCases & NowRefusalCases & {own members spelled in the test}>`:
    "fragments plus its own members".
  - The shared members are one type: `Extract<ArchiveInputRefusal, { _tag: "NowNotFinite" }>` `toBe` the retention
    one `toBe` `Data.TaggedEnum<NowRefusalCases>`, and likewise for `EntriesNotAList` and `EntryNotMadeByCodec`.
  - `ReadonlyArray<AuditEntry>` and `{ entries }` are `not.toBeAssignableTo<AdmittedRows>`, and
    `Parameters<typeof verifiedArchiveFacts>[0]` `toBe` `AdmittedRows`.

  Seen failing: `value: number` in `NowRefusalCases`; a member dropped from the archive's own cases; `NowNotFinite`
  restated in retention's own cases with another field type; `verifiedArchiveFacts` taking a raw list. Each run's
  text goes in `89-RED-EVIDENCE.md`.
- **D-18 (RED before each behaviour change, WX-06):** written and seen RED on the base, before the change:
  - the two span flips (D-10 (a) and (b));
  - `maxAgeMs` read once (a counting getter on `policy`: 3 or more reads on the base, 1 after);
  - a non-object `policy` refused as `MaxAgeInvalid { value: undefined }` (it throws on the base);
  - the proxied rows list (D-12; RED only if plan 1's probe confirms the defect, otherwise a green preserved row).

  Preserved behaviour (every refusal value, `-0`, `+Infinity` `maxAgeMs`, `Number.isFinite`, key material read once,
  success spans) stays green through every commit.
- **D-19 (scratch variants, each seen failing with its text recorded):** `now` and terms swapped; rows before terms;
  `isFinite` for `Number.isFinite`; `terms` called on a refused `now`; rows read without the snapshot; admission moved
  inside `verifiedArchiveFacts`'s span; `planPurge` back to mapping `planRetention` and re-reading the raw `entries`;
  the age rule reading `policy.maxAgeMs` again; `NowNotFinite` restated in `Retention.ts`.

### Area 3: Phase scripts and measurement
- **D-20 (phase scripts, the Phase 85-88 pattern):**
  - `89-check.mjs`: `base`, `commit`, `unchanged`, `seen-failing`, `vitest` and `suite` (over the `audit` vitest
    project), `scan-ids`, `scan-forbidden`, `trailers`, `records [--close]`, plus two shape judges:
    - `admission-step`: `HostBatch.ts` exists and is in no barrel; its imports are exactly D-06's; it has no
      `Effect.fn`, `Effect.gen`, `withSpan` or `Effect.` call at all; it uses `Number.isFinite` and no bare
      `isFinite(`; the member key `NowNotFinite:` appears in exactly one `packages/audit/src` file;
      `rowsRefusal(` and `Number.isFinite(` are called in `packages/audit/src` only by `HostBatch.ts`;
      `ArchiveFacts.ts` imports `./HostBatch.ts` only with `import type`; `CodecMade.ts` is byte-identical to the
      base.
    - `entry-points-first`: in each of `archiveAuditTrail`, `verifySequenceIntegrity`, `planRetention` and `planPurge`,
      the first statement of the body calls `admitBatch` or `admitRows`; `planPurge` does not call `planRetention`;
      `verifiedArchiveFacts`'s parameter is typed `AdmittedRows`.
  - `89-pinned-check.mjs`, implementing D-16's held and declared sets and D-14's, D-15's and D-17's born files.
  - `89-mutation.mjs`, implementing D-21.
  - `89-earlier-checks.mjs`, which runs Phases 85-88's checks from scratch copies with an **expected-reports ledger**.
    Phase 89 touches only `@qadi/audit`, so the ledger is expected empty, and a report names the 89 commit that
    explains it. The script never edits an archived check's path constants.

  Each script has a `--self-test`, and each mode is seen failing once. `scan-ids` adds `ADMIT-0\d`, `89-\d{2}`, `QD-89`
  and `Phase 89`. A test title names a property, never a D-number, a requirement id or a phase number (WX-07).
- **D-21 (mutation, WX-05):** `stryker.audit.mjs` mutates `packages/audit/src/**/*.ts` minus `index.ts`, so every
  touched file and `HostBatch.ts` is measured. **`UNMEASURED` is empty**, and the record says why: no touched file is
  outside that glob.
  - `89-mutation-base.json` is taken on the phase base for `AuditArchive.ts`, `ArchiveFacts.ts` and `Retention.ts`
    (touched), and for `CodecMade.ts` and `SequenceIntegrity.ts` (held, to show they do not drop). The close run uses
    the same invocation. A touched file's score must not fall. The code that moves (the two `now` checks, the rows
    wrap) is named in a `MOVED` note with its new home, and no file is renamed, so there is no `RENAMED` map.
  - `HostBatch.ts` must have **every mutant killed**, or each survivor recorded as an equivalent with its reason, and an
    Ignored static mutant only by the 87/88 `EXAMINED` mechanism (run by hand with `ignoreStatic: false`, seen
    Killed).
  - A survivor is closed with a test, never re-baselined. Coverage stays at or above 90% for audit.
  - `89-mutation-close.json` records `ArchiveFacts.ts`'s post-review score as **Phase 91's base** for that file (the
    roadmap's instruction).

### Area 4: Records
- **D-22 (ADR-QD-202 new; ADR-QD-190 and ADR-QD-110 amended):** a new ADR is the complete record. The change adds a
  module and a brand, changes two traces, closes up to two defects, and carries its own rejected alternatives and an
  audit table. Folded into ADR-QD-190's fourth amendment, it would bury the span rule. The precedent is a new ADR per
  phase in this wave (198-201).
  - `spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md` states D-06 to D-13, the span rule and its two
    flips, the read-once rule, the audit table (D-16), and "What enforces it", naming commands, never gate numbers.
  - ADR-QD-190 (revision 1.6 to 1.7) gets a dated amendment: "`NowNotFinite` joins `RowsRefusalCases`' discipline as
    `NowRefusalCases` (`HostBatch.ts`); the rows are asked once, by the admission step; see ADR-QD-202". Its decision
    5 still stands.
  - ADR-QD-110 (revision 1.3 to 1.4) gets a dated note on "the span keeps the name it had": the name is unchanged, and
    the span now opens only for admitted rows.
- **D-23 (BEH and INV allocation):** the planner may rebalance the allocation, but must use all five BEH and both INV
  ids or name an unused one in CCR-QD-481.
  - BEH-QD-781: one admission step checks a host's batch in one order (`now`, then the caller's terms, then the rows),
    and every entry point calls it before any fact, plan or span of its own work.
  - BEH-QD-782: each entry point refuses exactly what the step refuses for the same batch (the writer: `now`, key
    material, rows; retention and purge: `now`, `maxAgeMs`, rows; the verify: rows).
  - BEH-QD-783: the sequence check's span opens only for admitted rows. A refused archive opens only its own span, and
    a refused verify opens none. Success traces are unchanged.
  - BEH-QD-784: `NowNotFinite` is one case shared by both refusal enums, as the row refusals are, and both enums keep
    every member, tag and field.
  - BEH-QD-785: a policy's `maxAgeMs` is read once and the age rule uses the value checked. A policy that is not an
    object is `MaxAgeInvalid { value: undefined }`, never a defect.
  - INV-QD-423: no fact, plan or sequence check is computed from host rows the admission step did not admit. Only
    `HostBatch.ts` mints `AdmittedRows`.
  - INV-QD-424: each input of a host's batch is read once (the rows' list and each index, the key material and each
    item's fields, `maxAgeMs`), and what was checked is what is used. No input is a defect, whatever the value given.
  - BEH-QD-722 is restated: its order REQUIREMENTs point to BEH-QD-781, its `ts` listing shows the fragments, and its
    "Pinned by" list names the new files. BEH-QD-253 (the retention refusal REQUIREMENT) and BEH-QD-254 (the verify's
    `ArchiveInputInvalid` REQUIREMENT) each gain a link to BEH-QD-781.
  - The `spec/traceability.md` rows (`ForeignRows.test.ts` at 852 and the new files), `spec/decisions/index.yaml`, and
    the CCR-QD-481 row in `spec/README.md` move with them. Any ` ```typescript ` fence must compile
    (`check-doc-examples.mjs`). Signatures go in ` ```ts ` fences. `spec/overview.md` is unchanged: no export moves.
- **D-24 (the changeset):** `.changeset/audit-batch-admitted-once.md`, a `@qadi/audit` **patch**:
  - "A host's batch is admitted by one step, in one order (`now`, then key material or `maxAgeMs`, then the rows);
    every refusal is unchanged."
  - "A refused batch no longer opens the `qadi.audit.verifySequenceIntegrity` span (a refused
    `verifySequenceIntegrity` opens none; a refused `archiveAuditTrail` opens only its own)."
  - "`planRetention` and `planPurge` read `maxAgeMs` once and refuse a policy that is not an object as
    `MaxAgeInvalid` instead of throwing."
  - "Rows are read once", plus the INV-QD-399 fix sentence only if plan 1's probe confirmed the defect.
  - "No export changes."

  Not Breaking: no public name, type, tag or member moves, and a span is not part of a public type.

### Claude's Discretion
- The exact names of `HostBatch.ts`, `admitBatch`, `admitRows`, `AdmittedRows`, `DatedBatch`, `AdmittedBatch`, the
  retention terms function, the private age rule, the characterisation file and the fault helper, within the shapes
  fixed above.
- The exact once-only read of the rows list (D-12), under its rule.
- The plan count and the wave split, within these constraints:
  - plan 1 is the base record, the mutation base, the characterisation (D-14) and the defect probes (D-12);
  - the RED rows (D-18) precede their change;
  - `HostBatch.test.ts` is seen RED before `HostBatch.ts` exists;
  - the records plan comes last, before the close check.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` §"Phase 89: One admission step for a host's audit batch": the goal, the five success
  criteria, and the planning notes ("constraints that are findings").
- `.planning/REQUIREMENTS.md`: ADMIT-01..05 and WX-01..07.
- `.planning/phases/_WAVE16-CONTEXT.md` (reserved ids, D4 order, §Phase 89 evidence) and
  `.planning/phases/_SHARED-CONTEXT.md` (house rules, verify-command hygiene, the XC-05 mutation procedure).
- `.planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-CONTEXT.md` D-04, the wave's changeset policy.
- `.planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-check.mjs`, `88-pinned-check.mjs`,
  `88-mutation.mjs` (`EXAMINED`, `EQUIVALENT`, `UNMEASURED`) and `88-earlier-checks.mjs`: the script pattern for D-20
  and D-21.

### Research
- `.planning/research/SUMMARY.md` §Phase 89 and "Where the researchers disagree" (89: brand versus plain function).
- `.planning/research/ARCHITECTURE.md` §Phase 89: the brand and admission before the span, which D-09 and D-10 take.
- `.planning/research/PITFALLS.md` 89-A (per-pair order), 89-B (plain function, no `Effect.fn`; D-10 overrides its
  "spans unchanged"), 89-C (fragment, not a merged enum; `CodecMade.ts` stays a leaf) and 89-D (`Number.isFinite`,
  `-0`, `+Infinity`, read once; the mutation base).
- `.planning/research/FEATURES.md` §89.1-89.6 (the read-once differentiator D-12 takes; the anti-features).
- `.planning/research/STACK.md` §Phase 89 (the madge graph: no cycle from a module importing only `CodecMade` and
  `AuditEntry`).

### Spec
- `spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md`: decision 1 (the nominal idiom), and the third
  amendment, decisions 1 (key material read once), 3 (`rowsRefusal`, list first), 4 (closed refusal enums) and 5
  (`RowsRefusalCases`, no mapping). Amended by D-22.
- `spec/decisions/110-an-archives-facts-are-computed-once.md`: the span-name sentence, noted by D-22.
- `spec/decisions/099-entry-points-are-a-closed-list.md`: package-private modules stay out of the barrel.
- `spec/decisions/200-one-scoped-run-that-states-its-stop.md` and `201-…`: the audit-table precedent.
- `spec/behaviors/33-audit-pipeline.md`: BEH-QD-253 (709), BEH-QD-254 (773) and BEH-QD-722 (1208; the order
  REQUIREMENTs 1228-1252, "Pinned by" at 1306).
- `spec/invariants.md`: INV-QD-399 and INV-QD-400.
- `AGENTS.md` §4 (`SCHEMA_ERROR_BUDGET` stays 12), §5 (`Effect.fn`; no new `fnUntraced`), §6 (forbidden list,
  `NOT_CALLABLE_PIN_BUDGET`), §7a (`UNTRUSTED_DECODE_BUDGET`: `HostBatch.ts` adds no decode token), §9 (barrels), §15
  (name the script, not the gate number).

### Code
- `packages/audit/src/AuditArchive.ts` (`snapshotKeyMaterial` 72-93, `archiveAuditTrail` 179-208),
  `ArchiveFacts.ts` (refusal 139-148, `verifiedArchiveFacts` 177-189, `verifySequenceIntegrity` 208-210),
  `Retention.ts` (refusal 49-57, `planRetention` 96-123, `planPurge` 165-197), `CodecMade.ts` (held byte-identical),
  `SequenceIntegrity.ts`, `index.ts`.
- `packages/core/src/Admission.ts`: admission as a plain function returning `Result`, package-private.
- `stryker.audit.mjs` (`mutate` 30-36, `ignoreStatic: true` 28, `thresholds.break: 80` 38).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `rowsRefusal` (`CodecMade.ts:63-71`) is the codec question. `admitRows` asks it over its snapshot, unchanged.
- `snapshotKeyMaterial` (`AuditArchive.ts:72-93`) is already a read-once, `Result`-returning terms check. It becomes
  the writer's `terms` with no change to its body.
- `RowsRefusalCases` (`CodecMade.ts:44-49`) is the fragment pattern `NowRefusalCases` copies.
- The `AuditEntry` nominal idiom (`AuditEntry.ts:94-105`: an unexported class with `declare private readonly nominal:
  never`, and `export type { AuditEntry }`) is the brand pattern for `AdmittedRows`.
- `AuditArchive.test.ts:41-77`'s `Tracer.make` name collector is the span reader for D-14.
- `ForeignRows.test.ts`'s `fromStore`, `host` and `handedOver` helpers (29-70) are what the fault helper reuses.

### Established Patterns
- Refusals are closed `Data.TaggedEnum`s read with `Match.tagsExhaustive`. Errors are `Data.TaggedError` with a
  `refusal` field (ADR-QD-190 third amendment, decision 4).
- The writer and the verify are `Effect.fn`s that fail typed. The plans are plain functions returning `Result`. The
  step adapts to both by returning `Result`, and each caller wraps it.
- A refusal value built by one module's `Data.taggedEnum` deep-equals the same member built by another's. Today
  `rowsRefusal`'s values are compared with `ArchiveInputRefusal.EntryNotMadeByCodec(...)` in `ForeignRows.test.ts`.
  So `HostBatch.ts`'s own constructors need no mapping.
- Package-private modules are out of `index.ts`, and the package's `exports` map is closed.

### Integration Points
- `Retention.ts` imports `VerifiedArchive` (type) from `AuditArchive.ts`, and both will import `HostBatch.ts`.
  `HostBatch.ts` imports neither, so `pnpm circular` stays clean. Run it after the move.
- `ArchiveFacts.ts` needs `NowRefusalCases` and `AdmittedRows` as types only. It drops its `rowsRefusal` import.
- No test imports `verifiedArchiveFacts` today, so D-09's retyping touches only D-14's declared region and the
  `.tst.ts` pin.
- `packages/audit/README.md:145, 170` describe the refusal members, which stay true. Edit nothing there unless a
  sentence states the order or the spans.
</code_context>

<specifics>
## Specific Ideas
- The order table at the step is the one place the order is asserted. Every entry-point case compares with the step
  and never restates which refusal wins.
- The characterisation is literal: its expected winners and span lists are written out, so a wrong abstraction in
  `HostBatch.ts` cannot make it pass by construction.
- The review rates this candidate "speculative". The phase's real gains are the type-level "no facts without
  admission", one `NowNotFinite`, the order tested once, and the read-once rule over the whole batch. It must not grow
  a general validation framework: three terms (none, key material, `maxAgeMs`) and one order.
</specifics>

<deferred>
## Deferred Ideas
- **`planPurge`'s `archive` from a JavaScript caller.** It is typed `VerifiedArchive` (nominal), but a value that is
  not one reaches `archive.holds` and throws, after admission, when a row has expired. Refusing it needs a new
  `RetentionInputRefusal` member. That is Breaking, and outside ADMIT-03's "unions unchanged". Record it for a later
  Breaking audit phase.
- **`archiveAuditTrail`'s `options`** given as a non-object reads as "no key material" (`options?.keyMaterial`). That
  is correct today, and the phase leaves it.
- **Folding `SequenceIntegrity.ts` into `ArchiveFacts.ts`** is Phase 91's (D2), with 89's post-review mutation score
  as its base.
</deferred>

<addendum>
## Addendum after research

Added 2026-11-26 after `89-RESEARCH.md` measured the base (probes A and B, the D-09/D-11/D-12 spikes under tsc and tstyche, the mutation base, the earlier-checks ledger). Each entry is decided autonomously under the owner's standing instruction of 2026-11-22. Where an entry and an earlier decision disagree, the entry wins. Evidence for each: the matching section of `89-RESEARCH.md`.


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
</addendum>
