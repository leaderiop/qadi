# Phase 1: Release Readiness & Runtime Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-30
**Phase:** 1-Release Readiness & Runtime Verification
**Areas discussed:** Changeset gap for @qadi/audit, Node 20.19 CI job design & failure handling, Version-bump timing strategy

---

## Changeset gap for @qadi/audit

Grounding: git history showed two real unreleased changes to `packages/audit` (f86f028, f0c48fd) with zero changesets, while 8 of 9 public packages already had pending changesets covering their unreleased work.

| Question | Option | Selected |
|----------|--------|----------|
| Bump type | Minor | ✓ |
| Bump type | Patch | |
| One or two changesets | One changeset (bundle both commits) | |
| One or two changesets | Two changesets (keep unrelated) | ✓ |
| Mark Breaking inline | Yes, mark it Breaking inline | ✓ |
| Mark Breaking inline | No, describe naturally | |
| Prose source | Adapt from commit message | |
| Prose source | Write fresh | ✓ |

**User's choice:** Minor bump, two separate changesets, explicit inline "Breaking" callout for the ElectronicSignature retirement, fresh prose (not adapted from the commit message).
**Notes:** Grounded in repo precedent — `.changeset/brave-guards-decide.md` already establishes minor-bump-for-breaking-change and inline-Breaking-callout as this repo's convention.

---

## Node 20.19 CI job design & failure handling

Grounding: `.github/workflows/check.yml` currently runs only Node 26, with an inline comment explicitly acknowledging the declared `>=20.19.0` floor "is not exercised."

| Question | Option | Selected |
|----------|--------|----------|
| Job shape | Matrix expansion | ✓ |
| Job shape | Separate new job | |
| Blocking | Required/blocking from day one | ✓ |
| Blocking | Informational first, then promote | |
| On failure | Fix it in this phase | ✓ |
| On failure | Lower the declared floor instead | |
| On failure | Flag and defer | |
| Docs | Update check.yml comment + CONCERNS.md | ✓ |
| Docs | Leave as-is | |

**User's choice:** Matrix expansion (preserves the "CI runs `pnpm check` and nothing else" invariant), required/blocking immediately, fix any real incompatibility within this phase, update both the stale comment and CONCERNS.md entry once verified.
**Notes:** User's own framing echoed CONCERNS.md's own language: "a declared floor with no verification is worse than no declaration."

---

## Version-bump timing strategy

Grounding: REL-03's literal "no package at placeholder 0.0.0" clause is already satisfied (packages are at 0.1.0/0.2.0, not 0.0.0) — the real open question was whether to also run the version cut now vs. defer to Phase 2.

| Question | Option | Selected |
|----------|--------|----------|
| Timing | Run it now in Phase 1 | ✓ |
| Timing | Defer to Phase 2 | |
| Root version scope | Only the 9 public packages | |
| Root version scope | Also bump the root | ✓ (via follow-up) |
| CHANGELOG review | Review and polish before commit | ✓ |
| CHANGELOG review | Commit as generated | |

**User's choice (initial):** Run `pnpm changeset version` now; review/polish CHANGELOGs before commit.

**User's freeform follow-up (not a preset option):** "all the packages should have the same version as root" — this was a significant enough shift from the preset options that Claude reflected it back as plain text before locking it in, per discuss-phase's "Other" freeform handling rule.

**Clarifying exchange:**
- Claude asked: (1) is the shared-version scheme permanent (via changesets' `fixed` group) or a one-time reset? (2) what should the shared version be — next pre-1.0 number, or cut to 1.0.0?
- User: "1- permanently, 2- we should use the semver rules as is it, but for now we still beta version"
- Claude proposed the resulting math (0.2.0 floor + minor severity = 0.3.0 for all 9 packages) and asked whether the root `package.json` (private, unpublished) should also move to match.
- User: "use 0.3.0 as root for now"

**Final decision:** Permanent `fixed` group in `.changeset/config.json` across all 9 public packages; compute via normal semver (→ 0.3.0); root `package.json` also set to 0.3.0.

---

## Claude's Discretion

- Exact wording/structure of the two new `@qadi/audit` changeset files, within the locked constraints (two files, minor, one marked Breaking, fresh prose).
- Which specific CHANGELOG.md sections need polish vs. are acceptable as generated.

## Deferred Ideas

None — discussion stayed within phase scope.
