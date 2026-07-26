@tbac @REQ-QD-019
Feature: Task-based access control

  Authorisations attach to a task in a workflow rather than to a subject or a
  resource. They come into existence when the step is activated, are consumed as
  it completes, and expire when the task ends. Nobody holds "approve invoices" as
  a standing fact — you hold the right to approve this invoice, once, for as long
  as the step is open.

  The workflow engine owns the task table. Qadi decides against the state the
  engine maintains, and the one thing it could not do before the history port
  shipped was notice that the right had already been exercised.

  Scenario: An assigned approver may approve an open step
    Given a subject "amina"
    And the subject has role "approver"
    And the task "invoice-1041" in state "awaiting-approval" raised by "clerk"
    And the subject is "assigned-task" of resource "invoice-1041"
    And the history records that "amina" approved "invoice-1040"
    When the invoice approval policy is evaluated
    Then access is granted

  Scenario: A spent approval is refused
    # Identical to the scenario above in every respect except the invoice named
    # in the history. Nothing about the subject, the resource, the role or the
    # assignment differs. That is the whole of "transient and consumable", and
    # the whole of what this model needed the history port for.
    Given a subject "amina"
    And the subject has role "approver"
    And the task "invoice-1041" in state "awaiting-approval" raised by "clerk"
    And the subject is "assigned-task" of resource "invoice-1041"
    And the history records that "amina" approved "invoice-1041"
    When the invoice approval policy is evaluated
    Then access is denied
    And the denial is attributed to "task.once"

  Scenario: A step the engine has advanced is closed
    # Expiry, and it expires because the engine moved rather than because Qadi
    # counted anything down. No history is wired and none is consulted: the
    # conjunction short-circuits before it reaches the port.
    Given a subject "amina"
    And the subject has role "approver"
    And the task "invoice-1041" in state "approved" raised by "clerk"
    And the subject is "assigned-task" of resource "invoice-1041"
    When the invoice approval policy is evaluated
    Then access is denied
    And the denial is attributed to "task.open"
    And the denial is not attributed to "task.once"

  Scenario: Nobody approves the invoice they raised
    Given a subject "amina"
    And the subject has role "approver"
    And the task "invoice-1041" in state "awaiting-approval" raised by "amina"
    And the subject is "assigned-task" of resource "invoice-1041"
    And the history records that "amina" approved "invoice-1040"
    When the invoice approval policy is evaluated
    Then access is denied
    And the denial is attributed to "task.not-raiser"

  Scenario: An unrecorded raiser does not open the step
    # Without an `exists` guard the negation would GRANT here, because comparing
    # an absent field against the subject's id is false and `not` inverts it —
    # so an invoice with no raiser recorded would be approvable by anyone,
    # including whoever raised it. The hazard MOD-QD-024 records.
    Given a subject "amina"
    And the subject has role "approver"
    And the resource "invoice-1041" with attribute "state" of "awaiting-approval"
    And the subject is "assigned-task" of resource "invoice-1041"
    And the history records that "amina" approved "invoice-1040"
    When the invoice approval policy is evaluated
    Then access is denied
    And the denial is attributed to "task.not-raiser"

  Scenario: The role without the assignment is not authority
    Given a subject "amina"
    And the subject has role "approver"
    And the task "invoice-1041" in state "awaiting-approval" raised by "clerk"
    When the invoice approval policy is evaluated
    Then access is denied
    And the denial is attributed to "task.assigned"
    And the denial is not attributed to "task.once"

  Scenario: The cheapest check refuses first, and nothing else is asked
    # A set lookup on the subject in hand refuses before the resolver or the
    # port is reached, so neither the assignment nor the once-ness appears in
    # the trace at all.
    Given a subject "amina"
    And the task "invoice-1041" in state "awaiting-approval" raised by "clerk"
    And the subject is "assigned-task" of resource "invoice-1041"
    When the invoice approval policy is evaluated
    Then access is denied
    And the denial is attributed to "task.role"
    And the denial is not attributed to "task.assigned"
    And the denial is not attributed to "task.once"
