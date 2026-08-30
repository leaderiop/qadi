# Qadi

## What This Is

Qadi is an Effect-native authorization library for TypeScript: permission
tokens, a role DAG, a schema-derived Policy ADT, and a single
`Effect`-returning evaluator, with companion packages for React, Promise-based
callers, HTTP framework bindings, SQL/Prisma predicate compilation, and a
headless devtools model. It is a ground-up rewrite of an earlier
`Result`-based library, built to remove a class of defect structurally
(serializer/type drift, silent short-circuit loss, ambiguous error codes)
rather than by discipline.

## Core Value

A team building on Effect can enforce authorization — permission checks, role
checks, field-level visibility, ReBAC, obligations — through one
`Effect`-returning evaluator whose policy is schema-derived data, not
scattered `if` statements, and whose decisions never silently disagree with
what was actually checked. If everything else in this milestone slips, real
teams still need to be able to depend on `@qadi/core` in shipped code.

## Business Context

- **Customer**: Effect/TypeScript teams evaluating or adopting an
  authorization library; a secondary GxP-technical-decision-maker audience
  evaluates `@qadi/audit` specifically for regulated-environment fit.
- **Revenue model**: None — open-source, MIT-licensed. No monetization.
- **Success metric**: Adoption in production apps — teams/projects actually
  depending on `@qadi/core` (and companion packages) in shipped code, not
  spec completeness or internal test coverage. (User-supplied.)
- **Strategy notes**: `spec/roadmap.md` is the library's own internal,
  document-controlled roadmap (QADI-RMP, currently rev 1.27) and is the
  authoritative record of what has shipped; this file and
  `.planning/ROADMAP.md` track the GSD-managed work that gets the library from
  "feature-complete, unpublished" to "adopted."

## Requirements

### Validated

<!-- Shipped and confirmed built, per spec/roadmap.md rev 1.27 (2026-08-25),
README.md's own status line ("feature-complete, unpublished"), and the
codebase map in .planning/codebase/. Every item the internal roadmap
committed to has shipped except one non-blocking Planned item (the devtools
CLI — see Active, below). -->

- ✓ Core evaluator: permission tokens, role DAG, 14-variant schema-derived
  Policy ADT, one `Effect`-returning evaluator with lazy attribute/
  relationship resolution and sequential short-circuiting — `@qadi/core`
- ✓ Field-level visibility, obligations, a three-valued decision-history port,
  a security-label lattice with join/meet, ordered rule tables (combining
  algorithms), subject-set evaluation, predicate compilation output, policy
  explanation, opt-in policy simplification, opt-in decision caching —
  `@qadi/core`
- ✓ React bindings on Effect atoms with SSR hydration and mismatch reporting —
  `@qadi/react`
- ✓ A Promise facade with no evaluator of its own — `@qadi/promise`
- ✓ HTTP framework bindings: witness/`guard` primitive, `HttpApi` and
  `HttpRouter` adapters, a cross-surface permission registry — `@qadi/http`
- ✓ A headless devtools model with a React dock, an optional decision-sink
  topology, an SSE decision feed, a sealed subject simulator —
  `@qadi/devtools`
- ✓ SQL and Prisma predicate compilation for row-level security —
  `@qadi/predicate-sql`, `@qadi/predicate-prisma`
- ✓ An audit-trail/signature-capture package assembling GxP-adjacent
  primitives into a pipeline that makes no compliance certification claim —
  `@qadi/audit`
- ✓ Test fixtures and deterministic layers — `@qadi/testing`
- ✓ A 22-gate merge pipeline (`pnpm check`): typecheck, lint + house-style,
  circular-import check, type-level tests, unit/property tests (1682+
  passing), BDD acceptance (229 scenarios, 1041 steps), coverage (95% core /
  90% elsewhere), doc-example compilation, specification-integrity checks,
  packed-artifact install check, mutation testing (≥80% per package)

### Active

<!-- Current GSD-managed scope: closing the gap between "feature-complete,
unpublished" and "adopted in shipped code." Full descriptions and acceptance
detail live in REQUIREMENTS.md. -->

- [ ] Every public package is released-ready: versioned via changesets, the
      Node.js engine floor is verified in CI (not just declared), and the
      packed-artifact install gate passes for all nine packages (REL-03,
      REL-04, COMPAT-01)
- [ ] Every public package is published to npm and installable by a real
      external consumer (REL-01, REL-02)
- [ ] A developer with no browser-facing deployment (backend-only service,
      serverless function, replicated server) can inspect the decision
      timeline via a CLI reading `/__decisions` — the one item
      `spec/roadmap.md` still lists under "Planned" (ADR-QD-049) (CLI-01,
      CLI-02, CLI-03)
- [ ] `qadi.dev` serves the built website automatically on merge, with
      package-version claims that match the real npm registry state (SITE-01,
      SITE-02)

### Out of Scope

- GxP / 21 CFR Part 11 certification claims — `@qadi/audit` assembles
  primitives; it does not certify anything (ADR-QD-016; this is a locked
  architectural decision, not a milestone choice)
- Policy storage or administration UI — Qadi decides, it does not persist or
  administer (locked, ADR-QD-016 scope note)
- Authentication — the caller supplies an authenticated subject (locked)
- Backward compatibility with the predecessor library's JSON format —
  discriminant changed from `kind` to `_tag` (ADR-QD-003); a migration script
  is cheaper than a permanent compatibility layer (locked)
- `apps/website` content, visual design, and information architecture — owned
  by its own `apps/website/PRODUCT.md` / `apps/website/DESIGN.md` and an
  actively separate design workflow; this roadmap touches only the site's
  production *deployment* (SITE-01), not its content or design
- Reconciling ADR-QD-051 through ADR-QD-058 into planning intel — those 8
  ADRs exist in `spec/decisions/` but fell outside this ingest batch's 50-doc
  cap; deferred to a follow-up ingest pass (tracked in STATE.md, not a
  roadmap phase, since their content hasn't been read yet)

## Context

- **Brownfield, spec-governed codebase.** `spec/` is a mature, self-governing
  normative specification system (58 ADRs total, 33 behavior docs, 38 model
  docs, a traceability matrix, and DoD gates). Per `AGENTS.md` §11: "Code
  follows the spec, not the reverse." This ingest batch covered ADR-QD-001
  through ADR-QD-050 (50 of 58); all 50 are `locked: true`, status Accepted —
  see the `<decisions>` block below.
- **Current state per `spec/roadmap.md` (rev 1.27, 2026-08-25) and
  `README.md`:** "feature-complete, unpublished." Every item the internal
  roadmap committed to has shipped. Version is still `0.0.0` at the workspace
  root; nothing is published to the public npm registry. The one item under
  `spec/roadmap.md`'s "Planned" section — a devtools CLI shell (ADR-QD-049,
  Accepted with implementation deferred) — is Accepted but not blocking first
  release (`spec/roadmap.md` §"Blocking first release": "Nothing").
- **Package versions are inconsistent pre-release state:** `@qadi/core`,
  `@qadi/testing`, `@qadi/react`, `@qadi/promise` are at `0.2.0`; `@qadi/audit`,
  `@qadi/http`, `@qadi/devtools`, `@qadi/predicate-sql`, `@qadi/predicate-prisma`
  are at `0.1.0`. None are published to the public npm registry yet (per
  `apps/website/PRODUCT.md`'s own accounting, which the site must not
  contradict).
- **`apps/website` (Astro 7 + Starlight, target domain `qadi.dev`) is under
  active, separately-tracked development** — it has its own `PRODUCT.md` and
  `DESIGN.md`, uses a distinct design workflow (the `impeccable` skill), and
  its own `PRODUCT.md` explicitly states: "Live deployment (hosting, custom
  domain, deploy-on-merge CI) is separate follow-up work." That gap — not the
  site's content — is what this roadmap picks up (see Phase 4).
- **`CONCERNS.md` flags the declared Node.js engine floor
  (`>=20.19.0`) as documented but unverified** — CI currently tests only Node
  26, the latest major, not the floor itself.
- **The merge gate is extensive and non-negotiable:** `pnpm check` (22 steps)
  is the sole definition of "done" (AGENTS.md §15); CI runs exactly this and
  nothing else. Any new work — including this milestone's — must pass it,
  including gate 14 (packed-artifact install check, ADR-QD-033) and the
  mutation-testing gates.
- **No PRD, SPEC, or DOC-type documents existed in this ingest batch** — all
  50 classified documents were ADRs. `.planning/intel/requirements.md`,
  `constraints.md`, and `context.md` are empty for this reason. The Active
  requirements above were derived from the observable gap between the
  codebase's current, verified state and the user-supplied adoption goal, not
  from an ingested PRD.

## Constraints

- **Tech stack**: Effect v4 (`>=4.0.0-beta.100`, currently `4.0.0-rc.110`),
  TypeScript 7, a pnpm workspace monorepo — no deviation (`AGENTS.md`).
- **Publishing**: `pnpm publish` only, never `npm publish` — the workspace
  uses pnpm's `workspace:*`/`catalog:` protocols, which `npm` copies into a
  tarball verbatim and cannot install (`AGENTS.md` §16, merge gate 14 /
  ADR-QD-033).
- **Runtime**: Runtime-agnostic — must work in any JavaScript runtime via
  Effect platforms, not tied to Node.js specifically (user-supplied target
  runtime).
- **Spec authority**: Code follows `spec/`, not the reverse (`AGENTS.md`
  §11). Any roadmap phase that touches public behavior must update the
  relevant behavior doc, ADR, and traceability matrix in the same change.
- **Merge gate**: `pnpm check` (22 steps, `AGENTS.md` §15) is the only
  definition of done; CI (`.github/workflows/check.yml`) runs exactly this
  step and nothing else.
- **Compatibility**: Declared Node floor `>=20.19.0`, currently unverified in
  CI (`CONCERNS.md`) — Phase 1 closes this gap.

## Key Decisions

<!-- Project-level (GSD-roadmapping) decisions made while scoping this
milestone. The 50 architectural ADRs governing the existing system are
recorded separately, below, in the <decisions> block. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Scope this milestone to release-readiness, not a feature rebuild | The codebase is already feature-complete per `spec/roadmap.md` rev 1.27 and `README.md`'s own status line; the ingest batch contained zero PRD/SPEC/DOC documents (0 of 50), only ADRs describing what already exists | — Pending |
| Exclude `apps/website` content/design from this roadmap; include only its deployment | The site already has its own `PRODUCT.md`/`DESIGN.md` and an active, separately-tracked design workflow; duplicating that scope here would create two sources of truth for the same surface | — Pending |
| Defer ADR-QD-051–058 reconciliation to a follow-up ingest pass | This ingest batch was capped at 50 documents; those 8 ADRs' content has not been read, so no requirement can honestly be derived from them yet | — Pending |

## Locked Decisions (from `spec/decisions/`, ADR-QD-001–050)

<!-- Sourced verbatim (condensed to one line each) from
.planning/intel/decisions.md — 50 of 50 ADRs classified in this ingest
batch, all status: locked (Accepted). Per AGENTS.md §11, spec/ is normative:
"Code follows the spec, not the reverse." These are architectural facts
about the existing system, not open choices for this roadmap or any phase
plan — nothing here is up for reconsideration by GSD planning. ADR-QD-051
through ADR-QD-058 exist in spec/decisions/ but were not part of this ingest
batch and are intentionally absent below (see Out of Scope). -->

<decisions>

- **D-QD-001:** Effect v4 (`>=4.0.0-beta.100`) is the effect system. `Result` is retired.
- **D-QD-002:** The policy union's recursive type is hand-written first (`Schema.suspend` needs a named type); the `Schema.Union` of `TaggedStruct` variants is built and type-asserted against it; the JSON codec is derived from that schema.
- **D-QD-003:** Every discriminated union in this library uses `_tag` as the discriminant.
- **D-QD-004:** There is one evaluator; it returns `Effect<Decision, EvaluationError, CurrentSubject | AttributeResolver | RelationshipResolver | EvaluationId>`.
- **D-QD-005:** Attributes are read at the node that needs them; the evaluator checks the subject's own attributes first and calls `AttributeResolver` only on a miss.
- **D-QD-006:** `fieldStrategy` is a required field on `AllOf`/`AnyOf` in the schema, always encoded and decoded; combinators supply a default at construction.
- **D-QD-007:** `Permission` is a hand-written interface with literal type parameters, so different permission tokens are incompatible at compile time.
- **D-QD-008:** Every error is a `Data.TaggedError` with a stable, plain tag; the `_tag` is the identity.
- **D-QD-009:** Authorization decisions are reported through Effect's built-in tracing, logging, and metrics; `evaluate` runs inside a `qadi.evaluate` span.
- **D-QD-010:** Services follow the `Context.Service` form with separately exported `…Shape` interfaces; layers are exported constants — no `static layer`, no auto-generated `.Default`.
- **D-QD-011:** `Qadi.enforce(policy)` wraps an Effect — enforcement is an Effect aspect, not a separate call path.
- **D-QD-012:** Durations come from Effect's `Clock`; evaluation identifiers come from an `EvaluationId` service.
- **D-QD-013:** Children are evaluated sequentially, stopping at the first denying child of an `allOf` and the first allowing child of an `anyOf`.
- **D-QD-014:** `@qadi/react` is a binding over `effect/unstable/reactivity` — one `useSyncExternalStore` call, depending only on `effect` and `react`.
- **D-QD-015:** `role()` is total and takes parents by value, so the role graph is a DAG by construction; `flattenPermissions` needs only a visited set.
- **D-QD-016:** Regulated-environment (GxP) compliance support is out of scope; this library provides authorization only.
- **D-QD-017:** Every consumer in `@qadi/react` treats a `waiting` result as *not decided*; `currentDecision` is the single place that rule lives.
- **D-QD-018:** A permission is a grant the subject holds; an action is a property of the request — Qadi keeps them separate.
- **D-QD-019:** An obligation is a condition attached to permission; obligations union across `AllOf`/`AnyOf` children that allow (never intersect); a denying node contributes none; `Not` never has an obligation set.
- **D-QD-020:** History is a three-valued port (`ActedResult`), not a boolean; `"Unknown"` means no store is wired, and both `hasActed`/`hasNotActed` deny on it via one default layer.
- **D-QD-021:** `SecurityLabel` is `{ level, compartments }`, computed structurally; dominance is `≥` on level and `⊇` on compartments; the label never enters the policy.
- **D-QD-022:** `decideSubjects` evaluates a policy against a list of subjects without an ambient `CurrentSubject`; subject-set evaluation reports, it does not enforce.
- **D-QD-023:** Combining algorithms are a new policy variant, `Rules` (`FirstApplicable`/`DenyOverrides`/`PermitOverrides`), not a field added to `AllOf`/`AnyOf`.
- **D-QD-024:** The predicate output is an abstract `Predicate` union with no `Schema`; it ships with a reference interpreter, `evaluatePredicate`. Narrowed by ADR-QD-054 (not in this ingest batch) to allow a companion package to compile a dialect.
- **D-QD-025:** Stryker mutation testing runs on `packages/core` as the last step of `pnpm check`, breaking below 80%.
- **D-QD-026:** `EvaluateOptions.concurrency` is opt-in; turning it on changes only which lookups happen and how long they take — the decision and its trace are identical.
- **D-QD-027:** `explain(policy)` returns an `Explanation` tree; `renderExplanation` turns one into English.
- **D-QD-028:** Two pure functions, `dehydrateDecisions` (server) and `hydrateDecisions` (client); the payload is bound to a subject id and carries no trace.
- **D-QD-029:** `join` and `meet` are exported as pure functions on `SecurityLabel`; nothing in the evaluator changes.
- **D-QD-030:** `simplify(policy)` is an explicit, opt-in transform; it preserves the verdict and field set, not the trace, and is never automatic.
- **D-QD-031:** An optional `DecisionCache` service, absent by default; it stores the `Trace`, and its key includes the subject.
- **D-QD-032:** `@qadi/promise` is a separate package, one file, with no evaluation logic of its own.
- **D-QD-033:** `scripts/check-package-install.mjs` (merge gate 14) packs each public package, installs it into a sandbox, and makes a TypeScript consumer authorize through it.
- **D-QD-034:** The four house-style-exempted `switch` statements stay; both dispatchers that previously lacked an exhaustiveness net now carry one.
- **D-QD-035:** A witness is a branded value, not a service, produced by one combinator in `@qadi/core`.
- **D-QD-036:** Endpoint permission requirements are a plain curried function, not a `.pipe()`-composable combinator; `@qadi/http` ships two framework adapters, one enforcement path, one registry.
- **D-QD-037:** Two new merge gates — no circular imports (`madge`) and type-level tests (`tstyche`) that outlive a comment — run between the lint family and the runtime test suite.
- **D-QD-038:** `@changesets/cli` records what changed and computes version bumps; nothing wires it into CI or `pnpm check`.
- **D-QD-039:** The seed lives in its own atom; the decision a consumer reads is a derivation over both the seed and the live answer.
- **D-QD-040:** The relationship port answers three ways (`RelatedResult`), as the history port does; `"Unknown"` means no resolver is wired. Breaking: every `RelationshipResolverShape` implementation must return the new type.
- **D-QD-041:** The client's answer still wins on a hydration mismatch; the mismatch is reported alongside (via `console.warn` or a supplied `onHydrationMismatch` callback), never resolved.
- **D-QD-042:** Composite explanation children are parenthesised via one `embed` helper; the `DecisionCache` key is the question itself — `keyOf` is deleted, and `HashMap`/`Chunk` hold `DecisionCacheKey` directly via structural `Equal`/`Hash`.
- **D-QD-043:** The guarded resource is the evaluated resource — an explicit `options.resource` passed to `enforce` overrides rather than merges with the handler's resource. The `DecisionCache` key now carries the whole `AuthSubject`, not `subjectId` — a breaking, explicit widening of ADR-QD-031's key shape.
- **D-QD-044:** `DecisionSink` is one optional, write-only port, read through `Effect.serviceOption` exactly as `DecisionCache` is.
- **D-QD-045:** Core ships the seam (`decisionSinkRing`, `decisionSinkForwarding`, `decisionSinkAll`), not the transport — the topology is a choice of sink.
- **D-QD-046:** A decision feed is delivered as Server-Sent Events, guarded by a policy, with no unguarded variant.
- **D-QD-047:** One package, `@qadi/devtools`, split at the React boundary — a headless model with a React shell over it.
- **D-QD-048:** The policy catalogue is derived from the decision timeline; declaration is additive — the catalogue is observed, not registered.
- **D-QD-049:** The second devtools shell is a CLI, reading `/__decisions` and rendering the merged timeline to a terminal — not a page served by `@qadi/http`. Accepted with implementation deferred.
- **D-QD-050:** Every simulation runs in a sealed layer, in every mode, answering from one of three sources.

</decisions>

---
*Last updated: 2026-08-30 after initial project ingest (ADR-QD-001–050; ADR-QD-051–058 pending a follow-up ingest pass)*
