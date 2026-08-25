@custom-predicates @REQ-QD-031
Feature: Custom predicates

  `hasCustom` names an externally-registered predicate instead of a
  declarative comparison — the one escape hatch for logic the built-in
  matchers cannot express (ADR-QD-055). The name is all a policy ever
  carries; the check itself lives behind the `CustomPredicate` service.

  Scenario: A registered predicate that allows grants access
    Given a subject "alice"
    And a custom predicate "isOwner" that allows
    When they invoke the custom check "isOwner"
    Then access is granted

  Scenario: A registered predicate that denies refuses access
    Given a subject "alice"
    And a custom predicate "isOwner" that denies
    When they invoke the custom check "isOwner"
    Then access is denied

  Scenario: An unwired registry denies every name
    Given a subject "alice"
    When they invoke the custom check "isOwner"
    Then access is denied

  Scenario: An unrecognised name in a wired registry is an error, not a denial
    Given a subject "alice"
    And a custom predicate "isOwner" that allows
    When they invoke the custom check "isEditor"
    Then evaluation fails with an error
