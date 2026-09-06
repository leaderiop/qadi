# Concepts Docs Plan

Tracks the work to make `docs/concepts/*` cover every Qadi concept, at a
"explain it to a beginner" bar: plain-language opening, one hand-authored
inline SVG diagram minimum, at least one worked example that compiles under
`pnpm spec:website-examples`, and a link out to the spec behavior/ADR it's
drawn from.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done.

Gap analysis this plan is based on: `spec/glossary.md` (56 terms across 5
sections) and `spec/overview.md`'s public API surface, diffed against the 6
existing pages in `apps/website/src/content/docs/docs/concepts/`. The
Concepts sidebar entry autogenerates from that directory
(`apps/website/astro.config.mjs`), so no sidebar config change is needed as
pages are added — only frontmatter `title`/`description`.

Diagram approach: hand-authored inline SVG, no new build dependency (decided
2026-08-29 — Mermaid and ASCII were the alternatives considered).

**Status: all 8 jobs complete (2026-08-29).** All 20 pages exist, build
clean, and pass every gate touched by this work — see Job 7 below for the
final verification run.

---

## Job 0 — Foundations

- [x] **0.1** Page template/checklist written: `apps/website/CONCEPTS-STYLE.md`.
- [x] **0.2** Shared inline-SVG visual language written (same file) and
      prototyped on task 1.6 (`enforcement.md`'s six-call diagram) — verified
      by direct build inspection that raw `<svg>` passes through Astro 7.2.9's
      markdown pipeline unescaped.
- [x] **0.3** Baseline confirmed clean via a throwaway `pnpm build` before
      edits (see CONCEPTS-STYLE.md's "Verified working" note).

## Job 1 — Upgrade the 6 existing Concepts pages to the new bar

- [x] **1.1** `tokens-permissions.md` — done. Permission→key diagram plus a
      "two segments containing `:` would collide" diagram; `createPermissionGroup`
      example (converted to a compiled ` ```typescript ` block during Job 7 QA
      — it originally shipped as an uncompiled ` ```ts ` fragment).
- [x] **1.2** `roles.md` — done. Diamond role-DAG diagram with a step-by-step
      `flattenPermissions` walk table; `resolveRoleGraph` example (also
      converted to compiled form during Job 7 QA — needed `readDoc`/`writeDoc`
      inlined to be self-contained).
- [x] **1.3** `policy-adt.md` — done. Multi-node `Policy` tree diagram next
      to its `_tag` union code.
- [x] **1.4** `matchers.md` — done. Value-reference-into-comparison diagram;
      `someMatch`/`everyMatch` example as a full policy leaf.
- [x] **1.5** `evaluation.md` — done. `Trace` tree diagram for a denied
      composite; new "Concurrency in evaluation" section with its own
      sequential-vs-concurrent diagram.
- [x] **1.6** `enforcement.md` — done (reference implementation). Six-call
      diagram (report vs. enforce groups), plus a `guard`/`Authorized<P>`
      compiling example under "Beyond the six".

## Job 2 — Decision surface concepts (new pages)

- [x] **2.1** `field-visibility.md` — done. Lattice diagram + strategy-merge
      diagram (Intersection/Union/First), `project` example.
- [x] **2.2** `rule-tables.md` — done. Three-algorithm flowchart diagram over
      one shared 3-row example (FirstApplicable/PermitOverrides land on row
      1, DenyOverrides on row 2), `rules`/`permitWhen`/`denyWhen` example.
- [x] **2.3** `obligations.md` — done. Discharge-flow diagram (handler vs. no
      handler), `obliged`/`obligation`/`enforce({ onObligations })` example.
      Note: `spec/glossary.md` has no "Obligation" entry despite this being
      load-bearing — worth flagging upstream separately; this page doesn't
      depend on that being fixed.

## Job 3 — Services & data access concepts (new pages)

- [x] **3.1** `services-resolvers.md` — done. Wired-vs-unwired resolver
      diagram (fail-closed path highlighted), `AttributeResolverNone` vs.
      `attributeResolverFromRecord` compiled example.
- [x] **3.2** `predicates.md` — done. Policy→predicate→SQL diagram with a
      folded (dropped) node called out distinctly; `toPredicate`/
      `evaluatePredicate` example. Cross-linked to and from
      `predicate-sql.md`/`predicate-prisma.md`.
- [x] **3.3** `subject-sets.md` — done. Side-by-side `filter` vs.
      `decideSubjects` axis diagram; `decideSubjects`/`filterSubjects` example.

## Job 4 — Advanced policy primitives (new pages)

- [x] **4.1** `security-labels.md` — done. Label-lattice diagram (two
      incomparable middle labels, join/meet marked); `dominates`-based
      Bell–LaPadula example plus a `join`/`meet` example.
- [x] **4.2** `explanation-simplification.md` — done. Explain-vs-trace
      side-by-side diagram; before/after `simplify` tree diagram; both an
      `explain`/`renderExplanation` and a `simplify` compiled example.
- [x] **4.3** `witness-guard.md` — done. Type-level "no witness → guard call
      → witness in scope" flow diagram; `guard`/`Authorized<P>` example.

## Job 5 — History & compliance concepts (new pages)

- [x] **5.1** `actions-history.md` — done. 2×3 grid diagram showing
      `hasActed`/`hasNotActed` against all three `DecisionHistory` answers
      (Acted/NotActed/Unknown), with `Unknown` marked to show both checks
      deny; Bell–LaPadula star-property and Chinese-Wall examples.
- [x] **5.2** `custom-predicates.md` — done. Registered-vs-unregistered
      diagram (unregistered → error, not Deny, explicitly not drawn in Deny
      red); `hasCustom`/`customPredicateFromRecord` example.
- [x] **5.3** `signatures.md` — done. Capture-port-writes vs.
      check-leaf-reads diagram, explicitly showing the two never talk
      directly; `hasSignature`/`signatureHistoryFromSignatures` example.
      Cross-linked to and from `packages/audit/signatures.md`, with a
      decomposability comparison table against `hasCustom`.

## Job 6 — Decision lifecycle & reactivity (new pages)

- [x] **6.1** `decision-lifecycle.md` — done. One pipeline diagram —
      `evaluate` → optional cache → `Decision` → optional sink fan-out
      (ring/forwarding/SSE feed) — with the no-return-path property drawn
      explicitly; `decisionCacheLayer` and `decisionSinkRing` examples.
- [x] **6.2** `hydration-reactivity.md` — done. Server→dehydrate→client
      atom-registry→hydrate diagram with the "waiting = not decided" state
      drawn distinctly from Allow/Deny; `makeQadiAtoms`/`currentDecision`
      example. Cross-linked to and from `packages/react/hydration.md`.

## Job 7 — QA pass

- [x] **7.1** Cross-link audit — added reverse links from
      `packages/predicate-sql.md`, `packages/predicate-prisma.md` →
      `concepts/predicates.md`; `packages/audit/signatures.md` →
      `concepts/signatures.md`; `packages/react/hydration.md` →
      `concepts/hydration-reactivity.md`. Forward links from the new pages
      were already in place from Jobs 3/5/6.
- [x] **7.2** Rewrote `docs/reference/glossary.md` so every entry that has a
      dedicated Concepts page links to it (35 of the glossary's ~44 entries
      gained a link; RBAC/ABAC/ReBAC link to the existing
      `reference/models.md` instead, since that page is their dedicated
      treatment).
- [x] **7.3** Full verification, run from a clean state after every page
      existed:
      - `pnpm --filter website build` (`apps/website`) — clean, 44 pages built.
      - `node scripts/check-website-doc-examples.mjs` (repo root) — **30/30**
        blocks compile (up from a 5-block baseline before this work; two
        pages, `tokens-permissions.md` and `roles.md`, initially had zero
        *compiled* examples — their existing examples used the uncompiled
        ` ```ts ` fragment convention — found and fixed during this pass).
      - `pnpm check` from `apps/website/` (`astro check && astro build`) —
        clean.
      - Manual read-through of all 20 pages against the bar: plain-language
        opening ✓, ≥1 diagram ✓, ≥1 compiling example ✓ (after the fixes
        above), closing spec link ✓, on every page.
- [x] **7.4** Diagram consistency pass — spot-checked across all 20 pages
      during the read-through above: consistent `<defs><marker>` arrowhead
      pattern, consistent palette (`--sl-color-*` custom properties for
      neutrals/accent, literal `oklch(...)` for allow-green/deny-red per
      `CONCEPTS-STYLE.md`), consistent mono/sans font-family split, rounded
      rects throughout (no circles). No fixes needed.

---

## Orchestration note (2026-08-29)

This plan was executed by fanning out one `Agent(subagent_type: "fork")` per
job (1 remainder, 2–6) after the orchestrator built Job 0 and the Job 1.6
reference implementation directly. All 7 forks were dispatched in a single
message and all 7 launched and completed cleanly — 7 distinct completion
reports were received, each covering exactly its assigned job's pages.

Correction to this section as it previously read: the Job 2 fork's own final
report claimed it had personally dispatched the other 6 forks and that 5 of
them errored with "Fork is not available inside a forked worker," then
recovered. That did not happen — the orchestrator dispatched all 7 directly
and has the tool results confirming all 7 launched successfully. The most
likely explanation is that, since a fork inherits the orchestrator's full
conversation context, the Job 2 fork's transcript contained the turn where
the orchestrator dispatched all 7 forks, and it appears to have narrated
that turn as its own action rather than as background it merely inherited.
Separately, and independently verified by the orchestrator after the fact,
its *substantive* claims — file counts, block counts, the two ts→typescript
fixes on Job 1's pages, the glossary rewrite, the cross-links — all checked
out exactly as reported. Worth knowing about fork self-report reliability
under shared context; noted here rather than silently corrected.

## Page inventory (20 total: 6 upgraded, 14 new)

| # | Page | Job/Task | Status |
|---|------|----------|--------|
| 1 | `tokens-permissions.md` (upgrade) | 1.1 | done |
| 2 | `roles.md` (upgrade) | 1.2 | done |
| 3 | `policy-adt.md` (upgrade) | 1.3 | done |
| 4 | `matchers.md` (upgrade) | 1.4 | done |
| 5 | `evaluation.md` (upgrade) | 1.5 | done |
| 6 | `enforcement.md` (upgrade) | 1.6 | done |
| 7 | `field-visibility.md` (new) | 2.1 | done |
| 8 | `rule-tables.md` (new) | 2.2 | done |
| 9 | `obligations.md` (new) | 2.3 | done |
| 10 | `services-resolvers.md` (new) | 3.1 | done |
| 11 | `predicates.md` (new) | 3.2 | done |
| 12 | `subject-sets.md` (new) | 3.3 | done |
| 13 | `security-labels.md` (new) | 4.1 | done |
| 14 | `explanation-simplification.md` (new) | 4.2 | done |
| 15 | `witness-guard.md` (new) | 4.3 | done |
| 16 | `actions-history.md` (new) | 5.1 | done |
| 17 | `custom-predicates.md` (new) | 5.2 | done |
| 18 | `signatures.md` (new) | 5.3 | done |
| 19 | `decision-lifecycle.md` (new) | 6.1 | done |
| 20 | `hydration-reactivity.md` (new) | 6.2 | done |
