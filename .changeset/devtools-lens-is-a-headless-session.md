---
"@qadi/devtools": patch
---

The React panel's highlight lens behaves differently in four ways. No export changes: the lens session and the panel's props are package-private.

- A pick is kept when the reader leaves the React panel and comes back. Its row is marked again on the return, with no second scroll, where the pick was forgotten on every tab round trip.
- A picked row scrolls into view once per pick, when the pick is made, and not again when the panel remounts or its guards change.
- Pressing a question's highlight while picking ends picking and draws that question's guards, where picking stayed on with the highlight drawn.
- A pointer moving inside the guard already drawn redraws nothing, where each move drew the same overlay again.

Leaving the panel still ends picking and clears the highlight, and the document listeners for the pick are added once per picking session rather than again whenever the listed guards change.
