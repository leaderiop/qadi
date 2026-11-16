/**
 * The panel tests' one input seam: what `QuestionsPanel` is handed to read.
 *
 * `QuestionsPanel.test.tsx`, `QuestionsPanel.gates.test.tsx` and `VerdictTreatment.test.tsx`
 * spread this onto every panel they render, so their expectations stay as written while
 * the input's form changes. It returns the readout the dock model's `questions` store
 * would give: one snapshot, joined once from the questions and the guards given.
 *
 * `unsampled` is false because every routed render passes `liveNotice` (status Live),
 * where the panel never takes the unsampled branch. The unsampled case runs through the
 * dock, in the characterisation's `questions absent, unsampled` cell.
 */
import type { AskedQuestionLike, GateInstanceLike } from "../../src/index.ts";
import { joinQuestions, type QuestionsSnapshot } from "../../src/model/Gates.ts";

export const panelInput = (input: {
  readonly questions: ReadonlyArray<AskedQuestionLike> | undefined;
  readonly gates?: ReadonlyArray<GateInstanceLike> | undefined;
}): {
  readonly questions: {
    readonly subscribe: (listener: () => void) => () => void;
    readonly getSnapshot: () => QuestionsSnapshot;
  };
} => {
  const snapshot = joinQuestions({ questions: input.questions, gates: input.gates, unsampled: false });
  return { questions: { subscribe: () => () => {}, getSnapshot: () => snapshot } };
};
