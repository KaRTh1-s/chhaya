# Chhaya Design System

The Chhaya design system translates extreme heat stress and atmospheric particulate data into an accessible, editorial, and trustworthy digital experience for outdoor laborers and workforce managers across India.

Inspired by the editorial elegance and clarity of the award-winning *Beacon Night Shift* interface, Chhaya pairs high-contrast editorial typography with precise deterministic telemetry.

---

## 1. Design Principles

1. **Truth Before Aesthetics & Model**: Numbers and thresholds are computed by deterministic code before any model is invoked. Every claim on screen is pinned to verifiable evidence.
2. **Accessible High Contrast**: Minimum 4.5:1 contrast across all text and interactive states. Extreme risk uses deep crimson on pale red; safe tiers use forest green on soft emerald.
3. **Restrained, Tactile Motion**: Hard offset CTA shadows (`4px 4px 0 #1B1B1B`), subtle hover elevations, and marquee tickers that strictly honor `prefers-reduced-motion`.
4. **Mobile First**: Optimized for workers and field supervisors on 360px–390px phone screens through wrapping ribbons, scrollable pill navigation, and large tap targets.

---

## 2. Design Tokens

Defined in `web/src/styles/tokens.css`:

### Color Palette

| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--color-cream-bg` | `#FFFDF0` | Primary page background |
| `--color-cream-surface` | `#F8F6E6` | Subtle contrast containers |
| `--color-beige-card` | `#E3E1D0` | Standard card surface |
| `--color-forest` | `#04504A` | Brand dark forest accent & stats band |
| `--color-deep-forest` | `#033B36` | Top announcement banner & preview headers |
| `--color-lavender-cta` | `#E9D5FF` | Primary action button fill |
| `--color-lavender-hover`| `#DDD6FE` | Primary button hover fill |
| `--color-ink` | `#1B1B1B` | Body text, borders, and hard drop shadows |
| `--color-ember` | `#F0583A` | Live pulsing status indicator |

### Risk & Exposure Scale

| Level | Background | Text | Border | Indicator Fill |
| :--- | :--- | :--- | :--- | :--- |
| **LOW / WORK** | `#D1FAE5` | `#065F46` | `#A7F3D0` | `#10B981` |
| **MODERATE / CAUTION** | `#FEF3C7` | `#854D0E` | `#FDE68A` | `#F59E0B` |
| **HIGH / REDUCED** | `#FFEDD5` | `#9A3412` | `#FED7AA` | `#EA580C` |
| **EXTREME / REST / AVOID** | `#FEE2E2` | `#991B1B` | `#FECACA` | `#B91C1C` |

---

## 3. Typography Hierarchy

### Font Families
- **Display & Headings**: `EB Garamond` (Serif Display with key words in *italic*)
- **Body & Controls**: `Inter Variable` (Clean, legible geometric sans)
- **Telemetry & Labels**: `JetBrains Mono` (High-legibility monospace for timestamps, WBGT/AQI numbers, and kickers)

### Fluid Type Scale
- `Display`: `clamp(2.5rem, 5.5vw, 4.25rem)` (`line-height: 1.08`)
- `Heading 1`: `clamp(2rem, 4.2vw, 3.25rem)`
- `Heading 2`: `clamp(1.625rem, 3vw, 2.25rem)`
- `Body`: `clamp(0.9375rem, 1.1vw, 1.0625rem)` (`line-height: 1.55`)
- `Monospace Kicker`: `0.8125rem` (`letter-spacing: 0.12em`, uppercase)

---

## 4. Components Catalog

All components are located in `web/src/components/` and showcased live at the [`#/design`](file:///web/src/pages/Design.tsx) route:

1. **TopBanner**: Sticky announcement bar driven by `src/config/stack.ts` live flags. Displays honest deployment status.
2. **NavPill**: Floating rounded pill with active route indicator, region indicator, live clock, and transparent `demo data` tag when replaying mock fixtures.
3. **Button**:
   - `Primary`: Lavender background with 2px ink border and tactile `4px 4px 0 var(--color-ink)` hard shadow.
   - `Secondary`: Outlined rounded pill.
   - `Dark`: Forest green container button.
   - `Ghost`: Underlined inline link button.
4. **Kicker & SerifHeading**: Heading helper with markdown `*italic*` phrase parsing into `<em>`.
5. **Card**: Rounded cards in beige (`#E3E1D0`), white, and deep forest variants (`24px` border radius).
6. **StatBlock**: Large serif number paired with honest lowercase mono label and demo counter badge.
7. **RiskPill**: Pill badge rendering risk level with live color coding.
8. **HourRibbon**: 24-cell hourly strip colored by modeled WBGT and AQI risk tier. Displays rich tooltip on hover/focus and wraps responsively into two 12-hour rows on mobile.
9. **WindowList**: Time range grouping component displaying safe vs avoid windows.
10. **EvidenceChip**: Interactive tag linking phrases to underlying evidence records (modeled meteorological and air-quality data); opens accessible evidence modal dialog.
11. **Ticker**: Marquee banner with AWS architecture stack that pauses on hover and respects `prefers-reduced-motion`.
12. **FaqPanel**: Two-panel interactive widget featuring dark forest question navigation and warm beige answer details.
13. **HelpButton**: Floating `?` button triggering accessible keyboard navigation guide modal.
14. **CursorGlow**: Soft radial gradient following pointer, automatically disabled on touch devices and reduced-motion mode.
15. **Footer**: Giant editorial "Chhaya" wordmark, 4-column navigational links, and keyboard shortcut tips.

---

## 5. Keyboard Navigation & Accessibility

### Shortcuts
- `g` then `h`: Home
- `g` then `b`: Risk Board
- `g` then `a`: Analytics
- `g` then `p`: Plans
- `g` then `c`: Crews
- `g` then `u`: Audit Log
- `g` then `r`: Shift Report
- `g` then `s`: Safety Ledger
- `g` then `d`: Design System Styleguide
- `/`: Focus / Open Plan Generator
- `?`: Toggle Keyboard Shortcuts Guide
- `Esc`: Close open modal / clear shortcut buffer

### Accessibility Standards
- Semantic HTML5 landmarks (`<main>`, `<header>`, `<nav>`, `<aside>`, `<footer>`, `<dialog role="dialog">`).
- Visible focus rings (`2px solid var(--color-forest)` with `3px` offset).
- Color contrast >= 4.5:1 for normal text and >= 3:1 for large display text (WCAG 2.1 AA compliant).
