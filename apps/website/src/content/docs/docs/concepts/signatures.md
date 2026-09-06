---
title: Signatures
description: hasSignature is the policy tree's own e-signature check, reading a SignatureHistory port — decomposable and explainable, unlike hasCustom, but still refused by toPredicate.
---

`hasSignature` answers one narrow question: *does this subject already have
a signature on file matching this meaning?* It is a `Policy` leaf like any
other — schema-derived, JSON-round-trippable, explainable — backed by its
own required service, `SignatureHistory`. This page is about that check.
It is deliberately not about how a signature gets produced in the first
place — that's capture, a separate concern covered on the
[E-Signatures](/docs/packages/audit/signatures/) page.

```ts
export const hasSignature: (meaning: string | SignatureMeaning, options?: SignatureOptions) => Policy;
```

## Check and capture are two different ports

<svg viewBox="0 0 680 170" width="100%" style="max-width: 680px" role="img" aria-label="Diagram: SignatureCapturePort, from the @qadi/audit package, writes a Signature record into the SignatureHistory port at enforcement time, through an ObligationHandler. hasSignature, a @qadi/core policy leaf, only ever reads what SignatureHistory already holds. The two never talk to each other directly.">
  <defs>
    <marker id="sig-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="20" y="55" width="200" height="60" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="120" y="80" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">SignatureCapturePort</text>
  <text x="120" y="97" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">.capture() — @qadi/audit</text>
  <rect x="260" y="55" width="160" height="60" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-accent)"/>
  <text x="340" y="80" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">SignatureHistory</text>
  <text x="340" y="97" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">port — @qadi/core</text>
  <rect x="460" y="55" width="200" height="60" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="560" y="80" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">hasSignature(meaning)</text>
  <text x="560" y="97" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">policy leaf — @qadi/core</text>
  <path d="M 220 85 L 260 85" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#sig-arrow)"/>
  <text x="240" y="75" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="9" fill="var(--sl-color-gray-3)">writes</text>
  <path d="M 460 85 L 420 85" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#sig-arrow)"/>
  <text x="440" y="75" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="9" fill="var(--sl-color-gray-3)">reads</text>
  <text x="340" y="145" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">Capture runs once, at enforcement time, through an ObligationHandler.</text>
  <text x="340" y="160" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">hasSignature only ever reads what's already there — trust-on-presence, no re-verification.</text>
</svg>

`SignatureHistory` has one method, `signaturesFor({ subjectId, resourceId? })`,
mirroring `DecisionHistory`'s shape exactly. Its default,
`SignatureHistoryNone`, answers with an empty list — no signatures on file,
denying unambiguously. Unlike `DecisionHistory`'s `ActedResult`, there's no
third "unknown" value here: an empty list already denies on its own, so no
polarity argument is needed.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  allOf,
  AttributeResolverNone,
  currentSubjectLayer,
  DecisionHistoryUnknown,
  enforce,
  EvaluationIdLive,
  fromRoles,
  hasPermission,
  hasSignature,
  permission,
  RelationshipResolverNever,
  signatureHistoryFromSignatures,
} from "@qadi/core";

const publish = permission("doc", "publish");

// hasSignature never captures a signature — it only asks whether one is
// already on file. Something else (typically @qadi/audit) put it there.
const mayPublish = allOf([hasPermission(publish), hasSignature("approved")]);

const services = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  signatureHistoryFromSignatures([{ subjectId: "u1", meaning: "approved" }]),
);

declare const doPublish: Effect.Effect<void>;

const program = doPublish.pipe(
  enforce(mayPublish),
  Effect.provide(currentSubjectLayer(fromRoles({ id: "u1", roles: [] }))),
  Effect.provide(services),
);
// → runs: u1 has an "approved" signature on file.
```

## Decomposable, unlike `hasCustom`

`hasSignature` and [`hasCustom`](/docs/concepts/custom-predicates/) are both
escape-hatch-shaped — each depends on a service outside the closed matcher
vocabulary — but they land in different places:

| | `hasCustom` | `hasSignature` |
| - | - | - |
| What the leaf carries | an opaque registered `name` | public `meaning`/`signerRole`/`scope` fields |
| `explain()` | names the check, can't see inside it | fully decomposes it, scope-aware |
| `toPredicate` | refused — opaque, external logic | refused — external port, same shape as `hasRelationship`'s refusal, not `hasCustom`'s |

Both end up outside the translatable subset `@qadi/predicate-sql`/
`@qadi/predicate-prisma` compile, but for different reasons: `hasCustom` is
opaque by design, while `hasSignature`'s fields are public — it's refused
because a signature lookup is keyed by subject/resource through an external
port and can't fold into a resource-independent expression, the same reason
`hasRelationship` is refused, not because anything about it is hidden.

`SignatureHistory` became `EvaluationServices`'s **seventh required**
member — the ninth service overall, after the two optional ones,
`DecisionCache` and `DecisionSink`. A wired-but-unreachable store fails with
`SignatureHistoryUnavailable` rather than answering with an empty list —
failure, not denial, same as every other resolver in this library.

For the full requirement set, see
[ADR-QD-058](https://github.com/leaderiop/qadi/blob/main/spec/decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md).
For capture — how a `Signature` actually gets produced, and
`@qadi/audit`'s `SignatureCapturePort` — see
[E-Signatures](/docs/packages/audit/signatures/).
