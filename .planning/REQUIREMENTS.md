# Requirements: Qadi

**Defined:** 2026-08-30
**Core Value:** A team building on Effect can enforce authorization through one `Effect`-returning evaluator whose policy is schema-derived data — and this milestone's job is closing the gap between "feature-complete, unpublished" and teams actually depending on `@qadi/core` in shipped code.

<!-- No PRD, SPEC, or DOC documents existed in this ingest batch (0 of 50
classified documents; all 50 were ADRs). .planning/intel/requirements.md is
empty for that reason. The requirements below were derived from the
observable gap between the codebase's current, verified state
(spec/roadmap.md rev 1.27, README.md's status line, .planning/codebase/) and
the user-supplied success metric (production adoption), not from an ingested
PRD. Every requirement below traces to a specific, cited gap — see each
category's source note. -->

## v1 Requirements

Requirements for this milestone. Each maps to a roadmap phase.

### Release Readiness (REL)

<!-- Source: README.md ("Status: feature-complete, unpublished... The version
is still 0.0.0 and nothing is on npm"); apps/website/PRODUCT.md ("Four
packages... published on npm at v0.2.0; the remaining five ship at 0.1.0,
unpublished. All nine are pre-1.0"); ADR-QD-033, ADR-QD-038. -->

- [ ] **REL-01**: Every public package (`@qadi/core`, `@qadi/testing`,
      `@qadi/promise`, `@qadi/react`, `@qadi/http`, `@qadi/devtools`,
      `@qadi/audit`, `@qadi/predicate-sql`, `@qadi/predicate-prisma`) is
      published to the npm registry under the `@qadi` scope via `pnpm
      publish`, installable with no `workspace:*` protocol residue, and its
      published version matches what `README.md`'s package table claims.
- [ ] **REL-02**: A fresh external project — created outside this monorepo,
      not the merge gate's own sandbox — can import from a published
      `@qadi/core` (and any companion package it needs), author a policy, and
      evaluate it successfully, proving the published `exports` map resolves
      for a real consumer.
- [ ] **REL-03**: Every public package intended for this release carries a
      changeset (`@changesets/cli`, ADR-QD-038) recording a real semver
      version bump; none remain at the placeholder `0.0.0` workspace-only
      version.
- [ ] **REL-04**: `scripts/check-package-install.mjs` (merge gate 14 /
      ADR-QD-033) passes for all nine public packages as part of release
      sign-off.

### Runtime Compatibility (COMPAT)

<!-- Source: .planning/codebase/CONCERNS.md, "Engine Version Floor
Unverified" — package.json declares Node >=20.19.0 but CI only tests Node
26. -->

- [ ] **COMPAT-01**: CI runs the full `pnpm check` gate suite on Node.js
      20.19.0 — the declared engine floor — in addition to the existing Node
      26 job, and it passes, closing the "declared but unverified" gap.

### Devtools CLI (CLI)

<!-- Source: spec/roadmap.md §"Planned" — ADR-QD-049 is Accepted with
implementation deferred; the only item the internal roadmap lists as not
yet shipped. -->

- [ ] **CLI-01**: A developer operating a backend-only service, a serverless
      function, or a replicated server (no browser-facing surface) can run a
      CLI that reads their app's `/__decisions` endpoint and renders the
      merged decision timeline to a terminal (ADR-QD-049).
- [ ] **CLI-02**: The CLI renders a decision (verdict, policy tag, subject,
      trace summary) using the same headless devtools model the React dock
      uses (ADR-QD-047), so the CLI and the dock never disagree about the
      same decision.
- [ ] **CLI-03**: The packed `@qadi/devtools` artifact's CLI entry point
      passes the packed-artifact install gate (ADR-QD-033) — the same
      install-integrity guarantee every other public entry point already
      has.

### Website Launch (SITE)

<!-- Source: apps/website/PRODUCT.md, "Operating Context" /
"Capabilities and Constraints" — "Live deployment (hosting, custom domain,
deploy-on-merge CI) is separate follow-up work; the real domain is
qadi.dev." Content and visual design are explicitly out of this roadmap's
scope (see REQUIREMENTS.md Out of Scope, and PROJECT.md) — only the
deployment gap the site's own PRODUCT.md leaves open is covered here. -->

- [ ] **SITE-01**: `qadi.dev` resolves to the built `apps/website`
      Astro/Starlight site, deployed automatically on merge to `main` — no
      manual deploy step.
- [ ] **SITE-02**: The deployed site's package-version and publish-status
      claims match the real npm registry state established by REL-01 (no
      page claims a package is "unpublished" once it ships, and vice versa).

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Planning Completeness

- **PLAN-01**: ADR-QD-051 through ADR-QD-058 (8 ADRs that exist in
  `spec/decisions/` but fell outside this ingest batch's 50-document cap) are
  ingested into `.planning/intel/decisions.md` and reconciled into
  `PROJECT.md`'s locked-decisions block, so planning intel matches the full
  `spec/decisions/` set. (Deferred: content not yet read; a follow-up ingest
  pass is required before this can become a v1 requirement.)

### Website Enhancements

- **SITE-03**: An interactive, in-browser policy evaluator demo ships on the
  website. (Explicitly flagged as future work, not part of the current
  build, in `apps/website/PRODUCT.md`'s "Capabilities and Constraints"
  section — owned by that track, not this roadmap.)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| GxP / 21 CFR Part 11 certification claims | `@qadi/audit` assembles primitives; it makes no compliance certification claim (ADR-QD-016, locked) |
| Policy storage or administration UI | Qadi decides, it does not persist or administer (ADR-QD-016 scope note, locked) |
| Authentication | The caller supplies an authenticated subject (locked architectural boundary) |
| Backward compatibility with the predecessor library's JSON format | Discriminant changed `kind` → `_tag` (ADR-QD-003, locked); a migration script is cheaper than a permanent compatibility layer |
| `apps/website` content, visual design, and information architecture | Owned by `apps/website/PRODUCT.md` / `DESIGN.md` and its own active design workflow — duplicating that scope here would create two sources of truth |
| Reconciling ADR-QD-051–058 into planning intel | Content not yet read (outside this ingest batch's 50-doc cap); tracked as v2 PLAN-01 instead of a phase, since no requirement can be honestly derived from unread ADRs |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMPAT-01 | Phase 1 | Pending |
| REL-03 | Phase 1 | Pending |
| REL-04 | Phase 1 | Pending |
| REL-01 | Phase 2 | Pending |
| REL-02 | Phase 2 | Pending |
| CLI-01 | Phase 3 | Pending |
| CLI-02 | Phase 3 | Pending |
| CLI-03 | Phase 3 | Pending |
| SITE-01 | Phase 4 | Pending |
| SITE-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-30*
*Last updated: 2026-08-30 after initial roadmap creation*
