# Supervisor AI — Logo (Final, Locked)

**Phase 1, Part 1 — Complete**

The final mark. This document supersedes all previous logo drafts and is the source of truth for how the Supervisor AI logo is constructed, used, sized, and reproduced. Everything that follows in the design system (color, typography, components) references this foundation.

---

## The Mark

The primary horizontal lockup. This is the default — use this everywhere a horizontal logo is needed.

<svg viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg" style="background: #FAFBFC; border-radius: 16px;">
  <g transform="translate(80, 55)">
    <!-- Symbol -->
    <rect x="0" y="0" width="100" height="28" rx="14" fill="#2D6FF7"/>
    <rect x="0" y="62" width="100" height="28" rx="14" fill="#2D6FF7" opacity="0.55"/>
    <circle cx="38" cy="45" r="13" fill="#2D6FF7"/>
    <!-- Wordmark -->
    <g transform="translate(140, 65)">
      <text x="0" y="0" font-family="-apple-system, 'SF Pro Display', 'Inter', sans-serif" font-size="44" font-weight="700" fill="#0F1A2E" letter-spacing="-2">Supervisor<tspan fill="#2D6FF7">.</tspan></text>
    </g>
  </g>
</svg>

### Construction notes

- **Symbol grid:** Built on a 100×90 unit grid. Top bar `100×28 rx 14`. Bottom bar `100×28 rx 14` at `y=62` with 55% opacity. Focal dot `r=13` at `(38, 45)` — sits at ~38% from the left edge, giving the dynamic asymmetry without losing balance.
- **Pill bars:** Corner radius equals half the bar height (14 = 28/2). These are *true pills*, not just rounded rectangles. This is what makes them feel soft and friendly.
- **Wordmark typeface:** Geometric sans-serif. Production logo should be set in **SF Pro Display** or **Inter** at 700 weight, tracked at -2 letter-spacing, then converted to outlined paths.
- **The period dot:** A single colored period (`.`) after "Supervisor," set in the same brand blue `#2D6FF7`. It's small, integrated into the wordmark, and acts as the visual stand-in for "AI."
- **Color:** Pure `#2D6FF7` for solid elements. The bottom bar uses the same color at 55% opacity (not a separate lighter color) so the relationship holds across any background.
- **Spacing between symbol and wordmark:** 40 units (40% of the symbol's width).

---

## All Lockups

### 1. Horizontal — Primary

Use as default. App headers, marketing site, email signatures, business cards, login screens.

<svg viewBox="0 0 700 180" xmlns="http://www.w3.org/2000/svg" style="background: #FAFBFC; border-radius: 16px;">
  <g transform="translate(80, 45)">
    <rect x="0" y="0" width="100" height="28" rx="14" fill="#2D6FF7"/>
    <rect x="0" y="62" width="100" height="28" rx="14" fill="#2D6FF7" opacity="0.55"/>
    <circle cx="38" cy="45" r="13" fill="#2D6FF7"/>
    <g transform="translate(140, 65)">
      <text x="0" y="0" font-family="-apple-system, 'SF Pro Display', 'Inter', sans-serif" font-size="44" font-weight="700" fill="#0F1A2E" letter-spacing="-2">Supervisor<tspan fill="#2D6FF7">.</tspan></text>
    </g>
  </g>
</svg>

### 2. Stacked — Vertical lockup

Use when horizontal space is tight or when the logo needs to feel more centered (login screens, splash screens, the center of a card).

<svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg" style="background: #FAFBFC; border-radius: 16px;">
  <g transform="translate(150, 50)">
    <rect x="0" y="0" width="100" height="28" rx="14" fill="#2D6FF7"/>
    <rect x="0" y="62" width="100" height="28" rx="14" fill="#2D6FF7" opacity="0.55"/>
    <circle cx="38" cy="45" r="13" fill="#2D6FF7"/>
  </g>
  <g transform="translate(200, 225)" text-anchor="middle">
    <text x="0" y="0" font-family="-apple-system, 'SF Pro Display', 'Inter', sans-serif" font-size="34" font-weight="700" fill="#0F1A2E" letter-spacing="-1.5">Supervisor<tspan fill="#2D6FF7">.</tspan></text>
  </g>
</svg>

### 3. Symbol-only — Standalone mark

Use for app icons, favicons, social media avatars, watermarks, anywhere the wordmark would be too small to read or has already been established in context.

<svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" style="background: #FAFBFC; border-radius: 16px;">
  <g transform="translate(60, 55)">
    <rect x="0" y="0" width="100" height="28" rx="14" fill="#2D6FF7"/>
    <rect x="0" y="62" width="100" height="28" rx="14" fill="#2D6FF7" opacity="0.55"/>
    <circle cx="38" cy="45" r="13" fill="#2D6FF7"/>
  </g>
</svg>

### 4. App-icon tile — Symbol inside a container

For app stores, iOS/Android home screens, OS docks. The tile gives the mark its required container presence on mobile platforms.

<svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg">
  <!-- Light variant -->
  <g transform="translate(40, 30)">
    <rect x="0" y="0" width="160" height="160" rx="36" fill="#FFFFFF" stroke="#E5E9F0" stroke-width="1.5"/>
    <g transform="translate(30, 35)">
      <rect x="0" y="0" width="100" height="28" rx="14" fill="#2D6FF7"/>
      <rect x="0" y="62" width="100" height="28" rx="14" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="38" cy="45" r="13" fill="#2D6FF7"/>
    </g>
  </g>
  <!-- Brand blue variant -->
  <g transform="translate(220, 30)">
    <rect x="0" y="0" width="160" height="160" rx="36" fill="#2D6FF7"/>
    <g transform="translate(30, 35)">
      <rect x="0" y="0" width="100" height="28" rx="14" fill="#FFFFFF"/>
      <rect x="0" y="62" width="100" height="28" rx="14" fill="#FFFFFF" opacity="0.55"/>
      <circle cx="38" cy="45" r="13" fill="#FFFFFF"/>
    </g>
  </g>
  <!-- Dark variant -->
  <g transform="translate(400, 30)">
    <rect x="0" y="0" width="160" height="160" rx="36" fill="#0F1A2E"/>
    <g transform="translate(30, 35)">
      <rect x="0" y="0" width="100" height="28" rx="14" fill="#5B8DF9"/>
      <rect x="0" y="62" width="100" height="28" rx="14" fill="#5B8DF9" opacity="0.55"/>
      <circle cx="38" cy="45" r="13" fill="#5B8DF9"/>
    </g>
  </g>
  <text x="120" y="210" font-family="-apple-system, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Light</text>
  <text x="300" y="210" font-family="-apple-system, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Brand</text>
  <text x="480" y="210" font-family="-apple-system, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Dark</text>
</svg>

---

## Color Variants

The logo must work in three contexts. These are the only sanctioned color treatments.

<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg">
  <!-- On light background -->
  <g transform="translate(0, 0)">
    <rect x="20" y="20" width="240" height="200" rx="16" fill="#FAFBFC" stroke="#E5E9F0" stroke-width="1"/>
    <g transform="translate(70, 80)">
      <rect x="0" y="0" width="60" height="17" rx="8.5" fill="#2D6FF7"/>
      <rect x="0" y="38" width="60" height="17" rx="8.5" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="23" cy="27" r="8" fill="#2D6FF7"/>
    </g>
    <g transform="translate(150, 117)">
      <text x="0" y="0" font-family="-apple-system, sans-serif" font-size="22" font-weight="700" fill="#0F1A2E" letter-spacing="-1">Supervisor<tspan fill="#2D6FF7">.</tspan></text>
    </g>
    <text x="140" y="245" font-family="-apple-system, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Primary · On Light</text>
  </g>

  <!-- On dark background -->
  <g transform="translate(270, 0)">
    <rect x="20" y="20" width="240" height="200" rx="16" fill="#0F1A2E"/>
    <g transform="translate(70, 80)">
      <rect x="0" y="0" width="60" height="17" rx="8.5" fill="#5B8DF9"/>
      <rect x="0" y="38" width="60" height="17" rx="8.5" fill="#5B8DF9" opacity="0.55"/>
      <circle cx="23" cy="27" r="8" fill="#5B8DF9"/>
    </g>
    <g transform="translate(150, 117)">
      <text x="0" y="0" font-family="-apple-system, sans-serif" font-size="22" font-weight="700" fill="#FFFFFF" letter-spacing="-1">Supervisor<tspan fill="#5B8DF9">.</tspan></text>
    </g>
    <text x="140" y="245" font-family="-apple-system, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Dark Mode · Lighter Blue</text>
  </g>

  <!-- Monochrome (single color) -->
  <g transform="translate(540, 0)">
    <rect x="20" y="20" width="240" height="200" rx="16" fill="#FAFBFC" stroke="#E5E9F0" stroke-width="1"/>
    <g transform="translate(70, 80)">
      <rect x="0" y="0" width="60" height="17" rx="8.5" fill="#0F1A2E"/>
      <rect x="0" y="38" width="60" height="17" rx="8.5" fill="#0F1A2E" opacity="0.55"/>
      <circle cx="23" cy="27" r="8" fill="#0F1A2E"/>
    </g>
    <g transform="translate(150, 117)">
      <text x="0" y="0" font-family="-apple-system, sans-serif" font-size="22" font-weight="700" fill="#0F1A2E" letter-spacing="-1">Supervisor<tspan fill="#0F1A2E">.</tspan></text>
    </g>
    <text x="140" y="245" font-family="-apple-system, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Monochrome · One-Color Print</text>
  </g>
</svg>

| Variant | When to use | Logo colors |
|---|---|---|
| **Primary / On Light** | Default. Light backgrounds, white space, app light mode | Bars + dot + period: `#2D6FF7` blue. Wordmark "Supervisor": `#0F1A2E` deep navy. |
| **Dark Mode** | Dark app surfaces, dark marketing sections | Bars + dot + period: `#5B8DF9` lighter blue (AA on dark). Wordmark "Supervisor": `#FFFFFF`. |
| **Monochrome** | Single-color print, embroidery, watermarks, legal/footer use | All elements in `#0F1A2E` or pure black. The period is no longer visually distinct in this variant — that's intentional, monochrome is for utility use only. |

Never use the logo in any color other than these three variants. No gradients, no rainbow, no "themed for the holidays" versions.

---

## Clear Space

The logo needs breathing room. No other element (text, image, edge of container) should encroach on its protected zone.

**The rule:** The clear space on all four sides equals the **height of the focal dot** (`x = symbol height ÷ ~3.5`). This unit scales with the logo — bigger logo = more clear space.

<svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg" style="background: #FAFBFC; border-radius: 16px;">
  <rect x="50" y="50" width="600" height="180" fill="none" stroke="#FF6B6B" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6"/>
  <rect x="80" y="80" width="540" height="120" fill="none" stroke="#2D6FF7" stroke-width="1" stroke-dasharray="3 3" opacity="0.3"/>
  <g transform="translate(120, 95)">
    <rect x="0" y="0" width="80" height="22" rx="11" fill="#2D6FF7"/>
    <rect x="0" y="48" width="80" height="22" rx="11" fill="#2D6FF7" opacity="0.55"/>
    <circle cx="30" cy="35" r="10" fill="#2D6FF7"/>
    <g transform="translate(115, 45)">
      <text x="0" y="0" font-family="-apple-system, sans-serif" font-size="32" font-weight="700" fill="#0F1A2E" letter-spacing="-1.5">Supervisor<tspan fill="#2D6FF7">.</tspan></text>
    </g>
  </g>
  <g font-family="-apple-system, sans-serif" font-size="11" fill="#FF6B6B" font-weight="600">
    <text x="65" y="140" text-anchor="middle">x</text>
    <text x="635" y="140" text-anchor="middle">x</text>
    <text x="350" y="68" text-anchor="middle">x</text>
    <text x="350" y="220" text-anchor="middle">x</text>
  </g>
  <text x="350" y="255" font-family="-apple-system, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Clear space = height of the focal dot, on all four sides</text>
</svg>

---

## Minimum Sizes

| Lockup | Minimum width (digital) | Minimum width (print) | Notes |
|---|---|---|---|
| **Horizontal** | 130 px | 28 mm | Below this, the period dot becomes invisible |
| **Stacked** | 90 px | 20 mm | Slightly smaller floor — better for compact spaces |
| **Symbol only** | 24 px | 8 mm | Pure symbol; works down to favicon size |
| **Favicon (16×16)** | — | — | Use a simplified single-bar + dot version (see below) |

### Tiny-size adaptation

At 16×16 pixels (browser favicon, mobile notification icon), the three-element symbol becomes muddy. Use this simplified mark instead:

<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(40, 60)">
    <rect x="0" y="0" width="64" height="20" rx="10" fill="#2D6FF7"/>
    <rect x="0" y="44" width="64" height="20" rx="10" fill="#2D6FF7" opacity="0.55"/>
    <circle cx="24" cy="32" r="9" fill="#2D6FF7"/>
  </g>
  <text x="72" y="160" font-family="-apple-system, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Standard symbol (24px+)</text>

  <g transform="translate(200, 75)">
    <rect x="0" y="0" width="48" height="16" rx="8" fill="#2D6FF7"/>
    <circle cx="18" cy="32" r="8" fill="#2D6FF7"/>
  </g>
  <text x="220" y="160" font-family="-apple-system, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Simplified (16px favicon)</text>

  <g transform="translate(330, 90)">
    <rect x="0" y="0" width="16" height="5" rx="2.5" fill="#2D6FF7"/>
    <circle cx="6" cy="11" r="3" fill="#2D6FF7"/>
  </g>
  <text x="338" y="160" font-family="-apple-system, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Actual 16px size</text>
</svg>

---

## Backgrounds

**Approved:**
- White (`#FFFFFF`)
- Off-white (`#FAFBFC`, the app's light background)
- Deep navy (`#0F1A2E`, the app's dark background) — use the Dark Mode variant
- Solid brand blue (`#2D6FF7`) — use the white/inverted variant from the app-icon tile
- Other solid neutrals with sufficient contrast (AA against the chosen logo variant)

**Not approved:**
- Busy photographs
- Gradients that contain blue (the logo gets lost)
- Patterns or textures behind the mark
- Any background that breaks AA contrast against the chosen variant

---

## Do's and Don'ts

<svg viewBox="0 0 800 580" xmlns="http://www.w3.org/2000/svg">
  <!-- Row 1: Don't stretch -->
  <g transform="translate(20, 20)">
    <rect x="0" y="0" width="180" height="120" rx="12" fill="#FAFBFC" stroke="#E5E9F0"/>
    <g transform="translate(35, 30) scale(1.6, 0.7)">
      <rect x="0" y="0" width="60" height="16" rx="8" fill="#2D6FF7"/>
      <rect x="0" y="40" width="60" height="16" rx="8" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="22" cy="28" r="7" fill="#2D6FF7"/>
    </g>
    <text x="90" y="155" font-family="-apple-system, sans-serif" font-size="11" fill="#D14343" text-anchor="middle" font-weight="600">✕ Don't stretch or distort</text>
  </g>

  <!-- Row 1: Don't recolor -->
  <g transform="translate(220, 20)">
    <rect x="0" y="0" width="180" height="120" rx="12" fill="#FAFBFC" stroke="#E5E9F0"/>
    <g transform="translate(50, 35)">
      <rect x="0" y="0" width="60" height="17" rx="8.5" fill="#FF6B6B"/>
      <rect x="0" y="38" width="60" height="17" rx="8.5" fill="#FFD166"/>
      <circle cx="23" cy="27" r="8" fill="#26C281"/>
    </g>
    <text x="90" y="155" font-family="-apple-system, sans-serif" font-size="11" fill="#D14343" text-anchor="middle" font-weight="600">✕ Don't recolor parts</text>
  </g>

  <!-- Row 1: Don't rotate -->
  <g transform="translate(420, 20)">
    <rect x="0" y="0" width="180" height="120" rx="12" fill="#FAFBFC" stroke="#E5E9F0"/>
    <g transform="translate(90, 60) rotate(20) translate(-30, -27)">
      <rect x="0" y="0" width="60" height="17" rx="8.5" fill="#2D6FF7"/>
      <rect x="0" y="38" width="60" height="17" rx="8.5" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="23" cy="27" r="8" fill="#2D6FF7"/>
    </g>
    <text x="90" y="155" font-family="-apple-system, sans-serif" font-size="11" fill="#D14343" text-anchor="middle" font-weight="600">✕ Don't rotate or tilt</text>
  </g>

  <!-- Row 1: Don't drop the period -->
  <g transform="translate(620, 20)">
    <rect x="0" y="0" width="180" height="120" rx="12" fill="#FAFBFC" stroke="#E5E9F0"/>
    <g transform="translate(20, 35)">
      <rect x="0" y="0" width="40" height="12" rx="6" fill="#2D6FF7"/>
      <rect x="0" y="27" width="40" height="12" rx="6" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="15" cy="19" r="6" fill="#2D6FF7"/>
    </g>
    <g transform="translate(70, 55)">
      <text x="0" y="0" font-family="-apple-system, sans-serif" font-size="16" font-weight="700" fill="#0F1A2E" letter-spacing="-0.5">Supervisor AI</text>
    </g>
    <text x="90" y="155" font-family="-apple-system, sans-serif" font-size="11" fill="#D14343" text-anchor="middle" font-weight="600">✕ Don't spell out "AI" in the logo</text>
  </g>

  <!-- Row 2: Don't outline -->
  <g transform="translate(20, 170)">
    <rect x="0" y="0" width="180" height="120" rx="12" fill="#FAFBFC" stroke="#E5E9F0"/>
    <g transform="translate(50, 35)">
      <rect x="0" y="0" width="60" height="17" rx="8.5" fill="none" stroke="#2D6FF7" stroke-width="2"/>
      <rect x="0" y="38" width="60" height="17" rx="8.5" fill="none" stroke="#2D6FF7" stroke-width="2" opacity="0.55"/>
      <circle cx="23" cy="27" r="8" fill="none" stroke="#2D6FF7" stroke-width="2"/>
    </g>
    <text x="90" y="155" font-family="-apple-system, sans-serif" font-size="11" fill="#D14343" text-anchor="middle" font-weight="600">✕ Don't outline only</text>
  </g>

  <!-- Row 2: Don't change proportions -->
  <g transform="translate(220, 170)">
    <rect x="0" y="0" width="180" height="120" rx="12" fill="#FAFBFC" stroke="#E5E9F0"/>
    <g transform="translate(50, 30)">
      <rect x="0" y="0" width="60" height="30" rx="15" fill="#2D6FF7"/>
      <rect x="0" y="40" width="60" height="8" rx="4" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="23" cy="27" r="5" fill="#2D6FF7"/>
    </g>
    <text x="90" y="155" font-family="-apple-system, sans-serif" font-size="11" fill="#D14343" text-anchor="middle" font-weight="600">✕ Don't change proportions</text>
  </g>

  <!-- Row 2: Don't crowd it -->
  <g transform="translate(420, 170)">
    <rect x="0" y="0" width="180" height="120" rx="12" fill="#FAFBFC" stroke="#E5E9F0"/>
    <text x="10" y="50" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#0F1A2E">Welcome</text>
    <g transform="translate(50, 60)">
      <rect x="0" y="0" width="60" height="17" rx="8.5" fill="#2D6FF7"/>
      <rect x="0" y="38" width="60" height="17" rx="8.5" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="23" cy="27" r="8" fill="#2D6FF7"/>
    </g>
    <text x="125" y="98" font-family="-apple-system, sans-serif" font-size="11" fill="#0F1A2E">→ go</text>
    <text x="90" y="155" font-family="-apple-system, sans-serif" font-size="11" fill="#D14343" text-anchor="middle" font-weight="600">✕ Don't crowd it</text>
  </g>

  <!-- Row 2: Don't change font -->
  <g transform="translate(620, 170)">
    <rect x="0" y="0" width="180" height="120" rx="12" fill="#FAFBFC" stroke="#E5E9F0"/>
    <g transform="translate(20, 35)">
      <rect x="0" y="0" width="40" height="12" rx="6" fill="#2D6FF7"/>
      <rect x="0" y="27" width="40" height="12" rx="6" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="15" cy="19" r="6" fill="#2D6FF7"/>
    </g>
    <g transform="translate(70, 55)">
      <text x="0" y="0" font-family="Georgia, serif" font-style="italic" font-size="16" font-weight="700" fill="#0F1A2E">Supervisor<tspan fill="#2D6FF7">.</tspan></text>
    </g>
    <text x="90" y="155" font-family="-apple-system, sans-serif" font-size="11" fill="#D14343" text-anchor="middle" font-weight="600">✕ Don't change the typeface</text>
  </g>

  <!-- Row 3 DO: -->
  <g transform="translate(20, 320)">
    <rect x="0" y="0" width="380" height="120" rx="12" fill="#FAFBFC" stroke="#26C281" stroke-width="2"/>
    <g transform="translate(50, 35)">
      <rect x="0" y="0" width="60" height="17" rx="8.5" fill="#2D6FF7"/>
      <rect x="0" y="38" width="60" height="17" rx="8.5" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="23" cy="27" r="8" fill="#2D6FF7"/>
    </g>
    <g transform="translate(140, 65)">
      <text x="0" y="0" font-family="-apple-system, sans-serif" font-size="22" font-weight="700" fill="#0F1A2E" letter-spacing="-1">Supervisor<tspan fill="#2D6FF7">.</tspan></text>
    </g>
    <text x="190" y="155" font-family="-apple-system, sans-serif" font-size="11" fill="#26C281" text-anchor="middle" font-weight="600">✓ Do use the approved lockups, unmodified</text>
  </g>

  <g transform="translate(420, 320)">
    <rect x="0" y="0" width="380" height="120" rx="12" fill="#FAFBFC" stroke="#26C281" stroke-width="2"/>
    <g transform="translate(140, 35)">
      <rect x="0" y="0" width="60" height="17" rx="8.5" fill="#2D6FF7"/>
      <rect x="0" y="38" width="60" height="17" rx="8.5" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="23" cy="27" r="8" fill="#2D6FF7"/>
    </g>
    <text x="190" y="155" font-family="-apple-system, sans-serif" font-size="11" fill="#26C281" text-anchor="middle" font-weight="600">✓ Do give it room to breathe</text>
  </g>

  <!-- Row 4 DOs -->
  <g transform="translate(20, 470)">
    <rect x="0" y="0" width="380" height="100" rx="12" fill="#0F1A2E"/>
    <g transform="translate(80, 30)">
      <rect x="0" y="0" width="60" height="17" rx="8.5" fill="#5B8DF9"/>
      <rect x="0" y="38" width="60" height="17" rx="8.5" fill="#5B8DF9" opacity="0.55"/>
      <circle cx="23" cy="27" r="8" fill="#5B8DF9"/>
    </g>
    <g transform="translate(170, 60)">
      <text x="0" y="0" font-family="-apple-system, sans-serif" font-size="22" font-weight="700" fill="#FFFFFF" letter-spacing="-1">Supervisor<tspan fill="#5B8DF9">.</tspan></text>
    </g>
  </g>
  <text x="210" y="595" font-family="-apple-system, sans-serif" font-size="11" fill="#26C281" text-anchor="middle" font-weight="600">✓ Do use the dark mode variant on dark surfaces</text>

  <g transform="translate(420, 470)">
    <rect x="0" y="0" width="380" height="100" rx="12" fill="#FAFBFC" stroke="#26C281" stroke-width="2"/>
    <g transform="translate(40, 38)">
      <rect x="0" y="0" width="40" height="11" rx="5.5" fill="#2D6FF7"/>
      <rect x="0" y="25" width="40" height="11" rx="5.5" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="15" cy="18" r="5" fill="#2D6FF7"/>
    </g>
    <g transform="translate(110, 40)">
      <rect x="0" y="0" width="60" height="16" rx="8" fill="#2D6FF7"/>
      <rect x="0" y="36" width="60" height="16" rx="8" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="23" cy="26" r="7" fill="#2D6FF7"/>
    </g>
    <g transform="translate(210, 24)">
      <rect x="0" y="0" width="90" height="22" rx="11" fill="#2D6FF7"/>
      <rect x="0" y="50" width="90" height="22" rx="11" fill="#2D6FF7" opacity="0.55"/>
      <circle cx="35" cy="36" r="10" fill="#2D6FF7"/>
    </g>
  </g>
  <text x="610" y="595" font-family="-apple-system, sans-serif" font-size="11" fill="#26C281" text-anchor="middle" font-weight="600">✓ Do scale proportionally</text>
</svg>

---

## Color tokens (preview)

These are the colors locked in by the logo decision. They will be expanded into the full color system in Phase 1 Part 2, but locking them now ensures consistency.

| Token | Hex | Use in logo |
|---|---|---|
| `brand.blue.500` | `#2D6FF7` | Symbol bars + dot, period mark in light mode |
| `brand.blue.400` | `#5B8DF9` | Symbol on dark mode, period mark on dark |
| `brand.navy.900` | `#0F1A2E` | "Supervisor" wordmark, dark mode background, monochrome variant |
| `brand.white` | `#FFFFFF` | Inverted symbol on brand-blue tile, dark-mode wordmark "Supervisor" |
| `surface.canvas.light` | `#FAFBFC` | Off-white background for documentation and light app |

---

## Typography (preview)

The logo wordmark is set in **Geometric Sans-Serif** (SF Pro Display / Inter family). In the production logo file, the wordmark is **set in the licensed typeface and converted to outlines** so it never depends on font availability.

For now, treat the wordmark as a sealed asset: it's an SVG file with paths, not live text. The full type system gets defined in Phase 1 Part 3 — and whether the UI uses the same Geometric Sans family or a different body font is a decision we'll make then.

---

## File deliverables (for your developers)

When this design system is built out, the logo should be shipped as:

- `logo-horizontal.svg` — primary horizontal lockup, outlined paths
- `logo-stacked.svg` — vertical lockup, outlined paths
- `logo-symbol.svg` — symbol only, 24px and up
- `logo-symbol-tiny.svg` — simplified 16px favicon version
- `logo-horizontal-dark.svg` — dark mode variant
- `logo-symbol-dark.svg` — dark mode symbol
- `app-icon-light.svg`, `app-icon-brand.svg`, `app-icon-dark.svg` — app-icon tiles
- `favicon.ico` — 16/32/48 sizes baked in
- `logo-monochrome.svg` — single-color print variant

All SVGs should use outlined paths (no live text) so the logo never breaks when a system lacks the wordmark font.

---

## ✅ Phase 1, Part 1 — Complete

The logo is locked. Final summary:

- **Symbol:** Pill-shaped horizontal bars with an off-center focal dot, monochromatic blue (`#2D6FF7`)
- **Wordmark:** "Supervisor" in Geometric Sans Bold, ending with a blue period as the visual stand-in for "AI"
- **Layout:** Single-line horizontal lockup as primary, with stacked, symbol-only, and tile variants
- **Color variants:** Light, Dark, Monochrome only
- **Typography note:** Geometric Sans (SF Pro / Inter), -2 letter-spacing, weight 700, outlined to paths

Next: **Phase 1, Part 2 — Color System.** I'll build the full expressive palette (primary blue family, supporting expressive colors for the Monday-loud direction, semantic colors, neutrals, dark mode equivalents, glass/translucent surface tokens) and explain how each color earns its place in the UI.

Ready to move on, or anything to revise on the logo first?
