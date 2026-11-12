---
phase: 22
review: 22-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "INV-QD-288 overclaims; \"never reaches its port without a resource id\" is a convention for two of the three ports, not a structural guarantee"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "Traceability row claims a test file pins something it does not"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "`readAttribute`/`servingFor` and `Walk.evaluateHasRelationship` read the resource id two different ways"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "Stale comment in `scripts/check-house-style.mjs` names removed reads and a deleted helper"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "`Predicate.ts` re-spells `Extract<Policy, …>` where this phase introduced `LeafOf`"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "Doc-comment shape and wrapping drift"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "`one-port-read.md` changeset appends a user-visible span removal under a \"Not marked Breaking\" paragraph"
---

# Phase 22 — review disposition

One row per finding in `22-REVIEW.md`. Every finding starts `open`; a fix or a reasoned
won't-fix changes its row. The review found no fail-open path today: WR-01 is a guarantee the
spec states more strongly than the code enforces for `DecisionHistory` and `SignatureHistory`
(the route and `asks` must keep agreeing on `leaf.scope === "Resource"`), so it is this phase's
to close by softening INV-QD-288 or adding a law over Resource-scoped acted and signature leaves.
WR-02 is a one-row correction in `spec/traceability.md`.

## Fixes (2026-11-11, `22-REVIEW-FIX.md`, iteration 1)

- **WR-01 → fixed** (`23e54421`). Made true rather than softened: the `scope === "Resource"` test
  lives once in package-private `ScopedLeaf.ts`; `asks` (DecisionHistory, SignatureHistory) reads
  the id through `scopedResourceIdOf` and the read routes on `isResourceScoped`, so request and
  route cannot disagree. A law test in `PortAccess.test.ts` covers absent / id-less / non-string /
  usable resource sites for Resource- and Any-scoped leaves (mutation-checked). INV-QD-288 now says
  which port is structural and which rest on the shared scope test.
- **WR-02 → fixed** (`d4d62133`). The `PortServing.tst.ts` traceability row says what it pins.
- IN-01..IN-05 → fixed in a second pass (`--fix --all`): IN-01 `3371400e`, IN-02 `c76c3595`, IN-03 `2e4afe54`, IN-04 `93f93cff`, IN-05 `9e2b90bc`.
