---
id: ARCH-31
title: Derive a remote port's wire codec from its description, so the serving route and the client adapter for all five ports are one derivation, and an outage stays a failure by construction
strength: Strong   # from the 2026-10-07 architecture review (wave 4), card c2
status: done
evidence_verified_at: e635e68
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-094 (amend: a description also states its wire, `PortDescription.wire`, the way ARCH-21 added `attributes`; the registry makes a missing wire a compile error)
  - ADR-QD-051 (amend: `PortInterpreter` gains `"remote"`, so a served read opens the port's span like any other read; a third sibling metric)
  - ADR-QD-077 (constraint: `PortAccess.ts` stays the one module that reads a port; the served read is added there, not in the route)
  - INV-QD-006 (invariant), ADR-QD-020, ADR-QD-040 (read: `"Unknown"` means nobody can say; an unreachable store is an error, never `"Unknown"`)
  - ADR-QD-039 / ADR-QD-041 (read: a seed is not an authority; a client-side failure is never announced as a mismatch, BEH-QD-152)
  - ADR-QD-036 (constraint: only `@qadi/http` imports `effect/http`; the cited "ADR-QD-064" does not exist, §1 C9)
  - ADR-QD-072 / ADR-QD-060 (constraint: no new `Schema.TaggedError`; a port error's `cause` never crosses to a client, the `ENFORCEMENT_ERROR_WIRE` precedent)
  - ADR-QD-099 (constraint: closed entry points; anything `@qadi/http` needs from core is a barrel export)
  - ADR-QD-037 (constraint: madge; the extracted JSON walk and the new modules import no port module)
  - ADR-QD-002 / AGENTS.md §7 (read: data that crosses a trust boundary is schema-first; `RelatedResult`/`ActedResult` become schema-derived)
  - ADR-QD-076 (constraint: `ignoreStatic`; module-level wire tables are pinned by golden round-trip tests, not by Stryker)
  - ADR-QD-038 (constraint: changesets, fixed group; no release step)
  - ADR-QD-NEXT (new: "A port is answered remotely through its description")
packages: ["@qadi/core", "@qadi/http", "@qadi/devtools", "examples/nextjs-newsroom", "spec", "apps/website (docs)"]
estimate: XL   # ≈ 8–9 days for T0–T10. Defect-only path (T1, plus T2 once D-31-b is taken) ≈ ½–¾ day (S)
---

# ARCH-31 — Derive a remote port's wire codec from its description

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68` (`git rev-parse --short HEAD`). Nothing in the repo was edited. Probes live
under `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-31/`
(below, `$P`):

- **`$P/outage.test.ts`** drives the newsroom's **real** `ApiLayer` (`src/server/api.ts`) through
  `HttpRouter.toWebHandler`, with `src/server/ports.ts` replaced by `vi.mock` so the three stores fail
  (`scriptedPort(…, () => PortReply.fail(…))` for attribute/history, a recording failing layer for
  relationships). A stubbed `fetch` routes the newsroom's **real** browser adapters
  (`src/client/ports.ts`'s `browserPorts`) to that handler, and policies are evaluated on the client side
  as Nadia (an author) against her own draft `night-shift`.
- **`$P/subst.test.ts`** drives the real `ApiLayer` with the real ports and varies the cookie and the query.
- **`$P/tsprobe/spike.ts`** type-checks a generic wire codec over the port registry: a `PortWire<Args, A>`
  that closes over its question type, a `WIRES` table typed `{ [K in PortName]: PortWire<ArgsOf<…>, AnswerOf<…>> }`,
  and a serving half and an asking half generic in `K extends PortName`, with no `as` and no `any`.
  `$P/tsprobe/neg.ts` swaps one row's answer schema and must fail.

Commands (re-run in T0):

```sh
P=/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-31
# $P has node_modules -> examples/nextjs-newsroom/node_modules, a server-only stub, and a vitest config
# (environment "node": happy-dom's Request strips the forbidden `cookie` header, which made every
#  request anonymous on the first run)
cd examples/nextjs-newsroom && ./node_modules/.bin/vitest run --config $P/vitest.config.ts --disableConsoleIntercept
cd $P/tsprobe && /Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/tsc -p tsconfig.json      # exit 0
cd $P/tsprobe && /Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/tsc -p tsconfig.neg.json  # 1 error
```

Probe output (verbatim, trimmed):

```
ROUTE /api/ports/attribute?subjectId=nadia&attribute=clearance -> 503 the attribute store did not answer
ROUTE /api/ports/relationship?subjectId=nadia&relation=author-of&resourceId=night-shift -> 200 {"related":"Unknown"}
ROUTE /api/ports/history?subjectId=nadia&event=legal-review&resourceId=night-shift -> 200 {"answer":"Unknown"}
ROUTE /api/ports/relationship?…&depth=abc -> 200 {"related":"Unknown"}
RESOLVER SAW [{…"depthIsNaN":false},{…"depth":null,"depthIsNaN":true}]
ATTRIBUTE FAILURE Cause([Fail(AttributeResolveError (cause: … answered 503))])
CANREAD {"tag":"Deny","reason":"subject lacks role 'Editor'"}
NOT-BANNED Allow
ACTED Deny no history is available for 'legal-review' NOT-ACTED Allow
SUBST cookie=nadia  ask nadia -> 200 {"related":"Related"}
SUBST cookie=yasmine ask nadia -> 200 {"related":"Unrelated"}
SUBST anyattr cookie=nadia attribute=__proto__ -> 200 {"value":{}}
SUBST missing params -> 200 {"related":"Unrelated"}
```

| # | Claim (review card c2, and the brief) | Verdict | At `e635e68` |
| - | ------------------------------------- | ------- | ------------ |
| C1 | `client/ports.ts` (137 lines) hand-writes adapters for AttributeResolver, RelationshipResolver, DecisionHistory, with `Effect.tryPromise(async …)` | **CONFIRMED** | `wc -l` = 137. `ask` at `:57-65` (`Effect.tryPromise(async () => { … await fetch … })`), adapters at `:73-84`, `:89-107`, `:112-126`, `browserPorts` at `:133-137`. The `async` passes the gate only because `scripts/check-house-style.mjs:58-64` deliberately does not scan `examples/*`. Also found by reading: `tryPromise`'s `signal` is never passed to `fetch`, so an interrupted re-check (subject change, unmount) leaves its request running (read, not probed). |
| C2 | The client re-declares answer guards `isRelated`/`isActed` that core already declares as schemas (`RelationshipResolver.ts:138`, `DecisionHistory.ts:104`) | **CHANGED** | Guards at `client/ports.ts:86-87` and `:109-110`: CONFIRMED. But core's literals are **span** fields, `Schema.optionalKey(Schema.Literals([...]))` inside a module-private `spanStruct` (`RelationshipResolver.ts:137-140`, `DecisionHistory.ts:102-105`), not an exported codec. And core itself states each set twice: the hand-written `type RelatedResult` (`RelationshipResolver.ts:83`) and `type ActedResult` (`DecisionHistory.ts:44`) sit beside those span literals. One schema per set, with the type derived, is AGENTS.md §7's rule for boundary data (T3). |
| C3 | `api.ts:92-163`: the attribute route maps an outage to 503; the relationship and history routes map it to 200 `"Unknown"` | **CONFIRMED (defect, probe)** | `AttributePort` `:92-111` (`catchTag` → 503 at `:105-108`). `RelationshipPort` `:113-137` (`catchTag("RelationshipResolveError", () => succeed("Unknown"))` at `:132`). `HistoryPort` `:139-157` (same at `:152`). Probe: `ROUTE … 503` vs `200 {"related":"Unknown"}` / `200 {"answer":"Unknown"}`. |
| C4 | `DecisionHistory.ts:38-44` and `RelationshipResolver.ts:63-83` reserve `"Unknown"` for "no store wired", so an outage becomes a denial (INV-QD-005/006) | **CONFIRMED, and worse: an outage can become a grant** | `DecisionHistory.ts:38-41`: "`"Unknown"` means *nobody can say* — no store is wired. A store that is wired and unreachable is a `DecisionHistoryUnavailable`, which is an error, not an answer." `RelationshipResolver.ts:73-81` says the same, and allows a wired store to answer `"Unknown"` for a relation it has no namespace for. The invariant is **INV-QD-006** "Failure is not denial" (`spec/invariants.md:184`). INV-QD-005 is short-circuit preservation, and `api.ts:102` cites it wrongly. Probe, client side: (a) `canReadArticle` for Nadia on her own draft is **Deny** where the server, with its store up, allows. That is a hydration mismatch BEH-QD-152 then announces, against its own requirement "A client-side FAILURE MUST NOT be reported as a mismatch" (`spec/behaviors/19-hydration.md:300`). (b) `not(hasRelationship("banned"))`, the shape `spec/models/09-acl.md:171` documents, is **Allow** during a relationship outage. (c) `not(hasActed(…))` is **Allow** and `hasActed(…)` denies with the false sentence "no history is available". The newsroom's own `canPublishArticle` row `denyWhen(not(hasActed("legal-review")))` (`domain/policies.ts:92-97`) therefore says "legal has not signed it off" during an outage. With a failure instead, all four would be failures. |
| C5 | `Number(depth)` → `NaN` on bad input (`api.ts` ~128) | **CONFIRMED (defect, probe)** | `api.ts:128` `depth: depth === undefined ? undefined : Number(depth)`. Probe: `depth=abc` reaches the resolver as `NaN` (`depthIsNaN: true`). The route builds `RelationshipCheck` itself, so it bypasses both `Policy.ts`'s decode bound (`RelationshipDepth`, `Policy.ts:424-426`) and `PortAccess.ts`'s `clampRelationshipDepth` (`:339-343`), the two places core bounds this numeric. A traversal resolver (the one `RelationshipResolver.ts:31-52` obliges to spend `depth`) receives unbounded garbage. |
| C6 | *(found in verification)* A malformed question is answered as a real one | **CONFIRMED (defect, probe)** | `query(…) ?? ""` at `api.ts:98, 123-124, 149`. Probe: `GET /ports/relationship` with no parameters → `200 {"related":"Unrelated"}`, a confident answer to a question nobody asked. |
| C7 | *(found in verification)* A route answers about a different subject than the one asked, silently | **CONFIRMED (defect, probe)** | `askingSubject` (`api.ts:83-86`) replaces the query's `subjectId` with the cookie's. That prevents enumeration, as intended (`:74-82`), but it answers a **different question** under the asked one's name. Probe: asking about Nadia (truly `Related`) with Yasmine's cookie returns `Unrelated`. The client asks about other subjects for real: the dock's simulator uses `browserPorts` as its Live source (`Dock.tsx:184`), and its subject is renameable (`devtools/src/model/SimulationSession.ts:536-537`). `RelationshipResolverShape.check`'s doc (`RelationshipResolver.ts:97-103`) says devtools' capture asks about other subjects. `e2e/ssr.spec.ts:153-163` **pins** the substitution ("Yasmine's clearance, not Hakim's"). |
| C8 | *(found in verification)* An unrecognised answer body is read as `"Unknown"` | **CONFIRMED (defect, read)** | `client/ports.ts:101-104` and `:120-123`: a 2xx whose body has no recognised `related`/`answer` becomes `"Unknown"`. So a proxy or a version-skewed server that answers 200 with another shape produces C4's denial-or-grant. The comment at `:98-100` gives the reverse of the right reason: "so a broken far end cannot be read as a denial". |
| C9 | "ADR-QD-064 (only `@qadi/http` speaks HTTP)" | **REFUTED as a citation; the fact holds** | No ADR-QD-061…071 exists (`ls spec/decisions`, `grep 'ADR-QD-064' -r spec packages AGENTS.md` empty). The fact: `grep -rln 'effect/http' packages/*/src` lists only `packages/http/src/*`. `QadiHttpError.ts:170-172` gives the rule ("`@qadi/core` has no dependency on `effect/http-api` at all", citing ADR-QD-072), and ADR-QD-036 is the package-shape ADR. This plan cites those two. |
| C10 | BEH-QD-067 (client re-check) is why remote ports exist | **CHANGED** | BEH-QD-067 is the Provider (`09-react.md:248`). Re-checking is BEH-QD-151 ("A seed is superseded by this client's own answer", `19-hydration.md:229`, and `:241-253`: "covering [a failure] with the server's allow would report an outage as permission"). The announcement is BEH-QD-152. **No spec text mentions remote ports at all** (`grep -rni 'remote port\|over HTTP\|ports are remote' spec apps/website/src` returns nothing): the pattern exists only in the example. T8 adds the behavior doc. |
| C11 | Each port description already knows its question, answer and failure, so derive a serving and a client adapter "the same way `retryingPort`/`nonePort` are derived" | **PARTLY REFUTED** | A description knows `failure`/`defect` (typed error builders), `key`, `none`, and the `invoke`/`make` lens (`PortDescription.ts:65-121`). It does **not** know a wire question or answer. `attributes` is a **span** projection, lossy by design. The attribute answer is `{ resolved: boolean }` (`AttributeResolver.ts:98-99`, INV-QD-044's type floor, `PortSpan.ts:23-30`: a span field cannot hold a value). The custom-predicate span never carries `params` (`CustomPredicate.ts:85-93`). The signature span carries `matched`, not the signatures (`SignatureHistory.ts:103-122`). Span question fields are all `optionalKey`. So the wire must be **added** to each description (T3). The spike shows it can be stated per port and consumed generically with no `as` (`tsc` exit 0; the negative check fails with exactly one error). |
| C12 | "Is there a server `ports.ts` in the newsroom edited on every core port change?" | **CHANGED** | `src/server/ports.ts` exists, but it holds the server's **real** adapters (directory, edges, events), not a serving half. The serving half is `api.ts:74-157`. "Edited on every port change" is roughly true of the client half. Of the five commits after creation that touched `client/ports.ts`, three were core port changes: `bbfd7da` (custom predicate), `f86f028` (signatures), `1fd8700` (ARCH-10 descriptions). `git log --oneline -- examples/nextjs-newsroom/src/client/ports.ts`. |
| C13 | Disclosure: "closed three-valued enums … disclose no more than a policy tag" (spec overview ~1736) | **CHANGED (location)** | The sentence is `spec/invariants.md:1733-1739`, INV-QD-044, not the overview. It covers relationship and history (enums), custom (boolean) and signature `matched` (boolean). An **attribute value is arbitrary data**, and the newsroom serves **any** attribute name: probe `attribute=__proto__` → `200 {"value":{}}`. That is because the directory (`server/ports.ts:52`) indexes `attributes[attribute]` through the prototype chain, so `constructor`, `toString` and friends resolve too. A signature answer is the full `Signature` record list (`Signature.ts:25-66`: `signerId`, `signedAt`, `algorithm`, `keyId`). That list is the subject's own (`SignatureQuery.subjectId`), but it is more than `askSignature` reads (`meaning`, `signerRole`: `PortAccess.ts:449`). |
| C14 | "Deletes ~200 host lines in the newsroom" | **CONFIRMED (≈220)** | `client/ports.ts` 137 lines, plus `api.ts:74-157` ≈ 84. After T7 the host keeps about 25: a served-ports declaration and the server-render switch (D-31-i). |
| C15 | Served reads are invisible on the server | **CONFIRMED (read, found in verification)** | The routes call `AttributeResolver.resolve`/`RelationshipResolver.check`/`DecisionHistory.hasActed` directly (`api.ts:103, 121, 147`), not through `PortAccess.ts`. So a served read opens no `qadi.*` span (ADR-QD-051), counts in no metric, and is not defect-guarded (`catchPortDefect`, ADR-QD-077). A store that **dies** turns the route into a 500 by accident, not by design. The server's own Port calls panel (`server/layer.ts:43`) never shows the calls the browser caused. |

**Other facts the plan relies on.**

- **The registry's types support a generic derivation.** `DescriptionOf<K>`, `ArgsOf`, `AnswerOf`, `ServiceOf`,
  `tabulatePorts`/`mapPorts`/`portsLayer` (`Ports.ts:70-213`) already keep a port's name, args and answer
  correlated (the spike relies on exactly this).
- **Every port error is a `Schema.TaggedError` with `cause: Schema.Defect()`** (`Errors.ts:81-133, 275-281`), but
  `@qadi/http` already refuses to put `cause` on a client-visible body. `QadiHttpError.ts:197-208` declares
  tag-plus-safe-field projections for exactly these five. The wire here follows that: no server cause crosses.
- **A JSON-hazard walk already exists**, module-private: `SinkCodec.ts:357` `wireHazard(root, maxDepth): EncodeRefusal | undefined`,
  with `EncodeRefusal` in the leaf `SinkWire.ts`. Decoding untrusted JSON already has `exceedsJsonDepth`
  (`DecodeDepthGuard.ts`) and `UNTRUSTED_DECODE_OPTIONS` (`Policy.ts`).
- **`Schema.Json`** exists in `effect@4.0.0` (`node_modules/effect/src/Schema.ts:16397`). So do `HttpClientRequest.post`/`bodyJson`
  (`HttpClientRequest.ts:205, 1044`), `HttpClientResponse.schemaJson` (`:105`), `HttpServerRequest.schemaBodyJson`
  (`:261`) and `HttpServerResponse.json` (`:328`).
- **`PortInterpreter` is stated twice**: `type PortInterpreter = "evaluate" | "toPredicate"` (`PortSpan.ts:74`) and
  `Schema.Literals(["evaluate", "toPredicate"])` (`PortSpanEncode.ts:92`). Its consumers are `PortAccess.ts:62, 136-145`
  (`countFor`), `devtools/src/model/PortCalls.ts:54` and `devtools/src/react/ServicesPanel.tsx:204`.
- **Metrics precedent**: each interpreter counts in its own sibling metric (`PortMetrics.ts:33-45, 93-106`,
  `portCallsTotal` / `predicatePortCallsTotal`). A metric's description is part of its registry key (ADR-QD-052).
- **`RelationshipDepth`** (`Policy.ts:424`) is module-private. **`SubjectIdSchema`/`ResourceIdSchema`** are exported (`Identity.ts:46, 52`).
- **Newsroom test setup**: `vitest.config.ts` uses happy-dom and has no `server-only` alias. No existing test imports a
  `server-only` module (`grep -l server-only src/server/*.ts`: `api.ts`, `layer.ts`, `ports.ts`, `session.ts` and five more).
  `server-only` resolves only through Next (`node_modules/next/dist/compiled/server-only`, `react-server` condition).
  `pnpm example` (in `pnpm check`) runs the newsroom's typecheck, unit, build and e2e.
- **E2E pins** that change: `e2e/ssr.spec.ts:153-163` (substitution) and `:334` (`/api/ports/attribute` path).
  Text mentions: `app/edge/divergent/page.tsx:62` and `README.md:165`.

## 2. Goal and success criteria

**Goal.** A client that re-checks a seeded decision (BEH-QD-151) needs remote ports. Today every host
writes both halves by hand: query parsing, answer guards that restate core's literal sets, and the
outage mapping. The example gets the mapping wrong on two of three ports, so a store outage becomes a
denial, and under `not(…)` a grant (C4). This plan makes the **port description** the module that knows
what a port's question and answer look like on a wire, as ARCH-21 made it the module that knows its span.
On top of that, it builds two **deep** halves in core, transport-free. `answerRemotely` (serving) decodes
a question, refuses one about any subject but the session's (`CurrentSubject`), reads the port through
`PortAccess.ts` like any other read, and replies with a closed `PortWireReply`. `askRemotely` (asking)
builds the port's Shape from any `send` and turns every non-answer into the port's own typed error. The
**seam** is `send: (question: unknown) => Effect<unknown, unknown>` on one side and the reply union on the
other. `@qadi/http` supplies one adapter for each half (an `HttpRouter` route family and an `HttpClient`
layer), and only it speaks HTTP. **Leverage:** one derivation serves five ports and N hosts, and a Next
server action or a WebSocket would be another adapter at the same seam. **Locality:** "failure is not
denial", "answer only about the session subject" and "never put a server's cause on the wire" each live
in one place. A sixth port is a compile error until its description states its wire.

**Success criteria.**

1. In the newsroom, a relationship or history store outage makes the client's evaluation **fail**:
   `not(hasRelationship("banned"))` is a failure, not an Allow, and `canReadArticle` on an author's draft is
   a failure, not a Deny. A malformed question or a non-integer `depth` is a 400. Checked by
   `cd examples/nextjs-newsroom && pnpm vitest run test/port-routes.test.ts` (T1, red first).
2. A question about a subject other than the session's is **refused** (403 over HTTP, a typed failure on
   the client), never answered about someone else (T2).
3. For every registry row, `PortConformance.test.ts`'s "wire" cases round-trip a question and an answer
   (including `none.answer`). An answer with no JSON form (a `Set`, a `bigint`, `NaN`, a cycle) becomes a
   refusal, never a throw (T3).
4. `PortDescription` has a required `wire`, and a description without one, or with a wrong answer schema,
   does not compile (`pnpm test:tstyche`, `PortWire.tst.ts`) (T3).
5. A served read opens the port's own span with `qadi.interpreter = "remote"`, counts in
   `qadi_port_served_calls_total`, and a dying store becomes `Unavailable`, never a defect (T4).
6. `answerRemotely` + `askRemotely` round-trip all five ports in memory, and `portRoutes` +
   `remotePortsLayer` round-trip them over `HttpRouter.toWebHandler`. For every port, an outage reaches the
   asker as the port's own error with a `RemotePortFailure` cause and **no server cause text** (T5, T6).
7. `examples/nextjs-newsroom/src/client/ports.ts` has no `fetch`, no `async` and no answer guard.
   `api.ts` has no `/ports/` handler body. `grep -n "isRelated\|isActed\|tryPromise" examples/nextjs-newsroom/src`
   returns nothing. `pnpm example` is green (T7).
8. `node scripts/check-api-surface.mjs`, `node scripts/check-doc-examples.mjs` and `pnpm spec:verify:strict` pass,
   with the new behavior doc, invariant, ADR and overview rows in place (T8). `pnpm check` is green (T9).

## 3. Non-goals

- **Batching or caching remote answers.** Each question is one round trip, as today, and the cost is visible
  in Port calls. A batching `send` is a later adapter at the same seam. `DecisionCache` already caches
  decisions on the client.
- **`effect/rpc` or a derived `HttpApi` group** as the transport (D-31-f). The core halves allow either later.
- **The non-HTTP topologies.** The edge route (`app/api/edge/decide`) evaluates on the server and needs no
  remote ports.
- **`not(hasRelationship(…))` granting under an *unwired* resolver.** That is documented, accepted
  behavior (`spec/models/09-acl.md:176-182`, INV-QD-014 for history). This plan fixes only the case where a
  **wired, failing** store is mislabelled `"Unknown"`.
- **Server-render semantics of client ports.** The host keeps its `typeof window` switch (D-31-i).
- **The relationship replay key ignoring `depth`** (`RelationshipResolver.ts:179`), which is ARCH-45. The wire
  question carries `depth` regardless, because the server's resolver spends it.
- **Changing what `askSignature` matches**, or any port Shape (ADR-QD-010 unchanged).

## 4. Constraints

- **AGENTS.md §1.** Namespace `effect/*` imports and `.ts` relative imports. `@qadi/http` imports from
  `@qadi/core` by name. The newsroom imports from `@qadi/http`'s root, and no new entry point is planned
  (D-31-f, §9 names the fallback).
- **§2/§3 and ADR-QD-094.** No new service. The wire is a member of each description, beside `attributes`,
  stated once in the port module. `PortWireEncode.ts` (the builder) is package-private, like
  `PortSpanEncode.ts`. A layer remains a top-level const or a derivation.
- **§4 / `SCHEMA_ERROR_BUDGET`.** Unchanged. `RemotePortFailure` is a `Data.TaggedEnum` (or
  `Data.TaggedError` set), not a `Schema.TaggedError`. It is a client-side `cause` and never decoded by a
  codec. The reply union is a plain `Schema.Union` of tagged structs, which are not error classes.
  `no-catchtags-object-form`: use the array form only.
- **§5 / `UNTRACED_BUDGET`.** `answerRemotely`, the served read and the remote call are named `Effect.fn`s.
  No `Effect.fnUntraced` is added, and gate 4 (`node scripts/check-house-style.mjs`) would fail if one were.
- **§5a / `SWITCH_BUDGET`.** Reply-to-status and reply-to-failure dispatch use a module-scope `Match.type`. No `switch`.
- **§6.** No `as`, `!`, `any`, `async`, `Promise` or `Date.now` in `packages/*/src` (`ANY_BUDGET` unchanged). The
  `unknown` → `Schema.Json` step **rebuilds** a fresh value from checked own entries (arrays and plain
  objects copied), so it needs no assertion. MEMORY: `Record<string, unknown>` is never the widened
  implementation type. The custom-predicate resource is decoded as `Schema.Record(Schema.String, Schema.Json)`,
  which is assignable to `Resource` (proven in the spike with `satisfies`). `PORT_DOUBLE_BUDGET`: new tests
  break a port with `scriptedPort(…, () => PortReply.fail(…))`, never by constructing a port error.
  `HAS_CUSTOM_BUDGET`: tests that need `hasCustom` live in `packages/core/test` or `packages/http/test`
  (test files are outside the src-scoped budget). Confirm that in T0 with `grep -n HAS_CUSTOM scripts/check-house-style.mjs`.
- **§7 / ADR-QD-002.** Wire question and answer schemas are the boundary, so they are schema-first.
  `RelatedResult`/`ActedResult` become `const` schema plus derived `type` pairs (the `ValueRef` pattern).
- **§9 / ADR-QD-099.** Everything `@qadi/http` uses from core is a barrel export: `PortWire`, `PortWireReply`,
  `RemotePortFailure`, `answerRemotely`, `askRemotely`, `PortServing`, `servingFor`, `remotePorts`, and
  `RelationshipDepth` if exported. `PortWireEncode.ts` and `JsonHazard.ts` stay out of the barrel.
- **§13 / `DECISION_READ_BUDGET`.** Untouched. Nothing here reads `AsyncResult`.
- **ADR-QD-077.** The served read is added to `PortAccess.ts`. Neither the route nor `answerRemotely` calls a
  port method directly.
- **ADR-QD-051 / INV-QD-044.** The served read writes the question through the description's span struct
  and the answer through `disclose` (or no answer field for signatures, as below). The attribute **value**
  goes on the wire to the session's own subject, never onto a span.
- **ADR-QD-037 / `pnpm circular`.** `JsonHazard.ts` (extracted from `SinkCodec.ts`) imports only `SinkWire.ts`.
  `PortWireEncode.ts` imports `JsonHazard.ts`, `DecodeDepthGuard.ts` and `Policy.ts` (`UNTRUSTED_DECODE_OPTIONS`,
  `RelationshipDepth`), and no port module. `PortRemote.ts` imports `Ports.ts` and `PortAccess.ts`. madge
  counts type-only edges.
- **ADR-QD-076.** `ignoreStatic: true`, so the module-level wire table and the status table are pinned by
  per-row golden tests. Stryker covers the per-call arms (`stryker.config.mjs` core, `stryker.http.mjs` http).
- **Coverage.** Core is held at 95%, http at 90%. The newsroom is outside the coverage gate (its
  `vitest.config.ts` doc) but inside `pnpm example`.
- **Gate 13 (`check-api-surface.mjs`).** Every new export gets an overview row.
- **Gate 11 (`check-dod-table.mjs`).** No new `pnpm check` step, so the DoD table is unchanged.

## 5. Decisions needed before work starts

### D-31-a — Where does a port's wire live?

- **(A) A required `wire: PortWire<Args, A>` member on `PortDescription`,** written in each port module beside
  `attributes`, built by a package-private `portWire({ question, answer, toQuestion, fromQuestion, spanQuestion, spanAnswer })`.
  `PortWire` exposes only closed-over operations (`encodeQuestion`, `decodeQuestion`, `encodeAnswer`,
  `decodeAnswer`, plus the served read's span projections), so generic code never names the question type.
  This is the spiked shape.
- **(B) A separate `PORT_WIRES` table** in a new module, keyed by `PortName`. It leaves `PortDescription`
  untouched, but a port's facts end up in two places, which ADR-QD-094 removed.
- **(C) Reuse the span structs.** Refuted (C11): they are lossy by design, and INV-QD-044's type floor forbids
  values on them.

Tradeoff: (A) adds a required member to an exported interface, which breaks anyone who constructs a
`PortDescription` (in-repo: none outside the five port modules, and the registry is closed).
**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** yes (public type gains a required member; minor-breaking).

### D-31-b — What does the wire say about the subject?

- **(A) The question carries `subjectId`. The serving half compares it with `CurrentSubject.id` and replies
  `Refused: SubjectMismatch` when they differ.** No subject's answer is given under another's name. The
  devtools simulator's Live source then fails honestly for a subject other than the session's.
- **(B) Omit `subjectId` and substitute the session subject (today).** No enumeration, but a silently wrong
  answer (C7).
- **(C) Answer for any subject asked.** A subject-enumeration API. Rejected.

**Recommendation: (A).** It changes `e2e/ssr.spec.ts:153-163`, which then asserts a 403 and no Hakim data:
the same intent, stated honestly. `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** no (new API; an example behavior).

### D-31-c — What is the reply vocabulary, and what crosses on a failure?

- **(A) A closed `PortWireReply`:** `Answered { answer }` | `Unavailable` | `Refused { reason: PortWireRefusal }`
  with `PortWireRefusal = "SubjectMismatch" | "Malformed" | "NotServed" | "Unencodable"`. No server cause
  crosses. The asker builds the port's own error with `d.failure(args, RemotePortFailure.<X>)`, where
  `RemotePortFailure` is a closed `Data.TaggedEnum`: `Unavailable`, `Refused { reason }`, `Transport { message }`,
  `Undecodable { message }`. `"Unknown"` crosses only as an `Answered` value, so it means what the serving
  port said.
- **(B) Send the port's `Schema.TaggedError`, including `cause`.** That discloses server internals.
  `QadiHttpError.ts:197-208` already refuses this for the same five classes.
- **(C) Use HTTP status only, with a body only on 200.** That couples the semantics to one transport, so a
  server action or a WebSocket adapter would restate them.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** no.

### D-31-d — Which questions does a route serve?

- **(A) A required per-port opt-in, `PortServing`:** `{ AttributeResolver?: { attributes: ReadonlyArray<string> }, RelationshipResolver?: { relations?: ReadonlyArray<string> }, DecisionHistory?: { events?: ReadonlyArray<string> }, CustomPredicate?: { names: ReadonlyArray<string> }, SignatureHistory?: { signatures: "own-records" } }`.
  A port not named is not routed at all. A question outside an allowlist gets `Refused: NotServed`. The
  allowlist is required where the question is open-ended and the answer is a value (attributes) or a
  client-chosen resource (custom predicates).
- **(A+C) As (A), plus `servingFor(policies: Iterable<Policy>): PortServing`,** which derives the allowlists
  by folding the policies a client may ask about (`foldPolicy`/`foldMatcher`). It collects `HasAttribute`
  names, subject attributes referenced by a matcher `ValueRef`, relations, events, custom names, and
  signatures when any `HasSignature` exists. A property test pins it: every port question `evaluate` asks
  for a generated policy is admitted by `servingFor([policy])`.
- **(B) Serve everything (today).** Any attribute of the session subject, including prototype keys (C13).

**Recommendation: (A+C).** `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** no.

### D-31-e — What does a remote signature answer disclose?

- **(A) The full `Signature` records,** behind an explicit opt-in (`SignatureHistory: { signatures: "own-records" }`,
  a one-member literal the host has to write). The query is scoped to the asking subject, so these are
  the subject's own signatures.
- **(B) A redacted wire record (`meaning`, `signerRole`) rebuilt into a `Signature` on the client.** That
  fabricates `signerId`/`signedAt`, so a client reading them would be lied to.
- **(C) Change the port to answer `SignatureAnswer`.** That is a Shape change (ADR-QD-010) for one transport.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** no.

### D-31-f — Which HTTP shape does `@qadi/http` give each half?

- **(A) `HttpRouter` routes, `POST <prefix>/<PortName>` with a JSON body, one per served port,** answering
  with `Cache-Control: no-store`. Status comes from a module-scope table: `Answered` 200, `Unavailable` 503,
  `Malformed` 400, `SubjectMismatch` 403, `NotServed` 404, `Unencodable` 500. The body is always the reply,
  and the client decodes it whatever the status. The client is `remotePortsLayer({ baseUrl, ports, prefix })`
  over `HttpClient.HttpClient` (the host provides `FetchHttpClient.layer`). Trace context propagates
  through Effect's HttpClient and server for free. POST, not GET, because the custom-predicate question
  carries JSON (`resource`, `params`), there is no number parsing from a query string (C5), and no cache
  will store a per-session answer.
- **(B) A derived `effect/rpc` `RpcGroup`.** It is Effect-native, but the protocol is opaque to `curl` and the
  e2e tests, and it adds a second server stack beside `HttpRouter`.
- **(C) A derived `HttpApi` group,** which would give OpenAPI and a typed client. Generic endpoints hit
  ADR-QD-036's "no `Rebuild`" typing wall.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** no.

### D-31-g — Is the route family guarded?

- **(A) Both forms.** `portRoutes(permission, policy, serving, options?)` is guarded through
  `addGuardedRoute`/`authorizeRequest`, so it appears in `/__permissions`. `portRoutesUnguarded(reason, serving, options?)`
  mirrors `permissionRegistryRouteUnguarded(reason)` (`PermissionRegistry.ts:270`). Both take the subject
  from `SubjectExtractor` and provide it as `CurrentSubject`. Neither reads a subject from the body.
- **(B) Guarded only.** The newsroom answers anonymous re-checks today, and a guard would turn an anonymous
  visitor's re-checks into failures.
- **(C) Unguarded only.** The registry would never list the routes.

**Recommendation: (A).** The newsroom uses the unguarded form, with the reason "answers only about the
session's own subject". `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** no.

### D-31-h — How does a served read show up?

- **(A) Through `PortAccess.ts`'s new generic `servePortRead(d, args)`.** It opens `d.span`, annotates the
  question through `d.wire.spanQuestion(args)` and the answer through `d.wire.spanAnswer(answer)` (the
  signature row discloses no answer field, which keeps ARCH-21's non-goal on `onFile`). It wraps the call
  in `catchPortDefect(d.defect)` and counts in a new sibling metric, `servedPortCallsTotal`
  (`qadi_port_served_calls_total`, all five ports preregistered). `PortInterpreter` becomes the closed
  union `"evaluate" | "toPredicate" | "remote"`, stated **once**: a schema in `PortSpanEncode.ts`, with the
  type derived in `PortSpan.ts` through `import type`, which removes the C2-like double statement.
  `countFor` gains its arm. Devtools' `ServicesPanel` labels the new value.
- **(B) Call the service directly with `catchPortDefect` only.** No span and no metric: today's invisibility (C15).

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** yes (a public closed union, `PortInterpreter`
and devtools' `PortCallInterpreter`, gains a member; an exhaustive consumer breaks).

### D-31-i — What does a client port do while it is server-rendered?

- **(A) The host keeps its switch** (`typeof window === "undefined"` → a layer whose calls never settle, so
  the seed covers first paint, BEH-QD-151). The library documents the pattern and adds no API.
- **(B) Core gains `pendingPort(d)` / `pendingPorts`.** That would put a Next-specific rendering concern in core.

**Recommendation: (A).** The complex option is wrong here, not merely bigger: whether a render may ask is
the host's knowledge. `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** no.

### D-31-j — A new ADR, or amendments?

- **(A) A new ADR-QD-NEXT,** "A port is answered remotely through its description" (D-31-b/c/d/e/f/g), plus
  dated amendments to ADR-QD-094 (`wire`) and ADR-QD-051 (`"remote"`).
- **(B) Amendments only.** The subject rule and the reply vocabulary are new decisions, not refinements.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** no.

### D-31-k — Are `RelatedResult` / `ActedResult` schema-derived?

- **(A) Yes:** `export const RelatedResult = Schema.Literals(["Related", "Unrelated", "Unknown"])`; `export type RelatedResult = typeof RelatedResult.Type`.
  The same for `ActedResult`. The span answer field and the wire answer both use the const. The type is
  identical, and the value export is new.
- **(B) Keep the hand-written types,** and the wire states the literals a third time.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`. **Needs sign-off:** no (additive).

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done (2026-10-08, re-read against the wave-4 tree; the §1 probe scripts were not re-run, see §10)
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/31-remote-port-codec main`. Record `git rev-parse --short HEAD`.
  2. Re-run §1's probe commands. Expect the 13 output lines shown there, `tsc` exit 0 on `tsconfig.json` and
     exactly one error on `tsconfig.neg.json`. If the scratch directory is gone, rebuild it from §1: the
     vitest config with environment `node`, an alias for `server-only` to an empty module, and
     `conditions: ["bun", …]`. Use the `vi.mock` of `src/server/ports.ts`, and the `tsprobe` with
     `types: ["node"]` and `rewriteRelativeImportExtensions: false`.
  3. `git diff --stat e635e68 HEAD -- examples/nextjs-newsroom/src packages/core/src/{PortDescription,PortAccess,PortSpan,PortSpanEncode,Ports,SinkCodec,AttributeResolver,RelationshipResolver,DecisionHistory,CustomPredicate,SignatureHistory}.ts packages/http/src`.
     If anything moved, correct §1's line numbers in §10.
  4. Check whether ARCH-36 (PermissionRegistry/AuthorizeRequest), ARCH-45 (RelationshipResolver key),
     ARCH-41 (PortAccess interpreters) or ARCH-34 (newsroom Dock/atoms) has landed:
     `git log --oneline main -- packages/http/src/PermissionRegistry.ts packages/core/src/PortAccess.ts packages/core/src/RelationshipResolver.ts examples/nextjs-newsroom/src/client`.
     Re-target T4/T6/T7 if so.
  5. `grep -n "HAS_CUSTOM_BUDGET\|PORT_DOUBLE_BUDGET\|testScope" scripts/check-house-style.mjs` to confirm which
     test paths each budget scans (§4).
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §1 is re-confirmed, or corrected in §10.

### T1 — Test-first: an outage is a failure, and a malformed question is a 400, in the newsroom (defects C3, C4, C5, C6, C8)
- **Status:** [x] done (2026-10-08, branch `wave4/security-patches`, uncommitted; e2e + `pnpm example` build not run)
- **Depends on:** T0. No decision: every option keeps "outage = failure".
- **Files:** `examples/nextjs-newsroom/vitest.config.ts`, `examples/nextjs-newsroom/test/stubs/server-only.ts` (*new*),
  `examples/nextjs-newsroom/test/port-routes.test.ts` (*new*), `examples/nextjs-newsroom/src/server/api.ts`,
  `examples/nextjs-newsroom/src/client/ports.ts`, `examples/nextjs-newsroom/src/server/ports.ts`.
- **Steps:**
  1. Test harness. In `vitest.config.ts` add `resolve: { alias: { "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)) } }`,
     with a one-line comment: "server routes are tested outside Next's `react-server` condition".
     `test/stubs/server-only.ts` is `export {};`. Put `// @vitest-environment node` at the top of the new
     test file, because happy-dom's `Request` drops the `cookie` header (§1).
  2. Write `test/port-routes.test.ts`. Use `vi.mock("../src/server/ports.ts", …)` to return
     `{ ports: portsLayer({ AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("directory down")).layer, RelationshipResolver: scriptedPort(relationshipResolverPort, …).layer, DecisionHistory: scriptedPort(decisionHistoryPort, …).layer }) }`.
     Build `HttpRouter.toWebHandler(ApiLayer)`, and `dispose` it in `afterAll`. Add a helper
     `route(path, user)` that calls `handler(new Request("http://newsroom.test" + path, { headers: { cookie: \`qadi-newsroom-user=${user}\` } }))`.
     For the client half, use `vi.stubGlobal("window", globalThis)` and `vi.stubGlobal("fetch", (input) => route(stripApi(input), "nadia"))`
     (the precedent `forwarding.test.ts` documents why globals are stubbed per test), and evaluate with
     `Layer.mergeAll(browserPorts, currentSubjectLayer(nadia), EvaluationIdLive)` and
     `{ resource: policyResource(nightShift, 0) }`.
     Tests:
     - "a relationship store outage is a 503, never an answer": expects 503. Red: 200 `"Unknown"`.
     - "a history store outage is a 503, never an answer": red.
     - "an attribute store outage is a 503" (characterization, green).
     - "a question with a missing field, or a depth that is not an integer in [0, 64], is a 400": cases `/ports/relationship`
       (no params), `depth=abc`, `depth=65`, `depth=1.5`, `depth=-1`, `/ports/history` with no `event`,
       `/ports/attribute` with no `attribute`. Red: 200.
     - "an outage fails the client's evaluation; it never denies or grants": `not(hasRelationship("banned"))`,
       `canReadArticle`, `hasActed("legal-review", { scope: "Resource" })` and `not(hasActed(…))` each give an
       `Exit` failure whose `Cause` fails with `RelationshipResolveError`/`DecisionHistoryUnavailable`. Red:
       Allow, Deny, Deny, Allow.
     - "a 2xx body the client does not recognise is a failure, not `Unknown`": stub `fetch` to return
       `200 {"related":"maybe"}`. Red: Deny.
     Run the file and record each red result in §10.
  3. Fix `api.ts`. In `RelationshipPort`/`HistoryPort`, replace the `catchTag(… succeed("Unknown"))` with
     the attribute route's shape: `Effect.catchTag("RelationshipResolveError", () => Effect.succeed(HttpServerResponse.text("the relationship store did not answer", { status: 503 })))`
     (the same for history). The handler then returns a response in both branches. Validate before asking:
     a missing `attribute`/`relation`/`resourceId`/`event` gives a 400. `depth` must match `/^\d+$/` and
     decode through `Schema.decodeUnknownResult(Schema.NumberFromString.pipe(Schema.decodeTo(<Int in [0,64]>)))`,
     or through a local `Number.isInteger(n) && n >= 0 && n <= 64` check, else a 400. Correct the comment at
     `:100-102` (INV-QD-005 → **INV-QD-006**) and the rationale at `:130-131`.
  4. Fix `client/ports.ts`. An unrecognised answer is `Effect.fail(…)` mapped through the port's `failure`
     (`relationshipResolverPort.failure([request], "unrecognised answer")`), not `"Unknown"`. Rewrite the
     comment at `:98-100`. Pass `tryPromise`'s `signal` to `fetch` (`Effect.tryPromise((signal) => …)`), so an
     interrupted re-check cancels its request (C1).
  5. Fix `server/ports.ts:52`: `Object.hasOwn(attrs, attribute) ? attrs[attribute] : undefined`, so a
     prototype key resolves to nothing (C13 orphan). Add a test case: `attribute=constructor` answers
     `{}` with no `value` (absent).
  6. `pnpm --filter @qadi/example-nextjs typecheck`.
- **Tests:** the six above, red first. The e2e suite is unchanged by T1.
- **Verify:** `cd examples/nextjs-newsroom && pnpm vitest run test/port-routes.test.ts && pnpm typecheck`; then `pnpm example`.
- **Done when:** all pass. **Shippable alone** as an example-only patch. The example is private, so it needs
  no changeset. It is the defect-only path.

### T2 — Test-first: a question about another subject is refused (defect C7)
- **Status:** [x] done (2026-10-08, commit bc84583, red first; test/port-subject.test.ts; superseded in shape by T7 but shippable alone)
- **Depends on:** T1, D-31-b (= A)
- **Files:** `examples/nextjs-newsroom/test/port-routes.test.ts`, `examples/nextjs-newsroom/src/server/api.ts`,
  `examples/nextjs-newsroom/e2e/ssr.spec.ts`.
- **Steps:**
  1. Test "a question about a subject other than the session's is a 403, and names no one's answer":
     with the real ports (a second `describe` with no `vi.mock`, or a separate file
     `test/port-subject.test.ts`), `route("/ports/relationship?subjectId=nadia&relation=author-of&resourceId=night-shift", "yasmine")`
     gives status 403, and the body contains neither `Related` nor `Unrelated`. Red: `200 {"related":"Unrelated"}`.
  2. Fix: in each port route, compare `query(request, "subjectId")` with `askingSubject.id`. On a mismatch, or
     when `subjectId` is absent, answer `HttpServerResponse.text("this endpoint answers only about the session's own subject", { status: 403 })`.
  3. Update `e2e/ssr.spec.ts:153-163`: keep the test name's intent. Assert status 403, and that the body
     does not contain `"level"`.
- **Tests:** one new test, red first, and one e2e assertion changed.
- **Verify:** `cd examples/nextjs-newsroom && pnpm vitest run test/ && pnpm test:e2e -g "answer only about the session"`.
- **Done when:** both pass. This can ship with T1.

### T3 — Core: each description states its wire
- **Status:** [x] done (2026-10-08, commit 40fc519)
- **Depends on:** T0, D-31-a (= A), D-31-c, D-31-k
- **Files:** `packages/core/src/JsonHazard.ts` (*new*, package-private, extracted from `SinkCodec.ts:300-421`),
  `packages/core/src/SinkCodec.ts`, `packages/core/src/PortWire.ts` (*new*, public),
  `packages/core/src/PortWireEncode.ts` (*new*, package-private), `packages/core/src/PortDescription.ts`,
  `packages/core/src/{AttributeResolver,RelationshipResolver,DecisionHistory,CustomPredicate,SignatureHistory}.ts`,
  `packages/core/src/Policy.ts` (export `RelationshipDepth`), `packages/core/src/index.ts`,
  `packages/core/test/PortConformance.test.ts`, `packages/core/test/PortWire.test.ts` (*new*), `packages/core/test/PortWire.tst.ts` (*new*).
- **Steps:**
  1. **Extract the JSON walk.** Move `wireHazard` and its helpers (`OPAQUE_KIND_BY_BRAND`, `brandOf`, `opaqueKindOf`,
     `hasCustomToJSON`, `hasEnumerableSymbolKey`, `isPlainObject`, `NO_KEYS`) **verbatim** into `JsonHazard.ts`.
     Add one function, `toJson(value: unknown, maxDepth: number): Result.Result<Schema.Json, EncodeRefusal>`.
     It runs `wireHazard` and then builds a fresh `Schema.Json` (an array is mapped, a plain object is
     rebuilt from `Object.entries`, a primitive is returned), so no `as` is needed. `SinkCodec.ts` imports
     `wireHazard` back. Its tests must pass **unmodified**: `pnpm vitest run packages/core/test/SinkCodec.test.ts`.
  2. **Public types, `PortWire.ts`:** the `PortWire<Args, A>` interface (encode/decode question and answer as
     `Result`s, `decodeQuestion` yielding `{ subjectId; args(subject: AuthSubject): Args }`, `spanQuestion(args)`,
     `spanAnswer(answer)`); `PortWireRefusal` (closed literal union, D-31-c); `PortWireReply` (a
     `Schema.Union` of three `Schema.TaggedStruct`s, `answer: Schema.Json`) with its type; `RemotePortFailure`
     (`Data.TaggedEnum`, four variants). Each doc comment leads with a one-line summary, and the why follows.
  3. **Builder, `PortWireEncode.ts`:** `portWire({ question, answer, toQuestion, fromQuestion, spanQuestion, spanAnswer })`,
     the spiked shape. Decoding a question runs `exceedsJsonDepth` and then
     `Schema.decodeUnknownResult(question, UNTRUSTED_DECODE_OPTIONS)`. Encoding an answer whose schema holds
     `Schema.Json` goes through `toJson` first.
  4. **Per port** (each in its own module, after the span; the shapes are spiked in `$P/tsprobe/spike.ts`):
     - Attribute: question `{ subjectId: SubjectIdSchema, attribute: Schema.String }`, answer `{ value?: Json }`
       (absent ⇔ `undefined`, the fail-closed sentinel; `null` is a value).
     - Relationship: `{ subjectId, relation, resourceId: ResourceIdSchema, depth?: RelationshipDepth }`, answer `RelatedResult` (D-31-k).
     - History: `{ subjectId, event, resourceId?: ResourceIdSchema }`, answer `ActedResult`.
     - Custom predicate: `{ subjectId, name, resource?: Schema.Record(Schema.String, Schema.Json), params: Schema.Json }`.
       The subject is **not** on the wire beyond its id: `fromQuestion(q, subject)` puts the session's full
       `AuthSubject` in the args. Answer `Schema.Boolean`.
     - Signature: `{ subjectId, resourceId? }`, answer `Schema.Array(Signature)`.
     - `spanQuestion`/`spanAnswer` project into the port's existing span structs. The signature row's
       `spanAnswer` returns `{}`.
  5. Add `readonly wire: PortWire<Args, A>` to `PortDescription` (`PortDescription.ts:56-122`). Doc: what the
     wire is, that it is the only statement of the port's question and answer off-process, and why it
     differs from `attributes` (INV-QD-044).
  6. Export `PortWire.ts` from the barrel (alphabetical), and `RelationshipDepth` from `Policy.ts`.
  7. **Tests.** In `PortConformance.test.ts`, inside each row's `describe(d.port, …)`, add a `describe("wire (ADR-QD-NEXT)")`:
     - "a question round-trips through JSON text and comes back as the same request, about the session subject":
       `encodeQuestion(args)` → `JSON.stringify` → `JSON.parse` → `decodeQuestion` → `.args(subject)`
       deep-equals `args` (for the custom row, the subject in the args **is** the session subject).
     - "an answer round-trips, including the fail-closed answer": every fixture answer plus `d.none.answer`.
     - "a malformed question is refused, never thrown": `{}`, `null`, a depth-65 relationship, a 200-deep nest.
     In `PortWire.test.ts`:
     - A property (`fast-check`): an arbitrary `Schema.Json` attribute value round-trips.
     - A property: values with no JSON form (`Set`, `Map`, `bigint`, `NaN`, `Infinity`, a cycle, a class
       instance, a function) make `encodeAnswer` **fail**, and nothing throws.
     - `toJson` detaches the result: mutating the input afterwards does not change it.
     In `PortWire.tst.ts`: a description whose `wire` answers the wrong type does not compile (`@ts-expect-error`),
     and `PortTypes` without a `wire` member does not compile. This is the spike's negative check.
- **Verify:** `pnpm vitest run packages/core/test/PortConformance.test.ts packages/core/test/PortWire.test.ts packages/core/test/SinkCodec.test.ts && pnpm test:tstyche && pnpm circular && pnpm typecheck`.
- **Done when:** all pass and madge reports no cycle.

### T4 — Core: a served read goes through `PortAccess.ts` (`"remote"`)
- **Status:** [x] done (2026-10-08, commit 6439b71)
- **Depends on:** T3, D-31-h (= A)
- **Files:** `packages/core/src/PortSpan.ts`, `packages/core/src/PortSpanEncode.ts`, `packages/core/src/PortAccess.ts`,
  `packages/core/src/PortMetrics.ts`, `packages/devtools/src/react/ServicesPanel.tsx`,
  `packages/core/test/PortAccess.test.ts` (or the existing port-span tests; locate with `grep -ln "qadi.interpreter" packages/core/test`),
  `packages/core/test/Ports.test.ts` (metric description pin), `packages/devtools/test/*PortCalls*`.
- **Steps:**
  1. State `PortInterpreter` once: `export const portInterpreter = Schema.Literals(["evaluate", "toPredicate", "remote"])` in
     `PortSpanEncode.ts`, used by `sharedQuestionFields.interpreter`. In `PortSpan.ts`, write
     `import type { portInterpreter } from "./PortSpanEncode.ts"` and `export type PortInterpreter = typeof portInterpreter.Type`.
     Check that madge reports no type-edge cycle (PortSpanEncode already imports types from PortSpan).
     If madge objects, keep the type in `PortSpan.ts` and add a tstyche equality assertion instead.
  2. `PortMetrics.ts`: `servedPortCallsTotal = Metric.frequency("qadi_port_served_calls_total", { description: "…answered for a remote asker…", preregisteredWords: <all five PortName> })`.
     Doc: the third sibling, why it is separate (the module doc's scoping rule), and that its
     description is part of the registry key (ADR-QD-052).
  3. `PortAccess.ts`: `countFor` gains a `"remote"` arm. Its signature currently narrows to `PredicatePortName`,
     so widen the parameter to `PortName`, or add a separate `countServed` (decide by which keeps `countFor`
     a hoisted `Match.type`). Add
     `export const servePortRead = <K extends PortName>(d: DescriptionOf<K>) => (...args: ArgsOf<PortTypes[K]>)`
     as an `Effect.fn` whose span name is `d.span`. If `Effect.fn`'s name must be static, use
     `Effect.withSpan(d.span)` over an `Effect.fn("qadi.port.serve")` body, and record which in §10.
     It annotates `encodeSpan(d.attributes.question, { ...d.wire.spanQuestion(args), interpreter: "remote" })`,
     counts, runs `d.invoke(yield* d.service)(...args).pipe(catchPortDefect((cause) => d.defect(args, cause)))`,
     and then annotates `d.wire.spanAnswer(answer)`.
  4. Devtools: `ServicesPanel.tsx:204` renders a `remote` badge beside the `toPredicate` one. Any exhaustive
     `Match` over `PortCallInterpreter` gains its arm.
  5. Tests: for every registry row (iterate `forEveryPort`), `servePortRead` under `collectingTracer` opens a
     span named `d.span` with `qadi.interpreter = "remote"` and the question attributes, and the attribute
     row carries `qadi.resolved`, never the value (the INV-QD-044 sentinel, as in `Evaluate.test.ts`). A
     `scriptedPort` that dies yields the port's typed error. `servedPortCallsTotal` increments once per read.
     Pin the metric description string in `Ports.test.ts`.
- **Verify:** `pnpm vitest run packages/core/test packages/devtools/test && pnpm test:tstyche && pnpm circular`;
  `pnpm bench` is **not** required, because the served read is off the evaluation path. Confirm with
  `git diff --stat` that `Walk.ts`/`Evaluate.ts` are untouched.
- **Done when:** all pass.

### T5 — Core: `answerRemotely`, `askRemotely`, `PortServing`, `servingFor`, `remotePorts`
- **Status:** [x] done (2026-10-08, commit 67fbc92)
- **Depends on:** T4, D-31-b, D-31-c, D-31-d, D-31-e
- **Files:** `packages/core/src/PortRemote.ts` (*new*, public), `packages/core/src/index.ts`,
  `packages/core/test/PortRemote.test.ts` (*new*).
- **Steps:**
  1. `PortServing` (D-31-d, a closed per-port record) and `PortServingOf<K>`.
  2. `answerRemotely = <K extends PortName>(d: DescriptionOf<K>, serving: PortServingOf<K>) => Effect.fn("qadi.port.answerRemotely")(function* (body: unknown) …)`.
     It returns `PortWireReplyJson` and **never fails** (requirements: `ServiceOf<PortTypes[K]> | CurrentSubject`).
     The order is: decode (`Refused: Malformed`), then the subject check against `CurrentSubject.id`
     (`Refused: SubjectMismatch`), then the allowlist (`Refused: NotServed`), then
     `Effect.result(servePortRead(d)(...args))` (`Unavailable` on a failure), then `encodeAnswer`
     (`Refused: Unencodable`), then `Answered`. Log the `Unavailable` and `Unencodable` branches once, with
     `qadi.port`, never the cause text or the value (INV-QD-044's reasoning).
  3. `askRemotely = <K extends PortName>(d: DescriptionOf<K>, send: (question: unknown) => Effect.Effect<unknown, RemotePortFailure>): ShapeOf<PortTypes[K]>`,
     using `d.make(\`${name} (remote)\`, …)`. `encodeQuestion` refusal → `d.failure(args, RemotePortFailure.Refused({ reason: "Unencodable" }))`.
     `send` failure → `d.failure(args, failure)`. Decode the reply with `PortWireReply`, then
     `Answered` → `decodeAnswer` (failure → `Undecodable`), `Unavailable` → `RemotePortFailure.Unavailable()`,
     and `Refused` → `RemotePortFailure.Refused({ reason })`. Dispatch is a module-scope `Match.type` over the reply tag.
  4. `servingFor(policies)`: a fold over `foldPolicy`/`foldMatcher`, collecting the allowlists described in
     D-31-d. `remotePorts(send, ports: ReadonlyArray<PortName>): Layer.Layer<PortServices>` is `portsLayer`
     with `Layer.succeed(d.service, askRemotely(d, send))` for each listed port.
  5. Tests (in memory, with `send` wired straight to `answerRemotely` and `JSON.stringify`/`parse` between):
     - Per registry row: an answer round-trips; `scriptedPort(…, PortReply.fail("down"))` on the serving
       side gives the **port's own error** on the asking side, with `cause` `RemotePortFailure.Unavailable`
       and **no `"down"` anywhere** in the asker's error (`JSON.stringify(Cause.squash(…))` does not contain it);
       a subject mismatch gives `Refused SubjectMismatch`; a question outside the allowlist gives `NotServed`.
     - **The defect, generically:** under remote ports with a failing relationship store,
       `evaluate(not(hasRelationship("banned")))` is a failure, `hasNotActed` is a failure, and
       `evaluate(hasRelationship("x"))` under a serving `RelationshipResolverNever` is a **Deny** (a
       genuine `"Unknown"` still crosses as an answer).
     - `servingFor` property (fast-check, reusing core's policy arbitraries; locate them with
       `grep -ln "fc.letrec\|policyArbitrary" packages/core/test`): for a generated policy and subject, every
       question that `evaluate` asks of a `recordingPort` is admitted by `servingFor([policy])`.
- **Verify:** `pnpm vitest run packages/core/test/PortRemote.test.ts && pnpm circular && pnpm typecheck`.
- **Done when:** all pass.

### T6 — `@qadi/http`: the route family and the client layer
- **Status:** [x] done (2026-10-08, commit 2967d1b)
- **Depends on:** T5, D-31-f, D-31-g
- **Files:** `packages/http/src/PortRoutes.ts` (*new*), `packages/http/src/RemotePorts.ts` (*new*), `packages/http/src/index.ts`,
  `packages/http/test/PortRoutes.test.ts` (*new*).
- **Steps:**
  1. `PORT_REPLY_STATUS`: a module-scope `Match.type<PortWireReply>()` from reply to status (D-31-f).
  2. `portRoutes(permission, policy, serving, options?: { prefix?: string })` returns a `Layer.mergeAll` of one
     `addGuardedRoute("POST", \`${prefix}/${port}\`, permission, policy, loadNoResource)(…)` per port named in
     `serving`, built with `forEveryPort` and filtered. Each handler reads the body with
     `HttpServerRequest.schemaBodyJson(Schema.Json)` (an unreadable body → `Refused: Malformed`, 400), then
     runs `answerRemotely(d, serving[d.port])` under `Effect.provideService(CurrentSubject, authorized.subject)`,
     then answers `HttpServerResponse.json(reply, { status, headers: { "cache-control": "no-store" } })`.
     `portRoutesUnguarded(reason, serving, options?)` does the same with `SubjectExtractor.extract` (a
     failure → `toResponse`) and registers nothing. The default `prefix` is `"/__ports"`.
  3. `remotePortsLayer({ baseUrl, ports, prefix? }): Layer.Layer<PortServices, never, HttpClient.HttpClient>`.
     Its `send` is `HttpClientRequest.post(url)` → `bodyJson(question)` → `client.execute` →
     `response.json` (whatever the status). A transport error → `RemotePortFailure.Transport({ message })`.
     Then `remotePorts(send, ports)`. The doc shows a host providing `FetchHttpClient.layer` and, for cookies,
     `Layer.succeed(FetchHttpClient.RequestInit, { credentials: "same-origin" })`.
  4. Tests, end to end over `HttpRouter.toWebHandler`, with the client's `FetchHttpClient.Fetch` reference
     provided as the web handler (the `forwarding.test.ts` precedent):
     - For every registry row, answered, unavailable (503), subject mismatch (403), malformed (400),
       not served (404), and unencodable (an attribute holding a `Set`, 500). The asker sees the port's own
       error, with the matching `RemotePortFailure`.
     - `cache-control: no-store` on every reply.
     - The guarded form returns 403 `AccessDenied` for a denied subject, and `/__permissions` lists every served path.
     - The unguarded form answers an anonymous subject about itself.
     - The same assertion as T5: no server cause text reaches the client.
- **Verify:** `pnpm vitest run packages/http/test/PortRoutes.test.ts packages/http/test/http.test.ts && pnpm typecheck`.
- **Done when:** all pass.

### T7 — Migrate the newsroom and delete the hand-written halves
- **Status:** [x] done (2026-10-08, commit a7d520a; real-browser e2e not run)
- **Depends on:** T1, T2, T6, D-31-i
- **Files:** `examples/nextjs-newsroom/src/client/ports.ts`, `examples/nextjs-newsroom/src/server/api.ts`,
  `examples/nextjs-newsroom/test/port-routes.test.ts`, `examples/nextjs-newsroom/e2e/ssr.spec.ts`,
  `examples/nextjs-newsroom/app/edge/divergent/page.tsx`, `examples/nextjs-newsroom/README.md`.
- **Steps:**
  1. `api.ts`: delete `askingSubject`, `query` and the three port routes (`:74-157` at `e635e68`). Add
     `portRoutesUnguarded("answers only about the session's own subject", { AttributeResolver, RelationshipResolver, DecisionHistory } from servingFor(Object.values(catalogue)), { prefix: "/ports" })`
     to `Routes`. Keep the doc that explains why it is unguarded and how identity is read.
  2. `client/ports.ts`: keep the module doc (its why still holds), drop everything from `ask` to `history`,
     and write
     `export const browserPorts: EvaluationPortsLayer = typeof window === "undefined" ? serverRenderPorts : remotePortsLayer({ baseUrl: "/api", prefix: "/ports", ports: ["AttributeResolver", "RelationshipResolver", "DecisionHistory"] }).pipe(Layer.provide(FetchHttpClient.layer), Layer.provide(Layer.succeed(FetchHttpClient.RequestInit, { credentials: "same-origin" })))`.
     `serverRenderPorts` is `portsLayer` with each of the three as `d.make("… (server render)", () => Effect.never)`,
     keeping the existing doc block on why (D-31-i). `Dock.tsx` and `atoms.ts` keep importing `browserPorts`.
     Confirm `baseUrl` resolution: if `HttpClientRequest` needs an absolute URL in the browser, use
     `window.location.origin + "/api"`, and record which in §10.
  3. `test/port-routes.test.ts` (T1/T2) drives the derived routes: POST to `/api/ports/<PortName>`. The
     assertions on status, failure and refusal keep their meaning, and the request helper changes.
  4. `e2e/ssr.spec.ts`: `:153-163` POSTs a question about `hakim` with Yasmine's cookie and expects 403.
     `:334` counts `/api/ports/AttributeResolver`. `app/edge/divergent/page.tsx:62` and `README.md:165` name the new path.
  5. Bundle check: `pnpm --filter @qadi/example-nextjs build`, then `grep -l "HttpApiBuilder\|SubjectExtractor" .next/static/chunks/*.js`.
     If server-only `@qadi/http` code reaches a client chunk, stop and raise the §9 fallback (a
     `@qadi/http/client` entry point) as a new decision.
  6. `grep -n "isRelated\|isActed\|tryPromise\|fetch(" src/client/ports.ts` returns nothing.
- **Tests:** the newsroom unit suite and e2e.
- **Verify:** `pnpm example`.
- **Done when:** green, and §2 criterion 7 holds.

### T8 — Spec, ADRs, invariant, overview, traceability, CCR, docs, changesets
- **Status:** [x] done (2026-10-08, commit a5445ef)
- **Depends on:** T3–T7, D-31-j
- **Files:** `spec/decisions/NNN-a-port-is-answered-remotely.md` (*new*, ADR-QD-NEXT), `spec/decisions/index.yaml`,
  `spec/decisions/094-a-port-is-described-once.md`, `spec/decisions/051-a-span-says-what-was-asked.md`,
  `spec/behaviors/34-remote-ports.md` (*new*), `spec/behaviors/index.yaml`, `spec/behaviors/30-port-calls.md` (BEH-QD-227: `"remote"`),
  `spec/behaviors/19-hydration.md` (BEH-QD-151: a re-check's ports may be remote; link the new doc),
  `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md` (CCR register),
  `apps/website/src/content/docs/docs/concepts/services-resolvers.md`, `packages/http/README.md`, `.changeset/*` (*new*).
- **Steps:**
  1. **ADR-QD-NEXT:** context (C3–C7 and C15, with the probe), the decision (D-31-b/c/d/e/f/g/h), the
     alternatives rejected, and consequences (e2e pin changed; a signature opt-in discloses the subject's
     own records).
  2. **ADR-QD-094 amendment** (dated block plus revision row): a description states its wire, and the
     registry makes it required. **ADR-QD-051 amendment:** `"remote"` and `qadi_port_served_calls_total`.
  3. **`34-remote-ports.md`**, BEH-QD-NEXT, one behavior per REQUIREMENT:
     - "An outage on the answering side MUST reach the asker as the port's own error. It MUST NOT be sent as `"Unknown"`, and no server cause crosses."
     - "A question about any subject but the session's MUST be refused."
     - "A served question outside the host's serving declaration MUST be refused."
     - "A served read MUST open the port's span with `qadi.interpreter = "remote"`."
     - "An answer with no JSON form MUST be refused, never thrown."
     Add at least one `typescript` fence that compiles: a host wiring `portRoutesUnguarded` and `remotePortsLayer`.
  4. **INV-QD-NEXT**, "A remote port fails where its store fails". Source: `PortRemote.ts`. Enforcement: T5's
     per-row cases and the `not(…)` case. Related: INV-QD-006, INV-QD-014, INV-QD-044. INV-QD-006's Related
     gains it.
  5. **`spec/overview.md`** (gate 13): rows for `PortWire`, `PortWireReply`, `PortWireRefusal`, `RemotePortFailure`,
     `answerRemotely`, `askRemotely`, `remotePorts`, `PortServing`, `PortServingOf`, `servingFor`,
     `servedPortCallsTotal`, `RelationshipDepth`, and `RelatedResult`/`ActedResult` (now values too). Add
     `PortDescription` gaining `wire` and `PortInterpreter` gaining `"remote"`. For `@qadi/http`:
     `portRoutes`, `portRoutesUnguarded`, `remotePortsLayer`, `PORT_REPLY_STATUS`. Add `JsonHazard.ts` and
     `PortWireEncode.ts` only if gate 13 needs internal modules listed (they are out of the barrel, so it
     should not). Bump the revision row.
  6. **Traceability:** the new test files → BEH-QD-NEXT and INV-QD-NEXT.
  7. **Docs:** `services-resolvers.md` gains "Answering a port from another process". The http README gains the two routes and the layer.
  8. **Changesets:** `@qadi/core` minor (**breaking**: `PortDescription.wire` required, `PortInterpreter` widened),
     `@qadi/http` minor, `@qadi/devtools` patch. No release step.
- **Verify:** `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims`.
- **Done when:** all pass.

### T9 — Full gate
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T1–T8
- **Files:** none.
- **Steps:**
  1. `pnpm check`. In `stryker.config.mjs` (core), the `answerRemotely` order, the `askRemotely` reply arms and
     `toJson` are killed by T3/T5's per-row and property tests. In `stryker.http.mjs`, the status table arms
     are killed by T6's per-status cases. Under `ignoreStatic`, the module-level wire objects are not
     mutated; the golden round-trips pin them.
  2. A survivor is either a missing test (add it) or a recorded finding. Never suppress one (ADR-QD-076).
- **Verify:** `pnpm check`.
- **Done when:** green.

### T10 — Update the tracker
- **Status:** [x] done (2026-10-08)
- **Depends on:** T9
- **Files:** this plan (frontmatter `status`, task boxes, §10). The orchestrator owns `README.md`'s row.
- **Steps:** set `status`, tick the tasks, and record the commit SHAs and the assigned ADR/CCR/BEH/INV numbers in §10.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-31-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Defect tests first, at the host (T1, T2).** They are written red against today's routes and adapters, and
  they survive T7 as the newsroom's regression net. Only the request helper changes.
- **Replace, don't layer.** The hand-written adapters and routes are deleted, not wrapped (T7). The rules
  "outage is a failure", "subject must match" and "no cause crosses" are tested **once per registry
  row**, in core (`PortConformance.test.ts` wire cases, `PortRemote.test.ts`), and once over HTTP
  (`PortRoutes.test.ts`, per status). The newsroom tests keep only what is the host's own: its serving
  declaration and its URL.
- **Round-trip per registry row** is the property that makes the derivation trustworthy: question → JSON text →
  question, and answer → JSON text → answer, including `none.answer`.
- **Properties:** JSON round-trip and totality (T3); `servingFor` admits every question `evaluate` asks (T5); the
  INV-QD-044 sentinel on the served span (T4).
- **Type tests:** a missing or wrong `wire` does not compile (T3, the spike's negative).
- **Unchanged and must pass:** `SinkCodec.test.ts` (the walk is moved, not changed), every existing
  `PortConformance` case, devtools' port-call decoding (now with `"remote"`), and `forwarding.test.ts` in the newsroom.
- **Mutation:** core, http and devtools configs (T9).

## 8. Spec and documentation updates

See T8 for each edit. In summary: ADR-QD-NEXT (new), ADR-QD-094 and ADR-QD-051 (amended), `34-remote-ports.md`
(new behaviors, compiled fence), BEH-QD-227 (`"remote"`), BEH-QD-151 (link), INV-QD-NEXT (new), INV-QD-006
Related, overview rows (gate 13), traceability, CCR-QD-NEXT, website `services-resolvers.md`,
`packages/http/README.md`, and changesets (`@qadi/core` minor breaking, `@qadi/http` minor, `@qadi/devtools` patch).

## 9. Risks and rollback

- **Client bundle pulls server code.** The newsroom's `"use client"` module imports `@qadi/http`'s root,
  which also exports `HttpApi` middleware. `sideEffects: false` should tree-shake it. T7 step 5 checks this.
  Fallback: a `@qadi/http/client` entry point (ADR-QD-099 table edit, a decision raised then).
- **`Effect.fn` with a dynamic span name** (T4 step 3). If the name must be static, use `Effect.withSpan(d.span)`,
  as recorded in §10. The span name `PortCalls` decodes by must stay `d.span`.
- **madge on `PortInterpreter`'s single statement** (T4 step 1). The fallback is a tstyche equality test.
- **Breaking public types.** `PortDescription.wire` is required, and `PortInterpreter` gains `"remote"`. Both
  are listed for sign-off (D-31-a, D-31-h), and the changeset says so.
- **Behavior change in the example.** The substitution e2e pin becomes a 403. Intended (D-31-b).
- **Latency.** Each re-check question is one POST, as each was one GET. No change in count.
- **Overlap churn.**
  - ARCH-36 rewrites registration around `addGuardedRoute`/`authorizeRequest`. Whichever lands second
    re-targets `portRoutes`. Preferred order: ARCH-36 first, then T6.
  - ARCH-45 edits `relationshipResolverPort.key`. T3 adds `wire` beside it, which is a trivial merge.
  - ARCH-41 and T4 both touch `PortAccess.ts`'s interpreter handling. Land T4 after ARCH-41, or rebase.
  - ARCH-34 rewires the newsroom's `Dock.tsx`/`atoms.ts`. T7 keeps the `browserPorts` export name, so neither
    needs an edit for this plan.
- **Rollback.** T1 and T2 revert alone (example only). T3–T6 revert as one PR. T7 reverts to T1/T2's
  hand-written routes, which are already correct.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; §1 verified at `e635e68` with `$P/outage.test.ts`, `$P/subst.test.ts` and `$P/tsprobe` | planner |
| 2026-10-08 | T1 | Red first: relationship + history outage answered 200 (expected 503); 7 malformed questions answered 200/503 (expected 400); `not(hasRelationship)`/`not(hasActed)` granted, `hasRelationship`/`hasActed` denied under an outage; `maybe` body read as Unknown; 4 prototype keys resolved. Fixed `api.ts` (503 on outage, 400 on a missing field or a depth outside [0,64]), `client/ports.ts` (unrecognised answer fails; `fetch` gets the abort signal), `server/ports.ts` (`Object.hasOwn`). New `test/port-routes.test.ts`, `test/directory-attributes.test.ts`, `server-only` alias. Example vitest 36 passed, typecheck clean, lint and house-style clean | claude |
| 2026-10-08 | T2 | Red first (4 cases): relationship/history/attribute asked about nadia with yasmine's cookie answered 200 (expected 403), and a question with no subjectId answered 200. Fixed `api.ts` (`askingSubject` compares the query's `subjectId` with the session's; 403 on a mismatch or absence); the T1 tests now send `subjectId`; e2e pin `ssr.spec.ts` asserts 403 and no `"level"`. Commit bc84583 | claude |
| 2026-10-08 | T0 | Re-read against the wave-4 tree (ARCH-36 `addGuardedRoute`/`guardApi`, ARCH-45 keys with `depth`, ARCH-41 `Admission.ts`, ARCH-42 `PORT_FIXTURES`, ARCH-40 named devtools barrel, ARCH-30 `Lifecycle.ts`). §1's line numbers shifted but every claim holds in shape; ARCH-45 already keys `depth` (no change to the key law, `PortConformance` key cases pass unmodified). The §1 scratch probes were not re-run: T1/T2's tests are the executable form of C3–C8. `HAS_CUSTOM_BUDGET` is src-scoped and `PORT_DOUBLE_BUDGET` test-scoped as the plan assumed (house-style gate clean) | claude |
| 2026-10-08 | T3 | `JsonHazard.ts` (the walk moved verbatim, plus `toJson`/`toJsonRecord`; `SinkCodec.test.ts` unmodified and green), `PortWire.ts`, `PortWireEncode.ts`, a `wire` on all five descriptions, `RelationshipDepth` exported, `RelatedResult`/`ActedResult` schema-derived. Deviations: `PortWire` results carry a message string, not a `SchemaError`; the builder takes `toAnswer`/`fromAnswer` (via `sameAnswer<T>()`) because the attribute answer is `unknown` and needs `toJson`; `rebuildJson` uses `Object.fromEntries` so a `__proto__` key stays a key. Tests: `PortConformance` wire cases (5 rows x 5), `PortWire.test.ts` (23), `PortWire.tst.ts`. Commit 40fc519 | claude |
| 2026-10-08 | T4 | `servePortRead` in `PortAccess.ts` (an unnamed `Effect.fn` body under `Effect.withSpan(d.span)`, so no extra span), `servedPortCallsTotal`, `PortInterpreter` stated once. Deviation from step 1: the schema lives in a new package-private `PortInterpreter.ts` (not `PortSpanEncode.ts`), because `PortSpan.ts` importing `PortSpanEncode.ts` would be a madge type cycle; `PortSpan.ts` re-exports the type. `PortAccess`'s local `Interpreter` is `Exclude<PortInterpreter, "remote">` so `countFor` stays two arms. Devtools labels `served`; devtools' `portActivity` metric panel does not yet read the new metric (follow-up). Tests: `PortServe.test.ts` (27 over the registry), metric description pin, ServicesPanel label. Commit 6439b71 | claude |
| 2026-10-08 | T5 | `PortRemote.ts`. Deviation: `RemotePortFailure` stays a `Data.TaggedEnum` but the `cause` an asker puts in the port's error is a new `RemotePortError` (`Data.TaggedError`, message = `describeRemotePortFailure`), because `CustomPredicateError` has no `cause` field and renders a cause with `String()`, which gave `[object Object]`. `servingFor` reads only a node's own names (a matcher `subject(...)` ref reads the subject, not a port); the property test over `policyArbitrary` (150 samples) passes. Tests: `PortRemote.test.ts` (56). Commit 67fbc92 | claude |
| 2026-10-08 | T6 | `PortRoutes.ts`, `RemotePorts.ts` and tests (48). Route code is non-generic over the port (a `tabulatePorts` record of `answerRemotely` closures) because a generic `K` leaves deferred `Exclude<ServiceOf<...>>` requirements. `portRoutesUnguarded` logs its reason once at construction, not per request (D-31-g deviation, hot route). Prefix is typed `/${string}`. Commit 2967d1b | claude |
| 2026-10-08 | T7 | `client/ports.ts` is 97 lines (no `fetch`, `async`, guard); `api.ts` has no port handler body and serves `servingFor(catalogue)` for the three ports. `browserPorts` decides server-render vs remote at layer build (`Layer.unwrap`), not at module evaluation, so a test can stub `window`; `baseUrl` is `window.location.origin + "/api"` (`HttpClient` needs an absolute URL). Bundle check: `next build` then `grep` for `HttpApiBuilder|SubjectExtractor|HttpRouter` in `.next/static/chunks` is empty, so the `@qadi/http/client` fallback is not needed. Newsroom unit 42 passing; e2e not run. Commit a7d520a | claude |
| 2026-10-08 | T8 | ADR-QD-107, behaviour 34 (BEH-QD-329–333), INV-QD-241, CCR-QD-382 (CCR/INV numbers offset by +60 per the brief), ADR-QD-094/051 amendments, overview rows, traceability, website + http README + upgrading, one changeset (`a-port-is-answered-remotely.md`, core/http/devtools minor, fixed group). `spec:api`, `spec:examples`, `spec:verify:strict`, `spec:gates`, `spec:claims`, `spec:website-examples` pass. Commit a5445ef | claude |
| 2026-10-08 | T9 | Not run: `pnpm check` as a whole, mutation (core/http/devtools), `pnpm example` e2e, `spec:package` (gate 14), `website` build. Run: `typecheck`, `lint`, `circular`, `test:tstyche`, `coverage` (150 files, 3812 tests, thresholds met), `test:bdd` (559), house-style, the five spec gates, `next build` | claude |
