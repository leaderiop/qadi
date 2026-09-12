# @qadi/audit

## 0.6.1

### Patch Changes

- `0.6.0` was published from a checkout where `pnpm build` had never been run, so all 9 tarballs shipped `src/` and `package.json` only — no `lib/`, no `.d.ts`, no `index.js`. `0.6.0` could not be unpublished (no OTP access at the time), so it stays on the registry as a known-broken release; `npm deprecate` points installers at `0.6.1` instead. This release ships the intended build output, no source changes otherwise.

  Root cause fixed: each public package now has a `prepack` script (`pnpm -w run build`, not a package-local `tsc -b` — `@qadi/testing`, `@qadi/audit`, etc. depend on other workspace packages and a local-only build would not rebuild them) that runs automatically before `npm pack`/`npm publish`/`pnpm pack`/`pnpm publish`, so this can no longer happen regardless of which checkout the publish step runs from.

- Updated dependencies
  - @qadi/core@0.6.1

## 0.6.0

### Minor Changes

- 47e5683: `effect` bumped from `4.0.0-rc.112` to `4.0.0-rc.115` (`4.0.0-rc.113` shipped a broken `.d.ts` bundle — missing `Match`/`Schema` type exports — fixed in `rc.115`).

  **Breaking: the minimum supported Node version is now `>=22.12.0`, up from `>=20.19.0`.** This is forced by the bump: `@effect/vitest@4.0.0-rc.115` requires `vitest@^5.0.0`, and `vitest` 5 does not run on Node 20 at any patch level. There is no path that keeps both effect's newest rc and Node 20 support — see ADR-QD-074. If you run these packages on Node 20, stay on `effect@4.0.0-rc.112` and the previous published version until you can move to Node 22.12+.

  No public API changed. Internal-only: `effect/testing/FastCheck` was removed upstream, so this repo's own tests depend on `fast-check` directly now; `vitest`'s benchmark API moved to a `test`-context fixture, so `packages/core/bench/*.bench.ts` were ported to the new shape; `@stryker-mutator/vitest-runner` doesn't yet support `vitest` 5's `testNamePattern` change ([stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)), so it's patched via `pnpm patch` to backport the pending upstream fix (dev-only, not part of the published packages).

### Patch Changes

- Updated dependencies [47e5683]
  - @qadi/core@0.6.0

## 0.5.0

### Minor Changes

- Resolved all 202 findings from a full-codebase audit (2026-09-06), plus the two follow-up human-decision items it surfaced. Correctness fixes, spec-consistency corrections, and hardening spanning every package — no single public API change dominates; see the merged PRs (#28-#32) for the itemized findings.
- Resolved all 191 Low/Info findings from a second full-codebase audit (2026-09-07, issue #49), including several genuine correctness fixes surfaced along the way:
  - `Neq` now denies whenever either resolved operand is `undefined` (including the both-absent case), matching `Eq`'s existing fail-closed stance — previously matched on one side being absent (H2).
  - `projectAt` (`FieldPath.ts`) walks an explicit stack instead of the call stack, closing a stack-overflow on deeply-nested field specs.
  - The untrusted-decode depth guard is now shared between `Policy.ts` and `SinkCodec.ts` (H6), and the circuit breaker releases its probe claim on abnormal exit (H4).
  - `predicate-prisma`'s compiler constant-folds vacuous AND/OR identities so they never nest (C1); `predicate-sql`/`predicate-prisma` guard non-finite bounds so both interpreters agree.
  - `DecisionCache`'s coalesced-waiter interruption path was closed; its `maxDepth` key issue was confirmed already fixed.

  Also: spec-consistency sweeps across every behavior/invariant/traceability document, gate-blind-spot closures (dod-table, api-surface, doc-examples, mutation-upload), and house-style/BDD cleanup.

### Patch Changes

- Smaller fixes and consolidation rounding out this release:
  - `@qadi/audit`'s `encodeAuditEntry` now guards the whole record (`isRecordJsonSafe`) instead of `resource` alone — a circular or `BigInt`-valued `HasCustom.params` previously sailed past the guard and threw uncaught at the store write.
  - `@qadi/react`'s `Hydration.ts` now decodes with `UNTRUSTED_DECODE_OPTIONS`, refusing an excess property on a dehydrated entry or its embedded policy instead of silently stripping it.
  - `SinkCodec.ts`'s `toWire`/`fromWire`/`isRecordJsonSafe` dispatch is now `Match.tagsExhaustive` instead of a ternary/`if` chain — a third `SinkRecord` tag is now a compile error instead of a silent fall-through.
  - Five hand-built one-shot test gates now use `Latch`; `TestClock.testClockWith` replaces a cast-requiring fixture pattern; five duplicated `CollectingTracer` test helpers are consolidated into one shared `@qadi/testing` implementation.
  - The docs' flagship error-handling example now uses `Effect.catchTag` instead of `_tag ===` narrowing.

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @qadi/core@0.5.0

## 0.4.0

### Minor Changes

- `ChainIntegrity`/`verifyChainIntegrity`/`ChainIntegrityError`/
  `chainIntegrityVerified` are renamed to `SequenceIntegrity`/
  `verifySequenceIntegrity`/`SequenceIntegrityError`/
  `sequenceIntegrityVerified` throughout — no compatibility alias.

  The prior names read as cryptographic tamper-evidence to a compliance
  reviewer; what this actually checks is gap-and-duplicate detection over
  caller-assigned sequence numbers, nothing more. **Breaking**: a consumer
  importing any of the four old names must switch to the new ones — there is
  no rename shim.

### Patch Changes

- Fixed two correctness issues in the audit sink's circuit breaker:
  - **Half-open now admits exactly one concurrent probe write.** Previously
    every write arriving while the breaker was half-open could race in as its
    own probe, so a burst of concurrent writes could trip the breaker back to
    open (or close it) based on more than one outcome instead of the single
    probe half-open is meant to gate on.
  - **An audit-entry dropped while the breaker is open is now logged**, even
    when no `AuditStagingPort` is wired to catch it. Previously that drop was
    silent — the entry disappeared with no observable trace at all.

- Updated dependencies
- Updated dependencies
  - @qadi/core@0.4.0

## 0.3.0

### Minor Changes

- 0ee42d1: `SignatureCapturePort` now speaks `@qadi/core`'s canonical `Signature` type
  instead of a second, independently-maintained one of its own.

  **`capture` now returns, and `validate` now accepts, `@qadi/core`'s
  `Signature` directly.** `@qadi/audit`'s own `ElectronicSignature` is retired.
  The two types started out structurally identical, but two
  independently-maintained "signature" types, one per package, is exactly the
  drift ADR-QD-002's single-definition reasoning exists to prevent for the
  Policy ADT — and now that `@qadi/core` has a canonical `Signature` of its
  own, the same reasoning applies here.

  **Breaking**: `ElectronicSignature` is removed outright, with no
  compatibility type alias. A consumer that imports `ElectronicSignature` by
  name must switch to `@qadi/core`'s `Signature` — there is no rename, no
  deprecation window, and no bridging type to fall back on.

  **`SIGNATURE_MEANINGS` and `SignatureMeaning` now live in `@qadi/core`,
  re-exported from `@qadi/audit`.** Existing
  `import { SIGNATURE_MEANINGS } from "@qadi/audit"` call sites keep working
  unchanged — only where the vocabulary is canonically defined moved, not the
  value itself.

  **`SignatureCaptureRequest` gains an optional `signerRole`, threaded
  straight into the produced `Signature.signerRole`.** A caller with role
  context can now populate it; a caller that omits it gets `undefined`, the
  same behavior as before the field existed. This part is additive and needs
  no action from anyone.

  See ADR-QD-057.

- a52e92e: The audit pipeline's correctness guarantees are now formally specified
  rather than implied, and held by tests that are themselves checked for
  whether they'd notice a break.

  **Five properties are named, not just intended.** INV-QD-051 through
  INV-QD-055 and BEH-QD-249 through BEH-QD-257 state what `@qadi/audit`
  promises: staging presence or absence never changes the committed audit
  entries (staging non-observability); once a circuit breaker trips,
  concurrent `record()` calls cannot race it into attempting a write before
  reset (circuit-breaker atomicity under concurrency); `enforceRetention` and
  `getPurgeableEntries` partition every entry set exactly, with no row
  double-counted or dropped (retention's partition property);
  `verifyChainIntegrity` detects every gap and every duplicate sequence
  number (chain-integrity gap detection); and `signatureObligationHandler`
  calls `capture` exactly once per discharge, with the recorded
  `ObligationRecord` outcome matching whether that call succeeded (the
  signature obligation handler's call-once / outcome-match guarantee). A
  consumer relying on this package for an audit trail cares which of these
  are guaranteed and which were previously only intended.

  **A mutation-testing gate now runs as part of `pnpm check`.** `stryker.audit.mjs`
  mutates `packages/audit/src/**/*.ts` and breaks the build below 80%. The
  first run scored 81.46% and revealed real gaps in what the existing tests
  would notice; the suite was hardened to 92.03%, clearing the 90% high
  threshold. Reporting only the final number would hide what the gate found;
  reporting only the first would understate what closed the gap.

  Nothing here changes `@qadi/audit`'s public API — this is worth a release
  note anyway, because what changed for a consumer is the strength of the
  guarantee behind an interface that looks identical: the promise was always
  made, and now it's checked.

  See INV-QD-051–055, BEH-QD-249–257.

### Patch Changes

- Updated dependencies [efa3435]
- Updated dependencies [dc767f2]
- Updated dependencies [d251db4]
- Updated dependencies [a61dadc]
- Updated dependencies [f1c6aa5]
- Updated dependencies [50bf38a]
- Updated dependencies [2227e5e]
- Updated dependencies [39b7cbe]
- Updated dependencies [0649129]
- Updated dependencies [f03d75c]
- Updated dependencies [0363a5a]
- Updated dependencies [e2a44d9]
- Updated dependencies [73508bb]
- Updated dependencies [0363a5a]
  - @qadi/core@0.3.0
