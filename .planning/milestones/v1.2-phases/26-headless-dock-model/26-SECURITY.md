---
phase: "26"
slug: "headless-dock-model"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-11"
---

# Phase 26 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| decision records (the app) to reviewer's view | rows, counts and rails are what a reviewer reads to judge decisions; two screens disagreeing about one timeline misleads | decision records, policy sightings |
| reviewer to simulator | a replay that silently keeps another policy makes a reviewer judge the wrong question | replayed entry, held policy choice |
| host props (`catalogue`, `ports`, `capacity`, `source`) to the dock's stores | an unchanged prop must not reset what a reviewer set up; a replaced source or an unmount must not leave a read or a run open | host configuration, resolver answers |
| `PolicyChoice` / `HeldChoice` to hosts | public types (unreleased); their shape is now the held choice's | type exports |
| package barrels | a private mechanic leaking through `@qadi/devtools` becomes an interface | type and value exports |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-26-01 | Spoofing | a cross-store rule lost in the move because it was only proved through the DOM | medium | mitigate | `DockModel.test.ts` M4–M8 (one `it` each) state the replay and held-choice rules headlessly, RED at 8785c80f before any `src` commit | closed |
| T-26-02 | Repudiation | screens disagreeing about the timeline | medium | mitigate | P1 fast-check property (INV-QD-296): counts and both rails equal `countsOf`/`catalogueOf` of the shown timeline after every step | closed |
| T-26-03 | Tampering | a mutation base taken after a source change | low | mitigate | `26-mutation-base.json` committed in 4fbf56ec, an ancestor of the first `packages/devtools/src` commit (403b0cef) | closed |
| T-26-04 | Tampering | `configure` re-dispatching an unchanged input and wiping a capture or a replayed form | medium | mitigate | per-field identity diff in `DockModel.ts`; M10 (four cases: same ports keep the capture, new ports drop it, identical configure notifies nobody, no catalogue empties roles) | closed |
| T-26-05 | Repudiation | one store missing a timeline push | medium | mitigate | one push reaches explorer, simulation and dock session; P1; 26-02 measured dropping the simulation push fails 7 tests | closed |
| T-26-06 | Denial of service | a run or a source read left open after unmount or a source change | low | mitigate | the session and the read live in the model's scope through model-owned `FiberHandle`s (`FiberHandle.runtime(` in `DockModel.ts`); M13, M15 (four cases), M16 green | closed |
| T-26-07 | Spoofing | the simulator pinning the rail's head while a row is seeded | medium | mitigate | `pin()` guarded by `seeded === undefined` in `SimulationSession.ts`; "does not pin while a replayed row is seeded…" and "holds a policy chosen before the rail has any" green | closed |
| T-26-08 | Repudiation | a session publishing twice per command after embedding | low | mitigate | sessions embed the non-publishing `makeHeldChoice` cell (D-08); `ExplorerSession.test.ts` exactly-once notification case green | closed |
| T-26-09 | Tampering | `PolicyChoice` drifting from `HeldChoice` after a future arm | low | mitigate | enforced by use rather than a standalone assertion constant (`noUnusedLocals`): `policyChoice` returns `chosen.resolve()` (a `HeldChoice<PolicySighting>`) as a `PolicyChoice`, so a new `HeldChoice` arm is a compile error there; documented in the type's doc comment (`SimulationSession.ts:77-80`) | closed |
| T-26-10 | Tampering | a regression in the dock's behaviours during the switch | medium | mitigate | `DevtoolsDock.test.tsx` byte-identical from 7396491d through 26-04 (e4e042c9) and green whole | closed |
| T-26-11 | Tampering | the model re-created on a re-render | medium | mitigate | `useScoped` builds once per mount, unchanged since 7396491d; StrictMode case re-pointed at `useDockModel` in `useSimulationSession.test.tsx` green | closed |
| T-26-12 | Denial of service | a source read or a run left running after unmount | low | mitigate | `useScoped`'s cleanup closes the model scope; the re-pointed StrictMode case asserts the run is interrupted on unmount; M13, M16 | closed |
| T-26-19 | Tampering | a reader left on a closed model after a hidden `Activity` | medium | mitigate | one `model === undefined ? null` branch in `DevtoolsDock.tsx`; `useScoped.ts` clears its value on cleanup (unchanged); the `Activity` case re-pointed at `useDockModel` green; rebuild-on-show accepted and recorded in 26-04-SUMMARY | closed |
| T-26-13 | Information disclosure | `useDockModel`/`makeDockModel` leaking into a barrel | low | mitigate | neither name in `src/index.ts` or `src/react/index.ts`; `surface.test.ts`/`surface.tst.ts` pin the surface; `pnpm spec:api` green | closed |
| T-26-14 | Repudiation | a rule losing its only test in the deletion | medium | mitigate | 26-05 ran the 13 model counterparts green first and maps all 13 one to one in its SUMMARY; each gap carries a comment naming the new home | closed |
| T-26-15 | Tampering | a control left with no DOM test | low | mitigate | only Model-class cases deleted (63 remain); `pnpm coverage` exit 0, `src/react/**` lines 99.10 / branches 94.10 (threshold 90) | closed |
| T-26-16 | Tampering | a reserved number reused by a sibling phase | low | mitigate | ARCH-74, ADR-QD-138, CCR-QD-416, BEH-QD-465/466, INV-QD-296 had no hits at the base (26-01) and are used only by this phase's records | closed |
| T-26-17 | Repudiation | BEH-QD-322's prose naming arms the code no longer has | low | mitigate | `29-devtools-simulator.md` Rev 1.14 names `Empty`, `Listed`, `Evicted`, `Seeded`; `Chosen` appears only in its change-history line (exempt, AGENTS.md §15) | closed |
| T-26-18 | Tampering | a mutation or coverage drop hidden by a config edit | medium | mitigate | `git diff 7396491d` of `check-house-style.mjs`, `vitest.config.ts`, `stryker.devtools.mjs` empty; per-file mutation not lower (5 files) | closed |
| T-26-SC | Tampering | npm/pip/cargo installs | high | accept | no `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` changed since 7396491d | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-26-01 | T-26-SC | No dependency is added or upgraded by this phase; no manifest, lockfile or workspace file changed since the base | plan-time threat model (26-01..26-06), confirmed by audit | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 20 | 20 | 0 | autonomous orchestrator (secure-phase, ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
