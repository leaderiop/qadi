/**
 * The simulator's form as a codec: text a reviewer types, and the
 * `SimulationInput` it stands for.
 *
 * **Every text this module renders decodes back to what produced it.** The view
 * used to translate by hand in four places, and each translation lost something
 * — an edge naming another subject was rewritten to the current one on the next
 * edit, a relation containing a colon was split in two, the string `"7"` and the
 * number `7` printed alike. A codec with a round-trip law in one module is the
 * repair: a value the form cannot show faithfully is **refused** as a typed
 * case rather than rendered lossily.
 *
 * Each field has a short form for the common case and an explicit JSON form for
 * everything else. The short form is used only when decoding it gives back
 * exactly the value that was encoded, so the choice between the two is made by
 * the encoder, never by the reader.
 *
 * Pure, and importing nothing but the input vocabulary: it is a leaf above
 * `SimulationInput.ts`, like `Edits.ts`.
 */
import type {
  ActedEventInput,
  PermissionKey,
  RelationshipEdgeInput,
  Resource,
  SignatureInput,
} from "@qadi/core";
import type { SimulationInput } from "./SimulationInput.ts";

/** A decoded value, or the reason the text (or the value) cannot be represented. */
export type Decoded<A> =
  | { readonly _tag: "Ok"; readonly value: A }
  | { readonly _tag: "Refused"; readonly reason: string };

const ok = <A>(value: A): Decoded<A> => ({ _tag: "Ok", value });
const refused = <A = never>(reason: string): Decoded<A> => ({ _tag: "Refused", reason });

/**
 * One chip's text in and out.
 *
 * `subjectId` is the form's current subject: it is what makes the short form
 * of an edge, event or signature unambiguous, because the short form leaves
 * the subject out.
 */
export interface ChipCodec<A> {
  readonly encode: (value: A, subjectId: string) => Decoded<string>;
  readonly decode: (text: string, subjectId: string) => Decoded<A>;
}

// ---------------------------------------------------------------------------
// JSON, strictly
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPlainRecord = (value: unknown): value is Readonly<Record<string, unknown>> => {
  if (!isRecord(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/** `JSON.parse` behind a result. `String`, not `error.message`: only a `SyntaxError` is thrown. */
const parseJson = (text: string): Decoded<unknown> => {
  try {
    const value: unknown = JSON.parse(text);
    return ok(value);
  } catch (error) {
    return refused(String(error));
  }
};

/** `Object.is` on scalars, structure on arrays and plain records — what JSON can carry. */
const sameJson = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) && a.length === b.length && a.every((item, index) => sameJson(item, b[index]))
    );
  }
  if (isPlainRecord(a)) {
    if (!isPlainRecord(b)) return false;
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && sameJson(a[key], b[key]))
    );
  }
  return Object.is(a, b);
};

/** `JSON.stringify` that answers `undefined` instead of throwing (a `BigInt`, a cycle). */
const stringify = (value: unknown): string | undefined => {
  try {
    const text: string | undefined = JSON.stringify(value);
    return text;
  } catch {
    return undefined;
  }
};

/**
 * The JSON text of a value, only when parsing it back gives the same value.
 *
 * `undefined`, `NaN`, `±Infinity`, `-0`, a `Map` or a class instance all
 * stringify to something else, so they are refused here instead of being shown
 * as text that would decode to a different value.
 */
const jsonText = (value: unknown): Decoded<string> => {
  const text = stringify(value);
  if (text === undefined) return refused("not representable in the form");
  const back = parseJson(text);
  return back._tag === "Ok" && sameJson(value, back.value)
    ? ok(text)
    : refused("not representable in the form");
};

// ---------------------------------------------------------------------------
// `name:value` splitting
// ---------------------------------------------------------------------------

/** `left:right` split on the **first** colon; both sides must be non-empty. */
const splitOnce = (text: string): readonly [string, string] | undefined => {
  const at = text.indexOf(":");
  if (at <= 0 || at === text.length - 1) return undefined;
  return [text.slice(0, at), text.slice(at + 1)];
};

/** True for the `resource:action` shape a permission lookup uses. */
const isPermissionKey = (value: string): value is PermissionKey => splitOnce(value) !== undefined;

/** Text that survives the trim every chip goes through, and a leading `{` or `"`. */
const isPlainWord = (text: string): boolean =>
  text !== "" && text === text.trim() && !text.startsWith("{") && !text.startsWith('"');

/** A short-form field: a plain word with no colon. */
const isShortField = (text: string): boolean => isPlainWord(text) && !text.includes(":");

/** A short-form tail: everything after the first colon, trimmed and non-empty. */
const isShortTail = (text: string): boolean => text !== "" && text === text.trim();

const explicit = <A>(
  text: string,
  read: (value: Readonly<Record<string, unknown>>) => Decoded<A>,
): Decoded<A> => {
  const parsed = parseJson(text);
  if (parsed._tag === "Refused") return parsed;
  return isPlainRecord(parsed.value) ? read(parsed.value) : refused("expected a JSON object");
};

const stringField = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): Decoded<string> => {
  const value = record[key];
  return typeof value === "string" ? ok(value) : refused(`"${key}" must be a string`);
};

const optionalString = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): Decoded<string | undefined> => {
  const value = record[key];
  if (value === undefined) return ok(undefined);
  return typeof value === "string" ? ok(value) : refused(`"${key}" must be a string`);
};

// ---------------------------------------------------------------------------
// Attribute pairs
// ---------------------------------------------------------------------------

/** One attribute: a name and the JSON value it holds. */
export type AttributePair = readonly [name: string, value: unknown];

const encodeName = (name: string): string =>
  isShortField(name) ? name : JSON.stringify(name);

/**
 * The text of a value: bare when reading the bare text back gives the same
 * string, JSON otherwise — so `"7"` is shown as `"7"` and `7` as `7`.
 */
const encodeValue = (value: unknown): Decoded<string> => {
  if (typeof value === "string" && isPlainWord(value) && parseJson(value)._tag === "Refused") {
    return ok(value);
  }
  return jsonText(value);
};

/**
 * `name=value`, how a chip *shows* a pair: the same name and value texts the
 * codec uses, so the string `"7"` reads `a="7"` and the number `7` reads `a=7`.
 */
export const attributeLabel = ([name, value]: AttributePair): Decoded<string> => {
  const text = encodeValue(value);
  return text._tag === "Refused" ? text : ok(`${encodeName(name)}=${text.value}`);
};

/** JSON first, the raw string otherwise: `clearance:7` is the number seven, `dept:legal` a string. */
const decodeValue = (text: string): unknown => {
  const parsed = parseJson(text);
  return parsed._tag === "Ok" ? parsed.value : text;
};

/**
 * `name:value`. A name containing a colon, or starting with a quote, is a JSON
 * string; so is a value that bare text would read as something else.
 */
export const attributeCodec: ChipCodec<AttributePair> = {
  encode: ([name, value]) => {
    const text = encodeValue(value);
    return text._tag === "Refused" ? text : ok(`${encodeName(name)}:${text.value}`);
  },
  decode: (raw) => {
    const text = raw.trim();
    if (text.startsWith('"')) {
      const end = closingQuote(text);
      if (end === undefined) return refused("an unterminated quoted name");
      const name = parseJson(text.slice(0, end + 1));
      if (name._tag === "Refused" || typeof name.value !== "string") {
        return refused("a quoted name must be a JSON string");
      }
      const rest = text.slice(end + 1);
      if (!rest.startsWith(":") || rest.length === 1) return refused("expected name:value");
      return ok([name.value, decodeValue(rest.slice(1))]);
    }
    const split = splitOnce(text);
    return split === undefined ? refused("expected name:value") : ok([split[0], decodeValue(split[1])]);
  },
};

/** The index of the quote closing a JSON string that opens at 0, or `undefined`. */
const closingQuote = (text: string): number | undefined => {
  for (let index = 1; index < text.length; index++) {
    const char = text[index];
    if (char === "\\") index += 1;
    else if (char === '"') return index;
  }
  return undefined;
};

/**
 * The record with one pair set. Built with `Object.fromEntries`, which defines
 * own properties — a name like `__proto__` becomes a key, not a prototype.
 */
export const withPair = (
  record: Readonly<Record<string, unknown>>,
  pair: AttributePair,
): Readonly<Record<string, unknown>> =>
  Object.fromEntries([...Object.entries(record).filter(([name]) => name !== pair[0]), pair]);

export const withoutPair = (
  record: Readonly<Record<string, unknown>>,
  name: string,
): Readonly<Record<string, unknown>> =>
  Object.fromEntries(Object.entries(record).filter(([other]) => other !== name));

// ---------------------------------------------------------------------------
// Edges, events, signatures
// ---------------------------------------------------------------------------

/** `relation:resourceId` for the subject's own edge; a JSON object for any other. */
export const edgeCodec: ChipCodec<RelationshipEdgeInput> = {
  encode: (edge, subjectId) => {
    if (
      edge.subjectId === subjectId &&
      isShortField(edge.relation) &&
      isShortTail(edge.resourceId)
    ) {
      return ok(`${edge.relation}:${edge.resourceId}`);
    }
    return jsonText({
      subjectId: edge.subjectId,
      relation: edge.relation,
      resourceId: edge.resourceId,
    });
  },
  decode: (raw, subjectId) => {
    const text = raw.trim();
    if (text.startsWith("{")) {
      return explicit(text, (record) => {
        const subject = stringField(record, "subjectId");
        const relation = stringField(record, "relation");
        const resource = stringField(record, "resourceId");
        if (subject._tag === "Refused") return subject;
        if (relation._tag === "Refused") return relation;
        if (resource._tag === "Refused") return resource;
        return ok({
          subjectId: subject.value,
          relation: relation.value,
          resourceId: resource.value,
        });
      });
    }
    const split = splitOnce(text);
    return split === undefined
      ? refused("expected relation:resourceId")
      : ok({ subjectId, relation: split[0], resourceId: split[1] });
  },
};

/** `event:resourceId` for the subject's own event; a JSON object for any other. */
export const eventCodec: ChipCodec<ActedEventInput> = {
  encode: (event, subjectId) => {
    if (event.subjectId === subjectId && isShortField(event.event) && isShortTail(event.resourceId)) {
      return ok(`${event.event}:${event.resourceId}`);
    }
    return jsonText({
      subjectId: event.subjectId,
      event: event.event,
      resourceId: event.resourceId,
    });
  },
  decode: (raw, subjectId) => {
    const text = raw.trim();
    if (text.startsWith("{")) {
      return explicit(text, (record) => {
        const subject = stringField(record, "subjectId");
        const name = stringField(record, "event");
        const resource = stringField(record, "resourceId");
        if (subject._tag === "Refused") return subject;
        if (name._tag === "Refused") return name;
        if (resource._tag === "Refused") return resource;
        return ok({ subjectId: subject.value, event: name.value, resourceId: resource.value });
      });
    }
    const split = splitOnce(text);
    return split === undefined
      ? refused("expected event:resourceId")
      : ok({ subjectId, event: split[0], resourceId: split[1] });
  },
};

const hasOptionalSignatureFields = (signature: SignatureInput): boolean =>
  signature.signerRole !== undefined ||
  signature.signedAt !== undefined ||
  signature.algorithm !== undefined ||
  signature.keyId !== undefined;

/**
 * `meaning:resourceId` (or a bare `meaning`, subject-global) for the subject's
 * own signature carrying nothing else; a JSON object of the whole
 * `SignatureInput` otherwise.
 */
export const signatureCodec: ChipCodec<SignatureInput> = {
  encode: (signature, subjectId) => {
    if (
      signature.subjectId === subjectId &&
      !hasOptionalSignatureFields(signature) &&
      isShortField(signature.meaning)
    ) {
      if (signature.resourceId === undefined) return ok(signature.meaning);
      if (isShortTail(signature.resourceId)) return ok(`${signature.meaning}:${signature.resourceId}`);
    }
    return jsonText({
      subjectId: signature.subjectId,
      ...(signature.resourceId === undefined ? {} : { resourceId: signature.resourceId }),
      meaning: signature.meaning,
      ...(signature.signerRole === undefined ? {} : { signerRole: signature.signerRole }),
      ...(signature.signedAt === undefined ? {} : { signedAt: signature.signedAt }),
      ...(signature.algorithm === undefined ? {} : { algorithm: signature.algorithm }),
      ...(signature.keyId === undefined ? {} : { keyId: signature.keyId }),
    });
  },
  decode: (raw, subjectId) => {
    const text = raw.trim();
    if (text.startsWith("{")) return explicit(text, signatureOf);
    if (text === "") return refused("expected meaning or meaning:resourceId");
    const split = splitOnce(text);
    return split === undefined
      ? ok({ subjectId, meaning: text })
      : ok({ subjectId, meaning: split[0], resourceId: split[1] });
  },
};

const signatureOf = (record: Readonly<Record<string, unknown>>): Decoded<SignatureInput> => {
  const subject = stringField(record, "subjectId");
  const meaning = stringField(record, "meaning");
  const resource = optionalString(record, "resourceId");
  const signer = optionalString(record, "signerRole");
  const algorithm = optionalString(record, "algorithm");
  const keyId = optionalString(record, "keyId");
  const signedAt = record["signedAt"];
  if (subject._tag === "Refused") return subject;
  if (meaning._tag === "Refused") return meaning;
  if (resource._tag === "Refused") return resource;
  if (signer._tag === "Refused") return signer;
  if (algorithm._tag === "Refused") return algorithm;
  if (keyId._tag === "Refused") return keyId;
  if (signedAt !== undefined && (typeof signedAt !== "number" || !Number.isFinite(signedAt))) {
    return refused('"signedAt" must be a finite number');
  }
  return ok({
    subjectId: subject.value,
    meaning: meaning.value,
    ...(resource.value === undefined ? {} : { resourceId: resource.value }),
    ...(signer.value === undefined ? {} : { signerRole: signer.value }),
    ...(signedAt === undefined ? {} : { signedAt }),
    ...(algorithm.value === undefined ? {} : { algorithm: algorithm.value }),
    ...(keyId.value === undefined ? {} : { keyId: keyId.value }),
  });
};

/** Structural equality, for the duplicate check — never the display text. */
export const sameSignature = (a: SignatureInput, b: SignatureInput): boolean =>
  a.subjectId === b.subjectId &&
  a.resourceId === b.resourceId &&
  a.meaning === b.meaning &&
  a.signerRole === b.signerRole &&
  a.signedAt === b.signedAt &&
  a.algorithm === b.algorithm &&
  a.keyId === b.keyId;

// ---------------------------------------------------------------------------
// Roles and permissions
// ---------------------------------------------------------------------------

/** The trimmed role name; a name the trim would change is refused rather than altered. */
export const roleCodec: ChipCodec<string> = {
  encode: (role) =>
    role !== "" && role === role.trim() ? ok(role) : refused("not representable in the form"),
  decode: (raw) => (raw.trim() === "" ? refused("a role needs a name") : ok(raw.trim())),
};

/** `resource:action`, the key itself. A chip with no colon names nothing a lookup could hold. */
export const permissionCodec: ChipCodec<PermissionKey> = {
  encode: (permission) =>
    permission === permission.trim() && isPermissionKey(permission)
      ? ok(permission)
      : refused("not representable in the form"),
  decode: (raw) => {
    const text = raw.trim();
    return isPermissionKey(text) ? ok(text) : refused("expected resource:action");
  },
};

// ---------------------------------------------------------------------------
// The check: action and resource
// ---------------------------------------------------------------------------

/** The resource's text: JSON, only for a value JSON carries faithfully. */
export const encodeResource = (resource: Resource | undefined): Decoded<string> =>
  resource === undefined ? ok("") : jsonText(resource);

/**
 * A resource from text. Empty is absent; anything but a JSON object is refused,
 * because `evaluate` reads a resource by path and `7` has no paths.
 */
export const decodeResource = (text: string): Decoded<Resource | undefined> => {
  if (text.trim() === "") return ok(undefined);
  const parsed = parseJson(text);
  if (parsed._tag === "Refused") return parsed;
  return isPlainRecord(parsed.value) ? ok({ ...parsed.value }) : refused("expected a JSON object");
};

/** An action from text: empty means absent, which is a different question from `""`. */
export const actionOf = (text: string): string | undefined => (text === "" ? undefined : text);

/** Omitting a key, which `exactOptionalPropertyTypes` will not let a spread do. */
export const withAction = (self: SimulationInput, action: string | undefined): SimulationInput => {
  const { action: _action, ...rest } = self;
  return action === undefined ? rest : { ...rest, action };
};

export const withResource = (
  self: SimulationInput,
  resource: Resource | undefined,
): SimulationInput => {
  const { resource: _resource, ...rest } = self;
  return resource === undefined ? rest : { ...rest, resource };
};

// ---------------------------------------------------------------------------
// List edits
// ---------------------------------------------------------------------------

/**
 * The list with one element added, decoded from `text`.
 *
 * A duplicate is refused by **structural** equality, not by display text, so
 * two edges that differ only by subject are two elements.
 */
export const addChip = <A>(
  list: ReadonlyArray<A>,
  text: string,
  codec: ChipCodec<A>,
  same: (a: A, b: A) => boolean,
  subjectId: string,
): Decoded<ReadonlyArray<A>> => {
  if (text.trim() === "") return refused("nothing to add");
  const decoded = codec.decode(text, subjectId);
  if (decoded._tag === "Refused") return decoded;
  return list.some((other) => same(other, decoded.value))
    ? refused("already there")
    : ok([...list, decoded.value]);
};

/** The list without the element at `index`. */
export const removeAt = <A>(list: ReadonlyArray<A>, index: number): ReadonlyArray<A> =>
  list.filter((_, at) => at !== index);

/**
 * Renames the subject, and moves the elements that named the old id with it.
 *
 * Edges, events and signatures attributed to `from` follow; the ones naming
 * somebody else stay where they are, which is what the Fixtures card's caption
 * promises.
 */
export const renameSubject = (input: SimulationInput, from: string, to: string): SimulationInput => {
  const follow = <A extends { readonly subjectId: string }>(list: ReadonlyArray<A>): ReadonlyArray<A> =>
    list.map((one) => (one.subjectId === from ? { ...one, subjectId: to } : one));
  return {
    ...input,
    subject: { ...input.subject, id: to },
    ...(input.relationships === undefined ? {} : { relationships: follow(input.relationships) }),
    ...(input.history === undefined ? {} : { history: follow(input.history) }),
    ...(input.signatures === undefined ? {} : { signatures: follow(input.signatures) }),
  };
};
