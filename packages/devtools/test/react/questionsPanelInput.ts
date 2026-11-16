/**
 * The panel tests' one input seam: what `QuestionsPanel` is handed to read.
 *
 * `QuestionsPanel.test.tsx`, `QuestionsPanel.gates.test.tsx` and `VerdictTreatment.test.tsx`
 * spread this onto every panel they render, so their expectations stay as written while
 * the input's form changes. It returns the questions and the guards unchanged; when the
 * gate registry becomes a dock-model store (ARCH-96, 49-05) its body builds the panel's
 * snapshot readout instead, and the tests that spread it do not change (D-13).
 */
import type { AskedQuestionLike, GateInstanceLike } from "../../src/index.ts";

export const panelInput = (input: {
  readonly questions: ReadonlyArray<AskedQuestionLike> | undefined;
  readonly gates?: ReadonlyArray<GateInstanceLike> | undefined;
}): {
  readonly questions: ReadonlyArray<AskedQuestionLike> | undefined;
  readonly gates: ReadonlyArray<GateInstanceLike> | undefined;
} => ({ questions: input.questions, gates: input.gates });
