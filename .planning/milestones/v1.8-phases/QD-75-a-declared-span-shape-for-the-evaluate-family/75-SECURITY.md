---
phase: "75"
slug: "a-declared-span-shape-for-the-evaluate-family"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-23"
---

# Phase 75 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase declares the evaluate family's spans once, in `@qadi/core`'s package-private `EvaluationSpan.ts`.
Every span of the family takes its name, question and answer from that declaration: `qadi.evaluate`,
`qadi.toPredicate`, `qadi.guardHealthCheck`, `qadi.decideSubject`, `qadi.decideSubjects` and
`qadi.decideSubjectsStream`. The denial log line is a log event whose struct no span-writing function accepts.

What changed for a tracer:
- **The failed span says what was asked.** `decideQuestion` annotates its question (subject id, evaluation id,
  policy tag, action) before the lookup, so a span that ends in a typed failure carries it.
- **One key for the outcome.** The outcome is written once, under `qadi.outcome`, on every decided or
  typed-failure path. `qadi.decision` is gone (breaking; one `@qadi/core` minor changeset and a 0.13 upgrade
  section). An interrupted or defected evaluation carries its question and no outcome; its span status says why.
- **Compile-time checks.** A family question is held to `PoseOf`, so a writer that leaves out a member does not
  compile. Every span-writing function in `PortSpanEncode.ts` refuses a `LogEventStruct`: `encodeSpan`,
  `annotateSpan`, `annotateAsked` and `askedAttributes`. A raw `Effect.annotateCurrentSpan`, a raw `withSpan`
  attribute map, or an upcast to `SpanStruct` is not refused, and review keeps those.

House-style `[span-key-source]`, `[span-key-literal]` and `[span-key-literal-table]` keep every key declared
once and read through its declaration. `packages/core/src/index.ts` is unchanged, and `check-api-surface` still
reads 941 exports. No network, auth, file, dependency or manifest surface changes.

The threats are:
- a span that discloses a value, a resource or a reason sentence;
- a failed span that says less than was asked;
- a key rule whose key set or budget can drift;
- records, pins, costs and mutation evidence that claim more than ran;
- a release or install the owner did not ask for.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| library → tracer | the span attributes a host's tracer exports | span keys and `SpanValue` leaves: ids, policy tag, action, outcome, error tag, obligation ids |
| library → log | the denial log line an operator turns on | policy tag, subject id and the denial's reason sentence |
| span reader → library | `spanStruct.decode` reading attributes back | attribute values decoded per field; a wrong value reads as absent |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-75-01 | Tampering | mutation base measured on an already-edited tree | medium | mitigate | The scorer refuses `record` on a dirty tree, and its self-test pins that (36 passed). The base head is `c054c2b1` (`phase_base`), recorded by `8e603823`, the first commit after it. | closed |
| T-75-02 | Repudiation | the outcome-key checkpoint | low | mitigate | ADR-QD-188 decisions 1 and 2 state the key, the no-dual-write rule and why, decided autonomously. Its commit `ab9a822e` precedes the first `packages/` commit. | closed |
| T-75-03 | Information disclosure | span attributes | medium | mitigate | 24 whole-record `deepStrictEqual` rows in the contract. Every field is a `SpanValue` (INV-QD-044). "a resolved attribute's value never reaches any span" is unchanged. | closed |
| T-75-04 | Repudiation | the contract's history | low | mitigate | `75-contract-check.mjs` holds every row and statement to `ecb0256f` (exit 0; self-test 28 passed). The only later commit, `001dbaba`, moved two helpers to `helpers.ts` with identical bodies. `git diff ecb0256f HEAD` shows no row's title, input, expected value or order changed. | closed |
| T-75-05 | Information disclosure | `evaluateSpan` fields | medium | mitigate | `askedOf` / `batchAskedOf` project only the subject id, policy tag and action. No resource or attribute reaches the span. | closed |
| T-75-06 | Repudiation | failed evaluations | medium | mitigate | `annotateAsked(evaluateSpan.question, …)` runs before the lookup. Two contract rows pin a failed evaluation's whole record. The `question-after-lookup` gut turned C3 and C4 red. | closed |
| T-75-07 | Denial of service | the evaluate hot path | low | accept | See AR-75-01 | closed |
| T-75-08 | Information disclosure | `toPredicateSpan`, `guardHealthCheckSpan` fields | medium | mitigate | Errors are written as their `_tag` only (`answerFailure`, the probe, `decideQuestion`). The contract rows compare whole records. | closed |
| T-75-09 | Repudiation | failed translations | medium | mitigate | `answerFailure` is `toPredicate`'s `Effect.fn` pipeable, applied inside the span. Rows C9–C12 pin each failure kind, and the `translation-failure` gut turned exactly those four red. | closed |
| T-75-10 | Tampering | decoding closed fields | low | mitigate | "each of the three outcomes decodes and any other value reads as absent" and "every policy tag decodes and an unknown tag reads as absent". | closed |
| T-75-11 | Information disclosure | a non-scalar field | medium | mitigate | Type pins: obligations are one joined string, not a list; every family field holds only span values. | closed |
| T-75-12 | Tampering | the key set the rule reads | medium | mitigate | The rule reads the 11 keys from the declaration plus `sharedQuestionKeys.subjectId`, with `SPAN_KEY_MIN = 11`. An unreadable or missing key fails. Plant M11 (emptied key set) exited 1. | closed |
| T-75-13 | Repudiation | the budget and its table | low | mitigate | Checked both ways, with the AGENTS.md table matching the budget row for row (9 files, re-counted 96/12/3/5/9/3/1/2/2). `NOT_CALLABLE_PIN_BUDGET` for `EvaluationSpan.tst.ts` is 6/0, matching its pins. Plants M4, M5, M13 and M14 exited 1. | closed |
| T-75-14 | Tampering | close measured on a tree that later changed / static mutants waved through | medium | mitigate | Both groups were recorded on one head, `6e1ffc3e`, and `packages/` has not changed since. `compare` exits 0. Every `EXAMINED` admission has a by-hand Killed row (two import-crash RuntimeErrors named as such). `decideSubjectsStream`'s new static mutants were killed by hand. See "The mutation close". | closed |
| T-75-15 | Repudiation | cost figures | low | mitigate | `ab.sh` alternates arm order, refuses a busy host and restores `packages/`. ADR-QD-188 records each figure with its spread, host load and commit. | closed |
| T-75-16 | Repudiation | Pinned-by / Enforcement citations | medium | mitigate | 143 cited titles resolve verbatim in the files they name. A planted bogus title was reported missing. | closed |
| T-75-17 | Information disclosure | the upgrade note | low | mitigate | The changeset and the 0.13 section name keys and values only, with no payload, resource or reason text. | closed |
| T-75-18 | Repudiation | CCR row omitting a file or citing a wrong revision | medium | mitigate | CCR-QD-467's 34 paths equal the phase diff outside `.planning`. Its 8 cited revisions equal the headers: ADR-188 1.10, 051 1.6, 109 1.8, 30-port-calls 1.21, 05-evaluator 1.23, invariants 1.201, traceability 1.276, README 1.342. | closed |
| T-75-19 | Repudiation | requirements marked complete early or too widely | medium | mitigate | `b957a155`, the only phase commit touching REQUIREMENTS.md, changes only ESPN-01..05. It came after `check:pr` exited 0 on its parent's tree (`086a19ba`). WX-01..07 stay Pending. `check:pr` passed again on `119acab6` after code review. | closed |
| T-75-20 | Elevation of privilege | release and publish | high | mitigate | The changeset is present and unconsumed. No manifest, changelog or lockfile changed. The branch exists only locally, and the plans mention version, publish and push only as prohibitions. | closed |
| T-75-SC | Tampering | dependency installs (every plan) | high | mitigate | No dependency manifest or lockfile in the phase diff. The phase scripts import only `node:*` and the repo's own `typescript`. | closed |

---

## The mutation close (T-75-14)

**What was measured.** The `core` group (the four writers) is compared with its base. The close-only `span`
group covers `EvaluationSpan.ts` and only the lines the phase added to `PortSpanEncode.ts` (ranges `90-156`
and `173-200`, re-derived from the diff). That file had no base, and its older code is outside the phase.

**What the close found.** Lifecycle 38/38, Predicate 282/282, SubjectSet 32/32 and GuardHealthCheck 9/9, with
the base's two survivors gone. `EvaluationSpan.ts` is 3/3 with its 38 static mutants killed by hand; two crash
the module at import, and are recorded as RuntimeError. `PortSpanEncode.ts` has 6 static mutants, all killed by
hand.

**Two kinds of survivor were resolved.** Two by-hand survivors found after review were real gaps: the
`qadi.decideSubject` name and the runtime log-event marker. Two test rows now kill them. Four survivors in the
pre-existing `spanStruct` decode (line 59) are outside the phase and equivalent: a type-narrowing guard
unreachable at runtime, and a fast path. All 53 declared span fields refuse `undefined`.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-75-01 | T-75-07 | Annotating the question before the work is what makes a failed span say what was asked. It costs +9.17% geometric mean on the 17 evaluate workloads, about 0.3–0.9 µs per call, measured at `24ca9e2a`. The per-call path is unchanged since. The cost is recorded in ADR-QD-188 as a result, not a gate (D-16). Review found no avoidable per-call work: collapsing the two question annotators into one function would need an `as`. | plan-time disposition (75-07), decided autonomously | 2026-11-23 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **Plan-time checks superseded by code review:**
  - "the contract has exactly one commit" was replaced by `75-contract-check.mjs`;
  - the 75-07 close and cost figures are superseded by the two dated close sections in `75-RED-EVIDENCE.md`.
    The 75-07 and 75-08 summaries carry dated superseded notes.

  Each is judged against the substance, not the plan-time literal.
- **Kept by review, not the compiler:** a raw `Effect.annotateCurrentSpan`, a raw `withSpan` attribute map, or a
  log event upcast to `SpanStruct`. In library source today, `Effect.annotateCurrentSpan` is called only inside
  `annotateSpan`, `Stream.withSpan` only through `askedAttributes`, and `qadi.reason` appears only in the
  declaration.
- **Non-durable evidence:** the Stryker, benchmark and `check:pr` logs live in session scratch directories. The
  durable record is:
  - `75-RED-EVIDENCE.md`;
  - the `75-REVIEW-FIX.md` reports;
  - `75-mutation-close.json`;
  - this file;
  - the passing tests.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-23 | 21 | 21 | 0 | gsd-security-auditor at 2c80d460 (ASVS 1, block on high; register authored at plan time, judged against the post-review code). Checks: `compare` and `--self-test`, the contract check and its self-test, `git log -p` on the contract, revisions and file list, every Pinned-by title (143), the span-key budget re-count, the source scan for raw span writes. `check:pr` exit 0 on 086a19ba at the close and again on 119acab6 after code review, 17/18 steps, mutation skipped by design. |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-23
