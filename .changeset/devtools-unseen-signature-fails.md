---
"@qadi/devtools": patch
---

The what-if replay no longer answers a signature request its capture never saw with an empty list. A `hasSignature` node's `meaning` and `signerRole` are part of the signature request key, so a what-if that edits either asks a request the capture cannot answer. The empty list denied `hasSignature` but granted `not(hasSignature(...))`, which reported an allow the real store would not give. That request now fails as `SignatureHistoryUnavailable`, under the node and under its negation alike. The other four ports' unseen requests are unchanged and still answer their fail-closed default.
