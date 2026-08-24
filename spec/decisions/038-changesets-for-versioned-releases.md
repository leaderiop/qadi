# ADR-QD-038 — Changesets track versioned releases; publishing itself still doesn't run anywhere

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-038                                   |
> | Revision       | 1.0                                             |
> | Effective Date | 2026-08-22                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-08-22): Initial release (CCR-QD-049) |

---

## Context

`spec/roadmap.md`'s "Current state" has read "Version `0.0.0`, unpublished"
since the specification's first revision, and every package under
`packages/*` still carries that same placeholder version. `pnpm publish`
already works — [ADR-QD-033](./033-the-packed-artifact-is-the-product.md)
built and gated the mechanics a publish would use — but nothing in this
repository has ever decided *when* a version number changes, *what* a
consumer reads to find out what changed, or *how* six packages that
depend on each other (`@qadi/http`, `@qadi/promise`, `@qadi/react` and
`@qadi/testing` all declare `"@qadi/core": "workspace:*"`) get bumped
together without a human tracking that by hand.

This ADR is scoped to exactly that gap — recording changes as they land
and turning them into version bumps and changelogs — and deliberately
**not** to publishing itself. Reopening "should this ship" is a bigger
question than "how would a release be tracked if we did," and conflating
the two would make a tooling decision carry a business decision it
doesn't need to.

## Decision

**`@changesets/cli` records what changed and computes version bumps;
nothing wires it into CI or `pnpm check`.**

`.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@4.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

Every value here is the tool's own documented default, not a bespoke
choice — deviating from the default would be a decision this ADR would
then owe a reason for, and none of the defaults conflict with anything
this workspace already does. `access: "restricted"` in particular is the
conservative default and says nothing about whether a package ends up on
a public registry; that stays a separate, later decision.
`@qadi/features` needs no entry in `ignore` — changesets already skips
any package whose own `package.json` declares `"private": true`, which
`features/package.json` already does.

Three scripts, matching `changeset`'s own command names rather than
inventing new ones:

| Script | Command | Does |
| ------ | ------- | ---- |
| `pnpm changeset` | `changeset` | Interactively records what changed in this PR/commit as a markdown file under `.changeset/` |
| `pnpm changeset-version` | `changeset version` | Consumes pending changesets, bumps `package.json` versions (respecting `workspace:*`/`updateInternalDependencies`), writes `CHANGELOG.md` entries |
| `pnpm changeset-publish` | `changeset publish` | Publishes bumped packages and tags the release |

**None of the three is in `pnpm check`, `.github/workflows/check.yml`, or
any other automated path.** `pnpm changeset-publish` would push packages
to a registry — the single most consequential command in this
repository's entire tooling surface, more so than anything `pnpm check`'s
eleven existing gates run — and wiring it into CI is a distinct decision
this ADR does not make. Running `changeset status` confirms the
configuration parses and correctly reads all five public packages plus
the private `@qadi/features`; no changeset has been written for this
session's own changes, and none was invented just to exercise the
mechanism further.

## Alternatives considered

**`lerna` / `nx release`.** Both are whole-monorepo orchestration tools
that changesets does one piece of rather than all of. This workspace
already has `pnpm` for installs and workspace linking, `vitest`
`--filter` for scoped test runs, and `tsc -b` for the build graph —
adopting a broader tool to get its release-versioning slice would mean
carrying capability this repository doesn't use for capability it does.

**Hand-written `CHANGELOG.md` entries, bumped by hand at release time.**
The predecessor's own failure mode in a different guise: "someone
remembers to update it" is exactly the kind of connection
[Definitions of Done](../process/definitions-of-done.md) already
identifies as the thing that rots (`spec/overview.md` drifted from the
exports twice for precisely this reason — CCR-QD-025, CCR-QD-034 —
before `scripts/check-api-surface.mjs` closed it). A changeset is written next to the change that
motivated it, in the same PR, or `changeset status` says so.

**Deciding publishing scope now, as part of this same change.** Declined
per direct instruction: the scope question was asked and answered
narrowly — versioned-release *tracking* is in scope, an actual publish is
not reopened by this ADR.

## Consequences

**Positive**:

- A version bump and its changelog entry are now derived from recorded
  changes rather than reconstructed from git history at release time.
- Cross-package version bumps for the four packages depending on
  `@qadi/core` are computed by the tool
  (`updateInternalDependencies: "patch"`), not tracked by a person.
- Adopting this now, before any package's version has ever moved off
  `0.0.0`/its current placeholder, means there is no backlog of
  undocumented prior changes to reconcile — the same "gate from day one,
  not a cleanup project" position [ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md)
  takes for `madge`.

**Negative**:

- A second scope decision — whether and how to actually publish — is
  still open, and this ADR does not resolve it. `pnpm changeset-publish`
  exists and works but has never been run.
- `@changesets/cli` is a new devDependency with its own release cadence
  to track, on top of `oxlint`/`oxfmt`/`stryker`/`madge`/`tstyche`.

---

_Related: [ADR-QD-033](./033-the-packed-artifact-is-the-product.md) · [ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md) · [Definitions of Done](../process/definitions-of-done.md)_
