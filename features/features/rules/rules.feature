@rules @REQ-QD-015
Feature: Ordered rule tables

  A rule table is a list of rows, each pairing a condition with an effect, walked
  from the top. It is the firewall model, and the demand behind it is the
  explicit deny: a row saying "and if this matches, refuse", visible as its own
  row and addable without rewriting the rules around it.

  A condition answers *does this row apply*, never *is this permitted*. That
  second bit is what a boolean combinator cannot carry: under anyOf, a child that
  denies and a child that is irrelevant are the same event.

  Scenario: An explicit deny row refuses where the permits would have allowed
    Given a subject "alice"
    And the subject has role "editor"
    And the subject has role "suspended"
    When the rule table is evaluated
      | effect | condition       |
      | deny   | role suspended  |
      | permit | role editor     |
    Then access is denied

  Scenario: Moving a row changes the answer
    Given a subject "alice"
    And the subject has role "editor"
    And the subject has role "suspended"
    When the rule table is evaluated
      | effect | condition       |
      | permit | role editor     |
      | deny   | role suspended  |
    Then access is granted

  Scenario: A row that does not apply is skipped, not refused
    Given a subject "alice"
    And the subject has role "editor"
    When the rule table is evaluated
      | effect | condition       |
      | deny   | role suspended  |
      | permit | role editor     |
    Then access is granted

  Scenario: Deny overrides reaches a refusal written below the permit
    Given a subject "alice"
    And the subject has role "editor"
    And the subject has role "suspended"
    When the rule table is evaluated with "DenyOverrides"
      | effect | condition       |
      | permit | role editor     |
      | deny   | role suspended  |
    Then access is denied

  Scenario: Permit overrides reaches a grant written below the refusal
    Given a subject "alice"
    And the subject has role "editor"
    And the subject has role "suspended"
    When the rule table is evaluated with "PermitOverrides"
      | effect | condition       |
      | deny   | role suspended  |
      | permit | role editor     |
    Then access is granted

  Scenario: No row applying is a denial
    Given a subject "alice"
    When the rule table is evaluated
      | effect | condition       |
      | permit | role editor     |
      | deny   | role suspended  |
    Then access is denied
    And the denial reason mentions "no rule applied"

  Scenario: An empty table denies
    Given a subject "alice"
    When the empty rule table is evaluated
    Then access is denied

  Scenario: A final always-applying row is the default
    Given a subject "alice"
    When the rule table is evaluated
      | effect | condition       |
      | deny   | role suspended  |
      | permit | always          |
    Then access is granted

  Scenario: The table names the row that permitted
    Given a subject "alice"
    And the subject has role "editor"
    When the rule table is evaluated
      | effect | condition       |
      | deny   | role suspended  |
      | permit | role editor     |
    Then access is granted
    And the deciding row is "rules[1] permitted"

  Scenario: The table names the row that refused
    Given a subject "alice"
    And the subject has role "suspended"
    When the rule table is evaluated
      | effect | condition       |
      | permit | role editor     |
      | deny   | role suspended  |
    Then access is denied
    And the deciding row is "rules[1] denied"

  Scenario: Ownership reads as an ordinary row
    Given the resource "doc-1" owned by "alice"
    And a subject "alice"
    When the rule table is evaluated
      | effect | condition       |
      | deny   | role suspended  |
      | permit | owner           |
    Then access is granted
