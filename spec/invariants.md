# Runtime Invariants

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-INV                                       |
> | Revision       | 1.230                                           |
> | Effective Date | 2026-11-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.230 (2026-11-25): INV-QD-415 and INV-QD-416 new; INV-QD-390 and INV-QD-407 restated for five derived stores and eleven stores (CCR-QD-477)<br>1.229 (2026-11-25): the mutation enforcement of the lens session names the devtools mutation run over src/model, not a lens group of stryker.devtools.mjs (CCR-QD-476)<br>1.228 (2026-11-25): INV-QD-413 and INV-QD-414 (CCR-QD-476)<br>1.227 (2026-11-25): INV-QD-406 Source: the draw reads the hook's own subscription to the questions store (CCR-QD-476)<br>1.226 (2026-11-25): the test that pins a sample's four fields reads the raw sample and is named for it (CCR-QD-475)<br>1.225 (2026-11-25): INV-QD-411 and INV-QD-412 new; INV-QD-314 and INV-QD-366 amended (CCR-QD-475)<br>1.224 (2026-11-25): the module and its two test files are renamed from DiagnosticsStore to Diagnostics (CCR-QD-475)<br>1.223 (2026-11-25): INV-QD-409 and INV-QD-410: a provider's registry has one owner for its lifetime (ARCH-129, ADR-QD-195, CCR-QD-474)<br>1.222 (2026-11-25): INV-QD-373's enforcement names TimelineFeed.listeners.test.ts and DockModel.listeners.test.ts (CCR-QD-473)<br>1.221 (2026-11-25): INV-QD-407: the enforcement names DL1 to DL9, the lens DL10, DL18 and DL19 (CCR-QD-473)<br>1.220 (2026-11-24): INV-QD-408 new; INV-QD-373, INV-QD-390, INV-QD-296 and INV-QD-403 restated (CCR-QD-473)<br>1.219 (2026-11-24): INV-QD-407 (CCR-QD-473)<br>1.218 (2026-11-24): INV-QD-406 new; INV-QD-390 and INV-QD-107 restated for the lens (ADR-QD-193, CCR-QD-472)<br>1.217 (2026-11-24): INV-QD-405: the lens snapshot admits no pick while picking and at most one drawn guard while picking (ADR-QD-193, CCR-QD-472)<br>1.216 (2026-11-24): INV-QD-403 and INV-QD-404 new; INV-QD-389 restated (ADR-QD-192, CCR-QD-471)<br>1.215 (2026-11-24): INV-QD-402 new: a timeline feed hands its host one store for its life (ADR-QD-191, CCR-QD-470)<br>1.214 (2026-11-24): BEH-QD-728 and INV-QD-401: a capacity the timeline refuses changes nothing in configure (ADR-QD-191, CCR-QD-470)<br>1.213 (2026-11-24): INV-QD-399, INV-QD-400 and INV-QD-101: a refusal is a member of a closed enum, and entries that is not a list is refused (ADR-QD-190, CCR-QD-469)<br>1.212 (2026-11-24): INV-QD-399: the writer reads keyMaterial once and writes what it checked (ADR-QD-190, CCR-QD-469)<br>1.211 (2026-11-24): INV-QD-400: the codec freezes each row and its record, one level (ADR-QD-190, CCR-QD-469)<br>1.210 (2026-11-24): INV-QD-399 holds for any keyMaterial the reader reads and refuses the rest, not a defect (ADR-QD-190, CCR-QD-469)<br>1.209 (2026-11-24): INV-QD-399, INV-QD-400 and INV-QD-101 hold at run time for a row typed any (ADR-QD-190, CCR-QD-469)<br>1.208 (2026-11-23): INV-QD-101 and INV-QD-054 hold through the codec with no undated and no SequenceNumberInvalid; INV-QD-053's and INV-QD-101's enforcement draw a finite at (ADR-QD-190, CCR-QD-469)<br>1.207 (2026-11-23): INV-QD-399 and INV-QD-400 new: every archive the writer returns is read back, and an audit row is made only by its codec (ADR-QD-190, CCR-QD-469)<br>1.206 (2026-11-23): INV-QD-398's enforcement names the rows that pin each guarded field's refusal (code review, CCR-QD-468)<br>1.205 (2026-11-23): INV-QD-397 and INV-QD-398: the list of rows is read through the guarded read, and its pins are named (code review iteration 2 WR-01, ADR-QD-189, CCR-QD-468)<br>1.204 (2026-11-23): INV-QD-397 and INV-QD-398: the guarded read of a row or a site, and the rows that pin it (code review WR-01, ADR-QD-189, CCR-QD-468)<br>1.203 (2026-11-23): INV-QD-288 and INV-QD-398: the one missing-id check is requireResourceId in ScopedLeaf.ts (code review WR-03, ADR-QD-189, CCR-QD-468)<br>1.202 (2026-11-23): INV-QD-397 and INV-QD-398; INV-QD-057's Source names SignatureMatch.ts (ARCH-123, ADR-QD-189, CCR-QD-468)<br>1.201 (2026-11-23): INV-QD-396's Enforcement cites the pins of each span's public name and of the log event's runtime marker (code review, ADR-QD-188, CCR-QD-467)<br>1.200 (2026-11-23): INV-QD-395's implication states what holds; INV-QD-396 links BEH-QD-712's scoped title (code review, ADR-QD-188, CCR-QD-467)<br>1.199 (2026-11-23): INV-QD-395's source names the annotators in PortSpanEncode.ts (code review, ADR-QD-188, CCR-QD-467)<br>1.198 (2026-11-23): INV-QD-396's source names batchAskedOf (code review, ADR-QD-188, CCR-QD-467)<br>1.197 (2026-11-23): INV-QD-396 cites the pin that annotateAsked refuses the denial event (code review, ADR-QD-188, CCR-QD-467)<br>1.196 (2026-11-23): INV-QD-396: written through askedAttributes and logAnnotations too; every span-writing function refuses a log event, review keeps a raw span write or an upcast (code review, ADR-QD-188, CCR-QD-467)<br>1.195 (2026-11-23): INV-QD-396 cites the refusal of the denial event's struct (code review, ADR-QD-188, CCR-QD-467)<br>1.194 (2026-11-23): INV-QD-396's source names the annotators in PortSpanEncode.ts (code review, ADR-QD-188, CCR-QD-467)<br>1.193 (2026-11-23): INV-QD-396's source names the keyless decideSubjectSpan (code review, ADR-QD-188, CCR-QD-467)<br>1.192 (2026-11-23): INV-QD-396: the compiler holds each question to every member of its struct (code review, ADR-QD-188, CCR-QD-467)<br>1.191 (2026-11-23): INV-QD-395 cites the interrupted and defected evaluation tests; INV-QD-396 scopes the outcome to a decision or a typed failure (code review, ADR-QD-188, CCR-QD-467)<br>1.190 (2026-11-23): INV-QD-395 and INV-QD-396 new: the evaluate family's spans carry their question on every path and state each key once; INV-QD-044's type floor covers the family's structs (ARCH-122, ADR-QD-188, CCR-QD-467)<br>1.189 (2026-11-23): INV-QD-393: what each transition answers, and seedFrom's no-op (code review, ADR-QD-187, CCR-QD-466)<br>1.188 (2026-11-23): INV-QD-393, INV-QD-394: the seeded choice is a pure value; the session writes its draft in one place and clears its run through one operation (ADR-QD-187, CCR-QD-466)<br>1.187 (2026-11-23): INV-QD-107: the simulator's list and equality are SeededChoice's (ADR-QD-187, CCR-QD-466)<br>1.186 (2026-11-22): INV-QD-391: cites only the tests that pin the writer's contract (CCR-QD-465)<br>1.185 (2026-11-22): INV-QD-391: the GateCurrent refusal is a pin on that name alone (CCR-QD-465)<br>1.184 (2026-11-22): INV-QD-391: sameIdentity is named as the module's unexported comparison (CCR-QD-465)<br>1.183 (2026-11-22): INV-QD-392: the ref holds its registrations, each carrying the identity it was made for, and nothing beyond them (CCR-QD-465)<br>1.182 (2026-11-22): INV-QD-391, INV-QD-392: the writer's contract replaces the failure rule (CCR-QD-465)<br>1.181 (2026-11-22): INV-QD-391, INV-QD-392: gate registration as one keyed reconcile (ARCH-120, CCR-QD-465)<br>1.180 (2026-11-22): INV-QD-389: a failed build, and a release that throws on close (CCR-QD-464)<br>1.179 (2026-11-22): INV-QD-389, INV-QD-390: own enumerable string-keyed key fields, and what the store-list test enforces (CCR-QD-464)<br>1.178 (2026-11-22): INV-QD-389, INV-QD-390: a derived store behind the dock model's stores (ARCH-119, CCR-QD-464)<br>1.177 (2026-11-22): INV-QD-314, INV-QD-343, INV-QD-355 and INV-QD-357 name the derived stores (ARCH-119, CCR-QD-464)<br>1.176 (2026-11-22): INV-QD-388's enforcement names the declared binding as not counted<br>1.175 (2026-11-22): INV-QD-064's Source names buildGateRegistry; INV-QD-251 names the one resolver and onIdCollision; INV-QD-387 names holdsHere and says what its tests pin; INV-QD-388 states what the budget counts and is retitled to the one rebindable module-scope binding (ARCH-118, CCR-QD-463)<br>1.174 (2026-11-22): INV-QD-387 and INV-QD-388 (ARCH-118, ADR-QD-184, CCR-QD-463)<br>1.173 (2026-11-22): INV-QD-045's Source and Enforcement paragraph is rewrapped to the file's width<br>1.172 (2026-11-22): INV-QD-385 and INV-QD-045 state what the compiler checks: a reason with no bucket or named producer does not compile, every bucket is emitted, and no type checks that code drops anything under a reason; 'the phase base' replaced (ARCH-117, CCR-QD-462)<br>1.171 (2026-11-22): INV-QD-385 scoped: a reason with a bucket cannot go unreported, a payload reason's producer is named but its use is not type-checked; INV-QD-385 and INV-QD-386 enforcement name the pins and rows that hold each, INV-QD-045 and INV-QD-323 follow (ADR-QD-183, CCR-QD-462)<br>1.170 (2026-11-22): INV-QD-385 and INV-QD-386: every hydration drop reason has one stated source and one reporting path, and each side declares its drop event order once; INV-QD-045's enforcement restated and INV-QD-323's corrected (ADR-QD-183, CCR-QD-462)<br>1.169 (2026-11-22): INV-QD-383 and INV-QD-384: a function stated as total stays total whatever value it caught, and no shipped code renders a cause through a call that can throw (ADR-QD-182, CCR-QD-461)<br>1.168 (2026-11-21): INV-QD-375 and INV-QD-376: admit reads each field of the question once (ARCH-115, CCR-QD-459)<br>1.167 (2026-11-21): INV-QD-377 states how the ignore projection reads an accessor that answers differently or deletes a key; INV-QD-375's enforcement says what the gate reads of its two pins (ARCH-115, CCR-QD-459)<br>1.166 (2026-11-21): INV-QD-379: a bounded decision cache holds at most capacity entries and evicts the oldest first (ARCH-114, CCR-QD-458)<br>1.165 (2026-11-20): INV-QD-097 scopes its totality to JSON text and JSON values and names the accessors it does not cover; INV-QD-377 reads _tag to choose a member only when the schema flattens to more than one (phase 66 review WR-01, IN-01)<br>1.164 (2026-11-20): INV-QD-377; INV-QD-097, INV-QD-306 and INV-QD-360 amended (ARCH-113, CCR-QD-457)<br>1.163 (2026-11-20): Narrowed ARCH-112's read-once claim to the question's resource and action (review finding WR-01): INV-QD-376 retitled, its anchor and links updated<br>1.162 (2026-11-20): INV-QD-375 and INV-QD-376; INV-QD-364 amended (ARCH-112, CCR-QD-456)<br>1.161 (2026-11-20): INV-QD-373 (ARCH-111, ADR-QD-177, CCR-QD-455)<br>1.160 (2026-11-19): INV-QD-367 and INV-QD-368 (ARCH-108, ADR-QD-174, CCR-QD-452)<br>1.159 (2026-11-19): INV-QD-365 and INV-QD-366 (ARCH-107, CCR-QD-451)<br>1.158 (2026-11-19): INV-QD-363 and INV-QD-364; INV-QD-037 names the walk environment (ARCH-106, CCR-QD-450)<br>1.157 (2026-11-19): INV-QD-361 and INV-QD-362; INV-QD-039 names sinkRecordOrder and storedRecordOrder (ARCH-105, CCR-QD-449)<br>1.156 (2026-11-19): INV-QD-359's enforcement cites U1 to U21<br>1.155 (2026-11-19): INV-QD-359, INV-QD-360; INV-QD-305 and INV-QD-306 carve out the ignored key (ADR-QD-170)<br>1.154 (2026-11-18): INV-QD-357, INV-QD-358; INV-QD-343 and INV-QD-313 follow the gates feed (ARCH-103, CCR-QD-447)<br>1.153 (2026-11-18): INV-QD-355, INV-QD-356 (ARCH-102, CCR-QD-446)<br>1.152 (2026-11-18): INV-QD-353, INV-QD-354 (ARCH-101, CCR-QD-445)<br>1.151 (2026-11-18): INV-QD-091 restated over the operand read; INV-QD-351, INV-QD-352 added (ARCH-100, CCR-QD-444)<br>1.150 (2026-11-16): INV-QD-349: one compile shell, each compile moves its dialect's counter exactly once (ARCH-99, CCR-QD-443)<br>1.149 (2026-11-16): INV-QD-348: Decision.test.ts's foldTrace tests are untouched; one test for the two trace guards was added (ARCH-98, review iteration 2 IN-03)<br>1.148 (2026-11-16): INV-QD-348: the trace children are a closed per-arity table (ARCH-98, review iteration 1 WR-02)<br>1.147 (2026-11-16): INV-QD-347 and INV-QD-348: every policy tag has one arity, and the trace fold reads it (ARCH-98, CCR-QD-442)<br>1.146 (2026-11-16): a row's resourceId is classified by tag like its own, an unlisted tag gets never (review iteration 2 IN-02)<br>1.145 (2026-11-16): a leaf no own classification names has no row that compiles (review iteration 2 WR-01)<br>1.144 (2026-11-16): HasAttribute's outcome on a request missing both inputs depends on what its matcher references (review WR-03)<br>1.143 (2026-11-16): a row's own and matcher are derived from its leaf's variant (review WR-01)<br>1.142 (2026-11-16): INV-QD-345 and INV-QD-346 new: every leaf tag has one row in the leaf-needs table; a leaf's own input is checked before what its matcher references; INV-QD-011's source is LeafNeeds.ts's absenceOf (ARCH-97, CCR-QD-441)<br>1.141 (2026-11-16): INV-QD-343: the failure identity is an error's name and message; the enforcement cites M36 to M47 (review iteration 3 IN-06; ARCH-96, CCR-QD-440)<br>1.140 (2026-11-16): INV-QD-343 and INV-QD-344: enforcement cites committed tests, not a phase SUMMARY's negative controls; INV-QD-343 states a throwing registry (review IN-01, WR-01; ARCH-96, CCR-QD-440)<br>1.139 (2026-11-16): INV-QD-343 and INV-QD-344: one moment, and the gate states stated once (ARCH-96, CCR-QD-440)<br>1.138 (2026-11-16): INV-QD-342: enforcement cites the tests that hold the class, not the payload characterisation (ARCH-95 review IN-03, CCR-QD-439)<br>1.137 (2026-11-16): INV-QD-341: scoped to the six unwritten leaves; Refused warns without a row (ARCH-95, CCR-QD-439)<br>1.136 (2026-11-16): INV-QD-341 and INV-QD-342 new; INV-QD-106 names the unwritten row and its tests (ARCH-95, ADR-QD-161, CCR-QD-439)<br>1.135 (2026-11-16): INV-QD-339 enforcement names M7b, the throwing or revoked proxy (ARCH-94 review WR-02)<br>1.134 (2026-11-16): INV-QD-339 and INV-QD-340 new: a port's default is a mark it carries, naming its port (ARCH-94, CCR-QD-438)<br>1.133 (2026-11-15): INV-QD-338: E9 alone pins the rendering containment; E15 pins a hostile cause value reported once (ARCH-93, CCR-QD-437)<br>1.132 (2026-11-15): the exact four annotation keys are pinned; the cause-rendering clause says the rendering runs inside the report's own containment; row E15 (ARCH-93, CCR-QD-437)<br>1.131 (2026-11-15): the fan-out's member line carries the emitter's four keys, both built by one report in SinkReport.ts, which also holds sinkName (ARCH-93, CCR-QD-437)<br>1.130 (2026-11-15): the report names the tag and evaluation id read before the sink runs, and unknown when they cannot be read; rows E13, E14 (ARCH-93, CCR-QD-437)<br>1.129 (2026-11-15): BEH-QD-566 and INV-QD-337 say an interruption of the evaluation itself is not a sink failure; rows E12, A7, A8 (ARCH-93, CCR-QD-437)<br>1.128 (2026-11-15): INV-QD-035 restated — contained and reported once; INV-QD-337 and INV-QD-338 new (ARCH-93, ADR-QD-159, CCR-QD-437)<br>1.127 (2026-11-15): INV-QD-335 new — a breaker's generation increments exactly when its status changes; INV-QD-052 Source restated over run and step (ARCH-92, CCR-QD-436)<br>1.126 (2026-11-15): INV-QD-333: the guard is both the wire key-set pin and the engine-agreement test (ARCH-91, CCR-QD-435)<br>1.125 (2026-11-15): INV-QD-333: the guard is the wire key-set pin, not the byte golden alone (ADR-QD-157, CCR-QD-435)<br>1.124 (2026-11-15): INV-QD-333 added; INV-QD-022 and INV-QD-059 amended: a seed's fields are the wire's (ADR-QD-157, CCR-QD-435)<br>1.123 (2026-11-15): INV-QD-009, INV-QD-013, INV-QD-032 and INV-QD-108 restated over Handover.ts; INV-QD-331 new: the array and stream forms agree on who passes, in order (ARCH-90, ADR-QD-156, CCR-QD-434)<br>1.122 (2026-11-14): INV-QD-028, INV-QD-105, INV-QD-317 and INV-QD-318: Source names SeededQuestion.ts, Enforcement adds its real-runtime tests (ADR-QD-155, CCR-QD-433)<br>1.121 (2026-11-14): INV-QD-104 amended, INV-QD-098 and INV-QD-099 enforcement read the refusal, INV-QD-325 new (ADR-QD-153, CCR-QD-431)<br>1.120 (2026-11-14): INV-QD-045 amended; INV-QD-323 new: each hydration drop reason has exactly one kind (ADR-QD-152, CCR-QD-430)<br>1.119 (2026-11-14): INV-QD-096 amended: the codec reads the version it writes, stated once (ADR-QD-151, CCR-QD-429)<br>1.118 (2026-11-14): INV-QD-319 and INV-QD-320 new; INV-QD-313's Source names the module (CCR-QD-428)<br>1.117 (2026-11-12): INV-QD-313 restated: the timeline feed states a defect, never an interruption, and a replaced read never writes (CCR-QD-427)<br>1.116 (2026-11-12): INV-QD-317 and INV-QD-318 new; INV-QD-028 and INV-QD-105 restated (ADR-QD-149, CCR-QD-427)<br>1.115 (2026-11-12): INV-QD-064's Source credits the handle's key closure to GateRegistry.ts, not GateWriter.ts (CCR-QD-427)<br>1.114 (2026-11-12): INV-QD-315 and INV-QD-316 new: one sweeper per atom set; never on the render path or inside the dispose-then-reread window; INV-QD-105 restated (ARCH-83, CCR-QD-426)<br>1.113 (2026-11-12): review fixes: a closed feed and a repeated command publish nothing; the notice keeps a persistent status region, alerts once per stop and shows its focus (ARCH-82, BEH-QD-507, BEH-QD-509, INV-QD-313, CCR-QD-425)<br>1.112 (2026-11-12): INV-QD-313 and INV-QD-314 new: a poll defect is stated and a replaced run never writes; the merged reading is the model's (ARCH-82, CCR-QD-425)<br>1.111 (2026-11-12): INV-QD-042 restated: the seal is core's evaluationEnvironment with shadow sinkAndCache, Enforcement names a decision log; INV-QD-311 and INV-QD-312 new (ARCH-81, ADR-QD-146, CCR-QD-424)<br>1.110 (2026-11-12): INV-QD-307 new; INV-QD-025's Enforcement names SharedComputation's superseded claims (ARCH-79, CCR-QD-422)<br>1.109 (2026-11-12): INV-QD-305 enforcement: the [untrusted-decode] rule also counts JSON.parse; six budgeted files.<br>1.108 (2026-11-12): INV-QD-305 and INV-QD-306 new; INV-QD-045's reason set is nine (ARCH-78, CCR-QD-421)<br>1.107 (2026-11-11): INV-QD-046's Source names useGate.ts for useGates (ARCH-76, CCR-QD-418)<br>1.106 (2026-11-11): INV-QD-180, INV-QD-032 and the devtoolsPath Source name addGuardedRoute and PermissionRegistryRoute.ts, not the removed guardRoute and PermissionRegistry.ts (ARCH-75, CCR-QD-417)<br>1.105 (2026-11-11): INV-QD-296 added: the dock's stores never disagree about the timeline; INV-QD-107's Source and Enforcement name DockModel and useDockModel, not the owned hook (ARCH-74, CCR-QD-416)<br>1.104 (2026-11-11): INV-QD-290 added: a record's class and its wire envelope list the same fields; INV-QD-096's Enforcement names the every-shape round trip and the encoded-value key pins (ARCH-71, ADR-QD-135, CCR-QD-413)<br>1.103 (2026-11-11): INV-QD-288 states what guards the two optional-id ports: the leaf's scope decides both the request and the route through one test, pinned by a law test (ARCH-70, CCR-QD-412)<br>1.102 (2026-11-11): INV-QD-288 (a scoped port read never reaches its port without a resource id) and INV-QD-289 (the name servingFor serves for a leaf is asked of the request that leaf's read builds, at any site); INV-QD-095 names asks (ARCH-70, ADR-QD-134, CCR-QD-412)<br>1.101 (2026-11-11): INV-QD-286 (a derived port's key names exactly its wire question's members); INV-QD-280's Enforcement names the law (ARCH-69, CCR-QD-411)<br>1.100 (2026-11-10): INV-QD-025's Enforcement names BEH-QD-439 and its tests: an interruption is not an answer a hit or a miss can differ by (ARCH-68, ADR-QD-132, CCR-QD-410)<br>1.99 (2026-11-10): INV-QD-006 gains its devtools Enforcement: VerdictTreatment.ts is the one map from a state to its look, and Deny and Error differ in every channel; INV-QD-004's Source notes that devtools reads an allow's fields once, through readOutcome (BEH-QD-429, BEH-QD-430, ARCH-67, CCR-QD-409)<br>1.98 (2026-11-10): INV-QD-285 (a devtools route and its client agree on one address) (ARCH-66, ADR-QD-130, CCR-QD-408)<br>1.97 (2026-11-10): INV-QD-280 (a request key is Equal's text); INV-QD-043's miss paragraph: an unseen replay request is an outage on every port, and an unkeyed request is never captured (ARCH-65, ADR-QD-129, CCR-QD-407)<br>1.96 (2026-11-10): INV-QD-038 holds by construction: its Source is the one identity-keyed role walk in RoleTraversal.ts, which provenance and flattening both read; Enforcement names the seeded property (ADR-QD-128, ARCH-64, CCR-QD-406)<br>1.95 (2026-11-10): INV-QD-107 — Source and Enforcement name DockSession (ARCH-63, CCR-QD-405)<br>1.94 (2026-11-10): INV-QD-035 — the audit sink cannot withhold a decision past its deadline (BEH-QD-379, ADR-QD-126, ARCH-62, CCR-QD-404)<br>1.93 (2026-11-10): INV-QD-016 corrected — the batch holds no state, but a wired decisionCacheLayer does memoise across elements, keyed on the whole subject (INV-QD-033), each element keeping its own evaluation id and sink record (INV-QD-025); Enforcement names SubjectSet.test.ts's "under a decision cache and a sink" (ARCH-61, CCR-QD-402)<br>1.92 (2026-11-10): INV-QD-259 added — a metric has one declaration, in packages/*/src, and its readers import it; one table lists every declaration (ARCH-61, ADR-QD-123, CCR-QD-401)<br>1.91 (2026-11-10): INV-QD-257 added — each simulation input field is described once, in SimulationFields.ts, and every operation on a field derives from its row (ARCH-61, ADR-QD-047 amendment, CCR-QD-400)<br>1.90 (2026-11-10): INV-QD-243 names the public mode (`enforcePublic`) as a request path: a `publicEndpoint`'s handler-raised denial is logged once, annotated "handler"; Source, Enforcement (six callers) and Related (BEH-QD-359) follow (ARCH-61, CCR-QD-399)<br>1.89 (2026-11-10): INV-QD-250 added (a resumed read loses nothing) and INV-QD-100's Implication cites it (CCR-QD-397); INV-QD-251 added (a supplied reporter cannot change a hydration outcome); INV-QD-045 restated — counted at least once, whatever the reason, and neither function throws; Source is HydrationEvent.ts, Enforcement leads with HydrationEvent.test.ts and the zero-entry probe (ARCH-60, CCR-QD-398)<br>1.88 (2026-11-10): INV-QD-120 — the ledger is a keyed store, the exact-pair read is derived once, a resource with no string id is refused (ADR-QD-117, CCR-QD-395); INV-QD-034 and INV-QD-180 — the access plan is the one reading, the registry lists what the plan enforces, an undeclared endpoint fails the build; INV-QD-243's Source drops the deleted member key (ADR-QD-118, CCR-QD-396) (ARCH-59)<br>1.87 (2026-11-09): INV-QD-107 — leaving a screen and returning to it is not a choice; its Source and Enforcement name `ExplorerSession` and `HeldChoiceStore` (ARCH-58, CCR-QD-394)<br>1.86 (2026-11-09): INV-QD-104's Source names JsonRefusal.ts, where the encode-refusal readings now live (ARCH-54, ADR-QD-116, CCR-QD-393)<br>1.85 (2026-11-08): INV-QD-095 — a served question is admitted only through its description's serving facet; Source and Enforcement name PortServing.ts and the serving-facet tests (ARCH-53, ADR-QD-114, CCR-QD-392)<br>1.84 (2026-11-08): INV-QD-022 and INV-QD-045 — Sources name HydrationEngine.ts' dehydrateWith, which owns the dehydrate partition; Enforcement cites the engine round trip (ARCH-51, ADR-QD-078 amendment, CCR-QD-390)<br>1.83 (2026-11-08): INV-QD-097's Source names `packages/http/src/DecisionLogHttp.ts`, the one module both decision-log routes encode and report through, and its Enforcement names `DecisionLogHttp.test.ts` (ARCH-50, CCR-QD-389)<br>1.82 (2026-11-08): INV-QD-046's Source and Enforcement name useGates (GateWriter.ts) and the ARCH-49 tests (ADR-QD-111, CCR-QD-388)<br>1.81 (2026-11-08): INV-QD-054 and INV-QD-130 — the archive's order, claim and sequence break are computed once in ArchiveFacts.ts, and every bundle the writer writes reads back; INV-QD-054 is stated over the codec's safe-integer domain, and a number outside it fails `SequenceNumberInvalid` first (code review WR-01) (ARCH-48, ADR-QD-110, CCR-QD-387)<br>1.80 (2026-11-08): INV-QD-043 — a signature request the capture never saw is `SignatureHistoryUnavailable`, not the empty list, which `not(hasSignature)` grants; the other four ports' misses stay `none` (code review WR-04)<br>1.79 (2026-11-08): INV-QD-244 added — a port's span says the same thing whoever asked; found by ARCH-47 (ADR-QD-109, CCR-QD-386)<br>1.78 (2026-11-08): INV-QD-243 added — every `@qadi/http` request path enforces and logs through one module; found by ARCH-46, whose review showed `portRoutesUnguarded` extracting its subject by hand and dropping the `SubjectExtractionFailed` log every guarded path writes. INV-QD-006's Related gains it (ADR-QD-108, CCR-QD-385)<br>1.77 (2026-10-08): INV-QD-241 added — a remote port fails where its store fails; found by ARCH-31, whose probe showed a relationship or history outage answered `200 "Unknown"` (a denial, and under `not(...)` a grant) and a route answering the cookie's subject under the asked subject's name. INV-QD-006's Related gains it (ADR-QD-107, CCR-QD-382)<br>1.76 (2026-10-08): INV-QD-170 added — a decision agrees with its trace; found by ARCH-32, whose probe showed a version-2 record whose Allow said allowed:false in its trace, or whose fields and duties differed from the trace root's, decoding and re-encoding unchanged. INV-QD-022's Source names the agreement check on a disclosed seed; INV-QD-096's Enforcement notes the corrected golden (ADR-QD-106, CCR-QD-301)<br>1.75 (2026-10-08): INV-QD-180 added — `/__permissions` lists what `@qadi/http` enforces, and only that; INV-QD-034 names `guardApi` and the attachment refusal (ARCH-36, CCR-QD-311)<br>1.74 (2026-10-08): INV-QD-120 added — a signature recorded for a discharge is keyed by the question it discharged; found by ARCH-30, whose probe showed a captured signature landing subject-wide, so the default-scope `hasSignature` denied it and `scope: "Any"` allowed it for every resource. INV-QD-055 restated — the request is built from the discharged question, and a signature for a different signer or meaning fails the discharge. INV-QD-013's Source names `ask` as the shared front of both paths (ADR-QD-105, CCR-QD-220)<br>1.73 (2026-10-08): INV-QD-130 added — a purge never selects a row its archive does not hold; INV-QD-053 and INV-QD-101 restated over `planRetention`/`planPurge` (ARCH-38, CCR-QD-230)<br>1.72 (2026-10-08): INV-QD-064 — the writer is a private slot of the registry object; spread-copy and reflection tests added (ARCH-43, CCR-QD-250)<br>1.71 (2026-10-08): INV-QD-043's key paragraph and Enforcement state the injectivity law and the three capture-fidelity tests; INV-QD-026 reads "rejects exactly when the core fails or the caller aborts" (ARCH-45, CCR-QD-263, CCR-QD-266)<br>1.70 (2026-10-08): INV-QD-108 added — a projected value is the evaluated resource; found by ARCH-39, whose probe showed `enforceProjected` projecting a secret report under a stub resource's decision (ADR-QD-104, CCR-QD-207)<br>1.69 (2026-10-08): INV-QD-107 added — a screen never changes what it shows without the reviewer; found by ARCH-33, where a new decision reordered the rail and the simulator and the explorer silently showed another policy (CCR-QD-206)<br>1.68 (2026-10-08): INV-QD-037 — `toPredicate` and `walk` admit through one `Admission.ts`; the `toPredicate` half is now enforced (a differential over generated trees and every `maxDepth`, including `NaN`, negatives and the default boundary), where it was only stated (ADR-QD-100 amendment, ARCH-41, CCR-QD-205)<br>1.67 (2026-10-08): INV-QD-106 added — every audit record has exactly one write outcome, and an entry not in the trail is witnessed (ARCH-35, CCR-QD-204)<br>1.66 (2026-10-08): INV-QD-045's Enforcement names `DeveloperSignals.ts` and the whole-payload wording test (ADR-QD-041 amendment, CCR-QD-203)<br>1.65 (2026-10-07): INV-QD-105 added — a live question is never evicted, and one question has one handle while tracked; found by ARCH-23, where a garbage collection split a question's atom, its `asked()` row and its seed (ADR-QD-103, CCR-QD-201)<br>1.64 (2026-10-07): INV-QD-044 — the invariant gains a type-level floor (a span field is a `SpanValue`, so a field that could hold arbitrary data does not compile) and one home (`attributeResolverPort.attributes.disclose`); the four other ports, not two, are named with their closed or boolean answers; Enforcement adds the same sentinel search under `toPredicate` and the codec tests (ADR-QD-051 amendment, ARCH-21, CCR-QD-198)<br>1.63 (2026-10-07): INV-QD-034 — an endpoint declares on itself; a declaration on a group or API is refused, not ignored (BEH-QD-320, CCR-QD-196)<br>1.62 (2026-10-07): INV-QD-104's Source names `SinkWire.ts`, where the three readings now live (CCR-QD-194)<br>1.61 (2026-10-07): INV-QD-104 added — a refusal report says where, never what; INV-QD-097's Source and Enforcement name `EncodeRefusalReport.ts` and the throwing-hook tests (ADR-QD-095 amendment, CCR-QD-193)<br>1.60 (2026-10-07): INV-QD-058's Enforcement says what pins what — `ShortCircuit.test.ts` held only the lookups, never a stop; the agreement tests are named (ARCH-26, CCR-QD-192)<br>1.59 (2026-10-07): INV-QD-103 added — a trace lines up with its policy's explanation, position by position; INV-QD-090 covers `Trace` (`renderTrace`, `diffTraces`, `foldTrace` are stack-safe) and its devtools twin is gone; INV-QD-040 cites INV-QD-103 and drops the stale `dehydrateDecisions` clause (ADR-QD-101, CCR-QD-191)<br>1.58 (2026-10-07): INV-QD-090's Source and Enforcement name `foldTreeBy` and the three case-wise folds (`foldPolicyCases`, `foldMatcherCases`, `foldExplanationCases`) (ADR-QD-090 amendment, CCR-QD-190)<br>1.57 (2026-10-07): INV-QD-102 added — a probe's verdict on port health is never served from a cache; INV-QD-030/033/035 Sources and Enforcement follow `Question`, `Walk.ts` and `SinkEmit.ts` (ADR-QD-100, CCR-QD-189)<br>1.56 (2026-10-07): INV-QD-101 added — retention never selects a row without a finite age past a valid limit; INV-QD-053's generators widened to non-finite and negative draws (CCR-QD-186)<br>1.55 (2026-10-06): INV-QD-021 — totality extends to `renderExplanation` over a `fieldStrategy` or `combining` outside its closed union, with the Source and Enforcement that pin it; INV-QD-031 — an empty `All` carrying such a strategy is not atomic, and the value is named verbatim (ADR-QD-092 amendment, CCR-QD-183)<br>1.54 (2026-10-06): INV-QD-099 retired — 0.11.0 reads one wire version, so there are no two to agree; INV-QD-098 restated for version 2 only, a pre-0.10 record refused as `UnsupportedVersion` before any outcome is read (ADR-QD-096 amendment, CCR-QD-182)<br>1.53 (2026-10-05): INV-QD-100 (a log reader sees every retained record exactly once); INV-QD-039's Source names `storedRecordOrder` as the one order (ADR-QD-097, CCR-QD-181)<br>1.52 (2026-10-05): INV-QD-098 (a decoded decision record has exactly the outcome its sender sent) and INV-QD-099 (a record decodes the same whichever wire version carried it) (ADR-QD-096, CCR-QD-180)<br>1.51 (2026-10-05): INV-QD-096 and INV-QD-097 added — whatever the record codec emits it accepts, and the codec is total (ADR-QD-095, CCR-QD-179)<br>1.50 (2026-10-05): INV-QD-095 added — every port is described once, and every derived layer agrees with its description; INV-QD-007 gains its Enforcement (the conformance suite's default cases) and names all five port defaults; INV-QD-043's Source and key paragraph follow the move of capture/replay keys and fail-closed answers into the port descriptions (ADR-QD-094, CCR-QD-177)<br>1.49 (2026-10-05): INV-QD-094 added (a decision being re-checked, or that failed, never reads as a verdict); INV-QD-028's note on a staleness invariant that speaks only of the flag is answered for `previousSuccess` (ADR-QD-093, CCR-QD-175)<br>1.48 (2026-10-05): INV-QD-093 added (a merge discloses nothing its inputs did not); INV-QD-004's Source moves to `FieldLattice.ts` and gains Enforcement; INV-QD-024's Source and Enforcement name the lattice laws and the empty-child generator arm, and its vacuity threshold is corrected from twenty to ten; INV-QD-003's Source no longer names the deleted `POLICY_TAGS_BY_TAG` or calls `mergeFields` a `_tag` switch (ADR-QD-092, CCR-QD-174)<br>1.47 (2026-10-05): INV-QD-018 violated a second time on the row operand — `toPredicate` admitted `±Infinity` rows `evaluate` denied, and the agreement properties now sample non-finite rows (CCR-QD-172); INV-QD-047/048 — the engines hold a float column, PostgreSQL's `NaN` ordering found, a range excludes or refuses non-finite rows; INV-QD-061's Source names `finiteGuardFor` and its Enforcement non-finite cells and R9; new INV-QD-091 (a primitive matcher and its predicate leaf are one function) and INV-QD-092 (an absent value never satisfies a matcher) (ADR-QD-091, CCR-QD-173)<br>1.46 (2026-10-04): INV-QD-047/048 — Enforcement now names real engines (PGlite, `node:sqlite`, Prisma Client over SQLite) in place of the JavaScript readers, which are retired, and the Implication that "there is no `Predicate` shape that renders to one target and not the other" is corrected to the declared reserved-column difference. INV-QD-048 gains the third-time-found paragraph (a three-valued `NOT` dropped NULL rows; CCR-QD-157). INV-QD-061 (`toRenderable` preserves `evaluatePredicate`) and INV-QD-062 (a wrong nullability declaration never over-admits) added (ADR-QD-079, CCR-QD-158)<br>1.45 (2026-10-04): ARCH-06 — new INV-QD-064, a guard is listed only by the registry its provider writes to; INV-QD-046's Source and Enforcement extended to the handle-based write side and a foreign `gates` registry (ADR-QD-080, CCR-QD-160)<br>1.44 (2026-10-04): ARCH-05 — INV-QD-022's Source is now `HydrationEngine.ts`'s v2 entry schema (derived from `DecisionWire`) plus a root-tag integrity check on a disclosed trace; INV-QD-028's Source moves from `QadiAtoms.ts` to `HydrationEngine.ts`'s `makeSeededQuestion`, the precedence expression unchanged; INV-QD-045's reason set is now seven and `hydrateDecisions` never throws; new INV-QD-059, a seeded decision never claims a trace it was not given (ADR-QD-078, CCR-QD-156)<br>1.43 (2026-10-04): INV-QD-037 corrected — exact in both directions, matcher nesting counts, depth judged on the policy first; INV-QD-090 — a pure walk over a caller-held tree never exhausts the call stack (ADR-QD-090, CCR-QD-170)<br>1.42 (2026-10-04): INV-QD-060 — an enforcement failure is reported with the same meaning on every route; INV-QD-006's Related gains it (ADR-QD-081, CCR-QD-155)<br>1.41 (2026-10-04): INV-QD-058 — translation fails only as evaluation would, with its three faulty-port properties; INV-QD-006's Source and INV-QD-057's Source now name `PortAccess.ts`, where every port read lives; INV-QD-018's Enforcement and INV-QD-050/056's Source updated for the compile/run split (ADR-QD-077, CCR-QD-153)<br>1.40 (2026-10-04): INV-QD-052's Source and Enforcement updated — the probe protocol moved behind `CircuitBreaker.withPermit`, generation-tagged permits, and the new over-threshold, release-on-interrupt and model-based property tests (CCR-QD-154)<br>1.39 (2026-09-19): Three Source citations corrected (100-lens audit, second batch). INV-QD-033's Source named `HashSet` for `AuthSubject.roles`/`.permissions`; the code is the built-in JS `Set`, and `DecisionCache.ts`'s own doc comment already corrects this after once making the same mistake — restated to match, citing `Equal`/`Hash`'s `instanceof Set` special-case rather than a `HashSet`. INV-QD-003's Source cited only the one-directional `Schema.Codec<Policy, PolicyEncoded>` type assertion, which alone cannot forbid a `Policy` variant added without a matching schema member (assignability checks one direction); restated to name the layered guard system that actually forecloses that gap (`POLICY_TAGS_BY_TAG`, `policyDepth`'s `Match.tagsExhaustive`, the two `_tag`-switch TS2366 checks). INV-QD-008's Source described `scripts/check-house-style.mjs`'s ambient-randomness regex as unqualified enforcement; restated as a line-level drift guard that an aliased or indexed `crypto["randomUUID"]()` call would pass silently, matching the house-style script's own doc comments' standard of precision about what a regex cannot see (.issues/high/domenic-denicola-DD-01.md's corroborators .issues/low/butler-lampson-BL-03.md, .issues/low/xavier-leroy-XL-03.md, .issues/low/bruce-schneier-BS-04.md)<br>1.38 (2026-09-19): INV-QD-057 — `hasSignature` consults no clock, promoting a limitation previously stated only in `Signature.ts`'s doc comment to a checkable, `TestClock`-pinned invariant (LL-04)<br>1.37 (2026-09-19): INV-QD-020 made literally true rather than true-except-for-failures — `AllOf`/`AnyOf`/`Rules`'s concurrent paths dispatched children through `Effect.forEach`'s fail-fast default, so a later-indexed child's failure could pre-empt an earlier-indexed child's already-decisive `Deny`/`Allow` (or, for `Rules`, its already-decisive applying row), a `Failure` where sequential evaluation would have produced a `Decision`. Children are now run through `Effect.exit` and folded in declaration order, the same fold the trace already used, so a failure is placed at the same index sequential evaluation would have reached it at (`Evaluate.ts`, INV-QD-020, CCR-QD-152)<br>1.36 (2026-09-09): INV-QD-006's Source extended — a failure this invariant covers now includes a port that dies rather than fails; `Evaluate.ts`'s five port call sites each catch that cause and convert it into the port's own typed error, so `Effect.orDie`'s absence was necessary but not sufficient on its own (BEH-QD-261, issue #100, CCR-QD-142)<br>1.35 (2026-09-08): INV-QD-013's Source corrected — `filter`/`filterStream` enforce the same obligation rule through a second path, `decideOne`, which independently reimplements evaluate → `isAllowed` → discharge per item rather than calling the shared `permitted`; a deliberate second implementation, tested on its own terms by `Qadi.test.ts`'s dedicated filter/filterStream obligation tests, not a gap. INV-QD-009's Source corrected — `enforce` is `Effect.flatMap(permitted(policy, options), () => self)`; it never calls `assert`, and both independently call `permitted`. INV-QD-052 extended — `claimProbe`/`releaseProbe` carry the same single-`Ref.modify` atomicity as `status`/`recordSuccess`/`recordFailure`, bounding a half-open window to exactly one concurrent probe (issue #72, CCR-QD-136)<br>1.34 (2026-09-08): INV-QD-018 violated in production code and INV-QD-047 with it — `Predicate.ts`'s `compare` carried only the `typeof` half of the `Number.isFinite` guard `Matcher.ts`'s `evaluateMatcher` has on a `Gte`/`Lt` bound, so `toPredicate` on `gte(-Infinity)` admitted every numeric row while `evaluate` on the same policy denied every one; and `@qadi/predicate-sql`'s `isSafeValue` admitted `NaN`, which PostgreSQL treats as equal to itself and `evaluatePredicate` does not. Both fixed, and both fuzz generators extended to sample the non-finite bounds they never drew (INV-QD-048 gained the matching property; issue #65, CCR-QD-120)<br>1.33 (2026-09-08): INV-QD-038's Enforcement corrected — `flattenPermissions` does not run inside `makeSubject` as stated; `makeSubject` takes an already-flattened `Iterable<PermissionKey>`, and `flattenPermissions` runs inside the sibling `fromRoles` constructor instead (issue 69, CCR-QD-117)<br>1.32 (2026-09-08): INV-QD-004 extended — projecting a record is stack-safe; `FieldPath.ts`'s `projectAt` recursed once per field-spec segment over an uncapped dot-path and raised a raw `RangeError` out of the enforcement path, and now walks with the explicit array-backed stack `DecodeDepthGuard.ts` and `SinkCodec.ts` already use (issue 66, BEH-QD-056, CCR-QD-115)<br>1.31 (2026-09-07): INV-QD-031 extended — `fieldStrategy` and `HasRelationship.depth` named as the same shape of gap the invariant already covered, `depth` having been dropped from the rendering entirely; INV-QD-029's `RelationshipResolver` denial no longer claims an unverifiable wiring state (issue 45, CCR-QD-114)<br>1.30 (2026-09-07): INV-QD-032 updated — "`neq` on `undefined` is `true`" was the wiring bug's mechanism, not just a description of it; the mechanism itself is now closed at the source, not only the resource-wiring path (CCR-QD-112)<br>1.29 (2026-09-07): INV-QD-048's Enforcement corrected — the test-only `matchesPrismaWhere` reader it named implements the same JS `.every`/`.some` semantics `evaluatePredicate` does, and so could not by itself catch `renderNode` nesting a vacuous identity where Prisma's real engine silently mishandles it (C1, issue 34); a second, engine-accurate reader now checks this invariant too (BEH-QD-239, BEH-QD-242, CCR-QD-111)<br>1.28 (2026-09-06): six in-page anchors repointed from pre-rename heading slugs to the current headings (INV-QD-004, INV-QD-006, INV-QD-007, INV-QD-018, INV-QD-029, plus the sibling references in traceability.md and behaviors/27-devtools-timeline.md); INV-QD-050 gained the Enforcement block and Related line its own text already implied, which the 1.26 edit had displaced onto INV-QD-056's section (CCR-QD-097)<br>1.27 (2026-09-06): INV-QD-054 renamed — `verifyChainIntegrity`/`ChainIntegrityError` read as cryptographic tamper-evidence to a compliance reviewer and are not; renamed to `verifySequenceIntegrity`/`SequenceIntegrityError` and the implication note made explicit about the gap this does not close (CCR-QD-094)<br>1.26 (2026-08-25): INV-QD-056 — a `HasSignature` node never appears in a compiled `Predicate`, one leaf after `HasCustom`'s own; INV-QD-055's Related line updated for ADR-QD-057's harmonization (ADR-QD-057, ADR-QD-058, CCR-QD-089)<br>1.25 (2026-08-25): INV-QD-051–055 — the family of properties `@qadi/audit`'s correctness rests on, formalized: staging non-observability, circuit-breaker atomicity, retention partition, chain-integrity gap detection, and the signature obligation handler's call-once/outcome-match guarantee (ADR-QD-056, CCR-QD-086)<br>1.24 (2026-08-25): INV-QD-003's Source corrected — `Policy`'s recursive type is hand-written first and the schema is type-asserted against it, not derived from a single `Schema.Union` (CCR-QD-084)<br>1.23 (2026-08-25): INV-QD-022 revised — every `DehydratedEntry` field is verified, not just `policy` (CCR-QD-083)<br>1.22 (2026-08-25): INV-QD-049, INV-QD-050 — a custom predicate's own failure and an unrecognised name are errors, never denials; a `HasCustom` node never appears in a compiled `Predicate` (ADR-QD-055, CCR-QD-082)<br>1.21 (2026-08-25): INV-QD-047, INV-QD-048 — the NULL-handling defect manual engine verification found, and how it was fixed and closed against the generators (BEH-QD-244, CCR-QD-081)<br>1.20 (2026-08-25): INV-QD-047, INV-QD-048 — a companion package's compiled SQL/Prisma output agrees with `evaluatePredicate` (ADR-QD-054, CCR-QD-079)<br>1.19 (2026-08-25): INV-QD-004 revised — a field spec may be a dot-path with a `*`/`**` wildcard, `undefined` stays the unchanged top of the lattice (BEH-QD-056, CCR-QD-078)<br>1.18 (2026-08-24): INV-QD-046, instrumentation never changes what a guard renders (CCR-QD-073)<br>1.17 (2026-08-24): INV-QD-045, hydration accounts for every entry (CCR-QD-072)<br>1.16 (2026-07-26): INV-QD-027, the published package (CCR-QD-038)<br>1.15 (2026-07-26): INV-QD-026, the Promise facade (CCR-QD-033)<br>1.14 (2026-07-26): INV-QD-025, the decision cache (CCR-QD-032)<br>1.13 (2026-07-26): INV-QD-024, simplification (CCR-QD-031)<br>1.12 (2026-07-26): INV-QD-023, the lattice bounds (CCR-QD-030)<br>1.11 (2026-07-26): INV-QD-022, hydration is subject-bound (CCR-QD-029)<br>1.10 (2026-07-26): INV-QD-021, explanation totality (CCR-QD-028)<br>1.9 (2026-07-26): INV-QD-020, concurrency; INV-QD-005 scoped to sequential evaluation (CCR-QD-027)<br>1.8 (2026-07-26): INV-QD-019, the order laws (CCR-QD-024)<br>1.7 (2026-07-26): INV-QD-018, predicate agreement (CCR-QD-020)<br>1.6 (2026-07-26): INV-QD-017, rule tables; INV-QD-005 defers to it (CCR-QD-019)<br>1.5 (2026-07-26): INV-QD-016, subject sets (CCR-QD-018)<br>1.4 (2026-07-26): INV-QD-015, label dominance (CCR-QD-017)<br>1.3 (2026-07-26): INV-QD-014, the history port; INV-QD-008 restated as "given the same history" (CCR-QD-016)<br>1.2 (2026-07-26): INV-QD-012 and INV-QD-013, obligations (CCR-QD-015)<br>1.1 (2026-07-26): INV-QD-011, the action dimension (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

Properties that hold for every execution. Each names the mechanism that enforces
it, because an invariant nobody enforces is a wish.

## INV-QD-001: Permission key uniqueness

Two distinct permissions never produce the same runtime lookup key.

**Source**: `packages/core/src/Permission.ts` — `PermissionSchema` constrains
both segments with `/^[^:]+$/`, which rejects empty segments and any segment
containing the reserved separator.

**Implication**: `{resource: "a:b", action: "c"}` cannot be decoded, so it can
never collide with `{resource: "a", action: "b:c"}`. In the predecessor both
formatted to `"a:b:c"` and each silently granted the other.

**Related**: [BEH-QD-002](behaviors/01-permissions.md), [ADR-QD-007](decisions/007-permission-token-representation.md).

---

## INV-QD-002: Role graph acyclicity

The role inheritance graph reachable from any `Role` value is acyclic.

**Source**: `packages/core/src/Role.ts` — `role()` takes parents **by value**, so
a cycle is unconstructible: a role cannot reference one that does not yet exist.
`resolveRoleGraph` is the only entry point where parents are named rather than
referenced, and it detects cycles explicitly.

**Implication**: `flattenPermissions` needs no cycle check and cannot diverge. A
visited set is still required, but only to keep a diamond linear rather than
exponential.

**Related**: [BEH-QD-009](behaviors/02-roles.md), [ADR-QD-015](decisions/015-role-dag-acyclic-by-construction.md).

---

## INV-QD-003: Codec/type identity

The JSON codec and the TypeScript type of a policy cannot disagree.

**Source**: `packages/core/src/Policy.ts` — the type is hand-written first and
the `Schema.Union` of `Schema.TaggedStruct` variants is type-asserted against
it (`Schema.Codec<Policy, PolicyEncoded>`); the JSON codec is then derived
from that schema (`Schema.fromJsonString(Policy)`). That assertion alone is
necessary, not sufficient: assignability checks one direction, so a `Policy`
union variant added without a matching `Schema.TaggedStruct` member would still
satisfy `Schema.Codec<Policy, PolicyEncoded>` (the narrower schema type remains
a subtype of the wider `Policy`). What actually forecloses that gap is the
layered guard system around the union: `Policy.ts`'s `POLICY_TAGS`, derived
from the schema union's own discriminants (ADR-QD-090), and its
`childrenOf`/`fieldsOf`/`policyDepth` dispatchers, each a `Match.tagsExhaustive`
where a missing tag is a compile error; TS2366 in the `_tag` dispatch switches
`evaluateNode` (`Walk.ts`) and `judgeMatcher` (`Matcher.ts`); and the
round-trip property test below. (Corrected by CCR-QD-174: this paragraph named a
tag registry in `Evaluate.ts` that ARCH-02 had already replaced with `POLICY_TAGS`,
and called `mergeFields` a `_tag` switch, which it never was — it dispatched on the
`FieldStrategy` literal union, and is a law table now.)

**Implication**: `fromJson(toJson(p))` is structurally equal to `p` for every
policy. The predecessor maintained three artefacts by hand and they drifted,
silently dropping `fieldStrategy` on encode.

**Enforcement**: a property test over generated policy trees, a unit test
pinning the original defect, and Gherkin scenario `@REQ-QD-008`.

**Related**: [BEH-QD-017](behaviors/03-policy-adt.md), [BEH-QD-058](behaviors/08-serialization.md), [ADR-QD-002](decisions/002-schema-derived-policy-adt.md).

---

## INV-QD-004: Field visibility is a lattice with `undefined` at the top

An absent field set means *all fields*, never *no fields*.

A field spec inside the set is a plain `string`, and may be a dot-path with a
`*`/`**` wildcard terminal. A literal terminal and `**` are containment-
equivalent — both denote the reached value whole, at any depth beneath it —
so the lattice's shape is unchanged by path syntax: two specs that denote the
same set (a bare name and its own `.**`) compare `Equal`, and a spec whose
denoted set is a proper subset of another's is the one an `Intersection`
merge keeps. `*` is the one case where the lattice's own ordering relation
declines to answer: whether a `*` at one depth discloses more or less than a
different spec at another depth depends on the reached value's actual runtime
shape, not on the specs alone, so that comparison is `Incomparable` rather
than guessed (see [BEH-QD-056](behaviors/07-enforcement.md)) — which, under
`Intersection`, means neither survives. `undefined` itself is untouched by
any of this: it is still the one value nothing can compare beneath.

**Source**: `packages/core/src/FieldLattice.ts` (moved from `Decision.ts`, which
re-exports it; ADR-QD-092) — `intersectFields` returns the other operand when
either is `undefined`, and on two specs of one shape keeps the lexicographically
smaller text, so its output does not depend on operand order; `unionFields`
returns `undefined` when either is, since a branch granting everything makes the
union everything; `mergeFields` and the strategy law table say what each
`FieldStrategy` merges to, with a fail-closed row for a value outside the union.
`packages/core/src/FieldPath.ts` — `compareFieldPaths` is what `intersectFields`
consults for two non-`undefined` sets, and `project` is what turns a field-spec
set into an actual projection of a record.

In devtools, an allow's fields are read in one place, `readOutcome`
(`packages/devtools/src/model/Inspect.ts`), which passes `visibleFields` through
unchanged, so `undefined` reaches the Inspector and the Simulator as "every
field" (BEH-QD-430, CCR-QD-409).

**Projecting is stack-safe (CCR-QD-120).** A lattice element is a `string`, and
neither its dot-segment count nor the depth of the record it is projected
against is bounded by anything: `parseFieldPath` splits with no length cap, and
both the spec and the resource arrive from outside — the former inside a
`Policy` that [ADR-QD-002](decisions/002-schema-derived-policy-adt.md) says is
persisted and re-parsed from untrusted JSON, invisible to `MAX_DECODE_DEPTH`,
which bounds a policy's *structural* nesting and never looks inside one long
string. `FieldPath.ts`'s `projectAt` walked that pairing with function-call
recursion, one frame per matching segment, so a crafted spec against a
correspondingly deep resource raised a raw `RangeError` out of the enforcement
path itself — on every field-restricted allow. It now walks with an explicit
array-backed stack, the same conversion `DecodeDepthGuard.ts`'s
`exceedsJsonDepth` and `SinkCodec.ts`'s record walk already carry. The
projection is identical node for node; only the mechanism moved.

**Implication**: intersecting an unrestricted policy with a restricted one yields
the restriction, and a denial projects to `{}`. Treating `undefined` as the empty
set would invert the meaning of every unrestricted policy. And a spec no record
could satisfy costs one decision, not the process:
[INV-QD-006](#inv-qd-006-failure-is-not-denial) keeps a failure from becoming a
denial, and this keeps it from becoming a crash.

**Enforcement**: `packages/core/test/FieldLattice.test.ts` — the lattice's
examples and laws (idempotence, `[]` absorbing, commutativity and associativity
in what `project` discloses, byte-level commutativity and order independence, no
widening), each strategy's law row asserted exactly, and the n-ary `mergeFields`
properties.

**Related**: [BEH-QD-018](behaviors/03-policy-adt.md), [BEH-QD-051](behaviors/07-enforcement.md), [BEH-QD-056](behaviors/07-enforcement.md), [ADR-QD-006](decisions/006-field-strategy-always-encoded.md), [ADR-QD-092](decisions/092-field-strategy-meaning-lives-beside-the-lattice.md), [INV-QD-093](#inv-qd-093-a-merge-discloses-nothing-its-inputs-did-not).

---

## INV-QD-005: Short-circuit preservation

A policy branch that is not evaluated performs no attribute or relationship
lookup.

**Scoped, not universal, since CCR-QD-027**: this holds under the default
sequential evaluation. `EvaluateOptions.concurrency` forfeits it deliberately and
by explicit request — see
[INV-QD-020](#inv-qd-020-concurrency-changes-lookups-never-decisions), which
carries the property that makes forfeiting it safe. The invariant is *scoped*
rather than repealed because a caller who does not ask for concurrency is
unaffected by its existence, and that is the whole safety argument
([ADR-QD-026](decisions/026-concurrent-evaluation.md)).

**Source**: `packages/core/src/Walk.ts` — resolution happens inside the leaf
evaluator, reached only when that leaf is visited. `AllOf` returns at its first
denial and `AnyOf` at its first allow, except under `Union`, which must observe
every child to merge field sets.

**Implication**: `anyOf(cheapRbacCheck, expensiveAttributeCheck)` costs one set
lookup when the first branch allows. The predecessor resolved the entire tree
before evaluating anything.

**`Rules` is governed by
[INV-QD-017](#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden)
instead**, and is not an exception to this one. Where stopping is a property of a
boolean operator here, a rule list stops according to its combining algorithm,
and two of the three cannot stop in the direction that is cheap everywhere else.
Enumerating a third node in this invariant would have made it true only by
listing; the property belongs to the algorithm.

**Enforcement**: tests count resolver invocations rather than measuring time.

**Related**: [BEH-QD-034](behaviors/05-evaluator.md), [BEH-QD-035](behaviors/05-evaluator.md), [ADR-QD-005](decisions/005-lazy-attribute-resolution.md).

---

## INV-QD-006: Failure is not denial

A broken lookup never presents as "not authorized".

**Source**: `packages/core/src/Walk.ts` — resolver failures propagate through
the Effect error channel. `Effect.orDie` is prohibited on evaluation paths, so a
denial and a fault remain distinguishable at every layer, including React's
`PolicyState.error`.

A well-behaved port failing typed is only half of "broken lookup" — a port
that *dies* instead (a throw, a rejected promise, an `Effect.die`) is not an
`Effect.orDie` call, but reaches the same place by omission if nothing catches
it: a bare defect is neither a denial nor a typed failure, and passes straight
through `Effect.retry` unretried. `PortAccess.ts` — every port read either
interpreter makes (`AttributeResolver.resolve`, `DecisionHistory.hasActed`,
`RelationshipResolver.check`, `CustomPredicate.evaluate`,
`SignatureHistory.signaturesFor`) — wraps the call in `catchPortDefect`
(`Effect.catchCause`), converting a defect into that port's own typed error and
leaving an already-typed failure or an interruption unchanged (BEH-QD-261,
BEH-QD-264, issue #100). It holds for `toPredicate` as well as `evaluate`: the
two read their ports through the same module, so there is no second place for the
conversion to be forgotten.

**Implication**: an attribute-store outage surfaces as an incident rather than
sending an engineer to audit permissions — whether the store fails cleanly or
dies, and whether or not a caller wraps `evaluate` in its own `Effect.retry`.

**Enforcement** (devtools): `packages/devtools/src/react/VerdictTreatment.ts` is
the one map from a displayable state to its look, and every panel reads it; Deny
and Error differ there in ink, background, border and label, and a guard's
`Failed` maps to `Error`, never to `Deny` (BEH-QD-429, ARCH-67, CCR-QD-409).
`VerdictTreatment.test.tsx` and `QuestionsPanel.gates.test.tsx` pin it. The
devtools reading of a record keeps a failure tree-less, so it cannot render as
an allow (`readOutcome`, BEH-QD-430).

**Related**: [INV-QD-241](#inv-qd-241-a-remote-port-fails-where-its-store-fails), [BEH-QD-036](behaviors/05-evaluator.md), [BEH-QD-261](behaviors/05-evaluator.md#beh-qd-261-a-defecting-port-fails-typed-not-dead), [BEH-QD-264](behaviors/16-predicates.md#beh-qd-264-a-defecting-port-fails-translation-typed-not-dead), [BEH-QD-066](behaviors/09-react.md), [INV-QD-060](#inv-qd-060-an-enforcement-failure-is-reported-with-the-same-meaning-on-every-route), [INV-QD-243](#inv-qd-243-every-qadihttp-request-path-enforces-and-logs-through-one-module).

---

## INV-QD-007: Defaults fail closed

Every default layer denies rather than grants.

**Source**: `RelationshipResolverNever` returns `"Unknown"`, which matches
neither branch; `CurrentSubjectAnonymous` holds no roles or permissions;
`AttributeResolverNone` resolves to `undefined`, which satisfies no matcher;
`DecisionHistoryUnknown` answers `"Unknown"`, `CustomPredicateNone` `false`, and
`SignatureHistoryNone` no signatures. Each port default is `nonePort` of the port's
description, whose `none` is the one statement of its answer
([ADR-QD-094](decisions/094-a-port-is-described-once.md)).

**Implication**: forgetting to wire a resolver produces denials, which surface
immediately in testing. A default that granted would turn an omission into a
silent breach.

**Enforcement**: `packages/core/test/PortConformance.test.ts` ("default") asserts,
for every port in the registry, that the exported default is named and answers as
the description says and that a shared answer cannot be mutated;
`packages/core/test/Layers.test.ts` covers the non-port defaults.

**Related**: [BEH-QD-043](behaviors/06-services.md), [ADR-QD-010](decisions/010-context-service-and-layers.md), [INV-QD-095](#inv-qd-095-every-port-is-described-once-and-every-derived-layer-agrees-with-its-description).

---

## INV-QD-008: Evaluation is reproducible given the same history

Given the same subject, policy, services **and history**, an evaluation produces
the same decision, identifier and duration.

**Source**: durations come from Effect's `Clock`, identifiers from the
`EvaluationId` service. `scripts/check-house-style.mjs` fails the build on a
line-level, comment/string-stripped match of `Date.now()`, `performance.now()`
or `crypto.randomUUID()` anywhere except `EvaluationId.ts`, which is the one
recorded exemption. That is a drift guard against the ordinary, unobfuscated
form of ambient time/randomness, not a proof the property holds: it is a
regex, not an AST match, so `crypto["randomUUID"]()`, an aliased import, or a
hand-rolled id built from `crypto.getRandomValues` would pass it silently.
Nothing else in the toolchain checks this property.

**The qualifier was added when `DecisionHistory` shipped** and it is a genuine
weakening, recorded rather than absorbed. Before E5 the same inputs produced the
same decision forever; a history port means a second call may legitimately differ
from the first, because the world moved between them. Four model documents
insisted this be restated in the change that landed the port, on the grounds that
left alone it would not become false loudly — it would weaken silently, and
everything citing it would go on citing it.

What is *not* weakened: Qadi still writes nothing. Evaluation reads history and
never records it, so no evaluation changes the answer to the next one. The
non-determinism is entirely the caller's store moving, and under a fixed store —
`decisionHistoryFromEvents`, or the default — reproducibility is exactly what it
was.

**Implication**: traces can be asserted exactly. The predecessor built a trace
feature whose contents no test could predict.

**Related**: [BEH-QD-037](behaviors/05-evaluator.md), [ADR-QD-012](decisions/012-deterministic-time-and-ids.md).

---

## INV-QD-009: Guarded effects do not run when denied

`Qadi.enforce` never starts the effect it wraps unless the policy allows.

**Source**: `packages/core/src/Qadi.ts` — `enforce` is
`Effect.flatMap(admittedOrDenied(policy, options), () => self)`, so `self` is only
constructed into the chain after `Handover.ts`'s `verdictOf` has asked, refused a
denial (failing it as the one `AccessDenied`, built by `accessDenied`) and
discharged. `assert` reaches the same `admittedOrDenied`, and `guard` constructs its
handler's effect but runs it only inside that `flatMap`
([INV-QD-013](#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation)).

**Implication**: guarding a mutation is safe. Discarding a result after the fact
would not be.

**Related**: [BEH-QD-049](behaviors/07-enforcement.md), [ADR-QD-011](decisions/011-enforce-as-aspect.md).

---

## INV-QD-010: Error codes are injective

No two error tags share a numeric code.

**Source**: `packages/core/src/Errors.ts` — `ERROR_CODES` is declared
`satisfies Record<QadiError["_tag"], ...>`, so an error without a code does not
compile, and every code is visible in one table.

**Implication**: log aggregation keyed on the code cannot conflate unrelated
failures, as the predecessor's duplicated `ACL007` did.

**Enforcement**: a test asserts the code set has no duplicates.

**Related**: [ADR-QD-008](decisions/008-error-taxonomy.md).

---

## INV-QD-011: A policy that reads the action cannot be evaluated without one

Reading the action while none was supplied fails; it never denies.

**Source**: `packages/core/src/LeafNeeds.ts` — `absenceOf` is where both
`evaluate` (`Walk.ts`) and `toPredicate` (`Predicate.ts`) learn that `HasAction`
needs the action and that a matcher referencing `action()` needs it, asking
`referencesAction` **before** the matcher runs.

The pre-check is what makes this an invariant rather than a hope.
`evaluateMatcher` is total by design (BEH-QD-028): it cannot fail, so an
unguarded `action()` would resolve to `undefined`, satisfy nothing, and return
`false` — a denial indistinguishable from a real one.

**Implication**: forgetting `{ action }` at a call site produces an incident,
not a quiet refusal. This is [INV-QD-006](#inv-qd-006-failure-is-not-denial)
applied to caller input rather than to a resolver, and it is the opposite of
[INV-QD-007](#inv-qd-007-defaults-fail-closed) on purpose: an unwired resolver
denies because the *system* could not answer, whereas a missing action means the
*caller* never asked a complete question.

**Enforcement**: tests assert `MissingAction` for both paths — the leaf, and a
matcher whose `action()` is nested inside another matcher; `LeafMatrix.test.ts`
asserts it for every leaf tag in both interpreters, and `LeafNeeds.test.ts` for
the table's `absenceOf`.

**Related**: [BEH-QD-076](behaviors/10-actions.md), [BEH-QD-587](behaviors/10-actions.md#beh-qd-587-an-action-absence-that-names-no-action-carries-no-expected-key), [INV-QD-346](#inv-qd-346-a-leafs-own-input-is-checked-before-what-its-matcher-references-the-action-before-the-resource), [ADR-QD-018](decisions/018-action-dimension.md).

---

## INV-QD-012: Obligations are never narrowed

Combining two allowing branches never yields fewer duties than either required.

**Source**: `packages/core/src/Obligation.ts` — `unionObligations` is the only
combinator, and nothing selects an alternative. `FieldStrategy` governs field
sets and is not consulted here.

This is the mirror image of
[INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)
and the asymmetry is deliberate. An absent field set is the *top* of its
lattice, so narrowing discloses less and is safe. An absent obligation set is
the *bottom* of this one, so narrowing lets a caller discharge fewer duties than
an allowing branch demanded — a grant nobody authorised, arrived at by a merge
rule.

**Implication**: there is no strategy to configure. An option whose other
settings are unsafe is not an option.

**Enforcement**: tests assert the union across `AllOf` and `AnyOf`, that a
duplicate collapses and that two duties sharing an `id` do not.

**Related**: [BEH-QD-082](behaviors/11-obligations.md), [ADR-QD-019](decisions/019-obligations.md).

---

## INV-QD-013: Enforcement never proceeds on an undischarged obligation

An entry point that runs work or hands back data refuses an allow whose binding
obligation nobody has met.

**Source**: every entry point that runs work or hands back data (`assert`,
`enforce`, `enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard`,
`filter`, `filterStream`, `filterProjected`, `filterStreamProjected`) reaches
`verdictOf` and `discharge` in `packages/core/src/Handover.ts`. `verdictOf` asks
(`ask`, `Lifecycle.ts`: the decision and the `Question` it answered), then
discharges an allow's obligations. The effect shapes reach it through
`admittedOrDenied` in `Qadi.ts`, which fails a refusal as `AccessDenied`; the
collections reach it through `handOver`, the one per-item step, which turns a refusal
into a void failure so the collection can partition. None of the ten can implement
half the rule, because none of them implements any of it.

`decide` and `check` deliberately implement neither: they run nothing and hand
back nothing, so there is no protected work an undischarged duty could guard.

**Implication**: forgetting `onObligations` produces a failure rather than a
deployment that believes it holds an audit record and does not. `enforce`
returns the guarded effect's value, not the decision, so without this the
obligation would be computed and thrown away in silence.

**Enforcement**: tests assert the refusal for each enforcing entry point, that
the guarded effect never starts, that a handler runs *before* it, and that a
failing handler stops it; `packages/core/test/Handover.test.ts` asserts the refusal
for each of the ten in one table, effect shapes and collection shapes alike.

**Related**: [BEH-QD-085](behaviors/11-obligations.md), [ADR-QD-019](decisions/019-obligations.md).

---

## INV-QD-014: An unwired history port denies both polarities

`hasActed` and `hasNotActed` both deny when no history store is wired.

**Source**: `packages/core/src/DecisionHistory.ts` — the port is three-valued,
and `DecisionHistoryUnknown` answers `"Unknown"`, which satisfies neither.

This is [INV-QD-007](#inv-qd-007-defaults-fail-closed) surviving contact with a
*negative* policy, and a boolean could not have managed it.
`RelationshipResolverNever` fails closed by answering `false` only because
`hasRelationship` has one polarity; a `false`-answering history default would
grant under `hasNotActed`, and a `true`-answering one would grant under
`hasActed`. There is no safe boolean, so there is a third value.

**Implication**: `hasNotActed(e)` is **not** `not(hasActed(e))`. `not` inverts a
decision, so under `"Unknown"` it turns the denial into an allow — from a port
nobody wired. The two are separate `Policy` variants precisely so that the
distinction is held by the schema rather than by a comment.

**Enforcement**: tests assert both polarities deny under the default layer, and
assert directly that `not(hasActed(e))` allows where `hasNotActed(e)` denies.

**Related**: [BEH-QD-090](behaviors/12-history.md), [BEH-QD-091](behaviors/12-history.md), [ADR-QD-020](decisions/020-decision-history-port.md).

---

## INV-QD-015: Incomparable labels deny in both directions

Two labels that neither dominate nor are dominated by each other reach nothing
of the other's.

**Source**: `packages/core/src/SecurityLabel.ts` — `compareLabels` returns
`"Incomparable"` when neither covers the other, and `labelDominates` admits only
`"Equal"` and `"Dominates"`.

**Implication**: `(Secret, {CRYPTO})` and `(Secret, {BIO})` cannot read one
another. This is the property a scalar comparison destroys rather than
approximates: read as numbers both labels are `2`, each reaches the other, and
the answer is *allow* exactly where dominance says *deny*. Shipping that under
the name Bell–LaPadula would be a security defect, not a simplification.

**Why a boolean matcher is nevertheless safe here**, unlike the history port
([INV-QD-014](#inv-qd-014-an-unwired-history-port-denies-both-polarities)): both
directions of the rule are asked by *swapping the operands*, never by negating
the answer, so `Incomparable` collapsing to `false` denies in both. The four
values exist for explanation, not for the decision.

**Enforcement**: tests assert incomparability in both directions at the matcher
level and end to end through a Bell–LaPadula policy, plus a Gherkin scenario
under `@REQ-QD-013`. A mutation that drops the compartment test kills five.

**Related**: [BEH-QD-098](behaviors/13-labels.md), [ADR-QD-021](decisions/021-label-lattice.md).

---

## INV-QD-016: A batch decision is the decision made alone

Evaluating a policy over a set of subjects gives each element exactly the
decision it would have received on its own.

**Source**: `packages/core/src/SubjectSet.ts` — each element is evaluated by
`Effect.provideService(evaluate(…), CurrentSubject, subject)`. The batch holds no
state of its own, so there is no carrier for one subject's answer to reach the
next. A wired `decisionCacheLayer` does memoise across elements, but it keys on the
whole subject and the question
([INV-QD-033](#inv-qd-033-a-cached-decision-belongs-to-the-grants-that-earned-it)),
so two elements share one walk only when they would have received the same
decision, and each still gets its own evaluation id and its own sink record
([INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)).

**Implication**: the attribute resolver's `subjectId` parameter becomes
load-bearing here in a way it was not before. With one subject per environment, a
resolver that ignored that argument was merely redundant; over a batch it hands
one subject another's attributes, and the result is a grant nobody wrote. Qadi
cannot enforce a port implementation, but the signature makes a correct one
writable and this invariant says which one is correct.

**A stronger relative of [INV-QD-008](#inv-qd-008-evaluation-is-reproducible-given-the-same-history)**:
reproducibility says the same inputs give the same answer twice; this says
neighbouring evaluations are not inputs to each other.

**Enforcement**: `SubjectSet.test.ts`'s "under a decision cache and a sink" — two
subjects with one id and different roles each get their own decision, two equal
subjects share one walk yet keep their own evaluation ids, and the sink hears one
decided record per element, in input order. A test evaluates a five-subject batch and compares each element
against the same policy run under `currentSubjectLayer` alone, trace tree
included; another asserts the resolver is asked about the subject in hand. A
mutation evaluating every element as the first subject kills eleven tests, and
dropping the `provideService` does not compile — `SubjectSetServices` excludes
`CurrentSubject`, so the ambient one is unreachable.

**Related**: [BEH-QD-106](behaviors/14-subject-sets.md), [ADR-QD-022](decisions/022-subject-set-evaluation.md), [INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity), [INV-QD-033](#inv-qd-033-a-cached-decision-belongs-to-the-grants-that-earned-it).

---

## INV-QD-017: A rule list stops at the first rule that cannot be overridden

Every combining algorithm has a stated stopping condition, and evaluation
performs no work beyond it.

**Source**: `packages/core/src/Walk.ts` — `evaluateRules` breaks on the first
applying rule under `FirstApplicable`, and on the first applying rule whose
effect is the *decisive* one under the overrides. Nothing else ends the walk.

| Combining | Stops at | Must otherwise |
| --------- | -------- | -------------- |
| `FirstApplicable` | the first applying rule — nothing overrides anything | — |
| `DenyOverrides` | the first applying `Deny` | evaluate every rule to permit |
| `PermitOverrides` | the first applying `Permit` | evaluate every rule to deny |

**Implication**: the overrides **invert the cost profile of the rest of the
library**, where allowing is the cheap outcome. Under `DenyOverrides` a permit is
the expensive answer, because nothing-denied is knowable only by asking
everything. That is the algorithm's meaning rather than an implementation
shortfall, and a caller who wants the cheap profile back writes
`FirstApplicable`, which is the default.

**Why this exists rather than a third clause in
[INV-QD-005](#inv-qd-005-short-circuit-preservation)**: stopping is a property of
a boolean operator there and of the *algorithm* here. Enumerating `Rules` beside
`AllOf` and `AnyOf` would have left INV-QD-005 true by listing, which is how an
invariant stops constraining anything.

**Enforcement**: six tests count resolver invocations across the three
algorithms in both directions, and assert the child count of the trace — a walk
that stopped early has fewer children than the table has rows, so the claim is
made twice by independent means. A mutation running every rule under
`FirstApplicable` kills two; one that stops the overrides at the first applying
rule of either effect kills five.

**Related**: [BEH-QD-115](behaviors/15-rules.md), [ADR-QD-023](decisions/023-combining-algorithms.md).

---

## INV-QD-018: A predicate admits exactly the rows the evaluator allows

For every translatable policy and every row, the compiled predicate and the
evaluator give the same answer.

**Source**: `packages/core/src/Predicate.ts` — `toPredicate` and
`evaluatePredicate`. Nothing structural forces the agreement; the predicate being
**executable** is what makes it checkable, and the check is what holds it.

**Implication**: this is the only invariant in the library asserted by comparing
two independent implementations of the same semantics rather than by inspecting
one. A divergence is an authorisation defect that no round-trip or coverage test
could catch — the predicate would simply return the wrong rows, silently, from a
query Qadi never sees.

**It is also the caller's tool.** A predicate compiled to SQL by the caller has
nothing saying their SQL means what Qadi meant. `evaluatePredicate` is the
reference semantics they differential-test against, so this invariant extends past
the library boundary in a way no other one does.

**Enforcement**: a `FastCheck` property samples 120 generated policies across
twelve generated rows — 1,440 comparisons. Only translatable shapes are
generated, because an untranslatable one has nothing to compare; everything
outside the subset is covered by the failure tests instead
([BEH-QD-123](behaviors/16-predicates.md)).

**Faulty ports are sampled too** ([INV-QD-058](#inv-qd-058-translation-fails-only-as-evaluation-would)):
the same generator's trees run against ports that answer, fail typed, die, or
throw synchronously, with every call logged. Three properties in
`packages/core/test/Predicate.test.ts` — walk equality on resource-free trees,
success-implies-agreement and typed failure on full trees, and a death reading as
a failure — extend the agreement from "on well-behaved ports" to "on any port".

**The generators are the invariant's weak point, and mutation testing proved
it.** A row whose columns are all well-typed never reaches the place two
interpreters diverge. Ten mutations were run against the translator and nine died
immediately; the survivor **coerced** the ordered comparison —
`Number(value) >= Number(against)` instead of requiring both to be numbers. It
survived because every generated `level` was an integer and the one hand-written
non-number case was `"red"`, which is refused by coercion too. A **numeric
string** is the discriminator: a text column holding `"3"` is admitted by
coercion and refused by the matcher. The row generator now produces integers,
numeric strings and `null` for that column, and the property kills the mutant.
Rows missing a column entirely are generated for the same reason: `undefined`
must read identically on both sides.

**The generators were the weak point a second time, on the other operand, and
this one was a live violation rather than a surviving mutant.** `Matcher.ts`'s
`evaluateMatcher` guards its `Gte`/`Lt` **bound** with `Number.isFinite` —
deliberately, because a bound crosses the same untrusted-JSON boundary a policy
does and JSON has no literal `Infinity` but `1e400` decodes to one, so an
unguarded `Infinity` bound dominates every finite attribute value.
`Predicate.ts`'s `compare` implemented the same two operators with the `typeof`
half of that guard and not the `Number.isFinite` half. The consequence was the
worst shape this invariant can take: `toPredicate` on
`hasResourceAttribute("level", gte(-Infinity))` compiled a filter admitting
**every** row with a numeric column, while `evaluate` on the identical policy
denied **every** row — a filter that admits everything is a silent bypass, and
is exactly what [ADR-QD-024](decisions/024-predicate-output.md) warns would make
`toPredicate` worse than not having it. The property could not see it because
its `Gte`/`Lt` generator drew from `integer({min: 0, max: 5})`: the bound was
the one operand it never varied in kind. `compare` now carries the guard, the
generator samples `±Infinity` and `NaN` bounds for `Gte`/`Lt` (and `NaN` for
`Eq`/`Neq`, where the two interpreters already agreed and must keep agreeing),
and the named policy above is pinned as its own test as well, since a seeded
sample is not evidence a reader can check by eye. Both fail without the guard
(issue #65, CCR-QD-120).

**And a third time, on the row operand (2026-10-05, CCR-QD-172).** The
CCR-QD-120 fix guarded the bound and wrote down why the row side needed
nothing: that the two interpreters could not disagree about a non-finite *row*
value. They did: `evaluateMatcher` had guarded the
resolved value since CCR-QD-116, so it denied `Infinity >= 3` while
`evaluatePredicate` admitted it. `toPredicate` on
`hasResourceAttribute("level", gte(3))` admitted an `Infinity` row, and on
`lt(3)` a `-Infinity` row, that `evaluate` denied — the fail-open direction
again. The property could not see it for the reason it missed the bound: the
`level` generator drew integers, numeric strings and `null`, never a non-finite
number. It now draws `±Infinity` and `NaN` too, the failure message spells them
out (plain `JSON.stringify` printed them as `null`), and a named test pins
`gte(3)`, `lt(3)` and their negations on all three values. The structural fix
followed: both interpreters' leaves now read one module, `Compare.ts`, so the
rule cannot be in one and missing from the other
([INV-QD-091](#inv-qd-091-a-primitive-matcher-and-its-predicate-leaf-are-one-function)).

**Related**: [BEH-QD-127](behaviors/16-predicates.md), [ADR-QD-024](decisions/024-predicate-output.md), [ADR-QD-091](decisions/091-comparison-semantics-have-one-owner.md).

---

## INV-QD-019: Dominance is a partial order

`labelDominates` is reflexive, antisymmetric and transitive over every label.

**Source**: `packages/core/src/SecurityLabel.ts` — `compareLabels` composes `>=`
on `level` with containment on `compartments`, and both relations are themselves
partial orders.

**Implication**: this is what makes the ★-property a guarantee rather than a pair
of checks. A subject may read `source` when it dominates it and write `sink` when
`sink` dominates it; information then flows `source → sink`, and confidentiality
requires `sink` to dominate `source`. That conclusion follows **only** if
dominance composes. Bell–LaPadula's security property is therefore not an extra
rule the evaluator enforces — it is a consequence of the order being an order,
and it is the one thing about the model that no example-based test states.

[INV-QD-015](#inv-qd-015-incomparable-labels-deny-in-both-directions) covers
incomparability, which is one law of four. The other three had been asserted only
by example, and both [MOD-QD-027](models/27-bell-lapadula.md) and
[MOD-QD-029](models/29-mls.md) prescribed property tests for them.

**Enforcement**: `FastCheck` properties in `packages/core/test/Matcher.test.ts`
sample labels over four levels and three compartments — small deliberately, since
a wide alphabet makes overlapping-incomparable pairs rare, and those are the pairs
where a law can fail. Antisymmetry is asserted as the **implication** (mutual
dominance forces equal level and equal compartment set), not by comparing a pair
built to be equal. The flow property is stated separately in the terms the model
uses, and each property counts its witnesses and asserts the count, because an
antecedent that never fires makes the assertion vacuous — only about one triple in
sixteen forms a dominance chain.

**What this invariant is, honestly**: regression protection, not a bug found. The
laws hold *structurally*, and no mutation of `covers` or `compareLabels` broke one
without also breaking an example test. The change it guards against is a named
one: MOD-QD-029 asks for `join`, and a configurable lattice or a compartment
hierarchy is exactly where a structurally-emergent transitivity stops being
emergent. An invariant recorded before that change is cheap; recorded after, it
is archaeology.

**Related**: [BEH-QD-102](behaviors/13-labels.md), [ADR-QD-021](decisions/021-label-lattice.md).

---

## INV-QD-020: Concurrency changes lookups, never decisions

For every policy and every request, the `Decision` and its `Trace` are identical
whether or not `EvaluateOptions.concurrency` is supplied — **and so is which error
surfaces**, when the evaluation fails rather than deciding.

**Source**: `packages/core/src/Walk.ts` — the rules that combine child traces
live in one fold per composite (`stepAllOf`/`finishAllOf`, `stepAnyOf`/
`finishAnyOf`, and the `step` closure inside `evaluateRules`). Both paths drive
that same fold in declaration order; the sequential one stops evaluating when a
step yields a verdict, the concurrent one evaluates everything and then stops
*folding* at the same index.

All three composite dispatchers' concurrent branches — `AllOf`, `AnyOf`, and
`Rules`'s condition list — run each child through `Effect.exit` rather than
bare, and fold `Exit`s instead of `Trace`s: the first index that is either an
`Exit.Failure` (re-raised via `Effect.failCause`) or a decisive `Exit.Success`
trace wins, exactly where the sequential walk would have reached it. This
closed a real gap (CCR-QD-152): `Effect.forEach`'s default error mode is
fail-fast, so a later-indexed child failing could abort the whole dispatch
before an earlier-indexed child's already-decisive `Deny`/`Allow` (or, for
`Rules`, its already-decisive applying row) was folded — concurrent evaluation
raising an error where sequential evaluation would have reached a `Decision`
first. Exiting every child means every child still runs (no loss versus what
the concurrent path already evaluated speculatively), while letting the
declaration-order fold — not the scheduler — decide which outcome, decision or
failure, wins.

**Implication**: `Trace.children` is the half a naive implementation gets wrong.
`Effect.forEach` preserves input order, so the verdict would survive while the
trace grew — a concurrent `allOf` recording four children where the sequential one
records two. The trace is public, is what `filter` and the React bindings surface,
and is what a reviewer reads to answer "why". So the concurrent path **discards**
trace nodes for children evaluated after the decisive one: the work was speculative
by construction, and keeping it would make the trace depend on a performance switch.
The same discarding now applies to a failure past the decisive index: an `Exit`
for a child the sequential walk would never have reached is folded, never
inspected, and never surfaced.

**This is structural rather than asserted into place.** There is no second copy of
the decision rules to compare against — unlike
[INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows),
where a predicate has an independent reason to exist as a second interpreter. A
schedule has none, so duplicating the rules and testing agreement was rejected in
favour of sharing them.

**Enforcement**: a `FastCheck` property samples 150 generated trees — composites
under all three field strategies, negation, and rule tables under all three
combining algorithms — and compares the full trace across sequential, bounded and
unbounded evaluation. Plus explicit cases for the three interactions that made this
undesignable earlier: `First` field-set order, the deciding rule selected by index
rather than arrival, and a resolver failure in a branch a sequential walk would
have skipped. A second `FastCheck` property (CCR-QD-152) fault-injects: each
generated tree — composites of `AllOf`, `AnyOf`, `Not`, and `Rules` under all
three combining algorithms — has leaves that independently allow, deny, or
fail, and the property asserts sequential and concurrent evaluation reach the
same `Decision`, or — when either fails — the same error, by declaration-order
index.

**The property needs a vacuity guard, and this is the second time.** Equality of
decisions alone would hold for a `concurrency` option that did nothing at all, so
the property counts the trees where the concurrent run performed *more* lookups
than the sequential one and asserts that count is non-trivial. INV-QD-018 cost this
lesson once; it is cheaper to apply it than to relearn it.

**Related**: [BEH-QD-130](behaviors/17-concurrency.md), [INV-QD-005](#inv-qd-005-short-circuit-preservation), [ADR-QD-026](decisions/026-concurrent-evaluation.md).

---

## INV-QD-021: Every policy explains

`explain` returns a non-empty explanation for every policy, and the explanation
has exactly one node per policy node.

**Source**: `packages/core/src/Explanation.ts` — `explain`, `matcherText` and
`refText` are each a `Match.tagsExhaustive` over their union, so a variant added
without an arm fails to compile. `explain` has no error channel and no services in
its signature. Totality covers the rendering of a policy built in code as well:
a `fieldStrategy` or `combining` outside its closed union is tested for
membership first — `FieldLattice.ts`'s `isFieldStrategy` and `ShortCircuit.ts`'s
`isCombining`, the same own-property lookups the evaluator decides through — and
named verbatim with what it is evaluated as, so the `Match.exhaustive` over the
known values is reached only by a known value (ADR-QD-092 amendment,
CCR-QD-183).

**Implication**: an unexplained node would render as `undefined` inside an
otherwise fluent sentence — the worst failure mode available here, because it reads
as prose and a reviewer would not notice a requirement had gone missing. Totality
is what makes the output safe to put in front of someone making a decision.

**This is the one interpreter with no agreement property**, and that is a real
difference from [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows).
A predicate is a second way of *deciding*, so it can be compared against the
evaluator row by row. An explanation is prose *about* a policy: there is nothing to
compare it to, and no test can establish that a sentence means what a tree says.
So what is asserted instead is the structural correspondence — one explanation node
per policy node — because a composite that silently dropped a child would still
render fluently.

**Not symmetrical with `toPredicate`, deliberately.** That refuses what it cannot
translate ([BEH-QD-123](behaviors/16-predicates.md)); this refuses nothing. A
partial translation returns wrong rows, so refusing is safe; a partial explanation
is an incomplete description, and no description at all is worse.

**Enforcement**: a `FastCheck` property over 200 generated trees asserts every
rendering is non-empty and contains neither `"undefined"` nor `"[object"`. Every
matcher and every value reference has an explicit case, because a missing arm would
render as `undefined` in the middle of a sentence rather than throw. Node counts
are compared directly. `Explanation.test.ts`'s "outside its closed union" block
renders every composite shape — empty, one part, two parts, a rule table — under
an unknown string, each `Object.prototype` key, the empty string and three
non-strings, pins each sentence exactly, and checks each sentence's claim (no
fields; `DenyOverrides`) against a real `evaluate`; `explanation.feature` carries
two of each as scenarios.

**Related**: [BEH-QD-137](behaviors/18-explanation.md), [BEH-QD-141](behaviors/18-explanation.md), [ADR-QD-027](decisions/027-policy-explanation.md).

---

## INV-QD-022: A hydrated decision belongs to the subject that hydrates it

A server-rendered decision is seeded into a client registry only when the payload's
subject id is the hydrating subject's.

**Source**: `packages/react/src/HydrationEngine.ts` — `hydrateWith` (reached through
`Hydration.ts`'s `hydrateDecisions` and the atom set's `hydrate`) returns an empty
seed list on a mismatch, and drops any entry whose shape or policy it cannot
verify: `evaluationId`, `durationMillis`, `visibleFields`, `obligations` and the
`disclosure` are checked against `DehydratedEntryWire` — derived from `@qadi/core`'s
`DecisionWire`, not restated — and `policy` is checked separately against
`PolicySchema`. A `Disclosed` trace must also name the entry's own policy: its
root `policyTag` must equal the decoded `policy._tag`, or the entry is dropped as
`MalformedEntry`. A `Disclosed` trace must also agree with the entry itself: `entryAgrees` asks `@qadi/core`'s `decisionDisagreement` (INV-QD-170), and an entry whose verdict, `visibleFields`, `obligations` or a denial's `reason` is not its trace root's is dropped as `MalformedEntry` too. Every field of the untrusted payload is validated, not just the
one this invariant used to name, and so is the envelope itself. `dehydrateWith`,
reached through `Hydration.ts`'s `dehydrateDecisions`, drops entries whose decision
belongs to a different subject than the payload claims before any entry is
projected, and the projection and the envelope builder are module-private, so no
other path builds a payload (ADR-QD-078, 2026-11-08 amendment).

> **Amended in CCR-QD-435 (ARCH-91).** The entries in `DehydratedEntryWire` are now
> `Schema.TaggedStruct`s over `SeededDecision.ts`'s seed fields, which are
> `DecisionWire`'s minus what the payload withholds: still derived, not restated, and
> the seed reads the same statement ([INV-QD-333](#inv-qd-333-a-seeds-fields-are-the-wires)).

**Implication**: a hydration payload is **authorization state crossing a network**,
and the failure mode is a page cached or reused across users — one subject's allows
seeding another's registry. There is no lookup to catch that: the decision is
already made, and seeding it is asserting it. This is the only place in the library
where a decision enters the system without having been evaluated by it, which is
why it is the only place that needs to check whose decision it is.

**It fails closed by dropping, not by throwing.** A refused payload leaves every
atom `Initial`, so the client asks the question properly and the page flashes —
exactly what would have happened without hydration. Throwing would turn a cache
misconfiguration into a blank page; trusting would turn it into a breach. Dropping
is the only option that degrades to the pre-hydration behaviour.

**Disclosure is the second half.** A `Trace` names every node's tag, its label and
the sentence explaining why it refused, so shipping one describes the policy's
internal structure and which branch this subject failed. It is withheld by default
and disclosed only on request — [INV-QD-007](#inv-qd-007-defaults-fail-closed)'s
reasoning applied to information rather than to decisions.

**Enforcement**: `Hydration.test.ts` seeds one subject's payload into another
subject's registry and asserts the second subject is **denied** — the hydrating
subject deliberately holds no permissions, so a leak would surface as an `Allow`
carrying the other subject's evaluation id. A malformed policy entry, a
subject-mixing payload, and the absence of the denial reason in the serialized
payload are each asserted directly. `HydrationEngine.test.ts` runs a mixed-subject
round trip through `dehydrateWith` and `hydrateWith`: the foreign entry reaches
neither the payload nor a seed.

**Related**: [BEH-QD-146](behaviors/19-hydration.md), [BEH-QD-147](behaviors/19-hydration.md), [ADR-QD-028](decisions/028-decision-hydration.md).

---

## INV-QD-023: Every pair of labels has a least upper and a greatest lower bound

`join(a, b)` dominates both operands and is dominated by everything that dominates
both. `meet(a, b)` is dominated by both and dominates everything both dominate.

**Source**: `packages/core/src/SecurityLabel.ts` — `join` takes the maximum of the
levels and the union of the compartments; `meet` takes the minimum and the
intersection. Both are pure and neither is reachable from the evaluator.

**Implication**: this is what makes the structure a **lattice** rather than merely a
partial order, and it closes a contradiction the specification carried from E4 until
CCR-QD-030. [MOD-QD-029](models/29-mls.md) defines a lattice as "a partial order
with joins"; ADR-QD-021 shipped the order and declined the joins, so by that
document's own definition what shipped was not the thing it was named for. Two of
the seven laws in its Verification table were recorded as *Void — declined* rather
than unmet.

**The security reason it exists, which is not the algebra.** A caller labelling a
document derived from two sources has to compute the join, and the natural mistake —
take the higher level, carry *its* compartments — produces a label the correct one
**dominates**. So the derived object is labelled *lower* than its contents, and a
reader without the missing compartment reads material they have no clearance for
while every comparison in the system behaves correctly. The wrong label is compared
correctly, which is why no other invariant catches it and why a prose warning in a
model document could not.

**It does not move ADR-QD-021's boundary.** Deriving a label is still not a decision:
no policy variant computes one, no matcher constructs one, and `Walk.ts` does not
import either function. If it ever does, the line has been crossed and
[ADR-QD-029](decisions/029-lattice-join-and-meet.md) needs revisiting rather than
extending.

**Enforcement**: `FastCheck` properties over sampled triples assert both bound laws
in both directions, plus the two **absorption** laws — `join(a, meet(a, b)) = a` and
`meet(a, join(a, b)) = a`. Absorption is what distinguishes a lattice from any two
functions that happen to return bounds, and it is the law a compartment hierarchy
would break first. The under-classification mistake is asserted directly: the
correct join strictly dominates the mistaken one, and a reader who may read the
mistaken label may not read the correct one.

**Related**: [BEH-QD-103](behaviors/13-labels.md), [INV-QD-019](#inv-qd-019-dominance-is-a-partial-order), [ADR-QD-029](decisions/029-lattice-join-and-meet.md).

---

## INV-QD-024: Simplification changes the tree and nothing a caller can observe

For every policy and every subject, `simplify(p)` yields the same verdict, the same
`visibleFields` and the same obligations as `p`.

**Source**: `packages/core/src/Simplify.ts` — two rewrites, both conditional:
a single-child composite collapses to its child **only under a known strategy**,
and a composite nested in the same composite flattens **only when the field
strategies match** and, for an empty nested `allOf`, only where that strategy's
empty merge is its unit. Both conditions are `FieldLattice.ts`'s laws
(`singletonIsIdentity`, `emptyIsUnit`), read rather than restated (ADR-QD-092).
Without the second, `allOf([allOf([], { fieldStrategy: "Union" }), x], { fieldStrategy: "Union" })`
— every field — simplified to `x`; without the first, a one-child composite under
a strategy outside the union widened from no fields to its child's (CCR-QD-174).

**Implication**: the guarantee has to be about fields and duties, not only the
verdict. A rewrite that preserved allow-or-deny while changing `visibleFields` would
be a **disclosure** defect, and field visibility is the reason this library exists
([MOD-QD-007](models/07-field-level.md)). Every allow-or-deny test in the suite would
still have passed.

**It deliberately does *not* preserve the trace.** A simplified policy has fewer
nodes, so its trace has fewer nodes; that is what "smaller tree" means. `labeled`
nodes are never removed, so a denial's attribution survives, and nothing in the
library calls `simplify`, so no trace changes unless a caller asks
([ADR-QD-030](decisions/030-policy-simplification.md)).

**The property rejected a rewrite, which is the point of having it.** Double
negation elimination — `not(not(p))` → `p` — was written and is unsound here. `Not`
carries `visibleFields: undefined`, the top of the lattice, and no obligations,
because knowing a policy did *not* hold says nothing about which fields are safe. So
`not(not(hasPermission(read, { fields: ["id"] })))` allows with **every** field where
the inner policy allows with `["id"]`, and `not(not(obliged(audit, p)))` owes
**nothing** where the inner owes `audit`. Both differences run in the safe direction
for the rewrite, and both are differences.

That counterexample needs a policy which *allows* with a restricted field set beneath
two negations, and every intuition says the negations cancel — so it is not something
a hand-written test would have looked for. It is the second time a property has paid
for itself by contradicting something obvious; the first was
[INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows).

**Enforcement**: a `FastCheck` property over 120 generated trees × **four subjects**,
comparing verdict, visible fields and obligations. Four subjects rather than one
because a rewrite sound for a subject who is denied everything says nothing: the
field-strategy trap is invisible unless two branches *allow* with different field
sets. A vacuity guard asserts that more than forty trees actually shrank, since the
property holds trivially for a `simplify` that returns its argument. The generator
carries an arm building a same-strategy composite around an *empty* same-strategy
child, and a second vacuity guard counts the sampled trees holding a `Union`/`First`
`allOf` with such a child — the shape the property missed for want of generating it
(ARCH-12 T9). Idempotence is a second property over 200 trees.

**Related**: [BEH-QD-154](behaviors/20-simplification.md), [BEH-QD-155](behaviors/20-simplification.md), [INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top), [ADR-QD-030](decisions/030-policy-simplification.md).

---

## INV-QD-025: A cache hit differs from a miss only in speed and identity

A cached decision equals an uncached one in verdict, visible fields, obligations and
trace, and carries a **different** `evaluationId`.

**Source**: `packages/core/src/DecisionCache.ts` and `Evaluate.ts` — the cache stores
the `Trace`, and `evaluate` stamps `evaluationId` and `durationMillis` per call on a
hit as well as a miss.

**Implication**: caching the `Decision` whole is the obvious implementation and it
breaks correlation. Two evaluations would share one `evaluationId`, so two log lines,
two spans and two audit records would claim to be the same event — undoing
[ADR-QD-012](decisions/012-deterministic-time-and-ids.md), whose whole purpose is that
an identifier comes from a service so traces can be correlated and tested. So the
identity clause is asserted as an **inequality**: equality there is the defect, not
the guarantee.

**The key is a security boundary, and this is the second time.** The key is
`subjectId + policy + resource + action`. Keyed on the policy alone, a cache serves
one subject's allow to another — the same class of defect as an unbound hydration
payload ([INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it)).
A decision is *about* a subject, so any structure holding decisions holds the subject.
`concurrency` is deliberately **not** in the key: it cannot change the answer
([INV-QD-020](#inv-qd-020-concurrency-changes-lookups-never-decisions)), so including
it would split one entry in two for nothing.

**Freshness is the caller's, and the failure mode is not the key's.** A correct key
prevents the cross-subject leak; only the *lifetime* governs staleness, and Qadi has
no notion of a request boundary. `decisionCacheLayer` is therefore a function
returning a fresh cache, so a call site reads as "make a cache here".

**A silently-ineffective cache is worse than none**, which is why the trap has a test
rather than a note. `Effect.provide` builds a layer per execution, so piping the cache
onto a single `evaluate` yields a fresh empty cache every run: the same lookups, the
same cost, and code that reads as though it were caching.

**Enforcement**: `DecisionCache.test.ts` — the same question twice with and without a
cache, counting resolver calls; a hit compared field by field against its miss with
`evaluationId` asserted **unequal**; two subjects through one cache with a resolver
that answers differently, so a leak surfaces as the second subject being allowed; the
resource and the action each shown to split entries; a denial shown to cache; the
per-evaluation trap asserted directly; and `concurrency` shown not to split an entry.
An interruption is not an answer a hit or a miss can differ by:
[BEH-QD-439](behaviors/21-decision-cache.md#beh-qd-439-a-shared-computation-answers-everyone-still-waiting-and-nobody-else)
holds that an ask that was never interrupted never receives one from a shared
computation every waiter abandoned, and that such a computation caches nothing.
`SharedComputation.test.ts`'s two "abandon" tests pin it with a plain key, and
`DecisionCache.test.ts`'s "issue #64, uninterruptible regime" test pins it through
`evaluate`. A flush is not an answer a hit or a miss can differ by either: a
computation in flight when `clear` ran is superseded by `SharedComputation`'s `reset`,
answers the fibers already waiting and caches nothing
([INV-QD-307](#inv-qd-307-a-superseded-claims-exit-never-settles-and-its-waiters-are-still-answered-exactly-once),
[BEH-QD-491](behaviors/21-decision-cache.md#beh-qd-491-a-stale-answer-never-re-enters-a-cleared-cache)).
`SharedComputation.test.ts`'s "stale-last race", "stale-first race", "two-key race" and
"parked-uninterruptible race" pin it with plain keys, and `DecisionCache.test.ts`'s two
clear-mid-compute tests pin it through `evaluate`.

**Related**: [BEH-QD-162](behaviors/21-decision-cache.md), [BEH-QD-163](behaviors/21-decision-cache.md), [BEH-QD-439](behaviors/21-decision-cache.md), [BEH-QD-491](behaviors/21-decision-cache.md#beh-qd-491-a-stale-answer-never-re-enters-a-cleared-cache), [INV-QD-307](#inv-qd-307-a-superseded-claims-exit-never-settles-and-its-waiters-are-still-answered-exactly-once), [ADR-QD-031](decisions/031-decision-cache.md), [ADR-QD-132](decisions/132-a-shared-computation-is-joinable-only-while-awaited.md).

---

## INV-QD-026: The facade answers what the core answers

For every subject and policy, `@qadi/promise` resolves the value `@qadi/core`
produces, and rejects exactly when the core fails or the caller aborts (a call's
`options.signal`, forwarded to the runtime and never read by the facade).

**Source**: `packages/promise/src/index.ts` — every method is `runPromise` applied to
a core function. There is no branch in the package that decides an authorization
outcome, which is what makes "never a second evaluator" checkable by reading rather
than by trusting.

**Implication**: this is the invariant that stops the predecessor's defect
recurring. It shipped a synchronous `evaluate` beside an `evaluateAsync` that
pre-resolved the whole tree, destroying short-circuiting and leaving the asynchronous
relationship API unreachable — and the second path rotted because nothing exercised
it ([ADR-QD-004](decisions/004-single-effect-evaluator.md)). Two evaluators means two
sets of semantics, and the second is always the one nobody tests.

**A denial resolves; a failure rejects.** That is
[INV-QD-006](#inv-qd-006-failure-is-not-denial) crossing a boundary that invites
breaking it: `try { check() } catch { return false }` is the natural Promise idiom and
it turns an attribute-store outage into a silent lockout. A denial is an *answer*, so
it is a value; a broken lookup is not an answer, so it is a rejection. `assert` is the
deliberate exception, because there the caller has said "proceed only if permitted".

**Enforcement**: a test runs both paths over the same subjects and policies and
compares the boolean **and the whole trace** — the facade must not reshape an answer,
only re-package it. Separately, a failing resolver is asserted to *reject* rather than
resolve `false`, which is the assertion that would catch the idiom above.

**Related**: [BEH-QD-169](behaviors/22-promise-facade.md), [BEH-QD-170](behaviors/22-promise-facade.md), [ADR-QD-032](decisions/032-promise-facade.md).

---

## INV-QD-027: The published package decides what the sources decide

The package a consumer installs answers as the sources do. A permission the subject
holds allows, one it does not holds denies, and both entry points agree — through the
published `exports` map, against the shipped declarations, outside this repository.

**Source**: `tsconfig.build.json` emits every public package, and `pnpm pack` resolves
the workspace-time dependency protocols that `npm pack` copies through verbatim. Both
are conditions on the artifact rather than on the code, which is why neither could be
established by reading it.

**Implication**: the artifact cannot pass while the sources fail, nor the reverse. It
was the reverse that occurred: `@qadi/promise` type-checked, tested and mutation-tested
green for six commits while `pnpm build` emitted nothing for it, because a *different*
project graph — the typecheck one — included the package and left a `lib/` behind that
looked like a build product. Ten gates read the sources and agreed, and the tarball
would have shipped empty.

**Enforcement**: step 14 of `pnpm check`. `scripts/check-package-install.mjs` reads the
build graph, packs each public package with `pnpm`, extracts the tarballs into a sandbox
resolving `effect` and `react` from this workspace, and compiles and runs a TypeScript
consumer against the shipped `.d.ts`. Its first check is static because it is the only
one a stale `lib/` cannot fool. Verified against five deliberate breaks: packing with
`npm`, an `exports` path with no file behind it, a renamed declaration, an
allow-turned-deny in the built evaluator, and the promise package removed from the build
graph *with its stale output left in place*.

**Related**: [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-026](#inv-qd-026-the-facade-answers-what-the-core-answers), [ADR-QD-033](decisions/033-the-packed-artifact-is-the-product.md).

---

## INV-QD-028: A seed never outlives the client's own answer

A server-rendered decision covers only the frames before this client has decided
for itself. Once it has — allow, deny or failure — that answer is what every
consumer reads, and the seed is never read again.

**Source**: `packages/react/src/SeededQuestion.ts`'s `makeSeededQuestion` — the
seed is held in its question's slot and reached through a grant atom
([ADR-QD-149](decisions/149-a-seed-is-held-by-its-question.md)), separate from the
decision, and the atom a consumer reads is a
derivation that consults the seed only while the computed result is `Initial`. `Initial` is the one state meaning
"this client has never answered", so the precedence is a property of the
expression rather than of when an effect settles.

**Implication**: the reverse is what occurred. Seeding the decision atom directly
put the seed under `AtomRegistry`'s `preserveInitialValueOnBuild`, which keeps a
seeded value over the one the node computes. An asynchronous evaluation escaped it
by publishing through `setSelf` on a later turn; a **synchronous** one published by
returning, and was discarded. Every policy needing no resolver evaluates
synchronously, so a subject held a server-issued allow they no longer qualified
for, for the life of the page.

Note the relationship to [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it)
and to [ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md): the
bypassed value was bound to the right subject, and was not `waiting`, so
`currentDecision` returned it and every consumer was correct. **ADR-QD-017 guards
the `waiting` flag; this failure never set it.** An invariant about staleness that
speaks only of the flag does not reach a value that was never marked stale.
The same is true of a failed re-check, whose `previousSuccess` is the last allow
with no flag set; [INV-QD-094](#inv-qd-094-a-decision-being-re-checked-or-that-failed-never-reads-as-a-verdict)
closes that one at the read (ADR-QD-093).

**Enforcement**: `packages/react/test/Hydration.test.ts` seeds an allow for a
policy the subject fails and asserts the read is a denial, both immediately and
after every scheduled turn has run — the shape of assertion the suite previously
had none of, because every test read the registry on the tick it was built and so
could only observe that a seed was *present*. `packages/react/test/SeededQuestion.test.ts`
and `packages/react/test/QadiAtoms.test.ts` (describe `a seeded question, through the atom
set's own runtime`) read the seed while the subject is unknown and drop it once the client
answers, on a real atom runtime.

**Related**: [BEH-QD-151](behaviors/19-hydration.md), [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it), [ADR-QD-039](decisions/039-a-seed-is-not-an-authority.md), [ADR-QD-028](decisions/028-decision-hydration.md).

---

## INV-QD-029: A denial names only what was consulted

A denial's reason never asserts a fact about a store that was not consulted.

**Source**: `packages/core/src/RelationshipResolver.ts` — the port is
three-valued, so `RelationshipResolverNever` answers `"Unknown"` rather than
`"Unrelated"` and `evaluateHasRelationship` has a distinct arm for it.
`packages/core/src/Walk.ts` — `attributeReason` says "has no value" for an
unresolved attribute and "did not match" only for one that was resolved and
compared.

**Implication**: the reverse is what shipped. An unwired relationship resolver
denied with `subject 'u1' has no 'owner' relation to 'doc-1'`, which is a claim
about the contents of a graph that had never been connected. That sentence
reaches an `AccessDenied` handler, a `renderTrace` line and a `Can` fallback, and
it sends the reader to audit their edges when the fix is in their layer wiring.
The unwired state is also the state every ReBAC integration starts in, so this
was the first sentence most readers ever saw.

Note what this invariant does **not** claim. The verdicts are identical either
way — both arms deny, [INV-QD-007](#inv-qd-007-defaults-fail-closed) is untouched,
and no decision anywhere moves. This is an invariant about diagnosis, and it is
worth stating precisely because nothing in a verdict-shaped test could have
caught its violation.

The attribute half is milder and is included for the same reason. `did not match`
is *true* of an unresolved attribute — every matcher fails `undefined` — so
nothing was false there; the diagnosis was merely withheld, and a misconfigured
`AttributeResolver` produces that case exclusively.

> **Corrected.** "`did not match` only for one that was resolved and compared" was
> true of every matcher but one: `Neq` denies exactly when the value **matches**
> the excluded reference (`evaluateMatcher`'s `Neq` arm is `value !==
> resolveRef(...)`, so a `false` there means the two were equal), and for that
> matcher "did not match" claimed the opposite of what happened — not a withheld
> diagnosis, an inverted one. `attributeReason` now takes the matcher and says
> `'<attribute>' matched an excluded value` for `Neq`'s resolved-and-compared
> case; every other matcher's denial is unchanged.

> **Corrected (CCR-QD-114).** The relationship sentence quoted above —
> `"no relationship resolver is wired, so no 'owner' relation to 'doc-1' can be
> confirmed"` — was itself an unverified claim: `RelationshipResolver.ts`'s
> `RelatedResult` doc already documented that a *wired* resolver may answer
> `"Unknown"` too, so a wired-but-uncertain resolver reaching this same arm was
> told it did not exist. This invariant's own rule caught its own violation.
> The sentence is now `"no relationship resolver could confirm the 'owner'
> relation to 'doc-1'"`, which asserts nothing about wiring — see
> [BEH-QD-045](behaviors/06-services.md#beh-qd-045-a-denials-reason-names-only-what-was-consulted).

**Enforcement**: `packages/core/test/Evaluate.test.ts` pins both sentences
against each other — an unwired resolver beside a wired store that looked and
found nothing, an absent attribute beside a present one that compares wrong —
and, separately, a `Neq` denial's sentence against a same-shaped non-`Neq` one,
and a wired resolver that itself answers `"Unknown"` against the unwired
default, to pin that both reach the identical sentence rather than one naming
a wiring state the other cannot have. A single sentence for both cases passes
any test asserting only the verdict, which is how the original gap survived to
be found by reading. `features/features/rebac/relationships.feature` carries
the unwired/wired pair.

**Related**: [BEH-QD-045](behaviors/06-services.md), [BEH-QD-043](behaviors/06-services.md), [ADR-QD-040](decisions/040-an-unwired-port-names-its-absence.md), [ADR-QD-020](decisions/020-decision-history-port.md), [INV-QD-014](#inv-qd-014-an-unwired-history-port-denies-both-polarities).

---

## INV-QD-030: Cache key uniqueness

Two distinct questions never produce the same cache entry.

**Source**: `packages/core/src/Question.ts`, `DecisionCache.ts` — the `Question` is used as
a `HashMap` key directly, with no serialization step. Effect's `Equal`/`Hash`
compare plain objects structurally, nested included, so equality of keys is
equality of questions.

**Implication**: the reverse held, and it was a serving defect rather than a
performance one. `keyOf` was `JSON.stringify`, which maps a `Date` onto its ISO
string, drops `undefined`-valued and function-valued properties, and renders
`NaN` as `null` — so `{d: new Date(0)}` and `{d: "1970-01-01T00:00:00.000Z"}`
were one key for two questions, and the second caller received the first's
verdict.

This is [INV-QD-001](#inv-qd-001-permission-key-uniqueness) one layer down, and
the wording deliberately matches it. A permission key and a cache key are the
same kind of object — a projection used as an identity — and the same rule has
to hold of both.

Note what this repairs rather than adds.
[INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)
says a hit differs from a miss only in speed and identity; under a colliding key
a hit differed in **verdict**, so that invariant was false and is now true. The
function's own doc comment had claimed the opposite property — that stringifying
was the option with "no chance of colliding" — which is why nothing looked.

A second consequence, not the point: two structurally equal resources whose
properties were written in a different order now **hit**. That was previously
documented as a deliberate miss, and it is safe to drop precisely because the
comparison is now real structural equality rather than a stringification that
happens to agree.

**Enforcement**: `packages/core/test/DecisionCache.test.ts` counts resolver
invocations for the two collision shapes — a `Date` beside its ISO string, an
`undefined`-valued property beside an absent one — and asserts two evaluations,
not one.

**Related**: [BEH-QD-167](behaviors/21-decision-cache.md), [INV-QD-001](#inv-qd-001-permission-key-uniqueness), [INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity), [ADR-QD-042](decisions/042-a-projection-is-not-an-identity.md).

---

## INV-QD-031: A rendered explanation denotes exactly one policy

Two policies that are not equivalent never render to the same sentence.

**Source**: `packages/core/src/Explanation.ts` — `renderExplanation` embeds every
child through one `embed` helper, which parenthesises anything that is not
atomic. Only a `Requirement` and the empty `All`/`Any`/`Table` render bare, the
latter because their fixed sentences have no loose end for a following word to
attach to — except an empty `All` whose `fieldStrategy` is outside the closed
union, which carries a trailing clause saying so and is therefore wrapped.
`fieldStrategyClause` and `HasRelationship`'s `explain` arm are the
two places a policy field can affect *what a node says* rather than how it
nests, and both are covered below.

**Implication**: the reverse shipped. `anyOf([a, allOf([b, c])])` and
`allOf([anyOf([a, b]), c])` produced a byte-identical sentence, and they are not
the same policy — the first admits a lone `a`. The rendering is the only thing an
administrative screen shows ([ADR-QD-027](decisions/027-policy-explanation.md)
made it the one place English is assembled), so a reviewer had no way to recover
which policy they were reading.

The same flattening left an obligation ambiguous: `allOf([x, obliged(o, y)])`
read as though the whole policy owed `o`, when only the second branch does.

An `All`/`Any` composite's `fieldStrategy` and a `HasRelationship` policy's
`depth` are the same shape of gap, found later (CCR-QD-114): neither field
reached the sentence at all, so `allOf(parts, { fieldStrategy: "Union" })` and
the same parts under `"Intersection"` — or `hasRelationship("owner")` against
`hasRelationship("owner", { depth: 1 })` — rendered identically though they are
not the same policy. `fieldStrategy` is now named whenever it departs from the
default a bare `allOf`/`anyOf` implies; `depth` is now named whenever the
policy carries one. A `fieldStrategy` or `combining` outside its closed union is
named verbatim, so it never renders like a known value, and two such strings
never render alike (CCR-QD-183). They are equivalent policies anyway — every
value outside the union is evaluated the same fail-closed way.

**The top level is deliberately never wrapped.** Nothing follows it, so there is
nothing to run into, and wrapping it would put brackets around every sentence in
the library for no gain.

**Enforcement**: `packages/core/test/Explanation.test.ts` pins the two policies
above and asserts their renderings differ, one case per embedding position so a
site that reverted to bare joining fails on its own shape, and the atomic cases
in the other direction so parentheses cannot spread to ordinary sentences.
`features/features/explanation/explanation.feature` carries the pair as scenarios.
The same file also pins a non-default `fieldStrategy` and a defined
`HasRelationship.depth` each appearing in the rendering, and two policies
differing only in one of those fields rendering to different sentences.

**Related**: [BEH-QD-137](behaviors/18-explanation.md), [ADR-QD-042](decisions/042-a-projection-is-not-an-identity.md), [ADR-QD-027](decisions/027-policy-explanation.md).

---

## INV-QD-032: A guarded resource is the evaluated resource

The resource `guard` is given is the resource the policy is evaluated against.

**Source**: `packages/core/src/Qadi.ts` — `guard` takes `HandoverOptions`, whose
`resource` is `never`, so a second resource cannot be written; at runtime
`decidedOn(options, resource)` (`Handover.ts`) drops any `resource` an untyped
caller passes and sets the positional one, so the positional resource is the one
evaluated.

**Implication**: the reverse shipped, and it was fail-open rather than
fail-closed. The resource was passed only to the handler; the policy was
evaluated with `options.resource`, which no caller set. An absent resource does
**not** deny — `resolveRef` yields `undefined` for a `ResourceRef` with no
resource, and `neq` on `undefined` is `true` — so a policy written to refuse a
mismatched tenant allowed one, and the handler received an `Authorized<P>`
witness asserting a check that never ran.

`@qadi/http`'s `addGuardedRoute` loads a resource per request and passes it here, so
its central parameter was authorization-inert. The defect survived because that
package's fixture uses a subject-only policy, against which an empty resource and
a correct one are indistinguishable.

A second consequence, now correct: an **empty** resource reaches the evaluator
and denies a resource-scoped policy, where no resource at all fails with
`MissingResource`. That is the difference between a 403 and a 500 in
`@qadi/http`, and `NO_RESOURCE`'s comment had described the former while the code
did the latter.

**Enforcement**: `packages/core/test/Qadi.test.ts` guards a resource that should
be refused and asserts `AccessDenied` with the handler never started, guards one
that should pass so the test cannot succeed by denying everything, pins the empty
resource as a denial rather than an error, and pins
"the guarded resource is the one evaluated, even when an untyped caller passes another";
`packages/core/test/Qadi.tst.ts` pins "guard refuses a second resource in its options";
`packages/core/test/Handover.test.ts` pins "a resource smuggled in at runtime is never the one decided on".

**Update (CCR-QD-112):** "`neq` on `undefined` is `true`" described the
mechanism, not just this one wiring bug — the fix above ensured a resource
reached evaluation, but `Neq` itself still matched an absent operand
anywhere it occurred, ref or value side. That has since been closed at the
source: `Neq` (and `Eq`, for the symmetric both-absent case) now deny on any
absent operand, so the sentence above is historical rather than a
description of current behavior. See [BEH-QD-026](behaviors/04-matchers.md)
and issue [#36](https://github.com/leaderiop/qadi/issues/36).

**Related**: [BEH-QD-055](behaviors/07-enforcement.md), [BEH-QD-551](behaviors/07-enforcement.md#beh-qd-551-an-entry-point-that-hands-over-a-value-refuses-a-second-resource), [ADR-QD-043](decisions/043-a-decision-is-computed-from-its-inputs.md), [ADR-QD-035](decisions/035-witness-guard-primitive.md), [ADR-QD-156](decisions/156-a-handed-over-value-is-decided-through-one-module.md), [INV-QD-006](#inv-qd-006-failure-is-not-denial).

---

## INV-QD-033: A cached decision belongs to the grants that earned it

Two subjects with different grants never share a cache entry, whatever their ids.

**Source**: `packages/core/src/Question.ts` — the `Question` carries the
whole `AuthSubject`, not `subject.id`. `AuthSubject.roles`/`.permissions` are
the built-in JS `Set`, not `effect/HashSet`; `packages/core/src/DecisionCache.ts`'s
`Question` doc comment (verified against the installed `effect` build,
after a prior version of that comment named `HashSet` and asserted the same
property for the wrong reason) records that `Equal`/`Hash` special-case
`self instanceof Set` and fold its elements order-independently, so two
subjects whose grants are equal in content but held in different `Set` objects
still compare equal as cache keys. `DecisionCache.test.ts`'s "equal grants,
different Set identity, still a hit" pins this mechanism.

**Implication**: the key was `subject.id`, and an id is a sound proxy for a
subject only if it determines that subject's grants. It does not.
`@qadi/http`'s `SubjectExtractor` rebuilds an `AuthSubject` per request from a
bearer token, so a scoped token and a full token for one user share an id and
hold different permissions. Under an application-scoped cache — which
`DecisionCache.ts` documents as a supported choice — the first verdict for a
given id won permanently, in both directions: a scoped token receiving a full
token's allow, and a full token receiving a scoped token's denial.

This narrows staleness rather than removing it, and the boundary is the useful
part. A grant revoked in the **subject** changes the key, so the next request
re-evaluates. A grant revoked only in a **store the evaluation consults** — an
attribute value, a relationship edge, a history event — is invisible to the key
and stays cached. Application scope is safe against token downgrade and unsafe
against backend revocation; per-request scope is safe against both.

**Enforcement**: `packages/core/test/DecisionCache.test.ts` runs two tokens for
one id through one application-scoped cache in both orders and asserts each gets
its own verdict; a control asserts that two structurally equal subjects still
hit, so the fix cannot pass by disabling the cache. Verified by falsification —
erasing the grants from the key reproduces `[true, true]` where `[true, false]`
is correct.

**Related**: [BEH-QD-168](behaviors/21-decision-cache.md), [INV-QD-030](#inv-qd-030-cache-key-uniqueness), [ADR-QD-043](decisions/043-a-decision-is-computed-from-its-inputs.md), [ADR-QD-031](decisions/031-decision-cache.md).

---

## INV-QD-034: An endpoint's authorization is declared, not inferred

An HTTP endpoint that declares neither a permission requirement nor an explicit
public marker on itself is refused, and a requirement or marker on a group or an
API is refused too.

**Source**: `packages/http/src/AccessPlan.ts` — `planApi` reads each endpoint's own
annotations once: an endpoint carrying neither `RequiredPermission` nor
`PublicEndpoint` fails `guardApi` (`GuardApi.ts`) with `AccessNotDeclared`, a
group or API carrying either key with `MisplacedAccessDeclaration`, and an
endpoint the middleware is not attached to with `RequirePermissionNotAttached`;
`packages/http/src/RequirePermissionMiddleware.ts` serves only what the plan
holds, so the registry cannot list what the middleware serves as public
(BEH-QD-320, BEH-QD-328).

**Implication**: the reverse shipped, and
[ADR-QD-036](decisions/036-qadi-http-package-shape.md) had **already rejected
it by name** — "annotate-and-forget, where an unannotated route silently passes
through enforcement … Rejected: it inverts this library's fail-closed posture …
by making the *absence* of a permission requirement mean 'unguarded'". The code
implemented the rejected alternative, and a test asserted it was correct. Adding
an endpoint to a guarded group and forgetting one annotation published it, with
no signal at build time, layer-build time, or request time.

This is the only invariant in this document whose violation was **written down
as a rejected design before it was built**. The package had no behaviour
document ([23 — HTTP Enforcement](behaviors/23-http.md) was written after the
audit that found this), so nothing normative sat between the ADR's prose and the
code, and nothing checked that they agreed.

Never a 403 is part of the invariant. A missing declaration is a wiring mistake
in the service, and reporting it as a permissions decision sends an operator to
audit the wrong system — the same reasoning that puts `MissingAction` and
`MissingResource` in the 500 group ([BEH-QD-177](behaviors/23-http.md)). It was a
500 on every request; since ARCH-59 the plan sees it when `guardApi` is built and
the build fails with `AccessNotDeclared`, so no request is answered at all
([ADR-QD-118](decisions/118-guardapi-plans-access-from-the-api-value.md)).

**Enforcement**: `http.test.ts` builds an API with an endpoint declaring neither
and asserts `guardApi`'s build fails with `AccessNotDeclared` naming it, beside
one declared public asserting 204 — so the fix cannot pass by refusing everything;
`GuardApi.test.ts` (the undeclared refusal registers nothing, and the precedence),
`accessPlan.test.ts` (every placement through `guardApi`) and `GuardApi.tst.ts`
for the attachment half.

**Related**: [BEH-QD-174](behaviors/23-http.md), [ADR-QD-036](decisions/036-qadi-http-package-shape.md), [INV-QD-007](#inv-qd-007-defaults-fail-closed).

---

## INV-QD-035: A sink cannot change a decision

An observer of an evaluation cannot alter its outcome. Neither a `DecisionSink`
that fails nor one that raises a defect may change the verdict, the trace, or the
error the caller receives. A failing sink is not representable without a type
escape, the one emitter contains whatever it does, and the failure is reported
once, so the observer's failure is never silent either.

**Source**: `packages/core/src/DecisionSink.ts` — `record` returns
`Effect<void>`, a `never` error channel. `packages/core/src/SinkEmit.ts` — the one
emitter (`sinkEmitter`, used by `evaluate` and by the obligation gate) suspends the
call and wraps it in `Effect.catchCause`, so a defect or a throw is contained too,
and reports each cause it contains once, naming the sink
([INV-QD-337](#inv-qd-337-a-contained-sink-failure-is-reported-exactly-once-per-lost-record-naming-the-sink)).
The report cannot change an outcome
([INV-QD-338](#inv-qd-338-no-report-on-the-sink-path-can-change-an-outcome-or-stop-a-later-fan-out-member)).

**Implication**: enforced twice, because the type closes only part of the gap.
It closes more than expected — `Effect.fail` is not assignable to
`Effect<void>`, so a sink that *reports* failure cannot be written without a type
escape (a predicate that claims `never`) — but a **defect** still is, both as `Effect.die` and as any body that throws inside
`Effect.sync`. That is exactly the subversion
[BEH-QD-175](behaviors/23-http.md) recorded on
`SubjectExtractorShape.extract`, where a `never` channel drove implementors to
`Effect.die` instead. The difference is direction, and it is why `never` is right
here and wrong there: an extractor that cannot reach its store *must* change the
answer; a sink must never be able to.

Containing is not the same as hiding. On the phase base the emitter swallowed every
cause and reported none, so a sink that failed lost its record with no line, and a
`record` that threw before returning an effect made `evaluate` itself die. The
emitter now suspends the call, so the throw is contained, and reports once; and the
shipped sinks keep only the reports that change behaviour or say something else, so
one failure is one line ([ADR-QD-159](decisions/159-the-sink-emitter-reports-what-it-contains.md)).

The `catchCause` at the call site is the **inverse** of the `Effect.orDie` that
[AGENTS.md §4](../AGENTS.md) forbids on evaluation paths, not an instance of it.
`orDie` turns a failure into a defect; this stops a bystander's defect from
becoming an authorization outcome. An observer must never be able to deny.

Nor can the audit sink withhold a decision past its deadline: `AuditDecisionSinkLive`
bounds each of its store calls by `storeCallTimeout`, and a call that reaches it is a
failed attempt ([BEH-QD-379](behaviors/33-audit-pipeline.md#beh-qd-379-a-store-call-is-bounded-by-the-sinks-deadline),
[ADR-QD-126](decisions/126-an-audit-store-call-has-a-deadline.md)). The bound is that
sink's behaviour, not this invariant's: a `DecisionSink` of a caller's own whose
`record` never returns still holds the evaluation, and an adapter that makes itself
uninterruptible is not bounded.

**Enforcement**: `scripts/check-house-style.mjs`'s `sink-read-once` rule refuses a second read of the sink, and `DecisionSink.test.ts`'s all-emit-sites test drives `decide`, `enforce` and an obligation discharge through one dying sink. `packages/core/test/SinkEmitReport.test.ts` drives every cause through `evaluate` and `enforce` and holds the outcome unchanged, and `packages/core/test/ShippedSinkReports.test.ts` holds each shipped sink to one report per failure. `packages/core/test/DecisionSink.test.ts` runs a **throwing**
sink and a **dying** sink against a no-sink baseline and asserts the trace is
identical, and asserts that a sink dying on the *failure* path leaves the
original `EvaluationError` intact rather than replacing it.
`packages/core/test/DecisionSink.tst.ts` pins the half the type carries: a
failing sink is not assignable without a type escape ("a sink that can fail is unrepresentable without a type escape"), a dying one is.

**Related**: [BEH-QD-182](behaviors/24-decision-sink.md), [BEH-QD-566](behaviors/24-decision-sink.md#beh-qd-566-a-sink-that-fails-is-reported-once-for-every-record-it-loses), [BEH-QD-568](behaviors/24-decision-sink.md#beh-qd-568-a-report-cannot-change-an-outcome), [ADR-QD-044](decisions/044-an-optional-decision-sink.md), [ADR-QD-159](decisions/159-the-sink-emitter-reports-what-it-contains.md), [INV-QD-006](#inv-qd-006-failure-is-not-denial).

---

## INV-QD-036: A decision record is complete

A record identifies the policy, resource, action and start time of the
evaluation it describes. No consumer needs a side channel to interpret one.

**Source**: `packages/core/src/DecisionRecord.ts` — `DecisionRecord` carries
`policy`, `resource`, `action`, `at` and `evaluationId` beside the outcome.

**Implication**: a `Decision` alone cannot be interpreted, and the most damaging
gap was the policy. `explain` takes a `Policy`; a `Decision` carries
`trace.policyTag`, a string — so **the explanation of a denial was unreachable
from the denial**, which is the failure this library was rewritten to fix. The
action and resource were `EvaluateOptions` inputs consumed and dropped, so the
question asked could not be reconstructed; the start time was read from `Clock`,
used for one subtraction, and discarded, so records could not be ordered.

`at` comes from `Clock`, never `Date.now()`, so a record is reproducible under
`TestClock` ([ADR-QD-012](decisions/012-deterministic-time-and-ids.md)).

A record deliberately carries **no environment**. Core cannot know whether it
runs in a browser, on a server, or at an edge; the sink implementation stamps it.
A field the evaluator would have to guess at is a field that is wrong somewhere.

**Enforcement**: `packages/core/test/DecisionSink.test.ts` asserts a record's
policy round-trips through `explain`/`renderExplanation` to the same rendering as
the original, and asserts `at` is the `TestClock` start time across two ordered
evaluations.

**Related**: [BEH-QD-181](behaviors/24-decision-sink.md), [BEH-QD-183](behaviors/24-decision-sink.md), [ADR-QD-044](decisions/044-an-optional-decision-sink.md).

## INV-QD-037: A measured depth agrees with the evaluated bound

`policyDepth(p) <= n` holds exactly when `evaluate(p, { maxDepth: n })` does not
raise `PolicyTooDeep` — whichever subject asks and whatever evaluation would
short-circuit past — and the same bound is what `toPredicate` checks first.

**Source**: `packages/core/src/Policy.ts` — `policyDepth` counts a leaf as 0 and
adds one at each recursive position, plus `matcherDepth` for a leaf that carries a
matcher (`HasAttribute`, `HasResourceAttribute`), because `evaluateMatcher`
recurses through it too; `Admission.ts`'s `admit` rejects
`policyDepth(policy) > maxDepth` before any node is visited, and both `walk` and
`toPredicate` admit through it, so the converse direction holds by construction
rather than by coincidence and the two interpreters cannot hold different bounds.

**Corrected in ADR-QD-090.** This invariant used to say "exactly when" while only
the forward direction held: `anyOf([hasRole("editor"), not(not(not(hasRole("x"))))])`
has `policyDepth` 4, yet `evaluate(…, { maxDepth: 1 })` succeeded for an editor,
because `First` short-circuits before descending. "Too deep" depended on who was
asking, and the test that asserted the agreement used only policies with no
short-circuit escape, so it could not see the gap. The depth is now judged on the
policy first.

**Implication**: a second walk of the policy tree is a second interpreter of the
same rule, and this document already treats interpreter disagreement as the
defect worth naming ([INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)). Here
the disagreement has a direction that matters: a depth **under**-reported by one
declares a policy safe that the evaluator then refuses, so a caller bounding
untrusted decoded input would admit exactly the input it meant to reject.

The function exists because `maxDepth` is an evaluation input, not a property of
a policy — nothing recorded how deep a policy actually was, so every caller
needing to know had to write this walk and guess at the convention.

**Enforcement**: `packages/core/test/RolesAndDepth.test.ts` asserts the agreement
against `evaluate` itself, in both directions, over eight shapes including
matcher-bearing leaves: at the reported depth it evaluates, and one below it
raises. A second test does the same over short-circuiting policies
(`anyOf([allowing, deep])`, `allOf([denying, deep])`, a rule table) for subjects
that allow and that deny, at five `maxDepth`s around the depth. A `FastCheck`
property pins a right-leaning spine of arbitrary length. `Evaluate.test.ts` pins
that `PolicyTooDeep` is identical for subjects holding different roles.
`RolesAndDepth.test.ts` also pins the `toPredicate` half: a property over generated
trees (matcher-bearing leaves included) and every `maxDepth` in `undefined, -1, 0,
1, 2, 3, 4, 5, 8, NaN, Infinity, 2.5` asserts that `evaluate` fails `PolicyTooDeep`
exactly when `toPredicate` does, with the same `maxDepth`; a second case pins the
default boundary (`DEFAULT_MAX_DEPTH` admitted, one past it refused, by both) and a
third a too-deep field-restricting tree. `Admission.test.ts` pins `admit` itself,
and `scripts/check-house-style.mjs`'s `admission-once` rule refuses a second
`new PolicyTooDeep(` or `maxDepth` default outside `Admission.ts`, `Walk.ts`'s
per-node guard and `questionOf`.

**Amended in CCR-QD-450 (ADR-QD-172).** `admit(question, rowSource)` now returns the
walk environment, which carries the bound; `walk` admits with `"asked"` and
`toPredicate` with `"row"`, and `evaluateNode` reads `maxDepth` from the environment,
so recursion passes one depth and a depth cannot be passed where the bound belongs
([INV-QD-363](#inv-qd-363-both-interpreters-read-the-environment-admission-built)).
`Admission.test.ts`'s E6 pins that the environment carries the question's bound, and
`WalkEnvironment.tst.ts` that the swap does not compile.

**Related**: [BEH-QD-191](behaviors/25-inspection.md), [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows).

---

## INV-QD-038: Provenance and flattening agree

The permissions `permissionProvenance` reports are exactly the set
`flattenPermissions` returns.

**Source**: `packages/core/src/RoleTraversal.ts` — both are projections of the
one role walk (`traverseRoles`, read through `visitRoles`). It is keyed on object
identity, so a diamond is walked once and the first path wins, and both read the
same visits ([ADR-QD-128](decisions/128-one-walk-of-the-role-graph.md)).

**Implication**: two functions answering one question is the shape this codebase
has already been bitten by, so the agreement is stated rather than assumed. The
consequence of drift is specific: a screen showing "who granted this" built on
provenance would display a different permission set from the one that decides,
and a reviewer comparing them would trust the wrong one.

> **Holds by construction (CCR-QD-406).** Since ADR-QD-128, provenance and
> flattening no longer walk the graph separately. Both read the visits of one
> traversal, so agreement follows from the shared walk, and no second copy of
> the walk is left to drift. The seeded property in
> `packages/core/test/RolesAndDepth.test.ts` (300 random role graphs with
> diamonds and same-named roles) still pins it.

They are kept separate rather than one derived from the other because
`flattenPermissions` runs inside `makeSubject` — once per subject, so per request
on a server — and building a path array per permission there would charge every
caller for what only an explorer wants.

> **Corrected (CCR-QD-117).** `flattenPermissions` does not run inside
> `makeSubject`: `makeSubject` (`packages/core/src/AuthSubject.ts`) takes an
> already-flattened `Iterable<PermissionKey>` and never touches `Role` objects
> or `flattenAll`/`flattenPermissions` at all. `flattenPermissions` runs inside
> `fromRoles`, the sibling constructor that accepts `ReadonlyArray<Role>` —
> once per subject, so per request on a server — which is where the
> per-permission path-array cost this paragraph is explaining would land.

**Enforcement**: `packages/core/test/RolesAndDepth.test.ts` compares the two
sets directly over an inheritance chain, asserts a diamond yields one grant
rather than two, and checks the agreement as a seeded property over random role
graphs (`packages/core/test/RoleGraphArbitrary.ts`).

**Related**: [BEH-QD-192](behaviors/25-inspection.md), [BEH-QD-400](behaviors/25-inspection.md), [ADR-QD-015](decisions/015-role-dag-acyclic-by-construction.md), [ADR-QD-128](decisions/128-one-walk-of-the-role-graph.md).

## INV-QD-039: The timeline is ordered, unique, and independent of arrival

The entries a `Timeline` holds are a function of the *set* of records folded
into it, not of the order they arrived in or how often each was delivered.

**Source**: `packages/devtools/src/model/Timeline.ts` — `ingest` places each
record by a total order over `at`, identifies it by
`(_tag, environment, evaluationId, at)`, and returns the identical timeline for
a repeat. The order is `sinkRecordOrder` in
`packages/core/src/DecisionRecord.ts` — by `at`, an unknown (`NaN`) time after
every known one, two unknowns equal — and it is the **only** rule: `storedRecordOrder`
is that rule over an envelope's record, which is how `mergeSources` sorts a merged
backlog and a decision log presents its own; the timeline orders its rows by the
same rule through `recordOf`, which reads back the record a row was built from.

> **Amended in CCR-QD-181 (ARCH-11).** The order was written twice — devtools'
> `compareByAt` and `Timeline.ts`'s `isAfter` — and agreed only by a comment
> saying so. Both read `storedRecordOrder` now.

> **Amended in CCR-QD-449 (ARCH-105).** The order was `storedRecordOrder` over
> `{ at }`; it is now stated once over a record and read through `Order.mapInput`
> over an envelope or a timeline row.

**Implication**: everything downstream — pairing, filters, both screens — reads
entries and may assume they are ordered, unique and joined, so exactly one
module absorbs a feed that promises none of that. It has to: `EventSource`
reconnects on its own and reads the server's backlog again, so a record arrives
twice; a
merge interleaves two processes' clocks, so records arrive out of order; and an
obligation outcome is emitted after `evaluate` returned, so the two halves of
one story can arrive backwards.

The identity is deliberately **not** the evaluation id alone. A server decision
and its client re-check share one — that is the whole pairing story
([BEH-QD-186](behaviors/24-decision-sink.md)) — and collapsing them would erase
what the tool exists to show.

*Identical* rather than merely equal is load-bearing rather than an
optimisation: `useSyncExternalStore` compares snapshots by identity, so a
rebuilt-but-equal timeline would re-render the panel on every replayed frame.

**Enforcement**: `packages/devtools/test/model/Timeline.test.ts` folds a closed
product of record shapes forward, reversed and twice over, and asserts the same
entries each time; `TimelineStore.test.ts` asserts the identity property
directly; `packages/core/test/DecisionRecord.test.ts` states the order's laws under
both orders, `packages/core/test/StoredEnvelope.test.ts` (O1 to O4) reads it over a
log's snapshot and a stream's backlog, and
`packages/devtools/test/model/StoredOrder.test.ts` (M1, M2, T1 to T3) reads it over
a merged backlog and a timeline's rows.

**Related**: [BEH-QD-205](behaviors/27-devtools-timeline.md), [ADR-QD-047](decisions/047-a-headless-devtools-model.md).

## INV-QD-040: The inspector never claims more than the trace does

Every node the inspector renders as decided has a trace node behind it, and
every node without one renders as unexamined.

**Source**: `packages/devtools/src/model/Inspect.ts` — `inspect` folds
`explain(policy)` against the `Trace` through core's `foldAligned`
([INV-QD-103](#inv-qd-103-a-trace-lines-up-with-its-policys-explanation-position-by-position)),
and a position with no trace node yields `NeverResolved`, recursively.

**Implication**: this is the one place where a *rendering* defect becomes a
security misreading, which is why it is an invariant rather than a style rule.
[INV-QD-005](#inv-qd-005-short-circuit-preservation) says a branch that is never
reached performs no lookup; a reviewer who reads such a node as "denied"
concludes their policy rejected something it never examined, and acts on it.

Two neighbouring cases fall out of the same rule. A `Failed` outcome has no
trace at all, so `inspectEntry` yields **nothing** rather than a tree of
unexamined nodes — an empty requirement tree reads as *no requirements*, which
reads as *allowed*, which is the inversion
[INV-QD-006](#inv-qd-006-failure-is-not-denial) exists to prevent. And a trace
truncated below the root — a hand-built or foreign trace, or a replay baseline
whose trace was not disclosed; no producer here cuts one short, a hydration trace the
server withholds is `Withheld` (ADR-QD-078) — is reported as *not disclosed* rather
than as unexamined, because a composite that short-circuits always evaluates its
first child, so the two shapes are distinguishable and blaming the evaluator for a
disclosure decision would mislead.

The alignment of the explanation with the trace is core's, and sound by
construction rather than by convention: it is stated and enforced as
[INV-QD-103](#inv-qd-103-a-trace-lines-up-with-its-policys-explanation-position-by-position).

**Enforcement**: `packages/devtools/test/model/Inspect.test.ts` drives every
tree from a real `evaluate` rather than a hand-built trace — a hand-built one
would prove only that the zip agrees with what the test author assumed — and
`test/react/DevtoolsDock.test.tsx` asserts the rendered wording.

**Related**: [BEH-QD-208](behaviors/27-devtools-timeline.md), [ADR-QD-027](decisions/027-policy-explanation.md), [INV-QD-103](#inv-qd-103-a-trace-lines-up-with-its-policys-explanation-position-by-position).

## INV-QD-041: A structural view states no verdict

A policy rendered without an evaluation carries no verdict mark, no status and
no reason.

**Source**: `packages/devtools/src/react/PolicyTree.tsx` — one component renders
the requirement tree for both the inspector and the policy explorer, and
`showStatus` is what separates them.

**Implication**: `inspect(policy, undefined)` marks every node `NeverResolved`,
and that value means two different things depending on why the trace is absent.
In the *inspector* it is truthful and load-bearing: the branch was
short-circuited, and saying so is
[INV-QD-040](#inv-qd-040-the-inspector-never-claims-more-than-the-trace-does).
In a screen describing a rule nobody has run, the same value would say a policy
was skipped when it was never evaluated at all — a claim about an evaluation
that did not happen.

So `showStatus` is not a display preference. It is the difference between
reporting an evaluation and describing a rule, and both screens go through one
component precisely so the difference cannot drift into two.

A field restriction is the exception, and deliberately: `hasPermission(read,
{ fields: [...] })` narrows what the *rule* grants, so it belongs in a
structural view. Describing a field-narrowed permission as a bare requirement
overstates the grant, which is the direction of error a reviewer acts on
([INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)).

**Enforcement**: `packages/devtools/test/react/PolicyExplorer.test.tsx` asserts
no `data-status` attribute, no `never resolved` text and none of the three
verdict marks anywhere on the screen; `DevtoolsDock.test.tsx` asserts the same
policy carries a status in the inspector and none in the explorer.

**Related**: [BEH-QD-212](behaviors/28-devtools-screens.md), [ADR-QD-047](decisions/047-a-headless-devtools-model.md).

## INV-QD-042: A simulation reaches no port it was not given, and records nothing

A simulated evaluation resolves every attribute, relationship and history
question through the source it was given, writes no `DecisionRecord`, and
neither reads from nor writes to the application's decision cache — in **all
three** source modes, `Live` included.

**Source**: `packages/devtools/src/model/Simulation.ts` — `simulationLayer` is
`@qadi/core`'s `evaluationEnvironment`
(`packages/core/src/EvaluationEnvironment.ts`) with `shadow: "sinkAndCache"`, plus
the panel's `CurrentSubject`: the five ports from the source, `EvaluationId` with
the `sim` prefix, and the arm's own discarding `DecisionSink` and private
`DecisionCache`, built per build.

**Implication**: the seal is **shadowing, not omission**, and the distinction is
the whole property. `Effect.provide` adds to a context and cannot remove from
one, so providing the five services `evaluate` requires does not stop it finding
an optional one already in scope — and it reads two optionally. Left unshadowed,
a what-if sweep of eight edits writes **eight fabricated decisions into the real
log** and eight entries into the real cache, indistinguishable on screen from
decisions somebody actually asked for. Fabricating audit rows from a debug panel
is a defect rather than a trade-off, which is why the shadowing is unconditional
rather than a mode.

`CurrentSubject` is never taken from a supplied layer even in `Live` mode: the
subject is the thing being simulated, so a layer able to supply one could change
*what is being asked* rather than merely how it is answered. That exclusion lives
in the type — `LiveSource` carries
`Layer<Exclude<EvaluationServices, CurrentSubject | EvaluationId>>` — rather than
in a convention.

The shadowing is now a required choice of one builder, fixed by the simulator, so
it cannot be left out by a caller who assembles the environment itself
([ADR-QD-146](decisions/146-one-evaluation-environment-states-its-shadowing.md)).

**Enforcement**: `packages/devtools/test/model/Simulation.test.ts` runs a
simulation beside a real decision log (`makeDecisionLog`) and asserts the log is
empty, and beside a layer whose every port dies and asserts the simulation still
decides; `SimulationSource.test.ts` repeats both for `Snapshot` and `Live`;
`WhatIf.test.ts` asserts the same of a sweep of more than twenty rows;
`packages/core/test/EvaluationEnvironment.test.ts` calls the installed sink
directly and asserts a private cache per build; and
`packages/devtools/test/model/ReviewSimulationConformance.test.ts` holds the
simulation to the review layer's fixtures.

**Related**: [BEH-QD-219](behaviors/29-devtools-simulator.md), [BEH-QD-503](behaviors/06-services.md#beh-qd-503-a-shadowed-environment-records-nothing-outward-and-caches-privately-per-build), [ADR-QD-050](decisions/050-a-simulation-is-sealed.md), [ADR-QD-146](decisions/146-one-evaluation-environment-states-its-shadowing.md), [INV-QD-311](#inv-qd-311-the-review-layer-never-shadows-the-decision-sink-or-the-decision-cache), [INV-QD-312](#inv-qd-312-every-evaluation-environment-states-its-shadowing-and-the-choice-is-one-of-two).

## INV-QD-043: A snapshot answers what the live layer answered

Replaying a captured set of answers produces the same trace the run that
captured them produced, including its failures.

**Source**: `packages/devtools/src/model/Capture.ts` — `capturing` wraps a layer
and records each `(query → answer)`; `replayLayer` answers from that record. Both
are written once for every port, over `@qadi/core`'s registry: the key is each
port description's `key`, a replayed outage is built by its `failure`, and an
unseen query fails with that same `failure` on every port
([ADR-QD-129](decisions/129-a-replay-miss-is-an-outage-on-every-port.md),
[ADR-QD-094](decisions/094-a-port-is-described-once.md),
[ADR-QD-109](decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md)).

**Implication**: this is an **agreement property** in the family of INV-QD-018
and INV-QD-038 — two paths answering one question — and it drifts the way those
do. Three things keep it from drifting:

A capture records **answers, not calls**. `@qadi/core`'s `recordingPort` records
each request, which answers "was this consulted" and cannot answer "with what".

A captured **failure replays as a failure**. Turning an outage into a miss would
make a snapshot disagree with the run that produced it in exactly the direction
that matters: fail-closed defaults deny, and so a replayed outage would look like
a correctly-denying policy rather than a broken port ([INV-QD-006](#inv-qd-006-failure-is-not-denial)).

The **keys are written once** — in each port's description — and called from both
sides. Two functions deriving one key would make this invariant fail in a way no
single test of either side could see. Every key is **injective over every argument the
port receives**, with `Equal.equals` as its equality ([INV-QD-280](#inv-qd-280-a-request-key-is-equals-text),
ADR-QD-094): the subject, because the subject is the axis a what-if
sweep varies (a capture taken for `alice` must not answer a question asked about
`bob`, nor about `alice` after her `editor` role was dropped), and the relationship
`depth` and the custom predicate's resource, which a traversing resolver and a
resource-reading predicate answer differently. A key that dropped an argument
replayed a stale answer, and the direction was the dangerous one (an allow).

A query the capture never saw is an **outage on every port**: the port's own typed
error, built by its description's `failure`, under a leaf and under `not(leaf)` alike.
It never answers the port's `none`. A `none` denies the leaf that asked and so grants
`not(leaf)`, and a replay must never show an allow the capture cannot back
([INV-QD-007](#inv-qd-007-defaults-fail-closed)). A miss also says nothing about what
the real store would answer: a key may carry what a what-if edited (a signature's
`meaning` and `signerRole`, a custom predicate's subject roles), and the capture is
not re-keyed by fewer arguments to avoid the miss, because a store may answer on any
of them. Before ARCH-65 only `SignatureHistory` failed on a miss (code review WR-04)
and the other four answered `none`, so a sweep outside the captured set could report
an allow under `not(...)`. Decision 17-01 (D-04 = A) closed that for every port, and
the per-port table that chose is gone, so a sixth port fails closed with no edit
([ADR-QD-129](decisions/129-a-replay-miss-is-an-outage-on-every-port.md),
[BEH-QD-411](behaviors/29-devtools-simulator.md#beh-qd-411-a-replay-miss-is-an-outage-on-every-port)).
A request whose key is refused ([BEH-QD-410](behaviors/06-services.md#beh-qd-410-a-request-the-key-refuses-fails-closed))
is never captured: the live run passes it to the live port unrecorded, and a replay
fails it with the port's typed error.

**Enforcement**: `packages/devtools/test/model/Capture.test.ts` captures against
a fixture layer, replays, and asserts `diffTraces` between the two runs is empty;
it asserts a captured failure replays as the same error class with the same
cause. The keys' distinctness — the subject in every key, a relationship keyed by
`(subject, relation, resource, depth)` rather than the relation alone, an "ever, at all"
history question apart from a resource-scoped one, a custom predicate keyed by its
resource and the whole subject — is pinned for every port by
`packages/core/test/PortConformance.test.ts` ("request keys", and the law "a request
key is injective over the request": two requests differing in exactly one field key
differently), and the key law itself, equal keys exactly when `Equal.equals`, is a
property in `packages/core/test/PortKey.test.ts`.
Three capture-fidelity tests in `Capture.test.ts` replay a depth-1 and a depth-3 ask
of one relation, a capture for one resource asked about another, and a what-if that
dropped a role. Five more pin the signature miss: a captured signature answer replays exactly, and an edited `meaning` or `signerRole` and an empty capture are `SignatureHistoryUnavailable` under `hasSignature` and under `not(hasSignature)`. The describe "a replay miss follows one policy per port (ARCH-65, D-04)" runs one row per `PortName`, a leaf and `not(leaf)` each, and asserts the port's typed error; "a request with no key (KEY-03)" pins that an unkeyed request is passed through unrecorded and fails on replay.

**Related**: [BEH-QD-221](behaviors/29-devtools-simulator.md), [ADR-QD-050](decisions/050-a-simulation-is-sealed.md).

## INV-QD-044: A span never carries a resolved attribute's value

`qadi.attribute` records the attribute's **name**, the subject it was asked
about, and whether a value came back. It never records the value.

**Source**: `packages/core/src/AttributeResolver.ts` — `attributeResolverPort.attributes`
(`PortSpan.ts`) is the only statement of what the attribute span says, and its
`disclose` is the only path from a resolved value to a span:
`(value) => ({ resolved: value !== undefined })`, a boolean. `PortAccess.ts`'s
`resolveAttribute` annotates the answer through it, and nothing else in it names
the value.

**Type floor**: every field of every port's span struct is a `SpanValue` — a
string, a number or a boolean (`PortSpanEncode.ts`). `spanStruct({ value:
Schema.optionalKey(Schema.Unknown) }, …)` and an object-valued field are compile
errors (`packages/core/test/PortSpan.tst.ts`), so a future arm cannot annotate a
resolved value without first widening that type.

> **Amended in CCR-QD-467 (ADR-QD-188).** The type floor covers the evaluate family's
> structs too: every field of every struct in `EvaluationSpan.ts` is a `SpanValue`
> (`packages/core/test/EvaluationSpan.tst.ts`, "every field of the family holds only span values").

**Implication**: a span attribute is not a debug print. It reaches whatever
tracing backend the host wired, is retained there on that backend's terms, and
is readable by anyone with access to it — which is a wider and longer-lived
audience than the code that asked for the attribute.

The other four ports are safe to report in full, and the contrast is the whole
reason this invariant names only one of them: `hasActed` and `hasRelationship`
answer with **closed three-valued enums** — `Acted`/`NotActed`/`Unknown` and
`Related`/`Unrelated`/`Unknown` — which disclose no more than a policy tag does,
and `hasCustom`'s answer and `hasSignature`'s `matched` are booleans.
An attribute resolves to arbitrary data: a clearance level, a department, a
security label, a patient identifier. The library cannot know which, so it
records none of them.

This is the line [BEH-QD-147](behaviors/19-hydration.md) already draws in the
other direction — `dehydrateDecisions` withholds a trace by default because it
"names every node's tag, its label and the sentence explaining why it refused".
Same reasoning, same default, opposite boundary.

**`qadi.resolved` is a boolean and not a presence check on the trace**, because
the distinction it draws is one a reviewer acts on: an attribute the store did
not have denies for a different reason than one it had and that compared wrong,
and only the first sends somebody to look at their wiring
([INV-QD-029](#inv-qd-029-a-denial-names-only-what-was-consulted)).

**Enforcement**: `packages/core/test/Evaluate.test.ts` resolves an attribute
whose value is a recognisable sentinel and asserts the sentinel appears in **no**
span the evaluation emitted — every span, not only the attribute's own, because
the question is where a value could leak rather than where it was meant to.
`packages/core/test/Predicate.test.ts` runs the same search under `toPredicate`,
which BEH-QD-267 also covers. `packages/core/test/PortSpan.test.ts` pushes
`fc.anything()` through the attribute port's `disclose` and asserts the encoded
answer is exactly `{ "qadi.resolved": <boolean> }`, and
`packages/devtools/test/model/PortCalls.test.ts` asserts the decoded row carries
no value field (`PortSpan.tst.ts` pins that its type has none).

**Related**: [BEH-QD-227](behaviors/30-port-calls.md), [ADR-QD-051](decisions/051-a-span-says-what-was-asked.md).

## INV-QD-045: No entry leaves hydration unaccounted for

Every entry offered to `dehydrateDecisions` is either counted as dehydrated or
counted as dropped, with a reason. Every entry in a payload handed to
`hydrateDecisions` is either counted as seeded or counted as dropped, with a
reason. A payload refused whole is counted at least once, whatever the reason,
including a payload that carried no entries. Neither function loses one silently,
and neither throws.

**Source**: `packages/react/src/HydrationEngine.ts` — `dehydrateWith` and
`hydrateWith` (reached through `Hydration.ts`'s `dehydrateDecisions` and
`hydrateDecisions`) plan every exit as one closed `HydrationEvent`, and
`packages/react/src/HydrationEvent.ts`'s `emitHydration` is the one writer of the
five metrics: the counts are conservation laws over the two partitions each
function performs, and "at least once" for a refused payload is the
`PayloadRefused` arm of that projection.

> **Restated in CCR-QD-398 (ARCH-60).** The Source named
> `packages/react/src/HydrationCounts.ts`, now deleted, and the statement did not
> say "at least once". Two exits broke it: a zero-entry `PayloadSubjectMismatch`
> counted zero, and `dehydrateDecisions` threw on a policy the schema would not
> encode, leaving the entry neither dehydrated nor counted. That entry is now a
> `LeftOut` event with reason `UnencodablePolicy`.

**Implication**: this is an **availability** invariant rather than a security
one, and it is the only one in this document that is. Nothing here can leak a
decision or grant a subject something they lack; the failure it prevents is a
page that quietly re-decides everything from scratch while every signal says
hydration is working. That failure is invisible by construction — the correct
outcome of a dropped entry is *ask the question properly*, which is also what a
page with nothing to hydrate does.

Hydration had **four** exits by which an entry could be discarded and only one of
them was ever announced ([BEH-QD-230](behaviors/19-hydration.md)). The one that
was is the one somebody went looking for; the other three were found by
enumerating them, which is why this invariant is stated as a conservation law
over the whole partition rather than as a list of the cases known today. A fifth
exit added without a count is a failure of this invariant, not a gap in it.

> **Amended in CCR-QD-156.** The reason set is now seven (`ForeignSubject`,
> `PayloadSubjectMismatch`, `MalformedEntry`, `UndecodablePolicy`, `EntryTooDeep`,
> `UnsupportedPayloadVersion`, `MalformedPayload`): `UnregisteredAtoms` is gone
> because the atom set owns the seeding capability, and two whole-payload reasons
> joined it. And `hydrateDecisions` now **never throws** — a value that is not an
> envelope used to raise a `TypeError` out of a path that promised not to. A
> refused payload is counted at least once, and whenever entries are visible
> `seeded + Σ dropped` equals how many.

> **Amended in CCR-QD-421 (ARCH-78).** The reason set is now nine: a payload nested
> past the decode bound outside its entries is `PayloadTooDeep` (BEH-QD-488), no
> longer `MalformedPayload`. The conservation law is unchanged: `PayloadTooDeep`
> is a whole-payload reason, so it is counted at least once, and whenever entries
> are visible `seeded + Σ dropped` still equals how many.

> **Amended in CCR-QD-430 (ARCH-86).** The nine reasons are now rows of one table in
> `packages/core/src/HydrationMetrics.ts`, each with exactly one kind. `@qadi/react`'s
> whole-payload and per-entry groups are read off it, so the partition this invariant counts
> over cannot hold a client reason that belongs to neither group, and a new entry reason does
> not compile until the engine has a bucket for it. The conservation law is unchanged
> ([ADR-QD-152](decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md),
> [INV-QD-323](#inv-qd-323-each-hydration-drop-reason-has-exactly-one-kind-and-the-kinds-partition-the-reasons)).

> **Amended in CCR-QD-462 (ARCH-117).** The engine's drop events are now derived from
> where each drop is collected: one bucket record per side, built per call, and one
> function that derives its events, and a whole-payload reason has a stated producer. A
> reason with a bucket and no event, the kind of exit this invariant calls a failure, no
> longer compiles. The conservation law is unchanged; its enforcement is restated as
> [INV-QD-385](#inv-qd-385-every-hydration-drop-reason-has-one-stated-source-and-one-reporting-path)
> and the order the events are emitted in is
> [INV-QD-386](#inv-qd-386-each-side-declares-its-drop-event-order-once-and-the-order-is-total)
> ([ADR-QD-183](decisions/183-hydration-drop-events-are-derived-from-their-buckets.md)).

**The two ends are not one sum.** `dehydrated` and `seeded` are process-wide
aggregates over different populations — a server builds payloads for many
clients, a browser seeds payloads it did not build — so the invariant holds
*per call*, and subtracting one total from the other is a comparison
[BEH-QD-232](behaviors/19-hydration.md) explicitly refuses where it would go
negative.

**Enforcement**: `packages/react/test/HydrationEvent.test.ts` pins every arm of
the projection — the exact deltas on all five metrics and the exact hook
argument, a refusal carrying nothing counted as one, and counting before
announcing; `packages/react/test/HydrationEngine.test.ts` — "a refused payload is
always counted" (the zero-entry subject mismatch adds exactly one) and
"dehydrate never throws" (each unencodable policy left out, counted and reported
once); `features/features/hydration-counts/hydration-counts.feature` — "A policy
that cannot cross the network is left out and counted" and "A payload refused for
another subject counts even with no entries";
`packages/react/test/HydrationCounts.test.ts` asserts the
partition for both functions, including that an empty payload lands in neither
bin — a working system must not report a fault on every request that happened to
ask no questions; `HydrationPayload.test.ts` asserts the accounting identity, and
that nothing throws, over arbitrary JSON; `HydrationEngine.test.ts` asserts both
partitions across one round trip through the engine (kept plus `ForeignSubject`
equals offered, seeded equals kept, one report);
`packages/react/test/HydrationDropEvents.test.ts` pins every drop event, its order,
its reporter call and its count, written against the engine before its drops were
collected in records, no existing row of which has had its expected values changed.
[INV-QD-385](#inv-qd-385-every-hydration-drop-reason-has-one-stated-source-and-one-reporting-path)
makes a reason with no bucket, or no named producer, a compile error, and a bucket
with no event unwritable; it does not check that any code drops an entry under a
reason, which the rows of that file show. A refusal of the whole payload is
announced as one, never as zero lost decisions: the same file's "a refused payload
says the payload was refused" test pins the wording, and
`packages/react/test/DeveloperSignals.test.ts` pins every signal's sentence
(`packages/react/src/DeveloperSignals.ts`).

**Related**: [BEH-QD-230](behaviors/19-hydration.md), [BEH-QD-231](behaviors/19-hydration.md), [ADR-QD-052](decisions/052-hydration-is-counted-where-both-ends-can-see-it.md), [ADR-QD-078](decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md), [ADR-QD-183](decisions/183-hydration-drop-events-are-derived-from-their-buckets.md), [INV-QD-385](#inv-qd-385-every-hydration-drop-reason-has-one-stated-source-and-one-reporting-path).

## INV-QD-046: Instrumentation never changes what a guard renders

With `instrument` off, no guard registers and no marker element exists. With it
on, a guard renders the same node it rendered before, wrapped in an element that
generates no box.

**Source**: `packages/react/src/useGate.ts` (`useGates`, where the read and the marker
rule live, and `useGate`) and `components.tsx` — the branching that chooses what to
render is untouched by the flag, and the marker's `display: contents` generates no
layout box.

**Implication**: an observability feature that changed the thing it observes is
worse than no observability, because the reader trusts what it shows. Two
different failures are prevented here and they are not the same one.

**A DOM that changes on upgrade.** Off has to mean *absent*, not inert. A wrapper
rendered unconditionally with a no-op style would still break a consumer's
snapshot tests, their `:first-child` selectors, and any query counting immediate
children — on a version bump, for a feature they never asked for.

**A layout that changes when the panel is opened.** `display: contents` is what
makes the marker affordable at all: it generates no box, so flex and grid
children, margin collapsing and adjacency selectors all behave exactly as they
did. A `<span>` with default styling would reflow a flex row the moment somebody
started debugging it — and the bug would move.

**The flag is not a feature switch on behaviour.** It gates *recording*, never
deciding. `useGates` reads its decision and branches identically either way, and
the hooks below the check run unconditionally, because the rules of hooks do not
bend for a debug feature.

A registry this package did not build (a hand-built `gates` prop) has no writer, so
its guards register nothing and render no marker either: off means absent extends
to it.

**Enforcement**: `packages/react/test/GateRegistry.test.tsx` asserts that an
uninstrumented tree registers nothing and renders no wrapper at all, that a
hand-built `gates` registers nothing and renders no marker, and that an
instrumented marker carries `display: contents`. The stronger evidence is
indirect and worth more: the **127 tests that existed before this feature pass
untouched**, none of them instrumented — and ARCH-06 (ADR-QD-080) left
`hooks.test.tsx`, `edges.test.tsx`, `ServerRender.test.tsx`, `QadiAtoms.test.ts`,
`QadiProvider.test.tsx`, `Hydration.test.ts`, `HydrationCounts.test.ts`,
`v4-reactivity-smoke.test.ts` and the devtools `Lens.test.ts` byte-identical.
ARCH-49 (ADR-QD-111) added `GateWriter.useGates.test.tsx` (one hook over the
provider's writer; uninstrumented, nothing registers and no marker renders) and
`GateWriter.kinds.test.tsx` (every gate kind through that one hook), and left every
pre-existing React test file unedited.

**Related**: [BEH-QD-233](behaviors/28-devtools-screens.md), [BEH-QD-234](behaviors/28-devtools-screens.md), [ADR-QD-053](decisions/053-a-gate-can-be-found.md), [ADR-QD-080](decisions/080-a-gate-registry-belongs-to-its-atom-set.md).

## INV-QD-047: A compiled SQL fragment admits exactly the rows the predicate admits

For every `Predicate` `@qadi/predicate-sql`'s `compileSql` renders, and every
row, interpreting the rendered `SqlFragment` against that row gives the same
answer as `evaluatePredicate` does against the same `Predicate` and row.

**Source**: `packages/predicate-sql/src/index.ts` — `compileSql`, checked
against `@qadi/core`'s `evaluatePredicate`. Nothing structural forces the
agreement; a test-only reader that understands only the fixed grammar this
compiler ever emits is what makes the check possible.

**Implication**: this is [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)
one interpreter further from the `Policy` tree. `toPredicate` already proved
its output means what `evaluate` meant; this invariant proves a caller's SQL
means what that `Predicate` meant, closing the gap ADR-QD-024 left open —
"a caller with only `toPredicate` compiles a predicate to SQL and has nothing
that says their SQL means what Qadi meant." A divergence here is a query that
silently returns rows an authorization decision never admitted.

**Enforcement**: a `FastCheck` property samples 300 generated `Predicate` trees
and compares the row set a **real engine** returns for the compiled fragment with
`evaluatePredicate`'s — PostgreSQL through PGlite and SQLite through `node:sqlite`,
over a 48-row table (`packages/predicate-sql/test/EngineAgreement.test.ts`, S1),
the same differential method `INV-QD-018` uses with the engine in place of an
interpreter. MySQL has no embeddable Node engine, so S2 checks its text is
SQLite's modulo identifier quote characters with identical `params`, and golden
fixture strings pin per-dialect syntax (quoting, placeholder numbering, `IN`
grammar) across all three dialects. The JavaScript reader this section used to
describe (`sqlInterpreter.ts`) is retired: it agreed with the NULL defect and the
`NaN` one below, which only a real engine found (ADR-QD-079).

**The generators shared INV-QD-018's own weak point, in a new place, and
manual verification against real engines is what found it, not the
generators.** `Eq`/`Neq`/`MemberOf` against a `NULL`-valued column diverged
from `evaluatePredicate`: `col = NULL`/`col != NULL` are never true in real
SQL for any row, and a plain `IN`/`NOT IN` silently excludes a NULL-valued
row `evaluatePredicate`'s `===`/`!==` would admit. The property test's own
differential reader re-implements `===`/`!==` in JS, so it agreed with the
original translation rather than catching it — the generators never produced
a `Neq` predicate on a column that could actually be NULL, and even if they
had, the test-only reader had no real SQL NULL semantics to disagree with.
Fixed ([BEH-QD-244](behaviors/31-predicate-compilation.md#beh-qd-244-a-compiled-fragment-handles-null-the-way-evaluatepredicate-does)),
confirmed by hand against real PostgreSQL, MySQL and SQLite, and the
generators and the differential reader both extended so the property covers
it going forward.

**And a third time, on `NaN`, where the differential reader again could not
have helped.** `compileSql`'s `isSafeValue` admitted every `typeof "number"`
value; its only exclusion of `NaN` was a `Gte`/`Lt`-specific guard, so a
`Compare` with op `Eq`/`Neq`, or a `MemberOf`, against `NaN` bound `NaN` as a
real query parameter. PostgreSQL documents `NaN = NaN` as **true**, unlike
IEEE 754 and unlike `evaluatePredicate`'s `===`, which is false for every row.
`interpretSqlFragment` re-derives `===` from the row, so it read the compiled
`"level" = ?` back exactly as `evaluatePredicate` did and the two agreed —
the same blindness the NULL defect above exposed, and the reason the new
property is **structural**: no non-finite value may reach `params` at all,
asserted over whole trees with non-finite operands mixed in at every depth,
and asserted in both directions so it cannot pass by refusing everything.
`@qadi/predicate-prisma`'s sibling `isSafeValue` was already correct and now
carries the matching property too. One caller-visible consequence is
deliberate: a `NaN`-valued `Gte`/`Lt` refuses where it used to render `FALSE`
— see [BEH-QD-238](behaviors/31-predicate-compilation.md#beh-qd-238-an-unsafe-value-refuses-rather-than-binds-blind)
(issue #65, CCR-QD-120).

**And a fourth time, on non-finite rows, which a real engine found again
(CCR-QD-172).** The table had no column that could hold a non-finite value — an
integer column cannot — so the property never sampled one. It now has `score`,
PostgreSQL `double precision` holding `±Infinity` and `NaN` and SQLite `REAL`
holding `±Infinity`, with each engine's reference computed from its own rows
(SQLite stores `NaN` as `NULL`). A plain `"score" >= $1` admitted `Infinity` on
both engines and `NaN` on PostgreSQL, which orders `NaN` above every number, and
`"score" < $1` admitted `-Infinity`. A `Range` now carries a finite guard derived
in core and rendered `(<range> AND col - col = 0)` on postgres and sqlite
([BEH-QD-306](behaviors/31-predicate-compilation.md#beh-qd-306-a-range-never-admits-a-non-finite-row-the-reference-denies));
`EngineAgreement.test.ts` S5 pins the four cases, and S2 compares MySQL's text
with SQLite's modulo that guard.

**Related**: [BEH-QD-238](behaviors/31-predicate-compilation.md#beh-qd-238-an-unsafe-value-refuses-rather-than-binds-blind), [BEH-QD-241](behaviors/31-predicate-compilation.md), [BEH-QD-306](behaviors/31-predicate-compilation.md#beh-qd-306-a-range-never-admits-a-non-finite-row-the-reference-denies), [BEH-QD-244](behaviors/31-predicate-compilation.md#beh-qd-244-a-compiled-fragment-handles-null-the-way-evaluatepredicate-does), [ADR-QD-054](decisions/054-a-companion-package-may-compile-a-dialect.md).

## INV-QD-048: A compiled Prisma `WhereInput` admits exactly the rows the predicate admits

For every `Predicate` `@qadi/predicate-prisma`'s `compilePrismaWhere` renders,
and every row, interpreting the rendered `WhereInput` against that row gives
the same answer as `evaluatePredicate` does against the same `Predicate` and
row.

**Source**: `packages/predicate-prisma/src/index.ts` — `compilePrismaWhere`,
checked against `@qadi/core`'s `evaluatePredicate`.

**Implication**: the same property as [INV-QD-047](#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits),
against the other grammar. Apart from `compilePrismaWhere`'s reserved columns
(Prisma's 13 operator keys, the one `RenderRules` field the two packages set
differently), no `Predicate` shape renders to one target and not the other — the
identifier rule and `maxInValues` are core's and shared — so the two invariants
differ only in which compiler and which engine they check. A stronger guarantee
than SQL's in one respect: there is no serialization step to separately verify,
since `WhereInput` is a plain object rather than text. (This paragraph used to say
no `Predicate` shape renders to one target and not the other, flatly; before
ADR-QD-079 that was false — `first name`, `a.b`, `gte`, `NOT` and a 1001-member
`MemberOf` each compiled in one package and not the other.)

**Enforcement**: the compiled `WhereInput` is run through **Prisma Client 7.10
over an in-memory SQLite database** (`@prisma/adapter-better-sqlite3`) and its row
set compared with `evaluatePredicate`'s over a 48-row table, 300 generated
predicates per property
(`packages/predicate-prisma/test/EngineAgreement.test.ts`): P1 exact agreement
under the true nullability declaration, P2/P3 lie-safety under a wrong one (a
subset, or a loud refusal, never an over-admission), P4 the vacuous-identity
shapes. The JavaScript readers are retired, `matchesPrismaWhereEngine` included,
after a measurement showed the real engine and the goldens kill every mutant it
killed (the identical 107 of 173). The history below describes what came before: a `FastCheck`
property, mirroring INV-QD-047's, using a test-only `matchesPrismaWhere` reader
(now retired) restricted to the `WhereInput` subset this compiler ever emits,
**and** a second FastCheck property over the same generated predicates checked
against `matchesPrismaWhereEngine`
(`packages/predicate-prisma/test/matchesPrismaWhereEngine.ts`), a reader
that models Prisma's real, documented nested-empty-array stripping behavior
rather than `evaluatePredicate`'s own `.every`/`.some` semantics. The first
reader alone cannot enforce this invariant on its own: it shares
`evaluatePredicate`'s semantics, which is exactly the wrong belief a
`renderNode` that nests a vacuous identity inside `AND`/`OR`/`NOT` also
holds — C1 (issue 34) was a real instance of `renderNode` doing so, and the
original single-reader property passed against it the whole time. See
[BEH-QD-239](behaviors/31-predicate-compilation.md#beh-qd-239-an-empty-memberof-is-false-never-in-)
and
[BEH-QD-242](behaviors/31-predicate-compilation.md#beh-qd-242-the-compiled-prisma-whereinput-agrees-with-the-reference-interpreter).

**The same NULL-handling defect INV-QD-047 found existed here too, one
grammar over, and manual verification against a real Prisma client found it
worse than SQL's version.** `{column: {not: value}}` alone excludes a
NULL-valued row `evaluatePredicate`'s `!==` would admit — but Prisma's `in`
filter does not merely mishandle a `null` member the way a bare SQL `IN`
does: it **refuses the query outright** with a client-side validation error,
found by running a compiled `WhereInput` against a real, SQLite-backed
`@prisma/client`. Fixed the same way
([BEH-QD-244](behaviors/31-predicate-compilation.md#beh-qd-244-a-compiled-fragment-handles-null-the-way-evaluatepredicate-does)):
`Neq` against a non-null value ORs in `{column: null}`, and a `null` member
of `MemberOf`'s `values` is split out of `in` into its own `{column: null}`.

**The non-finite-value refusal INV-QD-047 gained is now a property here too,
though this compiler never had the defect.** `isSafeValue` in this package has
excluded `NaN`/`±Infinity` since it was written, but only three hand-written
examples said so. The same structural property `@qadi/predicate-sql` gained —
non-finite operands mixed into the generated trees at every depth, a refusal
required to point at a value that earned it, and no non-finite number allowed
to reach the emitted `WhereInput` — now guards it here, so a future widening
of the allowlist fails in both packages rather than one (issue #65,
CCR-QD-120).

**A third time a test-only reader shared the compiler's belief, and a real
engine found it (CCR-QD-157).** `matchesPrismaWhere` and the first
`matchesPrismaWhereEngine` both read `NOT` as a two-valued `!`, so neither could
see that a plain `{NOT: {level: {gte: 3}}}` renders `WHERE (NOT level >= ?)` and
SQL's `NOT UNKNOWN` is `UNKNOWN`: a NULL-valued row `evaluatePredicate` admits
went missing under every `Negate`. Real Prisma 7.10 over SQLite, 3000 random
predicates against a 48-row table: **127 result-set mismatches, every one under
a `Negate`, and 0 over-admissions** — each mismatch is the engine returning a
strict subset, because Kleene's logic is monotone and the defect fails closed.
The converse hazard is Prisma's own validator, which refuses any filter that
mentions `null` on a required field (153 of 1500 queries). The reader was made
three-valued and made to throw what Prisma's validator throws — and then retired in
favour of the real engine — and `compilePrismaWhere` takes a declared `nullable` set: each leaf
under an odd number of `Negate`s on a nullable column carries `not: null`, and a
required column never mentions `null`. A wrong declaration can only under-admit
or fail loudly, never admit a row the predicate denies.

**A `Float` field can hold an infinity, and Prisma cannot keep one out of a
range (CCR-QD-172).** The fixture model gains `score Float?` holding `±Infinity`.
A plain `{score: {gte: 3}}` returns the `Infinity` rows `evaluatePredicate`
denies, and the bounded filter that would exclude them is unsound — Prisma binds
`lte: Number.MAX_VALUE` as a decimal string SQLite reads back as `Infinity`. So
`compilePrismaWhere` takes a required `floating` declaration and refuses a range
on those columns (`NonFiniteColumn`); P6 pins the refusal, the over-admission an
undeclared `Float` column would cause, and the engine fact behind it.

**Related**: [BEH-QD-238](behaviors/31-predicate-compilation.md#beh-qd-238-an-unsafe-value-refuses-rather-than-binds-blind), [BEH-QD-242](behaviors/31-predicate-compilation.md), [BEH-QD-306](behaviors/31-predicate-compilation.md#beh-qd-306-a-range-never-admits-a-non-finite-row-the-reference-denies), [BEH-QD-244](behaviors/31-predicate-compilation.md#beh-qd-244-a-compiled-fragment-handles-null-the-way-evaluatepredicate-does), [ADR-QD-054](decisions/054-a-companion-package-may-compile-a-dialect.md).

## INV-QD-049: An unregistered custom predicate name is an error, never a denial

A `HasCustom` node whose `name` has no entry in a **populated**
`CustomPredicate` registry fails with `CustomPredicateError`; it never
resolves to `Deny`.

**Source**: `packages/core/src/CustomPredicate.ts` — `customPredicateFromRecord`'s
`evaluate` fails on a table miss rather than answering `false`; `Walk.ts`'s
`HasCustom` case in `evaluateNode` never catches or converts
`CustomPredicateError`.

**Implication**: this is [INV-QD-006](#inv-qd-006-failure-is-not-denial) applied
to a misconfigured registry rather than a broken store. Only the *absence* of
any registry at all — `CustomPredicateNone`, [BEH-QD-246](behaviors/32-custom-predicates.md#beh-qd-246-an-unwired-custompredicate-denies-every-name)
— is a legitimate fail-closed default; a wired registry that does not
recognise a name is, overwhelmingly, a typo in `hasCustom`'s own argument, and
denying it would send whoever reads the decision to audit permissions rather
than the policy that named the wrong string.

**Related**: [BEH-QD-247](behaviors/32-custom-predicates.md#beh-qd-247-a-registered-predicates-own-failure-and-an-unrecognised-name-are-errors--never-denials), [ADR-QD-055](decisions/055-a-named-registered-custom-predicate.md).

## INV-QD-050: A `HasCustom` node never appears in a compiled `Predicate`

`toPredicate` fails `PolicyNotTranslatable` for every `HasCustom` node; no
`Predicate` `@qadi/predicate-sql` or `@qadi/predicate-prisma` ever compiles
contains one, whole or approximated.

**Source**: `packages/core/src/Predicate.ts` — `compile`'s `HasCustom`
arm refuses unconditionally, before any dialect-specific
compiler ever sees the tree.

**Implication**: opaque, externally-registered logic has no
resource-independent expression to fold to. Approximating it — folding to
`True` so a query runs, say — would be exactly the failure mode
[ADR-QD-024](decisions/024-predicate-output.md) refuses: rows a `HasCustom`-guarded
policy would have denied returned anyway. Because the refusal happens in
`toPredicate` itself, `@qadi/predicate-sql` and `@qadi/predicate-prisma` need
no `HasCustom`-specific logic of their own — the node never reaches either
package.

**Enforcement**: `packages/core/test/Predicate.test.ts` asserts
`toPredicate(hasCustom(...))` fails `PolicyNotTranslatable` naming
`"HasCustom"`.

**Related**: [BEH-QD-248](behaviors/32-custom-predicates.md#beh-qd-248-topredicate-refuses-a-hascustom-node), [ADR-QD-024](decisions/024-predicate-output.md), [ADR-QD-055](decisions/055-a-named-registered-custom-predicate.md).

## INV-QD-051: Staging presence or absence never changes the committed audit entries

The same sequence of `SinkRecord`s driven through `AuditDecisionSinkLive`,
with `AuditStagingPort` wired and unwired, produces identical **committed**
`AuditEntry` sequences.

**Source**: `packages/audit/src/AuditDecisionSinkLive.ts` — `stage`/`commit`
calls are best-effort side effects on the path to `AuditTrailPort.write`;
neither call's outcome changes whether `write` is attempted or what is
written.

**Implication**: `AuditStagingPort`'s whole value proposition
([BEH-QD-252](behaviors/33-audit-pipeline.md#beh-qd-252-staging-is-best-effort-and-provably-non-observable-in-the-happy-path))
is additive recoverability, never a second, divergent code path. A caller
who wires staging must never end up with a different — or less reliable —
set of committed rows than one who did not, or staging would be a liability
disguised as a safety net.

**Enforcement**: a `FastCheck` property drives the same generated sequence
of `SinkRecord`s through two configurations of the same pipeline — staging
wired, staging unwired — and asserts the committed `AuditEntry` sequences,
read back from a deterministic `AuditTrailPortTest`, are identical.

**Related**: [BEH-QD-252](behaviors/33-audit-pipeline.md#beh-qd-252-staging-is-best-effort-and-provably-non-observable-in-the-happy-path), [ADR-QD-056](decisions/056-audit-companion-package.md).

## INV-QD-052: Once a circuit breaker trips, `write` is never attempted again until reset

While the breaker built by `makeCircuitBreaker` is `Open`, `record()` never
calls `AuditTrailPort.write` — not even under concurrent `record()` calls
racing to trip or read it.

**Source**: `packages/audit/src/CircuitBreaker.ts` — `run` applies every event
through one `Ref.modify` call, never a separate `Ref.get` followed by a later
`Ref.set`, so two fibers reading the same state before either writes back cannot
lose an update or double-count a transition; `step`, the pure function `run`
applies, holds every rule, including the probe claim and its release. The claim
reads `probeClaimed` and sets it in the same step, so two fibers racing to trial a
half-open breaker cannot both observe it unclaimed and both proceed; the release
reopens the breaker through the same step a failed settle uses. `withPermit`
acquires the claim uninterruptibly and releases it on any non-success exit of the
caller's body, so the claim's lifetime and its guard share one scope. Every state
variant carries a `generation`, incremented on each change of status, and a
permit's outcome is applied only while its generation is current, so a stale
outcome cannot move a newer window.

> **Amended in CCR-QD-436 (ARCH-92).** The Source read: "`packages/audit/src/CircuitBreaker.ts` — the probe protocol is
> module-local behind `withPermit`, and every state transition (`status`'s
> observation, the module-local settle and release steps) is a single
> `Ref.modify` call" — every transition is still one `Ref.modify` call, now made in
> one place.

**Implication**: `Qadi.ts`'s `filter`/`filterStream` evaluate items
concurrently, so concurrent `record()` calls reaching one breaker are the
ordinary shape of a caller batch-authorizing a collection, not a hypothetical
edge case. A non-atomic transition would let the breaker take longer than
`failureThreshold` consecutive failures to trip, silently weakening the
guard it exists to provide.

**Enforcement**: scripted threshold-boundary tests — the exact
`failureThreshold`-th failure trips, `failureThreshold - 1` does not, a
success mid-`half-open` closes, a failure mid-`half-open` reopens — paired
with a concurrency stress test that fires `failureThreshold` `recordFailure`
calls at `"unbounded"` concurrency and asserts both the resulting status and
that `qadi_audit_circuit_breaker_transitions_total{to: "Open"}` counted
exactly one transition, not more; the same with `failureThreshold + 5`
failures, which a failure landing on an already-`Open` breaker used to
over-count; a release-on-interrupt test at the breaker and, through staging, at
the sink; and a model-based property that drives the real breaker and a pure
reference model through generated command sequences and compares status and
transition counts; and, for the transition function alone, the table and the seeded
property in `packages/audit/test/CircuitBreakerTransition.test.ts` and the
transition rows in `packages/audit/test/CircuitBreakerTable.test.ts`.

**Related**: [BEH-QD-251](behaviors/33-audit-pipeline.md#beh-qd-251-a-tripped-circuit-breaker-skips-the-write-not-the-stage-and-its-transitions-are-atomic-under-concurrency), [ADR-QD-056](decisions/056-audit-companion-package.md).

## INV-QD-053: Retained and purged partition entries

For any `entries`, `RetentionPolicy` and `now`, `planRetention(...).retained`
and `planRetention(...).expired` partition `entries`, and so do
`planPurge(entries, policy, now, archive).purge` and `.retain`: their union
recovers `entries`, and their intersection is empty.

**Source**: `packages/audit/src/Retention.ts` — `planRetention` evaluates the
age rule exactly once per entry in a single pass, and `planPurge` splits its
`expired` rows by what the archive holds. (Before ARCH-38 the partition was
`enforceRetention` and `getPurgeableEntries`, both removed.)

**Implication**: retention is a caller-invoked, caller-scheduled surface
entirely outside the `DecisionSink` pipeline
([BEH-QD-253](behaviors/33-audit-pipeline.md#beh-qd-253-retention-partitions-entries-by-construction)).
A partition violated — an entry counted as both retained and purged, or as
neither — would mean either a compliance-relevant row silently vanishing
from both sets, or a row a caller believed purged still being retained.

**Enforcement**: `FastCheck` properties in `packages/audit/test/Retention.test.ts`
over generated timestamp arrays, `maxAgeMs` values and `now` values — each
`at` drawn from finite values, the rows the codec makes, and `maxAgeMs` and `now`
from integers, negative integers, `NaN` and `±Infinity` — asserting the
union/intersection identities hold for every generated case, for
`planRetention` and for `planPurge` against a generated archive. The record
domain behind a finite `at` is the property in
`packages/audit/test/ArchiveRoundTrip.test.ts` ("PROPERTY: over any record, the
codec refuses it or reads it back").

**Related**: [BEH-QD-253](behaviors/33-audit-pipeline.md#beh-qd-253-retention-partitions-entries-by-construction), [INV-QD-130](#inv-qd-130-a-purge-never-selects-a-row-its-archive-does-not-hold), [ADR-QD-056](decisions/056-audit-companion-package.md).

## INV-QD-101: Retention never selects a row without a finite age past a valid limit

For any `entries`, `RetentionPolicy` and `now`, an entry is in
`planRetention(entries, policy, now).expired` (and so in `planPurge`'s `purge`)
only if its `at` and `now` are finite, `policy.maxAgeMs >= 0`, and
`now - at > policy.maxAgeMs`. A row's `at` is finite because only the codec
makes a row ([INV-QD-400](#inv-qd-400-an-audit-row-is-made-only-by-its-codec)),
so the age of every row can be computed, and a `now` or `maxAgeMs` that cannot
make a valid limit is refused, and so is a list holding an entry the codec did not
make (a store client's `any`), as `RetentionInputInvalid` with the refusal `EntryNotMadeByCodec` and its index, and so is `entries` that is
not a list, with `EntriesNotAList`.

**Source**: `packages/audit/src/Retention.ts` — `planRetention` is the one place
the rule is written; `planPurge` runs it. (The older `getPurgeableEntries` and
`enforceRetention` projected it and were removed by ARCH-38.)

**Implication**: before this, `at = -Infinity` (a stored `-1e400`),
`now = +Infinity` and a negative `maxAgeMs` each purged every row they touched,
while `NaN` happened to retain. Retention feeds a deletion routine, so the safe
direction is retain: a wrong retain keeps a row too long, a wrong purge destroys
evidence that may never have been archived
([BEH-QD-253](behaviors/33-audit-pipeline.md#beh-qd-253-retention-partitions-entries-by-construction)).
The inbound wire refuses a non-finite `at`
([BEH-QD-312](behaviors/33-audit-pipeline.md#beh-qd-312-a-stored-row-is-read-back-through-a-guard)),
and `encodeAuditEntry` refuses a record whose `at` is `NaN` or infinite, so a row
the type admits is a row with a finite `at` and retention keeps no second guard
for one ([ADR-QD-190](decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md)).

**Enforcement**: `packages/audit/test/Retention.test.ts` — one example per
impossible `now` and `maxAgeMs`, over both `planRetention` and `planPurge` against
an archive holding every row, and the partition property's "expired implies a
provable age" conjunct, with `at` drawn from finite values (the rows the codec
makes) and `now` and `maxAgeMs` drawn from integers, negatives, `NaN` and
`±Infinity`; `packages/audit/test/ArchiveRoundTrip.test.ts` ("PROPERTY: over any
record, the codec refuses it or reads it back") holds the record domain that
makes `at` finite: a non-finite `at` is refused by `encodeAuditEntry` or by
`decodeAuditEntry`.

**Related**: [BEH-QD-253](behaviors/33-audit-pipeline.md#beh-qd-253-retention-partitions-entries-by-construction), [INV-QD-053](#inv-qd-053-retained-and-purged-partition-entries), [INV-QD-130](#inv-qd-130-a-purge-never-selects-a-row-its-archive-does-not-hold), [ADR-QD-056](decisions/056-audit-companion-package.md).

## INV-QD-054: `verifySequenceIntegrity` detects every gap and duplicate sequence number

For any set of `AuditEntry` rows, `verifySequenceIntegrity` fails
`SequenceIntegrityError` if and only if the rows' defined `sequenceNumber`s,
sorted ascending, contain a gap or a duplicate. A defined `sequenceNumber` is a
safe integer by construction: only `decodeAuditEntry` gives a row a number, and
it refuses any other as `Malformed`
([INV-QD-400](#inv-qd-400-an-audit-row-is-made-only-by-its-codec)), so no input
reaches the check that it cannot judge.

**Source**: `packages/audit/src/ArchiveFacts.ts` — `archiveFacts` sorts the
defined sequence numbers and reports, as `sequenceBreak`, the first that is
not exactly one more than its predecessor. That one check catches a gap (a
jump past the expected value) and a duplicate (the same value twice, which
sorts to *less* than expected). `verifySequenceIntegrity`, defined there and
re-exported through `SequenceIntegrity.ts`, fails on it through
`verifiedArchiveFacts`, the same failure `archiveAuditTrail` raises.
`readAuditArchive` refuses on it as `SequenceBroken`
([ADR-QD-110](decisions/110-an-archives-facts-are-computed-once.md)). The
domain is `Schema.Int`, stated once, in `AuditEntry.ts`, where the codec reads
`sequenceNumber`; `archiveFacts` states no copy of it and
`invalidSequenceNumber` is retired
([ADR-QD-190](decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md)). A
number past `2 ** 53` would let a duplicate pass, because `n + 1 === n` there, and
no row holds one.

**Implication**: sequence numbers are assigned entirely by the caller's own
store, never by `@qadi/audit`
([BEH-QD-254](behaviors/33-audit-pipeline.md#beh-qd-254-sequence-integrity-verification-detects-a-gap-or-a-duplicate-and-trusts-neither-write-order)) —
this is the one check standing between an audit trail a compliance reviewer
can trust and rows quietly missing or overwritten in the caller's own
storage. A false negative here — a real gap that verification misses — is
indistinguishable from tampering nobody caught.

This is gap-and-duplicate detection, not cryptographic tamper-evidence, and
the two are not interchangeable: nothing here hashes an entry or links it to
its neighbor, so an attacker able to modify already-stored rows can renumber
them and pass this check while defeating the property a reader would assume
"integrity" promises. `keyMaterial` on `AuditArchive` is carried, never used
to sign or verify anything — this invariant is the whole of what
`sequenceIntegrityVerified: true` actually attests to.

**Enforcement**: a `FastCheck` property over generated contiguous sequences
(always intact) and generated sequences with one deliberately removed
element (always caught), plus hand-written cases for a duplicate and for a
mix of sequenced and unsequenced entries; `packages/audit/test/ArchiveFacts.test.ts`
(the break cases, read through `archiveFacts`) and
`packages/audit/test/ArchiveRoundTrip.test.ts` (a property that the writer
refuses exactly the inputs the reader reports as `SequenceBroken`, with the
same numbers, over small numbers and the safe-integer bounds, and a property over
the whole `number` domain that `decodeAuditEntry` refuses a number that is not a
safe integer); `packages/audit/test/SequenceIntegrity.test.ts`
(the gap and duplicate cases, and the largest safe integers accepted).

**Related**: [BEH-QD-254](behaviors/33-audit-pipeline.md#beh-qd-254-sequence-integrity-verification-detects-a-gap-or-a-duplicate-and-trusts-neither-write-order), [INV-QD-130](#inv-qd-130-a-purge-never-selects-a-row-its-archive-does-not-hold) (the read-back reuses the check), [ADR-QD-056](decisions/056-audit-companion-package.md), [ADR-QD-110](decisions/110-an-archives-facts-are-computed-once.md).

## INV-QD-055: `signatureObligationHandler` calls `capture` exactly once, and the `ObligationRecord` matches

For one discharge, `signatureObligationHandler(port, meaning)` calls
`port.capture` exactly once, and the `ObligationRecord` outcome
`DecisionSink` observes for that discharge is `Discharged` exactly when that
call succeeded and `HandlerFailed` exactly when it failed. A `capture` that
returns a signature for a different signer or meaning than the request asked for
is a failure of the discharge, not a success.

**Source**: `packages/audit/src/SignatureCapturePort.ts` —
`signatureObligationHandler`'s returned `ObligationHandler` calls `capture`
once per invocation, with a request built (`captureRequestOf`) from the
discharged question (the signer is `question.subject.id`, the key is the
question's resource id) and the whole obligations array rather than once per
obligation, then refuses a returned signature whose `signerId` or `meaning`
differs from the request's; `Qadi.ts`'s `discharge` maps the handler's own
success/failure to the `ObligationRecord` outcome unconditionally.

**Implication**: signature capture is wired through `ObligationHandler`, the
only mechanism this library has for enforcement-time custom logic, never
through `DecisionSink`
([BEH-QD-256](behaviors/33-audit-pipeline.md#beh-qd-256-a-signature-obligation-handler-calls-capture-exactly-once-and-the-discharge-record-matches-its-outcome)).
A handler calling `capture` more than once per discharge would let a
caller's signature service be asked to sign the same duty twice; a
mismatched `ObligationRecord` outcome would report a captured signature as
`HandlerFailed`, or a failed one as `Discharged` — silently misrecording
exactly the event a compliance reviewer reads this log for.

**Enforcement**: unit tests over `signatureObligationHandler` in isolation
(call count, request shape built from a discharge with no `CurrentSubject`,
the signer being the question's subject, failure propagation), the mismatch
tests in `SignatureLedger.test.ts` (a different signer or meaning fails the
discharge and appends nothing), plus integration tests
through `Qadi.assert`'s real `discharge` path asserting the recorded
`ObligationRecord.outcome` for both a successful and a failing `capture`.

**Related**: [BEH-QD-256](behaviors/33-audit-pipeline.md#beh-qd-256-a-signature-obligation-handler-calls-capture-exactly-once-and-the-discharge-record-matches-its-outcome), [ADR-QD-056](decisions/056-audit-companion-package.md), [ADR-QD-057](decisions/057-audit-signature-harmonization.md) (the property is unchanged; only the type `capture`/`validate` operate on moved from `ElectronicSignature` to `@qadi/core`'s `Signature`).

## INV-QD-056: A `HasSignature` node never appears in a compiled `Predicate`

`toPredicate` fails `PolicyNotTranslatable` for every `HasSignature` node; no
`Predicate` `@qadi/predicate-sql` or `@qadi/predicate-prisma` ever compiles
one, and no query built from a compiled predicate can silently omit rows a
policy carrying a signature check would have denied.

**Source**: `packages/core/src/Predicate.ts` — `compile`'s
`Match.tagsExhaustive` refuses `HasSignature` unconditionally, before
touching `SignatureHistory`; the reasoning mirrors `HasRelationship`'s arm
(looked up through an external port, keyed by subject/resource, cannot fold
into a resource-independent expression) rather than `HasCustom`'s (opaque,
externally-registered logic).

**Implication**: a `Policy` reaching for `hasSignature` cannot be pushed down
to SQL/Prisma — the same declared limitation `HasRelationship` and
`HasCustom` already carry, not a new one. Approximating the check instead of
refusing it would be exactly the "approximate rather than refuse" failure
mode [ADR-QD-024](decisions/024-predicate-output.md) rejects, one
interpreter further in.

**Enforcement**: `packages/core/test/Predicate.test.ts` asserts
`toPredicate(hasSignature(...))` fails with `PolicyNotTranslatable` naming
`"HasSignature"`.

**Related**: [ADR-QD-058](decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md), [INV-QD-050](#inv-qd-050-a-hascustom-node-never-appears-in-a-compiled-predicate) (the same property, one leaf earlier).

## INV-QD-057: `hasSignature` consults no clock

`evaluateHasSignature`'s match never depends on the current time, `signedAt`,
or how long ago a signature was made. A signature made a year ago matches a
`hasSignature` leaf exactly as well as one made a second ago; advancing the
clock between two otherwise-identical evaluations never changes the verdict
or the trace.

**Source**: `packages/core/src/SignatureMatch.ts` — `signatureMatches`, which
`signatureAnswerOf` reads for both `askSignature` (`PortAccess.ts`) and
`signatureAnswerFromSignatures` (`SignatureHistory.ts`), tests only `s.meaning`
and, when the leaf names one, `s.signerRole`; it never reads `s.signedAt` or
`Clock`. `Signature.ts`'s own doc comment on `signedAt` states the same
limitation at the type's definition.

**Implication**: `hasSignature` is trust-on-presence, with no expiry or
freshness concept (LL-04). An approval signed under a since-revoked
delegation continues to satisfy `hasSignature("approved")` indefinitely;
revocation-by-time is not a recipe this library gives a deployment — freshness
must be enforced before a signature reaches `SignatureHistory`, or rejected at
capture time, if a deployment's domain requires periodic requalification
(ADR-QD-058 rejected a built-in expiry window as reintroducing the
live-crypto-verification concept that decision explicitly ruled out).
Numbered here, rather than left as prose only, so a future change that adds a
freshness comparison must renumber or retire this invariant loudly instead of
silently changing every deployment's behavior.

**Enforcement**: `packages/core/test/Evaluate.test.ts`'s "HasSignature never
compares signedAt to the clock" test evaluates the identical `hasSignature`
leaf against the identical on-file signature before and after advancing
`TestClock` by ten years, and asserts the verdict and trace are identical.

**Related**: [ADR-QD-058](decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md), [INV-QD-056](#inv-qd-056-a-hassignature-node-never-appears-in-a-compiled-predicate).

---

## INV-QD-058: Translation fails only as evaluation would

For every translatable policy *P* and every behaviour of the ports it reads: (1)
`toPredicate(P)` never ends in a defect; (2) if *P* references no resource,
`toPredicate(P)` and `evaluate(P)` make the same port calls in the same order and
end in the same outcome; (3) if `toPredicate(P)` succeeds, `evaluate(P, {
resource: R })` succeeds for every row *R* and agrees with `evaluatePredicate`.

**Source**: `packages/core/src/PortAccess.ts` — every port read either interpreter
makes goes through it, so a defecting port is converted into its typed error once
(`catchPortDefect`); `packages/core/src/ShortCircuit.ts` — the rules for which
child settles a composite, read by both interpreters; and `Predicate.ts`'s
`compile`/`run` split — refusals are decided from the tree alone before anything
runs, and `run` stops where `evaluate` stops.

**Implication**: INV-QD-018 says the two interpreters give the same *answer* when
every port behaves. This says they fail the same way when one does, and ask the
same stores. Without it a caller's `Effect.retry` around `toPredicate` could not
see a crashing adapter, and a policy decided by a role could still fail because of
a store the evaluator would never have consulted. Both divergences were fail-closed
— an error, never a widening — but they were liveness divergences, and an extra
port call [INV-QD-005](#inv-qd-005-short-circuit-preservation) forbids in the
evaluator.

**Enforcement**: three properties in `packages/core/test/Predicate.test.ts`, over a
port generator that answers, fails typed, dies, or throws synchronously, with every
call logged: walk equality on resource-free trees (same calls, same order, same
outcome — 200 samples); success implies row-by-row agreement, and a failure is
typed, on full trees; and replacing every death with the port's own typed failure
changes nothing either interpreter says. `PortAccess.test.ts` pins
`catchPortDefect`'s full cause matrix; `ShortCircuit.test.ts` pins each lookup, and its
"both interpreters stop where the stop rule says" tests pin the agreement directly — every
flat composite of up to three children enumerated, and up to eight generated with shrinking —
against an oracle written from ADR-QD-013 and INV-QD-017's table, so a stop moved in either
interpreter fails them by index (a port log, the evaluator's trace length and which failure
surfaces).

**Related**: [INV-QD-005](#inv-qd-005-short-circuit-preservation), [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-017](#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden), [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows), [BEH-QD-264](behaviors/16-predicates.md#beh-qd-264-a-defecting-port-fails-translation-typed-not-dead), [BEH-QD-265](behaviors/16-predicates.md#beh-qd-265-translation-asks-no-port-a-constant-has-already-decided), [BEH-QD-266](behaviors/16-predicates.md#beh-qd-266-a-refusal-depends-on-the-tree-alone), [ADR-QD-077](decisions/077-both-interpreters-read-ports-through-one-module.md).

---

## INV-QD-060: An enforcement failure is reported with the same meaning on every route

For every `EnforcementError` tag *T*, and for every adapter that reports it — the bare
`HttpRouter` route, the `HttpApiMiddleware` path, the decision stream's reauth label, an
application's own error handling — the meaning reported is `ENFORCEMENT_ERROR_CLASSES[T]`:
`denied`, `outage` or `wiringMistake`. Where that meaning becomes an HTTP status, both
HTTP routes read the same `HTTP_STATUS_BY_CLASS[class]`.

**Source**: `packages/core/src/Errors.ts` — `ENFORCEMENT_ERROR_CLASSES`, the total, tag-keyed
class table beside `ERROR_CODES`; `packages/http/src/QadiHttpError.ts` — `ENFORCEMENT_ERROR_WIRE`,
whose `wire` builder derives each entry's status from the class and is the package's only
`httpApiStatus` writer, and from which `toResponse`, `RequirePermission`'s `error:` and
`clientError`, and the denial-logging tags are derived.

**Implication**: [INV-QD-006](#inv-qd-006-failure-is-not-denial) held at the type level in one
place and by convention everywhere else. Before this, the two HTTP routes picked each tag's
status independently — a swapped choice compiled and passed every test — and the Next.js example
called an unmet obligation an outage and let two tags escape as a rejected Promise. A new tag
now has to be classified once, and every adapter inherits it.

**Enforcement**: `packages/core/test/Errors.test.ts` pins every class entry against a
hand-written map; `packages/http/test/QadiHttpError.test.ts` checks, for all twelve tags, that
the schema's `httpApiStatus`, the entry's status, the class's status and (for the eleven)
`toResponse`'s status agree; `packages/core/test/Errors.tst.ts` and
`packages/http/test/QadiHttpError.tst.ts` prove a tag added without a class or a wire entry
fails to type-check.

**Related**: [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-010](#inv-qd-010-error-codes-are-injective), [BEH-QD-177](behaviors/23-http.md), [BEH-QD-270](behaviors/07-enforcement.md#beh-qd-270-every-enforcement-failure-has-exactly-one-class), [ADR-QD-081](decisions/081-enforcement-error-classes-live-in-core.md)

## INV-QD-090: A pure walk over a caller-held tree never exhausts the call stack

For any `Policy`, `Explanation`, `Matcher` or `Trace` a caller holds — however deeply or
widely nested — every pure walk the library offers over it completes without
raising a `RangeError`, and no `maxDepth` a caller supplies turns a decision into a
defect.

**Source**: `packages/core/src/TreeFold.ts` — `foldTree`, the one post-order loop,
with `foldPolicy` (`Policy.ts`), `foldExplanation` (`Explanation.ts`) and
`foldMatcher` (`Matcher.ts`) as its thin adapters, and `foldTreeBy` — the same loop,
handing `combine` a named read of a child's result — behind `foldPolicyCases`,
`foldMatcherCases` and `foldExplanationCases`, the case-wise forms; `foldTrace`
(`Decision.ts`) and `foldAligned` (`Explanation.ts`) over a `Trace` and over an
explanation lined up with one; the explicit-stack loops in `renderTrace`
(`Decision.ts`) and `diffTraces` (`TraceDiff.ts`); and `Walk.ts`'s `Not`/`Obliged`/
`Labeled` arms and `Predicate.ts`'s `Negation`, which build their child under
`Effect.suspend`. There is no devtools copy of the loop any more: `inspect` is an
adapter over `foldAligned` (ADR-QD-101).

**Implication**: a policy assembled with the smart constructors has no
`MAX_DECODE_DEPTH` bound — a loop of `not()` builds a tree exactly as deep as the
loop runs — and a `RangeError` inside an `Effect` is a defect, not a typed failure,
so a walk that recurses natively turns a caller's policy into a crash. At
[AGENTS.md §4](../AGENTS.md)'s standard that is a decision becoming a defect. Six
walkers recursed natively before this and three more each carried their own copy
of the explicit-stack loop; one seam means one tested loop, and a cyclic tree
(only in-process mutation can build one) is a thrown, named defect rather than a
hang.

**Enforcement**: `packages/core/test/TreeFold.test.ts` pins
the loop — post-order, once per shared node, 100,000 deep, 250,000 wide, cycle
detection, no false positive on a diamond — once for `foldTree` and once for
`foldTreeBy`, which also pins that a read of a node the tree did not list as a child
throws. `Policy.test.ts`, `Matcher.test.ts` and `Explanation.test.ts` each add a
100k-deep / 250k-wide / cycle test on their case-wise fold and a lockstep property
that the dispatcher reads exactly what the ADT's `childrenOf` lists, by identity and
in order. A 100k-deep / 250k-wide test sits on each walker: `RolesAndDepth.test.ts` (`policyDepth`), `Simplify.test.ts`,
`Explanation.test.ts` (`explain`, `renderExplanation`, a deep matcher),
`Matcher.test.ts` (`referencesAction`, `referencesResource`, `matcherDepth`),
`Predicate.test.ts` (`toPredicate` with `maxDepth: 200_000`), `Evaluate.test.ts`
(`evaluate` with `maxDepth: Infinity`), and in `@qadi/devtools` `Remedies.test.ts`,
`WhatIf.test.ts` and `Inspect.test.ts`. A trace of any depth: `Decision.test.ts`
(`foldTrace` at 100k deep / 250k wide, a shared child combined once, a cycle),
`RenderTrace.test.ts` (`renderTrace` on a 100k-deep trace under the default
`indentLimit`, 3,000 deep at `Infinity`, and a differential property against the
recursive implementation it replaced, `TraceOracle.ts`), `TraceDiff.test.ts`
(`diffTraces`/`flippedAt` on 100k-deep evaluated chains of `not`, `labeled`, `allOf` and
`rules`, a 250k-wide `allOf`, and the same differential property) and
`TraceAlignment.test.ts` (`foldAligned` over a 100k-deep chain).

**Related**: [INV-QD-037](#inv-qd-037-a-measured-depth-agrees-with-the-evaluated-bound), [BEH-QD-300](behaviors/25-inspection.md), [BEH-QD-318](behaviors/25-inspection.md), [BEH-QD-303](behaviors/18-explanation.md), [BEH-QD-304](behaviors/04-matchers.md), [BEH-QD-144](behaviors/18-explanation.md), [BEH-QD-319](behaviors/18-explanation.md), [BEH-QD-194](behaviors/25-inspection.md), [ADR-QD-090](decisions/090-a-tree-is-folded-through-one-seam.md), [ADR-QD-101](decisions/101-the-alignment-of-an-explanation-with-a-trace-is-cores.md).

---

## INV-QD-059: A seeded decision never claims a trace it was not given

A decision rebuilt from a hydration payload carries a trace, or a denial's reason,
only when the server disclosed one. It is never given a trace root, a reason, or any
other piece of an evaluation that nobody made.

**Source**: `packages/react/src/SeededDecision.ts` — `SeededAllow` and `SeededDeny`
have no `trace` and no `reason` field; what the server withheld or shipped is a tagged
`disclosure` (`Withheld`, or `Disclosed` carrying the server's own trace and, for a
denial, its reason). `HydrationEngine.ts`'s rebuild constructs only those classes.

> **Amended in CCR-QD-435 (ARCH-91).** The classes are typed by the seed fields, which
> omit `trace` and (for a denial) `reason` by name, and `rebuild` is the `VERDICTS`
> table's spread, still constructing only those classes
> ([INV-QD-333](#inv-qd-333-a-seeds-fields-are-the-wires)).

**Implication**: a hydrated decision was a core `Allow`/`Deny`, which require a
`Trace` and a deny `reason`, so both were fabricated whenever the server withheld
them — a single-node trace with the reason `"hydrated"` (which a `<Can fallback={(deny)
=> deny.reason}>` rendered), and a root of `"AllOf"` for a payload with no trace at all.
A consumer reading `decision.trace.policyTag` was reading something no evaluator
produced. The type now says what a seed is, and the compiler finds every reader that
treated one as an evaluation.

**Enforcement**: `Hydration.tst.ts` pins `ClientDecision` as the closed four-case
union and that `isAllowed` from `@qadi/core` rejects one;
`HydrationPayload.test.ts`'s differential test dehydrates the decision of every
`Policy` shape the evaluator produces, with and without `includeTrace`, hydrates it
through JSON, and asserts the seed carries the same verdict, visible fields,
obligations and evaluation id and a `Disclosed` trace deep-equal to the server's —
and a `Withheld` payload contains no `"trace"` key at all.

**Related**: [BEH-QD-147](behaviors/19-hydration.md), [BEH-QD-148](behaviors/19-hydration.md), [ADR-QD-078](decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md), [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it).

## INV-QD-064: A guard is listed only by the registry its provider writes to

A guard registers with exactly one gate registry: the `gates` its provider was
handed, else its atom set's `atoms.gates`. Two atom sets in one process do not see
each other's guards, and two live registrations in one registry never overwrite
each other, so the ids in one `instances()` snapshot are pairwise distinct.

**Source**: `packages/react/src/GateWriter.ts` (`buildGateRegistry`: every piece of
state is inside the closure, a colliding id is disambiguated, and `register`'s handle
closes over its own key, so a stale cleanup can only end the registration it made;
`OwnedGateRegistry` holds the writer in a private slot, so only a registry the package
built has one). `makeGateRegistry` in `packages/react/src/GateRegistry.ts` and the atom
set in `packages/react/src/QadiAtoms.ts` both build their registry through it.

**Implication**: the panel's two views, "asked" and "asking", must be about the same
thing. A process-wide registry listed tenant B's guards under tenant A's question,
and a hydrated root silently replaced a still-mounted guard of another root that
minted the same `useId`. Both were a panel telling the reader something false about
a guard they were debugging.

**Enforcement**: `packages/react/test/GateRegistry.store.test.ts` checks random
`register`/`update`/`unregister` sequences against a reference model and asserts the
ids stay distinct; `GateRegistry.test.tsx` ("scoped to its atom set") mounts two atom
sets and two hydrated roots over one, and ("a spread copy of an atom set") a copy
shares the original's registry; `GateRegistry.store.test.ts` also checks the writer is
reachable by neither names nor symbols; `gate-instances.feature` has a scenario for two
atom sets.

**Related**: [BEH-QD-233](behaviors/28-devtools-screens.md), [ADR-QD-080](decisions/080-a-gate-registry-belongs-to-its-atom-set.md), [INV-QD-046](#inv-qd-046-instrumentation-never-changes-what-a-guard-renders).

---

## INV-QD-061: `toRenderable` preserves `evaluatePredicate`'s meaning in two-valued logic

For every `Predicate` `toRenderable` accepts, and every row whose columns are all
present, interpreting the returned `RenderableNode` in two-valued logic — every
`NullGuard` applied literally — gives the same answer as `evaluatePredicate` does
against the same `Predicate` and row, including rows whose values have the wrong
type for the column.

**Source**: `packages/core/src/RenderablePredicate.ts` — `toRenderable`, whose
leaf classification reads what a leaf means on NULL from `evaluatePredicate`
itself (`nullGuardFor`: `evaluatePredicate(leaf, {[column]: null})`) and what it
means on a non-finite value the same way (`finiteGuardFor`: whether
`evaluatePredicate` denies `Infinity`, `-Infinity` or `NaN` on the leaf), and
whose `Gte`/`Lt` arm checks the bound with `isRangeBound`, which is `Compare.ts`'s
`isFiniteNumber` itself.

**Implication**: this is [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)
one layer further, and it is what lets a dialect package be a renderer that
decides nothing. The rules a package used to re-derive (safe literals, `Compare`
against NULL and against a non-number, an empty `MemberOf`) are stated once, so a
semantic fix (CCR-QD-120) lands once. A `NullGuard` is a no-op here: it only
matters to a target whose comparisons can be UNKNOWN, which INV-QD-047/048 check
against real engines. Absent (`undefined`) columns are out of scope: a table has
none, and `Predicate.test.ts` keeps covering them.

**Enforcement**: `packages/core/test/RenderablePredicate.test.ts` — R1 (a leaf's
guard is `AdmitNull` exactly when the reference admits NULL on it), R2/R3 (a
test-only two-valued interpreter of the tree, guards applied literally, equals the
reference over 400 generated predicates x 25 rows, for both negations and with a
declaration — the cells include `±Infinity` and `NaN`, and the interpreter's
`Range` compares them the way a target's plain `>=`/`<` does, so only the finite
guard keeps them out), R9 (a `Range`'s `finiteGuard` is `ExcludeNonFinite` exactly
when the target may hold a non-finite value and the reference denies one, under
`Unrepresentable`, `Unknown` and `Declared`; a target that cannot express the
guard refuses exactly those ranges), and the bound-rule test that a `Gte`/`Lt`
bound is a `Range` exactly when the evaluator can compare against it.

**Related**: [BEH-QD-271](behaviors/31-predicate-compilation.md#beh-qd-271-a-predicate-is-classified-once-in-core-into-a-renderable-tree), [ADR-QD-079](decisions/079-renderability-is-a-core-rule.md).

## INV-QD-062: A wrong nullability declaration never admits a row the predicate denies

For every `Predicate`, every renderer and every row, if the caller's `nullable`
declaration is wrong, the compiled query returns a subset of the rows
`evaluatePredicate` admits, or the engine or the compiler refuses it loudly. It
never returns a row `evaluatePredicate` denies.

**Source**: `packages/core/src/RenderablePredicate.ts` — the null-guard table
(`NULL_GUARD`) and the `NullOnNonNullableColumn` refusal.

**Implication**: a declaration is the minimum schema fact a schema-blind renderer
needs, and it must be safe to get wrong. Three mechanisms make it so. Core never
folds anything on the strength of a declaration. A null comparison on a column
declared NOT NULL refuses rather than folding to a constant, which could over-admit
under a `Negate`. And the guard table is polarity-aware per target: a three-valued
`NOT` (Prisma) is monotone — replacing the reference's FALSE with UNKNOWN can only
lose rows — so a NOT NULL column gets no guard; a two-valued `NOT` (SQL's `CASE
WHEN`, which collapses UNKNOWN to FALSE) is **not** monotone, and an unguarded
`Neq`/null-member `MemberOf` under an odd number of `Negate`s on a column that does
hold NULL flips to TRUE where the reference says FALSE, so it keeps `AdmitNull` at
negative polarity even on a declared NOT NULL column. The two-valued case was found
by a real-engine property in implementation, not by the plan's monotonicity
argument, which held only for the three-valued one.

**Enforcement**: `packages/predicate-sql/test/EngineAgreement.test.ts` S3
(true declaration: exact agreement on PGlite and `node:sqlite`; everything
declared nullable: exact; nothing nullable: a subset, with a strict subset
observed so it cannot pass vacuously), `packages/predicate-prisma/test/EngineAgreement.test.ts`
P2/P3 (under-declared: a subset; over-declared: equal or refused by Prisma, with a
refusal observed), and `packages/core/test/RenderablePredicate.test.ts` R7 (the
table's rows, including the two-valued negative-polarity guard).

**Related**: [BEH-QD-272](behaviors/31-predicate-compilation.md#beh-qd-272-a-nullability-declaration-can-only-narrow-or-refuse), [INV-QD-047](#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits), [INV-QD-048](#inv-qd-048-a-compiled-prisma-whereinput-admits-exactly-the-rows-the-predicate-admits), [ADR-QD-079](decisions/079-renderability-is-a-core-rule.md).

---

## INV-QD-091: A primitive matcher and its predicate leaf are one function

For every primitive matcher (`Eq`, `Neq`, `Gte`, `Lt`, `In`) and every value, the
matcher holds against the value exactly when the predicate leaf `toPredicate`
maps it to (`Compare` or `MemberOf` on a column) admits a row holding that value.
The two are one function over the same operand: both read the value they compare
as an own property, so a key an inherited member would answer reads as absent on
both sides.

**Source**: `packages/core/src/Compare.ts` — the verdict functions — and
`packages/core/src/Operand.ts` — `ownValue` and `getByPath`, the operand read.
`judgeMatcher`'s leaf arms (`Matcher.ts`) and `evaluatePredicate`'s
`Compare`/`MemberOf` arms (`Predicate.ts`) both call them; neither interpreter
keeps a comparison rule or an operand read of its own.

**Implication**: [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)
at its leaves, by construction rather than by sampling. INV-QD-018 had been
violated three times at exactly this layer — the bound (CCR-QD-120), the row value
(CCR-QD-172), and in between a `typeof` half of a guard copied without its
`Number.isFinite` half — each time because a rule lived in two copies and one was
patched. With one function, a fix to what a comparison means is one edit that
both interpreters see. A fourth violation was in the operand rather than the rule:
`evaluatePredicate` read `row[column]` bare, so a column named `constructor` read
an inherited function and the reference admitted a row `evaluate` denied
([ADR-QD-166](decisions/166-one-module-owns-the-value-a-leaf-compares.md)).

**Enforcement**: `packages/core/test/Compare.test.ts`, "PROPERTY: every primitive
matcher and its predicate leaf agree on every operand class" — every
`eq`/`neq`/`gte`/`lt`/`inArray` built from a 14-class operand universe (absent,
`null`, finite numbers, a numeric string, a boolean, the three non-finite numbers,
an object, an array, a bigint, a security label), judged against every value in
the same universe: 644 pairs, the count asserted so a shrunken universe fails.
`PredicateLiteral.test.ts` pins that `isRangeBound` *is* `isFiniteNumber`. For the
operand read, `packages/core/test/Predicate.test.ts`,
"PROPERTY: the two interpreters agree on prototype names, row by row" (leaves naming
`constructor`, `toString`, `__proto__`, `hasOwnProperty` and `valueOf`, over rows that lack
them and rows that own them), and `packages/core/test/Operand.test.ts`.

**Related**: [BEH-QD-305](behaviors/04-matchers.md#beh-qd-305-comparison-semantics-have-one-owner), [BEH-QD-122](behaviors/16-predicates.md#beh-qd-122-the-reference-interpreter-ships-with-it), [BEH-QD-601](behaviors/04-matchers.md#beh-qd-601-a-leafs-operand-is-an-own-property-read-made-in-one-module), [BEH-QD-602](behaviors/16-predicates.md#beh-qd-602-the-reference-interpreter-reads-a-column-as-an-own-property), [INV-QD-351](#inv-qd-351-every-interpreter-and-both-fixture-builders-read-a-decoded-key-only-through-operandts), [INV-QD-352](#inv-qd-352-an-inherited-member-reads-as-absent), [ADR-QD-091](decisions/091-comparison-semantics-have-one-owner.md), [ADR-QD-166](decisions/166-one-module-owns-the-value-a-leaf-compares.md).

## INV-QD-092: An absent value never satisfies a matcher

For every matcher, of every tag and at any nesting, `judgeMatcher(matcher,
undefined, context)` is not `Held`.

**Source**: `packages/core/src/Compare.ts` — every verdict function reports
`ValueAbsent` for an `undefined` value before comparing — and `judgeMatcher`'s
structural arms (`Matcher.ts`), which report their own `ValueAbsent` for an
`undefined` value.

**Implication**: an attribute nobody set is never read as one that satisfies a
condition. `Exists`, the ranges, `Contains` and the composites always followed
this; `Eq`/`Neq` joined in CCR-QD-112. Membership was the exception:
`inArray([undefined])` held for an absent value, because
`[undefined].includes(undefined)` is true, and `evaluatePredicate`'s `MemberOf`
agreed. Both deny now (CCR-QD-173), so the rule is total and can be stated —
which is also what lets `@qadi/devtools` decline a remedy that would set an
attribute to `undefined` rather than offer one that cannot work.

**Enforcement**: `packages/core/test/Compare.test.ts`, "PROPERTY:
judgeMatcher(m, undefined) is never Held, for every tag, nested" — 400 matchers
from the shared generator plus `inArray` over lists that may hold `undefined`,
nested under every wrapper, with all twelve tags asserted reached; and
`Predicate.test.ts`'s `MemberOf`-on-an-absent-column test, which agrees with
`evaluate`.

**Related**: [BEH-QD-027](behaviors/04-matchers.md#beh-qd-027-constructors-and-semantics), [BEH-QD-305](behaviors/04-matchers.md#beh-qd-305-comparison-semantics-have-one-owner), [ADR-QD-091](decisions/091-comparison-semantics-have-one-owner.md).

---

## INV-QD-093: A merge discloses nothing its inputs did not

For every `FieldStrategy` and every non-empty list of field sets, what
`mergeFields(strategy, sets)` discloses of a record is a subset of what their
union discloses; and a strategy outside the union discloses nothing at all.

**Source**: `packages/core/src/FieldLattice.ts` — one law-table row per strategy,
read through `Object.hasOwn`, and a fail-closed row (`merge` gives `[]`, every law
`false`) for any other value, `Object.prototype`'s keys included. The evaluator's
`allOf`/`anyOf` merges, `ShortCircuit.ts`'s stop rule and `Simplify.ts`'s rewrites
all read it.

**Implication**: widening is the one direction a field-strategy bug must never take
([ADR-QD-034](decisions/034-the-switch-exception-is-measured.md)), and it had been
taken twice by modules that each restated part of a strategy's meaning — an `anyOf`
whose strategy was `"toString"` stopped at its first allow and granted every field,
and `simplify` unwrapped a one-child composite under an unknown strategy from no
fields to its child's (CCR-QD-174). With one owner, an unknown value means the same
thing everywhere: nothing.

**Enforcement**: `packages/core/test/FieldLattice.test.ts`, "PROPERTY: a merge never
discloses more than its inputs' union" (300 samples through `project`) and the
fail-closed row test over `"Xor"`, `"toString"`, `"constructor"`, `"__proto__"`,
`"hasOwnProperty"` and `""`; `Evaluate.test.ts`'s CM-07 and prototype-key tests at
the evaluator.

**Related**: [BEH-QD-018](behaviors/03-policy-adt.md), [BEH-QD-035](behaviors/05-evaluator.md), [BEH-QD-154](behaviors/20-simplification.md), [INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top), [INV-QD-024](#inv-qd-024-simplification-changes-the-tree-and-nothing-a-caller-can-observe), [ADR-QD-092](decisions/092-field-strategy-meaning-lives-beside-the-lattice.md).

---

## INV-QD-094: A decision being re-checked, or that failed, never reads as a verdict

For every `DecisionResult` — every `AsyncResult<ClientDecision, EvaluationError>`
shape, not only those a decision atom happens to reach — `outcomeOf` reads `Allowed`
or `Denied` only from a `Success` that is not `waiting`, and then carries that
success's own decision. A `waiting` result reads `Pending` (when `Initial`) or
`Rechecking`; a `Failure` that is not `waiting` reads `Failed`; and no outcome has a
field holding a previous answer.

**Source**: `packages/react/src/DecisionOutcome.ts` — `outcomeOf` checks `Initial`,
then `waiting`, before dispatching on the variant with a module-scope
`Match.tagsExhaustive`; `Failed` is built from the failure's `cause` alone.
`currentDecision`, `Can`/`Cannot`, `useCan`, `useProjected` and the gate registry
(`GateRenderState = DecisionOutcome["_tag"]`) are projections of it, and
`useDecisionSuspense` delegates the same partition to `@effect/atom-react`'s
`suspendOnWaiting: true` (ADR-QD-093).

**Implication**: [ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md)'s
rule spoke only of the `waiting` flag, and a stale allow has a second carrier the
flag does not mark: `AsyncResult.Failure.previousSuccess`, which
`AsyncResult.value`, `getOrElse` and `getOrThrow` return — after a re-check of an
allow fails, they still say "allowed", with `waiting: false`. This is the gap
[INV-QD-028](#inv-qd-028-a-seed-never-outlives-the-clients-own-answer)'s note names
for seeds, "an invariant about staleness that speaks only of the flag does not reach a
value that was never marked stale," closed here for failures by giving consumers a
read with nowhere to put the value. It is also what the React guide's own example got
wrong while two compile gates passed it (CCR-QD-175).

**Enforcement**: `packages/react/test/DecisionOutcome.test.ts` — "reads every state a
decision atom reaches" (a real atom, a parked resolver, eight states in order) and the
seeded row; the fast-check properties "never reads a waiting result as an answer",
"never reads a failure's previous success" and "agrees with currentDecision and
permits" over every `AsyncResult` shape. `DecisionOutcome.tst.ts` pins that no
non-answer case has a `decision` and `Failed` has no `previousSuccess`.
`DECISION_READ_BUDGET` (`scripts/check-house-style.mjs`) refuses a second raw read in
`packages/*/src`; the doc-fence gates (`node scripts/check-doc-examples.mjs`,
`node scripts/check-website-doc-examples.mjs`) refuse one in a compiled fence that
imports `@qadi/react`. `stryker.react.mjs` mutates `DecisionOutcome.ts`.

**Related**: [BEH-QD-066](behaviors/09-react.md#beh-qd-066-decision-state), [BEH-QD-068](behaviors/09-react.md#beh-qd-068-hooks-and-components), [BEH-QD-307](behaviors/09-react.md#beh-qd-307-a-decision-result-reads-as-one-of-five-outcomes), [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-028](#inv-qd-028-a-seed-never-outlives-the-clients-own-answer), [ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md), [ADR-QD-093](decisions/093-a-decision-is-read-once.md).

## INV-QD-095: Every port is described once, and every derived layer agrees with its description

For every member of the port registry, the named fail-closed default answers the
description's `none`; every wrapper, double and replay fails only with an error
built by the description's `failure` (or, for a defect, its `defect`); a scripted
double's unscripted request answers `none`; and a request is keyed only by the
description's `key`; and a served question is admitted only through its description's
serving facet, where the name a request asks and how a declaration admits it are stated
once, and the request each policy leaf asks the port is the description's own `asks`.

**Source**: `packages/core/src/PortDescription.ts` (the description type),
`packages/core/src/PortServing.ts` (the serving facet and the declaration it is typed by),
`packages/core/src/PortDerivation.ts` (wrappers and defaults),
`packages/core/src/PortDoubles.ts` (scripted and recording doubles),
`packages/core/src/Ports.ts` (the closed registry and the environments), and the
five port modules, each declaring its description beside its service.

**Implication**: a port's facts — its error, its key, its fail-closed answer, its
span — had been restated wherever something wrapped, replayed, defaulted, doubled
or enumerated the port, and the restatements drifted: two of three retrying
wrappers hid their retries, two ports had no deadline, devtools copied every
default by hand. Stated once, a fact cannot disagree with itself, and the registry
being a mapped type over `PortName` means a port without a description, a
registry entry or a conformance case does not compile.

**Enforcement**: `packages/core/test/PortConformance.test.ts` runs the same
assertions over every port in the registry — default, retrying, bounded,
timing-out, names, scripted double, recording decorator, defect constructor,
request keys — with a case table typed over `PortName`;
`packages/core/test/PortDescription.test.ts` pins the generic derivations against
a test-local port; `packages/core/test/Ports.tst.ts` pins the registry's
type-level derivations; `PORT_DOUBLE_BUDGET` in `scripts/check-house-style.mjs`
keeps tests from re-stating a port's error by hand;
`packages/core/test/PortRemote.test.ts` ("serving facets": each port-reading leaf is named under
exactly one port and no other policy tag, each port states its allowlist word, and `declare` and
`admitted` agree per port; and "a declaration is admitted through the port's facet": an empty required
list refuses `constructor` and `__proto__` without a store call, an open port with no list admits any
name) and `packages/core/test/PortServing.tst.ts` (the five-member declaration shape pinned, `serving`
a required member of a description, each allowlist word tied to its slot) pin the serving facet.

**Related**: [ADR-QD-094](decisions/094-a-port-is-described-once.md), [ADR-QD-114](decisions/114-a-port-states-what-it-serves.md), [BEH-QD-331](behaviors/34-remote-ports.md#beh-qd-331-a-served-question-outside-the-hosts-serving-declaration-must-be-refused), [BEH-QD-308](behaviors/06-services.md#beh-qd-308-every-port-has-the-standard-wrapper-set), [BEH-QD-310](behaviors/06-services.md#beh-qd-310-a-port-can-be-scripted), [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-007](#inv-qd-007-defaults-fail-closed), [INV-QD-043](#inv-qd-043-a-snapshot-answers-what-the-live-layer-answered).

## INV-QD-096: Whatever the record codec emits, it accepts

For every `SinkRecord` `r`, `encodeSinkRecordString(r)` is either a refusal or a
string that `decodeSinkRecordString` accepts and rebuilds equal to `r` up to the
named normalisations: a resolver error's `cause` through `Schema.Defect()` (an
`Error` keeps `name`/`message`/`cause`; a cycle is dropped, a `bigint` becomes
`"10n"`, a non-finite number `null`), a `Date` in `resource` or `params` as its ISO
string, and an `undefined`-valued property as absent. The value form
(`encodeSinkRecord`/`decodeSinkRecord`) agrees with the text form.

The version the codec writes is one it reads, for every supported version:
`encodeSinkRecord` writes `WIRE_VERSION`, and `decodeSinkRecord` reads each version in
`WIRE_VERSIONS`, which lists `WIRE_VERSION`. Both are stated once, in `SinkWire.ts`, so the
two schema literals, the encoder and the read check cannot disagree (ADR-QD-151).

**Source**: `packages/core/src/SinkCodec.ts` — the outbound walk refuses exactly
what the inbound depth guard and schema would refuse, its depth count matching
`DecodeDepthGuard.ts`'s `exceedsJsonDepth`; `packages/core/src/SinkWire.ts` —
`WIRE_VERSION`, with `WIRE_VERSIONS` and `WireVersion` derived from it.

**Implication**: a sender can no longer emit what every receiver refuses. Before
ADR-QD-095 a successful evaluation under a raised `maxDepth` produced a record the
devtools showed as "not-a-record" and an aggregator answered with a 400, while the
sender saw nothing wrong; and the same record crossed with three different `cause`
shapes depending on which sink carried it.

**Enforcement**: `packages/core/test/SinkCodec.test.ts` — the round-trip property
over generated policies, resources, params and causes (JSON and hostile values),
the agreement property between the outbound `TooDeep` refusal and
`exceedsJsonDepth`, and the golden bytes for `Decided` records;
`packages/audit/test/AuditEntry.test.ts` — an audit row, a frame's data and
forwarding's `send` value are the same bytes for one record. Since ARCH-71 `SinkCodec.test.ts` also holds the every-shape round trip (both record tags, every optional key absent, present and `undefined`, seeded) and the encoded-value key pins ("the encoded value keeps today's keys": each golden record's ordered keys, no `undefined`-valued own key), and `packages/core/test/DecisionSink.test.ts` holds "a record evaluate emits is its own round trip", so an emitted record is `Equal` to its own round trip (BEH-QD-451). `packages/core/test/SinkWire.tst.ts` pins the version types by hand (so a retype fails `pnpm test:tstyche`), and `SinkCodec.test.ts`'s byte goldens hard-code `"version":2` and its refusal rows hard-code `supported: [2]`. The golden `V2_DECIDED_ALLOW` and the main round-trip fixture owe the trace root's duties and fields, as a decision agrees with its trace (INV-QD-170): both were disagreeing records no evaluator produces, and the corrected golden changes inside the trace only.

**Related**: [ADR-QD-095](decisions/095-sinkcodec-owns-both-directions.md), [ADR-QD-135](decisions/135-sink-record-fields-stated-once.md), [ADR-QD-151](decisions/151-the-sink-wire-version-is-stated-once.md), [BEH-QD-199](behaviors/25-inspection.md), [BEH-QD-200](behaviors/25-inspection.md), [BEH-QD-250](behaviors/33-audit-pipeline.md), [BEH-QD-451](behaviors/24-decision-sink.md#beh-qd-451-an-absent-optional-is-an-absent-key-on-every-record-core-emits), [INV-QD-097](#inv-qd-097-the-record-codec-is-total), [INV-QD-290](#inv-qd-290-a-records-class-and-its-wire-envelope-list-the-same-fields).

## INV-QD-097: The record codec is total

`encodeSinkRecord` and `encodeSinkRecordString` never throw, and never die,
whatever they are given. `decodeSinkRecord` and `decodeSinkRecordString` never throw,
and never die, on any JSON text or JSON value, and `decodeSinkRecordString` takes
text, so it is total for every input: a record that cannot cross is a
`SinkRecordNotEncodable`, input that is not a record is a `SinkRecordNotDecodable`,
and a refusal affects only its own record. No adapter — forwarding, the decision
stream, the audit encoder, the devtools source — lets one record end a feed, fail a
decision, or count as a store failure, because each encodes a record or decodes what
a store or a wire returned, which is JSON text or a JSON value.
On an in-process value, an own accessor that the decoder reads and that throws is
thrown out of `decodeSinkRecord`: a declared top-level one, or one the depth guard
or the strict decode reads under a kept value, one level down included
([INV-QD-377](#inv-qd-377-the-ignore-projection-never-reads-an-undeclared-value)).

**Source**: `packages/core/src/SinkCodec.ts`; the adapters
`packages/core/src/DecisionSinkForwarding.ts`,
`packages/http/src/DecisionLogHttp.ts` (both decision-log routes encode and report
through it, ARCH-50), `packages/audit/src/AuditEntry.ts`, `packages/audit/src/AuditDecisionSinkLive.ts`,
`packages/devtools/src/model/Source.ts`; every reporter's hook is contained by
`packages/core/src/EncodeRefusalReport.ts`.

**Implication**: before ADR-QD-095 a resolver `cause` with a reference cycle — the
shape an HTTP client's error has — threw out of the decision stream's framing and
ended every subscriber, and the same throw at an audit store's `JSON.stringify`
counted as a write failure, so an attribute-store outage tripped the breaker and
dropped the healthy rows after it. The encode of a policy about 5,000 levels deep
threw too, and forwarding reported it as a delivery failure.

**Enforcement**: `packages/core/test/SinkCodec.test.ts` — totality properties over
hostile resources, params and causes (cycles, functions, symbols, bigints, `NaN`,
`Map`/`Set`, throwing getters and `toString`) and over arbitrary strings and JSON
values; `packages/http/test/decisionStream.test.ts` — two subscribers of one feed
both receive the record after a poisoned one;
`packages/audit/test/AuditDecisionSinkLive.test.ts` — five poisoned `Failed`
records do not trip the breaker for a JSON-text store;
`packages/core/test/DecisionSinkForwarding.test.ts` — a refusal reaches
`onFailure`, never `send`; `packages/core/test/EncodeRefusalReport.test.ts`,
`packages/http/test/decisionStream.test.ts`, `packages/http/test/decisionBacklog.test.ts`
and `packages/audit/test/AuditDecisionSinkLive.test.ts` — a hook that throws is
logged, and the next record is still framed, served or written;
`packages/http/test/DecisionLogHttp.test.ts` — every framing of both decision-log
routes drops only a refused record, reports it once, and contains a throwing hook.

**Related**: [ADR-QD-095](decisions/095-sinkcodec-owns-both-directions.md), [BEH-QD-187](behaviors/24-decision-sink.md), [BEH-QD-311](behaviors/26-decision-stream.md#beh-qd-311-one-record-never-ends-the-feed-and-a-refused-one-is-reported), [BEH-QD-312](behaviors/33-audit-pipeline.md#beh-qd-312-a-stored-row-is-read-back-through-a-guard), [INV-QD-035](#inv-qd-035-a-sink-cannot-change-a-decision).

## INV-QD-098: A decoded decision record has exactly the outcome its sender sent

A `SinkRecord` that `decodeSinkRecord` (or `decodeAuditEntry`) returns carries the
outcome its sender wrote, and only that one: a decision record naming neither
outcome, or both, is refused and never decoded. No outcome is invented and none
is chosen. Wire version 2 — the only version read since 0.11.0 — carries the
outcome as one tagged value, so neither case can be written down: a version-2
record with no `outcome`, or an outcome carrying a second one, is `Malformed`.
The bytes that could say "both" or "neither" are version 1's, written before
0.10, and they are refused as `UnsupportedVersion` before any outcome is read.

**Source**: `packages/core/src/SinkCodec.ts` (`OutcomeWire`, `decodeSinkRecord`'s
version check, `rebuild`).

**Implication**: before ADR-QD-096 a record naming neither outcome decoded to an
invented `MissingResource`, indistinguishable by code (`ACL004`) from a real
resolver-wiring failure, so a devtools row or a metric bucketed by code could not
tell a missing attribute from a malformed record (ticket 96); a record naming both
silently kept `decided` (ticket 155).

**Enforcement**: `packages/core/test/SinkCodec.test.ts` — "a record naming no
outcome is refused", "a pre-0.10 record naming both outcomes is refused", the
malformed-v2-outcome cases, and the property "a v2 record naming no outcome, a
malformed one, or an unknown nested key never decodes, and never throws";
`packages/audit/test/AuditEntry.test.ts` — `decodeAuditEntry` refuses a row naming
no outcome and one carrying a stray second; `packages/devtools/test/model/Source.test.ts`
— a frame with no outcome is dropped as a `Malformed` refusal;
`features/features/wire-versions/wire-versions.feature`.

**Related**: [ADR-QD-096](decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md), [BEH-QD-200](behaviors/25-inspection.md), [INV-QD-096](#inv-qd-096-whatever-the-record-codec-emits-it-accepts).

## INV-QD-099: A record decodes the same whichever wire version carried it

> **Retired in 0.11.0 (CCR-QD-182).** 0.11.0 reads one wire version, version 2
> ([ADR-QD-096](decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)'s
> 2026-10-06 amendment), so there are no two versions for a record's decoding to
> agree across. A record with no `version` — version 1, written before 0.10 — or
> any other `version` is refused as `UnsupportedVersion` and never decoded, so no
> reader sees one decision two ways; an audit store holding version-1 rows is
> migrated with 0.10.x before its readers upgrade, and a row that is not is
> reported, never misread. The id is kept, and not reused.
>
> What replaced it is a refusal, enforced where this invariant was:
> `packages/core/test/SinkCodec.test.ts` — the property "one version: any record's
> pre-0.10 bytes are UnsupportedVersion, never upgraded into a record" and the
> pre-0.10 refusal cases; `packages/audit/test/AuditEntry.test.ts` — a pre-0.10 row
> is `UnsupportedVersion`; `packages/devtools/test/model/Source.test.ts` — a pre-0.10
> frame is dropped as an `UnsupportedVersion` refusal;
> `features/features/wire-versions/wire-versions.feature`.
>
> The invariant as it read through 0.10.x, kept for the record: "For every
> `SinkRecord` `r` that both versions can carry, decoding its version-1 bytes and
> decoding its version-2 bytes give equal records. Version 1 is read for good — it
> is upgraded into the version-2 wire type and rebuilt by the one rebuild — so a
> reader never needs to know which version a sender wrote, and an audit row
> written before the wire was versioned reads as the record it recorded."

**Related**: [ADR-QD-096](decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md), [BEH-QD-199](behaviors/25-inspection.md), [BEH-QD-312](behaviors/33-audit-pipeline.md#beh-qd-312-a-stored-row-is-read-back-through-a-guard), [INV-QD-096](#inv-qd-096-whatever-the-record-codec-emits-it-accepts).

## INV-QD-100: A log reader sees every retained record exactly once

For every `read` of a decision log, every record the log retained when the read
was taken is in its `backlog`, every record appended after is delivered on its
`live` stream (bar a reader slower than `capacity`, which loses its oldest
unread, never its newest), and no record is in both or delivered twice —
whatever other fibers record, ingest or read concurrently.

**Source**: `packages/core/src/DecisionLog.ts` — `accept` appends (numbering
and retaining in one `Effect.sync`) **then** publishes; `readEntries` subscribes
**then** snapshots, and filters the live half to sequence numbers above the
snapshot's high-water mark.

**Implication**: the handoff between a reader's past and its future is the log's
to get right, not each reader's. The ring + feed pairing it replaced lost every
record made between reading the ring and subscribing to the feed (ARCH-11 C9)
under the feed's default `replay: 0`, and duplicated the replay window
otherwise. A reader over SSE inherits the guarantee: `/__decisions` makes one
`read` per connection and sends its backlog as the prelude
([BEH-QD-314](behaviors/26-decision-stream.md#beh-qd-314-the-backlog-travels-on-the-stream-and-every-frame-names-its-producer)),
and a reconnect during or after it loses and repeats none of it
([INV-QD-250](#inv-qd-250-a-resumed-read-loses-nothing)).
Across sources and reconnects, the timeline's identity rule
([INV-QD-039](#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival))
still absorbs repeats; exactly-once is per read.

**Enforcement**: `packages/core/test/DecisionLog.test.ts` — "each reader sees
every record exactly once, under concurrent writers and readers": 80 generated
interleavings of 1–40 writer fibers and 1–3 readers opened at random points,
with the scheduler's `MaxOpsBeforeYield` set low enough to switch fibers inside
an append-then-publish and a subscribe-then-snapshot, asserting each reader's
`backlog ++ live` equals the records written as a multiset; the targeted "a
record made between `read`'s snapshot and the first live pull arrives live,
once"; `features/features/decision-log/decision-log.feature` (the same log read
in process and over SSE holds the same records).

**Related**: [ADR-QD-097](decisions/097-a-decision-log-is-a-sink-and-its-own-history.md), [BEH-QD-313](behaviors/24-decision-sink.md#beh-qd-313-a-reader-sees-each-retained-record-once-across-backlog-and-live), [INV-QD-035](#inv-qd-035-a-sink-cannot-change-a-decision).

---

## INV-QD-102: A probe's verdict on port health is never served from a cache

A readiness probe reports whether the wired ports answered on this call, whatever
`DecisionCache` is wired. It is not a decision: it leaves no record, counts no decision metric and
fills no cache entry.

**Source**: `packages/core/src/GuardHealthCheck.ts` walks the policy through `walk` (`Walk.ts`)
and never calls `evaluate`, so it never reaches `DecisionCache.getOrCompute`.

**Implication**: through `decide`, a cache that keeps successes and has no TTL (ADR-QD-031)
served every probe after the first, so a probe reported healthy while the store was down.

**Enforcement**: `packages/core/test/GuardHealthCheck.test.ts` (a port that answers once then
fails; second probe unhealthy with a cache wired; a recording sink, the cache and
`qadi_decisions_total` untouched), `GuardHealthCheck.tst.ts` (requires only `CurrentSubject` and
`PortServices`).

**Related**: [BEH-QD-317](behaviors/05-evaluator.md#beh-qd-317-a-readiness-probe-asks-the-ports-every-time), [ADR-QD-100](decisions/100-a-question-is-asked-once.md), [INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity).

---

## INV-QD-103: A trace lines up with its policy's explanation, position by position

For every policy and every evaluation of it that produced a decision, the `i`th child of a trace
node is the node `evaluateNode` made for the `i`th part of the corresponding explanation node. A
composite's trace children are a prefix of its parts; a wrapper has exactly one child; a leaf has
none; and a part with no trace child was never reached, as is everything beneath it.

**Source**: `packages/core/src/Walk.ts` (`evaluateNode` and the composites, where `step` pushes
one child per evaluated row in row order), `packages/core/src/Explanation.ts` (`explain`, which
mirrors the policy, and `foldAligned`, which reads the pairing), `packages/core/src/TraceKey.ts`
(the key of each position).

**Implication**: this is what lets a display show a branch as *unexamined* rather than as
*denied* ([INV-QD-040](#inv-qd-040-the-inspector-never-claims-more-than-the-trace-does)). It was a
guarantee of core that only a devtools test enforced, restated in a docstring there. A subtree
shared by identity is **several positions**: `foldAligned` combines once per position, never once
per node, so the second occurrence has its own trace and its own key and not the first one's.

**Enforcement**: `packages/core/test/TraceAlignment.test.ts` — over `policyArbitrary()` and
`sharedPolicyArbitrary`, against varied subjects, with and without `concurrency`, every trace
node sits at a position whose explanation tag is the counterpart of its `policyTag`, the position
count equals the number of paths in the explanation (which is what fails a fold memoised by node),
keys are distinct and equal `tracePathKey` of their path, a rule table that stops early leaves
later rows unreached and carries each row's `effect`, and a 100,000-deep chain folds with
alternating verdicts.

**Related**: [BEH-QD-319](behaviors/18-explanation.md), [INV-QD-005](#inv-qd-005-short-circuit-preservation), [INV-QD-020](#inv-qd-020-concurrency-changes-lookups-not-answers), [INV-QD-090](#inv-qd-090-a-pure-walk-over-a-caller-held-tree-never-exhausts-the-call-stack), [ADR-QD-101](decisions/101-the-alignment-of-an-explanation-with-a-trace-is-cores.md).

## INV-QD-104: A refusal report says where, never what

The annotations a refused record is reported with are exactly the refusal's tag,
the path it was found at, and the evaluation id. They never carry a value from the
record, and never `EncodeFailed.message`, which can be text a caller wrote (a
throwing getter's message). `describeEncodeRefusal`'s sentence carries that
message, so a sentence is never an annotation and never a default log message.

**Source**: `packages/core/src/JsonRefusal.ts` (the leaf both wires read, ADR-QD-116) — `encodeRefusalAnnotations` and
`encodeRefusalPath` (a `Match.tagsExhaustive`, so a new `EncodeRefusal` variant is
one compile error beside the union); `packages/core/src/EncodeRefusalReport.ts`,
the one place the annotations are applied. `no-refusal-annotation-outside-core` in
`scripts/check-house-style.mjs` refuses `"qadi.refusal"`, `"qadi.path"` and a
`"path" in` check anywhere else in `packages/*/src`.

**Implication**: the default logger copies every log annotation onto the current
span as an event attribute, so an annotation is span data and
[INV-QD-044](#inv-qd-044-a-span-never-carries-a-resolved-attributes-value)'s
reasoning applies to it. A path is made of the keys of the caller's own object, so
a resource keyed by data puts that key in `qadi.path`; redacting keys would make the
annotation useless, and that is the one residue.

**Enforcement**: `packages/core/test/EncodeRefusalReport.test.ts` — a table over all
six variants pinning path, annotations and sentence, and a property over generated
sentinel strings (a `Set` member, a `Map` value, a throwing getter's message, a
`Symbol` description, a function name) asserting none appears in any annotation.

> **Amended in CCR-QD-431 (ARCH-87).** A decode refusal is reported the same way.
> `packages/core/src/SinkWire.ts`'s `decodeRefusalAnnotations` carries exactly `qadi.refusal`, the
> refusal's tag, and never `Malformed.message` (the decoder's text about what the sender sent) or
> `UnsupportedVersion.version` (any value the sender put there). `describeDecodeRefusal`'s sentence
> carries both, bounded, so it is never an annotation and never a default log message.
> `no-refusal-annotation-outside-core` exempts `SinkWire.ts` beside `JsonRefusal.ts`. Enforced by
> `packages/core/test/DecodeRefusal.test.ts` (`decodeRefusalAnnotations says which refusal, never what
> was sent`) and `packages/devtools/test/model/Source.test.ts` (`the default warning says which
> refusal, never the decoder's message`)
> ([ADR-QD-153](decisions/153-core-owns-describing-a-decode-refusal.md)).

**Related**: [INV-QD-044](#inv-qd-044-a-span-never-carries-a-resolved-attributes-value), [INV-QD-097](#inv-qd-097-the-record-codec-is-total), [BEH-QD-250](behaviors/33-audit-pipeline.md), [BEH-QD-311](behaviors/26-decision-stream.md#beh-qd-311-one-record-never-ends-the-feed-and-a-refused-one-is-reported), [ADR-QD-095](decisions/095-sinkcodec-owns-both-directions.md), [ADR-QD-116](decisions/116-the-json-refusal-vocabulary-is-a-leaf-of-its-own.md).

## INV-QD-105: A live question is never evicted, and one question has one handle while tracked

While an atom set tracks a question, every ask of an equal question returns the same
decision atom, whatever the garbage collector does, and `asked()` lists it once. A
question any reader holds open is never dropped by the atom set's sweep, and that includes a
recompute in flight: a recompute disposes a reader's lifetime and re-reads in one
synchronous step, so the count of readers is never zero where a sweep can see it.

**Source**: `packages/react/src/QuestionBook.ts` — a `MutableHashMap` keyed `{ policy,
resource }` holding each handle strongly, a per-entry reader count, and a one-pass
oldest-first sweep over cold entries. `packages/react/src/SeededQuestion.ts`'s
`makeSeededQuestion` is its one adapter: its reader calls `live()` first and hands the
idempotent release to `get.addFinalizer`, and `QadiAtoms.ts` hands it the `live` that
`BookOptions.build` receives.

**Implication**: before the book, `Atom.family` held its values weakly and nothing held a
question's atom, so after a collection the same question got a second atom (a second
evaluation and `DecisionSink` record), a second `asked()` row, and lost a hydrated seed
written before its first read. The loss failed closed (the gate showed `Pending`), but it
was silent. A swept question is no longer tracked, and asking it again builds a fresh
handle; a seed written and never read can be forgotten with its row once more than
`maxTrackedQuestions` questions are cold. A seed is held by the handle, so it is forgotten with
its row and a registry's removal of an idle node no longer loses it
([ADR-QD-149](decisions/149-a-seed-is-held-by-its-question.md), INV-QD-317).

**Enforcement**: `packages/react/test/QuestionBook.test.ts` — keying, FIFO among cold
entries, never-evict-live, stop-when-all-live, release, idempotent release, re-admission and
no duplicate row, and the capacity check, with no atom and no registry;
`packages/react/test/SeededQuestion.test.ts` — the question is counted live before its
computation reads the subject, once per computation;
`packages/react/test/QadiAtoms.test.ts` — the identity-across-a-collection tests (bare,
resource-scoped, mounted) and the sweep across an invalidation and across a recompute in
flight; `packages/react/test/Hydration.test.ts` — a seed survives a collection;
`packages/react/test/v4-reactivity-smoke.test.ts` — the synchronous dispose-then-re-read,
`MutableHashMap`'s structural keying, and `Atom.family`'s weak values, each naming the module
that depends on it; `packages/react/test/QadiAtoms.sweep.test.ts` and
`packages/react/test/SweepScheduler.test.ts` — the sweep runs after the pressure and keeps every
held question; `packages/react/test/Hydration.lifetime.test.ts` and
`packages/react/test/QadiProvider.seed.test.tsx` — a seed lasts until the client answers or its
row is forgotten (HL1, HL2, HL6, SD1 to SD5); `stryker.react.mjs` mutates `QuestionBook.ts` and `SweepScheduler.ts`.

**Related**: [INV-QD-028](#inv-qd-028-a-seed-never-outlives-the-clients-own-answer), [INV-QD-046](#inv-qd-046-instrumentation-never-changes-what-a-guard-renders), [BEH-QD-065](behaviors/09-react.md#beh-qd-065-the-atom-set), [BEH-QD-198](behaviors/25-inspection.md#beh-qd-198-an-atom-set-records-the-questions-it-was-asked), [ADR-QD-039](decisions/039-a-seed-is-not-an-authority.md), [ADR-QD-103](decisions/103-a-question-is-opened-once.md).

## INV-QD-106: Every audit record has exactly one write outcome, and an entry not in the trail is witnessed

`AuditDecisionSinkLive.record` returns each record's fate as one `AuditWriteOutcome`
(eleven leaves, no illegal states) and reports it exactly once: its
`qadi_audit_writes_total` label, its `qadi_audit_staging_total` labels, its log line
and the `onOutcome` hook are all read from that value by one pure projection. An
entry that is in neither the trail nor staging (`durabilityOf` is `"Lost"`) is
logged as a warning naming its `evaluationId` and counted in
`qadi_audit_entries_lost_total`; a staged entry that was not written is logged at
info. The port calls report nothing themselves.

**Source**: `packages/audit/src/AuditWriteOutcome.ts` (the union and `durabilityOf`),
`packages/audit/src/AuditWriteReport.ts` (`describeAuditWriteOutcome`, the one
projection; `emitWriteOutcome`, the one place a metric is updated or a line logged on
the write path), `packages/audit/src/AuditDecisionSinkLive.ts` (`record`); the unwritten row in
`packages/audit/src/UnwrittenRow.ts` ([INV-QD-341](#inv-qd-341-an-unwritten-audit-entry-is-lost-exactly-when-its-stagings-row-says-so)).

**Implication**: a twelfth outcome is one compile error in each `Match.tagsExhaustive`
table. Before this invariant two of the eleven leaves (a failed write with no staging,
and a failed write after a failed stage) lost the entry and logged nothing.

**Enforcement**: `packages/audit/test/AuditWriteOutcome.test.ts` pins every leaf's
projection exactly; `packages/audit/test/AuditWriteExits.test.ts` drives every
reachable exit through the real sink and asserts the observed metrics and log equal the
projection; `AuditWriteOutcome.tst.ts` pins the illegal states; `AuditWriteOutput.test.ts` pins every
leaf's output as literals written on the ARCH-95 phase base, and `AuditLostAgreement.test.ts`
pins that durability, the lost counter, the span and (over the unwritten leaves) the level agree.

**Related**: [INV-QD-051](#inv-qd-051-staging-presence-or-absence-never-changes-the-committed-audit-entries), [INV-QD-052](#inv-qd-052-once-a-circuit-breaker-trips-write-is-never-attempted-again-until-reset), [INV-QD-104](#inv-qd-104-a-refusal-report-says-where-never-what), [BEH-QD-251](behaviors/33-audit-pipeline.md), [BEH-QD-252](behaviors/33-audit-pipeline.md), [ADR-QD-056](decisions/056-audit-companion-package.md).
## INV-QD-107: A screen never changes what it shows without the reviewer

A list screen shows the item the reviewer chose, or the head it first showed, until the
reviewer chooses another. A new decision, a reorder of the list, an insertion before
the item and the item leaving the list do not change which item is shown. An item that
left the list stays shown and is marked as no longer there; it is never replaced by a
neighbour, and the screen does not empty. Leaving the screen and returning to it is not a
choice.

**Source**: `packages/devtools/src/model/HeldChoice.ts` — `resolveHeld(list, held, same)`
returns `Empty`, `Listed` at an index, or `Evicted`, and `pinHead` holds the first item
shown; `makeHeldChoiceStore` is the same rule as a store. `SimulationSession.ts` and
`ExplorerSession.ts` (policies, `sameSighting`) and the role viewer's store (roles,
`sameRole`) each supply a list and an equality, and none of them keeps an index as the
choice or holds it in view state. `DevtoolsDock` owns all three, so no screen's unmounting
takes a choice with it. `packages/devtools/src/model/DockSession.ts` holds the dock's own
choices the same way: the tab, the log's filters and the selected row's key, which a new
timeline does not move; `packages/devtools/src/model/DockModel.ts` (`makeDockModel`) owns all four
stores, and `DevtoolsDock` owns that model through `useDockModel`
(`packages/devtools/src/react/useDockModel.ts`). The highlight lens's pick is held the same
way: `packages/devtools/src/model/LensSession.ts` holds it by the id of its guard, as the
model's tenth store (`DockModel.ts`), so a tab switch, which unmounts the React panel, keeps
it, only `choose` or `toggle` replaces it, and a guard that has gone marks no row and moves
the pick to no other.

**Enforcement**: the tests of each held choice, `HeldChoice.test.ts`, `ExplorerSession.test.ts`,
`SimulationSession.test.ts`, `SeededChoice.test.ts` and `DockSession.test.ts`, and for the
lens pick `packages/devtools/test/model/LensSession.test.ts` and
`packages/devtools/test/react/Lens.dock.characterisation.test.tsx` ("a pick, then a switch to
the log and back"; "a pick whose guard unmounted marks no row, and the guard mounted in its
place is not marked").

**Implication**: before it, each screen held a position and clamped it, so a decision
that moved the chosen policy made the dropdown, the tree and the next simulation run show
another policy with nothing to say so. Keying by the policy and not by a label follows
ADR-QD-048 ("a label is a display string, never an identity"). `Equal.equals` is
required and `===` is not: each decision record is decoded on its own, so a sighting's
policy object is replaced when a newer decision on it arrives.

**Enforcement**: `packages/devtools/test/model/HeldChoice.test.ts` — every arm of
`resolveHeld`, a reorder, a head insertion, an eviction, duplicates, and a property over
permutations; `packages/devtools/test/model/SimulationSession.test.ts` (reorder, head
insertion, a run after the rail moved, eviction and its run, the pinned head),
`packages/devtools/test/model/ExplorerSession.test.ts` (the held choice, and a
model-based property whose first check is that the shown policy changes only on a choice,
a different load or an apply), `packages/devtools/test/model/HeldChoice.test.ts` (the
store), `packages/devtools/test/react/DevtoolsDock.test.tsx` (the tab round trips),
`packages/devtools/test/react/Simulator.test.tsx`,
`packages/devtools/test/model/DockSession.test.ts` (the tab and the filters survive a new
timeline, a selection survives a filter, a command that changes nothing publishes
nothing); `packages/devtools/test/model/DockModel.test.ts` (the choices survive a held
head, a tab change and a capacity change, M8, M9 and M11, and nothing is dispatched for an
unchanged input, M10); `features/devtools-simulator` under
`@REQ-QD-026` and `features/devtools-screens` under `@REQ-QD-025`; `stryker.devtools.mjs`
mutates `HeldChoice.ts`, `ExplorerSession.ts`, `DockSession.ts` and `DockModel.ts`.

**Related**: [INV-QD-039](#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival), [INV-QD-041](#inv-qd-041-a-structural-view-states-no-verdict), [BEH-QD-211](behaviors/28-devtools-screens.md), [BEH-QD-322](behaviors/29-devtools-simulator.md#beh-qd-322-a-simulation-is-a-session).

> **Amended 2026-11-23 (ADR-QD-187, CCR-QD-466).** The simulator's list and equality are supplied by
> `packages/devtools/src/model/SeededChoice.ts` (`resolveHeld` and `pinHead` over the rail, with
> `sameSighting`), the pure value `SimulationSession.ts` holds in place of a `makeHeldChoice` cell. Its
> reorder, head-insertion and pinned-head cases are pinned by
> `packages/devtools/test/model/SeededChoice.test.ts`; a run after the rail moved and an eviction's run
> stay in `SimulationSession.test.ts`. See [ADR-QD-187](decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md).

---

## INV-QD-108: A handed-over value is the evaluated resource

Every entry point that hands over a value, whole or projected, decided on that same value, or, for `enforceProjected`, on no resource.

**Source**: `packages/core/src/Handover.ts` — `decidedOn` sets the value handed over as the resource and `resourceFree` removes one; `RELEASE` releases the value that was decided on, whole or projected, and is the only place `project` is applied; `handOver` does both per item. `HandoverOptions` types `resource` as `never` on all eight entry points that hand over a value (`enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard`, `filter`, `filterStream`, `filterProjected`, `filterStreamProjected`), so a second resource cannot be written, and an untyped caller's is dropped at runtime. `enforce` and `assert` hand over no value, so they are not in the list and keep `EnforceOptions`.

**Implication**: `enforceProjected` took `options.resource` and projected whatever `self` returned, with no check that the two were one record. A policy with a "public" branch granting `secret` and a "private" branch withholding it, evaluated against a public stub while `self` returned the private record, projected the secret: the decision was taken on one record and applied to another. `guard` had the same two-channel defect and closed it under [INV-QD-032](#inv-qd-032-a-guarded-resource-is-the-evaluated-resource); this is the third instance of an input the decision depends on never reaching the thing that decides (after `guard` and the cache key, [ADR-QD-043](decisions/043-a-decision-is-computed-from-its-inputs.md)). The reverse hazard remains named, not hidden: the loader runs before the decision, so its side effects, its failure and its latency are visible to a caller who is then denied ([ADR-QD-104](decisions/104-a-projected-read-decides-against-the-value-it-projects.md)).

**Enforcement**: `packages/core/test/Handover.test.ts` — the effect-shapes and collection-shapes tables (the value decided on is the value handed over and released, a denial hands nothing over, a binding obligation with no handler is refused first) and the smuggled resource; `packages/core/test/Qadi.test.ts` — the mirror of the two-channel hazard (the private record's `secret` is not projected, which kills a mutant dropping `resource: value`), a resource-reading policy never failing `MissingResource`, a loader failure taking no decision and recording none, the decision record's resource being the loaded value, an undischarged binding obligation failing before the value is handed over, the composed coarse gate never running the loader, and `filterProjected` projecting per item; `packages/core/test/Qadi.tst.ts` and `packages/promise/test/Facade.tst.ts` — `resource` is refused by every entry point that hands over a value; `features/features/field-visibility/field-visibility.feature` — a record's own owner decides which fields come back.

**Related**: [INV-QD-032](#inv-qd-032-a-guarded-resource-is-the-evaluated-resource), [INV-QD-331](#inv-qd-331-the-array-and-stream-forms-of-a-collection-entry-point-agree-on-who-passes-in-order), [BEH-QD-324](behaviors/07-enforcement.md#beh-qd-324-a-projected-value-is-the-evaluated-resource), [ADR-QD-043](decisions/043-a-decision-is-computed-from-its-inputs.md), [ADR-QD-104](decisions/104-a-projected-read-decides-against-the-value-it-projects.md), [ADR-QD-156](decisions/156-a-handed-over-value-is-decided-through-one-module.md).

---

## INV-QD-130: A purge never selects a row its archive does not hold

For any `entries`, `RetentionPolicy`, `now` and `VerifiedArchive`, every row in `planPurge(entries, policy, now, archive).purge` is past its age (INV-QD-101) and is held by `archive`, counted: the number of structurally equal rows purged never exceeds the number the archive holds. Every other age-expired row is in `retain` and in `unarchived`. A `VerifiedArchive` exists only as the result of `readAuditArchive` over a stored bundle that decodes, matches its declared count, has no sequence gap or duplicate, is in the order `archiveAuditTrail` writes and does not claim a verification it cannot back. Every bundle `archiveAuditTrail` writes, stored as JSON and parsed back, is such a bundle: the reader checks the order, claim and sequence break the writer built it from, computed by the same function.

**Source**: `packages/audit/src/Retention.ts` — `planPurge`, the only function returning rows to delete; `packages/audit/src/AuditArchive.ts` — `readAuditArchive` and `VerifiedArchive`, whose `#private` member means no object literal is assignable to it; `packages/audit/src/ArchiveFacts.ts` — `archiveFacts`, the one computation of the order, claim and break both sides use ([ADR-QD-110](decisions/110-an-archives-facts-are-computed-once.md)).

**Implication**: "archive before purge" was a sentence in three doc comments and the README, and the package's own selector returned rows to delete that it knew nothing about. It is now the type of the function's fourth argument, and what counts as "archived" is what a store handed back, not what the caller believes. A `VerifiedArchive` is evidence of what the bytes say and nothing more: it does not prove the store is durable, the bytes are untampered, the trail is complete or the retention period adequate, and it must never be described as such (ADR-QD-016: durability and tamper-evidence are out of scope; ADR-QD-056). The compile-time guard does not stop a caller who forges the value by reflection.

**Enforcement**: the property in `packages/audit/test/Retention.test.ts` (random entries, a random sub-multiset archived through `archiveAuditTrail`, `JSON`, `readAuditArchive`: `purge` is a sub-multiset of the archive and equals the smaller of the eligible and archived copies of each row); the examples there (empty archive, edited row, renumbered row, two identical rows, sibling row, a round trip through `decodeAuditEntry`); `packages/audit/test/Retention.tst.ts` and `AuditArchive.tst.ts` (no call without an archive, no forged archive); `packages/audit/test/AuditArchive.test.ts` (one test per `ArchiveRefusal`); `packages/audit/test/ArchiveRoundTrip.test.ts` (the reader accepts every bundle the writer writes for sequenced, unsequenced and mixed inputs in any order; each `ArchiveRefusal` fires on its own tampering with its payload; any reordering is refused at the first entry that sorts before its predecessor).

**Related**: [INV-QD-053](#inv-qd-053-retained-and-purged-partition-entries), [INV-QD-054](#inv-qd-054-verifysequenceintegrity-detects-every-gap-and-duplicate-sequence-number), [INV-QD-101](#inv-qd-101-retention-never-selects-a-row-without-a-finite-age-past-a-valid-limit), [BEH-QD-253](behaviors/33-audit-pipeline.md#beh-qd-253-retention-partitions-entries-by-construction), [BEH-QD-254](behaviors/33-audit-pipeline.md#beh-qd-254-sequence-integrity-verification-detects-a-gap-or-a-duplicate-and-trusts-neither-write-order), [ADR-QD-056](decisions/056-audit-companion-package.md), [ADR-QD-110](decisions/110-an-archives-facts-are-computed-once.md).
---

## INV-QD-120: A signature recorded for a discharge is keyed by the question it discharged

A signature recorded while an obligation is discharged is stored under the pair `SignatureHistory` is later asked with, `(subjectId, resourceId)`, both derived from the discharged question. A resource-scoped `hasSignature` on that resource finds it, one on any other resource does not, and a subject-global (`scope: "Any"`) one does not find a signature recorded for a resource. A discharge whose resource has no string `id` records nothing and is refused. A ledger read answers only what was stored under the key asked.

**Source**: `packages/core/src/Resource.ts` — `resourceIdOf`, the writer's reading of the id rule `askSignature` reads with (a string `id`, else none); `packages/audit/src/SignatureCapturePort.ts` — `captureRequestOf` carries `resourceIdOf(question.resource)` and the signer `question.subject.id`; `packages/audit/src/SignatureCapturePort.ts` — `signatureObligationHandler` fails `SignatureCaptureError` before `capture` when the question has a resource with no string id; `packages/audit/src/SignatureLedger.ts` — `ledgerEntryOf` builds the entry, `ledgerKeyOf` is the one key, called on both the write and the read side, and `signatureHistoryFromLedger` derives the exact-pair read from it and fails the read on an entry stored under another key or signed by someone other than its subject.

**Implication**: the loop obligation -> capture -> `SignatureHistory` -> `hasSignature` did not close. The capture request carried no resource, so a flow that stored what it captured stored it with none; the default-scope `hasSignature` then denied ("no signatures are on file") and a `scope: "Any"` one allowed for every resource, which is wider than the signer attested, since the signing act was about one document. A write key and a read key that are computed in two places can drift; here they are one function ([ADR-QD-105](decisions/105-an-obligation-is-discharged-against-the-question-it-answered.md), [ADR-QD-117](decisions/117-a-signature-ledger-is-a-keyed-store.md)). ARCH-59 found two ways the first version of this was not true. A resource with a numeric or object `id` was recorded subject-wide, so every `scope: "Any"` check with that meaning allowed on every resource, while the reader refuses the same resource as `MissingResourceId`. And the ledger interface handed each adapter the read rule, so an adapter written in the common SQL "optional filter" idiom type-checked and granted on another resource.

**Enforcement**: `packages/audit/test/SignatureLoop.test.ts` — the loop in both modes (the capture port persists under the request's key, and the ledger): the discharged resource is satisfied, another resource is not, `scope: "Any"` is not; `packages/audit/test/SignatureLedger.test.ts` — the refusal of a resource with a numeric, object or absent id (capture not called, nothing recorded), the ledger's keying through `signatureHistoryFromLedger`, a copy per read, a foreign or forged row failing the read, mismatch and ledger-failure refusals, a differential against `signatureHistoryFromSignatures` over adversarial pairs, the key's partition law against the requirement-free projection of `signatureHistoryPort.key` (a query carrying `meaning` or `signerRole` reads the same pair) and its golden bytes; `packages/audit/test/SignatureLedger.tst.ts` — the keyed shape; `packages/audit/test/SignatureLedgerConformance.test.ts` — six wrong adapters each reported with their exact violations; `packages/core/test/Resource.test.ts` — `resourceIdOf`; `features/features/signatures/signatures.feature`.

**Related**: [INV-QD-055](#inv-qd-055-signatureobligationhandler-calls-capture-exactly-once-and-the-obligationrecord-matches), [INV-QD-013](#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation), [BEH-QD-326](behaviors/33-audit-pipeline.md#beh-qd-326-a-signature-captured-for-a-discharged-question-answers-that-question-and-no-other), [BEH-QD-339](behaviors/33-audit-pipeline.md#beh-qd-339-a-ledger-adapter-can-be-checked), [ADR-QD-058](decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md), [ADR-QD-105](decisions/105-an-obligation-is-discharged-against-the-question-it-answered.md), [ADR-QD-117](decisions/117-a-signature-ledger-is-a-keyed-store.md).

---

## INV-QD-180: `/__permissions` lists what `@qadi/http` enforces, and only that

For every endpoint an application serves through `@qadi/http`, `PermissionRegistry` lists the endpoint under permission P if and only if the middleware or route that serves it enforces P on it. `guardApi` lists and its middleware enforces from one access plan, built once from the `HttpApi` value it was given; an endpoint value outside that plan is refused, never served. A surface that enforces registers as a consequence of being built; a composition that would list an endpoint nothing enforces is refused at layer build, and at compile time where the type is precise.

**Source**: `packages/http/src/GuardApi.ts` — `guardApi`, the only way to obtain `RequirePermission`'s middleware, registers each `Required` endpoint of its access plan when built and fails (registering nothing) with `MisplacedAccessDeclaration`, `RequirePermissionNotAttached` or `AccessNotDeclared`; `packages/http/src/AccessPlan.ts` — `planApi` builds the plan once from the `HttpApi` value, and `packages/http/src/RequirePermissionMiddleware.ts` refuses an endpoint value the plan does not hold; `packages/http/src/GuardRoute.ts` — `addGuardedRoute`, the bare-route half, registers in the same layer that adds the route.

**Implication**: two layers used to do this, composed independently. Forgetting `registerApi` left `/__permissions` claiming to list every permission the application enforces while omitting every `HttpApi` endpoint; attaching the middleware wrongly (`.middleware(RequirePermission).add(group)`, which Effect documents as not applying to endpoints added afterwards) did the opposite, listing an endpoint as guarded while it was served to anyone. Five in-repo compositions enforced an `HttpApi` without `registerApi`, one of them the package-install gate's consumer fixture. BEH-QD-180 already said the registry MUST list a permission only if it is enforced; with two layers nothing could make that true. One join remained after ARCH-36: the middleware recognised its API by `"<group>/<endpoint>"` identifier strings, so an API reusing a group and endpoint name (a versioned API, a factory) was served under another API's vetting — enforcing `document:write` on a path the registry listed nothing for, or serving a public endpoint (ARCH-59, ADR-QD-118). Membership is now by endpoint value. The ARCH-36 residual is unchanged: a vetted path that is never mounted stays listed (`guardApi(A)` on `HttpApiBuilder.layer(A.prefix("/v1"))` refuses `/v1/a` and still lists `GET /a`), because registration happens at layer build from the value `guardApi` was given and `HttpApiBuilder` never tells the middleware which value it serves; every served path is listed and enforced.

**Enforcement**: `packages/http/test/accessPlan.test.ts` — the differential over every placement of a declaration, through `guardApi` and a request: refused at build, or listed under P if and only if P is enforced; `packages/http/test/GuardApi.test.ts` — registration with no second call, a refused build registers nothing, the membership refusal by value (six collision and `prefix` cases), the undeclared refusal and the precedence, two APIs each with their own `guardApi`; `packages/http/test/GuardApi.tst.ts` — the compile-time attachment refusal and the layer's requirements.

**Related**: [INV-QD-034](#inv-qd-034-an-endpoints-authorization-is-declared-not-inferred), [BEH-QD-328](behaviors/23-http.md#beh-qd-328-a-guarded-httpapi-is-registered-by-the-layer-that-guards-it), [BEH-QD-180](behaviors/23-http.md#beh-qd-180-the-registry-answers-which-permission-not-which-policy), [BEH-QD-320](behaviors/23-http.md#beh-qd-320-an-endpoints-access-is-read-once-from-the-endpoint), [ADR-QD-036](decisions/036-qadi-http-package-shape.md).
---

## INV-QD-170: A decision agrees with its trace

A `Decision`'s verdict, `visibleFields`, `obligations` and `reason` are its trace root's: an `Allow` is built from a trace whose root allows and carries that root's fields and duties, a `Deny` from one whose root denies and carries its reason (or `"denied"` when the root has none). A value that arrives already carrying both copies is accepted only when they agree: a decoded record's decision agrees with its own trace, its `evaluationId` and `subjectId` are the record's, and its trace root names the record's policy tag; a `Disclosed` hydration seed agrees with its own trace. Fields are compared byte for byte, so `undefined` (every field) and `[]` (none) disagree (INV-QD-004).

**Source**: `packages/core/src/Decision.ts` — `makeDecision` (the one constructor), the `Allow` and `Deny` constructors (a stamp and a trace; the derived fields cannot be passed), and `decisionDisagreement` with its closed `DecisionDisagreement` union (the one rule, its equivalences derived by `Schema.toEquivalence` from the codec schemas); `packages/core/src/DecisionWire.ts` — `decodeDecision` builds through `makeDecision` after the rule; `packages/core/src/SinkCodec.ts` — the record-level `EvaluationId`, `SubjectId` and `PolicyTag` comparisons, refused as `DecodeRefusal.Inconsistent`; `packages/react/src/HydrationEngine.ts` — `entryAgrees`, a disagreeing `Disclosed` seed dropped as `MalformedEntry`; `scripts/check-house-style.mjs` — `no-decision-constructor-outside-decision`.

**Implication**: the verdict, the fields and the duties were stored twice and nothing compared them, so a contradictory record (a trace that denies beside an `Allow`, a restricted trace beside an `Allow` showing every field, a binding duty dropped) decoded, projected the wrong fields and re-encoded unchanged, and the devtools log and inspector read different copies of one evaluation. What this closes is contradiction, not forgery: the wire is not signed, so a record that is consistently forged still decodes (ADR-QD-039: a seed is not an authority, and the client's own answer supersedes it, INV-QD-028). The codec's own `V2_DECIDED_ALLOW` golden and main round-trip fixture were disagreeing records that no evaluator produces; they are corrected, inside the trace only, and the wire format does not change.

**Enforcement**: `packages/core/test/Decision.tst.ts` — a disagreeing `Allow` or `Deny` does not compile; `packages/core/test/DecisionAgreement.test.ts` — each arm of the rule, `undefined` against `[]`, nested duty attributes, and the properties that `makeDecision` over any trace and every decision `evaluate` produces agree with their traces; `packages/core/test/SinkCodecAgreement.test.ts` — ten hand-built contradictory records refused with the exact disagreement, and a property that each one-field contradiction of an evaluated record is refused while the record itself decodes; `packages/core/test/Decision.test.ts` and `DecisionWire.test.ts` — the constructors and the wire round trip; `packages/devtools/test/model/Source.test.ts` — a frame dropped as an `Inconsistent` refusal; `packages/react/test/HydrationPayload.test.ts` — four forged disclosures dropped, a mutated-trace property, and the evaluated control.

**Related**: [INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top), [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it), [INV-QD-059](#inv-qd-059-a-seeded-decision-never-claims-a-trace-it-was-not-given), [INV-QD-096](#inv-qd-096-whatever-the-record-codec-emits-it-accepts), [INV-QD-098](#inv-qd-098-a-decoded-decision-record-has-exactly-the-outcome-its-sender-sent), [INV-QD-103](#inv-qd-103-a-trace-lines-up-with-its-policys-explanation-position-by-position), [ADR-QD-106](decisions/106-a-decision-is-constructed-from-its-trace.md).


---

## INV-QD-241: A remote port fails where its store fails

A port answered through `answerRemotely` and asked through `askRemotely` gives the asker the answer the serving port gave, or the port's own typed error, and nothing in between. A store that fails or dies on the answering side is `Unavailable` on the wire and the port's typed error on the asking side (with a `RemotePortError` as its `cause`); `"Unknown"` crosses only as an `Answered` value the serving port returned. A question about any subject but the session's is refused (`SubjectMismatch`), one outside the host's serving declaration is refused (`NotServed`), a malformed one is refused (`Malformed`), and an answer with no JSON form is refused (`Unencodable`), none of them ever thrown. No server cause text reaches the asker.

**Source**: `packages/core/src/PortRemote.ts` — `answerRemotely` (decode, then the subject against `CurrentSubject`, then the declaration, then `servePortRead`, then `encodeAnswer`; it never fails), `askRemotely` (every non-answer is `d.failure(args, RemotePortError)`), and the hoisted `replyOutcome`; `packages/core/src/PortWire.ts` — the closed `PortWireReply`, `PortWireRefusal` and `RemotePortFailure`; `packages/core/src/PortAccess.ts` — `servePortRead`, the only way a served question reads a port; `packages/core/src/PortWireEncode.ts` and `JsonHazard.ts` — strict decode, depth bound and the refusal of a value with no JSON form.

**Implication**: the newsroom example answered a relationship or history outage with `200 "Unknown"`, which the evaluator denies on and which `not(hasRelationship("banned"))` turns into a grant (INV-QD-006), and read an unrecognised 2xx body as `"Unknown"` for the same effect. The wire has no value that means "the store was down" except a failure, so there is nothing for a negation to flip. The subject rule closes the other half: the route used to answer the cookie's subject under the asked subject's name, so a devtools simulator asking about someone else was told a confident wrong answer.

**Enforcement**: `packages/core/test/PortConformance.test.ts` — the wire cases for every registry row (question and answer round trips through JSON text including `none.answer`, malformed and widened questions, malformed answers); `packages/core/test/PortWire.test.ts` — an attribute value round-trips, a value with no JSON form is refused and never thrown, `toJson` detaches, `__proto__` stays a key; `packages/core/test/PortRemote.test.ts` — per registry row: answered, an outage and a dying store as the port's own error with no cause text, a question about another subject, a question outside the declaration, a malformed body, a transport failure, an unreadable reply; the `not(hasRelationship)`, `hasNotActed`, `hasRelationship` and attribute failures; a serving `RelationshipResolverNever` still denies; `servingFor` admits every question `evaluate` asks for a generated policy; `packages/core/test/PortServe.test.ts` — the served span, metric and defect mapping per row; `packages/core/test/PortWire.tst.ts` — a description without a wire, or with the wrong answer type, does not compile; `packages/http/test/PortRoutes.test.ts` — the same per row over `HttpRouter.toWebHandler`, the status table, `no-store`, the guarded and unguarded forms; `examples/nextjs-newsroom/test/port-routes.test.ts` and `port-subject.test.ts` — the example's routes and browser adapters.

**Related**: [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-014](#inv-qd-014-an-unwired-history-port-denies-both-polarities), [INV-QD-044](#inv-qd-044-a-span-never-carries-a-resolved-attributes-value), [INV-QD-095](#inv-qd-095-every-port-is-described-once-and-every-derived-layer-agrees-with-its-description), [BEH-QD-329](behaviors/34-remote-ports.md#beh-qd-329-an-outage-on-the-answering-side-reaches-the-asker-as-the-ports-own-error), [ADR-QD-107](decisions/107-a-port-is-answered-remotely-through-its-description.md).

---

## INV-QD-243: Every @qadi/http request path enforces and logs through one module

Every `@qadi/http` surface that extracts a subject does so through `packages/http/src/AuthorizeRequest.ts`, so one request is logged the same way whichever surface serves it: a `SubjectExtractionFailed` is logged exactly once (Error); an edge denial exactly once, annotated `"edge"`; a handler-raised denial exactly once, annotated `"handler"`; a resolver outage not at all at the edge; and every enforcement failure is answered by the projection the caller supplied. No caller extracts a subject, taps a denial or catches an enforcement failure itself.

The public mode (`enforcePublic`) is one of these paths: a `publicEndpoint` runs its handler as `anonymous` through the module's handler step, so a denial its own `guard` raises is logged once, annotated `"handler"`, and every failure is answered by the caller's projection ([BEH-QD-359](behaviors/23-http.md#beh-qd-359-a-public-endpoint-logs-a-denial-its-own-handler-raises)).

**Source**: `packages/http/src/AuthorizeRequest.ts` — `extractSubject` (the one `tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed)` in the package), `authorizeRequest` (the edge step and its `"edge"` tap), the handler step (the one handler-denial tap annotated `"handler"` and the one `catchTag(HTTP_ENFORCEMENT_TAGS, …)`), `enforceRequest` (guarded mode), `enforceSubject` (subject-only mode), `enforcePublic` (public mode); and the five callers: `GuardRoute.ts` (`addGuardedRoute`'s bare-route adapter), `RequirePermissionMiddleware.ts` (its `Required` arm through `enforceRequest`, its `Public` arm through `enforcePublic`), `DecisionStreamRoute.ts`'s recheck, and `PortRoutes.ts`'s `portRoutes` and `portRoutesUnguarded`.

**Implication**: the handler step was written five times and the copies drifted. `portRoutesUnguarded` extracted its subject by hand and answered a credential-store outage 502 with no log line, where every guarded path logs it (INV-QD-006: a failure is reported, not absorbed). One copy of the tap and the catch means a surface cannot forget either, and a sixth surface writes a projection and a handler. What this does not change: which table answers each failure (`ENFORCEMENT_ERROR_WIRE`, ADR-QD-102) and which of the five projections a surface uses.

**Enforcement**: `packages/http/test/RequestEnforcement.test.ts` — the caller × failure table, a mapped type over six callers (the `publicEndpoint` row among them) and six failure columns, asserting the projected result and the exact enforcement lines (level, text, `qadi.denial_site`) or their absence, with the not-applicable cells pinned and each carrying a reason; `packages/http/test/PortRoutes.test.ts` — the ENF-03 regression, an unguarded route logs a subject-extraction failure once and never reads the port; `packages/http/test/RequestEnforcement.tst.ts` — a closed handler error leaves the projection's error channel at `never`, an open one adds exactly `unhandled`, `CurrentSubject` is discharged from the handler, and the subject-only mode needs no standing services; `packages/http/test/http.test.ts` — each route's own body shape and redaction over the module, and a public endpoint's handler-raised denial logged once as the handler's while an outage's cause text stays out of the body.

**Related**: [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-180](#inv-qd-180-permissions-lists-what-qadihttp-enforces-and-only-that), [BEH-QD-359](behaviors/23-http.md#beh-qd-359-a-public-endpoint-logs-a-denial-its-own-handler-raises), [BEH-QD-321](behaviors/23-http.md#beh-qd-321-one-authorization-step-at-the-http-edge), [BEH-QD-335](behaviors/23-http.md#beh-qd-335-a-request-is-enforced-through-one-module), [BEH-QD-336](behaviors/23-http.md#beh-qd-336-an-unguarded-port-route-logs-a-subject-extraction-failure), [ADR-QD-036](decisions/036-qadi-http-package-shape.md), [ADR-QD-108](decisions/108-a-request-is-enforced-once-through-one-module.md).

---

## INV-QD-244: A port's span says the same thing whoever asked

A port's span carries the same attributes whether the port was read by `evaluate`, by `toPredicate`, or on behalf of a remote asker through `servePortRead`: for one request, the question attributes are the description's `pose(request)`, the answer attributes are its `disclose(answer, request)`, and the only attribute that differs is `qadi.interpreter`. That holds when the port answers, fails, dies or throws.

**Source**: `packages/core/src/PortAccess.ts` — `readPort`, the one body of every port read (annotate the question, count, invoke inside the effect `catchPortDefect` wraps, convert a defect, annotate the answer), which the six `ask*` reads and `servePortRead` all run; and each port description's `attributes.pose` and `attributes.disclose` (`AttributeResolver.ts`, `RelationshipResolver.ts`, `CustomPredicate.ts`, `DecisionHistory.ts`, `SignatureHistory.ts`), the one projection. `PortWire` states no span.

**Implication**: an agreement property in the family of INV-QD-018 and INV-QD-043: two statements of one fact are how it drifts, and it drifted once. The served signature span projected `{ subjectId, scope, resourceId }` and an empty answer where the local one carried the asker's `qadi.meaning`, `qadi.signer_role` and the answer `qadi.matched`, and a served read of a store that threw escaped `catchPortDefect` as a defect where the local read failed with the port's typed error. Both were found by ARCH-47. What this does not change: a span still carries no resolved attribute's value (INV-QD-044), and `qadi.on_file` is recorded on neither span.

**Enforcement**: `packages/core/test/PortAccess.test.ts` — the per-port table, a mapped type over the registry, asserting that a local read and a served read of the same request leave equal spans for every row, answered, failing, dying and throwing, plus a missing resource id still leaving its question; `packages/core/test/PortRemote.test.ts` — the remote end to end, a signature question asked through `askRemotely` over `answerRemotely` leaving two agreeing spans, and a throwing store answered `Unavailable`; `packages/core/test/Evaluate.test.ts` and `Predicate.test.ts` — the literal-key span assertions; `packages/core/test/PortServe.test.ts` — a served read's span, metric and defect mapping.

**Related**: [INV-QD-044](#inv-qd-044-a-span-never-carries-a-resolved-attributes-value), [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows), [INV-QD-043](#inv-qd-043-a-snapshot-answers-what-the-live-layer-answered), [BEH-QD-227](behaviors/30-port-calls.md), [BEH-QD-332](behaviors/34-remote-ports.md#beh-qd-332-a-served-read-must-open-the-ports-span-with-qadiinterpreter--remote), [ADR-QD-109](decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md).

---

## INV-QD-250: A resumed read loses nothing

For every connection to a decision log's stream and every record frame *c* on it, the records of the frames up to and including *c*, together with the backlog of a read resumed after *c*'s `id`, are exactly the records the first read's backlog held that the log still retains and the codec encodes: none missing, none sent twice.

**Source**: `packages/core/src/DecisionStream.ts` — `encodeDecisionStream` sends the backlog sorted by `cursor.seq` whatever order `readEntries` returned it in, so the `id`s rise along a connection and the last one a reader saw is its highest position; `packages/core/src/DecisionLog.ts` — `readEntries(after)` keeps the entries with `seq` above the resume cursor's. The two agree only because the encoder sorts; `@qadi/http`'s route is that stream written as SSE text (`sseText`), stating no order of its own.

**Implication**: the backlog used to travel in `storedRecordOrder` (by `at`), and `at` is an evaluation's start time while a record is appended at its end, so overlapping evaluations that finish out of start order, and every `Edge` record an aggregator ingests, put `at` order and position apart. A connection cut after a backlog frame resumed after a later position than records not yet sent, and those were skipped, silently: no error, no `onMalformed`, a backlog that was simply short. A resume after the whole prelude also re-sent the reader's records. What this does not cover: a record evicted while the reader was away is gone (the log is a display buffer, BEH-QD-201), and a server older than ARCH-60 still sends `at` order, so a fixed reader still loses against it.

**Enforcement**: `packages/core/test/DecisionStream.test.ts` — "resume: a reconnect after any record frame loses no retained record and repeats none", 100 generated histories (arrival order independent of `at`, `NaN` and `Edge` records, records the codec refuses, capacities that evict), cut after every record frame and resumed from its `id`; it fails with the encoder's sort removed. The same file's round-trip property and "frames the backlog in cursor order, whatever order the log returned it in". `packages/http/test/decisionStream.test.ts` — "a reconnect loses nothing" (during the backlog, and after it) through the route's real response; `features/features/decision-log/decision-log.feature` — "A reconnect during the backlog loses nothing", through the route, the platform SSE parser and `sourceFromEventSource`.

**Related**: [INV-QD-100](#inv-qd-100-a-log-reader-sees-every-retained-record-exactly-once), [INV-QD-039](#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival), [BEH-QD-316](behaviors/26-decision-stream.md#beh-qd-316-a-reconnect-resumes-where-it-left-off), [BEH-QD-349](behaviors/26-decision-stream.md#beh-qd-349-a-resumed-stream-loses-and-repeats-nothing), [ADR-QD-097](decisions/097-a-decision-log-is-a-sink-and-its-own-history.md).

---

## INV-QD-251: A supplied reporter cannot change a hydration outcome

For every reporter `@qadi/react` accepts — `onDropped` on either end of hydration, `onHydrationMismatch`, `onGateIdCollision`, `onIdCollision` and `onDeveloperSignal` — the values returned, the atoms seeded, the counters moved and the re-checks made are the same whether the reporter returns or throws. A reporter that throws is announced as `ReporterThrew`, naming the hook and the error (`name: message`) and never an entry, in every environment.

**Source**: `packages/react/src/DeveloperSignals.ts` — the one resolver, `reporterFor`, wraps a supplied reporter once (`contain`); `packages/react/src/HydrationEvent.ts` — `emitHydration` counts an event before it announces it; `packages/react/src/HydrationEngine.ts` — the work is planned as events first and the events emitted after it, so no reporter runs inside the work it reports.

**Implication**: found by probing, not by looking. A throwing `onDropped` made `hydrateDecisions` (which must not throw) throw and seed nothing, and made `dehydrateDecisions` throw after it had counted the foreign entries; `onHydrationMismatch` was called unguarded inside the decision atom's read, so a throw reached React's render. The announcement is made in production too, because the host replaced the default and nothing else will say it.

**Enforcement**: `packages/react/test/DeveloperSignals.test.ts` — "a supplied reporter that throws": every entry point of every row, and a non-`Error` throw, each in development and in production, the throw not propagating and `ReporterThrew` naming the hook and the error only; `packages/react/test/DeveloperSignalReporters.test.tsx` — the `makeQadiAtoms` re-check probe, in both environments ("a throwing onHydrationMismatch is named in development, and the re-check and the mismatch are counted" and its production twin); `packages/react/test/HydrationEngine.test.ts` — "a throwing reporter changes nothing": the same seeds, payload, counts and re-check as with a reporter that returns.

**Related**: [INV-QD-045](#inv-qd-045-no-entry-leaves-hydration-unaccounted-for), [BEH-QD-146](behaviors/19-hydration.md#beh-qd-146-a-payload-is-bound-to-one-subject-and-fails-closed), [BEH-QD-152](behaviors/19-hydration.md#beh-qd-152-a-superseded-seed-is-announced), [BEH-QD-230](behaviors/19-hydration.md#beh-qd-230-a-payload-that-seeds-nothing-says-why), [ADR-QD-041](decisions/041-a-mismatch-is-announced.md), [ADR-QD-052](decisions/052-hydration-is-counted-where-both-ends-can-see-it.md).

---

## INV-QD-257: Each simulation input field is described once

Each of `SimulationInput`'s seven list-or-record fields (roles, permissions, subject attributes, resolver attributes, relationships, history and signatures) has exactly one row in one closed table, and every operation the simulator performs on a field is derived from that row: the weakening drop, the remedy's grant, the subject rename, the replay's unseeded entry, the fixture port the field feeds, the chip commands and the form's reading. A field without a row, a row without a column, or a port in `@qadi/core`'s registry without a fixture cell does not compile.

**Source**: `packages/devtools/src/model/SimulationFields.ts` — `SIMULATION_FIELDS` (a record closed over `SimulationField`), `FIELD_ORDER`, `fieldOps` (each field's drops, held elements and chip commands), `grant`, `renameSubject`, `formOf`, `unseededReason` and `FIXTURE_DATA` (keyed by `PortName`); and the consumers that fold over it: `Edits.ts`'s `singleEdits`, `Remedies.ts`'s `remedyFor` (its held-field arms), `Replay.ts`'s unseeded list, `SimulationSource.ts`'s fixture setups and `SimulationSession.ts`'s `addChip`, `removeChip` and `snapshot.fields`.

**Implication**: six modules each restated a field's facts (where it lives in the input, its codec, its equality, who an element names, what dropping it is called). When `signatures` gained its form field, five were told and the weakening sweep was not, so a `hasSignature` allow swept to a table that never asked *was it the signature?* With one row per field, a new field is a compile error in the table, not a silent gap in one consumer. What this does not cover: the action, a resource attribute and a custom predicate are not held fields, so their remedies are written in `Remedies.ts` directly, and `hasCustom` is reported as a named skip because its answer comes from Snapshot or Live ([BEH-QD-222](behaviors/29-devtools-simulator.md#beh-qd-222-a-what-if-sweep-varies-the-input-in-both-directions)).

**Enforcement**: `packages/devtools/test/model/SimulationFields.test.ts` — per field, a chip is added by its codec, a refused or empty text moves nothing, a second commit of one element follows the field's rule, a chip is removed by index; the record fields' key order and `__proto__` as a key; attribution, `renameSubject`, the form's reading, `grant`, the fixture cells, and one weakening per distinct element; `packages/devtools/test/model/SimulationFields.tst.ts` — the table has a row for every field, a row without a column is not a description, each Drop kind belongs to exactly the rows that name it, and the fixture table is keyed by the registry's ports; `Edits.test.ts`, `Remedies.test.ts`, `WhatIf.test.ts` and `Replay.test.ts` (each unseeded row names its `key`) — the consumers, unedited across the fold; `SimulationSession.test.ts` and `Simulator.test.tsx` — the chip commands through the session; `packages/devtools/test/surface.tst.ts` — the four types the session names are exported and the table itself is not.

**Related**: [INV-QD-095](#inv-qd-095-every-port-is-described-once-and-every-derived-layer-agrees-with-its-description), [BEH-QD-222](behaviors/29-devtools-simulator.md#beh-qd-222-a-what-if-sweep-varies-the-input-in-both-directions), [BEH-QD-225](behaviors/29-devtools-simulator.md#beh-qd-225-a-replay-says-what-it-could-not-seed), [BEH-QD-322](behaviors/29-devtools-simulator.md#beh-qd-322-a-simulation-is-a-session), [ADR-QD-047](decisions/047-a-headless-devtools-model.md), [ADR-QD-094](decisions/094-a-port-is-described-once.md).

---

## INV-QD-259: A metric has one declaration, and its readers import it

For every `qadi_*` metric id there is exactly one module-scope `Metric` declaration, in `packages/*/src`; no test, feature or example declares one. A `@qadi/core` metric is exported (an untagged base whose series are exported excepted), every reader reads it through its export, and a literal id appears only in a budgeted pin. Every declaration is one row of one table, by id, type and file.

**Source**: the declaring modules — `packages/core/src/EvaluationMetrics.ts` (six), `PortMetrics.ts` (five) and `HydrationMetrics.ts` (five), `packages/audit/src/AuditWriteReport.ts` (three) and `CircuitBreaker.ts` (one), and each predicate compiler's package-private `src/CompileMetrics.ts` (one); the table "Every metric Qadi declares" in `spec/behaviors/25-inspection.md` ([BEH-QD-368](behaviors/25-inspection.md#beh-qd-368-a-metric-is-declared-once-and-read-through-its-export)); `scripts/check-house-style.mjs`'s `[metric-declaration]`, `[metric-table]` and `[metric-id-literal]` rules (`METRIC_ID_LITERAL_BUDGET`, `METRIC_BASE_UNEXPORTED`).

**Implication**: Effect keys a metric on its type, id, description and attributes, so a second declaration of one id with a drifted description forks a series that reads zero and still compiles ([ADR-QD-052](decisions/052-hydration-is-counted-where-both-ends-can-see-it.md)); and a test that matched an id string in a snapshot kept passing after the id was renamed, so a "not counted" test could pass vacuously. Read through the export, a rename is a compile error at every reader. What this does not cover: which registry a reader looks at — an off-fiber write (hydration's) lands in the default registry, whatever a host wires.

**Enforcement**: `packages/core/test/EvaluationMetrics.test.ts` — the registry key an exporter sees, pinned as a golden, and the declaration pins; `HydrationMetrics.test.ts`, `packages/audit/test/Metrics.test.ts`, `packages/predicate-sql/test/Metrics.test.ts` and `packages/predicate-prisma/test/Metrics.test.ts` — each declaration's pin; the three house-style rules under `pnpm lint`, checked in both directions; every other metric test reads by reference (`Metric.value(<export>)`), so its literal-id budget is zero.

**Related**: [BEH-QD-368](behaviors/25-inspection.md#beh-qd-368-a-metric-is-declared-once-and-read-through-its-export), [BEH-QD-197](behaviors/25-inspection.md#beh-qd-197-port-activity-is-counted), [BEH-QD-189](behaviors/25-inspection.md#beh-qd-189-a-lookup-reports-how-the-cache-answered), [ADR-QD-123](decisions/123-a-metric-is-declared-once.md), [ADR-QD-052](decisions/052-hydration-is-counted-where-both-ends-can-see-it.md).

## INV-QD-280: A request key is Equal's text

Two requests to a port share a key exactly when every argument is `Equal.equals`, an absent field and an `undefined` one alike, over the domain `PortKey.ts` states (primitives, `Date`, `RegExp`, arrays, plain and null-prototype objects, `Set`, `Map`, and subclasses of the five containers keyed as their base class). A value outside that domain gets a typed `KeyRefusal`, never a throw and never a shared text, and every consumer fails closed on it.

**Source**: `packages/core/src/PortKey.ts` (`canonicalKey`, package-private: kind-tagged, self-delimiting tokens, sorted object keys, sorted `Set` and `Map` members, an explicit stack); `packages/core/src/PortDescription.ts` (`key: (args) => Result<string, KeyRefusal>`, `KeyRefusal`, `UnkeyableKind`, `describeKeyRefusal`); each port module's description keys through `canonicalKey`.

**Implication**: the library has one definition of request identity. `Question` and `DecisionCache` already called two requests the same with `Equal.equals`; the JSON key behind replay and `replyTable` disagreed with them (a `Date` and its ISO string, `NaN` and `null`, `{ a: undefined }` and `{}`, a `Set` and its array), so a replay or a scripted double could answer one question with another's answer (ARCH-65). One stated limit: an object marked `Equal.byReference` keys by its structure, because the mark lives inside `effect` and a replay cannot preserve identity.

**Enforcement**: `packages/core/test/PortKey.test.ts` — the law as a fast-check property in both directions, the collision examples, the refusal per kind, and the stack-safety checks; `packages/core/test/PortConformance.test.ts` — "every argument reaches the key", per port; `packages/core/test/PortDescription.test.ts` — a derived port's key is its wire question's key, as a property (ARCH-69); `packages/core/test/PortDescription.test.ts` and `packages/core/test/SignatureHistory.test.ts` — `replyTable` and the signature fixture fail closed on a refusal; `packages/devtools/test/model/Capture.test.ts` — a refused request is never captured and fails on replay, and a `Date` param's capture does not answer its ISO string (ARCH-65).

**Related**: [INV-QD-043](#inv-qd-043-a-snapshot-answers-what-the-live-layer-answered), [BEH-QD-409](behaviors/06-services.md#beh-qd-409-a-request-key-agrees-with-equal-over-its-domain), [BEH-QD-410](behaviors/06-services.md#beh-qd-410-a-request-the-key-refuses-fails-closed), [ADR-QD-094](decisions/094-a-port-is-described-once.md).

---

## INV-QD-285: A devtools route and its client agree on one address

The decision stream, its backlog and the permission registry answer at `devtoolsPath(route, prefix)` for the prefix they were mounted under, and a client that reaches them with the same prefix computes the same path. No other `@qadi/http` module spells a devtools path.

**Source**: `packages/http/src/DevtoolsRouteAddress.ts` (`devtoolsPath`, a zero-import leaf exported from the root); `DecisionStreamRoute.ts`, `DecisionBacklogRoute.ts` and `PermissionRegistryRoute.ts` mount at `devtoolsPath(route, options?.prefix)`; `DevtoolsRoutes.ts` (`devtoolsRoutes`) passes one prefix to all three.

**Implication**: three path literals and a hand-written client URL (`"/api/__decisions"` in the Next.js example's dock) used to restate one address four times, and no constructor took a prefix, so a host that mounted the routes anywhere but the root broke its own client with no error (ARCH-66). A prefix moves a route and never unguards it.

**Enforcement**: `packages/http/test/DevtoolsRouteAddress.test.ts` — the round trip under `/x/devtools` for all three routes, the default paths 404 there, 403 for a denied or absent subject at every prefixed path, and the unguarded registry's warning naming its prefixed path; `packages/http/test/DevtoolsRoutes.test.ts` — the same through `devtoolsRoutes`; `features/features/decision-log/decision-log.feature` ("A reader follows the host's prefix") — `@qadi/devtools`' real reader at `devtoolsPath("decisions", prefix)`, and a 404 at the unprefixed path.

**Related**: [BEH-QD-419](behaviors/26-decision-stream.md#beh-qd-419-each-devtools-route-answers-at-one-address-and-its-client-derives-it), [BEH-QD-420](behaviors/26-decision-stream.md#beh-qd-420-one-guarded-call-mounts-the-devtools-surface), [BEH-QD-338](behaviors/23-http.md#beh-qd-338-the-port-routes-and-their-client-share-one-address), [ADR-QD-130](decisions/130-the-devtools-surface-is-one-guarded-mount.md).

---

## INV-QD-286: A derived port's key names exactly its wire question's members

For `AttributeResolver`, `RelationshipResolver`, `DecisionHistory` and `SignatureHistory`, a request's key is `canonicalKey` of the question its description's `toQuestion` builds (an absent member dropped), which is the question `encodeQuestion` encodes, so two requests share a key exactly when they ask the same question. A port built with `makePortDescription` states no `key` and no `defect`, and its `toQuestion` and its span's `pose` cannot leave a member out. `CustomPredicate` states its own key and defect.

**Source**: `packages/core/src/PortDerivation.ts` (`makePortDescription`, `DerivedWireSpec`), `packages/core/src/PortWireEncode.ts` (`QuestionOf`, `presentMembers`, `portWire`), `packages/core/src/PortSpanEncode.ts` (`PoseOf`, `portSpan`); each of the four port modules builds its description with `makePortDescription`.

**Implication**: the four hand-written key tuples were typed `unknown[]`, so a forgotten field compiled, and only `PortConformance.test.ts`'s rows saw it (shown by hand: dropping `signerRole` from `SignatureHistory`'s key passed `tsc` and failed exactly two rows). Evaluation never reads a port key (`DecisionCache` and `Question` use `Equal.equals`), so the harm was a wrong devtools replay or a wrong `replyTable` answer, which can hide or invent a decision during review; it was never a production grant (ARCH-69).

**Enforcement**: `packages/core/test/PortDescription.test.ts` — the ARCH-69 law, a FastCheck property per derived port over a closed `DerivedPort` table (the key is the encoded question's key, the defect is the failure of the squashed cause), and `CustomPredicate`'s own key covering what its question does not; `packages/core/test/PortRequest.tst.ts` — a question or a pose that leaves a member out is not assignable to its slot; `packages/core/test/PortSpan.test.ts` — each port's encoded span attributes, full and sparse; `packages/core/test/PortWire.test.ts` — the wire bytes of every port's question; `packages/core/test/PortConformance.test.ts` — "every argument reaches the key" and the wire round-trip rows, the runtime net under the compile-time one.

**Related**: [INV-QD-280](#inv-qd-280-a-request-key-is-equals-text), [INV-QD-095](#inv-qd-095-every-port-is-described-once-and-every-derived-layer-agrees-with-its-description), [INV-QD-044](#inv-qd-044-a-span-never-carries-a-resolved-attributes-value), [BEH-QD-440](behaviors/06-services.md#beh-qd-440-a-derived-port-states-no-key-and-no-defect), [BEH-QD-441](behaviors/06-services.md#beh-qd-441-a-ports-question-and-span-question-name-every-member), [ADR-QD-094](decisions/094-a-port-is-described-once.md), [ADR-QD-133](decisions/133-a-port-request-is-derived-from-its-wire-question.md).

---

## INV-QD-288: A scoped port read never reaches its port without a resource id

A read of `DecisionHistory` at Resource scope, of `RelationshipResolver` or of `SignatureHistory` whose resource is absent, has no `id` or has an `id` that is not a string fails with `MissingResourceId` before its port is called. It leaves the port's own span, carrying the question and the failure, and no other span, and counts no call, on every one of the three ports.

**Source**: `packages/core/src/ScopedLeaf.ts` (`requireResourceId`, the one missing-id test in the package, which `readScoped` and the two fixture judgements call), `packages/core/src/PortAccess.ts` (`readScoped`, which records the question on the port's span before it fails with the test's error, and the closed `completeRequest` table that completes a request whose id is known); each scoped port's `asks` entry reads the id through `resourceIdOf` (`packages/core/src/Resource.ts`), and for the two ports whose leaf has a `scope` (`DecisionHistory`, `SignatureHistory`) through `scopedResourceIdOf` (`packages/core/src/ScopedLeaf.ts`), whose test, `isResourceScoped`, is also the test the read routes on.

**Implication**: the check was written three times, and two copies opened a nested `qadi.requireScopedResourceId` span while the third inlined the check to avoid one, so the trace of a wiring error depended on which port was asked. For `RelationshipResolver` the guarantee is structural: its call type requires a `resourceId`, and `completeRequest` can only build one from the id the read checked. For `DecisionHistory` and `SignatureHistory` the request type leaves `resourceId` optional (it is absent on an `Any`-scoped question), so the guarantee rests on one fact, the leaf's `scope`, deciding both what the request carries and which read answers it: `scopedResourceIdOf` and the read's routing share the one `isResourceScoped` test, so a `Resource`-scoped leaf is never asked subject-wide, and a law test pins it over every shape of site (ARCH-70).

**Enforcement**: `packages/core/test/PortAccess.test.ts` — "a missing resource id still leaves its question on the span (D-07)", one table over the three scoped ports pinning the span list (the port's span only), the question, `MissingResourceId.relation`, that the port is not called and that no call is counted; `packages/core/test/PortAccess.test.ts` — "a scoped read reaches its port only with the id its leaf's scope calls for (INV-QD-288)", over an absent, id-less, non-string-id and usable-id site: a `Resource`-scoped acted or signature leaf calls the port only with the site's id and fails with `MissingResourceId` otherwise, an `Any`-scoped one calls it with none, so it fails if the request's id and the read's routing ever disagree on the leaf's scope; `packages/core/test/PortAccess.tst.ts` — no read takes loose strings, each takes the leaf it answers; `packages/core/test/Evaluate.test.ts` — the `MissingResourceId` rows for each leaf through `evaluate`.

**Related**: [BEH-QD-445](behaviors/30-port-calls.md#beh-qd-445-a-missing-resource-id-fails-the-same-way-on-every-scoped-port), [BEH-QD-227](behaviors/30-port-calls.md#beh-qd-227-a-port-span-says-what-it-asked), [INV-QD-006](#inv-qd-006-failure-is-not-denial), [ADR-QD-051](decisions/051-a-span-says-what-was-asked.md), [ADR-QD-134](decisions/134-a-resource-scoped-port-read-is-one-read.md).

---

## INV-QD-289: The name `servingFor` serves for a leaf is `asked` of the request that leaf's read builds, at any site

For every port and every policy tag its `asks` states, the name the port's `serving.asked` reads from the request `asks` builds for the leaf at a site is the same at every read site, and `servingFor` of a policy holding that leaf admits it. What a host serves for a leaf is therefore exactly what a read of that leaf asks, because both are derived from the one entry in the description's `asks`.

**Source**: each port module's `asks` (`packages/core/src/{AttributeResolver,RelationshipResolver,DecisionHistory,CustomPredicate,SignatureHistory}.ts`), `LeafRequests`, `ReadSite` and `LeafOf` (`packages/core/src/PortDescription.ts`), `servingFor` and its `SERVING_SITE` (`packages/core/src/PortRemote.ts`), and the facet's `asked` and `declare` (`packages/core/src/PortServing.ts`).

**Implication**: the facet used to state the name each leaf asks (`leaves`) separately from the request each read built, and only a property test kept the two in agreement. `servingFor` reads each request at one site, an anonymous subject asking about no resource, which is sound only if the name does not depend on the site; that is this invariant, so a new port-reading leaf is one `asks` entry and cannot be served under a name a read does not ask (ARCH-70).

**Enforcement**: `packages/core/test/PortRemote.test.ts` — "a served name is what a leaf's request asks (ARCH-70)", the law per port and tag over generated leaves and sites (200 runs each), and the property that every question `evaluate` asks of a port for a generated policy is admitted by `servingFor([policy])`; `packages/core/test/PortAsks.tst.ts` — every description has `asks`, the facet has no `leaves`, and each entry's result is a request the facet reads a name from.

**Related**: [BEH-QD-446](behaviors/34-remote-ports.md#beh-qd-446-the-request-a-policy-leaf-asks-a-port-is-stated-once-and-servingfor-serves-exactly-the-names-those-requests-ask), [BEH-QD-331](behaviors/34-remote-ports.md#beh-qd-331-a-served-question-outside-the-hosts-serving-declaration-must-be-refused), [INV-QD-095](#inv-qd-095-every-port-is-described-once-and-every-derived-layer-agrees-with-its-description), [ADR-QD-114](decisions/114-a-port-states-what-it-serves.md), [ADR-QD-134](decisions/134-a-resource-scoped-port-read-is-one-read.md).

---

## INV-QD-290: A record's class and its wire envelope list the same fields

For each sink record tag, the fields of the record class and the fields of the version-2 wire envelope (apart from `_tag`, `version` and a decision's `outcome`, which each side states for itself) are one list, the record's `Schema.Struct` in `SinkRecordFields.ts`. A field cannot be written to the wire and dropped on read, or read back and never written, and a field added to the struct reaches the class, the wire, the projection and the rebuild with no other edit.

**Source**: `packages/core/src/SinkRecordFields.ts` (`decisionRecordFields`, `obligationRecordFields`, `ObligationOutcomeSchema`, `CacheOutcomeSchema`, the two record tags), `packages/core/src/DecisionRecord.ts` (each class typed by its struct's `Type`), and `packages/core/src/SinkCodec.ts` (the wire structs spread the leaf; `project` and `rebuild` name no envelope field).

**Implication**: the record's fields were written five times (the class, the wire struct, `project`, `rebuild` and the brand re-application in `rebuild`), and a field dropped from `project` or `rebuild` compiled; the old suite caught three scratch mutations of that kind only because hand-written fixtures happened to carry the field (ARCH-71). The record types, the wire and the literals `CacheOutcome` and `ObligationOutcome` are now derived, so the closed-union rule holds by construction.

**Enforcement**: `packages/core/test/SinkRecord.tst.ts` — the constructor input of `DecisionRecord` and `ObligationRecord` is exactly the leaf struct's `Type` (plus the decision's `outcome`), the public record types, `ObligationOutcome`, `CacheOutcome` and `SinkRecordJson`'s per-tag keys are pinned; `packages/core/test/SinkCodec.test.ts` — "every record shape round-trips (ARCH-71)" over both tags and every optional key, and the encoded-value key pins; `packages/core/test/Errors.tst.ts` — `SinkRecordTag` is exactly `SinkRecord["_tag"]`.

**Related**: [BEH-QD-450](behaviors/25-inspection.md#beh-qd-450-a-records-wire-envelope-is-its-fields-plus-a-version-stated-once), [INV-QD-096](#inv-qd-096-whatever-the-record-codec-emits-it-accepts), [INV-QD-170](#inv-qd-170-a-decision-agrees-with-its-trace), [ADR-QD-135](decisions/135-sink-record-fields-stated-once.md), [ADR-QD-095](decisions/095-sinkcodec-owns-both-directions.md), [ADR-QD-002](decisions/002-schema-derived-policy-adt.md).

---

## INV-QD-296: The dock's stores never disagree about the timeline

After any sequence of records, clears, pauses and catalogue changes, the dock session's counts and rows, the policy rail the explorer reads and the policy rail the simulation reads are those of the one timeline the dock shows. No screen reads a timeline another screen has already left, and a pause, which changes how the timeline is read and not which one is shown, leaves the rails alone.

**Source**: `packages/devtools/src/model/DockModel.ts` — the sightings rail is a derived store over the one timeline store the model reads and the held catalogue, which computes `catalogueOf` once per change; the explorer's and the simulation's sightings are its two listeners and the dock session's timeline a listener of the timeline, each subscribed before any host's, so each hears a change before the host does ([ADR-QD-194](decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md)).

**Implication**: the dock used to push the timeline into its stores from separate layout effects, so each store was one effect behind the others for as long as a render took, and the order the effects ran in was a rule nobody stated. A reviewer who saw the counts of one timeline beside the rail of another had no way to tell which was current. One push per change makes the agreement structural, and the model's test checks it for a generated sequence rather than for the cases someone thought of (ARCH-74).

**Enforcement**: `packages/devtools/test/model/DockModel.test.ts` — P1, a property over generated sequences of `accept`, `clear`, `setPaused` and `configure` whose every check compares the dock session's counts and rows and both rails with the timeline the model shows; M1, M7 and M12, the cases for a new timeline, a replay and a clear; `stryker.devtools.mjs` mutates `DockModel.ts`.

**Related**: [INV-QD-107](#inv-qd-107-a-screen-never-changes-what-it-shows-without-the-reviewer), [INV-QD-039](#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival), [BEH-QD-465](behaviors/28-devtools-screens.md#beh-qd-465-the-dock-is-one-model), [ADR-QD-047](decisions/047-a-headless-devtools-model.md).

---

## INV-QD-305: Every untrusted JSON seam is guarded by construction

Every decode of untrusted JSON in library source runs the depth guard before the strict decode, because the only strict decode there is `untrustedDecoder`'s, and `decode` and `decodeText` are the only way in. A seam cannot skip the guard, and cannot decode with options that loosen the strictness or the bound, because neither the options nor the depth walk is reachable outside `@qadi/core`'s `UntrustedDecode.ts`. The guard runs over the projection the seam's stated `unknownKeys` policy leaves, so an undeclared top-level key under `ignore` is outside it by [INV-QD-360](#inv-qd-360-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input); every declared key is still walked.

**Source**: `packages/core/src/UntrustedDecode.ts` (`untrustedDecoder`, the private `UNTRUSTED_DECODE_OPTIONS`, `MAX_DECODE_DEPTH`) and `packages/core/src/DecodeDepthGuard.ts` (`exceedsJsonDepth`, package-private); the seams that build a decoder from it: `Policy.ts`, `SinkCodec.ts`, `PortWireEncode.ts`, `PortRemote.ts`, `packages/audit/src/AuditArchive.ts`, `AuditEntry.ts` and `packages/react/src/HydrationEngine.ts`.

**Implication**: eight seams used to assemble the guard and the strict decode by hand, and `PolicyFromJson`, a schema that decoded untrusted text, had no guard at all, so a payload nested tens of thousands of levels deep raised a raw `RangeError` out of `Schema`'s recursive descent instead of a typed refusal. A ninth seam written by copying the nearest one would have repeated whichever mistake that one carried. The recipe is now stated once, and a seam keeps only a total mapping from the closed `UntrustedRefusal` into its own error (ARCH-78, ADR-QD-143).

**Enforcement**: `packages/core/test/UntrustedDecode.test.ts` — the property that the refusal kind is a function of the input and is `TooDeep` exactly when `exceedsJsonDepth` is, on both sides of the bound, never throwing, and the order tests (the guard before `prepare`, `prepare` before the decode); `packages/{core,react,audit}/test/UntrustedSeams.test.ts` — one refusal-precedence table per seam, including a value 60,000 deep that must not throw; `packages/core/test/UntrustedDecode.tst.ts` — the closed refusal and the `prepare` tag collision; the `[untrusted-decode]` rule in `scripts/check-house-style.mjs` (`UNTRUSTED_DECODE_BUDGET`, AGENTS.md §7a), which fails any strict decode, depth-guard call, `Schema.decode*` or `JSON.parse` in `packages/*/src` outside the six budgeted files.

**Related**: [BEH-QD-486](behaviors/08-serialization.md#beh-qd-486-untrusted-json-is-decoded-through-one-decoder), [BEH-QD-487](behaviors/08-serialization.md#beh-qd-487-fromjson-says-when-the-text-is-not-json), [BEH-QD-059](behaviors/08-serialization.md#beh-qd-059-decoding-rejects-hostile-input), [INV-QD-096](#inv-qd-096-whatever-the-record-codec-emits-it-accepts), [INV-QD-097](#inv-qd-097-the-record-codec-is-total), [INV-QD-359](#inv-qd-359-one-option-states-an-envelopes-unknown-key-policy-and-no-seam-hand-builds-it), [INV-QD-360](#inv-qd-360-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input), [ADR-QD-143](decisions/143-untrusted-json-is-decoded-through-one-module.md), [ADR-QD-002](decisions/002-schema-derived-policy-adt.md), [ADR-QD-170](decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md).

---

## INV-QD-306: An unwalked slot is `unknown` and has its own guarded decoder

A top-level key a seam names in `unwalked` is typed `unknown` (or `ReadonlyArray<unknown>`) in the schema, is left out of the guard's walk, and is decoded by a second decoder from its own root, so a value in it nested past the bound is refused by that decoder as `TooDeep` and never reaches `Schema` unguarded. The three slots are hydration's `entries`, the audit archive's `entries` and the audit row's `record`. The stored envelope's `record` is a fourth, left unwalked and handed to `decodeSinkRecord` from its own root. No option loosens the strictness or the bound for a declared key, except for an undeclared top-level key under `ignore` ([INV-QD-360](#inv-qd-360-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input)), which is not a declared key.

**Source**: `packages/core/src/UntrustedDecode.ts` (`UnwalkedKey`, the `unwalked` option and `walked`), `packages/react/src/HydrationEngine.ts` (the envelope's `entries`, each entry and its policy), `packages/audit/src/AuditArchive.ts` (`entries`, each through `decodeAuditEntry`) and `packages/audit/src/AuditEntry.ts` (`record`, through `decodeSinkRecord`).

**Implication**: leaving a slot out of the walk is only safe if something else walks it, and if the schema typed it as something richer the strict decode would recurse into a value the guard never counted. `UnwalkedKey` makes naming a key the schema decodes a compile error, and the second decoder is the guard for the part the first one left out. Hydration used to hand-build `{ ...payload, entries: [] }` for this and so did not say why (ARCH-78, ADR-QD-143). Left out of the walk is not left unread: the slot's own value is read under `refuse` by the walk and again by the strict decode, and under `ignore` once, by the projection ([INV-QD-377](#inv-qd-377-the-ignore-projection-never-reads-an-undeclared-value)), and what lies under it by the second decoder.

**Enforcement**: `packages/core/test/UntrustedDecode.tst.ts` — `unwalked` takes only keys typed `unknown` or `ReadonlyArray<unknown>`; `packages/core/test/UntrustedDecode.test.ts` — a value 60,000 deep in an unwalked slot decodes, and the same value through a walked key is `TooDeep`; `packages/react/test/UntrustedSeams.test.ts` (an entry 60,000 deep is `EntryTooDeep`, no throw), `packages/audit/test/UntrustedSeams.test.ts` (an archive entry whose record is 60,000 deep is `EntryNotDecodable` with a `TooDeep` refusal, no throw).

**Related**: [BEH-QD-486](behaviors/08-serialization.md#beh-qd-486-untrusted-json-is-decoded-through-one-decoder), [BEH-QD-488](behaviors/19-hydration.md#beh-qd-488-a-payload-nested-past-the-bound-outside-its-entries-is-dropped-whole), [BEH-QD-489](behaviors/33-audit-pipeline.md#beh-qd-489-an-archive-nested-past-the-bound-outside-its-entries-is-toodeep-and-each-entry-is-guarded-from-its-own-root), [INV-QD-305](#inv-qd-305-every-untrusted-json-seam-is-guarded-by-construction), [INV-QD-359](#inv-qd-359-one-option-states-an-envelopes-unknown-key-policy-and-no-seam-hand-builds-it), [INV-QD-360](#inv-qd-360-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input), [ADR-QD-143](decisions/143-untrusted-json-is-decoded-through-one-module.md), [ADR-QD-170](decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md).

---

## INV-QD-307: A superseded claim's exit never settles, and its waiters are still answered exactly once

A claim a reset superseded never reaches the adapter's `settle`, whatever its exit and whenever it ends. Every fiber already awaiting it receives its exit exactly once, its compute is interrupted when its last waiter leaves, and the next ask for its key claims afresh.

**Source**: `packages/core/src/SharedComputation.ts` (`Standing`, `afterReset`, `afterLastLeave`, `reset` and the compute's `onExit`) and `packages/core/src/DecisionCache.ts` (`clear` calling `shared.reset()`).

**Implication**: the rule used to be a counter in the adapter, a second mechanism for a fact the module already holds, which claims are in flight, and any second adapter would have had to restate it. One closed standing states it once and leaves no pair of flags with no meaning (ARCH-79, [ADR-QD-132](decisions/132-a-shared-computation-is-joinable-only-while-awaited.md) as amended).

**Enforcement**: `packages/core/test/SharedComputation.test.ts` — the "stale-last race", "stale-first race", "two-key race" and "parked-uninterruptible race" tests, the "reset supersedes in-flight claims: …" test, and "PROPERTY: a reset supersedes its claims" (seed 3101, 300 runs); `packages/core/test/DecisionCache.test.ts` — the two clear-mid-compute pins, unchanged; `stryker.config.mjs` mutates both source files.

**Related**: [BEH-QD-491](behaviors/21-decision-cache.md#beh-qd-491-a-stale-answer-never-re-enters-a-cleared-cache), [BEH-QD-439](behaviors/21-decision-cache.md#beh-qd-439-a-shared-computation-answers-everyone-still-waiting-and-nobody-else), [BEH-QD-190](behaviors/25-inspection.md#beh-qd-190-a-cache-can-be-emptied), [INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity), [ADR-QD-132](decisions/132-a-shared-computation-is-joinable-only-while-awaited.md).

---

## INV-QD-311: The review layer never shadows the decision sink or the decision cache

Under `qadiReviewLayer`, and under core's `testLayer` and `subjectSetLayer`, an outer `DecisionSink` receives every record an evaluation makes and an outer `DecisionCache` is the one consulted and filled.

**Source**: `packages/testing/src/QadiReviewLayer.ts` and `packages/core/test/helpers.ts` build their environment with `shadow: "none"` through `evaluationEnvironment` (`packages/core/src/EvaluationEnvironment.ts`).

**Implication**: a test asserting on records, or on what a cache holds, would pass vacuously under a layer that swallowed them, and a reader comparing the review layer with a simulation could not tell a deliberate pass-through from a forgotten seal. The choice is therefore stated at the call, `shadow: "none"`, rather than implied by the absence of a seal (ARCH-81, [ADR-QD-146](decisions/146-one-evaluation-environment-states-its-shadowing.md)).

**Enforcement**: `packages/testing/test/QadiReviewLayer.test.ts` ("an outer sink receives every record an evaluation under it makes", "an outer decision cache is the one an evaluation under it fills and answers from") and the `none` case of `packages/core/test/EvaluationEnvironment.test.ts`.

**Related**: [BEH-QD-502](behaviors/06-services.md#beh-qd-502-an-unshadowed-environment-leaves-an-outer-sink-and-cache-in-effect), [INV-QD-042](#inv-qd-042-a-simulation-reaches-no-port-it-was-not-given-and-records-nothing), [INV-QD-312](#inv-qd-312-every-evaluation-environment-states-its-shadowing-and-the-choice-is-one-of-two), [ADR-QD-146](decisions/146-one-evaluation-environment-states-its-shadowing.md).

---

## INV-QD-312: Every evaluation environment states its shadowing, and the choice is one of two

`evaluationEnvironment` cannot be called without `shadow`, and `shadow` is exactly `"none"` or `"sinkAndCache"`. A missing, boolean or unknown value is a compile error.

**Source**: `packages/core/src/EvaluationEnvironment.ts` — `EvaluationEnvironmentOptions.shadow` (required), `EvaluationShadowing`, and the `Match.exhaustive` dispatch that installs each choice.

**Implication**: a default would make either choice silent. `"sinkAndCache"` as the default would have the review layer swallow a test's records without saying so; `"none"` as the default would leave the next simulation-like caller unsealed, the defect INV-QD-042 exists for. The type makes the caller write the choice, and the exhaustive dispatch makes a third choice a compile error at the one place that acts on it (ARCH-81, [ADR-QD-146](decisions/146-one-evaluation-environment-states-its-shadowing.md)).

**Enforcement**: `packages/core/test/EvaluationEnvironment.tst.ts` (a call without `shadow`, with a boolean and with an unknown string is refused), both arms in `packages/core/test/EvaluationEnvironment.test.ts`, and `stryker.config.mjs`, which mutates every file under `packages/core/src` and so the module.

**Related**: [BEH-QD-501](behaviors/06-services.md#beh-qd-501-an-evaluation-environment-is-built-in-one-place-and-states-its-shadowing), [BEH-QD-503](behaviors/06-services.md#beh-qd-503-a-shadowed-environment-records-nothing-outward-and-caches-privately-per-build), [INV-QD-042](#inv-qd-042-a-simulation-reaches-no-port-it-was-not-given-and-records-nothing), [INV-QD-311](#inv-qd-311-the-review-layer-never-shadows-the-decision-sink-or-the-decision-cache), [ADR-QD-146](decisions/146-one-evaluation-environment-states-its-shadowing.md).

---

## INV-QD-313: A poll defect is stated, an interruption never is, and a replaced run never writes

A diagnostics poll that ends on a defect reads `Stopped` with its reason, and a poll that was interrupted (a restart, absent options, the scope closing, even when a layer's release dies as it closes) never does. A run that has been replaced, and every run once its scope has closed, writes neither a sample nor a stop, and a closed feed publishes nothing for `restart()` or `configure`. `sampled` is true exactly when the reading shown holds an accepted sample since the build or the last `Off`.

The timeline feed keeps the same rule for its read: a read that ends on a defect states `Stopped` with its reason, an interruption (a new source, no source, a capacity change, the scope closing) and a source that ends by itself never do, a read that has been replaced writes neither a record nor a stop, and a closed feed publishes nothing for `restart()` (CCR-QD-427).

The gates feed keeps the same rule for its cadence: a replaced cadence (a new questions input, no input, a new interval, the scope closing) and a closed feed run no host code and publish nothing, so a tick that was already sleeping when the cadence was replaced, and a registry notification that still reaches a closed feed, change no snapshot (ARCH-103, CCR-QD-447).

**Source**: `packages/devtools/src/model/SupersedingRun.ts` — the current token, the finalizer that ends it before the handle interrupts the run (so a run that fails while the scope closes is a replaced one), and the `onFailure` hook, called only for the current run's failure that is not interrupt-only (`Cause.hasInterruptsOnly`), which separates a defect from an interruption; `packages/devtools/src/model/DiagnosticsFeed.ts`, `packages/devtools/src/model/TimelineFeed.ts` and `packages/devtools/src/model/GatesFeed.ts` — the marking `accept`, guarded by `isCurrent`, that drops a replaced run's sample or records (the diagnostics feed's also sets `sampled` and moves the status to `Live`), and the `onFailure` each feed states its `Stopped` from; the session passes no hook, and its `land` maps every non-success exit of the current run to `Broke`, a self-interrupt included (ADR-QD-150).

**Implication**: a fiber handle drops a dead fiber without a word, so a stopped poll used to leave a reading that looked current; stating the stop is the defect this replaces. The converse holds as hard: an interruption reported as a stop would announce every restart as a failure, and a replaced run's late exit stamping `Stopped` over a fresh run would undo the restart that replaced it (ARCH-82, [ADR-QD-047](decisions/047-a-headless-devtools-model.md) as amended).

**Enforcement**: `packages/devtools/test/model/DiagnosticsFeed.test.ts` under `TestClock`, `packages/devtools/test/model/TimelineFeed.test.ts` (TF9 to TF17), `packages/devtools/test/model/GatesFeed.test.ts` (the closed-feed twins G35, G36 and G42 c, and T4, T8 and T9 for a replaced cadence), `packages/devtools/test/model/SupersedingRun.test.ts` (R3, R9), and `stryker.devtools.mjs`, which mutates `model/**`.

**Related**: [BEH-QD-507](behaviors/28-devtools-screens.md#beh-qd-507-a-defect-stops-the-poll-visibly-and-a-restart-resumes-it), [BEH-QD-519](behaviors/28-devtools-screens.md#beh-qd-519-a-defect-stops-the-timeline-visibly-and-a-restart-resumes-it), [BEH-QD-508](behaviors/28-devtools-screens.md#beh-qd-508-the-diagnostics-and-the-timeline-live-as-long-as-their-owners-scope), [ADR-QD-047](decisions/047-a-headless-devtools-model.md).

---

## INV-QD-314: The merged diagnostics reading is the model's, computed when an input changes, and keeps its identity

> **Amended 2026-11-25 (CCR-QD-475).** The merge is `mergeReading` in `Diagnostics.ts` and carries no questions: the reading it merges is the four fields the poll samples ([INV-QD-412](#inv-qd-412-the-public-diagnostics-holds-exactly-the-fields-the-poll-samples)), and the dock's questions join reads a supplied reading's questions from that reading, beside the merged one ([ADR-QD-196](decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md)).

The reading the Services and React screens show is the merge of the polled reading and the supplied one. The dock model computes it when the feed publishes or the supplied `reading` changes identity, never in `getSnapshot`, so between changes every read returns the same object.

**Source**: `packages/devtools/src/model/DockModel.ts` — `shownReading`, a derived store keyed by the feed's snapshot and the supplied reading, with `mergedOf`, and `mergeReading` in `packages/devtools/src/model/Diagnostics.ts`, which returns the sampled reading itself when nothing is supplied.

**Implication**: a merge in `getSnapshot` or in render returns a new object on every read, and `useSyncExternalStore` then re-renders every screen on every tick whether or not anything moved, which is the defect INV-QD-296's identity rule exists to keep out of the dock (ARCH-82, [ADR-QD-047](decisions/047-a-headless-devtools-model.md) as amended).

**Enforcement**: `packages/devtools/test/model/DockModel.test.ts` (M18 to M28) and the `mergeReading` cases of `packages/devtools/test/model/Diagnostics.test.ts`.

**Related**: [BEH-QD-506](behaviors/28-devtools-screens.md#beh-qd-506-the-diagnostics-poll-is-the-dock-models-seventh-store-with-a-closed-status), [BEH-QD-323](behaviors/28-devtools-screens.md#beh-qd-323-diagnostics-are-sampled-by-the-model-and-a-sample-that-changed-nothing-changes-nothing), [INV-QD-296](#inv-qd-296-the-docks-stores-never-disagree-about-the-timeline), [ADR-QD-047](decisions/047-a-headless-devtools-model.md).

---

## INV-QD-315: One atom set has one sweeper, by construction

However many registries or providers share an atom set, a pressure episode on its question book produces one sweep: the scheduler's pending flag lives in a closure per atom set, and the book's one signal raises it.

**Source**: `packages/react/src/SweepScheduler.ts` — the `pending` flag inside `makeSweepScheduler`, cleared by the episode's own sweep — and `packages/react/src/QuestionBook.ts`'s `signal`, the one place a sweep is requested from.

**Implication**: the provider-owned sweep forked one sweeper per mounted provider and none without one, so the bound depended on how many providers happened to be mounted. A sweeper per registry (an `Atom.runtime` layer is built once per registry that reads it) would repeat that for registries (ARCH-83, [ADR-QD-148](decisions/148-the-atom-set-owns-its-eviction-sweep.md)).

**Enforcement**: `packages/react/test/SweepScheduler.test.ts` (C2, C7, C9, C10), `packages/react/test/QadiAtoms.sweep.test.ts` (S2, S9) and `packages/react/test/QadiProvider.sweep.test.tsx` (P1 to P5); `stryker.react.mjs` mutates `SweepScheduler.ts`.

**Related**: [INV-QD-105](#inv-qd-105-a-live-question-is-never-evicted-and-one-question-has-one-handle-while-tracked), [INV-QD-316](#inv-qd-316-a-sweep-never-runs-on-the-render-path-or-inside-the-dispose-then-reread-window), [BEH-QD-512](behaviors/09-react.md), [ADR-QD-148](decisions/148-the-atom-set-owns-its-eviction-sweep.md).

---

## INV-QD-316: A sweep never runs on the render path or inside the dispose-then-reread window

The question book only signals; the sweep it asks for runs on a fiber that begins with `Effect.yieldNow`, so it starts after the signalling call has returned.

**Source**: `packages/react/src/QuestionBook.ts` — an admission and a release call `signal` and never `sweep` — and `packages/react/src/SweepScheduler.ts`, whose episode is `Effect.yieldNow` followed by the sweep.

**Implication**: a render reads on the render path, and a recompute disposes a reader's lifetime and re-reads in one synchronous step, where a held question reads as zero readers. A sweep in either place would see that question as cold and drop it, which is what INV-QD-105 forbids (ARCH-83, [ADR-QD-148](decisions/148-the-atom-set-owns-its-eviction-sweep.md)).

**Enforcement**: `packages/react/test/QuestionBook.test.ts` (B7), `packages/react/test/SweepScheduler.test.ts` (C1), `packages/react/test/QadiAtoms.sweep.test.ts` (S3, S4) and the four registry-timing pins in `packages/react/test/v4-reactivity-smoke.test.ts`.

**Related**: [INV-QD-105](#inv-qd-105-a-live-question-is-never-evicted-and-one-question-has-one-handle-while-tracked), [INV-QD-315](#inv-qd-315-one-atom-set-has-one-sweeper-by-construction), [BEH-QD-513](behaviors/09-react.md), [ADR-QD-148](decisions/148-the-atom-set-owns-its-eviction-sweep.md).

---

## INV-QD-317: A seed outlives a registry's idle removal, but never the client's answer or its question's row

A hydrated seed is held by its question's handle in the atom set's book and reached through a grant a registry holds, so a registry removing an idle node cannot lose it, the question's eviction forgets it, and `AnnounceState.announced` stops it being read once this registry's client has answered, including after the question's decision atom is rebuilt.

**Source**: `packages/react/src/SeededQuestion.ts`'s `makeSeededQuestion` — the `seeds` `WeakMap` keyed by `SeedGrant`, the keepAlive `grantAtom`, `seededIn`, and the `announced` guard in `read`.

**Implication**: the registry reclaims a node nothing holds one macrotask after it is created, and a seed is not held by a reader until a gate reads it, so every later reader found nothing and the gate rendered `Pending`. Making the seed node alive would have returned a spent allow after a remount ([INV-QD-028](#inv-qd-028-a-seed-never-outlives-the-clients-own-answer)) and pinned a node for every question asked ([ADR-QD-149](decisions/149-a-seed-is-held-by-its-question.md)).

**Enforcement**: `packages/react/test/QadiProvider.seed.test.tsx` (SD1 to SD5), `packages/react/test/Hydration.lifetime.test.ts` (HL1 to HL7), `packages/react/test/SeededQuestion.test.ts` (a seed slot gives each registry its own grant), `packages/react/test/QadiAtoms.test.ts` (a seeded question, through the atom set's own runtime) and the registry-timing canaries in `packages/react/test/v4-reactivity-smoke.test.ts`.

**Related**: [INV-QD-028](#inv-qd-028-a-seed-never-outlives-the-clients-own-answer), [INV-QD-105](#inv-qd-105-a-live-question-is-never-evicted-and-one-question-has-one-handle-while-tracked), [BEH-QD-517](behaviors/19-hydration.md#beh-qd-517-a-seed-lasts-until-this-client-answers-or-its-question-is-dropped), [ADR-QD-149](decisions/149-a-seed-is-held-by-its-question.md).

---

## INV-QD-318: A registry holds a grant node only for a question it was seeded for

`hydrate` hands a registry one keepAlive grant per verified entry; a read never creates a grant node, so a registry that was not seeded for a question holds no node for it, and one question's seed is never reachable from another registry's grant.

**Source**: `packages/react/src/SeededQuestion.ts`'s `seededIn`, which asks `registry.getNodes()` and never `registry.get`.

**Implication**: a keepAlive atom that every read creates a node for leaves one pinned node per question asked, hydrated or not, in every registry; a seed held by the atom set alone is read by every registry over it, including another request's on a server, where an atom set is module scope ([ADR-QD-149](decisions/149-a-seed-is-held-by-its-question.md)).

**Enforcement**: `packages/react/test/Hydration.lifetime.test.ts` (HL3, HL5 and HL7), `packages/react/test/SeededQuestion.test.ts` and `packages/react/test/QadiAtoms.test.ts` (a registry given no grant holds no grant node; an unhydrated question leaves none after a computation has run).

**Related**: [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it), [INV-QD-105](#inv-qd-105-a-live-question-is-never-evicted-and-one-question-has-one-handle-while-tracked), [BEH-QD-518](behaviors/19-hydration.md#beh-qd-518-a-seed-reaches-only-the-registries-it-was-given-to), [ADR-QD-149](decisions/149-a-seed-is-held-by-its-question.md).

---

## INV-QD-319: Only the current run lands, and nothing starts or lands after close

A devtools store writes a run's result (a record, a sample, a stop, a snapshot) only while that run's token is current. Once the owner's scope closes, no token is current and no run starts: a `begin` after the close gives a token that is never current, and a `fork` of it starts nothing.

**Source**: `packages/devtools/src/model/SupersedingRun.ts` — `isCurrent`, `begin` (which makes no token current after the close) and the finalizer registered after the handle, which clears the current token and marks the module closed before the handle interrupts the run; and each store's guarded write, `accept` in `TimelineFeed.ts` and `DiagnosticsFeed.ts` and `land` in `SimulationSession.ts`.

**Implication**: a stale run's late write over a newer one, or a run that starts after close, is the defect class the three hand copies each had to get right and did not agree on; one module that owns the token makes the guard a property of the run and not of each store. It holds for a store built in a sequential scope, the default: a `Scope.make("parallel")` forks its finalizers and voids the order, and no store is built in one ([ADR-QD-150](decisions/150-a-scoped-run-that-a-newer-run-supersedes.md)).

**Enforcement**: `packages/devtools/test/model/SupersedingRun.test.ts` (R1 to R10 and the `PROPERTY` describe, which runs random command sequences against a model) and `stryker.devtools.mjs`, which mutates `model/**`.

**Related**: [BEH-QD-521](behaviors/28-devtools-screens.md#beh-qd-521-a-superseded-run-never-lands-and-a-newer-run-interrupts-it), [BEH-QD-523](behaviors/28-devtools-screens.md#beh-qd-523-closing-the-owners-scope-interrupts-the-run-and-is-never-reported), [INV-QD-313](#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes), [ADR-QD-150](decisions/150-a-scoped-run-that-a-newer-run-supersedes.md).

---

## INV-QD-320: A newer run is never interrupted by an older run's start

A `fork` whose token is no longer current starts nothing, and a `fork` requested while another fork's synchronous start is still running is installed after it returns, so the newest run is the one left live and the stale outer run is the one interrupted, to any depth.

**Source**: `packages/devtools/src/model/SupersedingRun.ts` — `fork`'s re-check of the token and the one held slot that `drain` installs, re-checking until nothing is held.

**Implication**: `FiberHandle.runtime` runs a body's synchronous prefix before it installs the fiber, so without the hold an outer install interrupts the run its own prefix started, and the store is left idle with a stale token. A subscriber that restarts a store inside the notification between a `begin` and its `fork` is the same class one step earlier ([ADR-QD-150](decisions/150-a-scoped-run-that-a-newer-run-supersedes.md)).

**Enforcement**: `packages/devtools/test/model/SupersedingRun.test.ts` (R11 to R16 and the `PROPERTY` describe's nested body), `packages/devtools/test/model/TimelineFeed.test.ts` (TF21 to TF23), `packages/devtools/test/model/DiagnosticsFeed.test.ts` (F28, F29) and `packages/devtools/test/model/SimulationSession.runs.test.ts` (SR5).

**Related**: [BEH-QD-524](behaviors/28-devtools-screens.md#beh-qd-524-a-restart-issued-before-the-run-starts-leaves-the-newest-run-live), [BEH-QD-525](behaviors/28-devtools-screens.md#beh-qd-525-a-restart-issued-from-a-runs-synchronous-start-leaves-the-newest-run-live), [INV-QD-319](#inv-qd-319-only-the-current-run-lands-and-nothing-starts-or-lands-after-close), [ADR-QD-150](decisions/150-a-scoped-run-that-a-newer-run-supersedes.md).

---

## INV-QD-323: Each hydration drop reason has exactly one kind, and the kinds partition the reasons

Every hydration drop reason is a row of one table with exactly one of three kinds (`dehydration`, `payload`, `entry`). The reasons of the three kinds are pairwise disjoint and together are every reason. `@qadi/react`'s whole-payload group is the `payload` kind and its per-entry group the `entry` kind. The reasons' order is the table's declaration order.

**Source**: `packages/core/src/HydrationMetrics.ts` (the module-private table and its `satisfies` constraint, `HydrationDropRow`, `HydrationDropReasonOf`) and `packages/react/src/HydrationEvent.ts` (`PayloadRefusalReason`, `EntryDropReason`).

**Implication**: a reason in both groups would be both refused whole and dropped per entry, and one in neither would be counted under no event. Stating the kind on the row makes the partition a property of the declaration rather than of three lists kept in step by hand ([ADR-QD-152](decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md)).

**Enforcement**: `packages/core/test/HydrationMetrics.tst.ts` (the partition, the kinds written out, a kind-less and a fourth-kind row refused), `packages/react/test/Hydration.tst.ts` (the groups partition the client reasons and are written out), `packages/core/test/HydrationMetrics.test.ts` (the nine written out in order, read off the metric at zero), and react's three records, each total over its kind, `entryBuckets` and `dehydrationBuckets` in `HydrationBuckets.ts` and `PAYLOAD_PRODUCERS` in `HydrationEngine.ts`, so a new row of any kind is a compile error in react until its bucket or its producer is stated ([INV-QD-385](#inv-qd-385-every-hydration-drop-reason-has-one-stated-source-and-one-reporting-path)).

> **Amended in CCR-QD-462 (ARCH-117).** The Enforcement named the engine's former entry record, which covered the entry kind only; the three records now cover every kind ([ADR-QD-183](decisions/183-hydration-drop-events-are-derived-from-their-buckets.md)).

**Related**: [BEH-QD-230](behaviors/19-hydration.md#beh-qd-230-a-payload-that-seeds-nothing-says-why), [BEH-QD-231](behaviors/19-hydration.md#beh-qd-231-what-crossed-the-network-is-counted-at-both-ends), [INV-QD-045](#inv-qd-045-no-entry-leaves-hydration-unaccounted-for), [ADR-QD-152](decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md), [ADR-QD-183](decisions/183-hydration-drop-events-are-derived-from-their-buckets.md).

---

## INV-QD-325: An audit entry's record is the JSON form of the record the strict decode accepted

`decodeAuditEntry` decodes a row's record once, with `@qadi/core`'s strict decoder, and the entry's `record` is that decode's JSON form: an envelope key the wire does not declare is absent, keys are in the schema's order, and an explicitly `undefined` optional field keeps its key as the decode gives it. No second decode, lenient or strict, and no re-encode produces it.

**Source**: `packages/core/src/SinkCodec.ts` (`decodeSinkRecordWithJson`, the private `SinkRecordWithJson`) and `packages/audit/src/AuditEntry.ts` (`decodeAuditEntry`).

**Implication**: what a store persists again and what `Retention` compares is a function of what the strict reader accepted, so the two reads can no longer disagree about a row ([ADR-QD-153](decisions/153-core-owns-describing-a-decode-refusal.md), [ADR-QD-110](decisions/110-an-archives-facts-are-computed-once.md)).

**Enforcement**: `packages/audit/test/AuditEntryDifferential.test.ts` (the entry written out over existing fixtures on the base), `packages/audit/test/AuditEntry.test.ts` (`the entry's record is the strict decode's JSON form`), `packages/core/test/SinkCodec.test.ts` (`decodeSinkRecordWithJson: the record and its JSON form from one decode`), and `UNTRUSTED_DECODE_BUDGET`, under which `@qadi/audit` holds no counted token.

**Related**: [ADR-QD-153](decisions/153-core-owns-describing-a-decode-refusal.md), [ADR-QD-143](decisions/143-untrusted-json-is-decoded-through-one-module.md), [ADR-QD-110](decisions/110-an-archives-facts-are-computed-once.md), [INV-QD-306](#inv-qd-306-an-unwalked-slot-is-unknown-and-has-its-own-guarded-decoder), [BEH-QD-537](behaviors/25-inspection.md#beh-qd-537-a-record-and-its-json-form-come-from-one-strict-decode).

---

## INV-QD-331: The array and stream forms of a collection entry point agree on who passes, in order

For one policy, subject and input, `filter` and `filterStream` admit the same items, and `filterProjected` and `filterStreamProjected` release the same projections, in input order, duplicates kept, at any `concurrency`.

**Source**: `packages/core/src/Handover.ts` — `handOver` is the one per-item step (decide the item as its own resource, discharge on an allow and release it, or a void failure on a denial); `packages/core/src/Qadi.ts` — the array forms (`Effect.forEach` and `keptInOrder`) and the stream forms (`Stream.mapEffect` and `Stream.filterMap`) only adapt it.

**Implication**: this is the reason [ADR-QD-022](decisions/022-subject-set-evaluation.md) gives for subject sets. Two implementations of who passes eventually disagree, and the one that disagrees by allowing does not announce itself. The array and stream forms once agreed only because each was kept in step with the other by hand; now there is one step to agree on.

**Enforcement**: `packages/core/test/Handover.test.ts`, `describe("the resource decided on is the value handed over: collection shapes")` — the array and stream forms admit the same items, the items released are the items whose decisions admitted them, released order is input order under concurrency, and two items equal in every field but distinct by reference come back as themselves.

**Related**: [ADR-QD-156](decisions/156-a-handed-over-value-is-decided-through-one-module.md), [ADR-QD-022](decisions/022-subject-set-evaluation.md), [INV-QD-013](#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation), [INV-QD-108](#inv-qd-108-a-handed-over-value-is-the-evaluated-resource), [BEH-QD-050](behaviors/07-enforcement.md).

---

## INV-QD-333: A seed's fields are the wire's

The fields a hydration payload entry carries are the fields the seed rebuilt from it carries, both stated once from the decision's wire form minus what the payload withholds; a field the wire gains reaches both with no edit in `@qadi/react`, and a withheld field reaches neither except inside a disclosure.

**Source**: `packages/react/src/SeededDecision.ts` (`ALLOW_WITHHELD`, `DENY_WITHHELD`, `AllowSeedFields`, `DenySeedFields`, the classes typed by them plus `subjectId`) and `packages/react/src/HydrationEngine.ts` (`AllowEntry`/`DenyEntry` over the same fields; the `VERDICTS` rows building the entry from `encodeDecision`'s value and the seed by spread).

**Implication**: a field written out in the seed's class and copied by name in `rebuild` was dropped while everything compiled, so an allow's `visibleFields` was lost on the way back. The default is now a deny-list: a field is disclosed unless it is named as withheld, so a new wire field reaches the seed and the payload unseen. The byte golden does not catch it, because it sees only the fields its fixtures populate and a new optional field is in none of them; the guard is two tests together: the pin of the wire structs' key sets against an explicit disclosed and withheld list, so any new field, optional or not, fails until it is classified, and the test that this file's withheld classification equals the engine's `ALLOW_WITHHELD`/`DENY_WITHHELD`, so a field classified withheld there is withheld by the engine and cannot be marked withheld in the test alone ([ADR-QD-157](decisions/157-a-seeds-fields-are-the-wires-stated-once.md)).

**Enforcement**: the property, the key-set pin and the golden in `packages/react/test/HydrationSeedFields.test.ts` (the property fails if the seed drops a field the wire discloses; the key-set pin fails on any wire field not classified as disclosed or withheld; the engine-agreement test fails if the withheld classification differs from `ALLOW_WITHHELD`/`DENY_WITHHELD`), the `packages/react/test/Hydration.tst.ts` pin, and the existing round trips in `HydrationEngine.test.ts` and `HydrationPayload.test.ts`.

**Related**: [ADR-QD-157](decisions/157-a-seeds-fields-are-the-wires-stated-once.md), [ADR-QD-135](decisions/135-sink-record-fields-stated-once.md), [ADR-QD-078](decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md), [BEH-QD-556](behaviors/19-hydration.md#beh-qd-556-a-seed-carries-every-field-the-payload-discloses), [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it), [INV-QD-059](#inv-qd-059-a-seeded-decision-never-claims-a-trace-it-was-not-given), [INV-QD-170](#inv-qd-170-a-decision-agrees-with-its-trace).

## INV-QD-335: A circuit breaker's generation increments exactly when its status changes

For every event a breaker built by `makeCircuitBreaker` handles, the generation rises by exactly one when the status changes and by zero otherwise; a transition is announced exactly when the status changes; and a Success, Failure or Release admitted under another generation leaves the state as it was.

**Source**: `packages/audit/src/CircuitBreaker.ts` — `step` and the closed `ENTER` record, the one place the increment is written: an arm answers a status to enter or the state that replaces this one, and only a status to enter bumps the generation and is announced. `run` applies `step` inside one `Ref.modify` per event.

**Implication**: eight hand-written increments could disagree with the status they announced, or bump on a change of count that was no change of status. With the increment written once, "announced iff the status changed" holds by construction, and a stale permit's outcome cannot move a newer window.

**Enforcement**: the seeded property and the 21 rows in `packages/audit/test/CircuitBreakerTransition.test.ts`, the generation rows of `packages/audit/test/CircuitBreakerTable.test.ts`, and `packages/audit/test/CircuitBreaker.test.ts` unedited.

**Related**: [ADR-QD-158](decisions/158-the-breakers-rules-are-one-transition-function.md), [BEH-QD-251](behaviors/33-audit-pipeline.md#beh-qd-251-a-tripped-circuit-breaker-skips-the-write-not-the-stage-and-its-transitions-are-atomic-under-concurrency), [INV-QD-052](#inv-qd-052-once-a-circuit-breaker-trips-write-is-never-attempted-again-until-reset).

## INV-QD-337: A contained sink failure is reported exactly once per lost record, naming the sink

Every cause a sink's `record` lets through the emitter (a defect, a throw, including one before `record` returns an effect, a self-interruption, a typed failure leaked through a type escape) produces exactly one `Warn` line per lost record, in the order the records were emitted, annotated with the sink's name or `unnamed`, the record's tag, the evaluation id and the rendered cause; a sink that loses nothing is reported never. The tag and the evaluation id are those of the record as it was handed over, read before the sink runs, and `unknown` when they cannot be read. An interruption of the evaluation itself is not a sink failure: it propagates and is not reported.

**Source**: `packages/core/src/SinkEmit.ts` — `sinkEmitter` reads the record's tag and evaluation id first (`handedOver`, contained, `unknown` when unreadable), suspends the call and reports each cause it contains through `reportSinkFailure`. `packages/core/src/SinkReport.ts` — `reportSinkFailure` writes the four annotations once, and `sinkName` reads the name only then, guarded. `packages/core/src/DecisionSinkForwarding.ts` — `decisionSinkAll`'s member report calls the same `reportSinkFailure` with its own message, so it names the member, the record tag and the evaluation id, and returns success, so the emitter does not report the same failure again; the forwarder's own outer catch is removed for the same reason.

**Implication**: on the phase base a failing sink lost every record it was handed and left no line, and once the emitter reported, a forwarder whose `onFailure` threw would have written a second line from its own outer catch. A failure reported twice is as unreadable as one reported never, so the count is the property: one lost record, one line, and the name that says which sink.

**Enforcement**: `packages/core/test/SinkEmitReport.test.ts` rows E1 to E11 (every cause through `evaluate`, the name, the empty name, the no-warning cases) and O1 to O5 (every cause at the obligation gate, one line per record, the decision record first), with E12 (an evaluation interrupted from outside while the sink runs ends as an interrupt and writes no line), E13 (a sink that makes its record unreadable and then dies is reported with the evaluation id it was handed) and E14 (a record whose fields cannot be read is reported as `unknown`), and `packages/core/test/ShippedSinkReports.test.ts` rows A1 to A5 (the fan-out names the member, once, at the innermost level) with C1 to C4 (one failure, one report, before and after), A7 (a member that interrupts itself is reported once and the next member still records) and A8 (an evaluation interrupted while a member runs writes no line).

**Related**: [ADR-QD-159](decisions/159-the-sink-emitter-reports-what-it-contains.md), [BEH-QD-566](behaviors/24-decision-sink.md#beh-qd-566-a-sink-that-fails-is-reported-once-for-every-record-it-loses), [BEH-QD-567](behaviors/24-decision-sink.md#beh-qd-567-a-sink-may-name-itself-and-a-report-names-it-or-says-unnamed), [BEH-QD-569](behaviors/24-decision-sink.md#beh-qd-569-a-shipped-sink-keeps-only-the-reports-that-change-behaviour-or-say-something-else), [BEH-QD-570](behaviors/24-decision-sink.md#beh-qd-570-a-fan-out-names-the-member-that-failed-and-every-member-is-isolated), [INV-QD-035](#inv-qd-035-a-sink-cannot-change-a-decision).

## INV-QD-338: No report on the sink path can change an outcome or stop a later fan-out member

A logger that throws, a `name` getter that throws or a cause that cannot be rendered, while a sink's failure is reported, leaves the verdict, the trace and the error a caller receives as they would be with no sink, and does not stop a later member of a fan-out from being written to.

**Source**: `packages/core/src/SinkReport.ts` — `reportSinkFailure` builds the report, the cause's rendering included, inside `Effect.suspend` and contains it with its own `catchCause`, and `sinkName` is guarded; the emitter (`SinkEmit.ts`) and the fan-out share it. `packages/core/src/DecisionSinkForwarding.ts` — `decisionSinkAll` suspends each member's call and contains its member report, so a throwing member or logger ends only that member's line.

**Implication**: on the phase base a `record` that threw before returning an effect made `evaluate` die, and a member that threw before returning an effect stopped every later member of a fan-out, because the call was made eagerly inside the `forEach` callback. A report is the observer's own failure; if it could change an outcome, the subversion the emitter closes would return one step later.

**Enforcement**: `packages/core/test/SinkEmitReport.test.ts` rows E9 (a throwing logger leaves the allow unchanged), E7 (a throwing name getter is `unnamed`) and E15 (a sink that dies with a Proxy whose traps all throw, or an object whose `toString`, `toJSON` and `message` all throw, is reported once and the allow is unchanged; the cause's rendering runs inside the report's own containment, which E9 pins; E15 pins that a hostile cause value is still reported once with the allow unchanged, and does not fail without the containment, because `String(cause)` does not throw for those values), and `packages/core/test/ShippedSinkReports.test.ts` rows A6 (a throwing logger does not stop the next member), A3 (a throwing name getter) and A4 (a member that throws before returning an effect).

**Related**: [ADR-QD-159](decisions/159-the-sink-emitter-reports-what-it-contains.md), [BEH-QD-568](behaviors/24-decision-sink.md#beh-qd-568-a-report-cannot-change-an-outcome), [BEH-QD-570](behaviors/24-decision-sink.md#beh-qd-570-a-fan-out-names-the-member-that-failed-and-every-member-is-isolated), [INV-QD-035](#inv-qd-035-a-sink-cannot-change-a-decision).

## INV-QD-339: A port's service is its default exactly when it carries that default's mark

A port's service is that port's fail-closed default exactly when it carries, as an own property, the mark its description's default carries and naming that port; a name never decides it. The mark is set only by `nonePort` and carried only by a derived wrapper (`…Retrying`, `…Bounded`, `…TimingOut`, `recordingPort`), by `decoratePorts`, or by a hand-written wrapper that spreads the shape it wraps. A scripted double, a remote asker, a replay, a fixture, a fresh object and an object that only inherits the mark do not carry it.

**Source**: `packages/core/src/PortDefault.ts` — `markDefault` sets the mark, `isMarkedDefault` reads the own property only and is total over any value, `carryDefault` copies it forward. `packages/core/src/PortDerivation.ts` — `nonePort` marks the default it builds; `wrapPort`, `boundedPort` and `decoratePorts` carry it. `packages/core/src/PortDescription.ts` — `isPortDefault` is the one reader. `packages/devtools/src/model/Wiring.ts` — `wiringReport` reads `defaulted` through it.

**Implication**: on the phase base `defaulted` was parsed from a display name: a renamed wrapper that spread a default hid it, and a fresh object a host named after a default was reported defaulted. A report that can be wrong in both directions about which port is the fail-closed one sends an operator looking for an outage in the wrong place. The mark is a package-private symbol that no evaluation path reads, so no decision depends on it.

**Enforcement**: `packages/core/test/PortDefault.test.ts` rows 1 to 5 (every port's default, a real adapter), M1 to M5, M7 and M7b (a scripted double, a spread copy, a fresh object, an inherited mark, a value that is not a shape, a throwing or revoked proxy), M8 (the mark is invisible to keys and JSON), W1 to W9 (every derived wrapper, in every order) and the `decoratePorts` rows, `packages/devtools/test/model/WiringDefaulted.test.ts` (seven rows red on the phase base) and `packages/devtools/test/model/Capture.test.ts`'s captured-default row.

**Related**: [ADR-QD-160](decisions/160-port-facts-are-read-from-the-description.md), [BEH-QD-571](behaviors/25-inspection.md#beh-qd-571-a-ports-fail-closed-default-is-a-fact-its-service-carries-through-every-derived-wrapper), [BEH-QD-572](behaviors/25-inspection.md#beh-qd-572-a-hand-written-wrapper-keeps-the-default-only-by-spreading-it), [INV-QD-007](#inv-qd-007-defaults-fail-closed).

## INV-QD-340: A default's mark names its port, so a shape under another port is never that port's default

The mark a default carries is the name of the port it defaults, and `isPortDefault` answers true only when that name is the port asked about: a default of one port set under another port's service is never read as that port's default, whichever ordered pair of ports is tried.

**Source**: `packages/core/src/PortDefault.ts` — `markDefault` stores the port's name as the mark's value, and `isMarkedDefault` compares it with the port asked about instead of testing that a mark exists.

**Implication**: a boolean mark would let a shape moved onto another port's service read as that port's default, and the wiring report would call a wired adapter a fail-closed one. The name makes the two ports' defaults distinguishable by construction.

**Enforcement**: `packages/core/test/PortDefault.test.ts` row M6, over every ordered pair of ports.

**Related**: [ADR-QD-160](decisions/160-port-facts-are-read-from-the-description.md), [BEH-QD-571](behaviors/25-inspection.md#beh-qd-571-a-ports-fail-closed-default-is-a-fact-its-service-carries-through-every-derived-wrapper).


## INV-QD-341: An unwritten audit entry is lost exactly when its staging's row says so

For a `WriteFailed` or `Skipped` outcome (the six unwritten leaves), `durabilityOf` is `"Lost"`, a `qadi_audit_entries_lost_total` series increments with the row's word, and the line is a warning that the entry was dropped, exactly when its staging's row is Lost: the three are readings of one row, not three decisions. `Refused` has no staging row and is never Lost, though it warns ([BEH-QD-579](behaviors/33-audit-pipeline.md#beh-qd-579-the-spans-durability-the-lost-counter-and-the-unwritten-lines-level-agree-on-every-leaf), [INV-QD-342](#inv-qd-342-an-audit-refusal-is-cores-one-sinkrecordnotencodable)).

**Source**: `packages/audit/src/UnwrittenRow.ts` (`unwrittenRow`), read by `durabilityOf` (`AuditWriteOutcome.ts`) and by `lostLabel` and `unwrittenLine` (`AuditWriteReport.ts`).

**Implication**: a fourth staging variant is a compile error at the row's reader. Before ARCH-95 the three mappings agreed by accident.

**Enforcement**: `packages/audit/test/UnwrittenRow.test.ts`, `packages/audit/test/UnwrittenRow.tst.ts`, `packages/audit/test/AuditLostAgreement.test.ts`.

**Related**: [INV-QD-106](#inv-qd-106-every-audit-record-has-exactly-one-write-outcome-and-an-entry-not-in-the-trail-is-witnessed), [BEH-QD-578](behaviors/33-audit-pipeline.md#beh-qd-578-one-row-per-unwritten-staging-decides-whether-the-entry-is-lost), [BEH-QD-579](behaviors/33-audit-pipeline.md#beh-qd-579-the-spans-durability-the-lost-counter-and-the-unwritten-lines-level-agree-on-every-leaf), [ADR-QD-161](decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md).

## INV-QD-342: An audit refusal is core's one `SinkRecordNotEncodable`

A record the audit pipeline cannot encode is refused with the same class core's codec returns and forwarding and http report; `@qadi/audit` declares no refusal error of its own and computes no sentence of its own.

**Source**: `packages/audit/src/AuditEntry.ts` (`encodeAuditEntry`), `packages/audit/src/AuditDecisionSinkLive.ts` (`AuditDecisionSinkOptions.onRefused`), `packages/audit/src/AuditWriteOutcome.ts` (`Refused`).

**Implication**: a consumer handles one tag for a refusal across core, audit and http; the sentence has one author, `describeEncodeRefusal`.

**Enforcement**: `packages/audit/test/AuditRefusal.tst.ts` (the types: `encodeAuditEntry`'s error, both `onRefused` hooks and `Refused` carry core's class), `packages/audit/test/AuditEntry.test.ts` (`encodeAuditEntry` fails with an instance of core's class), `packages/audit/test/AuditDecisionSinkLive.test.ts` (the hook receives an instance of core's class with no own `reason`). `packages/audit/test/AuditWriteOutput.test.ts` pins only the hook payload's fields, which the removed class carried too, so it characterises the payload and does not hold this invariant.

**Related**: [INV-QD-104](#inv-qd-104-a-refusal-report-says-where-never-what), [BEH-QD-576](behaviors/33-audit-pipeline.md#beh-qd-576-an-audit-refusal-is-cores-sinkrecordnotencodable), [BEH-QD-577](behaviors/33-audit-pipeline.md#beh-qd-577-a-refused-records-default-line-is-cores-report-and-its-sentence-is-cores-to-compute), [ADR-QD-161](decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md).

## INV-QD-343: A questions snapshot pairs each asked question with the guards asking it at one moment

Each row of the dock model's `questions` snapshot is the questions input's answer joined to the registry's `instances()` read in the same synchronous step, whichever of the two moved; `instances` is the registry's own array or one constant, and a recompute that finds the same questions, the same instances array, the same failure (an error's name and message, or the rendered reason of a value that is not an error) and the same unsampled flag keeps the snapshot's reference; a registry that throws is stated as the `Failed` gates view, never swallowed and never an empty list ([BEH-QD-583](behaviors/28-devtools-screens.md#beh-qd-583-the-questions-store-is-one-moment-and-keeps-its-reference-when-nothing-moved), [BEH-QD-584](behaviors/28-devtools-screens.md#beh-qd-584-the-gate-registry-is-a-model-input-subscribed-for-the-models-scope)).

**Source**: `packages/devtools/src/model/Gates.ts` (`joinQuestions`), `packages/devtools/src/model/GatesFeed.ts` (the snapshot of the registry and the questions input that the join reads), `packages/devtools/src/model/DockModel.ts` (the `questions` store, a derived store keyed by `JoinKey`) (ARCH-103, CCR-QD-447).

**Implication**: no row shows a mounted guard as unmounted because the two sources were read at different moments, and the lens is not redrawn on a quiet tick. Before ARCH-96 the panel paired a polled list with a `gates` prop in the view, so a row could join two moments.

**Enforcement**: `packages/devtools/test/model/GatesFeed.test.ts` (G31: a registry change is published at once with the registry's own array, and a quiet tick publishes nothing; G36 to G47 and G42 b for the throwing registry, each of which fails with the guard it pins removed: the guarded read, the guarded subscribe, the guarded release, the closed check, the retry of a failed watch, the total reason, or the one publish per configure; G45 pins the comparison of a thrown value that is not an error; GP2: whatever the registry and the thunk do, each snapshot is the registry's own array and the last tick's answer), `packages/devtools/test/model/DockModel.test.ts` (P2: after every registry change and poll tick, each snapshot's rows equal an independent oracle over the questions and `instances()` read at that moment, so a join that is refreshed only on a poll fails it; J1: the join moves first on either side; M36: a closed model reads no registry; M47: one publish per configure), `packages/devtools/test/model/ExternalStore.test.ts` (the derived store stops reading and computing once its scope closes), and `packages/devtools/test/model/Gates.test.ts` (`joinQuestions`) (ARCH-103, CCR-QD-447).

**Related**: [INV-QD-107](#inv-qd-107-a-screen-never-changes-what-it-shows-without-the-reviewer), [BEH-QD-583](behaviors/28-devtools-screens.md#beh-qd-583-the-questions-store-is-one-moment-and-keeps-its-reference-when-nothing-moved), [BEH-QD-584](behaviors/28-devtools-screens.md#beh-qd-584-the-gate-registry-is-a-model-input-subscribed-for-the-models-scope), [ADR-QD-162](decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md).

## INV-QD-344: The five gate states are stated once, and each reader is tied to them by its type

`@qadi/core`'s `GateState.ts` holds the five states in one module-private keyed table; `@qadi/react`'s `GateRenderState` is `GateState` and `DecisionOutcome["_tag"]` equals it in both directions; `@qadi/devtools`' display is a mapped type over it; a word outside the five is displayed as itself, not refused ([BEH-QD-581](behaviors/28-devtools-screens.md#beh-qd-581-a-guards-render-states-are-stated-once-in-core), [BEH-QD-582](behaviors/28-devtools-screens.md#beh-qd-582-a-render-state-the-dock-does-not-know-is-shown-as-itself)).

**Source**: `packages/core/src/GateState.ts`, `packages/react/src/GateWriter.ts` (`GateRenderState`), `packages/devtools/src/model/Gates.ts` (`GATE_DISPLAY`, `displayOfGateState`).

**Implication**: a sixth word is a compile error in devtools, where `GATE_DISPLAY`'s mapped type needs its row (`pnpm typecheck`), and a type-test failure in react, where `DecisionOutcome.tst.ts` pins the outcome's tags to `GateState` both ways; before ARCH-96 the two packages restated the union and nothing tied them.

**Enforcement**: `packages/core/test/GateState.test.ts`, `packages/core/test/GateState.tst.ts`, `packages/react/test/DecisionOutcome.tst.ts`, `packages/devtools/test/model/Gates.test.ts`.

**Related**: [INV-QD-323](#inv-qd-323-each-hydration-drop-reason-has-exactly-one-kind-and-the-kinds-partition-the-reasons), [BEH-QD-581](behaviors/28-devtools-screens.md#beh-qd-581-a-guards-render-states-are-stated-once-in-core), [BEH-QD-582](behaviors/28-devtools-screens.md#beh-qd-582-a-render-state-the-dock-does-not-know-is-shown-as-itself), [ADR-QD-162](decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md), [ADR-QD-152](decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md).

## INV-QD-345: Every leaf tag has one row in the leaf-needs table

`@qadi/core`'s `LeafNeeds.ts` holds what each policy leaf needs from the request in one package-private keyed table; both interpreters read it, so a leaf the policy gains cannot ship without saying what it needs ([BEH-QD-590](behaviors/05-evaluator.md#beh-qd-590-every-leaf-tag-has-one-row-in-the-leaf-needs-table)).

**Source**: `packages/core/src/LeafNeeds.ts` — `LEAF_NEEDS` is `as const satisfies { readonly [K in LeafPolicy["_tag"]]: LeafNeedOf<K> }`, and `LeafNeedOf<K>` fixes the one row a leaf can have: `matcher` is read from the variant's shape, and `own` and `resourceId` from closed tag lists, one per value, in which a tag no list names gets `never`.

**Implication**: a leaf tag without a row is a compile error (TS2741), a row for a tag that is not a leaf is one too (TS2353), and so is a row whose `own` or `resourceId` disagrees with its tag's classification or whose `matcher` disagrees with its variant (TS2322), which `absenceOf`'s guards would otherwise trust and fail open on. A leaf the policy gains has no row that compiles until its tag is classified, so its `own` cannot default to reading nothing; the compiler guarantees that the classification is made, and `LeafMatrix.test.ts`'s fixture for the leaf checks that it is right; before ARCH-97 the same facts were written per leaf in `Walk.ts` and again in `Predicate.ts`, and a new leaf was checked by neither the compiler nor a test.

**Enforcement**: `packages/core/test/LeafNeeds.test.ts` (one row per leaf tag, rows equal in content stay separate; the barrel exports none of it), `packages/core/test/LeafNeeds.tst.ts` (a row that disagrees with its leaf is refused; a leaf no classification names, built in the test, gets `never` and no row), `packages/core/test/LeafMatrix.test.ts` (a fixture for exactly the leaf tags), the typecheck, and `packages/core/test/Evaluate.test.ts`.

**Related**: [INV-QD-346](#inv-qd-346-a-leafs-own-input-is-checked-before-what-its-matcher-references-the-action-before-the-resource), [INV-QD-011](#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one), [BEH-QD-590](behaviors/05-evaluator.md#beh-qd-590-every-leaf-tag-has-one-row-in-the-leaf-needs-table), [BEH-QD-588](behaviors/30-port-calls.md#beh-qd-588-the-leaf-needs-table-states-which-leaves-ask-about-one-resource-readscoped-enforces-it), [ADR-QD-163](decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md), [ADR-QD-152](decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md).

## INV-QD-346: A leaf's own input is checked before what its matcher references, the action before the resource

When a request lacks an input a leaf needs, the absence reported is the leaf's own input first (`HasAction`: the action; `HasResourceAttribute`: the resource), then what its matcher references, the action before the resource; `evaluate` and `toPredicate` report the same one ([BEH-QD-586](behaviors/10-actions.md#beh-qd-586-a-leafs-own-input-is-reported-before-what-its-matcher-references)).

**Source**: `packages/core/src/LeafNeeds.ts` — `absenceOf` applies the one rule to a leaf's row.

**Implication**: a request missing both the action and the resource fails `HasResourceAttribute` with `MissingResource` whatever its matcher references, and `HasAttribute`, which owns neither, with `MissingAction` when its matcher references the action, with `MissingResource` when it references the resource, and not at all when it references neither; `toPredicate`, whose resource is the row, reports the same absence wherever both interpreters apply; all of it as before the rule was stated once; a change that moves a check past what the matcher references changes an error a caller may match on, so the order is pinned, not left to the shape of the code. "The action before the resource" among what a matcher references cannot be observed, because a matcher holds at most one reference.

**Enforcement**: `packages/core/test/LeafMatrix.test.ts` (every leaf tag by action by resource by what the matcher references, written on the phase base before the table existed), `packages/core/test/LeafNeeds.test.ts` (`absenceOf` says what the oracle says, and reports the own input before the matcher's), and `packages/core/test/Evaluate.test.ts` (a missing resource wins over a missing action on `HasResourceAttribute`). A swapped-order negative control failed five of these (ADR-QD-163).

**Related**: [INV-QD-011](#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one), [INV-QD-345](#inv-qd-345-every-leaf-tag-has-one-row-in-the-leaf-needs-table), [BEH-QD-586](behaviors/10-actions.md#beh-qd-586-a-leafs-own-input-is-reported-before-what-its-matcher-references), [ADR-QD-163](decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md).

## INV-QD-347: Every policy tag has exactly one arity, and every reader agrees with it

`@qadi/core`'s `PolicyArity.ts` holds each `Policy` tag's arity, `Leaf`, `Wrapper` or `Many`, in one package-private keyed record; `childrenOf` and `LeafPolicy` are typed against it, the trace fold reads it, and `PolicyCases` and `TraceCases` are tied to it by type tests, so a tag moved in one place and not another does not compile ([BEH-QD-591](behaviors/25-inspection.md#beh-qd-591-every-policy-tag-has-exactly-one-arity-stated-once), [BEH-QD-592](behaviors/25-inspection.md#beh-qd-592-leafpolicy-is-the-tags-the-record-calls-leaf-and-childrenof-is-typed-by-arity), [BEH-QD-594](behaviors/25-inspection.md#beh-qd-594-policycases-and-tracecases-arms-agree-with-the-record)).

**Source**: `packages/core/src/PolicyArity.ts` — `POLICY_ARITY` is `as const satisfies { readonly [tag: string]: Arity }` and imports nothing; `packages/core/src/Policy.ts` closes it over `Policy["_tag"]` (`ArityRecord`, `TagsOfArity`), types `childrenOf`'s arms `satisfies ChildArms<Policy, typeof POLICY_ARITY>` and derives `LeafPolicy`; `packages/core/src/Decision.ts`'s `traceShapeOf` is one read of it.

**Implication**: before ARCH-98 a tag's arity was written in `childrenOf`, in a hand-written `LeafPolicy`, in `PolicyCases` and, tied to none of them, in `Decision.ts`'s `leafTags` list, and each was exhaustive over the tags, so moving one tag's arity in one place compiled; all 32 single-tag moves did on the base and the existing tests caught 8 of them. Now moving a tag in the record is a type error at its `childrenOf` arm (a `Wrapper` arm kept under `Many` is "not assignable to type 'never'" because the `Many` type carries `{ readonly 0?: never }`), in `LeafPolicy`'s readers, and at its `PolicyCases` and `TraceCases` arms. The one move `childrenOf` cannot see is `Leaf` to `Many`, since a `Many` arm may be empty; `LeafPolicy`'s readers refuse it, and an empty `Many` arm is refused at runtime by the lockstep tests.

**Enforcement**: `packages/core/test/PolicyArity.test.ts` (the record names every tag once; `childrenOf`, `foldPolicyCases` and `foldTrace` agree with it for each of the 16 tags; the barrel does not export it), `packages/core/test/PolicyArity.tst.ts` (every `PolicyCases` and `TraceCases` arm states its record arity, all 32 single-tag moves disagree at exactly the moved tag, `LeafPolicy` is the type it was, both `childrenOf` directions are refused as checked `@ts-expect-error` negatives), the typecheck, and `packages/core/test/Policy.test.ts` (`childrenOf`'s lockstep with the fold).

**Related**: [INV-QD-345](#inv-qd-345-every-leaf-tag-has-one-row-in-the-leaf-needs-table), [INV-QD-348](#inv-qd-348-foldtrace-hands-an-arm-what-the-record-says-and-a-leafs-foreign-children-never-reach-a-fold), [INV-QD-090](#inv-qd-090-a-pure-walk-over-a-caller-held-tree-never-exhausts-the-call-stack), [BEH-QD-591](behaviors/25-inspection.md#beh-qd-591-every-policy-tag-has-exactly-one-arity-stated-once), [BEH-QD-592](behaviors/25-inspection.md#beh-qd-592-leafpolicy-is-the-tags-the-record-calls-leaf-and-childrenof-is-typed-by-arity), [BEH-QD-594](behaviors/25-inspection.md#beh-qd-594-policycases-and-tracecases-arms-agree-with-the-record), [ADR-QD-164](decisions/164-policy-tag-arity-is-stated-once.md), [ADR-QD-152](decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md).

## INV-QD-348: foldTrace hands an arm what the record says, and a leaf's foreign children never reach a fold

`foldTrace` hands a `Leaf` arm none of its node's children, a `Wrapper` arm its first child's result or `undefined`, and a `Many` arm every child's result in order, as the arity record names the tag; a child a leaf's node carries is not walked, so it cannot reach a fold that was told the leaf has none ([BEH-QD-593](behaviors/18-explanation.md#beh-qd-593-foldtrace-hands-each-arm-its-tags-children-by-the-record)).

**Source**: `packages/core/src/Decision.ts` — `traceChildrenOf`, which reads `traceShapeOf`, one read of `POLICY_ARITY`, and selects `[]`, the first child or all of them through `traceChildrenByArity`, one row per `Arity` word, so a fourth word does not compile; `foldTrace` folds through it and `traceStep` hands the arm exactly those results.

**Implication**: `Trace.children` is public and `AccessDenied.trace` reaches every host, so a trace need not have been built by the evaluator and a leaf's node may carry children. `renderTrace` and `diffTraces` show and compare them under every tag and read no arity ([BEH-QD-595](behaviors/18-explanation.md#beh-qd-595-rendertrace-and-difftraces-walk-every-present-child-and-read-no-arity)); only the fold must not let them reach an arm. Before ARCH-98 the shape was a separate `leafTags` list and a `Match.whenOr` chain tied to nothing, and moving `Not` from Wrapper to Many compiled and was caught by one test in `Decision.test.ts`; `TraceShape.test.ts` catches all 32 single-tag moves, and the record makes the same edit a type error.

**Enforcement**: `packages/core/test/TraceShape.test.ts` (written on the phase base by hand, independent of the record: a node carrying three children under each of the 16 tags, each arm's view, the visit order; a wrapper with no child hands its arm `undefined`, a many with none an empty list; 32 of 32 single-tag moves fail it), `packages/core/test/PolicyArity.test.ts` (the fold agrees with the record; `renderTrace` and `diffTraces` do not read it) and `packages/core/test/Decision.test.ts` (`foldTrace` at depth and width, sharing and cycles, [INV-QD-090](#inv-qd-090-a-pure-walk-over-a-caller-held-tree-never-exhausts-the-call-stack); its `foldTrace` tests untouched, and one test added for the two trace guards `isAllowingTrace` and `isDenyingTrace`, review iteration 1 WR-02's mutation floor, commit `2cd90675`).

**Related**: [INV-QD-090](#inv-qd-090-a-pure-walk-over-a-caller-held-tree-never-exhausts-the-call-stack), [INV-QD-347](#inv-qd-347-every-policy-tag-has-exactly-one-arity-and-every-reader-agrees-with-it), [INV-QD-345](#inv-qd-345-every-leaf-tag-has-one-row-in-the-leaf-needs-table), [BEH-QD-593](behaviors/18-explanation.md#beh-qd-593-foldtrace-hands-each-arm-its-tags-children-by-the-record), [BEH-QD-595](behaviors/18-explanation.md#beh-qd-595-rendertrace-and-difftraces-walk-every-present-child-and-read-no-arity), [ADR-QD-164](decisions/164-policy-tag-arity-is-stated-once.md).

## INV-QD-349: One compile shell, and each compile moves its dialect's counter exactly once

A predicate compile is the dialect's rules and renderer run inside one function, `@qadi/core`'s `compilePredicate`, and each call moves its dialect's counter exactly once: `refused` once per `PredicateNotRenderable` or `compiled` once after a successful render, and neither when classification or the render is a defect ([BEH-QD-596](behaviors/31-predicate-compilation.md#beh-qd-596-a-compile-is-a-dialects-rules-and-renderer-inside-one-core-shell), [BEH-QD-597](behaviors/31-predicate-compilation.md#beh-qd-597-each-compile-moves-its-dialects-counter-exactly-once-after-the-render)).

**Source**: `packages/core/src/RenderablePredicate.ts` — `compilePredicate` is a plain function whose pipe runs in one order: the two defaults, `toRenderable`, `tapError` counting `outcomes.refused`, `render`, then `outcomes.compiled`; `compileSql` (`packages/predicate-sql/src/index.ts`) and `compilePrismaWhere` (`packages/predicate-prisma/src/index.ts`) each call it with their rules, their renderer and their own `compiledTotal` from `CompileMetrics.ts`.

**Implication**: before ARCH-99 the shell was written twice and the two copies disagreed on where `compiled` was counted: SQL after its render, Prisma before it, so a Prisma renderer defect counted a compile. Now there is one definition and one order, so a third dialect writes rules and a renderer only, and a defect counts neither outcome on any of them.

**Enforcement**: `packages/core/test/CompilePredicate.test.ts` (render gets the classified tree and its return is the result; a refusal counts `refused` once and never calls `render`; a throwing `render` counts neither; the defaults), `packages/predicate-sql/test/CompileShell.test.ts` and `packages/predicate-prisma/test/CompileShell.test.ts` (each dialect's refusals and compiles, one counter move per call, a defect counting neither, the span tree; written on the phase base and unchanged by the move).

**Related**: [INV-QD-061](#inv-qd-061-torenderable-preserves-evaluatepredicates-meaning-in-two-valued-logic), [BEH-QD-596](behaviors/31-predicate-compilation.md#beh-qd-596-a-compile-is-a-dialects-rules-and-renderer-inside-one-core-shell), [BEH-QD-597](behaviors/31-predicate-compilation.md#beh-qd-597-each-compile-moves-its-dialects-counter-exactly-once-after-the-render), [BEH-QD-598](behaviors/31-predicate-compilation.md#beh-qd-598-each-dialects-output-and-refusals-are-its-rules-and-renderers-alone), [BEH-QD-599](behaviors/31-predicate-compilation.md#beh-qd-599-the-compile-shell-adds-no-span-of-its-own), [BEH-QD-600](behaviors/31-predicate-compilation.md#beh-qd-600-each-dialect-declares-its-own-compile-counter-once-and-hands-it-to-the-shell), [ADR-QD-165](decisions/165-core-owns-the-predicate-compile-shell.md).

## INV-QD-351: Every interpreter and both fixture builders read a decoded key only through Operand.ts

A key a decoded policy names (an attribute, a column, a `SubjectRef`/`ResourceRef` path segment or a `FieldMatch` field) is read by `evaluate`, `evaluatePredicate`, the field projection and both record-backed fixture builders only through `packages/core/src/Operand.ts` ([BEH-QD-601](behaviors/04-matchers.md#beh-qd-601-a-leafs-operand-is-an-own-property-read-made-in-one-module), [BEH-QD-602](behaviors/16-predicates.md#beh-qd-602-the-reference-interpreter-reads-a-column-as-an-own-property), [BEH-QD-604](behaviors/06-services.md#beh-qd-604-attributeresolverfromrecord-answers-undefined-for-a-name-its-table-does-not-own), [BEH-QD-605](behaviors/32-custom-predicates.md#beh-qd-605-custompredicatefromrecord-fails-on-a-name-its-table-does-not-own-never-dies)).

**Source**: `packages/core/src/Operand.ts` — `ownValue`, `isOwnKey` and `getByPath`, package-private and out of the barrel; `Predicate.ts` (`Compare`, `MemberOf`, the `SubjectRef` fold), `Matcher.ts` (`getByPath`'s re-export, the `FieldMatch` field), `Walk.ts` (`HasResourceAttribute`), `PortAccess.ts` (`readAttribute`), `FieldPath.ts` (`projectAt`), `Decision.ts` (the field-membership check), `AttributeResolver.ts` (`attributeResolverFromRecord`) and `CustomPredicate.ts` (`customPredicateFromRecord`) each call it.

**Implication**: a reader cannot forget the rule, because it no longer states it. Before ARCH-100 nine readers each restated the own-property rule and kept in step by comment; the reference interpreter's did not, and two fixture builders read `table[key]` bare, so one allowed on `constructor` and the other died. The write guards (`Object.create(null)` in `FieldPath.ts`, `Object.defineProperty` in `Decision.ts`) stay where they are: they write an untrusted key and read no operand.

**Enforcement**: `packages/core/test/Predicate.test.ts` ("a prototype-named column denies on both sides"; "PROPERTY: the two interpreters agree on prototype names, row by row"), `packages/core/test/Operand.test.ts` (own, inherited and `JSON.parse`'s own `__proto__` for each function; `Matcher.ts`'s `getByPath` is the module's), `packages/core/test/Layers.test.ts` and `packages/core/test/CustomPredicate.test.ts` (the two fixture builders), `packages/core/test/PortAccess.test.ts` (`readAttribute` consults the resolver only for a key the subject does not own), and the phase's scoped scan of the files that read a decoded key. No house-style gate: the defect was a bare `row[key]`, which a count of `Object.hasOwn` cannot see.

**Related**: [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows), [INV-QD-091](#inv-qd-091-a-primitive-matcher-and-its-predicate-leaf-are-one-function), [INV-QD-352](#inv-qd-352-an-inherited-member-reads-as-absent), [BEH-QD-601](behaviors/04-matchers.md#beh-qd-601-a-leafs-operand-is-an-own-property-read-made-in-one-module), [ADR-QD-166](decisions/166-one-module-owns-the-value-a-leaf-compares.md).

## INV-QD-352: An inherited member reads as absent

For every key a decoded policy names and every value it is read from, an inherited member (`constructor`, `toString`, `hasOwnProperty`, `valueOf`, or any other `Object.prototype` member) reads as `undefined`, so a prototype-named key behaves like any missing key; an own key is data, `__proto__` as `JSON.parse` gives it included ([BEH-QD-603](behaviors/16-predicates.md#beh-qd-603-the-two-interpreters-agree-on-prototype-named-keys)).

**Source**: `packages/core/src/Operand.ts` — `ownValue` answers `undefined` unless `Object.hasOwn` holds, `isOwnKey` is that test as a type predicate, and `getByPath` applies it to every segment of a dot-path.

**Implication**: a missing key denies ([INV-QD-092](#inv-qd-092-an-absent-value-never-satisfies-a-matcher)), so a policy naming `constructor` can neither allow through an inherited function nor die on one, whichever interpreter or fixture reads it. `JSON.parse` gives an object an own `__proto__` key without touching its real prototype, so that key is ordinary data and the real prototype is never reached. A row that is a class instance has its prototype getters read as absent by `evaluatePredicate`, as `evaluate` always did.

**Enforcement**: `packages/core/test/Operand.test.ts` (each prototype name reads as absent on a plain object, an own key holding `undefined` stays distinct, a `JSON.parse`d `__proto__` is own), `packages/core/test/FieldPath.test.ts` ("keeps an own key holding undefined and skips an inherited name"), `packages/core/test/Evaluate.test.ts` ("a ref path that names an inherited member reads as absent") and `packages/core/test/PortAccess.test.ts`.

**Related**: [INV-QD-092](#inv-qd-092-an-absent-value-never-satisfies-a-matcher), [INV-QD-351](#inv-qd-351-every-interpreter-and-both-fixture-builders-read-a-decoded-key-only-through-operandts), [INV-QD-091](#inv-qd-091-a-primitive-matcher-and-its-predicate-leaf-are-one-function), [BEH-QD-601](behaviors/04-matchers.md#beh-qd-601-a-leafs-operand-is-an-own-property-read-made-in-one-module), [BEH-QD-603](behaviors/16-predicates.md#beh-qd-603-the-two-interpreters-agree-on-prototype-named-keys), [ADR-QD-166](decisions/166-one-module-owns-the-value-a-leaf-compares.md).

## INV-QD-353: Each leaf's answer becomes a verdict in exactly one row, which both interpreters read

Every policy leaf tag has one row in `LEAF_VERDICTS`, a closed outcome for each answer its port or judgement gives; `evaluate` and `toPredicate` decide a leaf only through that row and `isHeld`, the walk keeping the sentence a denial reads and the translator the fold a held leaf becomes ([BEH-QD-606](behaviors/05-evaluator.md#beh-qd-606-every-leafs-answer-becomes-a-verdict-in-one-row), [BEH-QD-608](behaviors/16-predicates.md#beh-qd-608-topredicate-folds-a-leaf-by-asking-its-verdict-row-whether-it-holds)).

**Source**: `packages/core/src/LeafNeeds.ts` — `LEAF_VERDICTS` is a record keyed by every leaf tag and `isHeld` is the one test that reads an outcome as an allow; `Walk.ts` and `Predicate.ts` each call both and keep their own output (the denial sentence, the predicate fold).

**Implication**: a leaf cannot be decided two ways, because the two interpreters no longer hold a case each; a leaf the policy gains without a row does not compile (TS2741), so its answer cannot default to an allow. What differs between the interpreters, a sentence and a fold, stays where it was, and the decisions, deny reasons and folded predicates are those of before the rows existed.

**Enforcement**: `packages/core/test/LeafNeeds.test.ts` (the `LEAF_VERDICTS` describe: one row per leaf tag, each row's outcome for each answer), `packages/core/test/LeafNeeds.tst.ts` (a row's type is its leaf's outcome, a missing row is refused), `packages/core/test/LeafVerdict.test.ts` (every leaf's answer through `evaluate` and every folding leaf through `toPredicate`, written against the decision it gave before the rows existed), `packages/core/test/Predicate.test.ts` (the INV-QD-018 agreement) and the typecheck.

**Related**: [INV-QD-345](#inv-qd-345-every-leaf-tag-has-one-row-in-the-leaf-needs-table), [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows), [INV-QD-091](#inv-qd-091-a-primitive-matcher-and-its-predicate-leaf-are-one-function), [INV-QD-354](#inv-qd-354-an-acted-unknown-denies-both-polarities-stated-once), [BEH-QD-606](behaviors/05-evaluator.md#beh-qd-606-every-leafs-answer-becomes-a-verdict-in-one-row), [ADR-QD-167](decisions/167-each-leafs-answer-becomes-a-verdict-in-one-row.md).

## INV-QD-354: An acted Unknown denies both polarities, stated once

`actedRow` compares the history port's answer with the one a leaf wants and maps `"Unknown"` to `"Unknown"` in a single place, so an `"Unknown"` answer is never `Held` for `HasActed` or for `HasNotActed`, under either scope ([BEH-QD-607](behaviors/12-history.md#beh-qd-607-both-acted-polarities-read-one-verdict-row-and-unknown-denies-both)).

**Source**: `packages/core/src/LeafNeeds.ts` — `actedRow`, called once per polarity (`HasActed: actedRow("Acted", "NotPerformed")`, `HasNotActed: actedRow("NotActed", "Performed")`).

**Implication**: [ADR-QD-020](decisions/020-decision-history-port.md)'s fail-closed rule, that an unwired or failing history store is no answer and so satisfies neither polarity, cannot drift between `evaluate` and `toPredicate` or between the two polarities, because there is one comparison and its `Unknown` arm is written once. A change that made `Unknown` hold for either polarity would grant under `hasNotActed` from a port nobody wired.

**Enforcement**: the six acted cells in `packages/core/test/LeafNeeds.test.ts` and the twelve in `packages/core/test/LeafVerdict.test.ts` (both polarities, each answer, both scopes), and the typecheck.

**Related**: [INV-QD-014](#inv-qd-014-an-unwired-history-port-denies-both-polarities), [INV-QD-353](#inv-qd-353-each-leafs-answer-becomes-a-verdict-in-exactly-one-row-which-both-interpreters-read), [BEH-QD-607](behaviors/12-history.md#beh-qd-607-both-acted-polarities-read-one-verdict-row-and-unknown-denies-both), [ADR-QD-020](decisions/020-decision-history-port.md), [ADR-QD-167](decisions/167-each-leafs-answer-becomes-a-verdict-in-one-row.md).

## INV-QD-355: A port card's readings are joined by PortName in one pure model function

`portCards` is a pure function of one `ServicesInput`: the activity and the calls are grouped once into per-port records keyed by `PortName` and built by `tabulatePorts`, a wired service that is not a port takes the `isPortName` branch, and no port is compared as a string. `PortActivity.port` is a `PortName`, and the dock model holds the result as `services`, computed from one shown reading ([BEH-QD-611](behaviors/28-devtools-screens.md#beh-qd-611-a-port-card-is-one-model-row-keyed-by-its-wired-service), [BEH-QD-613](behaviors/28-devtools-screens.md#beh-qd-613-a-cards-recent-calls-are-a-closed-union-the-panel-prints), [BEH-QD-614](behaviors/28-devtools-screens.md#beh-qd-614-port-activity-reads-one-entry-per-registry-port), [BEH-QD-615](behaviors/28-devtools-screens.md#beh-qd-615-the-services-store-is-one-moment-and-keeps-its-reference-when-nothing-moved)).

**Source**: `packages/devtools/src/model/PortCards.ts` — `portCards`, the per-port records and `isPortName`; `packages/devtools/src/model/Wiring.ts` — `portActivity`, one entry per registry port; `packages/devtools/src/model/DockModel.ts` — `services`, a derived store keyed by the wiring read, the activity, the call log and the unsampled flag, recomputed only when one of them changes identity.

**Implication**: a misspelt or unknown port is a compile error, a card cannot show another port's count or calls, and the cards are always of one moment: the three readings the Services panel used to pair by string in its render are joined once, in the model, by the port's name. A word written to a port metric outside the registry is no longer reported, because nothing reads a name the registry does not hold.

**Enforcement**: `packages/devtools/test/model/PortCards.test.ts` (the wiring states, the rows, the cache, `isPortName`, recent calls and the four rows that are not ports, from the real wiring report), `packages/devtools/test/model/PortCards.tst.ts` (a misspelt port is a compile error in a `PortActivity` literal and in the per-port records), the registry cases in `packages/devtools/test/model/Wiring.test.ts`, `packages/devtools/test/model/DockModel.test.ts` (M48 to M54) and the typecheck.

**Related**: [INV-QD-343](#inv-qd-343-a-questions-snapshot-pairs-each-asked-question-with-the-guards-asking-it-at-one-moment), [INV-QD-044](#inv-qd-044-a-span-never-carries-a-resolved-attributes-value), [INV-QD-007](#inv-qd-007-defaults-fail-closed), [INV-QD-356](#inv-qd-356-the-services-panel-computes-nothing), [BEH-QD-611](behaviors/28-devtools-screens.md#beh-qd-611-a-port-card-is-one-model-row-keyed-by-its-wired-service), [BEH-QD-613](behaviors/28-devtools-screens.md#beh-qd-613-a-cards-recent-calls-are-a-closed-union-the-panel-prints), [BEH-QD-614](behaviors/28-devtools-screens.md#beh-qd-614-port-activity-reads-one-entry-per-registry-port), [BEH-QD-615](behaviors/28-devtools-screens.md#beh-qd-615-the-services-store-is-one-moment-and-keeps-its-reference-when-nothing-moved), [ADR-QD-168](decisions/168-a-port-card-is-a-model-row.md).

## INV-QD-356: The Services panel computes nothing

`ServicesPanel.tsx` reads `DockModel.services` and maps its tags to JSX: it holds no wording rule, count, filter, slice, format or unsampled test, and every word it prints is a field of the view, except the fixed prose that is the same for every reading ([BEH-QD-612](behaviors/28-devtools-screens.md#beh-qd-612-a-cards-wording-is-stated-once-in-the-model)).

**Source**: `packages/devtools/src/react/ServicesPanel.tsx` and `packages/devtools/src/react/DevtoolsDock.tsx`, which hands the panel the model's `services` and nothing else of the reading.

**Implication**: what a reviewer reads on the Services tab is what the model's tests pin, as [ADR-QD-047](decisions/047-a-headless-devtools-model.md) requires of every screen. A change to a card's wording is a change to `PortCards.ts` and fails its test, rather than a render edit that only mounting the dock could catch.

**Enforcement**: `packages/devtools/test/react/ServicesPanel.characterisation.test.tsx` (the panel's markup byte for byte over sixteen cells, written on the phase base and never edited) and `packages/devtools/test/react/ServicesPanel.test.tsx` (the render-level cases). No gate scans the panel's source: the rule is held by the characterisation and the render test, not by a standing check in `pnpm check`.

**Related**: [INV-QD-355](#inv-qd-355-a-port-cards-readings-are-joined-by-portname-in-one-pure-model-function), [BEH-QD-612](behaviors/28-devtools-screens.md#beh-qd-612-a-cards-wording-is-stated-once-in-the-model), [ADR-QD-047](decisions/047-a-headless-devtools-model.md), [ADR-QD-168](decisions/168-a-port-card-is-a-model-row.md).

## INV-QD-357: One feed owns the gate registry, its subscription, its failure state and the questions input

The gates feed, built in the dock model's scope, alone holds the gate registry, its subscription and release, its failure state and the key it compares failures by, and the questions input with the cadence that reads it. `DockModel` holds no gate-watch state: its join is a derived store over the feed's snapshot, and it reads no registry and no thunk itself ([BEH-QD-616](behaviors/28-devtools-screens.md#beh-qd-616-one-feed-owns-the-gate-watch-and-the-questions-input), [BEH-QD-619](behaviors/28-devtools-screens.md#beh-qd-619-the-questions-store-joins-three-readings-and-reads-no-host-code)).

> **Amended in CCR-QD-464 (ARCH-119).** The model's own last join and closed check gave way to a
> derived store that holds its key and stops with the scope
> ([ADR-QD-185](decisions/185-the-dock-models-computed-stores-are-derived-stores.md)). The statement
> used to say the model kept both.

**Source**: `packages/devtools/src/model/GatesFeed.ts` (the registry watch, the thunk's cadence, the guarded reads and `stated`, the closed check), and `packages/devtools/src/model/DockModel.ts` (the join of the three feeds, and nothing else of the watch).

**Implication**: a watch rule is tested against the feed alone, with no model around it, and a model that keeps a second copy of the watch is the drift ARCH-103 removed: two places to guard a host's throw, two failure keys, and a rule fixed in one and not the other (`ARCH-103, CCR-QD-447`).

**Enforcement**: `packages/devtools/test/model/GatesFeed.test.ts` (the twins of the model's watch cases, T1 to T7 and GP2), `packages/devtools/test/model/DockModel.test.ts` (J1 to J8, the join), and the source scan recorded in 56-07's SUMMARY. No standing gate scans `DockModel.ts` for the watch: the rule is held by the feed's tests and the model's join cases, not by a check in `pnpm check`.

**Related**: [INV-QD-343](#inv-qd-343-a-questions-snapshot-pairs-each-asked-question-with-the-guards-asking-it-at-one-moment), [INV-QD-358](#inv-qd-358-the-questions-panels-two-host-inputs-fail-the-same-way-and-neither-stops-the-diagnostics-poll), [BEH-QD-616](behaviors/28-devtools-screens.md#beh-qd-616-one-feed-owns-the-gate-watch-and-the-questions-input), [BEH-QD-617](behaviors/28-devtools-screens.md#beh-qd-617-the-questions-are-a-dock-input-read-on-the-diagnostics-cadence), [BEH-QD-619](behaviors/28-devtools-screens.md#beh-qd-619-the-questions-store-joins-three-readings-and-reads-no-host-code), [ADR-QD-169](decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md), [ADR-QD-137](decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md).

## INV-QD-358: The questions panel's two host inputs fail the same way, and neither stops the diagnostics poll

A gate registry that throws and a questions input that throws are each stated as their own `Failed` view with a reason: never thrown out of the dock model, never shown as an empty list, never a reason to end, stop or restart the diagnostics poll. Each mends when it is read again ([BEH-QD-618](behaviors/28-devtools-screens.md#beh-qd-618-a-questions-input-that-throws-is-stated-and-the-poll-keeps-running)).

**Source**: `packages/devtools/src/model/GatesFeed.ts` (the guarded reads and `stated`), `packages/devtools/src/model/Gates.ts` (`joinQuestions`: questions read, then a failed read, then unsampled, then absent, with each failure stated independently of the other), and `packages/devtools/src/react/QuestionsPanel.tsx` (the two paragraphs, the registry's first).

**Implication**: before ARCH-103 a throwing questions thunk ended the diagnostics poll, which froze wiring, activity and calls on every tab, while a throwing registry froze nothing. Two host inputs of one panel failed in two ways, and the worse one was the one nothing stated (`ARCH-103, CCR-QD-447`).

**Enforcement**: `packages/devtools/test/model/GatesFeed.test.ts` (T1 to T3, and the registry's twins G37 to G47), `packages/devtools/test/model/DockModel.test.ts` (J2, J4), `packages/devtools/test/react/QuestionsPanel.thunk.test.tsx` (Q1 to Q5, written to fail on the phase base) and `packages/devtools/test/model/Gates.test.ts` (`joinQuestions`).

**Related**: [INV-QD-313](#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes), [INV-QD-343](#inv-qd-343-a-questions-snapshot-pairs-each-asked-question-with-the-guards-asking-it-at-one-moment), [INV-QD-357](#inv-qd-357-one-feed-owns-the-gate-registry-its-subscription-its-failure-state-and-the-questions-input), [BEH-QD-507](behaviors/28-devtools-screens.md#beh-qd-507-a-defect-stops-the-poll-visibly-and-a-restart-resumes-it), [BEH-QD-618](behaviors/28-devtools-screens.md#beh-qd-618-a-questions-input-that-throws-is-stated-and-the-poll-keeps-running), [ADR-QD-169](decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md), [ADR-QD-162](decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md).

## INV-QD-359: One option states an envelope's unknown-key policy, and no seam hand-builds it

Every `untrustedDecoder` call states `unknownKeys` as `"refuse"` or `"ignore"`; the type refuses an omitted or any other value, the decoder reads it through one closed table, and no seam projects or classifies envelope keys by hand. Under `ignore` the declared keys come from the schema's encoded side and from nowhere else ([BEH-QD-621](behaviors/08-serialization.md#beh-qd-621-every-untrusted-decoder-states-its-unknown-key-policy), [BEH-QD-623](behaviors/08-serialization.md#beh-qd-623-the-declared-keys-are-read-from-the-schemas-encoded-side)).

**Source**: `packages/core/src/UntrustedDecode.ts` (`UnknownKeyPolicy`, the required option, the `PROJECTION` table), `packages/core/src/EnvelopeKeys.ts` (`envelopeKeysOf`, package-private), and each call site that states a policy (`Policy.ts`, `SinkCodec.ts`, `PortWireEncode.ts`, `PortRemote.ts`, `packages/audit/src/AuditArchive.ts`, `AuditEntry.ts` and `packages/react/src/HydrationEngine.ts`).

**Implication**: before ADR-QD-170 two envelopes in one module held their own key handling, one by a projection built from two hand-derived key sets and one by a hand-built reader, and a deep unknown key was refused by one and ignored by the other. Every other envelope was strict by the decode's default with nothing at the decoder saying so, so an envelope that forgot to decide looked the same as one that had decided (ARCH-104, ADR-QD-170).

**Enforcement**: `packages/core/test/UntrustedDecode.tst.ts` (the type pins: `unknownKeys` is required, closed, and an omitted `options` does not compile), `packages/core/test/UntrustedDecode.test.ts` (the `unknownKeys` describe, U1 to U21, including the build-time refusal of a schema whose keys cannot be derived) and the `[untrusted-decode]` rule in `scripts/check-house-style.mjs`, which fails a hand-built decode in `packages/*/src` outside the budgeted files.

**Related**: [INV-QD-305](#inv-qd-305-every-untrusted-json-seam-is-guarded-by-construction), [INV-QD-306](#inv-qd-306-an-unwalked-slot-is-unknown-and-has-its-own-guarded-decoder), [INV-QD-360](#inv-qd-360-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input), [BEH-QD-486](behaviors/08-serialization.md#beh-qd-486-untrusted-json-is-decoded-through-one-decoder), [BEH-QD-621](behaviors/08-serialization.md#beh-qd-621-every-untrusted-decoder-states-its-unknown-key-policy), [BEH-QD-623](behaviors/08-serialization.md#beh-qd-623-the-declared-keys-are-read-from-the-schemas-encoded-side), [ADR-QD-170](decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md), [ADR-QD-143](decisions/143-untrusted-json-is-decoded-through-one-module.md).

## INV-QD-360: An ignored key is never walked, so it cannot refuse the input

Under `ignore`, an undeclared top-level key is dropped before the depth guard and never walked, so no value in it can make the input `TooDeep` or `Malformed`, while every declared key is still walked and strictly decoded and keeps the precedence `TooDeep`, `UnsupportedVersion`, `Malformed` ([BEH-QD-622](behaviors/08-serialization.md#beh-qd-622-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input)).

**Source**: `packages/core/src/UntrustedDecode.ts` (`project`, and `decode`'s order: project, guard, `prepare`, strict decode), `packages/core/src/SinkCodec.ts` (the record wire and the stored envelope, `ignore`), and through `decodeSinkRecordWithJson`, `packages/audit/src/AuditEntry.ts` and `AuditArchive.ts`.

**Implication**: a key whose content is ignored that could still refuse the input is not ignored, and keeping it would have needed a third policy, "ignore but walk". The projection is a top-level copy that reads an undeclared key's name and never its value ([INV-QD-377](#inv-qd-377-the-ignore-projection-never-reads-an-undeclared-value)), so it cannot overflow on hostile nesting, and the guard's bound (INV-QD-305) is untouched for everything the strict decode reads. It widens what is accepted: a deep unknown record key was `TooDeep` before, in the record wire (D-01) and so in an audit row's and an archive entry's record (D-20). A deep `environment` on the stored envelope is `TooDeep`, because it is declared (D-18).

**Enforcement**: `packages/core/test/UntrustedDecode.test.ts` (U2, U3, U6), `packages/core/test/UntrustedSeams.test.ts` (the record wire R3 to R6 and R14, the stored envelope S3, S4 and S15) and `packages/audit/test/UntrustedSeams.test.ts` (the row A6 to A8, the archive V8).

**Related**: [INV-QD-305](#inv-qd-305-every-untrusted-json-seam-is-guarded-by-construction), [INV-QD-306](#inv-qd-306-an-unwalked-slot-is-unknown-and-has-its-own-guarded-decoder), [INV-QD-359](#inv-qd-359-one-option-states-an-envelopes-unknown-key-policy-and-no-seam-hand-builds-it), [BEH-QD-622](behaviors/08-serialization.md#beh-qd-622-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input), [BEH-QD-624](behaviors/26-decision-stream.md#beh-qd-624-the-stored-record-envelope-is-read-by-the-untrusted-decoder), [BEH-QD-625](behaviors/33-audit-pipeline.md#beh-qd-625-a-deep-unknown-key-inside-an-audit-rows-record-is-ignored), [ADR-QD-170](decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md).

## INV-QD-361: A stored record holds the record it was handed, by reference and with its class

A log's stored record and a decoded one are `StoredRecord` values whose `record` is the very `DecisionRecord` or `ObligationRecord` instance built for it, so `instanceof`, `Equal` and `Hash` hold through it, and building the envelope reads no field of the record ([BEH-QD-626](behaviors/24-decision-sink.md#beh-qd-626-a-stored-record-is-the-envelope-holding-the-record-it-was-handed), [BEH-QD-630](behaviors/24-decision-sink.md#beh-qd-630-a-decision-logs-record-path-has-no-catch-of-its-own)).

**Source**: `packages/core/src/DecisionRecord.ts` (`StoredRecord`), `packages/core/src/DecisionLog.ts` (`append`) and `packages/core/src/SinkCodec.ts` (`fromEnvelope`).

**Implication**: the flattened copy this replaced lost the prototype unless it was rebuilt per tag, and a spread read every enumerable getter of the record it copied. Holding the instance removes both, at the cost of aliasing: the stored record and the one the caller passed are the same object, so a mutation of one is a mutation of the other, which a record's `readonly` fields and `Data` construction already refuse ([ADR-QD-171](decisions/171-a-stored-record-is-its-envelope-in-memory-too.md)).

**Enforcement**: `packages/core/test/StoredEnvelope.test.ts` (N1 to N4, and L1 to L5 for the log's build) and `packages/core/test/StoredEnvelope.tst.ts` (the envelope's type, and that it has no `_tag` key).

**Related**: [INV-QD-362](#inv-qd-362-a-stored-records-wire-is-its-records-wire-plus-one-field), [BEH-QD-626](behaviors/24-decision-sink.md#beh-qd-626-a-stored-record-is-the-envelope-holding-the-record-it-was-handed), [BEH-QD-630](behaviors/24-decision-sink.md#beh-qd-630-a-decision-logs-record-path-has-no-catch-of-its-own), [ADR-QD-171](decisions/171-a-stored-record-is-its-envelope-in-memory-too.md).

## INV-QD-362: A stored record's wire is its record's wire plus one field

`encodeStoredRecord(stored)` is `{ environment: stored.environment, record: encodeSinkRecord(stored.record) }`, and decoding then encoding a stored text yields the same bytes ([BEH-QD-627](behaviors/26-decision-stream.md#beh-qd-627-the-stored-codec-is-the-record-codec-plus-one-field)).

**Source**: `packages/core/src/SinkCodec.ts` (`encodeStoredRecord`, `decodeStoredRecord`).

**Implication**: the stored codec has no stamp step and no field list of its own, so it cannot drift from the record codec; the bytes a v0.12 reader wrote are the bytes it reads, and the wire did not move (ADR-QD-171 D-05).

**Enforcement**: `packages/core/test/StoredEnvelope.test.ts` (G1 to G9: the composed goldens and the fixed point), `packages/http/test/StoredEnvelopeWire.test.ts` (W1, W2) and `packages/core/test/SinkCodec.test.ts`.

**Related**: [INV-QD-361](#inv-qd-361-a-stored-record-holds-the-record-it-was-handed-by-reference-and-with-its-class), [BEH-QD-627](behaviors/26-decision-stream.md#beh-qd-627-the-stored-codec-is-the-record-codec-plus-one-field), [ADR-QD-097](decisions/097-a-decision-log-is-a-sink-and-its-own-history.md), [ADR-QD-171](decisions/171-a-stored-record-is-its-envelope-in-memory-too.md).

## INV-QD-363: Both interpreters read the environment admission built

`walk` and `toPredicate` read the subject, what was supplied, the matcher context and the depth bound only from the `Admitted` that `admit` built for the question, once per evaluation; neither builds `supplied` nor copies the resource or the action, and recursion passes one environment and one depth ([BEH-QD-631](behaviors/05-evaluator.md#beh-qd-631-admission-builds-the-one-walk-environment), [BEH-QD-634](behaviors/05-evaluator.md#beh-qd-634-recursion-passes-the-policy-the-environment-and-one-depth), [BEH-QD-635](behaviors/05-evaluator.md#beh-qd-635-the-environment-is-built-once-per-evaluation-and-never-on-a-cache-hit)).

**Source**: `packages/core/src/Admission.ts` (`Admitted`, `admit`), `packages/core/src/Walk.ts` (`Evaluation`, `evaluateNode`, `walk`) and `packages/core/src/Predicate.ts` (`compileTree`, `toPredicate`).

**Implication**: a fact held in two places drifts. The walk had copied the resource and the action and hand-built `supplied`, and six positional arguments let `depth` and `maxDepth` swap and still compile (ADR-QD-172).

**Enforcement**: `packages/core/test/Admission.test.ts` (E1 to E6), `packages/core/test/WalkEnvironment.tst.ts`, `packages/core/test/LeafMatrix.test.ts`, `packages/core/test/RolesAndDepth.test.ts` and `packages/core/test/DecisionCache.test.ts`.

**Related**: [INV-QD-037](#inv-qd-037-a-measured-depth-agrees-with-the-evaluated-bound), [INV-QD-364](#inv-qd-364-what-a-request-supplied-is-a-function-of-its-row-source-and-its-question), [BEH-QD-631](behaviors/05-evaluator.md#beh-qd-631-admission-builds-the-one-walk-environment), [BEH-QD-634](behaviors/05-evaluator.md#beh-qd-634-recursion-passes-the-policy-the-environment-and-one-depth), [BEH-QD-635](behaviors/05-evaluator.md#beh-qd-635-the-environment-is-built-once-per-evaluation-and-never-on-a-cache-hit), [ADR-QD-100](decisions/100-a-question-is-asked-once.md), [ADR-QD-172](decisions/172-admission-produces-the-one-walk-environment.md).

## INV-QD-364: What a request supplied is a function of its row source and its question

`supplied.action` is whether the question carries an action; `supplied.resource` is whether it carries a resource for the row source `"asked"` and `true` for `"row"`; `admit` computes both from one closed table, `SUPPLIED`, whose rows are typed per row source and read the matcher context `admit` builds once (INV-QD-376) ([BEH-QD-632](behaviors/05-evaluator.md#beh-qd-632-an-asked-question-supplies-what-it-carries), [BEH-QD-633](behaviors/16-predicates.md#beh-qd-633-a-predicates-row-is-always-supplied)).

**Source**: `packages/core/src/Admission.ts` (`RowSource`, `SuppliedBy`, `SUPPLIED`, `admit`).

**Implication**: an absent resource reported as supplied would let a resource leaf read `{}` instead of failing with `MissingResource`; a row source added without a row does not compile (ADR-QD-172).

**Enforcement**: `packages/core/test/Admission.test.ts` (E1 to E5), `packages/core/test/WalkEnvironment.tst.ts` (a row is `true`, an asked resource `boolean`, an unknown source refused) and `packages/core/test/LeafMatrix.test.ts`.

**Related**: [INV-QD-363](#inv-qd-363-both-interpreters-read-the-environment-admission-built), [BEH-QD-632](behaviors/05-evaluator.md#beh-qd-632-an-asked-question-supplies-what-it-carries), [BEH-QD-633](behaviors/16-predicates.md#beh-qd-633-a-predicates-row-is-always-supplied), [ADR-QD-163](decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md), [ADR-QD-172](decisions/172-admission-produces-the-one-walk-environment.md).

## INV-QD-365: Every read the dock runs is reachable headless, and none the root exports goes unwatched

Each of the dock model's three reads (the timeline, the diagnostics poll and the gate watch) is a feed `@qadi/devtools` exports from its root, built in the caller's scope and reporting a closed status; the root exports no runner a caller must fork, supersede and watch itself ([BEH-QD-636](behaviors/28-devtools-screens.md#beh-qd-636-the-timeline-feed-is-the-roots-timeline-interface), [BEH-QD-637](behaviors/28-devtools-screens.md#beh-qd-637-the-diagnostics-feed-is-the-roots-poll-and-its-stop-is-stated), [BEH-QD-638](behaviors/28-devtools-screens.md#beh-qd-638-the-gates-feed-is-the-roots-gate-watch), [BEH-QD-640](behaviors/28-devtools-screens.md#beh-qd-640-the-runners-are-the-feeds-engines-not-the-interface)).

**Source**: `packages/devtools/src/index.ts` (the named list), `packages/devtools/src/model/TimelineFeed.ts`, `packages/devtools/src/model/DiagnosticsFeed.ts` and `packages/devtools/src/model/GatesFeed.ts`.

**Implication**: a runner the root exports is a read a shell must watch for its own stop. The root's `runDiagnostics` had no stop detection, so a headless poll that died stayed `Live`, while the dock's own feed stated it (ADR-QD-173).

**Enforcement**: `packages/devtools/test/surface.test.ts`, `packages/devtools/test/surface.tst.ts` and the three feed suites, `packages/devtools/test/model/TimelineFeed.test.ts`, `packages/devtools/test/model/DiagnosticsFeed.test.ts` and `packages/devtools/test/model/GatesFeed.test.ts`, which import through the root.

**Related**: [INV-QD-313](#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes), [INV-QD-357](#inv-qd-357-one-feed-owns-the-gate-registry-its-subscription-its-failure-state-and-the-questions-input), [INV-QD-366](#inv-qd-366-the-diagnostics-poll-has-one-option-shape-read-without-translation), [BEH-QD-636](behaviors/28-devtools-screens.md#beh-qd-636-the-timeline-feed-is-the-roots-timeline-interface), [ADR-QD-047](decisions/047-a-headless-devtools-model.md), [ADR-QD-099](decisions/099-entry-points-are-a-closed-list.md), [ADR-QD-173](decisions/173-the-devtools-headless-interface-is-its-feeds.md).

## INV-QD-366: The diagnostics poll has one option shape, read without translation

> **Amended 2026-11-25 (CCR-QD-475).** `DiagnosticsOptions` is declared in `Diagnostics.ts`, the module that holds the reading and its laws, and the engine takes a `DiagnosticsSink` beside it, so `runDiagnostics(sink, options)` reads the options unchanged ([BEH-QD-752](behaviors/28-devtools-screens.md#beh-qd-752-the-poll-hands-each-sample-to-a-sink-and-the-feeds-sink-drops-a-superseded-runs-sample-before-it-folds), [ADR-QD-196](decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md)).

`DiagnosticsOptions` is declared once, in `packages/devtools/src/model/Diagnostics.ts`; the engine, the feed, `useDiagnostics`, the dock's `diagnostics` prop and the model input take it unchanged, there is no `runOptions` translator, and the React entry's `DiagnosticsOptions` is the root's ([BEH-QD-639](behaviors/28-devtools-screens.md#beh-qd-639-one-option-shape-configures-the-poll)).

**Source**: `packages/devtools/src/model/Diagnostics.ts` (`DiagnosticsOptions`, `runDiagnostics`) and `packages/devtools/src/model/DiagnosticsFeed.ts` (`makeDiagnosticsFeed`).

**Implication**: two shapes for one poll needed a translator, and a field one carried and the other dropped (`schedule`, `intervalMillis`) was a silent disagreement; the feed restarts on a changed `intervalMillis`, which needs a value it can compare (ADR-QD-173).

**Enforcement**: `packages/devtools/test/model/Diagnostics.tst.ts`, `packages/devtools/test/surface.tst.ts` and `packages/devtools/test/model/Diagnostics.test.ts`.

**Related**: [INV-QD-365](#inv-qd-365-every-read-the-dock-runs-is-reachable-headless-and-none-the-root-exports-goes-unwatched), [BEH-QD-639](behaviors/28-devtools-screens.md#beh-qd-639-one-option-shape-configures-the-poll), [BEH-QD-323](behaviors/28-devtools-screens.md#beh-qd-323-diagnostics-are-sampled-by-the-model-and-a-sample-that-changed-nothing-changes-nothing), [ADR-QD-173](decisions/173-the-devtools-headless-interface-is-its-feeds.md).

## INV-QD-367: No caller can pair a cache key with a computation

`DecisionCacheShape.getOrCompute` takes a `Question` and, optionally, `Pick<EvaluateOptions, "concurrency">`, and nothing else: an `Effect`, a function returning one, or a third argument is refused at compile time ([BEH-QD-641](behaviors/21-decision-cache.md#beh-qd-641-the-cache-is-asked-the-question-and-how-the-walk-runs)).

**Source**: `packages/core/src/DecisionCache.ts` (`DecisionCacheShape`).

**Implication**: the key is the security boundary (ADR-QD-031). The pairing of a key with the trace stored under it used to hold only because one caller handed the cache the walk of the same question; now no caller can pair them any other way (ADR-QD-174). A host-written implementation is outside this invariant ([BEH-QD-645](behaviors/21-decision-cache.md#beh-qd-645-a-host-written-cache-answers-with-its-own-trace)).

**Enforcement**: `packages/core/test/DecisionCache.tst.ts`.

**Related**: [INV-QD-368](#inv-qd-368-a-trace-the-cache-settles-under-a-question-is-the-walk-of-that-question), [INV-QD-030](#inv-qd-030-cache-key-uniqueness), [INV-QD-033](#inv-qd-033-a-cached-decision-belongs-to-the-grants-that-earned-it), [ADR-QD-174](decisions/174-a-decision-cache-is-asked-the-question.md).

## INV-QD-368: A trace the cache settles under a question is the walk of that question

In `decisionCacheLayer`, every trace settled under a key `q` is the exit of a walk of `q`, run with the claimant's `concurrency`, and that `concurrency` never enters the key ([BEH-QD-642](behaviors/21-decision-cache.md#beh-qd-642-decisioncachelayer-walks-the-question-it-is-given), [BEH-QD-643](behaviors/21-decision-cache.md#beh-qd-643-concurrency-reaches-the-walk-and-never-the-key)).

**Source**: `packages/core/src/DecisionCache.ts` (`decisionCacheLayer`'s adapter, `shared.run(key, walk(key, options?.concurrency))`).

**Implication**: a hit for `q` answers what a fresh walk of `q` would ([INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)), whichever caller claimed it and however it was walked ([INV-QD-020](#inv-qd-020-concurrency-changes-lookups-never-decisions)).

**Enforcement**: `packages/core/test/DecisionCache.test.ts` (one entry for two concurrencies, `concurrency` reaching the walk, the claimant's `concurrency` governing a joined walk, and the I5 race test) and `packages/core/test/Lifecycle.test.ts`; `packages/core/test/DecisionCache.tst.ts` refuses every other source of a trace a caller could offer.

**Related**: [INV-QD-367](#inv-qd-367-no-caller-can-pair-a-cache-key-with-a-computation), [INV-QD-307](#inv-qd-307-a-superseded-claims-exit-never-settles-and-its-waiters-are-still-answered-exactly-once), [ADR-QD-174](decisions/174-a-decision-cache-is-asked-the-question.md).

## INV-QD-373: Every listener is called, and what one throws is never swallowed

A notification of a store `@qadi/devtools` builds on `makeExternalStore` calls every listener in the live set, in order, whether or not one before it threw, and then rethrows what they threw: nothing when none did, the one value itself when one did, and one `AggregateError` holding every thrown value in call order when more did ([BEH-QD-656](behaviors/28-devtools-screens.md#beh-qd-656-a-throwing-listener-does-not-silence-the-others)).

**Source**: `packages/devtools/src/model/ExternalStore.ts` (`callAll`, the one place the rule is written; `notify` is `callAll` over the live listener set, a derived store's release and the `configure` of the timeline feed and of the dock model run on it too, and the timeline, diagnostics and gates feeds' stores, and the dock's, are built on `makeExternalStore`).

**Implication**: a host's listener cannot keep a change from the dock's own listener or from another host's, and what it throws still reaches the call that published ([ADR-QD-177](decisions/177-one-throwing-listener-cannot-silence-the-rest.md), stated once as `callAll` by [ADR-QD-194](decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md)).

**Enforcement**: `packages/devtools/test/model/ExternalStore.test.ts`, `packages/devtools/test/model/ExternalStore.callAll.test.ts` (the rule on its own), and through the root `packages/devtools/test/model/TimelineFeed.test.ts`, `packages/devtools/test/model/TimelineFeed.listeners.test.ts`, `packages/devtools/test/model/DiagnosticsFeed.test.ts`, `packages/devtools/test/model/GatesFeed.test.ts` and, through the dock model, `packages/devtools/test/model/DockModel.listeners.test.ts`.

**Related**: [INV-QD-365](#inv-qd-365-every-read-the-dock-runs-is-reachable-headless-and-none-the-root-exports-goes-unwatched), [INV-QD-407](#inv-qd-407-a-configure-leaves-no-input-unapplied-whatever-a-listener-throws), [BEH-QD-742](behaviors/28-devtools-screens.md#beh-qd-742-what-the-steps-of-a-configure-threw-surfaces-once-after-the-last-step), [ADR-QD-173](decisions/173-the-devtools-headless-interface-is-its-feeds.md), [ADR-QD-177](decisions/177-one-throwing-listener-cannot-silence-the-rest.md), [ADR-QD-194](decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md).

## INV-QD-375: Only `admit` builds an `Admitted`

`Admitted`'s constructor is private and the class declares a private member, `nominal`, so outside `Admission.ts` no call to the constructor and no object literal of the class's shape type-checks as an `Admitted`; `admit`, the class's static method exported as `admit`, is the one construction site ([BEH-QD-661](behaviors/05-evaluator.md#beh-qd-661-only-admit-builds-an-admitted)).

**Source**: `packages/core/src/Admission.ts` (`Admitted`, its private constructor and its `nominal` member, `Admitted.admit`, `admit`).

**Implication**: holding an `Admitted` shows that `admit` built it: the policy `admit` read for its depth check was no deeper than the bound it read, and `supplied` was computed for its row source; with a public constructor any module could build one that showed neither. `admit` reads the question's `policy`, `maxDepth` and `subject` once each, so the policy an `Admitted` carries is the one its depth check judged, against the bound it carries, for every question, one whose property answers differently on a second read included. This is a property of type-checked code: at run time the constructor is an ordinary function, and a type assertion could still claim an `Admitted`, which the house style forbids (ADR-QD-172).

**Enforcement**: `packages/core/test/WalkEnvironment.tst.ts` (the constructor call and the literal, each refused under a `@ts-expect-error` whose text names the reason it expects, TS2673 and TS2741), read by `pnpm typecheck` and `pnpm test:tstyche`. A directive accepts any diagnostic on its line, so the gate shows that each is refused and not why: the two codes are read by number only by ARCH-112's recorded `pin-codes.mjs`, which compiles the file with the directives blanked and which `pnpm check:pr` does not run. The literal pin has a positive control beside it, a value `admit` built typed as the same `Admitted`; the line after the constructor pin checks `admit`'s return type and says nothing about the call it follows. `packages/core/test/Admission.test.ts` (E11 to E13: a policy, a bound or a subject that answers differently on a second read is read once) pins the single read.

**Related**: [INV-QD-363](#inv-qd-363-both-interpreters-read-the-environment-admission-built), [INV-QD-376](#inv-qd-376-the-supplied-flags-and-the-matcher-context-come-from-one-read-of-the-questions-resource-and-action), [BEH-QD-631](behaviors/05-evaluator.md#beh-qd-631-admission-builds-the-one-walk-environment), [ADR-QD-172](decisions/172-admission-produces-the-one-walk-environment.md).

## INV-QD-376: The supplied flags and the matcher context come from one read of the question's resource and action

`admit` builds the matcher context once per question and each `SUPPLIED` row reads the action, and the `"asked"` row the resource, from it, so the question's resource and action are each read once, and `supplied.action`, and for the row source `"asked"` `supplied.resource`, agree with the matcher context for every question, one whose property answers differently on a second read included; the `"row"` row's resource is the constant `true` ([BEH-QD-662](behaviors/05-evaluator.md#beh-qd-662-an-asked-flag-agrees-with-the-matcher-context)).

**Source**: `packages/core/src/Admission.ts` (`SUPPLIED`, `Admitted.admit`).

**Implication**: a flag read in one place and a value read in another agree only while both reads give the same answer. The compiler does not check this: `SuppliedBy`'s `"asked"` flags are `boolean`, so an `"asked"` row that ignored the context would still compile, and the tests are what hold it (ADR-QD-172). `admit` reads the question's other fields once as well, its `policy`, `maxDepth` and `subject` at its top ([INV-QD-375](#inv-qd-375-only-admit-builds-an-admitted)).

**Enforcement**: `packages/core/test/Admission.test.ts` (E7 to E10: a resource or an action that answers differently on a second read is read once, and the flag agrees with the context; E11 to E13: a policy, a bound or a subject that answers differently on a second read is read once) and `packages/core/test/LeafMatrix.test.ts`.

**Related**: [INV-QD-364](#inv-qd-364-what-a-request-supplied-is-a-function-of-its-row-source-and-its-question), [INV-QD-375](#inv-qd-375-only-admit-builds-an-admitted), [BEH-QD-632](behaviors/05-evaluator.md#beh-qd-632-an-asked-question-supplies-what-it-carries), [ADR-QD-172](decisions/172-admission-produces-the-one-walk-environment.md).

## INV-QD-377: The ignore projection never reads an undeclared value

Under `ignore`, the projection of a plain object reads the object's own enumerable key names, then copies the value of each key the selected member declares into a fresh object, reading it once, and never reads the value of an undeclared key, so an undeclared accessor on an in-process value is never invoked. The object's own enumerable `_tag` is read to choose a member only when the schema flattens to more than one object member, so there it is read twice, once to choose the member and once as a kept value. A schema that flattens to one member, whether it is a one-object schema or a union of one, chooses no member, so no `_tag` is read to choose one: a declared `_tag` is read once, as a kept value, and an undeclared `_tag` accessor is never invoked ([BEH-QD-666](behaviors/08-serialization.md#beh-qd-666-the-ignore-projection-reads-names-then-copies-only-the-declared-values)).

**Source**: `packages/core/src/UntrustedDecode.ts` (`project`), `packages/core/src/EnvelopeKeys.ts` (`envelopeKeysOf`).

**Implication**: only the top level is projected. The depth guard, `prepare` and the strict decode receive the projection's copy, so none of them invokes a top-level accessor, but what lies under a kept value is read by the guard, unless the key is `unwalked`, and by the strict decode, accessors included. Under `refuse` nothing is projected, so every own value of the input is read, declared or not: by the depth guard at every depth, and for an `unwalked` key by the walk that leaves it out, which reads its value but not what lies under it; an accessor that throws there is thrown out of the decode. Neither is changed by this invariant ([ADR-QD-170](decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md)'s 2026-11-20 amendment). The projection reads an in-process value as its accessors answer, each read once: a union's `_tag` that answers differently on its second read chooses one member's keys and is copied as another member's tag, so the strict decode refuses the projection as malformed; and an accessor that deletes a later own key when it is read leaves that key in the projection with no value, because the names were read first, so the refusal names the value's expected type and not a missing key. The strict decode reads only the projection, so what it admits is a value of the schema either way.

**Enforcement**: `packages/core/test/UntrustedDecode.test.ts` (U22 to U31) and `packages/core/test/UntrustedSeams.test.ts` (the record wire R15 to R17, the stored envelope S16 to S18).

**Related**: [INV-QD-306](#inv-qd-306-an-unwalked-slot-is-unknown-and-has-its-own-guarded-decoder), [INV-QD-359](#inv-qd-359-one-option-states-an-envelopes-unknown-key-policy-and-no-seam-hand-builds-it), [INV-QD-360](#inv-qd-360-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input), [INV-QD-097](#inv-qd-097-the-record-codec-is-total), [BEH-QD-623](behaviors/08-serialization.md#beh-qd-623-the-declared-keys-are-read-from-the-schemas-encoded-side), [ADR-QD-170](decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md).

## INV-QD-379: A bounded decision cache holds at most `capacity` entries and evicts the oldest first

With `capacity` set, the cache's insertion order holds the key of every completed entry once, in the order the entries settled, and nothing else. When a settle takes the cache past `capacity`, the keys beyond it at the front of that order are evicted together, in the step that settled, so no fiber sees more than `capacity` entries. An entry whose walk is still in flight is in neither, so it is never evicted.

**Source**: `packages/core/src/DecisionCache.ts` (`settle`: `Chunk.splitAt` over `insertionOrder`, then `HashMap.removeMany`; `clear`), `packages/core/src/SharedComputation.ts` (the one synchronous claim step, so a key is appended once per walk).

**Implication**: the eviction has no branch a cache cannot take. A settle that leaves the cache within `capacity` evicts nothing because `Chunk.splitAt` takes no keys for a count of zero or below, not because a guard skips the step, so a test kills every mutant of it (ARCH-114, CCR-QD-458). A negative, `NaN` or fractional `capacity` is refused at construction ([BEH-QD-166](behaviors/21-decision-cache.md#beh-qd-166-capacity-bounds-the-cache-validated-at-construction)).

**Enforcement**: `packages/core/test/DecisionCache.test.ts` — "evicts the oldest completed entry once exceeded, insertion order (FIFO)", "capacity: 0 is a legal, degenerate cache that retains nothing", "never evicts a key with a compute still in flight", and the race test "a joiner racing its owner's completion never recomputes the key, and FIFO stays exact"; `stryker.config.mjs` mutates `DecisionCache.ts`.

**Related**: [BEH-QD-166](behaviors/21-decision-cache.md#beh-qd-166-capacity-bounds-the-cache-validated-at-construction), [INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity), [ADR-QD-031](decisions/031-decision-cache.md#an-optional-capacity-evicted-fifo--not-the-ttl-rejected-below).

## INV-QD-383: A function stated as total stays total whatever value it caught

Every function Qadi documents as never throwing, or as refusing instead of throwing, returns or refuses whatever value it caught, including a value whose `message` getter and `toString` both throw, because each reads the caught value through `thrownMessage`, whose every read is guarded. A port call that dies ends as that port's typed error whatever it died with.

**Source**: `packages/core/src/ThrownMessage.ts` (`thrownMessage`), `packages/core/src/JsonHazard.ts`, `packages/core/src/PortKey.ts`, `packages/core/src/PortDerivation.ts`, `packages/core/src/PortWireEncode.ts`, `packages/core/src/SinkCodec.ts`, `packages/core/src/CustomPredicate.ts` (`failure`, `defect`), `packages/core/src/PortAccess.ts` (`catchPortDefect`), `packages/http/src/RemotePorts.ts` (`transport`), `packages/react/src/DeveloperSignals.ts` (`errorLine`), `packages/devtools/src/model/Capture.ts` (`renderError`).

**Implication**: a caller cannot make Qadi throw, or turn an authorization decision into a defect ([INV-QD-006](#inv-qd-006-failure-is-not-denial)), by what its own code throws, and the rendering rule changes in one place. Before this invariant the rule was copied six times in core and three more times above it, and only `SinkCodec`'s copy was total: `Result.try` rethrows when its `catch` arm throws, so a value whose `toString` threw escaped `toJson`, `toJsonRecord`, a port's request key and a port wire's encodes, each documented as never throwing ([ADR-QD-182](decisions/182-one-total-thrown-value-to-text-rule-exported-by-core.md)). A reporter that throws such a value cannot escape the hydration containment either ([INV-QD-251](#inv-qd-251-a-supplied-reporter-cannot-change-a-hydration-outcome)).

**Enforcement**: `packages/core/test/ThrownMessage.test.ts` (the `thrownMessage` table, one row per kind of value); the hostile-value cases of `packages/core/test/PortWire.test.ts` ("a getter that throws a value whose toString and message cannot be read is EncodeFailed with the placeholder"), `packages/core/test/PortKey.test.ts` ("refuses a getter that throws a value whose toString and message cannot be read, with the placeholder"), `packages/core/test/PortDescription.test.ts` ("a request whose member throws a value whose toString and message cannot be read is refused with the placeholder", "a wire whose conversion throws a value whose toString and message cannot be read refuses the question and the answer with the placeholder", "a wire whose conversion throws an Error refuses with its message, without its name"), `packages/core/test/SinkCodec.test.ts` ("a thrown Error whose message is not a string is EncodeFailed with its string form"), `packages/core/test/PortConformance.test.ts` and `packages/core/test/Evaluate.test.ts` ("a CustomPredicate that dies with a value whose toString and message cannot be read surfaces as CustomPredicateError"), `packages/http/test/PortRoutes.test.ts` ("a transport failure whose message cannot be read is the port's own error with the placeholder, never a defect"), `packages/react/test/DeveloperSignals.test.ts` ("a thrown value whose toString and message cannot be read is named by the placeholder", "a thrown Error whose message cannot be read is named by the placeholder alone", "a thrown Error whose message is not a string is named by its string form alone") and `packages/devtools/test/model/Capture.test.ts` ("a cause whose toString and message cannot be read is recorded as broken with the placeholder").

**Related**: [ADR-QD-182](decisions/182-one-total-thrown-value-to-text-rule-exported-by-core.md), [INV-QD-384](#inv-qd-384-no-shipped-code-renders-a-cause-to-text-through-a-call-that-can-throw), [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-251](#inv-qd-251-a-supplied-reporter-cannot-change-a-hydration-outcome), [INV-QD-280](#inv-qd-280-a-request-key-is-equals-text), [BEH-QD-230](behaviors/19-hydration.md#beh-qd-230-a-payload-that-seeds-nothing-says-why), [BEH-QD-681](behaviors/06-services.md#beh-qd-681-one-total-rule-turns-a-caught-value-or-a-cause-into-text), [BEH-QD-682](behaviors/06-services.md#beh-qd-682-a-conversion-stated-as-total-refuses-a-hostile-thrown-value-and-never-throws), [BEH-QD-683](behaviors/32-custom-predicates.md#beh-qd-683-a-custom-predicate-failure-or-defect-ends-as-its-typed-error-whatever-it-carries), [BEH-QD-684](behaviors/34-remote-ports.md#beh-qd-684-the-port-wire-and-the-http-transport-refuse-a-hostile-thrown-value-with-its-message), [BEH-QD-685](behaviors/29-devtools-simulator.md#beh-qd-685-a-capture-records-a-broken-port-with-the-text-the-failure-carried).

## INV-QD-384: No shipped code renders a cause to text through a call that can throw

Every place Qadi renders an Effect `Cause` to text reads it through `causeMessage`, which calls `Cause.pretty` inside a guard and falls back to `thrownMessage` of the squashed cause. A cause that failed or died with any value is rendered, never thrown, and a cause that renders keeps its `Cause.pretty` text.

**Source**: `packages/core/src/ThrownMessage.ts` (`causeMessage`, the one `Cause.pretty` call in shipped code), `packages/core/src/CustomPredicate.ts` (`defect`), `packages/devtools/src/model/TimelineFeed.ts`, `packages/devtools/src/model/DiagnosticsFeed.ts`, `packages/devtools/src/model/Diagnostics.ts`, `packages/devtools/src/model/ExplorerSession.ts` (`refusalOf`, `textOf`), `packages/devtools/src/model/GatesFeed.ts` (`stated`).

**Implication**: a host value cannot leave a devtools panel on its last reading, throw out of an explorer handler, or turn a custom predicate's defect into a defect of Qadi's own. A run that dies with a value `Cause.pretty` cannot render is still stated, with the placeholder `a value that could not be described`, where it used to leave the timeline and diagnostics feeds unchanged ([INV-QD-313](#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes)). `Cause.pretty` is called in one place, which the phase's close scan checks. The `String(cause)` calls that remain are left alone on purpose, because Effect guards that string form itself ([ADR-QD-182](decisions/182-one-total-thrown-value-to-text-rule-exported-by-core.md)).

**Enforcement**: the `causeMessage` rows of `packages/core/test/ThrownMessage.test.ts`; the defect cases of `packages/core/test/PortConformance.test.ts` ("a defect whose value cannot be rendered by Cause.pretty is the placeholder, under the same predicate", "is the placeholder for a cause whose toString and message cannot be read, never a throw") and `packages/core/test/Evaluate.test.ts`; and the hostile cases of `packages/devtools/test/model/ExplorerSession.test.ts` ("a defect whose value cannot be rendered is a stated refusal with the placeholder, not a throw", "the text of an encode that died with a value that cannot be rendered is the placeholder"), `packages/devtools/test/model/TimelineFeed.test.ts` ("a read that dies with a value that cannot be rendered is Stopped with the placeholder"), `packages/devtools/test/model/DiagnosticsFeed.test.ts` ("a collector that throws a value that cannot be rendered is Stopped with the placeholder"), `packages/devtools/test/model/Diagnostics.test.ts` ("a layer that fails to build with a value that cannot be rendered reads Failed with the placeholder") and `packages/devtools/test/model/GatesFeed.test.ts`.

**Related**: [ADR-QD-182](decisions/182-one-total-thrown-value-to-text-rule-exported-by-core.md), [INV-QD-383](#inv-qd-383-a-function-stated-as-total-stays-total-whatever-value-it-caught), [INV-QD-313](#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes), [BEH-QD-507](behaviors/28-devtools-screens.md#beh-qd-507-a-defect-stops-the-poll-visibly-and-a-restart-resumes-it), [BEH-QD-519](behaviors/28-devtools-screens.md#beh-qd-519-a-defect-stops-the-timeline-visibly-and-a-restart-resumes-it), [BEH-QD-637](behaviors/28-devtools-screens.md#beh-qd-637-the-diagnostics-feed-is-the-roots-poll-and-its-stop-is-stated), [BEH-QD-683](behaviors/32-custom-predicates.md#beh-qd-683-a-custom-predicate-failure-or-defect-ends-as-its-typed-error-whatever-it-carries).

## INV-QD-385: Every hydration drop reason has one stated source and one reporting path

Every hydration drop reason, of every kind, has exactly one place it is stated, a bucket or a producer row, and exactly one way it is reported. An `entry` reason is a key of the hydrate side's bucket record, a `dehydration` reason a key of the dehydrate side's, and a `payload` reason a row of the payload producer record, which names what raises it. Each record is total over its kind, so a reason with no bucket, or for a `payload` reason no named producer, does not compile. For the two bucketed kinds every drop event is derived from its record by one function, so every bucket is emitted, and an entry dropped under any bucketed reason is reported and counted. For a `payload` reason the compiler checks only that its producer is named and that the producer has its slot in the inverse. No type checks that a call site collects an entry into a bucket or raises a producer: the rows of `HydrationDropEvents.test.ts` and the conformance test of `HydrationPayload.test.ts` show it instead.

**Source**: `packages/react/src/HydrationBuckets.ts` (`DropBuckets`, `entryBuckets`, `dehydrationBuckets`, `dropEvents`) and `packages/react/src/HydrationEngine.ts` (`planHydration`, `planDehydration`, `PAYLOAD_PRODUCERS`, `PAYLOAD_REASONS`).

**Implication**: [INV-QD-045](#inv-qd-045-no-entry-leaves-hydration-unaccounted-for)'s conservation law can no longer be broken by adding a reason. A reason given a bucket and no emission line used to compile, with its entries reaching no event and no count; the compiler now refuses a reason at the record that lacks it, so this is INV-QD-045's enforcement restated ([ADR-QD-183](decisions/183-hydration-drop-events-are-derived-from-their-buckets.md)). A whole-payload refusal has no bucket because it is exclusive, one reason and never a partition, so its source is a row naming the decoder refusal or the subject check that raises it, and a producer named by two rows or by none does not compile. A reason whose producer is new and whose slot no call site uses compiles and is raised nowhere, and a bucket no call site fills compiles and collects nothing; no type can say otherwise.

**Enforcement**: the eleven pins of `packages/react/test/HydrationBuckets.tst.ts` ("the entry buckets hold one array per entry reason, written out", "the dehydration buckets hold one array per dehydration reason, written out", "an entry bucket record missing a reason or naming an unknown one is refused", "a dehydration bucket record missing a reason or naming an unknown one is refused", "the event function is handed its record's reason union and bucket type", "every payload refusal reason has one producer row", "OnlyMember is the union when it has exactly one member and never otherwise", "ReasonRaisedBy is the reason whose row names the producer", "ReasonRaisedBy is never for a producer two rows name or no row names", "the producer inverse types each producer's slot as its reason", "an inverse over a record that names a producer twice or not at all is refused"); the runtime rows of `packages/react/test/HydrationBuckets.test.ts` ("with the producer record, holds every reason core states exactly once", "calls its event once per bucket of a full record, in key order, with that bucket", "skips an empty bucket and keeps the key order of the rest", "gives no event for a record with every bucket empty"); the rows of `packages/react/test/HydrationDropEvents.test.ts`, which pin every drop event, its reporter call and its count through the public functions ("a malformed entry alone is one MalformedEntry event", "an entry for another subject is one ForeignSubject event", "a subjectId nested past the bound is PayloadTooDeep" and the rest, each named by its title there); and the conformance test of `packages/react/test/HydrationPayload.test.ts` ("each row's producer refuses the payload whole under that row's reason, once").

**Related**: [ADR-QD-183](decisions/183-hydration-drop-events-are-derived-from-their-buckets.md), [ADR-QD-152](decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md), [INV-QD-045](#inv-qd-045-no-entry-leaves-hydration-unaccounted-for), [INV-QD-323](#inv-qd-323-each-hydration-drop-reason-has-exactly-one-kind-and-the-kinds-partition-the-reasons), [INV-QD-386](#inv-qd-386-each-side-declares-its-drop-event-order-once-and-the-order-is-total), [BEH-QD-686](behaviors/19-hydration.md#beh-qd-686-the-hydrate-side-reports-its-drops-from-one-record-of-buckets), [BEH-QD-687](behaviors/19-hydration.md#beh-qd-687-the-dehydrate-side-reports-what-it-left-out-from-one-record-of-buckets), [BEH-QD-688](behaviors/19-hydration.md#beh-qd-688-every-whole-payload-refusal-reason-has-one-stated-producer), [BEH-QD-689](behaviors/19-hydration.md#beh-qd-689-drop-events-are-emitted-in-an-order-declared-once-per-side), [BEH-QD-690](behaviors/19-hydration.md#beh-qd-690-every-bucketed-entry-is-counted-once-under-its-reason).

## INV-QD-386: Each side declares its drop event order once and the order is total

The order in which a side emits its drop events is the key order of that side's bucket constructor, stated once. On the hydrate side it is `EntryTooDeep`, `MalformedEntry`, `UndecodablePolicy`; on the dehydrate side `ForeignSubject`, `UnencodablePolicy`. Every reason of the side appears in it exactly once, only a non-empty bucket gives an event, and `Seeded` or `Dehydrated` comes after the drop events.

**Source**: `packages/react/src/HydrationBuckets.ts` (`entryBuckets`, `dehydrationBuckets`, `dropEvents`).

**Implication**: a reporter sees drops in one order on every call, whatever order the entries were refused in. A missing reason is TS2741 and a repeated one TS1117 at the constructor, so the order cannot skip a bucket or name one twice. The order is react's own, not core's table order (`MalformedEntry`, `UndecodablePolicy`, `EntryTooDeep`), because the events a reporter receives stayed byte-identical ([ADR-QD-183](decisions/183-hydration-drop-events-are-derived-from-their-buckets.md)).

**Enforcement**: the order itself is pinned at run time, by the pair and triple rows of `packages/react/test/HydrationDropEvents.test.ts` ("all three entry reasons beside a good entry are three events in the declared order", and for each pair of entry reasons one row that lists the later reason first and one that lists the earlier first, from "EntryTooDeep precedes UndecodablePolicy when the input lists UndecodablePolicy first" to "EntryTooDeep precedes MalformedEntry when the input lists EntryTooDeep first"; "ForeignSubject is reported before UnencodablePolicy whatever the input order", which feeds both orders) and by the constructors' key order in `packages/react/test/HydrationBuckets.test.ts` ("states the hydrate side's emission order as its key order, every bucket empty", "states the dehydrate side's emission order as its key order, every bucket empty", "skips an empty bucket and keeps the key order of the rest"). The type pins of `packages/react/test/HydrationBuckets.tst.ts` pin totality, not order ("an entry bucket record missing a reason or naming an unknown one is refused", "a dehydration bucket record missing a reason or naming an unknown one is refused").

**Related**: [ADR-QD-183](decisions/183-hydration-drop-events-are-derived-from-their-buckets.md), [INV-QD-385](#inv-qd-385-every-hydration-drop-reason-has-one-stated-source-and-one-reporting-path), [BEH-QD-689](behaviors/19-hydration.md#beh-qd-689-drop-events-are-emitted-in-an-order-declared-once-per-side).

## INV-QD-387: Every developer signal has exactly one row, and a throwing reporter is named by the option the caller passed

Every member of `@qadi/react`'s developer-signal union has exactly one row in `SIGNALS`, stating where its console default speaks (`Development`, `Production` or `Everywhere`), how often (`PerEvent`, or `OncePerProcess` for the production-instrumentation signal alone), when each entry point resolves the reporter it was handed, and the option each entry point reports the signal under. Every reporter is resolved from its row by one resolver, `reporterFor`, and a row's condition is read by one function, `holdsHere`, which `QadiProvider` also asks of `InstrumentedInProduction`'s row to decide whether to raise it, so the provider carries no environment check of its own. A supplied reporter replaces the default outright and runs in every environment; one that throws is announced as `ReporterThrew`, under the option the caller passed it through, and its outcome is otherwise unchanged.

**Source**: `packages/react/src/DeveloperSignals.ts` (`SIGNALS`, `SignalTable`, `ReporterName`, `reporterFor`, `holdsHere`) and `packages/react/src/GateWriter.ts` (`buildGateRegistry`).

**Implication**: a signal added without a row does not compile, and `ReporterName` is read off the table rather than kept beside it. The name a throw carries belongs to the entry point, not to the resolver: `makeQadiAtoms` resolves its own reporter under `onGateIdCollision` and hands the registry one already resolved, and a direct `makeGateRegistry` caller whose reporter throws is told about `onIdCollision`, where it was told about `onGateIdCollision`, an option it never passed ([ADR-QD-184](decisions/184-developer-signal-reporters-are-resolved-through-one-table.md)). Each hydration call site reads its own row, so the dehydrate default cannot be paired with the hydrate slot.

**Enforcement**: the compiler refuses a signal without a row (TS2741 at the table, naming it), a row for no signal, a second row that speaks once per process, an entry point a row does not name, and the hydrate row given the dehydrate reporter, and a row that speaks everywhere asked whether its condition holds, each pinned by `packages/react/test/DeveloperSignals.tst.ts` ("the table has one row per developer signal, written out", "a table missing a row is refused", "only InstrumentedInProduction may speak once per process", "ReporterName is every option an entry point reports under, written out", "a row refuses an entry point it does not name", "the hydrate row refuses the dehydrate reporter", "only a row with a condition is asked whether it holds"). No type checks when an entry point resolves its reporter, what a row's condition is, what a default says, or that an entry point passes its own name rather than another entry point's of the same row; those are pinned at run time instead. A row's condition by "a row's condition holds in the environment it names and in no other" and "InstrumentedInProduction's default is silent in development, whoever asks" in `packages/react/test/DeveloperSignals.test.ts`, and by the provider tests that see no signal in development. The option each entry point reports under by the table describe of that file ("agrees with a written-out statement of it, row by row", "contains a supplied reporter under its entry point's option, for every entry point of every row"), where the first is a change detector for the rows and `resolved`, which no code reads, and is not evidence of when a reporter is resolved. That an entry point passes its own name by `packages/react/test/GateRegistry.store.test.ts` ("a throwing collision reporter is named by the option it was passed through"). And the timing by the characterisation `packages/react/test/DeveloperSignalReporters.test.tsx`, which pins every reporter through its public entry point, its rows unchanged by ARCH-118, including "when each reporter is resolved".

**Related**: [ADR-QD-184](decisions/184-developer-signal-reporters-are-resolved-through-one-table.md), [ADR-QD-041](decisions/041-a-mismatch-is-announced.md), [INV-QD-251](#inv-qd-251-a-supplied-reporter-cannot-change-a-hydration-outcome), [INV-QD-388](#inv-qd-388-the-library-holds-one-rebindable-module-scope-binding-the-production-instrumentation-latch).

## INV-QD-388: The library holds one rebindable module-scope binding, the production-instrumentation latch

Library source (`packages/*/src`) declares exactly one `let` or `var` binding outside a function or class body: the latch in `DeveloperSignals.ts` that lets the production-instrumentation line print once per process. It is read and set only by the table's once-per-process wrapper.

**Source**: `packages/react/src/DeveloperSignals.ts` (`warnedInstrumentedInProduction`, `once`).

**Implication**: the latch is process-wide on purpose. The line is printed once however many providers mount, because an atom set or a provider is narrower than a process, so two providers in one process do share it: whichever mounts first uses it up. It holds whether the line has been printed and no tenant's or render's data, and a supplied `onDeveloperSignal` bypasses it and is told once per mount instead. The invariant is about rebindable bindings only. A module-scope `const` that holds mutable state, such as `Policy.ts`'s depth memo (a `WeakMap`) or a `Metric`, is outside the budget's scope and outside this invariant: nothing here says library source has no such state, only that a name can be rebound in one place ([ADR-QD-184](decisions/184-developer-signal-reporters-are-resolved-through-one-table.md)).

**Enforcement**: `MODULE_STATE_BUDGET` in `scripts/check-house-style.mjs` counts every `let` or `var` binding a library file declares outside a function or class body, read from the file's syntax tree (`scripts/lib/module-state-scan.mjs`) and not from its lines, so `export let` and `export var`, an indented declaration, one in a top-level block and each name of `let a, b` all count, and a `const` does not, nor does a `declare`d binding (a type's statement about a global, which declares no runtime binding of the module). It is checked in both directions with its table in AGENTS.md section 6 (a new binding in any other file fails, and so does the count moving), and `packages/react/test/QadiProvider.production.test.tsx` ("warns once when instrument is true outside development (ticket 153)") mounts a second instrumented provider and sees no second line.

**Related**: [ADR-QD-184](decisions/184-developer-signal-reporters-are-resolved-through-one-table.md), [INV-QD-387](#inv-qd-387-every-developer-signal-has-exactly-one-row-and-a-throwing-reporter-is-named-by-the-option-the-caller-passed).

## INV-QD-389: A derived store recomputes exactly when its key changes, and does nothing after its scope closes

A derived store (`makeDerivedStore`) recomputes exactly when some own enumerable string-keyed field of its key changes identity, compares every field of the key by one generic comparison, commits nothing when its compute throws, and, once the scope that built it closes, reads no key, calls no compute, releases every parent, ignores `refresh` and keeps its last snapshot. A parent whose `subscribe` throws while it is built fails the build and returns no store, and closing the scope releases every parent subscribed before it. Closing releases every parent even when a release throws, and then fails the close with what was thrown.

**Source**: `packages/devtools/src/model/ExternalStore.ts` (`makeDerivedStore`, `sameFields`); `sameFields` is exported from its module, out of both barrels, and applied by the feeds to their inputs, and so by the dock, whose `configure` hands each feed its record ([ADR-QD-192](decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md)). Restated by ADR-QD-192 (CCR-QD-471).

**Implication**: no store built on it can miss a key field, because the comparison is over the own enumerable string-keyed fields of both keys and not a list a store writes by hand, and none can commit a key its compute failed on, so the next trigger retries. A field that holds `undefined` on one side and is absent on the other counts as changed, and a field that is inherited, non-enumerable or symbol-keyed is not part of the key and is not compared.

**Enforcement**: `packages/devtools/test/model/ExternalStore.test.ts` (`describe("makeDerivedStore")`) pins each rule at run time, and `packages/devtools/test/model/ExternalStore.tst.ts` pins that a key type with an optional field, an empty parent list and a compute that reads a field outside its key are each a compile error. That a compute reads no state outside its key is checked by neither.

**Related**: [ADR-QD-185](decisions/185-the-dock-models-computed-stores-are-derived-stores.md), [ADR-QD-193](decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md), [BEH-QD-738](behaviors/28-devtools-screens.md#beh-qd-738-leaving-the-react-panel-ends-picking-and-clears-the-highlight-and-the-pick-is-kept), [BEH-QD-739](behaviors/28-devtools-screens.md#beh-qd-739-a-picked-row-reveals-itself-once-per-pick-and-a-pick-whose-guard-has-gone-marks-no-row-and-moves-to-no-other), [INV-QD-373](#inv-qd-373-every-listener-is-called-and-what-one-throws-is-never-swallowed), [BEH-QD-696](behaviors/28-devtools-screens.md#beh-qd-696-a-derived-store-recomputes-exactly-when-a-field-of-its-key-changes-identity), [BEH-QD-697](behaviors/28-devtools-screens.md#beh-qd-697-a-derived-store-notifies-once-per-change-before-the-listeners-added-after-it), [BEH-QD-698](behaviors/28-devtools-screens.md#beh-qd-698-a-derived-store-does-nothing-after-its-scope-closes).

## INV-QD-390: The dock model's computed stores are derived stores, and their count is stated once

The dock model's computed stores (the sightings rail, the shown reading, `questions`, `services` and `hydration`) are derived stores. `DockModel.ts` holds no last key and no closed state of its own for any of them, and the model's stores are named and counted in one place, BEH-QD-700, which the rail, internal to the model, is not among. The lens is the model's tenth store and is not a computed one: nothing computes it, so it is no derived store. The model has eleven stores, `hydration` the eleventh, and five derived stores (restated 2026-11-25).

**Source**: `packages/devtools/src/model/DockModel.ts` (the five `makeDerivedStore` calls), and `makeLensSession`, which the model builds as its tenth store, `lens`: nothing computes it, so it is not a derived store.

**Implication**: a store added to or removed from the model fails the store-list test until its list is updated, and review keeps that list equal to BEH-QD-700's. A computed store built on the derived store has no compare or closed flag of its own to keep, because the constructor holds both; a computed store built by hand on `makeExternalStore` is refused by no test or gate.

**Enforcement**: the store-list test in `packages/devtools/test/model/DockModel.test.ts` ("a built model's members with subscribe and getSnapshot are exactly this list") lists the eleven members of a built model that have both and fails when one is added or removed, and "a bare model holds the lens idle, with nothing drawn and nothing picked" holds the lens, which `configure` never touches. The list is the test's own: that it equals BEH-QD-700's is kept by review and not by a gate. That `DockModel.ts` keeps no last key and no closed state of its own is checked by no test or gate: it follows from the five stores being derived stores, which the per-store tests (the hydration store's M57 to M60 among them), the closed-model regression test ("a model whose scope closed merges no reading a later configure hands it"), `packages/devtools/test/model/DockModel.characterisation.test.ts` and, for the rail, `packages/devtools/test/model/DockModel.listeners.test.ts` (DL15, DL16) exercise.

**Related**: [ADR-QD-185](decisions/185-the-dock-models-computed-stores-are-derived-stores.md), [ADR-QD-193](decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md), [BEH-QD-736](behaviors/28-devtools-screens.md#beh-qd-736-the-lens-is-a-headless-session-and-a-no-op-publishes-nothing), [INV-QD-357](#inv-qd-357-one-feed-owns-the-gate-registry-its-subscription-its-failure-state-and-the-questions-input), [INV-QD-389](#inv-qd-389-a-derived-store-recomputes-exactly-when-its-key-changes-and-does-nothing-after-its-scope-closes), [BEH-QD-699](behaviors/28-devtools-screens.md#beh-qd-699-the-dock-models-five-computed-stores-are-derived-stores), [BEH-QD-700](behaviors/28-devtools-screens.md#beh-qd-700-the-dock-models-stores-are-listed-once), [BEH-QD-743](behaviors/28-devtools-screens.md#beh-qd-743-the-sightings-rail-is-a-derived-store-so-a-record-moves-its-readers-whatever-a-listener-throws), [ADR-QD-194](decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md).

## INV-QD-391: Gate registration is reconciled in one step keyed by gate id

Gate registration is decided by one step, `reconcile`, over the wanted registrations keyed by gate id. No caller supplies index-aligned collections, a wanted identity carries no id of its own, and the rule that decides whether a state changed lives only in the registry's handle.

**Source**: `packages/react/src/GateWriter.ts` (`reconcile`, `GateWanted`, `GateIdentity`, `Registered`, and the module's unexported identity comparison `sameIdentity`) and `buildGateRegistry`'s `GateHandle.update`.

**Implication**: a caller cannot pass two collections that disagree on order or length, because there is one map and its key is the id, so a reordered record cannot pair one guard's identity with another guard's state and two entries cannot share an id. Nothing outside the handle compares states: the step tells every kept handle the wanted state and the handle decides whether anything changed ([ADR-QD-186](decisions/186-gate-registration-is-one-keyed-reconcile.md)).

**Enforcement**: the compiler refuses an array for the wanted map, an `id` on the identity and the name `GateCurrent`, which the module does not export, and holds `GateIdentity`, `GateWanted` and `Registered` to their fields, each pinned by `packages/react/test/GateWriter.reconcile.tst.ts` ("reconcile takes the wanted registrations keyed by gate id", "an array of wanted registrations is refused", "a GateIdentity literal with an id is refused", "GateIdentity, GateWanted and Registered hold exactly their fields"; the `GateCurrent` refusal is an `@ts-expect-error` in that file, held by its compile and by no title, and it refuses that name alone: an index-aligned type under another name would compile). The step's order and its update half are held by tests only: `packages/react/test/GateWriter.reconcile.test.ts` ("calls each live update or unregister in order, then each registration", "tells the handle of a kept entry the wanted state", "returns a fresh map and does not mutate the live map it is given") and, for the equal-state rule in the handle and the writer's contract the step relies on, `packages/react/test/GateRegistry.store.test.ts` ("does not notify for an unchanged state", "a listener that throws makes none of register, update or unregister throw"; and "a throwing onIdCollision on makeGateRegistry is named onIdCollision in development" with the three collision-reporter tests that follow it, which pin that a reporter that throws does not make `register` throw). The contract is a writer's `register` and a handle's `update` and `unregister` not throwing; `reconcile` handles no throw of its own. That it adds no handler for one, and that no other module diffs states, are kept by review and not by a test or a gate.

**Related**: [ADR-QD-186](decisions/186-gate-registration-is-one-keyed-reconcile.md), [ADR-QD-140](decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md), [INV-QD-064](#inv-qd-064-a-guard-is-listed-only-by-the-registry-its-provider-writes-to).

## INV-QD-392: The registration hook keeps nothing between commits but its registrations

`useGateRegistrations` keeps one ref, `registered`, which holds its registrations (each carrying the identity it was made for) and nothing beyond them, and registers through one effect with no dependency list, beside the teardown keyed on the writer. It keeps no state diff of its own.

**Source**: `packages/react/src/useGate.ts` (`useGateRegistrations`: the one ref, the writer-keyed teardown effect and the one registration effect with no dependency list).

**Implication**: the only identity the hook holds is the one each registration was made for, which the next commit compares against, and it holds no state, so there is no other copy of an identity or a state to fall out of step with the registry. The registration effect has no cleanup, because a cleanup runs before every re-run and would end a registration that should outlive the commit; the teardown, which runs on unmount and when the writer changes, is the only place a registration ends ([ADR-QD-186](decisions/186-gate-registration-is-one-keyed-reconcile.md), [ADR-QD-111](decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md)).

**Enforcement**: tests only. `packages/react/test/GateWriter.test.tsx` ("an unchanged state makes no notification and keeps the id", "the writer going undefined unregisters", "unmount unregisters") and the characterisation `packages/react/test/GateRegistration.characterisation.test.tsx` ("unmounting unregisters with one notification and leaves nothing", "under StrictMode a guard registers once and a changed policy re-registers once") pin what registers and when it ends. No type or lint rule counts the refs or the effects, so that the ref holds its registrations and nothing beyond them is kept by review and not by a test or a gate.

**Related**: [ADR-QD-186](decisions/186-gate-registration-is-one-keyed-reconcile.md), [ADR-QD-111](decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md), [INV-QD-391](#inv-qd-391-gate-registration-is-reconciled-in-one-step-keyed-by-gate-id), [BEH-QD-704](behaviors/09-react.md#beh-qd-704-registrations-end-when-the-guard-unmounts-or-its-writer-changes), [BEH-QD-705](behaviors/09-react.md#beh-qd-705-a-grouped-hook-registers-each-question-by-its-key-in-any-order).

## INV-QD-393: The simulator's seeded choice is a pure value

`SeededChoice.ts` holds which policy the simulator runs and where it came from as an immutable value. `withSightings` and `choose` map a `SeededChoice` to a `SeededChoice`, and `seededChoice` and `seedFrom` answer a `Seeding`: the choice, and the input a replayed row gives. A transition that changes nothing answers its input object, inside the `Seeding` for `seedFrom`, so a caller detects a no-op with `===`. The pin rule lives only inside the transitions, and the menu's order is stated by one list that both the menu and its reverse lookup read.

**Source**: `packages/devtools/src/model/SeededChoice.ts` (the transitions `seededChoice`, `withSightings`, `seedFrom` and `choose`, the readings `policyChoice`, `policyOf`, `seedOf`, `seededFrom`, `menuOf` and `sightingAt`, and the module's unexported `pinUnlessReplayed`, `menuEntries` and `menuLead`).

**Implication**: a rule about which policy is held is a value a test reads with no scope, and the menu and the lookup cannot disagree on a position, because there is one list ([ADR-QD-187](decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md), [ADR-QD-047](decisions/047-a-headless-devtools-model.md)).

**Enforcement**: the compiler holds the first three arms of `PolicyChoice` to `HeldChoice<PolicySighting>`, and each transition to what it answers, a `SeededChoice` from `withSightings` and `choose` and a `Seeding` from `seededChoice` and `seedFrom`: `packages/devtools/test/model/SeededChoice.tst.ts` ("the first three arms of PolicyChoice are HeldChoice of PolicySighting", "choose and withSightings answer a SeededChoice; seededChoice and seedFrom a Seeding"). Tests hold the rules as plain values, `packages/devtools/test/model/SeededChoice.test.ts` ("with no seed, the constructor pins the head of the rail", "a replayed seed pins nothing and answers the row decoded", "an orphan seed pins the head and answers no input", "a held replayed policy pins nothing, and leaving it pins the head", "seedOf is the replayed row while its policy is held", "seedOf keeps an orphan row after another policy is chosen", "the menu leads with the replayed row while a replayed policy is held", "sightingAt names each rail entry after the lead, in the order of the menu", "each option of the menu names the sighting sightingAt reads at its position", "choosing an equal copy of the held policy returns the same choice", "withSightings with the same elements in a new array returns the same choice", "seedFrom the row a choice holds answers the same choice and the row decoded", "seedFrom(undefined) on a choice with no seed answers the same choice"). That the pin rule lives only inside the transitions is kept by review and not by a test or a gate: nothing counts the callers of `pinHead`.

**Related**: [ADR-QD-187](decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md), [ADR-QD-047](decisions/047-a-headless-devtools-model.md), [INV-QD-107](#inv-qd-107-a-screen-never-changes-what-it-shows-without-the-reviewer), [BEH-QD-706](behaviors/29-devtools-simulator.md#beh-qd-706-the-head-is-pinned-only-while-no-replayed-row-is-held), [BEH-QD-707](behaviors/29-devtools-simulator.md#beh-qd-707-a-row-with-no-decision-stays-the-baseline-row), [BEH-QD-708](behaviors/29-devtools-simulator.md#beh-qd-708-the-policy-menu-and-its-reverse-lookup-read-one-list), [BEH-QD-709](behaviors/29-devtools-simulator.md#beh-qd-709-choosing-the-held-policy-again-changes-nothing-while-the-run-is-idle).

## INV-QD-394: The simulation session writes its draft in one place and clears its run through one operation

Once the session is built, `writeDraft` is the one place the draft and its resource text are assigned, and `clearRun` is the one operation that stops the run in flight and sets it `Idle`, called from `reseed`, `choosePolicy` and `setPorts`.

**Source**: `packages/devtools/src/model/SimulationSession.ts` (`writeDraft` and `clearRun`).

**Implication**: the no-op rule and the resource-text rule are written once, and a run in flight is stopped the same way by every command that clears it, so one cannot be missed ([ADR-QD-187](decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md), [ADR-QD-150](decisions/150-a-scoped-run-that-a-newer-run-supersedes.md), [BEH-QD-322](behaviors/29-devtools-simulator.md#beh-qd-322-a-simulation-is-a-session)).

**Enforcement**: tests only. `packages/devtools/test/model/SimulationSession.characterisation.test.ts` ("seeding a row after a run clears it, and a new run checks the row", "choosing another policy after a run clears it, so nothing is stale", "new ports during a run clear it and stop it", "new ports after a finished run keep the result", "editing to the draft it holds changes nothing", "an edit that changes the resource re-encodes the resource text", "an edit that keeps the resource keeps the typed resource text", "resource text publishes on every call, an unchanged parse and a refusal too", "renaming to the current id changes nothing, and a rename keeps the text") pins what each command clears, keeps and publishes. No type or lint rule counts the assignments, so that the draft, its text and an `Idle` run are assigned only in those two places is kept by review and not by a test or a gate.

**Related**: [ADR-QD-187](decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md), [ADR-QD-137](decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md), [ADR-QD-150](decisions/150-a-scoped-run-that-a-newer-run-supersedes.md), [BEH-QD-710](behaviors/29-devtools-simulator.md#beh-qd-710-a-draft-is-written-in-one-place-and-a-run-is-cleared-by-one-operation), [BEH-QD-322](behaviors/29-devtools-simulator.md#beh-qd-322-a-simulation-is-a-session).

## INV-QD-395: A span of the evaluate family carries its question on every path that reaches its work

Each span of the evaluate family annotates its question before anything that can fail, so a span that fails, or is abandoned part way, still says what was asked: `qadi.evaluate` the subject, the evaluation id, the policy's tag and the action when supplied; `qadi.toPredicate` and `qadi.guardHealthCheck` the subject, the policy's tag and the action; `qadi.decideSubjects` and `qadi.decideSubjectsStream` the policy's tag and the action, the first with the subject count.

**Source**: `packages/core/src/Lifecycle.ts` (`decideQuestion`), `packages/core/src/Predicate.ts` (`toPredicate`), `packages/core/src/GuardHealthCheck.ts` (`createGuardHealthCheck`) and `packages/core/src/SubjectSet.ts` (`decideSubjects`, `decideSubjectsStream`), each writing its question, declared in `packages/core/src/EvaluationSpan.ts`, through `annotateAsked` or `askedAttributes` in `packages/core/src/PortSpanEncode.ts`.

**Implication**: a tracer filtering by subject or by evaluation id sees the failures too: a failed `qadi.evaluate` span carries its question beside its outcome and its error tag ([ADR-QD-188](decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md), [ADR-QD-051](decisions/051-a-span-says-what-was-asked.md)).

**Enforcement**: tests, `packages/core/test/EvaluationSpan.contract.test.ts` ("a failed evaluation carries exactly its question, outcome Failed and error tag", "a failed evaluation with an action carries exactly its question and error tag", "a policy too deep to translate carries exactly its question and PolicyTooDeep", "a fields restriction carries exactly its question and PolicyNotTranslatable", "an untranslatable node carries exactly its question and PolicyNotTranslatable", "a port failure in translation carries exactly its question and error tag", "an unhealthy probe carries exactly its question, healthy false and error tag"), which read the whole record each failed span leaves, and `packages/core/test/Evaluate.test.ts` ("an interrupted evaluation carries its question and no outcome", "a defected evaluation carries its question and no outcome"), which read the span of an evaluation abandoned part way. That each annotation sits before the work inside its writer is kept by review, and was seen failing once, when the annotation was moved after the work and the failed-span rows went red; no gate checks the position.

**Related**: [ADR-QD-188](decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md), [ADR-QD-051](decisions/051-a-span-says-what-was-asked.md), [BEH-QD-711](behaviors/30-port-calls.md#beh-qd-711-the-evaluate-span-carries-its-question-on-every-path), [BEH-QD-713](behaviors/30-port-calls.md#beh-qd-713-a-translation-span-carries-its-question-before-translating-and-its-answer-after), [BEH-QD-714](behaviors/30-port-calls.md#beh-qd-714-the-probe-and-the-batch-spans-carry-their-questions).

## INV-QD-396: One fact has one key across the evaluate family

Every key of the evaluate family is stated once, in `EvaluationSpan.ts`; every field is a `SpanValue`; the four writers and the denial log line write keys only through that declaration; and the outcome of `qadi.evaluate` is under `qadi.outcome` on every path that ends in a decision or a typed failure, with `qadi.decision` written nowhere. An interrupted or defected evaluation carries no outcome, and its span's status says why.

**Source**: `packages/core/src/EvaluationSpan.ts` (`evaluateSpan`, `toPredicateSpan`, `guardHealthCheckSpan`, `decideSubjectsSpan`, `decideSubjectsStreamSpan`, the keyless `decideSubjectSpan`, `denialEvent`, `askedOf` and `batchAskedOf`), written through `annotateAsked`, `askedAttributes`, `annotateSpan` and `logAnnotations` in `packages/core/src/PortSpanEncode.ts`, over the one encoding body port spans write through too, with `qadi.subject_id` read from `sharedQuestionKeys` there.

**Implication**: a tracer query names one key per fact, so a dashboard on the subject reads the port spans and the evaluate family under the same key, and a key cannot drift between a writer and the test that reads it ([ADR-QD-188](decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md), [ADR-QD-109](decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md), [ADR-QD-135](decisions/135-sink-record-fields-stated-once.md)).

**Enforcement**: the compiler holds each field to a `SpanValue`, the outcome to a decision's tag or `Failed`, each span name to a `SpanKey`, and each question to every member of its struct, through the `PoseOf` that `annotateAsked` and `askedAttributes` take, and refuses the denial event's log-event struct at every span-writing function the library has: `packages/core/test/EvaluationSpan.tst.ts` ("the outcome is a decision tag or Failed", "every field of the family holds only span values", "a question that leaves a member out is refused", "the denial event's struct cannot annotate a span", "the denial event's struct cannot annotate a span as its question", "the denial event's struct cannot build a span's attributes", "the denial event's struct cannot open a span with its attributes"). A raw `Effect.annotateCurrentSpan` or `Stream.withSpan` attribute map, and a log event upcast to a plain `SpanStruct`, are not refused; review keeps those. `[span-key-source]` and `[span-key-literal]` in `scripts/check-house-style.mjs` refuse a family key typed by hand outside the declaration. Tests hold the rules as plain values, `packages/core/test/EvaluationSpan.test.ts` ("the question and the answer of each span share no key", "every span that asks shares one subject, policy tag and action field", "the three answers that can fail share one error tag field and key", "every field of every struct reads back what it wrote"), and hold at run time each span's public name and the denial event's log-event marker, which no span struct carries ("each span of the family keeps the public name a tracer keys on", "a log event declaration carries its marker at runtime and a span struct does not").

**Related**: [ADR-QD-188](decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md), [ADR-QD-109](decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md), [INV-QD-044](#inv-qd-044-a-span-never-carries-a-resolved-attributes-value), [BEH-QD-712](behaviors/30-port-calls.md#beh-qd-712-the-outcome-of-an-evaluation-is-one-key-on-every-decided-or-failed-path), [BEH-QD-715](behaviors/30-port-calls.md#beh-qd-715-every-key-of-the-evaluate-family-is-declared-once-and-written-only-through-its-declaration).

## INV-QD-397: The remedy table agrees with the fixture ports on every signature and acted leaf

For every fixture signature list, `hasSignature` leaf and site, and every fixture event list, `hasActed` leaf and site, the remedy table agrees with core's evaluation over the fixture ports. Allow means no row and no skip. Deny means exactly one strengthening row that makes the leaf hold or, for an event at a site with no usable resource id, a skip. A failure, a refusal included, means a skip naming why, and that holds for a row, a list of rows or a site that cannot be read at all: a `null` row, a getter or a proxy that throws, a list that is a revoked proxy.

**Source**: `packages/devtools/src/model/Remedies.ts`, the `Signature` and `Acted` arms of its requirement table, each asking `signatureAnswerFromSignatures` or `actedAnswerFromEvents` and turning the answer into a row or a skip, and reading the form's own subject, resource and list of rows through one guarded read, `readForm`.

**Implication**: a remedy the table offers is a remedy core's own evaluation accepts, and a check the table skips is one core cannot answer, so the table is no second belief about what a signature or an event on file means ([ADR-QD-189](decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md), [BEH-QD-718](behaviors/29-devtools-simulator.md#beh-qd-718-a-signature-or-acted-remedy-is-decided-by-core), [BEH-QD-719](behaviors/29-devtools-simulator.md#beh-qd-719-a-remedy-core-cannot-build-is-skipped-with-its-reason)).

**Enforcement**: tests, the two agreement files, each a closed product whose size it asserts plus its two refusal rows. `packages/devtools/test/model/RemedySignatureConformance.test.ts` ("the product holds 1184 cases over four sites, four leaves and 74 lists", "at a site whose resource id is doc-1", "at a site whose resource has no id", "at a site whose resource id is not a string", "at a site with no resource", "a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read", "a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read") and `packages/devtools/test/model/RemedyActedConformance.test.ts` ("the product holds 144 cases over four sites, two leaves and 18 lists", "at a site whose resource id is doc-1", "at a site whose resource has no id", "at a site whose resource id is not a string", "at a site with no resource", "a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read", "a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read") compare the table with core's evaluation over `fixturePortsLayer`, and `packages/devtools/test/model/RemedyTotality.test.ts` ("a row that is null is skipped, naming the field and what was thrown", "a row whose getter throws is skipped, naming the field and what was thrown", "a row that is a throwing proxy is skipped, naming the field and the throw", "a form subject that cannot be read is skipped, naming the form", "a resource id that throws skips a Resource leaf and not an Any leaf", "a resource id that throws skips a Resource leaf, and an Any leaf's row", "a list that is a revoked proxy is skipped, naming the list and the throw", "a list whose length throws is skipped, naming the list and the throw", "a getter for the list that throws is skipped, naming the form", "a row holding an object whose class name is not text names it generically") pins a skip, never a throw, for each value a row, a list of rows or a site can hold that a typed form refuses. That the products cover every case the code distinguishes is kept by review, and no gate counts the axes.

**Related**: [ADR-QD-189](decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md), [BEH-QD-718](behaviors/29-devtools-simulator.md#beh-qd-718-a-signature-or-acted-remedy-is-decided-by-core), [BEH-QD-719](behaviors/29-devtools-simulator.md#beh-qd-719-a-remedy-core-cannot-build-is-skipped-with-its-reason), [BEH-QD-222](behaviors/29-devtools-simulator.md#beh-qd-222-a-what-if-sweep-varies-the-input-in-both-directions), [INV-QD-007](#inv-qd-007-defaults-fail-closed).

## INV-QD-398: Core states once which signature or event on file meets a leaf at a site

Core states five things once: the leaf's request (the description's `asks`), the check that a resource-scoped request has its id (`requireResourceId`), the one guarded read of a value a list of rows, a row or a site holds (`readGuarded`, and `readRows` for the list), the fixture's lookup keyed by the port's `key`, and the answer rule (`signatureAnswerOf` over `signatureMatches`). The port read, the fixture layer and the judgement are built from them, and `SignatureMatch.ts` stays out of the barrel.

**Source**: `packages/core/src/ScopedLeaf.ts` (`requireResourceId`, called by `readScoped` and both judgements), `packages/core/src/PortKey.ts` (`readGuarded` and `readRows`, read by both lookups and both judgements, so a throw is a `KeyRefusal.Unreadable` and never leaves them), `packages/core/src/SignatureMatch.ts` (`signatureMatches`, `signatureAnswerOf`), `packages/core/src/SignatureHistory.ts` (`signatureLookup`, read by `signatureHistoryFromSignatures` and `signatureAnswerFromSignatures`), `packages/core/src/DecisionHistory.ts` (`actedLookup`, read by `decisionHistoryFromEvents` and `actedAnswerFromEvents`) and `packages/core/src/PortAccess.ts` (`askSignature`, `askActed`).

**Implication**: a change to scoping or matching reaches the read, the layer and the judgement together, so none of them can answer differently from another ([ADR-QD-189](decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md), [BEH-QD-716](behaviors/06-services.md#beh-qd-716-a-fixture-judgement-answers-what-the-port-read-answers), [BEH-QD-717](behaviors/06-services.md#beh-qd-717-a-fixture-layer-and-its-judgement-read-one-lookup)).

**Enforcement**: tests, `packages/core/test/SignatureHistory.test.ts` ("answers as askSignature over the fixture layer does, on every case of the product") and `packages/core/test/DecisionHistory.test.ts` ("answers as askActed over the fixture layer does, on every case of the product"), each comparing the judgement with the read on every case of a closed product, and the five "cannot be read" rows of each file ("a fixture row that cannot be read fails every read, naming the field and what was thrown" and the rows that name each guarded field ("a row whose resourceId cannot be read is refused naming resourceId" and its siblings, six for signatures and two for events), "a site subject that cannot be read fails the judgement with no subject id, naming the site" and its event counterpart, "a resource id that throws fails a Resource leaf, which an Any leaf never reads", "a list that cannot be read fails every read, naming the list and what was thrown", "a row and a site fail with a sentence that names the class generically"). `scripts/check-api-surface.mjs`'s `ENTRY` check and `scripts/check-package-install.mjs`'s check 3b keep `SignatureMatch.ts` out of the barrel and unimportable. That each piece is read and not restated is kept by review, and was seen failing once, when a copy of the lookup drifted and the conformance rows went red; no script counts the reads.

**Related**: [ADR-QD-189](decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md), [ADR-QD-058](decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md), [ADR-QD-094](decisions/094-a-port-is-described-once.md), [ADR-QD-099](decisions/099-entry-points-are-a-closed-list.md), [BEH-QD-716](behaviors/06-services.md#beh-qd-716-a-fixture-judgement-answers-what-the-port-read-answers), [BEH-QD-717](behaviors/06-services.md#beh-qd-717-a-fixture-layer-and-its-judgement-read-one-lookup), [BEH-QD-410](behaviors/06-services.md#beh-qd-410-a-request-the-key-refuses-fails-closed), [INV-QD-120](#inv-qd-120-a-signature-recorded-for-a-discharge-is-keyed-by-the-question-it-discharged).

## INV-QD-399: Every archive the writer returns is read back by its reader

For any rows the codec made, any finite `now` and any `keyMaterial` the reader reads, `archiveAuditTrail` either fails `SequenceIntegrityError` or returns a bundle that `readAuditArchive(JSON.parse(JSON.stringify(bundle)))` accepts, with the `createdAt`, the entry count and the `keyMaterial` it was given. A `now` that is not finite fails `ArchiveInputInvalid` with the refusal `NowNotFinite` before anything else is read; a `keyMaterial` that is not a list fails it with `KeyMaterialNotAList`, and a list holding an item that is not an object with a string `keyId`, `algorithm` and `publicKey` fails it with `KeyMaterialItemRefused` and the index of the first, before the entries are read; and `entries` that is not a list fails it with `EntriesNotAList`, and a list holding an entry the codec did not make, whether it is a literal, a store client's `any` or a JavaScript caller's value, with `EntryNotMadeByCodec` and the index of the first. Each refusal is a member of the closed `ArchiveInputRefusal`, carrying the value given where it is a given value and an `index` where it is an index. None of the four is a defect, whatever the value given.

**Source**: `packages/audit/src/AuditArchive.ts` — `archiveAuditTrail` refuses a non-finite `now` and a `keyMaterial` the reader's `KeyMaterialSchema` does not accept, takes the order, the claim and the sequence break from `archiveFacts`, and writes each `keyMaterial` item as its three declared fields, the list read once and each item's fields read once, so what it checks is what it writes (`snapshotKeyMaterial`); `readAuditArchive` reads the same facts back. Every row it archives is one the codec made (INV-QD-400), because `verifiedArchiveFacts` refuses the first entry `CodecMade.ts` does not hold, so no row it archives is one its reader would refuse.

**Implication**: the writer once archived rows its own reader refused as `EntryNotDecodable`: a row with a `NaN` `at`, an extra top-level key or a record that disagreed with its decision, and a bundle with a `null` `createdAt`. A purge selects only rows a `VerifiedArchive` holds (INV-QD-130), so a bundle the reader refuses blocks the purge it was written for ([ADR-QD-190](decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md), [BEH-QD-722](behaviors/33-audit-pipeline.md#beh-qd-722-the-archive-writer-refuses-a-non-finite-now-and-writes-key-material-as-declared)).

**Enforcement**: `packages/audit/test/ArchiveRoundTrip.test.ts` ("PROPERTY: every archive the writer returns is read back": over generated numbering, a finite `now` with negative zero and a `keyMaterial` item with an extra key, the writer fails `SequenceIntegrityError` or the reader accepts the bundle with the declared fields), `packages/audit/test/ArchiveWriterInputs.test.ts` (each input the type admits, written and read back), `packages/audit/test/ForeignRows.test.ts` (a parsed row with a `null` `at` and an extra key, two plain rows numbered `1.5` and `2.5`, an imitation of a row, `null` and a string, each refused with the exact error and index, and a `keyMaterial` item with a number `keyId`, a `null` item, a string item, a missing or non-string field, a hole and a value that is not a list, each refused by index or by value, with the order `now`, `keyMaterial`, `entries`, `entries` that is not a list refused by the writer, `verifySequenceIntegrity`, `planRetention` and `planPurge` with the value given, each refusal read through `Match.tagsExhaustive`, and a positive twin of each, and a list getter and an item getter that answer differently on a second read, each read once, with a class whose fields are accessors on its prototype as the twin) and `packages/audit/test/AuditArchive.test.ts` (the exact `ArchiveInputInvalid` for `NaN` and both infinities, and its precedence over a sequence break).

**Related**: [BEH-QD-722](behaviors/33-audit-pipeline.md#beh-qd-722-the-archive-writer-refuses-a-non-finite-now-and-writes-key-material-as-declared), [INV-QD-400](#inv-qd-400-an-audit-row-is-made-only-by-its-codec), [INV-QD-130](#inv-qd-130-a-purge-never-selects-a-row-its-archive-does-not-hold), [INV-QD-054](#inv-qd-054-verifysequenceintegrity-detects-every-gap-and-duplicate-sequence-number), [ADR-QD-190](decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md), [ADR-QD-110](decisions/110-an-archives-facts-are-computed-once.md).

## INV-QD-400: An audit row is made only by its codec

An `AuditEntry` is constructed only by `encodeAuditEntry` and `decodeAuditEntry`. An object literal or a spread of a row, with a field changed, is not an `AuditEntry` and does not compile where one is wanted, and a value typed `any` that the codec did not make is refused at run time by every function that computes a fact from rows (`archiveAuditTrail`, `verifySequenceIntegrity`, `planRetention` and so `planPurge`), as `ArchiveInputInvalid` or `RetentionInputInvalid` with the refusal `EntryNotMadeByCodec` and the index of the first, and `entries` that is not a list is refused with `EntriesNotAList` before any entry is read. So a row's `record` is the wire the codec encoded or decoded, its `at` is finite, and its `sequenceNumber` is a safe integer or `undefined`. The codec freezes each row it makes and the `record` object it built, so a write after the codec made the row, `entry.sequenceNumber = 1.5` or `entry.record.at = null`, throws a `TypeError` in strict mode and changes nothing. The freeze is one level: a value nested inside `record` is not frozen, because the encoder passes a host's nested object through (probed: for a `resource` of `{ a: { b: 1 } }`, the row's `record.resource.a` is the host's own `a`), and what a host supplied stays the host's.

**Source**: `packages/audit/src/AuditEntry.ts` — the module-local class, `Data.Class` with a private `nominal` member, exported with `export type { AuditEntry }` alone, so `new AuditEntry` occurs only in `encodeAuditEntry` and `decodeAuditEntry`; and `packages/audit/src/CodecMade.ts`, a module-scope `WeakSet` that those two functions fill, out of the barrel, which `verifiedArchiveFacts` and `planRetention` read through `rowsRefusal`; and `madeByCodec`, which freezes the row and its `record` before it records the row.

**Implication**: the writer and the purge read a row's fields as its identity (`holds`, `planPurge`), and a row built by hand could carry a value the codec never makes. The checks that guarded against one (a sequence number outside the safe integers, an `at` that is not finite) are the codec's rules, stated once, and a check kept after the brand would be unreachable ([ADR-QD-190](decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md), [BEH-QD-721](behaviors/33-audit-pipeline.md#beh-qd-721-a-stored-row-is-read-envelope-first)).

**Enforcement**: the compiler, in `packages/audit/test/AuditEntry.tst.ts` (a literal, a spread of an encode-made row, a spread of a decode-made row and a plain row given to the writer are each refused with a message naming `nominal`, `new AuditEntry` and the schema decoder are refused as absent from the module's values, and each refusal has its positive twin), `pnpm typecheck` over `packages/audit`, and the `no-type-assertion` rule in the lint gate, which refuses the cast that would put one there. At run time, `packages/audit/test/ForeignRows.test.ts` (a parsed row, a plain row, an imitation with a real row's prototype, `null` and a string are each refused by the writer, `verifySequenceIntegrity`, `planRetention` and `planPurge`, and rows the codec made pass), and the same file's "a row the codec made cannot be changed afterwards" (a write to `sequenceNumber`, to `record` and to `record.at` throws and leaves the row as it was, the record the codec built is frozen and the object a host handed it is not, and a frozen row is equal to its twin, hashes alike and is held by an archive). `packages/audit/test/ArchiveRoundTrip.test.ts` ("PROPERTY: over any record, the codec refuses it or reads it back": `encodeAuditEntry` refuses a record its decoder would refuse, or the read-back has the encoded row's own bytes) and `packages/audit/test/AuditEntry.characterisation.test.ts` (an encode-made row and its decode-made twin are one row by bytes, keys and `Equal`) pin the domain of what the codec makes.

**Related**: [BEH-QD-721](behaviors/33-audit-pipeline.md#beh-qd-721-a-stored-row-is-read-envelope-first), [BEH-QD-250](behaviors/33-audit-pipeline.md#beh-qd-250-a-record-with-no-safe-durable-representation-refuses-cleanly-rather-than-approximating-or-crashing), [INV-QD-399](#inv-qd-399-every-archive-the-writer-returns-is-read-back-by-its-reader), [INV-QD-101](#inv-qd-101-retention-never-selects-a-row-without-a-finite-age-past-a-valid-limit), [ADR-QD-190](decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md), [ADR-QD-056](decisions/056-audit-companion-package.md).

## INV-QD-401: A capacity the timeline refuses changes nothing

For any value `emptyTimeline` refuses, which is every value but a non-negative integer, with a missing or `null` capacity read as `DEFAULT_TIMELINE_CAPACITY`, the store's `resize`, the timeline feed's `configure` and the dock model's `configure` throw its error before any state moves and publish nothing. A `configure` that follows compares with the inputs held before the refusal.

**Source**: `packages/devtools/src/model/TimelineStore.ts` (`resize` builds `emptyTimeline` first, so the timeline, a pause's frozen view and the subscribers are untouched when it throws), `packages/devtools/src/model/TimelineFeed.ts` (`configure` calls `effectiveCapacity` before it assigns `inputs`) and `packages/devtools/src/model/DockModel.ts` (`configure` calls it before it assigns `inputs`, configures the feed, or applies the catalogue, roles, ports, gates and diagnostics). At run time a missing or `null` capacity reads as the default, and `-1`, `2.5`, `NaN`, `Infinity`, a string and a bigint are refused; `-0` and `0` are the capacity zero ([ADR-QD-191](decisions/191-a-timeline-store-owns-its-capacity.md)).

**Implication**: a host's mistake cannot leave a feed or a dock holding inputs it never applied, so a later `configure` with the inputs it had held is a no-change and a `restart` reads the source it was reading. The rule is stated once, in `emptyTimeline`, and no caller restates the integer check.

**Enforcement**: tests. `packages/devtools/test/model/TimelineStore.test.ts` ("a capacity it refuses throws, and keeps the entries, the pause and the frozen view", "a caller outside the type: no capacity and null read as the default, a string or a bigint throws"), `packages/devtools/test/model/TimelineFeed.test.ts` (TF30, TF31) and `packages/devtools/test/model/DockModel.test.ts` (M55). The mutation floor of `TimelineStore.ts`, `TimelineFeed.ts` and `DockModel.ts`: a mutant that moves an input before the check is detected.

**Related**: [BEH-QD-726](behaviors/28-devtools-screens.md#beh-qd-726-a-timeline-store-resizes-itself-and-answers-whether-it-did), [BEH-QD-728](behaviors/28-devtools-screens.md#beh-qd-728-a-capacity-the-timeline-refuses-changes-nothing-in-configure), [INV-QD-373](#inv-qd-373-every-listener-is-called-and-what-one-throws-is-never-swallowed), [INV-QD-402](#inv-qd-402-a-timeline-feed-hands-its-host-one-store-for-its-life), [ADR-QD-191](decisions/191-a-timeline-store-owns-its-capacity.md).

## INV-QD-402: A timeline feed hands its host one store for its life

`feed.timeline` is one object from the feed's build until its scope closes: the store its read feeds, never a second store fed from it and never a forwarder over it. A capacity change is that store's `resize`, so a subscription taken on it before the change stays live and hears the emptied timeline once.

**Source**: `packages/devtools/src/model/TimelineFeed.ts` — `makeTimelineFeed` builds one `TimelineStore` at the effective capacity and returns it as `timeline`, its read writes to it through `accept`, and `configure` changes the bound only through its `resize` ([ADR-QD-191](decisions/191-a-timeline-store-owns-its-capacity.md)).

**Implication**: a host that subscribes to the store once, as `useTimeline` and the dock do, keeps hearing it across any number of capacity changes, and no member of the store is restated by a second object that could drift from it. The store a host holds is the store the scoped read feeds ([ADR-QD-137](decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md)).

**Enforcement**: tests and the compiler. `packages/devtools/test/model/TimelineFeed.test.ts` (TF34: a listener added before two capacity changes hears each emptied timeline once; TF35 and TF36), `packages/devtools/test/surface.tst.ts` ("a timeline store resizes itself and answers whether it did" pins `TimelineFeed["timeline"]` as `TimelineStore`), and the mutation floor of `TimelineFeed.ts`.

**Related**: [BEH-QD-727](behaviors/28-devtools-screens.md#beh-qd-727-a-timeline-feed-holds-one-store-for-its-life), [BEH-QD-726](behaviors/28-devtools-screens.md#beh-qd-726-a-timeline-store-resizes-itself-and-answers-whether-it-did), [INV-QD-401](#inv-qd-401-a-capacity-the-timeline-refuses-changes-nothing), [INV-QD-373](#inv-qd-373-every-listener-is-called-and-what-one-throws-is-never-swallowed), [ADR-QD-191](decisions/191-a-timeline-store-owns-its-capacity.md), [ADR-QD-137](decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md).

## INV-QD-403: A configure that moves no input reaches no host code, the retry of a failed watch excepted

A `configure` of a timeline feed, a diagnostics feed, a gates feed or the dock model in which no input field moved, after the inputs are normalised, publishes nothing, restarts nothing and reads no host code: no registry's `instances()`, no questions thunk, no source and no layer. A field omitted and one holding `undefined` are one field, and a capacity is compared by the bound it means. The one exception is a gates feed whose watch failed, which any `configure` subscribes again.

**Source**: `packages/devtools/src/model/ExternalStore.ts` — `sameFields`, which compares two records by identity field for field and counts a field on one side only as a change, and `sameFieldsOrAbsent`, which treats an absent input as equal only to an absent one; applied by the early return in `TimelineFeed.ts`, `DiagnosticsFeed.ts` and `GatesFeed.ts` (the last returning early on `sameFields(held, wanted) && watchFailure === undefined`) and, through the feeds, by `DockModel.ts`'s `configure`, which compares nothing itself and runs every step on every call, each over its input type's one normaliser: `completeTimelineInputs`, `completeDiagnosticsOptions`, `completeGatesInputs` and `completeDockInputs` ([ADR-QD-192](decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md)).

**Implication**: a host may hand the dock its inputs on every commit, as `DevtoolsDock` does with a record rebuilt each render, and run no host code the inputs did not move: a registry that has just thrown is not read again, a thunk is not called, and no store notifies. The exception costs one `subscribe` per `configure` for a registry whose `subscribe` keeps throwing, and a registry that works is subscribed once. A registry that mended without announcing stays `Failed` until it announces, a tick whose questions changed joins it, or a `configure` that moves an input reads it.

**Enforcement**: tests and the mutation floor. `packages/devtools/test/model/ConfigureRule.test.ts` (CR1, CR6, CR11 and CR16, a fresh literal holding the same fields publishes nothing, starts nothing and reads no host code; CR2, CR12, CR17 and CR23, an omitted field equals one holding `undefined`; CR2 and CR18, a capacity compares by its bound; CR7, the presence of the diagnostics options; CR4, CR9, CR14 and CR20, each input moved alone reacts), `packages/devtools/test/model/ExternalStore.test.ts` (`sameFields` and `sameFieldsOrAbsent`), `packages/devtools/test/model/GatesFeed.test.ts` (G43, the retry of a failed watch; G44, a quiet mend is read after a `configure` that moves an input and not after one that moves nothing), `packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx` (case 13), `packages/devtools/test/react/DockRegistryReads.test.tsx` (a dock built through the hook reads a healthy registry once, and twice under StrictMode, and a re-render with the same fields reads and subscribes nothing) and the mutation floor of `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `ExternalStore.ts` and `DockModel.ts`: a mutant that restarts on an unmoved input is detected.

**Related**: [BEH-QD-732](behaviors/28-devtools-screens.md#beh-qd-732-a-configure-in-which-no-input-moved-changes-nothing), [BEH-QD-733](behaviors/28-devtools-screens.md#beh-qd-733-a-failed-watch-is-retried-by-any-configure-and-a-quiet-mend-waits-for-a-moved-input), [BEH-QD-734](behaviors/28-devtools-screens.md#beh-qd-734-the-hooks-configure-inside-the-scoped-build), [INV-QD-404](#inv-qd-404-every-input-field-is-compared-or-the-package-does-not-compile), [INV-QD-389](#inv-qd-389-a-derived-store-recomputes-exactly-when-its-key-changes-and-does-nothing-after-its-scope-closes), [INV-QD-373](#inv-qd-373-every-listener-is-called-and-what-one-throws-is-never-swallowed), [ADR-QD-192](decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md).

## INV-QD-404: Every input field is compared, or the package does not compile

Each input type of a feed and of the dock model has exactly one normaliser, declared `(inputs: I) => Required<I>`, and the rule compares the records it returns. A field added to an input type is a compile error at the one line that lists the fields, so it cannot be added without being compared, and the dock's eight inputs are one type, `DockModelInputs`, that `DevtoolsDockProps` extends.

**Source**: `packages/devtools/src/model/ExternalStore.ts` — `sameFields` and `sameFieldsOrAbsent`; the normalisers `completeTimelineInputs` (`TimelineFeed.ts`), `completeDiagnosticsOptions` (`DiagnosticsFeed.ts`), `completeGatesInputs` (`GatesFeed.ts`) and `completeDockInputs` (`DockModel.ts`), each a record literal under `exactOptionalPropertyTypes`, which refuses a literal missing a field of its `Required<…>` return type; and `feedInputsOf` in `DockModel.ts`, the one place the dock's record is mapped onto the three feeds' ([ADR-QD-192](decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md)).

**Implication**: the defect the rule replaces, an input added to a type that compiled and restarted nothing, cannot be written: adding a field fails `pnpm typecheck` until the normaliser lists it, and the moved-alone tables of the rule's tests are keyed by `Record<keyof Required<I>, Mover>`, so they fail the compile until the field has a row. The dock's inputs are listed once with their doc comments, and the packed declaration file names them through `DevtoolsDockProps` without a new export.

**Enforcement**: the compiler and tests. `packages/devtools/test/model/ConfigureInputs.tst.ts` (a golden `Required<…>` pin per input type, the dock's included with the return types of `completeDockInputs` and `feedInputsOf`, and a record literal missing one field, refused, beside its accepted twin), `packages/devtools/test/surface.tst.ts` ("the dock takes eight model inputs and two host props, each accepting undefined"), `packages/devtools/test/model/ConfigureRule.test.ts` (CR4, CR9, CR14 and CR20, the moved-alone tables; CR24, a complete dock record maps onto its feeds) and gate 14 (`scripts/check-package-install.mjs`), whose packed consumer passes a literal of the dock's ten props.

**Related**: [BEH-QD-735](behaviors/28-devtools-screens.md#beh-qd-735-the-docks-inputs-are-stated-once-and-a-reader-subscribed-before-the-first-configure-hears-that-configure), [BEH-QD-732](behaviors/28-devtools-screens.md#beh-qd-732-a-configure-in-which-no-input-moved-changes-nothing), [BEH-QD-731](behaviors/28-devtools-screens.md#beh-qd-731-the-feeds-and-the-dock-model-are-built-with-no-inputs), [INV-QD-403](#inv-qd-403-a-configure-that-moves-no-input-reaches-no-host-code-the-retry-of-a-failed-watch-excepted), [INV-QD-389](#inv-qd-389-a-derived-store-recomputes-exactly-when-its-key-changes-and-does-nothing-after-its-scope-closes), [ADR-QD-192](decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md).

## INV-QD-405: The lens snapshot admits no pick while picking and at most one drawn guard while picking

The highlight lens's snapshot is a closed two-arm union, `Idle` holding the guards drawn and the guard picked and `Picking` holding at most the one guard under the pointer. While picking there is no pick and at most one guard is drawn, whatever sequence of commands the session has been given, and a published snapshot keeps the array it was handed.

**Source**: `packages/devtools/src/model/LensSession.ts` (`LensSnapshot`, `pickedOf`, `isPicking`, and the transition of each command in `makeLensSession`).

**Implication**: the three flat fields the hook held before ADR-QD-193 (`highlighted`, `picking` and `picked`) could hold a pick and picking together, or two drawn guards while picking, and what kept them apart was the order in which the handlers ran. A `Picking` snapshot has no `picked` member and its drawn set is a tuple of at most one, so the type states the rule, and no command reaches a state that breaks it.

**Enforcement**: the property test in `packages/devtools/test/model/LensSession.test.ts`, "every sequence of commands keeps picking free of a pick and draws at most one guard while picking", which runs random sequences of the six commands and checks, after each command, that a `Picking` snapshot has no `picked` member, draws at most one guard and reads no pick through `pickedOf`; and the test "pickedOf reads the pick of an idle snapshot and nothing while picking; isPicking is true only while picking". That a published snapshot keeps the array it was handed is pinned by "a published snapshot keeps the array it was given". That the closed union and the tuple type are what state the rule is checked by `pnpm typecheck`, and by no test of its own.

**Related**: [BEH-QD-736](behaviors/28-devtools-screens.md#beh-qd-736-the-lens-is-a-headless-session-and-a-no-op-publishes-nothing), [ADR-QD-193](decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md), [ADR-QD-047](decisions/047-a-headless-devtools-model.md).

## INV-QD-406: Lens mode never outlives the panel's listeners, and no overlay outlives the panel

The highlight lens is picking only while the three document listeners picking needs are attached, and an overlay is drawn only while the React panel is mounted. Leaving the panel by a tab switch or by any other unmount ends picking, removes every overlay and detaches every listener, so a lens left picking with nothing listening, a mode nobody can see and nothing can exit, is not reachable, and the host page is not left defaced.

**Source**: `packages/devtools/src/react/useLens.ts`: the draw effect, which draws over the guards the hook reads from its one subscription to the questions store it is handed, and whose cleanup clears the overlays, the listener effect, which attaches the three listeners when the snapshot is `Picking` and detaches them when it stops being so, and the exit effect, keyed on the session alone, whose cleanup calls `cancel()`; and `LensSession.ts`'s `cancel`, which from `Picking` ends picking and from `Idle` clears the drawing and keeps the pick.

**Implication**: the exit is an effect of its own and not the listeners' cleanup, because the listeners' effect re-runs on every change of mode, and a `cancel()` there would run when a `highlight` ended picking and wipe the highlight it had just drawn.

**Enforcement**: tests. `packages/devtools/test/react/Lens.dock.characterisation.test.tsx` ("a switch to the log while picking ends picking and leaves no listener"; "a highlight, then a switch to the log and back"; "the highlight button pressed while picking", which holds the drawing that the exit effect must not cancel), `packages/devtools/test/react/QuestionsPanel.gates.test.tsx` ("removes its overlays when the panel unmounts"; "stops listening when the panel unmounts") and `packages/devtools/test/react/Lens.dock.test.tsx` ("entering picking adds three document listeners, and a change in the listed guards while picking adds none"). The hook is in `src/react`, which the mutation gate of `stryker.devtools.mjs` does not mutate, so these tests are what hold it.

**Related**: [BEH-QD-738](behaviors/28-devtools-screens.md#beh-qd-738-leaving-the-react-panel-ends-picking-and-clears-the-highlight-and-the-pick-is-kept), [BEH-QD-737](behaviors/28-devtools-screens.md#beh-qd-737-a-click-is-consumed-only-by-a-pick-that-found-a-guard-decided-in-the-capture-listener), [BEH-QD-234](behaviors/28-devtools-screens.md#beh-qd-234-the-lens-points-at-a-guard-in-both-directions), [INV-QD-107](#inv-qd-107-a-screen-never-changes-what-it-shows-without-the-reviewer), [ADR-QD-193](decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md).

## INV-QD-407: A configure leaves no input unapplied whatever a listener throws

Whatever a host's listener on any of the dock model's eleven stores throws, a `configure` of the dock model runs all seven of its steps and leaves every input applied, and a `configure` with the same inputs afterwards changes no snapshot and notifies no store. What the steps threw reaches the caller once, after the last step ([BEH-QD-741](behaviors/28-devtools-screens.md#beh-qd-741-a-dock-configure-applies-every-input-whatever-a-listener-throws)).

**Source**: `packages/devtools/src/model/DockModel.ts` (`configure`: `completeDockInputs` outside the collector, so a refused capacity throws before anything moves, then `callAll` over the seven steps, each reading the held inputs when it runs) and `packages/devtools/src/model/ExternalStore.ts` (`callAll`, which runs every call and rethrows what they threw by count).

**Implication**: a host's listener cannot leave the model half-applied: the roles, the simulation's ports, the gates, the diagnostics poll and the shown reading follow the inputs however the explorer, the timeline or any other listener behaves, and a host that catches the throw and calls `configure` again with the same inputs finds the model where a `configure` that threw nothing leaves it. No step is gated on a comparison the dock made against what it had just assigned, which is what kept an identical second `configure` from repairing the first ([ADR-QD-194](decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md)).

**Enforcement**: tests and the mutation floor. `packages/devtools/test/model/DockModel.listeners.test.ts` (DL1 to DL9 and DL21, one throwing listener on each of the ten stores a `configure` notifies, the hydration store's DL21 among them: every input applied, the throw rethrown as itself, an identical `configure` changing nothing; DL10, the lens, which a `configure` never notifies, so its throwing listener is not called and every input is still applied; DL11, the rows are every store a built model exposes; DL12, two throwers as one `AggregateError` in step order; DL13 and DL14, a thrown `undefined` and a thrown `null`; DL18 and DL19, two listeners of one store as one `AggregateError`, whole, and a nested one beside another step's throw, never flattened; DL22, a services listener and a hydration listener that both throw as one nested `AggregateError`, the services error first), `packages/devtools/test/model/ExternalStore.callAll.test.ts` and, unedited, `packages/devtools/test/model/DockModel.test.ts` (M55, M56). The mutation floor of `DockModel.ts` and `ExternalStore.ts` (`stryker.devtools.mjs`): a mutant that skips or reorders a step, or stops the collector short, is detected, and a survivor is answered with a test and never with a new baseline.

**Related**: [BEH-QD-741](behaviors/28-devtools-screens.md#beh-qd-741-a-dock-configure-applies-every-input-whatever-a-listener-throws), [BEH-QD-742](behaviors/28-devtools-screens.md#beh-qd-742-what-the-steps-of-a-configure-threw-surfaces-once-after-the-last-step), [INV-QD-373](#inv-qd-373-every-listener-is-called-and-what-one-throws-is-never-swallowed), [INV-QD-401](#inv-qd-401-a-capacity-the-timeline-refuses-changes-nothing), [INV-QD-403](#inv-qd-403-a-configure-that-moves-no-input-reaches-no-host-code-the-retry-of-a-failed-watch-excepted), [ADR-QD-194](decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md), [ADR-QD-192](decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md).

## INV-QD-408: Work a status announces is started whatever a listener throws on it

When the timeline feed publishes `Reading`, the diagnostics feed `Starting` or a simulation run `Running`, the read, the poll or the run it announces is started whatever a listener throws on that status, and what was thrown is rethrown after it started. A gates feed forks its cadence before it publishes, so a throw on the publish a `configure` makes leaves the cadence running ([BEH-QD-744](behaviors/28-devtools-screens.md#beh-qd-744-the-work-a-status-announces-starts-whatever-a-listener-throws-on-that-status)).

**Source**: `packages/devtools/src/model/TimelineFeed.ts` (`readSource`, which publishes `Reading` in a `try` and forks the read in its `finally`), `packages/devtools/src/model/DiagnosticsFeed.ts` (`start`, the same for `Starting` and the poll), `packages/devtools/src/model/SimulationSession.ts` (the run's commit of `Running` and its fork) and `packages/devtools/src/model/GatesFeed.ts` (`configure`, which forks before it publishes).

**Implication**: a listener a host puts on a status store cannot leave a feed saying `Reading`, `Starting` or `Running` with nothing doing the work, which was the one window ADR-QD-177 left open. The status is still published before the fork, because the fork's synchronous prefix may reach `Live` or `Stopped` and a status published after it would overwrite that, and a fork still refuses a run a subscriber has superseded ([ADR-QD-194](decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md)).

**Enforcement**: tests and the mutation floor. `packages/devtools/test/model/TimelineFeed.test.ts` (TF28, TF29), `packages/devtools/test/model/DiagnosticsFeed.test.ts` (F31), `packages/devtools/test/model/SimulationSession.runs.test.ts` (SR6) and `packages/devtools/test/model/GatesFeed.test.ts` (G49). The mutation floor of `TimelineFeed.ts`, `DiagnosticsFeed.ts` and `SimulationSession.ts` (`stryker.devtools.mjs`): a mutant that drops the fork when the publish throws is detected, and a survivor is answered with a test and never with a new baseline.

**Related**: [BEH-QD-744](behaviors/28-devtools-screens.md#beh-qd-744-the-work-a-status-announces-starts-whatever-a-listener-throws-on-that-status), [INV-QD-373](#inv-qd-373-every-listener-is-called-and-what-one-throws-is-never-swallowed), [INV-QD-407](#inv-qd-407-a-configure-leaves-no-input-unapplied-whatever-a-listener-throws), [ADR-QD-194](decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md), [ADR-QD-177](decisions/177-one-throwing-listener-cannot-silence-the-rest.md).

## INV-QD-409: No consumer reaches an unusable registry

Whatever React did to the subtree before, a consumer's subscription, a read through a hook and the provider's own effects find a registry that answers: a provider hidden by an `<Activity>` for longer than a macrotask and shown again, a StrictMode double effect, an invalidation or a devtools feed after the reveal, and a read that straggles in after an unmount throw nothing ([BEH-QD-746](behaviors/09-react.md#beh-qd-746-a-provider-hidden-longer-than-a-macrotask-and-shown-again-throws-nothing-and-renders-the-clients-decision)).

**Source**: `packages/react/src/QadiProvider.tsx` (the registry is built in render and kept for the provider's life, and the one effect that holds and releases the lease) and `packages/react/src/RegistryLease.ts` (the recycle it defers is `registry.reset()`, never `dispose()`).

**Implication**: a registry that is recycled, never disposed, is usable at every moment a consumer can reach it, so a subscription that React sets up before the provider's own effects on a reveal meets a registry that answers. A straggling read recreates a node nothing holds, which idle removal takes a macrotask later, rather than throwing `registry is disposed` ([ADR-QD-195](decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md)). What a recycle takes from a host is bounded and recorded: a subscription the host holds directly on the registry is detached, and a host atom in `initialValues` reads its declared default ([BEH-QD-750](behaviors/09-react.md#beh-qd-750-a-recycle-re-applies-neither-initialvalues-nor-a-hydration-seed)).

**Enforcement**: tests and the mutation floor. `packages/react/test/QadiProvider.lifetime.test.tsx` (LT1 to LT4, the long hide and its companions: an invalidation, a devtools feed and StrictMode, each asserting that the boundary above the subtree caught nothing and that `console.error` was never called; LT14, a read straggling after an unmount) and `packages/react/test/edges.test.tsx` ("releases its registry after it unmounts", which fails under a variant that disposes). A scratch variant that calls `dispose()` in place of `reset()` fails the whole lifetime file. The mutation floor of `RegistryLease.ts` (`stryker.react.mjs`): a mutant that releases twice, never releases or releases while held is detected, and a survivor is answered with a test and never with a new baseline.

**Related**: [BEH-QD-746](behaviors/09-react.md#beh-qd-746-a-provider-hidden-longer-than-a-macrotask-and-shown-again-throws-nothing-and-renders-the-clients-decision), [BEH-QD-748](behaviors/09-react.md#beh-qd-748-a-providers-registry-is-released-once-a-macrotask-after-its-last-release-unless-held-first), [INV-QD-410](#inv-qd-410-a-provider-holds-exactly-one-registry-for-its-life), [ADR-QD-195](decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md), [ADR-QD-014](decisions/014-react-via-atoms.md).

## INV-QD-410: A provider holds exactly one registry for its life

A `QadiProvider` builds one registry, in render, and every consumer below it reads that object from the context for as long as the provider lives. A re-render, a hide, a reveal, a change of `subject` and a change of `atoms` never build a second one ([BEH-QD-747](behaviors/09-react.md#beh-qd-747-a-provider-holds-one-registry-for-its-life)).

**Source**: `packages/react/src/QadiProvider.tsx` (`registryRef`, built lazily in render and never assigned again) and `packages/react/src/RegistryLease.ts` (the lease recycles the registry in place and builds no other).

**Implication**: the registry is never cleared, so a re-render between a hide and a reveal cannot find the ref empty and build a second registry that loses every cached decision, re-applies the construction seeds and hands the tree a different object than the first render gave it. A changed `atoms` prop keeps the registry and is reported as `AtomsReplaced`, once ([ADR-QD-195](decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md)).

**Enforcement**: tests. `packages/react/test/QadiProvider.lifetime.test.tsx`: LT4 (StrictMode and a long hide), LT5 (a short hide), LT6 (a subject changed while hidden), LT7 (a re-render while hidden past the release), LT8 (an `atoms` swap while hidden) and LT13 (a reveal committed with a re-render), each counting the distinct registries its tap was handed and expecting one.

**Related**: [BEH-QD-747](behaviors/09-react.md#beh-qd-747-a-provider-holds-one-registry-for-its-life), [INV-QD-409](#inv-qd-409-no-consumer-reaches-an-unusable-registry), [ADR-QD-195](decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md), [ADR-QD-014](decisions/014-react-via-atoms.md).

## INV-QD-411: The diagnostics reading changes identity only when a field moved, and an equal field keeps its reference

The reading the diagnostics feed publishes is a new object exactly when some field of the accepted sample fails `Equal.equals` against the reading before it, and a field that is equal keeps its reference. One pure function decides both, `foldReading`, and the feed publishes the reading only in the one snapshot it holds: an unchanged sample folds to the reading itself, and `Off` resets the reading by the constant `noDiagnostics` ([BEH-QD-751](behaviors/28-devtools-screens.md#beh-qd-751-a-sample-is-folded-into-the-last-reading-by-one-function-and-a-sample-that-changed-nothing-publishes-nothing)).

**Source**: `packages/devtools/src/model/Diagnostics.ts` (`foldReading`, which names every field of `Diagnostics` in an object literal and decides that nothing moved with `sameFields`, and the module-private `keep`) and `packages/devtools/src/model/DiagnosticsFeed.ts` (the sink `start` builds folds into `view.getSnapshot().reading`, and `off` publishes `diagnosticsOff`).

**Implication**: `useSyncExternalStore` compares snapshots by identity and every poll builds fresh objects, so a reading that changed identity without changing a field re-renders every screen on every tick, and a field that lost its reference re-renders the screen that reads it. A second list of the fields in a chain of `===` comparisons could miss a field added later; the object literal is a compile error for it, and the identity check covers it with no edit ([ADR-QD-196](decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md)).

**Enforcement**: tests. `packages/devtools/test/model/Diagnostics.test.ts` (the `foldReading` describe: a row for every field, only the field that moved takes a new reference, one identity change however many identical samples, structural equality rather than reference) and `packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts` (FC2 to FC4 and FC7 to FC10, the tape of every publish with the reading's identity), `packages/devtools/test/model/DiagnosticsFeed.test.ts` (F19, F33).

**Related**: [BEH-QD-751](behaviors/28-devtools-screens.md#beh-qd-751-a-sample-is-folded-into-the-last-reading-by-one-function-and-a-sample-that-changed-nothing-publishes-nothing), [BEH-QD-753](behaviors/28-devtools-screens.md#beh-qd-753-off-resets-the-reading-and-the-sampled-flag-by-the-empty-constant), [INV-QD-314](#inv-qd-314-the-merged-diagnostics-reading-is-the-models-computed-when-an-input-changes-and-keeps-its-identity), [ADR-QD-196](decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md).

## INV-QD-412: The public Diagnostics holds exactly the fields the poll samples

`Diagnostics` has the four fields `wiring`, `activity`, `hydration` and `portCalls`, and the sample the poll takes is those four reads and nothing else. The questions a supplied reading carries are `DiagnosticsReading`'s, read by the dock's questions join from the supplied reading, and are not a field of the sampled or merged reading ([BEH-QD-754](behaviors/28-devtools-screens.md#beh-qd-754-diagnostics-carries-only-what-the-poll-samples-and-a-supplied-readings-questions-reach-the-docks-join-beside-it)).

**Source**: `packages/devtools/src/model/Diagnostics.ts` (`Diagnostics`, `noDiagnostics`, the `Effect.all` record in `runDiagnostics` and `mergeReading`, which carries no questions) and `packages/devtools/src/model/DockModel.ts` (the questions join reads `held.reading?.questions`).

**Implication**: a field the poll never writes is a second route to a value the gates feed owns, and the poll's sample would carry a manufactured `undefined` for it. Because the join's key never mentioned the merged reading's questions, removing the field moves no value the join reads and no moment it reads it ([ADR-QD-196](decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md), [ADR-QD-169](decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md)).

**Enforcement**: tests. `packages/devtools/test/model/Diagnostics.tst.ts` ("the reading carries no questions field", "a supplied reading carries its questions"), `packages/devtools/test/surface.tst.ts` ("the root's Diagnostics holds exactly the four sampled fields", "the root's DiagnosticsReading carries questions"), `packages/devtools/test/model/Diagnostics.test.ts` ("the sample the poll hands the sink carries exactly the four fields it reads"), `packages/devtools/test/model/DockModel.reading.test.ts` (MR1, MR2) and gate 14 (`scripts/check-package-install.mjs`, which refuses a `Diagnostics` literal with `questions` in the packed artifact).

**Related**: [BEH-QD-754](behaviors/28-devtools-screens.md#beh-qd-754-diagnostics-carries-only-what-the-poll-samples-and-a-supplied-readings-questions-reach-the-docks-join-beside-it), [INV-QD-357](#inv-qd-357-one-feed-owns-the-gate-registry-its-subscription-its-failure-state-and-the-questions-input), [INV-QD-314](#inv-qd-314-the-merged-diagnostics-reading-is-the-models-computed-when-an-input-changes-and-keeps-its-identity), [ADR-QD-196](decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md), [ADR-QD-169](decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md).

## INV-QD-413: A pick's reveal is armed before the pick is published

When the lens moves from `Picking` to `Idle` with a pick, the reveal for the picked guard is already armed at the moment the first subscriber is told of the pick. A listener told of the pick that takes the reveal for that guard is answered `true` once, and a second take finds nothing armed ([BEH-QD-757](behaviors/28-devtools-screens.md#beh-qd-757-the-lens-publishes-every-move-through-the-stores-set-and-a-pick-arms-its-reveal-before-it-is-published)).

**Source**: `choose` in `packages/devtools/src/model/LensSession.ts`: it reads the held snapshot, answers `false` with nothing published when the click changes nothing, assigns the armed guard from the next snapshot, and only then publishes it through the store's `set`.

**Implication**: the reveal is a one-shot taken by the subscriber told of the pick. Armed after the publish, it would be found empty by that subscriber and the reveal would never fire, so the order is part of what `choose` does, and the publish through `set` is the last step of it.

**Enforcement**: tests. `packages/devtools/test/model/LensSession.test.ts` ("a listener told of a pick can take its reveal") and the devtools mutation run (`stryker.devtools.mjs`, which mutates `packages/devtools/src/model/**`, `LensSession.ts` included).

**Related**: [BEH-QD-757](behaviors/28-devtools-screens.md#beh-qd-757-the-lens-publishes-every-move-through-the-stores-set-and-a-pick-arms-its-reveal-before-it-is-published), [BEH-QD-736](behaviors/28-devtools-screens.md#beh-qd-736-the-lens-is-a-headless-session-and-a-no-op-publishes-nothing), [INV-QD-405](#inv-qd-405-the-lens-snapshot-admits-no-pick-while-picking-and-at-most-one-drawn-guard-while-picking), [ADR-QD-197](decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md), [ADR-QD-193](decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md).

## INV-QD-414: The lens adapter reads the listed guards only from the one questions store it is handed

The lens adapter reads the guards it draws over and tests a pointer against from the questions store it is handed and from nowhere else: the draw effect from the adapter's own subscription to that store, made once at render, and each handler from `getSnapshot()` of the same store when its event arrives. The questions panel calls the adapter once and reads both snapshots from what it returns, so while mounted it holds exactly one subscription to the lens and one to the questions store, and none after it unmounts ([BEH-QD-758](behaviors/28-devtools-screens.md#beh-qd-758-the-lens-adapter-takes-the-session-and-the-questions-store-subscribes-once-to-each-and-returns-both-snapshots)).

**Source**: `packages/devtools/src/react/useLens.ts` (`useLens(lens, questions)`, which subscribes to the questions store first and the lens second and returns `UseLens`) and the panel's one call to it in `packages/devtools/src/react/QuestionsPanel.tsx`.

**Implication**: a list of guards handed in beside the store is a second path to one fact, and a caller can hand the adapter a list the store does not hold. Reading the store at event time needs no subscription, so a guard that registers while picking adds no listener and is found by the next pointer move and click.

**Enforcement**: tests. `packages/devtools/test/react/Lens.adapter.test.tsx` ("the panel holds one subscription to the lens while it is mounted and none after"; "the panel holds one subscription to the questions store while it is mounted and none after") and `packages/devtools/test/react/Lens.questions.characterisation.test.tsx` (LQ1 to LQ4). The hook is in `src/react`, which the mutation gate of `stryker.devtools.mjs` does not mutate, so these tests are what hold it.

**Related**: [BEH-QD-758](behaviors/28-devtools-screens.md#beh-qd-758-the-lens-adapter-takes-the-session-and-the-questions-store-subscribes-once-to-each-and-returns-both-snapshots), [BEH-QD-737](behaviors/28-devtools-screens.md#beh-qd-737-a-click-is-consumed-only-by-a-pick-that-found-a-guard-decided-in-the-capture-listener), [INV-QD-406](#inv-qd-406-lens-mode-never-outlives-the-panels-listeners-and-no-overlay-outlives-the-panel), [ADR-QD-197](decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md), [ADR-QD-193](decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md).

## INV-QD-415: The hydration view is pure and total over its two input fields, and its two unions are closed

`hydrationView` is a pure function of a `HydrationInput`, the reading's hydration counts and whether the poll has not sampled, and it answers every pair of values of those two fields with one of three tags, `Pending`, `Unwired` or `Counts`: counts that are present win whatever the flag says, and otherwise the flag chooses between the other two. It reads no status, holds no state, leaves its input as it found it, and gives equal views for equal inputs. `HydrationView` and the `HydrationDropsView` it carries (`None` or `Raised`) are closed unions, and no file under `src/model` imports React ([BEH-QD-761](behaviors/28-devtools-screens.md#beh-qd-761-the-hydration-block-is-one-of-three-states-counts-win-over-the-polls-status-and-zero-is-never-shown-for-no-reporter), [BEH-QD-762](behaviors/28-devtools-screens.md#beh-qd-762-the-hydration-blocks-rate-drops-and-scope-sentences-are-composed-in-the-model-each-with-its-plural-rule)).

**Source**: `packages/devtools/src/model/HydrationView.ts` (`HydrationInput`, whose two fields are both required, the two `Data.taggedEnum` unions, and `hydrationView`, which holds every sentence in a function declaration) and the one exhaustive match over the tag in `packages/devtools/src/react/QuestionsPanel.tsx`.

**Implication**: a rule that is a pure function of two fields can be tabled over their values and measured by mutation, and a panel that renders the tag has nothing left to decide. A fourth tag is a compile error at the panel's match, and an optional input field is refused by the type, so a caller cannot leave out the flag and have the view assume it. Zero is never produced for a reading that holds no counts, because `Counts` is reachable only through counts that exist ([ADR-QD-198](decisions/198-the-hydration-block-is-a-model-row.md)).

**Enforcement**: tests and the mutation floor. `packages/devtools/test/model/HydrationView.test.ts` (V1 to V17: precedence, each plural, the rate at zero, the filter at zero and at one, both branches of the scope note, a foreign reason, equal views for the same reading twice and an input left alone) and `packages/devtools/test/model/HydrationView.tst.ts` (both unions closed, the counts arm's field types, neither input field optional). The devtools mutation run (`stryker.devtools.mjs`, which mutates `packages/devtools/src/model/**`, `HydrationView.ts` included) holds the file to no Survived, NoCoverage or Ignored mutant. That no file under `src/model` imports React is checked by no merge gate: the model's tests import the view with no renderer, and review keeps the rest.

**Related**: [BEH-QD-761](behaviors/28-devtools-screens.md#beh-qd-761-the-hydration-block-is-one-of-three-states-counts-win-over-the-polls-status-and-zero-is-never-shown-for-no-reporter), [BEH-QD-762](behaviors/28-devtools-screens.md#beh-qd-762-the-hydration-blocks-rate-drops-and-scope-sentences-are-composed-in-the-model-each-with-its-plural-rule), [BEH-QD-764](behaviors/28-devtools-screens.md#beh-qd-764-the-questions-panel-renders-the-hydration-views-tag-and-decides-nothing-and-every-test-id-is-kept), [INV-QD-355](#inv-qd-355-a-port-cards-readings-are-joined-by-portname-in-one-pure-model-function), [ADR-QD-198](decisions/198-the-hydration-block-is-a-model-row.md), [ADR-QD-168](decisions/168-a-port-card-is-a-model-row.md).

## INV-QD-416: The hydration store's key compares its two fields by identity, and the reading's counts are read and never copied

The key of `DockModel.hydration` is `{ hydration, unsampled }`: the reading's hydration counts, or `undefined` stated explicitly, and the flag `isUnsampled` derives from the shown snapshot's status. The derived store compares the two fields by identity, so the store recomputes and publishes exactly when one of them changed identity, and the key holds the reading's counts by reference and never as a copy or a spread ([BEH-QD-763](behaviors/28-devtools-screens.md#beh-qd-763-the-hydration-store-is-one-moment-keyed-on-the-counts-and-the-unsampled-flag-by-identity)).

**Source**: `packages/devtools/src/model/DockModel.ts` (the `hydration` store's key, and `shownInputOf`, the one module-scope reader of the shown snapshot that the `services` and `hydration` keys both call, so the predicate is called in that reader once and the `questions` guard keeps its own call).

**Implication**: the diagnostics fold keeps a field's reference while it is equal ([INV-QD-411](#inv-qd-411-the-diagnostics-reading-changes-identity-only-when-a-field-moved-and-an-equal-field-keeps-its-reference)), so a poll that read the same counts changes neither key field and publishes nothing, while a key that copied the counts would look changed on every poll and republish an equal view. The rule is the identity of two fields and not a promise about any status transition: a flip of the flag with equal counts republishes a view equal to the one before, which is a re-render and not a change the block shows.

**Enforcement**: tests. `packages/devtools/test/model/DockModel.test.ts` (M58, an equal poll publishes nothing and other counts publish once; M59, the `Starting` to `Live` flip republishes an equal view; M60, a stop after a sample publishes nothing), `packages/devtools/test/model/ConfigureRule.test.ts` (CR22) and `packages/devtools/test/model/DockModel.listeners.test.ts` (DL21, DL22). The devtools mutation run holds `DockModel.ts`'s score.

**Related**: [BEH-QD-763](behaviors/28-devtools-screens.md#beh-qd-763-the-hydration-store-is-one-moment-keyed-on-the-counts-and-the-unsampled-flag-by-identity), [BEH-QD-615](behaviors/28-devtools-screens.md#beh-qd-615-the-services-store-is-one-moment-and-keeps-its-reference-when-nothing-moved), [INV-QD-411](#inv-qd-411-the-diagnostics-reading-changes-identity-only-when-a-field-moved-and-an-equal-field-keeps-its-reference), [INV-QD-390](#inv-qd-390-the-dock-models-computed-stores-are-derived-stores-and-their-count-is-stated-once), [ADR-QD-198](decisions/198-the-hydration-block-is-a-model-row.md), [ADR-QD-185](decisions/185-the-dock-models-computed-stores-are-derived-stores.md).
