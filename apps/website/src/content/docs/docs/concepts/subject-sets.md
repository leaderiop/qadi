---
title: Subject Sets & Review Queries
description: decideSubjects and filterSubjects run one policy across many subjects instead of many resources — and report an answer rather than granting one.
---

Every other entry point in this library asks "can **this** subject do
this?" — one subject, evaluated against one or many resources. Subject-set
evaluation flips that around: `decideSubjects(policy, subjects)` asks "which
of **these** subjects would this policy allow?" — one policy, evaluated
across many subjects instead. It's the question a sharing dialog asks
("who can I add?"), an access review asks ("who currently has this?"), and a
leak investigation asks ("who *could* have seen this?").

## The transpose of `filter`

`filter` keeps the resources one subject can reach; `decideSubjects` reports
which subjects can reach one resource. Same evaluator, same policy, the
other axis:

<svg viewBox="0 0 680 300" width="100%" style="max-width: 680px" role="img" aria-label="Diagram, two panels side by side. Left: filter — one policy evaluated against three resources for a fixed subject, doc-1 and doc-3 allowed, doc-2 denied, kept items returned as an array. Right: decideSubjects — the same policy evaluated for three different subjects against a fixed resource, alice and carol allowed, bob denied, all three results returned as SubjectDecision entries with nothing discharged.">
  <defs>
    <marker id="ss-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="20" y="40" width="280" height="230" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="40" y="64" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10.5" font-weight="500" fill="var(--sl-color-accent-high)">filter(policy, resources)</text>
  <rect x="100" y="76" width="120" height="26" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="160" y="93" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">policy</text>
  <path d="M 130 102 L 68 120" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ss-arrow)"/>
  <path d="M 160 102 L 150 120" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ss-arrow)"/>
  <path d="M 190 102 L 232 120" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ss-arrow)"/>
  <rect x="30" y="120" width="76" height="28" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="68" y="139" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-white)">doc-1</text>
  <rect x="112" y="120" width="76" height="28" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="150" y="139" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-white)">doc-2</text>
  <rect x="194" y="120" width="76" height="28" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="232" y="139" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-white)">doc-3</text>
  <rect x="30" y="156" width="76" height="22" rx="4" fill="oklch(0.75 0.14 150 / 0.15)" stroke="oklch(0.75 0.14 150)"/>
  <text x="68" y="171" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="oklch(0.75 0.14 150)">Allow</text>
  <rect x="112" y="156" width="76" height="22" rx="4" fill="oklch(0.65 0.16 25 / 0.15)" stroke="oklch(0.65 0.16 25)"/>
  <text x="150" y="171" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="oklch(0.65 0.16 25)">Deny</text>
  <rect x="194" y="156" width="76" height="22" rx="4" fill="oklch(0.75 0.14 150 / 0.15)" stroke="oklch(0.75 0.14 150)"/>
  <text x="232" y="171" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="oklch(0.75 0.14 150)">Allow</text>
  <text x="40" y="204" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.75 0.14 150)">kept: [doc-1, doc-3]</text>
  <text x="40" y="222" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.65 0.16 25)">dropped: doc-2</text>
  <text x="40" y="248" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-gray-3)">→ ReadonlyArray&lt;A&gt;</text>
  <rect x="380" y="40" width="280" height="230" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="400" y="64" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10.5" font-weight="500" fill="var(--sl-color-accent-high)">decideSubjects(policy, subjects)</text>
  <rect x="460" y="76" width="180" height="26" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="550" y="93" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-white)">policy (resource: doc-1)</text>
  <path d="M 490 102 L 428 120" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ss-arrow)"/>
  <path d="M 550 102 L 510 120" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ss-arrow)"/>
  <path d="M 610 102 L 592 120" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ss-arrow)"/>
  <rect x="390" y="120" width="76" height="28" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="428" y="139" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-white)">alice</text>
  <rect x="472" y="120" width="76" height="28" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="510" y="139" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-white)">bob</text>
  <rect x="554" y="120" width="76" height="28" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="592" y="139" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-white)">carol</text>
  <rect x="390" y="156" width="76" height="22" rx="4" fill="oklch(0.75 0.14 150 / 0.15)" stroke="oklch(0.75 0.14 150)"/>
  <text x="428" y="171" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="oklch(0.75 0.14 150)">Allow</text>
  <rect x="472" y="156" width="76" height="22" rx="4" fill="oklch(0.65 0.16 25 / 0.15)" stroke="oklch(0.65 0.16 25)"/>
  <text x="510" y="171" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="oklch(0.65 0.16 25)">Deny</text>
  <rect x="554" y="156" width="76" height="22" rx="4" fill="oklch(0.75 0.14 150 / 0.15)" stroke="oklch(0.75 0.14 150)"/>
  <text x="592" y="171" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="oklch(0.75 0.14 150)">Allow</text>
  <text x="400" y="204" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-2)">reports: alice, bob, carol — all three</text>
  <text x="400" y="222" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-2)">(decideSubjects keeps denials too)</text>
  <text x="400" y="248" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-gray-3)">→ SubjectDecision[], nothing discharged</text>
</svg>

Two things separate subject-set evaluation from everything else `@qadi/core`
exports. First, it's the one place there's no `CurrentSubject` — a review
query is asked by nobody in particular (a midnight batch job, an admin
console), so requiring an ambient subject would just make every caller wire
a value that couldn't affect the answer. `decideSubjects` supplies each
element of `subjects` as the subject for its own evaluation instead, which
is what discharges the requirement.

Second — and this is the one that matters for correctness, not just
ergonomics — it **reports**. `filterSubjects` looks like `filter` with the
axis swapped, but it doesn't enforce: it hands identities to an
administrator, not access to the subjects themselves, so nothing is being
granted and no obligation is discharged. That's the whole reason
`filterSubjects` exists as a separate call from `filter` rather than `filter`
just running "backwards" — discharging here would fire every obligation once
per candidate, logging accesses that never actually happened.

```typescript
import { decideSubjects, filterSubjects, fromRoles, hasRole, role } from "@qadi/core";

const editor = role({ name: "editor" });
const canEdit = hasRole("editor");

const candidates = [
  fromRoles({ id: "alice", roles: [editor] }),
  fromRoles({ id: "bob", roles: [] }),
  fromRoles({ id: "carol", roles: [editor] }),
];

const reviewed = decideSubjects(canEdit, candidates);
// Effect<ReadonlyArray<SubjectDecision>, EvaluationError, SubjectSetServices>
// → alice: Allow, bob: Deny, carol: Allow — every result kept, each with its trace.

const allowed = filterSubjects(canEdit, candidates);
// Effect<ReadonlyArray<AuthSubject>, EvaluationError, SubjectSetServices>
// → [alice, carol] — reports who qualifies; grants nothing.
```

`decideSubjectsStream`/`filterSubjectsStream` are the streamed siblings, for
a review too large to hold as an array — a full tenant's user base, say,
rather than a handful of sharing-dialog candidates. Both stay sequential by
default, for the same reason the array forms do: multiplying a resolver
store's load by the batch size isn't a default this library chooses for a
caller.

For the full ordering and deduplication guarantees — results preserve input
order and are never deduplicated, since a review reads its answers beside
the list it was asked about — see
[14 — Subject Sets](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/14-subject-sets.md).
