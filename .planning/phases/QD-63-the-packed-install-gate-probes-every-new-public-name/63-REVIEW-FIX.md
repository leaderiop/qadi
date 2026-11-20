---
phase: QD-63-the-packed-install-gate-probes-every-new-public-name
fixed_at: 2026-11-20T00:00:00Z
review_path: .planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase QD-63: Code Review Fix Report

**Fixed at:** 2026-11-20
**Source review:** 63-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), gate 14 once at a time in the foreground. The failing-run proof used a scratch copy of the script with `ROOT` kept on the repo and `SANDBOX` moved to `.scratch/qd63-fix/sandbox`; the scratch dir is deleted.

## Fixed Issues

### WR-01: The `DiagnosticsOptions` refusal is not held by the guard

**Files modified:** `scripts/check-package-install.mjs`
**Commit:** 81847868 (one commit covers WR-01 and WR-02; both touch the same file and the same guard)
**Applied fix:**
- `REFUSED_SHAPE_PROBES` gained `["DiagnosticsOptions", "schedule"]`.
- `TYPE_ONLY_PROBES` gained `GateInstanceLike` and `GateRegistryLike`. The fixture uses both as types (`const gate: GateInstanceLike`, `ReadonlyArray<GateInstanceLike>`, `const gateRegistry: GateRegistryLike`).
- The `noSchedule` directive text was `a cadence is a number, not a Schedule`. The guard's match is case-sensitive, so it did not contain `schedule` and the new key would have failed on the real fixture. It now reads `schedule is not an option, a cadence is a number`.
- The `TYPE_ONLY_PROBES` doc comment now names the gates probe's typed literals. The failure messages were generic already, so they are unchanged.

**Proof 1, real gate** (`node scripts/check-package-install.mjs < /dev/null`, exit 0):
```
package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))
```

**Proof 2, scratch copy with the `noSchedule` literal and its directive deleted** (exit 1):
```
  the consumer fixture never refuses a literal typed DiagnosticsOptions: every refused-shape probe name must annotate a declaration holding a @ts-expect-error that names its refused member

package-install: 1 failure(s) across 9 package(s).
Sandbox kept in .package-check/ for inspection.
```
The compile and run stayed green, so the guard is the only thing that caught it. The "Sandbox kept in .package-check/" line is the script's fixed text; the scratch sandbox was elsewhere.

### WR-02: The feed check is "a call whose callee is that identifier", not "a feed that runs"

**Files modified:** `scripts/check-package-install.mjs`
**Commit:** 81847868
**Applied fix:** one comment above the call check in the guard's `visit`, in the `shortcut:` form: a call written but never run (an uninvoked arrow, a shadowed name) passes the guard, the probes' own `expect()` assertions catch a dead probe, and reachability analysis is the upgrade if one slips through. The matching logic is unchanged; spec and ADR prose untouched.

## Checks

- `pnpm exec oxlint scripts/check-package-install.mjs`: exit 0, no output.
- `.planning/config.json` remains modified and unstaged, as it was before the run. No `packages/` change, no changeset, no push, no `next-id.mjs`.

---

_Fixed: 2026-11-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
