---
phase: 86
review: 86-REVIEW.md
findings:
  - id: IN-01
    severity: info
    disposition: fixed
    title: "The RegistryOwner interface has no leading doc comment"
  - id: IN-02
    severity: info
    disposition: deferred
    title: "RegistryLease.ts's header still names QadiProvider.tsx as its one caller"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "A QadiProvider.tsx comment still says the registry above is built once"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "recordingDefer's fire ran a run an earlier run in the same batch had cancelled"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "The changeset's refresh edge read wider than the window it holds in"
open: 0
---

# Phase 86 — Review disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | fixed | `RegistryOwner.ts`: the interface now opens with a one-line doc comment (what a provider keeps for its life). Comment only; no mutant changes. |
| IN-02 | info | deferred | Decided autonomously 2026-11-25. `RegistryLease.ts` is held byte for byte by `86-pinned-check.mjs` (D-12), and ADR-QD-199's Consequences already record that its header still names the provider. The reviewer is right that Stryker mutates code, not comments, so the hold is the phase's own byte-for-byte promise rather than the mutation record. Revisit in a phase that may edit the lease (Phase 91 edits `QadiProvider.tsx`'s imports and is the natural place). |
| IN-03 | info | fixed | `QadiProvider.tsx`: "the registry above is built once" now reads "the owner above, and the registry it holds, are built once". `provider-forwards-only` still passes. |
| IN-04 | info | fixed | `test/support/recordingDefer.ts`: `fire` now runs only runs still pending when their turn comes, so a cancel made by an earlier run in the same batch is honoured, matching its doc comment; runs deferred during a fire stay for the next. RO1–RO16 and C1–C9 still pass (react project 44 files, 703 tests). |
| IN-05 | info | fixed | The changeset now scopes the edge to "after the provider's first commit and before anything has read it or the registry has recycled (a window a rendered tree rarely leaves open)", and the owner's header says "before any recycle". ADR-QD-199 already scopes it to a seeded node nothing has read before the first commit, so the spec needs no revision. |
