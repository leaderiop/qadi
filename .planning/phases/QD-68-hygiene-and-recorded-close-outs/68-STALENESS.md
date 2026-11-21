# Phase 68: staleness of Phases 62 to 67 after Phase 68

HYGN-06's input. `68-stale.mjs` ran on commit `ec10b6081026489f74d406e1d8a203de2874dc30`, the commit after 68-12's last code and record commit, with no later plan of the phase editing a file the reports cover.

```text
62: stale, verification b9ab1ea2, 30 cited, 9 changed since
  AGENTS.md (covered)
  packages/core/test/FloatingEffectPins.tst.ts (covered)
  scripts/check-house-style.mjs (covered)
  scripts/lib/type-tests.mjs (covered)
  scripts/run-tstyche.mjs (covered)
  spec/README.md
  spec/decisions/index.yaml
  spec/overview.md
  spec/traceability.md
63: stale, verification 321e213d, 18 cited, 5 changed since
  AGENTS.md
  scripts/check-package-install.mjs (covered)
  spec/README.md
  spec/decisions/033-the-packed-artifact-is-the-product.md
  spec/traceability.md
64: stale, verification af3ef24e, 25 cited, 11 changed since
  AGENTS.md
  packages/devtools/README.md (covered)
  packages/devtools/src/model/DiagnosticsFeed.ts (covered)
  packages/devtools/src/model/TimelineFeed.ts (covered)
  packages/devtools/test/model/ExternalStore.test.ts
  scripts/spec-revise.mjs
  spec/README.md
  spec/behaviors/28-devtools-screens.md
  spec/invariants.md
  spec/overview.md (covered)
  spec/traceability.md
65: stale, verification 30582032, 24 cited, 7 changed since
  .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs
  packages/core/src/Admission.ts (covered)
  packages/core/test/Admission.test.ts (covered)
  scripts/spec-revise.mjs
  spec/README.md
  spec/overview.md
  spec/traceability.md
66: stale, verification ba4392cf, 23 cited, 8 changed since
  AGENTS.md
  packages/core/src/SinkCodec.ts (covered)
  packages/core/src/UntrustedDecode.ts (covered)
  packages/core/test/UntrustedDecode.test.ts (covered)
  packages/react/test/UntrustedSeams.test.ts
  scripts/check-house-style.mjs
  scripts/spec-revise.mjs
  spec/README.md
67: stale, verification 4f9d906a, 30 cited, 5 changed since
  packages/core/test/DecisionCache.test.ts (covered)
  scripts/check-house-style.mjs
  spec/README.md (covered)
  spec/invariants.md (covered)
  spec/traceability.md (covered)
redo: 62 63 64 65 66 67
```

| Phase | GSD `verification.status` | `68-stale.mjs` | Re-verified by |
| ----- | ------------------------ | -------------- | -------------- |
| 62 | stale | stale | 68-13 |
| 63 | stale | stale | 68-14 |
| 64 | stale | stale | 68-14 |
| 65 | stale | stale | 68-14 |
| 66 | stale | stale | 68-15 |
| 67 | stale | stale | 68-15 |

GSD's status reads only the `covered_files` of each report; `68-stale.mjs` also reads every other repository path the report cites, so it lists more files for each phase. No phase is reported current, so none is skipped.
