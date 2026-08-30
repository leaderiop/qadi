/**
 * Content for the Qadi landing page.
 *
 * Ported verbatim from the approved interactive prototype
 * (`Main.dc.html`'s `DCLogic` component fields) — every package name,
 * API name, coverage number and code snippet here is already verified
 * accurate against the qadi repository. This module is imported both by
 * `src/pages/index.astro` (to render the static markup at build time) and
 * by `src/scripts/landing.js` (to drive the client-side interactivity), so
 * the content is defined exactly once.
 */

export const featDemos = [
  "→ { id, title }  · body withheld",
  "obliged(stepUpAuth, policy)",
  'explain(policy) → "requires the editor role"',
  "→ [ u1 ✓, u2 ✗, u3 ✓ ]",
  "→ WHERE tenant_id = $1",
  "rules([denyWhen(…), permitWhen(…)])",
  "handler(auth: Authorized<Write>)",
  "(Secret,{CRYPTO}) ⋢ (Secret,{BIO})",
  '"Unknown" satisfies neither polarity',
  "Stream in → Stream out",
  "decisionSinkRing(1024)",
  "same input → same trace, same duration",
  "<Can do={writeDoc}>…</Can>",
  "await qadi.check(policy)",
];

const featureBase = [
  { api: "enforceProjected", title: "Field-level projection", desc: "The caller sees only the fields the policy allows. Visibility is a lattice where narrowing is always safe: a projected result can never widen." },
  { api: "obliged · onObligations", title: "Obligations", desc: "Conditions on permission: step-up auth, audit duties. Enforcement refuses to run on an Allow whose obligation nobody discharged." },
  { api: "explain · renderTrace", title: "Explainable decisions", desc: "Every decision carries a full trace of what was checked. explain renders the requirements of a policy in human-readable form." },
  { api: "decideSubjects", title: "Reverse queries", desc: '"Who can see this?" — one policy against many subjects, for administrators. The only entry point in the library asked by nobody.' },
  { api: "toPredicate", title: "Query-side enforcement", desc: "Compile a policy to a SQL WHERE fragment or Prisma WhereInput. The predicate is executable, so the two interpreters provably agree." },
  { api: "rules · denyWhen", title: "Rule tables", desc: "deny-overrides, permit-overrides, first-applicable: XACML's combining algorithms as one policy node, leaving allOf and anyOf untouched." },
  { api: "guard · Authorized<P>", title: "Typed witnesses", desc: "guard hands your handler a proof the check succeeded. Code typed to require Authorized cannot be called without going through it." },
  { api: "dominates · join · meet", title: "Security labels", desc: "Dominance over (level, compartments) pairs. Incomparable labels deny in both directions, and the partial order is property-tested." },
  { api: "hasActed · hasNotActed", title: "Decision history", desc: "A three-valued port: Acted, NotActed, Unknown. No boolean default fails closed for both polarities, so the port refuses to be boolean." },
  { api: "filterStream", title: "Streams", desc: "Streamed siblings of filter and decideSubjects for collections too large to hold in memory: same per-item decision, Stream in and out." },
  { api: "decisionSinkRing", title: "Observability", desc: "Tracing spans, port metrics, and write-only decision sinks — ring, feed, forwarding — plus a devtools timeline dock to watch decisions live." },
  { api: "@qadi/testing", title: "Deterministic testing", desc: "Clock and ids are services, resolvers record their calls, and a decision — trace and duration included — reproduces exactly under test." },
  { api: "QadiProvider · Can", title: "React, hydration included", desc: "Hooks and Can/Cannot components, with server-render hydration that rechecks on the client and reports mismatches as metrics." },
  { api: "@qadi/promise", title: "No Effect required", desc: "A Promise-returning facade over the same evaluator, for callers who do not use Effect. Same decisions, same traces." },
];

export const features = featureBase.map((f, i) => ({ ...f, demo: featDemos[i] }));

export const modelsShipped = [
  "RBAC + role DAG", "ABAC", "ReBAC", "capability tokens", "field-level visibility",
  "ordered rule tables (RuBAC)", "separation of duty", "Bell–LaPadula", "Biba", "Chinese Wall",
  "row-level security", "TBAC", "XACML parity*", "MLS*", "HBAC*", "NGAC*",
];

export const modelsWiring = [
  "DAC / ownership", "ACLs", "Zanzibar stores (SpiceDB / OpenFGA)", "OIDC claims", "temporal",
  "spatial / geofence", "risk-adaptive", "consent-based", "tenant hierarchies", "team-based",
  "OrBAC", "purpose-based",
];

export const modelsExcluded = [
  "attribute-based encryption", "token chains (macaroons, biscuits, UCANs)", "administrative RBAC",
  "Clark–Wilson", "information flow control", "object capabilities",
];

// The homepage's "NN access-control models" headline is this count, not a
// hand-typed number — the model matrix is exactly the defect class the page's
// own "the problem" section warns about, so the two representations (the
// pills, the count) share one array instead of independently drifting.
export const modelCount = modelsShipped.length + modelsWiring.length + modelsExcluded.length;

// One-line glosses for the matrix's acronyms and terms of art, shown as a
// native tooltip on hover/focus so a first-time reader isn't left to guess
// what "NGAC" or "Chinese Wall" means. Keyed on the label with any trailing
// "*" stripped, since four `modelsShipped` entries carry one.
/** @type {Record<string, string>} */
export const modelGlossary = {
  "RBAC + role DAG": "Role-Based Access Control — permissions attach to roles; roles here form a DAG so a role inherits everything reachable below it.",
  "ABAC": "Attribute-Based Access Control — decisions consult subject, resource, and environment attributes, not just role membership.",
  "ReBAC": "Relationship-Based Access Control — access is granted by a graph relationship between subject and resource, such as owner or collaborator.",
  "capability tokens": "Access is granted by possessing an unforgeable token naming exactly what it permits, not by an identity check.",
  "field-level visibility": "A decision can narrow which fields of a resource are visible, not just allow or deny the whole object.",
  "ordered rule tables (RuBAC)": "Rule-Based Access Control — an ordered table of allow/deny rules, evaluated in sequence like a firewall ruleset.",
  "separation of duty": "No single subject can hold two roles whose combination would let them complete a sensitive transaction alone.",
  "Bell–LaPadula": "A confidentiality model: no read up, no write down — prevents high-clearance data from flowing to a lower clearance.",
  "Biba": "An integrity model, the mirror of Bell–LaPadula: no write up, no read down — prevents low-integrity data from contaminating high-integrity data.",
  "Chinese Wall": "A conflict-of-interest model — once a subject accesses one dataset in a conflict class, every competing dataset in that class becomes off-limits.",
  "row-level security": "Authorization filters which rows of a table a subject may see, enforced at the query layer.",
  "TBAC": "Task-Based Access Control — permissions are granted only for the duration and scope of an active task or workflow step.",
  "XACML parity": "eXtensible Access Control Markup Language — the OASIS standard policy language; parity means Qadi's combining algorithms match its semantics without adopting its XML syntax.",
  "MLS": "Multi-Level Security — data and subjects are classified into ordered sensitivity levels (e.g. Secret, Top Secret) governing flow between them.",
  "HBAC": "History-Based Access Control — a decision can depend on what a subject has already done, not just their current attributes.",
  "NGAC": "Next Generation Access Control — NIST's unified model expressing RBAC, ABAC and more through one relation-based graph structure.",
  "DAC / ownership": "Discretionary Access Control — the resource's owner decides who else may access it.",
  "ACLs": "Access Control Lists — an explicit list of subjects or groups and their permissions, attached directly to a resource.",
  "Zanzibar stores (SpiceDB / OpenFGA)": "Relationship-graph authorization services modeled on Google's Zanzibar paper.",
  "OIDC claims": "OpenID Connect — authorization derived from signed identity-token claims issued by an external identity provider.",
  "temporal": "Access depends on a time window — business hours, an expiry date, a scheduled validity period.",
  "spatial / geofence": "Access depends on the subject's physical or network location.",
  "risk-adaptive": "The evidence required for a decision scales with a computed risk score for the request.",
  "consent-based": "Access depends on a subject's explicit, revocable consent grant, as in data-sharing regulations.",
  "tenant hierarchies": "Permissions inherit down a multi-tenant organizational tree.",
  "team-based": "Permissions attach to team membership rather than to an individual or a global role.",
  "OrBAC": "Organization-Based Access Control — permissions are expressed in terms of organizational roles, activities and views, then contextualized to concrete subjects and resources.",
  "purpose-based": "Access depends on the declared purpose of the request, common in privacy-regulated data use.",
  "attribute-based encryption": "Ciphertext itself encodes an access policy over attributes; only keys satisfying the policy can decrypt it — encryption-layer enforcement, not a runtime decision.",
  "token chains (macaroons, biscuits, UCANs)": "Delegatable, attenuable bearer tokens that chain caveats — an authentication/delegation primitive, not a decision engine.",
  "administrative RBAC": "The separate model governing who may assign or revoke roles themselves, distinct from RBAC's own access decisions.",
  "Clark–Wilson": "An integrity model enforcing well-formed transactions and separation of duty through certified procedures, not a labeling scheme.",
  "information flow control": "Tracks and restricts how classified data propagates through a program's execution, enforced by the language or runtime, not a policy check.",
  "object capabilities": "A programming-language security model where possessing a reference to an object is itself the only permission — no ambient authority to check.",
};

const packageBase = [
  { name: "@qadi/core", tag: "foundation", desc: "Permission tokens, role DAG, schema-derived policy ADT, matchers, the Effect evaluator, and all enforcement calls." },
  { name: "@qadi/testing", tag: "testing", desc: "Fixtures, deterministic layers and recording resolvers: reproducible decisions, trace and duration included." },
  { name: "@qadi/react", tag: "frontend", desc: "QadiProvider, hooks, Can/Cannot components, and server-render hydration with recheck metrics." },
  { name: "@qadi/promise", tag: "interop", desc: "A Promise-returning facade over @qadi/core, for callers who do not use Effect." },
  { name: "@qadi/http", tag: "backend", desc: "Effect v4 HttpApi/HttpApiMiddleware and HttpRouter enforcement, subject extraction, permission registry." },
  { name: "@qadi/devtools", tag: "observability", desc: "A headless decision timeline, and a React dock that renders it." },
  { name: "@qadi/predicate-sql", tag: "data", desc: "Compiles a core Predicate to a PostgreSQL, MySQL, or SQLite WHERE fragment. Authorize at the query, not after it." },
  { name: "@qadi/predicate-prisma", tag: "data", desc: "Compiles a core Predicate to a Prisma WhereInput for the same query-side enforcement." },
  { name: "@qadi/features", tag: "private", desc: "Cucumber BDD acceptance suite: executable scenarios pinning the documented behavior." },
];

export const packages = packageBase.map((p, i) => ({ ...p, delay: i * 0.07 + "s" }));

export const apiRows = [
  { call: "decide", color: "oklch(0.78 0.13 195)", when: "You need the full decision: trace, visible fields, obligations.", returns: "Decision", denial: "Carried in the Decision" },
  { call: "check", color: "oklch(0.78 0.13 195)", when: "A plain yes/no gate, and the policy carries no obligation.", returns: "boolean", denial: "false" },
  { call: "assert", color: "oklch(0.75 0.13 80)", when: "No Effect to wrap: a standalone precondition before imperative code.", returns: "void", denial: "Fails with AccessDenied" },
  { call: "enforce", color: "oklch(0.75 0.13 80)", when: "One Effect to guard, result should pass through unchanged.", returns: "A", denial: "Fails; wrapped effect never runs" },
  { call: "enforceProjected", color: "oklch(0.75 0.13 80)", when: "One Effect returning a record; caller should see only allowed fields.", returns: "Partial<A>", denial: "Fails; wrapped effect never runs" },
  { call: "filter", color: "oklch(0.75 0.13 80)", when: "A list of items to authorize one at a time.", returns: "ReadonlyArray<A>", denial: "Denied items dropped, not surfaced" },
];

export const bars = [
  { label: "coverage · @qadi/core", value: "95%", width: "95%" },
  { label: "coverage · workspace", value: "90%", width: "90%" },
  { label: "merge gates passing", value: "22 / 22", width: "100%" },
  { label: "circular imports", value: "0", width: "100%", goalIsZero: true },
];

export const marqueeItems = [
  "RBAC", "ABAC", "ReBAC", "capability tokens", "field-level visibility",
  "rule tables", "separation of duty", "Bell–LaPadula", "Biba",
  "Chinese Wall", "row-level security", "TBAC",
].map((label) => ({ label }));

// Token colors for the typed-code walkthrough — keys match the `lines` token tags below.
export const codeColors = {
  k: "oklch(0.78 0.13 195)",
  s: "oklch(0.75 0.13 80)",
  c: "oklch(0.6 0.01 260)",
  f: "oklch(0.75 0.12 200)",
  p: "oklch(0.82 0.006 260)",
};

// `s: 0` lines are always shown (spacer/context); `s: N` lines light up
// when the walkthrough is on step N (step index is 1-based to match `s`).
export const lines = [
  { s: 1, t: [["// 1 · compose a policy from matchers", "c"]] },
  { s: 1, t: [["const", "k"], [" canReadTitle = ", "p"], ["allOf", "f"], ["([", "p"]] },
  { s: 1, t: [["  ", "p"], ["hasRole", "f"], ["(", "p"], ['"editor"', "s"], ["),", "p"]] },
  { s: 1, t: [["  ", "p"], ["hasPermission", "f"], ["(readDoc, { fields: [", "p"], ['"id"', "s"], [", ", "p"], ['"title"', "s"], ["] }),", "p"]] },
  { s: 1, t: [["]);", "p"]] },
  { s: 0, t: [[" ", "p"]] },
  { s: 2, t: [["// 2 · guard any Effect with it", "c"]] },
  { s: 2, t: [["const", "k"], [" program = ", "p"], ["loadDocument", "f"], ["(", "p"], ['"doc-1"', "s"], [").pipe(", "p"]] },
  { s: 2, t: [["  ", "p"], ["enforceProjected", "f"], ["(canReadTitle),", "p"]] },
  { s: 3, t: [["  // 3 · dependencies arrive as Layers", "c"]] },
  { s: 3, t: [["  Effect.", "p"], ["provide", "f"], ["(", "p"], ["currentSubjectLayer", "f"], ["(", "p"]] },
  { s: 3, t: [["    ", "p"], ["fromRoles", "f"], ["({ id: ", "p"], ['"u1"', "s"], [", roles: [editor] })", "p"]] },
  { s: 3, t: [["  )),", "p"]] },
  { s: 3, t: [["  Effect.", "p"], ["provide", "f"], ["(qadiServices),", "p"]] },
  { s: 2, t: [[");", "p"]] },
  { s: 0, t: [[" ", "p"]] },
  { s: 4, t: [['// 4 → { id: "doc-1", title: "…" }   internalNotes is not returned', "c"]] },
];

export const stepInfo = [
  { n: "01", title: "Compose the policy", body: "Matchers combine with allOf: the subject must hold the editor role and the read permission, with visibility limited to id and title. Built once at module level: policies are values." },
  { n: "02", title: "Guard the Effect", body: "enforceProjected wraps loadDocument. On Deny the wrapped effect never runs; on Allow the result is projected to only the fields the policy allows." },
  { n: "03", title: "Dependencies are Layers", body: "The subject arrives via currentSubjectLayer: fromRoles flattens permissions through the role DAG. Anything left unwired fails closed: it denies, it never grants." },
  { n: "04", title: "Only allowed fields return", body: "id and title pass through; internalNotes never crosses the trust boundary. Failure is a typed error, never a denial." },
];

export const arch = [
  {
    label: "subject: editor",
    subject: "u1 · [editor]",
    allow: true,
    svc1: ["✓ matched", "oklch(0.75 0.14 150)"],
    svc2: ["✓ fields → [id, title]", "oklch(0.75 0.14 150)"],
    out: ['{ id: "doc-1", title: "…" }', "body stripped by projection", "oklch(0.75 0.14 150)"],
    trace: [
      ["▶ evaluate  subject=u1  policy=canReadTitle", "oklch(0.82 0.13 195)"],
      ['① hasRole("editor")  →  matched', "oklch(0.75 0.14 150)"],
      ["② hasPermission(doc:read)  →  matched · fields [id, title]", "oklch(0.75 0.14 150)"],
      ["decision = Allow · 2/2 matchers · trace recorded", "oklch(0.75 0.14 150)"],
      ["enforceProjected → { id, title } — body never leaves", "oklch(0.82 0.006 260)"],
    ],
    caps: [
      "The subject, resource and policy enter evaluate: an Effect whose dependencies are Layers. Nothing is global, so the whole decision is reproducible.",
      "The role DAG is consulted first: u1 holds editor, so the matcher passes.",
      "The permission matcher passes too, and contributes its field-level visibility: only id and title.",
      "allOf: every matcher passed → Allow. The decision carries the visible fields and a full trace of what was checked.",
      "The guarded Effect runs, and its result is projected: only the fields the policy allows cross the trust boundary.",
    ],
  },
  {
    label: "subject: anonymous",
    subject: "anonymous · []",
    allow: false,
    svc1: ["✗ no roles held", "oklch(0.65 0.16 25)"],
    svc2: ["– skipped (short-circuit)", "oklch(0.6 0.01 260)"],
    out: ["AccessDenied", "the wrapped Effect never ran", "oklch(0.65 0.16 25)"],
    trace: [
      ["▶ evaluate  subject=anonymous  policy=canReadTitle", "oklch(0.82 0.13 195)"],
      ['① hasRole("editor")  →  failed · subject holds no roles', "oklch(0.65 0.16 25)"],
      ["② hasPermission(doc:read)  →  never evaluated", "oklch(0.6 0.01 260)"],
      ["decision = Deny · fail closed · trace says which matcher failed", "oklch(0.65 0.16 25)"],
      ["enforce → AccessDenied — loadDocument never executed", "oklch(0.65 0.16 25)"],
    ],
    caps: [
      "Same policy, same resource, but the subject is anonymous, which holds nothing.",
      "The first matcher fails: no roles. Failure here is a matched ✗, not an exception.",
      "allOf short-circuits: the remaining matcher is never evaluated. No wasted resolver calls.",
      "Deny is a value, not a thrown error: the trace records exactly which matcher failed and why.",
      "Enforcement refuses to run the Effect at all. Nothing leaks, nothing partially executes.",
    ],
  },
];
