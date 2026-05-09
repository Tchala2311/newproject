// FLIK — design tokens
// Colors approximate the OKLCH palette from the Gamify v2 mockup, hand-tuned to hex
// for React Native compatibility.

export const colors = {
  bg: '#060610',
  bgGradientA: '#1F1B36',
  bgGradientB: '#131229',

  // Brand atmosphere (the violet/magenta radial glow behind everything)
  haloA: 'rgba(112, 56, 168, 0.55)', // violet
  haloB: 'rgba(176, 56, 132, 0.45)', // magenta

  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.62)',
  textDim: 'rgba(255, 255, 255, 0.45)',
  textFaint: 'rgba(255, 255, 255, 0.30)',

  glassBg: 'rgba(255, 255, 255, 0.08)',
  glassBgStrong: 'rgba(255, 255, 255, 0.18)',
  glassBorder: 'rgba(255, 255, 255, 0.13)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.30)',

  surfaceDark: 'rgba(0, 0, 0, 0.35)',
  surfaceDarker: 'rgba(0, 0, 0, 0.55)',

  warn: '#FF4D4D',
  ok: '#2ECC71',
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const fontFamily = {
  // Loaded via @expo-google-fonts/space-grotesk in App.tsx
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
  black: 'SpaceGrotesk_700Bold', // SpaceGrotesk doesn't ship 900 — use 700
};

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 20,
  xl: 26,
  display: 32,
};

// Standard padding above status bar / dynamic island. SafeAreaView handles most of this,
// but card overlays need an explicit top inset on iPhone.
export const SAFE_TOP = 64;
