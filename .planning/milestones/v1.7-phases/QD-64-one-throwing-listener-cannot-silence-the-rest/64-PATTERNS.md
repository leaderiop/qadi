# Phase 64: One throwing listener cannot silence the rest - Pattern Map

**Mapped:** 2026-11-20
**Analogs found:** all files have an in-repo analog (the seam itself has none for AggregateError)

## File Classification

| File | Role | Data Flow | Analog |
|------|------|-----------|--------|
| `packages/devtools/src/model/ExternalStore.ts` (modify `notify`, lines 37-39) | utility | event-driven (pub-sub) | itself |
| `packages/devtools/test/model/ExternalStore.test.ts` (add cases) | test | pub-sub | itself (lines 1-60) |
| `packages/devtools/test/model/{TimelineFeed,DiagnosticsFeed,GatesFeed}.test.ts` (add one case each) | test | pub-sub, through root | their own `it.effect` cases |
| Listener-contract texts (see below) | doc | n/a | existing text |
| `spec/decisions/177-*.md` + `spec/decisions/index.yaml` | ADR | n/a | ADR-QD-175 |
| `.changeset/<name>.md` | changeset | n/a | `.changeset/audit-sink-names-itself.md` |

## Findings per question

### 1. Test shape (ExternalStore.test.ts)
Plain sync `it` from `@effect/vitest` (not `it.effect`); imports the internal module by relative path (package-private, not in barrel):
```ts
import { assert, describe, it } from "@effect/vitest";
import { makeExternalStore } from "../../src/model/ExternalStore.ts";
describe("makeExternalStore", () => {
  it("...", () => {
    const store = makeExternalStore(0);
    const heard: Array<string> = [];
    const stopA = store.subscribe(() => heard.push("a"));
    store.set(1);
    assert.deepStrictEqual(heard, ["a"]);
  });
```
Use `assert.strictEqual`/`deepStrictEqual`. For throw cases, catch with try/catch and compare the caught value (reference-equal, `undefined` included; track a `threw` flag since the value may be falsy). `assert.instanceOf` / `assert.deepStrictEqual(err.errors, [...])` for AggregateError. Vitest env is happy-dom, include `test/**/*.test.ts(x)`.

The current seam to replace (`ExternalStore.ts` 37-39):
```ts
const notify = () => {
  for (const listener of listeners) listener();
};
```
Keep iterating the live `Set` (no copy). Decide by `errors.length`.

### 2. Feed tests through the root
All three import from `../../src/index.ts` (the root), not model files:
- `GatesFeed.test.ts` (lines 17-20): `import { AskedRead, RegistryRead, makeGatesFeed } from "../../src/index.ts"`, `makeGateRegistryDouble` from `../gateRegistryDouble.ts`, `settleTurns` from `../helpers.ts`. A helper at ~line 45 does `feed.subscribe(() => {...})`. Cases are `it.effect("G<n> ...")`. Add e.g. `G41`.
- `TimelineFeed.test.ts`: `feed.timeline.subscribe(...)` (lines 103, 188, 221, 392), `feed.status.subscribe` (82, 456, 498). Cases are `it.effect("TF<n> ...")`; TF24 (line 381) is the last pinned in BEH-QD-636. Add a case after the highest TF number; a throwing `timeline.subscribe` listener plus `timeline.accept(record)` is the shortest trigger (accept publishes).
- `DiagnosticsFeed.test.ts`: `feed.subscribe` (82, 568), `readout.subscribe` (508). Cases `F<n>`, e.g. F28 at 562.
Fit: one test per feed, in the feed's own file: subscribe a throwing listener then a second recording one, trigger a publish, assert the second ran and the throw surfaced (via the trigger's thrown value).

### 3. AggregateError precedent
`grep AggregateError packages/*/src` returned nothing. No precedent; use the platform `AggregateError(errors, message)`. (Run a grep for tests asserting a second throw's message before changing the seam, per CONTEXT.) Note house rules: no `as`/`any`; `throw` of an unknown value in sync non-Effect code is fine here (the seam is plain sync).

### 4. Texts to amend (exact current state)
- `TimelineFeed.ts:57`: `/** Registers a listener, and returns the function that removes it. A listener must not throw: it is not isolated. */` (status readout)
- `TimelineFeed.ts:65-66`: `A listener on its \`subscribe\` must not throw: it is not isolated, and it runs on every record.`
- `DiagnosticsFeed.ts:97`: `... A listener must not throw: it is not isolated, and a throw during a publish from the poll is stated as the poll's stop.` (keep poll-stop clause)
- `GatesFeed.ts:77`: `... A listener must not throw: it is not isolated.`; module doc lines ~7-13: "A listener on the feed's own `subscribe` is not guarded: it is the caller's and must not throw. Its throw escapes whatever published ... and one thrown on a tick ends the questions cadence without a statement."
- `packages/devtools/README.md:162-170` ("A `subscribe` listener is yours and is not isolated: it must not throw. A throw escapes ... gates feed's questions cadence ends, a diagnostics feed stays `Starting` with no poll, and a timeline restarted from `Stopped` says `Reading` with nothing reading.")
- `spec/behaviors/28-devtools-screens.md`: BEH-QD-636 is at line 2444 (requirements 2459-2463, no listener sentence yet; pinned line 2476). The gates BEH (the one at ~2536-2546, BEH-QD-638) says "A listener given to the feed's own `subscribe` is the caller's and is not guarded, so it MUST NOT throw (amended 2026-11-19, review iterations 2 and 3)". Also BEH-QD-637 (diagnostics, line 2478+) and line ~1982 / 2069 mention listeners; re-grep. Amendment style: a dated `> **Amended 2026-11-19 (...).**` blockquote under the requirements (see BEH-QD-636 lines 2465-2467) plus a Change History entry in the line-13 header table (newest first, "1.37 (2026-11-20): ...") and a new `## BEH-QD-656: ...` section in the same shape (Decision/Scope/Invariant blockquote, a ```` ``` ```` REQUIREMENT block, "Pinned by ...").
- Website: `grep -rn listener apps/website/src` returned no match, so the website does not mirror the README text. Do not touch `apps/website/dist/`. `Source.ts:242` leave alone.

### 5. Records conventions
- ADR file: `spec/decisions/175-a-negative-type-pin-can-fail.md` has a Document Control table (Document ID `QADI-ADR-175`, Revision, Effective Date, Status `Accepted — amends ADR-QD-037`, Change History), then `## Context`, decision, `## Related`. ADR-QD-177 file name: `177-<slug>.md`.
- Index entry (`spec/decisions/index.yaml` 549-552):
```yaml
  - id: "ADR-QD-175"
    file: "175-a-negative-type-pin-can-fail.md"
    title: "A negative type pin can fail"
    status: "Accepted — amends ADR-QD-037"
```
  Add `ADR-QD-177` after (ids 176 may exist, check the tail of the file).
- ADR amendment note: ADR-QD-173 (`spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md`) Status is `Accepted — amends ADR-QD-047, ADR-QD-099, ADR-QD-169; applies ADR-QD-137`; its closing paragraph (line ~97-98) says earlier ADRs "are each amended in a dated paragraph; none is rewritten". Do the same: add a dated "Amended 2026-11-20 (ADR-QD-177)" paragraph, extend Status, bump Revision/Change History via `scripts/spec-revise.mjs --date 2026-11-20`.
- CCR register: `spec/README.md` rows like line 391 `| CCR-QD-454 | 2026-11-20 | <files list with Rev numbers> | ARCH-110. **bold headline** ... |`; header Change History at line 13 is `1.262 (2026-11-20): CCR-QD-454 registered (ARCH-110)`, so the next is 1.263. Add CCR-QD-455 row after 454, naming D7 out of scope and any unused reserved id.
- BEH/INV/traceability: INV lives in `spec/invariants.md` (e.g. INV-QD-365 at line ~4251, anchor `#inv-qd-365-...`); highest in use found is 365/366, so 373-374 are reserved, nothing existing at BEH-QD-655/INV-QD-372 in the greps. Traceability rows in `spec/traceability.md`: ADR row at line 366 (`| [ADR-QD-173](...) | title | [BEH-QD-636](...) ...`) and per-test-file rows at ~601-602 (`| \`packages/devtools/test/surface.test.ts\` | ADR-..., BEH-..., INV-... — note |`). Add rows for the new ADR, BEH-656..660, INV-373/374 and the test files touched. Run the gates (`pnpm check` pieces for spec/traceability) after.
- Changeset (`.changeset/audit-sink-names-itself.md`):
```md
---
"@qadi/audit": patch
---

`AuditDecisionSinkLive` names itself ... Nothing else changes.
```
  Use `"@qadi/devtools": patch` with one sentence on the new listener contract.

### 6. Nested store path (`TimelineFeed.ts` 112-163)
`view = makeExternalStore<Timeline>(...)`; `const push = () => view.publish(inner.getSnapshot()); inner.subscribe(push);`. So a throwing host listener on `view` makes `view.publish` throw an error (or AggregateError); `push` is itself a listener of `inner`, so `inner`'s notify collects it as one thrown value: a single case is rethrown as-is, and with another throwing inner listener it becomes an element of the outer `errors` (nested, never flattened). `configure` also calls `inner.subscribe(push); push();` on resize. Pin in ExternalStore.test.ts with two nested stores (outer listener throws; inner listener = `() => outer.publish(x)`; a second inner listener throws).

### 7. Dock characterisation tests
`packages/devtools/test/react/`: `QuestionsPanel.characterisation.test.tsx`, `QuestionsPanel.feed.characterisation.test.tsx`, `ServicesPanel.characterisation.test.tsx` (all tracked), plus `useStoreSnapshot.test.tsx`. They run with the normal devtools vitest project (`packages/devtools/vitest.config.ts`, include `test/**/*.test.tsx`, happy-dom); e.g. `pnpm vitest run --project devtools packages/devtools/test/react` (verify the exact flag). Phase requirement: `git diff` on them stays empty.

## Shared Patterns
- Test: sync `it` + `assert` from `@effect/vitest`; relative `.ts` import extension.
- Mutation set: assert the fixed `AggregateError` message literal and the 0/1/2 length boundaries.
- Records: reserved ids only (no `next-id.mjs`), `spec-revise.mjs --date 2026-11-20`.

## No Analog Found
| File | Reason |
|------|--------|
| `AggregateError` use in src | none exists in `packages/*/src` |

## Metadata
Searched: `packages/devtools/{src,test}`, `spec/`, `.changeset/`, `apps/website/src`. Did not read ADR-QD-173 body in full or the INV-QD entry shape beyond the 365 pointer; verify spec gate wording by running them.
