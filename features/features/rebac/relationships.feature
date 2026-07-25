@rebac @REQ-EG-005
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
