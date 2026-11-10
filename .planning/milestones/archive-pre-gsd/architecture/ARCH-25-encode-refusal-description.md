---
id: ARCH-25
title: Core describes an encode refusal once (its path, its annotations, its sentence, and how it is reported), so every adapter reports one the same way in its own words
strength: Worth exploring
status: implemented
evidence_verified_at: e328e75
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-095 (amend: D-09-e gains a third reporter, the audit pipeline, which logs or calls `onRefused`; the path, annotations and sentence of a refusal are read through core, and each adapter keeps only its message and its hook)
  - ADR-QD-056 (amend, one paragraph: an encode refusal is witnessed by a log line naming its `evaluationId` as well as the `encode_failed` counter, the same standard as the breaker-open drop the 2026-09-19 revision describes)
  - ADR-QD-037 (constraint: `EncodeRefusal` lives in `Errors.ts` because `Errors.ts` cannot import `SinkCodec.ts`. Any new module imports `Errors.ts` and is never imported by it. madge counts type-only edges)
  - ADR-QD-054 (constraint: `AuditEntryNotEncodable` stays `@qadi/audit`'s own error; core describes the `EncodeRefusal` it carries, never the audit error)
  - ADR-QD-051 (constraint: a span says what was asked. The default `tracerLogger` copies log annotations onto the current span, so refusal annotations are span data)
  - ADR-QD-060 / ADR-QD-072 (constraint: no new `Schema.TaggedError`; `SCHEMA_ERROR_BUDGET` unchanged)
  - ADR-QD-034 (constraint: `Match`, not `switch`; built once at module scope)
  - ADR-QD-076 (constraint: `ignoreStatic: true`; a module-scope `Match.type` is static, so its arms must be pinned by per-variant tests)
  - ADR-QD-038 (constraint: changeset, fixed version group)
  - ADR-QD-NEXT (only if D-25-g = B; recommended A, an amendment to ADR-QD-095)
packages: ["@qadi/core", "@qadi/http", "@qadi/audit", "scripts (house style)"]
estimate: M   # ≈ 1½–2 days for T0–T10. Defect-only path (T1 + T2) ≈ ½ day (S)
---

# ARCH-25 — Core describes an encode refusal once

## 1. Verified evidence (at `e328e75`)

Checked on `main` at `e328e75`. `git diff --stat d0884e6 e328e75` over
`packages/core/src/{DecisionSinkForwarding,Errors,SinkCodec}.ts`, `packages/http/src`
and `packages/audit/src` is empty, so every line the review cited at `d0884e6` is
unchanged. Probes ran from
`scratchpad/wave3/ARCH-25/`, never from the repo:

- `probe-audit.mts` drives the real `AuditDecisionSinkLive` with
  `AuditTrailPortTest` and a capturing `Logger.layer` over one record whose
  resource holds a `Set`. Run with `cd packages/audit && NODE_OPTIONS="--conditions=bun" ../../node_modules/.bin/tsx <probe>`.
- `probe-stream.mts` drives the real `decisionFrames` over a `makeDecisionLog` read
  holding a poisoned record followed by a good one, with an `onRefused` that throws.
- `probe2.mjs` checks whether a `Schema` encode issue message quotes the rejected
  value. It does not: `Expected "Allow"`, `Expected a value greater than 0 at ["n"]`,
  `Expected string | number`.
- `tsprobe/` type-checks (strict, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`) a module-scope `Match.tagsExhaustive` path reader and a
  **generic** `Effect.fn` reporter, `<R extends { refusal; evaluationId }>(refusal: R, { message, onRefused?: (r: R) => void })`.
  `tsc` exits 0, and a `@ts-expect-error` on a mismatched hook type holds.

| # | Claim (review, at `d0884e6`) | Verdict | At `e328e75` |
| - | ---------------------------- | ------- | ------------ |
| C1 | `core/src/DecisionSinkForwarding.ts:34-37` has a private `refusalAnnotations`, commented "shared with nothing on purpose — but every adapter names the same three" | **CONFIRMED** | `DecisionSinkForwarding.ts:29-38`: the doc comment at `:29-33` reads "Shared with nothing on purpose — each adapter reports in its own words — but every adapter names the same three." The function is at `:34-38` and is used once, at `:102`. "Its own words" is the log **message**, and the message is not shared. The annotation **object** is identical in all three adapters (C3). |
| C2 | `http/src/DecisionStreamRoute.ts:181-197` and `http/src/DecisionBacklogRoute.ts:37-52` have two near-identical `reportRefused`; the second arrived with ADR-097 | **CONFIRMED** | `DecisionStreamRoute.ts:176-198` and `DecisionBacklogRoute.ts:33-52` differ in three places: the span name (`qadi.http.decisionStream.refused` / `…decisionBacklog.refused`), the message ("could not be framed" / "could not be served in the backlog"), and the stream's trailing `return Result.fail(refusal)` (`:197`). The annotation literal, the hook-or-log branch and `Effect.sync(() => onRefused(refusal))` are copied character for character. ARCH-11's progress log (T8, 2026-10-05) records the backlog route's `{ onRefused }` as "mirrors the stream route". |
| C3 | `"path" in refusal.refusal` appears three times | **CONFIRMED (exactly three)** | `DecisionSinkForwarding.ts:36`, `DecisionStreamRoute.ts:189`, `DecisionBacklogRoute.ts:45`. A repo-wide `grep -rn '"path" in '` over `packages examples features website spec scripts` finds no other occurrence. Errors.ts's own doc for the union (`Errors.ts:402-403`) says "A closed union, so a reporter matching on it with `Match.tagsExhaustive` is a compile error away from a new reason". None of the three reporters does that. |
| C4 | `audit/src/AuditEntry.ts:76-86` has `describeRefusal`, the only sentence form | **CONFIRMED** | `AuditEntry.ts:71-86` (`where` at `:72-73`, `describeRefusal` at `:76-86`, a module-scope `Match.tagsExhaustive`). Used once, at `:140`, to fill `AuditEntryNotEncodable.reason`. No other sentence form of an `EncodeRefusal` exists. The example's edge route reads only `refused.refusal._tag` (`examples/nextjs-newsroom/app/api/edge/decide/route.ts:128`). |
| C5 | **DEFECT candidate**: `audit/src/AuditDecisionSinkLive.ts:131-134` builds `AuditEntryNotEncodable.reason` and discards it, recording only a metric. The audit pipeline is the one adapter whose refusals leave no log and offer no `onRefused` | **CONFIRMED (defect)** | `AuditDecisionSinkLive.ts:131-135`: `Effect.result(encodeAuditEntry(…))`, then on failure only `Metric.update(writesEncodeFailed, 1)` and `return`. `AuditDecisionSinkOptions` (`:39-51`) has no hook. `probe-audit.mts` output: `written rows: 0`, `log lines: []`, while `encodeAuditEntry` on the same record yields `reason: "resource.tags: a Set has no JSON form"`. So a decision has **no audit row and no `evaluationId` anywhere**: the counter has no per-record attribute. Compare: forwarding (`:100-103`) and both http routes log or call a hook, and BEH-QD-311 requires it of the stream ("It MUST NOT be dropped silently"). ADR-QD-056's 2026-09-19 revision holds a breaker-open drop to "a log line and the counter" (`056-…md:253-258`). An encode drop meets less than that. `AuditEntryNotEncodable`'s own doc says `reason` exists "for a log line" (`AuditEntry.ts:57`), and the package's own pipeline never writes one. **What makes it a defect, not a design choice:** ARCH-09's planning D-09-e(i) said only "the `writesEncodeFailed` metric stays", and ADR-QD-095's accepted D-09-e is silent on the pipeline. No requirement was dropped. A reporting rule that every other adapter follows was never applied to this one. **Test-first task: T1.** |
| C6 | Target: `EncodeRefusal` is in `core/src/Errors.ts` for ADR-037's import-rule reasons | **CONFIRMED** | `Errors.ts:399-427` (the type at `:417-424`, the `Data.taggedEnum` constructors at `:427`). `SinkRecordNotEncodable` is at `:429-448`. Its doc (`:433-440`) gives the reason: it "joins `QadiError` and `ERROR_CODES`, and `Errors.ts` cannot import `SinkCodec.ts` without a cycle (ADR-QD-037)". `WirePath` is at `:368-372`. Errors.ts imports only `effect/Data`, `effect/Schema`, `./Decision.ts`, `./Identity.ts` and a type from `./Policy.ts` (`:51-55`). It already exports pure readings of its types (`toAccessDeniedPublic` `:241`, `errorCode` `:578`, `classifyEnforcementError` `:665`), so a pure reading beside `EncodeRefusal` has precedent. |
| C7 | *(found during verification, not in the review)* A caller's `onRefused` that throws ends the stream, and empties the backlog response | **CONFIRMED (defect)** | `DecisionStreamRoute.ts:194` and `DecisionBacklogRoute.ts:50` run the hook as `Effect.sync(() => onRefused(refusal))`, with no containment. `probe-stream.mts` prints `stream exit: FAILURE (defect) — the feed ended`. That breaks BEH-QD-311 ("No record MAY end the feed for any subscriber") and INV-QD-097 ("No adapter … lets one record end a feed"). The backlog route has the same shape inside its handler, so a throwing hook turns the whole response into a defect, against its own doc ("one record never empties the response", `DecisionBacklogRoute.ts:61-62`). Found by reading the code, and the backlog half is not probed. Forwarding already contains the same failure, on purpose (`DecisionSinkForwarding.ts:132-139`: "`onFailure` is a caller's callback too, and one that throws must not become this decision's defect"). **Test-first task: T2.** |
| C8 | INV-QD-044 (never log values): refusal annotations must not leak record values | **CONFIRMED clean, with two caveats** | INV-QD-044 is literally about spans. But `node_modules/effect/src/internal/effect.ts:6528` puts `tracerLogger` in the default `CurrentLoggers`, and `:6905-6923` copies every log annotation onto the current span as an event attribute. All three reporters log inside a named `Effect.fn` span, so refusal annotations **are** span data, and INV-QD-044's reasoning applies. Today's annotations are a closed `_tag`, a path, and the `evaluationId` (a correlation handle). None is a record value. **Caveat 1:** a path is made of keys from the caller's own object structure, so a resource keyed by data (`{ byEmail: { "a@x": new Set() } }`) puts that key in `qadi.path`. **Caveat 2:** `EncodeFailed.message` is free text. A `Schema` issue message does not quote the value (`probe2.mjs`), but a throwing getter's message is written by the caller (`SinkCodec.ts:462-468`, `describeThrown`). It is not an annotation today. It **is** in the audit sentence (`AuditEntry.ts:84`), so a sentence must never become an annotation or a default log message (D-25-f). |
| C9 | Is `"path" in` the smell AGENTS.md §4 forbids? | **Not literally. It is §5a's smell** | §4 forbids structural `_tag` checks on `unknown` (`Predicate.hasProperty(e, "_tag") && (e as …)._tag === "X"`). Here the operand is a typed `EncodeRefusal`, and TypeScript narrows `in` soundly over today's union, so neither half of §4's pattern applies. But the check uses the presence of a field to stand in for the tag, and it is not exhaustive by construction. A new variant with a location under another name, or one without `path` that should have one, compiles and silently reports `""`. That is the failure §5a's "exhaustive by construction" paragraph describes for `resolveRef`/`mergeFields`. The fix is the house one: a module-scope `Match.type<EncodeRefusal>().pipe(Match.tagsExhaustive(…))` (D-25-c). |

**Other facts the plan relies on.**

- The `""` path is pinned by `DecisionSinkForwarding.test.ts:323-344`,
  `decisionStream.test.ts:866-867` and `decisionBacklog.test.ts:169-173`. A root path `[]` would also render `""`. It
  cannot occur, because the walk's root is the freshly encoded record object (`SinkCodec.ts:353-387`) and every
  pre-check path is non-empty (`:446-451`). So `""` means `EncodeFailed` and nothing else.
- Neither `Evaluate.ts:1113` nor `Qadi.ts:96-104` contains a sink's failure: both run `Effect.catchCause(sink.record(…), () => Effect.void)`.
  So a throwing audit hook would be swallowed **silently** by the evaluator, not reported. Each sink must contain
  and report its own hook (T2, T6). Whether that swallow should report is ARCH-16's to decide.
- None of the three span names (`qadi.decisionSinkForwarding.refused`, `qadi.http.decisionStream.refused`,
  `qadi.http.decisionBacklog.refused`) appears in `spec/`, any test, or the website.
- `stryker.audit.mjs` mutates `packages/audit/src/**/*.ts` (break 80, `ignoreStatic: true`). `stryker.config.mjs`
  mutates `packages/core/src/**/*.ts` (break 80). `stryker.http.mjs` covers http.

## 2. Goal and success criteria

**Goal.** An `EncodeRefusal` is a closed union whose meaning (where it was found, and what an operator is
told) is currently spread over five places. Three adapters re-derive the path with a structural check, each
builds the same annotation object, audit alone owns the one sentence, and audit's own pipeline throws the
sentence away. This plan makes the **union's module** the owner of its readings. A small, deep interface sits
beside `EncodeRefusal`: `encodeRefusalPath`, `encodeRefusalAnnotations` and `describeEncodeRefusal`. One
reporter, `reportEncodeRefusal`, hides the hook-or-log choice and the containment of a throwing hook. The
**seam** is the reporter's two parameters: an adapter supplies only its own message and its own hook, as
ADR-QD-095 D-09-e requires. Everything that must agree across adapters lives behind the seam: the annotation
keys, the path rendering, value-freedom, and "a hook that throws is reported, never a defect". **Locality:**
a new `EncodeRefusal` variant is one compile error, in core, beside the union. **Leverage:** four adapters
(forwarding, the stream, the backlog, the audit pipeline) and any third-party `onRefused`/`onFailure` handler
read a refusal the same way. The audit pipeline joins as the fourth adapter, so it stops being the one place
a refused record leaves no trace.

**Success criteria.**

1. A refused record given to `AuditDecisionSinkLive` with no hook produces exactly one warning, annotated
   `qadi.refusal`, `qadi.path` and `evaluationId`, and the `encode_failed` counter still increments.
   Checked by `pnpm vitest run packages/audit/test/AuditDecisionSinkLive.test.ts` (T1).
2. A throwing `onRefused` ends neither the stream nor the backlog response. The next record is still
   framed or served, and the hook's failure is logged (T2): `pnpm vitest run packages/http/test/decisionStream.test.ts packages/http/test/decisionBacklog.test.ts`.
3. `grep -rn '"path" in ' packages/*/src` returns nothing. `grep -rn '"qadi.refusal"' packages/*/src`
   returns only the core module that defines `encodeRefusalAnnotations` (T5, enforced by T7).
4. `describeEncodeRefusal`, `encodeRefusalPath`, `encodeRefusalAnnotations`, `EncodeRefusalAnnotations` and
   `reportEncodeRefusal` are exported from `@qadi/core` and named in `spec/overview.md`: `node scripts/check-api-surface.mjs` passes.
5. A sentinel string placed in a refused record's values (a `Set` member, a throwing getter's message, a
   `Map` value) appears in **no** annotation `encodeRefusalAnnotations` returns, for every variant. This is
   checked by a property test in core (T3).
6. Each adapter's log message is unchanged byte for byte, and the existing adapter tests that pin message
   and annotations pass unmodified (T5).
7. `AuditDecisionSinkOptions.onRefused`, when given, receives the `AuditEntryNotEncodable` (now carrying
   `evaluationId`) once and replaces the warning (T6).
8. `pnpm check` is green, including `stryker.audit.mjs`, `stryker.http.mjs` and `stryker.config.mjs` at
   or above `break: 80`, `pnpm circular`, and gate 13 (T9).

## 3. Non-goals

- **Sharing the message.** D-09-e gives each adapter its own wording, and the messages stay as they are. Only
  the annotations, the path and the hook mechanics move.
- **Decode refusals.** `DecodeRefusal` has its own readers (`@qadi/devtools`' `MalformedReason` map, `decodeAuditEntry`).
  A sibling `describeDecodeRefusal` is plausible, but nothing duplicates it today.
- **The evaluator's silent swallow of a sink failure** (`Evaluate.ts:1113`, `Qadi.ts:96-104`). That belongs to
  ARCH-16 (the single sink `emit` owner). This plan makes each sink contain and report its own hook, so
  nothing reaches that swallow from here.
- **`writesWriteFailed` having no log** (`AuditDecisionSinkLive.ts:215-219`). It is the same kind of gap for
  store failures, but the breaker's reporting belongs to ARCH-07/ADR-QD-056's open "gap-marker" question.
  Named in §9, not fixed here.
- **Restructuring `Errors.ts`** (ARCH-27). This plan adds pure readings beside `EncodeRefusal`. Wherever ARCH-27
  moves the union, they move with it.
- **Moving `frame`/`reportRefused` into a core SSE vocabulary** (ARCH-28). If ARCH-28 lands first, its frame
  module calls `reportEncodeRefusal` too.

## 4. Constraints

- **AGENTS.md §1.** Use `import * as Match from "effect/Match"` and `.ts` relative imports. Adapters take a
  named import from `@qadi/core` (`import { reportEncodeRefusal } from "@qadi/core"`).
- **§4.** No new `Schema.TaggedError`: `SCHEMA_ERROR_BUDGET` (counts `packages/core/src/Errors.ts`) is unchanged.
  `AuditEntryNotEncodable` stays a `Data.TaggedError` and gains a field (D-25-e).
  `no-catchtags-object-form` does not apply.
- **§5.** `reportEncodeRefusal` is effectful, so it is `Effect.fn("qadi.encodeRefusal.report")`, traced.
  `UNTRACED_BUDGET` is unchanged, and adding an `Effect.fnUntraced` here would fail gate 4
  (`node scripts/check-house-style.mjs`). It runs only on the refusal branch, so an accepted record pays
  nothing. The three readings are pure, with no `Effect`.
- **§5a.** Readings dispatch with a module-scope `Match.type<EncodeRefusal>()`, never a `switch`, so
  `SWITCH_BUDGET` is unchanged. A per-call `Match.value` is not used, because these run per refused record.
- **§6.** No `as`, `!` or `any` (rules `no-type-assertion`, `no-non-null-assertion`; `ANY_BUDGET` unchanged).
  New tests must not hand-construct a port error (`PORT_DOUBLE_BUDGET` is test-scope, and
  `PORT_ERROR_CONSTRUCTION` would count it). Use `packages/audit/test/helpers.ts`'s `failedWithCause`/`httpClientError` and
  core's `scriptedPort`. `HAS_CUSTOM_BUDGET` and `DECISION_READ_BUDGET` are untouched.
- **ADR-QD-037 / `pnpm circular`.** The pure readings go in `Errors.ts`, whose imports grow only by
  `effect/Match`. The reporter goes in a new `EncodeRefusalReport.ts` that imports `Errors.ts`, and nothing
  in `Errors.ts`'s import closure may import it (D-25-b).
- **ADR-QD-095 D-09-e** (quoted in full): *"Forwarding: `onFailure` receives the `SinkRecordNotEncodable`,
  else a log line "could not be encoded for forwarding". SSE: `DecisionStreamOptions.onRefused`, else "could
  not be framed". Both annotate `qadi.refusal`, `qadi.path`, `evaluationId`. Audit: `AuditEntryNotEncodable`
  gains `refusal`, and `reason` is that refusal as a sentence."* Under this plan: the messages and hooks stay
  each adapter's own. The annotation triple is kept exactly, now produced in one place. The audit sentence
  moves to core and keeps its wording. The audit pipeline is added as a reporter (amendment, D-25-g).
- **INV-QD-035 / INV-QD-097.** A sink cannot change a decision, and no adapter lets one record end a feed. A
  hook that throws is contained and logged, never a defect (T2, T4).
- **INV-QD-044's reasoning** extends to refusal annotations through `tracerLogger` (C8). An annotation never
  carries a record value or `EncodeFailed.message` (D-25-f).
- **ADR-QD-076.** `ignoreStatic: true` exempts the module-scope `Match.type(...)` construction from
  mutation. The arm bodies run per call and are mutated, so every variant needs a test pinning its path,
  annotations and sentence.
- **Gate 13 (`node scripts/check-api-surface.mjs`).** Every new core export needs a row (or a prose
  backtick) inside `spec/overview.md`'s `## Public API surface` … `## Not listed above` window.

## 5. Decisions needed before work starts

### D-25-a — How deep is the core interface?

- **(A) Pure readings only:** `encodeRefusalPath`, `encodeRefusalAnnotations`, `describeEncodeRefusal`. Each
  adapter keeps its own hook-or-log branch. This is smaller, but the branch stays copied three times (four
  with audit), and so does the C7 containment fix.
- **(B) Readings plus one reporter,** `reportEncodeRefusal(refusal, { message, onRefused })`. It is generic
  over the refusal type the hook receives (`SinkRecordNotEncodable` for forwarding and http,
  `AuditEntryNotEncodable` for audit; the shape was type-checked in `tsprobe/`). It calls the hook once, or
  logs `message` with the annotations. A throwing hook is caught and logged as
  `"qadi: an encode-refusal hook threw"` with the same annotations plus `qadi.cause`. Adapters keep their
  named `Effect.fn` wrappers, so the span names are unchanged and the reporter's span nests under them.
- **(C) Status quo plus a parity test** asserting that the three annotation objects agree. This adds a test
  that restates the duplication instead of removing it.

Tradeoff: (B) adds one export and one nested span on the refusal branch only. In exchange, the C7 fix and
every future rule ("a hook is called at most once", "never a defect") lives in one place. That is the
depth: a two-field interface over the hook choice, the containment, the annotation and the logging.
**Recommendation: (B).** `status: decided (2026-10-07, B, reporter)`

### D-25-b — Where do the readings and the reporter live?

- **(A) Everything in `Errors.ts`.** This gives the best locality with the union, but it brings `effect/Effect`
  and `effect/Cause` into a module that is currently pure data plus pure readings.
- **(B) Pure readings in `Errors.ts`, beside `EncodeRefusal`; the reporter in a new `packages/core/src/EncodeRefusalReport.ts`** that imports
  `Errors.ts`. The union and its meaning stay together, and the precedents are `errorCode` and
  `classifyEnforcementError`. Errors.ts stays effect-free.
- **(C) `SinkCodec.ts`.** It raises the refusal, but ADR-QD-095's Decision says SinkCodec "exports two
  operations, each with a value form and a text form, and nothing else". This option amends that.
- **(D) A new module for all of it.** This conflicts least with ARCH-27, but the union and its readings end
  up in two files.

**Recommendation: (B).** If ARCH-27 lands first and moves `EncodeRefusal`, the readings move with it. `status: decided (2026-10-07, B, readings in Errors.ts and reporter in EncodeRefusalReport.ts)`

### D-25-c — How is the path read?

- **(A) An exported `encodeRefusalPath: (self: EncodeRefusal) => WirePath | undefined`,** a module-scope
  `Match.type<EncodeRefusal>().pipe(Match.tagsExhaustive({...}))`. `EncodeFailed` gives `undefined`.
  `encodeRefusalAnnotations` renders `undefined` as `""`, so the pinned log value is unchanged.
- **(B) Keep one `"path" in` inside core.** This is correct today, but a new variant compiles silently (C9).
- **(C) Reshape the union so every variant has `path`** (`EncodeFailed` with `path: []`, or an `Option`).
  That is a breaking change to a public union, and it invents a location `EncodeFailed` does not have.

**Recommendation: (A).** Keep `""` for "no path" (pinned by three tests, and `[]` is unreachable, §1).
`status: decided (2026-10-07, A, encodeRefusalPath via Match)`

### D-25-d — How does the audit pipeline report a refusal?

- **(A) A warning by default, plus an optional `AuditDecisionSinkOptions.onRefused?: (refusal: AuditEntryNotEncodable) => void`
  that replaces it.** The `encode_failed` counter increments either way. This matches all three siblings.
- **(B) Warning only.** It fixes the silence, but an operator cannot route audit refusals to an alert
  without scraping logs.
- **(C) Hook only.** The default stays silent, which is the defect.

**Recommendation: (A).** T1 ships the warning alone, because every option includes it. T6 adds the hook.
`status: decided (2026-10-07, A, warning plus onRefused)`

### D-25-e — Does `AuditEntryNotEncodable` carry `evaluationId`?

- **(A) Yes,** as a new required `evaluationId: string` field, set by `encodeAuditEntry` from `record.evaluationId`.
  A hook then has the correlation handle, the error satisfies the reporter's `{ refusal, evaluationId }`
  shape directly, and it matches `SinkRecordNotEncodable`. Breaking only for code that constructs the class
  (in-repo: none outside `AuditEntry.ts`).
- **(B) No.** The pipeline annotates from `sinkRecord.evaluationId`, and the hook receives an error with
  no id.
- **(C) The audit hook receives core's `SinkRecordNotEncodable` instead.** That loses `reason` and
  `recordTag`'s audit typing, and it cuts across ADR-QD-054 (the companion owns its error).

**Recommendation: (A).** `status: decided (2026-10-07, A, evaluationId carried)`

### D-25-f — Is a sentence ever an annotation, and does an invariant say so?

- **(A) Annotations are exactly `qadi.refusal` (the tag), `qadi.path` and `evaluationId`.** They never carry
  `describeEncodeRefusal`'s sentence or `EncodeFailed.message`. The sentence keeps `message`, because it is
  what explains `EncodeFailed` to a caller holding the error, and it is documented as possibly containing
  caller text. A **new invariant**, INV-QD-NEXT "a refusal report says where, never what", is enforced by
  T3's sentinel property.
- **(B) Amend INV-QD-044** to cover log annotations as well as spans. It reuses an invariant, but widens
  one whose Source and Enforcement are about `qadi.attribute` spans.
- **(C) Drop `message` from the sentence.** That makes `EncodeFailed`'s sentence useless.

**Recommendation: (A).** `status: decided (2026-10-07, A, new INV-QD-104)`

### D-25-g — A new ADR, or an amendment?

- **(A) Amend ADR-QD-095** (D-09-e, dated amendment block) and ADR-QD-056 (one paragraph). This is a
  refinement of an accepted reporting decision, not a new one.
- **(B) A new ADR-QD-NEXT,** "An encode refusal is described once".

**Recommendation: (A).** `status: decided (2026-10-07, A, amend ADR-QD-095 and ADR-QD-056 (CCR-QD-193))`

### D-25-h — Gate the single reading?

- **(A) A house-style rule** `no-refusal-annotation-outside-core`: the literals `"qadi.refusal"`/`"qadi.path"`
  and the pattern `"path" in` are refused in `packages/*/src` outside `packages/core/src/Errors.ts`. It is a
  plain rule, not a budget: zero exceptions.
- **(B) No gate.** Rely on review.

The duplication this plan removes arrived a second time through review (C2: "mirrors the stream route").
AGENTS.md §15 sets the house standard as "gated, not remembered". **Recommendation: (A).** `status: decided (2026-10-07, A, house-style rule)`

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/25-encode-refusal main`. Record `git rev-parse --short HEAD`.
  2. Re-run §1's probes: copy `scratchpad/wave3/ARCH-25/probe-audit.mts` and `probe-stream.mts` into a fresh
     scratch directory, fix their absolute paths, and run them as in §1. Expect `log lines: []` and
     `FAILURE (defect)`.
  3. `grep -rn '"path" in ' packages/*/src` → exactly the three lines of C3.
     `grep -rn '"qadi.refusal"' packages/*/src` → three.
  4. `git diff --stat e328e75 HEAD -- packages/core/src/{Errors,SinkCodec,DecisionSinkForwarding}.ts packages/http/src packages/audit/src`.
     If anything moved, update §1's line numbers before starting.
  5. Check whether ARCH-16, ARCH-19, ARCH-27 or ARCH-28 has landed (`git log --oneline main -- packages/http/src/DecisionStreamRoute.ts packages/core/src/Errors.ts`),
     and re-target T3–T5 files if so.
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §1 is re-confirmed or corrected in §10.

### T1 — Test-first: an audit encode refusal is observable (defect C5)
- **Status:** [x] done
- **Depends on:** T0. No decision, because every D-25-d option includes the default warning.
- **Files:** `packages/audit/test/AuditDecisionSinkLive.test.ts`, `packages/audit/src/AuditDecisionSinkLive.ts`.
- **Steps:**
  1. Add `it.effect("a refused record is logged with its refusal, path and evaluationId; no row is written")`.
     Provide `Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, Logger.layer([Logger.make((o) => void logs.push({ message: o.message, annotations: o.fiber.getRef(References.CurrentLogAnnotations) }))])))`,
     the pattern at `DecisionSinkForwarding.test.ts:293-321`. Record
     `decisionRecord({ evaluationId: "poisoned", resource: { tags: new Set(["finance"]) } })`.
     Assert: `written().length === 0`, `logs.length === 1`, the message includes `"could not be encoded for the audit trail"`,
     `qadi.refusal === "Opaque"`, `qadi.path === "resource.tags"`, `evaluationId === "poisoned"`.
     Run it and confirm it is **red** (`logs.length` is 0).
  2. Add a second test: an `EncodeFailed` refusal (a throwing getter, as at `DecisionSinkForwarding.test.ts:323-344`)
     logs `qadi.path === ""`, and the getter's message (`"sentinel-getter-text"`) appears in **neither** the
     log message nor any annotation value.
  3. Fix, minimally. In `AuditDecisionSinkLive.ts:132-135`, before `return`:
     `yield* Effect.logWarning("qadi/audit: a decision record could not be encoded for the audit trail; no row was written").pipe(Effect.annotateLogs({ "qadi.refusal": encoded.failure.refusal._tag, "qadi.path": <path>, evaluationId: sinkRecord.evaluationId }))`.
     For `<path>`, add a local module-scope `Match.tagsExhaustive` path reader, so the fix does **not** add a
     fourth `"path" in`. Comment it `// replaced by @qadi/core's encodeRefusalAnnotations in ARCH-25 T5`.
     Keep `Metric.update(writesEncodeFailed, 1)`.
  4. Confirm `packages/audit/test/Metrics.test.ts:44-58` (`encode_failed`) still passes unchanged.
- **Tests:** two new `it.effect`s, the first written red-first.
- **Verify:** `pnpm vitest run packages/audit/test/AuditDecisionSinkLive.test.ts packages/audit/test/Metrics.test.ts`.
- **Done when:** both tests pass. T1 can ship alone as an `@qadi/audit` patch: changeset
  `"@qadi/audit": patch`, "an encode refusal is now logged with its `evaluationId`".

### T2 — Test-first: a throwing `onRefused` never ends the feed or empties the backlog (defect C7)
- **Status:** [x] done
- **Depends on:** T0. No decision.
- **Files:** `packages/http/test/decisionStream.test.ts`, `packages/http/test/decisionBacklog.test.ts`,
  `packages/http/src/DecisionStreamRoute.ts`, `packages/http/src/DecisionBacklogRoute.ts`.
- **Steps:**
  1. In `decisionStream.test.ts`, beside the `onRefused` test at `:780-801`, add "a throwing onRefused is
     reported and the next record is still framed". Use the same log, records `"refused"` (a `Set`) and
     `"after"`, `decisionFrames(read, { onRefused: () => { throw new Error("hook bug") } })`,
     `Stream.take(…, 2)`, and a capturing logger. Assert two frames (the `"after"` backlog frame and
     `syncedFrame(1)`), plus one warning whose message includes `"hook threw"` with `qadi.refusal === "Opaque"`.
     Red: the stream fails with a defect.
  2. In `decisionBacklog.test.ts`, the same check through the route: status 200, a body of length 1, and
     the warning logged. Red.
  3. Fix, minimally, in each `reportRefused`: `Effect.sync(() => onRefused(refusal)).pipe(Effect.catchCause((cause) => Effect.logWarning("qadi/http: an onRefused hook threw").pipe(Effect.annotateLogs({ …same three…, "qadi.cause": String(cause) }))))`.
     T5 replaces both with `reportEncodeRefusal`.
- **Tests:** two new tests, red-first.
- **Verify:** `pnpm vitest run packages/http/test/decisionStream.test.ts packages/http/test/decisionBacklog.test.ts`.
- **Done when:** both pass. This can ship alone as an `@qadi/http` patch.

### T3 — Core: the pure readings beside `EncodeRefusal`
- **Status:** [x] done
- **Depends on:** T0, D-25-b, D-25-c, D-25-f
- **Files:** `packages/core/src/Errors.ts`, `packages/core/test/EncodeRefusalReport.test.ts` (*new*), `packages/core/test/Errors.tst.ts`.
- **Steps:**
  1. In `Errors.ts`, after `EncodeRefusal`'s constructors (`:427`), add `import * as Match from "effect/Match"`
     to the imports and:
     - `export const encodeRefusalPath: (self: EncodeRefusal) => WirePath | undefined`. This is a module-scope
       `Match.type<EncodeRefusal>().pipe(Match.tagsExhaustive({ Circular: (r) => r.path, TooDeep: (r) => r.path, NonFinite: (r) => r.path, Unrepresentable: (r) => r.path, Opaque: (r) => r.path, EncodeFailed: () => undefined }))`.
       Doc: one-line summary, then why it uses `Match` rather than `"path" in` (C9, AGENTS.md §5a).
     - `export interface EncodeRefusalAnnotations { readonly "qadi.refusal": EncodeRefusal["_tag"]; readonly "qadi.path": string; readonly evaluationId: string }`.
     - `export const encodeRefusalAnnotations = (self: { readonly refusal: EncodeRefusal; readonly evaluationId: string }): EncodeRefusalAnnotations`.
       Path segments are joined with `"."`, and no path renders as `""`. Doc: "never a value from the record,
       never `EncodeFailed.message`" (INV-QD-NEXT). Path segments are the caller's object keys.
     - `export const describeEncodeRefusal: (self: EncodeRefusal) => string`. This is `AuditEntry.ts:72-86`'s
       `where` + `describeRefusal`, moved **verbatim** so audit's `reason` strings stay byte-identical. Doc:
       "for a caller holding the refusal; may carry `EncodeFailed.message`, caller text. Never an annotation."
  2. Tests in the new file:
     - Per variant, a table over all six `EncodeRefusal` constructors gives the path, the annotations and
       the exact sentence. Copy the expected sentences from `AuditEntry.test.ts:71/106/154`, and add the
       other three.
     - Pass a real `SinkRecordNotEncodable` from `encodeSinkRecord` and get its annotations.
     - **Sentinel property** (`fast-check`, already a core devDependency; confirm in T0): over generated
       records whose refused value carries a random sentinel string (as a `Set` member, a `Map` value, a
       throwing getter's message, a `Symbol` description, a function name), no value of
       `encodeRefusalAnnotations(refusal)` includes the sentinel. Paths are generated from fixed
       non-sentinel keys.
  3. In `Errors.tst.ts`, assert that `EncodeRefusalAnnotations` has exactly the three keys and that
     `encodeRefusalAnnotations` accepts both `SinkRecordNotEncodable` and `{ refusal, evaluationId }`.
- **Tests:** as above, in `EncodeRefusalReport.test.ts` and `Errors.tst.ts`.
- **Verify:** `pnpm vitest run packages/core/test/EncodeRefusalReport.test.ts`; `pnpm test:tstyche`; `pnpm circular`.
- **Done when:** the tests pass and madge reports no cycle.

### T4 — Core: `reportEncodeRefusal`
- **Status:** [x] done
- **Depends on:** T3, D-25-a (= B), D-25-b
- **Files:** `packages/core/src/EncodeRefusalReport.ts` (*new*), `packages/core/src/index.ts` (alphabetical
  `export * from "./EncodeRefusalReport.ts"`), `packages/core/test/EncodeRefusalReport.test.ts`.
- **Steps:**
  1. Write `export const reportEncodeRefusal = Effect.fn("qadi.encodeRefusal.report")(function* <R extends { readonly refusal: EncodeRefusal; readonly evaluationId: string }>(refusal: R, options: { readonly message: string; readonly onRefused: ((refusal: R) => void) | undefined })`.
     Use the shape that type-checked in `tsprobe/probe.ts`. Capture `options.onRefused` in a `const`, as
     forwarding does at `DecisionSinkForwarding.ts:91-94`. If the hook is undefined, log
     `Effect.logWarning(options.message)` with `Effect.annotateLogs(encodeRefusalAnnotations(refusal))`.
     Otherwise run `Effect.sync(() => hook(refusal))` piped through
     `Effect.catchCause((cause) => Effect.logWarning("qadi: an encode-refusal hook threw").pipe(Effect.annotateLogs({ ...encodeRefusalAnnotations(refusal), "qadi.cause": String(cause) })))`.
     The return type is `Effect.Effect<void>`.
  2. The module doc gives a one-line summary, then: each adapter keeps its message and its hook (ADR-QD-095
     D-09-e), and this owns the rest.
  3. Tests: with a hook, the hook is called once and nothing is logged. With no hook, exactly one warning
     carries `message` and the three annotations. With a throwing hook, the effect **succeeds**, one
     warning containing `hook threw` carries the annotations and `qadi.cause`, and it does not die (assert
     with `Effect.exit`).
- **Verify:** `pnpm vitest run packages/core/test/EncodeRefusalReport.test.ts`; `pnpm circular`.
- **Done when:** the tests pass.

### T5 — Route the three existing adapters through core, and audit's sentence
- **Status:** [x] done
- **Depends on:** T1, T2, T3, T4
- **Files:** `packages/core/src/DecisionSinkForwarding.ts`, `packages/http/src/DecisionStreamRoute.ts`,
  `packages/http/src/DecisionBacklogRoute.ts`, `packages/audit/src/AuditEntry.ts`, `packages/audit/src/AuditDecisionSinkLive.ts`.
- **Steps:**
  1. Forwarding: delete `refusalAnnotations` (`:29-38`). `reportRefusal` (`:97-104`) keeps its
     `Effect.fn("qadi.decisionSinkForwarding.refused")` and its body becomes
     `yield* reportEncodeRefusal(refusal, { message: "qadi: a decision record could not be encoded for forwarding", onRefused: onFailure })`.
     `onFailure: (unknown) => void` accepts `SinkRecordNotEncodable` by parameter contravariance; check it
     with `pnpm typecheck`. The outer `catchCause` (`:132-139`) stays: it also guards a throwing
     `onFailure` on the **send** path.
  2. Stream (`:176-198`) and backlog (`:33-52`): each `reportRefused` keeps its span name and message, and
     its body becomes `yield* reportEncodeRefusal(refusal, { message, onRefused })` (the stream still
     returns `Result.fail(refusal)`). T2's local `catchCause` is deleted, because the reporter now owns it.
  3. Audit: delete `where` and `describeRefusal` (`AuditEntry.ts:71-86`) and the `effect/Match` import if it
     is now unused. Set `reason: describeEncodeRefusal(error.refusal)`. Delete T1's local path reader. The
     pipeline's warning becomes `reportEncodeRefusal(<refusal>, { message: <T1's message>, onRefused: undefined })`.
     Until T6 the refusal value is `{ refusal: encoded.failure.refusal, evaluationId: sinkRecord.evaluationId }`.
  4. `grep -rn '"path" in \|"qadi.refusal"\|"qadi.path"' packages/*/src` → only `Errors.ts`.
- **Tests:** none added. The adapter tests that pin message and annotations stay **unmodified** and must
  pass: `DecisionSinkForwarding.test.ts:293-344`, `decisionStream.test.ts:780-867`, `decisionBacklog.test.ts:150-175`,
  `AuditEntry.test.ts:71/106/154`, plus T1 and T2.
- **Verify:** `pnpm vitest run packages/core/test/DecisionSinkForwarding.test.ts packages/http/test/decisionStream.test.ts packages/http/test/decisionBacklog.test.ts packages/audit/test`; `pnpm typecheck`.
- **Done when:** all pass and the grep in step 4 holds.

### T6 — Audit: `onRefused` and `evaluationId`
- **Status:** [x] done
- **Depends on:** T5, D-25-d (= A), D-25-e (= A)
- **Files:** `packages/audit/src/AuditEntry.ts`, `packages/audit/src/AuditDecisionSinkLive.ts`,
  `packages/audit/test/AuditDecisionSinkLive.test.ts`, `packages/audit/test/AuditEntry.test.ts`.
- **Steps:**
  1. Add `readonly evaluationId: string` to `AuditEntryNotEncodable` (`AuditEntry.ts:65-69`) and set it in
     `encodeAuditEntry` (`:136-141`) from `record.evaluationId`. Update the class doc.
  2. Add `readonly onRefused?: (refusal: AuditEntryNotEncodable) => void` to `AuditDecisionSinkOptions`
     (`AuditDecisionSinkLive.ts:39-51`). Doc: it replaces the warning, the `encode_failed` counter
     increments either way, and a hook that throws is logged, never a defect (INV-QD-035).
  3. In the pipeline, call `reportEncodeRefusal(encoded.failure, { message, onRefused: options?.onRefused })`,
     then `Metric.update(writesEncodeFailed, 1)`.
  4. Tests: the hook is called once with `evaluationId`, `refusal._tag` and `reason`; no warning is logged;
     the counter is still `encode_failed`. A throwing hook means `sink.record` succeeds, the next healthy
     record is still written, and one `hook threw` warning is logged. In `AuditEntry.test.ts`, assert
     `result.failure.evaluationId`.
- **Verify:** `pnpm vitest run packages/audit/test`.
- **Done when:** all pass.

### T7 — Gate the single reading (D-25-h)
- **Status:** [x] done
- **Depends on:** T5, D-25-h (= A)
- **Files:** `scripts/check-house-style.mjs`.
- **Steps:**
  1. Add the rule `{ id: "no-refusal-annotation-outside-core", … }` in the existing rule-table style
     (`:118-238`). It matches `/"qadi\.(refusal|path)"|"path" in /` in `packages/*/src/**` except
     `packages/core/src/Errors.ts`. The message names `encodeRefusalAnnotations`/`encodeRefusalPath`.
  2. Prove it: temporarily re-add `"path" in` to a copy of `DecisionBacklogRoute.ts` in the scratchpad, or
     add a self-test if the script has a fixture mechanism, and confirm that gate 4 fails.
  3. Add one sentence to AGENTS.md §4 or §5a naming the rule. This requires the maintainer's approval,
     because AGENTS.md is project instruction. If it is declined, put the sentence in the rule's own doc
     comment only.
- **Verify:** `node scripts/check-house-style.mjs`.
- **Done when:** the script passes on the branch and fails on the probe.

### T8 — Spec, ADRs, overview, traceability, CCR, docs, changeset
- **Status:** [x] done
- **Depends on:** T3–T7
- **Files:** `spec/decisions/095-sinkcodec-owns-both-directions.md`, `spec/decisions/056-audit-companion-package.md`,
  `spec/behaviors/33-audit-pipeline.md`, `spec/behaviors/26-decision-stream.md`, `spec/behaviors/24-decision-sink.md`,
  `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md` (CCR register),
  `packages/audit/README.md`, `apps/website/src/content/docs/docs/packages/audit/capabilities.md`, `.changeset/*` (*new*).
- **Steps:** see §8 for every edit. Then:
  1. `node scripts/check-api-surface.mjs` (gate 13).
  2. `node scripts/check-doc-examples.mjs`, because the BEH-QD-249 `ts` fence changes. It stays `ts` unless
     it is made compilable.
  3. Changeset: `@qadi/core` minor (new exports), `@qadi/http` patch (C7), `@qadi/audit` minor
     (`onRefused`, and `AuditEntryNotEncodable.evaluationId` is required, which breaks code that constructs
     the class).
- **Verify:** `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates`.
- **Done when:** all four pass.

### T9 — Full gate
- **Status:** [x] done
- **Depends on:** T1–T8
- **Files:** none.
- **Steps:**
  1. Run `pnpm check`. Look closely at the mutation stage. In `stryker.config.mjs` (core), the six arms of
     `encodeRefusalPath`/`describeEncodeRefusal` and the hook/no-hook/throw branches of
     `reportEncodeRefusal` are killed by T3/T4's tests. In `stryker.audit.mjs`, audit loses
     `describeRefusal`'s mutants and gains the `onRefused` wiring, which T6 covers. In `stryker.http.mjs`,
     each `reportRefused` shrinks to one call.
  2. A survivor is either a missing test (add it) or recorded as a finding, never suppressed (ADR-QD-076).
- **Verify:** `pnpm check`.
- **Done when:** green.

### T10 — Update the tracker
- **Status:** [x] done
- **Depends on:** T9
- **Files:** `.planning/architecture/ARCH-25-encode-refusal-description.md` (frontmatter `status`, task
  boxes, §10). The orchestrator owns `.planning/architecture/README.md`'s row.
- **Steps:** set `status: implemented`, tick the tasks, record the commit SHAs and the CCR/ADR numbers
  assigned in §10, and hand the README row to the orchestrator.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-25-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Replace, don't layer.** The *content* of a refusal report (which three keys, how a path renders, that
  no value leaks, every variant's sentence) is tested **once**, in `packages/core/test/EncodeRefusalReport.test.ts`.
  The adapter tests keep only what is the adapter's own: its message, its hook wiring, and that it drops
  only its record. The existing adapter annotation assertions (`DecisionSinkForwarding.test.ts:318-319, 342-343`,
  `decisionStream.test.ts:831-832, 866-867`, `decisionBacklog.test.ts:169-173`) stay unmodified through T5 as
  the regression net for "byte-identical behavior". Afterwards they may be trimmed to the message plus one
  annotation, at the implementer's discretion. Trimming is optional, because each also pins that its
  adapter calls the reporter at all.
- **Moved:** `AuditEntry.test.ts`'s three exact-`reason` assertions (`:71`, `:106`, `:154`) stay as audit's
  proof that `reason` is filled. The per-variant sentence table moves to core (all six variants, where
  audit pinned three).
- **New:** T1 (audit observable, red-first), T2 (throwing hook, red-first, ×2), T3 (per-variant table +
  sentinel property + type test), T4 (reporter: hook / log / throw), T6 (audit hook).
- **Property:** T3's sentinel property is the enforcement of INV-QD-NEXT, with the same shape as
  INV-QD-044's sentinel test in `Evaluate.test.ts`.
- **Mutation:** three configs are involved (core, http, audit). Under `ignoreStatic`, the module-scope
  `Match.type(...)` construction is skipped, and the arm bodies are per-call and covered by the
  per-variant table.

## 8. Spec and documentation updates

- **ADR-QD-095:** a dated amendment block (CCR-QD-NEXT). D-09-e gains: "Audit: the pipeline reports a
  refusal (`AuditDecisionSinkOptions.onRefused`, else 'could not be encoded for the audit trail'), with
  the same annotations. Every reporter reads the path, the annotations and the hook containment through
  `@qadi/core`'s `encodeRefusalAnnotations`/`reportEncodeRefusal`. `describeEncodeRefusal` is the sentence
  `AuditEntryNotEncodable.reason` carries. Each adapter keeps its own message and hook." Also add a
  revision row.
- **ADR-QD-056:** one paragraph. An encode refusal is witnessed by a log line naming its `evaluationId`
  and by `qadi_audit_writes_total{outcome=encode_failed}`, the standard the breaker-open drop already meets.
- **BEH-QD-249** (`33-audit-pipeline.md`): the `ts` signature fence gains `onRefused`. (The fence today shows
  `resetTimeoutMs?: number` where the code has `Duration.Input`; correct it in the same edit.)
- **BEH-QD-250:** a new REQUIREMENT: "A refused record MUST be reported, through `onRefused` when given,
  otherwise by a warning naming the refusal, its path and the evaluation id. It MUST NOT be dropped
  silently, and a hook that throws MUST NOT fail the record or the decision." `AuditEntryNotEncodable`
  gains `evaluationId` in the fence.
- **BEH-QD-311** (`26-decision-stream.md`): add "an `onRefused` that throws MUST NOT end the feed. It is
  reported." State the same of the backlog route in BEH-QD-314/316, whichever covers `/__decisions/backlog`
  (confirm in T8).
- **BEH-QD-187** (`24-decision-sink.md`): no change in behavior. Add one sentence: the default log's
  annotations come from `encodeRefusalAnnotations`.
- **Invariants:** a new INV-QD-NEXT, "A refusal report says where, never what". Source:
  `Errors.ts`'s `encodeRefusalAnnotations`. Enforcement: T3's sentinel property. Related: INV-QD-044,
  INV-QD-097. INV-QD-097's Source/Enforcement gain `EncodeRefusalReport.ts` and T2's tests.
- **`spec/overview.md`** (gate 13): add `encodeRefusalPath`, `encodeRefusalAnnotations`, `EncodeRefusalAnnotations`,
  `describeEncodeRefusal` to the Errors prose list (`:382-383`, beside `EncodeRefusal`) and a sentence
  after `:429-440`. Add a row for `reportEncodeRefusal` (function, `EncodeRefusalReport.ts`) in the codec
  table near `:295`. Update the `AuditEntryNotEncodable` row (`:649`): it now carries `evaluationId`, and
  `reason` comes from core's `describeEncodeRefusal`. Bump the revision row.
- **Traceability:** add `packages/core/test/EncodeRefusalReport.test.ts` → INV-QD-NEXT, INV-QD-097,
  BEH-QD-250, BEH-QD-311. Add BEH-QD-250 to `AuditDecisionSinkLive.test.ts`'s row. Add an INV-QD-NEXT row
  to the invariant table.
- **CCR register** (`spec/README.md`): CCR-QD-NEXT, listing every file above.
- **Docs:** `packages/audit/README.md` (`:54-56`) and the website `capabilities.md` (`:38-41`) say a refused
  record is logged (or reaches `onRefused`) with its `evaluationId`.
- **Changeset:** as in T8.

## 9. Risks and rollback

- **Byte-level log drift.** A consumer alerting on the exact annotation keys or messages would break if T5
  changed them. Mitigation: T5 adds no test and modifies none of the pinning tests, so any drift is red.
- **A nested span on the refusal branch** (`qadi.encodeRefusal.report` under each adapter's span). It is
  visible in traces, costs only on refusal, and no spec pins span trees. If unwanted, drop the adapters'
  own `Effect.fn` wrappers instead and accept one span name (record that in D-25-a).
- **`AuditEntryNotEncodable.evaluationId` is required.** It breaks third-party code that constructs the
  error, which is unusual for an error raised by `encodeAuditEntry`. It is a 0.x minor, and the changeset
  says so.
- **Audit log volume.** A pathological resource refused on every evaluation now logs on every evaluation,
  as forwarding and the stream already do. `onRefused` is the lever to sample or aggregate.
- **Path segments are caller keys** (C8 caveat 1). A data-keyed resource puts its keys in `qadi.path`. This is
  unchanged behavior, now documented on `encodeRefusalAnnotations`. Redacting keys would make the
  annotation useless, so it is not attempted.
- **Overlap churn.** ARCH-28 may move `frame`/`reportRefused` into core, and ARCH-27 may move `EncodeRefusal`.
  Whichever lands second rebases onto the other. The reporter is the stable seam for both.
- **Sibling gap left open:** `writesWriteFailed` has no log (§3). It is for ARCH-07/ADR-QD-056's gap-marker work.
- **Rollback.** T1 and T2 are independent patches and can be reverted alone. T3–T7 revert together (one
  PR). Core's new exports are additive, so reverting them breaks only T5's call sites, which revert with them.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written | planner |
| 2026-10-07 | T0 | re-baselined on `arch/wave3` at 7af1e22 (not a fresh branch from main, per the wave brief); `"path" in` and `"qadi.refusal"` found exactly three times, as C3. Probes not re-run: T1/T2 were observed red as tests | implementer |
| 2026-10-07 | T1, T2 | tests written first and observed red (audit: 0 log lines; stream/backlog: the hook's throw failed the feed and the response), then green through T4/T5's reporter. The interim local fixes were not committed separately: one commit | implementer |
| 2026-10-07 | T3-T6 | readings in `Errors.ts`, `EncodeRefusalReport.ts`, three adapters and audit routed through core; `onRefused` and `evaluationId` on audit. `EncodeRefusalAnnotations` is a `type` alias, not an interface: an interface is not assignable to `Record<string, unknown>`, which `Effect.annotateLogs` takes | implementer |
| 2026-10-07 | T7 | rule `no-refusal-annotation-outside-core` (raw, `Errors.ts` exempt; test files are out of scope for non-`testScope` rules). Proved red on a temporary `"path" in` and `"qadi.path"`. AGENTS.md sentence NOT added (the wave brief reserves AGENTS.md edits); it is in the rule's doc comment only | implementer |
| 2026-10-07 | T8 | spec: ADR-QD-095 Rev 1.2 and ADR-QD-056 Rev 1.9 amended (no new ADR, D-25-g=A), INV-QD-104, BEH-QD-250 (edited in place: it already exists and is the audit refusal behaviour, not a new id), BEH-QD-311/315/187, overview, traceability, CCR-QD-193, docs, changeset `encode-refusal-described-once.md` | implementer |
| 2026-10-07 | T9 | `pnpm check`, mutation and coverage NOT run (the orchestrator runs them once at the end). Ran: typecheck, lint, circular, test:tstyche, vitest core/http/audit, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package | implementer |
| 2026-10-07 | T10 | status set to implemented; commit sha in the final report. Not hooked into `SinkEmit.ts`: the plan has no such task, and the evaluator's silent swallow of a sink failure stays ARCH-16's (non-goal §3) | implementer |
