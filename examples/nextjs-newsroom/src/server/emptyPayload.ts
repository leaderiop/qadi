import "server-only";
/**
 * A payload for a page that decided nothing.
 *
 * `dehydrateDecisions([])` cannot do this, and the reason is structural rather
 * than an oversight: the payload's `subjectId` comes from `entries[0]`, so with
 * no entries there is no subject to name and it is `""`. That empty string
 * matches no subject, so `hydrateDecisions` refuses the payload as a
 * `PayloadSubjectMismatch` — of zero entries.
 *
 * Nothing is seeded either way, so it is harmless in effect. It is not harmless
 * in *reporting*: a page that guards nothing reports "this payload was decided
 * for somebody else", which is untrue and, on a page where a real mismatch would
 * matter, is noise in front of the signal.
 *
 * So a page with no questions names its own subject and ships no entries, which
 * is what it means. Recorded in the README as an observation about the library
 * rather than fixed here — `dehydrateDecisions` takes only entries, and giving
 * it an explicit subject is an API change this example is not the place to make.
 */
import type { AuthSubject } from "@qadi/core";
import type { DehydratedDecisions } from "@qadi/react";

export const emptyPayload = (subject: AuthSubject): DehydratedDecisions => ({
  subjectId: subject.id,
  entries: [],
});
