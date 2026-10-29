import { useColorScheme, type TextStyle } from 'react-native';

import type { ObligationStatus } from '@/domain/models';

// Paleta de Inariko, tomada del logo: verde azulado profundo y cobre. Se mantienen los colores
// con significado (sello rojo para lo vencido, resaltador amarillo para lo que vence pronto, verde
// para lo pagado). Todos los pares texto/fondo cumplen WCAG AA (4.5:1) y los bordes de campos 3:1,
// en ambos temas.
export const Palette = {
  Ink: '#10262A', // texto principal
  InkMuted: '#4E6266', // texto secundario
  Teal: '#0D5761', // primario: botones, links, montos destacados
  TealDeep: '#0B3A41', // fondo del talón (hero), el mismo verde del logo
  TealWash: '#D9ECEC', // contenedor del primario
  Copper: '#8C4F33', // cobre de la marca, cuando es texto o ícono sobre claro
  CopperLight: '#E5AE8C', // cobre sobre fondos oscuros (talón, modo oscuro)
  Paper: '#F2F5F4', // fondo de pantalla
  Sheet: '#FFFFFF', // tarjetas
  SheetSunk: '#E3EAEA', // superficie hundida (pistas de barras, chips apagados)
  Rule: '#82959A', // bordes de campos (3:1 sobre blanco)
  RuleFaint: '#D5DFDF', // divisores y contornos decorativos
  Stamp: '#A8243A', // sello: vencido / error
  StampWash: '#F9E1E4',
  StampDark: '#8A1C2E',
  Highlighter: '#F4D35E', // resaltador: vence pronto (siempre con texto Ink encima)
  Ochre: '#9A6700', // el resaltador cuando tiene que ser texto o trazo sobre blanco
  Paid: '#2F6B4F', // pagado
  PaidWash: '#DCEFE3',
  PaidDark: '#1E4D37',
  NightPaper: '#0A191C',
  NightSheet: '#112529',
  NightSheetHigh: '#18323A',
  NightRule: '#6A8286',
  NightRuleFaint: '#22393D',
  NightText: '#E5EEEE',
  NightTextMuted: '#A2B5B7',
  NightTeal: '#7FC6CB',
};

/** Talón destacado (saldo, total por pagar, etc): bloque verde azulado con texto blanco. */
export const Hero = {
  fill: Palette.TealDeep,
  fillDark: '#0F444C',
  onColor: '#FFFFFF',
  onColorMuted: '#BFD6D8',
  /** Línea punteada del troquel, que separa el monto de los datos de abajo. */
  perforation: 'rgba(255,255,255,0.35)',
  tile: 'rgba(255,255,255,0.10)',
  /** Resaltador y verde aclarados para leerse sobre el verde azulado. */
  highlight: Palette.Highlighter,
  positive: '#8FD3AE',
  /** Cobre de la marca sobre el talón. */
  accent: Palette.CopperLight,
};

export type ColorScheme = {
  /** Cobre de la marca: acentos puntuales (Premium, detalles del talón). Siempre legible como texto. */
  brand: string;
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
  brand: Palette.Copper,
  primary: Palette.Teal,
  onPrimary: '#FFFFFF',
  primaryContainer: Palette.TealWash,
  onPrimaryContainer: Palette.TealDeep,
  secondary: Palette.Paid,
  onSecondary: '#FFFFFF',
  secondaryContainer: Palette.SheetSunk,
  onSecondaryContainer: Palette.Ink,
  tertiary: Palette.Ochre,
  onTertiary: '#FFFFFF',
  tertiaryContainer: Palette.Highlighter,
  onTertiaryContainer: Palette.Ink,
  background: Palette.Paper,
  onBackground: Palette.Ink,
  surface: Palette.Sheet,
  onSurface: Palette.Ink,
  surfaceVariant: Palette.SheetSunk,
  onSurfaceVariant: Palette.InkMuted,
  outline: Palette.Rule,
  outlineVariant: Palette.RuleFaint,
  error: Palette.Stamp,
  onError: '#FFFFFF',
  errorContainer: Palette.StampWash,
  onErrorContainer: Palette.StampDark,
};

export const DarkColors: ColorScheme = {
  brand: Palette.CopperLight,
  primary: Palette.NightTeal,
  onPrimary: Palette.NightPaper,
  primaryContainer: '#17474F',
  onPrimaryContainer: '#D7EEEF',
  secondary: '#7FC4A0',
  onSecondary: Palette.NightPaper,
  secondaryContainer: Palette.NightSheetHigh,
  onSecondaryContainer: Palette.NightText,
  tertiary: '#E8B949',
  onTertiary: Palette.Ink,
  tertiaryContainer: Palette.Highlighter,
  onTertiaryContainer: Palette.Ink,
  background: Palette.NightPaper,
  onBackground: Palette.NightText,
  surface: Palette.NightSheet,
  onSurface: Palette.NightText,
  surfaceVariant: Palette.NightSheetHigh,
  onSurfaceVariant: Palette.NightTextMuted,
  outline: Palette.NightRule,
  outlineVariant: Palette.NightRuleFaint,
  error: '#F08A97',
  onError: Palette.NightPaper,
  errorContainer: '#5A1824',
  onErrorContainer: '#FFD9DE',
};

export function useTheme(): { colors: ColorScheme; dark: boolean } {
  const dark = useColorScheme() === 'dark';
  return { colors: dark ? DarkColors : LightColors, dark };
}

// ---- Tipografía: una sola familia, Plus Jakarta Sans ----
// Una familia con pesos bien separados alcanza: los montos van en ExtraBold con cifras tabulares
// (todas del mismo ancho, para que las columnas de importes queden alineadas como en un recibo).

export const FONT_ASSETS = {
  'PlusJakartaSans-Regular': require('../../assets/fonts/plus_jakarta_sans_regular.ttf'),
  'PlusJakartaSans-Medium': require('../../assets/fonts/plus_jakarta_sans_medium.ttf'),
  'PlusJakartaSans-SemiBold': require('../../assets/fonts/plus_jakarta_sans_semibold.ttf'),
  'PlusJakartaSans-Bold': require('../../assets/fonts/plus_jakarta_sans_bold.ttf'),
  'PlusJakartaSans-ExtraBold': require('../../assets/fonts/plus_jakarta_sans_extrabold.ttf'),
};

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

/** Con fuentes propias el peso se elige por archivo (fontWeight no funciona igual en Android). */
export function fontFamily(weight: FontWeight): string {
  const w = { regular: 'Regular', medium: 'Medium', semibold: 'SemiBold', bold: 'Bold', extrabold: 'ExtraBold' }[weight];
  return `PlusJakartaSans-${w}`;
}

type Variant = { weight: FontWeight; fontSize: number; lineHeight: number; letterSpacing?: number; tabular?: boolean };

/** Escala modular (razón ~1.2 desde 14) con nombres de Material 3 para no tocar las pantallas. */
export const Typography = {
  displaySmall: { weight: 'extrabold', fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  headlineLarge: { weight: 'extrabold', fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  headlineMedium: { weight: 'bold', fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  headlineSmall: { weight: 'bold', fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  titleLarge: { weight: 'bold', fontSize: 19, lineHeight: 26, letterSpacing: -0.1 },
  titleMedium: { weight: 'semibold', fontSize: 16, lineHeight: 22 },
  titleSmall: { weight: 'semibold', fontSize: 14, lineHeight: 20 },
  bodyLarge: { weight: 'regular', fontSize: 16, lineHeight: 24 },
  bodyMedium: { weight: 'regular', fontSize: 14, lineHeight: 21 },
  bodySmall: { weight: 'regular', fontSize: 12.5, lineHeight: 18 },
  labelLarge: { weight: 'semibold', fontSize: 14, lineHeight: 20 },
  labelMedium: { weight: 'semibold', fontSize: 12.5, lineHeight: 17 },
  labelSmall: { weight: 'medium', fontSize: 11.5, lineHeight: 16 },
  /** Monto grande del talón. */
  amountDisplay: { weight: 'extrabold', fontSize: 44, lineHeight: 50, letterSpacing: -1.2, tabular: true },
  /** Importe dentro de listas y tarjetas. */
  amount: { weight: 'bold', fontSize: 16, lineHeight: 22, tabular: true },
  /** Rótulo del talón, en minúscula como en un comprobante ("Te queda este mes"). */
  overline: { weight: 'medium', fontSize: 14, lineHeight: 20 },
} satisfies Record<string, Variant>;

export type TypographyVariant = keyof typeof Typography;

/**
 * Cuánto puede crecer cada estilo con el texto grande del sistema. El texto de lectura llega al 200%
 * (lo que pide WCAG 1.4.4); los títulos y montos grandes ya son grandes y crecen menos, para que
 * una palabra no termine partida en dos renglones.
 */
export function maxFontScale(variant: TypographyVariant): number {
  if (variant === 'amountDisplay' || variant.startsWith('display') || variant.startsWith('headline')) return 1.4;
  if (variant.startsWith('title')) return 1.7;
  return 2;
}

export function textStyle(variant: TypographyVariant, weight?: FontWeight): TextStyle {
  const v: Variant = Typography[variant];
  return {
    fontFamily: fontFamily(weight ?? v.weight),
    fontSize: v.fontSize,
    lineHeight: v.lineHeight,
    letterSpacing: v.letterSpacing,
    fontVariant: v.tabular ? ['tabular-nums'] : undefined,
  };
}

/** Radios por jerarquía: el talón es la pieza más redondeada; hojas y campos, apenas. */
export const Radius = { xs: 4, sm: 6, md: 8, lg: 14, xl: 18, pill: 999 };

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
      return { container: colors.surfaceVariant, onContainer: colors.onSurfaceVariant, bar: colors.outline };
    case 'PAGADO':
      return { container: colors === DarkColors ? '#1D4433' : Palette.PaidWash, onContainer: colors === DarkColors ? '#CDEBD9' : Palette.PaidDark, bar: colors.secondary };
  }
}
