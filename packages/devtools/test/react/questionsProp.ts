/**
 * The characterisation's one input seam for the questions thunk.
 *
 * The thunk moves from `diagnostics` to a dock prop under ADR-QD-169, and every cell
 * that hands one to the dock passes it through here, so the cells and their goldens
 * stay unedited when it moves. `diagnostics` is required in the parameter, so
 * a flip cannot change a cell's diagnostics status: a cell that hands a thunk says what
 * its poll is doing, and the seam does not choose for it.
 */
import type { AskedQuestionLike } from "../../src/index.ts";
import type { DevtoolsDockProps, DiagnosticsDockOptions } from "../../src/react/index.ts";

export const questionsProp = (
  props: DevtoolsDockProps & { readonly diagnostics: DiagnosticsDockOptions },
  questions: () => ReadonlyArray<AskedQuestionLike>,
): DevtoolsDockProps => ({ ...props, diagnostics: { ...props.diagnostics, questions } });
