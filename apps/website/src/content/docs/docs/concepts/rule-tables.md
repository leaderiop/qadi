---
title: Rule Tables
description: How an ordered list of rows lets a policy say "and if this matches, refuse" — something allOf and anyOf's boolean composition can't express.
---

[`allOf` and `anyOf`](/docs/concepts/policy-adt/) compose policies the way
`&&` and `||` compose booleans — which means they inherit the same
limitation. A boolean has exactly one bit
per child: true or false. There's no way to say "this condition matched, and
*that's what makes it a refusal*" — under `anyOf`, a child that denies and a
child that simply doesn't apply look identical, both just "not this one."

A **rule table** adds the missing bit. It's an ordered list of rows, each
pairing a condition with an effect — `Permit` or `Deny` — walked from the
top. That's what lets a policy express an explicit deny rule, not just a set
of things that are allowed.

```ts
export interface Rule {
  readonly condition: Policy;
  readonly effect: RuleEffect; // "Permit" | "Deny"
}
```

## Applicability, not permission

A row's `condition` is evaluated for **applicability**: does this row apply
to this subject and resource, at all? Whether that's a good thing depends on
the row's `effect`. Inside a `Deny` row, a condition that evaluates as
*true* — "yes, this applies" — produces a **refusal**, not a permission. Read
`denyWhen(hasAttribute("locked", eq(literal(true))))` as "refuse when
locked," not "check if refusing is allowed."

## Combining algorithms

A subject can match more than one row. `Combining` decides which row's
condition actually wins — and it's the only place in [the policy
ADT](/docs/concepts/policy-adt/) more than one row's outcome has to be
reconciled, because a rule table's own default already
stops at the first applicable row rather than evaluating every one
([ADR-QD-023](https://github.com/leaderiop/qadi/blob/main/spec/decisions/023-combining-algorithms.md)).

Exactly one row decides under every algorithm, and that row alone supplies
the decision's field set and obligations — never a merge across rows, the way
`allOf`/`anyOf` merge across children.

<svg viewBox="0 0 660 300" width="100%" style="max-width: 660px" role="img" aria-label="Diagram: the same three-row rule table — row 1 permits owners, row 2 denies when locked, row 3 permits members — walked by three combining algorithms for a subject who is both owner and locked. FirstApplicable and PermitOverrides both land on row 1, Permit. DenyOverrides lands on row 2, Deny.">
  <rect x="10" y="10" width="200" height="90" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="20" y="28" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-2)">Subject: owner, locked</text>
  <text x="20" y="46" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-3)">row 1: hasRole(owner) → Permit</text>
  <text x="20" y="62" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-3)">row 2: locked=true → Deny</text>
  <text x="20" y="78" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-3)">row 3: hasRole(member) → Permit</text>
  <text x="20" y="94" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="9" fill="var(--sl-color-gray-3)">rows 1 and 2 apply; row 3 does not</text>
  <line x1="0" y1="112" x2="660" y2="112" stroke="var(--sl-color-hairline)"/>
  <text x="130" y="132" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">FirstApplicable</text>
  <text x="130" y="150" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">stops at the first row that applies</text>
  <rect x="40" y="164" width="180" height="26" rx="5" fill="oklch(0.19 0.014 260)" stroke="oklch(0.75 0.14 150)"/>
  <text x="130" y="182" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="oklch(0.75 0.14 150)">row 1 → Permit</text>
  <rect x="40" y="196" width="180" height="20" rx="5" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="130" y="210" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9" fill="var(--sl-color-gray-3)">row 2 — never inspected</text>
  <text x="330" y="132" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">DenyOverrides</text>
  <text x="330" y="150" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">first applying Deny wins</text>
  <rect x="240" y="164" width="180" height="20" rx="5" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="330" y="178" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9" fill="var(--sl-color-gray-3)">row 1 — outranked</text>
  <rect x="240" y="190" width="180" height="26" rx="5" fill="oklch(0.19 0.014 260)" stroke="oklch(0.65 0.16 25)"/>
  <text x="330" y="208" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="oklch(0.65 0.16 25)">row 2 → Deny</text>
  <text x="530" y="132" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">PermitOverrides</text>
  <text x="530" y="150" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">first applying Permit wins</text>
  <rect x="440" y="164" width="180" height="26" rx="5" fill="oklch(0.19 0.014 260)" stroke="oklch(0.75 0.14 150)"/>
  <text x="530" y="182" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="oklch(0.75 0.14 150)">row 1 → Permit</text>
  <rect x="440" y="196" width="180" height="20" rx="5" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="530" y="210" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9" fill="var(--sl-color-gray-3)">row 2 — outranked</text>
  <text x="330" y="250" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="11" fill="var(--sl-color-gray-2)">Same subject, same three rows — a different algorithm changes the verdict.</text>
</svg>

```typescript
import { denyWhen, eq, hasAttribute, hasRole, literal, permitWhen, rules } from "@qadi/core";

const documentAccess = rules(
  [
    permitWhen(hasRole("owner")),
    denyWhen(hasAttribute("locked", eq(literal(true)))),
    permitWhen(hasRole("member")),
  ],
  { combining: "DenyOverrides" },
);
// A locked document refuses even its owner — DenyOverrides means the explicit
// deny row wins over a permit row that also applied.
```

`rules` defaults to `FirstApplicable`, the cheapest of the three — the
override algorithms have to look past the first applicable row, which is
exactly the case that used to be free. There's no default-permit spelling: no
row applying is a denial, same as an empty list. A caller who genuinely wants
"permit everything not otherwise denied" writes that as the explicit final
row, `permitWhen(allOf([]))`, rather than relying on an implicit fallthrough.

For the full requirements and the interaction with obligations, see
[15 — Rules](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/15-rules.md).
