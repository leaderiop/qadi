/**
 * The top-level keys a schema declares for the object an input selects: what
 * `UntrustedDecode.ts`'s `ignore` policy keeps.
 *
 * `Schema`'s parse options apply to a whole decode call, not to one position, so
 * tolerating an unknown envelope key while refusing one inside the policy cannot
 * be said to the strict decode; it is said by handing the decode only what the
 * envelope declares (ADR-QD-170, which generalises ADR-QD-096 D-15-c). The
 * keys are read from the schema's own encoded AST, the side the strict decode
 * reads, so a list kept beside the schema cannot drift from it.
 *
 * A leaf that imports `effect` only, beside `DecodeDepthGuard.ts` and
 * `JsonShape.ts`, and out of the barrel (ADR-QD-099): a seam states a policy,
 * never a derivation.
 */
import * as Match from "effect/Match";
import * as SchemaAST from "effect/SchemaAST";

/** The one slot that selects a union member: `version` is shared by every member of a wire, so it never selects. */
const TAG = "_tag";

/** One object member: its declared top-level keys, and its required literal slots. */
interface Member {
  readonly keys: ReadonlySet<PropertyKey>;
  readonly literals: ReadonlyMap<PropertyKey, unknown>;
}

const memberOf = (ast: SchemaAST.Objects): Member => ({
  keys: new Set(ast.propertySignatures.map((signature) => signature.name)),
  literals: new Map(
    ast.propertySignatures.flatMap((signature) =>
      SchemaAST.isLiteral(signature.type) && !SchemaAST.isOptional(signature.type)
        ? [[signature.name, signature.type.literal] as const]
        : [],
    ),
  ),
});

/** The object members under an encoded AST; any other node declares no keys. */
const membersOf: (ast: SchemaAST.AST) => ReadonlyArray<Member> = Match.type<SchemaAST.AST>().pipe(
  Match.tag("Objects", (ast) => [memberOf(ast)]),
  Match.tag("Union", (ast) => ast.types.flatMap(membersOf)),
  Match.tag("Suspend", (ast) => membersOf(ast.thunk())),
  Match.orElse(() => []),
);

/** The `_tag` literal of each member when every member declares one and no two are alike, else `undefined`. */
const discriminantOf = (members: ReadonlyArray<Member>): ReadonlySet<unknown> | undefined => {
  const values = members.flatMap((member) => (member.literals.has(TAG) ? [member.literals.get(TAG)] : []));
  const distinct = new Set(values);
  return values.length === members.length && distinct.size === values.length ? distinct : undefined;
};

/**
 * Reads, once, the declared keys of `ast`'s encoded side, and answers per input which member's keys apply.
 *
 * The member is the one whose `_tag` literal equals the input's own `_tag`; an unknown or absent `_tag`
 * takes the first member and fails in the decode, as it always did. Throws, at build, for a schema
 * with no object member or with several members that `_tag` does not tell apart: both are
 * programmer errors at module scope, and a build that answered would drop keys it could not name.
 */
export const envelopeKeysOf = (
  ast: SchemaAST.AST,
): ((entries: ReadonlyArray<readonly [string, unknown]>) => ReadonlySet<PropertyKey>) => {
  const members = membersOf(SchemaAST.toEncoded(ast));
  const [first] = members;
  if (first === undefined || (members.length > 1 && discriminantOf(members) === undefined)) {
    throw new Error(
      'unknownKeys "ignore" needs a schema that is an object, or a union of objects each with a distinct literal _tag',
    );
  }
  return (entries) => {
    const tag = entries.find(([key]) => key === TAG)?.[1];
    return (members.find((member) => member.literals.get(TAG) === tag) ?? first).keys;
  };
};
