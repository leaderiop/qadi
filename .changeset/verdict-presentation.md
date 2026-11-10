---
"@qadi/devtools": patch
---

The dock no longer shows a denial and a failure alike. In the questions panel a failed guard and a denied guard were drawn in the same colour; a failed guard is now amber, and a denied guard red and bold. In the policy tree a denied node's mark was drawn in the amber the dock reserves for errors; it is now red. Every panel (the verdict tag, the questions panel and the policy tree) takes its verdict colour, weight and label from one treatment, in which a denial is solid and a failure outlined, so the two never look alike; a guard state the dock does not know is shown by its own name, muted (ARCH-67, BEH-QD-429). The Inspector and the Simulator read a decision's outcome and obligation state through one reading, and what they show is unchanged (BEH-QD-430).
