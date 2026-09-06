import { defineSteps } from "@effect-cucumber/vitest";
import { join } from "@qadi/core";
import { patch, readState, World } from "./SharedWorld.ts";

const label = (level: number, compartments: string) => ({
  level,
  compartments: compartments === "" ? [] : compartments.split(",").map((c) => c.trim()),
});

/** Clearance and classification labels for the MLS / Bell-LaPadula scenarios. */
export const securityLabelGivenSteps = defineSteps<World>(({ Given }) => {
  Given("a subject {string} cleared at level {int}", function* (id: string, level: number) {
    const s = yield* readState();
    yield* patch(() => ({
      subjectId: id,
      attributes: { ...s.attributes, clearance: label(level, "") },
    }));
  });

  Given(
    "a subject {string} cleared at level {int} in compartment {string}",
    function* (id: string, level: number, compartment: string) {
      const s = yield* readState();
      yield* patch(() => ({
        subjectId: id,
        attributes: { ...s.attributes, clearance: label(level, compartment) },
      }));
    },
  );

  Given(
    "a subject {string} cleared at level {int} in compartments {string}",
    function* (id: string, level: number, compartments: string) {
      const s = yield* readState();
      yield* patch(() => ({
        subjectId: id,
        attributes: { ...s.attributes, clearance: label(level, compartments) },
      }));
    },
  );

  Given("the resource {string} classified at level {int}", function* (id: string, level: number) {
    yield* patch(() => ({ resource: { id, label: label(level, "") } }));
  });

  Given(
    "the resource {string} classified at level {int} in compartment {string}",
    function* (id: string, level: number, compartment: string) {
      yield* patch(() => ({ resource: { id, label: label(level, compartment) } }));
    },
  );

  /** The plural existed for the subject and not the resource. A genuine partial
   * order needs two compartments on BOTH sides — `{A,B}` against `{A,C}` — which
   * the singular cannot express. */
  Given(
    "the resource {string} classified at level {int} in compartments {string}",
    function* (id: string, level: number, compartments: string) {
      yield* patch(() => ({ resource: { id, label: label(level, compartments) } }));
    },
  );

  /**
   * The resource labelled with the JOIN of two sources.
   *
   * The whole point of exporting `join`: a document derived from two sources is
   * classified at their least upper bound, and computing that by hand is where a
   * caller under-classifies (ADR-QD-029).
   */
  Given(
    "the resource {string} derived from level {int} in compartments {string} and level {int} in compartments {string}",
    function* (
      id: string,
      levelA: number,
      compartmentsA: string,
      levelB: number,
      compartmentsB: string,
    ) {
      yield* patch(() => ({
        resource: { id, label: join(label(levelA, compartmentsA), label(levelB, compartmentsB)) },
      }));
    },
  );
});
