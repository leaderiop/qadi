---
phase: 02-one-port-read
fixed_at: 2026-11-08T04:40:00+01:00
review_path: /home/yopu/Project/Perso/qadi/.planning/phases/02-one-port-read/02-REVIEW.md
iteration: 2
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-11-08
**Source review:** .planning/phases/02-one-port-read/02-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 1 (WR-04; IN-06 and IN-07 are out of scope for `critical_warning`)
- Fixed: 1
- Skipped: 0

Edits and commits were made in the main checkout on `arch-wave-5` (`workflow.use_worktrees` is `false`). Every gate below ran in that checkout.

## Fixed Issues

### WR-04: devtools what-if replay still grants `not(hasSignature)` for a requirement the capture never saw (carried over from the prior review's WR-03, behavior unfixed)

**Files modified:** `packages/devtools/src/model/Capture.ts`, `packages/devtools/test/model/Capture.test.ts`, `packages/core/src/SignatureHistory.ts` (doc comment only), `spec/invariants.md`, `spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md`, `spec/behaviors/29-devtools-simulator.md`, `apps/website/src/content/docs/docs/concepts/signatures.md`, `apps/website/src/content/docs/docs/packages/audit/signatures.md`, `.changeset/devtools-unseen-signature-fails.md`
**Commit:** ad5b3fe
**Status:** fixed: requires human verification (a logic change to what replay answers)

**Applied fix:** Fail closed on a miss, as decided. The capture is not re-keyed.
- `replayLayer` now answers a request the capture never saw with `PortReply.fail("the capture holds no answer for this SignatureHistory request (not captured)")` for `SignatureHistory`. That becomes `SignatureHistoryUnavailable` through the description's own `failure`. The other four ports still fall through to `none`.
- "Which port's miss is not safe to answer with `none`" is a local closed table in `Capture.ts`, `UNSEEN_REQUEST_IS_AN_OUTAGE: { readonly [K in PortName]: boolean }`. A sixth port is a compile error until it states which it is. No public `@qadi/core` export was added. I did not put a field on `PortDescription`, because a new required field would break hand-built descriptions.
- Tests in `Capture.test.ts` (new `describe`, 5 tests):
  1. A captured signature answer replays exactly (empty `diffTraces`, key lookup is `Answered`).
  2. An edited `meaning` fails with `SignatureHistoryUnavailable`, both as `hasSignature("review")` and as `not(hasSignature("review"))`. An edited `signerRole` under `not(...)` fails too.
  3. An empty capture fails a signature request instead of denying it.
  4. The other four ports' unseen requests still produce a `Deny` decision, not a failure.
  I confirmed the three miss tests fail on the old `Capture.ts` (stashed it and re-ran) and pass on the new one. The existing INV-QD-043 tests all still pass.
- Docs updated in the same commit:
  - `Capture.ts` doc comments (the `replayLayer` comment no longer says "no signatures" or claims the miss denies "for the reason a misconfigured deployment would").
  - INV-QD-043: Source, key paragraph and Enforcement. Revision 1.79 to 1.80, dated 2026-11-08 via `spec-revise.mjs`.
  - ADR-QD-109 Consequences bullet, rewritten. 1.3 to 1.4.
  - BEH-QD-221 in `spec/behaviors/29-devtools-simulator.md`: new REQUIREMENT, and the "never saw" requirement now carries the exception. 1.7 to 1.8.
  - The `SignatureHistoryNone` doc comment in `SignatureHistory.ts`.
  - `concepts/signatures.md` and `packages/audit/signatures.md`, which both said "denying unambiguously".
- Changeset: `.changeset/devtools-unseen-signature-fails.md`, `@qadi/devtools` patch.

## Finding for the caller: the "other ports' `none` does not grant under negation" claim is false

You asked me to verify this for each port before relying on it. I ran `not(<leaf>)` against `snapshot(emptyAnswers)` with a scratch test (deleted afterwards). All four ports' unseen requests **grant** under negation:

| Leaf under `not(...)` | Unseen answer | Result |
| --- | --- | --- |
| `hasAttribute("clearance", gte(1))` | `undefined` | Allow |
| `hasRelationship("owner")` | `Unknown` | Allow |
| `hasActed("raised")` | `Unknown` | Allow |
| `hasCustom("x")` | `false` | Allow |

The cause is `Walk.ts`'s `Not` arm: any denying child becomes an allow. It is the same fail-open an unwired real deployment has under `not(...)`, which is the INV-QD-007 question the review already flagged as predating this phase. I kept scope narrow, as instructed, and did not change these four. What I did:
- The `replayLayer` doc comment and INV-QD-043 now say plainly that the `none` default is safe for an un-negated leaf only.
- I did not add a test pinning the four negated allows, so they are not fossilised as intended behavior.

Whether the other four ports should also fail on a miss is a decision for you. With the new table it is a one-word change per port (`false` to `true`). It would also make a what-if of any policy that uses `not(...)` over a port fail on every unseen request.

## Verification

All gates ran in the main checkout, post-commit state identical to the committed tree:

| Gate | Result |
| --- | --- |
| `pnpm typecheck` | pass |
| `pnpm lint` | 0 errors (the warnings it prints are pre-existing and in other files) |
| `node scripts/check-house-style.mjs` | 397 files clean, 3 declared switches |
| `pnpm vitest run` (full) | 151 files, 3900 tests passed |
| `pnpm test:bdd` | 34 files, 559 tests passed |
| `node scripts/spec-revise.mjs --check` | every revision matches |
| `pnpm spec:verify:strict` | PASS 21, FAIL 0, SKIP 0 |
| `pnpm spec:examples` | 101 blocks compile |
| `pnpm spec:api` | 861 exports documented |
| `pnpm spec:website-examples` | 40 blocks compile |

The commit went through the repository hooks (no `--no-verify`). `.planning/config.json` and `.planning/state.json` were not touched.

---

_Fixed: 2026-11-08_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
