# Typography and contrast

The landing page and OCR workspace share the reading scale and text colors in [tokens.css](../tokens.css). Font sizes use rem units so they respond to browser text preferences.

## Reading hierarchy

| Role | Size at the default browser setting | Treatment |
| --- | --- | --- |
| Hero heading | 36–67 px, depending on viewport | Manrope 800, compact tracking |
| Section heading | 32–42 px | Manrope 800 |
| Card and workspace heading | 20–28 px | Manrope 700–800 |
| Main copy | 16–18 px | Manrope, line height 1.65–1.75 |
| Supporting copy and controls | 14–15 px | Manrope, clear line spacing |
| Metadata and code labels | 12–13 px minimum | IBM Plex Mono or Manrope |

The audit originally found labels as small as 7 px on mobile. The tested interfaces now have no visible text smaller than 12 px at the default browser setting. The 12 px floor is a project design choice.

Body text, supporting copy, and metadata use deep navy on light surfaces. Copy on dark surfaces is white. Blue accents and the colored local-mode badge remain distinct; reading hierarchy comes from size, weight, and spacing.

Mobile document choices use rows so filenames remain legible. Captions sit below the document preview, long filenames wrap, and buttons can grow with their labels. The hero preview is kept upright to preserve text sharpness.

## Text color pairs

Ratios below are calculated from the CSS foreground and background colors using relative luminance.

| Use | Foreground | Background | Contrast |
| --- | --- | --- | ---: |
| Headings | #14263B | #FFFFFF | 15.33:1 |
| Body text | #14263B | #FFFFFF | 15.33:1 |
| Supporting text and metadata | #14263B | #FFFFFF | 15.33:1 |
| Primary button | #FFFFFF | #315CF5 | 5.28:1 |
| Primary button hover | #FFFFFF | #2348D8 | 7.02:1 |
| Body text on a soft surface | #14263B | #F5F7FB | 14.29:1 |
| Disabled button label | #14263B | #E5EBF4 | 12.79:1 |

The contrast target for normal text is at least 4.5:1, with 3:1 allowed for large text under [W3C Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Disabled controls retain opaque, readable labels. Focus rings use solid colors instead of faint transparent outlines.

## Browser verification

- Landing page and overview: 320, 390, 768, and 1440 px wide.
- Local workspace, consent dialog, and a long filename preview: 390 and 1440 px wide.
- Health panel styling: ready, missing files, loading, and offline.
- Automated text contrast checks: no violations in the tested pages and states.
- Photograph and gradient backgrounds: checked separately using computed text colors against captures with text hidden. Text over the hero photograph retained more than 10:1 in the sampled desktop and mobile headings and copy.
- Text resized to 200%: no horizontal overflow or clipped text in the inspected controls at 320, 390, and 1440 px.
- User text-spacing overrides: line height 1.5, paragraph spacing 2 em, letter spacing 0.12 em, and word spacing 0.16 em, following the settings in [W3C Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html). The inspected layouts remained usable without horizontal overflow or clipped text.

The checks cover rendered HTML interface text and the tested control states. They were run against the static preview with zero OCR inference requests.
