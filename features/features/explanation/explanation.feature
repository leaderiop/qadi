@explanation @REQ-QD-023
Feature: Policy explanation

  The trace answers "why was this denied", which presumes a decision was made.
  This answers "what does this rule say" — the first question anyone auditing an
  authorization model asks, and the one an administrative screen listing policies
  has to answer for policies the viewer cannot satisfy.

  Note what is missing from every scenario below: a subject. There is no "Given a
  subject" line anywhere in this file, and there cannot be one — an explanation
  that varied by who was looking would be a trace, and showing it would leak
  whether the viewer satisfies a policy they are only meant to read.

  Scenario: A policy reads as a sentence
    When the publishing policy is described
    Then the description reads "requires role `editor` and requires permission `doc:publish`, exposing only `id`, `title`, and owes `audit.log`"

  Scenario: A restriction is stated, not only the requirement
    # The error direction that matters. Describing this policy as "requires
    # permission doc:publish" would OVERSTATE the grant, and a reviewer acting on
    # an understated restriction is the failure this guards.
    When the publishing policy is described
    Then the description mentions "exposing only `id`, `title`"

  Scenario: A duty is named
    When the publishing policy is described
    Then the description mentions "owes `audit.log`"

  Scenario: An empty conjunction says that it always allows
    # The least guessable property of the ADT, so it is stated rather than
    # rendered as an empty list the reader has to interpret.
    When an empty conjunction is described
    Then the description reads "always allows (an empty conjunction)"

  Scenario: An empty disjunction says that it never allows
    When an empty disjunction is described
    Then the description reads "never allows (an empty disjunction)"

  Scenario: Every labelled branch keeps its name
    # The same labels the separation-of-duty and TBAC traces attribute denials to,
    # readable before anything is evaluated. This is what makes a label useful to
    # a reviewer rather than only to a debugger.
    When the invoice approval policy is described
    Then the description mentions "(`task.role`)"
    And the description mentions "(`task.open`)"
    And the description mentions "(`task.not-raiser`)"
    And the description mentions "(`task.assigned`)"
    And the description mentions "(`task.once`)"

  Scenario: A history requirement says which scope it asks about
    # "ever, at all" and "to this resource" are different claims, and the trace
    # cannot show the difference because both render as one boolean.
    When the invoice approval policy is described
    Then the description mentions "has not approved this resource"

  Scenario: A rule table names its combining algorithm and its row order
    # Order is semantic in a rule table, so a description that dropped the indices
    # would omit the thing that decides.
    When the rule table is described
    Then the description reads "a rule table where any applying deny row wins: [0] deny when requires role `suspended`; [1] permit when requires role `editor`"
