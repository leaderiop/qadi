---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
plan: 04
subsystem: react-hydration
tags: [refactor, payload-producers, type-pins, after-change-experiment]
phase_base: 3630e29865bbaed49126b214f0f6cc7006b6f4bc
requires: [70-01, 70-02, 70-03]
provides:
  - "HydrationEngine.ts: PAYLOAD_PRODUCERS (exported for its test only) and the module-private PAYLOAD_REASONS, the compile-checked inverse"
  - "HydrationPayload.test.ts: the producer conformance describe"
  - "70-RED-EVIDENCE.md: the experiment re-run after the change for all three kinds"
affects: [70-05, 70-07]
tech-stack:
  added: []
  patterns: ["a reason-keyed producer record under satisfies, with its inverse typed by a one-member-or-never mapped type"]
key-files:
  created: []
  modified:
    - packages/react/src/HydrationEngine.ts
    - packages/react/src/HydrationEvent.ts
    - packages/react/test/HydrationPayload.test.ts
    - .planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-RED-EVIDENCE.md
key-decisions:
  - "The five declarations landed as the plan gave them, in HydrationEngine.ts right after the envelope decoder; only ReasonRaisedBy is hand-wrapped onto more lines to stay near ninety columns."
  - "The record stays in HydrationEngine.ts beside the decoder refusal and checkVersion it maps (D-07); it is not in the barrel and spec/overview.md is untouched."
requirements-completed: []
duration: 20 min
completed: 2026-11-22
status: complete
commits: 2
plan_head_before: b23351847f1ea5187a8641b450bff34e0b2f397a
plan_head_after: 43d656fb1b7dfe94d183aa17a8fbf5bd817693ef
actuals:
  tokens: 3600
  tasks: 2
  commits: 2
---

# Phase 70 Plan 04: Each payload refusal reason's producer stated once Summary

A `payload` row core's table gains is now a compile error in `@qadi/react` naming `PAYLOAD_PRODUCERS`, like an `entry` or
`dehydration` row at the bucket records, and the decoder-refusal `Match` dispatcher is gone; a refused payload is still one
`PayloadRefused` event with the same reason and entries.

## The declarations as landed (`HydrationEngine.ts`)

- `type PayloadProducer = (UntrustedValueRefusal | PayloadVersionRefusal)["_tag"] | "SubjectCheck";`
- `export const PAYLOAD_PRODUCERS = { PayloadSubjectMismatch: "SubjectCheck", UnsupportedPayloadVersion: "UnsupportedPayloadVersion", MalformedPayload: "Malformed", PayloadTooDeep: "TooDeep" } satisfies { readonly [R in PayloadRefusalReason]: PayloadProducer };`
- `type OnlyMember<U, All = U> = U extends unknown ? ([All] extends [U] ? U : never) : never;`
- `type ReasonRaisedBy<P extends PayloadProducer> = OnlyMember<{ readonly [R in PayloadRefusalReason]: (typeof PAYLOAD_PRODUCERS)[R] extends P ? R : never }[PayloadRefusalReason]>;`
- `const PAYLOAD_REASONS: { readonly [P in PayloadProducer]: ReasonRaisedBy<P> } = { TooDeep: "PayloadTooDeep", Malformed: "MalformedPayload", UnsupportedPayloadVersion: "UnsupportedPayloadVersion", SubjectCheck: "PayloadSubjectMismatch" };`

`planHydration` refuses the decoder's failure under `PAYLOAD_REASONS[envelope.failure._tag]` and both subject checks under
`PAYLOAD_REASONS.SubjectCheck`; `payloadRefusalReason` and the literal subject-mismatch calls are gone. The two reason-union
doc comments in `HydrationEvent.ts` now describe the producer record and `HydrationBuckets.ts`.

## After-change experiment (first error line of each compile)

- Entry row alone: exit 2, `HydrationBuckets.ts(33,75): error TS2741: Property 'EntryProbe' is missing in type ... 'DropBuckets<EntryDropReason, unknown>'`.
  With the key `EntryProbe: []` and the disagreement push routed through `drops.EntryProbe`: exit 0, and the probe
  "a probe bucket's entries are reported and counted" passed alone (one reporter call, `EntryProbe`, `wholePayload: false`,
  seeded delta 1, delta 1 under `EntryProbe` and 0 elsewhere). No emission edit was needed.
- Payload row alone: exit 2, `HydrationEngine.ts(221,3): error TS2741: Property 'PayloadProbe' is missing in type ...`.
- Dehydration row alone: exit 2, `HydrationBuckets.ts(41,93): error TS2741: Property 'DehydrationProbe' is missing in type ... 'DropBuckets<DehydrationDropReason, DecisionEntry>'`.
- Restored tree: `tsc -b` exit 0, `git status --porcelain -- packages` empty, `pnpm test:tstyche HydrationBuckets` exit 0.

## Results

- `pnpm typecheck`: exit 0 (after the fix below). `pnpm test:tstyche` whole, both passes: 67 files, 354 tests passed
  (2 skipped), 771 assertions passed; `HydrationBuckets.tst.ts` green.
- Conformance describe: both titled tests passed once each. Characterisation: `char-check: 32 passed`, file never edited.
  Whole react project, `check-house-style.mjs` (565 files clean), oxlint: clean.
  `api-surface: 941 export(s) documented across 9 package(s)` unchanged; barrel and `spec/overview.md` equal `phase_base`.
- Task 1 verify exit 0 (`every payload reason has its producer and every check is green`); Task 2 verify exit 0
  (`each throwaway row is refused at the record that lacks it`).

## Task Commits

1. Task 1 (tracer): `40ce1237` refactor(70-04): state each payload refusal reason's producer in one record
2. Task 2: `43d656fb` docs(70-04): record the experiment failing to compile after the change

Tracer gate: Task 1's verify passed end to end before Task 2 expanded.

## Deviations from Plan

**Observed, not predicted (recorded in the evidence).** The payload-row experiment gave a second error after the planned
TS2741: `HydrationEngine.ts(232,43): error TS2536: Type 'R' cannot be used to index type ...`, the inverse record's helper
type failing against the record that lacks the row. It is the same fault seen from `ReasonRaisedBy` and goes away when the
row has its producer; the refusal still names the row and the file.

**Verification-only.** The plan's `bash -c '...'` verifies for both tasks misfire on the apostrophe in "each row's producer"
and "a probe bucket's" (the known quoting misfire: `unexpected EOF`). I ran the identical script body from a file with the
apostrophes written `\x27` (as the plan's own `grep` titles do); every check ran unchanged and exited 0. Nothing a gate
checks was weakened.

**Own slip, fixed before commit.** While replacing the dispatcher call I left a stray placeholder in the envelope-failure
line; `pnpm typecheck` caught it (TS2304, TS6133) and it was corrected to `refuse(PAYLOAD_REASONS[envelope.failure._tag], visible)`
before anything was committed.

## Known Stubs

None.

## Threat Flags

None. T-70-08 (wrong reason for a decoder refusal) is held by `ReasonRaisedBy`'s compile-time agreement and the conformance
test; T-70-09 (subject checks) by their unchanged position and rows P6 to P8; T-70-10 (a committed experiment) by the
restores and the evidence commit holding only the evidence.

## Left for review

`packages/react/src/HydrationBuckets.ts` still has the two long constructor lines (`entryBuckets`, `dehydrationBuckets`,
~130 columns) noted by 70-03; this plan did not touch that file.

## Self-Check: PASSED

- FOUND: packages/react/src/HydrationEngine.ts, packages/react/test/HydrationPayload.test.ts, 70-RED-EVIDENCE.md; commits 40ce1237 and 43d656fb are ancestors of HEAD.
