---
"@qadi/core": minor
---

`PortName` and `PortSpanName` are now declared in their own module, `PortName.ts`, instead of beside the port metrics (ARCH-77). A new type, `PortSpanOf<N>`, names the span port `N`'s read opens, and `PortDescription.span` is now `PortSpanOf<N>`: a port description's `span` must be its own port's, where it was any port's. A description that named another port's span no longer compiles. Nothing at runtime, in a metric key or on the wire changed.
