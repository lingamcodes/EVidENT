/**
 * Design tokens — the single source of truth for how Evident looks.
 * Values come from the "Gen Z Event Management Design" in Claude Design.
 *
 * Rules:
 * - Components read `colors`, never `palette` directly.
 * - Screens read `spacing` / `layout` for gaps only; everything visual goes
 *   through a component.
 * - Light mode only for MVP.
 */

/* ── Raw palette (from the design's OKLCH ramps) ── */
export const palette = {
  sand: '#f5ead8',
  sandDeep: '#ebddc5',
  ink: '#201e1d',
  white: '#ffffff',

  neutral100: '#f9f4ed',
  neutral200: '#eee7db',
  neutral300: '#dcd3c4',
  neutral400: '#c0b6a5',
  neutral500: '#a19786',
  neutral600: '#82796a',
  neutral700: '#645c50',
  neutral800: '#474238',
  neutral900: '#2e2b25',

  clay: '#c67139',
  clay100: '#fff2eb',
  clay200: '#ffe1d0',
  clay300: '#ffc6a5',
  clay400: '#f6a06b',
  clay500: '#d67f48',
  clay600: '#b2622d',
  clay700: '#8c491a',
  clay800: '#643312',
  clay900: '#402310',

  sage: '#7a8a5e',
  sage100: '#f0fae1',
  sage200: '#e1eecc',
  sage300: '#ccdbb2',
  sage400: '#aebf92',
  sage500: '#8fa073',
  sage600: '#728157',
  sage700: '#56633f',
  sage800: '#3d472b',
  sage900: '#272e1b',

  // Design red, converted from oklch(0.44/0.62/0.95 … 28).
  red100: '#ffe7e3',
  red400: '#cd6055',
  red700: '#902822',
} as const;

/* ── Semantic colours: name = job, not hue ── */
export const colors = {
  background: palette.sand,
  surface: palette.sandDeep,
  surfaceSunken: palette.neutral200,
  surfaceRaised: palette.neutral100,

  text: palette.ink,
  textStrong: palette.neutral800,
  textMuted: palette.neutral700,
  textSubtle: palette.neutral600,
  textOnAccent: palette.white,
  textOnOverlay: palette.white,

  border: 'rgba(32, 30, 29, 0.16)',
  borderFocus: palette.clay400,

  accent: palette.clay,
  accentPressed: palette.clay700,
  accentSoft: palette.clay100,
  accentSoftBorder: palette.clay600,
  accentText: palette.clay700,
  accentStrongText: palette.clay800,
  accentMuted: palette.clay300,

  secondary: palette.sage,
  secondarySoft: palette.sage100,
  secondaryMuted: palette.sage300,
  secondaryText: palette.sage800,

  neutralSoft: palette.neutral100,
  neutralMuted: palette.neutral300,
  track: palette.neutral300,
  toggleOff: palette.neutral400,

  success: palette.sage800,
  danger: palette.red700,
  dangerBorder: palette.red400,
  dangerSoft: palette.red100,

  markerBorder: palette.neutral500,
  dashedBorder: palette.clay400,

  overlay: 'rgba(32, 30, 29, 0.72)',
  scrim: 'rgba(46, 43, 37, 0.5)',
  pressedTint: 'rgba(32, 30, 29, 0.14)',
  pressedAccentTint: 'rgba(198, 113, 57, 0.18)',
} as const;

/* ── Spacing (rounded from the phone mockups) ── */
export const spacing = {
  xxs: 3,
  xs: 5,
  sm: 9,
  md: 13,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
} as const;

export const layout = {
  screenGutter: spacing.xl,
  touchTarget: 44,
} as const;

/* ── Radii ── */
export const radii = {
  sm: 8,
  thumb: 14,
  md: 16,
  lg: 28,
  pill: 999,
} as const;

/* ── Sizes for fixed-dimension pieces ── */
export const sizes = {
  iconButton: 40,
  iconButtonSmall: 34,
  iconButtonTiny: 26,
  choiceMarker: 17,
  questionPhoto: 96,
  icon: 19,
  iconSmall: 16,
  thumb: 56,
  textAreaMinHeight: 90,
  toggle: { width: 38, height: 22, inset: 2 },
  coverImage: 250,
  /** Cover photos keep their own shape (width ÷ height), clamped to this range. */
  coverAspect: { fallback: 3 / 2, min: 4 / 5, max: 2 },
  dialogListMax: 238,
  paxInput: 84,
  tabBarCreate: 42,
  progressBar: 4,
  badgeDot: 8,
  avatar: { xs: 30, sm: 32, md: 48, lg: 60, xl: 96, xxl: 132 },
  eventCard: { width: 252, imageHeight: 172 },
} as const;

export const borders = {
  hairline: 1,
  marker: 1.5,
  thick: 2,
} as const;

export const opacity = {
  disabled: 0.45,
} as const;

/* ── Shadows (RN boxShadow strings) ── */
export const shadows = {
  sm: '0px 1px 2px rgba(46, 43, 37, 0.14)',
  md: '0px 3px 10px rgba(46, 43, 37, 0.16)',
  lg: '0px 12px 32px rgba(46, 43, 37, 0.22)',
} as const;

/* ── Typography ── */
export const fonts = {
  heading: 'Caprasimo_400Regular',
  body: 'Figtree_400Regular',
  bodySemiBold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

/**
 * Text presets. Screens pick one of these by name through <Text variant="…" />;
 * restyling a preset here updates every screen that uses it.
 */
export const typography = {
  display: { fontFamily: fonts.heading, fontSize: 34, lineHeight: 36 },
  title: { fontFamily: fonts.heading, fontSize: 27, lineHeight: 29 },
  heading: { fontFamily: fonts.heading, fontSize: 21, lineHeight: 24 },
  cardTitle: { fontFamily: fonts.heading, fontSize: 15.5, lineHeight: 17 },
  dialogTitle: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 24 },

  body: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 18 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 13.5, lineHeight: 18 },
  input: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  inputSmall: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  button: { fontFamily: fonts.bodyBold, fontSize: 14 },
  buttonSmall: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
  buttonTiny: { fontFamily: fonts.bodyBold, fontSize: 10.5 },
  tab: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
  small: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
  caption: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
  meta: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 14 },
  badge: { fontFamily: fonts.bodyBold, fontSize: 10 },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 9.5 },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    letterSpacing: 0.95,
    textTransform: 'uppercase',
  },
} as const;

export type TypographyVariant = keyof typeof typography;
