# Phase 1: Release Readiness & Runtime Verification - Pattern Map

**Mapped:** 2026-08-30
**Files analyzed:** 7 (2 new changesets + 5 config/doc edits)
**Analogs found:** 7 / 7

This phase is entirely config-edit and prose-authoring work — there is no
application source code being created. "Role/data-flow" classification is
adapted accordingly: role describes the artifact type, data flow describes
how it's consumed (CI-consumed, tool-consumed, human-consumed).

## File Classification

| New/Modified File | Role | "Data Flow" | Closest Analog | Match Quality |
|---|---|---|---|---|
| `.changeset/<new>-signature-retirement.md` | changeset (prose) | tool-consumed (changeset CLI parses frontmatter + body) | `.changeset/brave-guards-decide.md` | exact — single-package, breaking-under-minor precedent |
| `.changeset/<new>-audit-invariants.md` | changeset (prose) | tool-consumed | `.changeset/bright-roles-explain.md` | exact — substantial multi-paragraph prose, non-breaking |
| `.changeset/config.json` | config (JSON) | tool-consumed (`@changesets/cli`) | itself (edit in place) | exact — only the `fixed` field changes |
| `.github/workflows/check.yml` | CI workflow (YAML) | CI-consumed (GitHub Actions) | itself (edit in place) | exact — matrix expansion + comment update only |
| `package.json` (root) | config (JSON) | tool-consumed / human-read | itself (edit in place) | exact — single `"version"` field edit |
| `.planning/codebase/CONCERNS.md` §"Engine Version Floor Unverified" | doc (Markdown) | human-consumed | itself (edit in place) | exact — status update in an existing entry |
| `packages/*/CHANGELOG.md` (9 files) | generated doc → hand-polished | human-consumed | existing `packages/*/CHANGELOG.md` (pre-phase content) | exact — tool writes it, phase polishes prose to match repo's AGENTS.md "doc-comment shape" bar |

No files require a brand-new pattern; every target file already exists or has multiple close siblings in `.changeset/`.

## Pattern Assignments

### `.changeset/<new>-signature-retirement.md` (changeset, Breaking, minor)

**Analog:** `.changeset/brave-guards-decide.md` (full file reproduced below — it is the precedent for two things D-02/D-03 require: a **breaking** change kept at **minor** pre-1.0, and the inline **"Breaking**: ..."** callout style)

**Frontmatter pattern** (lines 1-3):
```markdown
---
"@qadi/core": minor
---
```
Adapt to single-package targeting `@qadi/audit`:
```markdown
---
"@qadi/audit": minor
---
```

**Inline breaking-callout pattern** (lines 12-13, 21-22, 30-31 — repeats per distinct breaking change within one changeset):
```markdown
**Breaking**: a `resource` passed in `options` is now overridden by the
positional one. Two channels for one value is what caused this.
```
```markdown
**Breaking**: `DecisionCacheKey.subjectId` is now `DecisionCacheKey.subject`.
```
This changeset has exactly one breaking change (ElectronicSignature → core's `Signature`), so use the single-callout shape, e.g.:
```markdown
**Breaking**: `SignatureCapturePort.capture`/`validate` now return/accept
`@qadi/core`'s `Signature` type directly; `ElectronicSignature` is retired
with no compatibility alias.
```

**Prose structure pattern** (whole file): opens with a one-line framing sentence, then a bolded lead phrase per distinct change ("**`guard` now evaluates...**"), a paragraph of consumer-facing impact, then the `**Breaking**:` line, then closes with a `See ADR-QD-...` citation line. D-04 requires fresh prose (not copied from the f86f028 commit message) but this structural shape — bold lead, impact paragraph, Breaking line, ADR citation — is the one to reuse. Citation line to adapt: `See ADR-QD-057.` (per RESEARCH.md's Code Examples section, this changeset should also note `SIGNATURE_MEANINGS`/`SignatureMeaning` re-exports are unaffected, and the new optional `signerRole` field).

---

### `.changeset/<new>-audit-invariants.md` (changeset, non-breaking, minor)

**Analog:** `.changeset/bright-roles-explain.md` (full file reproduced above)

**Frontmatter pattern** (lines 1-4, multi-package shape — trim to single package):
```markdown
---
"@qadi/audit": minor
---
```

**Prose structure pattern** (whole file): opens with a scene-setting sentence ("Six questions the library could pose and could not answer."), then one bolded-lead paragraph per improvement, closing with a `See BEH-QD-..., INV-QD-...` citation line — no `**Breaking**:` callout anywhere, matching D-01/RESEARCH's instruction that this second changeset (f0c48fd — invariants/behaviors/mutation gate, no `packages/audit/src/` diff) must NOT carry a Breaking marker. Closing citation to adapt: `See INV-QD-051–055, BEH-QD-249–257.` Cover: formal invariants + behaviors doc now exist for the audit pipeline, and a mutation-testing gate (`stryker.audit.mjs`) now runs as part of `pnpm check`.

---

### `.changeset/config.json` (config)

**Analog:** current file itself (read in full above) — only the `fixed` field changes from `[]` to a single nested group.

**Current state** (all 12 lines):
```json
{
  "$schema": "https://unpkg.com/@changesets/config@4.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**Target `fixed` field** (per RESEARCH.md Pattern 2 — nested array, one group of 9 names, do not flatten):
```json
"fixed": [
  [
    "@qadi/core",
    "@qadi/testing",
    "@qadi/promise",
    "@qadi/react",
    "@qadi/http",
    "@qadi/devtools",
    "@qadi/audit",
    "@qadi/predicate-sql",
    "@qadi/predicate-prisma"
  ]
]
```
Leave `"access": "public"` untouched (already correct per RESEARCH.md — do not "fix" it back to `"restricted"`).

---

### `.github/workflows/check.yml` (CI workflow)

**Analog:** current file itself (full file reproduced above, 79 lines) — matrix expansion is additive, everything else stays.

**Current single-version pattern** (lines 28-53):
```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          # The latest stable major, and the one development actually happens on.
          # Pinned to the major rather than floating on `latest`: a gate whose
          # toolchain changes underneath it reports failures that are not about
          # the change under test.
          #
          # `engines` declares `>=20.19.0`, which CI does not exercise — that
          # floor is derived from what the dependencies require (`vitest` accepts
          # `^20 || ^22 || >=24` and excludes 23; `oxlint` needs `^20.19`), not
          # measured. It is a declaration, and this workflow does not turn it into
          # a verified claim.
          node-version: "26"
          cache: pnpm
```

**Target matrix pattern** (D-05, D-08 — insert `strategy`, parameterize `node-version`, rewrite the now-stale comment):
```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        node-version: ["20.19.0", "26"]

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          # Two legs: the declared floor (20.19.0 — this is where `oxlint`'s
          # `^20.19.0` requirement bites) and the latest stable major, the one
          # development actually happens on. Both are pinned exactly rather than
          # floating on `latest`: a gate whose toolchain changes underneath it
          # reports failures that are not about the change under test.
          #
          # `engines` declares `>=20.19.0` — this matrix leg is what turns that
          # declaration into a verified claim.
          node-version: ${{ matrix.node-version }}
          cache: pnpm
```
Everything below (`Install`, `Merge gate`, `Upload mutation report`) is unchanged — still one `pnpm check` invocation per matrix leg, preserving AGENTS.md §15.

**Mutation-report step is unaffected** (lines 70-78) — leave verbatim; `continue-on-error: true` there is diagnostics-only and orthogonal to the matrix.

---

### `package.json` (root) — manual version bump

**Analog:** current file itself (full file reproduced above).

**Current line** (line 3):
```json
"version": "0.0.0",
```

**Target** (D-12 — manual edit, not produced by `changeset version` since this package is `"private": true`):
```json
"version": "0.3.0",
```
No other field in this file changes for this phase.

---

### `.planning/codebase/CONCERNS.md` — close the entry (D-08)

**Analog:** the entry itself, current text (lines 232-244 reproduced above).

**Pattern to follow:** other closed/resolved concerns in this file (if any use a "Resolved" or strikethrough convention) — inspect sibling entries before writing; at minimum, update:
- "Issue" line to state CI now tests both `20.19.0` and `26` via matrix.
- "Current mitigation" line — replace "acknowledged as aspirational" with a statement that the floor is now CI-verified and blocking.
- "Recommendations" line — either remove (since actioned) or replace with a forward-looking note (e.g., individual `packages/*/package.json` `engines` fields still declare the looser `>=20`, flagged as Open Question 1 in RESEARCH.md, deliberately left out of this phase's scope).

---

### `packages/*/CHANGELOG.md` (9 files, tool-generated then polished)

**Analog:** each package's current `CHANGELOG.md` (pre-existing, e.g. `packages/audit/CHANGELOG.md` at version `0.1.0` per `packages/audit/package.json`) — the polish pass should match the prose register already established in `.changeset/*.md` source files (substantial, "why not just what"), not merely the terse auto-generated "### Minor Changes" bullet dump `pnpm changeset version` produces by default.

**No excerpt needed here** — this is a post-tool-run editorial pass (D-13), not a pattern to copy code from. Read each package's generated diff after running `pnpm changeset version` and tighten wording; do not rewrite content, only polish.

## Shared Patterns

### Changeset prose register
**Source:** `.changeset/brave-guards-decide.md`, `.changeset/bright-roles-explain.md`
**Apply to:** both new `@qadi/audit` changesets
- Bold lead phrase naming the change, one paragraph of consumer-facing impact, `**Breaking**:` inline callout only where an actual break exists, closing `See ADR-QD-.../INV-QD-.../BEH-QD-...` citation line.
- Minor bump even for breaking changes, consistently, pre-1.0 (D-02) — this is the established repo-wide convention, not a one-off.

### CI single-gate invariant (AGENTS.md §15)
**Source:** `.github/workflows/check.yml` header comment (lines 1-11)
**Apply to:** the `check.yml` edit — the matrix expansion must not add any step beyond the existing `Install` → `Merge gate` (`pnpm check`) → `Upload mutation report` sequence. Both matrix legs run byte-identical steps.

### Nested-array config shape for `fixed`/`linked` groups
**Source:** `.changeset/config.json` schema (`$schema` field) and RESEARCH.md Pattern 2
**Apply to:** the `fixed` field edit — array-of-arrays, not a flat array of package names.

## No Analog Found

None — every target file is either an edit to an existing file or a new file with 2+ directly comparable siblings already in the repo (`.changeset/*.md`, of which 24 exist).

## Metadata

**Analog search scope:** `.changeset/`, `.github/workflows/`, root `package.json`, `.planning/codebase/CONCERNS.md`, `packages/*/package.json` and `packages/*/CHANGELOG.md`
**Files scanned:** `.github/workflows/check.yml`, `.changeset/config.json`, `.changeset/brave-guards-decide.md`, `.changeset/bright-roles-explain.md`, root `package.json`, `.planning/codebase/CONCERNS.md`, `packages/audit/package.json`
**Pattern extraction date:** 2026-08-30
