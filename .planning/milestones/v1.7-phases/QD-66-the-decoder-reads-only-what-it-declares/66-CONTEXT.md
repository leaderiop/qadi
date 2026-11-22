# Phase 66: The decoder reads only what it declares - Context

**Gathered:** 2026-11-20
**Status:** Ready for planning

<domain>
## Phase Boundary

`packages/core/src/UntrustedDecode.ts`'s `project` (about line 166) is documented as "It reads no value, so it cannot
recurse". But it calls `Object.entries(input)`, which invokes every own enumerable getter, declared or not, before
`keysOf` filters. ADR-QD-170 D-19 repeats the sentence. The claim is true for `JSON.parse` output and false for the
in-process values that the `decodeSinkRecord` family accepts.

After this phase:
- **The `ignore` projection reads only names first.** Under `unknownKeys: "ignore"` it takes own key names, filters them
  by the declared set (and the `_tag` its key selection needs), and reads each kept value once. An undeclared accessor
  on an in-process value is never invoked.
- **Hydration keeps refusing unknown keys.** The hydration payload keeps `unknownKeys: "refuse"`, pinned by a test, and
  the reason is recorded (D2).

ARCH-113. Package `@qadi/core`; this is a **patch** changeset. `@qadi/react` is read, not edited:
`git diff -- packages/react/src` stays empty.

Records:
- ADR-QD-170 amended:
  - D-19's wording is scoped to the projection under `ignore`.
  - D-09 is resolved by D2's reasoning.
- ADR-QD-179 named Unused in the CCR row.
- CCR-QD-457.
- BEH-QD-666–670 and INV-QD-377–378 as needed, with unused ids named Unused in the CCR row.
- Traceability.
- The `@qadi/core` patch changeset.
- `UNTRUSTED_DECODE_BUDGET` and AGENTS.md §7a's table stay unchanged (no token moves).

Requirements: DECL-01..04, plus the cross-cutting WX-01..07.

</domain>

<decisions>
## Implementation Decisions

### The projection (DECL-01, DECL-02, D4)
- **Mechanics.** `project` takes `Object.keys(input)` (own enumerable names only) and filters it by the declared set. It
  then reads each kept value once into a fresh object.
  - `keysOf` (`EnvelopeKeys.ts`) reads `_tag` instead of taking the entries array.
  - `UntrustedDecode.ts` and `EnvelopeKeys.ts` change in **one commit**.
  - No `Record<string, unknown>` and no `as`. A shape that needs one is a design problem, not a cast.
- **Scope stays at the `ignore` projection (owner, 2026-11-20).** Do **not** widen the code change to `walked()` or
  `exceedsJsonDepth`.
  - Under `refuse`, and for `unwalked` keys, those still invoke every own getter.
  - The `project` doc comment, the ADR-QD-170 amendment and the new INV say so plainly, so the overclaim does not
    reappear one level down.
- **Read-once: measure, then pin (owner, 2026-11-20).**
  1. Measure on the phase base how often a declared getter is read under `ignore`, both directly and through each seam.
  2. **RED on the phase base:** a test shows an undeclared throwing getter invoked by `untrustedDecoder(…, { unknownKeys: "ignore" })` directly, and through both `ignore` seams in `SinkCodec.ts`: `sinkWire` (about line 501) and `storedWire` (about line 603).
  3. After the change the same tests are GREEN, and a counting getter pins each declared value read once by the projection. State only what the measurement shows, and include the `_tag` read if `keysOf` needs it.
- `StoredEnvelope.test.ts` is **not edited**. It is a pinned characterisation file, and Phase 68 owns its wording. New
  cases go in a new block or file.

### Hydration stays `refuse` (DECL-03, D2)
- `HydrationEngine.ts` keeps `unknownKeys: "refuse"` (lines ~164, ~194, ~209). There is no behaviour change, and
  `packages/react/src` stays unchanged.
- **The pin.** A test that an unknown top-level hydration key is refused, as `MalformedPayload` (BEH-QD-488 area,
  `spec/behaviors/19-hydration.md`).
  - Search `packages/react/test` (`HydrationPayload.test.ts`, `HydrationEngine.test.ts`, `UntrustedSeams.test.ts`) for an
    existing one first.
  - Reuse it if it exists and record where it is.
  - Add one in `packages/react/test` only if none exists.
- **The ADR-QD-170 amendment records why.** The payload comes from the same build and is version-checked, and strict
  refusal catches tampering. This resolves D-09.

### Benchmark (DECL-04, owner, 2026-11-20)
- **Harness.** A parameterised copy of Phase 59's harness (`ab.sh`, `analyze.mjs`), committed in the phase directory.
  Phase 59's harness is Evaluate-specific: its analyzer refuses input missing two Evaluate keys.
- **Run.** 3 + 3 interleaved, measuring the committed source against the phase base, with `uptime` and the host's top
  CPU processes recorded.
- **Workloads.** The `decodeSinkRecord` and stored-envelope workloads, plus a new `ignore` row in
  `UntrustedDecode.bench.ts`. The policy decoder group does not exercise `project`.
- **Gate, fixed in the plan before any run.** No workload may be slower than **5%**, and the geometric mean of the
  deltas may be no worse than **+2%**.
  - One run of record. A failed gate stops the phase with the evidence committed; no re-run.
- **The bench is the last executable change.** Any later executable edit invalidates it.

### Mutation
- **Base run.** Stryker on `UntrustedDecode.ts`, `EnvelopeKeys.ts` and `SinkCodec.ts`, before any edit.
- **Close run.** The same invocation at close. No touched file's score may drop.
- Known base: `EnvelopeKeys.ts` 58/58; `UntrustedDecode.ts` 41/43 with two pre-existing survivors.
- **Static decoders.** Build the decoders inside `it` bodies, because module-scope decoders are `Ignored` as static.
  - A static evidence run with `ignoreStatic: false` comes from a config kept **outside the repo**.
  - `stryker.config.mjs` is never edited.

### Records (owner, 2026-11-20)
- **ADR.** Amend ADR-QD-170 only, with `spec-revise --date 2026-11-20`, an "amended 2026-11-20" status note and the
  `index.yaml` entry. ADR-QD-179 is named Unused in CCR-QD-457.
- **Changeset.** One `@qadi/core` patch changeset. Nothing is released, versioned, tagged or pushed.
- **Ids.** Reserved ids only. Never run `scripts/next-id.mjs`.
- **Texts.** Every text that describes what the projection reads says only what the code holds after the change:
  - `UntrustedDecode.ts`'s doc;
  - ADR-QD-170 D-19;
  - AGENTS.md §7a's sentence "drops an undeclared top-level key before the guard, so it is never walked";
  - the `SinkCodec.ts` comments near lines 495–520 and 590;
  - INV-QD-306 and the related BEH;
  - `spec/overview.md`.

### Claude's Discretion
- Which BEH/INV ids are used and their exact wording, within the reserved ranges.
- Test titles and ids for the RED getter cases.
- The bench workload names, within the decided set.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/UntrustedDecode.ts`: `Projection`, `project` (~166), `keepEverything`, and the `PROJECTION` table
  keyed by `UnknownKeyPolicy` (`refuse` | `ignore`), read through `Object.hasOwn`.
- `packages/core/src/EnvelopeKeys.ts`: `envelopeKeysOf` (~65), the `keysOf` the `ignore` projection uses.
- `packages/core/src/SinkCodec.ts`:
  - `sinkWire` (~501): `ignore`, `prepare: checkVersion`.
  - `storedWire` (~603): `ignore`, `unwalked: ["record"]`.
- `packages/core/bench/UntrustedDecode.bench.ts`, `SinkCodec.bench.ts` and `SinkRecord.bench.ts`.
- Phase 59's harness (`.planning/milestones/v1.6-phases/QD-59-…/bench/`) and Phase 65's bench record (`65-BENCH.md`, `bench/final/`).

### Established Patterns
- RED first on the phase base. Scratch lives outside the repo or in gitignored `.scratch/`. Executors never tick WX-*;
  only the phase's last plan ticks DECL-01..04. `check:pr` runs once, alone.
- **The phase 65 lesson.** A review or verifier finding fixed after the records plan must also update the CCR row's
  cited revisions.
- **The phase 64 lesson.** Git pathspecs need `:(glob)packages/*/src/**`, because `packages/*/src` matches nothing.

### Integration Points
- The `decodeSinkRecord` family (`decodeSinkRecord`, `decodeSinkRecordText`, `decodeSinkRecordWithJson`) and the
  stored-envelope reader go through the two `ignore` seams.
- `HydrationEngine.ts` (react) is read only.

</code_context>

<specifics>
## Specific Ideas

- The RED case is an in-process value with an undeclared getter that throws. Today it throws out of the decode; after
  the change it is never invoked. Show this directly and through each seam.
- The doc and ADR must say what `refuse` and `unwalked` still read. A text scoped too loosely repeats the defect.

</specifics>

<deferred>
## Deferred Ideas

- Making `walked()` / `exceedsJsonDepth` accessor-safe under `refuse` and for `unwalked` keys. The owner kept the code
  change scoped to the `ignore` projection; it is recorded in the texts, not built.

</deferred>
