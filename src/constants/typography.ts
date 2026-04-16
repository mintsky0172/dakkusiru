import { Platform, TextStyle } from 'react-native';
import { colors } from './colors';

export const fontFamily = {
  regular: 'Iseoyun',
  medium: 'Iseoyun',
  bold: 'Iseoyun',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 44,
} as const;

export const lineHeight = {
  xs: 16,
  sm: 18,
  md: 22,
  lg: 24,
  xl: 28,
  xxl: 32,
  xxxl: 40,
  display: 52,
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    color: colors.text.primary,
  } satisfies TextStyle,

  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxxl,
    lineHeight: lineHeight.xxxl,
    color: colors.text.primary,
  } satisfies TextStyle,

  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    lineHeight: lineHeight.xxl,
    color: colors.text.primary,
  } satisfies TextStyle,

  h3: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    color: colors.text.primary,
  } satisfies TextStyle,

  title: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    color: colors.text.primary,
  } satisfies TextStyle,

  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.text.primary,
  } satisfies TextStyle,

  bodyStrong: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.text.primary,
  } satisfies TextStyle,

  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.text.secondary,
  } satisfies TextStyle,

  small: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    color: colors.text.muted,
  } satisfies TextStyle,

  button: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.text.inverse,
  } satisfies TextStyle,

  chip: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.text.primary,
  } satisfies TextStyle,

  tabLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text.secondary,
  } satisfies TextStyle,
} as const;

export const shadow = Platform.select({
  ios: {
    soft: {
      shadowColor: '#590D0D',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    } satisfies TextStyle,
  },
  android: {
    soft: {
      elevation: 3,
    } satisfies TextStyle,
  },
  default: {
    soft: {},
  },
});