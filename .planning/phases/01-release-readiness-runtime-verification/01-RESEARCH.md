# Phase 1: Release Readiness & Runtime Verification - Research

**Researched:** 2026-08-30
**Domain:** Release engineering — CI runtime-floor verification (GitHub Actions matrix) + monorepo version management (`@changesets/cli` fixed-group versioning)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Changeset gap for @qadi/audit**
- **D-01:** Two real unreleased changes exist in `@qadi/audit` with no changeset: f86f028 (ElectronicSignature retired in favor of core's canonical `Signature`, adds optional `signerRole`) and f0c48fd (formal invariants, behaviors doc, mutation-testing gate). Write two separate changesets, not one.
- **D-02:** Both changesets get a **minor** bump — this repo's established convention for pre-1.0 breaking changes (see `.changeset/brave-guards-decide.md`, which marks a breaking `DecisionCacheKey` rename as minor, not major).
- **D-03:** The ElectronicSignature-retirement changeset must explicitly mark the change **"Breaking"** inline in its prose, matching how other changesets in this repo call out breaking changes under a minor bump.
- **D-04:** Write changeset prose fresh — do not copy/adapt from the f86f028 commit message. Focus narrowly on what an `@qadi/audit` consumer needs to know.

**Node 20.19 CI job design & failure handling**
- **D-05:** Add the Node 20.19.0 floor check as a **matrix expansion** of the existing `check.yml` job (`node-version: [20.19.0, 26]`), not a separate job block — keeps one job definition that still literally runs `pnpm check`, preserving the AGENTS.md §15 invariant ("CI runs `pnpm check` and nothing else").
- **D-06:** The Node 20.19 leg is **required/blocking from day one** — no informational grace period. Rationale (user's own framing, matches CONCERNS.md): "a declared floor with no verification is worse than no declaration."
- **D-07:** If Node 20.19 reveals a real incompatibility (not just "previously untested but fine"), **fix it within this phase** rather than lowering the floor or deferring.
- **D-08:** Once the floor job is green, update the now-stale `check.yml` inline comment (currently explains the floor "is not exercised") and `.planning/codebase/CONCERNS.md`'s "Engine Version Floor Unverified" entry — both become false claims once this ships.

**Version-bump timing & scheme**
- **D-09:** Run `pnpm changeset version` **now, within Phase 1** — not deferred to Phase 2. Phase 2 becomes a pure `pnpm publish` step with no version-decision left to make.
- **D-10:** Set `.changeset/config.json`'s `"fixed"` field to a group containing all 9 public packages (`@qadi/core`, `@qadi/testing`, `@qadi/promise`, `@qadi/react`, `@qadi/http`, `@qadi/devtools`, `@qadi/audit`, `@qadi/predicate-sql`, `@qadi/predicate-prisma`) — **permanently**, not just for this release. Every future `changeset version` run bumps all 9 together to one shared version number. — **Reversibility:** one-way — once packages are published under a shared-version scheme, consumers may come to rely on "install any `@qadi/*` package, they're always at the same version"; unwinding the fixed group later would break that implied parity contract, not just a config file.
- **D-11:** Applying normal semver math to the fixed group (highest current version among the 9 — 0.2.0, held by core/testing/react/promise — as the floor, then the highest-severity pending changeset, which is minor) computes to **0.3.0** for all 9 packages. Do not force a jump to `1.0.0` — the codebase is feature-complete but the user explicitly wants to stay pre-1.0/beta for this release.
- **D-12:** The workspace root `package.json` (currently `0.0.0`, private, never published) also moves to **0.3.0**, for consistency with the 9 public packages, even though it's never independently consumed.
- **D-13:** Review and polish the `pnpm changeset version`-generated `CHANGELOG.md` files before committing — do not commit them as raw auto-generated output. Matches this repo's evident care about prose/doc-comment quality (AGENTS.md's "Doc-comment shape" section).

### Claude's Discretion
- Exact wording/structure of the two new `@qadi/audit` changeset files, within the constraints above (two files, minor, one marked Breaking inline, fresh prose).
- Which specific CHANGELOG.md sections need polish vs. are fine as generated — apply judgment per AGENTS.md's stated bar.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| COMPAT-01 | CI runs the full `pnpm check` gate suite on Node.js 20.19.0 — the declared engine floor — in addition to the existing Node 26 job, and it passes | Pattern 1 (matrix expansion shape, `fail-fast`/`timeout-minutes` semantics), Pitfalls 1–2 (the `@changesets/cli` engine exclusion that will surface as install-time noise, not a `pnpm check` failure) |
| REL-03 | Every public package intended for this release carries a changeset recording a real semver version bump; none remain at the placeholder `0.0.0` workspace-only version | Pattern 2 (`fixed` config's nested-array shape), Code Examples (the two `@qadi/audit` changeset drafts), Pitfalls 3–4 (root `package.json` manual edit, CHANGELOG polish pass) |
| REL-04 | `scripts/check-package-install.mjs` passes for all nine packages as part of release sign-off | Don't Hand-Roll (script already discovers all 9 public packages dynamically, already gates `pnpm check` today — this criterion is non-regression) |
</phase_requirements>

## Summary

This phase has no new libraries to evaluate and no new architecture to design — it is entirely about correctly operating two tools already adopted by ADR-QD-033 (`scripts/check-package-install.mjs`) and ADR-QD-038 (`@changesets/cli`), plus one GitHub Actions config edit. The three success criteria decompose into: (1) a matrix expansion of the single existing `check.yml` job so it runs on both the declared floor (Node 20.19.0) and the current dev version (Node 26), (2) authoring two changesets for `@qadi/audit`'s unrecorded changes and then running `pnpm changeset version` after switching `.changeset/config.json`'s `fixed` field to a single group of all 9 public packages, and (3) confirming `scripts/check-package-install.mjs` (already gate `spec:package` inside `pnpm check`) passes for all 9 packages as part of sign-off — which it already does on every green `pnpm check` run today, so this criterion is really "don't let (1) or (2) break it."

The one substantive risk this research surfaced and that CONTEXT.md does not mention: `@changesets/cli@3.0.1`'s own `package.json` declares `"engines": {"node": "^22.11 || ^24 || >=26"}` — **it does not support Node 20 at all**, including the 20.19.0 floor this phase is adding to CI [VERIFIED: node_modules/@changesets/cli/package.json, local install]. Because no `.npmrc` exists in this repo and pnpm's default is `engine-strict=false` (advisory warnings only) [ASSUMED — pnpm defaults, via WebSearch, not fetched from pnpm docs directly this session], `pnpm install --frozen-lockfile` on the new Node 20.19.0 CI leg will not fail — but it may print an engine-mismatch warning for `@changesets/cli`, and D-09's `pnpm changeset version` run must happen on a Node version that actually satisfies the tool's own floor (i.e., not under a Node-20-pinned shell). Neither of these blocks the phase; both need to be known before writing tasks so a stray warning in CI logs isn't mistaken for a new defect, and so the version-bump step isn't accidentally run under Node 20.19.0.

**Primary recommendation:** Do the matrix expansion and the changeset-group edit as two independent, verifiable git diffs — one line in `check.yml`'s `strategy.matrix`, one line in `.changeset/config.json` — then let the existing tools (`pnpm check`, `pnpm changeset version`) compute everything else. Do not hand-compute or hand-edit the 9 packages' version numbers; run the tool and confirm its output matches the expected 0.3.0, and separately, by hand, bump only the private root `package.json` (changesets skips private packages, so D-12 is a manual edit, not something `changeset version` will do for you).

## Architectural Responsibility Map

This phase touches tooling/process layers, not application tiers — the table below substitutes those for the standard browser/server tiers.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Node runtime floor verification | CI (GitHub Actions job matrix) | — | `check.yml` is the single merge gate; AGENTS.md §15 requires it stay the only definition of "done" |
| Version bump computation | Release tooling (`@changesets/cli` `version` command) | Git-tracked config (`.changeset/config.json`) | Semver math must be tool-computed, not hand-edited, per ADR-QD-038's whole rationale |
| Changeset authoring (prose) | Developer workflow (`.changeset/*.md` files) | — | Consumed by the tool above; human-written, machine-consumed |
| Root `package.json` version | Manual edit (git-tracked config) | — | Private package; `changeset version` explicitly skips packages with `"private": true` — confirmed by reading `fixed`'s own semantics (a fixed group is a subset the config names explicitly; root is not and will not be in it) |
| Packed-artifact install verification | CI (existing `spec:package` step inside `pnpm check`) | — | `scripts/check-package-install.mjs` already runs on every `pnpm check`; this phase's REL-04 criterion is non-regression, not new code |

## Standard Stack

No new dependencies are introduced by this phase. The relevant tools are already adopted; what follows is their **verified current state** in this repository, not a recommendation to add anything.

### Core (already installed — verified, not proposed)
| Tool | Installed Version | Purpose | Node engine it declares |
|------|---------|---------|--------------------------|
| `@changesets/cli` | 3.0.1 [VERIFIED: `node_modules/@changesets/cli/package.json`, local] | Records changes, computes semver bumps, writes CHANGELOG.md | `^22.11 \|\| ^24 \|\| >=26` [VERIFIED: same file] — **excludes Node 20 entirely** |
| `oxlint` | 1.75.0 [VERIFIED: `node_modules/oxlint/package.json`, local] | Lint gate (`pnpm lint`, part of `pnpm check`) | `^20.19.0 \|\| >=22.12.0` [VERIFIED: same file] — this is very likely why the repo's floor is exactly `20.19.0` and not a rounder `20.0.0`, matching `check.yml`'s own inline comment |
| `vitest` | 4.1.10 [VERIFIED: `node_modules/vitest/package.json`, local; also pinned in `pnpm-workspace.yaml` catalog] | Test runner (`pnpm test`, `pnpm coverage`, part of `pnpm check`) | `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0` [VERIFIED: same file] — 20.19.0 satisfies `^20.0.0` |
| `pnpm` | 10.17.1 [VERIFIED: `package.json` `"packageManager"` field, root] | Package manager, workspace linking, `pnpm pack` (used by `check-package-install.mjs`) | `>=18.12` [VERIFIED: `npm view pnpm@10.17.1 engines`] |
| `actions/setup-node@v4` | — (GitHub Action) | Installs the pinned Node version per matrix leg in CI | supports exact patch pins (`"20.19.0"`) inside a `strategy.matrix.node-version` array [ASSUMED — GitHub official docs, via WebSearch this session, not fetched directly] |

### Alternatives Considered
None — this phase does not introduce new tooling. `lerna`/`nx release` were already considered and rejected for the versioning mechanism in ADR-QD-038; reopening that choice is out of this phase's scope per CONTEXT.md.

**Installation:** None required — `@changesets/cli`, `oxlint`, and `vitest` are existing devDependencies of the root `package.json`.

## Package Legitimacy Audit

**Not applicable.** This phase installs no new external packages. All tools referenced above (`@changesets/cli`, `oxlint`, `vitest`, `pnpm`) are pre-existing devDependencies whose legitimacy was established when they were originally adopted (ADR-QD-037, ADR-QD-038). The Package Legitimacy Gate protocol is skipped per its own trigger condition ("whenever this phase installs external packages").

## Architecture Patterns

### System Architecture Diagram

```
                     ┌─────────────────────────────────────────┐
                     │  git push / PR  →  .github/workflows/    │
                     │  check.yml (single job, matrix-expanded) │
                     └───────────────┬───────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ matrix: node-version [20.19.0, 26]     │
                 └───────────────┬───────────┬─────────────┘
                                 │           │
                    ┌────────────▼──┐   ┌────▼───────────┐
                    │ Node 20.19.0  │   │ Node 26         │
                    │ leg (NEW,     │   │ leg (existing)  │
                    │ blocking)     │   │                 │
                    └────────┬──────┘   └────────┬────────┘
                             │                    │
                    each leg: pnpm install --frozen-lockfile
                             │                    │
                    each leg: pnpm check ──────────┤
                       (typecheck, lint, circular, │
                        tstyche, coverage, bdd,    │
                        spec:examples/verify/      │
                        gates/claims/api/package,  │
                        example, mutation,         │
                        website checks)            │
                             │                    │
                             └────────┬───────────┘
                                      │  spec:package step (gate 14)
                                      │  = scripts/check-package-install.mjs
                                      │  (REL-04's success criterion)
                                      ▼
                          both legs green → merge gate passes


        Separate, manual, NOT wired into CI (ADR-QD-038, unchanged by this phase):
        ┌──────────────────────────────────────────────────────────────────┐
        │ developer writes .changeset/*.md files (2 new, for @qadi/audit)  │
        │        ↓                                                          │
        │ edit .changeset/config.json: "fixed": [[ 9 package names ]]      │
        │        ↓                                                          │
        │ pnpm changeset version   (run on Node ≥22.11 — NOT the 20.19     │
        │        ↓                  floor leg; @changesets/cli excludes    │
        │        ↓                  Node 20 in its own engines field)      │
        │ 9 packages bumped to 0.3.0, CHANGELOG.md written per package,    │
        │ consumed .changeset/*.md files deleted                           │
        │        ↓                                                          │
        │ MANUAL: root package.json version → 0.3.0 (changesets skips      │
        │         private packages; this file is never touched by it)      │
        │        ↓                                                          │
        │ human polish pass over generated CHANGELOG.md files (D-13)       │
        └──────────────────────────────────────────────────────────────────┘
```

### Pattern 1: Matrix expansion that still runs "one job"
**What:** Add `strategy.matrix.node-version: [20.19.0, 26]` to the existing single `check` job in `check.yml`, and change the hardcoded `node-version: "26"` in the `actions/setup-node@v4` step to `node-version: ${{ matrix.node-version }}`. No new `jobs:` block.
**When to use:** Exactly this case — AGENTS.md §15 requires CI to run `pnpm check` and nothing else; a matrix is the only expansion mechanism that keeps it one job definition (D-05).
**Example:**
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
          node-version: ${{ matrix.node-version }}
          cache: pnpm
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Merge gate
        run: pnpm check
```
`fail-fast: false` is worth an explicit decision in planning — with it, both legs run to completion even if one fails, giving a complete picture in one CI run; without it (the GitHub Actions default is `true`), a Node 20.19.0 failure could cancel the Node 26 leg mid-run. Given D-06 ("no informational grace period" — the floor leg is a real blocking gate, not a nice-to-have) both legs failing independently and both being visible is more useful than a truncated run — [ASSUMED: GitHub Actions default `fail-fast` behavior, training knowledge, not verified against docs this session].
**Timeout note:** `timeout-minutes: 30` under `strategy.matrix` applies **per matrix job instance**, not shared across the matrix [ASSUMED — GitHub Actions documented matrix semantics, training knowledge] — so expanding to 2 legs does not halve the effective budget per leg; each leg independently gets 30 minutes.

### Pattern 2: `fixed` group — the config shape is a nested array, not a flat list
**What:** `.changeset/config.json`'s `fixed` field takes an array of groups, where each group is itself an array of package names: `"fixed": [["pkg-a", "pkg-b"]]` [CITED: official changesets docs, `docs/config-file-options.md` and `docs/fixed-packages.md`, fetched via Context7 this session]. "When one package in the group receives a version bump, all other packages in that group are updated to the same version, even if they have no changes" [CITED: same source].
**When to use:** D-10's "one group containing all 9 public packages" — the naive shape (`"fixed": ["@qadi/core", "@qadi/testing", ...]`, a flat array of 9 strings) is a schema-shape mistake that the JSON Schema referenced at the top of `config.json` (`$schema`) would likely flag, but is easy to get wrong when reading D-10's prose literally as "a group."
**Example:**
```json
{
  "$schema": "https://unpkg.com/@changesets/config@4.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
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
  ],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```
Note the current `config.json` already has `"access": "public"` [VERIFIED: `.changeset/config.json`, read this session] — not `"restricted"`, the value ADR-QD-038 originally documented as the tool's default. Someone already changed this in a prior, undocumented edit; it is out of this phase's scope (publishing is Phase 2) but the planner should not "fix" it back to match the stale ADR text, since `access: public` is what a real npm-scope publish in Phase 2 will need anyway.

### Recommended Project Structure
No new files or directories. This phase edits exactly:
```
.github/workflows/check.yml       # matrix expansion (D-05), stale comment update (D-08)
.changeset/config.json            # fixed field (D-10)
.changeset/<two-new-files>.md     # @qadi/audit changesets (D-01)
packages/*/package.json           # version bump — written by `pnpm changeset version`, not hand-edited
packages/*/CHANGELOG.md           # written by `pnpm changeset version`, then hand-polished (D-13)
package.json                      # root version bump to 0.3.0 — MANUAL (D-12)
.planning/codebase/CONCERNS.md    # "Engine Version Floor Unverified" entry updated to reflect closure (D-08)
```

### Anti-Patterns to Avoid
- **Hand-computing the 9 packages' new version number and writing it directly into each `package.json`:** defeats the entire point of ADR-QD-038 (versions derived from recorded changesets, not reconstructed by a person) and risks a typo diverging one package from the fixed group. Run `pnpm changeset version` and diff the result.
- **Adding a `continue-on-error: true` or informational-only mode to the new Node 20.19.0 matrix leg:** explicitly rejected by D-06 — the floor leg must be blocking from day one.
- **Wiring `pnpm changeset version` or `pnpm changeset-publish` into `check.yml`:** ADR-QD-038 explicitly keeps all three changeset scripts out of any automated path; this phase runs `version` manually, once, and does not change that architecture.
- **Running the version-bump step in a Node-20-pinned shell/CI context:** `@changesets/cli`'s own `engines.node` excludes Node 20 outright — the safe, correct place to run `pnpm changeset version` is the developer's normal environment or the Node 26 CI leg, never the new floor leg.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Computing the shared 0.3.0 version across 9 packages | A script or manual edit that sets each `package.json`'s `"version"` field | `pnpm changeset version` after the `fixed` group is configured | The tool already does exactly this; ADR-QD-038 exists specifically so no person has to track cross-package version math by hand |
| Verifying the packed-artifact install still works | A new/duplicate script | `scripts/check-package-install.mjs` (already `pnpm run spec:package`, part of `pnpm check`) | It already discovers all 9 public packages dynamically by scanning `packages/*` for `private !== true` [VERIFIED: `scripts/check-package-install.mjs` lines 68–77, quoted below] — REL-04 needs zero new code |
| CHANGELOG generation | Hand-written changelog entries | `@changesets/cli`'s built-in changelog generator (`"changelog": "@changesets/cli/changelog"` already configured) | Already configured; D-13 only asks for a *polish pass* over the generated output, not authoring it from scratch |

**Verbatim quote for the `[VERIFIED]` tag above** (`scripts/check-package-install.mjs`, lines 68–77):
```js
const packagesDir = join(ROOT, "packages");
const publicPackages = [];

for (const entry of readdirSync(packagesDir).sort()) {
  const manifestPath = join(packagesDir, entry, "package.json");
  if (!existsSync(manifestPath)) continue;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.private === true) continue;
  publicPackages.push({ dir: join(packagesDir, entry), manifest });
}
```
Confirmed against the actual `packages/*` directory listing this session: `audit`, `core`, `devtools`, `http`, `predicate-prisma`, `predicate-sql`, `promise`, `react`, `testing` — none carry `"private": true` [VERIFIED: `node -e` dump of all 9 `packages/*/package.json`, this session] — exactly the 9 named in D-10 and REL-04.

**Key insight:** every piece of tooling this phase needs already exists and is already wired into `pnpm check` except the two config edits (matrix, `fixed` field) and the two new changeset files. The work is narrow by construction.

## Common Pitfalls

### Pitfall 1: `@changesets/cli` cannot run on the floor this phase verifies
**What goes wrong:** A planner or executor assumes "verify the Node 20.19.0 floor" implies every command in the release process, including `pnpm changeset version`, should be exercised on that floor. `@changesets/cli@3.0.1` declares `"engines": {"node": "^22.11 || ^24 || >=26"}` [VERIFIED: `node_modules/@changesets/cli/package.json`] — it explicitly does not support any Node 20.x release.
**Why it happens:** The phase goal ("every public package is verified against its declared runtime floor") sounds like it should apply transitively to every tool touched during the phase, but the *declared floor* (`>=20.19.0`, in root `package.json`, `engines`) is a claim about what a **consumer of the published packages** needs, not about what the maintainer's own release tooling needs to run.
**How to avoid:** Scope the Node 20.19.0 CI leg to `pnpm check` only (as D-05 already specifies) and run `pnpm changeset version` in the normal developer/CI environment (Node 26 or whatever is locally installed) — never inside a step pinned to 20.19.0.
**Warning signs:** An `ERR_PNPM_UNSUPPORTED_ENGINE`-style message, or an engine-mismatch warning naming `@changesets/cli`, in a CI log or terminal running under Node 20.

### Pitfall 2: The engine-mismatch warning is expected noise, not a new defect
**What goes wrong:** After adding the Node 20.19.0 leg, `pnpm install --frozen-lockfile` may emit an advisory warning about `@changesets/cli`'s (and possibly other devDependencies') engine mismatch. Since no `.npmrc` sets `engine-strict=true` [VERIFIED: no `.npmrc` file exists in the repo — `ls -la .npmrc` and `git ls-files | grep npmrc` both return nothing, this session], this is a **warning**, not an install failure — pnpm's default is advisory-only for the `engines` field [ASSUMED: pnpm default behavior per community sources found via WebSearch this session; not fetched from pnpm's own docs directly].
**Why it happens:** `engines` fields across the dependency tree are checked at install time by npm-ecosystem tools by convention, but strict enforcement is opt-in.
**How to avoid:** Don't treat a `@changesets/cli` engine warning in the 20.19.0 leg's install step as a gate failure requiring investigation under D-07 — it's expected and does not affect `pnpm check`'s actual steps (changeset commands are not part of `pnpm check`, confirmed by reading `package.json`'s `"check"` script — it does not call `changeset`, `changeset-version`, or `changeset-publish`).
**Warning signs:** Confusing a benign warning line in CI output for a genuine D-07 "real incompatibility" requiring a fix within the phase.

### Pitfall 3: `changeset version` will not touch the private root `package.json`
**What goes wrong:** After running `pnpm changeset version`, D-12 ("root `package.json` also moves to 0.3.0") is assumed to be already satisfied, because the 9 public packages correctly landed at 0.3.0.
**Why it happens:** The `fixed` config only lists the 9 public package names; the root `package.json` is `"private": true` [VERIFIED: root `package.json`, read this session] and is not, and should not be, added to the `fixed` group (it is never published, never resolved by a consumer, and changesets' own private-package skip already excludes it from every changeset-aware operation per ADR-QD-038's own text about `@qadi/features`).
**How to avoid:** Treat the root `package.json` version bump as a separate, manual, one-line edit after `pnpm changeset version` completes — verify it explicitly rather than assuming it fell out of the tool run.
**Warning signs:** `git diff package.json` showing no change after `pnpm changeset version` — this is expected, not a tool failure; the manual edit is still required.

### Pitfall 4: Committing raw `changeset version` output without the D-13 polish pass
**What goes wrong:** `pnpm changeset version` writes/updates `CHANGELOG.md` per package by concatenating changeset prose more or less verbatim under auto-generated "Minor Changes"/"Patch Changes" headings. Committing this directly skips D-13's explicit requirement to review and polish before commit.
**Why it happens:** The command's output looks complete and doesn't obviously need editing — it's valid markdown, just not necessarily matching this repo's stated prose bar (AGENTS.md's "Doc-comment shape" section, and the two existing changeset files' substantial, "why not just what" style).
**How to avoid:** Treat `pnpm changeset version`'s CHANGELOG.md writes as a draft, and add an explicit review/polish task (or task step) before the commit that includes them — this is exactly what D-13 already says; the risk is only in an executor skipping it because the tool's output "looks done."
**Warning signs:** A `CHANGELOG.md` diff with headings like "### Minor Changes" immediately followed by an unedited copy-paste of changeset frontmatter body text.

## Code Examples

### The two `@qadi/audit` changesets this phase must add (D-01 through D-04)

Two commits already exist with no changeset (identified from `git log`, both real, both already merged):

**Commit 1 — `f86f028` — `ElectronicSignature` retirement.** Per ADR-QD-057 [VERIFIED: `spec/decisions/057-audit-signature-harmonization.md`, read this session], `SignatureCapturePort.capture`/`validate` now return/accept `@qadi/core`'s `Signature` type directly rather than the package's own `ElectronicSignature` — "retired, fully removed — no compatibility type alias" — and `SignatureCaptureRequest` gains an optional `signerRole` field. This is the changeset D-03 requires be marked **Breaking** inline. `SIGNATURE_MEANINGS`/`SignatureMeaning` move to (and are re-exported from) `@qadi/core`, so existing `import { SIGNATURE_MEANINGS } from "@qadi/audit"` call sites are unaffected [VERIFIED: `packages/audit/src/SignatureCapturePort.ts` lines 49–50, `export { SIGNATURE_MEANINGS } from "@qadi/core";` / `export type { SignatureMeaning } from "@qadi/core";`].

Frontmatter shape, matching the two-package pattern already used in `.changeset/brave-guards-decide.md` and `.changeset/olive-feeds-stream.md` (both single- and multi-package changesets already exist in this repo — this one names only `@qadi/audit` since the type move is a re-export, not a `@qadi/core` API change):
```markdown
---
"@qadi/audit": minor
---

[Fresh prose — do NOT copy from the f86f028 commit message per D-04. Cover:
what a @qadi/audit consumer imports differently now (ElectronicSignature →
Signature from @qadi/core), that SIGNATURE_MEANINGS/SignatureMeaning imports
are unaffected, and the new optional signerRole on SignatureCaptureRequest.
Mark inline: "**Breaking**: ..." per D-03, matching the inline-callout style
in brave-guards-decide.md.]
```

**Commit 2 — `f0c48fd` — formal invariants, behaviors doc, mutation gate.** This commit touches no files under `packages/audit/src/` [VERIFIED: `git show f0c48fd --stat`, this session — the diff lists only `packages/audit/test/*`, `scripts/check-doc-examples.mjs`, and `spec/*` files]. It is not a public API change; the changeset for it documents that the package's correctness guarantees (INV-QD-051 through INV-QD-055, BEH-QD-249–257) are now formally specified and mutation-gated (92.03% score) — worth a minor per this repo's pre-1.0 convention (D-02) even without a code-visible API diff, but it must **not** carry an inline "Breaking" callout (only the first changeset does, per D-03's scope — D-03 names the ElectronicSignature-retirement changeset specifically).
```markdown
---
"@qadi/audit": minor
---

[Fresh prose. This is a documentation/verification hardening change, not an
API change — no inline "Breaking" callout. Cover: formal invariants and a
behaviors doc now exist for the audit pipeline, and a mutation-testing gate
(stryker.audit.mjs) now runs as part of pnpm check.]
```

### CI matrix diff (D-05)
See Pattern 1 above for the full `check.yml` shape.

### `.changeset/config.json` diff (D-10)
See Pattern 2 above for the full, correctly-nested `fixed` array shape.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Node 20.19.0 floor declared but only Node 26 tested in CI | Both versions tested via matrix, floor leg blocking | This phase | Closes the exact gap `.planning/codebase/CONCERNS.md` names |
| Independent per-package versions (`0.1.0`/`0.2.0` split, `@qadi/audit` at `0.1.0` with no changeset) | Single shared `0.3.0` across all 9 public packages via `fixed` group | This phase | Every future `changeset version` run bumps all 9 together — a one-way decision per D-10 |
| `.changeset/config.json` `access: "restricted"` (ADR-QD-038's originally documented default) | Already `"access": "public"` in the live config file | Sometime before this phase — undocumented, discovered this session | Not this phase's decision to make or unmake; noted so the planner doesn't "revert" it |

**Deprecated/outdated:**
- `ElectronicSignature` in `@qadi/audit`: fully retired per ADR-QD-057, no compatibility alias — this phase's job is to *document* that retirement via changeset, not to re-litigate or soften it.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pnpm's default `engine-strict` is `false` (advisory-only engine warnings), given no `.npmrc` override exists in this repo | Summary, Pitfall 2 | If actually `true` by some other mechanism (e.g. a global pnpm config on the CI runner), the Node 20.19.0 leg's `pnpm install --frozen-lockfile` step could hard-fail on `@changesets/cli`'s engine mismatch — this would need a task to address (e.g., `pnpm install --frozen-lockfile --config.engine-strict=false` or moving `@changesets/cli` out of the frozen install path), not just a documented warning |
| A2 | `actions/setup-node@v4` correctly resolves and installs the exact patch `"20.19.0"` when given as a matrix value | Standard Stack, Pattern 1 | If it instead floats to the latest 20.x, the CI leg would silently test a newer patch than the declared floor — first CI run would need visual confirmation of the resolved version in the setup-node log step |
| A3 | GitHub Actions applies `timeout-minutes` per matrix job instance, not shared across the whole matrix | Pattern 1 | If shared, expanding to 2 legs could starve one leg of time on a 30-minute budget, especially given the mutation-testing gate (`stryker`) already in `pnpm check` — would need to raise `timeout-minutes` |
| A4 | GitHub Actions' default `fail-fast` is `true`, so an explicit `fail-fast: false` is needed to see both legs' results independently | Pattern 1 | If default is already `false`, the explicit setting is merely redundant, not wrong — low risk either way |

## Open Questions

1. **Should `packages/*/package.json`'s individual `"engines": {"node": ">=20"}` fields be tightened to `">=20.19.0"` to match the root's floor?**
   - What we know: root `package.json` declares `>=20.19.0` [VERIFIED, read this session]; all 9 individual packages under `packages/*` declare the looser `>=20` [VERIFIED: `node -e` dump of all 9 `packages/*/package.json`, this session].
   - What's unclear: whether this is an intentional distinction (dev-tooling floor vs. consumer-runtime floor — the individual packages' `engines` field is what ships in the published tarball and is checked against a consumer's Node version, which may not need `oxlint`/`vitest`'s stricter floor) or drift that should be closed in this phase.
   - Recommendation: CONTEXT.md's decisions (D-05 through D-08) only mention the root/CI floor, not the individual package manifests — treat this as out of this phase's locked scope, but flag it to the user/planner as worth a one-line decision (leave as-is vs. align) before REL-04's sign-off, since a published `@qadi/core@0.3.0` tarball technically still claims `>=20` (untested), not `>=20.19.0` (tested).

2. **Has anyone measured current `pnpm check` wall-clock time, to confirm the 30-minute-per-leg budget (see A3) has headroom?**
   - What we know: `pnpm check` runs 20 sequential steps including full coverage, BDD, tstyche, 5 separate mutation-testing runs (`stryker.mjs` + 4 project-specific configs), and 2 doc-example-compilation passes.
   - What's unclear: actual current duration on the existing Node 26 leg — not measured this session (no access to prior CI run history).
   - Recommendation: not a planning blocker, but worth a note in the plan's verification step to check the Node 26 leg's historical duration against 30 minutes before assuming the Node 20.19.0 leg (likely similar duration, possibly slightly slower on an older runtime) has headroom.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 26 | Existing CI leg, local dev | ✓ (CI); local dev machine has v22.22.0 via `nvm`, not 26 [VERIFIED: `node --version` this session] | 22.22.0 (local) | CI is authoritative; local dev doesn't need to match exactly to write config |
| Node 20.19.0 | New CI leg (this phase) | ✓ on GitHub-hosted runners (official LTS release, confirmed to exist and be downloadable via `actions/setup-node`) [ASSUMED: nodejs.org blog release announcement, via WebSearch this session] — ✗ locally (not installed via `nvm` on this machine) | — | Not a blocker: the CI leg is what D-06 requires; a contributor wanting to reproduce locally would run `nvm install 20.19.0` |
| pnpm 10.17.1 | Both CI legs (`packageManager` field pins it) | ✓ | 10.17.1 | — |
| `@changesets/cli` 3.0.1 | D-09's version-bump step | ✓ (already a devDependency) | 3.0.1 | Must be run under Node ≥22.11 (its own floor) — see Pitfall 1 |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Node 20.19.0 not installed locally — CI is authoritative, no local reproduction needed for this phase's config edits.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest` 4.1.10 + `@effect/vitest` (existing, unchanged by this phase) |
| Config file | `vitest.config.ts` / per-package configs (existing) |
| Quick run command | `pnpm check` (the only gate this phase's verification actually needs to exercise) |
| Full suite command | `pnpm check` (same — there is no narrower "just the changed part" command for this phase's scope) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMPAT-01 | `pnpm check` passes on Node 20.19.0 in CI | CI gate (integration, not unit) | `pnpm check` (run under the new matrix leg) | ✅ — `check.yml` exists, needs the matrix edit only |
| REL-03 | All 9 public packages carry a changeset; none remain at placeholder version after `changeset version` | Manual/scripted verification | `pnpm changeset status` (before `version`), then `git diff` on all 9 `packages/*/package.json` `"version"` fields (after) | ✅ — `changeset` CLI already installed |
| REL-04 | `scripts/check-package-install.mjs` passes for all 9 packages | Existing CI gate (`spec:package`, already part of `pnpm check`) | `pnpm run spec:package` | ✅ — script already exists, already gates `pnpm check` |

### Sampling Rate
- **Per task commit:** `pnpm run spec:package` (fast, targeted check for REL-04-affecting edits) and `pnpm changeset status` (for REL-03-affecting edits)
- **Per wave merge:** full `pnpm check`
- **Phase gate:** both CI matrix legs green before `/gsd-verify-work`

### Wave 0 Gaps
None — existing test/gate infrastructure (`pnpm check`, `check-package-install.mjs`, `@changesets/cli`) covers all three phase requirements. No new test files or fixtures are needed; this phase is config + changeset-authoring work.

## Security Domain

**Status:** No ASVS categories apply. This phase edits CI configuration and version-tracking metadata; it introduces no authentication, session, input-validation, or cryptography surface. The only "secret-adjacent" consideration — CI credentials — is unchanged: `check.yml`'s `permissions: contents: read` is untouched by the matrix expansion, and no new secrets or tokens are introduced (`pnpm changeset publish`, the one command that would need registry credentials, is explicitly out of this phase's scope per ADR-QD-038 and Phase 2's ownership of publishing).

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2–V6 | No | This phase has no application-behavior surface — CI config and release metadata only |

### Known Threat Patterns for this stack
None applicable to this phase's scope.

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` in this repo is a one-line `@AGENTS.md` include; the substantive directives live in `AGENTS.md`. The following are directly load-bearing for this phase's plan:

- **§15, "CI runs `pnpm check` and nothing else"** — the matrix expansion (D-05) must not add any step beyond `pnpm check` to either leg; both legs run the identical `pnpm check` command.
- **§16, "Publish with pnpm, never npm"** — not directly invoked by this phase (no `pnpm publish` here), but `pnpm changeset version` and the eventual `pnpm pack` inside `check-package-install.mjs` are pnpm-native commands already; nothing in this phase should introduce an `npm`-invoked step.
- **§16, "A new public package goes in `tsconfig.build.json`"** — not applicable; this phase adds no new package.
- **§17, formatting is not a merge gate** — irrelevant to this phase's edits (YAML/JSON/Markdown, not TypeScript), noted only to confirm no `oxfmt` step needs adding to the new matrix leg.

## Sources

### Primary (HIGH confidence — file reads this session)
- `.planning/phases/01-release-readiness-runtime-verification/01-CONTEXT.md` — locked decisions D-01 through D-13
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — requirement text and traceability
- `package.json` (root), `packages/*/package.json` (all 9) — current versions, engines fields
- `.changeset/config.json`, `.changeset/brave-guards-decide.md`, `.changeset/bright-roles-explain.md`, and all 24 other `.changeset/*.md` files — current config and prose-style precedent
- `.github/workflows/check.yml` — current CI job, inline comment text needing D-08 update
- `scripts/check-package-install.mjs` — REL-04's verification mechanism
- `spec/decisions/038-changesets-for-versioned-releases.md`, `057-audit-signature-harmonization.md`, `058-hassignature-a-ninth-service-and-a-decomposable-leaf.md` — ADR context for the two audit changesets
- `packages/audit/src/SignatureCapturePort.ts` — the file whose public shape changed in `f86f028`
- `.planning/codebase/CONCERNS.md` §"Engine Version Floor Unverified" — the concern this phase closes
- `node_modules/@changesets/cli/package.json`, `node_modules/oxlint/package.json`, `node_modules/vitest/package.json` (local install inspection) — engines fields
- `git show f86f028 --stat`, `git show f0c48fd --stat` — the two commits needing changesets

### Secondary (MEDIUM confidence)
- Context7 `/changesets/changesets` — official `fixed` config docs (nested-array shape, semantics)
- `npm view pnpm@10.17.1 engines` — registry query, pnpm's own Node floor

### Tertiary (LOW confidence — flagged in Assumptions Log)
- WebSearch: `actions/setup-node` exact-patch-pin support in a matrix
- WebSearch: Node 20.19.0 official LTS release confirmation (nodejs.org blog)
- WebSearch: pnpm's default `engine-strict` behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new tools, all versions verified against locally installed `node_modules`
- Architecture: HIGH — both edits (CI matrix, changeset `fixed` group) are single, well-documented config changes with an official-docs citation for the trickier one
- Pitfalls: HIGH for the `@changesets/cli`/Node-20 exclusion (directly verified in the installed package); MEDIUM for the exact pnpm engine-strict default and GitHub Actions matrix timeout semantics (not fetched from primary docs this session — see Assumptions Log A1, A3)

**Research date:** 2026-08-30
**Valid until:** 30 days (stable tooling; no fast-moving dependencies in scope)
