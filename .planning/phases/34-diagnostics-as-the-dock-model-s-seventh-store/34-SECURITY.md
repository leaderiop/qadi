---
phase: "34"
slug: "diagnostics-as-the-dock-model-s-seventh-store"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-12"
---

# Phase 34 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| A host's diagnostics layer → the dock model's poll | A host-supplied layer, collector or questions source runs inside the model's scope; a defect in it must stop the poll visibly, never silently, and never take the dock down | Port-call counts, cache and hydration readings, `Cause` of a defect |
| The poll's `Stopped.reason` → the rendered page | The reason is `Cause.pretty` text (stack frames, local paths) rendered by the dock or a standalone host | Error text |
| `@qadi/devtools` package-private modules ↔ its public entry points | The feeds, the snapshot hook and the notice stay out of the barrels; the exports map stays closed (ADR-QD-099) | Module surface |
| Phase changes → the evidence that judges them | Baseline, pins, gates, scripts and configs | Build integrity |
| `spec/`, changesets, upgrade guide | The normative and consumer-facing record of the seventh store and the two breaks | Specification integrity |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-34-01 | Tampering | `34-mutation-base.json` misclassifying a touched model file | medium | mitigate | the writer classified every file with `stryker.devtools.mjs`'s own `mutate` globs and refused a stale report; the baseline is the phase's first plan commit, alone (`5e6d08be`) | closed |
| T-34-02 | Repudiation | a vacuous lifetime pin | medium | mitigate | DiagnosticsLifetime (8) and TimelineLifetime (4) hold their layers and options, assert synchronously after a show, and were green on the untouched base (`1257c0a2`, `5410ecea`) | closed |
| T-34-03 | Repudiation | a sample defect silently ending the poll | high | mitigate | `Effect.onExit` sets `Stopped { reason, sampled }` and `Cause.hasInterruptsOnly` keeps an interruption from claiming a stop (`DiagnosticsFeed.ts`; F4, F5, F8, F10, F17, M18, M26) | closed |
| T-34-04 | Tampering | a replaced run's late exit or stale accept overwriting the new run | medium | mitigate | the per-start run token is checked in the exit handler and in the marking `accept`; one publish per transition (F9, F16, F19) | closed |
| T-34-05 | Denial of service | the model's build waiting on the poll (`AsyncFiberError` under `runSync`) | medium | mitigate | the feed only forks: no `Fiber.await`, `Effect.sleep`, `FiberHandle.join`, `awaitEmpty` or `Deferred.await` in the module (0 hits); M20 builds with an async layer | closed |
| T-34-06 | Information disclosure | `Cause.pretty` stack frames leaving the process | low | accept | see Accepted Risks | closed |
| T-34-07 | Denial of service | a timeline read left open across a remount, hide or unmount | medium | mitigate | the read lives in the feed's scope, closed by `useScoped`'s cleanup (L1, TF6, `useTimeline.test.tsx` byte-identical and green) | closed |
| T-34-08 | Tampering | a shared placeholder store fed by one component and read by another | low | mitigate | `idleTimeline` is inert (TF8) | closed |
| T-34-09 | Denial of service | a reader resubscribing every render | low | mitigate | `useStoreSnapshot` hands React the store's own stable `subscribe` (S2) | closed |
| T-34-10 | Repudiation | a rebuilt dock showing a held reading as freshly sampled | medium | mitigate | the reading lives in the rebuilt model; K5 (flipped in `551a770c`) and D3 pin it | closed |
| T-34-11 | Denial of service | a layer leaked when the dock's poll moved | medium | mitigate | the poll is the feed's, in the model's scope; K2 and K4 stayed green unedited | closed |
| T-34-12 | Repudiation | a standalone host showing a frozen reading after its sampler died | medium | mitigate | `useDiagnostics` returns the feed's status; case (c) pins `Stopped` with the last reading kept; the example states a stopped sampler | closed |
| T-34-13 | Information disclosure | `Stopped.reason` rendered by a host into a page others can see | low | accept | see Accepted Risks | closed |
| T-34-14 | Elevation of privilege | a package-private model module importable after the barrel changes | low | mitigate | `surface.tst.ts` refuses `makeDiagnosticsFeed`, `makeTimelineFeed`, `useStoreSnapshot` and `DiagnosticsNotice` (4 refusals); the exports map is unchanged | closed |
| T-34-15 | Tampering | markup injected through an error message | medium | mitigate | the reason is a React text child of a `pre`; no `dangerouslySetInnerHTML` in `DiagnosticsNotice.tsx` (0 hits); N4 asserts exact text content | closed |
| T-34-16 | Repudiation | a stale reading with no sign that sampling stopped | medium | mitigate | the notice renders on every Starting and Stopped (D4..D11); the absence copy is suppressed while unsampled (D5, D6) | closed |
| T-34-17 | Denial of service | a very long reason growing the notice past the screen | low | mitigate | `maxHeight: 96` with vertical scroll (N7) | closed |
| T-34-18 | Information disclosure | the reason's local paths visible on the reviewer's screen | low | accept | see Accepted Risks | closed |
| T-34-19 | Repudiation | an earlier amendment or history entry rewritten | medium | mitigate | the only lines removed from ADR-QD-047 are its three header-table cells (Revision, Status, Change History summary); history is appended | closed |
| T-34-20 | Tampering | an unreserved number or `-NEXT` placeholder entering the spec | medium | mitigate | no `QD-NEXT` added over `20089321..HEAD`; the CCR-QD-425 row names Used and Unused (ADR-QD-147) | closed |
| T-34-21 | Tampering | a judging file loosened to pass a gate | high | mitigate | no file under `scripts/`, `stryker*.mjs`, vitest configs, `AGENTS.md`, `.oxlintrc.json`, `tsconfig*`, any `package.json`, `pnpm-lock.yaml`, `.changeset/config.json` or a CHANGELOG changed since the base (re-checked at secure: 0) | closed |
| T-34-22 | Repudiation | a surviving mutant hidden | high | mitigate | `34-mutation-after.json`: DockModel 1, DiagnosticsStore 1, TimelineFeed 1, DiagnosticsFeed 0.9388 with all six survivors named in `34-mutation-survivors.json`; baseline in one commit; fresh report | closed |
| T-34-23 | Repudiation | a pin rewritten after the change rather than flipped with it | high | mitigate | 34-09's shape check fixed each pin's commit list; K5, L3 and L4 flipped in the commits that changed the behaviour; the one recorded narrowing (`VerdictTreatment.test.tsx`, a mechanical prop insertion) touches no assertion | closed |
| T-34-SC | Tampering | npm/pip/cargo installs | high | accept | see Accepted Risks | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on severity count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-34-01 | T-34-06, T-34-13, T-34-18 | `Stopped.reason` is kept verbatim and uncapped so a developer can copy the whole cause. It lives only in the in-memory snapshot of a developer tool running in the host's own process; the library adds no sink, log, metric or network call (0 hits in `DiagnosticsFeed.ts` and `DiagnosticsNotice.tsx`). A host that renders it somewhere public chooses to; the upgrade note shows reading it, not publishing it. Recorded in the ADR-QD-047 amendment. | plan-time threat model (34-02, 34-06, 34-07) | 2026-11-12 |
| AR-34-02 | T-34-SC | No package was installed in any plan of this phase (`pnpm-lock.yaml` and every `package.json` unchanged since the phase base) | plan-time threat model (all plans) | 2026-11-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-12 | 24 | 24 | 0 | secure-phase orchestrator (L1 grep, short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-12
