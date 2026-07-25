@serialization @regression @REQ-EG-008
Feature: Policy serialization fidelity

  A policy stored as JSON and reloaded must behave identically. The
  predecessor library dropped the field-merge strategy when serializing, so a
  reloaded policy silently narrowed visibility from two fields to one. This
  is the regression that motivated the rewrite, so it is pinned here as well
  as in the unit tests.

  Scenario: Field visibility survives a serialization round trip
    Given a subject "quinn"
    And the subject has permission "doc:read"
    And the subject has permission "doc:meta"
    When a policy exposing fields "title" for "doc:read" and "author" for "doc:meta" is round-tripped and evaluated with union visibility
    Then access is granted
    And the visible fields are "title,author"
