export const colors = {
  // Backgrounds — green-tinted, never pure black
  background: '#0C120E',      // Deep green-tinted black
  surface: '#141A15',          // Primary surface (cards, inputs)
  surfaceElevated: '#1C241D',  // Elevated surface (popovers, sheets)

  // Text
  text: '#E8EDE9',             // Slightly green-tinted off-white (never #FFFFFF)
  textSecondary: '#9FA89F',    // Muted green-gray (never pure #808080)
  textDisabled: '#5A635B',     // Disabled state

  // Accent — the only green you actually SEE (10% usage rule)
  accent: '#3DB85A',           // Fresh confident green
  accentDim: 'rgba(61, 184, 90, 0.12)', // Accent background tint

  // Borders — hairline, subtle
  border: 'rgba(255, 255, 255, 0.08)',   // Standard border
  borderStrong: 'rgba(255, 255, 255, 0.14)', // Emphasized border

  // Semantic
  error: '#E05252',
  errorDim: 'rgba(224, 82, 82, 0.12)',
  success: '#3DB85A',          // Same as accent
  successDim: 'rgba(61, 184, 90, 0.12)',

  // Macro colors — for MacroChip and nutrition bars
  protein: '#6B9FE4',          // Cool blue
  proteinDim: 'rgba(107, 159, 228, 0.14)',
  carb: '#E4A96B',             // Warm amber
  carbDim: 'rgba(228, 169, 107, 0.14)',
  fat: '#D4C56B',              // Muted yellow (not neon)
  fatDim: 'rgba(212, 197, 107, 0.14)',
  fiber: '#9FD4A0',            // Soft green (different from accent)
  fiberDim: 'rgba(159, 212, 160, 0.14)',

  // Overlay
  scrim: 'rgba(0, 0, 0, 0.6)', // Modal/sheet scrim
} as const;

export type ColorToken = keyof typeof colors;
