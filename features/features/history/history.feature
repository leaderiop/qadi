@history @REQ-QD-012
Feature: Decision history

  "Approve this invoice, unless you raised it" turns on a fact about the past.
  The port that answers it is three-valued, because a boolean cannot fail closed
  under negation: whichever way an unwired default answered, one polarity of the
  question would grant.

  Scenario: A subject who has not acted may act
    Given a subject "samir"
    And the resource "inv-1"
    And the history records that "samir" raised "inv-2"
    When they must not have raised the resource
    Then access is granted

  Scenario: A subject who already acted may not act again
    Given a subject "samir"
    And the resource "inv-1"
    And the history records that "samir" raised "inv-1"
    When they must not have raised the resource
    Then access is denied

  Scenario: The positive question is answered too
    Given a subject "samir"
    And the resource "inv-1"
    And the history records that "samir" raised "inv-1"
    When they must have raised the resource
    Then access is granted

  Scenario: An unwired history port denies the negative question
    Given a subject "samir"
    And the resource "inv-1"
    When they must not have raised the resource
    Then access is denied

  Scenario: An unwired history port denies the positive question as well
    Given a subject "samir"
    And the resource "inv-1"
    When they must have raised the resource
    Then access is denied

  Scenario: Negating the positive question is not the negative question
    Given a subject "samir"
    And the resource "inv-1"
    When the negation of having raised the resource is evaluated
    Then access is granted

  Scenario: An unreachable history store is an error, not a denial
    Given a subject "samir"
    And the resource "inv-1"
    And the history store is unreachable
    When they must not have raised the resource
    Then evaluation fails with an error

  Scenario: A history question without a resource is an error, not a denial
    Given a subject "samir"
    And the history records that "samir" raised "inv-1"
    When they must not have raised the resource
    Then evaluation fails with an error
