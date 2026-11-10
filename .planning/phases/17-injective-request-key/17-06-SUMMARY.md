---
phase: 17-injective-request-key
plan: 06
subsystem: spec, changesets, website
tags: [spec, adr, ccr, changeset, gate, mutation]

phase_base: 1a14899

requires: ["17-05"]
provides:
  - "ADR-QD-094 Rev 1.8: ARCH-65 amendment (the key law's equality is `Equal.equals`; `key` returns `Result<string, KeyRefusal>`; subclasses key as their base; `Equal`-implementing values refused as `instance`; `Equal.byReference` keys by structure, a stated limit)"
  - "ADR-QD-129 `spec/decisions/129-a-replay-miss-is-an-outage-on-every-port.md` (slug follows the outcome-A title, as the plan allowed)"
  - "BEH-QD-409, BEH-QD-410 (06-services.md), BEH-QD-411 (29-devtools-simulator.md), INV-QD-280; BEH-QD-310, BEH-QD-221 and INV-QD-043 amended; traceability rows"
  - "CCR-QD-407 in spec/README.md; changesets amended in place; upgrading.md 0.12 entry"
affects: []

actuals:
  tasks: 3
  commits: 3

key-files:
  created:
    - spec/decisions/129-a-replay-miss-is-an-outage-on-every-port.md
    - .planning/phases/17-injective-request-key/17-mutation-after.json
  modified:
    - spec/decisions/094-a-port-is-described-once.md
    - spec/decisions/index.yaml
    - spec/behaviors/06-services.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - .changeset/port-keys-cover-the-request.md
    - .changeset/devtools-unseen-signature-fails.md
    - .changeset/one-port-read.md
    - apps/website/src/content/docs/docs/reference/upgrading.md

key-decisions:
  - "Applied 17-01 T1 (D-04) from `_DECISIONS.md`, quoted in ADR-QD-129: \"Every port's unseen replay request is an outage (fail closed); `PortDescription.key` returns `Result<string, KeyRefusal>` (Breaking) — confirmed\"."
  - "Changesets amended in place (standing rule) instead of the plan's two new files: `port-keys-cover-the-request.md` (core patch -> minor, Breaking key type, new key text, three new names, replyTable/signature fixture fail closed) and `devtools-unseen-signature-fails.md` (devtools patch -> minor, called out as a security fix). `one-port-read.md`'s stale `null` key sentence corrected. No `@qadi/audit` entry: 17-04 found no audit src consumer."

requirements-completed: [KEY-01, KEY-02, KEY-03, KEY-04, KEY-05]

completed: 2026-11-10
status: complete
---

# 17-06: the phase in the spec, and a green gate

## Task 1: spec records (`1434c52`)

- ADR-QD-094 Rev 1.8: the ARCH-65 blockquote after the ARCH-45 one; the interface fence's `key` and the
  "`key` is `JSON.stringify`" sentence now say `Result<string, KeyRefusal>` / `canonicalKey`; the ARCH-47
  sentence points at the new equality.
- ADR-QD-129: context (WR-04, INV-QD-007, INV-QD-043), options A/B/C as the checkpoint stated them, the
  decision quoted verbatim, consequences (a Snapshot sweep shows a failed row for every question the live run
  did not ask; a sixth port fails closed with no edit). Status "reads ADR-QD-094, ADR-QD-109". index.yaml entry.
- BEH-QD-409 (law, domain, determinism), BEH-QD-410 (typed refusal; every consumer fails closed),
  BEH-QD-310's `replyTable` requirement (matches by key text; refused request fails with the port's typed error;
  refused entry left out). BEH-QD-411 (per-port miss table, all five fail) and BEH-QD-221's two miss
  requirements replaced ("unwired port" and "SignatureHistory is the exception" wording gone; unkeyed request
  never captured, fails on replay).
- INV-QD-280 "A request key is Equal's text"; INV-QD-043 Source, miss paragraph and Enforcement rewritten.
- Traceability: INV-QD-280, ADR-QD-129, `PortKey.test.ts` rows; §1 rows 06/29; ADR-QD-094, INV-QD-043,
  PortConformance, PortDescription, SignatureHistory, Capture and SimulationSource rows.

## Task 2: register, changesets, upgrading (`66fa901`)

CCR-QD-407 lists every file 17-01..17-06 changed (from `git diff --name-only 1a14899..HEAD`), the RED-first
commits (`be0fad3`, `5622340`, `11c117d`, `a16d1a6`), D-04 = A, and the numbers: used ADR-QD-129,
BEH-QD-409..411, INV-QD-280; unused BEH-QD-412..418, INV-QD-281..284. The upgrading note's after-example
(`Result.isSuccess` over `attributeResolverPort.key`) compiles (`spec:website-examples` 48 blocks).
`spec:api` needed no new overview row (891 exports; 17-03 added them at 1.86).

## Task 3: gate and mutation

- `pnpm check:pr`: **exit 0**, 16 of 17 steps (mutation skipped by design). Vitest 168 files / 4409 tests;
  BDD 34 files / 567 scenarios; `spec:verify:strict` 21/0/0.
- No gate script, budget, threshold or AGENTS.md edited since 1a14899 (diff empty).
- Mutation (scoped Stryker, both configs, exit 0), per file vs `17-mutation-base.json`:

| File | Base | After |
|---|---|---|
| PortKey.ts | 0.5000 | 1.0000 |
| SignatureHistory.ts | 0.8452 | 0.9551 |
| AttributeResolver.ts | 1.0000 | 1.0000 |
| CustomPredicate.ts | 0.8980 | 0.9318 |
| DecisionHistory.ts | 0.9730 | 1.0000 |
| PortDescription.ts | 1.0000 | 1.0000 |
| RelationshipResolver.ts | 0.9231 | 1.0000 |
| PortDoubles.ts | 1.0000 | 1.0000 |
| devtools Capture.ts | 1.0000 | 1.0000 |

No drop. `Ports.ts` (touched by 17-03, type-level only: `ArgsOf` infers from `=> unknown`) has no base entry
and was not measured; the change alters no runtime expression.

## Deviations

1. Changesets amended in place rather than created as `injective-request-key.md` / `replay-miss-policy.md`
   (standing rule; the plan's file-name verify does not apply). `one-port-read.md` corrected for the same reason.
2. ADR file slug `129-a-replay-miss-is-an-outage-on-every-port.md` (plan allowed renaming by outcome title).

## Commits

- `1434c52` docs(17-06): the key law's equality is Equal.equals, and a replay miss is an outage on every port
- `66fa901` docs(17-06): register CCR-QD-407, amend the key and replay-miss changesets, and add the 0.12 upgrading note
- `docs(17-06): complete plan` (this SUMMARY, mutation-after json, ROADMAP, STATE, REQUIREMENTS)
