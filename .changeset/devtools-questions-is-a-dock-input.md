---
"@qadi/devtools": minor
---

**Breaking.** `questions` is no longer a field of `DiagnosticsDockOptions` (the dock's `diagnostics` prop and `useDiagnostics`) or of `DiagnosticsOptions` (`runDiagnostics`). It is `DevtoolsDock`'s own `questions` prop, beside `gates`, read on the diagnostics cadence. A host that wrote `diagnostics={{ …, questions }}` writes `questions={…}`.

A questions input that throws is now stated in the React panel ("The questions handed to the dock threw, so what has been asked cannot be shown: …") and the diagnostics poll keeps running, where before it stopped and every tab's reading froze. `DiagnosticsReading.questions`, for a reading taken elsewhere, is unchanged. With `@qadi/react`'s feed, `<DevtoolsDock {...feed} />` needs no edit.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
