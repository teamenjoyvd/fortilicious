---
name: Mature Wellness Authority
colors:
  surface: '#fff8f0'
  surface-dim: '#e0d9d0'
  surface-bright: '#fff8f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf3e9'
  surface-container: '#f4ede3'
  surface-container-high: '#eee7dd'
  surface-container-highest: '#e8e2d8'
  on-surface: '#1e1b16'
  on-surface-variant: '#574337'
  inverse-surface: '#33302a'
  inverse-on-surface: '#f7f0e6'
  outline: '#8a7265'
  outline-variant: '#ddc1b2'
  surface-tint: '#994700'
  primary: '#964500'
  on-primary: '#ffffff'
  primary-container: '#bc5800'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb68b'
  secondary: '#984800'
  on-secondary: '#ffffff'
  secondary-container: '#fe9247'
  on-secondary-container: '#6b3100'
  tertiary: '#2b683a'
  on-tertiary: '#ffffff'
  tertiary-container: '#448151'
  on-tertiary-container: '#f7fff3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbc8'
  primary-fixed-dim: '#ffb68b'
  on-primary-fixed: '#321200'
  on-primary-fixed-variant: '#753400'
  secondary-fixed: '#ffdbc8'
  secondary-fixed-dim: '#ffb689'
  on-secondary-fixed: '#311300'
  on-secondary-fixed-variant: '#743500'
  tertiary-fixed: '#b0f2b7'
  tertiary-fixed-dim: '#95d69d'
  on-tertiary-fixed: '#00210a'
  on-tertiary-fixed-variant: '#115226'
  background: '#fff8f0'
  on-background: '#1e1b16'
  surface-variant: '#e8e2d8'
  primary-light: '#F28C38'
  stale-amber: '#D4860A'
  surface-mid: '#F5EAD8'
  text-primary: '#1C1208'
  text-secondary: '#7A5C3A'
  accent-green-light: '#D4EDDA'
  destructive: '#B91C1C'
  border-warm: '#E8D9C4'
  sage: '#5F8C6A'
  terracotta: '#A85040'
  olive: '#7A8A3A'
  burgundy: '#8C3A3A'
  teal: '#2D6E7E'
typography:
  display:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  h1:
    fontFamily: Playfair Display
    fontSize: 26px
    fontWeight: '600'
    lineHeight: '1.3'
  h2:
    fontFamily: Playfair Display
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  ui-label:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: '1.4'
  caption:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  section-mobile: 24px
  section-desktop: 32px
  gutter: 16px
  margin-mobile: 20px
---

## Brand & Style

The brand personality is rooted in "Confident Wellness"—a sophisticated, authoritative, and warm aesthetic tailored for a mature audience. It rejects the sterile, cold nature of typical SaaS platforms and the frantic energy of youth-centric apps. Instead, it positions business management as a craft of mastery.

The design style is **Corporate / Modern** with a **Tactile** influence. It utilizes a card-based system with substantial rounded corners and soft, warm shadows to create a sense of physical organization. The experience should feel like a premium, well-ordered stationery set: reliable, high-quality, and intentional.

**Key Principles:**
- **Warmth over Sterility:** No pure white or blue; every surface is bathed in a cream spectrum.
- **Authority through Typography:** High-contrast serif headlines paired with functional sans-serif body text.
- **Deliberate Interaction:** Eschew modern "hidden" gestures like swiping in favor of clear, high-contrast tap targets and explicit affordances.

## Colors

The palette is strictly warm, revolving around "Deep Citrus" and "Warm Cream." To ensure accessibility, color usage is restricted by functional roles:

- **Primary (Deep Citrus):** Used for interactive backgrounds, fills, and large icons. It must **never** be used for text on cream surfaces.
- **Secondary (Text-Safe Citrus):** The primary alternative for text links and small labels on cream backgrounds to maintain WCAG AA compliance.
- **Neutral (Warm Cream):** The foundation of the app. No pure white (`#FFFFFF`) is permitted.
- **Pillar Accents:** A naturalistic spectrum (Sage, Terracotta, Olive, etc.) used to color-code business themes.

**Contrast Requirements:**
- All body text uses `text-primary` on `neutral`.
- Metadata and captions use `text-secondary`, which is verified at 5.74:1 against the cream surface.
- Statuses use `tertiary` (Vitality Green) for success and `stale-amber` for warnings.

## Typography

The typography system relies on a high-contrast pairing: **Playfair Display** provides a sophisticated, editorial feel for headings, while **Inter** ensures high legibility for UI controls and long-form data. **JetBrains Mono** is reserved strictly for technical data, including pricing and PV (Point Value) metrics.

**Accessibility Rules:**
- **Floor:** 14px is the absolute minimum for captions.
- **Body:** 16px is the standard for all descriptions.
- **Line Height:** Generous leading (1.6 for body) is maintained to accommodate mature readers.

## Layout & Spacing

The layout follows a **Fixed Grid** model for desktop (centered content) and a fluid margin model for mobile (390px baseline). 

**Rhythm:**
- A base unit of **8px** governs all dimensions.
- **Section Gaps:** Use 24px (3 units) for mobile vertical rhythm and 32px (4 units) for desktop.
- **Tap Targets:** All interactive elements must maintain a minimum hit area of **48px x 48px** regardless of their visual size.

**Navigation Layout:**
- **Bottom Bar:** A fixed 5-tab bar at the bottom.
- **Floating Bar:** The Quick Capture input floats 8px above the bottom bar or screen edge on scoped screens (Home, Inbox, Detail).

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Ambient Shadows**.

- **Surface Layers:** The background is `neutral`, while cards and secondary surfaces use `surface-mid`.
- **Shadows:** Cards use a warm, tinted shadow (`rgba(196, 92, 0, 0.08)`) with a 12px blur and 2px vertical offset. This makes the UI feel like it is composed of physical cards resting on a cream-colored desk.
- **Borders:** All cards and inputs must have a 1px border of `border-warm` (`#E8D9C4`) to maintain definition against the low-contrast cream background.
- **Bottom Sheets:** Use a full-width elevation with a drag handle, but no darkened modal overlay, keeping the UI light and integrated.

## Shapes

The shape language is consistently rounded to evoke a "friendly but professional" feel. 

- **Cards & Sheets:** 16px (`rounded-xl` / radius: 16px) is the standard for all primary containers.
- **Buttons & Pills:** Full pill-shaped rounding for primary actions; 8px (`rounded-md`) for secondary UI elements like input fields.
- **Pillar Tiles:** Slightly taller-than-wide vertical rectangles with a color-coded left-accent bar (4px width).

## Components

### Buttons
- **Primary:** Deep Citrus (`#C45C00`) background, white text/icons. Height: 48px.
- **Secondary:** Surface Mid (`#F5EAD8`) background, Primary Text (`#A85000`).
- **Destructive:** Background `destructive` (`#B91C1C`), white text. Long-press required for dismissal actions.

### Cards
- **Standard:** Warm Cream background, 16px rounded corners, 1px `#E8D9C4` border, warm ambient shadow.
- **Pillar Tile:** Featured on the dashboard. Includes a vertical accent bar on the left indicating the pillar's assigned color.

### Inputs
- **Quick Capture:** A floating horizontal bar with a 48px height. Placeholder text in `text-secondary`.
- **Standard Fields:** 8px rounded corners, `#E8D9C4` border, 16px padding.

### Status Badges (Sync)
- **Synced:** Green dot (`#3D7A4A`) + "Synced" in JetBrains Mono.
- **Stale:** Amber dot (`#D4860A`) + "3d ago" in JetBrains Mono.
- No pulsing; these are static indicators.

### Tap-to-Expand (Inbox Cards)
- Card tap toggles an internal action row (48px height) containing three labeled buttons: "Assign", "Process", and "Delete".

### Sheet Generator
- **Template Tiles:** Horizontal scrolling cards with a 2px Deep Citrus border when selected.
- **Live Preview:** A card-within-a-page that reflects font pairings and data updates in real-time.