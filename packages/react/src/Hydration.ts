/**
 * Server-rendered decisions, seeded into a client registry.
 *
 * Without this a server-rendered page shows every guarded control in its pending
 * state and re-decides after mount — a visible flash, and a round trip per policy
 * the page already knows the answer to.
 *
 * Both functions are **pure and synchronous**. Nothing here touches React; the
 * output of `hydrateDecisions` is `QadiProviderProps.initialValues`.
 *
 * The security shape of this module is the point, and it is
 * [ADR-QD-028](../../../spec/decisions/028-decision-hydration.md): a payload is
 * authorization state crossing a network, so it is **bound to a subject id**, it
 * **carries no trace** by default, and every entry it cannot verify is
 * **dropped** rather than trusted.
 */
import type { AuthSubject, Decision, Policy, Resource, Trace } from "@qadi/core";
import { Allow, Deny, Policy as PolicySchema } from "@qadi/core";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type * as Atom from "effect/unstable/reactivity/Atom";
import type { DecisionResult, QadiAtoms } from "./QadiAtoms.ts";
import type { InitialValues } from "./QadiProvider.tsx";

/** Encoding a typed policy cannot fail, so this side is sync and total. */
const encodePolicy = Schema.encodeSync(PolicySchema);

/**
 * Decoding is the untrusted side, so it returns an Option and a malformed entry
 * is dropped rather than thrown on — the same fail-closed treatment a mismatched
 * subject gets.
 */
const decodePolicy = Schema.decodeUnknownOption(PolicySchema);

/** One decision the server made, ready to be dehydrated. */
export interface DecisionEntry {
  readonly policy: Policy;
  /** Present when the decision was made against a resource. */
  readonly resource?: Resource | undefined;
  readonly decision: Decision;
}

/** One dehydrated entry. `policy` is a plain JSON value, not a `Policy`. */
export interface DehydratedEntry {
  readonly policy: unknown;
  readonly resource?: Resource | undefined;
  readonly allowed: boolean;
  readonly evaluationId: string;
  readonly durationMillis: number;
  readonly visibleFields?: ReadonlyArray<string> | undefined;
  readonly obligations?: Allow["obligations"] | undefined;
  readonly reason?: string | undefined;
  /** Present only when the caller opted into disclosing it. */
  readonly trace?: Trace | undefined;
}

/**
 * A serializable projection of decisions, bound to one subject.
 *
 * Named for what it is. It is **not** `ReadonlyArray<Decision>`: the trace is
 * reduced and a denial's reason is replaced, so a hydrated decision is not equal
 * to the one the server made. It carries the same verdict, visible fields and
 * obligations — the things a UI acts on.
 */
export interface DehydratedDecisions {
  /** The subject these decisions were made for. Checked on hydration. */
  readonly subjectId: string;
  readonly entries: ReadonlyArray<DehydratedEntry>;
}

/** The stand-in reason a hydrated denial carries when the trace is withheld. */
const HYDRATED = "hydrated";

const reducedTrace = (decision: Decision): Trace => ({
  policyTag: decision.trace.policyTag,
  allowed: decision._tag === "Allow",
  reason: decision._tag === "Allow" ? undefined : HYDRATED,
  children: [],
  visibleFields: decision._tag === "Allow" ? decision.visibleFields : undefined,
  obligations: decision._tag === "Allow" ? decision.obligations : [],
});

export interface DehydrateOptions {
  /**
   * Ship the full trace.
   *
   * Off by default, and the default is the security decision. A trace names every
   * node's tag, its label and the sentence explaining why it refused — a
   * description of the policy's internal structure plus which branch this subject
   * failed, readable by anyone with developer tools and by any script on the page.
   */
  readonly includeTrace?: boolean;
}

/**
 * Projects decisions into a payload safe to embed in a server-rendered page.
 *
 * Every entry must belong to the same subject; the first one's `subjectId` names
 * the payload and any entry disagreeing with it is **dropped**, because a payload
 * mixing subjects is a bug whose only safe reading is to trust none of it.
 */
export const dehydrateDecisions = (
  entries: ReadonlyArray<DecisionEntry>,
  options?: DehydrateOptions,
): DehydratedDecisions => {
  const subjectId = entries[0]?.decision.subjectId ?? "";
  const includeTrace = options?.includeTrace ?? false;

  return {
    subjectId,
    entries: entries
      .filter((e) => e.decision.subjectId === subjectId)
      .map((e): DehydratedEntry => ({
        policy: encodePolicy(e.policy),
        resource: e.resource,
        allowed: e.decision._tag === "Allow",
        evaluationId: e.decision.evaluationId,
        durationMillis: e.decision.durationMillis,
        visibleFields: e.decision._tag === "Allow" ? e.decision.visibleFields : undefined,
        obligations: e.decision._tag === "Allow" ? e.decision.obligations : undefined,
        // A denial's own reason is withheld with the trace: it is the same
        // disclosure in one sentence.
        reason: e.decision._tag === "Deny" ? (includeTrace ? e.decision.reason : HYDRATED) : undefined,
        trace: includeTrace ? e.decision.trace : reducedTrace(e.decision),
      })),
  };
};

const rebuild = (entry: DehydratedEntry, subjectId: string): Decision => {
  const trace = entry.trace ?? {
    policyTag: "AllOf" as const,
    allowed: entry.allowed,
    children: [],
    visibleFields: entry.visibleFields,
    obligations: entry.obligations ?? [],
  };

  return entry.allowed
    ? new Allow({
        evaluationId: entry.evaluationId,
        subjectId,
        durationMillis: entry.durationMillis,
        trace,
        visibleFields: entry.visibleFields,
        obligations: entry.obligations ?? [],
      })
    : new Deny({
        evaluationId: entry.evaluationId,
        subjectId,
        durationMillis: entry.durationMillis,
        trace,
        reason: entry.reason ?? HYDRATED,
      });
};

/**
 * Turns a payload into `initialValues` for `QadiProvider`.
 *
 * **Drops** every entry whose `subjectId` is not this subject's, and every entry
 * whose policy does not decode. A dropped entry leaves its atom `Initial`, so the
 * client asks the question properly — the page flashes, which is exactly what
 * would have happened without hydration and is the correct outcome for a payload
 * that cannot be verified.
 *
 * Not throwing is deliberate: a cache serving one user's page to another is a
 * misconfiguration, and turning it into a blank page would be a worse outcome than
 * re-deciding. Trusting it would be a breach.
 */
export const hydrateDecisions = (
  atoms: QadiAtoms,
  dehydrated: DehydratedDecisions,
  subject: AuthSubject,
): InitialValues => {
  // The whole payload is rejected on a subject mismatch, not entry by entry: the
  // id is a property of the payload, so one wrong id means the wrong page.
  if (dehydrated.subjectId !== subject.id) return [];

  const seeded: Array<readonly [Atom.Atom<unknown>, unknown]> = [];

  for (const entry of dehydrated.entries) {
    const decoded = decodePolicy(entry.policy);
    if (!Option.isSome(decoded)) continue;
    const policy = decoded.value;

    const atom =
      entry.resource === undefined
        ? atoms.decision(policy)
        : atoms.decisionFor(policy, entry.resource);

    // `AsyncResult.success` with no `waiting`, so `currentDecision` returns it
    // rather than reading it as stale (ADR-QD-017).
    const value: DecisionResult = AsyncResult.success(rebuild(entry, subject.id));
    seeded.push([atom as Atom.Atom<unknown>, value] as const);
  }

  return seeded;
};
