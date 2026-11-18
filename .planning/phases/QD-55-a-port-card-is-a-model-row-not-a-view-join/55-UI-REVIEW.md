# Phase 55 — UI Review

**Audited:** 2026-11-18
**Baseline:** 55-UI-SPEC.md (locked, behaviour-preserving)
**Screenshots:** not captured (library with no dev server; code-only audit, plus the characterisation test run: 16/16 pass)
**Interaction captures:** off

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every spec string, state word and suffix order matches; words now live in PortCards.ts |
| 2. Visuals | 3/4 | Structure and testids match; wrapping is inconsistent across rows (pre-existing) |
| 3. Color | 4/4 | Amber only via TONE_STYLE (defaulted) and wiring-failed; no accent, no hardcoded colors |
| 4. Typography | 4/4 | Only font.size / font.sizeSmall, weights 400/700 |
| 5. Spacing | 3/4 | Exactly the locked 4/6/8/10 values; off-4px scale accepted by contract |
| 6. Experience Design | 3/4 | All spec'd states covered; closed unions enforce exhaustiveness; no truncation for long text (pre-existing) |

**Overall: 21/24**

No BLOCKERs. All findings are WARNINGs and none is a regression.

---

## Top Fixes

1. **Long text has no wrap or truncation control on call rows and consequence** (WARNING, pre-existing (base), spec "backstop") — a long resource id or reason can overflow the dock. Fix in a later, output-changing phase: `flexWrap: "wrap"` plus `overflowWrap: "anywhere"` on call rows. Out of scope here (D-09).
2. **Non-port cards read "never called"** (WARNING, pre-existing (base), spec defers it) — `EvaluationId`, `CurrentSubject`, `DecisionCache` and `DecisionSink` are not ports, so the line misleads. Reword to "not a port" in a later phase.
3. **Calls-block spacing is hardcoded in two places** (`marginTop: 4` for the Listed and Uncollected blocks) (WARNING, minor) — lift to one constant when styles next change. The cards `section` also has no heading role or `aria-label`, so screen-reader navigation sees only an unlabeled section (pre-existing (base)).

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- Fixed prose in `ServicesPanel.tsx` (wiring-absent lines 62-66, wiring-failed 68-72, uncollected 150-153, scope note 99-111, cache body 218-219) matches the UI-SPEC word for word, including the em dashes.
- The model words match the spec tables: `not provided to this reader` / `absent` / `defaulted — {name}` with the `unnamed` fallback (`PortCards.ts:226`), `no activity reading` (111), `never called` (232), `in flight` (189), `served` / `translation` (130-131), `and N earlier` (210), and `if defaulted:` only when `defaulted === false` (253).
- `Withheld` renders `null`, which preserves the unsampled suppression.
- The characterisation test passes unedited, which is the executable proof.
- No generic labels (Submit, OK, Cancel).

### Pillar 2: Visuals (3/4)
- The layout order is as the contract says: notice, wiring view, scope paragraph. Per card: header, consequence, calls. `data-port` and `data-defaulted` come from the row, and `data-defaulted` is `undefined` (attribute absent) for absent and non-port rows.
- No icon-only buttons, since the screen has no interactive elements.
- Finding (pre-existing (base)): only the card header wraps. Call rows and consequence rely on browser default wrapping inside a flex row.
- Hierarchy is carried only by 12px bold title versus 11px muted rows. This is adequate for a debug panel.

### Pillar 3: Color (4/4)
- Colour tokens used: `colors.border`, `colors.error` and `muted`.
- Amber appears in exactly two places: `TONE_STYLE.Warning` (a closed `CardTone` map, so a new tone is a compile error) and `qadi-wiring-failed`.
- No accent use, no hex or rgb literals in the view.
- The tone is now a model value (`port.defaulted === true ? "Warning" : "Plain"`), which is the D-02 design.

### Pillar 4: Typography (4/4)
- Only `font.sizeSmall` (11px) is set explicitly; the 12px body is inherited from `dock`.
- No new weights. `<strong>` is the only bold, on the port name and the cache title.
- No heading elements, as the contract says.

### Pillar 5: Spacing (3/4)
- The values are the locked ones: card `6px 10px` padding with 4px radius and `marginBottom: 6`, header `gap: 8`, `marginTop: 4`.
- 6px and 10px are off the 4px scale. This is accepted by the contract and not a defect.
- `marginTop: 4` is repeated for the Listed and Uncollected blocks (minor duplication).
- No arbitrary-value utility classes; inline styles only.

### Pillar 6: Experience Design (3/4)
- The states covered are `Withheld`, `NotHanded`, `Failed` and `Read` (the Match is `tagsExhaustive`), plus `Hidden`, `Uncollected` and `Listed`. The `earlier` overflow row exists only above 5 calls.
- Row keys come from the model (`call.key`), as D-12 requires.
- There is no loading state, which the spec dismissed.
- No interaction exists, so there are no focus, hover or keyboard concerns. The 3/4 holds because long-text handling has no styling backstop (spec backstop items, unverified visually since no screenshots were captured).

---

## Registry Safety
Skipped: no `components.json`, no third-party registries.

## Files Audited
- /Users/mohammadalmechkor/Projects/Perso/qadi/packages/devtools/src/react/ServicesPanel.tsx
- /Users/mohammadalmechkor/Projects/Perso/qadi/packages/devtools/src/model/PortCards.ts
- /Users/mohammadalmechkor/Projects/Perso/qadi/packages/devtools/test/react/ServicesPanel.characterisation.test.tsx (run only)
- /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-UI-SPEC.md
