# Phase QD-82 deferred items

## LT5 is not stable when it is the first test a run executes (found in 82-03, from 82-02)

`pnpm exec vitest run --project react packages/react/test/QadiProvider.lifetime.test.tsx -t "LT5 " < /dev/null` fails on the
phase base in 5 of 6 runs (and in 3 of 3 runs of the 82-02 file as committed at `f2501057`): `expect(caught).toEqual([])`
holds three `registry is disposed` errors. Run after LT1 to LT4, as the whole file does, it passes every time (checked in
five full-file runs).

Cause, as far as it was looked at: LT5's short hide is `await hide(); await show();`, two awaited async `act` calls. In a cold
run the first `act` is slow enough for the provider's `setTimeout` to fire between them, so the "short" hide is a long one.
The 82-03 tests avoid it where they need a short hide by flipping the mode in two synchronous `act` calls (`flip` in the
rig of the lifetime file, LT15).

Left alone on purpose: 82-03 must keep LT1 to LT8 exactly as 82-02 committed them. A later plan that runs LT5 alone
(a `-t "LT5 "` verify, or a mutation run that isolates it) should change its short hide to `flip("hidden")` then
`flip("visible")` first, or run it with the file.
