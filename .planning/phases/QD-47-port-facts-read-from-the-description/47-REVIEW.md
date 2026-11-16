---
phase: QD-47-port-facts-read-from-the-description
reviewed: 2026-11-16T02:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - .changeset/devtools-defaulted-from-core.md
  - .changeset/port-default-is-a-mark.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/core/src/PortDefault.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/Ports.ts
  - packages/core/test/PortDefault.test.ts
  - packages/core/test/PortDefault.tst.ts
  - packages/devtools/src/model/PortCalls.ts
  - packages/devtools/src/model/PortReading.ts
  - packages/devtools/src/model/Wiring.ts
  - packages/devtools/src/react/ServicesPanel.tsx
  - packages/devtools/test/model/Capture.test.ts
  - packages/devtools/test/model/WiringDefaulted.test.ts
  - packages/devtools/test/react/ServicesPanel.reading.test.tsx
  - spec/README.md
  - spec/behaviors/25-inspection.md
  - spec/behaviors/28-devtools-screens.md
  - spec/behaviors/30-port-calls.md
  - spec/decisions/160-port-facts-are-read-from-the-description.md
  - spec/decisions/index.yaml
  - spec/devtools-spec/02-screens.md
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase QD-47: Code Review Report

**Reviewed:** 2026-11-16T02:00:00Z
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

The mark itself is sound. It is set only by `nonePort` (`PortDerivation.ts:384`), and copied by `wrapPort` (so retrying,
timingOut and recording), `boundedPort` and `decoratePorts`. `scriptedPort` and `askRemotely` build through `d.make` with no
inner and never carry it. `isMarkedDefault` reads an own descriptor and compares the `PortName`. Nothing on an evaluation
or enforcement path reads it: the only readers are `isPortDefault` (called from devtools `Wiring.ts`) and the build-time
`carryDefault` checks. `Capture.ts`'s `capturing` goes through `decoratePorts`, so a captured default keeps the mark. The
`rowOf`/`ROWS` typing uses no `as`, `!` or `any`, and `describeCall` type-checks (`tsc -b packages/devtools` is clean).
`PORT_READING` text is byte-identical to the removed `CONSEQUENCES` and `describeOne` arms, checked line by line against
the diff. `check-house-style.mjs` and `check-api-surface.mjs` pass, and 89 tests across the four directly relevant files
pass when run from the repo root.

Four warnings and two info items remain:

- The UI-audit lead is real (WR-01).
- The spec promises totality of `isPortDefault` that the code does not provide, and the ADR contradicts the BEH (WR-02).
- `markDefault`'s spread can drop a class-based shape's prototype methods (WR-03).
- Some `MUST NOT carry the mark` claims have no test (WR-04).

Locked decisions D-04, D-08, D-18, D-19 and D-20 are not re-litigated here.

## Warnings

### WR-01: `stateOf` shows "wired, unnamed" for a defaulted port with no name, hiding "defaulted"

**File:** `packages/devtools/src/react/ServicesPanel.tsx:281-287`
**Issue:** `stateOf` tests `port.name === undefined` before `port.defaulted`. Before ARCH-94 an unnamed shape could never be
defaulted, because `defaulted` was `name !== undefined && isDefaultName(...)`, so the order was harmless. `defaulted` no
longer depends on the name, and the phase's own row WiringDefaulted `R6` builds exactly this shape: a spread wrapper with
`name: undefined` around the default reads `defaulted: true` with `name: undefined`. `PortShape.name` is
`string | undefined`, so the type allows it. The card's state line then reads `wired, unnamed`, the one place the card says
"defaulted — <name>". The `data-defaulted="true"` attribute, the error colour and the unprefixed consequence line still
say it. The card's headline state therefore contradicts its own colour: a reader sees "wired" with a fail-closed colour.
No test renders this combination. `ServicesPanel.test.tsx:70` pins "wired, unnamed" only for a non-defaulted port, and
`ServicesPanel.reading.test.tsx` only has named ports.

**Fix:** Check `defaulted` first, and say the name is missing rather than dropping the fact:
```ts
const stateOf = (port: PortReport): string => {
  if (!port.present) return port.required ? "not provided to this reader" : "absent";
  if (port.defaulted === true) return `defaulted — ${port.name ?? "unnamed"}`;
  return port.name ?? "wired, unnamed";
};
```
Add a `ServicesPanel` row: a report with `defaulted: true, name: undefined` renders `defaulted — unnamed`. Keep BEH-QD-215's
"an unnamed implementation MUST be reported as unnamed" true by that text.

### WR-02: "total over any value" is claimed as a MUST, but `isMarkedDefault` throws on a Proxy whose descriptor trap throws

**File:** `packages/core/src/PortDefault.ts:29-38`; `spec/behaviors/25-inspection.md` (BEH-QD-571, third requirement);
`spec/invariants.md` (INV-QD-339 Source); `spec/overview.md` (`isPortDefault` row); `spec/decisions/160-...md` (Consequences)
**Issue:** The code comment, BEH-QD-571 ("MUST be total over any value"), INV-QD-339 and the `overview.md` row all say the reader
is total. `Object.getOwnPropertyDescriptor(proxy, sym)` runs the proxy's `getOwnPropertyDescriptor` trap, and a throwing trap
(or a revoked proxy) throws. Confirmed in node. ADR-QD-160's Consequences then accept exactly this ("A hostile `Proxy`
service whose descriptor trap throws makes the devtools wiring read fail (T-47-11, accepted)"), so the normative documents
contradict each other. The effect matters: `wiringReport` is typed `Effect<WiringReport>` with an empty error channel,
and BEH-QD-215 says it must run with no layer, so a throw inside the `Effect.map` becomes a defect in a diagnostic that
cannot otherwise fail. The M7 row, the only totality pin, tests six non-proxy values.

**Fix:** Make the claim true, which costs two lines, and pin it:
```ts
export const isMarkedDefault = (port: PortName, service: unknown): boolean => {
  if (typeof service !== "object" || service === null) return false;
  try {
    return Object.getOwnPropertyDescriptor(service, DEFAULT_OF)?.value === port;
  } catch {
    return false; // a hostile proxy is not the default; the reader must not throw
  }
};
```
Add `new Proxy({}, { getOwnPropertyDescriptor() { throw new Error("trap") } })` and a revoked proxy to M7, and remove the
"accepted" bullet from ADR-QD-160. If the throw is kept instead, drop "total" and "MUST be total" from all four places.

### WR-03: `markDefault` rebuilds the shape with a spread, which loses a class-based shape's prototype methods

**File:** `packages/core/src/PortDefault.ts:24-27`, reached from `packages/core/src/Ports.ts:337`
**Issue:** `markDefault` returns `{ ...shape, [DEFAULT_OF]: port }`. For `nonePort` and `wrapPort` the shape is a plain
object from `d.make`, so this is harmless. `decoratePorts` is public, and `carryDefault(d.port, inner, f(d, inner))` copies
whatever `f` returns. If `f` returns a class instance (methods on the prototype, a natural way to write a decorating
adapter), the spread keeps only own enumerable properties, so `resolve` becomes `undefined`. Confirmed in node: a class
instance's method is a function and `{...instance}` has no such method. This happens only when `inner` is the default, so it
passes every test that uses real adapters and fails in the one wiring that is the library's fail-closed default, as
`TypeError: resolve is not a function` at evaluation, which is a defect, not a deny. Getters are also evaluated once and
frozen into a value.

**Fix:** Mark without rebuilding the object's own shape:
```ts
export const markDefault = <N extends PortName, Shape extends object>(
  port: N,
  shape: Shape,
): Shape & DefaultMark<N> =>
  Object.create(Object.getPrototypeOf(shape), {
    ...Object.getOwnPropertyDescriptors(shape),
    [DEFAULT_OF]: { value: port, enumerable: true, writable: false, configurable: false },
  });
```
Check that the signature type-checks without `as` (a `Reflect`-free overload or a typed `Object.create` wrapper), or have
`decoratePorts` document that `f` must return a plain object. Add a `decoratePorts` row whose `f` returns a class instance
around a default.

### WR-04: BEH-QD-571's "MUST NOT carry the mark" list is pinned for one port and one kind of double

**File:** `packages/core/test/PortDefault.test.ts:65-73` (M2); `spec/behaviors/25-inspection.md` (BEH-QD-571 fourth requirement);
`spec/traceability.md` (the `PortDefault.test.ts` row)
**Issue:** BEH-QD-571 says "A scripted double, a remote asker, a replay and a fixture MUST NOT carry the mark". The suite
tests a scripted double for `AttributeResolver` only (M2). There is no row for `askRemotely` (`PortRemote.ts:140`), a
replay or `replyTable` double, or a fixture built from a record, and no row for a scripted double on the other four ports.
Nothing guards a future refactor that routes one of these through `nonePort` or `wrapPort` of a default (for example,
building a replay as `wrapPort(none)`), which would make a real, answering port read as the fail-closed default. This is the
unsafe direction for a diagnostic: it tells the operator a wired store is the stub. The traceability row presents the
requirement as pinned.

**Fix:** Add `forEveryPort` rows asserting `isPortDefault(d, shape)` is false for `scriptedPort(d, () => PortReply.answer(...))`,
for the port's remote asker, for a `replyTable` replay, and for its fixture layer when one exists. Or narrow BEH-QD-571
and the traceability row to the cases that are tested.

## Info

### IN-01: The "nobody outside core can forge the mark" claim overstates; the symbol is readable off any default

**File:** `packages/core/src/PortDefault.ts:5-8`; `spec/behaviors/25-inspection.md` (BEH-QD-572, "so that nothing outside the module that sets it can forge one");
`spec/decisions/160-...md` Decision 2 ("Nothing outside core can forge the mark")
**Issue:** The mark is an own, enumerable, symbol-keyed property, so `Object.getOwnPropertySymbols(defaultShape)[0]` returns
the key and `{ [key]: "AttributeResolver", ...realAdapter }` then reads as defaulted. The test file does exactly this in M8.
A wrapper that spreads the default and replaces the method (documented as a limit in BEH-QD-572) is the same forgery by
accident. The unique `Symbol` does stop `Symbol.for` minting and a guess of the key, but not reading it off a live default.
The mark is a diagnostic label that no evaluation reads, so there is no security consequence, but "cannot forge" is stronger
than what holds, and it should not be read as an integrity guarantee.

**Fix:** Reword in the three places to "cannot be minted without first having a default in hand (a spread keeps it, a
guess does not)", and say that it labels a diagnostic and guards nothing.

### IN-02: `decoratePorts` stamps the mark on whatever `f` returns, so a decorator that replaces the shape still reads defaulted

**File:** `packages/core/src/Ports.ts:337`; `spec/behaviors/25-inspection.md` (BEH-QD-571, second requirement)
**Issue:** `carryDefault(d.port, inner, f(d, inner))` marks the result whenever `inner` is the default, regardless of whether
`f` used `inner` at all. A decorator that swaps in a different real implementation for a defaulted slot (for example a
test harness installing a store behind a default) reads defaulted afterwards. This is the same "built from the default's
shape" limit BEH-QD-572 states for hand-written wrappers, but BEH-QD-571 says "carry the mark exactly when the inner shape
has it", which reads as a property of the derivations, not of the decorator's behaviour. The upgrade guide and ADR list the
spread-and-replace limit but not this one for `decoratePorts`.

**Fix:** Add one sentence to BEH-QD-571 and the upgrade-guide entry: `decoratePorts` carries the mark by the slot it
decorates, not by what `f` returns. Or have it carry only when `f`'s result is derived from `inner` (not checkable), in
which case the sentence is the right fix.

---

_Reviewed: 2026-11-16T02:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
