@port-calls @REQ-QD-027
Feature: Seeing what the ports were asked

  A count says an attribute store was consulted ninety-one times. It cannot say
  which attribute, about whom, or whether anything came back — and a store asked
  for the wrong attribute and one asked for the right one that answered nothing
  are different problems with different fixes.

  One thing must never travel with the detail: the value. It is arbitrary data,
  it reaches whatever tracing backend is wired, and the library cannot know
  whether it is a clearance level or a patient identifier.

  Scenario: An attribute resolved through the port is recorded
    Given a subject "alice" carrying no attributes
    And a resolver answering "clearance" with 9
    When the "clearance" policy is evaluated under a collector
    Then one AttributeResolver call is recorded
    And that call names the attribute "clearance"
    And that call names the subject "alice"
    And that call reports that a value came back

  Scenario: An attribute the subject carries asks nobody
    Given a subject "alice" carrying "clearance" as 9
    When the "clearance" policy is evaluated under a collector
    Then no port calls are recorded

  Scenario: A branch that short-circuits asks nobody
    Given a subject "alice" holding the role "editor"
    And a resolver answering "clearance" with 9
    When the "either way" policy is evaluated under a collector
    Then no port calls are recorded

  Scenario: The value itself never reaches a span
    Given a subject "alice" carrying no attributes
    And a resolver answering "clearance" with the secret "sentinel-do-not-disclose"
    When the "clearance" policy is evaluated under a collector
    Then no span carries the secret

  Scenario: A resolver that answers nothing says so
    Given a subject "alice" carrying no attributes
    And a resolver that has no attributes at all
    When the "clearance" policy is evaluated under a collector
    Then that call reports that no value came back

  Scenario: A resolver that fails still says what it was asked
    Given a subject "alice" carrying no attributes
    And a resolver that is down
    When the "clearance" policy is evaluated under a collector
    Then that call names the attribute "clearance"
    And that call reports no answer at all

  Scenario: A relationship question records what it asked and what it heard
    Given a subject "alice" carrying no attributes
    And an edge making "alice" the "owner" of "doc-1"
    When the "owner" policy is evaluated under a collector against "doc-1"
    Then one RelationshipResolver call is recorded
    And that call reports the answer "Related"

  Scenario: A question abandoned before it was asked still leaves a record
    Given a subject "alice" carrying no attributes
    When the "owner" policy is evaluated under a collector against a resource with no id
    Then one RelationshipResolver call is recorded
    And that call reports no answer at all

  Scenario: The collector does not take the host's tracer away
    Given a subject "alice" carrying no attributes
    And a resolver answering "clearance" with 9
    And the host has wired its own tracer
    When the "clearance" policy is evaluated under a collector
    Then the host's tracer saw the evaluation span

  Scenario: A bounded log says what it dropped
    Given a subject "alice" carrying no attributes
    And a resolver that has no attributes at all
    And the collector keeps only 1 call
    When the "three attributes" policy is evaluated under a collector
    Then one AttributeResolver call is recorded
    And the log reports 2 dropped
