> Moved verbatim out of `README.md`. The tracker README keeps the active wave.

# Wave 4: the 2026-10-07 review (ARCH-30 to ARCH-45)

These plans resolve the 11 candidates and 4 speculative entries from the 2026-10-07 architecture review, plus one plan (ARCH-45)
for the review's standalone defects and the wave-3 orphan findings that were still true. The report lives outside the repo, at
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/architecture-review-20261007-210705.html`.
Every plan re-verified its evidence against **`e635e68`** (`main`, after #148). Throwaway probes are in the session scratchpad
under `wave4/<ARCH-id>/`. They are **ephemeral**; each plan's §1 records the command that settles every claim, so T0 can re-run it.

**Prerequisite:** none. Every plan branches from `main`. Mind the ordering in "Cross-plan conflicts" below.

**Releases:** many decisions below are breaking, so they ship as changesets only. Merging a version-packages PR or publishing
still needs the user's explicit go-ahead (standing instruction since 2026-10-06). **See "Release hygiene" below first.**

**Progress at a glance:** `./progress.sh 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45`.

## Plans (wave 4)

| ID | Plan | Review strength | Status | Tasks | Decisions | Estimate | Depends on |
| -- | ---- | --------------- | ------ | ----- | --------- | -------- | ---------- |
| [ARCH-30](ARCH-30-obligation-discharge-context.md) | Discharge an obligation against the question it answered; the record names who and what; a captured signature lands where `hasSignature` reads it | Strong | needs-decision | 0/12 | 10 (D-30-a…j) | L (defect path ≈1 d) | — (T2 `Lifecycle.ts` before ARCH-32's constructor) |
| [ARCH-31](ARCH-31-remote-port-codec.md) | A remote port's wire codec is derived from its description: serving route + client adapter for all five ports | Strong | needs-decision | 0/11 | 11 (D-31-a…k) | XL (defect path ½–¾ d) | ARCH-36 (before T6), ARCH-41 (before T4, soft) |
| [ARCH-32](ARCH-32-decision-from-trace.md) | A Decision is constructed from its Trace; the record codec and the hydration seed refuse disagreement | Strong | needs-decision | 0/12 | 9 (D-32-a…i) | L (defect path ½ d) | ARCH-30 T2 (soft) |
| [ARCH-33](ARCH-33-policy-choice.md) | A policy choice is held by the policy, not its index (`model/HeldChoice.ts` for simulator, explorer, role viewer) | Strong | needs-decision | 0/13 | 6 (D-33-a…f) | M (defect path ½ d) | — |
| [ARCH-34](ARCH-34-dock-feed.md) | One devtools feed from `@qadi/react` built from the provider's own runtime (`runtimeLayer` + `useDevtoolsFeed`) | Strong | needs-decision | 0/10 | 4 (D-34-a…d) | M (T1 ≈1 h) | — |
| [ARCH-35](ARCH-35-audit-write-outcome.md) | An audit write's outcome is a value (closed `AuditWriteOutcome`, 11 leaves), projected once to metric/log/hook | Worth exploring | needs-decision | 0/11 | 7 (D-35-a…g) | M (defect path ½ d) | — |
| [ARCH-36](ARCH-36-guarded-httpapi.md) | A guarded HttpApi is registered by the layer that guards it (`guardApi(api)`); an unenforceable endpoint is refused | Worth exploring | needs-decision | 0/11 | 7 (D-36-a…g) | L (defect path ½ d) | ARCH-45 T5/T6 (soft: same `enforce` closure) |
| [ARCH-37](ARCH-37-developer-signals.md) | One developer-signals module in `@qadi/react`; the meaning of each hydration drop reason lives in core | Worth exploring | not-started (T0–T2 free) | 0/11 | 6 (D-37-a…f) | M (defect path ½ d) | — |
| [ARCH-38](ARCH-38-purge-plan.md) | A purge selects only rows a verified, read-back archive holds; the decommissioning checklist goes | Worth exploring | needs-decision | 0/12 | 8 (D-38-a…h) | M (defect path ≈2 h) | ARCH-35 (serial: both amend ADR-056 and BEH 33) |
| [ARCH-39](ARCH-39-one-channel-projection.md) | A projected read decides against the value it projects (`enforceLoaded`/`enforceProjectedLoaded`, projected `filter`) | Worth exploring | needs-decision | 0/11 | 7 (D-39-a…g) | L (defect path ½ d) | ARCH-30 T3 |
| [ARCH-40](ARCH-40-devtools-headless-interface.md) | `@qadi/devtools` exports stores, host wiring and ADR-047's readings; 200 → 120 root names, 44 → 13 React | Worth exploring | needs-decision | 0/14 | 8 (D-40-a…h) | L (zero-break path S) | ARCH-33 |
| [ARCH-41](ARCH-41-topredicate-admission.md) | `toPredicate` admits through `Question` (internal `Admission.ts`) | Speculative | needs-decision | 0/8 | 4 (D-41-a…d) | S | — |
| [ARCH-42](ARCH-42-testing-observation-helpers.md) | Observation helpers in `@qadi/testing`; one way to set up each port, from one fixture table in core | Speculative | needs-decision | 0/10 | 6 (D-42-a…f) | M (minimal S) | ARCH-35 |
| [ARCH-43](ARCH-43-gates-override.md) | The `QadiProvider.gates` override, reconsidered (rec. **keep**; fix host-built registry collisions; registry owns its writer) | Speculative | needs-decision | 0/8 | 3 (D-43-a…c) | S | ARCH-37 T5 (keep path) |
| [ARCH-44](ARCH-44-dock-diagnostics-prop.md) | Five "reading from elsewhere" dock props become one `reading` prop; `hydrationMismatches` goes | Speculative | needs-decision | 0/8 | 3 (D-44-a…c) | M | ARCH-34 (hard) |
| [ARCH-45](ARCH-45-loose-ends.md) | Loose ends: replay keys, TraceDiff field equality, in-handler denial log, promise cancellation, cache claim window, ADR IDs, hydration counts vs a wired registry | n/a | needs-decision | 0/17 | 8 (D-45-a…h) | L (defect path ≈2½ d) | — |

**Totals:** 179 tasks and 107 open decisions. 9,514 lines of plan.

## Release hygiene (found while planning, act before any release)

- **The wave-3 changesets never reached `.changeset/`.** `.changeset/` holds only `explain-out-of-union.md`; the 15 changesets
  for #148's breaking changes are untracked in `changesets-wave3/`. The next version PR would ship wave 3 without its release
  notes or the right bumps. Move them into `.changeset/` (a reviewed commit) before anything is released. (ARCH-40 note, confirmed.)
- ARCH-40 D-40-h proposes landing the devtools narrowing together with wave 3's breaking minor, so one release carries both.

## Defects found while planning (wave 4): ship these first

Each row is a test-first task that ships on its own as a patch, ahead of its plan's refactor. Ordered by severity.
**CONFIRMED** means a probe or test in the plan's §1 reproduced it at `e635e68`.

| Plan · task | Defect | Severity | Found by | Blocked on |
| ----------- | ------ | -------- | -------- | ---------- |
| ARCH-36 · T1 | An HttpApi endpoint **without** the `RequirePermission` middleware (Effect's `.middleware(…).add(G)` ordering gotcha, no middleware, or middleware on one group) is **served to anyone (204)** while `/__permissions` lists it as guarded. Breaks BEH-QD-180 | **security** | planning (new) | nothing |
| ARCH-31 · T1 | Newsroom: a relationship/history store outage answers 200 `"Unknown"`, read as a denial, and under `not(…)` as a **grant** (`not(hasRelationship("banned"))` allows). Also: `Number(depth)` → NaN bypasses core's depth bounds; a no-parameter request answers `"Unrelated"`; an unrecognised 2xx reads as `"Unknown"`; `fetch` ignores the abort signal; `api.ts:102` cites INV-QD-005 (should be 006); `attribute=__proto__` answers `{}` | **security (example)** | review + planning | nothing |
| ARCH-31 · T2 | Newsroom: a port route answers about the **cookie's** subject under the **asked** subject's name (feeds the dock simulator's Live source); pinned by `ssr.spec.ts:153` | high (example) | planning (new) | D-31-b |
| ARCH-30 · T1→T3/T4 | A signature captured through an obligation handler never satisfies a default-scope `hasSignature`, and lands subject-wide, so it **silently satisfies `scope: "Any"`** (a widening) | **security** | review + planning | D-30-a, D-30-f |
| ARCH-39 · T3 | `filter`/`filterStream` return whole items under an allow that restricts fields | high | planning (new) | nothing (doc/test); D-39-e (fix) |
| ARCH-39 · T2 | Spec model 23's example passes a stub resource beside the loader: a clearance-2 subject gets a *secret* report's title | high (spec example) | planning (new) | nothing |
| ARCH-39 · T1 | `spec/behaviors/32-custom-predicates.md:25-62` (and website copy) always fails `AccessDenied` | medium (spec example) | planning (new) | nothing |
| ARCH-45 · T1/T2 | Port replay keys ignore arguments: relationship `depth` (live Allow, replay Deny) and custom-predicate resource + subject fields (a what-if "drop editor" replays a stale **Allow**) | medium | review + planning | D-45-a, D-45-b |
| ARCH-32 · T1 | `decodeSinkRecord` accepts a decision that contradicts its trace (7 cases) and a record whose `evaluationId`/`subjectId`/root `policyTag` disagree with its decision; the golden `V2_DECIDED_ALLOW` is itself contradictory | medium (integrity) | review + planning | nothing |
| ARCH-32 · T2 | `hydrateWith` seeds a Disclosed entry whose trace verdict/fields/reason contradict it | medium | planning | nothing |
| ARCH-33 · T1, T2 | Simulator session and PolicyExplorer follow an index: a new decision silently switches the chosen policy (two triggers: reorder, and a first-ever decision inserted at the top) | medium | review | nothing |
| ARCH-33 · T3 | `catalogueOf` lists two structurally equal declared policies twice when neither has run (BEH-QD-211) | low | planning (new) | nothing |
| ARCH-45 · T5/T6 | An in-handler `guard` denial becomes a 403 with no log line; `overview.md:584` promises one record on every surface (BEH-QD-321 and D-19-d specified the opposite) | medium | review | D-45-d |
| ARCH-45 · T9/T10 | `DecisionCache.getOrCompute` claim window: a key is recomputed and appended twice to `insertionOrder` (reproduced at `MaxOpsBeforeYield` 3–6) | low | review (was "not reproduced") | nothing |
| ARCH-45 · T12/T13 | Hydration counts are written off-fiber to the default registry, invisible to a host-wired `MetricRegistry`; ADR-052's "cannot diverge" is false at effect 4.0.0 | low | planning (new) | D-45-h |
| ARCH-45 · T3/T4 | `TraceDiff` compares field specs as text, not lattice equality (`title` vs `title.**` in a what-if) | low | review | D-45-c |
| ARCH-45 · T7/T8 | `@qadi/promise` says cancellation is impossible; `runPromise(…, { signal })` works (abort stops after 4 of 50 lookups) | low | review | D-45-e, D-45-f |
| ARCH-35 · T2 | An audit record lost after a failed write logs nothing (unwired; or staging failed then write failed); `stagingFailed` doc (`:81-87`) is false for that path. Absorbs the wave-3 `writesWriteFailed` orphan | medium | review + planning | nothing |
| ARCH-35 · T3 | `writes_total` omits records the breaker refused | low | planning (new) | D-35-d |
| ARCH-35 · T1 | `failed_open` metric and log pinned by no test (5 surviving mutants at `:177`, `:182`, `:183`, `:219`) | test gap | planning | nothing |
| ARCH-38 · T8 | DECOMM-005 "record the final audit entry" comes **after** DECOMM-001's export, so a checklist-order archive can never include the final entry | medium | planning (new) | D-38-e |
| ARCH-38 · T2 | Completing a checklist step twice silently overwrites who completed it | low | planning (new) | dropped if D-38-e = A |
| ARCH-38 · T4 | A stored archive has no reader; a hand-built `AuditArchive` is indistinguishable from a real one | gap | review | D-38-b |
| ARCH-38 · T1 | `AuditArchive.ts:3-4` misnumbers the step; `traceability.md:391` maps the checklist test to BEH-QD-254; no behavior doc covers the checklist | docs | planning | nothing |
| ARCH-37 · T1 | A whole-payload refusal warns "did not seed **0** decision(s)" while the counter records 1 (`HydrationEngine.ts:313-344`) | low | planning (new) | nothing |
| ARCH-37 · T6 | `QadiProvider`'s three `console.warn`s (`:89`, `:270`, `:308`) cannot be redirected | low | review | D-37-b, D-37-c |
| ARCH-43 · T2 | A registry from `makeGateRegistry()` reports id collisions nowhere by default (`atoms.gates` warns in dev) | low | planning (new) | D-43-a = keep |
| ARCH-34 · T1 | The example passes `hydrationMismatches`, which the dock never shows once it samples `hydration` | low (example) | review | nothing |
| ARCH-30 · T9 | Website `concepts/signatures.md` example says "→ runs" but fails (`AccessDenied`, then `MissingResourceId`); its diagram claims capture writes `SignatureHistory` | docs | planning (new) | nothing |
| ARCH-45 · T11 | ADR-095…097 document IDs read 902…904 (wave-3 orphan) | docs | wave 3 | D-45-g |
| ARCH-41 · T1 | INV-QD-037's "toPredicate checks the same bound" has no test; `Question.ts:119` claims to be the only `maxDepth` default | test gap | planning | nothing |

**Startable now, no decision needed:** ARCH-36 T1 · ARCH-31 T1 · ARCH-39 T1/T2 (+T3 doc/test) · ARCH-32 T1/T2 · ARCH-33 T1–T3 ·
ARCH-35 T1/T2 · ARCH-38 T1 · ARCH-37 T1 · ARCH-34 T1 · ARCH-45 T9/T10 · ARCH-41 T1 · ARCH-30 T9 · ARCH-44 T1 (pin precedence).

## Claims the review got wrong (wave 4)

- **ARCH-30:** "retry idempotency keys get a source" is partly wrong. `evaluationId` changes per retry and the question is shared by
  distinct requests, so the caller's request id is the key. ADR-019 doesn't define the handler shape (BEH-QD-085's fence does).
  The handler signs as the ambient `CurrentSubject`, not the decided subject (found in verification).
- **ARCH-31:** ADR-QD-064 doesn't exist; the "only `@qadi/http` speaks HTTP" rule is in ADR-072/036. Descriptions know failure/key/
  none/invoke but question and answer only as lossy span projections, so the wire has to be *added* (a tsc spike shows the generic
  derivation compiles with no `as`/`any`). BEH-QD-067 is the Provider; re-check is BEH-QD-151/152. The disclosure note is INV-QD-044.
- **ARCH-32:** devtools' `decision.subjectId` is the *record's* copy (`TimelineDecision.decision` is a `DecisionRecord`); the real
  devtools split is verdict/fields vs trace. "Closes a forged-Allow path" is overstated: the wire is unauthenticated, so this is
  integrity, not security. Hydration can't go through the constructor (seeds aren't decisions). A fifth duplicated fact (record
  policy vs trace root tag) was missed.
- **ARCH-33:** two triggers, not one; the eviction swap is pinned *as intended* by two tests; keying needs `Equal.equals`.
- **ARCH-34:** the mismatch store isn't dead (`Divergent.tsx` and an e2e read it), only the dock's use. Devtools' API needn't
  change: the built context reaches it as a Layer view. The pitfall is documented in nine places, not three.
- **ARCH-35:** 8 metric labels, not ~7; only the `failed_open` warning is unpinned; 38 of audit's 55 surviving mutants are in
  `CircuitBreaker.ts`, not this file.
- **ARCH-36:** 20 stacks, not 9; "named steps to avoid `any`" is refuted on effect 4.0.0; four entries become three, not two
  (`authorizeRequest` stays); the newsroom has no HttpApi.
- **ARCH-37:** one escape, not two files; the two meaning tables are deliberately different texts, though the mapping drifted;
  the stale docs are wider than the card said.
- **ARCH-38:** only line numbers moved; 21 CFR Part 11 is explicitly not planned (`roadmap.md:336`, ADR-016).
- **ARCH-39:** the canonical examples omit `resource` harmlessly; only examples 32 and 23 are affected. No facade forwards
  `enforceProjected`. Precedent missed: `authorizeRequest` and `useProjected` already decide on what they load.
- **ARCH-40:** "~15 names after" is refuted: `DevtoolsDockProps` alone keeps ~25 types public; 56 names are used outside the package.
- **ARCH-41:** `PolicyTooDeep` is built 3× and there are 3 matcher contexts (devtools `Remedies.ts:150` is the third).
- **ARCH-42:** the `CurrentMetricAttributes` gotcha is gone at effect 4.0.0 (a fresh registry isolates); madge can't see package cycles.
- **ARCH-43:** "closure-owned like `hydrate`" is refuted: a spread copy `{...atoms}` would find no writer (the problem ADR-078 removed).
- **ARCH-44:** 14 props, not ~15; ARCH-34 doesn't reshape them, so this is its own breaking change.
- **ARCH-45:** "after `simplify`" is refuted (INV-QD-024 keeps fields byte-equal); in-handler non-logging was *specified*;
  `decideSubjects` concurrency is settled (sequential subjects, concurrency inside each; ARCH-29 T5 pins it) — no task.

## Decisions that need the user, not just a reviewer (wave 4)

| ID | What | Why it needs sign-off |
| -- | ---- | --------------------- |
| D-30-a, D-30-f | Obligation handler takes one `ObligationDischarge` value; `SignatureCaptureRequest` gains required fields | Breaking for every `onObligations` and every capture request |
| D-30-d | `ObligationRecord` gains optional subject/action/resource under wire v2 | Wire change (ADR-096 amendment) |
| D-31-a | `PortDescription.wire` becomes a required member | Minor-breaking public type |
| D-31-h | `PortInterpreter` gains `"remote"` | Public closed union gains a member |
| D-32-b, D-32-d, D-32-e | Allow/Deny constructors take (stamp, trace); `decodeDecision` returns `Result`; `DecodeRefusal.Inconsistent` | Breaking constructors, signature and closed union |
| D-32-h | House-style rule `no-decision-constructor-outside-decision` | Gate change |
| D-33-e | `choosePolicy` takes the policy, not an index | Public signature (unreleased API) |
| D-34-d (4) | One sentence in AGENTS.md §13 | AGENTS.md is house law |
| D-35-a | `AuditWriteOutcome` public + `onOutcome` hook | Public API (gate 13) |
| D-35-d | `writes_total` counts breaker-refused records (`skipped_open`) | Observable metric change |
| D-36-b, D-36-c, D-36-d | Remove `RequirePermissionLive`/`registerApi`/`guardRoute` from the barrel; refuse unattached endpoints | Breaking `@qadi/http` |
| D-37-e | `no-ambient-console` rule + exemptions-must-exist check (and an AGENTS.md §6 row) | Gate change, AGENTS.md |
| D-38-a, D-38-e, D-38-f | Delete `getPurgeableEntries`/`enforceRetention`; delete the checklist; rename `purged` → `expired` | Breaking `@qadi/audit`, amends ADR-056 |
| D-39-c | Remove `options.resource` from `enforceProjected` | Breaking `@qadi/core` |
| D-40-a, D-40-c, D-40-d | Narrow devtools root (87 released names) and React entry (31); named barrels | Breaking, AGENTS.md §9 |
| D-40-g, D-41-d, D-42-c | House-style rules `devtools-named-barrel`, `admission-once`, `test-helper-twin` | Gate changes |
| D-42-d | One `ports` table per port in `TestLayerOptions` | Breaking `@qadi/testing` |
| D-43-a | Delete the `gates` override (rec. **keep**) | Delete is breaking and reopens ADR-080 |
| D-44-a, D-44-b | One `reading` prop; remove `hydrationMismatches` | Breaking; reverses D-24-c decided the same day |
| D-45-a | Port request keys cover every argument | Key strings of a public export change |
| D-45-d | Log in-handler denials at the surface | Reverses ARCH-19 D-19-d |
| D-45-g | ADR ID check in `verify-traceability.sh` | Gate change (inside an existing gate) |

## Decision register (wave 4)

Full options and tradeoffs are in each plan's §5. "Rec." is the plan's recommendation. Status is `open` until recorded here and in the plan.

| ID | Question | Rec. | Status |
| -- | -------- | ---- | ------ |
| D-30-a | What a handler receives | one value `(discharge: ObligationDischarge)` | open |
| D-30-b | Contents of `ObligationDischarge` | `{ question: Question; decision: Allow }`, nothing duplicated | open |
| D-30-c | How `discharge` gets the Question | package-private `Lifecycle.ts` (`decideQuestion`, `ask`); `questionOf` once | open |
| D-30-d | What `ObligationRecord` carries | optional `subjectId`, `action`, `resourceId` envelope keys under wire v2 | open |
| D-30-e | Where a captured signature goes | new `SignatureLedger` in `@qadi/audit` + `signatureHistoryFromLedger`, `SignatureLedgerTest`, `ledger` option | open |
| D-30-f | What `SignatureCaptureRequest` carries | required `evaluationId`, `resourceId`, `action`, `resource`; signer from the question | open |
| D-30-g | Library-minted retry idempotency key | no; document what is stable | open |
| D-30-h | ADR route | new ADR-QD-NEXT amending 019, 057, 058, 096 | open |
| D-30-i | `resourceIdOf` public in `Resource.ts` | yes | open |
| D-30-j | `@qadi/http` obligation handler | out of scope; follow-up after ARCH-36 | open |
| D-31-a | Where a port's wire lives | required `PortDescription.wire`, package-private `portWire(...)` builder | open |
| D-31-b | Subject on the wire | carry `subjectId`; refuse a mismatch with `CurrentSubject` | open |
| D-31-c | Reply vocabulary | closed `PortWireReply` (`Answered`/`Unavailable`/`Refused{reason}`); client `RemotePortFailure` | open |
| D-31-d | Which questions a route serves | required per-port `PortServing` + `servingFor(policies)` allowlists | open |
| D-31-e | Signature answer disclosure | full records behind an explicit opt-in literal | open |
| D-31-f | HTTP shape | `HttpRouter` `POST <prefix>/<PortName>`, JSON, `no-store`; client `remotePortsLayer` over `HttpClient` | open |
| D-31-g | Guarded or unguarded route | both: `portRoutes(permission, policy, …)` and `portRoutesUnguarded(reason, …)` | open |
| D-31-h | How a served read shows up | `servePortRead` in `PortAccess.ts`; `PortInterpreter` + `"remote"`; `qadi_port_served_calls_total` | open |
| D-31-i | Server-render pending ports | host keeps its `typeof window` switch | open |
| D-31-j | ADR route | new ADR-QD-NEXT + amend 094, 051 | open |
| D-31-k | Schema-derive `RelatedResult`/`ActedResult` | yes | open |
| D-32-a | Wire: refuse disagreement or drop duplicates (v3) | refuse on decode; v2 bytes unchanged; next wire version drops them | open |
| D-32-b | In-memory Allow/Deny shape | constructors take (stamp, trace), derived own properties | open |
| D-32-c | Keep Allow/Deny exported as values | keep | open |
| D-32-d | `decodeDecision` return type | `Result<Decision, DecisionDisagreement>` | open |
| D-32-e | How a refusal is reported | closed `DecodeRefusal.Inconsistent { disagreement }` | open |
| D-32-f | Hydration drop reason | reuse `MalformedEntry` | open |
| D-32-g | Decode checks record ids/policyTag vs decision | yes | open |
| D-32-h | Gate the one constructor | house-style rule `no-decision-constructor-outside-decision` | open |
| D-32-i | ADR route | new ADR-QD-NEXT + amend 096, 078 | open |
| D-33-a | Shared module or per-screen fix | one package-private `model/HeldChoice.ts` | open |
| D-33-b | A chosen policy that leaves the list | stays chosen, marked `Evicted` | open |
| D-33-c | Default follows the newest policy? | no; pin the first shown | open |
| D-33-d | Key the role viewer by name too | yes | open |
| D-33-e | What `choosePolicy` takes | the policy | open |
| D-33-f | Spec shape | requirements + INV-QD-NEXT | open |
| D-34-a | Feed shape | `runtimeLayer` + `useDevtoolsFeed(extra)` → `{gates, onInvalidate, diagnostics}` | open |
| D-34-b | How the built context reaches devtools | a Layer view through the existing `diagnostics.layer` | open |
| D-34-c | How the host adds the collector | typed `extra` passthrough | open |
| D-34-d | Example and docs | drop the `cacheContext` hoist; dock stops reading the mismatch store; amend ADR-053 + BEH-QD-NEXT; AGENTS.md §13 sentence | open |
| D-35-a | Outcome public + `onOutcome` hook | export it, add the hook | open |
| D-35-b | Union shape | nested write × staging, 11 leaves | open |
| D-35-c | Which outcomes log | lost → Warning, staging-only → Info | open |
| D-35-d | `writes_total` counts breaker-refused | new label `skipped_open` | open |
| D-35-e | `qadi_audit_entries_lost_total` | add it | open |
| D-35-f | `Effect.fn` span on `record` | yes | open |
| D-35-g | ADR route | amend ADR-056 + new invariant | open |
| D-36-a | Shape of "one layer per HttpApi" | `guardApi(api)` provides `RequirePermission` and registers when built | open |
| D-36-b | `RequirePermissionLive`, `registerApi` public? | remove from the barrel | open |
| D-36-c | `guardRoute`, `authorizeRequest` | `guardRoute` private; `authorizeRequest` stays public | open |
| D-36-d | Endpoint lacking the middleware | refused at compile time and at layer build (`RequirePermissionNotAttached`) | open |
| D-36-e | Endpoint outside the middleware's API | 500 + one log line | open |
| D-36-f | Who owns the stack | no public composer; test-only `test/fixtures/serve.ts`; fix 4 stale comments | open |
| D-36-g | ADR route | amend ADR-036 Rev 1.6 + INV-QD-NEXT "/__permissions lists what is enforced, and only that" | open |
| D-37-a | What the module is | `HydrationWarning.ts` → `DeveloperSignals.ts`, closed 7-member union, one `Match` table, one `console.warn` | open |
| D-37-b | Redirecting the provider's warnings | `QadiProviderProps.onDeveloperSignal` with closed `ProviderSignal` | open |
| D-37-c | Instrument-in-production warning frequency | console once per process; reporter once per mount | open |
| D-37-d | Where the meaning table lives | core `HydrationMetrics.ts`: `hydrationDropMeaning`, `isHydrationDropReason` | open |
| D-37-e | Gate the confinement | `no-ambient-console` rule + exemptions-must-exist check | open |
| D-37-f | ADR route | amend ADR-041 | open |
| D-38-a | `getPurgeableEntries`, `enforceRetention` | delete | open |
| D-38-b | What counts as evidence | only an archive read back through `readAuditArchive(unknown)` | open |
| D-38-c | Unforgeable `VerifiedArchive` | unexported class with a `#private` field, type-only export | open |
| D-38-d | Matching entries to the archive | structural match with counts (`MutableHashMap`) | open |
| D-38-e | The decommissioning checklist | delete (fallback: type it and enforce order) | open |
| D-38-f | Rename `RetentionPlan.purged` | `expired` | open |
| D-38-g | Verify archive sequence before purge | no; report it on the plan | open |
| D-38-h | ADR route | amend ADR-056 + new invariant | open |
| D-39-a | How to close the second channel | new loaded-value entries, not a change to `enforceProjected` | open |
| D-39-b | Names | `enforceLoaded`, `enforceProjectedLoaded`, `LoadedEnforceOptions` | open |
| D-39-c | Remove `options.resource` from `enforceProjected` | remove (`resource?: never`) | open |
| D-39-d | `@qadi/promise` projected + `filterProjected` | yes | open |
| D-39-e | `filter` returns withheld fields | add `filterProjected`/`filterStreamProjected`; `filter` unchanged, documented | open |
| D-39-f | ADR route | new ADR + amend 011, 043 | open |
| D-39-g | ADR-011 gate-before-load | documented `enforce(coarse)` then `enforceProjectedLoaded(fine)`, pinned by a test | open |
| D-40-a | The public interface | stores, host wiring, ADR-047 readings + named types (fallback C: remove only the 24 unreleased) | open |
| D-40-b | Which types stay public | every type a public signature names; exception `SimulationSource` | open |
| D-40-c | React entry | dock + three stores' hooks; panels and lens private | open |
| D-40-d | Barrel form | named re-exports per module | open |
| D-40-e | BDD steps and spec fences on private names | rewrite through the public interface | open |
| D-40-f | ADR route | amend ADR-047, ADR-099 | open |
| D-40-g | Keep it narrow | house-style rule `devtools-named-barrel` | open |
| D-40-h | When it lands | before the next release, with wave 3's breaking minor | open |
| D-41-a | Now, deferred, or dropped | now, whole | open |
| D-41-b | Where admission lives | internal `Admission.ts` | open |
| D-41-c | `PredicateOptions` definition | `Omit<QuestionOptions, "resource">` + compile-checked column test | open |
| D-41-d | House-style rule `admission-once` | yes | open |
| D-42-a | Which helpers | `isolatedMetrics`, `collectingLogger` (new), `collectingTracer` | open |
| D-42-b | What `isolatedMetrics` does | registry only | open |
| D-42-c | Core's tests get the helpers how | keep twins, guarded by `test-helper-twin` rule | open |
| D-42-d | Port setup in `TestLayerOptions` | one `ports` table per port `{answers} \| {layer}`; data options removed | open |
| D-42-e | Data → layer map | core `PORT_FIXTURES`/`fixturePortsLayer`, shared with devtools | open |
| D-42-f | CustomPredicate fixture | `Record<string, boolean>` | open |
| D-43-a | Delete the override? | keep; fix collisions (T2), registry owns its writer (T3); revisit at 1.0 | open |
| D-43-b | Who owns a registry's writer | the registry (`#writer` + brand check), replacing the WeakMap | open |
| D-43-c | (delete path) `makeGateRegistry` home | out-of-barrel `GateWriter.ts` | open |
| D-44-a | Reopen D-24-c | if reopened, one `reading?: DiagnosticsReading` prop (14 → 9); else status quo | open |
| D-44-b | Remove `hydrationMismatches` | remove from dock and `QuestionsPanel` | open |
| D-44-c | Where precedence lives | model function `mergeReading` | open |
| D-45-a | What a port request key covers | every argument (relationship + `depth`; custom + resource + whole subject) | open |
| D-45-b | Custom key encoding | canonical JSON (sorted sets and keys) | open |
| D-45-c | Where field-set equality lives | public `sameVisibleFields` in `FieldLattice.ts`, re-exported by `Decision.ts` | open |
| D-45-d | In-handler denial | the surface logs it once (`qadi.denial_site`); widen the handler error type | open |
| D-45-e | Facade cancellation | per-call `options.signal` (`FacadeOptions`) | open |
| D-45-f | What an aborted call rejects with | whatever `runPromise` rejects with (no branch, §14) | open |
| D-45-g | ADR document IDs | fix 095–097 + check in `verify-traceability.sh` | open |
| D-45-h | Hydration metrics registry | writer and reader both on the default registry; amend ADR-052 | open |

## Cross-plan conflicts and overlaps (wave 4)

**Conflicts to resolve before work starts:**
1. **`Qadi.ts` lifecycle: ARCH-30 vs ARCH-32 vs ARCH-39.** ARCH-30 T2 moves decision construction into a package-private
   `Lifecycle.ts`; ARCH-32 replaces the Allow/Deny constructors; ARCH-39 adds new entries that must call `permitted`/`ask`.
   Rule: ARCH-30 T2–T3 first → ARCH-32 rebases onto `Lifecycle.ts` → ARCH-39 uses `ask`. Decide D-30-c and D-32-b together.
2. **The `enforce` closure in `RequirePermission.ts`: ARCH-45 vs ARCH-36.** ARCH-45's denial-log tap (T5/T6) lands first; ARCH-36 T5
   then moves the closure byte-for-byte into internal `RequirePermissionMiddleware.ts`. Decide D-45-d before D-36-b.
3. **Gate changes cluster:** D-32-h, D-37-e, D-40-g, D-41-d, D-42-c, D-45-g all edit `check-house-style.mjs`/`verify-traceability.sh`.
   Settle them in one sitting; they merge textually but each needs the DoD table check.
4. **ARCH-43 keep/delete decides ARCH-37's order:** keep → ARCH-37 first and ARCH-43 T2 routes through `DeveloperSignals.ts`;
   delete → ARCH-43 T4 before ARCH-37 T6.
5. **Visible-field equality:** ARCH-32 must compare a decision's fields to its trace's **byte for byte**, not with ARCH-45's
   `sameVisibleFields`.

**Ordering overlaps (same files):**

| Files | Plans | Rule |
| ----- | ----- | ---- |
| `core/Qadi.ts`, `Evaluate.ts` | ARCH-30, 32, 39, 41 | 30 (T2–T3) → 32 → 39; 41 textual |
| `core/DecisionRecord.ts`, `SinkCodec.ts`, `SinkWire.ts` | ARCH-30 (D-30-d), ARCH-32 | 30 first; 32 rebases |
| `core/PortDescription.ts`, `Ports.ts`, `PortAccess.ts`, `PortSpan*.ts` | ARCH-31, 41, 42, 45 | 45 (keys) and 41 first; 31 keeps T2's key-injectivity law; 42 adds fixture rows last |
| `core/RelationshipResolver.ts`, `CustomPredicate.ts` keys | ARCH-45, ARCH-31 | 45 first; trivial merge |
| `http/RequirePermission.ts`, `PermissionRegistry.ts`, `GuardRoute.ts` | ARCH-45, 36, 31, 30 (doc only) | 45 → 36 → 31 T6 |
| `audit/AuditDecisionSinkLive.ts`, ADR-056, `spec/behaviors/33-audit-pipeline.md` | ARCH-35, 38, 30 | 35 → 38 (second takes next revision numbers); 30 barrel/overview trivial |
| `audit/test/Metrics.test.ts`, test helpers | ARCH-35, 42 | 35 first |
| `audit/SignatureCapturePort.ts` | ARCH-30 | — |
| `react/QadiProvider.tsx`, `GateWriter.ts`, `HydrationWarning.ts` | ARCH-37, 43, 34 | per conflict 4; 34 rebases |
| `react/HydrationEngine.ts` | ARCH-32 (T2), 37 (T1) | 37 T1 first (patch); textual |
| `devtools/model/SimulationSession.ts`, `PolicyExplorer.tsx`, `RoleViewer` | ARCH-33 | — |
| `devtools/src/index.ts` (barrel), `DevtoolsDock.tsx` props | ARCH-40, 33, 34, 44 | 33 before 40; 34 → 44; 40 re-runs `after.py`/`closure.py` if it lands after 34/44 |
| `devtools/model/Inspect.ts`, `Inspector.tsx`, `Filters.ts` | ARCH-30 T7, 32, 33 | second rebases |
| `spec/overview.md` devtools section | ARCH-33, 34, 37, 40, 44 | second rebases rows |
| `promise/src/index.ts` | ARCH-39, 45 | textual |
| `examples/nextjs-newsroom` | ARCH-31, 34 | different files; 34 keeps `browserPorts` name |

## Suggested order (wave 4)

1. **Release hygiene:** move `changesets-wave3/*` into `.changeset/` (needs the user's go-ahead; no release).
2. **Security patches, independently:** ARCH-36 T1 · ARCH-31 T1 · ARCH-39 T2/T3 (doc/test). Then ARCH-30's defect path once D-30-a/f are decided.
3. **Other defect patches, no decisions:** ARCH-32 T1/T2 · ARCH-33 T1–T3 · ARCH-35 T1/T2 · ARCH-38 T1 · ARCH-37 T1 · ARCH-34 T1 ·
   ARCH-45 T9/T10 · ARCH-41 T1 · ARCH-30 T9 · ARCH-39 T1 · ARCH-44 T1.
4. **Settle the cross-cutting decisions:** D-30-c with D-32-b; D-45-d before D-36-b; D-43-a; the gate-change cluster; the breaking sign-offs above.
5. **Core:** ARCH-45 (keys, TraceDiff) → ARCH-41 → ARCH-30 → ARCH-32 → ARCH-39 → ARCH-31.
6. **http:** ARCH-45 T5/T6 → ARCH-36 → ARCH-31 T6.
7. **audit:** ARCH-35 → ARCH-38; then ARCH-42.
8. **react:** ARCH-37 ⇄ ARCH-43 (per D-43-a) → ARCH-34 → ARCH-44.
9. **devtools:** ARCH-33 → ARCH-40 (before the next release, D-40-h).

## Orphan findings (wave 4): not owned by any plan yet

- `@qadi/http` never passes an obligation handler, so any binding obligation on an HTTP-guarded route always answers 403
  `UndischargedObligation`, undocumented (ARCH-30 D-30-j proposes a follow-up after ARCH-36).
- `AccessDenied` carries `reason`/`policyTag` beside its `trace` (`Qadi.ts:150-159`); a decoded one can disagree the same way
  ARCH-32 fixes for decisions (read, not probed).
- `CircuitBreaker.ts` holds 38 of audit's 55 surviving mutants (generation guards `:298-327`, `releaseProbe` `:374-378`, admission
  `:383-387`, span attributes `:412-417`); `AuditEntry.ts` 4, `SignatureCapturePort.ts` 1, `SequenceIntegrity.ts` 7 equivalent
  (ARCH-38 T6 covers those). The real reason audit has the lowest mutation score.
- `examples/http-advanced` is in no gate (not in `tsconfig.json`/`tsconfig.test.json`; `pnpm example` checks only the newsroom);
  ARCH-19 T9's text said otherwise. It typechecks clean by hand today.
- `scripts/check-house-style.mjs:296-305` exempts `packages/react/src/settled.ts`, which no longer exists (ARCH-37 T7 via D-37-e).
- `examples/nextjs-newsroom/src/client/Divergent.tsx:73-80` still shows "known discrepancy … does not in this app" at zero mismatches.
- `spec/models/07-field-level.md:174-176` lists a stale `enforceProjected` signature (folded into ARCH-39 T8).
- The "interface as wide as its implementation" question ARCH-40 asks of devtools applies to `@qadi/core` too (ARCH-40 §9, not planned).
- Under an *unwired* resolver `not(hasRelationship)` grants — documented (`spec/models/09-acl.md`, INV-QD-014), no action.
- **Wave-3 orphans resolved:** PolicyExplorer `64`, house-style error-tag counts (ARCH-27 T4), the features `@qadi/http` link —
  fixed. React dehydrate `TraceSchema` exposure — refuted (dehydrate never Schema-encodes; hydrate is guarded at 256). ADR IDs →
  ARCH-45 T11; `writesWriteFailed` log → ARCH-35 T2.
