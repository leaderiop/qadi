## Conflict Detection Report

### BLOCKERS (0)

None. Cycle detection was re-run against the current `cross_refs` graph for all 50 classified docs (`ADR-QD-001` through `ADR-QD-050`) after the orchestrator's manual edit to break three mutual-citation back-references (see INFO below). No cycles remain. No two LOCKED ADRs were found to contradict on the same scope, and MODE is `new` so there is no existing locked CONTEXT.md to check against.

### WARNINGS (0)

None. All 50 classified docs are `type: ADR`, so there were no PRD-vs-PRD acceptance-criteria comparisons to make, and no UNKNOWN/low-confidence docs required user re-tagging.

### INFO (5)

[INFO] Cross-reference cycle detection re-run — 0 cycles (previously 3)
  Note: The prior synthesis run found 3 mutual-citation cycles: ADR-QD-005 <-> ADR-QD-026, ADR-QD-013 <-> ADR-QD-026, and ADR-QD-009 <-> ADR-QD-016. Content inspection at that time confirmed each pair was a benign extends/amends backlink (the later ADR amends the earlier one and cites it forward; the earlier one is not a genuine dependency on the later one), not a real contradiction. The orchestrator edited classifications 005, 009, and 013 to drop the earlier ADR's back-reference, making each pair one-directional (026 -> 005, 026 -> 013, 016 -> 009). This re-run confirms no cycles remain across all 50 docs, capped at traversal depth 50.

[INFO] Auto-resolved (informational): ADR-QD-043 widens ADR-QD-031's `DecisionCache` key shape
  Note: ADR-QD-031 (Accepted) defines `DecisionCache`'s key as including "the subject" (originally `subjectId: SubjectId`). ADR-QD-043 (Accepted, later) explicitly changes `DecisionCacheKey.subject` from `subjectId: SubjectId` to the full `AuthSubject`, self-documented as "Breaking" and citing the earlier field shape directly. This is a self-declared, cited evolution of the same field rather than an undisclosed contradiction between two independent LOCKED ADRs, so it was not treated as a LOCKED-vs-LOCKED blocker. Downstream consumers (`gsd-roadmapper`) should treat ADR-QD-043's key shape as current.

[INFO] Dangling forward reference: ADR-QD-024 narrowed by ADR-QD-054 (not in this ingest batch)
  Note: ADR-QD-024's source file contains "Narrowed by ADR-QD-054" and cross-references `./054-a-companion-package-may-compile-a-dialect.md`. That file exists in `spec/decisions/` but was not among the 50 files in this classification batch, so its content was not read or synthesized. `decisions.md`'s ADR-QD-024 entry is written as currently narrowed per ADR-QD-024's own text, but ADR-QD-054 itself is absent from `decisions.md`.

[INFO] Dangling forward reference: ADR-QD-014 cross-references ADR-QD-053 (not in this ingest batch)
  Note: ADR-QD-014's `cross_refs` includes `./053-a-gate-can-be-found.md`, which exists in `spec/decisions/` but was not among the 50 files in this classification batch.

[INFO] Additional ADR files exist beyond this batch
  Note: `spec/decisions/` contains ADR-QD-051 through ADR-QD-058 (8 further files: `051-a-span-says-what-was-asked.md` through `058-hassignature-a-ninth-service-and-a-decomposable-leaf.md`) that were not included in `CLASSIFICATIONS_DIR` for this run. Nothing in ADR-QD-001–050 was found to depend on their content in a way that would change a decision statement recorded here, but a future ingest batch covering them may add entries to `decisions.md` and should re-run cycle detection across the full set.
