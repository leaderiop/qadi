"use client";
/**
 * The two pieces of a decision that more than one screen renders.
 *
 * Both exist here rather than in the inspector because the simulator shows the
 * same facts about a decision it just made, and the field panel in particular
 * encodes an invariant: rendering it twice would be two chances to get
 * [INV-QD-004](../../../../spec/invariants.md) wrong, and only one of them would
 * be under the test that pins it.
 *
 * The *sentences* around them are deliberately not shared. What an inspector can
 * say about a duty ("the gate reported this") and what a simulator can say
 * ("nothing ran") are different facts, and folding them into one component would
 * mean inventing a wording that fits neither.
 */
import type { FC } from "react";
import type { Obligation } from "@qadi/core";
import { heading, muted, panel } from "./theme.ts";

/**
 * `undefined` is the **top** of the field lattice and means every field.
 *
 * Rendering it as an empty list would understate a full grant into a grant of
 * nothing, which is the one direction of error a reviewer acts on.
 */
export const FieldsPanel: FC<{ readonly fields: ReadonlyArray<string> | undefined }> = ({
  fields,
}) => (
  <section style={panel} data-testid="qadi-fields">
    <div style={heading}>visible fields</div>
    {fields === undefined ? (
      <span data-testid="qadi-fields-all">every field</span>
    ) : fields.length === 0 ? (
      <span data-testid="qadi-fields-none">no fields</span>
    ) : (
      <span data-testid="qadi-fields-some">{fields.join(", ")}</span>
    )}
  </section>
);

/**
 * The duties themselves, with no claim about whether any was met.
 *
 * `advisory` versus `binding` is the distinction worth showing: an undischarged
 * **binding** duty turns an allow into a refusal at the enforcement boundary,
 * and an advisory one does not.
 */
export const ObligationList: FC<{ readonly duties: ReadonlyArray<Obligation> }> = ({ duties }) => (
  <>
    {duties.map((duty) => (
      <div key={duty.id}>
        <span>{duty.id}</span>
        <span style={{ ...muted, marginLeft: 6 }}>{duty.advisory ? "advisory" : "binding"}</span>
      </div>
    ))}
  </>
);
