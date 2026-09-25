# Color Palette for ADH Shop

---

## Main Palette (Coffee & Origin)

| Name               | HEX       | RGB           | Suggested Use                  |
| ------------------ | --------- | ------------- | ------------------------------ |
| **Espresso Black** | `#1C1410` | 28, 20, 16    | Main text, dark backgrounds    |
| **Roasted Coffee** | `#3E2723` | 62, 39, 35    | Secondary backgrounds, headers |
| **Deep Caramel**   | `#8B5E3C` | 139, 94, 60   | Buttons, accents               |
| **Warm Latte**     | `#C9A57B` | 201, 165, 123 | Details, icons                 |
| **Soft Cream**     | `#F5EBDD` | 245, 235, 221 | Light backgrounds, cards       |

---

## Accent Palette (Luxury & Travel)

| Name                | HEX       | RGB           | Suggested Use                          |
| ------------------- | --------- | ------------- | -------------------------------------- |
| **Botanical Green** | `#2F4F3E` | 47, 79, 62    | Nature, bean origin                    |
| **Sage Green**      | `#A8B5A0` | 168, 181, 160 | Soft accents, labels                   |
| **Antique Gold**    | `#B8894A` | 184, 137, 74  | Premium, seals, luxury details         |
| **Warm Bronze**     | `#9C6B3F` | 156, 107, 63  | Borders, frames, decorative typography |
| **Deep Wine**       | `#6B2C2C` | 107, 44, 44   | Tasting notes, wines, cupping events   |

---

## Neutral Palette (Sophistication & Travel)

| Name              | HEX       | RGB           | Suggested Use                |
| ----------------- | --------- | ------------- | ---------------------------- |
| **Desert Sand**   | `#D9C7A7` | 217, 199, 167 | Editorial backgrounds        |
| **Stone Gray**    | `#8C8478` | 140, 132, 120 | Secondary text               |
| **Ivory**         | `#FAF6F0` | 250, 246, 240 | Clean backgrounds, packaging |
| **Soft Charcoal** | `#2B2B2B` | 43, 43, 43    | Modern typography            |

---

## Full Palette in Code

```
#1C1410, #3E2723, #8B5E3C, #C9A57B, #F5EBDD,
#2F4F3E, #A8B5A0, #B8894A, #9C6B3F, #6B2C2C,
#D9C7A7, #8C8478, #FAF6F0, #2B2B2B
```

---

## Applied Color Psychology

- **Warm browns** → coffee, authenticity, tradition.
- **Gold/Bronze** → accessible luxury, travel, world cultures.
- **Botanical green** → origin, sustainability, coffee farms.
- **Light neutrals** → breathing room, editorial aesthetic, "good taste."
- **Deep wine** → tasting notes, European sophistication.

---

## UI Roles

How the palette maps to what the interface needs. Components use these roles through the
design tokens in [styling.md](./styling.md), never raw hex values, so a palette change is
made in one place.

| Role                  | Color                                                | Where                                                 |
| --------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Page background       | **Ivory** `#FAF6F0`                                  | App background                                        |
| Surface               | **Soft Cream** `#F5EBDD`                             | Product cards, form sheets, the summary backdrop      |
| Text                  | **Espresso Black** `#1C1410`                         | Body text, prices, headings                           |
| Secondary text        | **Stone Gray, text shade** `#726A5E`                 | Descriptions, hints, captions (see Accessibility)     |
| Primary action        | **Deep Caramel** `#8B5E3C` with white text           | "Pay with credit card", "Pay", "Continue"             |
| Header and dark areas | **Roasted Coffee** `#3E2723` with Ivory text         | Top bar, footer                                       |
| Decorative detail     | **Warm Latte** `#C9A57B`                             | Icons and ornaments on dark areas only                |
| Premium seal          | **Antique Gold** `#B8894A` fill, Espresso text       | "Premium", "Best seller" badges                       |
| Label chip            | **Sage Green** `#A8B5A0` fill, Espresso text         | Origin, roast level, "In stock" chips                 |
| Success               | **Botanical Green** `#2F4F3E`                        | Approved payment, stock available                     |
| Error                 | **Deep Wine** `#6B2C2C`                              | Declined payment, field errors                        |
| Warning               | **Warm Bronze** `#9C6B3F`                            | Reservation about to expire (large text or with icon) |
| Borders and dividers  | **Stone Gray** `#8C8478` / **Desert Sand** `#D9C7A7` | Card outlines, separators                             |
| Focus ring            | **Deep Caramel** `#8B5E3C`, 2 px outline             | Keyboard focus on every interactive element           |

---

## Accessibility

Target: **WCAG 2.2 AA**. At least 4.5:1 for normal text, 3:1 for large text (18.66 px bold or
24 px) and for icons and control boundaries. Measured with the WCAG relative-luminance formula.

| Foreground on background                      | Ratio | Result                        |
| --------------------------------------------- | ----: | ----------------------------- |
| Espresso Black on Ivory                       | 16.86 | ✅ AA                         |
| Espresso Black on Soft Cream                  | 15.39 | ✅ AA                         |
| White on Deep Caramel (primary button)        |  5.58 | ✅ AA                         |
| Deep Caramel on Ivory (links)                 |  5.18 | ✅ AA                         |
| Deep Caramel on Soft Cream                    |  4.73 | ✅ AA                         |
| Ivory on Roasted Coffee (header)              | 12.84 | ✅ AA                         |
| Warm Latte on Roasted Coffee                  |  6.02 | ✅ AA                         |
| Botanical Green on Ivory (success)            |  8.45 | ✅ AA                         |
| Deep Wine on Ivory (error)                    |  9.65 | ✅ AA                         |
| Espresso Black on Antique Gold (seal)         |  5.80 | ✅ AA                         |
| Espresso Black on Sage Green (chip)           |  8.46 | ✅ AA                         |
| Stone Gray text shade `#726A5E` on Ivory      |  4.95 | ✅ AA                         |
| Stone Gray text shade `#726A5E` on Soft Cream |  4.52 | ✅ AA                         |
| Warm Bronze on Ivory (warning)                |  4.25 | ⚠️ Large text or with an icon |
| Stone Gray `#8C8478` on Ivory, as text        |  3.43 | ❌ Borders only, not text     |
| Antique Gold on Ivory, as text                |  2.90 | ❌ Use as a fill, not as text |
| Warm Latte on Ivory                           |  2.13 | ❌ Not on light backgrounds   |
| Sage Green on Ivory, as text                  |  1.99 | ❌ Use as a fill, not as text |

### Rules that follow from the measurements

1. **Secondary text uses `#726A5E`**, the closest shade of Stone Gray that passes on both
   light backgrounds. The original `#8C8478` stays in the palette for borders and dividers.
2. **Antique Gold and Sage Green are fills, never text colours.** Text on top of them is
   Espresso Black.
3. **Warm Latte appears on dark areas only.** On light backgrounds, icons are Espresso Black.
4. **Warning text is large, or paired with an icon.** Colour is never the only signal: every
   status also has an icon and a word.

---
