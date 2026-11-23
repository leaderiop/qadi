---
phase: "69"
slug: "one-total-thrown-value-to-message-module"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-22"
---

# Phase 69 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase adds one public module to `@qadi/core`, `ThrownMessage.ts`, exporting `thrownMessage` (a caught value as text) and `causeMessage` (an Effect `Cause` as text). Both are total: every read of the value (`instanceof`, `message`, `String`, `Cause.pretty`) is guarded and falls back to the fixed words `a value that could not be described`. Every core site that turned a caught value into text (`JsonHazard`, `PortKey`, `PortDerivation`, `PortWireEncode`, `SinkCodec`, `CustomPredicate`), `@qadi/http`'s remote-port transport, `@qadi/react`'s reporter line and `@qadi/devtools`' capture and feeds now read through them. No network, auth, file or dependency surface changes. The threats are a hostile caught value turning a typed failure into a defect (a denial of service), records that claim more than the code holds, and the release path.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| caller code → core's "never throws" functions | a value a resolver, predicate, wire or serializer threw, caught by core | an arbitrary value; its `message` getter, `toString` or proxy traps may throw |
| HTTP client → `@qadi/http` remote ports | an `HttpClientError` from the transport | an error whose members may throw |
| host reporter → `@qadi/react` `DeveloperSignals` | a value a host-supplied reporter threw | an arbitrary value |
| user layer / decoder / thunk → `@qadi/devtools` feeds and capture | a failed or died `Cause`, or a port error | a cause carrying a hostile value |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-69-01 | Repudiation | a RED case that fails for another reason (69-01) | medium | mitigate | `69-RED-EVIDENCE.md` records the exact failed titles and the first line of each failure; all 21 titles green at HEAD | closed |
| T-69-02 | Tampering | a mutation base from a stale or wrong Stryker report | medium | mitigate | `69-mutation.mjs` refuses a report with other files or a source differing from disk, asserts `ignoreStatic`, stamps `head`, refuses a dirty tree; base recorded in the first commit after `phase_base` (dddbb52a) | closed |
| T-69-03 | Denial of service | Stryker beside vitest, or after a red test | low | mitigate | base record precedes every `test(69-0x)` commit; one unrelated vitest process from another repo noted in 69-01-SUMMARY | closed |
| T-69-04 | Denial of service | a hostile `HttpClientError` turning a remote port read into a defect | high | mitigate | `RemotePorts.ts:40-41` `transport` reads through `thrownMessage`; H1 (`PortRoutes.test.ts:445`) green | closed |
| T-69-05 | Repudiation | capture recording nothing, or the predicate's name, for a broken port | medium | mitigate | `Capture.ts:181-182` `renderError` reads cause, then reason, then `thrownMessage(error)` through the guarded `fieldOf`; C1–C3 green, C2 covers replay | closed |
| T-69-06 | Repudiation | a RED case that fails for another reason (69-02) | medium | mitigate | as T-69-01 | closed |
| T-69-07 | Denial of service | a timeline or diagnostics run dying with a hostile value | medium | mitigate | F1 (`TimelineFeed.test.ts:256`), F2 (`DiagnosticsFeed.test.ts:171`) green, stated `Stopped` with the fixed words | closed |
| T-69-08 | Denial of service | `refusalOf` / `textOf` throwing out of a click handler | medium | mitigate | E1, E2 (`ExplorerSession.test.ts:587,596`) green | closed |
| T-69-09 | Repudiation | a RED case that fails for another reason (69-03) | medium | mitigate | as T-69-01 | closed |
| T-69-10 | Denial of service | `toJson`, `toJsonRecord`, `canonicalKey`, derived key, `portWire` encodes, sink codec | high | mitigate | every catch arm calls `thrownMessage` (`JsonHazard.ts:184`, `PortKey.ts:200`, `PortDerivation.ts:115`, `PortWireEncode.ts:132,150`, `SinkCodec.ts:362`); `ThrownMessage.test.ts` 29 rows green; inline ternaries 6 → 0 | closed |
| T-69-11 | Denial of service | `Cause.pretty` throwing in `customPredicatePort.defect` | high | mitigate | `CustomPredicate.ts:226-227` uses `causeMessage`; `ThrownMessage.ts:47-54` guards `Cause.pretty` and falls back to `thrownMessage(Cause.squash(cause))` (`Cause.squash` never reads the value); R8, R9 green; one `Cause.pretty(` left in `packages/*/src` | closed |
| T-69-12 | Information disclosure | refusal text carrying more of a thrown value | low | accept | see AR-69-01 | closed |
| T-69-13 | Denial of service | `transport` in `RemotePorts.ts` | high | mitigate | as T-69-04 | closed |
| T-69-14 | Denial of service | `errorLine` inside `contain` in `DeveloperSignals.ts` | high | mitigate | `DeveloperSignals.ts:117-137` `namedLine` guards every read; `errorLine = namedLine(error) ?? thrownMessage(error)`; S1–S3 green in both environments | closed |
| T-69-15 | Repudiation | `renderError` in `Capture.ts` | medium | mitigate | as T-69-05 | closed |
| T-69-16 | Information disclosure | a reporter line naming more of the thrown value | low | accept | see AR-69-02 | closed |
| T-69-17 | Denial of service | timeline/diagnostics `onFailure`, the store's wiring read, the gates feed | medium | mitigate | `TimelineFeed.ts:158`, `DiagnosticsFeed.ts:176`, `DiagnosticsStore.ts:272` use `causeMessage`; `GatesFeed.ts:106-117` `stated` uses `causeMessage(Cause.die(thrown))`; F1–F3, G46 green | closed |
| T-69-18 | Denial of service | `refusalOf` / `textOf` in the explorer | medium | mitigate | `ExplorerSession.ts:160,171` use `causeMessage`; E1, E2 green | closed |
| T-69-19 | Information disclosure | a stated reason carrying more of a throw than before | low | accept | see AR-69-03 | closed |
| T-69-20 | Repudiation | the CCR row citing revisions not yet made | low | mitigate | `spec/README.md` CCR-QD-461 cites 11 revisions, each equal to its document's header | closed |
| T-69-21 | Tampering | a new public name missing from the packed `exports` or `.d.ts` | medium | mitigate | `scripts/check-package-install.mjs` imports both names and checks four answers; `check-api-surface.mjs` exit 0; gate 14 passed in `check:pr` on 81678a58 | closed |
| T-69-22 | Elevation of privilege | a release or version-packages merge triggered by the changesets | high | mitigate | only four `.changeset/*.md` added; no version, tag, CHANGELOG, `package.json` or lockfile change; branch not pushed | closed |
| T-69-23 | Repudiation | the CCR row citing a revision a document does not hold | low | mitigate | as T-69-20 | closed |
| T-69-24 | Tampering | a spec example that does not compile | low | mitigate | BEH-QD-681's `typescript` fence (`06-services.md:691`); `check-doc-examples.mjs` "118 block(s) compile" | closed |
| T-69-25 | Tampering | re-baselining the mutation record to hide a drop | medium | mitigate | one commit touches `69-mutation-base.json` (dddbb52a); `compare` exit 0, every fall lost only killed mutants | closed |
| T-69-26 | Repudiation | a green claim from a `check:pr` run on an older commit | medium | mitigate | `check:pr` status 0 on 81678a58; only `.planning/*` changed since | closed |
| T-69-27 | Elevation of privilege | a release triggered at the close | high | mitigate | as T-69-22 | closed |
| T-69-SC | Tampering | dependency installs (every plan) | low | accept | see AR-69-04 | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-69-01 | T-69-12 | A refusal carries only what `thrownMessage` reads (an `Error`'s string `message`, else `String(value)`, else the fixed words); the wire refusal loses its `Error: ` prefix, so it carries less, not more | plan-time disposition (69-04) | 2026-11-22 |
| AR-69-02 | T-69-16 | The reporter line prints only the error's name and string message, else `thrownMessage`'s text; never the value the reporter was handed | plan-time disposition (69-05) | 2026-11-22 |
| AR-69-03 | T-69-19 | A cause that renders keeps its exact `Cause.pretty` text; only an unrenderable one changes, to the fixed words | plan-time disposition (69-06) | 2026-11-22 |
| AR-69-04 | T-69-SC | No dependency is installed, upgraded or removed; `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` are unchanged since `phase_base` | plan-time disposition (69-01..69-09) | 2026-11-22 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **`String(cause)` sites:** `EncodeRefusalReport.ts:43`, `DecisionSinkForwarding.ts:102`, `SinkReport.ts:79` stay as they are (D-07); the auditor confirmed `String(Cause.die(hostile))` returns `Cause([Die([toString threw])])` without throwing.
- **Non-durable evidence:** the RED check script and the `check:pr` log live in `$TMPDIR/qd69` (scratch); the durable record is `69-RED-EVIDENCE.md` plus the passing tests.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-22 | 28 | 28 | 0 | gsd-security-auditor at ace76d9a (ASVS 1, block on high, register authored at plan time; independent re-runs of the affected suites, negative gates, house-style, api-surface, doc examples and the mutation compare) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-22
