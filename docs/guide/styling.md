# Styling

## Direction

A specialty-coffee storefront (the catalogue is espresso machines, grinders, kettles and
beans): calm, premium and legible. Generous whitespace, large product photography,
restrained typography, warm coffee tones. Mobile first.

The colours are defined in the **[ADH Shop palette](./palette.md)** ("Coffee & Origin"),
together with the UI role of each colour and its measured contrast.

## Design tokens

Components never use a hex value. They use these custom properties, defined once in
`src/shared/styles/tokens.css`, which point at the palette.

```css
:root {
  /* Surfaces */
  --color-background: #faf6f0; /* Ivory */
  --color-surface: #f5ebdd; /* Soft Cream */
  --color-surface-strong: #3e2723; /* Roasted Coffee */

  /* Text */
  --color-text: #1c1410; /* Espresso Black */
  --color-text-muted: #726a5e; /* Stone Gray, text shade: passes AA */
  --color-text-on-strong: #faf6f0; /* Ivory on Roasted Coffee */

  /* Actions */
  --color-accent: #8b5e3c; /* Deep Caramel */
  --color-on-accent: #ffffff;
  --color-focus: #8b5e3c;

  /* Status */
  --color-success: #2f4f3e; /* Botanical Green */
  --color-danger: #6b2c2c; /* Deep Wine */
  --color-warning: #9c6b3f; /* Warm Bronze: large text or with an icon */

  /* Details */
  --color-premium: #b8894a; /* Antique Gold: fill only */
  --color-chip: #a8b5a0; /* Sage Green: fill only */
  --color-ornament: #c9a57b; /* Warm Latte: dark areas only */
  --color-border: #d9c7a7; /* Desert Sand */
  --color-border-strong: #8c8478; /* Stone Gray */
}
```

Spacing, radius, typography, shadow and motion follow the same pattern in the same file, and
are defined in step 1 of the [roadmap](./roadmap.md).

## Approach

- **CSS Modules** per component, plus two global files: `tokens.css` and `reset.css`.
- **Design tokens as CSS custom properties**: colour, spacing scale, radius, typography,
  shadow, motion. Components use tokens, never raw values, so the whole look changes in one
  file.
- **Layout with flexbox and grid**, as the brief encourages. No CSS framework.
- **Behaviour from Radix UI Primitives, looks from us.** Dialog and Toast
  come from Radix Primitives, which ship with no styles at all: they bring focus trapping,
  keyboard support and ARIA, and every pixel is our own CSS on our tokens. Radix Themes is not
  used. The summary backdrop has no Radix equivalent and is built from scratch.
- Radix is wrapped once in `shared/ui/`; features never import it directly.
- **Mobile first**: base styles target the smallest phone; `min-width` media queries add
  space and columns as the viewport grows.

## Viewport rules

| Rule                                                               | Why                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Designed at 375 px wide, verified down to **320 px**               | The brief's minimum reference is the iPhone SE (2020, 750 × 1334 physical, 375 × 667 CSS pixels) |
| No horizontal scroll at any width                                  | "Must fit into UI boundaries"                                                                    |
| Touch targets at least 44 × 44 px                                  | Thumb-sized controls on the payment form                                                         |
| Inputs at 16 px or larger                                          | iOS Safari zooms the page on focus below 16 px                                                   |
| `100dvh` with safe-area insets                                     | The backdrop and modal must not hide under the browser chrome or the notch                       |
| Breakpoints: 600 px (large phone / small tablet), 960 px (desktop) | Two are enough for a five-screen flow                                                            |

## Components that carry the design

| Component                     | Notes                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Modal** (card and delivery) | Full-screen sheet on phones, centred dialog on desktop; focus trapped; closes on Escape and returns focus        |
| **Backdrop** (summary)        | Material backdrop pattern: the front layer slides up over the product, which stays visible behind it             |
| **Card field**                | Groups digits as typed; the brand logo fades in from the BIN; the error appears under the field, not in an alert |
| **Money**                     | Formats integer cents with `Intl.NumberFormat('es-CO', { currency: 'COP' })`, only at render time                |

## Layout of the store

- **Header**: a slim announcement bar, then the sticky brand bar with search, favourites and
  account. From 960 px a second row lists the categories; on phones the catalogue's own
  scrolling row of chips does that job and the header stays short. Favourites and the
  account are outside this exercise: they answer with a "coming soon" notice instead of
  doing nothing.
- **Catalogue grid**: two columns on a phone, as shoppers expect, and as many columns of at
  least 14rem as fit from 600 px.
- **Every page grid is `minmax(0, 1fr)`**, never the implicit `auto` column: an auto column
  grows to its widest child, such as the scrolling row of chips, and pushes the page sideways
  on a phone. A `fieldset` also needs `min-inline-size: 0` for the same reason.

## Icons

- **lucide-react** for interface icons: one line weight, sized with a `--icon-size` token,
  coloured with `currentColor` so an icon always matches its text.
- Decorative icons are `aria-hidden`; an icon that carries meaning on its own has an
  accessible label.
- **Card brands** use their official acceptance marks (VISA, Mastercard) as local SVG files
  in `shared/ui/PaymentMethods`, shown at the size and clear space the brands require. Lucide
  deliberately ships no brand logos.
- Every status also shows an icon next to its colour (check, cross, clock), so meaning never
  depends on colour alone.

## Images

The brief awards points for images that render fast and never break the layout.

- Every `<img>` has explicit `width` and `height` (or `aspect-ratio`), so nothing shifts as it
  loads.
- Below-the-fold images use `loading="lazy"` and `decoding="async"`; the product hero is
  eager, with `fetchpriority="high"`.
- Product images are WebP from the CDN, through signed URLs that stay stable for an hour, so
  the browser cache works.
- A neutral placeholder keeps the space while an image loads, or if it fails.

## Accessibility

- Semantic HTML first: `button` for actions, `a` for navigation, `label` for every input.
- Visible focus styles; colour contrast at WCAG AA or better.
- Form errors linked with `aria-describedby`; the payment status announced with
  `aria-live="polite"`.
- Motion reduced under `prefers-reduced-motion`.
