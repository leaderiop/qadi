---
phase: 90
review: 90-REVIEW.md
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "The Always arm of needsResourceId was unreachable, and the spec said every scoped read reads the row"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "The mutation record understated the dead arm: five undetected mutants, not three equivalent"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "A reclassified leaf made its port scoped but its read never routed through readScoped (verified to compile)"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "DistinctSpanNames accepted union spans"
  - id: WR-05
    severity: warning
    disposition: fixed
    title: "The overview and traceability said a description cannot name another port's span"
  - id: WR-06
    severity: warning
    disposition: fixed
    title: "The upgrade guide's migration example could not compile, and the changeset over-asked"
  - id: WR-07
    severity: warning
    disposition: fixed
    title: "PORT_FIXTURES was documented as the place fixtures are read from, but no source read it"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "@qadi/http kept a file-local PORT_NAMES beside core's public one"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "The third tabulatePorts overload existed for one constant no source read"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "readScoped's leaf was not tied to its port"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "The attribute map type had two spellings"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "The three base survivors: two killable, one equivalent"
  - id: IN-06
    severity: info
    disposition: fixed
    title: "The shape judges could pass a hand list"
  - id: IN-07
    severity: info
    disposition: fixed
    title: "Doc-comment shape and claims the types do not enforce"
  - id: SEC-OBS-1
    severity: info
    disposition: fixed
    title: "The ByScope guard `\"scope\" in leaf &&` failed open (unreachable)"
  - id: SEC-OBS-2
    severity: info
    disposition: fixed
    title: "DistinctSpanNames accepted a union of fresh literals"
  - id: SEC-OBS-4
    severity: info
    disposition: fixed
    title: "The Always arm was dead code"
  - id: SEC-OBS-5
    severity: info
    disposition: fixed
    title: "The CustomPredicate fixture builder sat below its description"
  - id: SEC-OBS-3,6
    severity: info
    disposition: accepted
    title: "Security observations 3 and 6: informational, no change needed"
  - id: VAL-WX-05
    severity: gap
    disposition: fixed
    title: "The PortAccess.ts mutation drop was closed by equivalence, not by a test"
open: 0
---

# Phase 90 — Review disposition

Findings from `90-REVIEW.md`, plus the observations in `90-SECURITY.md` and the WX-05 gap in `90-VALIDATION.md`. All decided autonomously 2026-11-26 under the owner's rule (the most complete and clean fix, not the simplest).

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | `760654ce`, one design change with WR-02, IN-03, SEC-OBS-1, SEC-OBS-4 and WX-05: each `scopedCall` row is a closed union computed from its leaves' `LEAF_NEEDS` rows, `{ need: "Always"; withId }` or `{ need: "ByScope"; withId; bare; resourceScoped }`, typed `never` for a port that mixes the two (recorded `route-mixed-port`, TS2322). `readScoped` narrows on `call.need`; `needsResourceId`, its `Match` and the per-call closure are deleted. Patch of record fixed before measuring (`17aeb9ad`, `routing-review.patch` sha256 `11e3b2be…2fdb09`); bench gate recorded in `18345c74` (4+4 rounds: geometric mean +0.09%, scoped-heavy −0.5% / −0.3%, worst +3.8% on a workload that reads no scoped port; no workload past 5%). The first gate stays in `90-BENCH.md` as history. BEH-QD-789, BEH-QD-588, INV-QD-426, ADR-QD-203 decision 7, ADR-QD-163, traceability and CCR-QD-482 restated in place. |
| WR-02 | warning | fixed | `3267c025`, `1beda8d6`: mutation re-taken with the base invocation, alone: 469 of 470 detected; `PortAccess.ts` 51/51. A hand run with `ignoreStatic: false` killed the three row objects, two `"ByScope"` literals and an arrow (EXAMINED); the `"Always"` literal survives because `readScoped` compares only with `"ByScope"`, recorded STATIC_PROVEN and held by the row "HasRelationship, absent resource, under evaluate". ADR-QD-203 and every claim state this close exactly. |
| WR-03 | warning | fixed | `50377f43`: `readAttribute` and `askCustom` read through `readUnscoped<K extends Exclude<PortName, ScopedPort>>`, so reclassifying an unscoped leaf without routing it through `readScoped` fails to compile (recorded `unscoped-read-reclassified`). INV-QD-426 and BEH-QD-790 hold as written. |
| WR-04 | warning | fixed | `8a376f19`: `DistinctSpanNames` refuses a union span, a union with a pattern, and overlapping unions; four pins (positive and `toBe<never>`) in the born `PortFacts.review.tst.ts`; `NOT_CALLABLE_PIN_BUDGET` unchanged. RED `span-union-refused`, `span-distinct-accepted`. |
| WR-05 | warning | fixed | `4852de46`: the overview and the traceability matrix say what holds: the registry refuses two ports sharing a span (`DistinctSpanNames` at `PORTS`); a description outside the registry can carry any span name. |
| WR-06 | warning | fixed | `bdfe9a5d`: the upgrade guide's example is a compiled `typescript` fence against a real `PortName`; the guide and the changeset (still the only one since `phase_base`) say a hand-built description needs the `fixture` member and state the type parameter defaults. |
| WR-07 | warning | fixed | `bb4ef25d`, with IN-02: `fixturePortsLayer` reads `PORT_FIXTURES`, the one fixture table; `Ports.ts`, ADR-QD-203, ADR-QD-094 and `QadiReviewLayer.ts` say what reads what. |
| IN-01 | info | fixed | `f9b6efb2`: `packages/http/src/PortRoutes.ts` imports core's public `PORT_NAMES`; same order and meaning. |
| IN-02 | info | fixed | `bb4ef25d` (with WR-07): the third `tabulatePorts` overload and its helper types serve the table every fixture is read through. |
| IN-03 | info | fixed | `760654ce` (with WR-01): `readScoped` takes a leaf typed by its port; a leaf of another port is TS2741 (recorded `route-leaf-of-another-port`). |
| IN-04 | info | fixed | `9002aae9`: the attribute table is typed as a subject's attributes, one spelling; no shadowing of `Record` beside `import * as Record`. |
| IN-05 | info | fixed | `d3811c4f`: `PortDerivation.ts` `permits` survivor killed by `PortFacts.review.test.ts` asserting `failure.permits` (RED `bounded-permits-dropped`); the unreachable `MISSING_ACTION` arm in `LeafNeeds.ts` removed; `SignatureHistory.ts` survivor recorded EQUIVALENT (`makeResourceId` is `Brand.nominal`, the identity at runtime). |
| IN-06 | info | fixed | `760654ce`, `e7bd64d5`: `scoped-route derived` fails any literal port list in `ScopedPort` (an `Extract<PortName, …>` hand list included), reading only the `["asks"]` member as derived; `routing-landed` holds the first landing at its commit and the review landing at its commit and at HEAD. |
| IN-07 | info | fixed | `bf40eceb` (and the location note in `8a376f19`): doc comments lead with a one-line summary; `ScopedCall.withId` hand-wrapped; why `DistinctSpanNames` lives in `PortDerivation.ts`; `FixtureData` states what the type enforces and what it does not. |
| SEC-OBS-1 | info | fixed | `760654ce`: the `"scope" in leaf` guard is gone; a ByScope port's leaf type carries a required `scope`, and every route other than `need === "ByScope"` with an unscoped leaf goes to the id check. |
| SEC-OBS-2 | info | fixed | `8a376f19` (with WR-04). Non-port `qadi.` span names are not declared as one typed set, so a port span equal to one is not refused by type; recorded in the `DistinctSpanNames` doc. |
| SEC-OBS-4 | info | fixed | `760654ce`: the dead arm is deleted (see WR-01). |
| SEC-OBS-5 | info | fixed | `343e536d`: `customPredicateFromRecord` sits above `customPredicatePort`, like the other four builders. |
| SEC-OBS-3,6 | info | accepted | 3: production `portsLayer`, the derivations and `PortAccess` never read `fixture`; only the fixture table and its test/devtools consumers do. 6: the served read answers an already-routed question under a subject match and an allowlist; untouched by this phase. |
| WX-05 gap | gap | fixed | `760654ce`, `3267c025`: with the dead arm gone, every `PortAccess.ts` mutant is killed by a test (51/51) or examined by hand; nothing is closed by equivalence there. |

Spec edits in the fix round were made in place within this phase's unreleased revisions (CCR-QD-482); no further `spec-revise.mjs` bumps, so `90-check.mjs records --close` and `90-earlier-checks.mjs` hold.

Coverage re-taken (`6a613f9a`): lines 99.89, functions 99.78, branches 98.40, statements 99.64 (base 99.89 / 99.78 / 98.33 / 99.63); all thirteen files at or above base, `LeafNeeds.ts` branches 97.05 → 100. Sixth-port run: 61 errors in the same 25 groups (was 57); the four extra are `readUnscoped`'s spelled signature (WR-03) in PortAccess's TS2536 group, stated in ADR-QD-203, INV-QD-425 and CCR-QD-482.

Script declarations changed, each named: `90-check.mjs` (`bench` per patch record, `routing-landed`, `scoped-route route` and `derived`, review test files in the close; self-test 522), `90-pinned-check.mjs` (amendment chains, regions LeafNeeds 47-48 and 223-226, ScopedLeaf 11-14, born `PortFacts.review.test.ts` and `PortFacts.review.tst.ts`), `90-mutation.mjs` (`closeOfRecord`, EXAMINED / STATIC_PROVEN rewritten, stale EQUIVALENT entries removed, the SignatureHistory one added; self-test 105).

`pnpm check:pr` exited 0 after the fixes (17 of 18 steps; mutation skipped by definition), on head `e7bd64d5`. Public API 943 exports, unchanged.
