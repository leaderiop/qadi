---
id: ARCH-52
title: The signature ledger becomes a keyed store — adapters append and read by an opaque key, and the exact-pair read rule `hasSignature` relies on is derived once, in `signatureHistoryFromLedger`
strength: Worth exploring   # 2026-10-13 review, card 7. Verification found one live over-wide grant (N1) and one spec contradiction (N2) the card did not name, which raises the case
status: superseded-by-phase-11
disposition: "ported by Phase 11 (ARCH-59; SEC-01…SEC-04) from rescue/wave5-1013 8900b7e; was `done` on the unmerged branch only (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []              # ARCH-30 (done) is built on and not redone. No wave-5 sibling has to land first; see §9 for ordering
blocks: []
adrs_touched:
  - ADR-QD-105 (amend: its "the write key and the read key are one rule" bullet was true only for the in-memory double. The ledger's interface becomes a keyed store, and `signatureHistoryFromLedger` derives the read rule. A discharge whose resource cannot be keyed is refused (D-52-d))
  - ADR-QD-058 (amend: "scope reuses `HistoryScope` verbatim … same semantics `HasActed`/`HasNotActed` already give it" is false. For `HasActed`, `"Any"` means "ever, on any resource" (BEH-QD-092). For `HasSignature` it means "on file with no resource" (INV-QD-120). The amendment states the difference, and the `explain()` wording follows (D-52-e))
  - ADR-QD-057 (constraint: `Signature` keeps its canonical shape and gets no `resourceId`. ADR-105 already rejected that option)
  - ADR-QD-056 / ADR-QD-016 / BEH-QD-255 (constraint: no default ledger and no default capture. The conformance check is a test aid, not an instance)
  - ADR-QD-094 / ADR-QD-107 (constraint: `SignatureLedger` is **not** a registry port (D-52-f). Its read side still reaches the five-port machinery, because `signatureHistoryFromLedger` returns a `Layer<SignatureHistory>` that `signatureHistoryRetrying`/`Bounded`/`TimingOut`, `portServing` and devtools capture already wrap. The port's `key` contract (injective over the request) is what D-52-b's law test checks)
  - ADR-QD-037 (constraint: madge counts type-only edges. The new `SignatureLedgerConformance.ts` imports `SignatureLedger.ts`, and nothing in that closure imports it back)
  - ADR-QD-038 (constraint: changesets only, no release step. See D-52-h: the ledger is unreleased, so this is not breaking if it lands before the next release)
  - ADR-QD-NEXT (new, recommended by D-52-g: "A signature ledger is a keyed store")
packages: ["@qadi/audit", "@qadi/core (Explanation.ts wording, SignatureHistory.ts fixture locality, doc comments)", "features (signatures.feature, SignatureLoopSteps.ts)", "apps/website (docs)", "spec"]
estimate: L   # ≈ 3 days for T0–T12. Defect-only path (T1 + T2) ≈ ½ day (S). Interface-only path without the conformance module (T0, T3–T7, T9–T11) ≈ 1½ days (M)
---

# ARCH-52 — Narrow the signature ledger's read seam

## 1. Verified evidence (at `b655b3b`)

I checked this on `main` at `b655b3b` (`git rev-parse --short HEAD`). Nothing in the repository was
edited. The probes live in
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-52/`,
with `node_modules` symlinked to `packages/audit/node_modules` and a `vitest.config.ts` that aliases
`@qadi/core` and `@qadi/audit` to their `src/index.ts`:

- **`probe.test.ts`** has four cases, P1–P4, all passing at `b655b3b`:
  - **P1.** A ledger adapter written in the SQL "optional filter" idiom
    (`WHERE subject_id = ? AND (? IS NULL OR resource_id = ?)`) type-checks against
    `SignatureLedgerShape`. After a signature is captured on `doc-1`, it makes
    `hasSignature("approved", { scope: "Any" })` **Allow** on `doc-2`. The shipped double denies.
  - **P2.** A "null resource is a wildcard" adapter (`resource_id = ? OR resource_id IS NULL`) makes a
    subject-global row satisfy a resource-scoped `hasSignature` on `doc-2`.
  - **P3.** This is the shipped double, not a hypothetical adapter. A signature captured while
    approving `{ id: 7 }` (no string id) is recorded with `resourceId: undefined`, and
    `hasSignature("approved", { scope: "Any" })` then **Allows** on `doc-99` (defect N1).
  - **P4.** `decisionHistoryFromEvents([{ alice, approve, doc-1 }])` answers `"Acted"` to a
    `resourceId: undefined` query. For history, `"Any"` really is a wildcard (N2).
- **`spike.ts` + `spike.test.ts`** are the proposed interface:
  - a `SignatureLedgerKey` brand;
  - `ledgerKeyOf`;
  - `append(key, entry)` / `entriesAt(key)`;
  - a `signatureHistoryFromLedger` that derives the rule and fails on foreign entries;
  - a `MutableHashMap` double.

  It type-checks under `tsconfig.base.json`. The only tsc error is core's own `crypto` global, because
  the spike's tsconfig has no node types. Its runtime test passes: exact pair only, a key-ignoring
  adapter fails as `SignatureHistoryUnavailable`, and the key partition agrees with
  `signatureHistoryPort.key`.
- **Run command:**
  `cd <probe dir> && /Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/vitest run --config vitest.config.ts`.
- **Existing tests are green at HEAD.** `pnpm vitest run --project audit packages/audit/test/SignatureLedger.test.ts packages/audit/test/SignatureLoop.test.ts packages/audit/test/SignatureCapturePort.test.ts`
  gives 32 passed.

### The review's claims

| # | Claim (card 7) | Verdict | Evidence |
| - | -------------- | ------- | -------- |
| C1 | `SignatureLedger.ts` says the write and read keys match "by construction", but that is true only for the write side (`ledgerEntryOf`) | **CONFIRMED, and REFUTED in part** | The module header (`SignatureLedger.ts` :9-12) claims "the key a signature is written under (`ledgerEntryOf`) and the key it is read under (`signatureHistoryPort.key`) are the same pair". `ledgerEntryOf` (:107-115) builds the pair. Nothing on the read side uses it: `signatureHistoryFromLedger` (:81-87) forwards `ledger.signaturesFor` unchanged. *Refuted in part:* the write side is not fully right either. `captureRequestOf` (`SignatureCapturePort.ts` :235-248) maps a resource whose id is not a string to `resourceId: undefined`, the same as "no resource" (N1). |
| C2 | `SignatureLedgerShape.signaturesFor` makes every adapter re-implement the exact-pair rule, which exists only as prose | **CONFIRMED** | `SignatureLedgerShape.signaturesFor` (:62-67) is typed `SignatureHistoryShape["signaturesFor"]`. Its doc is the only statement of the rule on that interface: "a resource-scoped query sees only entries stored with that resource, and a subject-global one only entries stored with none". The rule is restated three more times, in `signatureHistoryFromSignatures`'s doc (`SignatureHistory.ts` :230-247), in INV-QD-120, and in BEH-QD-326. No code shares it. |
| C3 | The shipped double gets it right only because it calls `signatureHistoryPort.key` itself (`SignatureLedgerTest.ts` ~:41-49) | **CONFIRMED** | `SignatureLedgerTest` → `ledger.signaturesFor` (:39-50) computes `signatureHistoryPort.key([query])` and filters entries by recomputing the key per entry. |
| C4 | A production DB adapter has nothing to check it | **CONFIRMED** | No conformance helper exists in any package (`grep -rn "conformance" packages/audit/src` is empty). `PortConformance.test.ts` covers core's five port descriptions and their derived layers, not a third-party `SignatureHistory`/ledger implementation. The website says "a deployment implements SignatureLedgerShape over its store" (`apps/website/…/packages/audit/signatures.md` :146) and says nothing about how to read. |
| C5 | Core's span labels an absent resource `scope: "Any"` (`SignatureHistory.ts` ~:191), which reads like a wildcard | **CHANGED** | `:191` is `signatureHistoryPort.key`. The label is in `signatureWire.spanQuestion` (:148-152: `scope: query.resourceId === undefined ? "Any" : "Resource"`) and in `askSignature`'s `annotateQuestion` (`PortAccess.ts` :436-443), which records the leaf's own `scope`. The point is stronger than the card made it: `"Any"` *is* a wildcard in the sibling port with the same literal (N2). |
| C6 | Getting the rule wrong gives an over-wide answer: a signature visible for every resource | **CONFIRMED** (probe P1, P2) | Both naive adapters type-check against the current `SignatureLedgerShape` and grant where the double denies. |
| C7 | `SignatureLoop.test.ts` exercises only the double | **CHANGED** | It has two modes. The first, "capture persists", uses its own hand-written store, `storeAndHistory`, whose `signaturesFor` filters `r.resourceId === query.resourceId` inline (:38-70). The second, the ledger mode, uses `SignatureLedgerTest`. Neither runs a *third-party* ledger, and no shared check exists that one could run. |
| C8 | Capture is keyed by question (ARCH-30) | **CONFIRMED** | `captureRequestOf` carries `resourceIdOf(question.resource)` and `question.subject.id`. `signatureObligationHandler` refuses a returned signature whose `signerId`/`meaning` differ (:216-222), then appends `ledgerEntryOf(request, signature)` (:225-226). |
| C9 | The loop is assembled by `signatureHistoryFromLedger` (verify name) | **CONFIRMED** | `SignatureLedger.ts` :81. Used in `SignatureLoop.test.ts`, `SignatureLedger.test.ts`, `features/step-definitions/SignatureLoopSteps.ts`, BEH-QD-326's compiled fence and the website page. |
| C10 | `examples/` or the website may already ship a wrong adapter (a real defect if so) | **REFUTED** | `grep -rn "signaturesFor\|SignatureLedger" examples` finds nothing. The newsroom wires `SignatureHistory` to its fail-closed default (`examples/nextjs-newsroom/src/server/ports.ts` :112-114). Both website fences use `SignatureLedgerTest` or `signatureHistoryFromSignatures`. What exists is a gap (C4), not a wrong adapter. |
| C11 | The change breaks a public `@qadi/audit` port shape, so it needs a changeset and upgrade docs | **CHANGED** | `SignatureLedger` has **not been released**. `npm view @qadi/audit version` gives `0.11.0`, and `packages/audit/CHANGELOG.md`'s 0.11.0 has no ledger. The ledger arrives in the pending `.changeset/signature-capture-keyed-by-question.md`, committed in `b655b3b`. If this plan lands before the next release, no published consumer sees a break, and the pending changeset is amended in place (D-52-h). |

### Found during verification

| # | Finding | Verdict | Evidence |
| - | ------- | ------- | -------- |
| **N1** | **Live over-wide grant.** A signature captured while discharging a question whose resource has no *string* id (`{ id: 7 }`, `{ id: { … } }`, or no `id` at all) is recorded subject-global. Every `hasSignature(meaning, { scope: "Any" })` with that meaning then allows, on every resource. This breaks INV-QD-120 ("a subject-global (`scope: "Any"`) one does not find a signature recorded for a resource") for every resource that is not string-keyed. It is the same shape ADR-105 closed for the string case. | **CONFIRMED** (probe P3) | `resourceIdOf` (`Resource.ts` :28-31) is `undefined` for any non-string id. `captureRequestOf` uses it. `ledgerEntryOf` copies it. `SignatureLedger.test.ts` pins the behaviour as intended ("a resource with no string id is recorded subject-wide (resourceId undefined)", :191-205). The reader treats the same resource as a wiring error: `requireResourceId` (`PortAccess.ts` :220-228) fails `MissingResourceId` for a non-string id. So the writer quietly widens what the reader refuses. The capture-persists mode has the same flaw, because the request's `resourceId` is `undefined` there too. **Severity: medium.** It needs a non-string-id resource, a signature obligation on it, and a `scope: "Any"` signature policy with the same meaning. Numeric primary keys are common, though, and the grant is silent. Fixed by T1, blocked on D-52-d. |
| **N2** | **Spec contradiction about `scope: "Any"`.** ADR-058 says `HasSignature` reuses `HistoryScope` with the "same semantics `HasActed`/`HasNotActed` already give it". BEH-QD-092 defines `"Any"` as "this subject, this event, **ever**", a wildcard over resources, and `decisionHistoryFromEvents` implements that (`anywhere` is built from every event, `DecisionHistory.ts` :236-238; probe P4). INV-QD-120 and BEH-QD-326 make signature `"Any"` mean "only entries stored with no resource". Two documents meant to guide an adapter author therefore point opposite ways. `explain()` also renders a signature `scope: "Any"` as "… for **anything**" (`Explanation.ts` → `HasSignature` :395-402; asserted in `Explanation.test.ts` :216). That describes the wildcard the evaluator does not apply. | **CONFIRMED** (reading, probe P4) | The evaluator side is fail-closed: the over-wide reading is never what core does. The danger is an adapter author who follows ADR-058, BEH-QD-092 or `explain()`. The concept page adds to it with "mirroring `DecisionHistory`'s shape exactly" (`concepts/signatures.md` :49-50). `signatureHistoryFromSignatures`'s doc claims the same separation "`ActedEvent`/`ActedAnywhere` keep", which they do not. Fixed by T2 and T3, wording blocked on D-52-e. |
| **N3** | `signatureHistoryFromSignatures` restates the key rule inline twice (`SignatureHistory.ts` :253 and :274, `JSON.stringify([…, resourceId ?? null])`) instead of calling `signatureHistoryPort.key`. | **CONFIRMED** (`grep -n "resourceId ?? null" packages/core/src/SignatureHistory.ts` gives :191, :253, :274) | This is the same locality failure inside core. T3 fixes it. |
| **N4** | `hasSignature` never compares `signature.signerId` with the asking subject. Trust-on-presence matches only `meaning`/`signerRole` (`PortAccess.ts` → `askSignature` :452-454). The read key is therefore the **only** thing tying a row to a subject: an adapter that answers rows from another key grants on another subject's signature. | **CONFIRMED** (reading) | This is the reason for D-52-c's defensive check in `signatureHistoryFromLedger`. |
| **N5** | The port key the double groups by is an in-memory request key that core has changed before: ARCH-45 / CCR-QD-263 changed `relationshipResolverPort.key` and `customPredicatePort.key`. A persisted ledger keyed by it would orphan every stored signature on the next such change. | **CONFIRMED** (spec/README CCR-QD-263; `PortDescription.ts` → `key` doc :120-135 says "a double or replay keyed by it") | This drives D-52-b, a ledger-owned, golden-pinned key whose partition is law-tested against the port key. |

**Other facts the plan relies on.**

- `SignatureQuery` and `SignatureLedgerEntry` share the `(subjectId, resourceId)` fields, so one
  `ledgerKeyOf(pair)` accepts both the write side and the read side (spike).
- `SignatureLedger` is not in the port registry. `PortName` (`PortMetrics.ts` :60-65) is the closed
  five. BEH-QD-255 forbids a default instance, which a `PortDescription.none` would be.
- `PORT_DOUBLE_BUDGET` (`scripts/check-house-style.mjs` :634-675) scans tests for
  `new SignatureHistoryUnavailable(`. The new read path builds that error in `src` through
  `signatureHistoryPort.failure`, which is allowed, so no test needs to construct it by hand.
- `@qadi/audit` dev-depends on `fast-check` and `@qadi/testing`. `@qadi/testing` does **not** depend on
  `@qadi/audit`, so a conformance check belongs in `@qadi/audit` (D-52-a).
- `features/step-definitions/SignatureLoopSteps.ts` uses only `SignatureLedgerTest()`,
  `signatureHistoryFromLedger` and `signatureObligationHandler`. All three keep their names and call
  shapes.

## 2. Goal and success criteria

**Goal.** Today the ledger is a **shallow module**. Its **interface** (`append` plus a full
`signaturesFor`) hands each **adapter** the one rule that matters for security: a scoped read sees exactly
its pair, and a subject-global read sees only rows stored with no resource. The rule then lives in
prose that every adapter has to re-derive. This plan moves the rule behind the **seam**. Adapters
implement a keyed store, `append(key, entry)` / `entriesAt(key)`, an equality lookup on an opaque
string that any store does natively. `signatureHistoryFromLedger` becomes **deep**:
- it derives the read key from the same `ledgerKeyOf` the write uses;
- it rejects any entry stored under another key;
- it maps store failures to the port's own typed error.

**Leverage:** one implementation of the rule serves every deployment's adapter. **Locality:** the rule,
its write half and its read half are in one module, and a property test pins them. A conformance check
covers what the narrow interface cannot make unwritable, such as a store whose collation folds case or
trims spaces. A deployment can run it against its real store. Two related holes close in the same move:
- the write side widening an unkeyable resource to subject-global (N1);
- the spec contradiction that teaches adapter authors the wildcard reading (N2).

**Success criteria.**

1. `SignatureLedgerShape` has exactly `name?`, `append(key, entry)` and `entriesAt(key)`. It has no
   `signaturesFor`. Checked by `packages/audit/test/SignatureLedger.tst.ts` (*new*) and `pnpm test:tstyche`.
2. Probes P1 and P2 cannot be written against the new interface. They do not type-check, because
   `entriesAt` receives a `SignatureLedgerKey`, not a query (the same `.tst.ts`). An adapter that
   ignores the key and returns foreign entries fails reads as `SignatureHistoryUnavailable`
   (`SignatureLedger.test.ts`).
3. `grep -n "signatureHistoryPort.key\|resourceId ?? null" packages/audit/src packages/core/src/SignatureHistory.ts`
   shows the pair rule spelled in `signatureHistoryPort.key` and `ledgerKeyOf` only. The law test
   proves that their partitions agree.
4. Probe P3 reversed: a discharge whose resource has no string id is refused (`HandlerFailed`).
   `capture` is not called, nothing is appended, and no `scope: "Any"` check is satisfied (T1,
   per D-52-d).
5. `explain()` no longer renders a signature `scope: "Any"` as "for anything". ADR-058, BEH-QD-092 and
   the website say what `"Any"` means for a signature (T2, per D-52-e).
6. `checkSignatureLedger` and `checkSignatureHistoryScoping` are exported from `@qadi/audit`. They report
   no violation for `SignatureLedgerTest`, `signatureHistoryFromSignatures` or `SignatureLoop.test.ts`'s
   store. They report a violation for each of six wrong adapters: optional-filter, null-wildcard,
   case-folding, space-trimming, NFC-normalising and lossy (`SignatureLedgerConformance.test.ts`, *new*).
7. A differential property shows `signatureHistoryFromLedger(SignatureLedgerTest())` answering exactly
   what `signatureHistoryFromSignatures` answers for the same rows, over random adversarial pairs
   (`SignatureLedger.test.ts`).
8. `pnpm check` is green, including `stryker run stryker.audit.mjs` at or above 80%, gate 13
   `node scripts/check-api-surface.mjs`, gate 9 `node scripts/check-doc-examples.mjs` and gate 23
   `node scripts/check-website-doc-examples.mjs`.

## 3. Non-goals

- **Renaming the `"Any"` literal**, on the policy leaf or on the span (`qadi.scope`). It is in the
  persisted `Policy` wire, in devtools' closed span decode, and ADR-058 rejected a distinct scope type
  (D-52-e (C)). This plan changes what the literal is *said* to mean for a signature, not the literal.
- **Changing `HasActed`'s `"Any"`.** The wildcard is right for history (BEH-QD-092, Chinese Wall
  BEH-QD-094).
- **Making the ledger a registry port** (D-52-f).
- **Moving the meaning/role match out of `askSignature`.** That is ARCH-46's read/judge split. This plan
  does not touch `askSignature`.
- **Re-validating signatures or comparing `signerId` in `hasSignature`.** Trust-on-presence stands
  (ADR-058). D-52-c's `signerId === subjectId` check is the ledger adapter refusing a corrupt *row*, not
  the evaluator judging a signature.
- **An HTTP obligation handler.** ARCH-30 D-30-j left that as a follow-up, and it still is.
- **Persisted-key migration tooling.** The key is new and versioned (D-52-b). A future v2 would need a
  migration, but none is needed now.

## 4. Constraints

- **AGENTS.md §1.** `effect/*` namespace imports (`Brand`, `MutableHashMap`, `Option`, `Data`), `.ts`
  relative imports, `import type` for type-only names. Cross-package imports are named:
  `import { signatureHistoryPort, SignatureHistory } from "@qadi/core"`.
- **§2.** `SignatureLedger` stays a `Context.Service` with its separately exported
  `SignatureLedgerShape` and tag id `"qadi/audit/SignatureLedger"`. The static `append` accessor
  computes the key itself (`SignatureLedger.use((l) => l.append(ledgerKeyOf(entry), entry))`), so a
  caller going through the service never handles a key.
- **§3.** `signatureHistoryFromLedger` stays a top-level factory beside the service.
  `SignatureLedgerTest` keeps its own file (precedent: `AuditTrailPortTest`). The conformance check is a
  new module, because it has its own fixture table and dependency surface.
- **§4.** No `Schema.TaggedError`, so `SCHEMA_ERROR_BUDGET` is unchanged; audit errors are not in
  `packages/core/src/Errors.ts` anyway. `SignatureLedgerReadError` is a `Data.TaggedError` (ADR-QD-054:
  the companion owns its errors). The "unkeyable resource" refusal reuses `SignatureCaptureError` with
  a `reason`, as the signer/meaning mismatch already does (BEH-QD-256), so the handler's `E` does not
  widen. Array-form `catchTag` only. No `Effect.orDie`: a ledger read failure is a typed failure, never
  a defect (INV-QD-006).
- **§5.** `signatureHistoryFromLedger`'s `signaturesFor` is `Effect.fn(function* …)` **unnamed**, so the
  span it runs under is the port's own `qadi.hasSignature` (precedent: `servedBody` in `PortAccess.ts`).
  `checkSignatureLedger` and `checkSignatureHistoryScoping` are `Effect.fn("qadi.audit.…")`. No
  `Effect.fnUntraced`, so `UNTRACED_BUDGET` is unchanged.
- **§5a.** No `switch`. The violation union is read with `Match.tagsExhaustive` where it is read at
  all; tests read `_tag`. `SWITCH_BUDGET` is untouched.
- **§6.**
  - No `as` / `!` / `any`. The brand constructor is `Brand.nominal<SignatureLedgerKey>()`.
  - Test tuples use typed arrays, not `as const`.
  - `PORT_DOUBLE_BUDGET`: no test constructs `SignatureHistoryUnavailable`. The foreign-entry and
    failing-store cases use a hand-built `SignatureLedgerShape` whose `entriesAt` fails with
    `SignatureLedgerReadError`, the audit error, which the budget does not scan for.
  - No `Date.now()` / `crypto`.
  - `HAS_CUSTOM_BUDGET`, `ANY_BUDGET` and `DECISION_READ_BUDGET` are untouched.
- **§7.** `SignatureLedgerEntry` stays a hand-written interface. The key is a branded string, not a
  schema: it is not decoded from untrusted JSON by this library. An adapter stores and returns it.
- **§9 / ADR-QD-099.** New exports go through `packages/audit/src/index.ts` (`export *`, alphabetical:
  `./SignatureLedgerConformance.ts` sorts between `./SignatureLedger.ts` and `./SignatureLedgerTest.ts`).
  The audit `exports` map is unchanged.
- **§10.** Coverage: audit at 90%, core at 95%. The conformance module's negative paths are covered by
  its tests against the six wrong adapters.
- **§11–12.** BEH-QD-326's `typescript` fence is compiled (gate 9). The website's `typescript` fences are
  compiled (gate 23). The new adapter example must import what it uses.
- **ADR-QD-037 / `pnpm circular`.** Imports run `SignatureLedgerConformance.ts` → `SignatureLedger.ts`,
  `SignatureCapturePort.ts` → `SignatureLedger.ts`, and `SignatureLedgerTest.ts` → `SignatureLedger.ts`
  (type-only). `SignatureLedger.ts` imports none of them.
- **Gate 13 `node scripts/check-api-surface.mjs`.** Every new `@qadi/audit` export gets a row in
  `spec/overview.md`: `SignatureLedgerKey`, `ledgerKeyOf`, `LedgerPair`, `SignatureLedgerReadError`,
  `checkSignatureLedger`, `checkSignatureHistoryScoping`, `LedgerConformanceViolation`,
  `LedgerConformanceOptions`. Changed rows are corrected in the same commit.
- **Mutation, gate 20 `stryker run stryker.audit.mjs`** (break 80, `ignoreStatic`). The conformance
  fixture table is static data and is skipped. Its *logic* (comparison, reporting) must be killed by T8.
- **Changesets (ADR-QD-038, D-52-h).** No release step. The user's standing rule is that a release
  happens only when they ask for "the release".

## 5. Decisions needed before work starts

### D-52-a — What is the ledger's interface?

- **(A) A keyed store.** `append(key, entry)` and `entriesAt(key)`, where `key: SignatureLedgerKey` comes
  only from `ledgerKeyOf`. `signatureHistoryFromLedger` derives the read rule. The adapter's job is
  "store under an opaque string and read back by equality". The optional-filter and null-wildcard
  idioms (P1, P2) become impossible to write, because the adapter never sees a nullable resource
  column or a query. *Tradeoffs:* a store-semantics hazard remains (D-52-a (C) covers it), and the key
  becomes a persisted format (D-52-b).
  - Variant: `append(entry)` with `key` inside the entry. Rejected. A returned entry would need a
    branded key the adapter must re-mint or echo, and `append`/`entriesAt` would no longer mirror
    each other.
- **(B) Keep `signaturesFor` and ship a conformance check only.** This is the smallest diff, and
  adapters keep a query-shaped read that maps naturally to `WHERE subject_id = ? AND resource_id …`.
  But it keeps the trap: every adapter still writes the rule, and a check only finds the mistake if
  the deployment runs it.
- **(C) (A), plus a conformance check** that covers what (A) cannot make unwritable. Two entry points:
  - `checkSignatureLedger(ledger, options?)` checks the store's opaque-key equality: case, trailing
    space, NFC/NFD, `"null"`, `""`, JSON-escape-shaped ids, cross-subject isolation, unseen keys.
  - `checkSignatureHistoryScoping(seed, options?)` checks the exact-pair rule for any raw
    `SignatureHistory`. This covers the capture-persists mode, where the deployment's e-sign system is
    its history and no ledger exists.

  Both return `Effect<ReadonlyArray<LedgerConformanceViolation>, E, R>`, independent of any test
  framework. No `vitest` or `fast-check` dependency enters `src`.

**Recommendation: (C).** (A) moves the security rule behind the seam (**depth**). The check covers what a
type cannot, which is store collation. The capture-persists mode keeps its contract in prose today, so
(C) is the only option that gives that mode a check too. This follows the standing preference for the
complete option when it is not wrong. `status: open`

### D-52-b — What is the persisted key?

- **(A) `signatureHistoryPort.key([pair])` verbatim.** One function and no second spelling. But it ties
  a format stored in a customer's database to an in-memory request key that core has changed before
  (N5, CCR-QD-263). A future `SignatureQuery` field, such as an ARCH-46 meaning pushdown, would change
  the bytes and orphan every stored signature. That is fail-closed, but it looks like an outage of
  every `hasSignature`.
- **(B) A ledger-owned, versioned key: `ledgerKeyOf(pair) = JSON.stringify([1, subjectId, resourceId ?? null])`.**
  - The bytes are pinned by a golden test.
  - A fast-check law ties it to the port: `ledgerKeyOf(p) === ledgerKeyOf(q)` ⇔
    `signatureHistoryPort.key([p]) === signatureHistoryPort.key([q])`. Both partitions are exact-pair.
  - The leading `1` makes a future format detectable row by row.
  - If `SignatureQuery` ever gains a field, the law test stops type-checking or fails. That is the
    alarm (A) lacks.
- **(C) A structured key `{ subjectId, resourceId: ResourceId | null }`.** It reads naturally in SQL. But
  it hands the adapter SQL's `NULL` semantics: `resource_id = NULL` is never true, so every
  subject-global read would return nothing until someone writes `IS NOT DISTINCT FROM`. That
  re-creates the hand-written-rule problem (A) removes.

**Recommendation: (B).** The two keys answer different questions. The port key says which in-memory
answers are the same request. The ledger key says which stored rows answer this pair, forever. The law
test keeps their partitions identical, which preserves the "one rule" property the review asked for,
without letting a core refactor rewrite persisted data. `status: open`

### D-52-c — What does `signatureHistoryFromLedger` do with an entry it did not ask for?

An entry is "foreign" when `ledgerKeyOf(entry) !== key`, or when `entry.signature.signerId !== entry.subjectId`
(a corrupt row; see N4).

- **(A) Fail the read.** It fails with `signatureHistoryPort.failure([query], new SignatureLedgerReadError({ key, cause: "…an entry stored under another key" }))`,
  which is a typed `SignatureHistoryUnavailable`. `askSignature` propagates it, and enforcement refuses
  (INV-QD-006: failure is not denial). It is loud, so a misbehaving adapter shows up as errors, never
  as grants.
- **(B) Drop foreign entries silently.** This is still safe, because it never widens. But it hides a
  broken adapter that could be deleting or misfiling real signatures, and a reviewer sees only
  unexplained denials.
- **(C) Trust the adapter.** This is today's posture, and it re-opens P1.

**Recommendation: (A).** The check costs one key computation per returned entry, on a read already
dominated by I/O. `status: open`

### D-52-d — A discharge whose resource cannot be keyed (defect N1)

The question has a `resource`, but `resourceIdOf(resource)` is `undefined`: an absent, numeric or object
`id`.

- **(A) Refuse before `capture`.** The handler fails `SignatureCaptureError({ reason: "the discharged resource has no string id, so a signature for it cannot be keyed to it" })`.
  `capture` is never called, nothing is appended, and the outcome is `HandlerFailed` (INV-QD-013).
  This mirrors the reader: a resource-scoped read of the same resource is `MissingResourceId`, a wiring
  error, not a decision. A question with **no** resource (`question.resource === undefined`) still
  records subject-global, which is the one case where subject-global is what the signer attested.
  *Breaking in behaviour* for a deployment that discharges signature obligations on numeric-id
  resources: it now gets `HandlerFailed` where it got a silent, over-wide record. That deployment could
  never use a resource-scoped `hasSignature` anyway.
- **(B) Refuse only when an `id` key is present but not a string.** A resource with no `id` field, such
  as an object about to be created, still records subject-global. That leaves N1 open for create
  flows, so it is a narrower hole, not a closed one.
- **(C) Keep the behaviour and narrow INV-QD-120's wording** to "a signature recorded for a resource with
  a string id". This documents the over-wide grant instead of removing it.
- **(D) Record under a key no read can produce** (a sentinel resource). The discharge succeeds and the
  signature is never found. It is silent and fail-closed, but it records an unusable row and hides the
  wiring mistake.
- **(E) Coerce the id: `String(7)`.** That disagrees with the reader, which refuses non-string ids, so a
  resource-scoped check still fails `MissingResourceId`. Two rules for one id is the drift this plan
  removes.

**Recommendation: (A).** It is fail-closed, loud, and symmetric with the reader's rule. T1 can ship as a
patch ahead of the refactor. `status: open`

### D-52-e — What does `scope: "Any"` mean for a signature, and how is it described? (N2)

- **(A) Keep INV-QD-120's exact-pair meaning ("on file with no resource") and correct every description.**
  - `explain()` renders `… on file subject-wide, not for a resource` instead of `… for anything`.
    Proposed full string: `the subject has a signature meaning 'approved' from a 'manager' on file
    subject-wide, not for a resource`.
  - ADR-058 is amended.
  - BEH-QD-092 gains a sentence that `HasSignature` reads `"Any"` narrower than history does.
  - `signatureSpan`'s doc, `signatureHistoryFromSignatures`'s doc and the concept page are corrected.
- **(B) Align signatures to history's "ever" wildcard.** A `doc-1` signature would then satisfy
  `scope: "Any"` everywhere. That is the over-wide answer ADR-105 called "wider than the signer
  attested", and it inverts INV-QD-120. Rejected.
- **(C) A distinct literal for signatures, such as `"Subject"`.** It is honest, but it breaks the
  persisted `Policy` wire and devtools' closed span decode, and ADR-058 already rejected a forked scope
  type.

**Recommendation: (A).** The evaluator already does (A). Only the descriptions disagree, and they are
what an adapter author reads. The exact wording of the `explain()` string is the open part. `status: open`

### D-52-f — Is `SignatureLedger` a port in the registry sense (ADR-094/107)?

- **(A) No.** The ledger is an audit-side store with a write method and no fail-closed answer: BEH-QD-255
  forbids a default, and a `PortDescription.none` would be one. It has no span of its own and no wire.
  Its read side reaches the registry through `signatureHistoryFromLedger`, which returns a
  `Layer<SignatureHistory>`. That layer gets `signatureHistoryRetrying`/`Bounded`/`TimingOut`, remote
  serving (`portServing`) and devtools capture for free.
- **(B) Yes.** It would need a sixth `PortName`, a `none`, a span name and a wire, for a store core
  never reads directly.

**Recommendation: (A).** `status: decided (2026-10-13, recommended default — (B) contradicts BEH-QD-255)`

### D-52-g — A new ADR, or amendments?

- **(A) A new ADR-QD-NEXT, "A signature ledger is a keyed store".** It amends 105 (the ledger
  interface, the unkeyable-resource refusal) and 058 (what `"Any"` means for a signature). The ADR
  covers the persisted key (D-52-b), the foreign-entry refusal (D-52-c) and the conformance check
  (D-52-a). Those are new decisions, not edits to old ones.
- **(B) Amendment paragraphs on 105 and 058 only.** Shorter, but it would bury a persisted format
  decision inside an amendment.

**Recommendation: (A).** `status: open`

### D-52-h — Changeset and "breaking" framing

- **(A) If no release has happened since `b655b3b`**, amend `.changeset/signature-capture-keyed-by-question.md`
  in place. The ledger is described as a keyed store from the start, with no breaking note, because no
  published consumer ever saw `signaturesFor` on it. Add one sentence for D-52-d's refusal, which
  changes discharge behaviour for non-string-id resources, plus a separate `@qadi/core` **patch**
  changeset for the `explain()` wording (T2).
- **(B) If a release shipped the ledger first**, write a new `@qadi/audit` **minor** changeset marked
  **Breaking**: `SignatureLedgerShape.signaturesFor` is replaced by `entriesAt(key)`, and `append`
  takes the key. Include a migration sentence, and the same D-52-d sentence.

**Recommendation: (A) if T0 finds the changeset still pending, otherwise (B).** T0 settles which applies.
`status: open (settled mechanically at T0)`

## 6. Tasks

### T0 — Re-verify the evidence at the branch point
- **Status:** [ ] todo
- **Depends on:** —
- **Files:** none (read-only), plus the scratch probes.
- **Steps:**
  1. `git switch -c arch/52-signature-ledger-keyed-store main`. Record `git rev-parse --short HEAD`.
  2. `git diff --stat b655b3b HEAD -- packages/audit/src packages/audit/test packages/core/src/SignatureHistory.ts packages/core/src/Explanation.ts packages/core/src/PortAccess.ts packages/core/src/Resource.ts spec/behaviors/33-audit-pipeline.md spec/behaviors/12-history.md features/step-definitions/SignatureLoopSteps.ts`.
     If anything moved, re-find each symbol named in §1 (`ledgerEntryOf`, `captureRequestOf`,
     `signatureObligationHandler`, `SignatureLedgerTest` → `signaturesFor`, `signatureHistoryFromSignatures`,
     `Explanation.ts` → `HasSignature`, `askSignature`, `requireResourceId`). Correct line hints in §10.
  3. Copy the scratch probe directory to a fresh scratch folder and re-run it. P1–P4 should pass, which
     means the defects are still present.
  4. Release state, for D-52-h:
     - `ls .changeset/signature-capture-keyed-by-question.md`
     - `npm view @qadi/audit version`
     - `grep -n -i ledger packages/audit/CHANGELOG.md`

     Record (A) or (B).
  5. Sibling check:
     - `git log --oneline main -- packages/core/src/SignatureHistory.ts packages/core/src/Explanation.ts packages/core/src/PortAccess.ts`.
     - If ARCH-46 has landed, check whether `SignatureQuery` gained a field. If it did, D-52-b (B)'s law
       test needs the new field fixed in the pair projection.
     - If ARCH-51 has landed, check whether `Explanation.ts`'s `HasSignature` arm moved.
     - If ARCH-55 has landed (named core barrel), confirm no core export is added here.
     - If ARCH-57 has landed, confirm it did not also take N1.
- **Tests:** none.
- **Verify:**
  - `pnpm vitest run --project audit packages/audit/test/SignatureLedger.test.ts packages/audit/test/SignatureLoop.test.ts packages/audit/test/SignatureCapturePort.test.ts`
  - `pnpm vitest run --project core packages/core/test/Explanation.test.ts packages/core/test/SignatureHistory.test.ts`
  - `node scripts/check-house-style.mjs`
  - `node scripts/check-api-surface.mjs`
- **Done when:** baseline counts, probe results and the D-52-h branch are recorded in §10.

### T1 — Test-first: a discharge whose resource has no string id is refused (defect N1, patch-shippable)
- **Status:** [ ] todo
- **Depends on:** T0, D-52-d (= A). Under (B), apply steps 1–4 to the "present, non-string `id`" cases only.
- **Files:**
  - `packages/audit/test/SignatureLoop.test.ts`
  - `packages/audit/test/SignatureLedger.test.ts`
  - `packages/audit/src/SignatureCapturePort.ts`
  - `packages/core/src/Resource.ts` (doc comment only)
  - `features/features/signatures/signatures.feature`
  - `features/step-definitions/SignatureLoopSteps.ts`
- **Steps:**
  1. **Red, ledger mode.** In `SignatureLoop.test.ts`'s ledger `describe`, add
     `"a signature captured on a resource with no string id satisfies no scope: 'Any' check"`. Approve
     `{ id: 7 }` with `signatureObligationHandler(returningPort, "approved", { ledger })`, then
     `decide(hasSignature("approved", { scope: "Any" }), { resource: { id: "doc-99" } })`. Assert
     `Deny`. This is red at HEAD (probe P3 allows).
  2. **Red, capture-persists mode.** Add the same case to the first `describe`, using `storeAndHistory`.
  3. **Red, refusal shape.** In `SignatureLedger.test.ts`, replace `"a resource with no string id is
     recorded subject-wide (resourceId undefined)"` with
     `"a resource with no string id refuses the discharge: capture is not called, nothing is recorded"`.
     Run it three times, with `resource: { id: 7 }`, `{ id: { n: 1 } }` and `{ kind: "draft" }`. Each
     time assert:
     - `result._tag === "Failure"`;
     - `result.failure._tag === "SignatureCaptureError"`;
     - `calls.n === 0`;
     - `entries().length === 0`;
     - `records[0]?.outcome === "HandlerFailed"`;
     - the guarded effect did not run (the `ran` flag pattern already in the file).

     Add `"a question with no resource still records subject-global"`: `qadiAssert(policy, { onObligations: … })`
     with no `resource`, `entries()[0]?.resourceId === undefined`, outcome `Discharged`.
  4. **Green.** In `signatureObligationHandler`, after `const request = captureRequestOf(…)` and **before**
     `port.capture`, add:
     `if (request.resource !== undefined && request.resourceId === undefined) return yield* Effect.fail(new SignatureCaptureError({ reason: "the discharged resource has no string id, so a signature for it cannot be keyed to it" }))`.
     Update `capture`'s doc ("Where the result goes"), the handler's doc and `resourceIdOf`'s doc
     sentence about writers ("a writer refuses a resource it cannot key; it does not store it
     subject-wide").
  5. **BDD.** Add a scenario to `signatures.feature`: "A signature cannot be captured for a document with
     no string id". The new step `When they approve a document with id 7 and a signature is captured`
     records the result in the world. `Then the discharge is refused` and `Then the "approved"
     signature is not on file for the subject at large` follow. The `@REQ-QD-034` tag is already on the
     feature.
- **Tests:** steps 1–3 and 5, written red first.
- **Verify:**
  - `pnpm vitest run --project audit packages/audit/test/SignatureLoop.test.ts packages/audit/test/SignatureLedger.test.ts packages/audit/test/SignatureCapturePort.test.ts`
  - `pnpm test:tstyche` (the handler's `E` is unchanged, `SignatureCapturePort.tst.ts`)
  - `pnpm test:bdd`
  - `node scripts/check-house-style.mjs`
- **Done when:** the three red cases are green, probe P3 run against the branch denies, and the handler's
  type is unchanged. This can be committed and shipped alone, with an `@qadi/audit` patch changeset
  sentence; see T10 for the spec rows that ship with it: INV-QD-120 and BEH-QD-256/326 wording.

### T2 — Test-first: `explain()` and the docs stop describing a signature's `"Any"` as a wildcard (N2, patch-shippable)
- **Status:** [ ] todo
- **Depends on:** T0, D-52-e (= A; the wording is the open part)
- **Files:**
  - `packages/core/test/Explanation.test.ts`
  - `packages/core/src/Explanation.ts`
  - `packages/core/src/SignatureHistory.ts` (the `signatureSpan` doc comment only)
  - `apps/website/src/content/docs/docs/concepts/signatures.md`
- **Steps:**
  1. **Red.** In `Explanation.test.ts` (:216), change the expected string to D-52-e's wording, for
     example `"the subject has a signature meaning 'approved' from a 'manager' on file subject-wide,
     not for a resource"`. Add a sibling case without `signerRole`. Leave the `HasActed`/`HasNotActed`
     "anything" cases unchanged: history's `"Any"` really is "ever".
  2. **Green.** In `Explanation.ts` → `HasSignature`, render `p.scope === "Any" ? " on file subject-wide, not for a resource" : " for this resource"`.
     Keep the `requirement("signature", …)` kind.
  3. Above `signatureSpan`, add one sentence: "`qadi.scope: "Any"` on this span names a subject-global
     question, rows stored with no resource, not a wildcard over resources (INV-QD-120). History's
     `"Any"` differs (BEH-QD-092)."
  4. Concept page (`concepts/signatures.md` :49-50): replace "mirroring `DecisionHistory`'s shape
     exactly" with "the same one-method shape as `DecisionHistory`. Unlike `hasActed`, a
     `scope: "Any"` signature check reads only signatures on file with **no** resource, never one
     recorded for a document".
  5. Grep the devtools for rendered explanation snapshots:
     `grep -rn "for anything" packages/devtools apps/website/src` should give none (verified at HEAD).
- **Tests:** step 1.
- **Verify:**
  - `pnpm vitest run --project core packages/core/test/Explanation.test.ts`
  - `pnpm vitest run --project devtools`
  - `node scripts/check-website-doc-examples.mjs`
- **Done when:** no `explain()` output describes a signature's `"Any"` as "anything". This can ship
  alone with a `@qadi/core` patch changeset; ADR-058 and BEH-QD-092 change in T10.

### T3 — Core locality: the signature fixture reads its key from the description (N3)
- **Status:** [ ] todo
- **Depends on:** T0. No decision.
- **Files:** `packages/core/src/SignatureHistory.ts`, `packages/core/test/SignatureHistory.test.ts`.
- **Steps:**
  1. In `signatureHistoryFromSignatures`, compute both keys with
     `signatureHistoryPort.key([{ subjectId: makeSubjectId(input.subjectId), resourceId: input.resourceId === undefined ? undefined : makeResourceId(input.resourceId) }])`
     and `signatureHistoryPort.key([query])`. Delete the two inline `JSON.stringify([…, resourceId ?? null])`.
     `makeResourceId` is already exported from `Identity.ts`; add it to the import.
  2. Correct the doc comment's parity claim:
     - delete "the same separation `ActedEvent`/`ActedAnywhere` keep";
     - say that history's subject-global answer is a wildcard and the signature fixture's is not;
     - keep the `JSON.stringify` collision paragraph, re-pointed at `signatureHistoryPort.key`.
  3. Add a test: `"the fixture groups by signatureHistoryPort.key"`. Insert colliding-looking pairs:
     `("a:b", "c")` vs `("a", "b:c")`, and resource `"null"` vs absent. Assert each answers only its own
     row.
- **Tests:** step 3. The existing `SignatureHistory.test.ts` cases stay green unchanged.
- **Verify:**
  - `pnpm vitest run --project core packages/core/test/SignatureHistory.test.ts packages/core/test/PortConformance.test.ts`
  - `pnpm circular`
- **Done when:** `grep -n "resourceId ?? null" packages/core/src/SignatureHistory.ts` matches only
  `signatureHistoryPort.key`.

### T4 — Test-first: the type-level contract of the keyed store
- **Status:** [ ] todo
- **Depends on:** T0, D-52-a (= A or C), D-52-b
- **Files:** `packages/audit/test/SignatureLedger.tst.ts` (*new*).
- **Steps:**
  1. Assert `keyof SignatureLedgerShape` is exactly `"name" | "append" | "entriesAt"`
     (`expect<keyof SignatureLedgerShape>().type.toBe<"name" | "append" | "entriesAt">()`).
  2. `Parameters<SignatureLedgerShape["entriesAt"]>[0]` is `SignatureLedgerKey`. `string` is **not**
     assignable to `SignatureLedgerKey`. `SignatureQuery` is not assignable to `entriesAt`'s parameter.
     This is P1/P2 made unwritable.
  3. `ledgerKeyOf` accepts both a `SignatureQuery` and a `SignatureLedgerEntry` (`toBeCallableWith`).
  4. `entriesAt` returns `Effect.Effect<ReadonlyArray<SignatureLedgerEntry>, SignatureLedgerReadError>`.
     `append` returns `Effect.Effect<void, SignatureLedgerError>`.
  5. `signatureHistoryFromLedger(ledger)` is `Layer.Layer<SignatureHistory>` (no error, no requirement).
- **Tests:** this file. It is red (does not compile) until T5.
- **Verify:** `pnpm test:tstyche` (fails until T5)
- **Done when:** the file exists and fails only for the missing symbols.

### T5 — `SignatureLedger.ts`: the keyed store and the derived read
- **Status:** [ ] todo
- **Depends on:** T4, D-52-a, D-52-b, D-52-c
- **Files:** `packages/audit/src/SignatureLedger.ts`, `packages/audit/src/SignatureCapturePort.ts`.
- **Steps:**
  1. Add the key:
     - `export type SignatureLedgerKey = string & Brand.Brand<"SignatureLedgerKey">`
     - a module-private `const makeLedgerKey = Brand.nominal<SignatureLedgerKey>()`
     - `export interface LedgerPair { readonly subjectId: SubjectId; readonly resourceId: ResourceId | undefined }`
     - `export const ledgerKeyOf = (pair: LedgerPair): SignatureLedgerKey => makeLedgerKey(JSON.stringify([1, pair.subjectId, pair.resourceId ?? null]))`.
       Under D-52-b (A), the body is `makeLedgerKey(signatureHistoryPort.key([pair]))`.

     The doc says this is a **persisted format**, its version element, and that its equality partition is
     the port's (pointing to T7's law).
  2. `SignatureLedgerEntry` becomes `extends LedgerPair` with `evaluationId` and `signature`. The shape is
     unchanged; only the declaration is factored.
  3. Add `export class SignatureLedgerReadError extends Data.TaggedError("SignatureLedgerReadError")<{ readonly key: SignatureLedgerKey; readonly cause: unknown }> {}`.
     Its doc says a store read failed, or an answer was refused (D-52-c).
  4. Make the shape `{ name?; append: (key: SignatureLedgerKey, entry: SignatureLedgerEntry) => Effect<void, SignatureLedgerError>; entriesAt: (key: SignatureLedgerKey) => Effect<ReadonlyArray<SignatureLedgerEntry>, SignatureLedgerReadError> }`.
     The doc of each method states the store's only obligation: "every entry appended under exactly
     `key`, and no other, compared byte for byte (no case folding, trimming or normalisation)".
  5. The static becomes `static readonly append = (entry: SignatureLedgerEntry) => SignatureLedger.use((l) => l.append(ledgerKeyOf(entry), entry))`.
  6. Rewrite `signatureHistoryFromLedger` as in the spike (`spike.ts`):
     - `signaturesFor: Effect.fn(function* (query: SignatureQuery) { … })`, unnamed;
     - `const key = ledgerKeyOf(query)`;
     - `entriesAt(key)` piped through `Effect.mapError((e) => signatureHistoryPort.failure([query], e))`;
     - the D-52-c check: any entry with `ledgerKeyOf(entry) !== key || entry.signature.signerId !== entry.subjectId`
       fails with `signatureHistoryPort.failure([query], new SignatureLedgerReadError({ key, cause: "the ledger answered an entry stored under another key" }))`;
     - otherwise it returns a **fresh** `entries.map((e) => e.signature)`.

     `name: ledger.name ?? "signatureHistoryFromLedger"` is unchanged.
  7. Rewrite the module header. The write key and the read key are now one function, `ledgerKeyOf`,
     called on both sides. The adapter stores by an opaque key. `signatureHistoryFromLedger` derives the
     exact-pair rule and refuses foreign rows. Delete the "by construction" sentence that was true only
     for the double.
  8. In `SignatureCapturePort.ts`, change `signatureObligationHandler`'s append to
     `const entry = ledgerEntryOf(request, signature); yield* options.ledger.append(ledgerKeyOf(entry), entry)`.
     Update the `import`.
  9. `LedgerKeySource` and `ledgerEntryOf` are unchanged.
- **Tests:** T4 goes green. T6 and T7 follow.
- **Verify:**
  - `pnpm typecheck`
  - `pnpm test:tstyche`
  - `pnpm circular`
  - `node scripts/check-house-style.mjs`
- **Done when:** the T4 contract compiles and passes, and `SignatureLedgerShape` has no `signaturesFor`.

### T6 — `SignatureLedgerTest` becomes a keyed multimap
- **Status:** [ ] todo
- **Depends on:** T5
- **Files:** `packages/audit/src/SignatureLedgerTest.ts`, `packages/audit/test/SignatureLedger.test.ts`.
- **Steps:**
  1. Replace the filter-by-recomputed-key read with a `MutableHashMap<SignatureLedgerKey, ReadonlyArray<SignatureLedgerEntry>>`:
     - `append` does `modifyAt(…, Option.some(Arr.append(…)))` and also appends to a call-order
       `MutableRef` log;
     - `entriesAt(key)` returns a **fresh** array (`[...getOrElse(get(store, key), Arr.empty)]`).
  2. `SignatureLedgerTestHandle` keeps `{ ledger, entries }`. `entries()` is still the call-order log.
     Delete the doc's "grouped by `signatureHistoryPort.key`"; the double is now an opaque-key store
     like any adapter, and the rule lives in `signatureHistoryFromLedger`. The import of
     `signatureHistoryPort` goes away.
  3. Migrate `SignatureLedger.test.ts`'s `describe("SignatureLedgerTest")`:
     - "a resource-scoped read sees only entries stored with that resource" now reads through
       `signatureHistoryFromLedger(ledger)`, the interface `hasSignature` uses, not
       `ledger.signaturesFor`;
     - "a read hands out a copy" is kept at both levels (`entriesAt` and `signaturesFor`);
     - "an unnamed ledger gets the layer's own name" builds `{ append: base.append, entriesAt: base.entriesAt }`;
     - "SignatureLedger.append delegates" also asserts that the entry landed under `ledgerKeyOf(entry)`.
  4. New cases, D-52-c:
     - `"a ledger that answers an entry stored under another key fails the read as SignatureHistoryUnavailable"`:
       an `entriesAt` that returns a `doc-1` entry for every key, read with `resourceId: undefined`. Run
       it through `decide(hasSignature("approved", { scope: "Any" }))` and assert
       `result.failure._tag === "SignatureHistoryUnavailable"`, then `instanceOf(cause, SignatureLedgerReadError)`.
       This is probe P1 turned into a refusal.
     - `"a row whose signer is not its subject fails the read"`.
     - `"a store read failure is the port's typed error"`: `entriesAt` fails `SignatureLedgerReadError`,
       giving `SignatureHistoryUnavailable` with `subjectId`/`resourceId` from the query.

     None of these constructs `SignatureHistoryUnavailable` (`PORT_DOUBLE_BUDGET`).
  5. `"a failing ledger refuses enforcement"` (:280-313) builds `failing` with
     `entriesAt: base.entriesAt`. Its assertions are unchanged.
- **Tests:** steps 3–5.
- **Verify:**
  - `pnpm vitest run --project audit packages/audit/test/SignatureLedger.test.ts packages/audit/test/SignatureLoop.test.ts`
  - `node scripts/check-house-style.mjs`
- **Done when:** every ledger test passes through `signatureHistoryFromLedger` and none calls a
  `signaturesFor` on a ledger.

### T7 — Properties: INV-QD-120 as a differential, and the key law
- **Status:** [ ] todo
- **Depends on:** T3, T6, D-52-b
- **Files:** `packages/audit/test/SignatureLedger.test.ts` (a new `describe("properties")`).
- **Steps:**
  1. **Arbitraries** (`fast-check`, already an audit devDependency):
     - `subjectId` from `fc.constantFrom("alice", "Alice", "alice ", "a:b", "a")`;
     - `resourceId` from `fc.option(fc.constantFrom("doc-1", "Doc-1", "doc-1 ", "null", "", "b:c", "é", "é"))`,
       where the last two are NFC `é` and NFD `é`;
     - `meaning` from `fc.constantFrom("approved", "witnessed")`.
  2. **Differential.** For random row sets and random queries, compare two stores:
     - rows appended through `SignatureLedger.append`'s key path into `SignatureLedgerTest`, read through
       `signatureHistoryFromLedger`;
     - the same rows given to `signatureHistoryFromSignatures`.

     `signaturesFor(query)` must answer the same multiset of `(signerId, meaning)` from both. This is
     INV-QD-120's exact-pair rule checked against core's own fixture, so the two stores cannot drift.
  3. **Key law (D-52-b).** For all pairs `p, q`:
     `ledgerKeyOf(p) === ledgerKeyOf(q)` ⇔ `signatureHistoryPort.key([p]) === signatureHistoryPort.key([q])`.
     The law passes trivially under D-52-b (A), but keep it as the alarm.
  4. **Golden bytes.** `ledgerKeyOf({ subjectId: "alice", resourceId: "doc-1" }) === '[1,"alice","doc-1"]'`
     and `ledgerKeyOf({ subjectId: "alice", resourceId: undefined }) === '[1,"alice",null]'`. The test
     name says "persisted format: changing this orphans every stored signature".
- **Tests:** this task's.
- **Verify:** `pnpm vitest run --project audit packages/audit/test/SignatureLedger.test.ts`
- **Done when:** the differential runs at least 200 cases green, and the law and golden tests pass.

### T8 — `SignatureLedgerConformance.ts`: a check a deployment runs against its own store
- **Status:** [ ] todo
- **Depends on:** T5, D-52-a (= C)
- **Files:**
  - `packages/audit/src/SignatureLedgerConformance.ts` (*new*)
  - `packages/audit/src/index.ts`
  - `packages/audit/test/SignatureLedgerConformance.test.ts` (*new*)
  - `packages/audit/test/SignatureLoop.test.ts`
- **Steps:**
  1. **The fixture table**, module-private and static.
     - Pairs: `(s, "doc-1")`, `(s, "Doc-1")`, `(s, "doc-1 ")`, `(s, "é" NFC)`, `(s, "é" NFD)`,
       `(s, "null")`, `(s, "")`, `(s, "a\",\"b")`, `(s, undefined)`, `(s2, "doc-1")`, `(s2, undefined)`,
       where `s`, `s2` are `${options.namespace ?? "qadi-conformance"}/alice` and `/bob`. The namespace
       lets the check run against a shared, non-empty table.
     - One entry per pair, with a distinct `meaning` (`"conformance-<n>"`) so a misfiled answer names
       its origin.
     - Plus one unseen pair `(s, "never-written")`.
  2. **`LedgerConformanceViolation`**, a closed union via `Data.taggedEnum`:
     - `Foreign { readonly asked: LedgerPair; readonly answered: LedgerPair; readonly meaning: string }`:
       an answer included a row written under another pair;
     - `Missing { readonly asked: LedgerPair; readonly meaning: string }`: a row written under the pair
       was not answered.
  3. **`checkSignatureLedger`**: `Effect.fn("qadi.audit.checkSignatureLedger")(function* (ledger: SignatureLedgerShape, options?: LedgerConformanceOptions) { … })`.
     - Append every fixture entry with `ledgerKeyOf`.
     - For every fixture pair and the unseen pair, call `entriesAt(ledgerKeyOf(pair))` and compare it
       against the table.
     - Return the violations in fixture order.
     - Errors from the store propagate (a store failure is not a violation).
  4. **`checkSignatureHistoryScoping`**: `Effect.fn("qadi.audit.checkSignatureHistoryScoping")(function* <E, R>(seed: (rows: ReadonlyArray<{ readonly pair: LedgerPair; readonly signature: Signature }>) => Effect.Effect<Layer.Layer<SignatureHistory>, E, R>, options?) { … })`.
     - The caller writes the rows however its store writes and returns the history layer to read.
       That covers `signatureHistoryFromSignatures`, the capture-persists mode, and
       `signatureHistoryFromLedger`.
     - Query every pair as a `SignatureQuery` and compare by `meaning`.
  5. Module doc:
     - what each check proves (the store's key equality; the history's exact-pair scoping);
     - what neither proves: durability, concurrency, the signer's identity or intent (BEH-QD-255,
       ADR-QD-016);
     - that it is a test aid: no default instance, nothing runs it automatically.
  6. **Tests** (`SignatureLedgerConformance.test.ts`):
     - `checkSignatureLedger(SignatureLedgerTest().ledger)` reports `[]`;
     - a **case-folding** ledger (`key.toLowerCase()` as the map key) reports `Foreign` for the
       `Doc-1`/`doc-1` pairs;
     - a **trimming** ledger (`key.replace(/ (?=")/, "")`, like MySQL `PAD SPACE`) reports `Foreign`;
     - an **NFC-normalising** ledger (`key.normalize("NFC")`) reports `Foreign` for the two `é` pairs;
     - a **lossy** ledger (keeps the last entry per key) reports `Missing`;
     - `checkSignatureHistoryScoping` reports `[]` with `seed = (rows) => Effect.succeed(signatureHistoryFromSignatures(…))`;
     - it reports `[]` with `seed` appending into a `SignatureLedgerTest` and returning
       `signatureHistoryFromLedger`;
     - it reports `Foreign` for the **optional-filter** history (P1's read: `q.resourceId === undefined || r.resourceId === q.resourceId`);
     - it reports `Foreign` for the **null-wildcard** history (P2's read).
     - `namespace` isolates two runs against one store.

     Each wrong-adapter test asserts the exact violation list, so Stryker cannot flip a comparison and
     survive.
  7. In `SignatureLoop.test.ts`, add one case: `checkSignatureHistoryScoping` over `storeAndHistory`'s
     reading logic, factored into a `seed`, reports `[]`. The capture-persists reference store is then
     checked by the same tool a deployment would use.
  8. Barrel: `export * from "./SignatureLedgerConformance.ts"` between `./SignatureLedger.ts` and
     `./SignatureLedgerTest.ts`.
- **Tests:** step 6–7.
- **Verify:**
  - `pnpm vitest run --project audit`
  - `pnpm circular`
  - `node scripts/check-house-style.mjs`
  - `npx stryker run stryker.audit.mjs`, run locally on this module first: `--mutate packages/audit/src/SignatureLedgerConformance.ts`
- **Done when:** all ten conformance tests pass and the module's mutation score is at least 80%.

### T9 — Remaining callers: acceptance steps, the type test, examples
- **Status:** [ ] todo
- **Depends on:** T5, T6
- **Files:**
  - `features/step-definitions/SignatureLoopSteps.ts`
  - `features/step-definitions/SharedWorld.ts`
  - `packages/audit/test/SignatureCapturePort.tst.ts`
- **Steps:**
  1. `pnpm test:bdd`. The steps use `SignatureLedgerTest()` / `signatureHistoryFromLedger` /
     `signatureObligationHandler`, which keep their names and call shapes, so no edit is expected. Fix
     only what fails to compile.
  2. `SignatureCapturePort.tst.ts` imports `SignatureLedgerError` from `SignatureLedger.ts`, and that
     name stays. Confirm it is green.
  3. `grep -rn "signaturesFor" packages/audit features apps/website/src spec/behaviors/33-audit-pipeline.md`.
     Every remaining hit must be on `SignatureHistory`, not on a ledger.
- **Tests:** existing.
- **Verify:**
  - `pnpm test:bdd`
  - `pnpm test:tstyche`
  - `pnpm typecheck`
- **Done when:** the acceptance suite and the type tests are green, and no ledger `signaturesFor` remains.

### T10 — Spec, ADR, overview, traceability, CCR, docs, changeset
- **Status:** [ ] todo
- **Depends on:** T1–T9, D-52-g, D-52-h
- **Files:**
  - `spec/decisions/NEXT-a-signature-ledger-is-a-keyed-store.md` (*new*)
  - `spec/decisions/058-…md` and `105-…md` (amendments)
  - `spec/decisions/index.yaml`
  - `spec/invariants.md`
  - `spec/behaviors/33-audit-pipeline.md`
  - `spec/behaviors/12-history.md`
  - `spec/traceability.md`
  - `spec/overview.md`
  - `spec/README.md` (CCR)
  - `apps/website/src/content/docs/docs/packages/audit/signatures.md`
  - `apps/website/src/content/docs/docs/concepts/signatures.md` (T2 already touched it)
  - `packages/audit/README.md`
  - `.changeset/signature-capture-keyed-by-question.md` or a new changeset (D-52-h)
  - `.changeset/<core-explain-signature-scope>.md` (*new*)
- **Steps:** as listed in §8. Use `pnpm spec:next-id` for ids and `pnpm spec:revise` for revision bumps
  at landing time.
- **Tests:** gates only.
- **Verify:**
  - `node scripts/check-doc-examples.mjs`
  - `bash spec/scripts/verify-traceability.sh --strict`
  - `node scripts/check-api-surface.mjs`
  - `node scripts/check-website-doc-examples.mjs`
  - `node scripts/check-dod-table.mjs`
- **Done when:** all five gates pass, and the ADR, INV and BEH text says "keyed store",
  "`signatureHistoryFromLedger` derives the rule", and states the unkeyable-resource refusal.

### T11 — Full gate
- **Status:** [ ] todo
- **Depends on:** T10
- **Steps:**
  1. Run `pnpm check`, which includes mutation, because this change touches an audit compliance path.
     Record the time, and the audit Stryker score before and after.
  2. Re-run the scratch probes P1–P3 against the branch. P1 and P2 must no longer type-check (the spike
     shapes are gone). P3 must deny with `HandlerFailed`.
- **Verify:** `pnpm check`
- **Done when:** green, with the scores recorded in §10.

### T12 — Update the tracker
- **Status:** [ ] todo
- **Depends on:** T11
- **Files:** this plan (§10, `status:`), `.planning/architecture/README.md` (the wave-5 row).
- **Done when:** the status is `done` and the README row names the ADR/CCR ids that were assigned.

## 7. Test strategy

**Replace, don't layer.**

- **Deleted:**
  - `SignatureLedger.test.ts` → `"a resource with no string id is recorded subject-wide"`. It pinned
    defect N1 and is replaced by T1's refusal cases.
  - Every direct `ledger.signaturesFor(…)` call; the method no longer exists.
- **Moved to the new interface:**
  - `SignatureLedgerTest` keying, copy-per-read and naming now go through `signatureHistoryFromLedger`,
    the interface `hasSignature` actually reads, plus one `entriesAt` copy check.
  - The failing-ledger refusal keeps its assertions on a reshaped double.
- **Unchanged:**
  - `SignatureLoop.test.ts`'s six loop cases in both modes;
  - the mismatch and ledger-failure discharge refusals;
  - `SignatureCapturePort.test.ts` and `.tst.ts`;
  - `signatures.feature`'s three scenarios;
  - `SignatureHistory.test.ts`;
  - `PortConformance.test.ts`.
- **New:**
  - T1: three red-first refusal cases and one BDD scenario;
  - T2: two explanation strings;
  - T3: a collision case;
  - T4: a type contract;
  - T6: three D-52-c refusals;
  - T7: a differential property against `signatureHistoryFromSignatures`, the key-partition law and
    golden bytes;
  - T8: a conformance suite of ten cases, six of them against deliberately wrong adapters.
- **Property / differential.**
  - T7's differential is the main guard for INV-QD-120: the ledger path and core's fixture must agree
    for every adversarial pair.
  - T7's law guards D-52-b against a core key change.
  - T8 turns the probe adapters (P1, P2) and three collation hazards into permanent negative tests.
- **Mutation.**
  - `stryker.audit.mjs` mutates the reshaped `SignatureLedger.ts` and `SignatureLedgerTest.ts`, and the
    new `SignatureLedgerConformance.ts`.
  - The mutants that matter are in the foreign-entry check (`!==` → `===`, `||` → `&&`), in the
    `request.resource !== undefined && request.resourceId === undefined` guard, and in the conformance
    comparison. Each is killed by a specific test: T6 step 4, T1 step 3, and T8 step 6.
  - `ignoreStatic` skips the fixture table, which is correct because a mutated literal only changes
    the probe data.
- **Core coverage** (95%). T2 and T3 touch two expressions, and their tests cover both branches.

## 8. Spec and documentation updates

- **ADR-QD-NEXT, "A signature ledger is a keyed store"** (D-52-g).
  - **Context:** C1–C4, N1, N2, N5.
  - **Decision:** D-52-a, b, c, d, e, f.
  - **Alternatives:** the rejected options.
  - **Amends:** 105 (the ledger bullet; the unkeyable-resource refusal) and 058 (signature `"Any"`).
  - Add it to `spec/decisions/index.yaml`.
- **ADR-QD-105 amendment paragraph.** "The write key and the read key are one rule" was true of the
  in-memory double only. The ledger is now a keyed store, and `signatureHistoryFromLedger` derives the
  read. A discharge whose resource cannot be keyed is refused.
- **ADR-QD-058 amendment paragraph.** "Same semantics" holds for `"Resource"` only. For a signature,
  `"Any"` reads rows stored with no resource (INV-QD-120), not "ever" (BEH-QD-092), and `explain()`
  says so.
- **INV-QD-120.**
  - The statement adds: "a discharge whose resource has no string id records nothing and is refused".
  - **Source:** `ledgerKeyOf`, called on both sides; `signatureHistoryFromLedger` derives and refuses
    foreign rows; the handler's unkeyable guard. Remove "`SignatureLedgerTest` groups by
    `signatureHistoryPort.key`".
  - **Enforcement:** T1, T6, T7 (differential, law, golden), T8.
- **INV-QD-NEXT (optional; fold into 120 if preferred): "A ledger read answers only what was stored under
  the key asked".** Source: `signatureHistoryFromLedger`. Enforcement: T6 step 4 and T8.
- **BEH-QD-326.**
  - The REQUIREMENTs change from "keyed by the signature's signer and the request's `resourceId`" to
    "appended under `ledgerKeyOf(entry)` and read through `signatureHistoryFromLedger`".
  - Add a REQUIREMENT: "an adapter MUST answer `entriesAt(key)` with exactly the entries appended under
    `key`, compared byte for byte".
  - Add a REQUIREMENT: "a foreign entry MUST fail the read".
  - The compiled fence is unchanged, because its API names are stable. Re-run gate 9.
- **BEH-QD-256.** Add a REQUIREMENT: a discharge whose question has a resource with no string id MUST
  fail with `SignatureCaptureError` before `capture`, and MUST NOT record.
- **BEH-QD-NEXT, "A ledger adapter can be checked"** (33-audit-pipeline): `checkSignatureLedger` /
  `checkSignatureHistoryScoping`, what they prove and what they do not, with a compiled `typescript`
  example over an in-memory `Map` adapter.
- **BEH-QD-092** (12-history). One sentence: `HasSignature` reuses the literal with a narrower reading
  (BEH-QD-326).
- **Traceability.**
  - Rows for `SignatureLedger.tst.ts` and `SignatureLedgerConformance.test.ts` (*new*).
  - Update the `SignatureLoop.test.ts` / `SignatureLedger.test.ts` row (adds BEH-QD-NEXT, ADR-QD-NEXT).
  - Add the ADR row.
- **`spec/overview.md`** (gate 13).
  - New rows:
    - `SignatureLedgerKey`, `LedgerPair` (type);
    - `ledgerKeyOf` (function: the one key, persisted format v1);
    - `SignatureLedgerReadError` (error);
    - `checkSignatureLedger`, `checkSignatureHistoryScoping` (function);
    - `LedgerConformanceViolation` (type + constructors);
    - `LedgerConformanceOptions` (type).
  - Change the `signatureHistoryFromLedger, ledgerEntryOf` row to "derives the exact-pair read from
    `ledgerKeyOf` and refuses foreign rows".
  - Change the `SignatureLedger, SignatureLedgerShape` row to "a keyed store: `append(key, entry)`,
    `entriesAt(key)`".
  - Bump the change history.
- **CCR-QD-NEXT** row in `spec/README.md`, naming every document revision above.
- **Website** (`packages/audit/signatures.md`).
  - Add a section, "Implementing a ledger over your store". The store's whole contract is equality on
    an opaque key. Explain why: there is no resource column to get wrong. Name the collation hazards.
    Add a compiled `typescript` example of an adapter plus a `checkSignatureLedger` run.
  - State the unkeyable-resource refusal.
  - Say what `scope: "Any"` reads.
  - Replace :146's comment with "a deployment implements `append`/`entriesAt` over its store, and
    `checkSignatureLedger` checks it".
- **`packages/audit/README.md`.** Same three points, briefly.
- **Changesets (D-52-h).**
  - Under (A), the `@qadi/audit` minor changeset (`signature-capture-keyed-by-question.md`) describes
    the ledger as `append(key, entry)` / `entriesAt(key)` plus `ledgerKeyOf`, the conformance checks,
    and the unkeyable-resource refusal. It has no breaking note for the ledger, because the ledger was
    never released.
  - Under (B), a new `@qadi/audit` minor changeset marked **Breaking**, with the migration
    (`signaturesFor` → `entriesAt(key)`; `append(entry)` → `append(ledgerKeyOf(entry), entry)` or
    `SignatureLedger.append(entry)`).
  - Either way, a new `@qadi/core` **patch** changeset for the `explain()` wording.
  - No release step. The user decides releases.

## 9. Risks and rollback

- **The persisted key format (D-52-b) is forever.** Once a deployment stores `[1,"alice","doc-1"]`, any
  change orphans rows, and every `hasSignature` fails closed. *Mitigation:* the golden test, the version
  element, and ADR-QD-NEXT stating that the format is frozen. *Rollback:* none is needed before the
  first release. After it, a v2 needs a migration ADR.
- **The D-52-d refusal can surprise a numeric-id deployment.** A signature obligation on `{ id: 7 }`
  turns from a silent over-wide record into `HandlerFailed`. That is the fail-closed direction. The
  changeset sentence and the website section say so. *Rollback:* revert T1 alone. It is an independent
  commit, but reverting re-opens N1, so it needs a security-review sign-off.
- **D-52-c could fail reads in a deployment whose store returns duplicates or extra columns.** Duplicates
  under the same key are fine, because only *foreign* keys or signer mismatches fail. A store that
  re-derives `subjectId` with a different brand or normalisation would fail loudly. That is the point,
  but the failure is visible as `SignatureHistoryUnavailable` with a `SignatureLedgerReadError` cause,
  and the website names the cause.
- **Sibling overlap.**
  - **ARCH-46** (one port-read module; the `SignatureHistory` read/judge split) edits
    `SignatureHistory.ts`'s `signatureWire`/`signatureSpan` and `PortAccess.ts` → `askSignature`. This
    plan touches only `signatureSpan`'s doc comment (T2), `signatureHistoryFromSignatures` (T3) and
    nothing in `PortAccess.ts`. The merge is textual and small. **Ordering:** either can land first. If
    ARCH-46 adds a field to `SignatureQuery`, T7's law and `ledgerKeyOf`'s `LedgerPair` projection must
    stay on `(subjectId, resourceId)`. That is D-52-b (B)'s purpose, and T0 step 5 checks it.
  - **ARCH-51** (closed `LeafNeeds` table) lists `Explanation.ts`. T2 changes one string in the
    `HasSignature` arm. Whichever lands second rebases a one-line conflict.
  - **ARCH-55** (named-export core barrel; merging `PortSpan*`/`PortWire*`): this plan adds **no** core
    export and imports only `signatureHistoryPort`, `SignatureHistory`, `makeResourceId` and types,
    which survive the merge. If ARCH-55 lands first, re-run `pnpm typecheck` at T0.
  - **ARCH-57** (loose ends, small defects) must not also take N1. T1 here is the owner. Say so in
    ARCH-57's plan.
  - **ARCH-48** (devtools fixture fields, `DropSignature`) touches devtools' `SignatureInput` form, not
    this seam. No overlap.
- **Mutation-score regression on audit.** The new module adds mutants. T8's exact-list assertions are
  sized for that. If the score dips under 80%, add assertions; do not widen `ignoreStatic`.
- **Rollback of the whole plan.** Revert the branch's commits in reverse task order. T1 and T2 are
  independent patches that can stay, because they close N1 and N2 without the interface change. T3 is
  behaviour-neutral.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | Plan written. Evidence verified at `b655b3b`; probes P1–P4 and the spike in `scratchpad/wave5/ARCH-52/` | ARCH-52 planner |
| 2026-10-13 | T0-T12 | Implemented as one commit: all D-52 recommendations taken; D-52-h (A) (changeset pending, npm 0.11.0). ADR-QD-110, CCR-QD-389, BEH-QD-336; INV folded into 120 (INV-QD-244 unused). Stryker audit: see commit/report | wave5 implementer |
