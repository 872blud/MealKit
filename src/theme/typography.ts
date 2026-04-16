import { TextStyle } from 'react-native';

export const typography = {
  // Display — large hero text (recipe names, scan results)
  display: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 38,
  } satisfies TextStyle,

  // Title — screen headings
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 29,
  } satisfies TextStyle,

  // Heading — section headings, card titles
  heading: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
  } satisfies TextStyle,

  // Body — primary readable text (minimum 16pt)
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  } satisfies TextStyle,

  // BodyMedium — emphasized body
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  } satisfies TextStyle,

  // Small — secondary info, labels
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  } satisfies TextStyle,

  // SmallMedium — emphasized small
  smallMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  } satisfies TextStyle,

  // Caption — metadata, timestamps, fine print
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.1,
  } satisfies TextStyle,

  // Mono — ALL numbers: calories, macros, timers, percentages
  mono: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  // MonoLarge — large numeric displays (daily calorie total, etc.)
  monoLarge: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 38,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  // MonoSmall — small numbers (macro chips, inline stats)
  monoSmall: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  // Label — all-caps short labels (category badges, scan source tags)
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,
} as const;
