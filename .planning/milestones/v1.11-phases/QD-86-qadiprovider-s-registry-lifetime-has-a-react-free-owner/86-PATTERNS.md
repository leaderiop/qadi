# Phase 86: QadiProvider's registry lifetime has a React-free owner - Pattern Map

**Mapped:** 2026-11-25
**Files analyzed:** 17 (new or modified)
**Analogs found:** 16 / 17 (no analog for the 86 record scripts' 82/85 hybrid, but both parents exist)

All analog paths below are git-tracked (checked `git ls-files` for `RegistryLease.ts`, `stryker.react.mjs`, `82-check.mjs`; the 85 scripts are under `.planning/phases/`, tracked). Phase 82 scripts live under `.planning/milestones/v1.10-phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/`.
Zsh note: quote the 85 dir (`.planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/`); a `QD-85-*` glob in `sed` failed here.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/react/src/RegistryOwner.ts` (new) | service-like closure module (headless state machine wrapper) | event-driven (commit/hold/release) | `packages/react/src/RegistryLease.ts` | exact (role) |
| `packages/react/src/QadiProvider.tsx` (mod) | component | event-driven (effects) | itself, lines 208-359 | self |
| `packages/react/test/RegistryOwner.test.ts` (new) | test | event-driven, headless | `packages/react/test/RegistryLease.test.ts` | exact |
| `packages/react/test/support/recordingDefer.ts` (new, name free) | test helper | event-driven | `fakeDefer`/`counting` in `RegistryLease.test.ts:14-41`; file shape `test/support/sweepCounter.ts` | exact |
| `packages/react/test/QadiProvider.owner.characterisation.test.tsx` (new, name free) | test | render, StrictMode/Activity/SSR | `QadiProvider.lifetime.test.tsx` (`rig`, `IdLog`, `RegistryTap`, `pastTheRelease`) | role-match |
| `stryker.react.mjs` (mod) | config | batch | itself, `:57-63` plus header `:1-28` | self |
| `86-check.mjs` (new, phase dir) | utility script | batch | `85-check.mjs` + `82-check.mjs` | exact |
| `86-pinned-check.mjs` | utility script | batch | `85-pinned-check.mjs` | exact |
| `86-mutation.mjs` | utility script | batch | `82-mutation.mjs` (lease group, killers) + `85-mutation.mjs` (born file) | exact |
| `86-earlier-checks.mjs` | utility script | batch | `85-earlier-checks.mjs` | exact |
| `86-mutation-base.json`, `86-mutation-close.json`, `86-RED-EVIDENCE.md` | records | n/a | 85's/82's same-named files | exact |
| `.changeset/react-<slug>.md` (new) | config | n/a | `.changeset/react-registry-recycled-in-place.md`, `devtools-the-hydration-block-is-a-model-row.md` | exact |
| `spec/decisions/199-*.md` (new), `spec/decisions/195-*.md` (amend 1.4), `spec/decisions/index.yaml` | spec | n/a | `spec/decisions/195-...md` header; index rows `:609-612` | exact |
| `spec/behaviors/09-react.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md` | spec | n/a | BEH-QD-746..750, INV-QD-409/410 neighbours (research lists lines) | exact |

## Pattern Assignments

### `packages/react/src/RegistryOwner.ts` (headless closure module)

**Analog:** `packages/react/src/RegistryLease.ts` (85 lines, unchanged this phase).

**Doc shape** (lines 1-14, 42-50): lead sentence of what it is, then why and ADR; ends "Out of the barrel (AGENTS.md section 9)". Copy that; say `QadiProvider.tsx` is the owner's one caller, and move the "why a swap is announced" comment (`QadiProvider.tsx:246-258`) here.

**Imports and types** (`RegistryLease.ts:15-21`): submodule namespace imports, `.ts` extension, `import type` for types.
```typescript
import * as Match from "effect/Match";
export type LeaseDefer = (run: () => void) => () => void;
```
Owner needs: `import * as AtomRegistry from "effect/reactivity/AtomRegistry"` (value, for `make`), `import type * as Atom`/type of `QadiAtoms` as the provider does, `import { makeRegistryLease } from "./RegistryLease.ts"`, `import type { LeaseDefer } from "./RegistryLease.ts"`. No React, no `@effect/atom-react`, no DeveloperSignals.

**Factory shape that leaves no Ignored mutant** (`RegistryLease.ts:51-59, 77-85`): block-bodied arrow const, all state in closure, forwarded by reference where possible.
```typescript
export const makeRegistryLease = (
  recycle: () => void,
  defer: LeaseDefer = timeoutDefer,
): RegistryLease => {
  let state: LeaseState = { _tag: "Unheld" };
  const fire = (): void => { state = { _tag: "Unheld" }; recycle(); };
  ...
  return { hold: () => { state = afterHold(state); }, release: () => { state = afterRelease(state); } };
};
```
Rules (research Q3): nothing at module scope but imports, two interfaces and the one factory; no module-scope arrow helper (Ignored ArrowFunction mutant); `hold: lease.hold`, `release: lease.release` forwarded by reference; no `Match` (detection is one `!==`); `let` inside the factory is fine (MODULE_STATE_BUDGET counts module scope only).

**Construction and seed to move verbatim in meaning** (`QadiProvider.tsx:239-244`):
```typescript
AtomRegistry.make({
  initialValues: [
    [atoms.subject, subject] as const,
    ...(initialValues ?? []),
  ],
})
```
Spread `initialValues` into the array once (already the case). Pass no `scheduleTask`/`defaultIdleTTL`. Construction calls nothing else (no defer; INV-QD-418).

**Recycle body** (`QadiProvider.tsx:282-288`; reset through the property, write in `finally`, from closure `latest`):
```typescript
makeRegistryLease(() => {
  try {
    registry.reset();
  } finally {
    registry.set(latestRef.current.atoms.subject, latestRef.current.subject);
  }
})
```
In the owner `latestRef.current` becomes the closure `latest`. Pass `defer` through (`defer` undefined keeps the lease default `timeoutDefer`; do not default it in the owner).

**Commit order** (D-09/D-10; today's order from `QadiProvider.tsx:260-263, 270-272, 304-308`): (1) `if (latest.atoms !== atoms) onAtomsReplaced();` (2) `latest = { atoms, subject };` (3) `registry.set(atoms.subject, subject);` with no `registry.get(...) !== subject` guard.

---

### `packages/react/src/QadiProvider.tsx` (component, effects)

**Analog:** itself. Keep: `writer` memo (:222-225), `signalRef`/`report` (:228-232), instrumentation effects (:310-330), context memos (:343-350), JSX (:352-358), public re-exports (:117, :121, :125).

**After shape** (CONTEXT specifics; four `useEffect`, three `useRef`, commit first, hold last):
```tsx
const ownerRef = useRef<RegistryOwner | undefined>(undefined);
const owner = (ownerRef.current ??= makeRegistryOwner({ atoms, subject, initialValues }));
useEffect(() => {
  owner.commit(atoms, subject, () => report(providerSignals.atomsReplaced()));
}, [owner, atoms, subject]);
// ...two instrumentation effects unchanged...
useEffect(() => {
  owner.hold();
  return () => owner.release();
}, [owner]);
```
Imports change: `import * as AtomRegistry` becomes `import type * as AtomRegistry` (still used by `QadiContextValue.registry`); the two lease imports (:59-60) become `makeRegistryOwner` and `type RegistryOwner` from `./RegistryOwner.ts`. Do not export the owner from this file (barrel is `export *`).
Comment moves: ticket-34 comment (:290-303) goes above the commit effect; header paragraph (:24-32) names owner and lease; "why a swap is announced" (:246-258) moves to the owner with one line left here. Delete `registryRef`, `atomsIdentityRef`, `latestRef`, `leaseRef`. Note `report` is recreated each render but reads `signalRef`, so it is not an effect dep (same as today).

---

### `packages/react/test/RegistryOwner.test.ts` (headless test)

**Analog:** `packages/react/test/RegistryLease.test.ts`.

**Header and imports** (lines 1-11): doc comment stating "driven headless: no React", discipline "every transition is followed by a further operation", then
```typescript
import { describe, expect, it } from "vitest";
import type { LeaseDefer } from "../src/RegistryLease.ts";
import { makeRegistryLease } from "../src/RegistryLease.ts";
```
**Recording defer to copy into `test/support/`** (lines 13-41; the lease test itself is pinned, so copy, do not import from it):
```typescript
const fakeDefer = () => {
  let pending: Array<() => void> = [];
  const counts = { defers: 0, cancels: 0 };
  const defer: LeaseDefer = (run) => {
    counts.defers += 1;
    pending.push(run);
    return () => {
      counts.cancels += 1;
      pending = pending.filter((queued) => queued !== run);
    };
  };
  const fire = (): void => { const runs = pending; pending = []; for (const run of runs) run(); };
  return { counts, defer, fire };
};
```
**Row pattern** (RL1, lines 46-63): hold/release/hold, assert `counts` equals `{ defers: 1, cancels: 1 }`, `fire()`, assert recycle count 0, then release and fire again to prove a "recycles once" twin. Titles use the file's own ids (`RO1`...), never phase/D numbers. For the owner, "recycled" is observed on the real registry (a seeded host atom reads its default; `registry.get(atoms.subject)` reads the latest committed subject), plus `vi.spyOn(registry, "reset")` for the throwing-reset row (LT18 shows the technique). Use a real `AtomRegistry` from the owner and real atoms (`Atom.make`). Include D-10a: after first commit, `registry.refresh(atoms.subject)` keeps the current subject (RED variant: reinstate the `registry.get(...) !== subject` guard).
**Support file style** (`test/support/sweepCounter.ts:1-30`): doc comment first, named exported interface plus a `make...` factory, relative `../../src/...ts` imports.

---

### `packages/react/test/QadiProvider.owner.characterisation.test.tsx` (render characterisation, born on base)

**Analog:** `packages/react/test/QadiProvider.lifetime.test.tsx` (766 lines, pinned). Reuse via copy or a support module, not by editing: `rig` :165-254, `IdLog` :141-144, `RegistryTap`, `pastTheRelease` :162 (`setTimeout(resolve, 50)`), `Host` :120-132. LT8 :438-463 (reporter collects `signal._tag`), LT18 :691-730 (spies `registry.reset` on the instance and `setTimeout`) are the models for cells (b), (d), (e), (f). Server render cell: look at `ServerRender.test.tsx`. Cells C1-C9 and their RED variants are in 86-RESEARCH.md ("Characterisation cells"; C5 is the equal-subject no-notify pin with scratch variant "delete `Atom.withEquality(subjectsEqual)` from `QadiAtoms.ts:240-243`"; C8 is the throwing-reporter-still-writes pin, variant "remove try/catch in `contain`, `DeveloperSignals.ts:234-242`"). Must be green on base `b0fc13f3` and after.

---

### `stryker.react.mjs` (config)

**Analog:** itself. Add to `mutate` (lines 57-63) after `RegistryLease.ts`:
```javascript
    "packages/react/src/RegistryLease.ts",
    "packages/react/src/RegistryOwner.ts",
```
Header: extend the sentence at :19-20 ("`RegistryLease.ts` is the one place a provider's registry is recycled, so a surviving mutant there is ... (ADR-QD-195)") with a parallel clause for the owner (what a commit, a seed and a recycle write; ADR-QD-199), and add `RegistryOwner.test.ts` to the covering-tests sentence at :24-27 and the "and its **registry lease**" list at :1-4. Edit in the same commit that creates the owner (D-15).

---

### `86-pinned-check.mjs`, `86-check.mjs`, `86-mutation.mjs`, `86-earlier-checks.mjs`

**86-pinned-check.mjs — analog `85-pinned-check.mjs`.** Header comment style (held/declared/born, `--all-applied`, `--self-test`), imports `node:child_process`, `node:fs`, `node:path`, `node:url`, `const DIR = relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))`, `HELD` array of paths, base text from `git show <phase_base>:<path>`. Phase 86 declares no edit: HELD = every file under `packages/react/test/` at base plus `packages/react/src/RegistryLease.ts`; born = the characterisation file (one adding commit). Phase base: `b0fc13f3` (HEAD at planning is `1a91d99f`; planner picks the commit before plan 1's first change and hard-codes it as `PHASE_BASE`, as `85-check.mjs:46` does).

**86-check.mjs — analog `85-check.mjs`** (constants block `:38-46`: `D`, `EVIDENCE`, `SUMMARY`, `TRAILER`, `PLAN_SUBJECT = /^[a-z]+[(]85-[0-9]{2}[)]!?: /`, `GUARDED`, `PHASE_BASE`; helper `fail`, `git`, `scratch`; `TITLE_CALL`/`titlesFrom` at :120-122; `readBase` :68). Use the 82 trailer regex instead of 85's fixed name (D-18 in CONTEXT says keep 85's Opus string; research Q7 says use the generic regex; **CONTEXT D-18 wins as the decided option, but the active attribution this session is "Claude Sonnet 5.5", so a fixed Opus string would fail `trailers`. Planner: use the generic regex from `82-check.mjs:27`** and record the conflict):
```javascript
const TRAILER = /^Co-Authored-By: Claude [^<>]+ <noreply@anthropic[.]com>$/;   // 82-check.mjs:27
// 82-check.mjs:57
return TRAILER.test(lines[0]) ? [] : [`the trailer is not a Claude trailer: ${lines[0]}`];
```
Modes to model on 82/85: `owner-shape` (no React import, closure state only, no `dispose(`, no `scheduleTask`/`defaultIdleTTL`, no module-scope arrow), `provider-forwards-only` (exactly four `useEffect`, three `useRef`, first effect body is `owner.commit(`, last is the only `owner.hold()`/`owner.release()`, forbidden tokens `registryRef atomsIdentityRef latestRef leaseRef makeRegistryLease AtomRegistry.make .reset( .dispose( setTimeout registry.set( registry.get(` with comments/strings blanked), `trailers`, `base`, plus house-style gates. 82's `single-owner` mode (`82-check.mjs:326-335`) will report differently after this phase; that is expected (see earlier-checks).

**86-mutation.mjs — analogs `82-mutation.mjs` (:20-33, `lease` group with `killers`, `disableBail`, `closeOnly`, `UNMEASURED`, `invocation`) and `85-mutation.mjs` (:1-50, born-file `judgeNew`, `NEW_FILES`, `record base|close <group> [--restart]`).**
```javascript
const REACT = { config: "stryker.react.mjs", report: "reports/mutation-react/mutation.json" };
const GROUPS = {
  lease: { ...REACT, files: ["packages/react/src/RegistryLease.ts"], disableBail: true, killers: "packages/react/test/RegistryLease.test.ts" }, // base AND close this phase (82 had closeOnly)
  owner: { ...REACT, files: ["packages/react/src/RegistryOwner.ts"], closeOnly: true, disableBail: true, killers: "packages/react/test/RegistryOwner.test.ts" },
};
const UNMEASURED = [{ file: "packages/react/src/QadiProvider.tsx", why: "renders; it holds no lifetime branch now, and its behaviour is pinned by the rendered tests and the characterisation" }];
const invocation = (group) => `pnpm exec stryker run ${GROUPS[group].config} --mutate ${GROUPS[group].files.join(",")}${GROUPS[group].disableBail === true ? " --disableBail" : ""}`;
```
`NEW_FILES = [owner path]`; lease base measured at HEAD: 28 killed, 0 of everything else. Lease must not be `closeOnly` here (D-15 needs a base).

**86-earlier-checks.mjs — analog `85-earlier-checks.mjs` (163 lines).** Copy the archived `82-check.mjs` to a scratch dir (never write into `.planning/milestones/`), run `single-owner` on base (expect exit 0) and at close (expect exit 1: "does not build one lease", "does not hold and release the lease in one effect"). Locate earlier-phase dirs by name prefix under `.planning/phases/` and `.planning/milestones/*-phases/`.

---

### `.changeset/react-<slug>.md`

**Analog:** `.changeset/devtools-the-hydration-block-is-a-model-row.md` (the wave's policy shape) and `react-registry-recycled-in-place.md` (package block):
```markdown
---
"@qadi/react": patch
---

<what changed in the package's internals, one paragraph>. Nothing a host renders, receives or calls changes. No export changes.
```
Name pattern `react-<kebab-sentence>.md`. The 85 check bans `PHRASE = /this phase|until now|any more|no longer|from now on/i` in changesets (`85-check.mjs:227-228`); avoid those words.

---

### Spec records

**ADR-QD-199 — analog `spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md`** (lines 1-30): title `# ADR-QD-199 — ...`, the `> **Document Control**` table (`Document ID QADI-ADR-199`, `Revision 1.0`, `Effective Date 2026-11-25`, `Status Accepted — ...`, `Author Qadi Engineering`, `Classification Architecture Decision Record`, `Change History 1.0 (2026-11-25): Initial (ARCH-133, CCR-QD-478)`), then `## Context`. Amendment of 195 bumps Revision to 1.4 and prepends a Change History line in the same style (`1.3 (2026-11-25): ... (CCR-QD-474)`). Create and revise through `scripts/spec-revise.mjs --date 2026-11-25` (D-02); never `next-id.mjs`.
**Index row** (`spec/decisions/index.yaml:609-612`):
```yaml
  - id: "ADR-QD-195"
    file: "195-a-providers-registry-has-one-owner-for-its-lifetime.md"
    title: "A provider's registry has one owner for its lifetime"
    status: "Accepted — amends ADR-QD-014, ADR-QD-148 and ADR-QD-149"
```
Add `ADR-QD-199` after the 198 row (`198-the-hydration-block-is-a-model-row.md` exists, so 199 is next). Spec line map (BEH-QD-067 :246, 747..750 :1108-1215, INV-QD-409 :4745, INV-QD-410 :4757) is in 86-CONTEXT.md. Include the audit table and the D-10a divergence in ADR-QD-199 Consequences (research Q1, Q5).

## Shared Patterns

### Import and doc conventions (AGENTS.md sections 1, 8, 9)
Namespace imports of `effect/*` submodules, `.ts` relative extensions, `import type` for types, no `as` except the existing `[atoms.subject, subject] as const`, no `switch`, no `Date.now`/`console`/`process.env`. Doc comment: one-line summary, then the why and ADR in following paragraphs. Package-private modules stay out of `src/index.ts`; tests import by path.

### Closure state, no module state
**Source:** `RegistryLease.ts:55` (`let state` inside factory). MODULE_STATE_BUDGET (AGENTS.md section 6) stays at one row; the owner adds none.

### Injected defer with real default
**Source:** `RegistryLease.ts:35-40, 53`. `timeoutDefer` resolves `setTimeout` from the global at call time (LT18's spy depends on it); the owner forwards an optional `defer` and the provider passes none.

### Containment of reporter throws
**Source:** `DeveloperSignals.ts:234-242` (`contain`), `:503-508`, `:552-556`. The owner's `onAtomsReplaced` callback is safe because the provider's `report` goes through `providerSignalReporter`.

### Phase scripts and evidence
Every new check is shown failing once with scratch variant and failing text in `86-RED-EVIDENCE.md` (WX-06); scripts run from repo root, stdin closed (`< /dev/null`); never `git add -A` under `.planning/milestones`; do not stage `.planning/config.json` or `README.md`. Commit trailer per above.

## No Analog Found

None without a parent. The only genuinely new combination is `86-mutation.mjs` needing a `lease` group measured at base AND close with `killers` (82 had it close-only, 85 had no killers); merge the two scripts' mechanisms.

## Metadata

**Analog search scope:** `packages/react/src`, `packages/react/test`, `packages/react/test/support`, `stryker.react.mjs`, `.planning/phases/QD-85-...`, `.planning/milestones/v1.10-phases/QD-82-...`, `.changeset/`, `spec/decisions/`
**Files read in full or by range:** RegistryLease.ts, QadiProvider.tsx (205-359), RegistryLease.test.ts (1-90), stryker.react.mjs, sweepCounter.ts (head), 85/82 script heads, ADR-195 header, index.yaml rows, two changesets, plus 86-CONTEXT.md and 86-RESEARCH.md lines 1-397 (research remainder, lines 398-887, with the C1-C9 cell and RO1-RO14 row tables, was not read here; the planner should read it for those lists).
**Pattern extraction date:** 2026-11-25
