---
phase: QD-44-the-hydration-seed-s-fields-stated-once
plan: 04
phase_base: e7e896589864fc005144d433ae84054875f2a0f9
subsystem: spec-and-release-notes
tags: [adr, changeset, breaking, upgrading, hydration]
requires: ["44-03"]
provides:
  - "ADR-QD-157 (Rev 1.0), its index.yaml entry, traceability row and the CCR-QD-435 row (started)"
  - "ADR-QD-078 Rev 1.5 with the dated ADR-QD-157 amendment; AGENTS.md section 7 third schema-first statement"
  - ".changeset/react-seed-fields-stated-once.md (@qadi/react minor, Breaking) and the 0.13 upgrading entry"
affects: [44-05, 44-06]
tech-stack:
  added: []
  patterns: ["ADR + dated amendment + CCR row, as Phase 43's ADR-QD-156"]
key-files:
  created:
    - spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md
    - .changeset/react-seed-fields-stated-once.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md
    - spec/traceability.md
    - spec/README.md
    - AGENTS.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
decisions:
  - "ADR-QD-157: a seed's fields are the wire's, stated once (ADR-QD-135 pattern); ADR-QD-078 kept and amended"
  - "The break is worded as D-03 really is: optional key, absent when the server sent none; construction and reading unchanged"
metrics:
  duration: "about 15 minutes"
  completed: 2026-11-15
status: complete
commits: 3
plan_head_before: 65dbd7a5
plan_head_after: a632cf693eb6b77d1a778b63b54f5f2053a7a643
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
---

# Phase 44 Plan 04: The decision and the break, recorded Summary

ADR-QD-157 with its registry entry, traceability row and the CCR-QD-435 row; ADR-QD-078's dated amendment (Rev 1.5); AGENTS.md section 7's third schema-first statement; a `@qadi/react` minor changeset marked **Breaking**; and a compiled 0.13 upgrading entry.

## Files and revisions

| File | Revision |
|---|---|
| `spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md` | new, 1.0 (Status `Accepted — amends ADR-QD-078`, Change History cites ARCH-91, CCR-QD-435) |
| `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md` | 1.4 to 1.5 (`## Amendment (2026-11-15, ADR-QD-157, CCR-QD-435)` after the 2026-11-10 revision note; Status and `_Related:` updated) |
| `spec/traceability.md` | 1.180 to 1.182 (ADR-QD-157 row; ADR-QD-078 row names the amendment) |
| `spec/README.md` | 1.184 to 1.185 (CCR-QD-435 row, started; 44-05 completes the file list and the Used/Unused sentence) |
| `spec/decisions/index.yaml` | ADR-QD-157 entry after ADR-QD-156 |

Only the reserved ids ARCH-91, ADR-QD-157 and CCR-QD-435 were written; `node scripts/next-id.mjs` was not run and no placeholder id exists.

## ADR-QD-157 alternatives

Records `Schema.TaggedClass` (ADR-QD-135 measured and rejected it), a payload entry built from the struct's keys (moves the bytes), an allow-list of shipped fields (drops a new wire field, the defect), `visibleFields` kept required as `undefined`, editing core's wire, and the **`Match`-per-function dispatch**, rejected because it writes the Allow/Deny branch three times again; the `VERDICTS` table is indexed once, so the dispatch is the index. That is where D-05's wording departure (a table index rather than a `Match`) is recorded. The Context quotes 44-01's RED evidence (`tsc -b` exit 0, `expected undefined to deeply equal 'x'`).

## AGENTS.md paragraph (deliberate addition beyond D-11's literal scope)

D-11 asked for AGENTS.md only "wherever a section names a moved constant", and none does. Section 7 enumerates the schema-first statements (Policy ADT, then the sink record envelope as "the second"), so it would have been incomplete. One paragraph was added there, after the sink record paragraph and before "v4 API notes:", and nothing else in AGENTS.md changed (checked against `phase_base`). It can be dropped at review without touching anything else:

> **The hydration seed's fields are the third** (ADR-QD-157), for the same reason: a seed is rebuilt in the browser from a payload a server page embedded, and fields written once in the class, once in the payload entry and again in `rebuild` dropped a field the wire gained while everything compiled. Each verdict's fields are one `Schema.Struct` in `SeededDecision.ts`, `@qadi/core`'s `DecisionWireAllow`/`DecisionWireDeny` minus what the payload withholds; `SeededAllow`/`SeededDeny` are `Data.TaggedClass`es typed by that struct's `Type` plus the subject, and the payload entry is the same fields under the wire's tag.

## The changeset (text as written)

`.changeset/react-seed-fields-stated-once.md`, front matter `"@qadi/react": minor` only:

> **Breaking.** `SeededAllow`'s `visibleFields` is now an optional key, as it is on the decision's wire form. A seed rebuilt from a payload that sent no `visibleFields` has no `visibleFields` key, where it held `visibleFields: undefined`. Reading `seed.visibleFields` is unchanged (`undefined` still means every field), and building a `SeededAllow` with or without the key compiles. What breaks is assigning a `SeededAllow` to a type that requires `visibleFields`, and code that checks for the key: `"visibleFields" in seed`, `Object.keys`, or `Equal.equals` against a seed built with an explicit `undefined`.
>
> A seed's fields are now stated once, from `@qadi/core`'s decision wire form, so a field the wire gains reaches the seed with no edit in `@qadi/react`. The payload's version and bytes are unchanged.
>
> See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.

It is added, never consumed; no existing changeset, `CHANGELOG.md` or `package.json` changed. The roadmap's "patch" wording lost to D-12 (minor, Breaking). The upgrading entry (`## 0.13: a seeded allow has no `visibleFields` key when the server sent none`, after the last 0.13 section) states the same consequence in the same terms, with a `ts` Before fence, a compiled `typescript` After fence (`pnpm spec:website-examples`: 62 blocks compile) and the ADR-QD-157 link. The After fence's return type is `{ readonly visibleFields: VisibleFields }` (not `| undefined`, since `VisibleFields` already includes `undefined`).

## Verification

`pnpm spec:verify:strict` (21 pass, 0 fail), `node scripts/spec-revise.mjs --check`, `pnpm lint` (house-style clean; pre-existing oxlint warnings only), `pnpm spec:gates` and `pnpm spec:website-examples` pass. The plan's structural checks for Tasks 2 and 3 passed. `git diff --quiet 65dbd7a5 -- packages` exits 0 (no source edit in this plan).

## Commits

- `534d8f11` docs(44-04): ADR-QD-157, a seed's fields are the wire's, stated once
- `5f11cfe2` docs(44-04): ADR-QD-078 amended, and AGENTS.md section 7 names the seed's fields
- `a632cf69` docs(44-04): @qadi/react minor changeset and 0.13 upgrade entry for the optional visibleFields key

The plan's metadata commit follows, so `rev-list plan_head_before..HEAD` reads 4 after it; `commits:` counts the three task commits.

## Deviations from Plan

**1. [Rule 3 - Blocking] ADR-QD-157 link targets.** The plan named ADR-QD-135 and ADR-QD-152 by number only; the real files are `135-sink-record-fields-stated-once.md` and `152-each-hydration-drop-reason-is-stated-once-with-its-kind.md`, so the relative links use those names (a wrong name would have failed link integrity). No other deviation.

## Known Stubs

None.

## Threat Flags

None. Documentation only; no endpoint, decoder or trust boundary.

## Self-Check: PASSED

- ADR-QD-157 file, `.changeset/react-seed-fields-stated-once.md` and the upgrading heading exist.
- Commits `534d8f11`, `5f11cfe2`, `a632cf69` are ancestors of HEAD.
