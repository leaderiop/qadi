# ADR-QD-163 — What a leaf needs from the request is stated once

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-163                                   |
> | Revision       | 1.9                                            |
> | Effective Date | 2026-11-16                                     |
> | Status         | Accepted — reads ADR-QD-024, ADR-QD-100, ADR-QD-134; applies ADR-QD-152; keeps ADR-QD-034, ADR-QD-073; amended 2026-11-19 (ADR-QD-172) |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.9 (2026-11-19): amended: supplied is built once by admit from the row source (ADR-QD-172, ARCH-106, CCR-QD-450)<br>1.8 (2026-11-18): the verdict rows extend this ADR (ARCH-101, CCR-QD-445)<br>1.7 (2026-11-16): the leafHeavyPlain comment was corrected, comment-only (review iteration 2 IN-01)<br>1.6 (2026-11-16): a row's resourceId is classified by tag like its own, an unlisted tag gets never (review iteration 2 IN-02)<br>1.5 (2026-11-16): a leaf no own classification names has no row that compiles (review iteration 2 WR-01)<br>1.4 (2026-11-16): the leaf-heavy pair measures the table read on the present-inputs path, not a matcher-reference walk (review IN-04)<br>1.3 (2026-11-16): Context: the base's action test built MissingAction({}), its resource test MissingResource (review IN-01)<br>1.2 (2026-11-16): HasAttribute's outcome on a request missing both inputs depends on what its matcher references (review WR-03)<br>1.1 (2026-11-16): a row's own and matcher are derived from its leaf's variant (review WR-01)<br>1.0 (2026-11-16): Initial release (ARCH-97, CCR-QD-441) |

---

## Context

The rule that a leaf which reads the action or the resource fails when the request has none (INV-QD-011) was written per
leaf and per interpreter.

At the phase base (`5ab8d0c0`), `Walk.ts` carried it in three arms of `evaluateNode`: `HasAttribute` and
`HasResourceAttribute` each tested `action === undefined && referencesAction(policy.matcher)` and built
`new MissingAction({})` from that test, each built `new MissingResource(...)` from its resource test, and `HasAction` built `new MissingAction({ expected: policy.action })`. The two matcher leaves
checked in different orders: `HasAttribute` asked the action first and the resource second, `HasResourceAttribute` asked the
resource first and the action second. `Predicate.ts` restated every one of those checks as lazy `NeedAction` plans, three of
its cells carrying an own `expected: undefined` key that `evaluate`'s `MissingAction` never had, and `readScoped` in
`PortAccess.ts` built `MissingResourceId` itself after recording the question on the port's span. `HasRole`, `HasPermission` and
`HasAction` were judged in both interpreters, port-free, by two copies of the same one-line test.

That is two interpreters over one policy tree. ADR-QD-024 and ADR-QD-100 keep them two, and they share only admission; this
change does not touch that. What is shared here is a fact about the leaves, not a walk.

The change sits next to `evaluateNode`, budgeted switch #1 in AGENTS.md §5a, on the path every evaluation takes once per
node. ADR-QD-034 measures the switch exception and ADR-QD-073 the untraced one, and a change beside either is entitled to the
same evidence. The phase therefore opened on a benchmark gate, with a rejection path (this record would have been the
rejection) and a pursue path. The gate passed.

## Decision

1. **One package-private module states each leaf's needs** (D-01, D-09). `packages/core/src/LeafNeeds.ts` holds `LEAF_NEEDS`,
   a keyed table written `as const satisfies { readonly [K in LeafPolicy["_tag"]]: LeafNeedOf<K> }`, applying ADR-QD-152: a leaf
   tag without a row is TS2741 and an extra row is TS2353 (INV-QD-345). `LeafNeedOf<K>` fixes the one row a leaf can have.
   Its `matcher` is read from the variant's shape (`true` exactly when it carries a `matcher`). Its `own` cannot be: a leaf's
   type does not show which input it reads (`HasAttribute` and `HasResourceAttribute` have the same fields), so each tag is
   classified by name into one of three closed lists, one per `own` value, and a tag in none of them gets `never`; its
   `resourceId` is classified the same way, by three closed lists. A row that disagrees with its leaf (`matcher: false` on a
   leaf that carries a matcher, `own: "Action"` on a leaf classified as reading nothing) is TS2322, and so is every row for a
   leaf no list names yet, so a new leaf does not compile until someone states what it reads; it cannot default to reading
   nothing. `absenceOf` reads a leaf's matcher and action through two guards that trust the row, and a row the compiler did
   not tie to its leaf would fail open. The classification is still a hand-written statement: the compiler guarantees that
   one is made for every leaf, not that it is right. `LeafMatrix.test.ts`'s fixture per leaf tag checks an `own` against
   behaviour, and `LeafNeeds.test.ts` checks a `resourceId` against `readScoped`. A row says what the leaf reads itself (`own`:
   `Nothing`, `Action` or `Resource`), whether its matcher is asked what it references (`matcher`), and whether it asks a port
   about one resource (`resourceId`: `Never`, `Always` or `ByScope`). It is out of the barrel (ADR-QD-099), so gate 13 (`check-api-surface.mjs`) asks for
   no overview row, and `LeafNeeds.test.ts` asserts that none of its exports is on the barrel.
2. **One closed `Absence` union and two functions** (D-08, D-08b). `absenceOf(leaf, supplied)` applies the one rule to a
   row and returns an `ActionAbsence`, a `ResourceAbsence` or nothing; `errorOf(absence)` says which error each absence becomes.
   `ResourceIdAbsence` exists so that `readScoped` builds its error through the same `errorOf`; `absenceOf` itself never
   returns it. `evaluate` maps an absence to `MissingAction` or `MissingResource`; `toPredicate` maps an `ActionAbsence` to its
   lazy `NeedAction` plan, so the failure stays deferred until `run` reaches it, and in `toPredicate` the resource is the row
   (`Supplied<true>`), so `HasAttribute`'s resource reference stays a refusal and never an absence (D-07).
3. **`readScoped` stays the one resource-id enforcement point** (D-06). The table says which leaves ask about one resource;
   it does not enforce it. `readScoped` records the question on the port's own span first and then fails with
   `MissingResourceId` built through `errorOf`, so a missing resource id still leaves the port's span and nothing else
   (ADR-QD-134, BEH-QD-227, BEH-QD-445). A test ties each row's `resourceId` to what `readScoped` does.
4. **The port-free judgements are written once** (D-10). `holdsRole`, `holdsPermission` and `holdsAction` live in the same
   module; each interpreter wraps the boolean, `evaluate` in an allow or a deny with its reason sentence, `toPredicate` in a
   constant.
5. **`evaluateNode` stays the budgeted switch it was** (ADR-QD-034, ADR-QD-073). The leaf arms read the table through one call
   each; the composite arms are untouched, `switch (policy._tag)` and its arm order are unchanged, and
   `evaluateAllOf`, `evaluateAnyOf` and `evaluateRules` are still the three `Effect.fnUntraced` functions in `Walk.ts`. No
   budget in `scripts/check-house-style.mjs` moved, and neither did `Policy.ts` or `Decision.ts`.

## The check order

The order each leaf checks its absences in is preserved, and stated as one rule (D-05): **a leaf's own input first, then what
its matcher references, the action before the resource.** `HasAction` reads the action; `HasResourceAttribute` reads the
resource; a resource-scoped port leaf reads a resource id (enforced by `readScoped`, decision 3). Whatever its matcher
references comes after that.

The rule reproduces every error the base raised. `HasAttribute` owns nothing, so it asks only what its matcher references: a
request missing both inputs fails it with `MissingAction` when the matcher references the action, with `MissingResource` when it
references the resource, and not at all when it references neither. `HasResourceAttribute` owns the resource, so a request
missing the resource reports `MissingResource` before the matcher's reference to the action is asked, which is its base order.
`HasAction` owns the action. A request missing both inputs therefore reports the leaf's own input, for a leaf that has one, and
that is the only observable consequence of the rule's first half.

The second half, "the action before the resource" among what a matcher references, cannot be observed: a matcher holds at most
one reference, so it never has two to put in order. The rule is stated that way because it is the one sentence that describes
every row, not because a request can tell the halves apart.

The phase did not change this order and so there was nothing for a RED test to fail on at the base (D-14). The matrix of
every leaf tag by action present or absent by resource present or absent by whether the matcher references each input
(`LeafMatrix.test.ts`) was committed first, as a characterisation green on the base, and is stated honestly as that, not as a
red test. The RED tests are the ones the change itself needed: the module-absent table test and the D-08a cells below. A
swapped-order negative control was run and recorded: with `absenceOf`'s `own === "Resource"` check moved below the matcher's
action check, five tests failed (two in `LeafMatrix.test.ts`, one in `Evaluate.test.ts`'s pre-existing "a missing resource wins
over a missing action on `HasResourceAttribute`", and two in `LeafNeeds.test.ts`), for example
`HasResourceAttribute[ref action] action=- resource=none: expected 'Action:-' to equal 'Resource:owner'`. The tree was restored.

## MissingAction's expected

Three `toPredicate` cells built `{ _tag: "NeedAction", expected: undefined }`, so the `MissingAction` they raised carried an
own `expected` key holding `undefined`. `evaluate`'s `MissingAction` for the same policies never had the key. D-08a unifies them
through `errorOf`: both interpreters now omit the key when the arm has no expected action, and `HasAction`'s absence still
carries its action.

`MissingAction.expected` is `Schema.optional(Schema.String)`, so an own `undefined` and an absent key encode identically and
the change is invisible on the wire and in the sink codec. Only an in-process `Object.hasOwn` sees it. It was written RED
first (`Predicate.test.ts`: `Expected false / Received true` on `Object.hasOwn(translated.failure, "expected")` at the
commit before the fix). It is reversible in one line of `errorOf`. The changeset states it as a patch.

## Measurement

**Method.** `packages/core/bench/Evaluate.bench.ts` has 35 workloads: the 33 that existed, plus two leaf-heavy ones added at
the base before anything else (`allOf` of 8 leaves whose matchers reference neither the action nor the resource, and `allOf` of
8 whose matchers reference both), because no existing workload stresses the checks the table replaces. `bench/ab.sh` runs the
two sides interleaved, base then candidate then base, three runs each, applying and reversing the patch around each candidate run
so that no source is committed to measure it. The statistic that decides is the **median of per-run minima** per workload
(D-03a); a workload is slower only when the candidate's delta is strictly greater than its band, `max(10%, the base's own
spread of that statistic)`, the 10% being ADR-QD-092's precedent. The gate passes when no workload is slower, and
`bench/*/analysis.tsv`'s last line (`# gate: pass`) says so, not judgement.

D-03 had named the mean of means. The research found that on this shared host the base's own mean-of-means spread was 44% to
134% and a single stalled run swung the verdict either way, so D-03a moved the decision to the minima. The median of per-run
p50 and the mean of per-run means are recorded beside it in both tables below, as recorded and not deciding.

### The gate: the research's prototype against the base

The prototype is the shape the phase would ship (D-01), `research-probes/proto-p1.patch.txt` (SHA-256 `109f2545…98e78`),
measured against the base. Source head at the run, `4b5098bf`; host Apple M3 Pro, Node v26.13.0, run start 2026-11-16T12:53:29Z.
The 1-minute load average around the twelve runs ranged from 2.95 to 4.10 (the host was shared; `bench/gate/*.load-before` and
`*.load-after`). Result: **slower 0 of 35, geomean delta of minima +2.75%, worst delta 8.7% (`evaluate :: rules FirstApplicable
— 8, last applies`), gate: pass.**

| workload | base min (ns) | prototype min (ns) | delta of minima | base spread | band | delta p50 | delta mean | verdict |
|---|---|---|---|---|---|---|---|---|
| evaluate :: one node | 5,416 | 5,541 | +2.3% | 3.8% | 10.0% | +2.1% | +2.0% | ok |
| evaluate :: rules DenyOverrides — 8 permits | 6,875 | 7,000 | +1.8% | 1.8% | 10.0% | +4.0% | +3.4% | ok |
| evaluate :: rules FirstApplicable — 8, last applies | 6,667 | 7,250 | +8.7% | 3.1% | 10.0% | +7.9% | +6.8% | ok |
| evaluate :: anyOf First — 8, last allows | 6,791 | 7,291 | +7.4% | 0.0% | 10.0% | +6.7% | +6.1% | ok |
| evaluate :: wide — allOf of 8 | 6,917 | 7,041 | +1.8% | 1.2% | 10.0% | +2.7% | +2.8% | ok |
| evaluate :: anyOf Union — 8 | 7,250 | 7,500 | +3.4% | 2.9% | 10.0% | +2.7% | +2.3% | ok |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | 7,708 | 7,833 | +1.6% | 7.6% | 10.0% | +2.0% | +2.1% | ok |
| evaluate :: rules PermitOverrides — 8 denies | 7,750 | 8,208 | +5.9% | 3.2% | 10.0% | +2.5% | +2.9% | ok |
| evaluate :: field-heavy — anyOf of 8 under Union | 7,791 | 7,833 | +0.5% | 2.1% | 10.0% | +2.5% | +2.2% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | 7,958 | 8,459 | +6.3% | 2.6% | 10.0% | +5.2% | +5.4% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | 7,959 | 8,459 | +6.3% | 3.1% | 10.0% | +4.8% | +5.5% | ok |
| evaluate :: deep rules — 10 nested | 9,250 | 9,875 | +6.8% | 0.5% | 10.0% | +2.1% | +1.9% | ok |
| evaluate :: deep — 10 levels | 9,416 | 9,417 | 0.0% | 3.1% | 10.0% | +1.2% | +1.5% | ok |
| evaluate :: matcher-heavy — 3 refs | 9,791 | 10,167 | +3.8% | 2.1% | 10.0% | +3.1% | +3.4% | ok |
| evaluate :: resolver miss — one port call | 10,541 | 10,833 | +2.8% | 1.6% | 10.0% | +2.8% | +3.0% | ok |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | 11,166 | 11,416 | +2.2% | 4.5% | 10.0% | +2.4% | +2.3% | ok |
| evaluate :: field-heavy — allOf of 8 under Intersection | 15,833 | 16,125 | +1.8% | 4.7% | 10.0% | +1.2% | +1.8% | ok |
| filter — 500 items :: hasPermission | 3,906,125 | 3,997,416 | +2.3% | 2.0% | 10.0% | +2.0% | +2.2% | ok |
| decideSubjects — 500 subjects :: hasPermission | 4,902,459 | 4,987,583 | +1.7% | 4.3% | 10.0% | +0.5% | +0.8% | ok |
| evaluate — depth scaling :: depth 5 | 11,041 | 11,500 | +4.2% | 3.8% | 10.0% | +0.4% | +0.5% | ok |
| evaluate — depth scaling :: depth 10 | 15,083 | 15,958 | +5.8% | 0.6% | 10.0% | +0.8% | +0.5% | ok |
| evaluate — depth scaling :: depth 20 | 23,583 | 24,166 | +2.5% | 1.4% | 10.0% | +1.4% | +1.2% | ok |
| evaluate — depth scaling :: depth 40 | 40,959 | 43,000 | +5.0% | 6.5% | 10.0% | +1.6% | +1.5% | ok |
| evaluate — width scaling :: width 4 | 8,041 | 8,458 | +5.2% | 3.6% | 10.0% | +0.5% | +1.3% | ok |
| evaluate — width scaling :: width 8 | 9,959 | 9,875 | -0.8% | 4.6% | 10.0% | +2.0% | +1.8% | ok |
| evaluate — width scaling :: width 16 | 13,209 | 13,125 | -0.6% | 5.0% | 10.0% | +3.3% | +3.0% | ok |
| evaluate — width scaling :: width 32 | 19,542 | 19,500 | -0.2% | 5.5% | 10.0% | +3.4% | +3.9% | ok |
| evaluate — wide, concurrency :: sequential (default) | 7,125 | 7,208 | +1.2% | 4.1% | 10.0% | +1.6% | +2.2% | ok |
| evaluate — wide, concurrency :: concurrency: unbounded | 7,250 | 7,750 | +6.9% | 8.1% | 10.0% | +2.1% | +2.6% | ok |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | 7,375 | 7,208 | -2.3% | 7.3% | 10.0% | +1.6% | +1.9% | ok |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | 7,292 | 7,500 | +2.9% | 4.6% | 10.0% | +1.6% | +2.2% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | 7,000 | 6,875 | -1.8% | 5.4% | 10.0% | +1.7% | +1.8% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | 8,875 | 8,916 | +0.5% | 4.2% | 10.0% | +3.0% | +2.9% | ok |
| filter — 500 items, concurrency :: sequential (default) | 3,933,417 | 3,968,000 | +0.9% | 1.1% | 10.0% | +1.2% | +1.3% | ok |
| filter — 500 items, concurrency :: concurrency: unbounded | 3,999,917 | 4,026,167 | +0.7% | 0.6% | 10.0% | +1.0% | +1.2% | ok |

The two leaf-heavy rows are the workloads this change exists for: `+6.3%` and `+6.3%`, the workload whose matchers reference
neither input and the one whose matchers reference both, 0.0 percentage points apart, both inside the 10% band. Both
workloads supply the action and the resource, so `absenceOf` returns before `referencesAction` or `referencesResource` runs
and neither walks a matcher reference: the two take the same path, differ only in their matchers' own cost, and so the delta
they share is the table read on the path where every input is present. The walk of a matcher's references runs only on the
failing path, which neither workload measures. The bench file's comment on `leafHeavyPlain` once said the pair tells the cost
of reading the references from the cost of the arms; it was corrected to say this, a comment-only edit that changes no
workload, so the file still runs what the committed runs measured.

### The after-run: the shipped source against the base

The same method, run on the real implementation after 50-04 and 50-05, with the base as the reference: `bench/after/to-base.patch`
is `git diff HEAD 5ab8d0c0 -- packages/core/src`, applied around each of three base runs, interleaved with three runs of the
unpatched head `94e825e6` (patch SHA-256 `2fbb412a…8029b`; start 2026-11-16T13:15:49Z). The 1-minute load average before
each run ranged from 1.91 to 2.83, with `uptime` before the first reading `2.70 3.36 3.28`; nothing else ran alongside. Result:
**slower 0 of 35, geomean delta of minima +1.87%, worst delta 9.3% (`evaluate :: anyOf First — 8, last allows`), gate: pass.**

The worst row sits 0.7 points inside its 10% band, and the base's own spread there was 2.5%, so the band is the floor and not
the spread. It is the closest the shipped source comes to the line, and this record does not round it away: the next worst
rows are 7.7% (`width scaling :: width 32`), 6.8% (`width scaling :: width 16`) and 4.6%. The gate's prototype was
+2.75% geomean and the shipped source is +1.87%, and both leaf-heavy rows improved on the prototype's `+6.3%`: `+3.6%` where the
matchers reference neither input (base 8,125 ns, final 8,417 ns, spread 4.1%) and `+1.5%` where they reference both (base
8,458 ns, final 8,583 ns, spread 2.5%).

| workload | base min (ns) | final source min (ns) | delta of minima | base spread | band | delta p50 | delta mean | verdict |
|---|---|---|---|---|---|---|---|---|
| evaluate :: one node | 5,292 | 5,458 | +3.1% | 3.2% | 10.0% | +2.8% | +2.5% | ok |
| evaluate :: rules DenyOverrides — 8 permits | 6,958 | 6,917 | -0.6% | 4.8% | 10.0% | +4.0% | +3.8% | ok |
| evaluate :: rules FirstApplicable — 8, last applies | 7,000 | 7,166 | +2.4% | 5.9% | 10.0% | +7.4% | +7.1% | ok |
| evaluate :: anyOf First — 8, last allows | 6,709 | 7,333 | +9.3% | 2.5% | 10.0% | +5.6% | +6.4% | ok |
| evaluate :: wide — allOf of 8 | 6,958 | 7,125 | +2.4% | 0.6% | 10.0% | +3.3% | +3.4% | ok |
| evaluate :: anyOf Union — 8 | 7,292 | 7,208 | -1.2% | 2.3% | 10.0% | +3.3% | +3.0% | ok |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | 7,583 | 7,625 | +0.6% | 3.3% | 10.0% | +1.5% | +1.3% | ok |
| evaluate :: rules PermitOverrides — 8 denies | 7,917 | 7,958 | +0.5% | 5.3% | 10.0% | +3.5% | +3.2% | ok |
| evaluate :: field-heavy — anyOf of 8 under Union | 7,708 | 7,875 | +2.2% | 2.7% | 10.0% | +3.0% | +3.1% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | 8,458 | 8,583 | +1.5% | 2.5% | 10.0% | +4.7% | +4.7% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | 8,125 | 8,417 | +3.6% | 4.1% | 10.0% | +4.7% | +4.2% | ok |
| evaluate :: deep rules — 10 nested | 9,458 | 9,333 | -1.3% | 4.0% | 10.0% | +1.6% | +1.5% | ok |
| evaluate :: deep — 10 levels | 9,375 | 9,583 | +2.2% | 0.9% | 10.0% | +1.2% | +1.4% | ok |
| evaluate :: matcher-heavy — 3 refs | 9,791 | 10,125 | +3.4% | 2.1% | 10.0% | +2.7% | +2.8% | ok |
| evaluate :: resolver miss — one port call | 10,541 | 10,792 | +2.4% | 2.8% | 10.0% | +2.8% | +1.9% | ok |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | 11,708 | 11,625 | -0.7% | 3.9% | 10.0% | +1.7% | +1.5% | ok |
| evaluate :: field-heavy — allOf of 8 under Intersection | 15,708 | 16,208 | +3.2% | 1.1% | 10.0% | +1.2% | +1.2% | ok |
| filter — 500 items :: hasPermission | 3,913,417 | 3,951,209 | +1.0% | 0.6% | 10.0% | +1.7% | +1.4% | ok |
| decideSubjects — 500 subjects :: hasPermission | 4,860,333 | 4,921,500 | +1.3% | 1.4% | 10.0% | +0.6% | +0.6% | ok |
| evaluate — depth scaling :: depth 5 | 11,250 | 11,375 | +1.1% | 5.6% | 10.0% | +2.1% | +1.3% | ok |
| evaluate — depth scaling :: depth 10 | 15,875 | 15,334 | -3.4% | 4.5% | 10.0% | +1.0% | +1.1% | ok |
| evaluate — depth scaling :: depth 20 | 24,958 | 24,625 | -1.3% | 6.2% | 10.0% | +0.3% | +0.6% | ok |
| evaluate — depth scaling :: depth 40 | 42,250 | 42,500 | +0.6% | 5.1% | 10.0% | 0.0% | +0.6% | ok |
| evaluate — width scaling :: width 4 | 8,250 | 8,459 | +2.5% | 6.1% | 10.0% | +1.0% | +1.1% | ok |
| evaluate — width scaling :: width 8 | 9,666 | 9,750 | +0.9% | 3.4% | 10.0% | +1.2% | +2.1% | ok |
| evaluate — width scaling :: width 16 | 12,833 | 13,708 | +6.8% | 3.2% | 10.0% | +2.7% | +2.6% | ok |
| evaluate — width scaling :: width 32 | 18,916 | 20,375 | +7.7% | 3.3% | 10.0% | +4.5% | +3.7% | ok |
| evaluate — wide, concurrency :: sequential (default) | 7,291 | 7,208 | -1.1% | 5.7% | 10.0% | +3.3% | +2.5% | ok |
| evaluate — wide, concurrency :: concurrency: unbounded | 7,291 | 7,500 | +2.9% | 2.9% | 10.0% | +2.6% | +2.2% | ok |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | 7,000 | 7,125 | +1.8% | 5.4% | 10.0% | +3.3% | +2.5% | ok |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | 7,208 | 7,542 | +4.6% | 2.3% | 10.0% | +3.1% | +2.3% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | 6,708 | 6,917 | +3.1% | 5.6% | 10.0% | +3.4% | +3.4% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | 8,791 | 9,083 | +3.3% | 1.9% | 10.0% | +3.0% | +3.0% | ok |
| filter — 500 items, concurrency :: sequential (default) | 3,952,834 | 4,009,875 | +1.4% | 1.7% | 10.0% | +1.2% | +1.3% | ok |
| filter — 500 items, concurrency :: concurrency: unbounded | 4,022,958 | 4,045,125 | +0.6% | 1.0% | 10.0% | +0.9% | +1.2% | ok |

## Mutation

Stryker on `Walk.ts`, `Predicate.ts` and `PortAccess.ts` before any code (`50-mutation-base.json`, committed first as the
phase's first commit `75580ec0`) and on the same three plus the new `LeafNeeds.ts` after (`50-mutation-after.json`), alone on
the host each time (WX-05).

| File | Base | After | Detected / scored (after) |
|------|------|-------|---------------------------|
| `PortAccess.ts` | 100% (46/46) | 100% | 47/47 |
| `Predicate.ts` | 100% (298/298) | 100% | 293/293 |
| `Walk.ts` | 95.05% (307/323) | 94.81% | 292/308 |
| `LeafNeeds.ts` (new) | n/a | 98.11% | 52/53 |

`Walk.ts` is the one score that fell, and D-13 says when that is a pass: when its survivor set is unchanged and the drop is
only killed mutants that left with the deleted checks. Both hold. The 16 survivors (13 survived, 3 not covered) are the
same 16, identity by identity (mutator, status, replacement, mutated text and the line's text; the comparer's lists are equal,
`+0 -0`): the nine `depth + 1` arithmetic mutants, the two `{ concurrency: request.concurrency }` object literals,
`depth > maxDepth`, `"HasCustom"` and the three uncovered literals (`{ maxDepth }`, `"the obliged policy denied"`, `"a required
policy denied"`). None is inside a leaf arm, before or after. Detected mutants inside the leaf arms fell from 64 to 42, the
deleted checks going with them, while detected mutants outside the arms rose from 243 to 250 (the `supplied` object `walk()`
now builds). The 22 killed mutants that left the arms went with the deleted checks; those checks now live once in `LeafNeeds.ts`, which
detects 52.

`LeafNeeds.ts` has one survivor: `ConditionalExpression | Survived | true | LEAF_NEEDS[leaf._tag].own === "Action"` in
`isActionLeaf`. It is equivalent, not a missing test: `isActionLeaf` has one call site, `absenceOf`, reached only inside
`if (need.own === "Action" && !supplied.action)`, and only `HasAction` has `own: "Action"`, so the predicate is already true
wherever it is evaluated and replacing it with `true` changes no behaviour. Restructuring the code to kill an equivalent
mutant was not done. `PortAccess.ts` and `Predicate.ts` did not fall.

## Consequences

- **A new leaf tag needs a row.** Adding a leaf to `LeafPolicy` without a row in `LEAF_NEEDS` is TS2741 and an extra row is
  TS2353, a row whose `own` or `resourceId` disagrees with its tag's classification or whose `matcher` disagrees with its
  variant is TS2322, and a leaf that no classification names has no row that compiles (INV-QD-345, `LeafNeeds.tst.ts`); a leaf whose own input is checked after what its matcher references is a failing matrix cell and a
  failing table test (INV-QD-346, `LeafMatrix.test.ts`, `LeafNeeds.test.ts`).
- **The two interpreters cannot disagree about a leaf's absence.** They read one function, so a request missing both inputs
  reports the same error from `evaluate` and `toPredicate` wherever both apply, and `MissingAction`'s `expected` key is the
  same in both.
- **The cost is measured, not free.** The bulk of the deltas in both runs are positive; the band absorbs them by rule, and
  the after-run's worst row is 0.7 points inside it. A future change that moves `evaluateNode`'s leaf arms again starts from
  these numbers and re-measures (ADR-QD-034, ADR-QD-073); this record is not a licence to add work to the arms.
- **Phase 51's boundary.** `Policy.ts` and `Decision.ts` have no change, and nothing here depends on `Decision.ts`'s `leafTags`,
  so a phase that edits `Policy.ts` for arity meets this module only through the compile error a changed leaf set raises in
  `LEAF_NEEDS`.
- **No public surface moved.** No export was added or removed, so `spec/overview.md` and AGENTS.md's cited locations
  (`evaluateNode`'s switch, the three untraced functions, the `PortAccess.ts` read list) are unchanged. The changeset is a
  `@qadi/core` patch.

## Amendment (2026-11-18, ADR-QD-167, CCR-QD-445)

[ADR-QD-167](./167-each-leafs-answer-becomes-a-verdict-in-one-row.md): the verdict step now sits beside the judgements this record placed in `LeafNeeds.ts`, as one closed row per leaf tag (`LEAF_VERDICTS`). The walk chooses a sentence from a row's outcome and `toPredicate` folds by `isHeld`; this record's `LEAF_NEEDS` rows are unchanged.

## Amendment (2026-11-19, ADR-QD-172, CCR-QD-450)

[ADR-QD-172](./172-admission-produces-the-one-walk-environment.md): the `supplied` object `walk()` built and `compileTree`'s `Supplied<true>` literal are gone. `admit`
builds `supplied` once from the row source (`SUPPLIED`), so the mutants killed on those two literals moved to
`Admission.ts` (ADR-QD-172's mutation table). `absenceOf(leaf, supplied)` and Decision 2's rule are unchanged, and
`toPredicate`'s resource is still supplied by type, now through `SUPPLIED`'s `"row"` row (`Admitted<"row">`).
