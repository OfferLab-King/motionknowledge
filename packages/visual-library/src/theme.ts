export const professionalTheme = {
  colors: {
    background: '#08111F',
    surface: '#10213A',
    primary: '#59D5E0',
    accent: '#F7C948',
    text: '#F8FAFC',
    muted: '#9FB2C8',
    danger: '#FB7185',
  },
  safeArea: {x: 96, y: 64},
  spacing: {xs: 8, sm: 16, md: 24, lg: 40, xl: 64},
  radius: {sm: 10, md: 18, lg: 28},
  motion: {fast: 12, normal: 24, slow: 40},
} as const;

export type Theme = typeof professionalTheme;

export const fonts = {
  heading: `'Inter', 'Helvetica Neue', system-ui, sans-serif`,
  body: `'Inter', 'Helvetica Neue', system-ui, sans-serif`,
  mono: `'JetBrains Mono', 'SF Mono', Menlo, monospace`,
} as const;
