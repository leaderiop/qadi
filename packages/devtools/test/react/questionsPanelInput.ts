/**
 * The panel tests' one input seam: what `QuestionsPanel` is handed to read.
 *
 * `QuestionsPanel.test.tsx`, `QuestionsPanel.gates.test.tsx` and `VerdictTreatment.test.tsx`
 * spread this onto every panel they render, so their expectations stay as written while
 * the input's form changes. It returns the readout the dock model's `questions` store
 * would give: one snapshot of the questions and the guards given.
 *
 * It does not call `joinQuestions`. The join is pinned by `Gates.test.ts` and by the model's
 * property test, and a panel test that built its input with it would take a defect in the
 * join as input and not as a failure. The snapshot is written out here: `Equal.equals` over
 * policy and resource, in registry order, which is the grouping `Gates.ts` documents.
 *
 * It also returns a lens: a fresh one per call unless the caller passes one, so a test that
 * re-renders and keeps its pick passes the same session.
 *
 * `unsampled` is false because every routed render passes `liveNotice` (status Live),
 * where the panel never takes the unsampled branch. The unsampled case runs through the
 * dock, in the characterisation's `questions absent, unsampled` cell.
 */
import * as Equal from "effect/Equal";
import type { AskedQuestionLike, GateInstanceLike } from "../../src/index.ts";
import { GatesView, QuestionsView, type QuestionsSnapshot } from "../../src/model/Gates.ts";
import { makeLensSession, type LensSession } from "../../src/model/LensSession.ts";

export const panelInput = (input: {
  readonly questions: ReadonlyArray<AskedQuestionLike> | undefined;
  readonly gates?: ReadonlyArray<GateInstanceLike> | undefined;
  readonly lens?: LensSession | undefined;
}): {
  readonly questions: {
    readonly subscribe: (listener: () => void) => () => void;
    readonly getSnapshot: () => QuestionsSnapshot;
  };
  readonly lens: LensSession;
} => {
  const { questions, gates } = input;
  const snapshot: QuestionsSnapshot = {
    gates:
      gates === undefined ? GatesView.Absent() : gates.length === 0 ? GatesView.Empty() : GatesView.Listed(),
    questions:
      questions === undefined
        ? QuestionsView.Absent()
        : questions.length === 0
          ? QuestionsView.Empty()
          : QuestionsView.Rows({
              rows: questions.map((question) => ({
                question,
                asking: (gates ?? []).filter(
                  (one) => Equal.equals(one.policy, question.policy) && Equal.equals(one.resource, question.resource),
                ),
              })),
            }),
    instances: gates ?? [],
  };
  return {
    questions: { subscribe: () => () => {}, getSnapshot: () => snapshot },
    lens: input.lens ?? makeLensSession(),
  };
};
