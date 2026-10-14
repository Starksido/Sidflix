# Visual reference: Netflix (studied 2026-10-14)

Reference only. Sidflix borrows **patterns and proportions**, never Netflix's text, logo, imagery, typeface, exact brand red or layouts copied pixel for pixel.

**Source.** Computed styles were measured on Netflix's public, logged-out pages (`/ke/` landing and `/ke/browse/genre/*`) at a 1050px viewport. Screenshots weren't possible. Notes on the signed-in browse UI (marked *[general]*) come from general knowledge of the product, not from measurement.

---

## 1. Colour

| Role | Measured value | Notes |
|------|----------------|-------|
| Page background | `#000` | Pure black. The signed-in UI uses a near-black (~`#141414`) *[general]* |
| Raised surface (cards, FAQ rows) | `#232323`, `#2d2d2d` | Two steps of dark grey, with no borders between surfaces |
| Input fill | `rgba(22,22,22,.7)` | Translucent, so the hero image shows through |
| Primary text | `#fff` | |
| Secondary text | `rgba(255,255,255,.7)` | Labels, body copy, footer links |
| Tertiary text | `rgba(255,255,255,.5)` | Fine print |
| Hairline border | `1px rgba(128,128,128,.7)` | Inputs only |
| Brand accent | saturated red | Used **only** for the primary CTA and sign-in button |
| Atmosphere | deep red/maroon radial and linear glows; a navy-to-plum diagonal card gradient | Decorative colour lives in gradients, not in UI chrome |

**Pattern:** a monochrome UI with one accent colour reserved for the single most important action. The colour in the experience comes from the artwork.

**Sidflix:** keep the black/grey ladder and white-alpha text steps. Pick a **distinct accent** that isn't red, and use it as sparingly.

## 2. Typography

- **Family:** one proprietary sans, falling back to `Helvetica Neue, Segoe UI, Roboto, Ubuntu, sans-serif`. Sidflix should pick its own geometric/grotesk sans. Geist, already in the scaffold, fits.
- **Measured scale (1050px):**

| Use | Size / weight / line height |
|-----|-----------------------------|
| Hero headline | 40 / 700 / 50px (1.25) |
| Section heading (row title) | 24 / 500 |
| Card or feature title | 20 / 500 |
| Body / input | 16 / 400 / 24px |
| Primary CTA label | 18 / 500 (24px at ≥1280) |
| Nav button | 14 / 500 |
| Meta / footer | 14 / 400 / 21px |
| Fine print | 13 / 400 / 19.5px |
| Rank numerals (Top 10 rows) | 80 / 700 → 100px @1280 → 120px @1920, dark fill with 4px white outline |

- Only two working weights (400, 500) plus 700 for the hero. Headings are short and never all-caps.
- Type steps up at breakpoints (550, 960, 1280px) rather than scaling fluidly.

## 3. Spacing and layout

- **Gutters:** header padding 64px, content left edge 80px at 1050px (about 7–8%). The signed-in UI uses ~4% side gutters *[general]*.
- **Hero copy block:** ~480–508px max width, left-aligned on genre pages and centred on the landing page.
- **Rhythm:** 4/8-based, with paddings of 4, 8, 12, 16, 24 and 32. Section spacing is 64px (`4rem`) from 960px up.
- **Breakpoints** (min-width): 600, 960, 1280, 1600, 1920, 2560, plus `hover: hover` and `prefers-reduced-motion` queries.

## 4. Navigation

- A transparent header over the hero, with a black-to-transparent top gradient (72–120px tall) that keeps the logo and controls legible over any image.
- Logo on the left, one or two compact actions on the right (language select, a pill or rounded button).
- *[general]* Signed-in: the header becomes solid on scroll and holds a primary text-link nav (Home, Series, Films, My List), search, notifications and a profile avatar. On mobile the nav collapses into a bottom tab bar or a menu.

## 5. Product presentation

- **Billboard hero:** full-bleed key art, roughly 80% of the viewport tall, with a title, a two-line synopsis, a primary button, and a stacked bottom fade to the page colour.
- **Rows ("shelves"):** a heading, an optional small "see all" chevron chip, then a horizontal `flex` list with `overflow-x: scroll` and `scroll-snap-type: x mandatory`. Each row holds up to ~40 items, and there are ~24 rows per page.
- **Cards:** portrait posters at **150×210 (5:7)**. The image has 12px rounded corners, with the title in 14px text underneath on public pages. *[general]* Signed-in rows use 16:9 landscape tiles that open an expanded preview card on hover.
- **Ranked row:** the card is offset to the right, and a huge outlined numeral sits behind or beside it.
- **Row paddles:** narrow (24px) full-height arrow buttons on translucent white (`rgba(255,255,255,.1)` or `rgba(128,128,128,.4)`), shown on hover devices only.
- **Feature or FAQ blocks:** dark grey full-width rows of 24px text in an accordion. Feature cards use a 16px radius with a gradient fill.

## 6. Imagery

- Imagery does the branding: a dense collage or key art behind the hero, always under a dark gradient (angled ~12° at 0.85 opacity on the landing page; a vertical 60%→100% ramp on genre pages).
- Posters are object-fit covered and clipped with rounded corners, with no border and no drop shadow.
- Glows such as radial red/maroon gradients and a curved blue-tinted horizon divider separate sections instead of hard lines.

**Sidflix:** use licensed or self-made artwork only, with the same "art under a gradient scrim" treatment. Define the scrims as reusable utilities.

## 7. Buttons and controls

| Control | Measured |
|---------|----------|
| Primary CTA (hero) | accent fill, white 18/500 text, 56px tall, `12px 24px` padding, 4px radius |
| Primary CTA (genre page) | accent fill, 40px tall, `6px 32px` padding, pill (100px radius) |
| Header button | 32px tall, `4px 16px` padding, 14/500, 4px radius or pill with white fill and black text |
| Input | 56px tall, floating label (padding `24px 16px 8px`), translucent fill, 1px grey border, 4px radius |
| Icon chip | 32×32, 16px radius |

- Primary buttons have no borders or shadows. Hierarchy comes from fill: accent, then white, then translucent grey.
- Inputs and the CTA share the same 56px height so they line up in one row.

## 8. Borders, radius and depth

- Borders are almost absent; only inputs and hairline dividers use them. Surfaces separate through tonal steps.
- Radius scale: 2px (focus targets), 4px (buttons, inputs), 8px (cards), 12–16px (posters, feature cards), full pill.
- No elevation shadows. Depth comes from gradient scrims and hover scale.

## 9. Motion and states

- Card hover: `transform: scale(1.05)`, `z-index: 2`, with a `transform .2s ease-in-out` transition.
- Focus: `outline: 2px solid #fff; outline-offset: 2px`. The focus ring is always visible on keyboard focus.
- Hover-only affordances (paddles, scaling) sit behind `@media (hover: hover)`. All motion respects `prefers-reduced-motion`.

## 10. Responsive behaviour

- Mobile first, stepping up at 600, 960, 1280, 1600, 1920 and 2560px.
- Containers and gutters widen per breakpoint, and type sizes step up at 550/960/1280.
- Rows stay horizontal scrollers at every size; the cards per view change, not the layout. Paddles are hidden on touch, where native swipe and snap take over.
- The hero sign-up form stacks (input above button) on small screens and becomes a single row at wider widths.
- The ranked numeral scales from 80 to 120px across breakpoints.

---

## Translating to Sidflix (proposed, not yet implemented)

Suggested Tailwind v4 `@theme` tokens for `src/app/globals.css` once the visual direction is approved:

- `--color-bg #000`, `--color-surface-1 #141414`, `--color-surface-2 #232323`, `--color-surface-3 #2d2d2d`
- `--color-fg #fff`, `--color-fg-muted rgb(255 255 255/.7)`, `--color-fg-subtle rgb(255 255 255/.5)`, `--color-line rgb(128 128 128/.7)`
- `--color-accent`: **Sidflix's own hue (to decide)**
- Radius: `sm 4px`, `md 8px`, `lg 12px`, `xl 16px`, `full`
- Breakpoints: `sm 600`, `md 960`, `lg 1280`, `xl 1600`, `2xl 1920`, `3xl 2560`
- Poster aspect `5/7`, tile aspect `16/9`, hover scale `1.05`, transition `200ms ease-in-out`
