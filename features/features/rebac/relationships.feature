@rebac @REQ-QD-005
Feature: Relationship-based access control

  Scenario: The owner of a resource is granted access
    Given a subject "olivia"
    And the resource "doc-1"
    And the subject is "owner" of resource "doc-1"
    When they must be "owner" of the resource
    Then access is granted

  Scenario: A subject with no relationship is denied
    Given a subject "peggy"
    And the resource "doc-1"
    When they must be "owner" of the resource
    Then access is denied
    And the denial reason mentions "has no 'owner' relation"

  # An unwired port and a store that looked and found nothing both deny, so the
  # verdict cannot tell them apart. The reason must, or the sentence above sends
  # a reader to audit a graph they never connected.
  Scenario: An unwired resolver denies by naming itself, not the missing edge
    Given a subject "peggy"
    And the resource "doc-1"
    And no relationship resolver is wired
    When they must be "owner" of the resource
    Then access is denied
    And the denial reason mentions "no relationship resolver is wired"

  Scenario: A relationship to a different resource does not carry over
    Given a subject "olivia"
    And the resource "doc-2"
    And the subject is "owner" of resource "doc-1"
    When they must be "owner" of the resource
    Then access is denied

  Scenario: A relationship check without a resource is an error, not a denial
    Given a subject "olivia"
    When they must be "owner" of the resource
    Then evaluation fails with an error
