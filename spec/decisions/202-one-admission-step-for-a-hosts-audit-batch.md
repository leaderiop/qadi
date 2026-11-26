# ADR-QD-202 — One admission step for a host's audit batch

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-202                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-26                                     |
> | Status         | Accepted — amends ADR-QD-190 and ADR-QD-110    |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-26): Initial (ARCH-136, CCR-QD-481) |

---

## Context

A host hands `@qadi/audit` a batch: a `now`, a list of rows, and the terms its call adds (key material for the archive
writer, a `maxAgeMs` for retention). Four public calls take one: `archiveAuditTrail`, `planRetention`, `planPurge` and
`verifySequenceIntegrity`. The types do not bind the batch, because a store client's `any` and a JavaScript caller reach
every one of them, so each call checks what it is given
([ADR-QD-190](./190-an-audit-row-is-a-value-only-its-codec-makes.md)).

Each call restated the check, and the restatement had three costs.

- **The order was written four times.** Every dated call checks `now`, then its own terms, then the rows
  ([BEH-QD-722](../behaviors/33-audit-pipeline.md#beh-qd-722-the-archive-writer-refuses-a-non-finite-now-and-writes-key-material-as-declared)),
  and `NowNotFinite` was declared in both public refusal enums. The order was asserted again in every entry point's
  test file, six times, and no test could say which of them was the rule.
- **A fact could be computed from rows nobody admitted.** The sequence check asked the codec's question itself, so the
  rows were asked twice on the writer's path, once by the check and once by the code that built the bundle. A list
  that answers differently when it is read again (a proxy, an accessor) could pass the codec check with one row and be
  archived with another, so the writer returned a bundle its reader refuses
  ([INV-QD-399](../invariants.md#inv-qd-399-every-archive-the-writer-returns-is-read-back-by-its-reader)). Probed on
  the code before this record, the writer, the verify and both plans each judged a row they had not checked.
- **A policy that was `null` or `undefined` threw.** `planRetention` read `policy.maxAgeMs` in three places, once to check it,
  once to name a refused value and once per row, and a policy that is not an object is a `TypeError`, a defect where a typed failure belongs
  ([INV-QD-424](../invariants.md#inv-qd-424-each-input-of-a-hosts-batch-is-read-once-what-was-checked-is-what-is-used-and-no-input-is-a-defect)).
  A primitive policy already answered `MaxAgeInvalid`.

## Decision

1. **One package-private module admits a batch.** `packages/audit/src/HostBatch.ts` is out of the barrel and not
   importable ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)). It imports only `effect/Data`,
   `effect/Result`, `AuditEntry.ts` as a type and `CodecMade.ts`, and no entry-point module imports back, so the module
   graph has no cycle. `CodecMade.ts` answers one question, whether an entry is a row the codec made, as
   `isCodecMade(entry)`, and the step is its consumer: it asks the list question itself, asks `isCodecMade` of each
   entry as it reads it, and builds both row refusals. `CodecMade.ts` stays a leaf, so the guard that reads its answer
   as the row type, `entry is AuditEntry`, is the step's: the record cannot name the row type, because `AuditEntry.ts`
   imports the record to fill it, and a type-only import back is a cycle `pnpm circular` refuses.

2. **The step is a plain function returning a `Result`.** It has no `Effect` and opens no span, so each caller keeps
   the span of its own and wraps the step's answer once: the writer and the verify with
   `Effect.fail(new ArchiveInputInvalid({ refusal }))`, retention with `Result.fail(new RetentionInputInvalid({ refusal }))`.
   It is the shape of the admission in `@qadi/core`'s `Admission.ts`.

   ```ts
   // HostBatch.ts, package-private: out of the barrel, so none of these is a package export
   interface DatedBatch<Terms, Refused> {
     readonly now: number;
     readonly terms: () => Result.Result<Terms, Refused>;
     readonly entries: unknown;
   }
   interface AdmittedBatch<Terms> {
     readonly now: number;
     readonly terms: Terms;
     readonly rows: AdmittedRows;
   }
   const admitRows: (entries: unknown) => Result.Result<AdmittedRows, RowsRefusal>;
   const admitBatch: <Terms, Refused>(
     batch: DatedBatch<Terms, Refused>,
   ) => Result.Result<AdmittedBatch<Terms>, NowRefusal | Refused | RowsRefusal>;
   ```

   The two batch shapes are closed. A call with no `now` and no terms, the public verify, is `admitRows` alone. The
   rows are `unknown` to the step whatever each caller's own parameter says, because a store client's `any` and a
   JavaScript caller reach every entry point, so the step's type states what it is handed. The rejected shapes are in
   the alternatives below.

3. **There is one order: `now`, then the terms, then the rows.** `now` is asked with `Number.isFinite`, never the
   coercing global, so `NaN`, both infinities, a string, `undefined`, `null` and a `bigint` are refused with the value
   given, and `-0` is finite. The terms are a thunk that is called at most once and is not called for a refused `now`.
   The rows are asked last, and are not read for refused terms. A refusal of an earlier input hides every later one.
   The calls differ only in what they pass as terms: the writer its key material, retention and purge their
   `maxAgeMs`, and the verify nothing.

4. **Admitted rows are a type, and only the step makes one.** `AdmittedRows` follows the `AuditEntry` idiom
   ([ADR-QD-190](./190-an-audit-row-is-a-value-only-its-codec-makes.md) decision 1): a class that is not exported, with
   a private `nominal` member, named in a type-only export. `verifiedArchiveFacts` takes `AdmittedRows`, so a fact
   computed from rows the step did not admit does not compile, and the writer asks the codec's question once. The pure
   `archiveFacts` still takes `ReadonlyArray<AuditEntry>`: it is the reader's, over rows `decodeAuditEntry` has just
   made, and a reader that admitted rows it made itself would restate the question.

5. **Each input is read once, and what was checked is what is used.** `admitRows` reads the list's `length` once and
   each index once, in order, and asks `isCodecMade` of each entry as it reads it. It calls no method and no iterator
   the host's object can override. The read stops at the first entry that is not a row the codec made, refused as
   `EntryNotMadeByCodec` with its index, and each entry admitted is pushed into a fresh array, which is the admitted
   rows, so every later read, the facts, the age rule and the purge pass, reads what was checked. A hole reads as
   `undefined` and is refused at its index. Because each entry is checked as it is read, no list is copied whole before
   it is checked: a proxy whose `length` reads `2 ** 32` or `Infinity` is refused at index `0` and a long sparse list at
   its first hole, with no `RangeError`, and a `length` that is not a number (only a proxy answers one) is refused as
   `EntriesNotAList` with the list given, so no comparison converts it. The key material is read once by the writer's own terms
   (`snapshotKeyMaterial`, [ADR-QD-190](./190-an-audit-row-is-a-value-only-its-codec-makes.md) third amendment). The
   retention terms read `policy?.maxAgeMs` once, admit it only when it is a number (`typeof value === "number"`) from
   zero up, refuse anything else as `MaxAgeInvalid { value }` without converting it, and return the number, and the
   age rule compares with that number and never reads the policy again. `null`, a boolean, a string, a list, a boxed
   number, an object with its own `valueOf`, a Symbol and an object with no prototype are each refused with the value
   given: a relational check alone would read the first four as `0` and expire every row, convert an object once per
   row, and throw on a Symbol. A policy that is `null` or `undefined` reads as `MaxAgeInvalid { value: undefined }`,
   the refusal `{}` gets, so it is a typed failure and no new member joins the closed enum.

6. **`NowNotFinite` is stated once.** `NowRefusalCases` is declared in `HostBatch.ts` beside the check that answers it,
   as `RowsRefusalCases` is declared beside the codec's record in `CodecMade.ts`, and each public enum is its fragments plus its own members:
   `ArchiveInputRefusal` is `RowsRefusalCases & NowRefusalCases & { KeyMaterialNotAList; KeyMaterialItemRefused }` and
   `RetentionInputRefusal` is `RowsRefusalCases & NowRefusalCases & { MaxAgeInvalid }`. Each keeps its own
   `Data.taggedEnum` constructors, so `ArchiveInputRefusal.NowNotFinite(…)` and `RetentionInputRefusal.NowNotFinite(…)`
   still exist, and the two enums and the two error classes keep every tag, member and field. The step's refusal is a
   union of those members and is assignable to the caller's enum with no mapping
   ([ADR-QD-190](./190-an-audit-row-is-a-value-only-its-codec-makes.md) decision 5). `NowRefusalCases` is not exported
   from the package.

7. **The span rule: the sequence check's span opens only when the check runs, on admitted rows.** A refused input was
   never checked ([ADR-QD-051](./051-a-span-says-what-was-asked.md): a span says what was asked). Admission runs
   before any span-opening step of the call's own work, so two refusal traces move and every other trace is as it was.

   | Call | Outcome | Spans it opens |
   | ---- | ------- | -------------- |
   | `archiveAuditTrail` | refused for `now` or key material | `qadi.audit.archiveAuditTrail` (unchanged) |
   | `archiveAuditTrail` | refused for its rows | `qadi.audit.archiveAuditTrail` alone (the sequence span moved out) |
   | `archiveAuditTrail` | admitted | `qadi.audit.archiveAuditTrail` with the child `qadi.audit.verifySequenceIntegrity` (unchanged) |
   | `verifySequenceIntegrity` | refused for its rows | none (the sequence span moved out) |
   | `verifySequenceIntegrity` | admitted | `qadi.audit.verifySequenceIntegrity` alone (unchanged) |
   | `planRetention`, `planPurge` | any | none (unchanged) |

   A refused archive still fails inside its own span, and a refused verify is a typed failure in the host's own span.
   `verifiedArchiveFacts` keeps the span `qadi.audit.verifySequenceIntegrity` and fails only `SequenceIntegrityError`.
   The public verify stays an unnamed `Effect.fn` that delegates, so a call opens exactly one span.

8. **Each entry point calls the step first.** `archiveAuditTrail` admits
   `{ now, terms: () => snapshotKeyMaterial(options?.keyMaterial), entries }` as its first statement, then builds the
   bundle from the admitted `now`, key material and rows. `verifySequenceIntegrity` admits its rows first. `planRetention`
   admits `{ now, terms: () => maxAgeOf(policy), entries }` and runs a module-private age rule over the admitted batch.
   `planPurge` admits its own batch the same way, runs the same age rule and then the archive pass over the admitted
   rows; it does not map `planRetention`, which would read the rows a second time, and the archive is never asked
   about a refused batch.

9. **The order is tested once.** `HostBatch.test.ts` holds the order table over stub terms, for every subset of the
   four faults. Each entry point has one case that runs a shared fault table through the entry point and through the
   step and asserts that the two refusals are equal, which proves the entry point calls the step without restating
   which refusal wins.

## Audit of the rows this decision removes

Six rows of existing test files restated the order of the checks per entry point, and the order is asserted once, at the
step. Each row is removed and each property it pinned is held by a row of `HostBatch.test.ts`, with the comparison
row of `ForeignRows.test.ts` proving the entry point calls the step.

| Row | File | What it pinned | Held by |
| --- | ---- | -------------- | ------- |
| `a non-finite now is refused before the rows are read` | `ForeignRows.test.ts` | the writer refuses a `NaN` `now` over rows that are not made by the codec | H7, H8; the comparison row `archiveAuditTrail refuses each batch as the admission step refuses it` |
| `planRetention reads now and maxAgeMs before the rows` | `ForeignRows.test.ts` | `planRetention` answers `NowNotFinite`, then `MaxAgeInvalid`, over rows the codec did not make | H6, H9, H10; the comparison row `planRetention refuses each batch as the admission step refuses it` |
| `the inputs read before the rows are still read first` | `ForeignRows.test.ts` | a bad `now`, bad key material or a bad `maxAgeMs` is refused over rows that are not a list | H7, H9; the comparison rows `archiveAuditTrail refuses each batch as the admission step refuses it` and `planRetention refuses each batch as the admission step refuses it` |
| `now is read before the keys, and the keys before the rows` | `ForeignRows.test.ts` | the writer refuses a `NaN` `now` before an item of key material, and the item before the rows | H6, H10; the comparison row `archiveAuditTrail refuses each batch as the admission step refuses it` |
| `the rows are read after the keys the reader reads` | `ForeignRows.test.ts` | the writer reads admitted key material and then refuses the first row the codec did not make | H5; the comparison row `archiveAuditTrail refuses each batch as the admission step refuses it` |
| `checks now before maxAgeMs` | `Retention.test.ts` | `planRetention` answers `NowNotFinite` for a `NaN` `now` with a negative `maxAgeMs` | H6; the comparison row `planRetention refuses each batch as the admission step refuses it` |

Tests removed: 6.

No property is lost. The rows the audit leaves in those two files, the refusal of each value that is not a list by
each of the four calls, the rows refused before a sequence break, the purge failing before the archive is asked and
every positive twin, keep their bodies. The characterisation file `AdmissionOrder.characterisation.test.ts` was
written on the code before the change and holds literally which refusal wins for each pair of faults per entry point.
Six declared regions of it moved, each held as its exact lines. With the change: the import of the direct rows, the
list helper they dropped, the four span rows of decision 7 and the rows that call `verifiedArchiveFacts` directly, which
take only admitted rows. With the review of the change: the file's header, which names the six, the impossible fault
pairs, a comment where an unread export was, the titles of the four span rows, which state the trace each asserts, and
two of the direct rows, which assert that `verifiedArchiveFacts` never runs on refused rows.

## Alternatives considered

- **A span on the step.** Rejected: the step is the same for four callers that each own a span, and a span says what
  was asked ([ADR-QD-051](./051-a-span-says-what-was-asked.md)). A fifth name would open on every call and change the
  success traces the held rows pin.
- **Admission inside the verify span, keeping the verify's refusal trace.** Rejected: `verifiedArchiveFacts` would
  take raw rows, the writer would ask the codec twice, and the brand would go. The writer admits its whole batch
  first, so its refusal trace moves under any design that does; one rule for both is the consistent one.
- **Naming the public verify's own `Effect.fn`, or two `Effect.fn`s sharing one span-name literal.** Rejected: a
  successful verify would open two spans, which breaks the held success-span row, and a name stated twice is the drift
  [ADR-QD-110](./110-an-archives-facts-are-computed-once.md) removed.
- **Folding this record into a fourth amendment of ADR-QD-190.** Rejected: the change adds a module and a brand,
  moves two traces, fixes three defects and carries its own rejected alternatives and audit table, and folded in it
  would bury the span rule. ADR-QD-190 and ADR-QD-110 each take a dated amendment that points here.
- **A new refusal member for a policy that is not an object.** Rejected: a new member of `RetentionInputRefusal` is a
  Breaking change. `MaxAgeInvalid { value: undefined }` is the refusal `{}` already gets.
- **`planPurge` mapping `planRetention`.** Rejected: it reads the rows twice, once to plan and once for the archive
  pass, so the pass could read rows the step did not check.
- **One function over a tagged union of the three batch kinds, or `now?` and `terms?` as optional fields.** Rejected:
  the output differs per kind, which needs overloads or a conditional return type, and optional fields widen the
  input to absent values the order would then branch on. Two closed shapes state the same thing without a hole.
- **A refusal-or-`undefined` return.** Rejected: the writer must write the key material it checked, so the step has to
  return what it admitted, and a bare refusal would force a second read.
- **A flat order of `now`, rows, then terms.** Rejected: it changes which refusal wins for key material and rows and
  for `maxAgeMs` and rows. The order is the one every call had.
- **Branding the array itself, or branding `archiveFacts` too.** Rejected: minting a branded array needs a cast, and
  the reader would admit rows it made itself.
- **One shared public refusal enum or error, or exporting `NowRefusalCases`.** Rejected: a shared enum reopens ADR-QD-190
  and is Breaking, and an export moves the surface for a type no host needs.
- **A duty with no type, a comment that says "admit first".** Rejected: the types make facts from unadmitted rows a
  compile error, and a comment does not.

## Consequences

- **Two refusal traces change, and are pinned.** A refused `archiveAuditTrail` opens only its own span, and a refused
  `verifySequenceIntegrity` opens none. Every success trace and every span name is unchanged.
- **Three defects are fixed.** The rows are read once and the admitted array is what the facts, the bundle and the age
  rule use, so a list that answers differently on a second read cannot make the writer return a bundle its
  reader refuses ([INV-QD-399](../invariants.md#inv-qd-399-every-archive-the-writer-returns-is-read-back-by-its-reader)).
  A `null` or `undefined` policy is the typed refusal `MaxAgeInvalid { value: undefined }` and not a `TypeError`. A
  `maxAgeMs` that is not a number is `MaxAgeInvalid` with the value given, where `null`, `false`, `""` and `[]` were
  read as a limit of `0` and selected every archived row for purge.
- **Nothing public moves.** Both refusal enums, both error classes and every tag, member and field are as they were;
  `SCHEMA_ERROR_BUDGET` is unmoved, no export is added or removed, and `spec/overview.md` and `AGENTS.md` are unchanged.
  The change is a `@qadi/audit` patch.
- **`maxAgeMs` is read once.** The count was one read to check it plus one per row, and two for a refused value, and is one.
- `HostBatch.ts` is inside `stryker.audit.mjs`'s glob. The change's own close run detected every valid mutant of it
  (38 of 38, none surviving), and its one static mutant, the arrow of the row-type guard, and `CodecMade.ts`'s one, the
  arrow of `isCodecMade`, were each run by hand with static mutants on and killed. That record is the change's, kept
  with its planning, not a merge gate: `pnpm mutation` breaks only when the audit package as a whole scores below 80%.
- **Deferred.** A `planPurge` `archive` that is not a `VerifiedArchive`, from a JavaScript caller, reaches
  `archive.holds` and throws when a row has expired. Refusing it needs a new `RetentionInputRefusal` member, which is
  Breaking, so it is left for a later audit of the Breaking changes.

## What enforces it

- `pnpm test`, the `audit` project:
  - `packages/audit/test/HostBatch.test.ts`: H1 to H22, the order table over stub terms for every subset of the faults
    (H2 to H12), the terms called once and never for a refused `now` (H13), the rows unread for refused terms (H14),
    the `now` boundary (H15, H16), the seven values that are not a list, a hole, a list that answers differently on a
    second read, one read of the length and of each index, the empty list and the fresh array (H17 to H22).
  - `packages/audit/test/AdmissionOrder.characterisation.test.ts`: W1 to W18, R1 to R13, P1 to P13 and V1 to V4, which
    refusal wins for each pair of faults per entry point, written out literally; O1 to O3, the first fault of any set;
    S1 to S8 and SF1 to SF4, the spans each outcome opens; L1 to L5, what a refusal leaves unread; F1, F2 and F5,
    `verifiedArchiveFacts` over admitted rows; F3 and F4, a list `admitRows` refuses, over which neither the verify
    nor the writer opens the span of `verifiedArchiveFacts`.
  - `packages/audit/test/BatchReadOnce.test.ts`: B1 to B5, `maxAgeMs` read once and a policy that is not an object
    refused, and B6 to B13, what was checked is what is used and the rows list is read once.
  - `packages/audit/test/RowListAdmission.test.ts`: X1 to X5, a rows list checked as it is read: a `length` past any
    array's refused at index 0 by the step and by each entry point with no `RangeError`, a long sparse list and a long
    list with a foreign entry stopped at index 1 having read two indexes, and a `length` that is not a number refused.
  - `packages/audit/test/MaxAgeAdmission.test.ts`: M1 to M4, a `maxAgeMs` that is not a number refused by each plan
    as `MaxAgeInvalid` with the value given, never converted and never thrown.
  - `packages/audit/test/ForeignRows.test.ts`: the describe `each function that takes a batch refuses what the admission
    step refuses`, one case per entry point.
  - `packages/audit/test/AuditArchive.test.ts`, held: the two success spans.
- `pnpm test:tstyche`, `packages/audit/test/HostBatch.tst.ts`: each refusal union is its spelled members and its
  fragments plus its own members, the shared members are one type, and `AdmittedRows` is nominal. The pins hold the
  member set, the tags and the field types. They do not hold that `NowNotFinite` is stated once: `Data.TaggedEnum`
  maps the keys of the intersection, so a second declaration with the same field type gives the identical union and
  passes every pin. That decision 6 holds by construction, because both unions are built from `NowRefusalCases`, and
  it is judged by the change's own `admission-step` check (`89-check.mjs`, kept with its planning), which `pnpm check`
  does not run; past the change, it is a rule a review keeps.
- `pnpm mutation` (`stryker.audit.mjs`): the gate is the audit package's break threshold, 80% of its valid mutants as a
  whole, not a floor per file. The change's close measured `HostBatch.ts` at 38 of 38 detected and every file it
  touched at 100%, which is its own record, not what the gate checks.
- `pnpm circular`, which finds no cycle from `HostBatch.ts`, `pnpm spec:api`, which finds no export moved, and
  `node scripts/check-house-style.mjs`.
- The merge gate by command (`pnpm check`), never by number.

## Related

- [ADR-QD-190](./190-an-audit-row-is-a-value-only-its-codec-makes.md) — an audit row is a value only its codec makes;
  amended: `NowNotFinite` joins the discipline of `RowsRefusalCases`, and the rows are asked once, by the step
- [ADR-QD-110](./110-an-archives-facts-are-computed-once.md) — an archive's facts are computed once; amended: the span
  keeps its name and opens only for admitted rows
- [ADR-QD-056](./056-audit-companion-package.md) — the companion package
- [ADR-QD-051](./051-a-span-says-what-was-asked.md) — a span says what was asked
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md) — the step stays out of the barrel
- [BEH-QD-781](../behaviors/33-audit-pipeline.md#beh-qd-781-one-admission-step-checks-a-hosts-batch-in-one-order-and-every-entry-point-calls-it-before-any-work-of-its-own),
  [BEH-QD-782](../behaviors/33-audit-pipeline.md#beh-qd-782-each-entry-point-refuses-exactly-what-the-step-refuses-for-the-same-batch),
  [BEH-QD-783](../behaviors/33-audit-pipeline.md#beh-qd-783-the-sequence-checks-span-opens-only-for-admitted-rows),
  [BEH-QD-784](../behaviors/33-audit-pipeline.md#beh-qd-784-nownotfinite-is-one-case-shared-by-both-refusal-enums-and-both-enums-keep-every-member-tag-and-field)
  and [BEH-QD-785](../behaviors/33-audit-pipeline.md#beh-qd-785-a-policys-maxagems-is-read-once-and-a-policy-that-is-not-an-object-is-maxageinvalid),
  which state it
- [INV-QD-423](../invariants.md#inv-qd-423-no-fact-plan-or-sequence-check-is-computed-from-host-rows-the-admission-step-did-not-admit)
  and [INV-QD-424](../invariants.md#inv-qd-424-each-input-of-a-hosts-batch-is-read-once-what-was-checked-is-what-is-used-and-no-input-is-a-defect),
  the two invariants it adds
