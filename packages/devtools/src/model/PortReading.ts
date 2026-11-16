/**
 * One port's display facts: what being defaulted costs, and how one of its calls reads, stated once per port.
 *
 * ARCH-94 moved these here from `Wiring.ts`'s `CONSEQUENCES` and the per-port arms
 * of `ServicesPanel.tsx`'s `describeOne`: a mapped type over `PortName` makes a
 * port without a row a compile error, so adding a port asks the compiler for its
 * reading rather than a search through three tables. Every field of a call can be
 * absent (a span is decoded from `unknown`), hence the documented fallbacks below.
 *
 * Package-private: in neither of the package's barrels.
 */
import type { PortName } from "@qadi/core";
import type { PortCallOf } from "./PortCalls.ts";

/** What being defaulted costs one port, and how one of its calls reads in a sentence. */
export interface PortReader<K extends PortName> {
  readonly consequence: string;
  readonly describe: (call: PortCallOf<K>) => string;
}

/**
 * Every port's reading, exhaustive over the registry.
 *
 * Every field can be absent, because a span is decoded from `unknown` and a call
 * that failed before it was made never recorded an answer. *Not recorded* rather
 * than a blank or a plausible default: a reader chasing a wiring problem needs
 * to know the difference between "it said nothing" and "nobody asked".
 */
export const PORT_READING: { readonly [K in PortName]: PortReader<K> } = {
  AttributeResolver: {
    consequence: "a missing attribute resolves to undefined, so an attribute policy denies",
    describe: (call) =>
      `${call.attribute ?? "not recorded"} → ${
        call.resolved === undefined ? "no answer" : call.resolved ? "a value" : "nothing"
      }`,
  },
  DecisionHistory: {
    consequence: "the three-valued default denies hasActed and hasNotActed alike",
    describe: (call) =>
      `${call.event ?? "not recorded"} ${
        call.resourceId === undefined ? "anywhere" : `on ${call.resourceId}`
      } → ${call.answer ?? "no answer"}`,
  },
  RelationshipResolver: {
    consequence: "an unanswered relationship denies",
    describe: (call) =>
      `${call.relation ?? "not recorded"} on ${call.resourceId ?? "no resource"}${
        call.depth === undefined ? "" : ` (depth ${String(call.depth)})`
      } → ${call.answer ?? "no answer"}`,
  },
  CustomPredicate: {
    consequence: "every hasCustom node denies, since no registered predicate can be reached",
    describe: (call) =>
      `${call.name ?? "not recorded"} → ${
        call.answer === undefined ? "no answer" : call.answer ? "true" : "false"
      }`,
  },
  SignatureHistory: {
    consequence:
      "an unwired signature history answers no signatures on file, so every hasSignature node denies",
    describe: (call) =>
      `${call.meaning ?? "not recorded"}${
        call.signerRole === undefined ? "" : ` from a '${call.signerRole}'`
      }${
        call.resourceId !== undefined
          ? ` on ${call.resourceId}`
          : call.scope === "Any"
            ? " anywhere"
            : ""
      } → ${call.matched === undefined ? "no answer" : call.matched ? "matched" : "no match"}`,
  },
};

/** One call in a sentence, read through its own port's row. */
export const describeCall = <K extends PortName>(call: PortCallOf<K>): string =>
  PORT_READING[call._tag].describe(call);
