@obligations @REQ-QD-011
Feature: Obligations

  An obligation is a condition on permission: "allow, provided the access is
  logged". A decision carries the duties contributed by the allow it returned,
  and enforcement refuses to proceed on one nobody has discharged.

  Scenario: An allow carries the duty attached to it
    Given a subject "rania"
    And the subject has role "auditor"
    When they must hold role "auditor" and log the access
    Then access is granted
    And the decision owes "log-access"

  Scenario: A denial owes nothing, because it permits nothing
    Given a subject "rania"
    When they must hold role "auditor" and log the access
    Then access is denied
    And the decision owes nothing

  Scenario: A negated obligation is discarded from the decision
    Given a subject "rania"
    And the subject has role "auditor"
    When they must not hold role "auditor", where holding it would log the access
    Then access is denied
    And the decision owes nothing

  Scenario: A negation that allows owes nothing either
    Given a subject "rania"
    When they must not hold role "auditor", where holding it would log the access
    Then access is granted
    And the decision owes nothing

  Scenario: Conjoined duties are both owed
    Given a subject "rania"
    And the subject has role "auditor"
    And the subject has permission "doc:read"
    When they must satisfy both audited requirements
    Then access is granted
    And the decision owes "log-access, notify-dpo"

  Scenario: The same duty required twice is owed once
    Given a subject "rania"
    And the subject has role "auditor"
    And the subject has permission "doc:read"
    When both requirements log the same access
    Then access is granted
    And the decision owes "log-access"

  Scenario: Enforcement refuses a duty nobody discharged
    Given a subject "rania"
    And the subject has role "auditor"
    When the guarded work runs under an audited requirement
    Then the guarded work does not run
    And enforcement fails with an undischarged obligation

  Scenario: Enforcement proceeds once the duty is discharged
    Given a subject "rania"
    And the subject has role "auditor"
    And an obligation handler is supplied
    When the guarded work runs under an audited requirement
    Then the guarded work runs
    And the handler discharged "log-access"
