---
phase: "76"
slug: "remedies-uses-core-s-signature-match"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-23"
---

# Phase 76 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase moves one question into `@qadi/core`: does a fixture row meet a `hasSignature` or a
`hasActed` leaf? Core answers it with `signatureAnswerFromSignatures` and
`actedAnswerFromEvents`. Each shares one lookup and one answer rule with its port read. The
devtools remedy table (`Remedies.ts`) asks core and no longer matches rows itself.

What changed at a trust boundary:
- **Refusals fail typed for any value.** A fixture row, site subject, resource or row list
  that a typed caller could not build makes the two fixture layers, the port reads over them,
  both judgements and `remedyEdits` fail typed, or skip with a sentence. Covered values:
  symbols, `null` rows, throwing getters, throwing or revoked Proxies, a throwing list `length`
  or iterator, and a non-string constructor name. Nothing throws or dies. Everything goes
  through one guarded read in core (`readGuarded`, `readRows` and `unreadable` in `PortKey.ts`,
  with a total `brandOf`). The remedy table runs every requirement inside one guard
  (`remedyGuarded` / `readForm`).
- **Two error members are optional.** `SignatureHistoryUnavailable.subjectId` and
  `DecisionHistoryUnavailable.event` are absent exactly when the request's value is unreadable
  or not admitted by its schema. The cause is then the key's refusal sentence, which never
  holds the value itself. Both forms round-trip through `SinkCodec` and the `@qadi/http` bodies.
  The changes are breaking for a host that read the members unconditionally (two minor
  changesets and a 0.13 upgrade section).
- **Three exports removed.** `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` had no user
  left. The two judgements were added, so `check-api-surface` reads 940, and the packed install
  still has the base's 526 runtime exports.

No network, auth, file, dependency or manifest surface changes.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| host fixture data → core fixture layers | rows a host or test passes to `signatureHistoryFromSignatures` / `decisionHistoryFromEvents` and the two judgements | untyped row lists and rows; any JavaScript value |
| simulator form → `remedyEdits` | the subject, resource and fixture rows a reviewer typed or a host seeded | untyped form values |
| library → sink record / http body | the two history errors leaving the process | `subjectId` / `event` present only when the schema admits them; cause sentence names the field and the kind, never the value |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-76-01 | Tampering | `76-mutation-base.json` | medium | mitigate | Every base group is at `bf339146`. The scorer refuses a record from a dirty tree, and its self-test passes (42). The record `94ad4da6` is the first commit after the base, and nothing outside `.planning` changed between `bbaecd1d` and the base. | closed |
| T-76-02 | Repudiation | the owner decision | low | mitigate | ADR-QD-189's commit `0fc9f17f` precedes the first `packages/` commit `22d5b10c`. Decision 1 states the decision, its reasons and alternatives. Since Rev 1.9 it also says it was decided autonomously under the owner's standing instruction (closed in this audit, see the trail). | closed |
| T-76-03 | Spoofing | a remedy row that does not remedy | medium | mitigate | Both agreement tests re-run the offered row through core and require Allow ("Deny, and the remedy left Deny" fails). | closed |
| T-76-04 | Denial of service | a refused signature request or fixture row | medium | mitigate | `SignatureHistory.test.ts` "fails as SignatureHistoryUnavailable with no subject id and the refusal as its cause, never dying". It was red on the base ("Schema validation failed") and is green now (`76-RED-EVIDENCE.md`). | closed |
| T-76-05 | Repudiation | the agreement and refusal tests' history | low | mitigate | `76-agreement-check.mjs` exits 0: 3 frozen and 3 append-only files hold the statements of `22d5b10c`, with a moved-helper rule added in review. Self-test 28. | closed |
| T-76-06 | Elevation of privilege | `signatureAnswerFromSignatures` on a refused row or request | high | mitigate | Every refusal maps to `SignatureHistoryUnavailable` (`SignatureHistory.ts` `Result.mapError`), never `matched: false`. Pinned by "a refused fixture row fails as the read does, with the refusal and never matched: false". | closed |
| T-76-07 | Tampering | the judgement and the read drifting apart | medium | mitigate | One module-private `signatureLookup` for the layer and the judgement, and one `signatureAnswerOf` for `askSignature` and the judgement. The 1168-case product asserts agreement. The "lookup-unshared" gut turned 3 core and 6 devtools rows red. | closed |
| T-76-08 | Information disclosure | the refusal's cause text | low | accept | See AR-76-01 | closed |
| T-76-09 | Tampering | the acted judgement and the read drifting apart | medium | mitigate | One module-private `actedLookup` for the layer and the judgement. The 136-case product agrees with `askActed`. The "acted-lookup-unshared" gut turned 3 core and 6 devtools rows red. | closed |
| T-76-10 | Elevation of privilege | an `Any`-scoped leaf read as resource-scoped, or the reverse | medium | mitigate | The judgement asks `decisionHistoryPort.asks.HasActed(leaf, site)`, the read's own request. The devtools 144-case product covers both scopes at four sites. The base's 14 `Any`-scope divergences are gone. | closed |
| T-76-11 | Elevation of privilege | a refused row or request answered `"NotActed"` | high | mitigate | Rows and requests are keyed through `decisionHistoryPort.key`, and a refusal maps to `decisionHistoryPort.failure` in the layer and the judgement. It was recorded "answered (NotActed)" on the base and fails typed now. | closed |
| T-76-12 | Spoofing | a signature remedy row that would not remedy | medium | mitigate | The Signature arm offers an edit only when core's answer is `matched: false`, and maps every failure through `skipReason`. | closed |
| T-76-13 | Elevation of privilege | an acted remedy offered where the leaf already holds, or skipped as unremediable | medium | mitigate | The Acted arm reads `actedAnswerFromEvents` and offers nothing on `"Acted"`. The 144-case product pins it. | closed |
| T-76-14 | Repudiation | two sentences for one refusal drifting | low | mitigate | `NO_CUSTOM_PREDICATE_FIELD` is exported once by `SimulationFields.ts` and read by the field table and `Remedies.ts`. The literal is pinned once in `SimulationFields.test.ts`. `CUSTOM_HAS_NO_FIELD` is gone. | closed |
| T-76-15 | Repudiation | the gut evidence | medium | mitigate | 118 of 120 gut titles resolve verbatim. The other 2 were renamed by review (IN-03, IN-06), and their replacements exist. No gut text is in any commit, and the post-review close covers the renamed rows. | closed |
| T-76-16 | Tampering | `76-mutation-close.json` and `EXAMINED` | medium | mitigate | Four groups (core, devtools, http, close-only keys) were recorded on one head `e2260f94`, and nothing under `packages/` has changed since. `compare` exits 0. Every `EXAMINED` entry is a by-hand Killed static mutant listed by line in the evidence. | closed |
| T-76-17 | Repudiation | a Pinned-by title that names no test | medium | mitigate | All 101 quoted titles in the phase's BEH/INV Pinned-by lines exist verbatim under `packages/*/test`. | closed |
| T-76-18 | Tampering | the CCR row's file list and revisions | low | mitigate | CCR-QD-468's 46 paths equal `git diff --name-only bf339146 HEAD -- packages spec scripts .changeset apps`, and every cited revision equals its header (re-checked after the Rev 1.9 edit). | closed |
| T-76-19 | Repudiation | a spec claim that the refusal is total with no test holding it | medium | mitigate | BEH-QD-410's note, BEH-QD-716 and BEH-QD-093 cite exact titles, and every one resolves. No "throws"/"dies" pin wording remains in `packages` or `spec`. | closed |
| T-76-20 | Repudiation | requirements marked complete | medium | mitigate | `acc213f7` changes only the ten SIGM lines of REQUIREMENTS.md, after `check:pr` exited 0 on its source tree (`446f0b27`). WX-01..07 stay Pending. | closed |
| T-76-21 | Elevation of privilege | release and publish | high | mitigate | Three changesets, unconsumed. No manifest, lockfile or CHANGELOG diff. The branch is in no remote and HEAD has no tag. | closed |
| T-76-22 | Tampering | the phase's changed files and existing tests | medium | mitigate | Every removed or changed line in an existing test file is accounted for: imports, one comment, the stronger LeafNeeds exact-set row (WR-04), and the declared custom-sentence rows. The added-lines scan is recorded in the evidence. | closed |
| T-76-23 | Elevation of privilege | a refused history request or fixture row answered `NotActed` | high | mitigate | Same code as T-76-11. `DecisionHistory.test.ts` asserts `DecisionHistoryUnavailable`, and the upgrade guide states it. | closed |
| T-76-24 | Denial of service | a refused request killing the read | high | mitigate | `signatureHistoryPort.failure` sets `subjectId` and `resourceId` only when `Schema.is` admits them, and reads no property of an unadmitted value. Recorded dying on the base, typed now. | closed |
| T-76-25 | Denial of service | a refused value throwing out of the history fixture or its error | high | mitigate | `decisionHistoryPort.failure` sets `event` only when its schema admits it. The key goes through `readGuarded`, and rows are keyed as `Result`s when the layer is built. Pinned by the revoked-proxy, symbol-event and hostile list, row and class-name rows. | closed |
| T-76-26 | Denial of service | a refused form row or subject throwing out of `remedyEdits` and taking the simulator pane | high | mitigate | `remedyEdits` calls only `remedyGuarded`, which runs every arm inside `readForm` and skips with `thrownMessage`'s total sentence. `RemedyTotality.test.ts` pins null rows, throwing getters and Proxies, a revoked list, `length`, every form field an arm reads, and a mixed policy. | closed |
| T-76-27 | Information disclosure | a host decoding a sink record or response body that assumes the two members are present | low | mitigate | Both breaking changesets and the 0.13 section state when the members are absent. `SinkCodec.test.ts` and `QadiHttpError.test.ts` round-trip both forms and check that the key is absent, not `undefined`. | closed |
| T-76-28 | Tampering | a reader of `SignatureHistoryUnavailable.subjectId` that assumes it present | medium | mitigate | The reader search found 18 files. Every unedited file reads `.subjectId` off a pair, entry, context or wire, not off an error. The one reader of the error, `QadiHttpError.ts`, tests presence and is pinned. | closed |
| T-76-29 | Tampering | a reader of `DecisionHistoryUnavailable.event` that assumes it present | medium | mitigate | No unedited file reads `.event` off an error. `QadiHttpError.ts` tests presence and is pinned. | closed |
| T-76-30 | Repudiation | a host importing `ActedEvent`, `ActedAnywhere` or `ActedAnywhereInput` after their removal | low | mitigate | No word-boundary match under `packages`, `examples` or `features`. The overview keeps `ActedEventInput` alone, and the core changeset and upgrade guide name all three removals. The count is 941 − 3 + 2 = 940. | closed |
| T-76-SC | Tampering | dependency installs (every plan) | high | mitigate | No `package.json`, lockfile, workspace or `.npmrc` change in the phase diff. `check-package-install.mjs` only adds probes against the packed workspace tarballs. | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-76-01 | T-76-08 | A refusal's cause is `describeKeyRefusal`'s sentence. It names the field, the kind of value and a constructor name only if that name is a string, never the value. An `Unreadable` sentence also carries `thrownMessage` of the text a host's own getter threw. The http bodies carry no `cause`, and `QadiHttpError.test.ts` pins their key set. A host that puts a secret in a thrown message from its own fixture data discloses it only to its own sink. | plan-time disposition (76-03), decided autonomously | 2026-11-23 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **A policy value is not form data.** `requirementLabel` (`Remedies.ts`) writes the policy
  leaf's `event` into the skip sentence, outside `readForm`. A policy built untyped with a
  symbol event would throw there. A policy reaches the simulator through the schema-first
  Policy codec (`untrustedDecoder`, AGENTS.md §7) or as a typed value, so no decoded policy can
  hold a symbol. The totality rule (BEH-QD-719) is about form values. Left as is; the auditor
  did not check whether a test covers it.
- **Kept outside the phase:** the sibling ports (attribute, relationship, custom predicate) may
  have the same latent throw for values only an untyped caller can pass. The rule for them
  would be decided where their fixtures live.
- **Non-durable evidence:** the Stryker, coverage and `check:pr` logs live in session scratch
  directories. The durable record is:
  - `76-RED-EVIDENCE.md`;
  - the `76-REVIEW-FIX.md` reports;
  - `76-mutation-close.json`;
  - this file;
  - the passing tests.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-23 | 31 | 31 | 0 | gsd-security-auditor at 0ee1a965 (ASVS 1, block on high; register authored at plan time, judged against the post-review code). The auditor's verdict was 30 closed and 1 open below the threshold (T-76-02: ADR-QD-189 no longer stated that its decision was made autonomously). The orchestrator closed it in ADR-QD-189 Rev 1.9 and CCR-QD-468's row (README Rev 1.348). Checks: `compare` and `--self-test` (42), the agreement check and its self-test (28), the reader search, every Pinned-by title (101), the CCR file list and revisions, and a manifest, lockfile, remote and tag scan. `check:pr` exited 0 on 446f0b27 at the close and on 15acdb65 after code review, 17/18 steps, mutation skipped by design. |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-23
