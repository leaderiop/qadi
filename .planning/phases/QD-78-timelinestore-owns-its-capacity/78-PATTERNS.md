# Phase 78: TimelineStore owns its capacity - Pattern Map

**Mapped:** 2026-11-24
**Analogs found:** all code files are self-analogs or have an in-package analog; two have no repo precedent (boolean-returning command, `choose`).
**Tracked-source gate:** every path is under `packages/`, `spec/`, `apps/website/src`, `.changeset/`, `.planning/`, root `stryker.*.mjs`. No `.gsd` mirror. (`apps/website/dist/...` appeared in grep: it is build output, never name it.)

## File Classification

| File | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/model/TimelineStore.ts` (add `resize`) | store | command, pub-sub | self: `setPaused`/`clear` (lines 63-75) | exact |
| `packages/devtools/src/model/Timeline.ts` (D-03: `ingest`/`bound` returns `self` when nothing kept) | model | transform | self `ingestDecision` (:116-142) `return self` duplicate guards | exact |
| `packages/devtools/src/model/TimelineFeed.ts` (one store, `idleTimeline.resize`, configure order) | feed | event-driven | self `configure` (:171-191) and `useSimulationSession` setters | exact |
| `packages/devtools/src/model/ExternalStore.ts` | contract only | pub-sub | read-only; no edit expected | n/a |
| `packages/devtools/src/react/useTimeline.ts` (`useTimelineStore` follows capacity) | hook | effect-driven | `useTimeline` `useLayoutEffect` (:62-64); `useSimulationSession.ts:77-85` | exact |
| `packages/devtools/test/model/TimelineStore.test.ts` | test | plain calls | self | exact |
| `packages/devtools/test/model/TimelineFeed.test.ts` | test | Effect | self (TF4 :130) | exact |
| `packages/devtools/test/model/Timeline.test.ts` | test | plain | self | exact |
| `packages/devtools/test/react/useTimeline.test.tsx` | test | render | self | exact |
| `78-mutation.mjs`, `78-mutation-base.json`, `78-RED-EVIDENCE.md` | script/evidence | batch | `.planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-mutation.mjs`, `77-RED-EVIDENCE.md` | exact |
| spec, changeset, upgrade guide | docs | n/a | see below | exact |

## Pattern Assignments

### `TimelineStore.ts` — `resize` (D-01)

Add to the interface after `clear` (lines 35-41), same doc style:
```ts
  /** Empties the **view**. It does not reach back to any sink's own log. */
  readonly clear: () => void;
  readonly setPaused: (paused: boolean) => void;
  readonly isPaused: () => boolean;
```
Core pattern to copy (`TimelineStore.ts:43-78`): `let timeline = emptyTimeline(options); let frozen; const view = makeExternalStore<Timeline>(timeline);`. Existing commands to mirror:
```ts
clear: () => {
  timeline = emptyTimeline(options);
  frozen = undefined;
  view.publish(timeline);
},
setPaused: (paused) => {
  if (paused === (frozen !== undefined)) return;      // no-op guard, publishes nothing
  frozen = paused ? timeline : undefined;
  view.publish(frozen ?? timeline);                   // publish, not set: isPaused is a second reader
},
```
`resize` shape: `const next = emptyTimeline({ capacity })` FIRST (throws before any field changes); `if (next.capacity === timeline.capacity) return false;` then `timeline = next; frozen = undefined; view.publish(next); return true`. Caution: `clear` and `makeTimelineStore` close over `options`, so `clear` after a `resize` would rebuild at the OLD capacity. Change `clear` to `emptyTimeline({ capacity: timeline.capacity })`; the plan must cover this (it is not in CONTEXT). Listener throws: `publish` -> `notify` already rethrows after all listeners ran (`ExternalStore.ts:73-83, 98-101`; state is assigned before listeners run, so the store is already resized when the throw escapes).

### `Timeline.ts` — D-03 capacity-0 identity

`bound({...})` at `Timeline.ts:141` and `:164` returns a fresh object each record, so `accept`'s guard (`TimelineStore.ts:58` `if (next === timeline) return;`) never trips at capacity 0. Fix inside `ingest`/`bound`: return `self` when the bounded entries are empty and `self.entries` is empty. Copy the existing "return self for a non-change" idiom (`Timeline.ts:122, 157, 168`). `bound` itself is defined further down the file (not read; read at plan time). Validation rule lives only at `Timeline.ts:76-88` (`emptyTimeline`, throws `emptyTimeline: capacity must be a non-negative integer, got ...`); `resize` must route through it.

### `TimelineFeed.ts` (D-05..D-07)

Delete: `bounded` (:95-96), `inner`/`view`/`push` (:127-133), forwarder (:135-142), the `inner = bounded(...)` resize body (:177-189). Keep unchanged: `status`, `reads = yield* makeSupersedingRun()`, `readSource` (:148-160, `marking.accept` calls `timeline.accept`), `restart` (:164-166), the `reads.closed()` guard (:173).

Current `configure` to rewrite (:171-191), keeping `try { ... } finally { readSource }`:
```ts
configure: (next) => {
  if (reads.closed()) return;
  const before = inputs;
  inputs = next;                                   // BUG: assigned before bounded() can throw
  const resized = next.capacity !== before.capacity;
  if (resized) { inner = bounded(next.capacity); inner.subscribe(push);
    try { push(); } finally { readSource(next.source); }
  } else if (next.source !== before.source) readSource(next.source);
},
```
Target flow (D-06): guard; `let resized: boolean; try { resized = timeline.resize(next.capacity ?? DEFAULT_TIMELINE_CAPACITY) } ...`. Because `resize` throws both for validation (nothing changed: do not assign `inputs`) and for a listener throw (changed: must assign `inputs`, read in `finally`), the plan must distinguish them, e.g. validate via `emptyTimeline` semantics first or compare `timeline.getSnapshot().capacity` after a throw. Keep the comment block at :181-184 on which throw wins (TF26/TF29).

`idleTimeline` (:106-113): add `resize: () => false,` as the inert member. Single-store construction: `makeTimelineStore({ capacity: inputs.capacity ?? DEFAULT_TIMELINE_CAPACITY })` (what `bounded` did). `makeExternalStore` import and `Timeline` import may become unused in this file: remove if so.

### `useTimeline.ts` — D-08

Current (:90-91): `const [store] = useState(() => makeTimelineStore(options));`. Effect analog in the same file (:62-64):
```ts
useLayoutEffect(() => {
  if (feed !== undefined) feed.configure({ source, capacity });
}, [feed, source, capacity]);
```
and `useSimulationSession.ts:77-79` (`useLayoutEffect(() => { if (session !== undefined) session.setSightings(input.sightings); }, [session, input.sightings]);`). For `useTimelineStore`: `const capacity = options?.capacity ?? DEFAULT_TIMELINE_CAPACITY; useLayoutEffect(() => { store.resize(capacity); }, [store, capacity]);`. Hooks in this package use `useLayoutEffect`, not `useEffect`. Note the first run is a same-capacity no-op by D-01 (publishes nothing). Imports needed: `useLayoutEffect` from `react`, `DEFAULT_TIMELINE_CAPACITY` from `../model/Timeline.ts`.

### Tests: unedited bodies and doubles

Unedited (do not touch bodies) in `packages/devtools/test/model/TimelineFeed.test.ts`:
- TF4 line 130 (`a capacity change keeps the timeline object, empties it, bounds the new buffer and reads again`): asserts `feed.timeline === timeline`, `idsOf(feed)` empty, `a.tally { started: 2, finalized: 1 }`, capacity 2 after three accepts;
- TF14 line 310 (capacity change while Stopped);
- TF26 line 543 (listener throws on emptied timeline; configure rethrows; new source read);
- TF27 line 568 (capacity-only change, listener throws, refilled from same source);
- TF29 line 616 (status listener throw on `Reading` replaces the timeline listener's throw, no read started).
None was seen to pin undefined-vs-default (D-02); check with grep on `capacity: undefined` / `configure({` before the RED commit and stop if one does.

`TimelineStore` implementers (grep of `packages/*/test`, `packages/*/src`, `examples`, `apps`, `scripts`): the only object literals are `idleTimeline` (`TimelineFeed.ts:106`) and the feed forwarder (deleted). Test files that merely import the type or call `makeTimelineStore`: `test/model/TimelineStore.test.ts`, `test/model/Source.test.ts`, `test/react/useStoreSnapshot.test.tsx` (:11, :46, :89), `test/react/useTimeline.test.tsx`, `test/react/TimelineLifetime.test.tsx` (:20, `Array<TimelineStore>` at :124, no literal), `test/surface.test.ts`, `test/surface.tst.ts`. No hand-written double exists; no `examples/` or `scripts/check-package-install.mjs` literal was found (the script only probes `make*Feed`; a second grep for `accept:` literals at plan time is cheap insurance). `DockModel.ts` holds `timeline: TimelineStore` (type-only). `apps/website/src/content/docs/docs/reference/upgrading.md` mentions the type (prose).

New tests: store rules in `TimelineStore.test.ts` (plain calls, no scope, no source, TRSZ-01); `resize` identity-after-resize and invalid-configure tests in `TimelineFeed.test.ts` using its `watched(...)`, `flush`, `idsOf`, `record(id, at)` helpers (see TF4); hook test in `useTimeline.test.tsx`.

### Command that answers whether it acted

No boolean-returning command exists in `packages/devtools/src` (grep of `=> boolean` finds only predicates). Phase 80's `choose` is not yet written. Use the `setPaused` early-return no-op idiom (`TimelineStore.ts:70`) and return `false` on that path.

### Mutation scorer

Copy `.planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-mutation.mjs` (plus `77-mutation-base.json` / `77-mutation-close.json` layout, usage line: `node <phase>/77-mutation.mjs record base|close <group>`, `compare`, `--self-test`) to `78-mutation.mjs`, replacing its groups with the 3 source files (`TimelineStore.ts`, `TimelineFeed.ts`, `Timeline.ts`) and pointing at the devtools Stryker config: **`/Users/mohammadalmechkor/Projects/Perso/qadi/stryker.devtools.mjs`** (scoped to `packages/devtools/src/model/`, its own vitest config; other configs: `stryker.audit.mjs`, `.react.mjs`, `.http.mjs`). `useTimeline.ts` is in `src/react/`, so it is outside the mutation scope. The 77 rule: no new open (Survived/NoCoverage) or Ignored mutant, located by `git diff -U0`.

### Spec and records

- `spec/behaviors/28-devtools-screens.md` (TimelineStore BEH home; new BEH-QD-726..730).
- `spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md`: add a dated amendment; new `spec/decisions/191-*.md` for ADR-QD-191. Mention also in `spec/decisions/169-...`, `173-...` only if their text restates the forwarder (check).
- `spec/overview.md:874` (`| \`TimelineStore\` | type | \`model/TimelineStore.ts\` |`) and `:927` (`useTimeline`, `useTimelineStore`, `UseTimeline` row, mentions "a capacity change keeps `store`").
- `spec/invariants.md` (INV-QD-401..402), `spec/traceability.md`, `spec/README.md` CCR table (CCR-QD-470). Revision lines via `scripts/spec-revise.mjs`.
- Changeset analogs: `.changeset/audit-row-made-only-by-its-codec.md` (frontmatter `"@qadi/audit": minor`, body starts `**Breaking.**`); devtools-specific: `.changeset/devtools-capacity-change-reads.md`. Use `"@qadi/devtools": minor`.
- Upgrade guide: `apps/website/src/content/docs/docs/reference/upgrading.md`, 0.13 sections start at line 618 (`## 0.13: onMalformed receives core's DecodeRefusal`); latest 0.13 sections are at :741 (`## 0.13: a breaker or audit sink option ...`) and the next. Copy that shape: prose, a "Before:" ts fence and an "After:" `typescript` fence (compiled by `check-website-doc-examples.mjs`, so it must import and type-check), closing with `The decision is [ADR-QD-191](https://github.com/leaderiop/qadi/blob/main/spec/decisions/191-...md).` Append after the last 0.13 section.

## Shared Patterns

- Imports: `import * as X from "effect/X"` for effect, relative imports with `.ts`, `import type` for types (AGENTS §1).
- Doc comment: one-line summary, rationale after (AGENTS preamble).
- No `as`, no `any`, no `console`; models are framework-free and held to the mutation gate.
- Store commands are synchronous, publish once, and a throwing listener is rethrown after all ran (ADR-QD-177, `ExternalStore.ts:20-28`).

## No Analog Found

| File | Reason |
|---|---|
| boolean-returning command | none in the repo yet (see above) |
| `78-RED-EVIDENCE.md` | copy `77-RED-EVIDENCE.md` shape |

## Metadata

**Search scope:** `packages/devtools/{src,test}`, `packages/*/{src,test}`, `examples`, `apps`, `scripts`, `spec`, `.changeset`, `.planning/phases/QD-77*`.
**Not read in full:** `Timeline.ts` `bound`, `77-mutation.mjs` beyond its header, `spec/*` bodies.
