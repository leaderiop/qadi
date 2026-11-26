# Phase 91 stale sweep

The search runs, from the repository root, for each of `PortSpanDecode.ts`, `PortInterpreter.ts`, `GateRegistry.ts`, `SequenceIntegrity.ts`, `Hydration.ts` (react's, deleted; devtools' `model/Hydration.ts` and the type test `Hydration.tst.ts` are other files) and `devtools-named-barrel`:

```
/usr/bin/grep -rnF '<pattern>' spec packages/*/README.md packages/*/src apps examples AGENTS.md CONTRIBUTING.md scripts stryker*.mjs \
  --exclude-dir=.next --exclude-dir=node_modules --exclude-dir=lib --exclude-dir=dist --exclude-dir=.astro
```

Build output (`.next`, `node_modules`, `lib`, `dist`, `.astro`) is not a source and is excluded, decided autonomously. A hit's line number is the line at the sweep commit. A line that holds two patterns is one row. The test file `packages/react/test/ServerRender.test.tsx` is outside the search's directories; the owner's rule to prefer fixing it brought its one comment in, under a declared region.

## Before

Hits before any edit of the sweep (the earlier plans' edits had already landed), each cut at 170 characters:

| pattern | in `spec` | elsewhere |
| ------- | --------- | --------- |
| `PortSpanDecode.ts` | 7 | 0 |
| `PortInterpreter.ts` | 11 | 0 |
| `GateRegistry.ts` | 33 | 0 |
| `SequenceIntegrity.ts` | 25 | 3 |
| `Hydration.ts` | 42 | 13 |
| `devtools-named-barrel` | 4 | 0 |

```
### PortSpanDecode.ts
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:78:> a file the other side of an edge imports, that the cycle rule keeps apart. `PortSpanDecode.ts`, …
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:263:**Folded, each acyclic with `tsc` clean:** `PortSpanDecode.ts` into `PortSpanEncode.ts`; `PortIn …
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:268:**Refused, each a cycle:** `PortInterpreter.ts` into `PortSpanEncode.ts` and `PortSpanDecode.ts` …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:26:  barrel: `PortSpanDecode.ts` (one function, `decodePortSpan`), `PortInterpreter.ts` (the int …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:77:| `a` | `PortSpanDecode.ts` into `PortSpanEncode.ts` (core) | none; 250 files | exit 0 | fold …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:80:| `b-double-prime` | `PortSpanDecode.ts` into `PortSpan.ts` | the same cycle | exit 0 | refus …
spec/traceability.md:542:| [ADR-QD-204](decisions/204-named-barrels-and-visibility-only-files-folded-away.md) | Named barrels, and visibility-only files folded away: the  …
### PortInterpreter.ts
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:78:> a file the other side of an edge imports, that the cycle rule keeps apart. `PortSpanDecode.ts`, …
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:263:**Folded, each acyclic with `tsc` clean:** `PortSpanDecode.ts` into `PortSpanEncode.ts`; `PortIn …
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:268:**Refused, each a cycle:** `PortInterpreter.ts` into `PortSpanEncode.ts` and `PortSpanDecode.ts` …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:26:  barrel: `PortSpanDecode.ts` (one function, `decodePortSpan`), `PortInterpreter.ts` (the int …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:78:| `b` | `PortInterpreter.ts` into `PortSpan.ts` (core) | none; 250 files | exit 0 | fold | `9 …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:79:| `b-prime` | `PortInterpreter.ts` into `PortSpanEncode.ts` | 1 cycle, `PortSpan.ts` and `Por …
spec/decisions/107-a-port-is-answered-remotely-through-its-description.md:84:  (`PortInterpreter.ts`) as a schema with the type derived, which removes the double statemen …
spec/decisions/107-a-port-is-answered-remotely-through-its-description.md:167:> the Decision bullet above says `PortInterpreter.ts`, read `PortSpan.ts` ([ADR-QD-204](204- …
spec/decisions/051-a-span-says-what-was-asked.md:204:(`PortInterpreter.ts`, a schema with the type derived). `"remote"` is a host answering another process's
spec/decisions/051-a-span-says-what-was-asked.md:227:> 2026-10-08 amendment says `PortInterpreter.ts`, read `PortSpan.ts` ([ADR-QD-204](204-named-barrels-and-visibility-o …
spec/traceability.md:542:| [ADR-QD-204](decisions/204-named-barrels-and-visibility-only-files-folded-away.md) | Named barrels, and visibility-only files folded away: the  …
### GateRegistry.ts
spec/invariants.md:13:> | Change History | 1.236 (2026-11-26): INV-QD-427 and INV-QD-428 new: a public root names each export once at one module and no packed declaration …
spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:51:  `GateRegistry.ts`) and below `QadiProvider.tsx`. It may therefore import neither, nor
spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:52:  `GateRegistry.ts`, without a cycle (ADR-QD-037). So the scope is typed structurally
spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:127:side and a leaf below `GateRegistry.ts`. The text above is history and stays as written;
spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:142:  `GateWriter.ts` is still below `GateRegistry.ts` and imports neither it nor
spec/decisions/053-a-gate-can-be-found.md:56:`GateRegistry.ts` is a module-scope `Map` a guard writes to from an effect. An
spec/decisions/053-a-gate-can-be-found.md:162:> has no dependency on `@qadi/react` — `GateRegistry.ts` lives in `@qadi/react` —
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:79:> `GateRegistry.ts`, `SequenceIntegrity.ts` and react's `Hydration.ts` were not cycle-breakers; e …
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:264:`PortSpan.ts`; `GateRegistry.ts` into `GateWriter.ts`; `SequenceIntegrity.ts` into `ArchiveFacts …
spec/decisions/014-react-via-atoms.md:57:> **Still one call, after ADR-QD-053.** `GateRegistry.ts` is a second external
spec/decisions/014-react-via-atoms.md:210:ADR-QD-017/AGENTS.md §13), `GateRegistry.ts` (ADR-QD-053's guard-existence
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:26:  barrel: `PortSpanDecode.ts` (one function, `decodePortSpan`), `PortInterpreter.ts` (the int …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:81:| `c` | `GateRegistry.ts` into `GateWriter.ts` (react) | none; 250 files | exit 0 | fold | `4 …
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:22:below `GateRegistry.ts`, because `GateRegistry.ts` builds the registry through it and
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:23:`QadiAtoms.ts` imports `GateRegistry.ts`. The **hooks** (`useGates`, `useGateRegistrations`,
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:34:ARCH-76's review proposed moving the registry types up into `GateRegistry.ts`. That does
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:37:- `GateRegistry.ts` is an `export *` barrel module, so whatever it exports is public. The
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:41:  the class in `GateRegistry.ts` publishes `gateWriterFor`.
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:42:- Keeping the class in a private module while its types move up to `GateRegistry.ts` makes
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:43:  that module import `GateRegistry.ts` for the types while `GateRegistry.ts` imports it for
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:61:**`GateWriter.ts` is the React-free write side, a leaf below `GateRegistry.ts`; `useGate.ts`
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:100:- **The edge list after the split.** `GateRegistry.ts` imports `GateWriter.ts` and
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:101:  `DeveloperSignals.ts`. `QadiAtoms.ts` imports `GateRegistry.ts`, `HydrationEngine.ts`,
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:108:- **A future reviewer's proposal to publish the registry types from `GateRegistry.ts`
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:129:- **The review's form: the registry types in `GateRegistry.ts`.** Publishes
spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:169:> where this record says `GateRegistry.ts`, read `GateWriter.ts`. The leaf's one local import is
spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md:50:> has no dependency on `@qadi/react` — `GateRegistry.ts` lives in `@qadi/ …
spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md:161:stay in `GateWriter.ts`, now a React-free leaf below `GateRegistry.ts`, and every semantic
spec/traceability.md:542:| [ADR-QD-204](decisions/204-named-barrels-and-visibility-only-files-folded-away.md) | Named barrels, and visibility-only files folded away: the  …
spec/README.md:326:| CCR-QD-388 | 2026-11-08 | `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md` (new), `spec/decisions/index.yaml`, `spec/decisions/ …
spec/README.md:356:| CCR-QD-418 | 2026-11-11 | `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md` Rev 1.0 (new), `spec/decisions/111-a-gate-writer-is …
spec/behaviors/25-inspection.md:991:and the conclusion false: `GateRegistry.ts` was a module-scope map a guard
spec/process/house-rules-evidence.md:237:  > **Corrected in CCR-QD-160.** This bullet used to say `GateRegistry.ts` "is a
### SequenceIntegrity.ts
spec/overview.md:13:> | Change History | 1.148 (2026-11-26): The Source cells of decodePortSpan, PortInterpreter, the gate registry rows, the hydration rows and the audit …
spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md:72:   fail `SequenceIntegrityError` for the sequence alone and `SequenceIntegrity.ts` re-exports two na …
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:79:> `GateRegistry.ts`, `SequenceIntegrity.ts` and react's `Hydration.ts` were not cycle-breakers; e …
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:264:`PortSpan.ts`; `GateRegistry.ts` into `GateWriter.ts`; `SequenceIntegrity.ts` into `ArchiveFacts …
spec/decisions/110-an-archives-facts-are-computed-once.md:22:through `SequenceIntegrity.ts` and the reader reached it directly. ADR-QD-056, BEH-QD-254 and
spec/decisions/110-an-archives-facts-are-computed-once.md:23:INV-QD-054 named `verifySequenceIntegrity`/`SequenceIntegrity.ts` as where the rule lives.
spec/decisions/110-an-archives-facts-are-computed-once.md:46:- `SequenceBreak.ts` is removed. `SequenceIntegrity.ts` re-exports `verifySequenceIntegrity` and
spec/decisions/110-an-archives-facts-are-computed-once.md:55:  `SequenceNumberInvalid` is public, re-exported through `SequenceIntegrity.ts` with the other two.
spec/decisions/110-an-archives-facts-are-computed-once.md:81:- A scoped mutation run over `ArchiveFacts.ts`, `AuditArchive.ts` and `SequenceIntegrity.ts`
spec/decisions/110-an-archives-facts-are-computed-once.md:82:  (`pnpm exec stryker run stryker.audit.mjs --mutate packages/audit/src/ArchiveFacts.ts,packages/audit/src/Au …
spec/decisions/110-an-archives-facts-are-computed-once.md:86:- The "gap-and-duplicate, not tamper-evidence" disclaimer in INV-QD-054 and `SequenceIntegrity.ts` is
spec/decisions/110-an-archives-facts-are-computed-once.md:98:**Keep the definitions in `SequenceIntegrity.ts` and import the error into the facts module.** Then
spec/decisions/110-an-archives-facts-are-computed-once.md:125:`SequenceNumberInvalid` are removed, and `SequenceIntegrity.ts` re-exports `verifySequenceIntegrity` and
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:27:  (the gate registry constructor), `SequenceIntegrity.ts` (the sequence check's public home)  …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:82:| `d` | `SequenceIntegrity.ts` into `ArchiveFacts.ts` (audit) | none; 250 files | exit 0 | fo …
spec/decisions/056-audit-companion-package.md:13:> | Change History | 1.18 (2026-11-24): amendment: the refusals are EntriesNotAList and EntryNotMadeByCodec (ADR-QD-190,  …
spec/decisions/056-audit-companion-package.md:133:**Retention and archival** (`Retention.ts`, `SequenceIntegrity.ts`,
spec/decisions/056-audit-companion-package.md:423:([ADR-QD-110](110-an-archives-facts-are-computed-once.md)). `SequenceIntegrity.ts`, named under
spec/decisions/056-audit-companion-package.md:462:The 2026-11-08 amendment (ADR-QD-110, CCR-QD-387) named `SequenceNumberInvalid`, re-exported by `SequenceIntegrity.ts`.
spec/decisions/056-audit-companion-package.md:464:`archiveAuditTrail` has a number to refuse, and `SequenceIntegrity.ts` re-exports `verifySequenceIntegrity` and
spec/traceability.md:542:| [ADR-QD-204](decisions/204-named-barrels-and-visibility-only-files-folded-away.md) | Named barrels, and visibility-only files folded away: the  …
spec/README.md:325:| CCR-QD-387 | 2026-11-08 | `spec/decisions/110-an-archives-facts-are-computed-once.md` (new), `spec/decisions/index.yaml`, `spec/decisions/056-audit-c …
spec/README.md:406:| CCR-QD-469 | 2026-11-23 | `spec/README.md` Rev 1.357 (this row), `spec/behaviors/33-audit-pipeline.md` Rev 1.32 (BEH-QD-721 and BEH-QD-722 new; BEH-Q …
spec/README.md:518:| CCR-QD-094 | 2026-09-06 | `INV-QD-054`, `BEH-QD-254` and ADR-QD-056 renamed — `verifyChainIntegrity`/`ChainIntegrityError` (`ChainIntegrity.ts`) read …
spec/urs.md:13:> | Change History | 1.24 (2026-11-26): the sequence check is cited at ArchiveFacts.ts (ARCH-138, CCR-QD-483)<br>1.23 (2026-09-07): §3 re-sorted into ascen …
packages/audit/src/AuditArchive.ts:112:     * `SequenceIntegrity.ts` — and not a claim about `keyMaterial` below,
packages/audit/src/AuditDecisionSinkLive.ts:16: * [SequenceIntegrity.ts](./SequenceIntegrity.ts), [AuditArchive.ts](./AuditArchive.ts)) and
packages/audit/src/AuditEntry.ts:92: * ([SequenceIntegrity.ts](./SequenceIntegrity.ts)).
### Hydration.ts
spec/overview.md:13:> | Change History | 1.148 (2026-11-26): The Source cells of decodePortSpan, PortInterpreter, the gate registry rows, the hydration rows and the audit …
spec/overview.md:926:| `HydrationActivity`, `HydrationDrops` | type | `model/Hydration.ts` |
spec/overview.md:927:| `hydrationActivity` | effect | `model/Hydration.ts` |
spec/overview.md:928:| `unaccountedEntries`, `hasHydrated` | function | `model/Hydration.ts` |
spec/invariants.md:2763:**Enforcement**: `Hydration.tst.ts` pins `ClientDecision` as the closed four-case
spec/invariants.md:3933:**Enforcement**: `packages/core/test/HydrationMetrics.tst.ts` (the partition, the kinds written out, a kind-less and a fourth-kind row refused), ` …
spec/invariants.md:3977:**Enforcement**: the property, the key-set pin and the golden in `packages/react/test/HydrationSeedFields.test.ts` (the property fails if the seed …
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:79:> `GateRegistry.ts`, `SequenceIntegrity.ts` and react's `Hydration.ts` were not cycle-breakers; e …
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:265:`Hydration.ts` into `HydrationEngine.ts`, after `hydrateDecisions` took a package-private struct …
spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:270:other, so the interpreter set sits with the types and the decoder with the machinery); `Hydratio …
spec/decisions/198-the-hydration-block-is-a-model-row.md:57:   imports `effect/Data` and `Hydration.ts` and nothing from React, and its sentences are built inside functio …
spec/decisions/014-react-via-atoms.md:211:registry) and `Hydration.ts`/`HydrationWarning.ts` (ADR-QD-041/052's
spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:43:`Hydration.ts`, the seed lookup in `HydrationSeed.ts`, the precedence, announcement
spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:58:`DecisionSchema` and `Hydration.ts`'s `DehydratedEntryFields` each hand-wrote an
spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:79:**One deep module in `@qadi/react`.** `Hydration.ts` is the public interface and
spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:170:**Both directions of the payload have one owner.** `HydrationEngine.ts` gains `dehydrateWith …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:27:  (the gate registry constructor), `SequenceIntegrity.ts` (the sequence check's public home)  …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:83:| `e` | `Hydration.ts` into `HydrationEngine.ts` as written (react) | 1 cycle, `QadiAtoms.ts` …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:85:| `e-prime-fold` | `HydrationTarget`, then `Hydration.ts` into `HydrationEngine.ts` | none; 2 …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:112:HydrationTarget, …)`. `Hydration.ts` loses its `QadiAtoms` import, which is what lets the fi …
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:204:- **Fallback to keeping `Hydration.ts`** and recording the cycle (a fold of `dehydrateDecisi …
spec/decisions/072-schema-taggederror-for-accessdenied-and-undischargedobligation.md:75:`@qadi/react`'s `Hydration.ts`; this is a third consumer of the same
spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md:67:   `Hydration.tst.ts` pins its two groups written out.
spec/traceability.md:13:> | Change History | 1.336 (2026-11-26): the ADR-QD-204 row, the rows of the three surface tests and HydrationTarget.tst.ts, the tool cell naming  …
spec/traceability.md:61:| [19 — Decision Hydration](behaviors/19-hydration.md) (BEH-QD-146, BEH-QD-152, BEH-QD-230 and BEH-QD-231 amended in CCR-QD-398; BEH-QD-230 and BE …
spec/traceability.md:264:| [INV-QD-323](invariants.md#inv-qd-323-each-hydration-drop-reason-has-exactly-one-kind-and-the-kinds-partition-the-reasons) | Each hydration dro …
spec/traceability.md:267:| [INV-QD-333](invariants.md#inv-qd-333-a-seeds-fields-are-the-wires) | A seed's fields are the wire's | `AllowSeedFields`/`DenySeedFields` in `S …
spec/traceability.md:378:| [INV-QD-059](invariants.md#inv-qd-059-a-seeded-decision-never-claims-a-trace-it-was-not-given) | A seeded decision never claims a trace it was  …
spec/traceability.md:542:| [ADR-QD-204](decisions/204-named-barrels-and-visibility-only-files-folded-away.md) | Named barrels, and visibility-only files folded away: the  …
spec/traceability.md:636:| `packages/react/test/Hydration.tst.ts` | BEH-QD-145, BEH-QD-148, INV-QD-059 (`tstyche`: `ClientDecision` is the closed four-case union and `isA …
spec/README.md:13:> | Change History | 1.417 (2026-11-26): the CCR-QD-483 row, naming the documents it revises so far (CCR-QD-483)<br>1.416 (2026-11-26): the CCR-QD-482 r …
spec/README.md:328:| CCR-QD-390 | 2026-11-08 | `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md` Rev 1.3 and `spec/decisions/index.yaml`, `spec/ …
spec/README.md:336:| CCR-QD-398 | 2026-11-10 | `spec/behaviors/19-hydration.md` Rev 1.16 (BEH-QD-146, BEH-QD-152, BEH-QD-230, BEH-QD-231 amended), `spec/invariants.md` Re …
spec/README.md:367:| CCR-QD-430 | 2026-11-14 | `spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md` (new), `spec/decisions/index.yaml`, `spec/d …
spec/README.md:370:| CCR-QD-433 | 2026-11-14 | `spec/decisions/155-a-seeded-question-owns-its-computing-atom.md` (new, Rev 1.0), `spec/decisions/index.yaml`, `spec/decisi …
spec/README.md:372:| CCR-QD-435 | 2026-11-15 | `spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md` (new, Rev 1.3), `spec/decisions/index.yaml`, `spec/decisio …
spec/README.md:436:| CCR-QD-203 | 2026-10-08 | `spec/decisions/041-a-mismatch-is-announced.md` Rev 1.3, `spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md` Re …
spec/README.md:471:| CCR-QD-156 | 2026-10-04 | ADR-QD-078 (new), ADR-QD-028/039/041/052 amended, `spec/behaviors/19-hydration.md` Rev 1.8, `spec/behaviors/09-react.md` Re …
spec/README.md:484:| CCR-QD-144 | 2026-09-09 | `spec/behaviors/19-hydration.md` Rev 1.7, `spec/traceability.md` Rev 1.67 (issue #105) — BEH-QD-230 gains an explicit requi …
spec/README.md:489:| CCR-QD-139 | 2026-09-08 | `spec/overview.md` Rev 1.16, `spec/traceability.md` Rev 1.62, `spec/behaviors/19-hydration.md` Rev 1.6 (issue #78) — untrus …
spec/behaviors/19-hydration.md:290:allow sent without `visibleFields`), `packages/react/test/Hydration.tst.ts` (a seed's
spec/behaviors/19-hydration.md:930:`SinkCodec.ts`) had named `Hydration.ts` as the one recursive decode boundary
packages/core/src/Decision.ts:69: * `Hydration.ts` (a `Trace` crosses a trust boundary there too), and now
packages/core/src/FieldLattice.ts:71: * `Explanation.ts`, `TraceDiff.ts`, `@qadi/react`'s `Hydration.ts` and
packages/devtools/src/model/Gates.ts:58: * the reason `PortCalls.ts` gives about span attributes and `Hydration.ts` gives
packages/devtools/src/model/Diagnostics.ts:49:import { hydrationActivity, type HydrationActivity } from "./Hydration.ts";
packages/devtools/src/model/HydrationView.ts:18:import { unaccountedEntries } from "./Hydration.ts";
packages/devtools/src/model/HydrationView.ts:19:import type { HydrationActivity, HydrationDrops } from "./Hydration.ts";
packages/devtools/src/index.ts:53:export { hasHydrated, hydrationActivity, unaccountedEntries } from "./model/Hydration.ts";
packages/devtools/src/index.ts:54:export type { HydrationActivity, HydrationDrops } from "./model/Hydration.ts";
packages/react/src/SeededDecision.ts:15: * barrel; `Hydration.ts` re-exports by name what a consumer may hold.
packages/react/src/SeededQuestion.ts:18: * `QadiProvider.tsx` or `Hydration.ts`, so no cycle (counting `import type`
packages/react/src/HydrationEvent.ts:23: * and re-exported **by name** from `Hydration.ts`; it lives here because the
AGENTS.md:576:| `packages/react/test/Hydration.tst.ts` | 1 | 0 | `isAllowed`: plain return |
scripts/check-house-style.mjs:780:  "packages/react/test/Hydration.tst.ts": { callable: 1, constructable: 0 },
### devtools-named-barrel
spec/decisions/047-a-headless-devtools-model.md:224:> and the house-style rule `devtools-named-barrel` refuses an `export *` there.
spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:170:  `@qadi/devtools`' two barrels had under the name `devtools-named-barrel`.
spec/decisions/099-entry-points-are-a-closed-list.md:85:lines as well as on one, and the house-style rule `devtools-named-barrel` forbids `export *`
spec/README.md:318:| CCR-QD-321 | 2026-10-08 | `spec/decisions/047-a-headless-devtools-model.md` Rev 1.6, `spec/decisions/099-entry-points-are-a-closed-list.md` Rev 1.1,  …
```

## Fixed

| hit | pattern | verdict | change |
| --- | ------- | ------- | ------ |
| `packages/audit/src/AuditArchive.ts:112` | `SequenceIntegrity.ts` | fixed | `SequenceIntegrity.ts` → `ArchiveFacts.ts` in the disclaimer's pointer; the claim is unchanged |
| `packages/audit/src/AuditDecisionSinkLive.ts:16` | `SequenceIntegrity.ts` | fixed | the link `SequenceIntegrity.ts` → `ArchiveFacts.ts` in the list of retention and archival modules |
| `packages/audit/src/AuditEntry.ts:92` | `SequenceIntegrity.ts` | fixed | the link after `verifySequenceIntegrity` → `ArchiveFacts.ts`, where it is declared |
| `packages/core/src/Decision.ts:69` | `Hydration.ts` | fixed | `@qadi/react`'s `Hydration.ts` → `HydrationEngine.ts`, the module that holds the payload codec |
| `packages/core/src/FieldLattice.ts:71` | `Hydration.ts` | fixed | `@qadi/react`'s `Hydration.ts` → `HydrationEngine.ts` |
| `packages/react/src/SeededDecision.ts:15` | `Hydration.ts` | fixed | "`Hydration.ts` re-exports by name what a consumer may hold" → the barrel names, from this module, what a consumer may hold |
| `packages/react/src/SeededQuestion.ts:18` | `Hydration.ts` | fixed | `Hydration.ts` dropped from the list of modules this file imports nothing from, re-wrapped (three lines) |
| `packages/react/src/HydrationEvent.ts:23` | `Hydration.ts` | fixed | "re-exported by name from `Hydration.ts`" → the root names `DecisionEntry` from this module |
| `packages/react/test/ServerRender.test.tsx:189` | `Hydration.ts` | fixed | comment only: `Hydration.ts` → `HydrationEngine.ts`, which is the module without `"use client"` that holds `dehydrateDecisions`; the region is declared in `91-pinned-check.mjs` under this commit's subject |
| `spec/decisions/014-react-via-atoms.md:210` | `GateRegistry.ts` | fixed | the module inventory: `GateRegistry.ts` → `GateWriter.ts` |
| `spec/decisions/014-react-via-atoms.md:211` | `Hydration.ts` | fixed | the module inventory: `Hydration.ts` → `HydrationEngine.ts` |
| `spec/decisions/014-react-via-atoms.md:221` | `GateRegistry.ts, Hydration.ts` | fixed | a dated note (no revision row: the decision has no Document Control block) says where the registry and the entry points live |
| `spec/decisions/047-a-headless-devtools-model.md:224` | `devtools-named-barrel` | fixed | the rule's name `devtools-named-barrel` → `named-barrel` (inside the revision this phase already made) |
| `spec/decisions/099-entry-points-are-a-closed-list.md:85` | `devtools-named-barrel` | fixed | the rule's name `devtools-named-barrel` → `named-barrel` (inside the revision this phase already made) |
| `spec/decisions/056-audit-companion-package.md:133` | `SequenceIntegrity.ts` | fixed | the retention inventory: `SequenceIntegrity.ts` → `ArchiveFacts.ts`; one bump, 1.18 to 1.19 |
| `spec/decisions/056-audit-companion-package.md:475` | `SequenceIntegrity.ts` | fixed | a dated note says to read `ArchiveFacts.ts` where an amendment says `SequenceIntegrity.ts` |
| `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:189` | `Hydration.ts` | fixed | a dated note says `Hydration.ts` is folded into `HydrationEngine.ts`; one bump, 1.5 to 1.6 |
| `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:175` | `GateRegistry.ts` | fixed | a dated note says to read `GateWriter.ts` where the record says `GateRegistry.ts`; one bump, 1.3 to 1.4 |
| `spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md:477` | `SequenceIntegrity.ts` | fixed | a dated note says to read `ArchiveFacts.ts` where the Decision says `SequenceIntegrity.ts` re-exports two names; one bump, 1.7 to 1.8 |
| `spec/README.md:420` | `(CCR-QD-483 row)` | fixed | the CCR-QD-483 row names each document and file the sweep fixed (grown in place; the README is not bumped again) |

## Remaining

The search again after the fixes; every hit is a row, in `file:line` order of the search.

| hit | pattern | verdict | reason |
| --- | ------- | ------- | ------ |
| `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:78` | `PortSpanDecode.ts`, `PortInterpreter.ts` | history | this change's own record of the folds and the refused folds, in the decision that sets the cycle rule |
| `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:263` | `PortSpanDecode.ts`, `PortInterpreter.ts` | history | this change's own record of the folds and the refused folds, in the decision that sets the cycle rule |
| `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:268` | `PortSpanDecode.ts`, `PortInterpreter.ts` | history | this change's own record of the folds and the refused folds, in the decision that sets the cycle rule |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:26` | `PortSpanDecode.ts`, `PortInterpreter.ts`, `GateRegistry.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:77` | `PortSpanDecode.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:80` | `PortSpanDecode.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/traceability.md:542` | `PortSpanDecode.ts`, `PortInterpreter.ts`, `GateRegistry.ts`, `SequenceIntegrity.ts`, `Hydration.ts` | history | this change's own row |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:78` | `PortInterpreter.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:79` | `PortInterpreter.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/107-a-port-is-answered-remotely-through-its-description.md:84` | `PortInterpreter.ts` | history | the Decision's own account; the dated note says to read `PortSpan.ts` |
| `spec/decisions/107-a-port-is-answered-remotely-through-its-description.md:167` | `PortInterpreter.ts` | history | the dated note's own words: it names the old path to say where it moved |
| `spec/decisions/051-a-span-says-what-was-asked.md:204` | `PortInterpreter.ts` | history | the amendment's own account; the dated note says to read `PortSpan.ts` |
| `spec/decisions/051-a-span-says-what-was-asked.md:227` | `PortInterpreter.ts` | history | the dated note's own words: it names the old path to say where it moved |
| `spec/invariants.md:13` | `GateRegistry.ts` | history | a Change History row |
| `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:13` | `GateRegistry.ts` | history | a Change History row |
| `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:51` | `GateRegistry.ts` | history | the Decision's own account and its 2026-11-11 cross-amendment as written; the note at the end of the record says where the registry lives |
| `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:52` | `GateRegistry.ts` | history | the Decision's own account and its 2026-11-11 cross-amendment as written; the note at the end of the record says where the registry lives |
| `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:127` | `GateRegistry.ts` | history | the Decision's own account and its 2026-11-11 cross-amendment as written; the note at the end of the record says where the registry lives |
| `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:142` | `GateRegistry.ts` | history | the Decision's own account and its 2026-11-11 cross-amendment as written; the note at the end of the record says where the registry lives |
| `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:176` | `GateRegistry.ts` | history | the dated note's own words: it names the old path to say where it moved |
| `spec/decisions/053-a-gate-can-be-found.md:56` | `GateRegistry.ts` | history | the original decision, which the record marks as kept for the record, and its dated correction; each is history |
| `spec/decisions/053-a-gate-can-be-found.md:162` | `GateRegistry.ts` | history | the original decision, which the record marks as kept for the record, and its dated correction; each is history |
| `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:79` | `GateRegistry.ts`, `SequenceIntegrity.ts`, `Hydration.ts` | history | this change's own record of the folds and the refused folds, in the decision that sets the cycle rule |
| `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:264` | `GateRegistry.ts`, `SequenceIntegrity.ts` | history | this change's own record of the folds and the refused folds, in the decision that sets the cycle rule |
| `spec/decisions/014-react-via-atoms.md:57` | `GateRegistry.ts` | history | the 2026-08 amendment's own account at ADR-QD-053; the note at the end of the record says where the registry lives |
| `spec/decisions/014-react-via-atoms.md:223` | `GateRegistry.ts` | history | the dated note's own words: it names the old path to say where it moved |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:81` | `GateRegistry.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:22` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:23` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:34` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:37` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:41` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:42` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:43` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:61` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:100` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:101` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:108` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:129` | `GateRegistry.ts` | history | the Decision's own account of the leaf below the registry module; the note at the end of the record says where the registry lives |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:169` | `GateRegistry.ts` | history | the dated note's own words: it names the old path to say where it moved |
| `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md:50` | `GateRegistry.ts` | history | the dated correction's own account of what the paragraph used to say |
| `spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md:161` | `GateRegistry.ts` | history | an amendment's own account; the note after it says where the registry lives |
| `spec/README.md:326` | `GateRegistry.ts` | history | a register row naming what the change it records touched |
| `spec/README.md:356` | `GateRegistry.ts` | history | a register row naming what the change it records touched |
| `spec/behaviors/25-inspection.md:991` | `GateRegistry.ts` | history | a past-tense account ("was a module-scope map") of what ADR-QD-053 found, with where it lives now in the same sentence |
| `spec/process/house-rules-evidence.md:237` | `GateRegistry.ts` | history | a quoted correction of what an earlier bullet used to say |
| `spec/overview.md:13` | `SequenceIntegrity.ts`, `Hydration.ts` | history | a Change History row |
| `spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md:13` | `SequenceIntegrity.ts` | history | a Change History row |
| `spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md:72` | `SequenceIntegrity.ts` | history | the Decision's own account when taken; the note at the end of the record says where the check lives |
| `spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md:478` | `SequenceIntegrity.ts` | history | the dated note's own words: it names the old path to say where it moved |
| `spec/decisions/110-an-archives-facts-are-computed-once.md:22` | `SequenceIntegrity.ts` | history | the Decision's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/110-an-archives-facts-are-computed-once.md:23` | `SequenceIntegrity.ts` | history | the Decision's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/110-an-archives-facts-are-computed-once.md:46` | `SequenceIntegrity.ts` | history | the Decision's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/110-an-archives-facts-are-computed-once.md:55` | `SequenceIntegrity.ts` | history | the Decision's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/110-an-archives-facts-are-computed-once.md:81` | `SequenceIntegrity.ts` | history | the Decision's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/110-an-archives-facts-are-computed-once.md:82` | `SequenceIntegrity.ts` | history | the Decision's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/110-an-archives-facts-are-computed-once.md:86` | `SequenceIntegrity.ts` | history | the Decision's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/110-an-archives-facts-are-computed-once.md:98` | `SequenceIntegrity.ts` | history | the Decision's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/110-an-archives-facts-are-computed-once.md:125` | `SequenceIntegrity.ts` | history | the Decision's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:27` | `SequenceIntegrity.ts`, `Hydration.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:82` | `SequenceIntegrity.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/056-audit-companion-package.md:13` | `SequenceIntegrity.ts` | history | a Change History row |
| `spec/decisions/056-audit-companion-package.md:423` | `SequenceIntegrity.ts` | history | an amendment's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/056-audit-companion-package.md:462` | `SequenceIntegrity.ts` | history | an amendment's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/056-audit-companion-package.md:464` | `SequenceIntegrity.ts` | history | an amendment's own account of the module as it stood; the note at the end of the record says where the check lives |
| `spec/decisions/056-audit-companion-package.md:477` | `SequenceIntegrity.ts` | history | the dated note's own words: it names the old path to say where it moved |
| `spec/README.md:325` | `SequenceIntegrity.ts` | history | a register row naming what the change it records touched |
| `spec/README.md:406` | `SequenceIntegrity.ts` | history | a register row naming what the change it records touched |
| `spec/README.md:518` | `SequenceIntegrity.ts` | history | a register row naming what the change it records touched |
| `spec/urs.md:13` | `SequenceIntegrity.ts` | history | a Change History row |
| `spec/overview.md:926` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, not react's deleted `Hydration.ts` |
| `spec/overview.md:927` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, not react's deleted `Hydration.ts` |
| `spec/overview.md:928` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, not react's deleted `Hydration.ts` |
| `spec/invariants.md:2763` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/invariants.md:3933` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/invariants.md:3977` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:265` | `Hydration.ts` | history | this change's own record of the folds and the refused folds, in the decision that sets the cycle rule |
| `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:270` | `Hydration.ts` | history | this change's own record of the folds and the refused folds, in the decision that sets the cycle rule |
| `spec/decisions/198-the-hydration-block-is-a-model-row.md:57` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, the hydration block's model row, which still exists |
| `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:13` | `Hydration.ts` | history | a Change History row |
| `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:43` | `Hydration.ts` | history | the record's own account of the problem and the Decision when taken; the note at the end of the record says where the module lives |
| `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:58` | `Hydration.ts` | history | the record's own account of the problem and the Decision when taken; the note at the end of the record says where the module lives |
| `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:79` | `Hydration.ts` | history | the record's own account of the problem and the Decision when taken; the note at the end of the record says where the module lives |
| `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:170` | `Hydration.ts` | history | the record's own account of the problem and the Decision when taken; the note at the end of the record says where the module lives |
| `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:189` | `Hydration.ts` | history | the dated note's own words: it names the old path to say where it moved |
| `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:192` | `Hydration.ts` | history | the dated note's own words: it names the old path to say where it moved |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:83` | `Hydration.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:85` | `Hydration.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:112` | `Hydration.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:204` | `Hydration.ts` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/decisions/072-schema-taggederror-for-accessdenied-and-undischargedobligation.md:75` | `Hydration.ts` | history | the account of what existed when the decision was taken |
| `spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md:67` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/traceability.md:13` | `Hydration.ts` | history | a Change History row |
| `spec/traceability.md:61` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, not react's deleted `Hydration.ts` |
| `spec/traceability.md:264` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/traceability.md:267` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/traceability.md:378` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/traceability.md:636` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/README.md:13` | `Hydration.ts` | history | a Change History row |
| `spec/README.md:328` | `Hydration.ts` | history | a register row naming what the change it records touched |
| `spec/README.md:336` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/README.md:367` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/README.md:370` | `Hydration.ts` | history | a register row naming what the change it records touched |
| `spec/README.md:372` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/README.md:436` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, not react's deleted `Hydration.ts` |
| `spec/README.md:471` | `Hydration.ts` | history | a register row naming what the change it records touched |
| `spec/README.md:484` | `Hydration.ts` | history | a register row naming what the change it records touched |
| `spec/README.md:489` | `Hydration.ts` | history | a register row naming what the change it records touched |
| `spec/behaviors/19-hydration.md:290` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/behaviors/19-hydration.md:930` | `Hydration.ts` | history | a past-tense account of what the module's doc comments had named |
| `packages/devtools/src/model/Gates.ts:58` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, a module that still exists |
| `packages/devtools/src/model/Diagnostics.ts:49` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, not react's deleted `Hydration.ts` |
| `packages/devtools/src/model/HydrationView.ts:18` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, not react's deleted `Hydration.ts` |
| `packages/devtools/src/model/HydrationView.ts:19` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, not react's deleted `Hydration.ts` |
| `packages/devtools/src/index.ts:53` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, not react's deleted `Hydration.ts` |
| `packages/devtools/src/index.ts:54` | `Hydration.ts` | other file | devtools' `model/Hydration.ts`, not react's deleted `Hydration.ts` |
| `AGENTS.md:576` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `scripts/check-house-style.mjs:780` | `Hydration.ts` | other file | `Hydration.tst.ts` is react's type test, not react's deleted `Hydration.ts` |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:170` | `devtools-named-barrel` | history | this change's own record: the decision that folds these modules names each by its old path |
| `spec/README.md:318` | `devtools-named-barrel` | history | a register row naming what the change it records touched |

## Counts

- fixed: 20 rows over 17 files
- history: 94
- other file: 26
- unclassified: 0
