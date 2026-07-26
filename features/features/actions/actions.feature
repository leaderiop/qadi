@actions @REQ-QD-010
Feature: Action-aware authorization

  A permission is a grant the subject holds; an action is a property of the
  request. Keeping them separate is what lets one stored policy say different
  things about reading and writing.

  Scenario: A policy allows the action being performed
    Given a subject "quentin"
    And the caller is performing "write"
    When they must be performing "write"
    Then access is granted

  Scenario: A policy denies a different action
    Given a subject "quentin"
    And the caller is performing "read"
    When they must be performing "write"
    Then access is denied

  Scenario: Holding the permission is not performing the action
    Given a subject "quentin"
    And the subject has permission "doc:write"
    And the caller is performing "read"
    When they must be performing "write"
    Then access is denied

  Scenario: An action policy evaluated without an action is an error, not a denial
    Given a subject "quentin"
    When they must be performing "write"
    Then evaluation fails with an error

  Scenario: Reading below the subject's level is permitted
    Given a subject "quentin"
    And the resource "doc-1" at level 1
    And the caller is performing "read"
    When read-down and write-up are enforced
    Then access is granted

  Scenario: Writing at or above the subject's level is permitted
    Given a subject "quentin"
    And the resource "doc-1" at level 5
    And the caller is performing "write"
    When read-down and write-up are enforced
    Then access is granted

  Scenario: Writing below the subject's level is refused
    Given a subject "quentin"
    And the resource "doc-1" at level 1
    And the caller is performing "write"
    When read-down and write-up are enforced
    Then access is denied
