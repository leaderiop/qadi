/**
 * The policy explorer's state, as a store.
 *
 * The screen used to hold this in seven `useState`s across two views, and so
 * none of it fell under the model's tests or its mutation gate, and all of it
 * lived exactly as long as its tab. Three of its rules were wrong where no
 * model test could see them: a preview outlived the policy it previewed, a
 * paste's refusal outlived the text it refused, and an unloaded edit was lost
 * by glancing at the tree. It is here now, behind the interface
 * `useSyncExternalStore` already wants and a handful of synchronous commands,
 * the way `SimulationSession` holds the simulator (ADR-QD-047, one screen
 * later). The dock owns the session, so a tab switch is not a choice either.
 *
 * **Three rules each live in one function.** Which policy is shown is a held
 * choice resolved through `HeldChoice.ts`, by value (`build`). A preview is a
 * flag, never a stored policy: the previewed tree is always `simplify` of the
 * policy shown now, so a preview of some other policy is unrepresentable and
 * `apply` applies exactly what was previewed (BEH-QD-213). And everything the
 * JSON pane shows describes the text in it: an unloaded edit belongs to the
 * policy shown and survives a view switch, and a refusal belongs to the text it
 * refused.
 *
 * Package-private (ADR-QD-099): the dock is the one thing that drives it.
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Match from "effect/Match";
import type * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";
import { DEFAULT_MAX_DEPTH, fromJson, policyDepth, simplify, toJson } from "@qadi/core";
import type { Policy, PolicyDecodeTooDeep } from "@qadi/core";
import { sameSighting, sightingFor, type PolicySighting } from "./Catalogue.ts";
import { makeExternalStore, sameElements } from "./ExternalStore.ts";
import { pinHead, resolveHeld } from "./HeldChoice.ts";

export type ExplorerView = "Tree" | "Json";
export type DraftOrigin = "Pasted" | "Simplified";

/** What the main pane shows. A draft hides the rail highlight and the eviction note. */
export type ExplorerShown =
  | { readonly _tag: "Listed"; readonly sighting: PolicySighting; readonly index: number }
  | { readonly _tag: "Evicted"; readonly sighting: PolicySighting }
  | { readonly _tag: "Draft"; readonly policy: Policy; readonly origin: DraftOrigin };

export interface JsonPane {
  /** The unloaded edit when there is one, else the shown policy's encoding (or why it has none). */
  readonly text: string;
  readonly edited: boolean;
  /** Why the last load was refused. Present only while the text it refused is still the text shown. */
  readonly refusal: string | undefined;
}

export interface Simplification {
  readonly simplified: Policy;
  /** False when `simplify` returns an equal policy (BEH-QD-213: "already as simple"). */
  readonly changes: boolean;
  readonly previewing: boolean;
}

export interface DepthReading {
  readonly depth: number;
  readonly bound: number;
  /** `depth > bound`: `evaluate` would raise PolicyTooDeep. */
  readonly overBound: boolean;
}

export type ExplorerSnapshot =
  | { readonly _tag: "Empty"; readonly sightings: ReadonlyArray<PolicySighting> }
  | {
      readonly _tag: "Showing";
      readonly sightings: ReadonlyArray<PolicySighting>;
      readonly shown: ExplorerShown;
      /** What the toolbar, the depth line and the JSON pane act on. */
      readonly policy: Policy;
      /** The rail item to highlight: only a listed choice with no draft over it. */
      readonly railIndex: number | undefined;
      readonly view: ExplorerView;
      /** What the tree draws: the simplification while previewing, else `policy`. */
      readonly tree: Policy;
      readonly simplification: Simplification;
      readonly depth: DepthReading;
      readonly json: JsonPane;
    };

export interface ExplorerSession {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => ExplorerSnapshot;
  /** The rail as it is now. Pins the head once, so the first policy shown stays shown (INV-QD-107). */
  readonly setSightings: (sightings: ReadonlyArray<PolicySighting>) => void;
  /** Shows a policy, held by value. Drops a draft, a preview, an unloaded edit and its refusal. */
  readonly choose: (policy: Policy) => void;
  readonly setView: (view: ExplorerView) => void;
  readonly editJson: (text: string) => void;
  /** Decodes the unloaded edit through `fromJson`: a draft, or a refusal kept beside the text. */
  readonly load: () => void;
  readonly setPreviewing: (on: boolean) => void;
  /** Applies the previewed simplification as a draft. A no-op while nothing is previewed (ADR-QD-030). */
  readonly apply: () => void;
}

export interface ExplorerSessionInit {
  readonly sightings?: ReadonlyArray<PolicySighting>;
}

/**
 * Renders a decode failure the way the paste box wants it — path-relative
 * issue sentences, not a debug dump of the error object.
 *
 * `String(failure)` (the predecessor of this function) gave
 * `"SchemaError(Expected { readonly \"_tag\": ... } | ... )"` for the one
 * decode failure a policy author is guaranteed to meet — the entire
 * 17-member recursive `Policy` union spelled out, with no path and no hint
 * which value was actually wrong (WZ-01). `SchemaIssue.makeFormatterStandardSchemaV1`
 * already flattens the issue tree into `{ message, path }` pairs — this only
 * adds the `at <path>:` prefix per entry and a dedicated sentence for
 * {@link PolicyDecodeTooDeep}, which isn't a `Schema.SchemaError` at all and so
 * has no issue tree to format.
 */
const formatDecodeFailure = (failure: PolicyDecodeTooDeep | Schema.SchemaError): string => {
  if (failure._tag === "PolicyDecodeTooDeep") {
    return (
      `Policy nesting exceeds the decode limit (max depth ${failure.maxDepth}). ` +
      "Simplify the policy, or split it into smaller pieces."
    );
  }
  const { issues } = SchemaIssue.makeFormatterStandardSchemaV1()(failure.issue);
  if (issues.length === 0) return failure.message;
  return issues
    .map(({ path, message }) =>
      path === undefined || path.length === 0 ? message : `at ${path.map(String).join(".")}: ${message}`,
    )
    .join("\n");
};

/**
 * Reads a decode's exit as the refusal to show, or `undefined` for a success.
 *
 * A defect inside the decoder is a stated refusal rather than a throw out of a
 * click handler: a paste box that crashes the panel is a worse way to learn a
 * payload is malformed than any sentence.
 */
export const refusalOf = (
  exit: Exit.Exit<Policy, PolicyDecodeTooDeep | Schema.SchemaError>,
): string | undefined => {
  if (Exit.isSuccess(exit)) return undefined;
  const failure = Cause.findErrorOption(exit.cause);
  return failure._tag === "Some"
    ? formatDecodeFailure(failure.value)
    : `the decoder failed unexpectedly: ${Cause.pretty(exit.cause)}`;
};

/**
 * Reads an encode's exit as the text to show: the encoding, or why there is none.
 *
 * Encoding a policy is synchronous and total for any policy the library built,
 * so the second arm is a policy built by hand against the types.
 */
export const textOf = (exit: Exit.Exit<string, unknown>): string =>
  Exit.isSuccess(exit) ? exit.value : Cause.pretty(exit.cause);

/** One remembered answer per pure reading: the policy is a reference that changes only when a newer sighting replaces it. */
const memo = <A>(read: (policy: Policy) => A): ((policy: Policy) => A) => {
  let last: { readonly policy: Policy; readonly value: A } | undefined;
  return (policy) => {
    if (last !== undefined && last.policy === policy) return last.value;
    const value = read(policy);
    last = { policy, value };
    return value;
  };
};

interface Draft {
  readonly policy: Policy;
  readonly origin: DraftOrigin;
}

export const makeExplorerSession = (init?: ExplorerSessionInit): ExplorerSession => {
  let sightings: ReadonlyArray<PolicySighting> = init?.sightings ?? [];
  /** The sighting the reviewer chose, held by value: the rail reorders as decisions arrive. */
  let held: PolicySighting | undefined = pinHead(sightings, undefined);
  let draft: Draft | undefined;
  let view: ExplorerView = "Tree";
  let previewing = false;
  /** An edit typed into the JSON pane and not yet loaded. */
  let pending: string | undefined;
  let refusal: string | undefined;

  // Re-run on every `setSightings`, which the dock dispatches on each timeline
  // tick: without these, a tick would re-simplify, re-encode and re-measure the
  // shown policy while nobody is looking at the screen.
  const simplified = memo((policy) => {
    const next = simplify(policy);
    return { simplified: next, changes: !Equal.equals(next, policy) };
  });
  const encoded = memo((policy) => textOf(Effect.runSyncExit(toJson(policy))));
  const measured = memo((policy): DepthReading => {
    const depth = policyDepth(policy);
    return { depth, bound: DEFAULT_MAX_DEPTH, overBound: depth > DEFAULT_MAX_DEPTH };
  });

  const build = (): ExplorerSnapshot => {
    const shown: ExplorerShown | undefined =
      draft !== undefined
        ? { _tag: "Draft", policy: draft.policy, origin: draft.origin }
        : Match.value(resolveHeld(sightings, held, sameSighting)).pipe(
            Match.tagsExhaustive({
              Empty: (): ExplorerShown | undefined => undefined,
              Listed: (listed): ExplorerShown => ({
                _tag: "Listed",
                sighting: listed.value,
                index: listed.index,
              }),
              Evicted: (gone): ExplorerShown => ({ _tag: "Evicted", sighting: gone.value }),
            }),
          );
    if (shown === undefined) return { _tag: "Empty", sightings };

    const policy = Match.value(shown).pipe(
      Match.tagsExhaustive({
        Listed: (one) => one.sighting.policy,
        Evicted: (one) => one.sighting.policy,
        Draft: (one) => one.policy,
      }),
    );
    const simple = simplified(policy);
    return {
      _tag: "Showing",
      sightings,
      shown,
      policy,
      railIndex: shown._tag === "Listed" ? shown.index : undefined,
      view,
      tree: previewing ? simple.simplified : policy,
      simplification: { ...simple, previewing },
      depth: measured(policy),
      json: { text: pending ?? encoded(policy), edited: pending !== undefined, refusal },
    };
  };

  const store = makeExternalStore<ExplorerSnapshot>(build());
  const commit = () => store.publish(build());

  /** The policy on screen now, when there is one. */
  const current = (): Policy | undefined => {
    const snapshot = store.getSnapshot();
    return snapshot._tag === "Showing" ? snapshot.policy : undefined;
  };

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,

    setSightings: (next) => {
      if (sameElements(next, sightings)) return;
      sightings = next;
      held = pinHead(sightings, held);
      commit();
    },

    choose: (policy) => {
      if (
        held !== undefined &&
        Equal.equals(held.policy, policy) &&
        draft === undefined &&
        pending === undefined &&
        refusal === undefined &&
        !previewing
      ) {
        return;
      }
      held = sightingFor(sightings, policy);
      draft = undefined;
      previewing = false;
      pending = undefined;
      refusal = undefined;
      commit();
    },

    // `pending` survives a view switch: glancing at the tree is not abandoning an edit.
    setView: (next) => {
      if (next === view) return;
      view = next;
      commit();
    },

    editJson: (text) => {
      if (text === pending) return;
      pending = text;
      // Once the text changes, the refusal describes nothing on screen.
      refusal = undefined;
      commit();
    },

    load: () => {
      if (pending === undefined) return;
      const exit = Effect.runSyncExit(fromJson(pending));
      if (!Exit.isSuccess(exit)) {
        // The issue is shown rather than swallowed: a paste that did not decode
        // is the ordinary way to learn a payload is malformed (WZ-01).
        refusal = refusalOf(exit);
        commit();
        return;
      }
      pending = undefined;
      refusal = undefined;
      const shown = current();
      // Loading what is already shown is not a new policy: no draft, and the
      // rail highlight stays.
      if (shown === undefined || !Equal.equals(exit.value, shown)) {
        draft = { policy: exit.value, origin: "Pasted" };
        previewing = false;
      }
      commit();
    },

    setPreviewing: (on) => {
      if (on === previewing || current() === undefined) return;
      previewing = on;
      commit();
    },

    apply: () => {
      const policy = current();
      if (!previewing || policy === undefined) return;
      previewing = false;
      const next = simplified(policy);
      if (next.changes) {
        draft = { policy: next.simplified, origin: "Simplified" };
        pending = undefined;
        refusal = undefined;
      }
      commit();
    },
  };
};
