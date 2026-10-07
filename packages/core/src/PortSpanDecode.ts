/**
 * The one decoder of a port span's attributes.
 *
 * `@qadi/devtools` reads every port span through it, and core never decodes its
 * own spans in `src`. Split from `PortSpan.ts` (the types a description names)
 * so the public types and the internal machinery that builds them form no
 * import cycle: types, then machinery, then this.
 */
import type { PortSpanAttributes, PortSpanRow, SpanFields } from "./PortSpan.ts";
import { attemptsStruct, decodeSpan } from "./PortSpanEncode.ts";

/**
 * Reads one port span's attributes through its description.
 *
 * Each field is decoded on its own, so a value of the wrong type, or outside a
 * literal union, reads as absent while the other fields are kept (BEH-QD-228);
 * a `qadi.*` key the description does not name is ignored.
 */
export const decodePortSpan = <Q extends SpanFields, Ans extends SpanFields, O>(
  d: { readonly attributes: PortSpanAttributes<Q, Ans, O> },
  attributes: ReadonlyMap<string, unknown>,
): PortSpanRow<Q, Ans> => ({
  ...decodeSpan(attemptsStruct, attributes),
  ...decodeSpan(d.attributes.question, attributes),
  ...decodeSpan(d.attributes.answer, attributes),
});
