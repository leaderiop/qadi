---
id: ARCH-45
title: Wave-4 loose ends — replay keys that drop what a port receives, field equality in TraceDiff, the in-handler denial log, @qadi/promise cancellation, the DecisionCache claim window, ADR document IDs, hydration counts and a wired registry
strength: n/a (defects noted, not deepenings)   # from the 2026-10-07 architecture review (wave 4), "Defects the walks found" table
status: done
evidence_verified_at: e635e68
depends_on: []            # eight independent items; each ships alone
blocks: []                # see §9: ARCH-36 waits on I3 (its own §4 ordering rule); ARCH-31 must keep I1's key law
adrs_touched:
  - ADR-QD-094 (amend, I1: a request key is injective over every argument the port receives; the two descriptions that drop one are corrected)
  - ADR-QD-019 / ADR-QD-036 (read, I3: the edge logs a denial; ARCH-19 D-19-d's recorded trade-off is reversed by D-45-d)
  - ADR-QD-081 (constraint, I3: one projection per tag; logging does not change the status table)
  - ADR-QD-032 (constraint, I4: the facade forwards and decides nothing; forwarding a signal is forwarding)
  - ADR-QD-031 (read, I5: FIFO eviction by insertion; the fix makes "insertion" mean one insertion per key)
  - ADR-QD-052 (amend, I8: "a writer and a reader sharing one metric object cannot diverge whatever a host wires" is false at effect 4.0.0; both ends are pinned to the default registry)
  - ADR-QD-092 (read, I2: the field lattice owns field-set meaning; equality joins `intersectFields`/`unionFields`/`mergeFields` there)
  - ADR-QD-101 (constraint, I2: `TraceOracle.ts`'s frozen `oracleDiffTraces` changes in the same commit, with the reason)
  - ADR-QD-037 (constraint: madge; type-only edges count; no new cross-module edge except `TraceDiff.ts → FieldLattice.ts`, which already exists through `Decision.ts`)
  - ADR-QD-038 (constraint: one changeset per item, fixed version group; no release step)
  - ADR-QD-076 (constraint: `ignoreStatic`; every new branch needs a killing test)
packages: ["@qadi/core", "@qadi/devtools", "@qadi/http", "@qadi/promise", "@qadi/react", "examples/http-advanced", "examples/nextjs-newsroom (comment only)", "spec", "spec/scripts (verify-traceability.sh)"]
estimate: L   # I1 ≈ 1 day (M); I2 ≈ ½ day; I3 ≈ ½–1 day; I4 ≈ ½ day; I5 ≈ ½ day; I7 ≈ ¼ day; I8 ≈ ½ day. Defect-only path (red tests + minimal fixes, no gates) ≈ 2½ days
---

# ARCH-45 — Wave-4 loose ends

This plan is not one deepening. It collects the defects the 2026-10-07 review's walkers found
outside any card, plus the wave-3 orphan findings still true at `e635e68`, and handles each as its
own item: its own claims in §1, its own decisions, its own test-first task chain. Any item can merge
without the others.

| Item | Area | Verdict at `e635e68` | First task |
| ---- | ---- | -------------------- | ---------- |
| **I1** | Port request keys drop what the port receives | **CONFIRMED by probe, and wider than stated.** Relationship ignores `depth` (review); the custom-predicate key also ignores the **resource** and everything in the **subject but its id** — so a what-if "drop role `editor`" replays a stale **Allow** | T1 (red) |
| **I2** | `diffTraces` compares field specs as text | **CONFIRMED by probe.** The "after `simplify`" trigger is **REFUTED** (INV-QD-024 keeps `visibleFields` byte-equal); the real trigger is a what-if or replay whose two sides spell one field set two ways | T3 (red) |
| **I3** | An in-handler `guard` denial is a 403 with no log line | **CONFIRMED by probe, and specified.** BEH-QD-321's own prose says so (ARCH-19 D-19-d). The defect is that `spec/overview.md:584` promises the opposite | T5 (red) |
| **I4** | `@qadi/promise` says cancellation is impossible | **CONFIRMED by probe.** `runPromise(effect, { signal })` stops a `filter` after 4 of 50 lookups | T7 (red) |
| **I5** | `DecisionCache.getOrCompute` claim window | **CONFIRMED by probe** (review said "read, not reproduced"). Reproduced under `MaxOpsBeforeYield = 3…6`; a fix candidate removes it | T9 (red) |
| **I6** | `decideSubjects` and `concurrency` | **Settled, no task.** Both earlier statements were half-right; ARCH-29 C3.3/T5 already pinned it | — |
| **I7** | Wave-3 orphans | 2 of 6 still true: ADR document IDs 095–097 (task here) and the audit `write_failed` log (owned by ARCH-35 T2). 4 fixed or refuted | T11 |
| **I8** | *(new, found here)* Off-fiber hydration counts vs a host-wired `MetricRegistry` | **CONFIRMED by probe.** effect 4.0.0 looks the registry up on every update, so ADR-QD-052's "cannot diverge whatever a host wires" is false | T12 (red) |

## 1. Verified evidence (at `e635e68`)

`git log --oneline -1` → `e635e68 Wave 3 architecture deepenings (ARCH-16 to ARCH-29) (#148)`.
Installed `effect` is **4.0.0** (`node_modules/effect → .pnpm/effect@4.0.0`, stable since `ab38290`,
2026-10-02). Every probe lives in
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-45/`
(below: `$P`) and imports `src` modules by absolute path. Two run commands:

- core-only probes: `cd packages/core && ../../node_modules/.bin/tsx $P/<probe>.mts`
- probes that import `@qadi/devtools` source: `cd packages/devtools && NODE_OPTIONS=--conditions=bun ../../node_modules/.bin/tsx $P/<probe>.mts`

| Probe | Item | Run with |
| ----- | ---- | -------- |
| `replay-key-probe.mts` | I1 (a), (a′), (b) | devtools command |
| `replay-subject-probe.mts` | I1 (c) | devtools command |
| `tracediff-fields-probe.mts` | I2 | core command |
| `../ARCH-36/probe-handler-denial.mts` | I3 | `cd ../ARCH-36 && NODE_OPTIONS=--conditions=bun <repo>/node_modules/.bin/tsx probe-handler-denial.mts` |
| `promise-signal-probe.mts` | I4 | core command |
| `cache-race-probe.mts` (`OPS=<n>` env) | I5 at HEAD | core command, e.g. `OPS=4 …` |
| `cache-race-probe-fixed.mts` + `fixed/DecisionCache.fixed.ts` | I5 fix candidate | core command |
| `cache-race-default-budget.mts` | I5 at the default budget | core command (≈ 60 s) |
| `../ARCH-42/offfiber-registry-probe.mts`, `../ARCH-42/metric-isolation-probe.mts` | I8 | core command |

**Do not** run the race probe with `OPS=1` or `OPS=2`: the probe itself livelocks there (its spin
loops), which says nothing about the cache.

### I1 — Port request keys drop what the port receives

**C1.1 `relationshipResolverPort.key` ignores `depth` — CONFIRMED.**
`packages/core/src/RelationshipResolver.ts:179`:
`key: ([request]) => JSON.stringify([request.subjectId, request.relation, request.resourceId])`.
The doc comment above it (`:166-172`) says so on purpose: "not by `depth`, which is traversal fuel
rather than part of the question". That premise is wrong for any resolver that honours the field the
same file requires it to honour (`:31-50`: a traversing resolver "MUST treat a defined `depth` as a
maximum hop budget"): depth 1 and depth 3 are different questions with different answers.

**C1.2 `depth` reaches the resolver — CONFIRMED.** `Walk.ts:202` calls
`askRelationship(subject, policy.relation, rawId, policy.depth)`; `PortAccess.ts:361` clamps it and
`:377-382` puts the clamped value in the `RelationshipCheck` the resolver receives.

**C1.3 Devtools capture and replay answer a depth-1 ask with a depth-3 capture — CONFIRMED, and the
same policy, same input, no edit, already disagrees with itself.** `packages/devtools/src/model/Capture.ts:104`
records under `d.key(args)`; `:189` replays from `answers[d.port].get(d.key(args))`. Probe
`replay-key-probe.mts`, a traversing resolver (`Related` iff `depth ≥ 2`):

```
(a) depths asked live: [1,3]
(a) captured relationship keys: [["[\"alice\",\"member\",\"doc-1\"]",{"_tag":"Answered","value":"Related"}]]
(a) same policy, same input — live: Allow  replay: Deny
(a) diffTraces(live, replay): 2 change(s) ["VerdictChanged","ChildCountChanged"]
(a') depth-3 policy — live: Allow  replay of a depth-1 capture: Deny
```

Policy (a) is `allOf([not(hasRelationship("member", {depth: 1})), hasRelationship("member", {depth: 3})])`
("a member, but not a direct one"). Both asks write one key; the second overwrites the first. This
breaks INV-QD-043 ("a snapshot answers what the live layer answered", `spec/invariants.md:1664`) with
no edit at all.

**C1.4 `PortConformance.test.ts:478-482` pins the key without depth — CONFIRMED.** It asserts
`relationshipResolverPort.key([{…, depth: 3}]) === '["alice","owner","doc-1"]'` (`:466-495`,
`describe("request keys")`).

**C1.5 New: the custom-predicate key ignores the resource and the subject's grants — CONFIRMED by probe.**
`packages/core/src/CustomPredicate.ts:128`: `key: ([name, subject, , params]) => JSON.stringify([subject.id, name, params])`.
The port receives `(name, subject, resource, params)` (`PortAccess.ts:394-409`), the whole
`AuthSubject` and the whole `Resource`. Two probes:

```
(b) custom predicate on doc-2 — live: Deny  replay of a doc-1 capture: Allow     # replay-key-probe.mts
(c) live as editor: Allow
(c) what-if 'drop editor' — live: Deny  replay: Allow                            # replay-subject-probe.mts
```

(c) is the worst case in this plan: a what-if sweep exists to vary the subject's grants
(`spec/behaviors/29-devtools-simulator.md` BEH-QD-222), `Snapshot` is "the mode a sweep should use"
(`SimulationSession.ts:391-394`), and for any `hasCustom` that reads `subject.roles`/`attributes` the
sweep reports a **stale allow**. The direction is the dangerous one.

**C1.6 "A simulation fixes one resource for its duration" — REFUTED.** `Capture.ts:52-67` says the
resource gap "does not arise in practice". `SimulationSession.ts:513-517` (`edit`) and `:519-531`
(`editResourceText`) change the resource and keep `capture`; only `setPorts` (`:481-491`) drops it.

**C1.7 Other `key` consumers — CHECKED.** `git grep -n "\.key(" packages/*/src` finds three:
`PortDoubles.ts:108-109` (`replyTable`, same collision class, test-only), `Capture.ts:104`, `:189`.
The other three descriptions are already injective over their arguments: attribute
`[subjectId, attribute]` (`AttributeResolver.ts:128`; the port receives exactly those two),
history `[subjectId, event, resourceId ?? null]` (`DecisionHistory.ts:136`; `ActedQuery` has exactly
those three fields, `:47-57`), signature `[subjectId, resourceId ?? null]` (`SignatureHistory.ts:153`;
`SignatureQuery` `:43-45`).

**C1.8 DecisionCache keys — CHECKED, not affected.** The cache keys on `Question`
(`Question.ts:106-112`), which holds the whole `policy` (so `depth`), the whole `subject` and the
`resource`. It never uses a port key.

**C1.9 No saved captures exist in the repository — CHECKED.** `CapturedAnswers` lives in memory
(`SimulationSession.ts:242`); nothing serializes it. It is exported, so a host could hold keys; that
is the observable-change risk D-45-a names.

### I2 — `diffTraces` compares field specs as text

**C2.1 `sameFields` is set equality on spec text — CONFIRMED.** `packages/core/src/TraceDiff.ts:137-152`:
`sameStringSet` sorts and compares strings; `:275` calls it per node.

**C2.2 The lattice says some different texts are one set — CONFIRMED.** `FieldPath.ts:84-87`
(`"title"` and `"title.**"` "denote the same set"), `FieldLattice.ts:92-93` (same),
`FieldLattice.ts:178-182` (`unionFields`: a subsumed `"address.street"` beside `"address.**"`
"projects identically to omitting it"). `compareFieldPaths` (`FieldPath.ts:126`) already decides
containment per pair.

**C2.3 Reproduced — CONFIRMED.** `tracediff-fields-probe.mts` evaluates one-node policies and
compares `FieldPath.project` on sample data:

```
["title"] vs ["title.**"] | projections equal: true | diffTraces: ["FieldsChanged"]
["address.**","address.street"] vs ["address.**"] | projections equal: true | diffTraces: ["FieldsChanged"]
what-if drop b — visibleFields: ["title","title.**"] -> ["title"] | projections equal: true | diffTraces: ["FieldsChanged@[]","VerdictChanged@[1]","FieldsChanged@[1]"]
```

The third line is the realistic trigger: `anyOf([hasRole("a",{fields:["title"]}), hasRole("b",{fields:["title.**"]})], {fieldStrategy: "Union"})`,
what-if "drop role b". The root's `FieldsChanged@[]` is spurious (same projection); the child
changes are real. `WhatIf.ts:107` feeds `diffTraces` straight into `isChanged` (`:122-129`), so the
first two cases mark an unchanged edit as changed.

**C2.4 "E.g. after `simplify`" — REFUTED as a trigger.** INV-QD-024 (`spec/invariants.md:866-891`)
requires `simplify(p)` to yield the same `visibleFields` as `p`, and its property test pins it. A
simplified trace also has fewer nodes, so a diff already reports `ChildCountChanged` there.

**C2.5 One more consumer of the text comparison — CHECKED.** `packages/core/test/TraceOracle.ts:47-59`
is the frozen oracle copy of `sameFields` (ARCH-22). Its header (`:7-10`) requires changing it in the
same commit, with the reason. No other `visibleFields` text comparison exists in `packages/*/src`
(`git grep -n "visibleFields" packages/*/src | grep -E "===|same|equal"` → only `TraceDiff.ts:275`).

### I3 — An in-handler guard denial is never logged

**C3.1 The code path — CONFIRMED by probe.** `packages/http/src/RequirePermission.ts:387-421`
(`enforce`): `authorizeRequest` logs its own denials (`AuthorizeRequest.ts:93-97`,
`tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenial)`), then the handler runs inside the same
`Effect.catchTag(HTTP_ENFORCEMENT_TAGS, …projectHttpEnforcementFailure…)` (`:417-419`), which taps
nothing. ARCH-36's probe, re-run here:

```
status 403 body {"_tag":"AccessDenied","subjectId":"reader","policyTag":"HasPermission","reason":"subject lacks permission 'document:write'"}
log lines: []
```

`http.test.ts:946-956` pins the projection and asserts nothing about logs.

**C3.2 It contradicts `spec/overview.md:584` — CONFIRMED.** The `logDenial` row says it is "wired by
`authorizeRequest` via `Effect.tapErrorTag`, so a denial leaves one server-side record on every
surface instead of only the client-visible response (JD-03, JM-05)".

**C3.3 But it is specified — CONFIRMED (the review missed this).** BEH-QD-321
(`spec/behaviors/23-http.md:541-546`) requires each denial be logged "exactly once, by
`authorizeRequest`", and its prose (`:567-571`) says outright: "That failure is no longer logged by
the edge: it is the handler's own `guard`'s failure. A bare route's answer is `toResponse`, which logs
nothing." ARCH-19 D-19-d (`.planning/architecture/ARCH-19-http-edge-step.md:252-258`) chose it and
named the lost log line. No INV covers denial logging. So the spec contradicts itself: the overview
row promises what the behavior doc gave up.

**C3.4 The bare route has the same gap, by type — CONFIRMED.** `guardRoute`'s handler is
`Effect<B, never, R>` (`GuardRoute.ts:59`), so a handler-side `guard` must catch its own failure.
`examples/http-advanced/server.ts:185-203` does, with `toResponse` (`:202`), which "logs nothing"
(overview's `toResponse` row). `addGuardedRoute` has the same handler type
(`PermissionRegistry.ts:193-196`).

**C3.5 Overlap — CONFIRMED.** ARCH-36 C12 (`ARCH-36-guarded-httpapi.md:73`, `:179-183`) defers this to
ARCH-45 and sets the rule: **ARCH-45's tap lands first**; ARCH-36 T5 then moves `enforce` verbatim.

### I4 — `@qadi/promise` cancellation

**C4.1 The claim — CONFIRMED.** `packages/promise/src/index.ts:136-146`: "No cancellation crosses this
boundary … This is a platform limit … and there is no workaround through this API".

**C4.2 The API exists — CONFIRMED.** `effect@4.0.0` `ManagedRuntime.d.ts:161`:
`runPromise: <A, E>(effect, options?: Effect.RunOptions) => Promise<A>`; `Effect.d.ts:16499-16504`:
`interface RunOptions { readonly signal?: AbortSignal | undefined; … }`.

**C4.3 It works for a facade-shaped call — CONFIRMED by probe.** `promise-signal-probe.mts` runs core's
`filter` over 50 items with a 20 ms resolver through one `ManagedRuntime`:

```
no signal: lookups = 50
signal: rejected after 103 ms; lookups = 4 ; error: Error | name: Error | message: All fibers interrupted without error
lookups 300ms after abort (work stopped?): 4
pre-aborted: rejected; lookups = 0 ; error: Error All fibers interrupted without error
```

The rejection is effect's squashed interrupt (`Error("All fibers interrupted without error")`), not
`signal.reason`.

**C4.4 Forwarding decides nothing — CONFIRMED.** Passing `{ signal }` is a second argument to the same
`runPromise`; no branch reads it (AGENTS.md §14, ADR-QD-032, BEH-QD-169). Mapping the rejection to
`signal.reason` would be a branch (D-45-f).

**C4.5 Where the claim is repeated — CHECKED.** Only the source comment. `spec/behaviors/22-promise-facade.md`,
`packages/promise/README.md` and `apps/website/src/content/docs/docs/packages/promise.md` say nothing
about cancellation (`grep -in "cancel\|abort"` → nothing). INV-QD-026 (`spec/invariants.md:970-976`)
says the facade "rejects exactly when the core fails", which an abort would contradict as worded.

### I5 — `DecisionCache.getOrCompute` claim window

**C5.1 The window — CONFIRMED.** `packages/core/src/DecisionCache.ts:361-367` reads `entries` (the hit
check) as one step; the claim against `inFlight` is a later, separate `Effect.sync`
(`:399-418`) inside `Effect.uninterruptibleMask` (`:386`). A fiber can be preempted between them: the
run loop yields when `scheduler.shouldYield` fires at any loop turn
(`effect/dist/internal/effect.js:455-461`).

**C5.2 The consequence — CONFIRMED by probe (the review said "not reproduced").** If the owner's
`onExit` runs in the window (it sets `entries[K]` and removes `inFlight[K]`), the waiting fiber claims
`K` afresh, computes again, and on success appends `K` to `insertionOrder` a second time
(`:491-492`). `insertionOrder` then holds `K` twice while `entries` holds it once, so the
"`Chunk.size(insertionOrder) === HashMap.size(entries)` always" comment (`:501-505`) is false, and a
later pop of the stale `K` evicts a **freshly recomputed** `K`. `cache-race-probe.mts` (capacity 2;
owner B computes `K`; A asks `K` after `gap` yields; then asks `X`, `Y`, `K`, `K`; correct FIFO ends
`…,miss,hit`):

```
OPS=4  {"gap":7,"b":"miss","a":"miss","raced":true,"followOn":"miss,miss,miss,miss","sizeAfterK2":2}
OPS=4  {"gap":8,"b":"miss","a":"miss","raced":true,"followOn":"miss,miss,miss,miss","sizeAfterK2":2}
racing gaps per budget at HEAD: OPS=3:1  OPS=4:2  OPS=5:1  OPS=6:1  OPS=7:0  OPS=8:0  OPS=64:0  OPS=2048:0
```

`K` is computed twice (`a: "miss"`), and the final ask of `K` misses where FIFO says hit.

**C5.3 Reachability at the default budget (2048) — UNVERIFIED.** `cache-race-default-budget.mts`
burns 0…4200 ops on the asking fiber before it asks; 0 of 4201 runs raced. The run loop checks
`shouldYield` only at loop turns, and inline continuations (`succeedWith`, `:513`) skip it, so the
window's turns are few. It is reachable in principle (a fiber whose op count crosses 2048 exactly
there), and `References.MaxOpsBeforeYield` is a public knob a host may lower.

**C5.4 A fix removes it — CONFIRMED by probe.** `fixed/DecisionCache.fixed.ts` moves the hit check
into the claim's `Effect.sync` (one synchronous step reads `entries`, then `inFlight`, then claims).
`cache-race-probe-fixed.mts` races 0 gaps at every budget 3–8 and 64.

**C5.5 Unbounded mode — CHECKED.** With no `capacity`, the race costs one redundant compute and a
second `miss` count; `entries` is overwritten, `insertionOrder` is not written (`:491`).

### I6 — `decideSubjects` and `concurrency`

**C6.1 Settled — both statements were half right; no defect.** At HEAD `decideSubjects`
(`SubjectSet.ts:168-180`) is `Effect.forEach` with no `concurrency` over `decideSubject(policy, subject, options)`:
subjects run one at a time, and `options` (with `concurrency`) reaches each subject's `evaluate`,
where it fans out that subject's composite children (`Evaluate.ts:163`, `:249`). So "passes
concurrency per subject" (wave 3) is true, and "ignores `options.concurrency`" (wave-4 walker) is false
as worded; "runs subjects one at a time" is true. The doc says exactly this (`SubjectSet.ts:159-161`)
and BEH-QD-108 requires it. ARCH-29 C3.3 settled it with a probe and T5 pinned it:
`pnpm vitest run packages/core/test/SubjectSet.test.ts -t "concurrency applies within"` → 1 passed.

**C6.2 `Qadi.filter`'s fan-out — CONFIRMED, different function, documented.** `Qadi.ts:351-357`
gives `concurrency` "double duty" across items; `Qadi.ts:380-382` passes it to `Effect.forEach`. The
two siblings differ on purpose (`SubjectSet.ts:163-166`; ARCH-29 D-29-f = A). No task.

### I7 — Wave-3 orphan findings (`.planning/architecture/README.md:658-665`)

| Orphan | At `e635e68` | Evidence | Owner |
| ------ | ------------ | -------- | ----- |
| `PolicyExplorer.tsx:66` re-declares depth `64` | **FIXED** | `PolicyExplorer.tsx:21` imports `DEFAULT_MAX_DEPTH`; `:228`, `:235` use it; `grep -nw 64 packages/devtools/src` finds only `Remedies.ts:269` (an unrelated length) | — |
| ADR document IDs wrong (094 → 901, 095…097 → 902…904) | **STILL TRUE for 095–097** (094 fixed by ARCH-21, CCR-QD-198) | scan over `spec/decisions/[0-9]*.md` comparing `Document ID` to the file number → exactly three mismatches: `095 → QADI-ADR-902`, `096 → QADI-ADR-903`, `097 → QADI-ADR-904` (60 of 84 ADRs carry a Document ID) | **T11** |
| ARCH-07's `writesWriteFailed` has no log line | **STILL TRUE** | `AuditDecisionSinkLive.ts:228-232`: `Metric.update(writesWriteFailed, 1)` only | **ARCH-35 T2** (its C7 found it worse: two of three `write_failed` leaves are unrecoverable). Not duplicated here |
| `TraceSchema` encode/decode overflow ≈936/741; is `@qadi/react`'s dehydrate guarded? | **REFUTED as an exposure** | Dehydrate never runs `TraceSchema`: `HydrationEngine.ts:185-197` copies `encodeDecision`'s plain object (`DecisionWire.ts:77-99`, no Schema encode). Hydrate is guarded: `HydrationEngine.ts:331`, `:372` run `exceedsJsonDepth(…, MAX_DECODE_DEPTH)` and `MAX_DECODE_DEPTH = 256` (`Policy.ts:978`) < 741. The sink path refuses a trace deeper than 256 before encoding (`SinkCodec.ts:451-455`) | — |
| `check-house-style.mjs:438,442` stale error-tag counts | **FIXED** | ARCH-27 T4 is `[x] done (2026-10-07)` (`ARCH-27-*.md:398`); a count-word grep over the script finds none | — |
| `features/node_modules` lacks `@qadi/http` | **FIXED (environment)** | `features/node_modules/@qadi/http → ../../../packages/http` (2026-10-07 14:31) | — |

### I8 — *(new)* Off-fiber hydration counts and a host-wired registry

**C8.1 effect 4.0.0 looks the registry up per update — CONFIRMED.** `effect/dist/Metric.js:174-193`
(`hook`): the key is memoised per metric object, but "The registry owns the series, so it is looked up
on every update" (`Context.get(context, MetricRegistry)`). The release-candidate behaviour the repo
documents (hooks memoised on the metric at first touch, so the first registry owns it) is gone.

**C8.2 Writer and reader diverge — CONFIRMED by probe.** `@qadi/react` writes hydration counts off
fiber into `Context.empty()` (`packages/react/src/HydrationCounts.ts:45`, `:54`, `:67`), which is
the default registry. `@qadi/devtools` reads them with `Metric.value` on its fiber
(`packages/devtools/src/model/Hydration.ts:99-103`), which is whatever registry the host wired.
`../ARCH-42/offfiber-registry-probe.mts`:

```
host before: {"count":0,"incremental":false}
host after off-fiber +3: {"count":0,"incremental":false}
default registry after: {"count":3,"incremental":false}
```

**C8.3 The guarantee was written down — CONFIRMED.** ADR-QD-052
(`spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md:141-146`): "a writer and a
reader sharing one metric object cannot diverge whatever a host wires". The same stale mechanism is
stated in `HydrationCounts.ts:15-27`, `packages/core/src/Evaluate.ts:43-50` (its conclusion still
holds: rebuilding the tagged wrapper per call recomputes the key), `packages/core/test/HydrationMetrics.test.ts:10-16`,
`packages/devtools/test/model/Hydration.test.ts:11`, `packages/react/test/HydrationCounts.test.ts:9`,
`examples/nextjs-newsroom/app/edge/double-count/page.tsx:15-16`, and `packages/core/test/helpers.ts:96-108`
(ARCH-42 owns that last one). `../ARCH-42/metric-isolation-probe.mts` shows a fresh registry alone now
isolates a metric first touched elsewhere (`fresh registry before update (expect 0 0): 0 0`).

## 2. Goal and success criteria

Each item makes one **interface** honest at its own **seam**:

- **I1.** A port description's `key` becomes a law, not a convention: a request key is injective over
  every argument the port receives. The **locality** of "what makes two requests the same question"
  stays one function per description, and a conformance property checks the law for all five, so
  ARCH-31's derived wire codec inherits it.
- **I2.** Field-set equality joins the **module** that owns field-set meaning, `FieldLattice.ts`,
  beside `intersectFields`/`unionFields`/`mergeFields`. `diffTraces` stops restating a weaker rule.
- **I3.** A denial turned into a response leaves one server-side record on every surface, whichever
  step raised it; the overview row and BEH-QD-321 say the same thing.
- **I4.** The facade forwards one more thing it was already able to forward, and stops claiming it
  cannot.
- **I5.** `getOrCompute`'s hit check, join and claim are one synchronous step, so "a key is inserted
  once per compute that nobody else answered" holds by construction.
- **I7.** Every ADR's Document ID matches its number, and a gate keeps it so.
- **I8.** Hydration counts are written and read in one registry by construction again.

Success criteria:

**I1**
1. `relationshipResolverPort.key` differs for `depth: 1` and `depth: 3`; `customPredicatePort.key`
   differs for two resources and for two subjects with one id and different roles/permissions/attributes.
2. A property in `PortConformance.test.ts` ("a request key is injective over the request"): for every
   registry row, two argument tuples that differ in exactly one field produce different keys, and two
   structurally equal tuples (including `Set` order and object key order) produce the same key.
3. `Capture.test.ts` gains the three probe scenarios (a), (b), (c) as tests; replay equals live in each.
4. `grep -n "does not arise in practice" packages/devtools/src/model/Capture.ts` → nothing.

**I2**
5. `diffTraces` reports no `FieldsChanged` for `["title"]` vs `["title.**"]` or for
   `["address.**","address.street"]` vs `["address.**"]`, and still reports one for `["a"]` vs `["a.*"]`,
   `[]` vs `undefined`, `["a"]` vs `["b"]`.
6. A FastCheck property: `sameVisibleFields(a, b) ⇒ project(data, a)` deep-equals `project(data, b)` for
   generated `data` (soundness: never hides a real change).

**I3**
7. A `RequirePermission`-guarded handler whose own `guard` denies yields the 403 **and** exactly one
   `logDenial` line; an edge denial still yields exactly one line (no double log).
8. Under D-45-d = A, the same holds for `guardRoute`/`addGuardedRoute`, and
   `examples/http-advanced/server.ts` drops its own `catchTag`.
9. `spec/overview.md`'s `logDenial` row and BEH-QD-321 agree (`grep -n "on every surface" spec/overview.md`
   still 1 hit, and BEH-QD-321 states the handler case).

**I4**
10. `makeQadi(layer).filter(subject, policy, items, { signal })` rejects when `signal` aborts and stops
    issuing lookups; a pre-aborted signal issues none; an unaborted signal changes nothing.
11. `grep -n "no workaround through this API" packages/promise/src/index.ts` → nothing.

**I5**
12. A red-first test racing a joiner against an owner's completion under
    `Scheduler.MaxOpsBeforeYield` ∈ {3,4,5,6} over gaps 0…12 never computes a key twice and keeps
    FIFO order; the DecisionCache suite is otherwise unchanged and green.

**I7**
13. The three Document IDs read `QADI-ADR-095/096/097`, and `bash spec/scripts/verify-traceability.sh --strict`
    fails if any ADR's Document ID disagrees with its file number (shown red on a scratch edit).

**I8**
14. A test writes a hydration count off fiber and reads it through devtools' hydration model run under a
    host-provided `MetricRegistry`; the count is visible (red today).
15. No file states the release-candidate memoisation mechanism:
    `git grep -n "memoises its hooks\|first registry to reach" -- packages spec examples` → only history blocks.

**All items:** `pnpm check` passes on each item's branch on its own.

## 3. Non-goals

- **Changing `key`'s type** (string → structural `Equal` value). D-45-b keeps strings.
- **Giving devtools' Fixtures mode a custom-predicate vocabulary.** `SimulationSource.ts:131-137`
  declines it; ARCH-42 may revisit.
- **Cross-subject concurrency in `decideSubjects`** (I6; ARCH-29 D-29-f).
- **Moving `enforce` or reshaping guarded HttpApi registration** — ARCH-36.
- **Mapping an aborted facade call to `signal.reason`** unless D-45-f chooses B.
- **Closing the `DecisionCache` issue-#64 interrupt gap** (`DecisionCache.ts:327-349`); a separate,
  already-documented open question.
- **The audit `write_failed` log** — ARCH-35 T2.
- **Scoping metrics per test** — ARCH-42 (the `isolatedMetrics` helpers).
- **Publishing.** Changesets only.

## 4. Constraints

- **AGENTS.md §1.** `effect/*` namespace imports; `.ts` relative imports; cross-package named imports
  from the root. I5's test imports `* as Scheduler from "effect/Scheduler"`.
- **§2/§3, ADR-QD-094.** I1 changes two descriptions' `key` fields only; no wrapper, default or double
  is hand-written. `PortDescription`'s type is unchanged.
- **§4.** No new error class; `SCHEMA_ERROR_BUDGET` unchanged.
- **§5.** No new `Effect.fnUntraced`; `UNTRACED_BUDGET` unchanged. A canonical key encoder is a plain
  synchronous function (it is called from `key`, which is synchronous).
- **§5a.** No `switch`; `SWITCH_BUDGET` unchanged. The key encoder dispatches on value kind with
  `if` over `Predicate` guards (no `_tag`), or `Match.value` if it reads better.
- **§6.** No `as`/`!`/`any`; no `Date.now`. Probes used `as never`; tests must not. `PORT_DOUBLE_BUDGET`:
  every broken port in new tests is `scriptedPort(...)`; I1's traversing resolver and custom predicate
  are answering doubles (`Layer.succeed(RelationshipResolver, …)`), which construct no port error, so
  no file joins the budget. `HAS_CUSTOM_BUDGET` is src-scope; `hasCustom` in `packages/*/test` is free.
- **§14 / ADR-QD-032 / BEH-QD-169.** I4 adds no conditional to `@qadi/promise`. Destructuring
  `options` into `signal` and the rest is not a branch.
- **§9 / ADR-QD-099.** I2's `sameVisibleFields` is exported through `Decision.ts`'s existing re-export of
  `FieldLattice.ts` (D-45-c), so it is root surface, and gate 13 (`check-api-surface.mjs`) wants a row.
- **§11/§15.** Spec changes ship with code; gate 9 (`check-doc-examples.mjs`) compiles any new
  `typescript` fence; gate 13 checks new exports; gate 10 (`verify-traceability.sh`) checks BEH/INV
  traceability and, after T11, ADR Document IDs.
- **ADR-QD-037 (madge, `pnpm circular`).** `TraceDiff.ts` gains a direct import of `FieldLattice.ts`
  (`Decision.ts` already imports it; `FieldLattice.ts` imports neither). No other new edge.
- **ADR-QD-101.** `TraceOracle.ts`'s `oracleDiffTraces` is changed in the same commit as T4, with the
  reason in its header.
- **ARCH-36's ordering rule** (its §4): I3's tap lands **before** ARCH-36 T5; if ARCH-36 T5 landed
  first, apply the tap where `enforce` now lives (`RequirePermissionMiddleware.ts`).
- **Mutation.** `stryker.config.mjs` (core), `stryker.http.mjs`, `stryker.devtools.mjs` and
  `stryker.react.mjs` cover the changed modules; `@qadi/promise` has no Stryker config (coverage holds
  it). Each new guard needs a killing test. Do not run Stryker locally while sibling agents run.

## 5. Decisions needed before work starts

### D-45-a — What a request key covers (I1)
- **A. Every argument the port receives.** Relationship adds the clamped `depth` (`null` when
  `undefined`); custom predicate adds the resource and the whole subject (id, roles, permissions,
  attributes), canonically encoded (D-45-b). State the law on `PortDescription.key`
  (`PortDescription.ts:107-114`) and in ADR-QD-094; a conformance property enforces it for all five.
  Observable change: two descriptions' key strings change, and `CapturedAnswers` (exported) keys with
  them. No type changes.
- **B. Relationship `depth` only** (the review's finding). Leaves C1.5's stale allow in place.
- **C. Keep the keys; drop the capture in `SimulationSession` on any subject or resource edit.** Fixes
  the session but not the same-run collision (C1.3 (a)), and defeats `Snapshot`, whose point is
  replaying across edits.
- **Recommendation: A.** The doc comment's reason for excluding `depth` ("fuel, not part of the
  question") is refuted by the resolver contract on the same page.
- **Needs user sign-off:** yes — an observable value of a public export changes (key strings), pinned by
  `PortConformance.test.ts`; no type change, 0.x minor.
- `status: decided (2026-10-08, recommended default: A (every argument the port receives))`

### D-45-b — How the custom-predicate key encodes the subject and resource (I1)
- **A. A canonical JSON tuple.** A package-private `canonicalKey(value)` in `PortDescription.ts` (or a
  new `PortKey.ts`) that writes a `Set` as its sorted members, an object with sorted keys, and otherwise
  defers to `JSON.stringify`. Throws on what `JSON.stringify` throws on (circular, `BigInt`), which the
  key's doc already routes to the port's typed error (`PortDescription.ts:108-113`).
- **B. `JSON.stringify` of the raw subject.** `JSON.stringify(new Set([...]))` is `"{}"`, so roles and
  permissions would vanish from the key: wrong.
- **C. Change `key` to return an `Equal` value and key captures by `HashMap`.** Type change to
  `PortDescription` and `CapturedAnswers`; breaking for nothing A cannot do.
- **Recommendation: A.**
- `status: decided (2026-10-08, recommended default: A (canonical JSON tuple, `canonicalKey` in package-private `PortKey.ts`))`

### D-45-c — Where field-set equality lives, and whether it is public (I2)
- **A. `sameVisibleFields(a: VisibleFields, b: VisibleFields): boolean` in `FieldLattice.ts`,
  re-exported by `Decision.ts` beside `intersectFields`/`unionFields`/`mergeFields`.** Defined as mutual
  containment: `undefined` equals only `undefined`; otherwise every spec in `a` is contained
  (`Equal` or `ALessB`) in some spec of `b`, and vice versa. Sound (never equal when projections can
  differ) and conservative (a set covered only by a union of specs still reads as changed). One
  overview row.
- **B. The same function, package-private** (imported by `TraceDiff.ts` only).
- **Recommendation: A.** It is the lattice's own law next to its operations; ARCH-32's "decision agrees
  with its trace" check must **not** use it (there the two copies must be byte-equal), and naming it
  publicly makes that distinction explicit.
- `status: decided (2026-10-08, recommended default: A (`sameVisibleFields` public, re-exported by `Decision.ts`; one overview row))`

### D-45-d — What happens to a denial a handler's own guard raises (I3)
- **A. The surface that turns it into a response logs it, once.** `RequirePermission`: a
  `tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenial)` on `httpEffect` **only** (inside `enforce`, before
  the projection), so an edge denial, already logged by `authorizeRequest`, is never logged twice.
  `guardRoute`/`addGuardedRoute`: widen the handler's error channel to `HttpEnforcementFailure` (an
  input widening; every existing `never` handler still type-checks), apply the same tap to the handler,
  and answer through the existing `catchTag` → `toResponse`. The log line carries a
  `qadi.denial_site: "handler"` annotation (edge lines get `"edge"`), so the record says where it came
  from. Amends BEH-QD-321 and reverses ARCH-19 D-19-d's trade-off.
- **B. Correct the overview row only.** Keep D-19-d; `:584` says "on the edge step". Honest, but a
  defense-in-depth denial stays invisible server-side.
- **C. Log in `@qadi/core`'s `guard`.** Core has no notion of a response; every edge denial would log
  twice.
- **Recommendation: A.**
- **Needs user sign-off:** yes — reverses a recorded decision (ARCH-19 D-19-d); not breaking (new log
  line; handler type widened on input).
- `status: decided (2026-10-08, recommended default: A (the surface logs a handler-raised denial once; `qadi.denial_site` annotation; handler error channel widened to `HttpEnforcementFailure`; the helper `logDenialAt` lives in a package-private `DenialLog.ts` rather than `QadiHttpError.ts` so the public surface grows by nothing))`

### D-45-e — The facade's cancellation interface (I4)
- **A. Each call's options gain `signal`.** `export interface FacadeOptions extends EvaluateOptions { readonly signal?: AbortSignal | undefined }`;
  `check`/`decide`/`assert`/`filter` take `FacadeOptions`; `run` passes `{ signal }` to
  `runtime.runPromise`. Additive.
- **B. A wrapper, `withSignal(qadi, signal)`.** One signal for many calls; a second facade shape.
- **C. Fix the comment only** (say `@qadi/core` + `runFork` is the way).
- **Recommendation: A.** It matches the platform's own convention (`fetch(url, { signal })`).
- `status: decided (2026-10-08, recommended default: A (`FacadeOptions` with `signal` on each call))`

### D-45-f — What an aborted call rejects with (I4)
- **A. Whatever `runPromise` rejects with** (today `Error("All fibers interrupted without error")`).
  Documented; tests assert "rejects" and "no more lookups", not the message.
- **B. `signal.reason`.** Needs a `catch` that tests `signal.aborted`: a branch in the facade, which
  AGENTS.md §14 treats as a defect on sight.
- **Recommendation: A.**
- `status: decided (2026-10-08, recommended default: A (whatever `runPromise` rejects with))`

### D-45-g — ADR Document IDs (I7)
- **A. Fix the three, and make gate 10 (`verify-traceability.sh`) refuse a mismatch.**
- **B. Fix the three only.** The 094 slip was found by accident in ARCH-21; this would be the second.
- **Recommendation: A.**
- **Gate change:** adds a check inside an existing gate; `pnpm check`'s step list and the DoD table
  (`check-dod-table.mjs`) are unchanged. Flag for the user.
- `status: decided (2026-10-08, recommended default: A (fix the three IDs and gate them in `verify-traceability.sh`, check 3a))`

### D-45-h — Which registry hydration counts live in (I8)
- **A. Pin both ends to the default registry.** The writer already uses `Context.empty()`; the reader
  (`devtools/src/model/Hydration.ts`) reads the five hydration metrics with
  `metric.valueUnsafe(Context.empty())` (a method on every v4 `Metric`, `Metric.d.ts:108`) inside `Effect.sync`, so the two agree whatever a host
  wires. Amend ADR-QD-052's paragraph to the true reason; document that a host exporting from its own
  registry must export these from the default one.
- **B. Thread a registry.** `dehydrateDecisions`/`hydrateDecisions` take `options.metrics?: Context.Context<never>`
  and the provider passes its runtime's. Reintroduces exactly the divergence (writer and reader handed
  different contexts) the ADR set out to rule out.
- **Recommendation: A.**
- `status: decided (2026-10-08, recommended default: A (pin both ends to the default registry; reader uses `valueUnsafe(Context.empty())`))`

## 6. Tasks

Branches: I1 = T1→T2 (+T14a); I2 = T3→T4 (+T14b); I3 = T5→T6 (+T14c); I4 = T7→T8 (+T14d);
I5 = T9→T10 (+T14e); I7 = T11 (+T14f); I8 = T12→T13 (+T14g). Each runs T15 before merging.

### T0 — Re-baseline
- **Status:** [x] done (2026-10-08) (the reds in T1/T3/T5/T7/T9/T12 re-observed the probes' findings; every cited line held at `ce6d248`; ARCH-36 T5 had not landed, so I3's tap is in `RequirePermission.ts`)
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch-45/<item> main` (one branch per item: `replay-keys`, `field-equality`,
     `handler-denial-log`, `promise-signal`, `cache-claim`, `adr-ids`, `hydration-registry`).
  2. Re-run every probe in §1's table with its command; each output must match §1. If `main` has moved,
     re-check the cited lines and correct this plan first.
  3. `git log --oneline main -- packages/http/src/RequirePermission.ts` — if ARCH-36 T5 landed, I3's tap
     goes into `RequirePermissionMiddleware.ts` instead (§4).
- **Tests:** none
- **Verify:** probe outputs as in §1
- **Done when:** every §1 claim is re-observed or the plan corrected.

### T1 — Red: request keys that confuse two questions (I1)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0 (valid under every D-45-a option except C)
- **Files:** `packages/core/test/PortConformance.test.ts`; `packages/devtools/test/model/Capture.test.ts`
- **Steps:**
  1. In `PortConformance.test.ts`'s `describe("request keys tell apart the questions a capture must not confuse")`
     (`:503`), add:
     - `it("a relationship is keyed by depth too")`: keys for `depth: 1`, `depth: 3`, `depth: undefined`
       are pairwise different.
     - `it("a custom predicate is keyed by its resource")`: `["isOwner", alice, {id:"doc-1"}, undefined]`
       vs `{id:"doc-2"}` differ.
     - `it("a custom predicate is keyed by the whole subject, not its id")`: `alice` vs
       `makeSubject({ id: "alice", roles: ["editor"], … })` differ; and two subjects equal up to `Set`
       insertion order (`roles: ["a","b"]` vs `["b","a"]`) give the **same** key.
  2. In `Capture.test.ts`'s `describe("capture fidelity — INV-QD-043")` (`:75`), add three tests from
     §1's probes, each asserting `diffTraces(live.trace, replayed.trace)` is `[]` and the tags match:
     - "a policy asking one relation at two depths replays as it ran" (C1.3 (a), a `Layer.succeed(RelationshipResolver, …)` answering by `request.depth`);
     - "a capture for one resource does not answer another" (C1.5 (b), custom predicate by `resource.id`);
     - "a capture does not answer a what-if that changed the subject's roles" (C1.5 (c)).
  3. Update the pinned strings at `:478-486` to the D-45-a/b shape (red until T2).
  4. Run; all new cases are red. Commit as `it.fails` only if T2 lands separately.
- **Tests:** 3 conformance cases, 3 capture-fidelity cases, 2 pinned strings
- **Verify:** `pnpm vitest run packages/core/test/PortConformance.test.ts packages/devtools/test/model/Capture.test.ts` (expect exactly the new cases red)
- **Done when:** the red set is observed and recorded in the PR body.

### T2 — Keys injective over the request; the law stated and enforced (I1)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1; D-45-a; D-45-b
- **Files:** `packages/core/src/PortDescription.ts` (`key` doc, and `canonicalKey` if it lives here);
  `packages/core/src/RelationshipResolver.ts` (`:166-172` doc, `:179`);
  `packages/core/src/CustomPredicate.ts` (`:100-107` doc, `:128`); `packages/core/src/PortDoubles.ts`
  (`replyTable` doc `:91-96`); `packages/devtools/src/model/Capture.ts` (`:52-67`);
  `packages/core/test/PortConformance.test.ts`
- **Steps (A/A):**
  1. Add package-private `canonicalKey(value: unknown): string` (not in the barrel; if it gets its own
     module, `PortKey.ts`, keep it out of `index.ts`). `Set` → sorted array of canonical members; plain
     object → entries sorted by key; arrays in order; everything else as `JSON.stringify` would write
     it. Use `value instanceof Set` and `Predicate.isObject`
     (both narrow without `as`; `effect/Predicate` has no `isSet` at 4.0.0).
  2. `relationshipResolverPort.key` → `JSON.stringify([request.subjectId, request.relation, request.resourceId, request.depth ?? null])`.
     Rewrite the doc: depth is part of the question because a traversing resolver must honour it
     (`:31-50`).
  3. `customPredicatePort.key` → `canonicalKey([subject.id, name, params, resource ?? null, { roles: subject.roles, permissions: subject.permissions, attributes: subject.attributes }])`
     (subject id first so the "subject in every key" rule stays visible). Rewrite `:100-107`.
  4. `PortDescription.key`'s doc (`:107-114`): state the law — "injective over every argument the port
     receives: two requests share a key only if every argument is structurally equal" — keep the
     throwing note.
  5. Add the property `it.prop("a request key is injective over the request")` iterating
     `forEveryPort`/`PORTS`: per port, an arbitrary for its args, and a mutation that changes exactly one
     field; assert keys differ; assert two independently built equal tuples share a key.
  6. Delete `Capture.ts:59-63`'s "not by the resource … does not arise in practice" sentence; say the
     keys are injective (ADR-QD-094) instead.
  7. T1 goes green.
- **Tests:** T1's set green; 1 new property
- **Verify:** `pnpm vitest run packages/core/test/PortConformance.test.ts packages/core/test/PortDescription.test.ts packages/devtools/test/model/Capture.test.ts packages/devtools/test/model/SimulationSession.test.ts packages/devtools/test/model/WhatIf.test.ts`;
  `pnpm tsc -b packages/core packages/devtools`; `node scripts/check-house-style.mjs`; `pnpm circular`
- **Done when:** all green, and `grep -n "not by \`depth\`" packages/core/src/RelationshipResolver.ts` → nothing.

### T3 — Red: equivalent field sets reported as changed (I2)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0
- **Files:** `packages/core/test/TraceDiff.test.ts`; `packages/core/test/FieldLattice.test.ts`
- **Steps:**
  1. `TraceDiff.test.ts`: `it.effect("one field set spelled two ways is not a change")` — evaluate
     `hasRole("r",{fields:["title"]})` and `{fields:["title.**"]}` for a subject holding `r`; assert no
     `FieldsChanged`. Same for `["address.**","address.street"]` vs `["address.**"]`, and for a reorder
     with a duplicate (`["a","a","b"]` vs `["b","a"]`).
  2. Keep, and name, the negatives that must still report: `["a"]` vs `["a.*"]`; `["address.*"]` vs
     `["address.street"]`; `[]` vs `undefined`; `["a"]` vs `["b"]`.
  3. `FieldLattice.test.ts`: the soundness property, red only in the sense that `sameVisibleFields`
     does not exist yet (compile error) — commit with T4.
- **Tests:** 3 red examples, 4 green negatives
- **Verify:** `pnpm vitest run packages/core/test/TraceDiff.test.ts`
- **Done when:** the three examples are red for the stated reason.

### T4 — `sameVisibleFields` in the lattice; `diffTraces` uses it (I2)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3; D-45-c
- **Files:** `packages/core/src/FieldLattice.ts`; `packages/core/src/Decision.ts` (re-export list);
  `packages/core/src/TraceDiff.ts` (`:126-152`, `:275`); `packages/core/test/TraceOracle.ts`
  (`:47-59` and header); `packages/core/test/FieldLattice.test.ts`; `packages/core/test/TraceDiff.test.ts`
- **Steps (A):**
  1. In `FieldLattice.ts`, add `sameVisibleFields`: `undefined` equals only `undefined`; otherwise shape
     both sides once (`shapeOf`) and check mutual containment with `compareShapes` (`Equal` or
     `ALessB` from the covered side). Doc: sound, conservative, why not union-coverage.
  2. Re-export from `Decision.ts` where `intersectFields`/`unionFields`/`mergeFields` are re-exported.
  3. `TraceDiff.ts`: delete `sameFields`; call `sameVisibleFields` at `:275`. `sameStringSet` stays only
     if something else uses it (today nothing: obligations use `sameObligationSet`), else delete it.
     `FieldsChanged.before/after` keep the authored text.
  4. `TraceOracle.ts`: change `oracleDiffTraces`'s field comparison to the same rule and add one
     header sentence: "Changed in ARCH-45 T4 on purpose: field equality is the lattice's
     (`sameVisibleFields`), not text."
  5. `FieldLattice.test.ts`: property "`sameVisibleFields(a,b)` ⇒ `project(data,a)` deep-equals
     `project(data,b)`", with spec arbitraries over a small segment alphabet (`a`,`b`,`street`) plus
     `*`/`**` terminals, and data arbitraries of nested objects over the same keys; plus
     reflexivity/symmetry examples.
- **Tests:** T3 green; 1 property; the TraceDiff stack-safety and oracle-agreement properties stay green
- **Verify:** `pnpm vitest run packages/core/test/TraceDiff.test.ts packages/core/test/FieldLattice.test.ts packages/core/test/RenderTrace.test.ts packages/devtools/test/model/WhatIf.test.ts`;
  `node scripts/check-api-surface.mjs` (after T14b's row); `pnpm circular`
- **Done when:** green, and `grep -n "sameFields" packages/core/src` → nothing.

### T5 — Red: a handler-raised denial leaves no record (I3)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0
- **Files:** `packages/http/test/http.test.ts` (`describe("RequirePermission's scopes around the handler (characterization)")`, `:946`);
  its `guardRoute` cases; `packages/http/test/GuardRoute.tst.ts` (type test)
- **Steps:**
  1. Next to "a handler-raised denial is still projected to its redacted wire value", add
     "a handler-raised denial is logged once, as the handler's": build the web handler with
     `appLayerWithLogger(logs)`'s pattern over `ProbeLayer`, request `/probe/raise`, assert status 403
     and `logs` deep-equals one `logDenial` line. Red: `logs` is `[]`.
  2. Add "an edge denial is still logged exactly once" over the same layer with a token that fails the
     edge policy: exactly one line (guards against T6 double-logging).
  3. Under D-45-d = A: a `guardRoute` test whose handler returns `guard(...)(…)` **without** its own
     `catchTag` — today a compile error (handler error must be `never`), so write it as a type test in
     `packages/http/test/GuardRoute.tst.ts` expecting acceptance (red), plus the runtime 403 + one log line.
- **Tests:** 2 runtime cases (1 red), 1 type case (red under A)
- **Verify:** `pnpm vitest run packages/http/test/http.test.ts`; `pnpm test:tstyche`
- **Done when:** exactly the expected cases are red.

### T6 — Log a denial where it becomes a response (I3)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T5; D-45-d
- **Files:** `packages/http/src/RequirePermission.ts` (`:387-421`); `packages/http/src/GuardRoute.ts`
  (`:50-78`); `packages/http/src/PermissionRegistry.ts` (`:185-199`, handler type);
  `packages/http/src/QadiHttpError.ts` (`logDenial`, `:440-455`); `packages/http/src/AuthorizeRequest.ts`
  (`:49-51`, `:93-97` comments, annotation); `examples/http-advanced/server.ts` (`:185-203`)
- **Steps (A):**
  1. `logDenial` gains no parameter. Add the annotation at the two call sites:
     `authorizeRequest`'s tap → `Effect.annotateLogs({ "qadi.denial_site": "edge" })`; the new handler
     tap → `"handler"`. (A string literal pair, closed by a `type DenialSite = "edge" | "handler"` const
     in `QadiHttpError.ts`.)
  2. `enforce`: wrap only the handler —
     `Effect.provideService(httpEffect, CurrentSubject, subject).pipe(Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logHandlerDenial))`
     — before the outer `catchTag`. Rewrite `:400-406`'s comment.
  3. `guardRoute`: handler type `Effect<B, HttpEnforcementFailure, R>`; apply the same tap to
     `handler(authorized, resource)`; the existing `catchTag(HTTP_ENFORCEMENT_TAGS, toResponse)` answers
     both. Same widening on `addGuardedRoute`.
  4. `examples/http-advanced/server.ts`: delete the handler's own `catchTag` and its comment; check with
     `node_modules/.bin/tsc -p examples/http-advanced/tsconfig.json --noEmit` (not in any gate, ARCH-36 C15).
  5. T5 green; every existing exact-log test unchanged.
- **Tests:** T5 green; `http.test.ts`, `AuthorizeRequest.test.ts`, `QadiHttpError.test.ts`, decision-stream tests unchanged
- **Verify:** `pnpm vitest run packages/http/test`; `pnpm test:tstyche`; `pnpm tsc -b packages/http`;
  `node scripts/check-house-style.mjs`
- **Done when:** green; `git grep -n "catchTag" examples/http-advanced/server.ts` finds no handler-level catch.

### T7 — Red: an aborted facade call keeps running (I4)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0
- **Files:** `packages/promise/test/facade.test.ts`
- **Steps:**
  1. A slow attribute resolver (`Layer.succeed(AttributeResolver, { resolve: () => Effect.sleep("20 millis").pipe(Effect.as(5), Effect.tap(count)) })`)
     and 50 items. Test "filter stops when its signal aborts": abort after the first lookup is observed
     (a `Deferred`/counter, not wall time), assert the promise rejects and the lookup count stays below
     50 after a settle. Red: `options.signal` does not exist (type error) — commit with T8.
  2. "a pre-aborted signal performs no lookup"; "an unaborted signal changes nothing" (same result as no
     signal, for `check`, `decide`, `assert`, `filter`).
  3. Use `it.live` (real timers) or drive `TestClock` from inside the runtime; never `Date.now`.
- **Tests:** 3 cases
- **Verify:** `pnpm vitest run packages/promise/test/facade.test.ts`
- **Done when:** red for the stated reason.

### T8 — Forward the signal; correct the claim (I4)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T7; D-45-e; D-45-f
- **Files:** `packages/promise/src/index.ts`; `packages/promise/README.md`;
  `apps/website/src/content/docs/docs/packages/promise.md`
- **Steps (A/A):**
  1. Add `export interface FacadeOptions extends EvaluateOptions { readonly signal?: AbortSignal | undefined }`.
  2. `Qadi`'s four methods take `options?: FacadeOptions`.
  3. `run(subject, effect, signal)` → `runtime.runPromise(Effect.provideService(effect, CurrentSubject, subject), { signal })`.
     Each method: `const { signal, ...evaluateOptions } = options ?? {}` then the core call with
     `evaluateOptions`. No conditional.
  4. Replace `:136-146` with: cancellation crosses by `options.signal`; an aborted call rejects with the
     runtime's interruption error, not `signal.reason`; work underway is interrupted (the probe numbers
     as the example). Keep the note that `@qadi/core` + `runFork` remains for full control.
  5. README and website: one "Cancelling a call" paragraph with a compiled `typescript` fence (gate 23,
     `check-website-doc-examples.mjs`).
- **Tests:** T7 green; existing facade tests unchanged
- **Verify:** `pnpm vitest run packages/promise`; `pnpm tsc -b packages/promise`;
  `node scripts/check-website-doc-examples.mjs`; `node scripts/check-house-style.mjs`
- **Done when:** green; `grep -n "no workaround" packages/promise/src/index.ts` → nothing.

### T9 — Red: a joiner recomputes a key its owner just finished (I5)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0
- **Files:** `packages/core/test/DecisionCache.test.ts` (`describe("capacity")`, `:928`)
- **Steps:**
  1. Port `cache-race-probe.mts` into `it.effect("a joiner racing its owner's completion never recomputes the key, and FIFO stays exact")`:
     for each `budget` in `[3,4,5,6]` and `gap` in `0..12`, inside
     `Effect.provideService(Scheduler.MaxOpsBeforeYield, budget)` and a fresh
     `decisionCacheLayer({ capacity: 2 })`: fork owner `getOrCompute(K, compute("B", spin 3))`, yield
     `gap` times, fork joiner `getOrCompute(K, compute("A", 0))`, join both; assert `K` was computed
     once; then ask `X`, `Y`, `K`, `K` and assert outcomes `["miss","miss","miss","hit"]`.
     Build `K`/`X`/`Y` with `questionOf(subjectWith({id:"u-1"}), P.hasRole(…))`; the trace is a fixture
     `Trace` value (no `as`).
  2. Run: red at (4,7), (4,8) and one gap each at 3, 5, 6 (§1 C5.2). Record the failing pairs in the
     PR body; the exact pairs depend on effect's op accounting.
  3. Note in the test's comment that the red is scheduler-dependent and the green is not: a later effect
     that never yields there keeps it green for the right reason.
- **Tests:** 1 case (red)
- **Verify:** `pnpm vitest run packages/core/test/DecisionCache.test.ts -t "joiner racing"`
- **Done when:** red at HEAD with the recorded pairs.

### T10 — One synchronous step for hit, join and claim (I5)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T9 (no decision)
- **Files:** `packages/core/src/DecisionCache.ts` (`:361-428`, `:501-505` comment)
- **Steps:**
  1. Delete the hit check at `:363-367`. In the claim's `Effect.sync` (`:399-418`), read `entries` first:
     return `{ _tag: "Hit", trace }`; else join an `inFlight` entry (`{ _tag: "Joined", entry }`); else
     claim (`{ _tag: "Claimed", entry, generation }`). A `Data.TaggedEnum` or a local closed union.
  2. Dispatch on it with `Match.tagsExhaustive` built once at module scope? It closes over per-call
     values, so use `Match.valueTags` per call (a per-ask path, not per policy node; §5a allows it) —
     or keep `if` on `_tag` literals, which is not a `switch`.
  3. `Hit` updates the `hit` metric and returns before `uninterruptibleMask` matters (move the mask so
     the hit path does not pay for it, or accept the cost and say so).
  4. Rewrite the comment at `:369-385` to explain that the hit check is inside the claim step and why
     (this plan's §1 C5.2), and make `:501-505`'s invariant claim true as written.
  5. T9 green; run the probe `cache-race-probe.mts` against the change (point it at `src`): 0 racing gaps.
- **Tests:** T9 green; all of `DecisionCache.test.ts` (incl. both issue-#64 regression pins) unchanged
- **Verify:** `pnpm vitest run packages/core/test/DecisionCache.test.ts`; `pnpm tsc -b packages/core`;
  `node scripts/check-house-style.mjs`
- **Done when:** green; `grep -c "HashMap.get(entries, key)" packages/core/src/DecisionCache.ts` → 1, inside the claim step.

### T11 — ADR Document IDs, fixed and gated (I7)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0; D-45-g
- **Files:** `spec/decisions/095-sinkcodec-owns-both-directions.md`,
  `096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md`,
  `097-a-decision-log-is-a-sink-and-its-own-history.md` (Document Control table, `:7`, plus a Change
  History entry); `spec/scripts/verify-traceability.sh`
- **Steps (A):**
  1. Red first: in `verify-traceability.sh`, add a check — for each `spec/decisions/NNN-*.md` with a
     `Document ID` row, the ID must be `QADI-ADR-NNN`; print each mismatch and FAIL. Run
     `bash spec/scripts/verify-traceability.sh --strict`: 3 failures (095, 096, 097).
  2. Correct the three IDs; bump each revision with a Change History line
     "Document ID corrected from `QADI-ADR-90N` (ARCH-45, CCR-QD-NEXT)".
  3. Re-run: green. Then edit one ID in a scratch copy to see it fail, and revert.
- **Tests:** the gate is the test
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-dod-table.mjs`
- **Done when:** both pass and the scan in §1 I7 finds no mismatch.

### T12 — Red: a hydration count invisible to a host-wired registry (I8)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0
- **Files:** `packages/devtools/test/model/Hydration.test.ts`
- **Steps:**
  1. `it.effect("a hydration count written off-fiber is read whatever registry the host wired")`:
     `hydrationSeededTotal.updateUnsafe(3, Context.empty())` (what `@qadi/react` does), then run the
     devtools hydration reader (the function at `Hydration.ts:95-110`) under
     `Effect.provideService(Metric.MetricRegistry, new Map())`; assert the seeded count rose by 3 (delta
     against a read taken under the same provision before the write). Red: 0.
- **Tests:** 1 case (red)
- **Verify:** `pnpm vitest run packages/devtools/test/model/Hydration.test.ts`
- **Done when:** red with "0 vs 3".

### T13 — One registry for hydration counts; correct the stale mechanism everywhere (I8)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T12; D-45-h
- **Files:** `packages/devtools/src/model/Hydration.ts` (`:1-30` doc, `:95-110`);
  `packages/core/src/HydrationMetrics.ts` (`:20-35` doc); `packages/react/src/HydrationCounts.ts`
  (`:15-27`); `packages/core/src/Evaluate.ts` (`:43-50`); `packages/core/test/HydrationMetrics.test.ts`
  (`:10-16`); `packages/react/test/HydrationCounts.test.ts` (`:9`);
  `examples/nextjs-newsroom/app/edge/double-count/page.tsx` (`:15-16`);
  `spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md` (`:141-146`)
- **Steps (A):**
  1. Reader: read the five hydration metrics with `Effect.sync(() => m.valueUnsafe(DEFAULT_REGISTRY))`,
     `DEFAULT_REGISTRY = Context.empty()` at module scope, beside a comment naming `HydrationCounts.ts`
     as the writer it must agree with.
  2. Rewrite each stale comment: the registry is looked up on every update (effect 4.0.0); writer and
     reader agree because both name the default registry, not because the metric remembers one; a test
     can isolate on-fiber metrics with a fresh registry (ARCH-42) but not these off-fiber ones, so their
     assertions stay deltas.
  3. Amend ADR-QD-052 (one paragraph, revision bump): what changed in 4.0.0, the pin, and the host note.
  4. T12 green; `HydrationMetrics.test.ts`, `HydrationCounts.test.ts`, devtools hydration tests green.
- **Tests:** T12 green
- **Verify:** `pnpm vitest run packages/devtools/test/model/Hydration.test.ts packages/core/test/HydrationMetrics.test.ts packages/react/test/HydrationCounts.test.ts`;
  `git grep -n "memoises its hooks\|first registry to reach" -- packages spec examples`
- **Done when:** green, and the grep finds only `>` history blocks and `packages/core/test/helpers.ts`
  (ARCH-42's).

### T14 — Spec, traceability, CCR and changesets, one block per item
- **Status:** [x] done (2026-10-08) (CCR-QD-203 to CCR-QD-209, provisional numbers resolved at merge)
- **Depends on:** the item's code tasks (14a: T2; 14b: T4; 14c: T6; 14d: T8; 14e: T10; 14f: T11; 14g: T13)
- **Files:** `spec/README.md` (CCR rows); `spec/traceability.md`; `spec/invariants.md`;
  `spec/overview.md`; `spec/behaviors/29-devtools-simulator.md`, `25-inspection.md`, `23-http.md`,
  `22-promise-facade.md`, `21-decision-cache.md`; `spec/decisions/094-*.md`, `052-*.md`;
  `.changeset/*.md` (*new*, one per item)
- **Steps:**
  - **14a (I1).** ADR-QD-094 amendment: the key law. INV-QD-043's key paragraph
    (`invariants.md:1688-1691`): keys are injective over the request; Enforcement names the new property
    and the three capture tests. BEH-QD-221 (`29-devtools-simulator.md:121`): a capture keys by the whole
    question. Changeset `@qadi/core: patch`, `@qadi/devtools: patch` ("two port keys now include every
    argument; a capture no longer answers a different depth, resource or subject").
  - **14b (I2).** BEH-QD-194 (`25-inspection.md:361`): "A field change MUST be judged by the field
    lattice (`sameVisibleFields`): two sets that disclose the same fields are not a change." Overview row
    next to `intersectFields` (`overview.md:171`). Changeset `@qadi/core: minor` (new export).
  - **14c (I3).** BEH-QD-321: replace "exactly once, by `authorizeRequest`" with "exactly once, by the
    step that turned it into a response: `authorizeRequest` for the edge check, the surface for a
    handler's own `guard`, each annotated with its site"; delete `:567-571`'s "no longer logged"
    sentences. Overview `:584` `logDenial` row and the `guardRoute`/`addGuardedRoute` rows (handler error
    channel). ADR-QD-036 amendment line recording the D-19-d reversal. Changeset `@qadi/http: minor`.
  - **14d (I4).** BEH-QD-NEXT in `22-promise-facade.md`: "Each call MUST forward `options.signal` to the
    runtime and MUST NOT branch on it". INV-QD-026 wording: "rejects exactly when the core fails or the
    caller aborts". Overview row for `FacadeOptions`. Changeset `@qadi/promise: minor`.
  - **14e (I5).** BEH-QD-166 gains: "a completed entry MUST be counted once toward `capacity` however
    many fibers asked for it". Traceability row for the T9 test. Changeset `@qadi/core: patch`.
  - **14f (I7).** CCR row only. No changeset (spec only; `pnpm changeset --empty` if the repo wants one).
  - **14g (I8).** ADR-QD-052 amendment (T13). BEH-QD-230–232 (hydration counts, `19-hydration.md`) gain
    "read from the default registry". Changeset `@qadi/devtools: patch`.
  - One `CCR-QD-NEXT` row per item; numbers at merge.
- **Tests:** none
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-api-surface.mjs`;
  `node scripts/check-doc-examples.mjs`; `node scripts/check-website-doc-examples.mjs`;
  `node scripts/check-dod-table.mjs`
- **Done when:** all five pass on the item's branch.

### T15 — Full gate, per item branch
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** the item's T14 block
- **Files:** none
- **Steps:**
  1. Confirm with the orchestrator that no sibling agent is running mutation or coverage.
  2. `pnpm check` on the branch.
  3. A Stryker survivor in a new guard (`canonicalKey`'s `Set`/object arms, `sameVisibleFields`'s two
     directions, the `Hit` arm, the handler tap) gets a killing test, not an exclusion.
- **Tests:** the whole suite
- **Verify:** `pnpm check`
- **Done when:** exit 0.

### T16 — Update the tracker
- **Status:** [x] done (2026-10-08) (statuses and decisions recorded; README rows handed to the orchestrator)
- **Depends on:** T15 per item
- **Files:** this plan (frontmatter, tasks, §10); hand the orchestrator the README rows
- **Steps:**
  1. Tick tasks; record each D-45-x as `decided (<date>, <choice>)`; mark tasks dropped by a decision
     `[-] dropped` with the reason.
  2. `status:` → `in-progress`, then `done` when every item has landed or been dropped.
  3. Hand over: `ARCH-45 | wave-4 loose ends | n/a | <status> | <done>/17 | <open D-45-…> | L`, the
     defect rows for I1, I2, I3, I4, I5, I8, and the orphan list (§1 I7) marked resolved.
- **Tests:** none
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-45-*.md | sort | uniq -c`
- **Done when:** frontmatter, tasks and §10 agree.

## 7. Test strategy

- **I1.** The two pinned key strings in `PortConformance.test.ts` change (replace, not layer). The
  "subject in every key" and "relation and resource together" cases stay. The new injectivity property
  replaces the need for one example per future field. The three capture-fidelity tests are the
  user-visible proof (INV-QD-043) and diff **traces**, as E2.1 does.
- **I2.** `TraceDiff.test.ts`'s existing `FieldsChanged` tests (`:124-143`, `:263-287`) stay and must
  still fire (they compare genuinely different sets). The frozen oracle changes once, with a reason, and
  the stack-safety/agreement properties still compare it to `diffTraces`. The soundness property is the
  guard against `sameVisibleFields` ever hiding a real change.
- **I3.** Exact-log tests (`http.test.ts:811-824`, `AuthorizeRequest.test.ts`) are the regression oracle
  against double logging and must not change.
- **I4.** Count-based, not time-based assertions; existing facade tests untouched (forwarding only).
- **I5.** Scheduler-budget sweep (red is scheduler-dependent, green is not). The issue-#64 pins stay.
- **I7.** The gate is the test, shown red on the unfixed files.
- **I8.** One delta test under a host registry; existing delta tests stay deltas (off-fiber writes cannot
  be isolated by a registry).
- **Mutation.** Core, http, devtools and react Stryker configs (promise has none); T15 kills every new
  survivor.

## 8. Spec and documentation updates

| Item | Normative | Docs | Gate(s) |
| ---- | --------- | ---- | ------- |
| I1 | ADR-QD-094 amendment; INV-QD-043 key paragraph + Enforcement; BEH-QD-221 | `Capture.ts`, `RelationshipResolver.ts`, `CustomPredicate.ts`, `PortDoubles.ts` comments | 10 (`verify-traceability.sh`) |
| I2 | BEH-QD-194 requirement | overview row `sameVisibleFields` | 13 (`check-api-surface.mjs`), 10 |
| I3 | BEH-QD-321 requirement + prose; ADR-QD-036 amendment line | overview `:584` and route rows; `examples/http-advanced` | 13, 10 |
| I4 | BEH-QD-NEXT; INV-QD-026 wording | promise README, website `packages/promise.md`, overview `FacadeOptions` row | 23 (`check-website-doc-examples.mjs`), 13, 10 |
| I5 | BEH-QD-166 requirement | `DecisionCache.ts` comments | 10 |
| I7 | three ADR Document Control tables | — | 10 (new check) |
| I8 | ADR-QD-052 amendment; BEH-QD-230–232 | six stale comments (T13) | 10 |

CCR numbers and ADR revisions are assigned at merge. CHANGELOGs come from the changesets; nobody runs a
version or publish step.

## 9. Risks and rollback

- **I1 changes key strings a host may hold.** Only in-memory captures exist; a host comparing
  `CapturedAnswers` keys by hand breaks. Rollback: revert T2 (T1's tests go red again, which is the
  point).
- **I1 `canonicalKey` throws on a circular resource.** Already the documented failure for `params`; it
  becomes a `CustomPredicateError` during capture, i.e. a live run under capture can now fail where it
  did not. Mitigation: T2's doc and a test with a circular resource asserting the typed error.
- **I2 hides a real change.** Guarded by the soundness property; rollback is a one-line revert to text
  equality.
- **I3 floods logs.** Only denials raised by a handler's own `guard` add lines; at most one per request.
- **I4 none known.** Additive option.
- **I5 slows the hit path.** The hit now runs inside the claim's `Effect.sync`; keep it before the mask
  (T10 step 3) and check `pnpm bench` on `Evaluate.bench.ts`'s cache cases if there is doubt.
- **I8 a host relying on a custom registry for hydration export.** Documented; they read the default.
- **Cross-plan coupling.**
  - **ARCH-36** edits the same `enforce` closure; its rule (I3 first) is in its §4. Whoever lands second
    rebases.
  - **ARCH-31** derives a wire codec and serving routes from port descriptions, including `key`; it must
    keep T2's injectivity law (its round-trip property should iterate the same arbitraries).
  - **ARCH-32** checks a decision against its trace; it must compare `visibleFields` byte for byte, not
    with `sameVisibleFields`.
  - **ARCH-35** owns the `write_failed` log (I7).
  - **ARCH-39** edits `packages/promise/src/index.ts` too (its T7); textual merge only.
  - **ARCH-42** owns `packages/core/test/helpers.ts`'s stale `isolatedMetrics` comment and the
    test-helper consolidation; T13 leaves that file alone.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ---- | -- |
| 2026-10-07 | — | plan written; evidence verified at `e635e68` (probes under `scratchpad/wave4/ARCH-45/`, plus `ARCH-36/probe-handler-denial.mts` and `ARCH-42/*-probe.mts`) | planner |
| 2026-10-08 | T1 | red: PortConformance (`pinned key strings`, `a relationship is keyed by depth too`, `a custom predicate is keyed by its resource`, `...by the whole subject, not its id`) and Capture (`a policy asking one relation at two depths replays as it ran`, `a capture for one resource does not answer another`, `a capture does not answer a what-if that changed the subject's roles`) | implementer |
| 2026-10-08 | T2 | `PortKey.ts` `canonicalKey`; relationship key adds `depth ?? null`; custom-predicate key covers resource and whole subject; the injectivity law checked for all five ports; green | implementer |
| 2026-10-08 | T3 | red: TraceDiff `one field set spelled two ways is not a change`, `a what-if that drops a role does not report the root's respelled union` | implementer |
| 2026-10-08 | T4 | `sameVisibleFields` in `FieldLattice.ts` (soundness property over 2000 runs incl. malformed specs holds), `diffTraces` and the frozen oracle use it; overview row; green | implementer |
| 2026-10-08 | T5 | red: `a handler-raised denial is logged once, as the handler's` and `a bare route's handler-raised denial is answered 403 and logged once` (`logs` was `[]`) | implementer |
| 2026-10-08 | T6 | `DenialLog.ts` `logDenialAt(site)`; tap on the handler's effect in `RequirePermission.ts` (`enforce`'s `httpEffect` parameter widened to `unhandled \| HttpEnforcementFailure` so the tags are readable) and `guardRoute`; `addGuardedRoute` handler type widened; `examples/http-advanced` drops its catch (its `tsc -p` is clean); annotation test; green | implementer |
| 2026-10-08 | T7 | red: `filter stops when its signal aborts`, `a pre-aborted signal performs no lookup` | implementer |
| 2026-10-08 | T8 | `FacadeOptions`; each call destructures `{ signal, ...options }` and forwards `{ signal }` to `runPromise`; README and website paragraph with a compiled fence; green | implementer |
| 2026-10-08 | T9 | red at (budget, gap) = (3,12), (4,7), (4,8), (5,5) or (5,6), (6,4) or (6,5) depending on the test's layer | implementer |
| 2026-10-08 | T10 | hit check moved into the claim's `Effect.sync` (`Hit`/`Joined`/`Claimed`); the hit path now enters the mask (cost accepted); `grep -c 'HashMap.get(entries, key)'` = 1; green | implementer |
| 2026-10-08 | T11 | red: verify-traceability check 3a failed on 095, 096, 097; IDs corrected, revisions bumped; green (a scratch mismatch is what the red run was) | implementer |
| 2026-10-08 | T12 | red: `a count written off-fiber is read whatever registry the host wired` (0 vs 3) | implementer |
| 2026-10-08 | T13 | reader uses `valueUnsafe(Context.empty())` in `Effect.sync`; stale mechanism corrected in `HydrationMetrics.ts`, `HydrationCounts.ts`, `Evaluate.ts`, three test headers, the newsroom page and ADR-QD-052; green | implementer |
| 2026-10-08 | T14 | spec bookkeeping: CCR-QD-203 to 209, INV-QD-043/026, BEH-QD-166/169/194/221/231/321, ADR-032/036/052/094 amendments, overview rows, five changesets (core patch, core minor, http minor, promise minor, devtools patch, core patch) | implementer |
