---
phase: 02-one-port-read
reviewed: 2026-11-08T00:00:00Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - apps/website/src/content/docs/docs/concepts/signatures.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - .changeset/a-port-is-answered-remotely.md
  - .changeset/one-port-read.md
  - packages/audit/src/SignatureLedgerTest.ts
  - packages/core/src/AttributeResolver.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/src/DecisionHistory.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/PortSpan.ts
  - packages/core/src/PortWireEncode.ts
  - packages/core/src/PortWire.ts
  - packages/core/src/RelationshipResolver.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/src/SignatureMatch.ts
  - packages/core/test/PortAccess.test.ts
  - packages/core/test/PortConformance.test.ts
  - packages/core/test/PortDescription.test.ts
  - packages/core/test/PortRemote.test.ts
  - packages/core/test/PortServe.test.ts
  - packages/core/test/PortSpan.test.ts
  - packages/testing/test/TestLayers.test.ts
  - spec/behaviors/30-port-calls.md
  - spec/behaviors/34-remote-ports.md
  - spec/decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md
  - spec/decisions/077-both-interpreters-read-ports-through-one-module.md
  - spec/decisions/094-a-port-is-described-once.md
  - spec/decisions/107-a-port-is-answered-remotely-through-its-description.md
  - spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
  necessity: 0
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-11-08
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

The phase moves each port's span question projection onto its description (`pose`), makes `disclose` take the request, and collapses six local reads plus the served read into one `readPort` body. The mechanism is sound: `readPort` opens no span, the reads keep their `Effect.fn` span names, and `UNTRACED_BUDGET` is untouched. The per-port table test in `PortAccess.test.ts` is a good guard for local and served span equality.

The 02-02 deviation in `SignatureLedgerTest.ts` is correct. The ledger groups by `(subjectId, resourceId)` and the read key is built from the query with `meaning` and `signerRole` dropped. Both sides absent-`resourceId` map to `null`, so the subject-global and per-resource separation is preserved. It is only reached end to end by the BDD feature (`SignatureLoopSteps.ts`), not by a unit test (IN-04).

The goal, "local and served spans cannot diverge", is only partly structural. Three resource-scoped reads still hand-write the question a second time (WR-02). A third-party store that returns a malformed signature list now makes a served read die, where before it was refused cleanly (WR-01). One safety claim in ADR-QD-109 and in the signature key's doc comment is false under `not(...)` (WR-03).

No critical issues were found.

## Warnings

### WR-01: `disclose` and `pose` run outside the defect mapping, so a served read can die and `answerRemotely`'s "never fails" no longer holds

**File:** `packages/core/src/PortAccess.ts:187-193` (also `packages/core/src/SignatureHistory.ts` `signatureSpan.disclose`, and `packages/core/src/PortRemote.ts:106`)
**Issue:** `catchPortDefect` wraps only the `Effect.flatMap(d.service, ...)` invocation. `d.attributes.pose(args)` and `d.attributes.disclose(answer, args)` are plain calls inside the `Effect.gen` body, so a throw there is an unmapped defect.

For the four other ports `disclose` is total. The signature port's `disclose` now reads the store's answer: `signatureMatches(signatures, ...)` calls `signatures.some(s => s.meaning ...)`. A store that returns a list with a malformed element, or a non-array from an untyped adapter, makes it throw a `TypeError`.

- Before this phase the served path ran `spanAnswer`, which returned `{}` without touching the answer. A bad answer then reached `encodeAnswer` and became `Refused: Unencodable`, a clean reply.
- Now the throw is a defect from `servePortRead`. `answerRemotely` uses `Effect.result`, which does not catch defects, so the host dies (a 500) even though its doc says "**Never fails**, whatever the body or the store does".
- Locally this already happened in `askSignature`, whose own `signatureMatches` call is outside `catchPortDefect`. The served path is the regression.
- The changeset and BEH-QD-332 say a throwing store is "never a defect". That holds for a throwing store but not for a throwing projection of its answer.

**Fix:** Run the projections inside the defect mapping. Do the `disclose` call inside the same `pipe(catchPortDefect(...))`:
```ts
const answer = yield* Effect.flatMap(d.service, (shape) => d.invoke(shape)(...args)).pipe(
  Effect.tap((a) => annotateAnswer<SpanFields>(d, d.attributes.disclose(a, args))),
  catchPortDefect((cause) => d.defect(args, cause)),
);
```
`Effect.tap` evaluates its callback inside the effect, so a throw in `disclose` becomes a Die that `catchPortDefect` maps. Alternatively make the signature `disclose` tolerant. Add a `PortReply.answer([null])` case for the signature row in the per-port table, which currently has no case for a malformed answer.

### WR-02: the pre-validation question is still written by hand in three reads, a second statement of the projection

**File:** `packages/core/src/PortAccess.ts:305-311` (`askActedForResource`), `:379-385` (`askRelationship`), `:438-445` (`askSignature`)
**Issue:** The phase goal is that a span's question is stated once, by `pose`. These three reads still build the full question object by hand (`scope: "Resource"`, `interpreter`, `resourceId`, `depth`) for the annotate-before-validate step, and then `readPort` annotates `pose(...)` again.

The two statements already disagree. `decisionHistoryPort.attributes.pose` derives `scope` from `resourceId === undefined ? "Any" : "Resource"`. The hand-written copy hard-codes `scope: "Resource"` so that the `MissingResourceId` span still says Resource. Nothing ties the copies together. The next field added to `pose` (a new `question` key) is silently absent from the failure span.

`PortAccess.test.ts` "a missing resource id still leaves its question on the span" pins the current literals, but only for the failure branch. It cannot catch a drift between the copy and `pose` on the success branch.

**Fix:** Derive the failure-path annotation from `pose` instead of restating it. For example, build the request with a placeholder-free shape (`resourceId: undefined`) and override only the fields the description cannot know:
```ts
yield* annotateQuestion(decisionHistoryPort, {
  ...decisionHistoryPort.attributes.pose([{ subjectId: subject.id, event, resourceId: undefined }]),
  scope: "Resource",
  interpreter,
});
```
Or validate first and annotate the question in the failure branch only. ADR-QD-109 records this trade-off as accepted, but it defeats "stated once" for these three reads.

### WR-03: "over-keying can only miss and deny, never replay a stale allow" is false for a negated `hasSignature`

**File:** `packages/core/src/SignatureHistory.ts:187-194` (the `signatureHistoryPort` doc comment) and `spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md` (Consequences, second bullet); the behaviour is in `packages/devtools/src/model/Capture.ts:182-185`
**Issue:** The key is now per requirement: `[subjectId, resourceId, meaning, signerRole]`. A devtools capture is replayed through `scriptedPort(d, ...)` keyed by `d.key(args)`. A request the capture never saw answers the port's `none` value, `NO_SIGNATURES`, which is a definitive answer and not an outage or `"Unknown"`.

- Under `hasSignature(...)`, a miss denies, so the claim holds.
- Under `not(hasSignature(...))`, an empty list makes the inner leaf deny and the `Not` grant. A what-if that edits a policy's `meaning` or `signerRole` (the main reason to replay a snapshot) now reads a miss and reports an allow that the real store would not give.
- Before this phase the capture was keyed by `(subjectId, resourceId)` and held every signature, so such a what-if was exact. This is a fidelity regression, in the grant direction.
- It is confined to the devtools what-if panel and not to live enforcement. But the ADR cites the safety property explicitly, and `DecisionHistory` already avoids this by answering `"Unknown"` for a miss. The signatures page's claim that "an empty list already denies on its own" is likewise only true for the un-negated leaf.

**Fix:** Do not let a capture miss look like a definitive empty answer for the signature port. Either capture signatures keyed by `(subjectId, resourceId)`, as the ledger now does, and keep the requirement as span context only, or make replay answer `SignatureHistoryUnavailable` for an unseen signature request. Correct the claim in the ADR and the doc comment either way.

## Info

### IN-01: `SignatureLedgerTest.ts` and `SignatureLedger.ts` doc comments contradict the new key

**File:** `packages/audit/src/SignatureLedgerTest.ts:7-9`, `packages/audit/src/SignatureLedger.ts:10-12,105`
**Issue:** The header of `SignatureLedgerTest.ts` still says entries are grouped by `signatureHistoryPort.key`, "the very key `hasSignature` reads with, so the write and the read cannot disagree". The new paragraph two lines later says the opposite: the read leaves out `meaning` and `signerRole`. `SignatureLedger.ts` (not edited in this phase) says the read key `signatureHistoryPort.key` "is the same pair, `(subjectId, resourceId)`", which is now a four-element tuple. The key is also reached indirectly. The ledger calls `signatureHistoryPort.key` with a half-built query, so it silently depends on `key` being exactly `JSON.stringify([s, r ?? null, ...null])`.
**Fix:** Drop the "very key" sentence. State that the ledger groups by `(subjectId, resourceId)`. Consider a local `JSON.stringify([subjectId, resourceId ?? null])`, as `signatureHistoryFromSignatures` does, so the ledger does not depend on the port key's tail.

### IN-02: stale `ADR-QD-NEXT` / `INV-QD-NEXT` placeholders in touched files

**File:** `packages/core/src/PortDescription.ts:98`, `packages/core/src/PortWire.ts:34,100`, `packages/core/test/PortServe.test.ts` (`describe("a served read (ADR-QD-NEXT)"`)
**Issue:** The wire is now decided by ADR-QD-107 (and ADR-QD-109 here), but the doc comments still cite the `NEXT` placeholder. They were edited in this phase and the placeholder was left.
**Fix:** Replace with `ADR-QD-107` and the real invariant id.

### IN-03: `PortSpan.ts` says `O` "is the same type for all five ports"

**File:** `packages/core/src/PortSpan.ts:87-90`
**Issue:** The five ports have different answer types (`unknown`, `ActedResult`, `RelatedResult`, `boolean`, `ReadonlyArray<Signature>`). The sentence presumably means that a read hands `disclose` the port's own answer unchanged, and it reads as a factual error.
**Fix:** "It is the port's own answer, unchanged: a read hands its answer to `disclose` as it received it."

### IN-04: no unit test for the ledger deviation

**File:** `packages/audit/test/SignatureLedger.test.ts:55-70`
**Issue:** Every direct `ledger.signaturesFor` call in the audit tests passes a query with no `meaning`. The key change in `SignatureLedgerTest.ts` is exercised only through the BDD feature, which is the only place that reads through `askSignature`. A regression that put the requirement back into the ledger key would pass the audit package's own tests.
**Fix:** Add a case reading with `{ subjectId, resourceId, meaning: "other", signerRole: "x" }` that still returns the stored signature.

### IN-05: version skew and the wire's strict decode are documented only in the changeset

**File:** `apps/website/src/content/docs/docs/reference/upgrading.md:141-145`, `apps/website/src/content/docs/docs/concepts/signatures.md:49-54`
**Issue:** The changeset warns that a client on this release is refused `Malformed` by a server on the previous schema, so servers must upgrade first. The new `upgrading.md` paragraph does not carry that ordering rule, and a user reading upgrade notes will not see it. `signatures.md` still says the port mirrors `DecisionHistory`'s shape "exactly", which is no longer true now the query has `meaning` and `signerRole`. The wire carries both as client-controlled, unbounded strings that reach span attributes (`qadi.meaning`, `qadi.signer_role`) with no allowlist and no length bound. `resourceId` already behaved like this.
**Fix:** Add the "upgrade servers with or before clients" sentence to `upgrading.md`. Drop "exactly" in `signatures.md`. Consider a `maxLength` check on the two strings in the signature wire question.

---

_Reviewed: 2026-11-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
