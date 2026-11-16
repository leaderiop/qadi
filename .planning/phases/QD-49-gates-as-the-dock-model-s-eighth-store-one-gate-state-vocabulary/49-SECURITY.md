---
phase: "49"
slug: "gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-16"
---

# Phase 49 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Host → dock (`gates` prop) | A host hands the dock a structural `GateRegistryLike` (`subscribe`, `instances`); the dock subscribes in its model's `Scope` | Guard instances (policy, resource, render state, ref): who is asking, never a verdict |
| Registry state string → devtools display | `GateInstanceLike.state` stays `string`; devtools reads it through core's own-key `isGateState` guard | A display word; an unknown or inherited name renders as `Unrecognised` |
| Branch → release | Nothing in this phase versions, tags, pushes or publishes | Changesets only (consumed at release time, not here) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-49-01 | Repudiation | `49-mutation-base.json` | medium | mitigate | Base measured on `phase_base` by the two Stryker runs, committed alone as `53e36fad` (parent `76330fbd`); 49-09's comparer reads it unchanged (one commit touches it) | closed |
| T-49-02 | Tampering | ADR check | medium | mitigate | 49-01-SUMMARY `## ADR check` quotes the eleven passages verbatim with Forbids/Does-not-forbid and a Verdict | closed |
| T-49-03 | Repudiation | Reserved ids | low | mitigate | 49-01 whole-id check at `phase_base`; CCR-QD-440 lists Used/Unused (none unused); 49-09 id scan | closed |
| T-49-04 | Tampering | Characterisation goldens | high | mitigate | Goldens captured twice on the base (byte-identical), committed before any `packages/*/src` edit (49-09 order scan); no import of code under change | closed |
| T-49-05 | Repudiation | Panel tests' expectations | medium | mitigate | 49-02 routing changed no `assert`/`expect(`/`it(`/`describe(` line; 49-05 changed only the one D-12a assertion | closed |
| T-49-06 | Spoofing | `displayOfGateState` | medium | mitigate | `isGateState` is `Object.hasOwn(GATE_STATE_TABLE, word)` (`packages/core/src/GateState.ts`); `GateState.test.ts` refuses inherited names; characterisation pins `toString`/`Suspended` as `Unrecognised` | closed |
| T-49-07 | Tampering | Vocabulary drift core/react/devtools | medium | mitigate | `GATE_DISPLAY` mapped over `GateState` (TS2741 on a sixth word, 49-03 negative control); two-way pin in `DecisionOutcome.tst.ts` | closed |
| T-49-08 | Elevation of Privilege | devtools → `@qadi/react` dependency | low | mitigate | `packages/devtools/package.json` names no `@qadi/react`; no manifest changed since `phase_base` | closed |
| T-49-09 | Tampering | Torn join | medium | mitigate | `rejoin` reads questions and gates in one call (`DockModel.ts`); P2 property + torn-join negative control (49-04) | closed |
| T-49-10 | Denial of Service | Registry subscription leak (model) | medium | mitigate | Scope finalizer sets `closed` and calls `offGates()` (`DockModel.ts:176-182`); M33 counts listeners | closed |
| T-49-11 | Information Disclosure | Store retaining a verdict | low | mitigate | Model holds `GateInstanceLike`/`AskedQuestionLike` only; no `AsyncResult`/`DecisionOutcome`/`outcomeOf` in `DockModel.ts`/`Gates.ts`; `DECISION_READ_BUDGET` unchanged | closed |
| T-49-12 | Tampering | Panel rows changing during the rewrite | high | mitigate | Tracer commit `b01d55d8` left the characterisation and panel tests untouched and green; D-12a alone in `e4faa9ed` | closed |
| T-49-13 | Information Disclosure | Feed/panel retaining a verdict | low | mitigate | `DevtoolsFeed.gates` is the registry (who is asking); panel reads `QuestionsSnapshot` | closed |
| T-49-14 | Denial of Service | Re-render / lens redraw per tick | low | mitigate | Feed no longer calls `useGateInstances`; `useLens(snapshot.instances)` (`QuestionsPanel.tsx:106`) gets the registry's own array | closed |
| T-49-15 | Denial of Service | Hidden/remounted dock leaking a listener | medium | mitigate | `DevtoolsDock.test.tsx` lifetime cases (Activity, StrictMode, swap, unmount); shown to fail (3/68) when the finalizer skips `offGates()` during validate-phase | closed |
| T-49-16 | Tampering | `GateRegistry` vs `GateRegistryLike` drift | medium | mitigate | `surface.tst.ts` pin; `examples/nextjs-newsroom/test/dock-wiring.test.tsx` compiles `atoms.gates` into `GateRegistryLike` | closed |
| T-49-17 | Repudiation | Breaking change under-recorded | medium | mitigate | Three changesets (`gate-states-stated-once`, `devtools-feed-hands-the-gate-registry` **Breaking.**, `dock-takes-the-gate-registry` **Breaking.**); 0.13 upgrade fence compiles (`pnpm spec:website-examples`) | closed |
| T-49-18 | Tampering | Release from this branch | high | mitigate | No CHANGELOG or `package.json` changed since `phase_base`; no tag contains it | closed |
| T-49-19 | Repudiation | BEH/INV without a test | medium | mitigate | `pnpm spec:verify:strict` 21/21 (49-08) | closed |
| T-49-20 | Tampering | Id used outside the reservation | medium | mitigate | CCR-QD-440 Used/Unused sentence; `[no-numbering-placeholder]` in `pnpm lint`; 49-09 id scan | closed |
| T-49-21 | Tampering | Gate/budget/Stryker config weakened | high | mitigate | `git diff phase_base -- scripts/ stryker*.mjs` empty | closed |
| T-49-22 | Repudiation | Evidence order rewritten | medium | mitigate | 49-09 order scan by files each commit touches (31 commits in order) | closed |
| T-49-23 | Tampering | Release/push/consumed changeset | high | mitigate | 49-09 release check: no tag, no remote `arch-wave-10`, base changesets present, three new ones present | closed |
| T-49-SC | Tampering | Package installs | high | mitigate | No `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since `phase_base` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-16 | 24 | 24 | 0 | orchestrator (ASVS L1, register authored at plan time; grep-level evidence) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-16
