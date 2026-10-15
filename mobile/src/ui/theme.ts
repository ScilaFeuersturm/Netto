import { useColorScheme, type TextStyle } from 'react-native';

import type { ObligationStatus } from '@/domain/models';

// Paleta de marca Netto — design system "Serene Financial Clarity"
export const Palette = {
  Forest: '#1E3A2F', // primary
  ForestDeep: '#0F2419', // botones y tarjetas hero
  ForestLight: '#2E5040',
  Pine: '#3D6B56', // secondary
  Amber: '#D97706', // tertiary
  Slate: '#707973', // neutral
  MintBackground: '#F1FAF2',
  Mint: '#BFEBD3',
  MintMuted: '#A8D8C0',
  SageSurface: '#E7EFE9',
  SageOutline: '#C9D3CC',
  Ink: '#14211B',
  InkMuted: '#5C6660',
  AmberContainer: '#FFE0C2',
  AmberDark: '#7A3E00',
  Danger: '#C62828',
  DangerContainer: '#FCDADA',
  DangerDark: '#A3191B',
  NightBackground: '#0D1813',
  NightSurface: '#15241D',
  NightSurfaceHigh: '#1E3028',
  NightOutline: '#52625A',
  NightText: '#E3EEE7',
  NightTextMuted: '#A9B8AF',
};

/** Fondo de las tarjetas destacadas (saldo, total por pagar, etc). Igual en ambos temas. */
export const Hero = {
  gradient: [Palette.ForestLight, Palette.Forest, Palette.ForestDeep] as const,
  onColor: '#FFFFFF',
  onColorMuted: '#B9CEC3',
  tile: 'rgba(255,255,255,0.08)',
};

export type ColorScheme = {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
};

export const LightColors: ColorScheme = {
  primary: Palette.Forest,
  onPrimary: '#FFFFFF',
  primaryContainer: Palette.Mint,
  onPrimaryContainer: Palette.Forest,
  secondary: Palette.Pine,
  onSecondary: '#FFFFFF',
  secondaryContainer: Palette.SageSurface,
  onSecondaryContainer: Palette.Forest,
  tertiary: Palette.Amber,
  onTertiary: '#FFFFFF',
  tertiaryContainer: Palette.AmberContainer,
  onTertiaryContainer: Palette.AmberDark,
  background: Palette.MintBackground,
  onBackground: Palette.Ink,
  surface: '#FFFFFF',
  onSurface: Palette.Ink,
  surfaceVariant: Palette.SageSurface,
  onSurfaceVariant: Palette.InkMuted,
  outline: Palette.SageOutline,
  outlineVariant: Palette.SageSurface,
  error: Palette.Danger,
  onError: '#FFFFFF',
  errorContainer: Palette.DangerContainer,
  onErrorContainer: Palette.DangerDark,
};

export const DarkColors: ColorScheme = {
  primary: Palette.MintMuted,
  onPrimary: Palette.ForestDeep,
  primaryContainer: Palette.ForestLight,
  onPrimaryContainer: Palette.Mint,
  secondary: '#8CBFA6',
  onSecondary: Palette.ForestDeep,
  secondaryContainer: Palette.NightSurfaceHigh,
  onSecondaryContainer: '#CFE8DA',
  tertiary: '#F0A040',
  onTertiary: '#3A1F00',
  tertiaryContainer: '#5A3200',
  onTertiaryContainer: '#FFDDB8',
  background: Palette.NightBackground,
  onBackground: Palette.NightText,
  surface: Palette.NightSurface,
  onSurface: Palette.NightText,
  surfaceVariant: Palette.NightSurfaceHigh,
  onSurfaceVariant: Palette.NightTextMuted,
  outline: Palette.NightOutline,
  outlineVariant: Palette.NightSurfaceHigh,
  error: '#FF8A80',
  onError: '#3A0F0F',
  errorContainer: '#6B1A1A',
  onErrorContainer: '#FFDAD6',
};

export function useTheme(): { colors: ColorScheme; dark: boolean } {
  const dark = useColorScheme() === 'dark';
  return { colors: dark ? DarkColors : LightColors, dark };
}

// ---- Tipografía: Headline y Body con Plus Jakarta Sans, Label con Inter ----

export const FONT_ASSETS = {
  'PlusJakartaSans-Regular': require('../../assets/fonts/plus_jakarta_sans_regular.ttf'),
  'PlusJakartaSans-Medium': require('../../assets/fonts/plus_jakarta_sans_medium.ttf'),
  'PlusJakartaSans-SemiBold': require('../../assets/fonts/plus_jakarta_sans_semibold.ttf'),
  'PlusJakartaSans-Bold': require('../../assets/fonts/plus_jakarta_sans_bold.ttf'),
  'PlusJakartaSans-ExtraBold': require('../../assets/fonts/plus_jakarta_sans_extrabold.ttf'),
  'Inter-Regular': require('../../assets/fonts/inter_regular.ttf'),
  'Inter-Medium': require('../../assets/fonts/inter_medium.ttf'),
  'Inter-SemiBold': require('../../assets/fonts/inter_semibold.ttf'),
  'Inter-Bold': require('../../assets/fonts/inter_bold.ttf'),
};

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
type Family = 'jakarta' | 'inter';

/** Con fuentes propias el peso se elige por archivo (fontWeight no funciona igual en Android). */
export function fontFamily(family: Family, weight: FontWeight): string {
  if (family === 'inter') {
    const w = weight === 'extrabold' ? 'Bold' : { regular: 'Regular', medium: 'Medium', semibold: 'SemiBold', bold: 'Bold' }[weight];
    return `Inter-${w}`;
  }
  const w = { regular: 'Regular', medium: 'Medium', semibold: 'SemiBold', bold: 'Bold', extrabold: 'ExtraBold' }[weight];
  return `PlusJakartaSans-${w}`;
}

type Variant = { family: Family; weight: FontWeight; fontSize: number; lineHeight: number; letterSpacing?: number };

/** Escala de Material 3 con las fuentes de Netto. */
export const Typography = {
  displaySmall: { family: 'jakarta', weight: 'bold', fontSize: 36, lineHeight: 44 },
  headlineLarge: { family: 'jakarta', weight: 'bold', fontSize: 32, lineHeight: 40 },
  headlineMedium: { family: 'jakarta', weight: 'bold', fontSize: 28, lineHeight: 36 },
  headlineSmall: { family: 'jakarta', weight: 'semibold', fontSize: 24, lineHeight: 32 },
  titleLarge: { family: 'jakarta', weight: 'semibold', fontSize: 20, lineHeight: 28 },
  titleMedium: { family: 'jakarta', weight: 'semibold', fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  titleSmall: { family: 'jakarta', weight: 'semibold', fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  bodyLarge: { family: 'jakarta', weight: 'regular', fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  bodyMedium: { family: 'jakarta', weight: 'regular', fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  bodySmall: { family: 'jakarta', weight: 'regular', fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  labelLarge: { family: 'inter', weight: 'semibold', fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  labelMedium: { family: 'inter', weight: 'semibold', fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  labelSmall: { family: 'inter', weight: 'medium', fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
  /** Monto grande de las tarjetas hero. */
  amountDisplay: { family: 'jakarta', weight: 'bold', fontSize: 40, lineHeight: 48, letterSpacing: -0.5 },
  /** Etiqueta en mayúsculas espaciadas ("SALDO DISPONIBLE TOTAL"). */
  overline: { family: 'inter', weight: 'semibold', fontSize: 11, lineHeight: 16, letterSpacing: 1.2 },
} satisfies Record<string, Variant>;

export type TypographyVariant = keyof typeof Typography;

export function textStyle(variant: TypographyVariant, weight?: FontWeight): TextStyle {
  const v: Variant = Typography[variant];
  return {
    fontFamily: fontFamily(v.family, weight ?? v.weight),
    fontSize: v.fontSize,
    lineHeight: v.lineHeight,
    letterSpacing: v.letterSpacing,
  };
}

export const Radius = { xs: 8, sm: 10, md: 16, lg: 20, xl: 28, pill: 999 };

// ---- Colores por estado de obligación ----

/** Colores semánticos por estado de obligación, coherentes en ambos temas. `bar` es la barra de urgencia. */
export type StatusPalette = { container: string; onContainer: string; bar: string };

export function statusPalette(status: ObligationStatus, colors: ColorScheme): StatusPalette {
  switch (status) {
    case 'VENCIDO':
    case 'HOY':
      return { container: colors.errorContainer, onContainer: colors.onErrorContainer, bar: colors.error };
    case 'PROXIMO':
      return { container: colors.tertiaryContainer, onContainer: colors.onTertiaryContainer, bar: colors.tertiary };
    case 'AL_DIA':
      return { container: colors.surfaceVariant, onContainer: colors.onSurfaceVariant, bar: Palette.MintMuted };
    case 'PAGADO':
      return { container: colors.primaryContainer, onContainer: colors.onPrimaryContainer, bar: Palette.MintMuted };
  }
}
