---
phase: 22
review: 22-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "INV-QD-288 overclaims; \"never reaches its port without a resource id\" is a convention for two of the three ports, not a structural guarantee"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Traceability row claims a test file pins something it does not"
  - id: IN-01
    severity: info
    disposition: open
    title: "`readAttribute`/`servingFor` and `Walk.evaluateHasRelationship` read the resource id two different ways"
  - id: IN-02
    severity: info
    disposition: open
    title: "Stale comment in `scripts/check-house-style.mjs` names removed reads and a deleted helper"
  - id: IN-03
    severity: info
    disposition: open
    title: "`Predicate.ts` re-spells `Extract<Policy, …>` where this phase introduced `LeafOf`"
  - id: IN-04
    severity: info
    disposition: open
    title: "Doc-comment shape and wrapping drift"
  - id: IN-05
    severity: info
    disposition: open
    title: "`one-port-read.md` changeset appends a user-visible span removal under a \"Not marked Breaking\" paragraph"
---

# Phase 22 — review disposition

One row per finding in `22-REVIEW.md`. Every finding starts `open`; a fix or a reasoned
won't-fix changes its row. The review found no fail-open path today: WR-01 is a guarantee the
spec states more strongly than the code enforces for `DecisionHistory` and `SignatureHistory`
(the route and `asks` must keep agreeing on `leaf.scope === "Resource"`), so it is this phase's
to close by softening INV-QD-288 or adding a law over Resource-scoped acted and signature leaves.
WR-02 is a one-row correction in `spec/traceability.md`.
