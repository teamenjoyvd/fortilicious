# Fortilicious — Stitch Design Prompt v2

> **Changelog from v1:**
> Brand narrative tightened to single message. Primary color declared background-only; `#A85000` added as text-safe variant. `#D4860A` Stale Amber added as status token. Pillar accent palette fully defined (8 colors + overflow fallback + 12-pillar cap). Swipe-to-process replaced with tap-to-expand. Pulsing sync dot replaced with static badge. Floating capture bar scoped to 3 screens. Bottom-anchor collision eliminated by scoping. Demographic framing removed from component specs. Top-level navigation defined (5-tab bottom bar). Product Sheet Generation added as Screen 7.

---

## App Overview

**App name:** Fortilicious
**Platform:** Mobile-first web app (390px baseline), with desktop support
**Stack context:** Next.js + shadcn/ui component primitives — generate designs that translate cleanly to card-based, sheet-based, and dialog-based component patterns.

---

## What Fortilicious Is

A content and product management command center for Amway distributors. Users organize their business around **Content Pillars** (strategic themes like "Nutrition", "Skin Care", "Energy"), manage their **Channels** (Instagram, TikTok, WhatsApp, etc.), capture ideas instantly via a **Quick Capture inbox**, and connect Amway catalog products to their pillars with synced pricing, PV data, and generated product sheets.

The mental model: a distributor opens this app before a client conversation or content post to know *what to say*, *what to sell*, and *what to capture*.

**Data source:** Local catalog (JSON/CSV). Web crawl of the Amway catalog site used as a refresh mechanism. No third-party API dependency.

---

## Brand Identity

### The Single Message

> **Forti** — forty, the decade. Not a limitation. A credential.
> **licious** — delicious. Still. More so.
>
> Fortilicious is for the distributor who knows exactly what they're doing, what they're selling, and why it works. Not because they're trying to keep up. Because forty is when things get good.

**Tone:** Confident wellness for a mature, established audience. Not sterile SaaS. Not MLM-corporate. Not youth-chasing. Sharp, warm, and built for someone who has already figured it out.

*Secondary resonances (internal reference only, not in brand copy):* "forti" also echoes fortified (nutritious, enriched) and forte (one's area of mastery). These are not the headline — they are subtext.

---

## Color Palette

| Role | Hex | Usage |
|---|---|---|
| **Primary — Deep Citrus** | `#C45C00` | Button backgrounds, active state fills, icon fills where icon ≥ 24px. **Never as text color on cream surfaces.** |
| **Primary Text** | `#A85000` | Text links, small icon labels, any citrus-colored text on a cream surface. 5.13:1 on `#FDF6EC` — passes WCAG AA normal text. |
| **Primary Light** | `#F28C38` | Badge backgrounds, pill highlights. Use `#1C1208` for any text placed on this background. |
| **Stale Amber** | `#D4860A` | Stale sync status indicator dot. Status-only token — no other use. |
| **Surface — Warm Cream** | `#FDF6EC` | Page backgrounds, card backgrounds |
| **Surface Mid** | `#F5EAD8` | Tab bar background, dividers, secondary card surfaces |
| **Text Primary** | `#1C1208` | Headlines, body text |
| **Text Secondary** | `#7A5C3A` | Labels, captions, metadata. 5.74:1 on `#FDF6EC` — passes WCAG AA. |
| **Accent — Vitality Green** | `#3D7A4A` | Success states, synced product badges |
| **Accent Light Green** | `#D4EDDA` | Green badge backgrounds |
| **Destructive** | `#B91C1C` | Errors, delete confirmations |
| **Border** | `#E8D9C4` | Card borders, input borders, tab bar top border |

> No pure white (`#FFFFFF`) surfaces. No pure black text. Everything sits in the warm cream spectrum.

### Verified Contrast Ratios (WCAG AA = 4.5:1 normal text, 3:1 large text / UI)

| Foreground | Background | Ratio | AA Normal | AA Large |
|---|---|---|---|---|
| `#7A5C3A` | `#FDF6EC` | 5.74:1 | ✅ | ✅ |
| `#A85000` | `#FDF6EC` | 5.13:1 | ✅ | ✅ |
| `#C45C00` | `#FDF6EC` | 4.02:1 | ❌ | ✅ |
| `#1C1208` | `#F28C38` | 7.54:1 | ✅ | ✅ |
| `#1C1208` | `#FDF6EC` | ~16:1 | ✅ | ✅ |

`#C45C00` is restricted to backgrounds precisely because it fails AA for normal-weight text on cream. `#A85000` is its text-safe substitute.

---

## Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Display / App Name | **Playfair Display** | 700 | 28–36px |
| Headings (H1–H3) | **Playfair Display** | 600 | 22–26px |
| UI Labels / Nav | **Inter** | 500–600 | 15–16px |
| Body / Descriptions | **Inter** | 400 | 16px |
| Monospace / Prices / PV | **JetBrains Mono** | 500 | 14–15px |

The serif/sans-serif pairing is intentional: Playfair gives warmth and authority; Inter keeps data UI clean and readable.

**Minimums:** Body text 16px. Labels and captions 14px hard floor. No exceptions.

---

## Accessibility Baseline

These are design system standards, not demographic accommodations.

- **Tap targets:** 48px minimum hit area on all interactive elements (WCAG 2.5.5)
- **Font floor:** 14px minimum; 16px for body copy
- **Line height:** 1.6 for body, 1.4 for UI labels
- **Contrast:** All text-on-surface combinations verified against WCAG AA (see table above)
- **Spacing:** 8px base unit; 24–32px section gaps on mobile
- **State changes:** All feedback is a visible state change, not animation alone

---

## Visual Language

**Cards:** Rounded corners (`radius: 16px`), warm shadow (`0 2px 12px rgba(196, 92, 0, 0.08)`), cream background with `#E8D9C4` border.

**Pillars** feel like tiles — slightly taller than wide, with a color-coded left accent bar (see Pillar Accent Palette below). Pillar name in Playfair Display at top. Connected channels appear as small icon pills below.

**Bottom Sheets** (Product detail, Quick Capture) use the warm cream background with a drag handle. No modal overlay.

**Quick Capture Inbox** has an always-visible floating input on scoped screens (see Navigation). One-tap capture. Large input target. Tap-to-expand action model (see Interaction Patterns).

**Sync badges:** Static dot + label in JetBrains Mono. No pulsing animations.
- Synced: `●` in `#3D7A4A` + "Synced"
- Stale: `●` in `#D4860A` + "3d ago" (last-synced timestamp)

**Empty states:** Illustrated — simple line-art food/leaf/spark motifs in `#F28C38`. Warm, human copy. Not generic placeholder text.

---

## Pillar Accent Palette

Eight named colors. All warm/natural spectrum. Assigned sequentially on pillar creation. User-reassignable from Pillar Detail header.

| # | Name | Hex |
|---|---|---|
| 1 | Deep Citrus | `#C45C00` |
| 2 | Vitality Green | `#3D7A4A` |
| 3 | Amber | `#D4860A` |
| 4 | Sage | `#5F8C6A` |
| 5 | Terracotta | `#A85040` |
| 6 | Olive | `#7A8A3A` |
| 7 | Burgundy | `#8C3A3A` |
| 8 | Teal | `#2D6E7E` |

**Overflow state (9–12 pillars):** Accent bar uses `#7A5C3A` (neutral brown) + first letter of pillar name as monogram in Playfair Display, white, centered in the bar.

**Hard cap:** 12 pillars. At cap, "New Pillar" CTA is disabled with tooltip: *"You've reached the pillar limit. Archive a pillar to add a new one."*

---

## Interaction Patterns

### Quick Capture — Tap-to-Expand (replaces swipe)

Each capture card in the inbox is tapped to expand an action row:

```
╔══════════════════════════════════════╗
║ [Capture text excerpt          ]  ▾  ║
╠══════════════════════════════════════╣
║ [Assign to Pillar ▾] [Process ✓] [✗] ║
╚══════════════════════════════════════╝
```

- **▾ chevron** is the only affordance; tap anywhere on the card to toggle
- Action row: 48px height, three labeled buttons
- "Assign to Pillar" opens a popover with the pillar list
- "Process ✓" moves item to processed list with a brief check animation
- "✗" dismisses with a destructive confirmation on long-press only (prevents accidental dismissal)

Swipe gestures are not used anywhere in this app.

---

## Navigation

### Top-Level: 5-Tab Bottom Bar

```
┌─────────────────────────────────────────┐
│  [Home]  [Pillars]  [  ⊕  ]  [Catalog]  [Settings]  │
└─────────────────────────────────────────┘
```

| Tab | Icon (Lucide) | Route | Notes |
|---|---|---|---|
| Home | `home` | Dashboard | Stats strip + pillar tile grid |
| Pillars | `layers` | Pillar list | Pillar Detail is drill-down, back-arrow exit |
| ⊕ Capture | *(center CTA)* | Quick Capture Inbox | 56px diameter, `#C45C00` fill, white `+` icon, 8px lift above bar |
| Catalog | `package` | Product Catalog | Sheet Generator entered from here |
| Settings | `settings` | Settings | Channel management, account |

**Tab bar styling:**
- Background: `#F5EAD8` (Surface Mid)
- Top border: 1px `#E8D9C4`
- Active tab: `#C45C00` icon + `#A85000` label
- Inactive tab: `#7A5C3A` icon + `#7A5C3A` label
- No shadow on bar itself

**Stack navigation (not tabs):**
- Pillar Detail — entered from Pillars tab
- Product bottom sheet — entered from any product row
- Sheet Generator — entered from Catalog or Pillar Detail

### Floating Capture Bar — Scoped Screens Only

The floating quick-capture input appears on **three screens only:**

| Screen | Bar Visible |
|---|---|
| Dashboard / Home | ✅ |
| Quick Capture Inbox | ✅ |
| Pillar Detail | ✅ |
| Product Catalog | ❌ |
| Sheet Generator | ❌ |
| Settings | ❌ |

Bottom sheets are not triggered from any screen where the capture bar is present. No collision.

---

## Key Screens

### 1. Dashboard / Home

- Quick stats strip: active pillars count, captured today, products synced
- 2-column pillar tile grid (accent bar, pillar name in Playfair, channel pills)
- Floating Quick Capture bar pinned to bottom (above tab bar)
- Empty state if no pillars: illustrated prompt to create first pillar

### 2. Pillar Detail

- Header: pillar name (Playfair H1) + reassignable accent color swatch + channel pills
- Tab bar: Overview / Products / Content Ideas
- Products tab: rows with product name, brand, PV (JetBrains Mono), price (JetBrains Mono), sync badge
- "Generate Sheet" row action on each product
- Floating Quick Capture bar present

### 3. Product Bottom Sheet

- Product image (if available from catalog)
- Product name (Playfair), brand badge
- PV value + pricing tier(s) in JetBrains Mono
- Sync badge (static, per spec above)
- "Connect to Pillar" primary CTA (deep citrus pill)
- "Generate Sheet" secondary CTA
- Full-height sheet, drag-to-dismiss

### 4. Quick Capture Inbox

- Floating capture input at bottom (large tap target, placeholder: *"Capture a thought...")
- List above: unprocessed items at top, processed items below a divider
- Tap-to-expand interaction per Interaction Patterns spec
- Floating Quick Capture bar present (same bar, different context)

### 5. Product Catalog

- Filter bar: Brand · Status · Synced (pill toggles, `#F5EAD8` background, `#C45C00` active fill)
- "Sync Catalog" header action (text button, `#A85000`)
- Product cards: name, brand, PV, sync badge, generous row height (72px minimum)
- Tap row → Product bottom sheet
- No floating capture bar

### 6. Settings

- Channel management: list of connected channels with add/edit/deactivate via inline shadcn/ui dialogs
- Account section
- One-thing-at-a-time layout: no nested settings panels
- No floating capture bar

### 7. Sheet Generator *(new)*

Entry: Product bottom sheet → "Generate Sheet" / Pillar Detail → Products tab → row action "Generate Sheet"

**Full-screen flow (stack navigation, back-arrow exits with discard confirmation if edits exist):**

- **Header:** Product name + brand badge
- **Template picker:** Horizontal scroll, 3 presets
  - "Client Overview" — full product card with benefits and pricing
  - "WhatsApp Message" — short-form text block, copy-ready
  - "Presentation Slide" — headline + 3 bullet points + PV/price
  - Selected template: `#C45C00` left border + cream card background
- **Preview pane:** Live-rendered output. Playfair for product name. Inter for body. JetBrains Mono for PV/price.
- **Editable fields:** Each generated text block is tap-to-edit inline. No separate edit mode.
- **Fixed share bar (bottom):**
  - Download PDF
  - Copy Text
  - Share (native share sheet — WhatsApp, Instagram, etc.)
  - Primary CTA: "Share" as deep citrus pill, 48px height

**State management:** Template selection and edits are local (not persisted — no server cost for MVP). Navigating back discards edits after confirmation.

---

## What to Avoid

- No dark mode — warm cream is the only surface
- No blue anywhere — the entire palette is warm
- No flat corporate icon sets — Lucide icons exclusively, colored `#C45C00`, `#A85000`, or `#3D7A4A` depending on context
- No full-bleed hero images — this is a data app
- No `#FFFFFF` white surfaces anywhere
- No font sizes below 14px
- No swipe gestures as primary interaction
- No pulsing or looping animations as primary feedback
- No `#C45C00` as text color on any cream surface — use `#A85000` instead
- No pillar count beyond 12 without archiving
