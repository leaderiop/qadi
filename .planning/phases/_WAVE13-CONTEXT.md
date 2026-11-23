# Wave 13 (v1.8): shared context for Phases 69–76

**Read first:** `.planning/phases/_SHARED-CONTEXT.md`. Its house rules, user preferences, verify-command hygiene and the
XC-05 mutation procedure all apply. **This file overrides only what it names:** the source, the base commit, the
numbering, the owner decisions and the per-phase evidence below.

**Source:** the 2026-11-22 architecture review,
`/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261122-075438.html` (session-scoped, outside the
repo; it may be gone). Three read-only explorers walked core, react+http and devtools+audit at `2716def4`, weighted
toward the files most often changed in the last 12 commits. Each finding below was checked against the code by hand,
and Phase 69's throw-through was confirmed by a probe (recorded below, because the probe file was deleted afterwards).
The milestone resolves all eight candidates, by a change or by a recorded decision.

**Base commit:** `5e68b104`, the head of `arch-wave-13`, one planning commit after `main` at `2716def4` (v1.6 + v1.7
merged as #163, not released). Each phase's base is its first commit's parent; that rule is unchanged from
`_SHARED-CONTEXT.md`.

## Owner decisions (asked once, 2026-11-22; locked)
- **D1 (scope):** all eight review candidates become phases, including the speculative Phase 76.
- **D2 (branch):** `arch-wave-13` off `main` at `2716def4`. No merge, no release.

Decisions still to be asked, each once, at that phase's discuss step:
- **Phase 70:** whether the payload path (`refuse` reasons, ADR-QD-152's original subject) is folded into the same
  reason-keyed derivation or left as is.
- **Phase 75 (human checkpoint):** the outcome key (`qadi.decision` + `qadi.outcome` → one key, and its name) and
  whether the old keys are kept for one release. This is visible to tracers; nothing in the repo reads these spans.
- **Phase 76:** where core exposes "would this fixture signature satisfy this node" without exporting
  `SignatureMatch.ts` (ADR-QD-099), or a recorded rejection.

## Execution order
Phases run strictly one at a time, in numeric order (69 → 76): every records plan edits the same spec registers, and
`use_worktrees` is false.

1. **69–71 first:** the three live defects. Each opens with a regression test seen RED on the phase base.
2. **72–74:** the three deepenings (devtools, react, devtools).
3. **75:** the change tracers will see, behind a human checkpoint.
4. **76 last:** speculative, so it may end in a recorded rejection (ADR + CCR row, no code change).

## Numbering reserved for v1.8
Next free on `5e68b104`: ADR-QD-182, CCR-QD-461, BEH-QD-681, INV-QD-383. The highest ARCH id is ARCH-115.

**The whole block below is reserved** in the shared reservation file
(`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`), set to CCR 468, ADR 189, BEH 720, INV 398 on 2026-11-22.
- **Never run `node scripts/next-id.mjs` while executing these phases**: every call writes a reservation.
- If a reservation goes unused, name it in the phase's CCR row ("Unused: …"). A phase that needs no new ADR (an amendment
  of an existing one suffices) leaves its ADR number unused and says so.

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 69 | 116 | 182 | 461 | 681–685 | 383–384 |
| 70 | 117 | 183 | 462 | 686–690 | 385–386 |
| 71 | 118 | 184 | 463 | 691–695 | 387–388 |
| 72 | 119 | 185 | 464 | 696–700 | 389–390 |
| 73 | 120 | 186 | 465 | 701–705 | 391–392 |
| 74 | 121 | 187 | 466 | 706–710 | 393–394 |
| 75 | 122 | 188 | 467 | 711–715 | 395–396 |
| 76 | 123 | 189 | 468 | 716–720 | 397–398 |

ADR Document IDs must equal the file number (gate 10).

## Per-phase evidence

### Phase 69: One total "thrown value → message" module (ARCH-116, core; live defect)
- **Six inline copies** of "turn a caught value into a message", at `2716def4`:
  - `packages/core/src/SinkCodec.ts:361-368` `describeThrown`/`encodeFailed`: total. Both the `.message` read and
    `String()` run inside `Result.try`, with the placeholder `"a value that could not be described"`. Pinned by
    `SinkCodec.test.ts:1105-1118`.
  - `packages/core/src/CustomPredicate.ts:89-95` `renderReason`: `String()` is guarded, `cause.message` is not.
    Placeholder `"<unrenderable cause>"`. Hostile-value test at `PortConformance.test.ts:743`.
  - `packages/core/src/JsonHazard.ts:182-183` `encodeFailed`: unguarded.
  - `packages/core/src/PortKey.ts:197-200`: `catch: (error) => KeyRefusal.Unreadable({ …, message: error instanceof
    Error ? error.message : String(error) })`, unguarded.
  - `packages/core/src/PortDerivation.ts:113-118`: the same shape, unguarded.
  - `packages/core/src/PortWireEncode.ts:131,149`: `catch: (error) => String(error)`, unguarded.
- **Probe (2026-11-22, confirmed):** with the installed `effect`, `Result.try({ try: () => { throw hostile }, catch: (e)
  => String(e) })`, where `hostile = { toString() { throw new Error("boom2") } }`, **throws `boom2` out of
  `Result.try`**; it does not return a failure. So each unguarded copy throws when the caught value's `toString` (or its
  `message` getter) throws.
- **Contracts broken:** `toJson`/`toJsonRecord` are documented "Never throws" and are reached from
  `AttributeResolver.ts:201` and `CustomPredicate.ts:143`; `PortKey`/`PortDescription.key` say "a key is refused, never
  thrown".
- **Shape:** one package-private total function, probably beside `ValueText.ts` (ADR-QD-154 unified value → text, not
  thrown value → text). It owns the guard on both the `message` getter and `String()`, and the one placeholder wording.
  All six call sites use it. Changing the two existing placeholder strings to one is a visible text change; the
  `SinkCodec` and `CustomPredicate` pins move with it.
- **Tests:** a RED regression per unguarded site (a hostile thrown value whose `toString` and `message` getter throw)
  on the phase base, plus one table test on the new function.

### Phase 70: Hydration's drop events come from its buckets (ARCH-117, react; live defect)
- `packages/react/src/HydrationEngine.ts:511-520`: three arrays (`tooDeep`, `malformed`, `undecodable`) and a `bucketOf:
  Record<EntryDropReason, Array<unknown>>` pointing at them. A missing reason is a compile error at `bucketOf` (ADR-QD-152).
- `:543`: `malformed.push(entry)` writes to an array directly, not through `bucketOf`.
- `:550-557`: three hand-written `if (x.length > 0) events.push(HydrationEvent.EntriesDropped({ reason: "…" }))`.
  **Nothing checks bucket → event**: a fourth reason with a bucket and no `if` compiles, and its entries are never
  reported or counted. That breaks INV-QD-045 ("no entry leaves hydration unaccounted for") without any error.
- `:382-386`: the dehydrate side repeats the pattern for `LeftOut` (`ForeignSubject`, `UnencodablePolicy`).
- **ADR-QD-152** turned down a reason-keyed record in react's *payload* path because a later phase shared the file. This
  phase is about the *entry* path and the event emission; the ADR must say why that reason no longer applies.
- **Test:** a RED type pin or test on the phase base showing a reason can be added without its event (for example, a
  tstyche pin that the event derivation is total over `EntryDropReason`), GREEN after.

### Phase 71: Developer-signal reporters resolved through one table (ARCH-118, react; live defect)
- `packages/react/src/DeveloperSignals.ts:222-254, 324-327`: `hydrationMismatchReporter`, `gateIdCollisionReporter` and
  `hydrationDropReporter` each restate one rule: a supplied reporter is wrapped so its throw is caught, otherwise the
  console default runs in development only, otherwise nothing.
- `:382-408` `providerSignalReporter` has a different rule: the development check sits inside each branch, and one
  signal fires in production once per process, guarded by a module-scope `let` (documented, though AGENTS.md §13 says
  "no module-scope state is left in this package"; check whether that is the one exempt file's carve-out).
- **Live drift:** `ReporterName` (`:103`) is a hand-kept list. `GateRegistryOptions.onIdCollision`
  (`GateRegistry.ts:57`, resolved at `:72`) is contained as `"onGateIdCollision"` (`DeveloperSignals.ts:254`), so a
  caller of `makeGateRegistry({ onIdCollision })` whose reporter throws gets a message naming an option they never
  passed.
- Resolution timing varies: once per atom set, once per registry, once per call, and on every report in
  `QadiProvider.tsx`. Each `HydrationEngine` call site pairs the right `says…` default with the right hook slot
  (`:408`, `:596`).
- **Shape:** one table from signal to where it runs, how often, and what it is named; every reporter resolved through
  it. `DeveloperSignals.ts` stays the one file exempt from `no-ambient-console` (ADR-QD-041).
- **Test:** RED on the phase base: `makeGateRegistry({ onIdCollision: () => { throw … } })` reports a message naming
  `onIdCollision`.

### Phase 72: A derived store module behind the dock model's stores (ARCH-119, devtools)
- `packages/devtools/src/model/DockModel.ts` at `2716def4`:
  - `shownReading`/`remerge` `:206-220` (two `===` compares on `fed`, `supplied`)
  - `questions`: `keyNow`/`lastJoin`/`rejoin` `:229-253` (three-field compare `:244-248`)
  - `services`: `servicesKeyNow`/`lastServices`/`reservice` `:254-279` (four-field compare `:269-274`)
  - the `closed` flag `:230` and its finalizer `:284-288`; the subscribe wiring `:281-283`
- Each store repeats: a key type, a key reader, a `let` holding the last key, a field-by-field compare, a `closed`
  guard, `store.set(compute(key))`. A field added to `ServicesInput`/`JoinKey` and not to the compare compiles.
- ADR-QD-168 expects a further store to be added this way. The store count is written in four places: the
  `DockModel.ts` header, ADR-QD-047, BEH-QD-465 (`spec/behaviors/28-devtools-screens.md:934`) and ADR-QD-168.
- **Tests today:** `DockModel.test.ts` ~`:1034-1639` builds a whole scoped dock model (70 `makeDockModel(` calls in the
  file) to check rules like "recompute only when a key changes" and "a closed model joins nothing".
- **Shape:** `ExternalStore.ts` gains a store derived from parent stores. It owns key equality (compared by
  construction over every key field), stopping after close, and notifying once. The dock model states only each store's
  key and compute function. ADR-QD-177's "every listener runs, rethrow after" is kept.
- **Constraint:** `DockModel.ts` keeps its mutation score of 1 (recorded in ADR-QD-168). ADR-QD-168 rejected a `useMemo`
  in the panel, not a derived store in the model.

### Phase 73: One pure reconcile for gate registration (ARCH-120, react)
- `packages/react/src/GateWriter.ts`: `reconcile(writer, live, wanted, current)` handles add/remove only and takes two
  arrays that must line up by index.
- `packages/react/src/useGate.ts` `useGateRegistrations` (~`:76-160`): four refs (`stableRef`, `latest`, `statesRef`,
  `registered`) and three effects: teardown, `reconcile` for identity, and a third that diffs *state* by hand using
  `states.join("|")` as its key and calls `handle.update`.
- `useGates` `:280-298` calls `Record.values` twice (on identities and on entries) and relies on both returning keys in
  the same order.
- `GateRegistry`'s own equal-state check in `update` is a third place.
- **Tests today:** `GateWriter.reconcile.test.ts` covers add/remove without rendering; the state half can only be
  tested by rendering (`GateRegistry.test.tsx`, 727 lines).
- **Shape:** extend `reconcile` to take ids and states keyed by id and do register, update and unregister. The hook
  shrinks to one effect plus the refs React needs. Extends ADR-QD-140 (which created `reconcile`) and ADR-QD-111. §13
  holds: this is registry state, not decision state.

### Phase 74: The simulation session's policy choice split from its runs (ARCH-121, devtools)
- `packages/devtools/src/model/SimulationSession.ts` (686 lines) at `2716def4`:
  - three mutable values `chosen`, `seedEntry`, `seeded` (`:334-340`)
  - `policyChoice`, `pin`, `policyOf`, `seedOf` (`:353-384`)
  - the menu: `selectedOf`, `leading`, `policyMenuOf` (`:277-302`)
  - `reseed` and `choosePolicy` (`:543-577`), `choosePolicyAt` (`:592-598`)
  - the `stale` rule, which reads `seedOf` (`:398-404`)
- **Menu order written twice:** `policyMenuOf` puts the seeded or evicted entry first; `leading()` separately recounts
  how many entries come first so a menu position can be turned back into a sighting.
- **Clearing the run written three times:** `supersede(); run = Idle` in `reseed` (`:555-556`), `choosePolicy`
  (`:574-575`) and `setPorts` (`:613-614`); `supersede()` also at `:519`.
- The comment at `:534` calls `edit` "the one path a draft changes by", but `editResourceText` (`:652-664`),
  `renameSubject` (`:666-670`) and `reseed` (`:543-558`) write `draft` directly. Fix the comment or the code.
- **Tests today:** about 600 of `SimulationSession.test.ts`'s 1809 lines ("seeding", "replaying a row", "choosing a
  policy", `policyMenu`, "a result belongs to the question it answered") need a scoped Effect session to test
  synchronous, pure rules.
- **Shape:** a held choice with a seed that can override it, beside `HeldChoice.ts`. It owns the pin-only-when-unseeded
  rule, the orphan rule in `seedOf`, the menu and its reverse lookup, and the same-policy no-op. ADR-QD-137/150 (the
  session owns its runs) stay untouched; ADR-QD-047 v1.11 keeps the menu under the session.

### Phase 75: A declared span shape for the evaluate family (ARCH-122, core; human checkpoint)
- `packages/core/src/Lifecycle.ts:126-161` at `2716def4`: on failure it annotates only `qadi.outcome: "Failed"` and
  `qadi.error_tag`; the question keys (`qadi.subject_id`, `qadi.evaluation_id`, `qadi.policy_tag`, `qadi.action`) are
  annotated only after success. The outcome uses two keys: `qadi.decision` (Allow/Deny) on success, `qadi.outcome`
  (Failed) on failure. A tracer filtering by evaluation id or by outcome misses half the evaluations.
- `Evaluate.test.ts:2500-2505` pins the failed shape exactly; the file has 114 hand-typed `"qadi.*"` strings
  (ADR-QD-123's literal budget covers metric ids only).
- Other writers of the same keys as hand-typed strings: `Predicate.ts:681-685` (`toPredicate`, after success only),
  `SubjectSet.ts:176,259`, `GuardHealthCheck.ts:105-106`.
- **Model to follow:** port spans have a declared question struct and answer struct (`PortSpan.ts`,
  `PortSpanEncode.ts` `spanStruct`, ADR-QD-051/109); the question is annotated before the call so a failed span still
  carries it (BEH-QD-227). The sink record made the same fix (`SinkRecordFields.ts:71-78` keeps `subjectId` top-level
  "so a consumer reads one field regardless of outcome").
- **Shape:** one declared question/answer struct for the evaluate family, built with `spanStruct`, annotated before the
  lookup; the four writers and the tests read keys from it.
- **Human checkpoint:** the key changes are visible to external tracers (behavior doc + changeset). Decide the outcome
  key and whether old keys are kept for a release.

### Phase 76: Remedies uses core's signature match (ARCH-123, devtools + core; speculative)
- `packages/devtools/src/model/Remedies.ts:531-545`: decides whether a fixture signature already meets a requirement
  with an inline `.some(held => held.subjectId === … && held.resourceId === … && held.meaning === … && (signerRole ===
  undefined || held.signerRole === signerRole))`. That restates core's `signatureMatches`
  (`packages/core/src/SignatureMatch.ts`) and the fixture port's subject/resource scoping
  (`packages/core/src/SignatureHistory.ts:332-348`).
- The same file avoids this for matchers: `satisfyingValue` checks every witness with `judgeMatcher`, and its comment
  (`:134-144`) warns against a "second belief" about what core accepts. `Remedies.test.ts:590-640` checks against
  hand-written expected values, not against the port's answer, so drift would go unnoticed.
- Separately: the custom-predicate refusal is two different sentences for one fact, `Remedies.ts:426` and
  `SimulationFields.ts:576`.
- **ADR conflict:** `SignatureMatch.ts` is deliberately package-private (ADR-QD-099 and its own header). The fix belongs
  on core's fixture or port-description side (for example, asking the fixture signature port itself), not in a new
  export. If no shape fits without widening core's public surface, the phase ends in a recorded rejection (ADR-QD-189 +
  CCR-QD-468), plus an agreement test that pins Remedies' answer to the port's.

## Considered and dropped by the review (do not re-propose in this wave)
- A single "deliver, contained" sink operation for `SinkEmit.ts:60-66` and `DecisionSinkForwarding.ts:177-191`: only
  two call sites.
- Folding the audit breaker's admission into `step` (`CircuitBreaker.ts:462-485`): ADR-QD-158 keeps `admit`,
  `withPermit` and the release finalizer in their shape.
- `decideQuestion` in `Lifecycle.ts` is exported but only used in that file: a hygiene note for Phase 75 if it is in
  the touched file anyway.
