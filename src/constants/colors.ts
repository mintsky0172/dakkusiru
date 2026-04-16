export const colors = {
  background: {
    base: '#FFF5E3',
    surface: '#FFFAF1',
    subtle: '#F8EAD3',
    canvas: '#FFFDF8',
  },

  text: {
    primary: '#590D0D',
    secondary: '#8A5A44',
    muted: '#B08A76',
    inverse: '#FFFAF1',
    disabled: '#C6A892',
  },

  accent: {
    main: '#D97B66',
    soft: '#F3C8B8',
    strong: '#C9644D',
  },

  border: {
    light: '#E8D7C0',
    strong: '#D9BFA3',
  },

  state: {
    success: '#7E9C6B',
    warning: '#E3A54F',
    danger: '#C75C5C',
    info: '#8BB8E8',
  },

  overlay: {
    dim: 'rgba(89, 13, 13, 0.18)',
    strong: 'rgba(89, 13, 13, 0.32)',
  },

  chip: {
    defaultBg: '#F8EAD3',
    selectedBg: '#F3C8B8',
    defaultText: '#590D0D',
    selectedText: '#590D0D',
  },

  button: {
    primaryBg: '#D97B66',
    primaryText: '#FFFAF1',
    secondaryBg: '#F8EAD3',
    secondaryText: '#590D0D',
    ghostText: '#590D0D',
    disabledBg: '#EEDFD2',
    disabledText: '#B08A76',
  },

  card: {
    background: '#FFFAF1',
    border: '#E8D7C0',
  },

  tab: {
    background: '#F8EAD3',
    active: '#590D0D',
    inactive: '#8A5A44',
  },
} as const;

export type Colors = typeof colors;