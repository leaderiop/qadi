---
phase: "55"
slug: "a-port-card-is-a-model-row-not-a-view-join"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-18"
---

# Phase 55 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Host reading → model row | Wiring read, port activity, call log and the unsampled flag become one `PortCardRow` per wired service in `portCards` | Port names, counts, call sentences, failure reasons |
| Model row → DOM | `ServicesPanel.tsx` prints the `services` store's words as React text children | Host strings (reasons, implementation names) |
| Port call → call row | A call becomes `describeCall(call)` plus its attempts count, never its answer | What a port returned (must not leak) |
| Package API | `PortActivity.port` narrows from `string` to `PortName` (public, Breaking) | `@qadi/devtools` surface (935 exports, unchanged count) |
| Phase evidence → gate | The D-15 comparer decides WX-05 from committed JSONs | Mutation scores |
| Repo → npm | Release pipeline | Package artifacts (nothing released this phase) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-55-01 | Repudiation | mutation base measured on a wrong tree | medium | mitigate | `chore(55-01)` 17e733d2 is the phase's first plan commit, parent `phase_base` 0c349d6f, holding only the script and base JSON | CLOSED |
| T-55-02 | Tampering | D-15 rule widened at the close | medium | mitigate | no commit touches `55-mutation.mjs` or `55-mutation-base.json` after 17e733d2; `compare 55-mutation-static.json` → `WX-05 holds (D-15)` | CLOSED |
| T-55-03 | Repudiation | reserved id already used at base | low | mitigate | 55-01 checked all ten free at `phase_base`; `spec:verify:strict` PASS 21 | CLOSED |
| T-55-SC | Tampering | npm/pip/cargo installs | high | mitigate | no `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since `phase_base` | CLOSED |
| T-55-04 | Tampering | characterisation agreeing with the moving code | high | mitigate | `ServicesPanel.characterisation.test.tsx` imports only the two barrels (`src/index.ts`, `src/react/index.ts`), `@qadi/core`, `effect/*` and test libraries | CLOSED |
| T-55-05 | Repudiation | a card's word or attribute drifting unnoticed | medium | mitigate | every cell compares `qadi-services`' whole `outerHTML`; file green unedited after 55-05's panel switch | CLOSED |
| T-55-06 | Tampering | `__proto__`/near-miss port grouped as activity | medium | mitigate | `PortCards.ts` groups through `new Map`, builds records with `tabulatePorts`, `isPortName` is `Object.hasOwn(PORTS, name)` | CLOSED |
| T-55-07 | Spoofing | non-registry metric word reported as activity | low | mitigate | `portActivity` reads `forEveryPort` names only; `PortActivity.port: PortName` (Wiring.ts:143); RED `NotAPort` case | CLOSED |
| T-55-08 | Denial of Service | services store recomputing on every publish | low | mitigate | `reservice` (DockModel.ts:257) returns early unless an input reference moved; M49..M54 | CLOSED |
| T-55-09 | Information Disclosure | call row exposing a port's answer | high | mitigate | `CallRow.text` is `describeCall` (4 uses in PortCards.ts); `PortReading.ts` unchanged since `phase_base` | CLOSED |
| T-55-10 | Tampering | call with `__proto__` tag grouped | medium | mitigate | `callsByPort` groups through a `Map` over the five registry names; `__proto__` twin in `PortCards.test.ts` | CLOSED |
| T-55-11 | Repudiation | wrong interpreter label / unfinished call timed at zero | low | mitigate | exhaustive hoisted `Match` labels; `in flight` for undefined duration; twins and characterisation cell 10 | CLOSED |
| T-55-12 | Tampering | panel reintroducing a wording rule | medium | mitigate | panel holds no `filter`/`find`/`reverse`/`slice`/`toFixed` (base: 18 computing tokens; now 2 `=== undefined` render guards); 55-09 panel scan clean; INV-QD-356 | CLOSED |
| T-55-13 | Information Disclosure | defaulted port without warning tone | medium | mitigate | `TONE_STYLE: { readonly [K in CardTone]: CSSProperties }` (ServicesPanel.tsx:53); kept warning-tone case | CLOSED |
| T-55-14 | Tampering | host string injected as markup | low | accept | every host string is a React text child; no `dangerouslySetInnerHTML` in the panel. See Accepted Risks | CLOSED |
| T-55-15 | Repudiation | after/static JSONs describing another tree | medium | mitigate | writer refuses stale reports; `chore(55-06)` 66bcbcb1 carries exactly the two JSONs; compare re-run by orchestrator and 55-09 | CLOSED |
| T-55-16 | Repudiation | ADR mutation numbers not matching measurement | low | mitigate | ADR-QD-168 `## Mutation` carries 145/145, 48/48, 126/126 copied from the committed JSONs (55-07 verify) | CLOSED |
| T-55-17 | Repudiation | record under unreserved id / mismatched anchor | low | mitigate | INV-QD-355/356 headings match 55-07's links; CCR-QD-446 "Unused: none"; `spec:verify:strict` PASS 21 | CLOSED |
| T-55-18 | Repudiation | Breaking change shipped without entry or note | medium | mitigate | `.changeset/devtools-port-activity-is-a-port-name.md`: `@qadi/devtools` minor, exactly one `**Breaking.**`; `upgrading.md` 0.13 section, prose only | CLOSED |
| T-55-19 | Tampering | push, tag, version or publish | high | mitigate | no remote branch contains HEAD; no tag contains a phase commit; 55-09 release check passed | CLOSED |
| T-55-20 | Tampering | forbidden construct / out-of-scope file | medium | mitigate | no added `packages/*/src` line carries `as`/`any`/`switch (`/`fnUntraced`/`async`/`await`; house-style 549 files clean, 3 declared switches; 55-09 phase scan clean | CLOSED |
| T-55-21 | Elevation of Privilege | characterisation or kept test weakened | high | mitigate | only 7b9db6c0 and 51e6ff48 touch the characterisation (additive); 55-09 scan refused any lost line in kept tests | CLOSED |

---

## Accepted Risks Log

| Risk | Rationale | Owner / Review |
|------|-----------|----------------|
| T-55-14: a host string (failure reason, implementation name) reaches the Services panel | React escapes text children; the panel renders every host string as a text child and uses no `dangerouslySetInnerHTML`, exactly as on the base. Severity low, below the `high` block threshold | Accepted at plan time (55-05 threat model); orchestrator-verified 2026-11-18 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-18 | 22 | 22 | 0 | orchestrator (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-18
