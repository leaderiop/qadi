/**
 * Who can be logged in, and what necessarily crosses to the browser with them.
 *
 * `fromRoles` flattens the graph, so `hakim.roles` transitively contains
 * `Reader` and `hakim.permissions` contains everything those roles grant.
 *
 * **That flattened set has to cross.** It is tempting to ship an id and keep the
 * grants on the server, and it does not work: `hasPermission` and `hasRole` read
 * the subject directly rather than through a port, so a browser holding a
 * stripped subject would deny every permission question the server allowed —
 * turning hydration's re-check from a safety property into a mismatch on every
 * page. The three ports (`AttributeResolver`, `RelationshipResolver`,
 * `DecisionHistory`) can be remote; the subject's own grants cannot.
 *
 * So the disclosure is real and is a consequence of the design rather than an
 * oversight: a page that re-checks its own decisions tells the browser what the
 * user may do. What it need **not** disclose is why — which is what
 * `dehydrateDecisions` withholds by default, and what `/edge/leakage` shows.
 *
 * **`standing` is deliberately not here.** `readAttribute` consults the subject
 * first and calls `AttributeResolver` only on a miss — which is what preserves
 * short-circuiting, and which means an attribute *present* on the subject is
 * frozen for the life of that subject object. A browser holding a subject that
 * carries a mutable attribute can never learn it changed. `clearance` is static
 * and belongs on the subject; `standing` is revocable, so it must miss and go to
 * the port. `/edge/divergent` cannot work any other way, and quietly failed to
 * work at all until this was noticed.
 */
import { fromRoles } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { author, chiefEditor, editor, legalReviewer, reader } from "./roles.ts";

export interface DemoUser {
  readonly id: string;
  readonly label: string;
  readonly note: string;
  readonly subject: AuthSubject;
}

const clearance = (level: number, compartments: ReadonlyArray<string>) => ({ level, compartments });

export const users: ReadonlyArray<DemoUser> = [
  {
    id: "yasmine",
    label: "Yasmine — Reader",
    note:
      "Published articles only. Sources and legal notes are absent from what she is sent, not hidden in it.",
    subject: fromRoles({
      id: "yasmine",
      roles: [reader],
      attributes: { clearance: clearance(0, []) },
    }),
  },
  {
    id: "nadia",
    label: "Nadia — Author",
    note:
      "Wrote two of the four. Reaches her own drafts through `author-of`, which is a RelationshipResolver call and shows up in Port calls.",
    subject: fromRoles({
      id: "nadia",
      roles: [author],
      attributes: { clearance: clearance(1, ["finance"]) },
    }),
  },
  {
    id: "omar",
    label: "Omar — Editor",
    note:
      "Sees sources: `source:read` enters the graph at Editor, so the field intersection stops narrowing.",
    subject: fromRoles({
      id: "omar",
      roles: [editor],
      attributes: { clearance: clearance(2, ["finance", "security"]) },
    }),
  },
  {
    id: "hakim",
    label: "Hakim — Chief editor",
    note: "The only subject who may publish, and the only one `/__decisions` will talk to.",
    subject: fromRoles({
      id: "hakim",
      roles: [chiefEditor],
      attributes: { clearance: clearance(3, ["finance", "security"]) },
    }),
  },
  {
    id: "leila",
    label: "Leila — Legal reviewer",
    note:
      "Inherits nothing, and holds `article:read` by a different path than Yasmine does — which is what the Roles screen's provenance column is for.",
    subject: fromRoles({
      id: "leila",
      roles: [legalReviewer],
      attributes: { clearance: clearance(1, ["security"]) },
    }),
  },
];

export const DEFAULT_USER = "yasmine";

const fallback: DemoUser = {
  id: "anonymous",
  label: "Anonymous",
  note: "No cookie, or a cookie naming nobody. Holds nothing, and is denied everything.",
  subject: fromRoles({ id: "anonymous", roles: [], attributes: {} }),
};

/**
 * Never throws and never guesses.
 *
 * An unknown id is a request from someone this newsroom does not know, and the
 * safe reading is *nobody* — not "the first user in the list", which is how a
 * demo turns a missing cookie into an authenticated session.
 */
export const userById = (id: string | undefined): DemoUser =>
  users.find((user) => user.id === id) ?? fallback;

/** Every subject id this app will mint a session for. */
export const knownUserIds: ReadonlyArray<string> = users.map((user) => user.id);

export const grantsOf = (subject: AuthSubject): {
  readonly roles: ReadonlyArray<string>;
  readonly permissions: ReadonlyArray<string>;
} => ({
  roles: [...subject.roles].sort(),
  permissions: [...subject.permissions].sort(),
});
