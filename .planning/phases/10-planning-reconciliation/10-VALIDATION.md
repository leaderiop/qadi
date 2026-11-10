---
phase: "10"
slug: "planning-reconciliation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-10"
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | shell gates (`grep`, `find`, `git`) for records; the repo's `pnpm` scripts for the build |
| **Config file** | none for the gates; `package.json` (`clean`, `build`, `typecheck`, `check:pr`), `tsconfig.build.json` |
| **Quick run command** | the task's `<automated>` gate (each runs in under 2 s, except 10-02 Task 2's clean/build) |
| **Full suite command** | `pnpm check:pr` |
| **Estimated runtime** | gates: < 2 s; `pnpm clean && pnpm build && pnpm typecheck`: about 1–3 min; `pnpm check:pr`: well over 10 min (example app, website build, package install), run once at the end |

---

## Sampling Rate

- **After every task commit:** that task's `<automated>` gate.
- **After wave 1:** 10-01's two gates and 10-02 Task 2's gate, together.
- **Before `/gsd-verify-work`:** `pnpm check:pr` green (10-03 Task 3).
- **Max feedback latency:** under 5 s for every records gate; the build gate is bounded by `tsc -b`.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | REC-02 | T-10-01, T-10-02 | No lost plan claims a status `main` contradicts | records gate | 12 files with a wave-6 `status:` and a `disposition:`; 0 with `done`/`blocked`/`needs-decision`; `./progress.sh 46 … 57` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | REC-01 | T-10-01 | — | records gate | banner in the first 3 lines; `_SALVAGE.md` link; 12 table rows with a wave-6 status; stale `.gitignore:43` note gone | ✅ | ⬜ pending |
| 10-02-01 | 02 | 1 | REC-04 | T-10-04 | Nothing still references an orphan before it is deleted | inventory (read-only) | finder loop finds orphans (positive gate, must run before Task 2); `git status -- packages` empty | ✅ | ⬜ pending |
| 10-02-02 | 02 | 1 | REC-04 | T-10-03 | `lib/` is regenerated from `src/` only | build + gate | `pnpm clean && pnpm build && pnpm typecheck`, both finder loops empty, nine `lib/index.js` present | ✅ | ⬜ pending |
| 10-03-01 | 03 | 2 | REC-03 | — | — | checkpoint:decision | — (human answer: archive / track / ignore) | — | ⬜ pending |
| 10-03-02 | 03 | 2 | REC-03 | T-10-05, T-10-07, T-10-08 | No secret enters git; rescue branches stay local | records gate | branch on the decision: archive/track/ignore assertions, secret-scan regex empty, no live doc names a moved path, no remote rescue branch | ✅ | ⬜ pending |
| 10-03-03 | 03 | 2 | XC-01 | — | The merge gate runs unmodified and is green | full gate | STATE.md stale-claim greps = 0, PROJECT.md lost-wave facts, `pnpm check:pr` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Every gate is a shell command over files that already exist, or the
repo's own `pnpm` scripts. Nothing to install.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The tracking choice | REC-03 | D-02 is a human decision (checkpoint, asked once) | Answer 10-03 Task 1: archive, track or ignore |

All other phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (the checkpoint task excepted)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags
- [x] Feedback latency < 5 s per records task (the build and the full gate are bounded, and run once)
- [ ] `nyquist_compliant: true` set in frontmatter (set by validate-phase after execution)

**Approval:** pending
