@gate-instances @REQ-QD-029
Feature: Finding the component a missing control belongs to

  A reader arrives at the React panel holding one question — why is this button
  missing — and the panel could only tell them which questions had been asked.
  That list never contains their question, because ten guards on one policy are
  one atom and the atom layer cannot tell them apart.

  It cannot, and a component can: it knows perfectly well that it exists.
  Nothing was asking it. So a guard now records that it exists, when the host
  asks for it, and the two views sit side by side — what has been asked, and who
  is asking.

  Everything here is off unless the host turns it on, because on a production
  page a list of what the current user may and may not do is worth as much to an
  attacker as to a developer.

  Scenario: Uninstrumented, a guard records nothing
    Given a page with 2 guards on "doc:read"
    When the page renders without instrumentation
    Then no guard is registered

  Scenario: Instrumented, each guard says that it exists
    Given a page with 2 guards on "doc:read"
    When the page renders with instrumentation
    Then 2 guards are registered

  Scenario: Two guards on one policy are two guards and one question
    Given a page with 2 guards on "doc:read"
    When the page renders with instrumentation
    Then 2 guards are registered
    And they are grouped into 1 question

  Scenario: A guard records what it rendered
    Given a page with 1 guard on "admin"
    When the page renders with instrumentation
    Then that guard reports the state "Denied"

  Scenario: An allowed guard records that too
    Given a page with 1 guard on "doc:read"
    When the page renders with instrumentation
    Then that guard reports the state "Allowed"

  Scenario: A guard registers once, not once per nested hook
    Given a page with 1 guard on "doc:read"
    When the page renders with instrumentation
    Then exactly 1 guard is registered

  Scenario: A hook is enumerable and not locatable
    Given a page with 1 hook asking "doc:read"
    When the page renders with instrumentation
    Then 1 guard is registered
    And no guard can be pointed at

  Scenario: A component guard can be pointed at
    Given a page with 1 guard on "doc:read"
    When the page renders with instrumentation
    Then 1 guard can be pointed at

  Scenario: A guard that rendered nothing can still be pointed at
    Given a page with 1 guard on "admin"
    When the page renders with instrumentation
    Then 1 guard can be pointed at

  Scenario: The marker changes no layout
    Given a page with 1 guard on "doc:read"
    When the page renders with instrumentation
    Then the marker generates no box

  Scenario: A guard is dropped when it unmounts
    Given a page with 2 guards on "doc:read"
    When the page renders with instrumentation
    And the page unmounts
    Then no guard is registered
