@predicates @REQ-QD-016
Feature: Predicate output

  A policy compiled into a filter the database applies while the query runs,
  rather than loading every candidate row and judging each one afterwards.

  The subject halves fold to constants at compile time; only the comparisons
  against the row survive as columns. A policy that cannot be compiled is
  refused, never approximated — a node quietly rendered as "true" would return
  rows the policy denies.

  Scenario: Tenancy becomes a column comparison
    Given a subject "alice"
    And the subject has attribute "tenantId" of "t-1"
    When the tenancy policy is compiled to a predicate
    Then the predicate admits the row "t-1"
    And the predicate refuses the row "t-2"

  Scenario: A role the subject holds folds away
    Given a subject "alice"
    And the subject has role "auditor"
    And the subject has attribute "tenantId" of "t-1"
    When the audited tenancy policy is compiled to a predicate
    Then the predicate is exactly the tenancy comparison

  Scenario: A role the subject lacks collapses the whole filter
    Given a subject "alice"
    And the subject has attribute "tenantId" of "t-1"
    When the audited tenancy policy is compiled to a predicate
    Then the predicate is false
    And the query need not be run

  Scenario: A relationship cannot be compiled
    Given a subject "alice"
    When the ownership relationship policy is compiled to a predicate
    Then compilation is refused for "HasRelationship"

  Scenario: A duty cannot be compiled
    Given a subject "alice"
    And the subject has role "auditor"
    When the audited-with-duty policy is compiled to a predicate
    Then compilation is refused for "Obliged"

  Scenario: A field restriction cannot be compiled
    Given a subject "alice"
    When the field-restricted policy is compiled to a predicate
    Then compilation is refused for "HasPermission"

  Scenario: A refusal row is excluded from the filter
    Given a subject "alice"
    And the subject has attribute "tenantId" of "t-1"
    When the sealed-rows rule table is compiled to a predicate
    Then the predicate admits the row "t-1"
    And the predicate refuses the sealed row "t-1"

  Scenario: The compiled filter agrees with the evaluator
    Given a subject "alice"
    And the subject has attribute "tenantId" of "t-1"
    When the sealed-rows rule table is compiled to a predicate
    Then the predicate and the evaluator agree on every row
