@chinese-wall @REQ-QD-018
Feature: Chinese Wall

  Objects belong to companies; companies belong to conflict-of-interest classes.
  An analyst may access any company freely — until they access one, at which
  point every other company in that class becomes forbidden to them. Nobody
  grants or revokes anything: the wall is built by the first access.

  It needs no construct of its own. The conflict class is the *event* and the
  company is the *resource*, so Brewer-Nash is two questions the one-member
  history port already answers: have you touched this class at all, or is this
  the very company you touched?

  Scenario: The first access in a class is free
    # The store is wired and holds an engagement in a DIFFERENT class, which
    # proves more than an empty store would: the question is keyed, and classes
    # are independent.
    Given a subject "an-1"
    And the subject has role "analyst"
    And the resource "bp"
    And the history records that "an-1" accessed "mercury" in the "pharma" class
    When the conflict-of-interest wall is enforced
    Then access is granted

  Scenario: The wall closes against a competitor
    Given a subject "an-1"
    And the subject has role "analyst"
    And the resource "bp"
    And the history records that "an-1" accessed "shell" in the "oil" class
    When the conflict-of-interest wall is enforced
    Then access is denied

  Scenario: The company already engaged with stays accessible
    Given a subject "an-1"
    And the subject has role "analyst"
    And the resource "shell"
    And the history records that "an-1" accessed "shell" in the "oil" class
    When the conflict-of-interest wall is enforced
    Then access is granted

  Scenario: One analyst's engagement is not another analyst's wall
    Given a subject "an-2"
    And the subject has role "analyst"
    And the resource "bp"
    And the history records that "an-1" accessed "shell" in the "oil" class
    When the conflict-of-interest wall is enforced
    Then access is granted

  Scenario: Sanitised material sits outside the wall
    # Brewer-Nash exempts anonymised material explicitly. The exempt branch is a
    # field on the resource in hand, so it is checked first and an exempt read
    # costs no history lookup at all.
    Given a subject "an-1"
    And the subject has role "analyst"
    And the sanitised material "bp-research"
    And the history records that "an-1" accessed "shell" in the "oil" class
    When the conflict-of-interest wall is enforced
    Then access is granted

  Scenario: A refused wall names every branch
    # The complement of the separation-of-duty evidence. `allOf` short-circuits,
    # so a refusing conjunction names one branch and leaves the rest absent. A
    # disjunction must evaluate every child to know none allowed, so a sealed
    # wall names all three. Attribution is sharp under conjunction and
    # exhaustive under disjunction.
    Given a subject "an-1"
    And the subject has role "analyst"
    And the resource "bp"
    And the history records that "an-1" accessed "shell" in the "oil" class
    When the conflict-of-interest wall is enforced
    Then access is denied
    And the denial is attributed to "wall.sanitised"
    And the denial is attributed to "wall.first"
    And the denial is attributed to "wall.same"

  Scenario: Without the analyst role the wall is never reached
    Given a subject "an-1"
    And the resource "bp"
    And the history records that "an-1" accessed "mercury" in the "pharma" class
    When the conflict-of-interest wall is enforced
    Then access is denied
    And the denial is attributed to "wall.analyst"
    And the denial is not attributed to "wall.first"

  Scenario: With nobody wired to answer, every wall is sealed
    # Not even the company the analyst is engaged with. This is the failure the
    # `not(hasActed(...))` spelling would have produced: under an unwired port
    # the first branch would ALLOW, opening every wall in the firm at once.
    Given a subject "an-1"
    And the subject has role "analyst"
    And the resource "shell"
    When the conflict-of-interest wall is enforced
    Then access is denied
