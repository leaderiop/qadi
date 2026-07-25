@attributes @resource @REQ-EG-006
Feature: Resource attribute policies

  Scenario: A matching resource attribute grants access
    Given a subject "rupert"
    And the resource "doc-1" with attribute "state" of "open"
    When the resource attribute "state" must equal "open"
    Then access is granted

  Scenario: A non-matching resource attribute denies access
    Given a subject "rupert"
    And the resource "doc-1" with attribute "state" of "closed"
    When the resource attribute "state" must equal "open"
    Then access is denied

  Scenario: Evaluating a resource policy with no resource is an error
    Given a subject "rupert"
    When the resource attribute "state" must equal "open"
    Then evaluation fails with an error
