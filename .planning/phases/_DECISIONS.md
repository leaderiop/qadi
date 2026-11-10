# Wave 6 — human decisions (answered 2026-11-10, before execution)

The user answered every `checkpoint:decision` up front with **"Accept all recommended options"**. An executor that reaches one
of these tasks treats it as answered with the value below, quotes it in the plan's SUMMARY (and in the ADR the plan names),
and continues without stopping.

| Plan · task | Answer | Meaning |
|---|---|---|
| 10-03 T1 (D-02) | `archive` | Move the old tracker (`architecture/` at the `.planning/` root) to `.planning/milestones/archive-pre-gsd/architecture/` and track it there; rewrite references in the same commit |
| 12-01 T1 (D-54-c/e) | `option-a` | Cursor order on the wire, ordered by core's encoder; remove `frame`, `syncedFrame`, `decisionFrames` from `@qadi/http` (Breaking) |
| 12-03 T1 (D-53-b/g) | `option-a` | One `HydrationDrop` type for both ends (Breaking dehydrate `onDropped`); `HydrationEvent.ts` joins the react Stryker run |
| 13-04 (D-48-d) | `A` | Chip typing buffer stays in the view; `addChip(field, text): ChipAdded` |
| 13-12 T3 | `keep-wave5` | Delete `rescue/arch50-stash-a` and `rescue/arch50-stash-b`; keep `rescue/wave5-1013` |
| 14-01 T1 (D-02/D-05/D-06) | `A interrupt remove` | 5 s overridable `storeCallTimeout` per store call; script union gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking) |
| 16-01 T1 (D-04) | `A` | A repeated role is a leaf referencing its first occurrence |
| 17-01 T1 (D-04) | `A` + key confirmed | Every port's unseen replay request is an outage (fail closed); `PortDescription.key` returns `Result<string, KeyRefusal>` (Breaking) — confirmed |
| 18-01 T1 (D-02) | `option-b` | Address rule plus one `devtoolsRoutes(...)` mounting call |
| 20-01 T2 (conditional) | `A` | Only if #64 does not reproduce: stop the phase, keep the test as a pin |

Any **new** one-way decision that is not in this table and not settled by a CONTEXT is a real blocker: stop and return it.
