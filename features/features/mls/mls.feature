@mls @REQ-QD-021
Feature: Multi-level security, the Denning lattice

  Denning's 1976 formulation states the rule without reference to reading or
  writing at all: information may flow from A to B only when B dominates A.
  Bell-LaPadula and Biba are two instances of it — a read is a flow from the
  object, a write is a flow to it — which is why they need the action dimension
  and the general model does not.

  So every scenario below is a single comparison with no verb, and none of them
  could be written as a read or a write without choosing an instance. Levels are
  a chain; compartments are a partial order; the two together are the lattice.

  Scenario: Flow upwards is permitted
    Given a subject "u-1" cleared at level 1
    And the resource "report" classified at level 2
    When information flows to the resource
    Then access is granted

  Scenario: Flow downwards is refused
    Given a subject "u-1" cleared at level 2
    And the resource "memo" classified at level 1
    When information flows to the resource
    Then access is denied
    And the denial is attributed to "flow"

  Scenario: Flow between equals is permitted, because dominance is reflexive
    Given a subject "u-1" cleared at level 2
    And the resource "peer-report" classified at level 2
    When information flows to the resource
    Then access is granted

  Scenario: A compartment added at the same level still dominates
    # Height is not the only axis. The destination is no higher, but it is
    # broader, and breadth is what makes this a lattice rather than a ladder.
    Given a subject "u-1" cleared at level 2 in compartment "CRYPTO"
    And the resource "joint-file" classified at level 2 in compartments "CRYPTO,BIO"
    When information flows to the resource
    Then access is granted

  Scenario: Flow between overlapping but incomparable compartments is refused
    # The case the rest of the suite never reaches. `{CRYPTO,BIO}` and
    # `{CRYPTO,NUCLEAR}` SHARE a compartment, so neither set contains the other
    # and neither label dominates. Every other incomparability scenario uses
    # disjoint singletons or a strict superset — both of which a comparison on
    # the NUMBER of compartments would also get right. This one it would not.
    Given a subject "u-1" cleared at level 2 in compartments "CRYPTO,BIO"
    And the resource "cross-file" classified at level 3 in compartments "CRYPTO,NUCLEAR"
    When information flows to the resource
    Then access is denied
    And the denial is attributed to "flow"

  Scenario: A higher level does not rescue a narrower compartment set
    # Which is the same finding from the other side: dominance requires BOTH
    # axes, so raising one cannot compensate for losing the other. This is
    # exactly what an enumerated band of levels gets wrong.
    Given a subject "u-1" cleared at level 1 in compartment "CRYPTO"
    And the resource "high-but-narrow" classified at level 3
    When information flows to the resource
    Then access is denied

  Scenario: An unlabelled subject is refused, not errored
    # A label is resolved data, so its absence denies. It is not a MissingAction:
    # there is no action here to be missing, which is the whole point of stating
    # the rule as flow.
    Given a subject "unlabelled"
    And the resource "report" classified at level 2
    When information flows to the resource
    Then access is denied
