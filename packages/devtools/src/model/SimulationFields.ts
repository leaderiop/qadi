/**
 * Each simulation input field, described once.
 *
 * `SimulationInput` holds seven list-or-record fields - a subject's roles,
 * permissions and attributes, and the resolver attributes, relationships,
 * history and signatures the ports would answer. Six modules used to restate
 * each one: where it lives in the input, which codec writes its chips, when two
 * elements are the same, who an element names, what dropping it is called. When
 * `signatures` gained its form field, five of the six were told and the
 * weakening sweep was not, so a `hasSignature` allow swept to a table that never
 * asked "was it the signature?" (ARCH-61, porting lost ARCH-48 `950977f`;
 * decision D-48-a, one closed table).
 *
 * `SIMULATION_FIELDS` is the description: one row per field, closed over
 * {@link SimulationField}, so a field without a row, or a row without a column,
 * is a compile error. The operations every consumer needs - the weakening drops,
 * the remedies' grants, the rename, the chip commands and the form reading - are
 * **derived** from a row by {@link fieldOps}, the pattern ADR-QD-094 applies to
 * a port: state the facts once, derive the rest. The fixture half is keyed by
 * `@qadi/core`'s `PortName`, so a port added to the registry is TS2741 here
 * instead of a silent default.
 *
 * Package-private (ADR-QD-099): only the types the session's interface names
 * leave this package. A leaf above `SimulationForm.ts` (the codecs and
 * equalities), `SimulationEdit.ts` and `SimulationInput.ts`; it must not import
 * `Edits.ts`, `Remedies.ts`, `Replay.ts` or `SimulationSession.ts`, which
 * import it (ADR-QD-037).
 */
import * as Match from "effect/Match";
import type {
  ActedEventInput,
  PermissionKey,
  PortFixtureData,
  PortName,
  RelationshipEdgeInput,
  SignatureInput,
} from "@qadi/core";
import type { EditKind, SimulationEdit } from "./SimulationEdit.ts";
import type { AttributePair, ChipCodec, Decoded } from "./SimulationForm.ts";
import {
  attributeCodec,
  attributeLabel,
  edgeCodec,
  eventCodec,
  ok,
  permissionCodec,
  refused,
  roleCodec,
  sameEdge,
  sameEvent,
  sameSignature,
  signatureCodec,
} from "./SimulationForm.ts";
import type { SimulationInput } from "./SimulationInput.ts";

/** The element type of each held field. */
export interface FieldElements {
  readonly roles: string;
  readonly permissions: PermissionKey;
  readonly subjectAttributes: AttributePair;
  readonly attributes: AttributePair;
  readonly relationships: RelationshipEdgeInput;
  readonly history: ActedEventInput;
  readonly signatures: SignatureInput;
}

/** The closed set of a simulation's held fields. */
export type SimulationField = keyof FieldElements;

/** The weakening kinds: every `Drop...` member of `EditKind`. */
export type DropKind = Extract<EditKind, `Drop${string}`>;

/** The strengthening kinds that add to a held field. */
export type GrantKind = Extract<
  EditKind,
  "GrantRole" | "GrantPermission" | "SetSubjectAttribute" | "AddRelationship" | "AddEvent" | "AddSignature"
>;

/**
 * The fields a requirement can be granted into.
 *
 * Every field but the resolver attributes: `SubjectRef` reads the subject's own
 * attributes (`resolveRef`), so the sweep sets a requirement's attribute on the
 * subject and has nothing to offer the resolver's.
 */
export type GrantedField = Exclude<SimulationField, "attributes">;

/** Who answers a field: the subject being simulated, or a port. */
export type AnsweredBy =
  | { readonly _tag: "Subject" }
  | { readonly _tag: "Port"; readonly port: PortName };

/** One chip as the form shows it. */
export interface ChipView {
  /** The chip's codec text, or the refusal in parentheses for a value the form cannot show faithfully. */
  readonly text: string;
  readonly refused: boolean;
  /** What a control to remove this chip is called. */
  readonly removeLabel: string;
}

/** One field of the form: its caption, its chips and who answers it. */
export interface FieldView {
  readonly key: SimulationField;
  readonly label: string;
  readonly placeholder: string;
  readonly holder: "Subject" | "Port";
  readonly chips: ReadonlyArray<ChipView>;
}

/** The result of committing typed text to a field: the draft moved, or the reason it did not. */
export type ChipAdded =
  | { readonly _tag: "Ok" }
  | { readonly _tag: "Refused"; readonly reason: string };

/**
 * One field, stated once.
 *
 * `read` answers `undefined` for a field the input does not list, and `write`
 * replaces the list wholesale: "an absent field stays absent" is therefore the
 * derivation's rule, not each consumer's. A record field is read and written as
 * its entries, so a record and a list are one shape to every operation.
 */
export interface FieldDescription<A> {
  /** The caption the form shows, and the name the replay's unseeded list gives the field. */
  readonly label: string;
  readonly placeholder: string;
  readonly answeredBy: AnsweredBy;
  readonly read: (input: SimulationInput) => ReadonlyArray<A> | undefined;
  readonly write: (input: SimulationInput, elements: ReadonlyArray<A>) => SimulationInput;
  readonly codec: ChipCodec<A>;
  /** How a chip is shown. */
  readonly chip: (element: A, subjectId: string) => ChipView;
  readonly same: (a: A, b: A) => boolean;
  /** What committing an element the field already holds does: refuse it, or replace it. */
  readonly duplicate: "Refuse" | "Replace";
  /** Who an element names, and how to move it onto another subject; `undefined` when it names nobody. */
  readonly attribution:
    | {
        readonly of: (element: A) => string;
        readonly to: (element: A, subjectId: string) => A;
      }
    | undefined;
  readonly drop: {
    readonly kind: DropKind;
    readonly label: (element: A, subjectId: string) => string;
  };
}

// ---------------------------------------------------------------------------
// The rows
// ---------------------------------------------------------------------------

const SUBJECT: AnsweredBy = { _tag: "Subject" };
const port = (name: PortName): AnsweredBy => ({ _tag: "Port", port: name });

/** A chip whose text is its codec's: what is on screen decodes back to the element behind it. */
const codecChip =
  <A>(codec: ChipCodec<A>) =>
  (element: A, subjectId: string): ChipView => {
    const text = codec.encode(element, subjectId);
    return text._tag === "Ok"
      ? { text: text.value, refused: false, removeLabel: text.value }
      : { text: `(${text.reason})`, refused: true, removeLabel: `(${text.reason})` };
  };

/** A pair is shown as `name=value`, and removed by its name. */
const pairChip = (pair: AttributePair): ChipView => {
  const text = attributeLabel(pair);
  return text._tag === "Ok"
    ? { text: text.value, refused: false, removeLabel: pair[0] }
    : { text: `${pair[0]} (${text.reason})`, refused: true, removeLabel: pair[0] };
};

/** A record read as entries; `Object.entries` lists own properties, so `__proto__` stays a key. */
const entriesOf = (
  record: Readonly<Record<string, unknown>> | undefined,
): ReadonlyArray<AttributePair> | undefined => (record === undefined ? undefined : Object.entries(record));

/** Entries written back as a record. `Object.fromEntries` defines own properties, never a prototype. */
const recordOf = (pairs: ReadonlyArray<AttributePair>): Readonly<Record<string, unknown>> =>
  Object.fromEntries(pairs);

const samePair = (a: AttributePair, b: AttributePair): boolean => a[0] === b[0];

const sameName = (a: string, b: string): boolean => a === b;

const follow = <A extends { readonly subjectId: string }>(): FieldDescription<A>["attribution"] => ({
  of: (element) => element.subjectId,
  to: (element, subjectId) => ({ ...element, subjectId }),
});

/**
 * The subject is named only when it is not the one being simulated.
 *
 * A fixture list is usually all about the subject in the form, and repeating
 * their id on every row is noise; an edge belonging to somebody else is the
 * unusual case and is exactly the one worth spelling out.
 */
const edgeLabel = (edge: RelationshipEdgeInput, subjectId: string): string =>
  edge.subjectId === subjectId
    ? `relationship ${edge.relation} on ${edge.resourceId}`
    : `relationship ${edge.relation} on ${edge.resourceId} for ${edge.subjectId}`;

const eventLabel = (event: ActedEventInput, subjectId: string): string =>
  event.subjectId === subjectId
    ? `event ${event.event} on ${event.resourceId}`
    : `event ${event.event} on ${event.resourceId} by ${event.subjectId}`;

/**
 * A signature's row title: prose for the common case, the chip's own JSON when
 * a field prose does not carry is present.
 *
 * The label is the row's identity (`dedupeByLabel`), so two signatures that
 * differ only in `signedAt`, `algorithm` or `keyId` must not read alike: one
 * row would then stand for both, and dropping it would leave the other in place
 * while claiming to test it. A signature the form cannot spell at all (a `NaN`
 * time) falls back to prose.
 */
const signatureLabel = (signature: SignatureInput, subjectId: string): string => {
  if (
    signature.signedAt !== undefined ||
    signature.algorithm !== undefined ||
    signature.keyId !== undefined
  ) {
    const exact = signatureCodec.encode(signature, subjectId);
    if (exact._tag === "Ok") return `without signature ${exact.value}`;
  }
  return [
    `without signature ${signature.meaning}`,
    signature.resourceId === undefined ? "" : ` on ${signature.resourceId}`,
    signature.signerRole === undefined ? "" : ` as ${signature.signerRole}`,
    signature.subjectId === subjectId ? "" : ` by ${signature.subjectId}`,
  ].join("");
};

/**
 * `satisfies` rather than an annotation, so each row's literal `drop.kind`
 * survives for {@link RowDropKinds}; {@link SIMULATION_FIELDS} is the same value
 * under the closed, widened type every consumer reads.
 */
const rows = {
  roles: {
    label: "roles",
    placeholder: "roles",
    answeredBy: SUBJECT,
    read: (input) => input.subject.roles,
    write: (input, roles) => ({ ...input, subject: { ...input.subject, roles } }),
    codec: roleCodec,
    chip: codecChip(roleCodec),
    same: sameName,
    duplicate: "Refuse",
    attribution: undefined,
    drop: { kind: "DropRole", label: (role) => `without role ${role}` },
  },
  permissions: {
    label: "permissions",
    placeholder: "resource:action",
    answeredBy: SUBJECT,
    read: (input) => input.subject.permissions,
    write: (input, permissions) => ({ ...input, subject: { ...input.subject, permissions } }),
    codec: permissionCodec,
    chip: codecChip(permissionCodec),
    same: sameName,
    duplicate: "Refuse",
    attribution: undefined,
    drop: { kind: "DropPermission", label: (key) => `without permission ${key}` },
  },
  subjectAttributes: {
    label: "subject attributes",
    placeholder: "name:value",
    answeredBy: SUBJECT,
    read: (input) => entriesOf(input.subject.attributes),
    write: (input, pairs) => ({
      ...input,
      subject: { ...input.subject, attributes: recordOf(pairs) },
    }),
    codec: attributeCodec,
    chip: pairChip,
    same: samePair,
    duplicate: "Replace",
    attribution: undefined,
    drop: { kind: "DropSubjectAttribute", label: ([name]) => `without subject attribute ${name}` },
  },
  attributes: {
    label: "resolver attributes",
    placeholder: "name:value",
    answeredBy: port("AttributeResolver"),
    read: (input) => entriesOf(input.attributes),
    write: (input, pairs) => ({ ...input, attributes: recordOf(pairs) }),
    codec: attributeCodec,
    chip: pairChip,
    same: samePair,
    duplicate: "Replace",
    attribution: undefined,
    drop: { kind: "DropFixtureAttribute", label: ([name]) => `without resolver attribute ${name}` },
  },
  relationships: {
    label: "relationships",
    placeholder: "relation:resourceId",
    answeredBy: port("RelationshipResolver"),
    read: (input) => input.relationships,
    write: (input, relationships) => ({ ...input, relationships }),
    codec: edgeCodec,
    chip: codecChip(edgeCodec),
    same: sameEdge,
    duplicate: "Refuse",
    attribution: follow<RelationshipEdgeInput>(),
    drop: {
      kind: "DropRelationship",
      label: (edge, subjectId) => `without ${edgeLabel(edge, subjectId)}`,
    },
  },
  history: {
    label: "history",
    placeholder: "event:resourceId",
    answeredBy: port("DecisionHistory"),
    read: (input) => input.history,
    write: (input, history) => ({ ...input, history }),
    codec: eventCodec,
    chip: codecChip(eventCodec),
    same: sameEvent,
    duplicate: "Refuse",
    attribution: follow<ActedEventInput>(),
    drop: {
      kind: "DropEvent",
      label: (event, subjectId) => `without ${eventLabel(event, subjectId)}`,
    },
  },
  signatures: {
    label: "signatures",
    placeholder: "meaning:resourceId",
    answeredBy: port("SignatureHistory"),
    read: (input) => input.signatures,
    write: (input, signatures) => ({ ...input, signatures }),
    codec: signatureCodec,
    chip: codecChip(signatureCodec),
    same: sameSignature,
    duplicate: "Refuse",
    attribution: follow<SignatureInput>(),
    drop: { kind: "DropSignature", label: signatureLabel },
  },
} satisfies { readonly [K in SimulationField]: FieldDescription<FieldElements[K]> };

/** The `drop.kind` each row names, as literals: the type-level half of "every `Drop...` has a row". */
export type RowDropKinds = (typeof rows)[SimulationField]["drop"]["kind"];

/** Every field, described. A missing row is TS2741; a missing column is TS2322. */
export const SIMULATION_FIELDS: { readonly [K in SimulationField]: FieldDescription<FieldElements[K]> } =
  rows;

/**
 * The order the form lists the fields, the sweep derives its rows and the replay
 * names what it left blank: from what a subject *is* toward what the world around
 * them says. Stated once, so the three cannot disagree.
 */
export const FIELD_ORDER = [
  "roles",
  "permissions",
  "subjectAttributes",
  "attributes",
  "relationships",
  "history",
  "signatures",
] as const satisfies ReadonlyArray<SimulationField>;

/** Which strengthening adds to each granted field. */
export const GRANT_KINDS: { readonly [K in GrantedField]: GrantKind } = {
  roles: "GrantRole",
  permissions: "GrantPermission",
  subjectAttributes: "SetSubjectAttribute",
  relationships: "AddRelationship",
  history: "AddEvent",
  signatures: "AddSignature",
};

// ---------------------------------------------------------------------------
// The derived operations
// ---------------------------------------------------------------------------

/** What a field can do, derived from its row. */
export interface FieldOps<A> {
  /** The elements the input lists, or none for a field it does not list. */
  readonly elements: (input: SimulationInput) => ReadonlyArray<A>;
  /** True when the input lists an element the field counts as the same. */
  readonly holds: (input: SimulationInput, element: A) => boolean;
  /** One weakening per element the input lists, each removing exactly that element. */
  readonly drops: (input: SimulationInput) => ReadonlyArray<SimulationEdit>;
  /** Commits typed text, by the field's codec. */
  readonly addChip: (input: SimulationInput, text: string) => Decoded<SimulationInput>;
  /** The input without the chip at `index`; the input itself when there is none. */
  readonly removeChip: (input: SimulationInput, index: number) => SimulationInput;
  /** The field's chips as the form shows them. */
  readonly chips: (input: SimulationInput) => ReadonlyArray<ChipView>;
  /** Moves the elements that named `from` onto `to`. */
  readonly rename: (input: SimulationInput, from: string, to: string) => SimulationInput;
}

/**
 * The list with `element` added. A field that replaces a duplicate takes the new
 * element **last**, as a record set always has.
 */
const inserted = <A>(
  row: FieldDescription<A>,
  held: ReadonlyArray<A>,
  element: A,
): ReadonlyArray<A> =>
  row.duplicate === "Replace"
    ? [...held.filter((other) => !row.same(other, element)), element]
    : [...held, element];

const derive = <A>(row: FieldDescription<A>): FieldOps<A> => {
  const elements = (input: SimulationInput): ReadonlyArray<A> => row.read(input) ?? [];
  return {
    elements,

    holds: (input, element) => elements(input).some((held) => row.same(held, element)),

    // Applying an edit to an input that does not list the field at all leaves
    // that input exactly as it was. `apply` is public and composes, so nothing
    // stops an edit derived from one input running against another; rebuilding
    // the field as an empty one would turn "no roles listed" into "an empty
    // role list", and a row claiming to have changed something it did not is the
    // one thing a what-if table must never do.
    drops: (input) =>
      elements(input).map((element) => ({
        kind: row.drop.kind,
        direction: "Weaken",
        label: row.drop.label(element, input.subject.id),
        apply: (self) => {
          const held = row.read(self);
          return held === undefined
            ? self
            : row.write(self, held.filter((other) => !row.same(element, other)));
        },
      })),

    addChip: (input, text) => {
      if (text.trim() === "") return refused("nothing to add");
      const decoded = row.codec.decode(text, input.subject.id);
      if (decoded._tag === "Refused") return decoded;
      const held = elements(input);
      // By structure, never by display text: two edges that differ only by
      // subject are two elements.
      if (row.duplicate === "Refuse" && held.some((other) => row.same(other, decoded.value))) {
        return refused("already there");
      }
      return ok(row.write(input, inserted(row, held, decoded.value)));
    },

    removeChip: (input, index) => {
      const held = row.read(input);
      if (held === undefined || index < 0 || index >= held.length) return input;
      return row.write(input, held.filter((_, at) => at !== index));
    },

    chips: (input) => elements(input).map((element) => row.chip(element, input.subject.id)),

    rename: (input, from, to) => {
      const attribution = row.attribution;
      const held = row.read(input);
      if (attribution === undefined || held === undefined) return input;
      return row.write(
        input,
        held.map((element) => (attribution.of(element) === from ? attribution.to(element, to) : element)),
      );
    },
  };
};

/** A field's operations. */
export const fieldOps = <K extends SimulationField>(key: K): FieldOps<FieldElements[K]> =>
  derive(SIMULATION_FIELDS[key]);

/**
 * A strengthening that adds `element` to a field the policy can ask for.
 *
 * The caller has already decided the input does not hold it; this only builds
 * the edit, appending to the list the input has or starting one.
 */
export const grant = <K extends GrantedField>(
  key: K,
  element: FieldElements[K],
  label: string,
): SimulationEdit => {
  const row = SIMULATION_FIELDS[key];
  return {
    kind: GRANT_KINDS[key],
    direction: "Strengthen",
    label,
    apply: (self) => row.write(self, inserted(row, row.read(self) ?? [], element)),
  };
};

/**
 * The input with the subject renamed, and every element that named the old id
 * moved with it.
 *
 * Edges, events and signatures attributed to `from` follow; the ones naming
 * somebody else stay where they are, which is what the Fixtures card's caption
 * promises.
 */
export const renameSubject = (input: SimulationInput, from: string, to: string): SimulationInput =>
  FIELD_ORDER.reduce(
    (renamed, key) => fieldOps(key).rename(renamed, from, to),
    { ...input, subject: { ...input.subject, id: to } },
  );

/** The form, top to bottom: every field with its chips. */
export const formOf = (input: SimulationInput): ReadonlyArray<FieldView> =>
  FIELD_ORDER.map((key) => ({
    key,
    label: SIMULATION_FIELDS[key].label,
    placeholder: SIMULATION_FIELDS[key].placeholder,
    holder: SIMULATION_FIELDS[key].answeredBy._tag,
    chips: fieldOps(key).chips(input),
  }));

// ---------------------------------------------------------------------------
// What replay cannot seed
// ---------------------------------------------------------------------------

/**
 * Named once and shared, because these two sentences are the whole of what
 * replay cannot do and repeating them per field would let them drift apart.
 */
const NOTHING_BUT_AN_ID = "a record names the subject by id and carries nothing else about them";
const ANSWERS_NOT_FIXTURES =
  "a record carries what the ports answered inside its trace, never as fixtures a rerun could use";

/** Why a replayed row leaves this field blank: selected by who answers it. */
export const unseededReason: (by: AnsweredBy) => string = Match.type<AnsweredBy>().pipe(
  Match.tagsExhaustive({
    Subject: () => NOTHING_BUT_AN_ID,
    Port: () => ANSWERS_NOT_FIXTURES,
  }),
);

// ---------------------------------------------------------------------------
// The fixture half, keyed by port
// ---------------------------------------------------------------------------

/** A port the form has no vocabulary for, and why. */
export interface NoFormVocabulary {
  readonly _tag: "NoFormVocabulary";
  readonly reason: string;
}

/** One port's fixture data from an input: the data, nothing, or the statement that the form has none. */
export type FixtureCell<K extends PortName> =
  | ((input: SimulationInput) => PortFixtureData[K] | undefined)
  | NoFormVocabulary;

/**
 * Each port's fixture data, closed over `PortName`: a port added to the registry
 * without a cell is TS2741 here, where it used to be left silently at its
 * default (lost ARCH-48 `950977f`, C11).
 *
 * `CustomPredicate` is a typed cell with its reason rather than a comment:
 * `SimulationInput` has no vocabulary for a custom predicate's answer - unlike an
 * attribute or an edge, there is no small typed value a reviewer could type in
 * that stands for arbitrary registered logic - so Fixtures mode leaves it at its
 * default and a `HasCustom` node always denies, the fail-closed answer a real
 * deployment gets from an unwired registry. Core's fixture table does have a
 * vocabulary for it (fixed answers by name); building the form that feeds it is
 * devtools UI work, not a gap in the table.
 */
export const FIXTURE_DATA: { readonly [K in PortName]: FixtureCell<K> } = {
  AttributeResolver: (input) => input.attributes,
  RelationshipResolver: (input) => input.relationships,
  DecisionHistory: (input) => input.history,
  SignatureHistory: (input) => input.signatures,
  CustomPredicate: {
    _tag: "NoFormVocabulary",
    reason:
      "a custom predicate's answer has no small typed value to type in; it answers from Snapshot or Live",
  },
};

/** One port's fixture data from an input: what the cell reads, or nothing for a port the form has no vocabulary for. */
export const fixtureData = <K extends PortName>(
  cell: FixtureCell<K>,
  input: SimulationInput,
): PortFixtureData[K] | undefined => (typeof cell === "function" ? cell(input) : undefined);
