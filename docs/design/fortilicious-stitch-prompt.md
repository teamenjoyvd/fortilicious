# Fortilicious — Stitch Design Prompt

## App Overview

**App name:** Fortilicious
**Platform:** Mobile-first web app (390px baseline), with desktop support
**Stack context:** Next.js + shadcn/ui component primitives — generate designs that translate cleanly to card-based, sheet-based, and dialog-based component patterns.

---

## What Fortilicious Is

A content and product management command center for Amway distributors. Users organize their business around **Content Pillars** (strategic themes like "Nutrition", "Skin Care", "Energy"), manage their **Channels** (Instagram, TikTok, WhatsApp, etc.), capture ideas instantly via a **Quick Capture inbox**, and connect Amway catalog products to their pillars with synced pricing, PV data, and generated product sheets.

The mental model: a distributor opens this app before a client conversation or content post to know *what to say*, *what to sell*, and *what to capture*.

---

## Brand Identity

### Name Etymology

**"Forti"** carries three simultaneous meanings:
- **Fortified** — nutritious, strong, enriched (wellness/product angle)
- **Forty / 40+** — the primary user demographic; mature, established, purpose-driven
- **Forte** — strength, one's area of mastery (confidence angle)

**"licious"** — delicious, indulgent, exciting. The product is serious but the brand is warm and energetic — not clinical.

### Tone

Confident wellness for a mature audience. Not sterile SaaS. Not MLM-corporate. Not youth-chasing. Think: a sharp, health-forward creator tool built for someone who knows exactly what they're doing.

Analogies: If Notion had a baby with a premium wellness brand aimed at adults 40 and over.

### Demographic Design Implications

- **Generous tap targets** — minimum 48px hit areas on all interactive elements
- **Larger base font size** — body text at 16px minimum, never below 14px
- **Generous line-height** — 1.6 for body copy, 1.4 for UI labels
- **High contrast** — all text passes WCAG AA at minimum
- **Low cognitive load** — no dense, cluttered layouts; breathable spacing (24px+ section gaps on mobile)
- **No micro-interactions as primary feedback** — always pair animation with a visible state change the user can read

---

## Color Palette

| Role | Hex | Usage |
|---|---|---|
| **Primary — Deep Citrus** | `#C45C00` | CTAs, active states, key accents |
| **Primary Light** | `#F28C38` | Hover states, badges, pill highlights |
| **Surface — Warm Cream** | `#FDF6EC` | Page backgrounds, card backgrounds |
| **Surface Mid** | `#F5EAD8` | Dividers, secondary card surfaces |
| **Text Primary** | `#1C1208` | Headlines, body text |
| **Text Secondary** | `#7A5C3A` | Labels, captions, metadata |
| **Accent — Vitality Green** | `#3D7A4A` | Success states, sync indicators, active product badges |
| **Accent Light Green** | `#D4EDDA` | Green badge backgrounds |
| **Destructive** | `#B91C1C` | Errors, delete confirmations |
| **Border** | `#E8D9C4` | Card borders, input borders |

> No pure white (`#FFFFFF`) surfaces. No pure black text. Everything sits in the warm cream spectrum.

---

## Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Display / App Name | **Playfair Display** | 700 | 28–36px |
| Headings (H1–H3) | **Playfair Display** | 600 | 22–26px |
| UI Labels / Nav | **Inter** | 500–600 | 15–16px |
| Body / Descriptions | **Inter** | 400 | 16px |
| Monospace / Prices / PV | **JetBrains Mono** | 500 | 14–15px |

The serif/sans-serif pairing is intentional: Playfair gives warmth and authority; Inter keeps the data UI clean and readable for the 40+ demographic.

---

## Visual Language

**Cards:** Rounded corners (`radius: 16px`), subtle warm shadow (`0 2px 12px rgba(196, 92, 0, 0.08)`), cream background with a `#E8D9C4` border. No harsh drop shadows.

**Pillars** feel like tiles — slightly taller than wide, with a color-coded left accent bar (each pillar gets a hue variant within the orange-green palette). Pillar name sits at the top in Playfair Display. Connected channels appear as small icon pills below.

**Bottom Sheets** (Product detail, Quick Capture) use the warm cream background with a drag handle, not a modal overlay. Feels native and unhurried.

**Quick Capture Inbox** has an always-visible floating input at the bottom of the screen — like a message composer. One-tap capture. Zero friction. Large input target.

**Sync badge** for Amway products: a small pulsing green dot + "Synced" label in JetBrains Mono. When sync is stale: amber dot + last-synced timestamp.

**Empty states:** Illustrated — simple line-art food/leaf/spark motifs in `#F28C38`. Warm, human copy ("Nothing captured yet — tap below to start"). Not generic placeholder text.

**Spacing system:** 8px base unit. Section gaps on mobile: 24–32px. No cramped layouts.

---

## Key Screens to Design

### 1. Dashboard / Home
Pillar tile grid (2-col mobile), quick stats strip (active pillars, captured today, products synced), floating Quick Capture bar pinned to bottom.

### 2. Pillar Detail
Header with pillar name + channel pills, tab bar (Overview / Products / Content Ideas), product list with PV and price in JetBrains Mono, large readable rows.

### 3. Product Bottom Sheet
Product image, name, brand badge, PV value, pricing tiers, sync status indicator, "Connect to Pillar" CTA. Full-height sheet with easy dismiss.

### 4. Quick Capture Inbox
Split view: floating capture input at bottom, processed/unprocessed list above. Swipe-to-process gesture. Large text input — no tiny keyboard cramping.

### 5. Product Catalog
Filter bar (Brand, Status, Synced), product cards with sync indicator, "Sync Now" header action. Generous card height for readability.

### 6. Settings
Channel management panel with add/edit/deactivate channels via inline dialogs. Clean, one-thing-at-a-time layout.

---

## What to Avoid

- No dark mode — warm cream is the only surface
- No blue as a primary color — the entire palette is warm
- No flat corporate icon sets — use Lucide icons exclusively, styled in `#C45C00` or `#3D7A4A`
- No full-bleed hero images — this is a data app, not a marketing page
- No `#FFFFFF` white surfaces anywhere
- No font sizes below 14px anywhere in the UI
- No dense, information-packed layouts — this is built for clarity at 40+, not for power users who enjoy complexity
