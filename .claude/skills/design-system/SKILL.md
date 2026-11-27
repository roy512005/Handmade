---
name: design-system
description: Brand identity, colour tokens, typography and UI rules for the handmade marketplace. Use when building or styling any UI component or page.
---

# Design System

Personality: premium, warm, authentic, creative, minimal, trustworthy, artisan-focused. Never a generic marketplace template.

## Colour tokens
| Token | Hex | Use |
|---|---|---|
| ivory | #FAF8F3 | Page background |
| white | #FFFFFF | Cards, content, product cards |
| forest | #234B3B | Primary brand, primary buttons |
| terracotta | #C46A48 | Accent, promo highlights |
| charcoal | #292B28 | Primary text |
| muted | #77776F | Secondary text |
| sand | #E9E1D4 | Secondary surfaces |
| sage | #DCE7DC | Positive states |
| border | #E8E3DA | Dividers, borders |
| error | #C74640 | Errors, destructive |

Rules: forest stays dominant; terracotta only for promos/highlights; don't use every colour everywhere. Primary button = forest + white text; secondary = white + forest border. Subtle sections use sand or sage.

Define as CSS variables / Tailwind theme tokens; never hardcode hex in components.

## Typography
- Headings: DM Serif Display (editorial)
- Body, buttons, labels: Inter

## UI principles
- Generous whitespace, large product photography
- Radius 10–16px, thin neutral borders, subtle shadows
- Smooth transitions, consistent spacing scale
- Responsive: desktop, tablet, mobile; accessible contrast and focus states
- Mobile header compact with search + accessible menu

## Checklist
- [ ] Uses tokens only
- [ ] Contrast AA on text
- [ ] Works at 360px width
- [ ] Empty, loading and error states designed
