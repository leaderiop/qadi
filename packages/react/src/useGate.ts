"use client";
/**
 * The one-question door into `useGates`.
 *
 * Every single-question surface (`Can`, `Cannot`, `useCan`, `useDecision`,
 * `useDecisionSuspense`, `useProjected`) calls it naming itself, so one instance
 * registers once, as itself. That matters because the surfaces nest: `Can` used
 * to call `useDecision`, and `useCan` still would, so registering inside
 * `useDecision` and again inside its callers would report one `<Can>` as two
 * instances, one of them mislabelled. `useDecision` is simply the case whose name
 * is `"useDecision"`.
 *
 * The read, the identity, the marker rule and the registration all live in
 * `GateWriter.ts`'s `useGates`, which reads the result once with `outcomeOf`; the
 * one object it returns is both what the registry records and what the surface
 * renders from, so the panel and the guard cannot disagree about what is on
 * screen.
 *
 * Out of the barrel (AGENTS.md §9): the kind is not a caller's to choose. A
 * consumer able to pass one could register a `<Can>` that does not exist.
 */
import type { Policy, Resource } from "@qadi/core";
import { useMemo } from "react";
import type { GateKind, GateRead } from "./GateWriter.ts";
import { useGates } from "./GateWriter.ts";

/** Reads one question's decision, and registers the reader while instrumentation is on. */
export const useGate = (kind: GateKind, policy: Policy, resource?: Resource): GateRead => {
  // Memoised on the policy and resource, so a hoisted policy keeps one record and
  // therefore one group.
  const questions = useMemo(() => ({ question: { policy, resource } }), [policy, resource]);
  return useGates(kind, questions).entries.question;
};
