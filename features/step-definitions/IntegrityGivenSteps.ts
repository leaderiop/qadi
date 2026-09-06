import { defineSteps } from "@effect-cucumber/vitest";
import { patch, readState, World } from "./SharedWorld.ts";

const label = (level: number, compartments: string) => ({
  level,
  compartments: compartments === "" ? [] : compartments.split(",").map((c) => c.trim()),
});

// Biba is an integrity model, so it says `integrity` rather than `clearance` and
// `artefact` rather than `document`. The same lattice underneath — these reuse
// the `label` helper `SecurityLabelGivenSteps.ts` also defines — but the
// vocabulary is the model's own, and the attribute name is load-bearing: the
// clearance steps write `attributes["clearance"]`, which no Biba policy reads.

/** Integrity labels for the Biba scenarios. */
export const integrityGivenSteps = defineSteps<World>(({ Given }) => {
  Given("a producer {string} at integrity level {int}", function* (id: string, level: number) {
    const s = yield* readState();
    yield* patch(() => ({
      subjectId: id,
      attributes: { ...s.attributes, integrity: label(level, "") },
    }));
  });

  Given(
    "a producer {string} at integrity level {int} in compartment {string}",
    function* (id: string, level: number, compartment: string) {
      const s = yield* readState();
      yield* patch(() => ({
        subjectId: id,
        attributes: { ...s.attributes, integrity: label(level, compartment) },
      }));
    },
  );

  Given("the artefact {string} at integrity level {int}", function* (id: string, level: number) {
    yield* patch(() => ({ resource: { id, label: label(level, "") } }));
  });

  Given(
    "the artefact {string} at integrity level {int} in compartment {string}",
    function* (id: string, level: number, compartment: string) {
      yield* patch(() => ({ resource: { id, label: label(level, compartment) } }));
    },
  );

  /**
   * Deliberately a *resolved* attribute and not a subject one. A static attribute
   * cannot change between evaluations, and per BEH-QD-034 it would shadow this one
   * entirely — `HasAttribute` reads the subject first and calls the resolver only
   * on a miss.
   */
  Given(
    "the attribute service resolves the effective integrity to level {int}",
    function* (level: number) {
      const s = yield* readState();
      yield* patch(() => ({
        resolvedAttributes: { ...s.resolvedAttributes, effectiveIntegrity: label(level, "") },
      }));
    },
  );

  /** The misconfiguration BEH-QD-034 makes possible. Used by one scenario, to fail. */
  Given(
    "the producer also carries a static effective integrity of level {int}",
    function* (level: number) {
      const s = yield* readState();
      yield* patch(() => ({
        attributes: { ...s.attributes, effectiveIntegrity: label(level, "") },
      }));
    },
  );
});
