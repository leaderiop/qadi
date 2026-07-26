@concurrency @REQ-QD-022
Feature: Concurrent evaluation

  A caller may ask for the branches of a composite to be evaluated concurrently,
  trading lookups they may not need for latency they can measure. What they may
  not trade is the answer.

  Every scenario below is a **line-for-line copy** of one elsewhere in this suite
  with "evaluation is concurrent" added and nothing else changed. That is the
  point: if a scenario here disagreed with its twin, a performance switch would
  have changed an authorization outcome. Each twin is named so the pair can be
  checked by hand — and if a twin is edited without editing its copy, the two
  stop agreeing and this file starts failing, which is the intended alarm.

  Scenario: A four-eyes refusal is attributed identically
    # Twin: separation-of-duty.feature, "Nobody approves what they raised".
    # Three labelled conjuncts, one of which refuses. Sequential stops there;
    # concurrent evaluates all three and must attribute to the same one.
    Given evaluation is concurrent
    And the resource "pay-1" raised by "alice"
    And a subject "alice"
    And the subject has role "approve-payment"
    When the four-eyes approval policy is evaluated
    Then access is denied
    And the denial is attributed to "sod.object"

  Scenario: A sealed wall names every branch, and no more
    # Twin: chinese-wall.feature, "A refused wall names every branch". A refusing
    # `anyOf` already evaluates every child, so this pair proves concurrency does
    # not ADD attributions either.
    Given evaluation is concurrent
    And a subject "an-1"
    And the subject has role "analyst"
    And the resource "bp"
    And the history records that "an-1" accessed "shell" in the "oil" class
    When the conflict-of-interest wall is enforced
    Then access is denied
    And the denial is attributed to "wall.sanitised"
    And the denial is attributed to "wall.first"
    And the denial is attributed to "wall.same"

  Scenario: The cheapest check still decides, and later branches stay unattributed
    # Twin: tbac.feature, "The cheapest check refuses first, and nothing else is
    # asked". THE SHARPEST PAIR IN THIS FILE. Concurrency really does evaluate
    # `task.assigned` and `task.once` — the resolver and the port are both called
    # — and the trace still must not mention them, because the fold stops at the
    # same index and discards everything after it.
    Given evaluation is concurrent
    And a subject "amina"
    And the task "invoice-1041" in state "awaiting-approval" raised by "clerk"
    And the subject is "assigned-task" of resource "invoice-1041"
    When the invoice approval policy is evaluated
    Then access is denied
    And the denial is attributed to "task.role"
    And the denial is not attributed to "task.assigned"
    And the denial is not attributed to "task.once"

  Scenario: Only the allowing branch contributes its fields
    # Twin: field-visibility.feature, same name. Under `Union` every child is
    # evaluated anyway, so what this pins is that concurrency does not let a
    # DENYING branch contribute a field set.
    Given evaluation is concurrent
    And a subject "quinn"
    And the subject has permission "doc:read"
    When a policy exposing fields "title" for "doc:read" and "author" for "doc:meta" is evaluated with union visibility
    Then access is granted
    And the visible fields are "title"

  Scenario: A rule table names the same deciding row
    # Twin: rules.feature, "The table names the row that permitted". The deciding
    # row supplies the field set and the obligations, and it is chosen by index —
    # never by whichever condition finished first.
    Given evaluation is concurrent
    And a subject "alice"
    And the subject has role "editor"
    When the rule table is evaluated
      | effect | condition       |
      | deny   | role suspended  |
      | permit | role editor     |
    Then access is granted
    And the deciding row is "rules[1] permitted"

  Scenario: A label policy decides the same way
    # Twin: labels.feature, "Incomparable compartments refuse a read a scalar
    # would allow". Two arms of an `anyOf` gated on the action; concurrency
    # evaluates both arms rather than stopping at the first.
    Given evaluation is concurrent
    And a subject "tariq" cleared at level 2 in compartment "CRYPTO"
    And the resource "doc-1" classified at level 2 in compartment "BIO"
    And the caller is performing "read"
    When Bell-LaPadula is enforced
    Then access is denied

  Scenario: Bounding the concurrency changes nothing either
    # Two at a time rather than unbounded. A bound is a scheduling detail, so it
    # has to be as invisible as concurrency itself.
    Given evaluation is concurrent, two at a time
    And the resource "pay-1" raised by "alice"
    And a subject "alice"
    And the subject has role "approve-payment"
    When the four-eyes approval policy is evaluated
    Then access is denied
    And the denial is attributed to "sod.object"
