import { TextStyle } from 'react-native';

export const typography = {
  // Display — large hero text. Playfair Display 900 Black, 44px.
  display: {
    fontFamily: 'PlayfairDisplay_900Black',
    fontSize: 44,
    letterSpacing: -1,
    lineHeight: 50,
  } satisfies TextStyle,

  // Title — screen headings. Playfair Display 700 Bold, 32px.
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 38,
  } satisfies TextStyle,

  // Heading — section headings, card titles. Playfair Display 700 Bold, 22px.
  heading: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    letterSpacing: -0.3,
    lineHeight: 28,
  } satisfies TextStyle,

  // Body — primary readable text. Archivo Regular, 16px.
  body: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 16,
    lineHeight: 25,
  } satisfies TextStyle,

  // BodyMedium — emphasized body. Archivo Medium, 16px.
  bodyMedium: {
    fontFamily: 'Archivo_500Medium',
    fontSize: 16,
    lineHeight: 25,
  } satisfies TextStyle,

  // Small — secondary info, labels. Archivo Regular, 14px.
  small: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 14,
    lineHeight: 21,
  } satisfies TextStyle,

  // SmallMedium — emphasized small. Archivo Medium, 14px.
  smallMedium: {
    fontFamily: 'Archivo_500Medium',
    fontSize: 14,
    lineHeight: 21,
  } satisfies TextStyle,

  // Caption — metadata, timestamps, fine print. Archivo Regular, 12px.
  caption: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 12,
    letterSpacing: 0.1,
    lineHeight: 17,
  } satisfies TextStyle,

  // Label — all-caps short labels. Archivo SemiBold, 11px.
  label: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,

  // Mono — ALL numbers: calories, macros, timers. Archivo SemiBold, 16px.
  mono: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
  } satisfies TextStyle,

  // MonoLarge — large numeric displays. Archivo Bold, 32px.
  monoLarge: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 38,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  // MonoSmall — small numbers. Archivo SemiBold, 13px.
  monoSmall: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    lineHeight: 16,
  } satisfies TextStyle,

  // HeroGhost — italic ghost line behind hero text. Apply opacity: 0.1 at component level.
  heroGhost: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 44,
    letterSpacing: -0.5,
    lineHeight: 50,
  } satisfies TextStyle,
} as const;
