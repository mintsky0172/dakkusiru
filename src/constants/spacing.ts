export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
} as const;

export const iconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const layout = {
  screenHorizontalPadding: 20,
  screenTopPadding: 16,
  cardGap: 16,
  gridGap: 12,
  bottomTabHeight: 76,
  toolbarHeight: 48,
  floatingButtonSize: 56,
  bottomSheetHandleWidth: 44,
  bottomSheetHandleHeight: 5,
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;