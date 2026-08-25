/**
 * The retirement checklist for an audited system going out of service.
 *
 * Renumbered from HexDi's `decommission.ts`: its `DECOMM-006` ("verify all
 * scopes disposed") is dropped, since it depends on the scope-tracking
 * concept (`disposal.ts`) this map ruled out entirely — Qadi has no "scope"
 * equivalent in its domain model. Six steps remain.
 *
 * Every timestamp and the checklist's own id are caller-supplied parameters,
 * never generated internally (AGENTS.md §6) — `@qadi/audit` mints nothing.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";

export type DecommissioningStepId =
  | "DECOMM-001"
  | "DECOMM-002"
  | "DECOMM-003"
  | "DECOMM-004"
  | "DECOMM-005"
  | "DECOMM-006";

export interface DecommissioningStep {
  readonly id: DecommissioningStepId;
  readonly description: string;
  readonly completedAt?: number | undefined;
  readonly completedBy?: string | undefined;
}

export interface DecommissioningChecklist {
  readonly checklistId: string;
  readonly createdAt: number;
  readonly steps: ReadonlyArray<DecommissioningStep>;
}

const STEP_DESCRIPTIONS: Record<DecommissioningStepId, string> = {
  "DECOMM-001": "Export the full audit trail to an archive",
  "DECOMM-002": "Verify the archived chain's integrity",
  "DECOMM-003": "Transfer the archive to long-term storage",
  "DECOMM-004": "Revoke signing keys",
  "DECOMM-005": "Record the final audit entry",
  "DECOMM-006": "Notify the regulatory authority, if required",
};

const STEP_IDS: ReadonlyArray<DecommissioningStepId> = [
  "DECOMM-001",
  "DECOMM-002",
  "DECOMM-003",
  "DECOMM-004",
  "DECOMM-005",
  "DECOMM-006",
];

export const createDecommissioningChecklist = (
  checklistId: string,
  now: number,
): DecommissioningChecklist => ({
  checklistId,
  createdAt: now,
  steps: STEP_IDS.map((id) => ({ id, description: STEP_DESCRIPTIONS[id] })),
});

/**
 * An unknown `stepId` refuses rather than silently no-opping — unlike HexDi,
 * where the equivalent call quietly does nothing for a step id it does not
 * recognise. The same "refuse rather than approximate" rule as everywhere
 * else on this map.
 */
export class UnknownDecommissioningStep extends Data.TaggedError("UnknownDecommissioningStep")<{
  readonly stepId: string;
  readonly checklistId: string;
}> {}

export const completeDecommissioningStep = Effect.fn("qadi.audit.completeDecommissioningStep")(
  function* (
    checklist: DecommissioningChecklist,
    stepId: string,
    completedBy: string,
    now: number,
  ) {
    const index = checklist.steps.findIndex((step) => step.id === stepId);
    if (index === -1) {
      return yield* Effect.fail(
        new UnknownDecommissioningStep({ stepId, checklistId: checklist.checklistId }),
      );
    }

    const steps = checklist.steps.map((step, i) =>
      i === index ? { ...step, completedAt: now, completedBy } : step,
    );
    return { ...checklist, steps } satisfies DecommissioningChecklist;
  },
);
