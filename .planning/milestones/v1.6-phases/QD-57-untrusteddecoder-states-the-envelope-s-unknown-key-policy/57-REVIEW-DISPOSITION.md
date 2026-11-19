---
phase: 57
review: 57-REVIEW.md
titles: json
findings:
  - id: WR-01
    iteration: 1
    severity: warning
    disposition: fixed
    title: "`ignore` silently drops every key of an index-signature or rest schema instead of refusing at build"
  - id: WR-02
    iteration: 1
    severity: warning
    disposition: fixed
    title: "`PROJECTION[options.unknownKeys]` is an inherited-property lookup; a prototype name builds and fails at decode"
  - id: WR-03
    iteration: 1
    severity: warning
    disposition: fixed
    title: "`decodeSinkRecord`'s doc states the old guard-then-project order"
  - id: IN-01
    iteration: 1
    severity: info
    disposition: skipped
    title: "`project`'s doc says it reads no value; `Object.entries` invokes accessor getters"
  - id: WR-01
    iteration: 2
    severity: warning
    disposition: fixed
    title: "Spec drift: U1..U19 ranges and BEH-QD-621's non-derivable definition lag the review fixes"
---

# Phase 57: Code Review Disposition

**Two review iterations** ran at standard depth over 20 files.

**Iteration 1** found 0 critical, 3 warning and 1 info.
- The reviewer found no path where an undeclared key reaches `prepare` or the strict decode.
- It found no behaviour change beyond D-01, D-17, D-18 and D-20.
- All three warnings were in the new general-purpose `ignore` machinery, and none fires for a current seam.
- The fixer landed them RED-first: 4daeb9d2 and f3469818 for WR-01, cfa1f79e and dd24732a for WR-02, 0b628571 for WR-03.
- It re-ran the core mutation gate run and committed the evidence (43a65fd2). `compare` prints `WX-05 holds (D-12)`, which the orchestrator re-ran. `EnvelopeKeys.ts` scores 58/58, `UntrustedDecode.ts` 41/43 with its two pre-existing survivors, and `SinkCodec.ts` 122/126 with an unchanged survivor set.

**Iteration 2** confirmed all three fixes and found 0 critical, 1 warning and 1 info.
- The warning was spec drift.
- The fixer brought BEH-QD-621 and the U1..U21 ranges in line with the code in 51759bf7 (`spec-revise`, strict traceability 21/21, `check:pr` exit 0).
- The orchestrator checked the BEH-QD-621 wording ("or whose object has an index signature or a rest element") against `EnvelopeKeys.ts:31,76-77`, and they agree.
- The change was spec-only and orchestrator-verified, so no third review iteration ran.

**IN-01 is left as is.** It is harmless for parsed JSON, the only input any seam receives. ADR-QD-170 D-19 carries the same "reads no value" wording, so the fix would also amend the ADR. It is carried forward to the next change that touches `UntrustedDecode.ts`.

**Not reviewed:** a degenerate self-referential `Suspend` union in `membersOf`. No current seam reaches it.
