# Roadmap: Qadi

## Overview

Qadi's core library is already feature-complete per its own internal spec
roadmap (`spec/roadmap.md` rev 1.27) — fourteen policy variants, obligations,
a decision-history port, a label lattice, ordered rule tables, subject-set
evaluation, predicate output, React integration, a Promise facade, HTTP
bindings, and a headless devtools model, all shipped and verified through a
22-gate merge pipeline. What remains, and what this roadmap covers, is the
journey from "feature-complete, unpublished, `0.0.0`" to teams actually
depending on it in shipped code: verifying the declared runtime floor and
versioning every package for a real release, publishing to npm, shipping the
one capability the internal roadmap still lists as Planned (a devtools CLI
for browser-less deployments), and deploying the already-built public website
to `qadi.dev`. Each phase closes one specific, cited gap rather than
re-building anything that already exists.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Release Readiness & Runtime Verification** - Verify the declared Node.js floor in CI and version every public package for a real release
- [ ] **Phase 2: Publish to npm** - Every public package is published and installable by a real external consumer
- [ ] **Phase 3: Devtools CLI** - A team with no browser-facing deployment can inspect the decision timeline from a terminal
- [ ] **Phase 4: Website Launch** - `qadi.dev` serves the built site automatically, honestly reflecting the real npm registry state

## Phase Details

### Phase 1: Release Readiness & Runtime Verification
**Goal**: Every public package is verified against its declared runtime floor and versioned for a real release, so publishing in Phase 2 is a mechanical step rather than a judgment call.
**Depends on**: Nothing (first phase)
**Requirements**: COMPAT-01, REL-03, REL-04
**Success Criteria** (what must be TRUE):
  1. CI runs the full `pnpm check` gate suite on Node.js 20.19.0 — the declared engine floor — in addition to the existing Node 26 job, and it passes: the floor is enforced, not just documented.
  2. Every one of the nine public packages carries a changeset recording a real semver version bump; `pnpm changeset version` leaves no package at the placeholder `0.0.0` workspace-only version.
  3. `scripts/check-package-install.mjs` (merge gate 14 / ADR-QD-033) passes for all nine packages as part of release sign-off.
**Plans**: TBD

### Phase 2: Publish to npm
**Goal**: Developers outside this repository can depend on Qadi in a real project.
**Depends on**: Phase 1
**Requirements**: REL-01, REL-02
**Success Criteria** (what must be TRUE):
  1. `pnpm add @qadi/core` (and each companion package a project needs) installs successfully from the public npm registry, with no `workspace:*` protocol residue in the installed manifest.
  2. A project created outside this monorepo can import from the published `@qadi/core`, author a policy, and evaluate it successfully — the published `exports` map works for a real external consumer, not only inside the repo's own install-gate sandbox.
  3. `README.md`'s package table and the npm registry agree on which packages are published and at what version.
**Plans**: TBD

### Phase 3: Devtools CLI
**Goal**: A team running Qadi with no browser-facing surface can still see what Qadi decided.
**Depends on**: Phase 1
**Requirements**: CLI-01, CLI-02, CLI-03
**Success Criteria** (what must be TRUE):
  1. A developer operating a backend-only service, a serverless function, or a replicated server can run the devtools CLI against their app's `/__decisions` endpoint and see the merged decision timeline rendered in their terminal.
  2. The CLI's rendering of a decision (verdict, policy tag, subject, trace summary) agrees with what the same decision shows in the `@qadi/devtools` React dock, because both read the same headless model (ADR-QD-047).
  3. The packed `@qadi/devtools` artifact's CLI entry point passes the packed-artifact install gate (ADR-QD-033) — the same install-integrity guarantee every other public entry point already has.
**Plans**: TBD

### Phase 4: Website Launch
**Goal**: A developer researching authorization libraries can actually find and reach Qadi.
**Depends on**: Phase 2
**Requirements**: SITE-01, SITE-02
**Success Criteria** (what must be TRUE):
  1. `qadi.dev` resolves to the built `apps/website` site, deployed automatically on merge to `main` — no manual deploy step required.
  2. The deployed site's package-version and publish-status claims match the real npm registry state established in Phase 2 — no page claims "unpublished" for a package that now ships, or vice versa.
  3. The deployed site is reachable over HTTPS and passes the accessibility target it already commits to (WCAG 2.1 AA, per `apps/website/PRODUCT.md`) in the live environment, not just locally.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4. Phase 3 depends only on Phase 1 and may run before or in parallel with Phase 2 if desired; Phase 4 needs Phase 2's published registry state to avoid the site making stale claims.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Release Readiness & Runtime Verification | 0/TBD | Not started | - |
| 2. Publish to npm | 0/TBD | Not started | - |
| 3. Devtools CLI | 0/TBD | Not started | - |
| 4. Website Launch | 0/TBD | Not started | - |
