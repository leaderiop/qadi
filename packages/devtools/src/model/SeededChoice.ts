/**
 * The policy the simulator runs and where it came from, as a value.
 *
 * A `SeededChoice` is the rail of sightings, the sighting chosen from it and the
 * logged row the form was last seeded from. Every transition and every reading is a
 * function of plain values, so a rule below is one a test calls with no scope, no
 * store and no run around it.
 *
 * The constructor, `withSightings` and `seedFrom` each pin the head exactly when no
 * replayed policy is held, and `choose` holds a value and pins nothing.
 *
 * While a replayed policy is held, the seed is its row; otherwise a row that is not
 * a `TimelineDecision` stays the baseline row, and a decision row the reviewer walked
 * away from is no seed.
 *
 * The menu is one list of entries, each with its value, its label and the sighting it
 * names, and `menuOf` and `sightingAt` both read it, so a position that names no
 * sighting answers nothing.
 *
 * `choose` returns its input when no replayed policy is held and the held sighting has
 * the chosen policy, and the session publishes nothing only when `choose` returned its
 * input and the run is `Idle`.
 *
 * `withSightings` and `choose` map a `SeededChoice` to a `SeededChoice`, and
 * `seededChoice` and `seedFrom` answer a `Seeding`: the choice, and the input a
 * replayed row gives. A transition that changes nothing answers its input object,
 * inside the `Seeding` for `seedFrom`, so a caller detects a no-op with `===`.
 *
 * Package-private, out of the barrel except its three types (ADR-QD-099, ADR-QD-187).
 */
import * as Equal from "effect/Equal";
import * as Match from "effect/Match";
import type { Policy } from "@qadi/core";
import { sameSighting, sightingFor } from "./Catalogue.ts";
import type { PolicySighting } from "./Catalogue.ts";
import { sameElements } from "./ExternalStore.ts";
import { heldValue, pinHead, resolveHeld } from "./HeldChoice.ts";
import { replayInput } from "./Replay.ts";
import type { UnseededField } from "./Replay.ts";
import type { SimulationInput } from "./SimulationInput.ts";
import type { TimelineEntry } from "./Timeline.ts";

/**
 * The policy being simulated, and where it came from.
 *
 * The first three arms are `HeldChoice`'s (ARCH-74, BEH-QD-466), written out here so
 * the type a host reads is complete, and not re-mapped from it. `Listed.index`
 * is a reading of the rail as it is now, never an input: the choice itself is the
 * policy, held by value (`choose`). `Evicted` is a chosen policy the rail
 * no longer lists. It is still the one a run evaluates, and a view says it has
 * left the log; it is neither dropped nor swapped for a neighbour.
 *
 * Nothing but the compiler keeps the three arms equal to `HeldChoice<PolicySighting>`,
 * and it does: `policyChoice` returns `resolveHeld`'s answer as a `PolicyChoice`, and
 * `policyOf` reads the held arms through `heldValue`, so an arm added to either side,
 * or a field renamed on one, stops compiling there; `SeededChoice.tst.ts` pins the
 * equality.
 */
export type PolicyChoice =
  | { readonly _tag: "Empty" }
  | { readonly _tag: "Listed"; readonly value: PolicySighting; readonly index: number }
  | { readonly _tag: "Evicted"; readonly value: PolicySighting }
  | {
      readonly _tag: "Seeded";
      readonly entry: TimelineEntry;
      readonly policy: Policy;
      readonly unseeded: ReadonlyArray<UnseededField>;
    };

/** One entry of the policy dropdown: what it submits and what it says. */
export interface PolicyMenuOption {
  readonly value: string;
  readonly label: string;
}

/**
 * What the policy dropdown lists, in order, and which entry it shows.
 *
 * A reading of the policy the session holds, never the other way round: the
 * replayed row or an evicted choice leads the list while there is one, then each
 * sighting under its position as `String(index)`. `choosePolicyAt` takes a
 * position of `options`, so a view parses nothing.
 */
export interface PolicyMenu {
  readonly options: ReadonlyArray<PolicyMenuOption>;
  readonly selected: string;
}

/** The policy a replayed row carries, and the form fields the replay left blank. */
export interface ReplayedPolicy {
  readonly policy: Policy;
  readonly unseeded: ReadonlyArray<UnseededField>;
}

/**
 * The logged row a form was seeded from, and its policy while that is the running one.
 *
 * The policy is held with the row it came from, so neither exists without the other.
 * It is absent for an orphan row, which has no policy to replay, and once the reviewer
 * has chosen a policy.
 */
export interface SeedRow {
  readonly entry: TimelineEntry;
  readonly replayed: ReplayedPolicy | undefined;
}

/** The rail, the sighting chosen from it, and the row the form was seeded from. */
export interface SeededChoice {
  readonly sightings: ReadonlyArray<PolicySighting>;
  /** The sighting held, or nothing while the default still follows the head. */
  readonly held: PolicySighting | undefined;
  readonly seed: SeedRow | undefined;
}

/** A seeded choice and the form a replay of its row fills in, when the row replays. */
export interface Seeding {
  readonly choice: SeededChoice;
  readonly input: SimulationInput | undefined;
}

/** The sighting to hold: the one held, else the head, unless a replay is held. */
const pinUnlessReplayed = (
  sightings: ReadonlyArray<PolicySighting>,
  held: PolicySighting | undefined,
  seed: SeedRow | undefined,
): PolicySighting | undefined =>
  seed?.replayed === undefined ? pinHead(sightings, held) : held;

/**
 * Seeds `choice` from `entry`, or from no row at all.
 *
 * The row is decoded once, and the input it fills the form with comes back beside
 * the choice, for the row already held too: whether to seed again is the caller's to
 * decide. A seeding that changes nothing answers `choice` itself. The row already
 * held is kept unless the reviewer has chosen a policy since and the row replays,
 * which brings its policy back: a row decodes to the same replay every time.
 */
export const seedFrom = (
  choice: SeededChoice,
  entry: TimelineEntry | undefined,
): Seeding => {
  const replay = entry === undefined ? undefined : replayInput(entry);
  const replayable = replay?._tag === "Replayable" ? replay : undefined;
  const kept = choice.seed;
  const keeps =
    kept?.entry === entry &&
    (kept?.replayed === undefined) === (replayable === undefined);
  const seed: SeedRow | undefined = keeps
    ? kept
    : entry === undefined
      ? undefined
      : {
          entry,
          replayed:
            replayable === undefined
              ? undefined
              : { policy: replayable.policy, unseeded: replayable.unseeded },
        };
  const held = pinUnlessReplayed(choice.sightings, choice.held, seed);
  return {
    choice:
      seed === choice.seed && held === choice.held
        ? choice
        : { sightings: choice.sightings, held, seed },
    input: replayable?.input,
  };
};

/** A choice over `sightings`, seeded from `seed` when there is one. */
export const seededChoice = (
  sightings: ReadonlyArray<PolicySighting>,
  seed?: TimelineEntry,
): Seeding => seedFrom({ sightings, held: undefined, seed: undefined }, seed);

/** The choice over a new rail: the same one for the same elements, else the held one. */
export const withSightings = (
  choice: SeededChoice,
  sightings: ReadonlyArray<PolicySighting>,
): SeededChoice =>
  sameElements(sightings, choice.sightings)
    ? choice
    : {
        ...choice,
        sightings,
        held: pinUnlessReplayed(sightings, choice.held, choice.seed),
      };

/**
 * Chooses a policy, held by value from here on.
 *
 * A policy the rail does not list is held as chosen, so it reads as `Evicted` at once.
 * Choosing leaves a replayed row behind: the row stays the one it was seeded from
 * (`seededFrom`), but its policy is no longer the running one.
 */
export const choose = (choice: SeededChoice, policy: Policy): SeededChoice => {
  const same = choice.held !== undefined && Equal.equals(choice.held.policy, policy);
  if (same && choice.seed?.replayed === undefined) return choice;
  return {
    ...choice,
    held: same ? choice.held : sightingFor(choice.sightings, policy),
    seed:
      choice.seed === undefined
        ? undefined
        : { entry: choice.seed.entry, replayed: undefined },
  };
};

/** Where the choice is now: the replayed policy while held, else the held sighting. */
export const policyChoice = (choice: SeededChoice): PolicyChoice =>
  choice.seed?.replayed === undefined
    ? resolveHeld(choice.sightings, choice.held, sameSighting)
    : {
        _tag: "Seeded",
        entry: choice.seed.entry,
        policy: choice.seed.replayed.policy,
        unseeded: choice.seed.replayed.unseeded,
      };

/** The policy a run evaluates, or nothing while the rail is empty. */
export const policyOf = (choice: SeededChoice): Policy | undefined => {
  const picked = policyChoice(choice);
  return picked._tag === "Seeded" ? picked.policy : heldValue(picked)?.policy;
};

/**
 * The row a result is compared against, when there is one to compare with.
 *
 * The replayed row while its policy is the one running. An orphan has no policy to
 * replay, so it never becomes the running policy, but it is still the row the
 * reviewer opened, and the baseline says it carries no decision. A replayable row the
 * reviewer walked away from is neither.
 */
export const seedOf = (choice: SeededChoice): TimelineEntry | undefined => {
  const seed = choice.seed;
  if (seed === undefined) return undefined;
  return seed.replayed === undefined && seed.entry._tag === "TimelineDecision"
    ? undefined
    : seed.entry;
};

/** The row the form was last seeded from, whether or not its policy still runs. */
export const seededFrom = (choice: SeededChoice): TimelineEntry | undefined =>
  choice.seed?.entry;

/** One entry of the menu: what a select holds and says, and the sighting it names. */
interface MenuEntry {
  readonly value: string;
  readonly label: string;
  readonly sighting: PolicySighting | undefined;
  readonly selected: boolean;
}

/** The entries before the rail, and the position the choice is listed at, if it is. */
interface MenuLead {
  readonly entries: ReadonlyArray<MenuEntry>;
  readonly listed: number | undefined;
}

const menuLead: (choice: PolicyChoice) => MenuLead = Match.type<PolicyChoice>().pipe(
  Match.tagsExhaustive({
    Empty: () => ({ entries: [], listed: undefined }),
    Listed: ({ index }) => ({ entries: [], listed: index }),
    Evicted: ({ value }) => ({
      entries: [
        {
          value: "evicted",
          label: `${value.label} — no longer in the log`,
          sighting: undefined,
          selected: true,
        },
      ],
      listed: undefined,
    }),
    Seeded: () => ({
      entries: [
        {
          value: "seeded",
          label: "from the replayed row",
          sighting: undefined,
          selected: true,
        },
      ],
      listed: undefined,
    }),
  }),
);

const menuEntries = (choice: SeededChoice): ReadonlyArray<MenuEntry> => {
  const { entries, listed } = menuLead(policyChoice(choice));
  return [
    ...entries,
    ...choice.sightings.map((sighting, index) => ({
      value: String(index),
      label: sighting.label,
      sighting,
      selected: index === listed,
    })),
  ];
};

/** What the policy dropdown lists, in order, and which entry it shows. */
export const menuOf = (choice: SeededChoice): PolicyMenu => {
  const entries = menuEntries(choice);
  return {
    options: entries.map(({ value, label }) => ({ value, label })),
    selected: entries.find((entry) => entry.selected)?.value ?? "",
  };
};

/** The sighting the menu lists at `position`, or nothing for one that names none. */
export const sightingAt = (
  choice: SeededChoice,
  position: number,
): PolicySighting | undefined => menuEntries(choice)[position]?.sighting;
