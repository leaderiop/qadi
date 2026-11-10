---
id: ARCH-38
title: A purge plan needs a verified archive as evidence — purge selects only rows an archive read back from storage holds; the decommissioning checklist is deleted (or fixed) on the deletion test
strength: Worth exploring   # from the 2026-10-07 architecture review (wave 4), card c9
status: done
evidence_verified_at: e635e68
depends_on: []              # ARCH-29 T1/T2/T3 (archive order, planRetention) landed and are built on, not redone
blocks: []
adrs_touched:
  - ADR-QD-056 (amend, dated block: "archive before purge" moves from a documented caller duty to a mechanical one — a purge selects only rows a `VerifiedArchive` holds; a stored archive is read back through `readAuditArchive`; the decommissioning checklist is retired (D-38-e = A) or typed and ordered (= C); the six-step sequence in Consequences — Positive is restated. The tamper-evidence and gap-marker negatives are unchanged)
  - ADR-QD-016 / spec/urs.md §1.1 / spec/roadmap.md:336 (constraint: GxP and 21 CFR Part 11 are explicitly NOT planned; durability and tamper-evidence are out of scope. A `VerifiedArchive` proves only what the bytes handed back say — it must never be described as proof of durable storage, retention compliance or tamper-evidence)
  - ADR-QD-095 / ADR-QD-096 (constraint: entries are read back through `decodeAuditEntry`, wire version 2 only)
  - ADR-QD-097 (constraint: the archive keeps its sequence order; time order stays a reader's job — ARCH-29 D-29-a is not contradicted)
  - ADR-QD-054 (constraint: the new errors are `@qadi/audit`'s own `Data.TaggedError`s)
  - ADR-QD-037 (constraint: madge; `Retention.ts` imports `AuditArchive.ts`, never the reverse)
  - ADR-QD-099 (constraint: closed entry points; new exports go through the barrel and `spec/overview.md`)
  - ADR-QD-076 (constraint: `ignoreStatic`; per-call code only, pinned by tests)
  - ADR-QD-038 (constraint: changeset, fixed version group; no release step)
packages: ["@qadi/audit"]
estimate: M   # ≈ 2 days for T0–T11. Defect-only path (T1 + T2) ≈ 2 hours (S)
---

# ARCH-38 — A purge plan needs a verified archive as evidence

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68`. ARCH-29 (`planRetention`, INV-QD-101, the archive-order pins) landed in
that commit, so the review's `Retention.ts` lines moved. Probes ran from the scratchpad (a
`node_modules` symlink to `packages/audit/node_modules` sits beside them):

- **`probe-purge.mts`** builds entries with the real `encodeAuditEntry`, archives with
  `archiveAuditTrail`, selects with `getPurgeableEntries`/`planRetention`, round-trips rows through
  JSON text and `decodeAuditEntry`, compares them by reference, `Schema.toEquivalence(AuditEntry)`,
  `Equal.equals` and `Hash.hash`, and drives `completeDecommissioningStep`.
- **`probe-hashmap.mts`** checks that an `effect/MutableHashMap` keyed by plain `AuditEntry`-shaped
  objects matches structurally (and misses on a different `sequenceNumber`), and times 20 000 lookups.
- **`tsprobe/`** type-checks (strict, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`,
  `--declaration`) an unforgeable evidence type: an **unexported** class with an ECMAScript `#private`
  field, exported only as `export type VerifiedArchive = VerifiedArchiveImpl`. `tsc` exits 0, the
  `.d.ts` emits the class as a non-exported `declare class`, and a `@ts-expect-error` on an object
  literal forging it holds.

Run: `cd packages/audit && NODE_OPTIONS="--conditions=bun" ../../node_modules/.bin/tsx /private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-38/probe-purge.mts`
(and `…/probe-hashmap.mts`); `cd …/ARCH-38/tsprobe && <repo>/node_modules/.bin/tsc --ignoreConfig --strict --exactOptionalPropertyTypes --verbatimModuleSyntax --allowImportingTsExtensions --rewriteRelativeImportExtensions --declaration --target es2022 --module nodenext --moduleResolution nodenext --outDir out brand.ts use.ts`.

| # | Claim (review card c9, and brief) | Verdict | At `e635e68` |
| - | --------------------------------- | ------- | ------------ |
| C1 | `Retention.ts:96-113`: "archive before purge … documented, not mechanically enforced" | **CHANGED (lines) / CONFIRMED** | Now `getPurgeableEntries`' doc, `Retention.ts:87-100`; the sentence is `:96-99` ("This invariant is documented, not mechanically enforced — `@qadi/audit` has no scheduler and no archival store of its own to check against … nothing here that could enforce it even if it tried"). `enforceRetention` (`:111-127`) repeats the duty. `planRetention` (`:59-85`, ARCH-29) decides by age alone too. Probe P1: archive holds `e1`; `getPurgeableEntries([e1,e2,e3,e4], {maxAgeMs:0}, …)` selects all four, **3 never archived**; P6: `planRetention(...).purged` has 4. The README repeats the duty (`packages/audit/README.md:93-97`). |
| C2 | `AuditArchive.ts:96`: `archiveAuditTrail` already runs the integrity check | **CONFIRMED** | `archiveAuditTrail` is `:95-119`; `yield* verifySequenceIntegrity(entries)` at `:100`, then the stable sort (`:102-104`) and `sequenceIntegrityVerified: sequencedCount >= 2` (`:113`). |
| C3 | `DecommissioningChecklist.ts`: `completeDecommissioningStep` takes `stepId: string` though a union exists | **CONFIRMED** | `:77` `stepId: string`; the union `DecommissioningStepId` is `:15-21`. Probe P4: `"decomm-001"` compiles and fails only at runtime (`UnknownDecommissioningStep`). |
| C4 | It doesn't enforce order | **CONFIRMED** | No order check (`:81-91`). Probe P4: `DECOMM-006` ("Notify the regulatory authority") completes on a fresh checklist with `DECOMM-001`…`005` open. |
| C5 | DECOMM-002 repeats DECOMM-001 | **CONFIRMED** | `:37-38`: 001 "Export the full audit trail to an archive", 002 "Verify the archived entries' sequence integrity". The only way this package exports an archive is `archiveAuditTrail`, which **is** the verification (C2) and refuses to build an unverified one. 002 can never be false once 001 is true. |
| C6 | No caller outside audit's own tests | **CONFIRMED** | `grep -rln -e getPurgeableEntries -e enforceRetention -e planRetention -e archiveAuditTrail -e DecommissioningChecklist -e completeDecommissioningStep -e makeDecommissioningChecklist -e verifySequenceIntegrity --exclude-dir=node_modules --exclude-dir=lib .` → only `packages/audit/{src,test,README.md,CHANGELOG.md}`, `spec/*`, and `apps/website/.../packages/audit/capabilities.md` (prose plus one `ts` fence that calls `enforceRetention`, `:93-97`). Nothing in `examples/` or `features/`. |
| C7 | ARCH-29 T1/T2 landed; the archive order is intended and tested (ADR-056 gives ordering to readers) — do not contradict | **CONFIRMED; not contradicted** | `AuditArchive.test.ts:76-120` and BEH-QD-254's last REQUIREMENT pin "sequenced first in number order, unsequenced after in input order". This plan reads that order back (`readAuditArchive` refuses a bundle not in that order) and never re-sorts. ARCH-29 §3 listed "any notion of 'archived'" as a non-goal; this plan is that next step. |
| C8 | Regulatory framing (21 CFR Part 11?) | **CONFIRMED: explicitly out of scope** | `spec/roadmap.md:336` "GxP / 21 CFR Part 11 support" is under **Explicitly not planned** (ADR-QD-016). `spec/urs.md:32-48` §1.1 puts "Durability and cryptographic tamper-evidence of an audit trail" and "Regulated-environment qualification" out of scope; `@qadi/audit` "owns no storage of its own … and offers no cryptographic proof against tampering". So a purge plan carries weight as **a deletion selector that can destroy un-archived evidence** (INV-QD-101's framing), not as a compliance claim. The plan must say what a `VerifiedArchive` proves (the bytes handed back decode, are complete by count and pass the gap check) and what it does not (that they are durably stored, untampered, or retained long enough). |
| C9 | *(found)* A stored archive has no reader | **CONFIRMED (gap)** | `AuditArchive` is a plain interface (`:35-56`); the module exports `archiveAuditTrail` and three types (`spec/overview.md:700-701`). ADR-QD-056's 2026-10-06 amendment says an archive "is migrated entry by entry", but there is no function that reads a bundle back. Any `{ archiveVersion: "1", metadata: { entryCount: 99, sequenceIntegrityVerified: true }, entries: [] }` is an `AuditArchive` (P3). |
| C10 | *(found)* Entry identity across a store round trip | **CONFIRMED structural, not referential** | P2: after `JSON.stringify` → `JSON.parse` → `decodeAuditEntry`, the row is `!==` the original but `Schema.toEquivalence(AuditEntry)`, `Equal.equals` and `Hash.hash` all agree; also for an unsequenced row, a `Failed` row carrying a `Defect`-encoded cause, and a row whose record keys came back in another order (`decodeAuditEntry` rebuilds in schema order, so even `JSON.stringify` agrees afterwards). Different rows with the same `evaluationId` (a `Decision` and its `Obligations` row) are **not** equal. `probe-hashmap.mts`: a `MutableHashMap` keyed by plain rows hits structurally, misses on a changed `sequenceNumber`; 20 000 inserts + lookups ≈ 0.5 s. |
| C11 | *(found)* `AuditArchive.ts`'s header misnumbers its step | **CONFIRMED (doc defect)** | `:3-4` "the second of the six DecommissioningChecklist steps" — exporting an archive is `DECOMM-001` (`DecommissioningChecklist.ts:37`), not the second. **T1.** |
| C12 | *(found)* The checklist's order cannot be satisfied | **CONFIRMED (content defect)** | `DECOMM-005` "Record the final audit entry" comes **after** `DECOMM-001` "Export the full audit trail to an archive": the final entry is recorded after the export, so a checklist completed in its own order produces an archive that lacks the final entry — "full" is false by construction. |
| C13 | *(found)* Re-completing a step silently overwrites who completed it | **CONFIRMED (behaviour defect, by the module's own "refuse rather than approximate" rule, `:63-68`)** | P4: completing `DECOMM-006` as `alice` at 10, then as `mallory` at 20, leaves `{ completedAt: 20, completedBy: "mallory" }`; alice's record is gone. |
| C14 | *(found)* The checklist has no behaviour spec; its test is mis-traced | **CONFIRMED** | No `BEH-QD` mentions `DecommissioningChecklist`, `completeDecommissioningStep` or `UnknownDecommissioningStep` (`grep -rn DECOMM spec` → only `overview.md:702-704`). `spec/traceability.md:391` maps `DecommissioningChecklist.test.ts` to **BEH-QD-254**, which is sequence integrity. **T1.** |
| C15 | *(found, mutation)* `SequenceIntegrity.ts` has 7 survivors | **CONFIRMED (equivalent mutants)** | `reports/mutation-audit/mutation.json`: `:40-42` filter → identity / `true`, `:45` `<` → `<=`, `:48` three mutants of the `previous === undefined \|\| actual === undefined` guard. All seven are equivalent: the guard is unreachable (indices are in range), and `toSorted` places `undefined` last without calling the comparator, so the filter's removal changes nothing observable. They are 7 of audit's 55 survivors (score 87.44 %). The `T6` read-back restates the loop so no unreachable guard exists. |

## 2. Goal and success criteria

**Goal.** "Archive before purge" is today a sentence in three doc comments and the README, and the
package's own selector (`getPurgeableEntries`, `planRetention`'s `purged`) returns rows to delete that
it knows nothing about. The ordering lives in the caller's head; this package is the one place that
could hold it, and doesn't. This plan makes **evidence** a value. `readAuditArchive(input: unknown)`
reads a stored archive bundle back — every entry through `decodeAuditEntry`, the count, the sequence
check, the sequence order — and returns a **`VerifiedArchive`**, a type no caller can build by hand.
**`planPurge(entries, policy, now, archive)`** is then the **only** function in the package that
returns rows to delete, and it can only select rows the archive holds (structural membership,
counted). The archive is the **seam**: whatever a deployment's long-term store is, the purge depends
on what that store gave back, not on what the caller believes. **Locality:** the archive-before-purge
rule, and the one age rule (INV-QD-101), live in one function. **Depth:** a three-argument selector
becomes a four-argument one whose fourth argument carries the whole ordering constraint. The
decommissioning checklist fails the deletion test — deleting it removes no logic any caller has,
and its one mechanical step (export + verify) is now `archiveAuditTrail` + `readAuditArchive` — so it
is retired (D-38-e), and its procedure moves to the docs where it never pretended to be enforced.

**Success criteria.**

1. **No archive, nothing selected:** there is no way to obtain a purge selection without a
   `VerifiedArchive` — `getPurgeableEntries` is gone (D-38-a = A), `planRetention` no longer names
   anything "purged" (D-38-f), and `planPurge` requires the archive by type
   (`pnpm typecheck`, a `@ts-expect-error` in `Retention.tst.ts`).
2. **An unarchived entry is retained:** for any entries and archive, `planPurge(...).purge ⊆ archive`
   (multiset) and every age-eligible row the archive lacks is in `retain` and `unarchived` — a
   `fast-check` property in `Retention.test.ts`.
3. `purge ∪ retain = entries`, `purge ∩ retain = ∅`, `undated ⊆ retain`, `unarchived ⊆ retain`
   (INV-QD-053 restated over `planPurge`); INV-QD-101 still holds (`purge` ⇒ finite age past a valid limit).
4. `readAuditArchive(JSON.parse(JSON.stringify(archiveAuditTrail(...))))` succeeds, and each
   corruption — a malformed bundle, a wrong `archiveVersion`, an undecodable entry, a count mismatch,
   a gap or duplicate, an out-of-order bundle, a `sequenceIntegrityVerified: true` with fewer than two
   sequenced entries — is refused with its own `ArchiveRefusal` tag (`AuditArchive.test.ts`).
5. An object literal is not assignable to `VerifiedArchive` (`@ts-expect-error` holds).
6. `AuditArchive.ts`'s header names the right step; `traceability.md` maps no audit test to a BEH it
   does not test (T1).
7. 0 survivors in `AuditArchive.ts`, `Retention.ts`, `SequenceIntegrity.ts` under
   `pnpm exec stryker run stryker.audit.mjs` (removing C15's seven equivalent mutants).
8. `node scripts/check-api-surface.mjs`, `pnpm circular`, `node scripts/check-house-style.mjs`
   (budgets unchanged), `pnpm check` green.

## 3. Non-goals

- **Proving durable storage, retention compliance or tamper-evidence** (C8). The archive is still a
  bundle of rows with gap-and-duplicate detection; signing/sealing stays outside the library
  (ADR-QD-016, `AuditArchive.ts:27-34`). Docs must not imply otherwise.
- **Deleting anything.** `@qadi/audit` still owns no storage; `planPurge` selects, the caller deletes.
- **Re-ordering the archive** (ARCH-29 D-29-a). The read-back checks the order `archiveAuditTrail`
  writes; it never sorts by `at`.
- **A new archive bundle version.** `archiveVersion` stays `"1"`: the bundle shape is unchanged; this
  plan adds a reader for it.
- **Gap markers for breaker drops** (ADR-QD-056 open question; ARCH-35 exposes the outcome).
- **Retention by record kind** (`ObligationRecord` vs `DecisionRecord` ages) — unchanged.
- **Key revocation, regulator notification, storage transfer** — the checklist's steps 003, 004, 006 are
  actions this package has no part in (`packages/audit/README.md:73-75`); nothing here models them.

## 4. Constraints

- **AGENTS.md §1.** Submodule imports (`effect/Data`, `effect/Result`, `effect/MutableHashMap`,
  `effect/Schema`, `effect/Match`), `.ts` relative imports, `import type`.
- **§4.** `ArchiveNotVerified` is a `Data.TaggedError` carrying a closed `ArchiveRefusal`
  (`Data.taggedEnum`); `RetentionInputInvalid` reused. `SCHEMA_ERROR_BUDGET` (core `Errors.ts` only) unchanged.
- **§5.** `readAuditArchive` and `planPurge` are pure and return `Result` (the `planRetention`
  precedent, `Retention.ts:59-63`), so no `Effect.fn` is needed. `archiveAuditTrail` stays `Effect.fn`.
  No `Effect.fnUntraced`.
- **§5a.** Any dispatch on `ArchiveRefusal` (a `describeArchiveRefusal` sentence, if added) is a
  module-scope `Match.type`. No `switch`.
- **§6.** No `as`, `!`, `any`. The evidence brand is the `#private` unexported-class pattern proven in
  `tsprobe/` — no type assertion, no `unique symbol` (an exported interface naming an unexported
  symbol fails `.d.ts` emission). Membership is a `MutableHashMap<AuditEntry, number>` — never a
  `Record<string, unknown>` (user rule) and never `JSON.stringify` keys.
- **User rule: closed union over widening.** `ArchiveRefusal` is spelled in full.
- **ADR-QD-037.** `Retention.ts` imports `AuditArchive.ts` (for `VerifiedArchive`); `AuditArchive.ts`
  imports `AuditEntry.ts` and `SequenceIntegrity.ts`, never `Retention.ts`. madge counts type-only edges.
- **ADR-QD-099 / §9.** New exports go through `packages/audit/src/index.ts` and are named in
  `spec/overview.md` (gate 13). Deleting `DecommissioningChecklist.ts` removes its barrel line and rows.
- **INV-QD-053, INV-QD-101** stay true, restated over `planPurge`. **BEH-QD-254**'s order REQUIREMENTs
  are read, not changed.
- **§12.** If the website `capabilities.md` fence changes from `ts` to `typescript` it must compile
  (`check-website-doc-examples.mjs`); otherwise update it as a `ts` fragment.
- **Coverage 90 %** for `packages/audit/src/**`.

## 5. Decisions needed before work starts

### D-38-a — What happens to the age-only selectors? (breaking)

- **(A) Delete `getPurgeableEntries` and `enforceRetention`.** Purge selection exists only in
  `planPurge`. They have no callers outside audit's tests and docs (C6); each exists to feed a
  deletion with no evidence, which is exactly the failure mode INV-QD-101's framing names. INV-QD-053
  is restated over `planPurge`.
- **(B) Keep them, `@deprecated`, pointing at `planPurge`.** Non-breaking; the unsafe selector stays
  one import away and keeps its "documented, not enforced" paragraph.
- **(C) Keep the names, add a required `archive` parameter.** Breaking anyway, with names that no
  longer say what they do.

**Recommendation: (A).** Breaking → **needs user sign-off.** `status: decided (2026-10-08, recommended default)`

### D-38-b — What counts as evidence?

- **(A) Only an archive read back: `readAuditArchive(input: unknown)`.** The bytes a caller's
  long-term store returns are decoded and checked; `archiveAuditTrail`'s in-memory result is **not**
  evidence. A purge then depends on the store's answer, which is the closest this package can get to
  "it was stored" without owning storage. Docs say plainly that it verifies what it is handed, not
  that the store is durable.
- **(B) Also accept `archiveAuditTrail`'s result** (it returns a `VerifiedArchive`). Simpler, but
  "archived" then means "bundled in this process a moment ago" — the over-claim ADR-QD-016 warns about.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-38-c — How is `VerifiedArchive` unforgeable?

- **(A) Unexported class with an ECMAScript `#private` field, exported only as a type** (`tsprobe/`:
  `tsc` 0, `.d.ts` emits a non-exported `declare class`, object-literal forgery is a type error).
  First use of the pattern in this repo; precedent for module-private brands is
  `FieldPath.ts:163`'s module-private `unique symbol`.
- **(B) `Data.TaggedClass("VerifiedArchive")`.** House idiom, but its constructor is public:
  `new VerifiedArchive({...})` forges evidence.
- **(C) `Brand.nominal`/`Schema.brand`.** Type-level only; the brand constructor is public, so forging
  is one call.

**Recommendation: (A).** Runtime forging through reflection is out of scope; the type is the guard.
`status: decided (2026-10-08, recommended default)`

### D-38-d — Entry identity in membership

- **(A) Structural, counted:** `MutableHashMap<AuditEntry, number>` built from the archive's decoded
  entries; `planPurge` consumes a count per selected row, so two identical trail rows need two in the
  archive. Probe C10: equal across a JSON round trip, distinct for a different `sequenceNumber` or a
  sibling row of the same evaluation.
- **(B) Structural set** (ignore counts): two identical rows are both purged on one archived copy.
- **(C) Keyed by `sequenceNumber`:** unsequenced rows can never be purged, and a renumbered or edited
  row with the archived number would be purged although its content was never archived.
- **(D) By reference:** works only within one process run; fails the read-back design (D-38-b).

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-38-e — The decommissioning checklist (deletion test; breaking)

- **(A) Delete `DecommissioningChecklist.ts`** (`makeDecommissioningChecklist`,
  `completeDecommissioningStep`, `DecommissioningChecklist`, `DecommissioningStep`,
  `DecommissioningStepId`, `UnknownDecommissioningStep`). Deletion test: no caller (C6), no behaviour
  spec (C14), no mechanical guarantee (C4, C13), a step that is redundant (C5) and an order that
  contradicts itself (C12). Its one mechanical part is now `archiveAuditTrail` → store →
  `readAuditArchive` → `planPurge`. The procedure moves to the README/website as a prose list in a
  corrected order (record the final entry **before** exporting), explicitly not enforced.
  ADR-QD-056 Consequences — Positive (`:244-245` "the six-step decommissioning sequence") is amended.
- **(B) Absorb** into an evidence-carrying `Decommissioning` value (archive verified → purge planned →
  caller-attested steps). Steps 003/004/006 can only ever be self-attested; modelling them as state
  repeats the "qualification steps that were `typeof x === "function"` checks" ADR-QD-016 names.
- **(C) Fix in place:** `stepId: DecommissioningStepId`; refuse completing step N before N−1
  (`DecommissioningStepOutOfOrder`); refuse re-completion (`DecommissioningStepAlreadyComplete`); merge
  002 into 001 (five steps); move "record the final entry" before export; a BEH row. Breaking too.

**Recommendation: (A)**; (C) is the fallback if the user wants a record-keeping helper kept. (B) is
the over-claiming form, rejected. Breaking → **needs user sign-off.** `status: decided (2026-10-08, recommended default)`

### D-38-f — `planRetention`'s `purged` field (breaking)

- **(A) Rename to `expired`** (`RetentionPlan { retained, expired, undated }`): an age report names
  rows past their age, not rows to delete. `planPurge` is the only `purge`.
- **(B) Keep `purged`.** A field called `purged` on a function that knows nothing of archives invites
  the exact misuse this plan removes.
- **(C) Fold `planRetention` into `planPurge`** (no age-only report). Loses the "what would expire if
  it were archived" view a scheduler wants before it builds the archive.

**Recommendation: (A).** Breaking → **needs user sign-off.** `status: decided (2026-10-08, recommended default)`

### D-38-g — Must the archive's sequence be verified for a purge?

- **(A) No; report it.** Membership is the purge guarantee; `sequenceIntegrityVerified` is carried on
  `VerifiedArchive` and copied onto `PurgePlan` for the caller. An unsequenced trail can still be purged.
- **(B) Yes;** a deployment without sequence numbers can never purge.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-38-h — Amend ADR-QD-056 or a new ADR

**Recommendation:** amend ADR-QD-056 (dated block), plus a new INV-QD-NEXT "A purge never selects a
row its archive does not hold". `status: decided (2026-10-08, recommended default)`

## 6. Tasks

### T0 — Re-baseline
- **Status:** [x] done (2026-10-08) — worktree is a descendant of main at the wave-4 merges; audit sources unchanged since e635e68 apart from ARCH-35
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/38-purge-plan main`; record the SHA.
  2. `git diff --stat e635e68 HEAD -- packages/audit/src packages/audit/test spec/behaviors/33-audit-pipeline.md spec/decisions/056-audit-companion-package.md`;
     correct §1's lines in §10 if anything moved (ARCH-35 and ARCH-30 touch the same spec files).
  3. Re-run `probe-purge.mts`, `probe-hashmap.mts` and `tsprobe/` from a fresh scratch dir as in §1.
  4. Re-run C6's grep; if any caller appeared in `examples/`, `features/` or the website, re-open D-38-a/e.
- **Verify:** the commands above.
- **Done when:** §1 re-confirmed or corrected.

### T1 — Fix the archive header and the mis-traced test (doc defects C11, C14)
- **Status:** [x] done (2026-10-08) — header fixed, then rewritten by T3; the mis-mapped `DecommissioningChecklist.test.ts` row was removed with the test
- **Depends on:** T0. No decision.
- **Files:** `packages/audit/src/AuditArchive.ts`, `spec/traceability.md`.
- **Steps:**
  1. `AuditArchive.ts:3-4`: "the second of the six … steps" → "the first … step ("Export the full
     audit trail to an archive"), and the verification the second step names, in one call". (If
     D-38-e = A lands in the same PR, T8 rewrites this sentence again.)
  2. `traceability.md:391`: re-map `DecommissioningChecklist.test.ts` from `BEH-QD-254` (sequence
     integrity, which it does not test) to ADR-QD-056 only, with a note that the checklist has no
     behaviour doc (C14).
     Bump the traceability revision (CCR-QD-NEXT).
- **Tests:** none.
- **Verify:** `pnpm spec:verify:strict`.
- **Done when:** green. Ships alone.

### T2 — Test-first: re-completing a step refuses (defect C13) — only if D-38-e ≠ A
- **Status:** [-] dropped (2026-10-08) — D-38-e = A deletes the module
- **Depends on:** T0, D-38-e. **Dropped if D-38-e = A** (the module is deleted in T8).
- **Files:** `packages/audit/test/DecommissioningChecklist.test.ts`, `packages/audit/src/DecommissioningChecklist.ts`.
- **Steps:**
  1. `it.effect("completing an already-completed step refuses and keeps who completed it")`: complete
     `DECOMM-006` as `alice` at 10, then as `mallory` at 20 under `Effect.result`; assert
     `Failure` with `_tag === "DecommissioningStepAlreadyComplete"` and the original step unchanged.
     **Red.**
  2. Add `DecommissioningStepAlreadyComplete` (`Data.TaggedError`, `{ stepId, checklistId, completedBy, completedAt }`)
     and the check after `:86`.
- **Verify:** `pnpm vitest run packages/audit/test/DecommissioningChecklist.test.ts`.
- **Done when:** passes; patch changeset.

### T3 — `ArchiveRefusal`, `ArchiveNotVerified`, and the `VerifiedArchive` type
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0, D-38-b, D-38-c, D-38-d.
- **Files:** `packages/audit/src/AuditArchive.ts`, `packages/audit/test/AuditArchive.tst.ts` (*new*).
- **Steps:**
  1. `export type ArchiveRefusal = Data.TaggedEnum<{ Malformed: { readonly message: string }; UnsupportedArchiveVersion: { readonly version: unknown }; EntryNotDecodable: { readonly index: number; readonly refusal: DecodeRefusal }; CountMismatch: { readonly declared: number; readonly actual: number }; SequenceBroken: { readonly expectedSequence: number; readonly actualSequence: number }; NotInSequenceOrder: { readonly index: number }; UnbackedClaim: { readonly sequencedCount: number } }>`
     and `export const ArchiveRefusal = Data.taggedEnum<ArchiveRefusal>()`.
  2. `export class ArchiveNotVerified extends Data.TaggedError("ArchiveNotVerified")<{ readonly refusal: ArchiveRefusal }> {}`.
  3. `class VerifiedArchiveImpl` (not exported): `readonly #counts: MutableHashMap.MutableHashMap<AuditEntry, number>`;
     public `readonly entries`, `readonly createdAt`, `readonly entryCount`, `readonly sequenceIntegrityVerified`,
     `readonly keyMaterial`; `holds(entry: AuditEntry): number` (the archived count, 0 if absent).
     `export type VerifiedArchive = VerifiedArchiveImpl`. Doc: one-line summary; then **what it proves
     and what it does not** (C8): the bundle decoded, every entry decoded through `decodeAuditEntry`,
     the count matched, the gap check passed and the order is the one `archiveAuditTrail` writes —
     **not** that the store is durable, untampered, or the trail complete.
  4. `AuditArchive.tst.ts`: an object literal with the same public fields is **not** assignable
     (`expect<{ entries: …; holds: … }>().type.not.toBeAssignableTo<VerifiedArchive>()`, the
     `not.toBeAssignableTo` form the repo's `.tst.ts` files already use).
- **Verify:** `pnpm typecheck`; `pnpm test:tstyche`; `pnpm circular`.
- **Done when:** green.

### T4 — `readAuditArchive`: a stored bundle read back (C9)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3.
- **Files:** `packages/audit/src/AuditArchive.ts`, `packages/audit/test/AuditArchive.test.ts`.
- **Steps:**
  1. `export const readAuditArchive = (input: unknown): Result.Result<VerifiedArchive, ArchiveNotVerified>`,
     pure, in this order (each a distinct refusal):
     (a) the envelope decodes with `UNTRUSTED_DECODE_OPTIONS` against
     `Schema.Struct({ archiveVersion: Schema.String, metadata: Schema.Struct({ createdAt: Schema.Number, entryCount: Schema.Int, sequenceIntegrityVerified: Schema.Boolean }), entries: Schema.Array(Schema.Unknown), keyMaterial: Schema.optional(Schema.Array(KeyMaterialSchema)) })` → else `Malformed`;
     (b) `archiveVersion === "1"` → else `UnsupportedArchiveVersion`;
     (c) every entry through `decodeAuditEntry` → else `EntryNotDecodable { index, refusal }`;
     (d) `entryCount === entries.length` → else `CountMismatch`;
     (e) the gap check (reuse `SequenceIntegrity.ts`'s pure core, T6) → else `SequenceBroken`;
     (f) sequenced entries ascending and every unsequenced entry after them → else `NotInSequenceOrder { index }`;
     (g) `sequenceIntegrityVerified === (sequencedCount >= 2)` → else `UnbackedClaim` (a bundle that
     claims a verification it cannot back, or under-claims, is not the bundle `archiveAuditTrail` wrote).
     Build the counts map, return `new VerifiedArchiveImpl(...)`.
  2. Tests (`describe("readAuditArchive")`):
     - round trip: `readAuditArchive(JSON.parse(JSON.stringify(yield* archiveAuditTrail(entries, 0))))`
       succeeds for sequenced, unsequenced, mixed (`AuditArchive.test.ts:89-120`'s inputs) and empty inputs;
       `holds(e)` is 1 for every original `e`.
     - one test per refusal tag (7), each built by corrupting a round-tripped bundle.
     - a `Failed` entry with an `httpClientError()` cause round-trips (C10's hardest case).
- **Verify:** `pnpm vitest run packages/audit/test/AuditArchive.test.ts`.
- **Done when:** green.

### T5 — `planPurge`: purge only what the archive holds
- **Status:** [x] done (2026-10-08)
- **Depends on:** T4, D-38-a, D-38-f, D-38-g.
- **Files:** `packages/audit/src/Retention.ts`, `packages/audit/test/Retention.test.ts`, `packages/audit/test/Retention.tst.ts` (*new*).
- **Steps:**
  1. `export interface PurgePlan { readonly purge: ReadonlyArray<AuditEntry>; readonly retain: ReadonlyArray<AuditEntry>; readonly undated: ReadonlyArray<AuditEntry>; readonly unarchived: ReadonlyArray<AuditEntry>; readonly sequenceIntegrityVerified: boolean }`.
  2. `export const planPurge = (entries, policy, now, archive: VerifiedArchive): Result.Result<PurgePlan, RetentionInputInvalid>`:
     run `planRetention` (the one age rule, INV-QD-101); for each age-eligible row in input order,
     take one count from a **copy** of the archive's counts (`MutableHashMap`, decrementing); a row
     with a count goes to `purge`, one without to `retain` and `unarchived`. Everything else is `retain`
     (with `undated` as today). Doc: one-line summary, then the archive-before-purge rule it now enforces,
     and what the archive does not prove (link T3's doc).
  3. Per D-38-a = A: delete `getPurgeableEntries` and `enforceRetention`; per D-38-f = A: rename
     `RetentionPlan.purged` → `expired` and update `planRetention`'s doc ("rows past their age; not a
     purge selection — see `planPurge`"). Rewrite `Retention.ts`'s module doc (`:1-16`): the
     "documented, not enforced" paragraph is replaced by the mechanism.
  4. Tests:
     - `it("no archive, nothing selected")` — compile-time: `Retention.tst.ts` asserts `planPurge` is
       not callable with three arguments (`expect(planPurge).type.not.toBeCallableWith(entries, policy, now)`).
       Runtime: an **empty** verified archive ⇒ `purge = []`, every expired row in `unarchived`.
     - `it("an unarchived entry is retained")` — archive `[e1]`, trail `[e1, e2]`, both expired ⇒
       `purge = [e1]`, `retain = unarchived = [e2]`.
     - `it("a row edited after archiving is retained")` — same `sequenceNumber`, different `at` ⇒ unarchived.
     - `it("two identical rows need two archived copies")` (D-38-d = A).
     - `it("a round-tripped archive matches rows read back from a store")` — trail rows and archive both
       pass through `JSON` + `decodeAuditEntry`.
     - **Property** (`fast-check`, extend `Retention.test.ts:139`'s generators): random entries, a random
       sub-multiset archived (built through `archiveAuditTrail` → JSON → `readAuditArchive`), random
       policy/now including non-finite and negative draws: `purge ∪ retain = entries` (multiset),
       `purge ∩ retain = ∅`, `purge ⊆ archive` (multiset), `undated ⊆ retain`, `unarchived ⊆ retain`,
       and every `purge` row has a finite age past a valid limit.
     - Rewrite the existing `getPurgeableEntries`/`enforceRetention` tests (`:14-84`) over
       `planRetention(...).expired` (age semantics unchanged) — no test is lost, only re-targeted.
- **Verify:** `pnpm vitest run packages/audit/test/Retention.test.ts`; `pnpm test:tstyche`; `pnpm circular`.
- **Done when:** green.

### T6 — Restate the gap check without an unreachable guard (C15)
- **Status:** [x] done (2026-10-08) — as `SequenceBreak.ts` (outside the barrel), not in `SequenceIntegrity.ts`, because `export *` would have made `firstSequenceBreak` public; 0-survivor stryker check not run
- **Depends on:** T0. No decision. Independent of T3–T5 (T4 reuses its result).
- **Files:** `packages/audit/src/SequenceIntegrity.ts`, `packages/audit/test/SequenceIntegrity.test.ts`.
- **Steps:**
  1. Extract a pure `firstSequenceBreak(entries): { expectedSequence; actualSequence } | undefined`
     (package-private, not barrelled): `flatMap` to defined numbers (no `filter` predicate to mutate),
     sort, then a `for (const [i, actual] of sorted.entries())` that compares to the previous value
     held in a variable — no index lookups, so no `undefined` guard exists.
  2. `verifySequenceIntegrity` keeps its signature and calls it; `readAuditArchive` (T4) calls it too.
  3. All existing `SequenceIntegrity.test.ts` tests pass unmodified; add one with a single sequenced
     entry among unsequenced ones (intact) to pin the filtering.
- **Verify:** `pnpm vitest run packages/audit/test/SequenceIntegrity.test.ts`; a targeted
  `pnpm exec stryker run stryker.audit.mjs --mutate packages/audit/src/SequenceIntegrity.ts` → 0 survivors.
- **Done when:** green, 0 survivors in the file.

### T7 — New invariant and its enforcement
- **Status:** [x] done (2026-10-08) — INV-QD-130 (plan said INV-QD-NEXT)
- **Depends on:** T5.
- **Files:** `spec/invariants.md`, `spec/traceability.md`.
- **Steps:** add INV-QD-NEXT "A purge never selects a row its archive does not hold" — Source:
  `Retention.ts`'s `planPurge`, `AuditArchive.ts`'s `readAuditArchive`/`VerifiedArchive`; Enforcement:
  T5's property and the `.tst.ts` arity check; Implication: the C8 wording (what the archive does not
  prove); Related: INV-QD-053, INV-QD-054, INV-QD-101. Restate INV-QD-053 over `planPurge` (and
  `planRetention`'s `expired`/`retained`).
- **Verify:** `pnpm spec:verify:strict`.
- **Done when:** green.

### T8 — Retire the checklist (D-38-e = A) — or finish fixing it (= C)
- **Status:** [x] done (2026-10-08) — option A
- **Depends on:** D-38-e.
- **Files (A):** delete `packages/audit/src/DecommissioningChecklist.ts` and `packages/audit/test/DecommissioningChecklist.test.ts`;
  edit `packages/audit/src/index.ts`, `packages/audit/src/AuditArchive.ts` (header),
  `packages/audit/src/AuditDecisionSinkLive.ts:15-21` (module doc lists it), `packages/audit/README.md`,
  `apps/website/src/content/docs/docs/packages/audit/capabilities.md`, `spec/overview.md:702-704`, `spec/traceability.md:391`.
- **Steps (A):**
  1. Delete the module and its test; remove the barrel line; grep `packages/audit/src` for
     `DecommissioningChecklist` and fix every doc reference.
  2. README and website: replace the checklist paragraph with a short "Retiring an audited system" list
     in the corrected order — record the final entry; read the full trail; `archiveAuditTrail`; write the
     bundle to long-term storage; read it back with `readAuditArchive`; `planPurge` against it; revoke
     keys and notify as your process requires — stating that the library enforces only the archive →
     read-back → purge steps.
- **Steps (C):** type `stepId: DecommissioningStepId`; add `DecommissioningStepOutOfOrder`; merge 002
  into 001 and move "Record the final audit entry" before export (renumber, five steps); a new BEH row
  in `33-audit-pipeline.md`; tests per refusal (red-first).
- **Verify:** `pnpm typecheck && pnpm vitest run packages/audit/test && node scripts/check-api-surface.mjs`.
- **Done when:** green and `grep -rn "DecommissioningChecklist\|DECOMM-" packages apps spec --include=*.ts --include=*.md` finds only history (CHANGELOG, CCR rows).

### T9 — Spec, ADR, overview, docs, changeset
- **Status:** [x] done (2026-10-08) — CCR-QD-230; ADR-QD-056 Rev 1.11, BEH 33 Rev 1.13, invariants 1.71, overview 1.60, traceability 1.111, README 1.107
- **Depends on:** T3–T8.
- **Files:** `spec/decisions/056-audit-companion-package.md`, `spec/behaviors/33-audit-pipeline.md`,
  `spec/overview.md`, `spec/README.md`, `packages/audit/README.md`, the website page, `.changeset/*.md` (*new*).
- **Steps:** every edit in §8; then `node scripts/check-api-surface.mjs`, `node scripts/check-doc-examples.mjs`,
  `node scripts/check-website-doc-examples.mjs`.
- **Verify:** `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:website-examples`.
- **Done when:** all pass.

### T10 — Full gate
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T1–T9.
- **Steps:** `pnpm exec stryker run stryker.audit.mjs` (0 survivors in `AuditArchive.ts`, `Retention.ts`,
  `SequenceIntegrity.ts`; `readAuditArchive`'s seven refusals and `planPurge`'s count consumption each
  killed by a named test); then `pnpm check`.
- **Verify:** `pnpm check`.
- **Done when:** green; record the audit score in §10.

### T11 — Update the tracker
- **Status:** [x] done (2026-10-08)
- **Depends on:** T10.
- **Files:** this plan.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-38-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Survive unchanged:** `AuditArchive.test.ts:7-166` (bundle, order, `verified` flag — ARCH-29's pins),
  `SequenceIntegrity.test.ts`, `Retention.test.ts:44-138` (INV-QD-101 cases, over `planRetention`).
- **Re-targeted, not deleted:** `Retention.test.ts:14-43` and the partition property move from the
  deleted selectors to `planRetention(...).expired`/`retained` and to `planPurge`.
- **New:** T3 (type: unforgeable), T4 (round trip + 7 refusals), T5 (four examples, the arity type test,
  the membership/partition property), T6 (one filtering pin).
- **Deleted (D-38-e = A):** `DecommissioningChecklist.test.ts` with its module.
- **Property:** T5's property is INV-QD-NEXT's enforcement and the restated INV-QD-053; its archive is
  built through the real write → JSON → read path, so membership is tested across the storage seam.
- **Mutation:** T6 removes seven equivalent survivors; T4/T5 tests name each refusal and the count
  decrement so their mutants die. Expected audit score ≈ 89 % from this plan alone (≈ 90 % with ARCH-35).

## 8. Spec and documentation updates

- **ADR-QD-056:** dated amendment (CCR-QD-NEXT): "archive before purge" is now mechanical —
  `planPurge` selects only rows a `VerifiedArchive` holds, and a `VerifiedArchive` comes only from
  `readAuditArchive` over bytes read back from storage (D-38-b). What it proves and does not (C8),
  restated beside the existing no-tamper-evidence negative. The age-only selectors are removed
  (D-38-a); the checklist is retired (D-38-e) — Consequences — Positive's "six-step decommissioning
  sequence" line is amended, and the "Retention, archival and decommissioning" Decision paragraph
  (`:131-140`) is rewritten. Change History 1.10 (or the next number if ARCH-35 landed first).
- **BEH-QD-253:** REQUIREMENTs restated over `planPurge`: "a row MUST be selected for purge only if
  `planRetention` finds it expired **and** the given `VerifiedArchive` holds it (counted)"; "an expired
  row the archive does not hold MUST be retained and listed in `unarchived`". INV-QD-053's partition
  line follows. Remove the `getPurgeableEntries`/`enforceRetention` lines.
- **BEH-QD-254:** add "`readAuditArchive` MUST refuse a bundle whose entries do not decode, whose count,
  sequence, order or `sequenceIntegrityVerified` claim does not match, each with its own refusal" — a
  new `BEH-QD-NEXT` if it reads better separately.
- **Invariants:** INV-QD-NEXT (T7); INV-QD-053 restated; INV-QD-054 Related gains the read-back.
- **`spec/overview.md`** (gate 13): rows for `planPurge`, `PurgePlan`, `readAuditArchive`,
  `VerifiedArchive`, `ArchiveNotVerified`, `ArchiveRefusal`; `RetentionPlan`'s row notes `expired`;
  remove `getPurgeableEntries`, `enforceRetention` and the three checklist rows (`:695`, `:702-704`);
  revision bump.
- **Traceability:** `Retention.test.ts` → BEH-QD-253, INV-QD-053, INV-QD-101, INV-QD-NEXT;
  `AuditArchive.test.ts` → BEH-QD-254 (+ BEH-QD-NEXT), INV-QD-NEXT; checklist row removed (or re-mapped
  under C).
- **CCR register:** CCR-QD-NEXT listing every file.
- **Docs:** `packages/audit/README.md:81-97` and website `capabilities.md:62-97`: the "Nothing here
  connects the two … a documented invariant a caller must uphold" paragraph is replaced by the
  archive → store → read back → `planPurge` flow; the `ts` fence calls `planPurge` (or becomes a
  compiled `typescript` fence if it can import everything it uses).
- **Changeset:** `@qadi/audit` minor, **breaking** (0.x, fixed group): `getPurgeableEntries`,
  `enforceRetention` removed; `RetentionPlan.purged` → `expired`; the checklist removed; new
  `planPurge`/`readAuditArchive`. T1/T2 may ship earlier as patches.

## 9. Risks and rollback

- **Breaking surface** (D-38-a, D-38-e, D-38-f): no in-repo caller (C6); an external caller of the
  removed functions gets a compile error naming the replacement in the changeset. Option B of each
  decision is the non-breaking fallback.
- **Over-claiming** (C8): the main risk is prose. Every doc that names `VerifiedArchive` carries the
  "proves / does not prove" sentence; T9 greps for "durable", "tamper", "compliant" near it.
- **Performance:** structural hashing ≈ 25 µs per row (probe); a 1 M-row purge is ≈ 25 s of CPU in a
  batch job. Acceptable; noted in `planPurge`'s doc. If not, key by `Hash.hash` buckets first (still
  structural equality inside a bucket — no change to semantics).
- **An archive written before this change** reads back fine (bundle format unchanged, `archiveVersion`
  `"1"`); an archive whose `sequenceIntegrityVerified` was set by the pre-2026-09 rule (vacuous `true`)
  is refused as `UnbackedClaim` — it is re-bundled with `archiveAuditTrail`. Changeset says so.
- **Overlap:** ARCH-35 amends ADR-QD-056 and `33-audit-pipeline.md` too, and edits
  `AuditDecisionSinkLive.ts`'s module doc (T8 here edits `:15-21`): land sequentially; the second takes
  the next revision numbers and rebases the doc line. ARCH-30 edits the audit barrel and overview's audit
  table (signature capture): trivial merge. ARCH-32 changes core decoding that `decodeAuditEntry`
  delegates to; `readAuditArchive` inherits whatever it tightens — no ordering needed.
- **Rollback:** T1, T2, T6 are independent. T3–T5 + T7 revert together; T8 is separable (restore the
  module from history).

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence re-verified at `e635e68` with `probe-purge.mts`, `probe-hashmap.mts`, `tsprobe/` and the audit mutation report | planner |
| 2026-10-08 | T6 | `firstSequenceBreak` in new `SequenceBreak.ts`; `verifySequenceIntegrity` calls it; 3 new tests in `SequenceIntegrity.test.ts` (no red: refactor + pin) | implementer |
| 2026-10-08 | T3, T4 | `ArchiveRefusal`, `ArchiveNotVerified`, `VerifiedArchive` (`#private` class exported as type), `readAuditArchive`; 15 new tests in `AuditArchive.test.ts` (round trips, keyMaterial, Failed-with-cause, one per refusal) and `AuditArchive.tst.ts` | implementer |
| 2026-10-08 | T5 | `planPurge`, `PurgePlan`; `getPurgeableEntries`/`enforceRetention` removed; `purged` -> `expired`; `Retention.test.ts` rewritten (examples + sub-multiset property) and `Retention.tst.ts` | implementer |
| 2026-10-08 | T8 | `DecommissioningChecklist.ts` and its test deleted; README/website carry the corrected unenforced list | implementer |
| 2026-10-08 | T7, T9 | INV-QD-130, restated INV-QD-053/101, ADR-QD-056 amendment, BEH-QD-253/254, overview, traceability, CCR-QD-230, changeset (minor, breaking) | implementer |
| 2026-10-08 | T10 | NOT RUN: `pnpm exec stryker run stryker.audit.mjs` and `pnpm check`. Run: typecheck, lint, house-style, circular, api-surface, tstyche, audit vitest (257), spec:verify:strict, spec:examples, spec:website-examples, spec:gates, spec:claims | implementer |
