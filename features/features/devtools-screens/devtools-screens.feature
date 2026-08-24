@devtools-screens @REQ-QD-025
Feature: Reading the rules, not only the decisions

  Every other devtools screen answers "what happened". These answer the
  questions that come before a decision: what does this rule say, where did this
  role's permissions come from, and is my attribute store actually being asked.

  Two of those have a wrong answer that looks right. A structural view that
  borrowed a verdict would say a rule was rejected when it was never used; and a
  required port reported as "unwired" would send someone to fix wiring that
  cannot be missing, because the program would not have started.

  Scenario: The policy list comes from the log, with no registry anywhere
    Given a decision against the "doc:read" policy
    And another decision against the "doc:read" policy
    Then the catalogue lists 1 policy
    And that policy shows 2 decisions

  Scenario: Two structurally equal policies are one entry
    # `Equal.equals` is structural, which is what lets two components building
    # the same policy inline share one atom — and one row here.
    Given a decision against an "all of doc:read" policy
    And a decision against a separately built "all of doc:read" policy
    Then the catalogue lists 1 policy

  Scenario: Two different policies stay apart
    Given a decision against the "doc:read" policy
    And a decision against the "doc:write" policy
    Then the catalogue lists 2 policies

  Scenario: A declared policy that never ran is listed and marked
    Given a decision against the "doc:read" policy
    And the application declares a policy "canArchive" that has never run
    Then the catalogue lists 2 policies
    And "canArchive" shows 0 decisions

  Scenario: A declared name beats a derived one
    Given a decision against an "all of doc:read" policy
    And the application declares that same policy as "canRead"
    Then the catalogue lists 1 policy
    And the catalogue names it "canRead"

  Scenario: A structural view of a policy states no verdict
    # The one place a rendering bug becomes a misreading: `NeverResolved` means
    # "short-circuited" in the inspector and would mean "never run" here.
    Given the "all of doc:read" policy
    When it is viewed structurally
    Then no node carries a verdict

  Scenario: A role's permissions carry where they came from
    Given a role "viewer" granting "doc:read"
    And a role "editor" granting "doc:write" and inheriting "viewer"
    Then "editor" shows "doc:write" as own
    And "editor" shows "doc:read" via "viewer"

  Scenario: The permissions shown are the permissions that decide
    # INV-QD-038 from a reader's position: a screen showing a different set
    # from the one that decides is the failure that agreement prevents.
    Given a role "viewer" granting "doc:read"
    And a role "editor" granting "doc:write" and inheriting "viewer"
    Then the permissions shown for "editor" are exactly the set that decides

  Scenario: A required port is never called unwired
    Given no application layer at all
    Then the wiring report marks "AttributeResolver" as required
    And the wiring report marks "DecisionCache" as optional

  Scenario: A port that was never reached does not appear in the activity
    # Counts are process-wide aggregates, which is what the panel says they
    # are — so this asserts an absence, not an empty registry.
    Given a port that nothing ever calls
    Then it does not appear in the port activity
