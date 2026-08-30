# Phase 1: Release Readiness & Runtime Verification - Context

**Gathered:** 2026-08-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Every public package is verified against its declared runtime floor and versioned for a real release, so publishing in Phase 2 is a mechanical step rather than a judgment call. This phase covers: (1) verifying the declared Node >=20.19.0 engine floor in CI, and (2) getting all 9 public packages release-versioned via changesets — including authoring the two missing changesets for `@qadi/audit` and switching to a permanent fixed/lockstep versioning scheme. It does NOT cover publishing to npm (Phase 2), the devtools CLI (Phase 3), or website deployment (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Changeset gap for @qadi/audit
- **D-01:** Two real unreleased changes exist in `@qadi/audit` with no changeset: f86f028 (ElectronicSignature retired in favor of core's canonical `Signature`, adds optional `signerRole`) and f0c48fd (formal invariants, behaviors doc, mutation-testing gate). Write two separate changesets, not one.
- **D-02:** Both changesets get a **minor** bump — this repo's established convention for pre-1.0 breaking changes (see `.changeset/brave-guards-decide.md`, which marks a breaking `DecisionCacheKey` rename as minor, not major).
- **D-03:** The ElectronicSignature-retirement changeset must explicitly mark the change **"Breaking"** inline in its prose, matching how other changesets in this repo call out breaking changes under a minor bump.
- **D-04:** Write changeset prose fresh — do not copy/adapt from the f86f028 commit message. Focus narrowly on what an `@qadi/audit` consumer needs to know.

### Node 20.19 CI job design & failure handling
- **D-05:** Add the Node 20.19.0 floor check as a **matrix expansion** of the existing `check.yml` job (`node-version: [20.19.0, 26]`), not a separate job block — keeps one job definition that still literally runs `pnpm check`, preserving the AGENTS.md §15 invariant ("CI runs `pnpm check` and nothing else").
- **D-06:** The Node 20.19 leg is **required/blocking from day one** — no informational grace period. Rationale (user's own framing, matches CONCERNS.md): "a declared floor with no verification is worse than no declaration."
- **D-07:** If Node 20.19 reveals a real incompatibility (not just "previously untested but fine"), **fix it within this phase** rather than lowering the floor or deferring.
- **D-08:** Once the floor job is green, update the now-stale `check.yml` inline comment (currently explains the floor "is not exercised") and `.planning/codebase/CONCERNS.md`'s "Engine Version Floor Unverified" entry — both become false claims once this ships.

### Version-bump timing & scheme
- **D-09:** Run `pnpm changeset version` **now, within Phase 1** — not deferred to Phase 2. Phase 2 becomes a pure `pnpm publish` step with no version-decision left to make.
- **D-10:** Set `.changeset/config.json`'s `"fixed"` field to a group containing all 9 public packages (`@qadi/core`, `@qadi/testing`, `@qadi/promise`, `@qadi/react`, `@qadi/http`, `@qadi/devtools`, `@qadi/audit`, `@qadi/predicate-sql`, `@qadi/predicate-prisma`) — **permanently**, not just for this release. Every future `changeset version` run bumps all 9 together to one shared version number. — **Reversibility:** one-way — once packages are published under a shared-version scheme, consumers may come to rely on "install any `@qadi/*` package, they're always at the same version"; unwinding the fixed group later would break that implied parity contract, not just a config file.
- **D-11:** Applying normal semver math to the fixed group (highest current version among the 9 — 0.2.0, held by core/testing/react/promise — as the floor, then the highest-severity pending changeset, which is minor) computes to **0.3.0** for all 9 packages. Do not force a jump to `1.0.0` — the codebase is feature-complete but the user explicitly wants to stay pre-1.0/beta for this release.
- **D-12:** The workspace root `package.json` (currently `0.0.0`, private, never published) also moves to **0.3.0**, for consistency with the 9 public packages, even though it's never independently consumed.
- **D-13:** Review and polish the `pnpm changeset version`-generated `CHANGELOG.md` files before committing — do not commit them as raw auto-generated output. Matches this repo's evident care about prose/doc-comment quality (AGENTS.md's "Doc-comment shape" section).

### Claude's Discretion
- Exact wording/structure of the two new `@qadi/audit` changeset files, within the constraints above (two files, minor, one marked Breaking inline, fresh prose).
- Which specific CHANGELOG.md sections need polish vs. are fine as generated — apply judgment per AGENTS.md's stated bar.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Changesets & versioning
- `.changeset/config.json` — current config (`fixed: []`); needs the fixed-group edit (D-10)
- `.changeset/brave-guards-decide.md` — precedent for marking a breaking change "minor" pre-1.0, and for inline "**Breaking**:" callout style
- `.changeset/bright-roles-explain.md` — precedent for changeset prose style/structure
- `spec/decisions/038-changesets-for-versioned-releases.md` (ADR-QD-038, D-QD-038 in PROJECT.md) — locked decision: `@changesets/cli` records changes and computes bumps; nothing wires it into CI or `pnpm check`. This phase does NOT change that — only the fixed-group config and running `version` manually.

### Audit package changes needing changesets
- `spec/decisions/057-audit-signature-harmonization.md` (ADR-QD-057) — the ElectronicSignature retirement this phase's first audit changeset documents
- `spec/decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md` (ADR-QD-058) — related core-side change (HasSignature leaf); not itself needing an audit changeset, but context for why ElectronicSignature was retired
- `packages/audit/src/SignatureCapturePort.ts` — the file whose public shape changed in f86f028

### CI / Node floor
- `.github/workflows/check.yml` — the single merge-gate workflow; matrix expansion happens here (D-05); its inline comment about the unverified floor needs updating (D-08)
- `.planning/codebase/CONCERNS.md` §"Engine Version Floor Unverified" — the concern this phase closes; entry needs updating once verified (D-08)
- `package.json` (root) — declares `"engines": {"node": ">=20.19.0"}`; the claim this phase verifies

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §Release Readiness (REL) and §Runtime Compatibility (COMPAT) — REL-01 through REL-04, COMPAT-01
- `.planning/ROADMAP.md` §Phase 1 — success criteria this phase must satisfy
- `AGENTS.md` §15 ("CI runs `pnpm check` and nothing else") and §16 ("Publish with pnpm, never npm") — constraints on how CI and versioning changes may be shaped

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/check-package-install.mjs` (merge gate 14, ADR-QD-033): already dynamically discovers public packages by scanning `packages/*` and excluding `private: true` — no changes needed for this phase to cover all 9 packages; REL-04 is about confirming this gate passes as part of release sign-off, not writing new discovery logic.
- 24 existing changeset files in `.changeset/` already cover 8 of 9 public packages (all but `@qadi/audit`) — most of REL-03's "changeset exists" requirement is already satisfied; this phase's changeset work is narrowly the 2 new audit changesets plus running `version`.

### Established Patterns
- Changeset prose style: substantial, technical, explains *why* not just *what* — see `brave-guards-decide.md` and `bright-roles-explain.md` for the bar to match.
- `"Breaking**:` inline callout convention used consistently across existing changesets even when the frontmatter bump is "minor" (pre-1.0 convention).

### Integration Points
- `.changeset/config.json`'s `fixed` array is the single integration point for D-10 — no code changes elsewhere are needed to enact lockstep versioning.
- `.github/workflows/check.yml`'s single `steps:` block (one job) is where the Node version matrix goes (D-05).

</code_context>

<specifics>
## Specific Ideas

- User specifically wants all 9 packages to share one version number **permanently**, computed via changesets' `fixed` group mechanism and normal semver rules — not a one-off manual sync.
- User explicitly wants to stay pre-1.0 ("beta version") for this release; the unified version should land at whatever semver computes (0.3.0), not jump to 1.0.0 despite the codebase being feature-complete.
- Root `package.json` should track the same shared version (0.3.0) as the 9 public packages, per user's explicit follow-up.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Release Readiness & Runtime Verification*
*Context gathered: 2026-08-30*
