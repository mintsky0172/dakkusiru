import { colors } from './colors';
import { radius, spacing } from './spacing';
import { typography } from './typography';

export const theme = {
  colors,
  spacing,
  radius,
  typography,

  screen: {
    container: {
      flex: 1,
      backgroundColor: colors.background.base,
      paddingHorizontal: 20,
    },
  },

  card: {
    backgroundColor: colors.card.background,
    borderColor: colors.card.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },

  button: {
    primary: {
      backgroundColor: colors.button.primaryBg,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    secondary: {
      backgroundColor: colors.button.secondaryBg,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
  },

  chip: {
    default: {
      backgroundColor: colors.chip.defaultBg,
      borderRadius: radius.round,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    selected: {
      backgroundColor: colors.chip.selectedBg,
      borderRadius: radius.round,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
  },
} as const;